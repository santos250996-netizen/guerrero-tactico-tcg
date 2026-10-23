// ============================================================================
// GUERRERO TÁCTICO — PVP LOCAL (hotspot/WiFi) — lógica de partida autoritativa
// ============================================================================
// Corre SOLO en el servidor (rutas /api/pvp/*). Es PURO: sin Prisma, sin DOM,
// sin Zustand — así se puede testear con bun directamente (test-pvp-engine.ts).
//
// ADAPTADOR ESPEJO sobre el engine V3 (sin modificarlo):
//   · El tablero canónico es POSICIONAL: 3 posiciones, cada una con las cartas
//     del lado A y del lado B. El carril de A en la posición 0 (p.ej. "arcana")
//     se enfrenta al carril de B en la posición 0 (p.ej. "armas").
//   · Para llamar al engine se construye un tablero temporal con las claves de
//     carril DEL JUGADOR EN TURNO (así la sinergia +2, los bonos de carril y
//     todas las keywords funcionan EXACTAMENTE igual que en solitario) y el
//     resultado se vuelve a escribir por posición.
//   · Turno N: juega el primer lado, pasa → juega el otro, pasa → turno N+1.
//     El primer lado del turno 1 es SORTEADO AL AZAR; los siguientes turnos
//     alternan el arranque para que sea justo.
//   · Energía por jugador: maxEnergy = min(turno, MAX_TURNS), con penalización
//     individual (Sobrecarga). Robo: 1 carta por turno (ambos, simétrico).
//
// Vida de la sala: lobby → playing → ended. El estado completo vive en el
// servidor (src/lib/pvp/rooms.ts: memoria + PvpRoom en SQLite); los clientes
// reciben una vista SANEADA por lado (buildClientView) donde la mano del rival
// NUNCA viaja — solo su cantidad.
// ============================================================================

import {
  applyEndTurnEffects,
  applyOnDeathEffects,
  applyStartTurnEffects,
  computeFinalResult,
  getFinalCost,
  getLaneMaxCards,
  isCardCostAllowed,
  playCard,
  MAX_HAND_SIZE,
  MAX_TURNS,
  V3_COMBO_CAP,
  V3_COMBO_POWER,
  V3_RESONANCIA_COST_CUT,
  V3_RESONANCIA_POWER,
  type Board,
  type ClassRulesState,
  type PlayResult,
  type TriggerResult,
} from "./engine";
import { LANE_BONUS_POOL, CLASS_META, LANE_META } from "./types";
import type {
  BoardCard,
  CardDef,
  FinalResult,
  GameClass,
  HandCard,
  LaneBonus,
  LaneBonuses,
  LaneId,
  Keyword,
  Rarity,
} from "./types";
import type { ClassFxRecipe, FxEvent, FxKind } from "./fx";
import { eventsFromPlayResult } from "./fx";
import { CLASS_DECKS, buildDrawPileFrom, cardPoolForClass } from "./cards";
import { materializeCard } from "./balance";
import { v4 as uuidv4 } from "uuid";

// ---------------------------------------------------------------------------
// Sides & timing
// ---------------------------------------------------------------------------

export type PvpSide = "a" | "b";
export const otherSide = (s: PvpSide): PvpSide => (s === "a" ? "b" : "a");

/** Milisegundos de gracia antes de marcar al rival como desconectado. */
const PVP_CONNECTED_MS = 12000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PvpPlayer {
  name: string;
  gameClass: GameClass;
  /** Carriles propios, en el orden de las posiciones (índice = pareja). */
  lanes: LaneId[];
  /** Mazo resuelto (CardDef completos) — se conserva para la revancha. */
  deck: CardDef[];
  drawPile: HandCard[];
  hand: HandCard[];
  energy: number;
  maxEnergy: number;
  /** Cartas jugadas por este jugador en SU medio-turno actual (Ímpetu/Emboscada). */
  playsThisTurn: number;
  /** Penalización de energía para su próximo turno (Sobrecarga). */
  nextTurnEnergyPenalty: number;
}

/** Una posición del tablero: cartas del lado A y del lado B enfrentadas. */
interface PvpLanePos {
  a: BoardCard[];
  b: BoardCard[];
}

interface PvpLogEntry {
  id: string;
  turn: number;
  side: PvpSide | "system";
  text: string;
  kind: "play" | "buff" | "debuff" | "info" | "end";
}

/** Mutación para números flotantes (lados ya mapeados a a/b). */
interface PvpFloatMutation {
  side: PvpSide;
  uid: string;
  powerDelta: number;
  shieldDelta?: number;
}

/**
 * Evento FX para el cliente (pvpStore → fxBus). A diferencia de FxEvent:
 *   · `side` es ABSOLUTO (a/b) — el cliente lo voltea a su propia vista.
 *   · `lanePos` (0-2) sustituye a `lane`: el carril viaja con claves propias
 *     por jugador, así que por HTTP solo tiene sentido la POSICIÓN.
 */
interface PvpLastActionFx {
  kind: FxKind;
  keyword?: Keyword;
  /** Ritual de clase V3 (solo kind: "class"). */
  recipe?: ClassFxRecipe;
  lanePos: number;
  side: PvpSide;
  sourceUid?: string;
  targetUids?: string[];
  value?: number;
  delayMs?: number;
}

interface PvpLastAction {
  seq: number;
  side: PvpSide;
  type: "play" | "pass";
  lane?: LaneId;
  cardName?: string;
  playedUid?: string;
  playedRarity?: BoardCard["rarity"];
  mutations: PvpFloatMutation[];
  /** Eventos visuales (VFX de keywords / destrucciones / escudos). */
  fx?: PvpLastActionFx[];
  /** Lado cuyo turno acaba de comenzar (para el banner "TU TURNO"). */
  bannerFor?: PvpSide;
}

