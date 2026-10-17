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
  type Board,
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
} from "./types";
import { CLASS_DECKS, buildDrawPileFrom, cardPoolForClass } from "./cards";
import { v4 as uuidv4 } from "uuid";

// ---------------------------------------------------------------------------
// Sides & timing
// ---------------------------------------------------------------------------

export type PvpSide = "a" | "b";
export const otherSide = (s: PvpSide): PvpSide => (s === "a" ? "b" : "a");

/** Milisegundos de gracia antes de marcar al rival como desconectado. */
export const PVP_CONNECTED_MS = 12000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PvpPlayer {
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
export interface PvpLanePos {
  a: BoardCard[];
  b: BoardCard[];
}

export interface PvpLogEntry {
  id: string;
  turn: number;
  side: PvpSide | "system";
  text: string;
  kind: "play" | "buff" | "debuff" | "info" | "end";
}

/** Mutación para números flotantes (lados ya mapeados a a/b). */
export interface PvpFloatMutation {
  side: PvpSide;
  uid: string;
  powerDelta: number;
  shieldDelta?: number;
}

export interface PvpLastAction {
  seq: number;
  side: PvpSide;
  type: "play" | "pass";
  lane?: LaneId;
  cardName?: string;
  playedUid?: string;
  playedRarity?: BoardCard["rarity"];
  mutations: PvpFloatMutation[];
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
  logs: PvpLogEntry[];
  lastAction: PvpLastAction | null;
  /** Resultado final desde la perspectiva del lado A. */
  finalResultA: FinalResult | null;
  rematch: { a: boolean; b: boolean };
  lastSeen: { a: number; b: number };
  createdAt: number;
  endedSaved: boolean;
}

export interface PvpPlayerInput {
  name: string;
  gameClass: GameClass;
  /** Opcional: ids del mazo custom (12 únicos del pool de la clase). */
  deckIds?: string[];
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
export function resolvePvpDeck(cls: GameClass, deckIds?: string[]): CardDef[] {
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
  const resolvedDeck = deck ?? resolvePvpDeck(input.gameClass, input.deckIds);
  const pile: HandCard[] = buildDrawPileFrom(resolvedDeck).map((c) => ({
    ...c,
    uid: uuidv4(),
    handBonus: 0,
  }));
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

function rollPositionBonuses(): (LaneBonus | null)[] {
  const pos = shuffle([0, 1, 2]);
  const kinds = shuffle([...LANE_BONUS_POOL]);
  const out: (LaneBonus | null)[] = [null, null, null];
  out[pos[0]] = kinds[0];
  out[pos[1]] = kinds[1];
  return out;
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

function pushTriggerLogs(state: PvpState, result: TriggerResult, actor: PvpSide): void {
  for (const l of result.logs) {
    pushLog(state, state.turn, mapLogSide(l.side, actor), l.text, "info");
  }
}

// ---------------------------------------------------------------------------
// Disparadores de turno (start/end) para un lado
// ---------------------------------------------------------------------------

function fireStartTurn(state: PvpState, side: PvpSide): void {
  const board = toEngineBoard(state, side);
  const res = applyStartTurnEffects(board, "player", state.players[side].hand, state.players[side].lanes);
  writeBack(state, side, res.board);
  pushTriggerLogs(state, res, side);
}

function fireEndTurn(state: PvpState, side: PvpSide): void {
  const board = toEngineBoard(state, side);
  const res = applyEndTurnEffects(board, "player", state.players[side].hand, state.players[side].lanes);
  writeBack(state, side, res.board);
  pushTriggerLogs(state, res, side);
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
    logs: [],
    lastAction: null,
    finalResultA: null,
    rematch: { a: false, b: false },
    lastSeen: { a: now, b: 0 },
    createdAt: now,
    endedSaved: false,
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
  state.positionBonuses = rollPositionBonuses();
  state.actedThisTurn = { a: false, b: false };
  state.finalResultA = null;
  state.lastAction = null;
  state.rematch = { a: false, b: false };
  state.endedSaved = false;
  state.logs = [];

  const a = state.players.a;
  const b = state.players.b;
  pushLog(state, 1, "system", `¡Comienza la batalla! ${a.name} (${CLASS_META[a.gameClass].label}) vs ${b.name} (${CLASS_META[b.gameClass].label}) — 6 turnos.`);
  const starter = state.players[firstSide];
  pushLog(state, 1, "system", `🎲 Sorteo: ¡${starter.name} juega primero!`);
  const bonusSummary = state.positionBonuses
    .map((bon, i) => bon ? `${i + 1}: ${bon.label}` : `${i + 1}: sin bono`)
    .join(" · ");
  pushLog(state, 1, "system", `Bonos de carril (por pareja): ${bonusSummary}.`);

  fireStartTurn(state, firstSide);
  state.lastAction = { seq: ++state.actionSeq, side: firstSide, type: "pass", mutations: [], bannerFor: firstSide };
  state.version++;
}

export function applyPvpAction(state: PvpState, side: PvpSide, action: PvpAction, now = Date.now()): void {
  if (state.phase !== "playing") throw new Error("La partida no está en curso.");
  if (state.activeSide !== side) throw new Error("No es tu turno.");
  if (!state.players[side].name) throw new Error("No estás en esta sala.");
  state.lastSeen[side] = now;
  if (action.type === "pass") handlePass(state, side);
  else handlePlay(state, side, action);
  state.version++;
}

function handlePlay(state: PvpState, side: PvpSide, action: { uid: string; lane: LaneId }): void {
  const player = state.players[side];
  const lanePos = player.lanes.indexOf(action.lane);
  if (lanePos < 0) throw new Error("Ese carril no existe para tu clase.");
  const card = player.hand.find((c) => c.uid === action.uid);
  if (!card) throw new Error("Esa carta no está en tu mano.");

  const bonus = laneBonusesForSide(state, side)[action.lane] ?? null;
  if (!isCardCostAllowed(card.cost, bonus)) {
    throw new Error(`"${card.name}" no se puede jugar en ${LANE_META[action.lane].title}: el bono exige coste exacto.`);
  }
  const effCost = getFinalCost(card.cost, bonus);
  if (effCost > player.energy) {
    throw new Error(`Sin energía suficiente para "${card.name}" (necesita ${effCost}, tienes ${player.energy}).`);
  }
  if (state.positions[lanePos][side].length >= getLaneMaxCards(bonus)) {
    throw new Error(`El carril ${LANE_META[action.lane].title} está lleno (máx. ${getLaneMaxCards(bonus)} por bando).`);
  }

  const preBoard = toEngineBoard(state, side);
  let res: PlayResult;
  try {
    res = playCard(
      preBoard,
      player.hand,
      player.energy,
      "player",
      action.lane,
      card,
      bonus,
      null,
      player.playsThisTurn + 1
    );
  } catch (e) {
    throw new Error((e as Error).message);
  }

  writeBack(state, side, res.board);
  player.hand = res.hand;
  player.energy = res.remainingEnergy;
  player.playsThisTurn += 1;
  if (res.energyNextTurnDelta) {
    player.nextTurnEnergyPenalty += res.energyNextTurnDelta;
  }

  pushLog(state, state.turn, side, `${player.name} juega "${card.name}" en ${LANE_META[action.lane].title} (Poder ${res.playedCard.currentPower}).`, "play");
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
    const deathRes = applyOnDeathEffects(latest, rc.side, rc.lane, deadCard);
    latest = deathRes.board;
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
  };
}

function handlePass(state: PvpState, side: PvpSide): void {
  const player = state.players[side];
  fireEndTurn(state, side);
  state.actedThisTurn[side] = true;
  pushLog(state, state.turn, side, `${player.name} pasa el turno.`, "info");

  const other = otherSide(side);
  if (!state.actedThisTurn[other]) {
    state.activeSide = other;
    fireStartTurn(state, other);
    state.lastAction = {
      seq: ++state.actionSeq,
      side,
      type: "pass",
      mutations: [],
      bannerFor: other,
    };
    return;
  }
  advanceTurn(state);
}

function advanceTurn(state: PvpState): void {
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
  // El arranque del turno alterna: T1 → firstSide, T2 → el otro, T3 → firstSide…
  const first: PvpSide = newTurn % 2 === 1 ? state.firstSide : otherSide(state.firstSide);
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

  pushLog(state, newTurn, "system", `Turno ${newTurn} — energía ${state.players.a.maxEnergy} para ambos.`);

  // Re-roll de bonos en el turno 4 (misma regla que solitario)
  if (newTurn === 4) {
    state.positionBonuses = rollPositionBonuses();
    pushLog(state, newTurn, "system", "🎲 ¡Bonos de carril re-rollados!", "buff");
  }

  fireStartTurn(state, first);
  state.lastAction = {
    seq: ++state.actionSeq,
    side: first,
    type: "pass",
    mutations: [],
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
