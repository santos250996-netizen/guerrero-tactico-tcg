// ============================================================================
// GUERRERO TÁCTICO — ENGINE V2 (limpieza total, spec 2026-10)
// ============================================================================
// Solo 4 triggers: on_play / start_turn / end_turn / on_death.
// 12 keywords (6 neutrales + 6 de Guerrero) resueltas por `keyword` en:
//   - on_play    → applyEffectLogic (dentro de computeEffect, antes de colocarse)
//   - start_turn → applyStartTurnEffects
//   - end_turn   → applyEndTurnEffects
//   - on_death   → applyOnDeathEffects
//
// Escudos: `shieldRemaining` por carta (Coraza/Amparo). Pool finito, SIN
// refresco. Solo `applyDebuff` consulta escudos — las mutaciones directas de
// on_play (Hender Armadura) los ignoran por diseño (keyword perforante).
//
// Purificación: `debuffTaken` acumula los puntos de reducción sufridos por
// cada carta; Purificación los restaura y pone a cero.
// ============================================================================

import type {
  BoardCard,
  CardDef,
  EffectId,
  FinalResult,
  GameClass,
  HandCard,
  LaneBonus,
  LaneBonuses,
  LaneId,
  LaneOutcome,
  LaneState,
  PowerLogEntry,
  Keyword,
} from "./types";
import { CLASS_META, KEYWORD_META, LANE_ADJACENT, LANE_BONUS_POOL, LANE_META } from "./types";
import type { FxEvent } from "./fx";
import { recordKeyword, recordKeywordNoop } from "./keyword-stats";
import { v4 as uuidv4 } from "uuid";

export type Board = Record<LaneId, LaneState>;

export const LANE_IDS: LaneId[] = ["armas", "proteccion", "furia"];
export const ALL_LANE_IDS: LaneId[] = [
  ...CLASS_META.guerrero.lanes,
  ...CLASS_META.mago.lanes,
  ...CLASS_META.asesino.lanes,
  // V3.0 — Botánico · Pirata · Tinker (los Records del juego exigen cobertura
  // total de LaneId; las clases quedan ocultas en UI hasta V3_CLASSES_UNLOCKED)
  ...CLASS_META.botanico.lanes,
  ...CLASS_META.pirata.lanes,
  ...CLASS_META.tinker.lanes,
];

/** Carriles activos de una clase (el tablero de la partida usa solo estos 3). */
export function lanesForClass(cls: GameClass): LaneId[] {
  return CLASS_META[cls].lanes;
}

export const MAX_TURNS = 6;
export const MAX_HAND_SIZE = 7;
export const MAX_LANE_CARDS = 4;
export const STARTING_HAND_SIZE = 5;

// ---------------------------------------------------------------------------
// REGLAS SISTÉMICAS DE CLASE (V3) — UNA regla por clase, ligada a los carriles
// ---------------------------------------------------------------------------
// El mismo motor las ejecuta para AMBOS lados (bot y jugador por igual — línea
// roja del proyecto: nada de mecánicas exclusivas de la IA). Sin `rules`
// declaradas (tests legacy, solitario sin clase) las reglas están INACTIVAS.
//
//  ⚔ GUERRERO — FORMACIÓN DE COMBATE: al final de tu turno, cada carril con
//    2+ cartas propias activas da +1 permanente a TODAS tus cartas de ese
//    carril. El bonus de Formación por carta tiene TOPE +1 (anti-bola-de-nieve, calibrado por sim).
//  🔮 MAGO — RESONANCIA DE ESCUELA: si juegas una carta en el MISMO carril
//    que tu jugada anterior DE ESTE TURNO, esa carta entra con +2 de poder y
//    −1 de coste (suelo 0). Cadenas permitidas (Fuego→Fuego→Fuego resuena x2).
//  🗡 ASESINO — MARCA DE EJECUCIÓN: cada vez que una carta tuya reduce el
//    poder de una unidad enemiga ganas 1 Punto de Combo (PC, tope 5, persisten
//    entre turnos). Al jugar en un carril con un enemigo DEBILITADO (poder
//    actual < base), consumes TODOS tus PC: +V3_COMBO_POWER de poder por PC.
// ---------------------------------------------------------------------------

/** Valores de balance V3 — únicos números a tocar si el sim pide ajuste. */
export const V3_FORMACION_CAP = 1;
export const V3_RESONANCIA_POWER = 2;
export const V3_RESONANCIA_COST_CUT = 1;
export const V3_COMBO_CAP = 5;
export const V3_COMBO_POWER = 4;
// V3.0 — reglas sistémicas de las clases nuevas (T-A, plan-expansion-v3 §2):
export const V3_VIENTO_POWER = 1; // Pirata — «Viento de Popa»: +1 por carta mientras vayas con menos tripulación
export const V3_TALLER_POWER = 1; // Tinker — «Taller de Campamento»: los Ítems entran con +1
export const V3_ESTACION_TURN = 4; // Botánico — la Estación madura (+2X) desde este turno

export interface ClassRulesState {
  /** Clase de cada lado RELATIVO (player = quien actúa en la llamada). null = regla inactiva. */
  classes: { player: GameClass | null; enemy: GameClass | null };
  /** Puntos de Combo por lado (solo crecen si la clase es asesino). */
  comboPoints: { player: number; enemy: number };
  /** Último carril donde jugó cada lado EN SU TURNO ACTUAL (Resonancia). */
  lastSpec: { player: LaneId | null; enemy: LaneId | null };
}

export function emptyClassRules(): ClassRulesState {
  return {
    classes: { player: null, enemy: null },
    comboPoints: { player: 0, enemy: 0 },
    lastSpec: { player: null, enemy: null },
  };
}

/** Suma n PC a un lado respetando el tope (muta el objeto de reglas). */
function grantCombo(rules: ClassRulesState, side: "player" | "enemy", n: number): void {
  if (rules.classes[side] !== "asesino" || n <= 0) return;
  rules.comboPoints[side] = Math.min(V3_COMBO_CAP, rules.comboPoints[side] + n);
}

function cloneRules(rules: ClassRulesState): ClassRulesState {
  return {
    classes: { ...rules.classes },
    comboPoints: { ...rules.comboPoints },
    lastSpec: { ...rules.lastSpec },
  };
}

// ---------------------------------------------------------------------------
// Trap state (plumbing preserved — no current keyword sets traps)
// ---------------------------------------------------------------------------

export interface TrapState {
  owner: "player" | "enemy";
  value: number;
}

export type LaneTraps = Record<LaneId, TrapState | null>;

export function emptyLaneTraps(): LaneTraps {
  return Object.fromEntries(ALL_LANE_IDS.map((ln) => [ln, null])) as LaneTraps;
}

/**
 * Tablero VACÍO con TODOS los carriles del catálogo (18 en V3.0). Lo usan los
 * tests y cualquier flujo que quiera un tablero válido sin conocer la clase.
 */
export function emptyBoard(): Board {
  return Object.fromEntries(
    ALL_LANE_IDS.map((ln) => [ln, { player: [], enemy: [] }])
  ) as unknown as Board;
}

// ---------------------------------------------------------------------------
// Per-game lane bonuses: 2 random lanes get a bonus (no repeats), 1 has none
// ---------------------------------------------------------------------------

export function rollLaneBonuses(lanes: LaneId[] = LANE_IDS): LaneBonuses {
  // Pick 2 random lanes (no repeats)
  const pool_lanes = [...lanes];
  for (let i = pool_lanes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool_lanes[i], pool_lanes[j]] = [pool_lanes[j], pool_lanes[i]];
  }
  const chosenLanes = pool_lanes.slice(0, 2);
  const remainingLane = pool_lanes[2];

  // Pick 2 random bonus kinds (no repeats)
  const pool = [...LANE_BONUS_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const chosenBonuses = pool.slice(0, 2);

  return {
    [chosenLanes[0]]: chosenBonuses[0],
    [chosenLanes[1]]: chosenBonuses[1],
    [remainingLane]: null,
  } as LaneBonuses;
}

// ---------------------------------------------------------------------------
// Lane bonus helpers: effective cost, max cards per side, validation
// ---------------------------------------------------------------------------

export function getEffectiveCost(baseCost: number, bonus: LaneBonus | null): number {
  if (!bonus) return baseCost;
  if (bonus.kind === "cost_neg") return Math.max(0, baseCost - 1);
  if (bonus.kind === "cost_pos") return baseCost + 1;
  return baseCost;
}

/** Final energy cost of a card after lane bonus adjustments. */
export function getFinalCost(baseCost: number, bonus: LaneBonus | null): number {
  return getEffectiveCost(baseCost, bonus);
}

export function getLaneMaxCards(bonus: LaneBonus | null): number {
  if (!bonus) return MAX_LANE_CARDS;
  if (bonus.kind === "limit_1") return 1;
  if (bonus.kind === "limit_3") return 3;
  return MAX_LANE_CARDS;
}

export function isCardCostAllowed(cardCost: number, bonus: LaneBonus | null): boolean {
  if (!bonus) return true;
  if (bonus.kind === "cost_only_1") return cardCost === 1;
  if (bonus.kind === "cost_only_3") return cardCost === 3;
  if (bonus.kind === "cost_only_5") return cardCost === 5;
  return true;
}

export function getLaneBonusPower(
  cardCategory: CardDef["category"],
  bonus: LaneBonus | null
): number {
  if (!bonus) return 0;
  if (bonus.kind === "cat_ataque" && cardCategory === "Ataque") return 3;
  if (bonus.kind === "cat_item" && cardCategory === "Ítem") return 3;
  if (bonus.kind === "cat_accion" && cardCategory === "Acción") return 3;
  return 0;
}

// ---------------------------------------------------------------------------
// Power & scoring helpers
// ---------------------------------------------------------------------------

export function calcLanePower(cards: BoardCard[]): number {
  return cards.reduce((acc, c) => acc + c.currentPower, 0);
}

export function laneOutcome(
  lane: LaneId,
  state: Board
): { player: number; enemy: number; winner: "player" | "enemy" | "draw" } {
  const p = calcLanePower(state[lane].player);
  const e = calcLanePower(state[lane].enemy);
  return {
    player: p,
    enemy: e,
    winner: p > e ? "player" : e > p ? "enemy" : "draw",
  };
}

function highestPowerCard(cards: BoardCard[]): BoardCard | null {
  if (cards.length === 0) return null;
  let best = cards[0];
  for (const c of cards) {
    if (c.currentPower > best.currentPower) best = c;
  }
  return best;
}

export function lowestPowerCard(cards: BoardCard[]): BoardCard | null {
  if (cards.length === 0) return null;
  let best = cards[0];
  for (const c of cards) {
    if (c.currentPower < best.currentPower) best = c;
  }
  return best;
}

function cloneBoard(board: Board): Board {
  const clone = {} as Board;
  for (const ln of Object.keys(board) as LaneId[]) {
    clone[ln] = { player: [...board[ln].player], enemy: [...board[ln].enemy] };
  }
  return clone;
}

/**
 * Apply a raw power delta to a card on the board (mutates the board arrays).
 * Negative deltas also accumulate into the target's `debuffTaken` so that
 * Purificación can restore exactly the reductions suffered.
 */
function applyPowerDelta(
  board: Board,
  side: "player" | "enemy",
  lane: LaneId,
  uid: string,
  delta: number,
  source?: string,
  kind?: PowerLogEntry["kind"],
) {
  const arr = board[lane][side];
  const idx = arr.findIndex((c) => c.uid === uid);
  if (idx < 0) return;
  const cur = arr[idx];
  const newPower = Math.max(0, cur.currentPower + delta);
  const newLog = source && kind
    ? [...(cur.powerLog ?? []), { source, delta, kind }]
    : cur.powerLog;
  arr[idx] = {
    ...cur,
    currentPower: newPower,
    powerLog: newLog,
    debuffTaken:
      delta < 0 ? Math.max(0, (cur.debuffTaken ?? 0) + Math.abs(delta)) : cur.debuffTaken,
  };
}

// ---------------------------------------------------------------------------
// DEBUFF PIPELINE (simplificado — escudos por carta)
// ---------------------------------------------------------------------------
// Toda reducción de poder ENEMIGA peri-turno pasa por `applyDebuff`:
//   1. Si el objetivo tiene `shieldRemaining > 0` (Coraza/Amparo), absorbe
//      hasta X puntos del debuff. El pool se consume y NO se renueva.
//   2. El residual (si queda) aplica via applyPowerDelta (que acumula
//      `debuffTaken` para Purificación).
//
// `bypassShield: true` salta el paso 1 (Hender Armadura usa mutaciones
// directas en on_play, que de por sí ignoran escudos).
// ---------------------------------------------------------------------------

export interface DebuffResult {
  /** Final negative delta actually applied (0 if fully absorbed). */
  appliedDelta: number;
  /** Points absorbed by the target's shield. */
  absorbedByShield: number;
}

export function applyDebuff(
  board: Board,
  side: "player" | "enemy",
  lane: LaneId,
  uid: string,
  delta: number,
  source: string,
  kind: PowerLogEntry["kind"],
  opts?: { bypassShield?: boolean },
): DebuffResult {
  // Buffs pass through untouched.
  if (delta >= 0) {
    applyPowerDelta(board, side, lane, uid, delta, source, kind);
    return { appliedDelta: delta, absorbedByShield: 0 };
  }

  const arr = board[lane][side];
  const idx = arr.findIndex((c) => c.uid === uid);
  if (idx < 0) return { appliedDelta: 0, absorbedByShield: 0 };

  const target = arr[idx];
  const mag = Math.abs(delta);

  // Shield absorption (Coraza / Amparo pool)
  let effectiveMag = mag;
  let absorbed = 0;
  const shield = target.shieldRemaining ?? 0;
  if (shield > 0 && !opts?.bypassShield) {
    absorbed = Math.min(mag, shield);
    effectiveMag = mag - absorbed;
    arr[idx] = { ...target, shieldRemaining: shield - absorbed };
  }

  if (effectiveMag > 0) {
    applyPowerDelta(board, side, lane, uid, -effectiveMag, source, kind);
  } else {
    // Fully absorbed — still log a 0-delta trace for the Registro.
    arr[idx] = {
      ...(arr[idx]),
      powerLog: [...(arr[idx].powerLog ?? []), { source: `${source} (absorbido)`, delta: 0, kind }],
    };
  }

  return { appliedDelta: -effectiveMag, absorbedByShield: absorbed };
}