export interface PvpState {
  code: string;
  /** Incrementa en CADA cambio — los clientes polleran y comparan. */
  version: number;
  actionSeq: number;
  phase: "lobby" | "playing" | "ended";
  players: Record<PvpSide, PvpPlayer>;
  positions: PvpLanePos[]; // length 3
  /** Bonos por POSICIÓN (compartidos: la pareja de carriles juega con el mismo bono). */
  positionBonuses: (LaneBonus | null)[]; // length 3
  turn: number;
  activeSide: PvpSide;
  firstSide: PvpSide;
  actedThisTurn: { a: boolean; b: boolean };
  /** MODO JEFE (solo historia local): 3 carriles con bono + el bot juega su
   *  1ª carta GRATIS en sus turnos pares (2, 4, 6) + botín garantizado. */
  bossMode: boolean;
  logs: PvpLogEntry[];
  lastAction: PvpLastAction | null;
  /** Resultado final desde la perspectiva del lado A. */
  finalResultA: FinalResult | null;
  rematch: { a: boolean; b: boolean };
  lastSeen: { a: number; b: number };
  createdAt: number;
  endedSaved: boolean;
  /** REGLAS V3: Puntos de Combo por lado (Asesino). Persisten entre turnos. */
  combo?: { a: number; b: number };
  /** REGLAS V3: último carril jugado por lado en SU medio-turno (Resonancia Mago). */
  lastSpec?: { a: LaneId | null; b: LaneId | null };
}

export interface PvpPlayerInput {
  name: string;
  gameClass: GameClass;
  /** Opcional: ids del mazo custom (12 únicos del pool de la clase). */
  deckIds?: string[];
  /** Opcional: mazo YA materializado (p.ej. copias de la colección con
   *  rareza ganada por fusión). Tiene prioridad sobre deckIds. */
  deck?: CardDef[];
}

export type PvpAction =
  | { type: "play"; uid: string; lane: LaneId }
  | { type: "pass" };

// ---------------------------------------------------------------------------
// Vista saneada por cliente (única forma que viaja por HTTP)
// ---------------------------------------------------------------------------

export interface PvpClientView {
  code: string;
  version: number;
  phase: PvpState["phase"];
  you: {
    side: PvpSide;
    name: string;
    gameClass: GameClass;
    lanes: LaneId[];
    laneBonuses: LaneBonuses;
    hand: HandCard[];
    energy: number;
    maxEnergy: number;
    drawPileCount: number;
    /** REGLAS V3: tus PC (chip compacto, Asesino). */
    comboPoints: number;
    /** REGLAS V3: último carril que jugaste ESTE turno (aviso de Resonancia, Mago). */
    lastSpec: LaneId | null;
  };
  rival: {
    name: string;
    gameClass: GameClass;
    lanes: LaneId[];
    laneBonuses: LaneBonuses;
    handCount: number;
    energy: number;
    maxEnergy: number;
    drawPileCount: number;
    /** REGLAS V3: PC del rival (para leer el peligro, chip pasivo). */
    rivalComboPoints: number;
    connected: boolean;
  };
  /** Tablero con TUS claves de carril; player = tú, enemy = rival. */
  board: Board;
  turn: number;
  maxTurns: number;
  activeSide: PvpSide;
  yourTurn: boolean;
  logs: PvpLogEntry[];
  lastAction: PvpLastAction | null;
  /** Resultado final desde TU perspectiva (WIN = ganaste tú). */
  finalResult: FinalResult | null;
  rematch: { you: boolean; rival: boolean };
  lobby: {
    hostName: string;
    hostClass: GameClass;
    guestName: string;
    guestClass: GameClass;
    guestJoined: boolean;
  };
}

// ---------------------------------------------------------------------------
// Utilidades de mazo y mano inicial (replica freshHandFromPile de gameStore)
// ---------------------------------------------------------------------------

const MAX_LOG_ENTRIES = 40;

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Mazo validado: 12 ids únicos del pool de la clase; si no, el espejo oficial. */
function resolvePvpDeck(cls: GameClass, deckIds?: string[]): CardDef[] {
  if (deckIds && deckIds.length === 12) {
    const pool = cardPoolForClass(cls);
    const resolved: CardDef[] = [];
    for (const id of deckIds) {
      const found = pool.find((c) => c.id === id);
      if (!found) return CLASS_DECKS[cls];
      resolved.push(found);
    }
    if (new Set(resolved.map((c) => c.id)).size === 12) return resolved;
  }
  return CLASS_DECKS[cls];
}

const LEGAL_RARITIES: Rarity[] = ["common", "rare", "epic", "legendary", "mythic"];

/**
 * Mazo enviado por el CLIENTE (colección materializada: copias raras/épicas
 * ganadas por fusión). Se RECONSTRUYE desde el catálogo base — el poder nunca
 * viaja por HTTP, solo id + tier — y se materializa con el +2 por tier.
 * Devuelve null si no son exactamente 12 ids únicos del pool de la clase
 * (el llamador cae a su mazo por defecto).
 */
export function sanitizeClientDeck(raw: unknown, cls: GameClass): CardDef[] | null {
  if (!Array.isArray(raw) || raw.length !== 12) return null;
  const pool = cardPoolForClass(cls);
  const seen = new Set<string>();
  const out: CardDef[] = [];
  for (const item of raw) {
    const id = typeof item === "string" ? item : (item as { id?: unknown } | null)?.id;
    const rarity = typeof item === "object" && item !== null ? (item as { rarity?: unknown }).rarity : undefined;
    if (typeof id !== "string" || seen.has(id)) return null;
    seen.add(id);
    const base = pool.find((c) => c.id === id);
    if (!base) return null;
    const tier = LEGAL_RARITIES.includes(rarity as Rarity) ? (rarity as Rarity) : "common";
    out.push(materializeCard(base, tier));
  }
  return out;
}

