import type {
  BoardCard,
  CardDef,
  EffectId,
  FinalResult,
  HandCard,
  LaneBonus,
  LaneBonuses,
  LaneId,
  LaneOutcome,
  LaneState,
} from "./types";
import { LANE_BONUS_POOL } from "./types";
import { v4 as uuidv4 } from "uuid";

export type Board = Record<LaneId, LaneState>;

export const LANE_IDS: LaneId[] = ["armas", "proteccion", "furia"];

export const MAX_TURNS = 6;
export const MAX_HAND_SIZE = 7;
export const MAX_LANE_CARDS = 4;
export const STARTING_HAND_SIZE = 5;

// ---------------------------------------------------------------------------
// Trap state (for Trampa Etérea effect)
// ---------------------------------------------------------------------------

export interface TrapState {
  owner: "player" | "enemy";
  value: number;
}

export type LaneTraps = Record<LaneId, TrapState | null>;

export function emptyLaneTraps(): LaneTraps {
  return { armas: null, proteccion: null, furia: null };
}

// ---------------------------------------------------------------------------
// Per-game lane bonuses: 2 random lanes get a bonus (no repeats), 1 has none
// ---------------------------------------------------------------------------

export function rollLaneBonuses(): LaneBonuses {
  // Pick 2 random lanes (no repeats)
  const lanes = [...LANE_IDS];
  for (let i = lanes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [lanes[i], lanes[j]] = [lanes[j], lanes[i]];
  }
  const chosenLanes = lanes.slice(0, 2);
  const remainingLane = lanes[2];

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

/**
 * Final energy cost of a card after lane bonus adjustments AND any card-specific
 * cost modifiers (e.g. Sobrecarga reduces cost by 1, min 1).
 */
export function getFinalCost(
  baseCost: number,
  bonus: LaneBonus | null,
  effectId: EffectId
): number {
  let cost = getEffectiveCost(baseCost, bonus);
  if (effectId === "sobrecarga") {
    cost = Math.max(1, cost - 1);
  }
  return cost;
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

// ---------------------------------------------------------------------------
// Card effect computation
// ---------------------------------------------------------------------------

interface EffectContext {
  board: Board;
  side: "player" | "enemy";
  lane: LaneId;
  card: CardDef; // card being played
  handBonus: number; // bonus from in-hand effects (e.g. Grito de Batalla)
  hand: HandCard[]; // remaining hand (for effects that touch hand)
  laneBonus: LaneBonus | null; // per-game bonus assigned to this lane
}

interface BoardMutation {
  side: "player" | "enemy";
  lane: LaneId;
  uid: string;
  powerDelta: number;
}

interface HandMutation {
  uid: string;
  powerDelta: number;
}

interface RemovedCard {
  side: "player" | "enemy";
  lane: LaneId;
  uid: string;
  reason: string;
}

interface MovedCard {
  side: "player" | "enemy";
  fromLane: LaneId;
  toLane: LaneId;
  uid: string;
}

interface EffectResult {
  /** Final power for the new card after all static bonuses and self-effects */
  finalPower: number;
  /** Optional list of mutations to apply to the board (buffs, debuffs) */
  mutations: BoardMutation[];
  /** Optional list of mutations to apply to remaining hand cards */
  handMutations: HandMutation[];
  /** Optional list of cards to remove from the board (destroyed/sacrificed) */
  removedCards: RemovedCard[];
  /** Optional list of cards to move between lanes */
  movedCards: MovedCard[];
  /** Optional trap set in this lane (e.g. Trampa Etérea) */
  newTrap?: TrapState;
  /** Optional energy delta to apply on the player's NEXT turn (e.g. Sobrecarga) */
  energyNextTurnDelta?: number;
}

/**
 * Accumulator object used by `applyEffectLogic` so that recursive calls
 * (e.g. Mimetismo copying another effect) can mutate the same result set.
 */
interface EffectAccumulator {
  bonusPower: number;
  mutations: BoardMutation[];
  handMutations: HandMutation[];
  removedCards: RemovedCard[];
  movedCards: MovedCard[];
  newTrap?: TrapState;
  energyNextTurnDelta?: number;
}

function newAccumulator(): EffectAccumulator {
  return {
    bonusPower: 0,
    mutations: [],
    handMutations: [],
    removedCards: [],
    movedCards: [],
  };
}

/**
 * Apply an effect's conditional logic to the accumulator. Extracted from
 * `computeEffect` so that Mimetismo can recursively call this with another
 * effectId (the strongest ally's effect) using the SAME accumulator.
 *
 * NOTE: `finalPower` is computed from base + subtype + laneBonus OUTSIDE this
 * function (in `computeEffect`). This function only adjusts the accumulator's
 * `bonusPower` field for self-buffs.
 */
function applyEffectLogic(
  effectId: EffectId,
  ctx: EffectContext,
  allyLane: BoardCard[],
  enemyLane: BoardCard[],
  enemySide: "player" | "enemy",
  accum: EffectAccumulator
): void {
  const { board, side, lane } = ctx;

  switch (effectId) {
    // ----- existing 12 base effects (preserved verbatim) -----
    case "golpe_heroico": {
      // +4 to your OTHER cards in this lane (does NOT include the new card itself)
      for (const c of allyLane) {
        accum.mutations.push({ side, lane, uid: c.uid, powerDelta: 4 });
      }
      break;
    }
    case "seccionar": {
      // -2 to the highest-power enemy card in this lane
      const target = highestPowerCard(enemyLane);
      if (target) {
        accum.mutations.push({ side: enemySide, lane, uid: target.uid, powerDelta: -2 });
      }
      break;
    }
    case "machaque_mortal": {
      // +2 for each Attack card already in this lane (allies only)
      const atkCount = allyLane.filter((c) => c.category === "Ataque").length;
      accum.bonusPower += atkCount * 2;
      break;
    }
    case "ejecutar": {
      // +5 if enemy total in this lane > 20
      const enemyTotal = calcLanePower(enemyLane);
      if (enemyTotal > 20) accum.bonusPower += 5;
      break;
    }
    case "bloqueo_escudo": {
      // -3 to the highest-power enemy card in this lane
      const target = highestPowerCard(enemyLane);
      if (target) {
        accum.mutations.push({ side: enemySide, lane, uid: target.uid, powerDelta: -3 });
      }
      break;
    }
    case "muro_escudos": {
      // +3 to your other Item cards in this lane
      for (const c of allyLane) {
        if (c.category === "Ítem") {
          accum.mutations.push({ side, lane, uid: c.uid, powerDelta: 3 });
        }
      }
      break;
    }
    case "pocion_vida": {
      // +2 for each Item card already in this lane (allies only)
      const itemCount = allyLane.filter((c) => c.category === "Ítem").length;
      accum.bonusPower += itemCount * 2;
      break;
    }
    case "provocar": {
      // +3 if any ally card in this lane has subtype "proteccion"
      const hasProt = allyLane.some((c) => c.subtypes.includes("proteccion"));
      if (hasProt) accum.bonusPower += 3;
      break;
    }
    case "ira_rabiosa": {
      // +3 if any ally card in this lane has subtype "furia"
      const hasFury = allyLane.some((c) => c.subtypes.includes("furia"));
      if (hasFury) accum.bonusPower += 3;
      break;
    }
    case "grito_batalla": {
      // +2 to OTHER cards in hand with subtype "furia"
      for (const hc of ctx.hand) {
        if (hc.uid === (ctx.card as HandCard & { uid?: string })?.uid) continue;
        if (hc.subtypes.includes("furia")) {
          accum.handMutations.push({ uid: hc.uid, powerDelta: 2 });
        }
      }
      break;
    }
    case "filotormenta": {
      // -1 to enemy cards on the board, capped at the first 6 cards found.
      let debuffed = 0;
      for (const ln of LANE_IDS) {
        for (const c of board[ln][enemySide]) {
          if (debuffed >= 6) break;
          accum.mutations.push({ side: enemySide, lane: ln, uid: c.uid, powerDelta: -1 });
          debuffed++;
        }
        if (debuffed >= 6) break;
      }
      break;
    }
    case "avatar_titan": {
      // +1 for each card on the board (both sides, all lanes), capped at +10.
      const total = LANE_IDS.reduce(
        (acc, ln) => acc + board[ln].player.length + board[ln].enemy.length,
        0
      );
      accum.bonusPower += Math.min(10, total);
      break;
    }

    // ----- 12 new epic effects -----

    case "herida_letal": {
      // -3 to strongest enemy; if reaches 0, remove it.
      const target = highestPowerCard(enemyLane);
      if (target) {
        accum.mutations.push({ side: enemySide, lane, uid: target.uid, powerDelta: -3 });
        if (target.currentPower - 3 <= 0) {
          accum.removedCards.push({
            side: enemySide,
            lane,
            uid: target.uid,
            reason: "herida_letal",
          });
        }
      }
      break;
    }

    case "carga_devastadora": {
      // Double weakest ally's power (mutation += currentPower, so final = 2x).
      const target = lowestPowerCard(allyLane);
      if (target) {
        accum.mutations.push({ side, lane, uid: target.uid, powerDelta: target.currentPower });
      }
      break;
    }

    case "asalto_coordinado": {
      // +1 per ally in OTHER lanes
      let count = 0;
      for (const ln of LANE_IDS) {
        if (ln === lane) continue;
        count += board[ln][side].length;
      }
      accum.bonusPower += count;
      break;
    }

    case "burla_sadica": {
      // +4 if enemy power > ally power in this lane
      const enemyTotal = calcLanePower(enemyLane);
      const allyTotal = calcLanePower(allyLane);
      if (enemyTotal > allyTotal) accum.bonusPower += 4;
      break;
    }

    case "sobrecarga": {
      // Cost reduction handled in playCard; here we record the energy penalty
      // that will be applied on the next turn of the side that played this.
      accum.energyNextTurnDelta = -1;
      break;
    }

    case "purificacion": {
      // Sacrifice weakest ally; bonusPower += its currentPower + 3
      const target = lowestPowerCard(allyLane);
      if (target) {
        accum.removedCards.push({
          side,
          lane,
          uid: target.uid,
          reason: "purificacion",
        });
        accum.bonusPower += target.currentPower + 3;
      }
      break;
    }

    case "tormenta_rayos": {
      // -2 to ALL enemy cards on the board (max 4 cards)
      let debuffed = 0;
      for (const ln of LANE_IDS) {
        for (const c of board[ln][enemySide]) {
          if (debuffed >= 4) break;
          accum.mutations.push({ side: enemySide, lane: ln, uid: c.uid, powerDelta: -2 });
          debuffed++;
        }
        if (debuffed >= 4) break;
      }
      break;
    }

    case "trampa_eterea": {
      // Set a trap on this lane (owned by the side that played it).
      accum.newTrap = { owner: side, value: 3 };
      break;
    }

    case "reflejo_arcano": {
      // bonusPower += strongest enemy's currentPower
      const target = highestPowerCard(enemyLane);
      if (target) accum.bonusPower += target.currentPower;
      break;
    }

    case "venganza": {
      // +6 if (enemy power - ally power) > 5
      const enemyTotal = calcLanePower(enemyLane);
      const allyTotal = calcLanePower(allyLane);
      if (enemyTotal - allyTotal > 5) accum.bonusPower += 6;
      break;
    }

    case "mimetismo": {
      // Find strongest ally; if its effectId is not mimetismo or none,
      // recursively apply that effect using the SAME accumulator.
      const target = highestPowerCard(allyLane);
      if (
        target &&
        target.effectId !== "mimetismo" &&
        target.effectId !== "none"
      ) {
        applyEffectLogic(
          target.effectId,
          ctx,
          allyLane,
          enemyLane,
          enemySide,
          accum
        );
      }
      break;
    }

    case "empuje_tactico": {
      // Find weakest ally in OTHER lanes; move it to this lane (only if there
      // is room).
      const currentMax = getLaneMaxCards(ctx.laneBonus);
      if (allyLane.length >= currentMax) break;
      let weakest: BoardCard | null = null;
      let fromLane: LaneId | null = null;
      for (const ln of LANE_IDS) {
        if (ln === lane) continue;
        for (const c of board[ln][side]) {
          if (!weakest || c.currentPower < weakest.currentPower) {
            weakest = c;
            fromLane = ln;
          }
        }
      }
      if (weakest && fromLane) {
        accum.movedCards.push({
          side,
          fromLane,
          toLane: lane,
          uid: weakest.uid,
        });
      }
      break;
    }

    // ----- 3 new legendary effects -----

    case "colera_titan": {
      // Remove ALL enemy cards in this lane.
      for (const c of enemyLane) {
        accum.removedCards.push({
          side: enemySide,
          lane,
          uid: c.uid,
          reason: "colera_titan",
        });
      }
      break;
    }

    case "despertar_bélico": {
      // +3 to ALL cards in hand.
      for (const hc of ctx.hand) {
        if (hc.uid === (ctx.card as HandCard & { uid?: string })?.uid) continue;
        accum.handMutations.push({ uid: hc.uid, powerDelta: 3 });
      }
      break;
    }

    case "trono_hierro": {
      // +3 to ALL ally cards on board (all lanes).
      for (const ln of LANE_IDS) {
        for (const c of board[ln][side]) {
          accum.mutations.push({ side, lane: ln, uid: c.uid, powerDelta: 3 });
        }
      }
      break;
    }

    case "none":
    default:
      break;
  }
}

/**
 * Compute the final power of a card being played into `lane`, including:
 *   - in-hand bonus (e.g. Grito de Batalla)
 *   - subtype synergy (+2)
 *   - per-game lane bonus (+3 to matching category, if any)
 *   - the card's own conditional effect (effectId)
 *
 * Also returns any side-effect mutations (debuffs to enemy, buffs to allies,
 * hand buffs for Grito de Batalla, removed/moved cards, traps, energy deltas).
 */
export function computeEffect(ctx: EffectContext): EffectResult {
  const { card, handBonus, lane, laneBonus } = ctx;

  let finalPower = card.power + handBonus;

  // 1. Subtype synergy: +2 if card has the lane as a subtype
  if (card.subtypes.includes(lane)) finalPower += 2;

  // 2. Per-game lane bonus: +3 if category matches the bonus's category
  finalPower += getLaneBonusPower(card.category, laneBonus);

  const allyLane = ctx.board[lane][ctx.side];
  const enemySide: "player" | "enemy" = ctx.side === "player" ? "enemy" : "player";
  const enemyLane = ctx.board[lane][enemySide];

  // 3. Effect-specific logic (extracted to helper for recursion support)
  const accum = newAccumulator();
  applyEffectLogic(card.effectId, ctx, allyLane, enemyLane, enemySide, accum);

  finalPower += accum.bonusPower;

  return {
    finalPower,
    mutations: accum.mutations,
    handMutations: accum.handMutations,
    removedCards: accum.removedCards,
    movedCards: accum.movedCards,
    newTrap: accum.newTrap,
    energyNextTurnDelta: accum.energyNextTurnDelta,
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
  movedCards: MovedCard[];
  trapTriggered: boolean;
  newTrap?: TrapState;
  energyNextTurnDelta?: number;
}

/**
 * Immutably play a card from the hand into a lane. Returns a new board+hand+energy.
 * Throws if invalid (not enough energy, lane full, cost-restricted, etc.).
 *
 * Honors the per-game lane bonus AND any active trap on the lane:
 *   - cost_neg: card cost -1 (min 1) for energy check
 *   - cost_pos: card cost +1 for energy check
 *   - limit_1 / limit_3: max cards per side = 1 or 3 instead of 4
 *   - cost_only_X: only cards with cost exactly X are allowed
 *   - activeTrap (if owner != side): reduces finalPower by trap.value, trap is consumed
 *
 * Also honors Sobrecarga's cost reduction (-1, min 1) and records the next-turn
 * energy penalty via `energyNextTurnDelta`.
 */
export function playCard(
  board: Board,
  hand: HandCard[],
  energy: number,
  side: "player" | "enemy",
  lane: LaneId,
  handCard: HandCard,
  laneBonus: LaneBonus | null,
  activeTrap: TrapState | null
): PlayResult {
  // 1. Cost restriction (solo coste X)
  if (!isCardCostAllowed(handCard.cost, laneBonus)) {
    throw new Error(
      `Esta carta no se puede jugar en ${lane}: el bono requiere coste exacto.`
    );
  }

  // 2. Effective cost — combine lane bonus + Sobrecarga card-specific discount
  const effectiveCost = getFinalCost(handCard.cost, laneBonus, handCard.effectId);
  if (effectiveCost > energy) {
    throw new Error(
      `Sin energía suficiente (necesita ${effectiveCost}, tiene ${energy})` +
        (laneBonus?.kind === "cost_neg" || laneBonus?.kind === "cost_pos"
          ? ` (ajustado por bono del carril)`
          : "") +
        (handCard.effectId === "sobrecarga" ? ` (Sobrecarga: -1)` : "")
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
  });

  // 3.5. Trap: if active trap exists and is owned by the opposing side, it
  // triggers and reduces the new card's final power.
  let finalPower = effect.finalPower;
  let trapTriggered = false;
  if (activeTrap && activeTrap.owner !== side) {
    finalPower = Math.max(0, finalPower - activeTrap.value);
    trapTriggered = true;
  }

  // Build a NEW board with mutations applied
  const newBoard: Board = {
    armas: {
      player: [...board.armas.player],
      enemy: [...board.armas.enemy],
    },
    proteccion: {
      player: [...board.proteccion.player],
      enemy: [...board.proteccion.enemy],
    },
    furia: {
      player: [...board.furia.player],
      enemy: [...board.furia.enemy],
    },
  };

  for (const m of effect.mutations) {
    const arr = newBoard[m.lane][m.side];
    const idx = arr.findIndex((c) => c.uid === m.uid);
    if (idx >= 0) {
      arr[idx] = {
        ...arr[idx],
        currentPower: Math.max(0, arr[idx].currentPower + m.powerDelta),
      };
    }
  }

  // Apply removedCards (filter out from board) — happens AFTER mutations so
  // that herida_letal's -3 is applied before removal (the card simply dies).
  if (effect.removedCards.length > 0) {
    for (const rc of effect.removedCards) {
      const arr = newBoard[rc.lane][rc.side];
      newBoard[rc.lane][rc.side] = arr.filter((c) => c.uid !== rc.uid);
    }
  }

  // Apply movedCards (move between lanes) — happens AFTER mutations and
  // removals so we move the post-mutation card. We only move if the target
  // lane has room (it might already be at max capacity from earlier moves).
  if (effect.movedCards.length > 0) {
    for (const mc of effect.movedCards) {
      const src = newBoard[mc.fromLane][mc.side];
      const idx = src.findIndex((c) => c.uid === mc.uid);
      if (idx < 0) continue;
      const tgtArr = newBoard[mc.toLane][mc.side];
      if (tgtArr.length >= getLaneMaxCards(laneBonus)) continue;
      const [moved] = src.splice(idx, 1);
      newBoard[mc.toLane][mc.side] = [...tgtArr, moved];
    }
  }

  // Place the new card
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
  };
  newBoard[lane][side] = [...newBoard[lane][side], newCard];

  // Build a NEW hand (without the played card) and apply hand mutations
  const newHand: HandCard[] = hand
    .filter((c) => c.uid !== handCard.uid)
    .map((c) => {
      const hm = effect.handMutations.find((m) => m.uid === c.uid);
      if (hm) {
        return { ...c, handBonus: c.handBonus + hm.powerDelta };
      }
      return { ...c };
    });

  return {
    board: newBoard,
    hand: newHand,
    remainingEnergy: energy - effectiveCost,
    playedCard: newCard,
    mutations: effect.mutations,
    removedCards: effect.removedCards,
    movedCards: effect.movedCards,
    trapTriggered,
    newTrap: effect.newTrap,
    energyNextTurnDelta: effect.energyNextTurnDelta,
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
 *  - Strongly prefer lanes where AI is losing or tied (priority targets)
 *  - Reward turning a loss into a win
 *  - Reward synergy and field bonus already factored into finalPower
 *  - Penalize playing in already-won lanes (waste of resources)
 *  - Slight preference for cheaper cards when energy is low
 *
 * Also honors the active trap on the lane (the AI will simulate the trap
 * reducing the played card's power, which factors into the score).
 */
export function scoreAIPlay(
  board: Board,
  hand: HandCard[],
  energy: number,
  card: HandCard,
  lane: LaneId,
  laneBonus: LaneBonus | null,
  activeTrap: TrapState | null
): number {
  // Respect lane bonus restrictions: cost_only_X filter
  if (!isCardCostAllowed(card.cost, laneBonus)) return -Infinity;

  const effectiveCost = getFinalCost(card.cost, laneBonus, card.effectId);
  if (effectiveCost > energy) return -Infinity;

  const maxCards = getLaneMaxCards(laneBonus);
  if (board[lane].enemy.length >= maxCards) return -Infinity;

  const allySide: "player" | "enemy" = "player";

  const currentEnemyPower = calcLanePower(board[lane].enemy);
  const currentPlayerPower = calcLanePower(board[lane].player);

  // Simulate the play (passing activeTrap so trap reduction is included)
  let sim;
  try {
    sim = playCard(board, hand, energy, "enemy", lane, card, laneBonus, activeTrap);
  } catch {
    return -Infinity;
  }

  const newEnemyPower = calcLanePower(sim.board[lane].enemy);
  const gain = newEnemyPower - currentEnemyPower;
  const newMargin = newEnemyPower - currentPlayerPower;
  const oldMargin = currentEnemyPower - currentPlayerPower;

  let score = 0;

  // 1. Always reward the power gain itself
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

  // 5. Subtype synergy bonus is already in `gain` but add a small explicit bonus
  if (card.subtypes.includes(lane)) score += 5;

  // 6. Per-game lane category bonus (if matching): small explicit bonus
  if (getLaneBonusPower(card.category, laneBonus) > 0) score += 5;

  // 7. Slight preference for spending closer to (but not exceeding) energy budget
  const efficiency = effectiveCost / Math.max(1, energy);
  if (efficiency > 0.5 && efficiency <= 1.0) score += 4;

  // 8. Special: Filotormenta (board-wide debuff) is valuable when player has many cards
  if (card.effectId === "filotormenta") {
    const playerTotalCards = LANE_IDS.reduce(
      (acc, ln) => acc + board[ln].player.length,
      0
    );
    score += playerTotalCards * 3;
  }

  // 9. Special: Avatar Titán is strong late-game (many cards on board)
  if (card.effectId === "avatar_titan") {
    const total = LANE_IDS.reduce(
      (acc, ln) => acc + board[ln].player.length + board[ln].enemy.length,
      0
    );
    score += total * 2;
  }

  // 10. Special: Tormenta de Rayos and Colera del Titán scale with player board size
  if (card.effectId === "tormenta_rayos") {
    const playerTotalCards = LANE_IDS.reduce(
      (acc, ln) => acc + board[ln].player.length,
      0
    );
    score += Math.min(4, playerTotalCards) * 4;
  }
  if (card.effectId === "colera_titan") {
    score += board[lane].player.length * 8;
  }

  // 11. Special: Trono de Hierro and Despertar Bélico scale with own board / hand
  if (card.effectId === "trono_hierro") {
    const ownCards = LANE_IDS.reduce((acc, ln) => acc + board[ln].enemy.length, 0);
    score += ownCards * 3;
  }
  if (card.effectId === "despertar_bélico") {
    score += hand.length * 3;
  }

  // 12. Mutations that debuff player are worth more
  const debuffValue = sim.mutations
    .filter((m) => m.side === allySide && m.powerDelta < 0)
    .reduce((acc, m) => acc + Math.abs(m.powerDelta), 0);
  score += debuffValue * 2;

  // 13. Removed player cards are very valuable (board destruction)
  score += sim.removedCards.filter((rc) => rc.side === allySide).length * 10;

  // 14. Avoid playing into a player-owned trap if it would kill the card
  if (sim.trapTriggered && sim.playedCard.currentPower <= 0) {
    score -= 30;
  }

  return score;
}

/**
 * Decide the AI's plays for this turn. Returns an ordered list of plays
 * (the AI may play multiple cards in one turn if it has enough energy).
 *
 * Strategy:
 *  - Find the best (card, lane) pair across all candidates
 *  - Play it, subtract energy, repeat
 *  - Stop when: no candidate scores > threshold, or energy < 1, or hand empty
 *
 * Honors per-lane traps: when the AI plays in a lane with a trap owned by the
 * player, the trap is consumed (cleared) and reduces the AI's card power.
 * When the AI itself plays Trampa Etérea, it sets a new trap on that lane.
 */
export function planEnemyTurn(
  board: Board,
  hand: HandCard[],
  energy: number,
  laneBonuses: LaneBonuses,
  laneTraps: LaneTraps
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
      for (const lane of LANE_IDS) {
        const laneBonus = laneBonuses[lane];
        // Quick filter before scoring
        if (!isCardCostAllowed(card.cost, laneBonus)) continue;
        const effectiveCost = getFinalCost(card.cost, laneBonus, card.effectId);
        if (effectiveCost > workEnergy) continue;
        if (workBoard[lane].enemy.length >= getLaneMaxCards(laneBonus)) continue;
        const s = scoreAIPlay(
          workBoard,
          workHand,
          workEnergy,
          card,
          lane,
          laneBonus,
          workTraps[lane]
        );
        if (!best || s > best.score) {
          best = { card, lane, score: s };
        }
      }
    }

    // Only play if the score is positive (worth doing)
    if (!best || best.score <= 0) break;

    // Apply the play to the working state
    try {
      const res = playCard(
        workBoard,
        workHand,
        workEnergy,
        "enemy",
        best.lane,
        best.card,
        laneBonuses[best.lane],
        workTraps[best.lane]
      );
      workBoard = res.board;
      workHand = res.hand;
      workEnergy = res.remainingEnergy;

      // Update traps: if trap was triggered, consume it; if a new trap was
      // set by the play, install it (overriding any prior trap on that lane).
      if (res.trapTriggered) {
        workTraps = { ...workTraps, [best.lane]: null };
      }
      if (res.newTrap) {
        workTraps = { ...workTraps, [best.lane]: res.newTrap };
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

export function computeFinalResult(board: Board): FinalResult {
  let playerWins = 0;
  let enemyWins = 0;
  let draws = 0;
  let totalPlayer = 0;
  let totalEnemy = 0;
  const laneOutcomes: LaneOutcome[] = [];

  for (const lane of LANE_IDS) {
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
  switch (effectId) {
    case "golpe_heroico":
      return "Potencia aliada";
    case "seccionar":
      return "Debilitar enemigo";
    case "machaque_mortal":
      return "Sinergia de Ataque";
    case "ejecutar":
      return "Ejecución";
    case "bloqueo_escudo":
      return "Bloqueo mayor";
    case "muro_escudos":
      return "Muro de Ítems";
    case "pocion_vida":
      return "Sinergia de Ítem";
    case "provocar":
      return "Provocación";
    case "ira_rabiosa":
      return "Ira";
    case "grito_batalla":
      return "Grito de Batalla";
    case "filotormenta":
      return "Tormenta de Filos";
    case "avatar_titan":
      return "Avatar del Titán";
    // --- 12 epic effects ---
    case "herida_letal":
      return "Herida Letal";
    case "carga_devastadora":
      return "Carga Devastadora";
    case "asalto_coordinado":
      return "Asalto Coordinado";
    case "burla_sadica":
      return "Burla Sádica";
    case "sobrecarga":
      return "Sobrecarga";
    case "purificacion":
      return "Purificación";
    case "tormenta_rayos":
      return "Tormenta de Rayos";
    case "trampa_eterea":
      return "Trampa Etérea";
    case "reflejo_arcano":
      return "Reflejo Arcano";
    case "venganza":
      return "Venganza";
    case "mimetismo":
      return "Mimetismo";
    case "empuje_tactico":
      return "Empuje Táctico";
    // --- 3 legendary effects ---
    case "colera_titan":
      return "Cólera del Titán";
    case "despertar_bélico":
      return "Despertar Bélico";
    case "trono_hierro":
      return "Trono de Hierro";
    default:
      return "—";
  }
}