// ---------------------------------------------------------------------------
// Card effect computation (on_play)
// ---------------------------------------------------------------------------

interface EffectContext {
  board: Board;
  side: "player" | "enemy";
  lane: LaneId;
  card: CardDef;
  handBonus: number;
  hand: HandCard[];
  laneBonus: LaneBonus | null;
  /** Cards the side has played THIS turn, including this one (for Ímpetu). */
  playsThisTurn?: number;
}

interface BoardMutation {
  side: "player" | "enemy";
  lane: LaneId;
  uid: string;
  powerDelta: number;
  /** Shield points granted (Amparo). Applied in addition to powerDelta. */
  shieldDelta?: number;
  /** Route a NEGATIVE delta through applyDebuff (shields absorb it).
   *  Without this flag, on_play debuffs are direct mutations (pierce shields,
   *  e.g. Hender Armadura). With it, they behave like an honest debuff
   *  (e.g. Golpe Certero). */
  viaDebuff?: boolean;
}

interface RemovedCard {
  side: "player" | "enemy";
  lane: LaneId;
  uid: string;
  reason: string;
}

// ---------------------------------------------------------------------------
// REGLA DEL CAMPO — PODER A CERO = CAE
// ---------------------------------------------------------------------------
// Una carta cuyo poder llega a 0 por reducciones enemigas (debuffTaken > 0)
// se DESTRUYE al cierre del latido (end_turn / start_turn / jugada). Antes un
// cuerpo a 0 ocupaba carril para siempre y «Último Aliento» (on_death) era
// casi imposible de disparar: la única destrucción era Remate/Purga. Ahora
// el desgaste SÍ mata, los on_death cobran vida y martillar cuerpos a 0 deja
// de ser una estrategia sin función (reporte del jugador).
// ---------------------------------------------------------------------------

/**
 * Recolecta las cartas de AMBOS bandos que quedaron a 0 de poder habiendo
 * sufrido debuffs. Los escudos protegen (si el debuff fue absorbido, el
 * poder no bajó). Llamar DESPUÉS de aplicar los efectos del latido.
 */
function sweepDestroyedAtZero(board: Board, lanes: LaneId[]): RemovedCard[] {
  const out: RemovedCard[] = [];
  for (const lane of lanes) {
    for (const side of ["player", "enemy"] as const) {
      for (const card of board[lane][side]) {
        if (card.currentPower === 0 && (card.debuffTaken ?? 0) > 0) {
          out.push({ side, lane, uid: card.uid, reason: "poder a cero" });
        }
      }
    }
  }
  return out;
}

/**
 * Remueve del board las cartas barridas y enciende su ÚLTIMO ALIENTO
 * (on_death) en cadena, fusionando logs/fx en el TriggerResult dado.
 * `rulesRef` es { v: rulesOut } para poder reasignar el rulesOut adoptado.
 */
function applySweptDeaths(
  board: Board,
  swept: RemovedCard[],
  result: TriggerResult,
  rulesRef?: { v: ClassRulesState | undefined }
): void {
  for (const rc of swept) {
    const dead = board[rc.lane][rc.side].find((c) => c.uid === rc.uid);
    if (!dead) continue;
    board[rc.lane][rc.side] = board[rc.lane][rc.side].filter((c) => c.uid !== rc.uid);
    result.logs.push({ side: rc.side, text: `💀 ${dead.name} cae — su poder llegó a cero.` });
    result.fx.push({ kind: "destroy", lane: rc.lane, side: rc.side, targetUids: [rc.uid] });
    const deathRes = applyOnDeathEffects(board, rc.side, rc.lane, dead, rulesRef?.v);
    for (const ln of Object.keys(board) as LaneId[]) {
      board[ln] = deathRes.board[ln];
    }
    result.logs.push(...deathRes.logs);
    result.fx.push(...deathRes.fx);
    if (rulesRef && deathRes.rulesOut) rulesRef.v = deathRes.rulesOut;
  }
}

interface EffectResult {
  finalPower: number;
  mutations: BoardMutation[];
  removedCards: RemovedCard[];
  energyNextTurnDelta?: number;
}

interface EffectAccumulator {
  bonusPower: number;
  mutations: BoardMutation[];
  removedCards: RemovedCard[];
}

function newAccumulator(): EffectAccumulator {
  return { bonusPower: 0, mutations: [], removedCards: [] };
}

/**
 * on_play logic — runs BEFORE the card is placed. The card being played is
 * NOT in `allyLane`, so "aliados del carril" = existing allies only.
 */