function drawStartingHand(pile: HandCard[], n: number): HandCard[] {
  const out: HandCard[] = [];
  for (let i = 0; i < n && pile.length > 0; i++) {
    out.push(pile.pop()!);
  }
  // Garantía coste 1: si la mano inicial no tiene carta de coste 1, entra una.
  if (!out.some((c) => c.cost === 1) && pile.length > 0) {
    const idx = pile.findIndex((c) => c.cost === 1);
    if (idx >= 0) {
      const replacement = pile.splice(idx, 1)[0];
      let swapIdx = 0;
      for (let i = 1; i < out.length; i++) {
        if (out[i].cost > out[swapIdx].cost) swapIdx = i;
      }
      pile.push(out[swapIdx]);
      out[swapIdx] = replacement;
    }
  }
  return out;
}

function buildPlayer(input: PvpPlayerInput, deck?: CardDef[]): PvpPlayer {
  const resolvedDeck = deck ?? input.deck ?? resolvePvpDeck(input.gameClass, input.deckIds);
  // BARAJAR el mazo antes de robar: buildDrawPileFrom preserva el orden del
  // catálogo y sin shuffle la mano inicial salía SIEMPRE igual (pop desde el
  // final = las mismas 5 cartas en el mismo orden, partida tras partida).
  const pile: HandCard[] = shuffle(
    buildDrawPileFrom(resolvedDeck).map((c) => ({
      ...c,
      uid: uuidv4(),
      handBonus: 0,
    }))
  );
  const hand = drawStartingHand(pile, 5);
  return {
    name: input.name,
    gameClass: input.gameClass,
    lanes: [...CLASS_META[input.gameClass].lanes],
    deck: resolvedDeck,
    drawPile: pile,
    hand,
    energy: 1,
    maxEnergy: 1,
    playsThisTurn: 0,
    nextTurnEnergyPenalty: 0,
  };
}

function pushLog(
  state: PvpState,
  turn: number,
  side: PvpLogEntry["side"],
  text: string,
  kind: PvpLogEntry["kind"] = "info"
): void {
  state.logs.unshift({ id: uuidv4(), turn, side, text, kind });
  if (state.logs.length > MAX_LOG_ENTRIES) state.logs.length = MAX_LOG_ENTRIES;
}

// ---------------------------------------------------------------------------
// Bonos por posición (mismas probabilidades que rollLaneBonuses)
// ---------------------------------------------------------------------------

function rollPositionBonuses(fillAll = false): (LaneBonus | null)[] {
  const pos = shuffle([0, 1, 2]);
  const kinds = shuffle([...LANE_BONUS_POOL]);
  const out: (LaneBonus | null)[] = [null, null, null];
  out[pos[0]] = kinds[0];
  out[pos[1]] = kinds[1];
  // MODO JEFE: TODOS los carriles con bono (normalmente solo 2 de 3)
  if (fillAll && kinds[2]) out[pos[2]] = kinds[2];
  return out;
}

/** Activa el MODO JEFE en una partida local: bandera + los 3 carriles con bono.
 *  Llamar DESPUÉS de joinBotPvpState (que ya sorteó los bonos normales). */
export function enableBossMode(state: PvpState): void {
  state.bossMode = true;
  state.positionBonuses = rollPositionBonuses(true);
  state.version++;
}

// ---------------------------------------------------------------------------
// Adaptador de tablero (posicional ↔ claves del jugador en turno)
// ---------------------------------------------------------------------------

function toEngineBoard(state: PvpState, side: PvpSide): Board {
  const other = otherSide(side);
  const board = {} as Board;
  state.players[side].lanes.forEach((laneId, p) => {
    board[laneId] = {
      player: state.positions[p][side].map((c) => ({ ...c })),
      enemy: state.positions[p][other].map((c) => ({ ...c })),
    };
  });
  return board;
}

function writeBack(state: PvpState, side: PvpSide, board: Board): void {
  const other = otherSide(side);
  state.players[side].lanes.forEach((laneId, p) => {
    state.positions[p][side] = board[laneId].player;
    state.positions[p][other] = board[laneId].enemy;
  });
}

export function laneBonusesForSide(state: PvpState, side: PvpSide): LaneBonuses {
  const out = {} as LaneBonuses;
  state.players[side].lanes.forEach((laneId, p) => {
    out[laneId] = state.positionBonuses[p];
  });
  return out;
}

/** Traduce el side relativo del engine ("player"=quien actúa) a a/b. */
function mapLogSide(rel: TriggerResult["logs"][number]["side"], actor: PvpSide): PvpLogEntry["side"] {
  if (rel === "system") return "system";
  return rel === "player" ? actor : otherSide(actor);
}

// ---------------------------------------------------------------------------
// REGLAS SISTÉMICAS V3 — traducción lados absolutos (a/b) ↔ relativos (player)
// ---------------------------------------------------------------------------

/** Reglas relativas al lado que va a actuar (player = `side`, enemy = el otro).
 *  Normaliza salas viejas sin combo/lastSpec (campos opcionales). */
function rulesFor(state: PvpState, side: PvpSide): ClassRulesState {
  const other = otherSide(side);
  return {
    classes: {
      player: state.players[side].gameClass,
      enemy: state.players[other].gameClass,
    },
    comboPoints: {
      player: state.combo?.[side] ?? 0,
      enemy: state.combo?.[other] ?? 0,
    },
    lastSpec: {
      player: state.lastSpec?.[side] ?? null,
      enemy: state.lastSpec?.[other] ?? null,
    },
  };
}

/** Escribe de vuelta las reglas relativas devueltas por el engine. */
function writeRules(state: PvpState, side: PvpSide, rules: ClassRulesState): void {
  const other = otherSide(side);
  state.combo = {
    [side]: rules.comboPoints.player,
    [other]: rules.comboPoints.enemy,
  } as PvpState["combo"];
  state.lastSpec = {
    [side]: rules.lastSpec.player,
    [other]: rules.lastSpec.enemy,
  } as PvpState["lastSpec"];
}

/**
 * Traduce eventos FX relativos del engine (side player/enemy desde el punto
 * de vista de `actor`) a eventos absolutos con lanePos para la vista HTTP.
 */
