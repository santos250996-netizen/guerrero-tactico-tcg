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
import { CLASS_META, KEYWORD_META, LANE_BONUS_POOL } from "./types";
import type { FxEvent } from "./fx";
import { v4 as uuidv4 } from "uuid";

export type Board = Record<LaneId, LaneState>;

export const LANE_IDS: LaneId[] = ["armas", "proteccion", "furia"];
export const ALL_LANE_IDS: LaneId[] = [
  ...CLASS_META.guerrero.lanes,
  ...CLASS_META.mago.lanes,
  ...CLASS_META.asesino.lanes,
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
  if (bonus.kind === "cost_neg") return Math.max(1, baseCost - 1);
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
    // ---- INSIGNIA [X]: +X permanente al aliado más débil del carril ----
    case "insignia": {
      if (x > 0) {
        const target = lowestPowerCard(allyLane);
        if (target) {
          accum.mutations.push({ side, lane, uid: target.uid, powerDelta: x });
        }
      }
      break;
    }

    // ---- REMATE [X]: destruye la carta enemiga más fuerte con poder ≤ X ----
    case "remate": {
      if (x > 0) {
        const candidates = enemyLane.filter((c) => c.currentPower <= x);
        const target = highestPowerCard(candidates);
        if (target) {
          accum.removedCards.push({
            side: enemySide,
            lane,
            uid: target.uid,
            reason: "remate",
          });
        }
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
        }
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
      }
      break;
    }

    // ---- ÍMPETU [X]: +X por cada carta jugada este turno (incluida esta) ----
    case "impetu": {
      if (x > 0) {
        accum.bonusPower += x * Math.max(1, ctx.playsThisTurn ?? 1);
      }
      break;
    }

    // ---- CONVERGENCIA [X]: +X por cada carta propia ya en el carril ----
    case "convergencia": {
      if (x > 0) {
        accum.bonusPower += x * allyLane.length;
      }
      break;
    }

    // ---- SOBRECARGA [X]: +2X ahora; el −X se cobra en end_turn (powerDecay) ----
    case "sobrecarga": {
      if (x > 0) {
        accum.bonusPower += 2 * x;
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
      }
      break;
    }

    // ---- REFRIEGA [X]: +X por cada carta ENEMIGA ya en el carril ----
    case "refriega": {
      if (x > 0) {
        accum.bonusPower += x * enemyLane.length;
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
        }
      }
      break;
    }

    // ---- EMBOSCADA [X]: +2X si es tu 1ª carta del turno; si no, +X ----
    case "emboscada": {
      if (x > 0) {
        const first = (ctx.playsThisTurn ?? 1) === 1;
        accum.bonusPower += first ? 2 * x : x;
      }
      break;
    }

    // ---- PURGA [X]: destruye la carta enemiga MÁS DÉBIL con poder ≤ X ----
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
        }
      }
      break;
    }

    // ---- Keywords que disparan en OTROS triggers (no-op aquí) ----
    // fervor / duelista / purificacion / escarcha / veneno → start_turn
    // fortaleza / crueldad / ventisca / contagio → end_turn
    // legado / combustion → on_death
    // coraza → escudo inicial otorgado en playCard (init del BoardCard)
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
  playsThisTurn = 1
): PlayResult {
  // 1. Cost restriction (solo coste X)
  if (!isCardCostAllowed(handCard.cost, laneBonus)) {
    throw new Error(
      `Esta carta no se puede jugar en ${lane}: el bono requiere coste exacto.`
    );
  }

  // 2. Effective cost
  const effectiveCost = getFinalCost(handCard.cost, laneBonus);
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
  let finalPower = effect.finalPower;
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
        continue;
      }
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
    // Coraza: self shield granted on play (pool finito, sin refresco)
    shieldRemaining: keyword === "coraza" ? (handCard.keywordValue ?? 0) : undefined,
    // Sobrecarga: pending one-shot decay charged at end of turn
    powerDecay: keyword === "sobrecarga" ? (handCard.keywordValue ?? 0) : undefined,
    debuffTaken: 0,
  };
  newBoard[lane][side] = [...newBoard[lane][side], newCard];

  // Build a NEW hand (without the played card)
  const newHand: HandCard[] = hand
    .filter((c) => c.uid !== handCard.uid)
    .map((c) => ({ ...c }));

  return {
    board: newBoard,
    hand: newHand,
    remainingEnergy: energy - effectiveCost,
    playedCard: newCard,
    mutations: effect.mutations,
    removedCards: effect.removedCards,
    trapTriggered,
    newTrap: undefined,
    shieldAbsorbed,
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
  playsThisTurn = 1
): number {
  if (!isCardCostAllowed(card.cost, laneBonus)) return -Infinity;

  const effectiveCost = getFinalCost(card.cost, laneBonus);
  if (effectiveCost > energy) return -Infinity;

  const maxCards = getLaneMaxCards(laneBonus);
  if (board[lane].enemy.length >= maxCards) return -Infinity;

  const allySide: "player" | "enemy" = "player";

  const currentEnemyPower = calcLanePower(board[lane].enemy);
  const currentPlayerPower = calcLanePower(board[lane].player);

  let sim;
  try {
    sim = playCard(board, hand, energy, "enemy", lane, card, laneBonus, activeTrap, playsThisTurn);
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

  // 11. Avoid playing into a player-owned trap if it would kill the card
  if (sim.trapTriggered && sim.playedCard.currentPower <= 0) {
    score -= 30;
  }

  return score;
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
  lanes: LaneId[] = LANE_IDS
): AIPlay[] {
  const plays: AIPlay[] = [];
  let workBoard: Board = board;
  let workHand: HandCard[] = hand;
  let workEnergy = energy;
  let workTraps: LaneTraps = { ...laneTraps };

  // Try up to 3 plays per turn
  for (let iter = 0; iter < 3; iter++) {
    if (workEnergy < 1 || workHand.length === 0) break;

    let best: AIPlay | null = null;
    for (const card of workHand) {
      for (const lane of lanes) {
        const laneBonus = laneBonuses[lane];
        if (!isCardCostAllowed(card.cost, laneBonus)) continue;
        const effectiveCost = getFinalCost(card.cost, laneBonus);
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
          plays.length + 1
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
        plays.length + 1
      );
      workBoard = res.board;
      workHand = res.hand;
      workEnergy = res.remainingEnergy;

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
}

/** Crea un TriggerResult vacío con el board dado. */
function triggerResult(board: Board): TriggerResult {
  return { board, logs: [], fx: [] };
}

/**
 * Fire all START_TURN effects on the board for the given side.
 * Keywords: Fervor, Duelista, Purificación (V2) · Escarcha, Veneno (V3).
 */
export function applyStartTurnEffects(
  board: Board,
  side: "player" | "enemy",
  _hand: HandCard[] = [],
  lanes: LaneId[] = LANE_IDS
): TriggerResult {
  const newBoard = cloneBoard(board);
  const result = triggerResult(newBoard);
  const { logs, fx } = result;

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
          }
          break;
        }

        // ---- DUELISTA [X]: +X si es tu única carta en el carril ----
        case "duelista": {
          if (x > 0 && ownLane.length === 1) {
            applyPowerDelta(newBoard, side, lane, card.uid, x, `${card.name} (Duelista)`, "start_turn");
            logs.push({ side, text: `⚔️ ${card.name} (Duelista): +${x} (única carta del carril)` });
            fx.push({ kind: "keyword", keyword: "duelista", lane, side, targetUids: [card.uid], value: x });
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
              applyDebuff(
                newBoard,
                enemySideOf(side),
                lane,
                target.uid,
                -x,
                `${card.name} (Veneno)`,
                "start_turn",
                { bypassShield: true }
              );
              logs.push({ side, text: `🧪 ${card.name} (Veneno): −${x} a ${target.name} (perfora escudos)` });
              fx.push({ kind: "keyword", keyword: "veneno", lane, side: enemySideOf(side), targetUids: [target.uid], value: x });
            }
          }
          break;
        }

        default:
          break;
      }
    }
  }

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
  lanes: LaneId[] = LANE_IDS
): TriggerResult {
  const newBoard = cloneBoard(board);
  const result = triggerResult(newBoard);
  const { logs, fx } = result;
  const enemySide: "player" | "enemy" = side === "player" ? "enemy" : "player";

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
          }
          break;
        }

        // ---- CRUELDAD [X]: −X al enemigo más débil del carril ----
        // Pasa por applyDebuff: los escudos (Coraza/Amparo) absorben.
        case "crueldad": {
          if (x > 0) {
            const target = lowestPowerCard(newBoard[lane][enemySide]);
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
              if (res.absorbedByShield > 0 && res.appliedDelta === 0) {
                logs.push({ side, text: `🎯 ${card.name} (Crueldad): BLOQUEADO por escudo de ${target.name}` });
                fx.push({ kind: "shieldBlock", lane, side: enemySide, targetUids: [target.uid], value: res.absorbedByShield });
              } else {
                const absorbedNote = res.absorbedByShield > 0 ? ` (${res.absorbedByShield} absorbido por escudo)` : "";
                logs.push({ side, text: `🎯 ${card.name} (Crueldad): ${res.appliedDelta} a ${target.name}${absorbedNote}` });
                fx.push({ kind: "keyword", keyword: "crueldad", lane, side: enemySide, targetUids: [target.uid], value: x });
                if (res.absorbedByShield > 0) {
                  fx.push({ kind: "shieldBlock", lane, side: enemySide, targetUids: [target.uid], value: res.absorbedByShield });
                }
              }
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
        for (const enemy of [...newBoard[lane][enemySide]]) {
          applyDebuff(
            newBoard,
            enemySide,
            lane,
            enemy.uid,
            -x,
            `${card.name} (Ventisca)`,
            "end_turn"
          );
          enemyUids.push(enemy.uid);
        }
        logs.push({ side, text: `❄️ ${card.name} (Ventisca): −${x} a ${newBoard[lane][enemySide].length} enemigo(s) del carril` });
        fx.push({ kind: "keyword", keyword: "ventisca", lane, side: enemySide, targetUids: enemyUids, value: x });
      }
    }

    // ---- CONTAGIO [X]: −X al enemigo con MÁS reducciones acumuladas ----
    for (const card of newBoard[lane][side]) {
      if (card.trigger !== "end_turn" || card.keyword !== "contagio") continue;
      const x = card.keywordValue ?? 0;
      const poisoned = newBoard[lane][enemySide].filter((c) => (c.debuffTaken ?? 0) > 0);
      if (x > 0 && poisoned.length > 0) {
        // Más veneno acumulado; empate → el más débil (remátalo antes)
        let target = poisoned[0];
        for (const c of poisoned) {
          if (
            (c.debuffTaken ?? 0) > (target.debuffTaken ?? 0) ||
            ((c.debuffTaken ?? 0) === (target.debuffTaken ?? 0) && c.currentPower < target.currentPower)
          ) {
            target = c;
          }
        }
        const res = applyDebuff(
          newBoard,
          enemySide,
          lane,
          target.uid,
          -x,
          `${card.name} (Contagio)`,
          "end_turn"
        );
        const blockedNote = res.absorbedByShield > 0 && res.appliedDelta === 0 ? " (BLOQUEADO por escudo)" : "";
        logs.push({ side, text: `🧪 ${card.name} (Contagio): ${res.appliedDelta} a ${target.name}${blockedNote}` });
        if (res.appliedDelta < 0 || res.absorbedByShield > 0) {
          fx.push({ kind: "keyword", keyword: "contagio", lane, side: enemySide, targetUids: [target.uid], value: x });
          if (res.absorbedByShield > 0) {
            fx.push({ kind: "shieldBlock", lane, side: enemySide, targetUids: [target.uid], value: res.absorbedByShield });
          }
        }
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
      }
    }
  }

  return result;
}

function enemySideOf(side: "player" | "enemy"): "player" | "enemy" {
  return side === "player" ? "enemy" : "player";
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
  deadCard: BoardCard
): TriggerResult {
  const newBoard = cloneBoard(board);
  const result = triggerResult(newBoard);
  const { logs, fx } = result;

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
    }
  }

  // ---- COMBUSTIÓN [X]: al morir, −2X al enemigo más fuerte (ignora escudos) ----
  if (deadCard.keyword === "combustion" && x > 0) {
    const target = highestPowerCard(newBoard[lane][enemySideOf(side)]);
    if (target) {
      // Mutación directa: la explosión no pasa por applyDebuff → perfora escudos
      applyPowerDelta(newBoard, enemySideOf(side), lane, target.uid, -2 * x, `${deadCard.name} (Combustión)`, "on_death");
      logs.push({ side, text: `🔥 ${deadCard.name} (Combustión): −${2 * x} a ${target.name} (explota, perfora escudos)` });
      fx.push({ kind: "keyword", keyword: "combustion", lane, side: enemySideOf(side), sourceUid: deadCard.uid, targetUids: [target.uid], value: 2 * x });
    }
  }

  return result;
}