function applyEffectLogic(
  keyword: Keyword,
  ctx: EffectContext,
  allyLane: BoardCard[],
  enemyLane: BoardCard[],
  enemySide: "player" | "enemy",
  accum: EffectAccumulator
): void {
  const { side, lane, card } = ctx;
  const x = card.keywordValue ?? 0;

  switch (keyword) {
    // ---- FERVOR [X] on_play: variante que crece AL ENTRAR (una vez) ----
    // (el Fervor clásico es start_turn; esta variante lo aplica al jugar)
    case "fervor": {
      if (x > 0 && (ctx.card.trigger ?? "start_turn") === "on_play") {
        accum.bonusPower += x;
        recordKeyword("fervor", x);
      }
      break;
    }

    // ---- INSIGNIA [X]: +X permanente al aliado más débil del carril ----
    case "insignia": {
      if (x > 0) {
        const target = lowestPowerCard(allyLane);
        if (target) {
          accum.mutations.push({ side, lane, uid: target.uid, powerDelta: x });
          recordKeyword("insignia", x);
        } else recordKeywordNoop("insignia");
      }
      break;
    }

    // ---- REMATE [X]: resta X al enemigo MÁS DÉBIL de este carril; si tiene
    // X o menos de poder, lo destruye directamente. La destrucción ignora
    // escudos (es destrucción); la reducción pasa por viaDebuff (absorben).
    case "remate": {
      if (x > 0) {
        const target = lowestPowerCard(enemyLane);
        if (target) {
          if (target.currentPower <= x) {
            accum.removedCards.push({
              side: enemySide,
              lane,
              uid: target.uid,
              reason: "remate",
            });
            recordKeyword("remate", 0, 1);
          } else {
            accum.mutations.push({
              side: enemySide,
              lane,
              uid: target.uid,
              powerDelta: -x,
              viaDebuff: true,
            });
            recordKeyword("remate", x);
          }
        } else recordKeywordNoop("remate");
      }
      break;
    }

    // ---- HENDER ARMADURA [X]: −X al enemigo más fuerte, IGNORA escudos ----
    // Mutación directa: las mutaciones de on_play no pasan por applyDebuff,
    // así que los escudos no protegen (comportamiento deseado).
    case "hender_armadura": {
      if (x > 0) {
        const target = highestPowerCard(enemyLane);
        if (target) {
          accum.mutations.push({ side: enemySide, lane, uid: target.uid, powerDelta: -x });
          recordKeyword("hender_armadura", x);
        } else recordKeywordNoop("hender_armadura");
      }
      break;
    }

    // ---- AMPARO [X]: escudo X a las demás cartas del carril ----
    // La carta nueva aún no está colocada → todas las existentes son "demás".
    case "amparo": {
      if (x > 0) {
        for (const ally of allyLane) {
          accum.mutations.push({ side, lane, uid: ally.uid, powerDelta: 0, shieldDelta: x });
        }
        if (allyLane.length > 0) recordKeyword("amparo", x * allyLane.length);
        else recordKeywordNoop("amparo");
      }
      break;
    }

    // ---- ÍMPETU [X]: +X por cada carta jugada este turno (incluida esta) ----
    case "impetu": {
      if (x > 0) {
        const gained = x * Math.max(1, ctx.playsThisTurn ?? 1);
        accum.bonusPower += gained;
        recordKeyword("impetu", gained);
      }
      break;
    }

    // ---- CONVERGENCIA [X]: +X por cada carta propia ya en el carril ----
    case "convergencia": {
      if (x > 0) {
        const gained = x * allyLane.length;
        accum.bonusPower += gained;
        if (gained > 0) recordKeyword("convergencia", gained);
        else recordKeywordNoop("convergencia"); // primera del carril: entra sin bonus
      }
      break;
    }

    // ---- SOBRECARGA [X]: +2X ahora; el −X se cobra en end_turn (powerDecay) ----
    case "sobrecarga": {
      if (x > 0) {
        accum.bonusPower += 2 * x;
        recordKeyword("sobrecarga", 2 * x);
      }
      break;
    }

    // ---- LLAMARADA [X]: −X a TODAS las cartas enemigas del carril ----
    // viaDebuff: los escudos absorben su parte (fuego contra barreras).
    case "llamarada": {
      if (x > 0) {
        for (const enemy of enemyLane) {
          accum.mutations.push({
            side: enemySide, lane, uid: enemy.uid, powerDelta: -x, viaDebuff: true,
          });
        }
        if (enemyLane.length > 0) recordKeyword("llamarada", x * enemyLane.length);
        else recordKeywordNoop("llamarada");
      }
      break;
    }

    // ---- REFRIEGA [X]: +X por cada carta ENEMIGA ya en el carril ----
    case "refriega": {
      if (x > 0) {
        const gained = x * enemyLane.length;
        accum.bonusPower += gained;
        if (gained > 0) recordKeyword("refriega", gained);
        else recordKeywordNoop("refriega");
      }
      break;
    }

    // ---- GOLPE CERTERO [X]: −X al enemigo más fuerte (escudos SÍ absorben) ----
    case "golpe_certero": {
      if (x > 0) {
        const target = highestPowerCard(enemyLane);
        if (target) {
          accum.mutations.push({
            side: enemySide, lane, uid: target.uid, powerDelta: -x, viaDebuff: true,
          });
          recordKeyword("golpe_certero", x);
        } else recordKeywordNoop("golpe_certero");
      }
      break;
    }

    // ---- EMBOSCADA [X]: +2X si es tu 1ª carta del turno; si no, +X ----
    case "emboscada": {
      if (x > 0) {
        const first = (ctx.playsThisTurn ?? 1) === 1;
        const gained = first ? 2 * x : x;
        accum.bonusPower += gained;
        recordKeyword("emboscada", gained);
      }
      break;
    }

    // ---- PURGA [X]: destruye la carta enemiga MÁS DÉBIL con poder ≤ X.
    // Task 46 (97% noop medido): si no hay presa pequeña, la cuchilla heriría
    // a la presa GRANDE — reduce X al más fuerte (perfora escudos). Nunca muerta.
    case "purga": {
      if (x > 0) {
        const candidates = enemyLane.filter((c) => c.currentPower <= x);
        const target = lowestPowerCard(candidates);
        if (target) {
          accum.removedCards.push({
            side: enemySide,
            lane,
            uid: target.uid,
            reason: "purga",
          });
          recordKeyword("purga", 0, 1);
        } else {
          const big = highestPowerCard(enemyLane);
          if (big) {
            accum.mutations.push({ side: enemySide, lane, uid: big.uid, powerDelta: -x });
            recordKeyword("purga", x);
          } else recordKeywordNoop("purga");
        }
      }
      break;
    }

    // ---- ORDEN DE BATALLA [X]: +X a esta carta y a las ya colocadas del carril ----
    case "orden_batalla": {
      if (x > 0) {
        accum.bonusPower += x; // la propia carta (aún no colocada)
        for (const ally of allyLane) {
          accum.mutations.push({ side, lane, uid: ally.uid, powerDelta: x });
        }
        recordKeyword("orden_batalla", x * (1 + allyLane.length));
      }
      break;
    }

    // ---- DRENAR PODER [X]: gana +X y reduce X al enemigo más fuerte ----
    // viaDebuff: los escudos absorben la reducción (honesto); el +X propio
    // se aplica SIEMPRE (la energía se canaliza aunque el golpe rebote).
    case "drenar_poder": {
      if (x > 0) {
        accum.bonusPower += x;
        const target = highestPowerCard(enemyLane);
        if (target) {
          accum.mutations.push({
            side: enemySide, lane, uid: target.uid, powerDelta: -x, viaDebuff: true,
          });
        }
        recordKeyword("drenar_poder", x); // el +X propio es incondicional
      }
      break;
    }

    // ---- RUPTURA GLACIAL [X]: −X al enemigo con MÁS reducciones acumuladas ----
    // Mutación directa: perfora escudos (rompe la barrera congelada).
    // Empate de reducciones → el MÁS FUERTE (finisher del desgaste).
    // Task 46 (79% noop medido): si nadie está agrietado, la maza golpea al
    // más fuerte directamente — misma perforación, nunca muerta.
    case "ruptura_glacial": {
      if (x > 0) {
        const cracked = enemyLane.filter((c) => (c.debuffTaken ?? 0) > 0);
        let target: BoardCard | undefined = cracked[0];
        for (const c of cracked) {
          if (
            (c.debuffTaken ?? 0) > (target.debuffTaken ?? 0) ||
            ((c.debuffTaken ?? 0) === (target.debuffTaken ?? 0) && c.currentPower > target.currentPower)
          ) {
            target = c;
          }
        }
        if (!target) target = highestPowerCard(enemyLane) ?? undefined;
        if (target) {
          accum.mutations.push({ side: enemySide, lane, uid: target.uid, powerDelta: -x });
          recordKeyword("ruptura_glacial", x);
        } else recordKeywordNoop("ruptura_glacial");
      }
      break;
    }

    // ---- MIASMA [X]: −X a TODAS las cartas enemigas del carril, IGNORA escudos ----
    case "miasma": {
      if (x > 0) {
        for (const enemy of enemyLane) {
          accum.mutations.push({ side: enemySide, lane, uid: enemy.uid, powerDelta: -x });
        }
        if (enemyLane.length > 0) recordKeyword("miasma", x * enemyLane.length);
        else recordKeywordNoop("miasma");
      }
      break;
    }

    // ---- CAZA MAYOR [X]: +2X si el enemigo más fuerte supera el poder base de esta; si no +X ----
    case "caza_mayor": {
      if (x > 0) {
        const target = highestPowerCard(enemyLane);
        const preyed = !!target && target.currentPower > card.power;
        const gained = preyed ? 2 * x : x;
        accum.bonusPower += gained;
        recordKeyword("caza_mayor", gained);
      }
      break;
    }

    // ---- MICELIO [X]: escudo X a sí misma y al aliado más débil del carril ----
    // El escudo PROPIO se otorga en playCard (init de shieldRemaining, como
    // Coraza/Remache); aquí solo el del aliado más débil.
    case "micelio": {
      if (x > 0) {
        const target = lowestPowerCard(allyLane);
        if (target) {
          accum.mutations.push({ side, lane, uid: target.uid, powerDelta: 0, shieldDelta: x });
          recordKeyword("micelio", x * 2); // escudo propio (placement) + aliado
        } else {
          recordKeyword("micelio", x); // sola en el carril: solo su propio escudo
        }
      }
      break;
    }

    // ---- SIMBIOSIS [X]: +X por cada aliado del carril con MENOS poder que esta ----
    // Ranking de poder entre propias (eje nuevo). La propia aún no está
    // colocada: su poder de entrada se replica desde los términos base.
    case "simbiosis": {
      if (x > 0) {
        const myEntry =
          card.power +
          ctx.handBonus +
          (card.subtypes.includes(lane) ? 2 : 0) +
          getLaneBonusPower(card.category, ctx.laneBonus);
        const count = allyLane.filter((a) => a.currentPower < myEntry).length;
        const gained = x * count;
        if (gained > 0) {
          accum.bonusPower += gained;
          recordKeyword("simbiosis", gained);
        } else recordKeywordNoop("simbiosis"); // es la más débil: nada que alimente
      }
      break;
    }

    // ---- POLEN [X]: −X al enemigo con MENOS reducciones acumuladas ----
    // Espejo de Ruptura Glacial (que pica a la MÁS debuffeada): la espora
    // busca tejido fresco. Empate de reducciones → el más débil. Honest:
    // viaDebuff (los escudos absorben).
    case "polen": {
      if (x > 0) {
        let target: BoardCard | undefined;
        for (const c of enemyLane) {
          if (!target) {
            target = c;
            continue;
          }
          const dt = c.debuffTaken ?? 0;
          const tt = target.debuffTaken ?? 0;
          if (dt < tt || (dt === tt && c.currentPower < target.currentPower)) target = c;
        }
        if (target) {
          accum.mutations.push({
            side: enemySide, lane, uid: target.uid, powerDelta: -x, viaDebuff: true,
          });
          recordKeyword("polen", x);
        } else recordKeywordNoop("polen");
      }
      break;
    }

    // ---- CARNÍVORA [X]: devora la más débil con poder ≤ X y gana +2 ----
    // Destrucción que ALIMENTA (Remate/Purga no dan nada a cambio). Sin
    // presa: mastica tierra y gana +1 (Task 46: las keyword muertas sin
    // función se sienten rojas — la planta siempre come algo).
    case "carnivora": {
      if (x > 0) {
        const candidates = enemyLane.filter((c) => c.currentPower <= x);
        const target = lowestPowerCard(candidates);
        if (target) {
          accum.removedCards.push({ side: enemySide, lane, uid: target.uid, reason: "carnivora" });
          accum.bonusPower += 2;
          recordKeyword("carnivora", 2, 1);
        } else {
          accum.bonusPower += 1;
          recordKeyword("carnivora", 1);
        }
      }
      break;
    }

    // ---- SAQUEO [X]: roba X al enemigo más débil (perfora escudos) ----
    // El grapple del pirata no respeta barreras: mutación directa. Si el
    // robo deja a la víctima a 0, cae y el botín paga +2 adicionales.
    case "saqueo": {
      if (x > 0) {
        const target = lowestPowerCard(enemyLane);
        if (target) {
          accum.mutations.push({ side: enemySide, lane, uid: target.uid, powerDelta: -x });
          accum.bonusPower += x; // el poder robado engorda al saqueador
          if (target.currentPower - x <= 0) {
            accum.removedCards.push({ side: enemySide, lane, uid: target.uid, reason: "saqueo" });
            accum.bonusPower += 2; // botín extra por hundirla
            recordKeyword("saqueo", x + 2, 1);
          } else {
            recordKeyword("saqueo", x);
          }
        } else recordKeywordNoop("saqueo");
      }
      break;
    }

    // ---- MOTÍN: INTERCAMBIA su poder con el enemigo más fuerte del carril ----
    // Primer SWAP de poder del juego (hasValue=false — sin [X]). El amotinado
    // entra con el poder del capitán y el capitán queda con su base. Mutación
    // directa: el motín no es daño, es política (los escudos no lo impiden).
    // Se balancea con poder base BAJO: el swing esperado ya lo cobra el PTP.
    case "motin": {
      const target = highestPowerCard(enemyLane);
      if (target) {
        const myEntry =
          card.power +
          ctx.handBonus +
          (card.subtypes.includes(lane) ? 2 : 0) +
          getLaneBonusPower(card.category, ctx.laneBonus);
        const swapGain = target.currentPower - myEntry;
        if (swapGain !== 0) {
          accum.bonusPower += swapGain; // si es negativo, el motín fracasó y entra débil
          accum.mutations.push({ side: enemySide, lane, uid: target.uid, powerDelta: -swapGain });
          recordKeyword("motin", Math.abs(swapGain));
        } else recordKeywordNoop("motin"); // poder idéntico: el motín no cambia nada
      } else recordKeywordNoop("motin"); // sin capitán que destronar
      break;
    }

    // ---- CONTRABANDO [X]: una carta ALEATORIA de tu mano gana +X ----
    // Buff de mano puntual (Conspiración buffa TODA la mano). Se aplica en
    // playCard sobre la mano restante (la carta ya no está en ella).
    case "contrabando": {
      // (manejado en playCard — ver bloque contrabando)
      break;
    }

    // ---- CANONAZO [X]: −X a TODOS los enemigos del carril y los ADYACENTES ----
    // Primer alcance multi-carril del juego (scope CARRIL_LOCAL_ADYACENTE).
    // Honest: viaDebuff (los escudos absorben su parte — llamarada de pólvora).
    case "canonazo": {
      if (x > 0) {
        let hits = 0;
        for (const enemy of enemyLane) {
          accum.mutations.push({ side: enemySide, lane, uid: enemy.uid, powerDelta: -x, viaDebuff: true });
          hits++;
        }
        for (const adj of LANE_ADJACENT[lane] ?? []) {
          for (const enemy of ctx.board[adj][enemySide]) {
            accum.mutations.push({ side: enemySide, lane: adj, uid: enemy.uid, powerDelta: -x, viaDebuff: true });
            hits++;
          }
        }
        if (hits > 0) recordKeyword("canonazo", x * hits);
        else recordKeywordNoop("canonazo");
      }
      break;
    }

    // ---- REMACHE [X]: escudo X a TODAS tus cartas del carril (incluida ella) ----
    // El escudo PROPIO se otorga en playCard (init, como Coraza); aquí el
    // de las ya colocadas. Amparo excluye a la propia; Remache no.
    case "remache": {
      if (x > 0) {
        for (const ally of allyLane) {
          accum.mutations.push({ side, lane, uid: ally.uid, powerDelta: 0, shieldDelta: x });
        }
        recordKeyword("remache", x * (1 + allyLane.length));
      }
      break;
    }

    // ---- SOBRECALENTAR [X]: +2X si hay OTRO Ítem propio en el carril; si no +X ----
    case "sobrecalentar": {
      if (x > 0) {
        const hasItem = allyLane.some((a) => a.category === "Ítem");
        const gained = hasItem ? 2 * x : x;
        accum.bonusPower += gained;
        recordKeyword("sobrecalentar", gained);
      }
      break;
    }

    // ---- DESCARGA [X]: −X a los DOS enemigos más débiles del carril ----
    // Primer multi-objetivo doble (Llamarada es AoE completo; esto pica 2).
    // Honest: viaDebuff (los escudos absorben la descarga).
    case "descarga": {
      if (x > 0) {
        const sorted = [...enemyLane].sort((a, b) => a.currentPower - b.currentPower).slice(0, 2);
        if (sorted.length > 0) {
          for (const t of sorted) {
            accum.mutations.push({ side: enemySide, lane, uid: t.uid, powerDelta: -x, viaDebuff: true });
          }
          recordKeyword("descarga", x * sorted.length);
        } else recordKeywordNoop("descarga");
      }
      break;
    }

    // ---- ESTANDARTE [X]: +X a tus cartas del carril ADYACENTE ----
    // Tanda 30 (armas). Coordina la línea vecina (Orden de Batalla buffa la
    // SUYA; el estandarte ondea para el flanco). Buff directo (permanente).
    case "estandarte": {
      if (x > 0) {
        let hits = 0;
        for (const adj of LANE_ADJACENT[lane] ?? []) {
          for (const ally of ctx.board[adj][side]) {
            accum.mutations.push({ side, lane: adj, uid: ally.uid, powerDelta: x });
            hits++;
          }
        }
        if (hits > 0) recordKeyword("estandarte", x * hits);
        else recordKeywordNoop("estandarte"); // el flanco está vacío
      }
      break;
    }

    // ---- ATROPELLO [X]: +2X a sí misma, −X a tu aliado más débil ----
    // Tanda 30 (furia). Doble filo propio: la carga salvaje no distingue.
    // Sin aliados que arrollar, solo carga con +X (honesto anti-noop).
    case "atropello": {
      if (x > 0) {
        const victim = lowestPowerCard(allyLane);
        if (victim) {
          accum.bonusPower += 2 * x;
          accum.mutations.push({ side, lane, uid: victim.uid, powerDelta: -x, viaDebuff: true });
          recordKeyword("atropello", 2 * x);
        } else {
          accum.bonusPower += x; // carril vacío: la carga no encuentra a quien arrollar
          recordKeyword("atropello", x);
        }
      }
      break;
    }

    // ---- ECO [X]: +X por cada carta que queda en tu mano ----
    // Tanda 30 (arcana). ctx.hand ya EXCLUYE la carta jugada (ver playCard).
    case "eco": {
      if (x > 0) {
        const n = ctx.hand.length;
        if (n > 0) {
          accum.bonusPower += x * n;
          recordKeyword("eco", x * n);
        } else recordKeywordNoop("eco"); // última carta: el eco no tiene a quien resonar
      }
      break;
    }

    // ---- ESQUIRLA [X]: +X por CADA punto de reducción de los enemigos ----
    // Tanda 30 (hielo). Cosecha las grietas (sin debuffs previos no recolecta).
    case "esquirla": {
      if (x > 0) {
        const total = enemyLane.reduce((sum, e) => sum + (e.debuffTaken ?? 0), 0);
        if (total > 0) {
          accum.bonusPower += x * total;
          recordKeyword("esquirla", x * total);
        } else recordKeywordNoop("esquirla"); // hielo liso: nada que astillar
      }
      break;
    }

    // ---- CORROSIÓN [X]: disuelve X del escudo MÁS GRANDE; si no hay, perfora ----
    // Tanda 30 (veneno). Anti-bunker: el ácido busca la muralla más gorda.
    // El escudo se funde directo (la corrosión no «golpea»); sin escudos,
    // muerde el poder del más fuerte SIN pasar por applyDebuff (perfora).
    case "corrosion": {
      if (x > 0) {
        const shielded = enemyLane.filter((c) => (c.shieldRemaining ?? 0) > 0);
        if (shielded.length > 0) {
          let target = shielded[0];
          for (const c of shielded) {
            if ((c.shieldRemaining ?? 0) > (target.shieldRemaining ?? 0)) target = c;
          }
          const hit = Math.min(x, target.shieldRemaining ?? 0);
          accum.mutations.push({ side: enemySide, lane, uid: target.uid, powerDelta: 0, shieldDelta: -hit });
          recordKeyword("corrosion", hit);
        } else {
          const target = highestPowerCard(enemyLane);
          if (target) {
            accum.mutations.push({ side: enemySide, lane, uid: target.uid, powerDelta: -x });
            recordKeyword("corrosion", x);
          } else recordKeywordNoop("corrosion");
        }
      }
      break;
    }

    // ---- FINTA [X]: −X a sí misma (se expone); el +2X cobra en start_turn ----
    // Tanda 30 (combate). El cobro diferido viaja en pendingBonus (playCard)
    // y se paga en applyStartTurnEffects del PRÓXIMO turno del dueño.
    case "finta": {
      if (x > 0) {
        accum.bonusPower -= x;
        recordKeyword("finta", -x); // el coste de exponerse (patrón Sobrecarga)
      }
      break;
    }

    // ---- OCTAVA [X]: +X por cada carta propia en tus OTROS carriles ----
    // Tanda 30 (sigilo). La red de sombras opera en todos los frentes.
    case "octava": {
      if (x > 0) {
        const others = classLanesOf(lane).filter((l) => l !== lane);
        let count = 0;
        for (const l of others) count += ctx.board[l][side].length;
        if (count > 0) {
          accum.bonusPower += x * count;
          recordKeyword("octava", x * count);
        } else recordKeywordNoop("octava"); // operando en solitario
      }
      break;
    }

    // ---- Keywords que disparan en OTROS triggers (no-op aquí) ----
    // fervor / duelista / purificacion / escarcha / veneno / custodia / desafio → start_turn
    // fortaleza / crueldad / ventisca / contagio → end_turn
    // legado / combustion / detonacion → on_death
    // coraza → escudo inicial otorgado en playCard (init del BoardCard)
    // conspiracion → buff de mano aplicado en playCard (sobre la nueva mano)
    case "duelista": {
      // Task 46 (66% noop medido): el Duelista ahora AFILA AL ENTRAR — +X
      // garantizado al jugar, y el crecimiento por estar solo sigue en start_turn.
      if (x > 0 && (ctx.card.trigger ?? "start_turn") !== "on_play") {
        accum.bonusPower += x;
        recordKeyword("duelista", x);
      }
      break;
    }
    default:
      break;
  }
}