function fxRelToAbs(fx: FxEvent[], actor: PvpSide, lanes: LaneId[]): PvpLastActionFx[] {
  const out: PvpLastActionFx[] = [];
  for (const f of fx) {
    const lanePos = f.lane !== undefined ? Math.max(0, lanes.indexOf(f.lane)) : 0;
    out.push({
      kind: f.kind,
      keyword: f.keyword,
      recipe: f.recipe,
      lanePos,
      side: f.side === "player" ? actor : otherSide(actor),
      sourceUid: f.sourceUid,
      targetUids: f.targetUids,
      value: f.value,
      delayMs: f.delayMs,
    });
  }
  return out;
}

function pushTriggerLogs(state: PvpState, result: TriggerResult, actor: PvpSide): void {
  for (const l of result.logs) {
    pushLog(state, state.turn, mapLogSide(l.side, actor), l.text, "info");
  }
}

// ---------------------------------------------------------------------------
// Disparadores de turno (start/end) para un lado
// ---------------------------------------------------------------------------

/**
 * Disparadores de turno a prueba de fallos: si un efecto lanza una excepción
 * inesperada (carta custom corrupta, dato fuera de rango…), NO debe bloquear
 * el pase de turno — se registra en el log y la partida continúa. Sin esto,
 * un throw aquí deja la partida clavada para siempre en ese turno (bug de
 * "doy pasar y no pasa").
 */
function fireStartTurn(state: PvpState, side: PvpSide): FxEvent[] {
  try {
    const board = toEngineBoard(state, side);
    const res = applyStartTurnEffects(
      board,
      "player",
      state.players[side].hand,
      state.players[side].lanes,
      rulesFor(state, side),
      state.turn // ESTACIÓN (Botánico V3.0): la temporada madura con el turno global
    );
    writeBack(state, side, res.board);
    if (res.rulesOut) writeRules(state, side, res.rulesOut);
    pushTriggerLogs(state, res, side);
    return res.fx;
  } catch (err) {
    console.error(`[pvp] fireStartTurn(${side}) falló — el turno continúa:`, err);
    pushLog(state, state.turn, "system", "⚠️ Un efecto de inicio de turno falló y fue descartado.", "info");
    return [];
  }
}

function fireEndTurn(state: PvpState, side: PvpSide): FxEvent[] {
  try {
    const board = toEngineBoard(state, side);
    const res = applyEndTurnEffects(board, "player", state.players[side].hand, state.players[side].lanes, rulesFor(state, side));
    writeBack(state, side, res.board);
    if (res.rulesOut) writeRules(state, side, res.rulesOut);
    pushTriggerLogs(state, res, side);
    return res.fx;
  } catch (err) {
    console.error(`[pvp] fireEndTurn(${side}) falló — el turno continúa:`, err);
    pushLog(state, state.turn, "system", "⚠️ Un efecto de fin de turno falló y fue descartado.", "info");
    return [];
  }
}

// ---------------------------------------------------------------------------
// Ciclo de vida de la partida
// ---------------------------------------------------------------------------

export function createPvpState(code: string, input: PvpPlayerInput, now = Date.now()): PvpState {
  const state: PvpState = {
    code,
    version: 1,
    actionSeq: 0,
    phase: "lobby",
    players: {
      a: buildPlayer(input),
      b: {
        name: "",
        gameClass: "guerrero",
        lanes: [...CLASS_META.guerrero.lanes],
        deck: [],
        drawPile: [],
        hand: [],
        energy: 1,
        maxEnergy: 1,
        playsThisTurn: 0,
        nextTurnEnergyPenalty: 0,
      },
    },
    positions: [
      { a: [], b: [] },
      { a: [], b: [] },
      { a: [], b: [] },
    ],
    positionBonuses: [null, null, null],
    turn: 1,
    activeSide: "a",
    firstSide: "a",
    actedThisTurn: { a: false, b: false },
    bossMode: false,
    logs: [],
    lastAction: null,
    finalResultA: null,
    rematch: { a: false, b: false },
    lastSeen: { a: now, b: 0 },
    createdAt: now,
    endedSaved: false,
    combo: { a: 0, b: 0 },
    lastSpec: { a: null, b: null },
  };
  return state;
}

export function joinPvpState(state: PvpState, input: PvpPlayerInput, now = Date.now()): void {
  if (state.phase !== "lobby") throw new Error("La partida ya comenzó.");
  if (state.players.b.name) throw new Error("La sala está llena.");
  state.players.b = buildPlayer(input);
  state.lastSeen.b = now;
  state.version++;
  startPvpMatch(state, now);
}

/**
 * Variante local (modo historia): une un BOT con mazo predeterminado sin
 * pasar por sala online. El anfitrión conserva su mazo materializado.
 */
export function joinBotPvpState(state: PvpState, input: PvpPlayerInput, now = Date.now()): void {
  if (state.phase !== "lobby") throw new Error("La partida ya comenzó.");
  state.players.b = buildPlayer(input);
  state.lastSeen.b = now;
  startPvpMatch(state, now);
}

/**
 * Inicia (o reinicia) la partida: reconstruye mazos, sortea el primer jugador
 * al azar y lanza el arranque del turno 1.
 */