/** Compute the final power + side effects of a card being played into `lane`. */
export function computeEffect(ctx: EffectContext): EffectResult {
  const { card, handBonus, lane, laneBonus } = ctx;

  let finalPower = card.power + handBonus;

  // 1. Subtype synergy: +2 if card has the lane as a subtype
  if (card.subtypes.includes(lane)) finalPower += 2;

  // 2. Per-game lane bonus: +3 if category matches the bonus's category
  finalPower += getLaneBonusPower(card.category, laneBonus);

  const enemySide: "player" | "enemy" = ctx.side === "player" ? "enemy" : "player";
  const allyLane = ctx.board[lane][ctx.side];
  const enemyLane = ctx.board[lane][enemySide];

  const keyword: Keyword = card.keyword ?? "none";
  const accum = newAccumulator();
  applyEffectLogic(keyword, ctx, allyLane, enemyLane, enemySide, accum);

  finalPower += accum.bonusPower;

  return {
    finalPower,
    mutations: accum.mutations,
    removedCards: accum.removedCards,
  };
}

// ---------------------------------------------------------------------------
// Play execution (mutates a board snapshot)
// ---------------------------------------------------------------------------

export interface PlayResult {
  board: Board;
  hand: HandCard[];
  remainingEnergy: number;
  playedCard: BoardCard;
  mutations: BoardMutation[];
  removedCards: RemovedCard[];
  trapTriggered: boolean;
  newTrap?: TrapState;
  energyNextTurnDelta?: number;
  /** Escudos que absorbieron debuffs honestos (Golpe Certero / Llamarada) — para VFX. */
  shieldAbsorbed: { side: "player" | "enemy"; lane: LaneId; uid: string; absorbed: number }[];
  /** Reglas sistémicas actualizadas tras la jugada (solo si se pasaron rules). */
  rulesOut?: ClassRulesState;
  /** RESONANCIA (Mago): esta carta resonó con la jugada anterior del turno. */
  resonancia?: boolean;
  /** MARCA DE EJECUCIÓN (Asesino): PC consumidos por esta jugada (+2 c/u). */
  comboConsumed?: number;
  /** PC ganados por reducciones de poder enemigas de ESTA carta. */
  comboGained?: number;
}

/**
 * Immutably play a card from the hand into a lane. Returns a new board+hand+energy.
 * Throws if invalid (not enough energy, lane full, cost-restricted, etc.).
 *
 * `playsThisTurn` = cards this side has already played this turn INCLUDING
 * this one (Ímpetu). gameStore passes `state.playsThisTurn + 1`;
 * planEnemyTurn passes `plays.length + 1`.
 */
export function playCard(
  board: Board,
  hand: HandCard[],
  energy: number,
  side: "player" | "enemy",
  lane: LaneId,
  handCard: HandCard,
  laneBonus: LaneBonus | null,
  activeTrap: TrapState | null,
  playsThisTurn = 1,
  /** REGLAS SISTÉMICAS V3 (opcional — sin esto las reglas de clase están inactivas). */
  rules?: ClassRulesState
): PlayResult {
  const enemySide: "player" | "enemy" = side === "player" ? "enemy" : "player";

  // ── RESONANCIA DE ESCUELA (Mago): misma spec que tu jugada anterior de este turno
  const isResonancia =
    !!rules && rules.classes[side] === "mago" && rules.lastSpec[side] === lane;

  // ── MARCA DE EJECUCIÓN (Asesino): jugar en carril con enemigo DEBILITADO
  //    consume TODOS los PC → +2 de poder por PC. Se resuelve tras las
  //    validaciones básicas (una jugada inválida NO consume ni resonancia).
  let comboConsumed = 0;
  let comboBonus = 0;

  // 1. Cost restriction (solo coste X)
  if (!isCardCostAllowed(handCard.cost, laneBonus)) {
    throw new Error(
      `Esta carta no se puede jugar en ${lane}: el bono requiere coste exacto.`
    );
  }

  // 2. Effective cost (−1 si Resonancia, suelo 0)
  const effectiveCost = Math.max(
    0,
    getFinalCost(handCard.cost, laneBonus) -
      (isResonancia ? V3_RESONANCIA_COST_CUT : 0)
  );
  if (effectiveCost > energy) {
    throw new Error(
      `Sin energía suficiente (necesita ${effectiveCost}, tiene ${energy})` +
        (laneBonus?.kind === "cost_neg" || laneBonus?.kind === "cost_pos"
          ? " (ajustado por bono del carril)"
          : "")
    );
  }

  // 3. Lane capacity (limit_1 / limit_3 / default 4)
  const maxCards = getLaneMaxCards(laneBonus);
  if (board[lane][side].length >= maxCards) {
    throw new Error(`Carril ${lane} lleno (máximo ${maxCards} carta(s) por bando).`);
  }

  // Marca de ejecución: validaciones superadas → consumir PC si procede.
  if (
    rules &&
    rules.classes[side] === "asesino" &&
    rules.comboPoints[side] > 0 &&
    board[lane][enemySide].some((c) => (c.debuffTaken ?? 0) > 0)
  ) {
    comboConsumed = rules.comboPoints[side];
    comboBonus = comboConsumed * V3_COMBO_POWER;
  }

  const effect = computeEffect({
    board,
    side,
    lane,
    card: handCard,
    handBonus: handCard.handBonus,
    hand: hand.filter((c) => c.uid !== handCard.uid),
    laneBonus,
    playsThisTurn,
  });

  // 3.5. Trap: if active trap exists and is owned by the opposing side, it
  // triggers and reduces the new card's final power.
  // TALLER DE CAMPAMENTO (Tinker, V3.0): los Ítems de un tinker entran con +1
  // (artesanía de campaña — regla sistémica sin estado, aplica a ambos lados).
  const tallerBonus =
    rules && rules.classes[side] === "tinker" && handCard.category === "Ítem"
      ? V3_TALLER_POWER
      : 0;
  let finalPower =
    effect.finalPower +
    (isResonancia ? V3_RESONANCIA_POWER : 0) +
    comboBonus +
    tallerBonus;
  let trapTriggered = false;
  if (activeTrap && activeTrap.owner !== side) {
    finalPower = Math.max(0, finalPower - activeTrap.value);
    trapTriggered = true;
  }

  // Build a NEW board with mutations applied (generic over active lanes)
  const newBoard: Board = {} as Board;
  for (const ln of Object.keys(board) as LaneId[]) {
    newBoard[ln] = { player: [...board[ln].player], enemy: [...board[ln].enemy] };
  }

  const shieldAbsorbed: PlayResult["shieldAbsorbed"] = [];
  // MARCA DE EJECUCIÓN: reducciones REALES infligidas por esta carta
  // (un debuff absorbido por escudo NO reduce poder → no da PC).
  let comboGained = 0;
  for (const m of effect.mutations) {
    const arr = newBoard[m.lane][m.side];
    const idx = arr.findIndex((c) => c.uid === m.uid);
    if (idx >= 0) {
      // Honest on_play debuffs route through applyDebuff so shields absorb
      // (Golpe Certero). Direct mutations keep piercing (Hender Armadura).
      if (m.viaDebuff && m.powerDelta < 0) {
        const dr = applyDebuff(newBoard, m.side, m.lane, m.uid, m.powerDelta, handCard.name, "debuff");
        if (dr.absorbedByShield > 0) {
          shieldAbsorbed.push({ side: m.side, lane: m.lane, uid: m.uid, absorbed: dr.absorbedByShield });
        }
        if (dr.appliedDelta < 0 && m.side === enemySide) comboGained++;
        continue;
      }
      if (m.powerDelta < 0 && m.side === enemySide) comboGained++;
      const cur = arr[idx];
      arr[idx] = {
        ...cur,
        currentPower:
          m.powerDelta !== 0
            ? Math.max(0, cur.currentPower + m.powerDelta)
            : cur.currentPower,
        // Debuffs from direct mutations (Hender) accumulate into debuffTaken
        // so Purificación can restore them.
        debuffTaken:
          m.powerDelta < 0
            ? Math.max(0, (cur.debuffTaken ?? 0) + Math.abs(m.powerDelta))
            : cur.debuffTaken,
        powerLog:
          m.powerDelta !== 0
            ? [...(cur.powerLog ?? []), { source: handCard.name, delta: m.powerDelta, kind: m.powerDelta > 0 ? "buff" : "debuff" }]
            : cur.powerLog,
        shieldRemaining:
          m.shieldDelta !== undefined
            ? Math.max(0, (cur.shieldRemaining ?? 0) + m.shieldDelta)
            : cur.shieldRemaining,
      } as BoardCard;
    }
  }

  // Apply removedCards (filter out from board) — happens AFTER mutations.
  if (effect.removedCards.length > 0) {
    for (const rc of effect.removedCards) {
      const arr = newBoard[rc.lane][rc.side];
      newBoard[rc.lane][rc.side] = arr.filter((c) => c.uid !== rc.uid);
    }
  }

  // REGLA DEL CAMPO: debuffs on_play que dejan a un enemigo a 0 → cae
  // (Llamarada/Golpe Certero/Hender/Miasma… rematan sin keyword de remate).
  // La carta recién jugada queda fuera (debuffTaken = 0); la trampa tampoco
  // la barre (su semántica no cambia en esta tanda).
  const sweptOnPlay = sweepDestroyedAtZero(newBoard, Object.keys(board) as LaneId[]);
  for (const rc of sweptOnPlay) {
    newBoard[rc.lane][rc.side] = newBoard[rc.lane][rc.side].filter((c) => c.uid !== rc.uid);
  }
  const allRemoved = [...effect.removedCards, ...sweptOnPlay];

  // Place the new card
  const keyword: Keyword = handCard.keyword ?? "none";
  const newCard: BoardCard = {
    uid: uuidv4(),
    defId: handCard.id,
    name: handCard.name,
    category: handCard.category,
    subtypes: handCard.subtypes,
    cost: handCard.cost,
    basePower: handCard.power,
    currentPower: finalPower,
    text: handCard.text,
    effectId: handCard.effectId,
    rarity: handCard.rarity,
    trigger: handCard.trigger ?? KEYWORD_META[keyword].trigger,
    keyword: handCard.keyword,
    keywordValue: handCard.keywordValue,
    // Coraza / Remache / Micelio: self shield granted on play (pool finito, sin refresco)
    shieldRemaining:
      keyword === "coraza" || keyword === "remache" || keyword === "micelio"
        ? (handCard.keywordValue ?? 0)
        : undefined,
    // Sobrecarga: pending one-shot decay charged at end of turn
    powerDecay: keyword === "sobrecarga" ? (handCard.keywordValue ?? 0) : undefined,
    // Finta (tanda 30): cobro diferido — +2X al iniciar el PRÓXIMO turno del dueño
    pendingBonus:
      keyword === "finta"
        ? { turnsLeft: 1, amount: 2 * (handCard.keywordValue ?? 0) }
        : undefined,
    debuffTaken: 0,
  };
  if (keyword === "finta" && (handCard.keywordValue ?? 0) > 0) {
    // Mutación COSMÉTICA del cobro diferido: el float del +2X llegará con el
    // fx "finta" en start_turn (patrón Duelista — aquí solo dejamos el rastro).
    newCard.powerLog = [
      { source: KEYWORD_META.finta.label, delta: -(handCard.keywordValue ?? 0), kind: "debuff" },
    ];
  }
  if (keyword === "coraza" && (handCard.keywordValue ?? 0) > 0) {
    recordKeyword("coraza", handCard.keywordValue ?? 0); // escudo inicial otorgado
  }
  if (
    (keyword === "remache" || keyword === "micelio") &&
    (handCard.keywordValue ?? 0) > 0
  ) {
    // El escudo PROPIO de Remache/Micelio (el del aliado ya se registró en
    // applyEffectLogic) — se refleja también como mutación cosmética para
    // que el float verde y el VFX de escudo lleguen al cliente.
    const dx = handCard.keywordValue ?? 0;
    newCard.powerLog = [
      { source: KEYWORD_META[keyword].label, delta: 0, kind: "buff" },
    ];
    effect.mutations.push({ side, lane, uid: newCard.uid, powerDelta: 0, shieldDelta: dx });
  }
  // TALLER DE CAMPAMENTO visible (patrón Duelista Task 47): el +1 viaja dentro
  // de finalPower; la mutación cosmética lo pinta (float/log/VFX).
  if (tallerBonus > 0) {
    newCard.powerLog = [
      ...(newCard.powerLog ?? []),
      { source: "Taller de Campamento", delta: tallerBonus, kind: "buff" },
    ];
    effect.mutations.push({ side, lane, uid: newCard.uid, powerDelta: tallerBonus });
  }
  newBoard[lane][side] = [...newBoard[lane][side], newCard];

  // ── DUELISTA VISIBLE (Task 47) ──────────────────────────────────────────
  // El +X de «Al Jugar» ya viaja dentro de finalPower (accum.bonusPower),
  // pero era IMPERCEPTIBLE: sin float, sin log, sin fx y sin entrada en el
  // Registro (reporte del jugador: «duelista sigue haciendo lo mismo»).
  // Mutación COSMÉTICA + powerLog: el store pinta el float verde sobre la
  // carta, suena buff, pvp.ts escribe el log «Buff +X» y
  // eventsFromPlayResult agrupa la mutación en el evento sword_glint.
  // NUNCA re-aplica poder: la mutación nace DESPUÉS del bucle que aplica
  // mutaciones y el writeBack de los wrappers usa solo res.board.
  if (
    keyword === "duelista" &&
    (handCard.keywordValue ?? 0) > 0 &&
    (handCard.trigger ?? KEYWORD_META[keyword].trigger) !== "on_play"
  ) {
    const dx = handCard.keywordValue ?? 0;
    newCard.powerLog = [{ source: KEYWORD_META.duelista.label, delta: dx, kind: "buff" }];
    effect.mutations.push({ side, lane, uid: newCard.uid, powerDelta: dx });
  }

  // Build a NEW hand (without the played card) — Conspiración buffa el resto.
  let newHand: HandCard[] = hand
    .filter((c) => c.uid !== handCard.uid)
    .map((c) => ({ ...c }));
  if (keyword === "conspiracion" && (handCard.keywordValue ?? 0) > 0) {
    const conspirX = handCard.keywordValue ?? 0;
    if (newHand.length > 0) recordKeyword("conspiracion", conspirX * newHand.length);
    else recordKeywordNoop("conspiracion"); // última carta: nadie recibe el buff
    newHand = newHand.map((c) => ({
      ...c,
      handBonus: (c.handBonus ?? 0) + conspirX,
      handBonusSources: [
        ...(c.handBonusSources ?? []),
        { source: handCard.name, delta: conspirX },
      ],
    }));
  }

  // ── CONTRABANDO [X]: UNA carta aleatoria de la mano restante gana +X ──
  // (Conspiración buffa a TODA la mano; el contrabando es un trato suelto.)
  if (keyword === "contrabando" && (handCard.keywordValue ?? 0) > 0) {
    const contrabX = handCard.keywordValue ?? 0;
    if (newHand.length > 0) {
      const idx = Math.floor(Math.random() * newHand.length);
      const lucky = newHand[idx];
      newHand[idx] = {
        ...lucky,
        handBonus: (lucky.handBonus ?? 0) + contrabX,
        handBonusSources: [
          ...(lucky.handBonusSources ?? []),
          { source: handCard.name, delta: contrabX },
        ],
      };
      recordKeyword("contrabando", contrabX);
    } else recordKeywordNoop("contrabando"); // última carta: no hay cómplice
  }

  // REGLAS V3: escribir el estado de reglas resultante (copia funcional —
  // el objeto de entrada NUNCA se muta; el caller adopta rulesOut).
  let rulesOut: ClassRulesState | undefined;
  if (rules) {
    rulesOut = cloneRules(rules);
    if (comboConsumed > 0) rulesOut.comboPoints[side] = 0;
    grantCombo(rulesOut, side, comboGained);
    rulesOut.lastSpec[side] = lane;
  }

  return {
    board: newBoard,
    hand: newHand,
    remainingEnergy: energy - effectiveCost,
    playedCard: newCard,
    mutations: effect.mutations,
    removedCards: allRemoved,
    trapTriggered,
    newTrap: undefined,
    shieldAbsorbed,
    ...(rulesOut ? { rulesOut, resonancia: isResonancia, comboConsumed, comboGained } : {}),
  };
}

// ---------------------------------------------------------------------------
// Smart enemy AI
// ---------------------------------------------------------------------------

export interface AIPlay {
  card: HandCard;
  lane: LaneId;
  score: number; // heuristic score for this play
}

/**
 * Score a candidate play for the AI. Higher is better.
 * Heuristics:
 *  - Reward the simulated power gain (synergy/bonus already in finalPower)
 *  - Bonus for turning a lane around; penalty for wasting a won lane
 *  - Debuff mutations and card destruction are extra value
 *  - end_turn keywords (Fortaleza/Crueldad) and shields get manual estimates
 */
export function scoreAIPlay(
  board: Board,
  hand: HandCard[],
  energy: number,
  card: HandCard,
  lane: LaneId,
  laneBonus: LaneBonus | null,
  activeTrap: TrapState | null,
  playsThisTurn = 1,
  /** REGLAS V3 (opcional) — el planner simula la jugada con las reglas activas. */
  rules?: ClassRulesState
): number {
  if (!isCardCostAllowed(card.cost, laneBonus)) return -Infinity;

  // Coste efectivo real: el planner debe ver el −1 de Resonancia (Mago)
  // para no descartar jugadas que el engine SÍ aceptaría.
  const resonancia =
    !!rules && rules.classes.enemy === "mago" && rules.lastSpec.enemy === lane;
  const effectiveCost = Math.max(
    0,
    getFinalCost(card.cost, laneBonus) - (resonancia ? V3_RESONANCIA_COST_CUT : 0)
  );
  if (effectiveCost > energy) return -Infinity;

  const maxCards = getLaneMaxCards(laneBonus);
  if (board[lane].enemy.length >= maxCards) return -Infinity;

  const allySide: "player" | "enemy" = "player";

  const currentEnemyPower = calcLanePower(board[lane].enemy);
  const currentPlayerPower = calcLanePower(board[lane].player);

  let sim;
  try {
    sim = playCard(board, hand, energy, "enemy", lane, card, laneBonus, activeTrap, playsThisTurn, rules);
  } catch {
    return -Infinity;
  }

  const newEnemyPower = calcLanePower(sim.board[lane].enemy);
  const gain = newEnemyPower - currentEnemyPower;
  const newMargin = newEnemyPower - currentPlayerPower;
  const oldMargin = currentEnemyPower - currentPlayerPower;

  let score = 0;

  // 1. Reward the power gain itself
  score += gain * 1.0;

  // 2. Bonus for turning the lane around (loss -> win or tie -> win)
  if (oldMargin < 0 && newMargin >= 0) score += 80;
  if (oldMargin < 0 && newMargin > 0) score += 40;
  if (oldMargin === 0 && newMargin > 0) score += 60;

  // 3. Penalty for playing in already-won lane (waste)
  if (oldMargin > 10) score -= 50;
  else if (oldMargin > 0) score -= 20;

  // 4. Small penalty for playing a high-cost card when it's overkill
  if (card.cost >= 4 && oldMargin > 5) score -= 15;

  // 5. Subtype synergy explicit bonus
  if (card.subtypes.includes(lane)) score += 5;

  // 6. Per-game lane category bonus (if matching)
  if (getLaneBonusPower(card.category, laneBonus) > 0) score += 5;

  // 7. Prefer spending close to (but within) the energy budget
  const efficiency = effectiveCost / Math.max(1, energy);
  if (efficiency > 0.5 && efficiency <= 1.0) score += 4;

  // 8. Mutations that debuff the player are worth extra
  const debuffValue = sim.mutations
    .filter((m) => m.side === allySide && m.powerDelta < 0)
    .reduce((acc, m) => acc + Math.abs(m.powerDelta), 0);
  score += debuffValue * 2;

  // 9. Destroyed player cards are very valuable
  score += sim.removedCards.filter((rc) => rc.side === allySide).length * 10;

  // 10. Keyword-specific estimates the simulation can't see:
  const x = card.keywordValue ?? 0;
  if (card.keyword === "crueldad" && card.trigger === "end_turn") {
    // Recurring debuff to the weakest player card in lane
    score += x * 1.5 * board[lane].player.length;
  }
  if (card.keyword === "fortaleza" && card.trigger === "end_turn") {
    // Recurring lane-wide buff (own cards in lane after this play)
    score += x * 1.5 * (sim.board[lane].enemy.length);
  }
  if (card.keyword === "amparo") {
    // Shield value per existing ally
    score += x * board[lane].enemy.length;
  }
  if (card.keyword === "coraza") {
    score += x; // defensive value
  }
  if (card.keyword === "fervor") {
    score += x * 2; // scales with remaining turns
  }
  if (card.keyword === "duelista") {
    score += x * 2;
  }
  if (card.keyword === "purificacion") {
    score += 3; // steady utility
  }
  // ---- V3 keyword estimates the simulation can't see ----
  if (card.keyword === "veneno") {
    score += x * 2; // recurring piercing debuff to the strongest enemy
  }
  if (card.keyword === "ventisca") {
    score += x * 1.5 * board[lane].player.length; // recurring AoE pressure
  }
  if (card.keyword === "contagio") {
    const anyPoisoned = board[lane].player.some((c) => (c.debuffTaken ?? 0) > 0);
    score += anyPoisoned ? x * 1.5 : 0.3; // conditional punish
  }
  if (card.keyword === "escarcha") {
    score += x * 1.2; // renewable shield
  }
  if (card.keyword === "combustion") {
    score += x * 2; // on_death explosion (2X pierce), discounted by condition
  }
  if (card.keyword === "llamarada") {
    score += x * 1.2 * board[lane].player.length; // one-shot AoE (mutations also counted by sim)
  }
  // ---- 3ª tanda: estimaciones que la simulación no ve ----
  if (card.keyword === "custodia") {
    score += x * 1.2; // escudo renovable al aliado más débil
  }
  if (card.keyword === "desafio") {
    const losing = calcLanePower(board[lane].enemy) < calcLanePower(board[lane].player);
    score += losing ? x * 2 : 0.3; // remontada condicional
  }
  if (card.keyword === "detonacion") {
    score += x * 1.2 * board[lane].player.length; // explosión AoE al morir
  }
  if (card.keyword === "conspiracion") {
    score += x * (sim.hand.length + 1); // buff a la mano restante
  }
  if (card.keyword === "ruptura_glacial") {
    const anyCracked = board[lane].player.some((c) => (c.debuffTaken ?? 0) > 0);
    if (anyCracked) score += x * 0.5; // el sim ya cuenta la mutación; prima si hay grieta
  }
  // ---- V3.0 (T-A): estimaciones que la simulación no ve ----
  if (card.keyword === "estacion") {
    score += x * 2; // recurrente y madura a +2X (como Fervor con prima tardía)
  }
  if (card.keyword === "tripulacion") {
    score += x * 1.5 * Math.max(1, sim.board[lane].enemy.length); // escala con propias
  }
  if (card.keyword === "engranaje") {
    const hasItem = board[lane].enemy.some((c) => c.category === "Ítem") || card.category === "Ítem";
    score += hasItem ? x * 1.5 : 0.3; // condicional a piezas
  }
  if (card.keyword === "torreta") {
    score += x * 1.5; // recurrente al más fuerte
  }
  if (card.keyword === "micelio") {
    score += x * 1.5; // escudo propio + aliado
  }
  if (card.keyword === "remache") {
    score += x * 0.8 * (sim.board[lane].enemy.length + 1); // carril completo incluida ella
  }
  if (card.keyword === "contrabando") {
    score += x; // una carta de la mano futura
  }
  if (card.keyword === "canonazo" || card.keyword === "andanada") {
    const adjEnemies = (LANE_ADJACENT[lane] ?? []).reduce((acc, ln) => acc + board[ln].player.length, 0);
    score += x * 1.2 * adjEnemies; // el sim ya cuenta el carril local; prima el adyacente
  }
  if (card.keyword === "floracion") {
    score += x * 1.2 * sim.board[lane].enemy.length; // legado de carril entero
  }
  if (card.keyword === "chatarra") {
    score += x * 1.2; // poder + escudo al más débil
  }
  if (card.keyword === "descarga") {
    if (board[lane].player.length >= 2) score += x * 0.5; // el sim ya cuenta las 2 mutaciones
  }

  // 11. Avoid playing into a player-owned trap if it would kill the card
  if (sim.trapTriggered && sim.playedCard.currentPower <= 0) {
    score -= 30;
  }

  // 12. FORMACIÓN (Guerrero): sembrar el 2º/3º cartas de un carril anticipa
  // el +1 al cierre de turno (el end_turn NO está en la simulación).
  if (rules?.classes.enemy === "guerrero") {
    const ownAfter = sim.board[lane].enemy.length;
    if (ownAfter === 2) score += 4; // activa la formación este mismo turno
    else if (ownAfter > 2) score += 1.5; // la mantiene viva (crecimiento)
  }

  // 13. MARCA (Asesino): si esta jugada DEBUFFEA y aún no hay presa debilitada,
  // prima preparar el carril para consumir PC después.
  if (rules?.classes.enemy === "asesino" && comboGainedSim(sim) > 0) {
    const anyWeak = board[lane]["player"].some((c) => (c.debuffTaken ?? 0) > 0);
    if (!anyWeak) score += 3;
  }

  return score;
}

/** Reducciones enemigas causadas por una jugada simulada (0 sin rules). */
function comboGainedSim(sim: PlayResult): number {
  return sim.comboGained ?? 0;
}

/**
 * Decide the AI's plays for this turn. Returns an ordered list of plays
 * (the AI may play multiple cards in one turn if it has enough energy).
 */
export function planEnemyTurn(
  board: Board,
  hand: HandCard[],
  energy: number,
  laneBonuses: LaneBonuses,
  laneTraps: LaneTraps,
  lanes: LaneId[] = LANE_IDS,
  /** REGLAS V3 (opcional) — el bot juega bajo las MISMAS reglas de clase. */
  rules?: ClassRulesState
): AIPlay[] {
  const plays: AIPlay[] = [];
  let workBoard: Board = board;
  let workHand: HandCard[] = hand;
  let workEnergy = energy;
  let workTraps: LaneTraps = { ...laneTraps };
  let workRules: ClassRulesState | undefined = rules ? cloneRules(rules) : undefined;

  // Try up to 3 plays per turn
  for (let iter = 0; iter < 3; iter++) {
    if (workEnergy < 1 || workHand.length === 0) break;

    let best: AIPlay | null = null;
    for (const card of workHand) {
      for (const lane of lanes) {
        const laneBonus = laneBonuses[lane];
        if (!isCardCostAllowed(card.cost, laneBonus)) continue;
        const resonancia =
          !!workRules && workRules.classes.enemy === "mago" && workRules.lastSpec.enemy === lane;
        const effectiveCost = Math.max(
          0,
          getFinalCost(card.cost, laneBonus) - (resonancia ? V3_RESONANCIA_COST_CUT : 0)
        );
        if (effectiveCost > workEnergy) continue;
        if (workBoard[lane].enemy.length >= getLaneMaxCards(laneBonus)) continue;
        const s = scoreAIPlay(
          workBoard,
          workHand,
          workEnergy,
          card,
          lane,
          laneBonus,
          workTraps[lane],
          plays.length + 1,
          workRules
        );
        if (!best || s > best.score) {
          best = { card, lane, score: s };
        }
      }
    }

    // Only play if the score is positive (worth doing)
    if (!best || best.score <= 0) break;

    try {
      const res = playCard(
        workBoard,
        workHand,
        workEnergy,
        "enemy",
        best.lane,
        best.card,
        laneBonuses[best.lane],
        workTraps[best.lane],
        plays.length + 1,
        workRules
      );
      workBoard = res.board;
      workHand = res.hand;
      workEnergy = res.remainingEnergy;
      if (res.rulesOut) workRules = res.rulesOut;

      if (res.trapTriggered) {
        workTraps = { ...workTraps, [best.lane]: null };
      }

      plays.push(best);
    } catch {
      break;
    }
  }

  return plays;
}