export function startPvpMatch(state: PvpState, now = Date.now()): void {
  for (const s of ["a", "b"] as PvpSide[]) {
    const prev = state.players[s];
    state.players[s] = buildPlayer({ name: prev.name, gameClass: prev.gameClass }, prev.deck);
    state.lastSeen[s] = now;
  }
  const firstSide: PvpSide = Math.random() < 0.5 ? "a" : "b";
  state.firstSide = firstSide;
  state.activeSide = firstSide;
  state.turn = 1;
  state.phase = "playing";
  state.positions = [
    { a: [], b: [] },
    { a: [], b: [] },
    { a: [], b: [] },
  ];
  state.positionBonuses = rollPositionBonuses(state.bossMode);
  state.actedThisTurn = { a: false, b: false };
  state.finalResultA = null;
  state.lastAction = null;
  state.rematch = { a: false, b: false };
  state.endedSaved = false;
  state.logs = [];
  // REGLAS V3: nueva partida → PC a cero y Resonancia sin historial.
  state.combo = { a: 0, b: 0 };
  state.lastSpec = { a: null, b: null };

  const a = state.players.a;
  const b = state.players.b;
  pushLog(state, 1, "system", `¡Comienza la batalla! ${a.name} (${CLASS_META[a.gameClass].label}) vs ${b.name} (${CLASS_META[b.gameClass].label}) — 6 turnos.`);
  const starter = state.players[firstSide];
  pushLog(state, 1, "system", `🎲 Sorteo: ¡${starter.name} juega primero!`);
  const bonusSummary = state.positionBonuses
    .map((bon, i) => bon ? `${i + 1}: ${bon.label}` : `${i + 1}: sin bono`)
    .join(" · ");
  pushLog(state, 1, "system", `Bonos de carril (por pareja): ${bonusSummary}.`);

  const startFx = fireStartTurn(state, firstSide);
  state.lastAction = {
    seq: ++state.actionSeq,
    side: firstSide,
    type: "pass",
    mutations: [],
    fx: fxRelToAbs(startFx, firstSide, state.players[firstSide].lanes),
    bannerFor: firstSide,
  };
  state.version++;
}

export function applyPvpAction(
  state: PvpState,
  side: PvpSide,
  action: PvpAction,
  now = Date.now(),
  /** opts.free: la carta NO cuesta energía (MODO JEFE, 1ª carta de sus
   *  turnos pares). Las restricciones de carril y límite SIGUEN aplicando. */
  opts?: { free?: boolean }
): void {
  if (state.phase !== "playing") throw new Error("La partida no está en curso.");
  if (state.activeSide !== side) throw new Error("No es tu turno.");
  if (!state.players[side].name) throw new Error("No estás en esta sala.");
  state.lastSeen[side] = now;
  if (action.type === "pass") handlePass(state, side);
  else handlePlay(state, side, action, opts);
  state.version++;
}

function handlePlay(state: PvpState, side: PvpSide, action: { uid: string; lane: LaneId }, opts?: { free?: boolean }): void {
  const player = state.players[side];
  const lanePos = player.lanes.indexOf(action.lane);
  if (lanePos < 0) throw new Error("Ese carril no existe para tu clase.");
  const card = player.hand.find((c) => c.uid === action.uid);
  if (!card) throw new Error("Esa carta no está en tu mano.");

  const bonus = laneBonusesForSide(state, side)[action.lane] ?? null;
  if (!isCardCostAllowed(card.cost, bonus)) {
    throw new Error(`"${card.name}" no se puede jugar en ${LANE_META[action.lane].title}: el bono exige coste exacto.`);
  }
  // V3 — el pre-check replica el coste del engine: MAGO con Resonancia (misma
  // spec consecutiva de SU turno) paga −1. Sin esto el pre-check rechazaría
  // jugadas que playCard SÍ aceptaría (atasco del bot mago).
  const isResonancia = player.gameClass === "mago" && (state.lastSpec?.[side] ?? null) === action.lane;
  const effCost = Math.max(0, getFinalCost(card.cost, bonus) - (isResonancia ? V3_RESONANCIA_COST_CUT : 0));
  const freePlay = opts?.free === true;
  if (!freePlay && effCost > player.energy) {
    throw new Error(`Sin energía suficiente para "${card.name}" (necesita ${effCost}, tienes ${player.energy}).`);
  }
  if (state.positions[lanePos][side].length >= getLaneMaxCards(bonus)) {
    throw new Error(`El carril ${LANE_META[action.lane].title} está lleno (máx. ${getLaneMaxCards(bonus)} por bando).`);
  }

  const preBoard = toEngineBoard(state, side);
  const rulesIn = rulesFor(state, side);
  let res: PlayResult;
  try {
    res = playCard(
      preBoard,
      player.hand,
      // Jugada GRATIS (jefe): energía prestada = coste efectivo EXACTO para
      // que el engine la descuenta sin tocar la real (ni +1 de propina si el
      // bono reduce el coste — por eso effCost y no card.cost).
      player.energy + (freePlay ? effCost : 0),
      "player",
      action.lane,
      card,
      bonus,
      null,
      player.playsThisTurn + 1,
      rulesIn
    );
  } catch (e) {
    throw new Error((e as Error).message);
  }
  if (res.rulesOut) writeRules(state, side, res.rulesOut);

  writeBack(state, side, res.board);
  player.hand = res.hand;
  player.energy = res.remainingEnergy;
  player.playsThisTurn += 1;
  if (res.energyNextTurnDelta) {
    player.nextTurnEnergyPenalty += res.energyNextTurnDelta;
  }

  pushLog(state, state.turn, side, `${player.name} juega "${card.name}" en ${LANE_META[action.lane].title} (Poder ${res.playedCard.currentPower}).`, "play");
  // REGLAS V3 — log compacto de la regla sistémica si disparó:
  if (res.resonancia) {
    pushLog(state, state.turn, side, `🔮 Resonancia de escuela: "${card.name}" entra +${V3_RESONANCIA_POWER} y cuesta −${V3_RESONANCIA_COST_CUT} (misma spec consecutiva).`, "buff");
  }
  if ((res.comboConsumed ?? 0) > 0) {
    pushLog(state, state.turn, side, `🗡️ Marca de ejecución: consume ${res.comboConsumed} PC → +${res.comboConsumed! * V3_COMBO_POWER} a "${card.name}".`, "buff");
  }
  if ((res.comboGained ?? 0) > 0) {
    pushLog(state, state.turn, side, `🗡️ Marca de ejecución: +${res.comboGained} PC (${state.combo?.[side] ?? 0}/${V3_COMBO_CAP}).`, "info");
  }
  for (const m of res.mutations) {
    const mSide = m.side === "player" ? side : otherSide(side);
    if (m.powerDelta === 0 && m.shieldDelta !== undefined && m.shieldDelta !== 0) {
      pushLog(state, state.turn, mSide, `Escudo +${m.shieldDelta} en ${LANE_META[m.lane].title}.`, "buff");
      continue;
    }
    if (m.powerDelta === 0) continue;
    const sign = m.powerDelta > 0 ? "+" : "";
    pushLog(
      state,
      state.turn,
      mSide,
      `${m.powerDelta > 0 ? "Buff" : "Debuff"} ${sign}${m.powerDelta} en ${LANE_META[m.lane].title} (${mSide === side ? player.name : state.players[otherSide(side)].name}).`,
      m.powerDelta > 0 ? "buff" : "debuff"
    );
  }

  // Cadena de muertes → on_death (la carta muerta se busca en el tablero PRE-jugada)
  let latest = res.board;
  for (const rc of res.removedCards) {
    const deadCard = preBoard[rc.lane][rc.side].find((c) => c.uid === rc.uid);
    if (!deadCard) continue;
    const deathRes = applyOnDeathEffects(latest, rc.side, rc.lane, deadCard, rulesFor(state, side));
    latest = deathRes.board;
    if (deathRes.rulesOut) writeRules(state, side, deathRes.rulesOut);
    pushTriggerLogs(state, deathRes, side);
    pushLog(
      state,
      state.turn,
      rc.side === "player" ? side : otherSide(side),
      `Carta destruida en ${LANE_META[rc.lane].title} (${rc.reason}).`,
      "debuff"
    );
  }
  if (res.removedCards.length > 0) writeBack(state, side, latest);

  state.actionSeq++;
  state.lastAction = {
    seq: state.actionSeq,
    side,
    type: "play",
    lane: action.lane,
    cardName: card.name,
    playedUid: res.playedCard.uid,
    playedRarity: card.rarity,
    mutations: res.mutations.map((m) => ({
      side: m.side === "player" ? side : otherSide(side),
      uid: m.uid,
      powerDelta: m.powerDelta,
      shieldDelta: m.shieldDelta,
    })),
    fx: buildPlayFx(res, side, action.lane, player.lanes),
  };
}