// ---------------------------------------------------------------------------
// Final result computation
// ---------------------------------------------------------------------------

export function computeFinalResult(board: Board, lanes: LaneId[] = LANE_IDS): FinalResult {
  let playerWins = 0;
  let enemyWins = 0;
  let draws = 0;
  let totalPlayer = 0;
  let totalEnemy = 0;
  const laneOutcomes: LaneOutcome[] = [];

  for (const lane of lanes) {
    const p = calcLanePower(board[lane].player);
    const e = calcLanePower(board[lane].enemy);
    totalPlayer += p;
    totalEnemy += e;
    let winner: "player" | "enemy" | "draw" = "draw";
    if (p > e) {
      playerWins++;
      winner = "player";
    } else if (e > p) {
      enemyWins++;
      winner = "enemy";
    } else {
      draws++;
    }
    laneOutcomes.push({ lane, playerScore: p, enemyScore: e, winner });
  }

  let result: FinalResult["result"] = "DRAW";
  if (playerWins > enemyWins) result = "WIN";
  else if (enemyWins > playerWins) result = "LOSS";

  return {
    result,
    playerWins,
    enemyWins,
    draws,
    laneOutcomes,
    totalPlayer,
    totalEnemy,
  };
}

// ---------------------------------------------------------------------------
// Card metadata for UI
// ---------------------------------------------------------------------------

export function getEffectLabel(effectId: EffectId): string {
  if (effectId === "none") return "—";
  return KEYWORD_META[effectId]?.label ?? "—";
}

// ---------------------------------------------------------------------------
// Trigger dispatchers — fire keyword effects at the right point of the turn.
// The caller (gameStore) applies the returned board and pushes the logs.
// ---------------------------------------------------------------------------

export interface TriggerResult {
  /** Newly-produced board (a fresh copy with mutations applied). */
  board: Board;
  /** Human-readable log entries (one per fired card). */
  logs: { side: "player" | "enemy" | "system"; text: string }[];
  /** Eventos visuales para FxLayer (solo cliente los pinta). */
  fx: FxEvent[];
  /** Reglas sistémicas actualizadas (solo si se pasaron rules al disparador). */
  rulesOut?: ClassRulesState;
}

/** Crea un TriggerResult vacío con el board dado. */
function triggerResult(board: Board): TriggerResult {
  return { board, logs: [], fx: [] };
}

/**
 * Fire all START_TURN effects on the board for the given side.
 * Keywords: Fervor, Duelista, Purificación (V2) · Escarcha, Veneno (V3) ·
 * Estación, Tripulación, Engranaje (V3.0).
 *
 * `turnNumber` = turno GLOBAL de la partida (1-6) — lo usa Estación (madura
 * a +2X desde V3_ESTACION_TURN). 0 = desconocido (tests legacy): trata como
 * pre-maduración.
 */
export function applyStartTurnEffects(
  board: Board,
  side: "player" | "enemy",
  _hand: HandCard[] = [],
  lanes: LaneId[] = LANE_IDS,
  /** REGLAS V3 (opcional): los debuffs de las cartas de `side` dan PC (Asesino). */
  rules?: ClassRulesState,
  /** Turno global de la partida (Estación). */
  turnNumber = 0
): TriggerResult {
  const newBoard = cloneBoard(board);
  const result = triggerResult(newBoard);
  const { logs, fx } = result;
  let rulesOut: ClassRulesState | undefined = rules ? cloneRules(rules) : undefined;

  // ── VIENTO DE POPA (Pirata, V3.0): si tu tripulación total es MENOR que la
  // del rival, TODAS tus cartas ganan +1 al inicio de tu turno. El que llega
  // con menos grumetes navega con el viento a favor (remontada sin estado).
  if (rulesOut && rulesOut.classes[side] === "pirata") {
    let mine = 0;
    let theirs = 0;
    for (const lane of lanes) {
      mine += newBoard[lane][side].length;
      theirs += newBoard[lane][enemySideOf(side)].length;
    }
    if (mine < theirs && mine > 0) {
      const pushedUids: string[] = [];
      for (const lane of lanes) {
        for (const card of newBoard[lane][side]) {
          applyPowerDelta(newBoard, side, lane, card.uid, V3_VIENTO_POWER, "Viento de popa", "start_turn");
          pushedUids.push(card.uid);
        }
      }
      if (pushedUids.length > 0) {
        logs.push({
          side,
          text: `🏴‍☠️ Viento de popa: menos tripulación que el rival — +${V3_VIENTO_POWER} a ${pushedUids.length} carta(s).`,
        });
        fx.push({ kind: "class", recipe: "formation_banner", lane: lanes[0], side, targetUids: pushedUids, value: V3_VIENTO_POWER });
      }
    }
  }

  // ── FINTA (combate, tanda 30): cobro diferido. La carta que se expuso al
  // jugar cobra +2X al iniciar el turno del dueño (turnsLeft llega a 0).
  for (const lane of lanes) {
    for (const card of [...newBoard[lane][side]]) {
      const pb = card.pendingBonus;
      if (!pb) continue;
      const idx = newBoard[lane][side].findIndex((c) => c.uid === card.uid);
      if (idx < 0) continue;
      if (pb.turnsLeft - 1 <= 0) {
        applyPowerDelta(newBoard, side, lane, card.uid, pb.amount, `${card.name} (Finta)`, "start_turn");
        const after = newBoard[lane][side][idx];
        newBoard[lane][side][idx] = { ...after, pendingBonus: undefined };
        logs.push({ side, text: `⏳ ${card.name} (Finta): cobra el +${pb.amount} prometido` });
        fx.push({ kind: "keyword", keyword: "finta", lane, side, targetUids: [card.uid], value: pb.amount });
        recordKeyword("finta", pb.amount);
      } else {
        newBoard[lane][side][idx] = { ...card, pendingBonus: { ...pb, turnsLeft: pb.turnsLeft - 1 } };
      }
    }
  }

  for (const lane of lanes) {
    for (const card of newBoard[lane][side]) {
      if (card.trigger !== "start_turn") continue;
      const x = card.keywordValue ?? 0;
      const ownLane = newBoard[lane][side];

      switch (card.keyword) {
        // ---- FERVOR [X]: +X permanente al inicio de cada turno ----
        case "fervor": {
          if (x > 0) {
            applyPowerDelta(newBoard, side, lane, card.uid, x, `${card.name} (Fervor)`, "start_turn");
            logs.push({ side, text: `🌅 ${card.name} (Fervor): +${x} permanente` });
            fx.push({ kind: "keyword", keyword: "fervor", lane, side, targetUids: [card.uid], value: x });
            recordKeyword("fervor", x);
          }
          break;
        }

        // ---- DUELISTA [X]: +X si es tu única carta en el carril ----
        case "duelista": {
          if (x > 0 && ownLane.length === 1) {
            applyPowerDelta(newBoard, side, lane, card.uid, x, `${card.name} (Duelista)`, "start_turn");
            logs.push({ side, text: `⚔️ ${card.name} (Duelista): +${x} (única carta del carril)` });
            fx.push({ kind: "keyword", keyword: "duelista", lane, side, targetUids: [card.uid], value: x });
            recordKeyword("duelista", x);
          } else if (x > 0) {
            recordKeywordNoop("duelista"); // ya no está sola: la condición la mata
          }
          break;
        }

        // ---- PURIFICACIÓN: limpia las reducciones acumuladas del carril ----
        case "purificacion": {
          let restored = 0;
          const restoredNames: string[] = [];
          const restoredUids: string[] = [];
          for (const ally of ownLane) {
            const taken = ally.debuffTaken ?? 0;
            if (taken > 0) {
              applyPowerDelta(newBoard, side, lane, ally.uid, taken, `${card.name} (Purificación)`, "start_turn");
              const idx = newBoard[lane][side].findIndex((c) => c.uid === ally.uid);
              if (idx >= 0) {
                newBoard[lane][side][idx] = { ...newBoard[lane][side][idx], debuffTaken: 0 };
              }
              restored += taken;
              restoredNames.push(ally.name);
              restoredUids.push(ally.uid);
            }
          }
          if (restored > 0) {
            logs.push({
              side,
              text: `✨ ${card.name} (Purificación): restauró ${restored} puntos a ${restoredNames.join(", ")}`,
            });
            fx.push({ kind: "keyword", keyword: "purificacion", lane, side, targetUids: restoredUids, value: restored });
            recordKeyword("purificacion", restored);
          } else {
            // Task 46 (68% noop medido): la oración sin nada que limpiar sigue
            // protegiendo — el aliado más débil del carril gana escudo 2.
            const weakest = lowestPowerCard(ownLane);
            if (weakest) {
              const idx = newBoard[lane][side].findIndex((c) => c.uid === weakest.uid);
              const before = newBoard[lane][side][idx].shieldRemaining ?? 0;
              newBoard[lane][side][idx] = { ...newBoard[lane][side][idx], shieldRemaining: before + 2 };
              logs.push({ side, text: `✨ ${card.name} (Purificación): nada que limpiar — ${weakest.name} gana escudo 2` });
              fx.push({ kind: "keyword", keyword: "purificacion", lane, side, targetUids: [weakest.uid], value: 2 });
              recordKeyword("purificacion", 2);
            } else {
              recordKeywordNoop("purificacion");
            }
          }
          break;
        }

        // ---- ESCARCHA [X]: el escudo propio se restaura hasta X ----
        case "escarcha": {
          if (x > 0) {
            const cur = newBoard[lane][side].find((c) => c.uid === card.uid);
            if (cur) {
              const before = cur.shieldRemaining ?? 0;
              const after = Math.min(x, before + x);
              const idx = newBoard[lane][side].findIndex((c) => c.uid === card.uid);
              newBoard[lane][side][idx] = { ...cur, shieldRemaining: after };
              if (after > before) {
                logs.push({ side, text: `❄️ ${card.name} (Escarcha): escudo restaurado a ${after}` });
                fx.push({ kind: "keyword", keyword: "escarcha", lane, side, targetUids: [card.uid], value: after - before });
                recordKeyword("escarcha", after - before);
              } else {
                recordKeywordNoop("escarcha"); // escudo ya al tope
              }
            }
          }
          break;
        }

        // ---- VENENO [X]: −X al enemigo más fuerte, IGNORA escudos ----
        case "veneno": {
          if (x > 0) {
            const target = highestPowerCard(newBoard[lane][enemySideOf(side)]);
            if (target) {
              const poisonRes = applyDebuff(
                newBoard,
                enemySideOf(side),
                lane,
                target.uid,
                -x,
                `${card.name} (Veneno)`,
                "start_turn",
                { bypassShield: true }
              );
              if (rulesOut && poisonRes.appliedDelta < 0) grantCombo(rulesOut, side, 1);
              logs.push({ side, text: `🧪 ${card.name} (Veneno): −${x} a ${target.name} (perfora escudos)` });
              fx.push({ kind: "keyword", keyword: "veneno", lane, side: enemySideOf(side), targetUids: [target.uid], value: x });
              recordKeyword("veneno", x);
            } else {
              recordKeywordNoop("veneno"); // sin enemigos en el carril
            }
          }
          break;
        }

        // ---- CUSTODIA [X]: el escudo MÁS BAJO del carril sube hasta X ----
        // Task 46 (50% noop medido): antes apuntaba al aliado más DÉBIL EN PODER
        // (que solía ser el mismo escudo ya al tope). Ahora busca el escudo más
        // dañado/ausente — el trabajo real de una custodia.
        case "custodia": {
          if (x > 0) {
            // La custodia protege PRIMERO a los demás; solo se escuda a sí
            // misma si está sola en el carril. Empate de escudo → la primera.
            const others = newBoard[lane][side].filter((c) => c.uid !== card.uid);
            const pool = others.length > 0 ? others : newBoard[lane][side];
            let target = pool[0];
            for (const ally of pool) {
              if ((ally.shieldRemaining ?? 0) < (target.shieldRemaining ?? 0)) target = ally;
            }
            if (target) {
              const before = target.shieldRemaining ?? 0;
              const after = Math.min(x, before + x);
              const idx = newBoard[lane][side].findIndex((c) => c.uid === target.uid);
              newBoard[lane][side][idx] = { ...target, shieldRemaining: after };
              if (after > before) {
                logs.push({ side, text: `🛡️ ${card.name} (Custodia): escudo de ${target.name} restaurado a ${after}` });
                fx.push({ kind: "keyword", keyword: "custodia", lane, side, targetUids: [target.uid], value: after - before });
                recordKeyword("custodia", after - before);
              } else {
                recordKeywordNoop("custodia"); // todos los escudos ya ≥ X
              }
            }
          }
          break;
        }

        // ---- DESAFÍO [X]: +X mientras el carril enemigo supere al tuyo ----
        case "desafio": {
          if (x > 0) {
            const enemyPower = calcLanePower(newBoard[lane][enemySideOf(side)]);
            const ownPower = calcLanePower(newBoard[lane][side]);
            if (enemyPower > ownPower) {
              applyPowerDelta(newBoard, side, lane, card.uid, x, `${card.name} (Desafío)`, "start_turn");
              logs.push({ side, text: `🔥 ${card.name} (Desafío): +${x} (el carril es desafiable)` });
              fx.push({ kind: "keyword", keyword: "desafio", lane, side, targetUids: [card.uid], value: x });
              recordKeyword("desafio", x);
            } else {
              recordKeywordNoop("desafio"); // ya va ganando el carril
            }
          }
          break;
        }

        // ---- ESTACIÓN [X]: +X al inicio de turno; +2X desde el turno 4 ----
        // Contador de turnos (eje nuevo): la temporada madura y el carril
        // RAÍZ florece tarde pero fuerte.
        case "estacion": {
          if (x > 0) {
            const mature = turnNumber >= V3_ESTACION_TURN;
            const gained = mature ? 2 * x : x;
            applyPowerDelta(newBoard, side, lane, card.uid, gained, `${card.name} (Estación)`, "start_turn");
            logs.push({
              side,
              text: mature
                ? `🌿 ${card.name} (Estación): la temporada madura — +${gained} permanente`
                : `🌿 ${card.name} (Estación): +${gained} permanente`,
            });
            fx.push({ kind: "keyword", keyword: "estacion", lane, side, targetUids: [card.uid], value: gained });
            recordKeyword("estacion", gained);
          }
          break;
        }

        // ---- TRIPULACIÓN [X]: +X por cada carta propia en este carril ----
        // Contador recurrente de propias (esta incluida — mínimo 1).
        case "tripulacion": {
          if (x > 0) {
            const gained = x * Math.max(1, ownLane.length);
            applyPowerDelta(newBoard, side, lane, card.uid, gained, `${card.name} (Tripulación)`, "start_turn");
            logs.push({ side, text: `⚓ ${card.name} (Tripulación): +${gained} (${ownLane.length} grumete(s) en el carril)` });
            fx.push({ kind: "keyword", keyword: "tripulacion", lane, side, targetUids: [card.uid], value: gained });
            recordKeyword("tripulacion", gained);
          }
          break;
        }

        // ---- ENGRANAJE [X]: +X mientras haya un Ítem propio en este carril ----
        // Condición por presencia de Ítem (incluida esta carta si LO ES).
        case "engranaje": {
          if (x > 0) {
            const hasItem = ownLane.some((c) => c.category === "Ítem");
            if (hasItem) {
              applyPowerDelta(newBoard, side, lane, card.uid, x, `${card.name} (Engranaje)`, "start_turn");
              logs.push({ side, text: `⚙️ ${card.name} (Engranaje): +${x} (la máquina tiene piezas)` });
              fx.push({ kind: "keyword", keyword: "engranaje", lane, side, targetUids: [card.uid], value: x });
              recordKeyword("engranaje", x);
            } else {
              recordKeywordNoop("engranaje"); // sin piezas en el carril: el mecanismo se para
            }
          }
          break;
        }

        default:
          break;
      }
    }
  }

  // REGLA DEL CAMPO: lo dejado a 0 (p.ej. Veneno perforante) cae aquí — sus
  // on_death se disparan en cadena dentro del mismo latido.
  {
    const swept = sweepDestroyedAtZero(newBoard, lanes);
    const rulesRef = { v: rulesOut };
    applySweptDeaths(newBoard, swept, result, rules ? rulesRef : undefined);
    rulesOut = rulesRef.v;
  }

  if (rulesOut) result.rulesOut = rulesOut;
  return result;
}