/**
 * Construye los eventos FX de una jugada PvP: colocación, keyword on_play
 * (agrupada por bando afectado), destrucciones, escudos y trampa.
 */
function buildPlayFx(
  res: PlayResult,
  actor: PvpSide,
  lane: LaneId,
  lanes: LaneId[]
): PvpLastActionFx[] {
  const events = eventsFromPlayResult(res, lane, "player");
  // RITUALES DE CLASE V3 (grupo A): la jugada que dispara Resonancia o cobra
  // PC añade SU evento dedicado (el FxLayer lo pinta como momento firma).
  if (res.resonancia) {
    events.push({
      kind: "class",
      recipe: "resonance_runes",
      lane,
      side: "player",
      sourceUid: res.playedCard.uid,
      targetUids: [res.playedCard.uid],
      value: V3_RESONANCIA_POWER,
      delayMs: 260, // tras la colocación (play_dust a 200ms)
    });
  }
  if ((res.comboConsumed ?? 0) > 0) {
    events.push({
      kind: "class",
      recipe: "combo_blades",
      lane,
      side: "player",
      sourceUid: res.playedCard.uid,
      targetUids: [res.playedCard.uid],
      value: res.comboConsumed,
      delayMs: 260,
    });
  }
  const mapped = fxRelToAbs(events, actor, lanes);
  // Las destrucciones con receta propia (Remate/Purga) ya viajan dentro de
  // eventsFromPlayResult; el shatter genérico lo complementa el cliente.
  return mapped;
}

function handlePass(state: PvpState, side: PvpSide): void {
  const player = state.players[side];
  const endFx = fireEndTurn(state, side);
  state.actedThisTurn[side] = true;
  pushLog(state, state.turn, side, `${player.name} pasa el turno.`, "info");

  const other = otherSide(side);
  if (!state.actedThisTurn[other]) {
    state.activeSide = other;
    const startFx = fireStartTurn(state, other);
    state.lastAction = {
      seq: ++state.actionSeq,
      side,
      type: "pass",
      mutations: [],
      fx: [
        ...fxRelToAbs(endFx, side, state.players[side].lanes),
        ...fxRelToAbs(startFx, other, state.players[other].lanes),
      ],
      bannerFor: other,
    };
    return;
  }
  // FIX RITUAL: el fx de FIN de turno del segundo pasador (Formación del
  // Guerrero, Fortaleza, Ventisca…) antes se PERDÍA — advanceTurn machacaba
  // lastAction con solo los fx de inicio. Ahora viaja con el nuevo turno.
  advanceTurn(state, endFx, side);
}