/**
 * Fire all END_TURN effects on the board for the given side.
 * Keywords: Fortaleza, Crueldad (V2) · Ventisca, Contagio (V3)
 * + barrido de powerDecay (Sobrecarga).
 */
export function applyEndTurnEffects(
  board: Board,
  side: "player" | "enemy",
  _hand: HandCard[] = [],
  lanes: LaneId[] = LANE_IDS,
  /** REGLAS V3 (opcional): FORMACIÓN (Guerrero) + PC por debuffs (Asesino). */
  rules?: ClassRulesState
): TriggerResult {
  const newBoard = cloneBoard(board);
  const result = triggerResult(newBoard);
  const { logs, fx } = result;
  const enemySide: "player" | "enemy" = side === "player" ? "enemy" : "player";
  let rulesOut: ClassRulesState | undefined = rules ? cloneRules(rules) : undefined;

  // ── FORMACIÓN DE COMBATE (Guerrero): carriles con 2+ cartas propias → +1
  //    permanente a TODAS tus cartas del carril. Tope +1 acumulado por carta (calibrado por sim).
  if (rulesOut && rulesOut.classes[side] === "guerrero") {
    for (const lane of lanes) {
      const own = newBoard[lane][side];
      if (own.length < 2) continue;
      const uplifted: string[] = [];
      const upliftedUids: string[] = [];
      for (const card of [...own]) {
        if ((card.formation ?? 0) >= V3_FORMACION_CAP) continue;
        applyPowerDelta(newBoard, side, lane, card.uid, 1, "Formación de combate", "end_turn");
        const idx = newBoard[lane][side].findIndex((c) => c.uid === card.uid);
        if (idx >= 0) {
          newBoard[lane][side][idx] = {
            ...newBoard[lane][side][idx],
            formation: (newBoard[lane][side][idx].formation ?? 0) + 1,
          };
        }
        uplifted.push(card.name);
        upliftedUids.push(card.uid);
      }
      if (uplifted.length > 0) {
        logs.push({
          side,
          text: `⚔️ Formación de combate: +1 a ${uplifted.length} carta(s) de ${LANE_META[lane].title} (${uplifted.join(", ")})`,
        });
        // RITUAL DE CLASE (grupo A): estandarte propio de la Formación —
        // sustituye al genérico de Fortaleza. uids en paralelo con los nombres
        // (antes own[i] desalineaba cuando una carta ya estaba al tope del cap).
        fx.push({ kind: "class", recipe: "formation_banner", lane, side, targetUids: upliftedUids, value: upliftedUids.length });
      }
    }
  }

  // ── ECOSISTEMA (Botánico, V3.0): carril con cartas de 2+ CATEGORÍAS
  // distintas → +1 permanente a TODAS tus cartas de ese carril al cierre.
  // La diversidad es vida (Ataque+Ítem+Acción conviviendo = ecosistema).
  // Comparte campo/cap de Formación (anti-bola-de-nieve, mismo tope +1).
  if (rulesOut && rulesOut.classes[side] === "botanico") {
    for (const lane of lanes) {
      const own = newBoard[lane][side];
      if (own.length < 2) continue;
      const cats = new Set(own.map((c) => c.category));
      if (cats.size < 2) continue;
      const bloomedUids: string[] = [];
      const bloomedNames: string[] = [];
      for (const card of [...own]) {
        if ((card.formation ?? 0) >= V3_FORMACION_CAP) continue;
        applyPowerDelta(newBoard, side, lane, card.uid, 1, "Ecosistema", "end_turn");
        const idx = newBoard[lane][side].findIndex((c) => c.uid === card.uid);
        if (idx >= 0) {
          newBoard[lane][side][idx] = {
            ...newBoard[lane][side][idx],
            formation: (newBoard[lane][side][idx].formation ?? 0) + 1,
          };
        }
        bloomedUids.push(card.uid);
        bloomedNames.push(card.name);
      }
      if (bloomedUids.length > 0) {
        logs.push({
          side,
          text: `🌿 Ecosistema: diversidad en ${LANE_META[lane].title} — +1 a ${bloomedUids.length} carta(s) (${bloomedNames.join(", ")})`,
        });
        fx.push({ kind: "class", recipe: "formation_banner", lane, side, targetUids: bloomedUids, value: bloomedUids.length });
      }
    }
  }

  for (const lane of lanes) {
    for (const card of newBoard[lane][side]) {
      if (card.trigger !== "end_turn") continue;
      const x = card.keywordValue ?? 0;

      switch (card.keyword) {
        // ---- FORTALEZA [X]: +X a todas tus cartas de este carril ----
        case "fortaleza": {
          if (x > 0) {
            const allyUids = newBoard[lane][side].map((a) => a.uid);
            for (const ally of newBoard[lane][side]) {
              applyPowerDelta(newBoard, side, lane, ally.uid, x, `${card.name} (Fortaleza)`, "end_turn");
            }
            logs.push({ side, text: `🏰 ${card.name} (Fortaleza): +${x} a ${newBoard[lane][side].length} carta(s) del carril` });
            fx.push({ kind: "keyword", keyword: "fortaleza", lane, side, targetUids: allyUids, value: x });
            recordKeyword("fortaleza", x * newBoard[lane][side].length);
          }
          break;
        }

        // ---- CRUELDAD [X]: −X al enemigo más débil CON PODER del carril ----
        // No apunta a cuerpos a 0 (no cumplen función: reporte del jugador).
        // Pasa por applyDebuff: los escudos (Coraza/Amparo) absorben.
        case "crueldad": {
          if (x > 0) {
            const vivos = newBoard[lane][enemySide].filter((c) => c.currentPower > 0);
            const target = lowestPowerCard(vivos);
            if (target) {
              const res = applyDebuff(
                newBoard,
                enemySide,
                lane,
                target.uid,
                -x,
                `${card.name} (Crueldad)`,
                "end_turn"
              );
              if (rulesOut && res.appliedDelta < 0) grantCombo(rulesOut, side, 1);
              if (res.absorbedByShield > 0 && res.appliedDelta === 0) {
                logs.push({ side, text: `🎯 ${card.name} (Crueldad): BLOQUEADO por escudo de ${target.name}` });
                fx.push({ kind: "shieldBlock", lane, side: enemySide, targetUids: [target.uid], value: res.absorbedByShield });
                recordKeywordNoop("crueldad"); // bloqueada: no hizo nada real
              } else {
                const absorbedNote = res.absorbedByShield > 0 ? ` (${res.absorbedByShield} absorbido por escudo)` : "";
                logs.push({ side, text: `🎯 ${card.name} (Crueldad): ${res.appliedDelta} a ${target.name}${absorbedNote}` });
                fx.push({ kind: "keyword", keyword: "crueldad", lane, side: enemySide, targetUids: [target.uid], value: x });
                recordKeyword("crueldad", Math.abs(res.appliedDelta));
                if (res.absorbedByShield > 0) {
                  fx.push({ kind: "shieldBlock", lane, side: enemySide, targetUids: [target.uid], value: res.absorbedByShield });
                }
              }
            } else {
              // Task 46 (44% noop medido): FURIA sin presa no se calma — la carta
              // se enfurece y crece +X (permanente). El carril vacío no la apaga.
              applyPowerDelta(newBoard, side, lane, card.uid, x, `${card.name} (Crueldad)`, "end_turn");
              logs.push({ side, text: `🎯 ${card.name} (Crueldad): sin presa — se enfurece y gana +${x}` });
              fx.push({ kind: "keyword", keyword: "crueldad", lane, side, targetUids: [card.uid], value: x });
              recordKeyword("crueldad", x);
            }
          }
          break;
        }

        // ---- TORRETA [X]: −X al enemigo MÁS FUERTE del carril (honesto) ----
        // El francotirador pica arriba (Crueldad pica abajo). Los escudos
        // absorben — es un proyectil, no veneno. Sin presa: la torreta
        // espera (noop; a diferencia de FURIA, la máquina no se enfurece).
        case "torreta": {
          if (x > 0) {
            const vivos = newBoard[lane][enemySide].filter((c) => c.currentPower > 0);
            const target = highestPowerCard(vivos);
            if (target) {
              const res = applyDebuff(
                newBoard,
                enemySide,
                lane,
                target.uid,
                -x,
                `${card.name} (Torreta)`,
                "end_turn"
              );
              if (rulesOut && res.appliedDelta < 0) grantCombo(rulesOut, side, 1);
              if (res.absorbedByShield > 0 && res.appliedDelta === 0) {
                logs.push({ side, text: `🎯 ${card.name} (Torreta): BLOQUEADO por escudo de ${target.name}` });
                fx.push({ kind: "shieldBlock", lane, side: enemySide, targetUids: [target.uid], value: res.absorbedByShield });
                recordKeywordNoop("torreta");
              } else {
                const absorbedNote = res.absorbedByShield > 0 ? ` (${res.absorbedByShield} absorbido por escudo)` : "";
                logs.push({ side, text: `🎯 ${card.name} (Torreta): ${res.appliedDelta} al más fuerte — ${target.name}${absorbedNote}` });
                fx.push({ kind: "keyword", keyword: "torreta", lane, side: enemySide, targetUids: [target.uid], value: x });
                recordKeyword("torreta", Math.abs(res.appliedDelta));
                if (res.absorbedByShield > 0) {
                  fx.push({ kind: "shieldBlock", lane, side: enemySide, targetUids: [target.uid], value: res.absorbedByShield });
                }
              }
            } else {
              recordKeywordNoop("torreta"); // sin objetivos: la torreta barre el horizonte
            }
          }
          break;
        }

        default:
          break;
      }
    }

    // ---- VENTISCA [X]: −X a TODAS las cartas enemigas del carril ----
    for (const card of newBoard[lane][side]) {
      if (card.trigger !== "end_turn" || card.keyword !== "ventisca") continue;
      const x = card.keywordValue ?? 0;
      if (x > 0 && newBoard[lane][enemySide].length > 0) {
        const enemyUids: string[] = [];
        let blizzardHits = 0;
        for (const enemy of [...newBoard[lane][enemySide]]) {
          const blizRes = applyDebuff(
            newBoard,
            enemySide,
            lane,
            enemy.uid,
            -x,
            `${card.name} (Ventisca)`,
            "end_turn"
          );
          if (blizRes.appliedDelta < 0) blizzardHits++;
          enemyUids.push(enemy.uid);
        }
        if (rulesOut && blizzardHits > 0) grantCombo(rulesOut, side, blizzardHits);
        logs.push({ side, text: `❄️ ${card.name} (Ventisca): −${x} a ${newBoard[lane][enemySide].length} enemigo(s) del carril` });
        fx.push({ kind: "keyword", keyword: "ventisca", lane, side: enemySide, targetUids: enemyUids, value: x });
        recordKeyword("ventisca", x * blizzardHits);
        if (blizzardHits === 0) recordKeywordNoop("ventisca");
      }
    }

    // ---- CONTAGIO [X]: −X a TODAS las cartas enemigas CON reducciones ----
    // Task 46 (0.3 poder/juego medido): antes picaba a UNA carta con X pequeño.
    // La plaga se EXTIENDE a todo lo infectado del carril (multi-objetivo).
    // Pasa por applyDebuff: los escudos absorben su parte.
    for (const card of newBoard[lane][side]) {
      if (card.trigger !== "end_turn" || card.keyword !== "contagio") continue;
      const x = card.keywordValue ?? 0;
      const poisoned = newBoard[lane][enemySide].filter((c) => (c.debuffTaken ?? 0) > 0);
      if (x > 0 && poisoned.length > 0) {
        const uids: string[] = [];
        let appliedTotal = 0;
        let hits = 0;
        for (const target of poisoned) {
          const res = applyDebuff(
            newBoard,
            enemySide,
            lane,
            target.uid,
            -x,
            `${card.name} (Contagio)`,
            "end_turn"
          );
          if (rulesOut && res.appliedDelta < 0) grantCombo(rulesOut, side, 1);
          uids.push(target.uid);
          if (res.appliedDelta < 0) {
            appliedTotal += Math.abs(res.appliedDelta);
            hits++;
          }
        }
        const blockedNote = hits < poisoned.length ? ` (${poisoned.length - hits} bloqueada(s) por escudo)` : "";
        logs.push({ side, text: `🧪 ${card.name} (Contagio): −${x} a ${poisoned.length} infectado(s) del carril${blockedNote}` });
        fx.push({ kind: "keyword", keyword: "contagio", lane, side: enemySide, targetUids: uids, value: x });
        if (appliedTotal > 0) recordKeyword("contagio", appliedTotal);
        else recordKeywordNoop("contagio"); // todos bloqueados por escudos
      }
    }
  }

  // ---- Barrido de powerDecay (Sobrecarga): one-shot al cierre del turno ----
  for (const lane of lanes) {
    for (const card of [...newBoard[lane][side]]) {
      const decay = card.powerDecay ?? 0;
      if (decay > 0) {
        applyPowerDelta(newBoard, side, lane, card.uid, -decay, `${card.name} (Sobrecarga se disipa)`, "end_turn");
        const idx = newBoard[lane][side].findIndex((c) => c.uid === card.uid);
        if (idx >= 0) {
          newBoard[lane][side][idx] = { ...newBoard[lane][side][idx], powerDecay: 0 };
        }
        logs.push({ side, text: `⚡ ${card.name}: Sobrecarga se disipa (−${decay})` });
        fx.push({ kind: "keyword", keyword: "sobrecarga", lane, side, targetUids: [card.uid], value: decay });
        recordKeyword("sobrecarga", -decay); // el coste de la ráfaga
      }
    }
  }

  // REGLA DEL CAMPO: al cerrar el turno, todo lo dejado a 0 por debuffs
  // (Crueldad, Ventisca, Contagio, venenos acumulados…) CAE y su Último
  // Aliento (on_death) se dispara. Orden: efectos → decay → muertes.
  {
    const swept = sweepDestroyedAtZero(newBoard, lanes);
    const rulesRef = { v: rulesOut };
    applySweptDeaths(newBoard, swept, result, rules ? rulesRef : undefined);
    rulesOut = rulesRef.v;
  }

  // REGLAS V3: cerrar el turno del lado — Resonancia expira (lastSpec a null).
  if (rulesOut) {
    rulesOut.lastSpec[side] = null;
    result.rulesOut = rulesOut;
  }

  return result;
}