function advanceTurn(
  state: PvpState,
  /** fx de FIN de turno del lado que acaba de pasar (rituales/keywords end_turn). */
  prevEndFx?: FxEvent[],
  prevSide?: PvpSide
): void {
  const newTurn = state.turn + 1;
  state.actedThisTurn = { a: false, b: false };

  if (newTurn > MAX_TURNS) {
    const boardA = toEngineBoard(state, "a");
    const final = computeFinalResult(boardA, state.players.a.lanes);
    state.finalResultA = final;
    state.phase = "ended";
    pushLog(
      state,
      MAX_TURNS,
      "system",
      `Fin del juego: ${state.players.a.name} ${final.playerWins} — ${final.enemyWins} ${state.players.b.name} (E ${final.draws}).`,
      "end"
    );
    state.lastAction = { seq: ++state.actionSeq, side: "a", type: "pass", mutations: [] };
    return;
  }

  state.turn = newTurn;
  // Regla de apertura FIJA (fix "turno mareado"): siempre abre firstSide,
  // decidido en el sorteo inicial. Así, tras CUALQUIER pase el turno pasa al
  // OTRO jugador (o termina la partida) — nunca le vuelve a tocar al mismo
  // que acabó de pasar. La alternativa anterior (alternar abridor) hacía que
  // quien cerrara el turno abriera el siguiente y pareciera que el pase "no pasaba".
  const first: PvpSide = state.firstSide;
  state.activeSide = first;

  for (const s of ["a", "b"] as PvpSide[]) {
    const p = state.players[s];
    p.maxEnergy = Math.min(MAX_TURNS, p.maxEnergy + 1);
    p.energy = Math.max(0, p.maxEnergy + p.nextTurnEnergyPenalty);
    p.nextTurnEnergyPenalty = 0;
    p.playsThisTurn = 0;
    if (p.hand.length < MAX_HAND_SIZE && p.drawPile.length > 0) {
      const drawn = p.drawPile.pop()!;
      p.hand.push({ ...drawn, uid: uuidv4(), handBonus: 0 });
    }
  }

  pushLog(state, newTurn, "system", `Turno ${newTurn} — abre ${state.players[first].name}. Energía ${state.players.a.maxEnergy} para ambos.`);

  // Re-roll de bonos en el turno 4 (misma regla que solitario)
  if (newTurn === 4) {
    state.positionBonuses = rollPositionBonuses(state.bossMode);
    pushLog(state, newTurn, "system", "🎲 ¡Bonos de carril re-rollados!", "buff");
  }

  const startFx = fireStartTurn(state, first);
  state.lastAction = {
    seq: ++state.actionSeq,
    side: first,
    type: "pass",
    mutations: [],
    fx: [
      ...(prevEndFx && prevSide
        ? fxRelToAbs(prevEndFx, prevSide, state.players[prevSide].lanes)
        : []),
      ...fxRelToAbs(startFx, first, state.players[first].lanes),
    ],
    bannerFor: first,
  };
}

export function requestRematch(state: PvpState, side: PvpSide, now = Date.now()): void {
  if (state.phase !== "ended") return;
  state.rematch[side] = true;
  state.lastSeen[side] = now;
  if (state.rematch.a && state.rematch.b) {
    // Mismas clases, mismos nombres, mazos intactos — NUEVO sorteo de primer jugador.
    startPvpMatch(state, now);
  }
  state.version++;
}

export function touchPresence(state: PvpState, side: PvpSide, now = Date.now()): void {
  state.lastSeen[side] = now;
}

// ---------------------------------------------------------------------------
// Vista saneada
// ---------------------------------------------------------------------------

function flipFinalResult(f: FinalResult, side: PvpSide): FinalResult {
  if (side === "a") return f;
  return {
    result: f.result === "WIN" ? "LOSS" : f.result === "LOSS" ? "WIN" : "DRAW",
    playerWins: f.enemyWins,
    enemyWins: f.playerWins,
    draws: f.draws,
    laneOutcomes: f.laneOutcomes.map((lo) => ({
      ...lo,
      playerScore: lo.enemyScore,
      enemyScore: lo.playerScore,
      winner: lo.winner === "player" ? "enemy" : lo.winner === "enemy" ? "player" : "draw",
    })),
    totalPlayer: f.totalEnemy,
    totalEnemy: f.totalPlayer,
  };
}

export function buildClientView(state: PvpState, side: PvpSide, now = Date.now()): PvpClientView {
  const other = otherSide(side);
  const me = state.players[side];
  const rival = state.players[other];
  return {
    code: state.code,
    version: state.version,
    phase: state.phase,
    you: {
      side,
      name: me.name,
      gameClass: me.gameClass,
      lanes: me.lanes,
      laneBonuses: laneBonusesForSide(state, side),
      hand: me.hand,
      energy: me.energy,
      maxEnergy: me.maxEnergy,
      drawPileCount: me.drawPile.length,
      comboPoints: state.combo?.[side] ?? 0,
      lastSpec: state.lastSpec?.[side] ?? null,
    },
    rival: {
      name: rival.name || "Esperando rival…",
      gameClass: rival.gameClass,
      lanes: rival.lanes,
      laneBonuses: laneBonusesForSide(state, other),
      handCount: rival.hand.length,
      energy: rival.energy,
      maxEnergy: rival.maxEnergy,
      drawPileCount: rival.drawPile.length,
      rivalComboPoints: state.combo?.[other] ?? 0,
      connected: !!rival.name && now - state.lastSeen[other] < PVP_CONNECTED_MS,
    },
    board: toEngineBoard(state, side),
    turn: state.turn,
    maxTurns: MAX_TURNS,
    activeSide: state.activeSide,
    yourTurn: state.phase === "playing" && state.activeSide === side,
    logs: state.logs,
    lastAction: state.lastAction,
    finalResult: state.finalResultA ? flipFinalResult(state.finalResultA, side) : null,
    rematch: { you: state.rematch[side], rival: state.rematch[other] },
    lobby: {
      hostName: state.players.a.name,
      hostClass: state.players.a.gameClass,
      guestName: state.players.b.name,
      guestClass: state.players.b.gameClass,
      guestJoined: !!state.players.b.name,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// RECONCILIACIÓN ESTRUCTURAL DE LA VISTA (perf móvil, Task 46)
//
// buildClientView construye objetos FRESCOS en cada llamada; sin reconciliación,
// cada applyView cambia la identidad de TODO el árbol (6 carriles + ~12 minis +
// mano + strips) y el memo() de React no sirve de nada: cada acción re-renderiza
// el tablero completo (medido en móvil emulado: 40-48ms input→paint por PASAR —
// la "pegadera" que el jugador sigue notando).
//
// reconcileView devuelve la vista equivalente pero REUTILIZANDO las referencias
// previas de todo lo que no cambió por valor → los memo() reales funcionan y el
// re-render por acción toca SOLO lo que cambió (energía, una carta, la mano…).
//
// PUREZA: no muta nada; solo decide qué referencias conservar. Todo lo que
// compara son campos que pinta la UI — la línea roja bot=player no se toca
// (funciona idéntico para ambas vistas, sea local u online).
// ═══════════════════════════════════════════════════════════════════════════

/** Huella visual de una carta en tablero: si coincide con la previa, la UI
 *  pinta exactamente lo mismo → reutiliza la referencia previa. */
const boardCardFp = (c: BoardCard): string =>
  `${c.uid}|${c.defId}|${c.cost}|${c.basePower}|${c.currentPower}|${c.rarity}|` +
  `${c.keywordValue ?? ""}|${c.shieldRemaining ?? 0}|${c.debuffTaken ?? 0}|` +
  `${c.formation ?? 0}|${c.powerLog?.length ?? 0}|${c.text?.length ?? 0}`;

/** Huella visual de una carta en mano. */
const handCardFp = (c: HandCard): string =>
  `${c.uid}|${c.power}|${c.handBonus}|${c.costReduction ?? 0}|${c.handBonusSources?.length ?? 0}`;

/** Reconcilia un array elemento a elemento: items con la misma huella conservan
 *  la referencia previa; si TODOS se conservan, el array entero mantiene su
 *  identidad (el memo del consumidor salta el re-render completo). */
function reconcileArr<T>(prev: readonly T[] | undefined, next: readonly T[], fp: (x: T) => string): T[] {
  if (!prev || prev.length !== next.length) return [...next];
  const out: T[] = [];
  let allSame = true;
  for (let i = 0; i < next.length; i++) {
    const p = prev[i];
    const n = next[i];
    if (p === n) { out.push(n); continue; }
    const kept = fp(p) === fp(n) ? p : n;
    if (kept !== p) allSame = false;
    out.push(kept);
  }
  return allSame ? (prev as T[]) : out;
}

const laneBonusSame = (a: LaneBonus | null | undefined, b: LaneBonus | null | undefined): boolean =>
  a === b || (!!a && !!b && a.kind === b.kind && a.label === b.label && a.description === b.description && a.flavor === b.flavor);

const laneBonusesSame = (a: LaneBonuses, b: LaneBonuses): boolean =>
  (Object.keys(b) as LaneId[]).every((k) => laneBonusSame(a[k], b[k]));

const stripSame = (
  a: PvpClientView["you"] | PvpClientView["rival"],
  b: PvpClientView["you"] | PvpClientView["rival"],
  isYou: boolean
): boolean => {
  if (
    a.name !== b.name || a.gameClass !== b.gameClass ||
    a.lanes.join() !== b.lanes.join() || a.energy !== b.energy || a.maxEnergy !== b.maxEnergy ||
    a.drawPileCount !== b.drawPileCount || !laneBonusesSame(a.laneBonuses, b.laneBonuses)
  ) return false;
  if (isYou) {
    const u = a as PvpClientView["you"], v = b as PvpClientView["you"];
    if (u.side !== v.side || u.comboPoints !== v.comboPoints || u.lastSpec !== v.lastSpec) return false;
  } else {
    const u = a as PvpClientView["rival"], v = b as PvpClientView["rival"];
    if (u.handCount !== v.handCount || u.rivalComboPoints !== v.rivalComboPoints || u.connected !== v.connected) return false;
  }
  return true;
};

export function reconcileView(prev: PvpClientView, next: PvpClientView): PvpClientView {
  // ── board: carril a carril, bando a bando ──
  const board = next.board;
  const prevBoard = prev.board;
  let boardSame = true;
  const reconciledBoard: Board = { ...board };
  for (const laneId of Object.keys(board) as LaneId[]) {
    const pos = board[laneId];
    const prevPos = prevBoard?.[laneId];
    if (prevPos === pos) continue;
    const player = reconcileArr(prevPos?.player, pos.player, boardCardFp);
    const enemy = reconcileArr(prevPos?.enemy, pos.enemy, boardCardFp);
    if (player === prevPos?.player && enemy === prevPos?.enemy && prevPos) {
      reconciledBoard[laneId] = prevPos;
      continue;
    }
    reconciledBoard[laneId] = { player, enemy };
    boardSame = false;
  }

  // ── hand ──
  const hand = reconcileArr(prev.you?.hand, next.you.hand, handCardFp);

  // ── strips you/rival (campos primitivos + refs reconciliadas) ──
  let you = next.you;
  if (prev.you && stripSame(prev.you, next.you, true) && hand === prev.you.hand) you = prev.you;
  let rivalStrip = next.rival;
  if (prev.rival && stripSame(prev.rival, next.rival, false)) rivalStrip = prev.rival;

  // ── lastAction / logs (solo crecen; identidad por secuencia) ──
  const lastAction =
    prev.lastAction && next.lastAction &&
    prev.lastAction.seq === next.lastAction.seq && prev.lastAction.type === next.lastAction.type
      ? prev.lastAction
      : next.lastAction;
  const logs =
    prev.logs === next.logs ||
    (prev.logs?.length === next.logs.length &&
      prev.logs[prev.logs.length - 1]?.id === next.logs[next.logs.length - 1]?.id)
      ? prev.logs
      : next.logs;

  const lanesYouSame = !!prev.you && prev.you.lanes === next.you.lanes;
  const lanesRivalSame = !!prev.rival && prev.rival.lanes === next.rival.lanes;

  // Si absolutamente todo mantuvo identidad, ni siquiera cambie el objeto raíz.
  const everythingSame =
    boardSame && you === prev.you && rivalStrip === prev.rival &&
    lastAction === prev.lastAction && logs === prev.logs &&
    next.phase === prev.phase && next.turn === prev.turn &&
    next.yourTurn === prev.yourTurn && next.version === prev.version &&
    next.activeSide === prev.activeSide &&
    next.finalResult === prev.finalResult && lanesYouSame && lanesRivalSame;
  if (everythingSame) return prev;

  return {
    ...next,
    board: boardSame ? prevBoard : reconciledBoard,
    you,
    rival: rivalStrip,
    lastAction,
    logs,
  };
}