function enemySideOf(side: "player" | "enemy"): "player" | "enemy" {
  return side === "player" ? "enemy" : "player";
}

/**
 * Los 3 carriles de la clase a la que pertenece un LaneId (derivado de
 * CLASS_META — muralla/octava de la tanda 30 operan multi-carril propio).
 */
function classLanesOf(lane: LaneId): LaneId[] {
  for (const meta of Object.values(CLASS_META)) {
    if (meta.lanes.includes(lane)) return meta.lanes;
  }
  return [lane];
}

/**
 * Fire ON_DEATH effects when a card is destroyed. The caller passes the
 * dying card and its location; this function dispatches its keyword.
 * Keywords: Legado (+X al aliado más débil, V2) · Combustión (−2X al enemigo
 * más fuerte perforando escudos, V3).
 */
export function applyOnDeathEffects(
  board: Board,
  side: "player" | "enemy",
  lane: LaneId,
  deadCard: BoardCard,
  /** REGLAS V3 (opcional): Combustión/Detonación propias dan PC (Asesino). */
  rules?: ClassRulesState
): TriggerResult {
  const newBoard = cloneBoard(board);
  const result = triggerResult(newBoard);
  const { logs, fx } = result;
  const rulesOut: ClassRulesState | undefined = rules ? cloneRules(rules) : undefined;

  if (deadCard.trigger !== "on_death") {
    return result;
  }

  const x = deadCard.keywordValue ?? 0;

  // ---- LEGADO [X]: al morir, el aliado más débil del carril gana +X ----
  if (deadCard.keyword === "legado" && x > 0) {
    const target = lowestPowerCard(newBoard[lane][side]);
    if (target) {
      applyPowerDelta(newBoard, side, lane, target.uid, x, `${deadCard.name} (Legado)`, "on_death");
      logs.push({ side, text: `💀 ${deadCard.name} (Legado): +${x} a ${target.name}` });
      fx.push({ kind: "keyword", keyword: "legado", lane, side, sourceUid: deadCard.uid, targetUids: [target.uid], value: x });
      recordKeyword("legado", x);
    } else {
      recordKeywordNoop("legado"); // murió sin aliados: el legado se pierde
    }
  }

  // ---- COMBUSTIÓN [X]: al morir, −2X al enemigo más fuerte (ignora escudos) ----
  if (deadCard.keyword === "combustion" && x > 0) {
    const target = highestPowerCard(newBoard[lane][enemySideOf(side)]);
    if (target) {
      const before = target.currentPower;
      // Mutación directa: la explosión no pasa por applyDebuff → perfora escudos
      applyPowerDelta(newBoard, enemySideOf(side), lane, target.uid, -2 * x, `${deadCard.name} (Combustión)`, "on_death");
      if (rulesOut && newBoard[lane][enemySideOf(side)].find((c) => c.uid === target.uid)?.currentPower !== before) {
        grantCombo(rulesOut, side, 1);
      }
      logs.push({ side, text: `🔥 ${deadCard.name} (Combustión): −${2 * x} a ${target.name} (explota, perfora escudos)` });
      fx.push({ kind: "keyword", keyword: "combustion", lane, side: enemySideOf(side), sourceUid: deadCard.uid, targetUids: [target.uid], value: 2 * x });
      recordKeyword("combustion", 2 * x);
    } else {
      recordKeywordNoop("combustion"); // explotó sin enemigos delante
    }
  }

  // ---- DETONACIÓN [X]: al morir, −X a TODOS los enemigos del carril ----
  // Pasa por applyDebuff: los escudos absorben su parte (no perfora — Combustión es la perforante).
  if (deadCard.keyword === "detonacion" && x > 0) {
    const enemies = [...newBoard[lane][enemySideOf(side)]];
    if (enemies.length > 0) {
      const uids: string[] = [];
      let detonationHits = 0;
      for (const enemy of enemies) {
        const detRes = applyDebuff(newBoard, enemySideOf(side), lane, enemy.uid, -x, `${deadCard.name} (Detonación)`, "on_death");
        if (detRes.appliedDelta < 0) detonationHits++;
        uids.push(enemy.uid);
      }
      if (rulesOut && detonationHits > 0) grantCombo(rulesOut, side, detonationHits);
      logs.push({ side, text: `💥 ${deadCard.name} (Detonación): −${x} a ${enemies.length} enemigo(s) del carril` });
      fx.push({ kind: "keyword", keyword: "detonacion", lane, side: enemySideOf(side), sourceUid: deadCard.uid, targetUids: uids, value: x });
      recordKeyword("detonacion", x * detonationHits);
      if (detonationHits === 0) recordKeywordNoop("detonacion");
    } else {
      recordKeywordNoop("detonacion");
    }
  }

  // ---- FLORACIÓN [X]: al morir, TODAS tus cartas del carril ganan +X ----
  // La muerte que alimenta al enjambre (Legado solo buffa al más débil).
  if (deadCard.keyword === "floracion" && x > 0) {
    const allies = [...newBoard[lane][side]];
    if (allies.length > 0) {
      for (const ally of allies) {
        applyPowerDelta(newBoard, side, lane, ally.uid, x, `${deadCard.name} (Floración)`, "on_death");
      }
      logs.push({ side, text: `🌸 ${deadCard.name} (Floración): +${x} a ${allies.length} carta(s) del carril` });
      fx.push({
        kind: "keyword", keyword: "floracion", lane, side, sourceUid: deadCard.uid,
        targetUids: allies.map((a) => a.uid), value: x,
      });
      recordKeyword("floracion", x * allies.length);
    } else {
      recordKeywordNoop("floracion"); // murió sola: sus esporas no encuentran suelo
    }
  }

  // ---- ANDANADA [X]: al morir, −X a TODOS los enemigos del carril y ADYACENTES ----
  // La última salva cubre dos frentes (Detonación es de un solo carril).
  // Honest: applyDebuff (los escudos absorben su parte).
  if (deadCard.keyword === "andanada" && x > 0) {
    const lanesHit: LaneId[] = [lane, ...(LANE_ADJACENT[lane] ?? [])];
    let volleyHits = 0;
    let volleyTargets = 0;
    for (const ln of lanesHit) {
      for (const enemy of [...newBoard[ln][enemySideOf(side)]]) {
        const res = applyDebuff(newBoard, enemySideOf(side), ln, enemy.uid, -x, `${deadCard.name} (Andanada)`, "on_death");
        if (res.appliedDelta < 0) volleyHits++;
        volleyTargets++;
        fx.push({ kind: "keyword", keyword: "andanada", lane: ln, side: enemySideOf(side), sourceUid: deadCard.uid, targetUids: [enemy.uid], value: x });
      }
    }
    if (rulesOut && volleyHits > 0) grantCombo(rulesOut, side, volleyHits);
    if (volleyTargets > 0) {
      logs.push({ side, text: `💥 ${deadCard.name} (Andanada): −${x} a ${volleyTargets} enemigo(s) en ${lanesHit.length} carril(es)` });
      recordKeyword("andanada", x * volleyHits);
      if (volleyHits === 0) recordKeywordNoop("andanada");
    } else {
      recordKeywordNoop("andanada"); // la salva cae al mar
    }
  }

  // ---- CHATARRA [X]: al morir, el aliado más débil gana +X y un escudo X ----
  // Reciclaje: poder + blindaje (Legado solo da poder).
  if (deadCard.keyword === "chatarra" && x > 0) {
    const target = lowestPowerCard(newBoard[lane][side]);
    if (target) {
      applyPowerDelta(newBoard, side, lane, target.uid, x, `${deadCard.name} (Chatarra)`, "on_death");
      const idx = newBoard[lane][side].findIndex((c) => c.uid === target.uid);
      if (idx >= 0) {
        newBoard[lane][side][idx] = {
          ...newBoard[lane][side][idx],
          shieldRemaining: (newBoard[lane][side][idx].shieldRemaining ?? 0) + x,
        };
      }
      logs.push({ side, text: `⚙️ ${deadCard.name} (Chatarra): ${target.name} recicla +${x} de poder y escudo ${x}` });
      fx.push({ kind: "keyword", keyword: "chatarra", lane, side, sourceUid: deadCard.uid, targetUids: [target.uid], value: x });
      recordKeyword("chatarra", x);
    } else {
      recordKeywordNoop("chatarra"); // murió sin heredero: la chatarra se pierde
    }
  }

  // ---- MURALLA [X]: al morir, TODAS tus cartas (los 3 carriles) ganan escudo X ----
  // Tanda 30 (protección). La guarnición cae cubriendo la retirada: blindaje
  // GLOBAL propio (única muerte que protege más allá de su carril).
  if (deadCard.keyword === "muralla" && x > 0) {
    const ownLanes = classLanesOf(lane);
    const uids: string[] = [];
    for (const ln of ownLanes) {
      for (const ally of [...newBoard[ln][side]]) {
        const idx = newBoard[ln][side].findIndex((c) => c.uid === ally.uid);
        if (idx < 0) continue;
        newBoard[ln][side][idx] = {
          ...newBoard[ln][side][idx],
          shieldRemaining: (newBoard[ln][side][idx].shieldRemaining ?? 0) + x,
        };
        uids.push(ally.uid);
        fx.push({ kind: "keyword", keyword: "muralla", lane: ln, side, sourceUid: deadCard.uid, targetUids: [ally.uid], value: x });
      }
    }
    if (uids.length > 0) {
      logs.push({ side, text: `🏰 ${deadCard.name} (Muralla): escudo ${x} a ${uids.length} carta(s) de tu línea` });
      recordKeyword("muralla", x * uids.length);
    } else {
      recordKeywordNoop("muralla"); // murió sin guarnición a la que amparar
    }
  }

  // ---- CENIZA [X]: al morir, −X a los DOS enemigos más débiles del carril ----
  // Tanda 30 (fuego). Espejo de Descarga (que pica al jugar): las brasas
  // finales escogen a los dos más frágiles. Honest: applyDebuff (escudos).
  if (deadCard.keyword === "ceniza" && x > 0) {
    const sorted = [...newBoard[lane][enemySideOf(side)]]
      .sort((a, b) => a.currentPower - b.currentPower)
      .slice(0, 2);
    if (sorted.length > 0) {
      const uids: string[] = [];
      let hits = 0;
      for (const t of sorted) {
        const res = applyDebuff(newBoard, enemySideOf(side), lane, t.uid, -x, `${deadCard.name} (Ceniza)`, "on_death");
        if (res.appliedDelta < 0) hits++;
        uids.push(t.uid);
      }
      logs.push({ side, text: `🌫️ ${deadCard.name} (Ceniza): −${x} a ${sorted.length} enemigo(s) más débil(es)` });
      fx.push({ kind: "keyword", keyword: "ceniza", lane, side: enemySideOf(side), sourceUid: deadCard.uid, targetUids: uids, value: x });
      recordKeyword("ceniza", x * hits);
      if (hits === 0) recordKeywordNoop("ceniza"); // todo bloqueado por escudos
    } else {
      recordKeywordNoop("ceniza"); // se apagó sin enemigos delante
    }
  }

  if (rulesOut) result.rulesOut = rulesOut;
  return result;
}
