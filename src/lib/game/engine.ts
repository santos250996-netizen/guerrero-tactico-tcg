import type {
  BoardCard,
  CardCategory,
  CardDef,
  EffectId,
  FinalResult,
  HandCard,
  LaneBonus,
  LaneBonuses,
  LaneId,
  LaneOutcome,
  LaneState,
  PowerLogEntry,
  Subtype,
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
  effectId: EffectId,
  keywordValue?: number,
): number {
  let cost = getEffectiveCost(baseCost, bonus);
  if (effectId === "sobrecarga") {
    const x = keywordValue ?? 1;
    cost = Math.max(1, cost - x);
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
  const { board, side, lane, card, hand } = ctx;

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
      // Cost reduction handled in getFinalCost (uses keywordValue); here we record
      // the energy penalty that will be applied on the next turn of the side that
      // played this. The penalty is -X (the keywordValue), not -1.
      const x = card.keywordValue ?? 1;
      accum.energyNextTurnDelta = -x;
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

    // ----- 19 new keyword effects -----
    // These re-implement the 25 official keywords with their own effectId so
    // they can have keyword-specific logic (vs. re-using existing effects).
    // The `keyword` field on CardDef drives UI display; the `effectId` here
    // drives the actual effect behavior.

    case "sacrificio_keyword": {
      // 10 Sacrificio [X]: destroy ally with Ofrenda flag OR with the LOWEST COST,
      // gain +X self bonus. (Spec 2026-10 amendment: target by lowest COST, not lowest power.)
      const x = (ctx.card as CardDef & { keywordValue?: number }).keywordValue ?? 3;
      // Priority 1: ally with isOfrenda=true (regardless of cost)
      let target = allyLane.find((c) => c.isOfrenda);
      // Priority 2: ally with the LOWEST COST (fall back if no Ofrenda ally)
      if (!target) {
        // Find the lowest-cost ally (excluding the sacrificed card itself, which is `ctx.card`).
        // If multiple allies share the lowest cost, pick the first one.
        let lowestCost = Infinity;
        for (const c of allyLane) {
          if (c.cost < lowestCost) {
            lowestCost = c.cost;
            target = c;
          }
        }
      }
      if (target) {
        // ====== OFRENDA TRIGGER: fire the sacrificed card's keyword effects ======
        // When a card with trigger="ofrenda" is SACRIFICED (not destroyed), its
        // keyword effects fire before it's removed. E.g. a card with trigger=ofrenda
        // + keyword=celeridad would reduce a random hand card's cost when sacrificed.
        if (target.trigger === "ofrenda") {
          fireKeywordEffects(ctx.board, side, lane, target, ctx.hand, []);
        }
        accum.removedCards.push({ side, lane, uid: target.uid, reason: "sacrificio" });
        // Bonus is +X (the keyword value), per spec — NOT +X*2 (legacy double-bonus).
        // The +X*2 was overcompensating and made auto-balance impossible.
        accum.bonusPower += x;
      }
      break;
    }

    case "remate_keyword": {
      // 02 Remate [X]: destroy enemy card if power ≤ X
      const x = (ctx.card as CardDef & { keywordValue?: number }).keywordValue ?? 5;
      const target = enemyLane.find((c) => c.currentPower <= x);
      if (target) {
        accum.removedCards.push({ side: enemySide, lane, uid: target.uid, reason: "remate" });
      }
      break;
    }

    case "celeridad": {
      // 03 Celeridad: -1 cost to next card this turn (engine records a flag;
      // gameStore applies the discount on the next play).
      // We model this as a positive energyNextTurnDelta for the same turn
      // (handled by gameStore when reading this card's effectId).
      // For now, just give +0 bonus (the cost reduction is handled elsewhere).
      break;
    }

    case "eco": {
      // 06 Eco [X]: +X to all hand cards sharing subtype OR category
      const x = (ctx.card as CardDef & { keywordValue?: number }).keywordValue ?? 2;
      for (const hc of ctx.hand) {
        const sharesSubtype = hc.subtypes.some((s) => ctx.card.subtypes.includes(s));
        const sharesCategory = hc.category === ctx.card.category;
        if (sharesSubtype || sharesCategory) {
          accum.handMutations.push({ uid: hc.uid, powerDelta: x });
        }
      }
      break;
    }

    case "refuerzo": {
      // 07 Refuerzo [X]: +X to ally card played immediately before (last in lane)
      const x = (ctx.card as CardDef & { keywordValue?: number }).keywordValue ?? 3;
      if (allyLane.length > 0) {
        const lastAlly = allyLane[allyLane.length - 1];
        accum.mutations.push({ side, lane, uid: lastAlly.uid, powerDelta: x });
      }
      break;
    }

    case "ventaja": {
      // 17 Ventaja [X]: +X si tu poder total EN ESTE CARRIL es menor que el del rival en este carril.
      // (Spec 2026-10 amendment: per-LANE power check, not global.)
      // NOTE: this check runs at ON_PLAY time. For passive ventaja (e.g. Grito de
      // Desafío with trigger=passive), the bonus is baked in at play time and does
      // NOT recompute if lane power changes later. To support dynamic recompute,
      // applyPassiveEffects would need to be called after each board mutation and
      // re-evaluate the condition — left as future work.
      const x = (ctx.card as CardDef & { keywordValue?: number }).keywordValue ?? 4;
      const allyTotal = calcLanePower(allyLane);
      const enemyTotal = calcLanePower(enemyLane);
      if (allyTotal < enemyTotal) accum.bonusPower += x;
      break;
    }

    case "vanguardia": {
      // 09 Vanguardia [X]: +X si es la primera carta en tu lado de este carril.
      const x = (ctx.card as CardDef & { keywordValue?: number }).keywordValue ?? 3;
      if (allyLane.length === 0) accum.bonusPower += x;
      break;
    }

    case "aislado": {
      // 10 Aislado [X]: +X while only ally in lane (i.e., no allies yet → will be first)
      const x = (ctx.card as CardDef & { keywordValue?: number }).keywordValue ?? 5;
      if (allyLane.length === 0) accum.bonusPower += x;
      break;
    }

    case "ultimo_aliento": {
      // 13 Último Aliento [X]: (On Death) transfer +X to ally.
      // On-play: no-op. The actual logic fires in applyOnDeathEffects when
      // the card is destroyed.
      break;
    }

    case "baluarte": {
      // 14 Baluarte: (Passive) allies here can't be debuffed.
      // On-play: no-op. Passive dispatch in applyPassiveEffects handles this.
      break;
    }

    case "sigilo": {
      // 15 Sigilo: first turn on board, immune to direct enemy effects.
      // On-play: mark self with sigiloActive=true (BoardCard.sigiloActive field).
      // gameStore clears sigiloActive at start of the owner's NEXT turn.
      // (Self-marker is set on the new card after computeEffect returns.)
      break;
    }

    case "vinculo": {
      // 16 Vínculo [X]: (Passive) if another same-category card here, both +X
      const x = (ctx.card as CardDef & { keywordValue?: number }).keywordValue ?? 2;
      const sameCategoryAlly = allyLane.find((c) => c.category === ctx.card.category);
      if (sameCategoryAlly) {
        accum.mutations.push({ side, lane, uid: sameCategoryAlly.uid, powerDelta: x });
        accum.bonusPower += x;
      }
      break;
    }

    case "muro_keyword": {
      // 17 Muro [X]: (Passive) enemy must play here if not full.
      // On-play: no-op. The "must play here" enforcement would need to be
      // integrated into planEnemyTurn (which we don't do yet — the passive
      // marker just shows on the card; future work).
      break;
    }

    case "retorno": {
      // 18 Retorno [X] (spec 2026-10 amendment):
      //   - POWER-DROP trigger: si el poder de esta carta baja a ≤ X, retorna a la mano con coste 0.
      //   - DESTRUCTION trigger: si es destruida/sacrificada, retorna a la mano con coste 0.
      // Currently only the DESTRUCTION case is logged here (the actual hand insertion
      // is handled by gameStore — TODO). The POWER-DROP case requires a hook in
      // applyDebuff/applyPowerDelta to check after each mutation — left as future work.
      // On-play: no-op. applyOnDeathEffects dispatches the destruction case.
      break;
    }

    case "despertar": {
      // 19 Despertar [X]: (Umbral) when board power ≥ X, activate.
      // On-play: no-op. checkUmbralTriggers dispatches this.
      break;
    }

    case "reciclar": {
      // 20 Reciclar [X]: (On Death) recover X energy.
      // On-play: no-op. applyOnDeathEffects dispatches this.
      break;
    }

    case "doble_golpe": {
      // 21 Doble Golpe [X]: apply -X debuff to strongest enemy here AND in adjacent lane
      const x = (ctx.card as CardDef & { keywordValue?: number }).keywordValue ?? 2;
      const targetHere = highestPowerCard(enemyLane);
      if (targetHere) {
        accum.mutations.push({ side: enemySide, lane, uid: targetHere.uid, powerDelta: -x });
      }
      // Adjacent lane: pick the next lane (wrap around)
      const laneIdx = LANE_IDS.indexOf(lane);
      const adjacentLane = LANE_IDS[(laneIdx + 1) % LANE_IDS.length];
      const adjacentEnemy = highestPowerCard(board[adjacentLane][enemySide]);
      if (adjacentEnemy) {
        accum.mutations.push({ side: enemySide, lane: adjacentLane, uid: adjacentEnemy.uid, powerDelta: -x });
      }
      break;
    }

    case "refugio": {
      // 22 Refugio [X]: (Passive) absorb up to X debuff points to ally here.
      // On-play: no-op. Passive dispatch handles this (not yet implemented as
      // a damage-absorption mechanic — future work).
      break;
    }

    case "emboscada": {
      // 23 Emboscada [X]: +X if enemy lane is full (4 cards)
      const x = (ctx.card as CardDef & { keywordValue?: number }).keywordValue ?? 5;
      const maxCards = getLaneMaxCards(ctx.laneBonus);
      if (enemyLane.length >= maxCards) accum.bonusPower += x;
      break;
    }

    case "transferencia": {
      // 24 Transferencia [X]: -X to ally here, +X to ally in another lane
      const x = (ctx.card as CardDef & { keywordValue?: number }).keywordValue ?? 3;
      const weakestAlly = lowestPowerCard(allyLane);
      if (weakestAlly) {
        accum.mutations.push({ side, lane, uid: weakestAlly.uid, powerDelta: -x });
      }
      // Find ally in another lane (prefer weakest)
      let target2: BoardCard | null = null;
      let target2Lane: LaneId | null = null;
      for (const ln of LANE_IDS) {
        if (ln === lane) continue;
        for (const c of board[ln][side]) {
          if (!target2 || c.currentPower < target2.currentPower) {
            target2 = c;
            target2Lane = ln;
          }
        }
      }
      if (target2 && target2Lane) {
        accum.mutations.push({ side, lane: target2Lane, uid: target2.uid, powerDelta: x });
      }
      break;
    }

    case "renovacion": {
      // 25 Renovación [X]: (End Turn) discard 1 to draw X.
      // On-play: no-op. applyEndTurnEffects dispatches this.
      break;
    }

    case "none":
    default:
      break;
  }
  // ====== Keyword-driven effects are now handled by fireKeywordEffects() ======
  // Previously, Mejora/Desarme/Celeridad had inline checks here. They've been
  // moved to fireKeywordEffects() (called from playCard AFTER the card is placed
  // on the board) so that ANY keyword can fire with ANY trigger without duplication.
  // See the fireKeywordEffects function definition above applyStartTurnEffects.
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

  // 4. Etapa 3: Frenesí [X] — if the card has trigger=on_play AND keyword=frenesi,
  // it gains +X to its own power at play time (this is the "trigger fires" moment
  // for on_play cards). For other triggers (start_turn/end_turn/umbral), the
  // Frenesí bonus is applied by `triggerFrenesiIfApplicable` in the respective
  // dispatcher. We don't need to log here — the bonus is part of the card's
  // initial on-board power, so it shows up in the Registro as part of the base.
  if (
    card.keyword === "frenesi" &&
    card.keywordValue &&
    (card.trigger ?? "on_play") === "on_play"
  ) {
    finalPower += card.keywordValue;
  }

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
  const effectiveCost = getFinalCost(handCard.cost, laneBonus, handCard.effectId, handCard.keywordValue);
  if (effectiveCost > energy) {
    throw new Error(
      `Sin energía suficiente (necesita ${effectiveCost}, tiene ${energy})` +
        (laneBonus?.kind === "cost_neg" || laneBonus?.kind === "cost_pos"
          ? ` (ajustado por bono del carril)`
          : "") +
        (handCard.effectId === "sobrecarga" ? ` (Sobrecarga: -${handCard.keywordValue ?? 1})` : "")
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
  // Derive allyLane from the (possibly mutated) board so Refuerzo can mark
  // the last ally played before this card in the lane.
  const allyLane = newBoard[lane][side];
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
    // Carry over the trigger metadata so the engine can dispatch the right
    // hooks later (start_turn, end_turn, passive, on_death, umbral).
    trigger: handCard.trigger ?? "on_play",
    umbralCondition: handCard.umbralCondition,
    umbralTriggered: false,
    // Carry over keyword metadata for UI display + keyword-aware logic.
    keyword: handCard.keyword,
    keywordValue: handCard.keywordValue,
    // Sigilo: mark active for the first turn on the board (cleared at the
    // start of the owner's NEXT turn by gameStore).
    sigiloActive: handCard.effectId === "sigilo" || handCard.keyword === "sigilo",

    // ====== Etapa 2 fields — defensive / counter keywords (spec 2026-10) ======
    // Initialize the per-card state for the new keywords. The actual effect
    // logic is handled by `applyDebuff` (Cúpula/Guardián/Perforación/Espinas/
    // Enrabia) and `applyStartTurnEffects` (refresh cupulaRemaining each turn).
    cupulaRemaining: handCard.keyword === "cupula" ? (handCard.keywordValue ?? 0) : undefined,
    isGuardian: handCard.keyword === "guardian",
    perforacionRemaining: handCard.keyword === "perforacion" ? (handCard.keywordValue ?? 0) : undefined,
    enrabiadUsed: false,
    isOfrenda: handCard.trigger === "ofrenda",
    // Refuerzo: mark the last ally played in this lane (before this card) as the
    // target for future start_turn +X buffs. If no prior ally, leave undefined
    // (the card will have no one to buff until an ally is played after it — but
    // that's the spec: "otorga +X a la carta aliada jugada inmediatamente antes").
    refuerzoTargetUid: allyLane.length > 0 ? allyLane[allyLane.length - 1].uid : undefined,
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

  // ====== FIRE KEYWORD EFFECTS (on_play) ======
  // After the card is placed on the board AND the new hand is built,
  // fire the card's keyword effects via the generic dispatcher.
  // This works for ANY keyword — celeridad (picks from newHand), mejora
  // (targets weakest ally), ventaja (checks per-lane power), etc.
  fireKeywordEffects(newBoard, side, lane, newCard, newHand);

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

  const effectiveCost = getFinalCost(card.cost, laneBonus, card.effectId, card.keywordValue);
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

    // ====== MURO: check if the player has a Muro card on the board ======
    // If yes, the enemy MUST play in that lane (if not full).
    let muroLane: LaneId | null = null;
    for (const ln of LANE_IDS) {
      const hasMuro = workBoard[ln].player.some((c) => c.keyword === "muro");
      if (hasMuro && workBoard[ln].enemy.length < getLaneMaxCards(laneBonuses[ln])) {
        muroLane = ln;
        break;
      }
    }
    const lanesToTry: LaneId[] = muroLane ? [muroLane] : LANE_IDS;

    let best: AIPlay | null = null;
    for (const card of workHand) {
      for (const lane of lanesToTry) {
        const laneBonus = laneBonuses[lane];
        // Quick filter before scoring
        if (!isCardCostAllowed(card.cost, laneBonus)) continue;
        const effectiveCost = getFinalCost(card.cost, laneBonus, card.effectId, card.keywordValue);
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
    // --- 19 new keyword effects ---
    case "sacrificio_keyword":
      return "Sacrificio";
    case "remate_keyword":
      return "Remate";
    case "celeridad":
      return "Celeridad";
    case "eco":
      return "Eco";
    case "refuerzo":
      return "Refuerzo";
    case "ventaja":
      return "Ventaja";
    case "vanguardia":
      return "Vanguardia";
    case "aislado":
      return "Aislado";
    case "ultimo_aliento":
      return "Último Aliento";
    case "baluarte":
      return "Baluarte";
    case "sigilo":
      return "Sigilo";
    case "vinculo":
      return "Vínculo";
    case "muro_keyword":
      return "Muro";
    case "retorno":
      return "Retorno";
    case "despertar":
      return "Despertar";
    case "reciclar":
      return "Reciclar";
    case "doble_golpe":
      return "Doble Golpe";
    case "refugio":
      return "Refugio";
    case "emboscada":
      return "Emboscada";
    case "transferencia":
      return "Transferencia";
    case "renovacion":
      return "Renovación";
    default:
      return "—";
  }
}

// ---------------------------------------------------------------------------
// Trigger dispatchers — fire effects at the right point of the turn lifecycle.
// These functions return mutations / log entries; the caller (gameStore)
// applies them to the board state and pushes log entries.
//
// For now, only a small set of effects make sense for each non-on_play trigger
// (we re-use existing effectIds but interpret them through the trigger lens).
// New effectIds specific to start_turn/end_turn/on_death/umbral can be added
// later — the dispatcher already routes them based on `trigger`.
// ---------------------------------------------------------------------------

export interface TriggerResult {
  /** Newly-produced board (a fresh copy with mutations applied). */
  board: Board;
  /** Human-readable log entries (one per fired card). */
  logs: { side: "player" | "enemy" | "system"; text: string }[];
  /** Cards whose umbral trigger fired this dispatch (so the caller can flag them). */
  umbralFired: { side: "player" | "enemy"; lane: LaneId; uid: string }[];
}

function cloneBoard(board: Board): Board {
  return {
    armas: { player: [...board.armas.player], enemy: [...board.armas.enemy] },
    proteccion: { player: [...board.proteccion.player], enemy: [...board.proteccion.enemy] },
    furia: { player: [...board.furia.player], enemy: [...board.furia.enemy] },
  };
}

function applyPowerDelta(
  board: Board,
  side: "player" | "enemy",
  lane: LaneId,
  uid: string,
  delta: number,
  /** Optional source card name — when provided together with `kind`, the change is appended to the target's `powerLog` so the preview modal can show it in the Registro de Modificadores. */
  source?: string,
  /** Optional kind label — "start_turn" | "end_turn" | "passive" | "on_death" | "despertar" | etc. */
  kind?: PowerLogEntry["kind"],
) {
  const arr = board[lane][side];
  const idx = arr.findIndex((c) => c.uid === uid);
  if (idx < 0) return;
  const cur = arr[idx];
  const newPower = Math.max(0, cur.currentPower + delta);
  // Append to powerLog only when both source and kind are provided — this way
  // internal callers that don't want to surface the change in the UI can still
  // call applyPowerDelta with just (board, side, lane, uid, delta).
  const newLog = source && kind
    ? [...(cur.powerLog ?? []), { source, delta, kind }]
    : cur.powerLog;
  arr[idx] = { ...cur, currentPower: newPower, powerLog: newLog };
}

// ===========================================================================
// SCOPE HELPERS — aplican un delta a un conjunto de cartas según su Scope
// (PROPIO / CARRIL_LOCAL / CARRIL_LOCAL+ADYACENTE / MANO / GLOBAL).
// Cada helper usa internamente `applyPowerDelta` con el source/kind correcto,
// de modo que el `powerLog` de cada carta objetivo recibe una entrada.
//
// Estos helpers son la capa de abstracción que pide la spec 2026-10:
// > "ALCANCES: PROPIO (×1.0), CARRIL LOCAL (×1.2), CARRIL LOCAL+ADYACENTE (×1.4),
// >  MANO (×1.2), GLOBAL (×1.5)"
// La abstracción permite que las keywords nuevas (Etapa 2-3) se implementen
// en 1-2 líneas cada una, en lugar de duplicar bucles for por todas partes.
// ===========================================================================

/**
 * PROPIO (×1.0) — Aplica el delta solo a la carta fuente.
 */
export function applyToSelf(
  board: Board,
  side: "player" | "enemy",
  lane: LaneId,
  sourceUid: string,
  delta: number,
  source: string,
  kind: PowerLogEntry["kind"],
): void {
  applyPowerDelta(board, side, lane, sourceUid, delta, source, kind);
}

/**
 * CARRIL_LOCAL (×1.2) — Aplica el delta a todos los aliados en el carril dado,
 * opcionalmente excluyendo a la carta fuente (para auras como Baluarte, Muro).
 */
export function applyToLane(
  board: Board,
  side: "player" | "enemy",
  lane: LaneId,
  delta: number,
  source: string,
  kind: PowerLogEntry["kind"],
  excludeUid?: string,
): void {
  for (const ally of board[lane][side]) {
    if (excludeUid && ally.uid === excludeUid) continue;
    applyPowerDelta(board, side, lane, ally.uid, delta, source, kind);
  }
}

/**
 * CARRIL_LOCAL + ADYACENTE (×1.4) — Aplica el delta a los aliados del carril
 * dado y a los de los dos carriles adyacentes (en orden: armas ↔ proteccion ↔ furia).
 */
export function applyToLaneAndAdjacent(
  board: Board,
  side: "player" | "enemy",
  lane: LaneId,
  delta: number,
  source: string,
  kind: PowerLogEntry["kind"],
  excludeUid?: string,
): void {
  // Lanes adyacentes: armas↔proteccion, proteccion↔furia (furia↔armas? no cíclico)
  const adjacent: LaneId[] =
    lane === "armas" ? ["proteccion"]
    : lane === "proteccion" ? ["armas", "furia"]
    : ["proteccion"]; // furia → proteccion

  // Apply to the source lane first
  applyToLane(board, side, lane, delta, source, kind, excludeUid);

  // Then to each adjacent lane
  for (const ln of adjacent) {
    applyToLane(board, side, ln, delta, source, kind, excludeUid);
  }
}

/**
 * MANO (×1.2) — Aplica el delta a todas las cartas en la mano del bando.
 * Modifica `handBonus` y `handBonusSources` de cada HandCard (no se usa
 * applyPowerDelta porque las cartas en mano no tienen `currentPower`).
 *
 * Devuelve una nueva referencia al array `hand` para que React detecte el cambio.
 */
export function applyToHand(
  hand: HandCard[],
  delta: number,
  source: string,
  filterFn?: (card: HandCard) => boolean,
): HandCard[] {
  return hand.map((c) => {
    if (filterFn && !filterFn(c)) return c;
    const newBonus = (c.handBonus ?? 0) + delta;
    const newSources = [...(c.handBonusSources ?? []), { source, delta }];
    return {
      ...c,
      handBonus: newBonus,
      handBonusSources: newSources,
    };
  });
}

/**
 * GLOBAL (×1.5) — Aplica el delta a todos los aliados en el tablero, sin
 * importar el carril. Opcionalmente excluye a la carta fuente.
 */
export function applyToBoard(
  board: Board,
  side: "player" | "enemy",
  delta: number,
  source: string,
  kind: PowerLogEntry["kind"],
  excludeUid?: string,
): void {
  for (const ln of LANE_IDS) {
    applyToLane(board, side, ln, delta, source, kind, excludeUid);
  }
}

// ===========================================================================
// DEBUFF PIPELINE — Etapa 2 (spec 2026-10)
// ===========================================================================
// Toda reducción de poder (delta < 0) DEBE pasar por `applyDebuff` en lugar de
// `applyPowerDelta` directo. Esto activa la cadena defensiva:
//
//   1. GUARDIÁN  → redirige el debuff a esta carta (si está en el mismo carril
//                  que el objetivo original y no es el objetivo mismo)
//   2. BALUARTE  → si hay un aliado con Baluarte en el carril, los aliados
//                  están marcados `immuneToDebuff`. La inmunidad se respeta
//                  salvo que la fuente tenga Perforación restante.
//   3. CÚPULA    → cada carta con `cupulaRemaining > 0` absorbe puntos del
//                  debuff. Perforación reduce la capacidad de absorción.
//   4. applyPowerDelta  → aplica el delta restante al objetivo final.
//   5. REACTIONS → Espinas (contraataca -X al atacante) y Enrabia (+X a sí
//                  misma la primera vez) se disparan si el objetivo las tiene.
//
// Para buffs (delta >= 0) la función es equivalente a `applyPowerDelta`.
// ===========================================================================

export interface DebuffContext {
  /** UID of the card applying the debuff (used for Espinas reaction + Perforación bypass). */
  sourceUid?: string;
  /** Lane where the source card lives (for Espinas counter-attack target search). */
  sourceLane?: LaneId;
  /** Side of the source card. If different from `side` parameter, the debuff is "enemy". */
  sourceSide?: "player" | "enemy";
  /** Perforación bypass pool the source has remaining (overwrites source card's perforacionRemaining). */
  perforacionBypass?: number;
}

export interface DebuffResult {
  /** Final delta that was actually applied to the target (post-absorption, post-redirect). */
  appliedDelta: number;
  /** Points absorbed by Cúpula (sum across all Cúpula cards in the lane). */
  absorbedByCupula: number;
  /** UID of the card that ended up receiving the debuff (after potential Guardián redirect). */
  finalTargetUid: string;
  /** Lane where the debuff finally landed. */
  finalLane: LaneId;
  /** True if Baluarte blocked the debuff entirely (no delta applied). */
  blockedByBaluarte: boolean;
  /** UID of the Guardián that redirected the debuff, if any. */
  redirectedByGuardian?: string;
  /** True if Espinas reaction fired. */
  espinasFired?: boolean;
  /** True if Enrabia reaction fired. */
  enrabiaFired?: boolean;
}

/**
 * Apply a debuff (or buff) through the defensive pipeline.
 *
 * For buffs (delta >= 0) this is equivalent to `applyPowerDelta` (no pipeline).
 * For debuffs (delta < 0) it consults Guardián, Baluarte, Cúpula, Perforación,
 * and fires Espinas/Enrabia reactions on the target.
 *
 * Returns a `DebuffResult` describing what actually happened — useful for tests
 * and for the game log.
 */
export function applyDebuff(
  board: Board,
  side: "player" | "enemy",
  lane: LaneId,
  uid: string,
  delta: number,
  source: string,
  kind: PowerLogEntry["kind"],
  ctx?: DebuffContext,
): DebuffResult {
  // ====== BUFFS (delta >= 0) — bypass pipeline ======
  if (delta >= 0) {
    applyPowerDelta(board, side, lane, uid, delta, source, kind);
    return {
      appliedDelta: delta,
      absorbedByCupula: 0,
      finalTargetUid: uid,
      finalLane: lane,
      blockedByBaluarte: false,
    };
  }

  // ====== DEBUFF PIPELINE (delta < 0) ======
  const arr = board[lane][side];
  const idx = arr.findIndex((c) => c.uid === uid);
  if (idx < 0) {
    return {
      appliedDelta: 0,
      absorbedByCupula: 0,
      finalTargetUid: uid,
      finalLane: lane,
      blockedByBaluarte: false,
    };
  }
  const target = arr[idx];
  const sourceSide = ctx?.sourceSide ?? side;
  const isEnemyDebuff = sourceSide !== side;
  const mag = Math.abs(delta);

  // ----- STEP 1: GUARDIÁN redirect -----
  // If any ally in this lane (other than the target) is a Guardián, redirect the
  // debuff to it. The Guardián then runs through the rest of the pipeline
  // (Baluarte / Cúpula / applyPowerDelta / reactions) on itself.
  if (!target.isGuardian) {
    const guardian = arr.find((c) => c.uid !== uid && c.isGuardian);
    if (guardian) {
      const sub = applyDebuff(board, side, lane, guardian.uid, delta, source, kind, ctx);
      return {
        ...sub,
        redirectedByGuardian: guardian.uid,
      };
    }
  }

  // ----- STEP 2: BALUARTE immunity (dynamic check) -----
  // If any ally in this lane (other than the target itself) has keyword "baluarte",
  // the target is immune to enemy debuffs. Perforación leaks up to `bypass` points
  // through this immunity (Baluarte is modeled as "infinite Cúpula").
  let effectiveDelta = delta; // negative
  let absorbedByCupula = 0;
  let blockedByBaluarte = false;
  let perforacionBypass = ctx?.perforacionBypass ?? 0;

  // Pull perforacionRemaining from the source card if not explicitly provided.
  if (ctx?.sourceUid && ctx.sourceSide !== undefined && perforacionBypass === 0) {
    const sArr = board[ctx.sourceLane ?? lane]?.[ctx.sourceSide];
    const sCard = sArr?.find((c) => c.uid === ctx.sourceUid);
    if (sCard?.perforacionRemaining) {
      perforacionBypass = sCard.perforacionRemaining;
    }
  }

  const hasBaluarte = arr.some((c) => c.uid !== target.uid && c.keyword === "baluarte");
  if (hasBaluarte && isEnemyDebuff) {
    // Baluarte: infinite absorption, but Perforación leaks up to `bypass` points.
    const leak = Math.min(mag, perforacionBypass);
    if (leak < mag) {
      // Blocked entirely (or partially — but Baluarte is "infinite", so any
      // un-leaked amount is fully blocked).
      blockedByBaluarte = true;
      // Still log the leak as a residual debuff.
      effectiveDelta = leak > 0 ? -leak : 0;
      absorbedByCupula = mag - leak; // counts as absorbed by Baluarte
      // Consume perforacionRemaining on the source if it leaked.
      if (leak > 0 && ctx?.sourceUid && ctx.sourceSide !== undefined) {
        const sArr2 = board[ctx.sourceLane ?? lane]?.[ctx.sourceSide];
        const sIdx = sArr2?.findIndex((c) => c.uid === ctx.sourceUid);
        if (sArr2 && sIdx !== undefined && sIdx >= 0) {
          sArr2[sIdx] = {
            ...sArr2[sIdx],
            perforacionRemaining: Math.max(0, (sArr2[sIdx].perforacionRemaining ?? 0) - leak),
          };
        }
      }
    } else {
      // Perforación fully bypasses Baluarte — apply the full debuff.
      effectiveDelta = delta;
      // Consume all perforacionRemaining on the source.
      if (ctx?.sourceUid && ctx.sourceSide !== undefined) {
        const sArr2 = board[ctx.sourceLane ?? lane]?.[ctx.sourceSide];
        const sIdx = sArr2?.findIndex((c) => c.uid === ctx.sourceUid);
        if (sArr2 && sIdx !== undefined && sIdx >= 0) {
          sArr2[sIdx] = {
            ...sArr2[sIdx],
            perforacionRemaining: 0,
          };
        }
      }
    }
  } else {
    // ----- STEP 3: CÚPULA absorption -----
    // Each ally in the lane with `cupulaRemaining > 0` absorbs points from the
    // debuff. Perforación reduces the absorption capacity: for a Cúpula with
    // pool P, the effective capacity is max(0, P - perforacionBypass).
    //
    // We absorb from the Cúpula with the largest remaining pool first (greedy).
    // Each absorbed point decrements that Cúpula's pool.
    // Perforación bypass is consumed across all Cúpula cards it touches.
    let remaining = mag;
    let bypassLeft = perforacionBypass;

    // Collect Cúpula cards in this lane (target included — Cúpula is PROPIO+CARRIL_LOCAL per spec).
    const cupulaCards = arr
      .filter((c) => (c.cupulaRemaining ?? 0) > 0)
      .sort((a, b) => (b.cupulaRemaining ?? 0) - (a.cupulaRemaining ?? 0));

    for (const cup of cupulaCards) {
      if (remaining <= 0) break;
      const cupIdx = arr.findIndex((c) => c.uid === cup.uid);
      if (cupIdx < 0) continue;
      const pool = cup.cupulaRemaining ?? 0;
      // Perforación reduces this Cúpula's effective capacity.
      const bypassHere = Math.min(bypassLeft, pool);
      const effectiveCapacity = Math.max(0, pool - bypassHere);
      const absorb = Math.min(remaining, effectiveCapacity);
      if (absorb > 0) {
        arr[cupIdx] = {
          ...cup,
          cupulaRemaining: Math.max(0, pool - absorb),
        };
        absorbedByCupula += absorb;
        remaining -= absorb;
      }
      // Consume the bypass used here (regardless of whether absorb happened).
      bypassLeft -= bypassHere;
    }

    // ----- STEP 3b: REFUGIO absorption -----
    // Allies with keyword=refugio absorb up to keywordValue remaining debuff points
    // directed at OTHER allies in this lane (not the Refugio card itself).
    // Uses keywordValue as a one-shot pool (decrements when used, not refreshed).
    if (remaining > 0) {
      const refugioCards = arr
        .filter((c) => c.uid !== target.uid && c.keyword === "refugio" && (c.keywordValue ?? 0) > 0)
        .sort((a, b) => (b.keywordValue ?? 0) - (a.keywordValue ?? 0));
      for (const ref of refugioCards) {
        if (remaining <= 0) break;
        const refIdx = arr.findIndex((c) => c.uid === ref.uid);
        if (refIdx < 0) continue;
        const pool = ref.keywordValue ?? 0;
        const absorb = Math.min(remaining, pool);
        if (absorb > 0) {
          arr[refIdx] = {
            ...ref,
            keywordValue: Math.max(0, pool - absorb),
            powerLog: [
              ...(ref.powerLog ?? []),
              { source: `${ref.name} (Refugio)`, delta: absorb, kind: "passive" },
            ],
          };
          absorbedByCupula += absorb;
          remaining -= absorb;
        }
      }
    }

    effectiveDelta = -remaining;
    // Consume perforacionRemaining on the source proportional to bypassLeft used.
    const bypassUsed = perforacionBypass - bypassLeft;
    if (bypassUsed > 0 && ctx?.sourceUid && ctx.sourceSide !== undefined) {
      const sArr2 = board[ctx.sourceLane ?? lane]?.[ctx.sourceSide];
      const sIdx = sArr2?.findIndex((c) => c.uid === ctx.sourceUid);
      if (sArr2 && sIdx !== undefined && sIdx >= 0) {
        sArr2[sIdx] = {
          ...sArr2[sIdx],
          perforacionRemaining: Math.max(0, (sArr2[sIdx].perforacionRemaining ?? 0) - bypassUsed),
        };
      }
    }
  }

  // ----- STEP 4: apply residual delta -----
  if (effectiveDelta !== 0) {
    applyPowerDelta(board, side, lane, target.uid, effectiveDelta, source, kind);
  }

  // ----- STEP 5: REACTIONS via event system (Etapa 4) -----
  // Espinas/Enrabia used to be inline here; they're now dispatched by
  // `applyReactionEffects` after the engine emits a `debuff_applied` event.
  // Only fires if the target actually took damage (effectiveDelta < 0) and the
  // source is identifiable (ctx.sourceUid known — on_death debuffs have no
  // source on the board, so they skip reactions but Cúpula/Guardián/Baluarte
  // still applied in Steps 2-3).
  let espinasFired = false;
  let enrabiaFired = false;

  if (effectiveDelta < 0 && isEnemyDebuff && ctx?.sourceUid && ctx.sourceSide !== undefined) {
    const reactionEvent: DebuffAppliedEvent = {
      type: "debuff_applied",
      sourceSide: ctx.sourceSide,
      sourceUid: ctx.sourceUid,
      sourceName: source,
      sourceLane: ctx.sourceLane ?? lane,
      targetSide: side,
      targetUid: target.uid,
      targetName: target.name,
      targetLane: lane,
      delta: effectiveDelta,
    };
    const rxnRes = applyReactionEffects(board, side, reactionEvent);
    espinasFired = rxnRes.espinasFired;
    enrabiaFired = rxnRes.enrabiaFired;
  }

  return {
    appliedDelta: effectiveDelta,
    absorbedByCupula,
    finalTargetUid: target.uid,
    finalLane: lane,
    blockedByBaluarte,
    espinasFired,
    enrabiaFired,
  };
}

// ===========================================================================
// ETAPA 4 — REACTION TRIGGER EVENT SYSTEM (spec 2026-10)
// ===========================================================================
// Top-level game events that REACTION-trigger cards can respond to. The engine
// emits these events; `applyReactionEffects` dispatches them to all reaction
// cards on the reacting side.
//
// Currently only Espinas and Enrabia have REACTION trigger, and both respond
// to `debuff_applied` events. Future REACTION keywords can react to
// `card_played` or `card_destroyed` events.
// ===========================================================================

/** Event emitted when a card is played to the board. */
export interface CardPlayedEvent {
  type: "card_played";
  /** Side that PLAYED the card (the rival of the reacting side). */
  side: "player" | "enemy";
  lane: LaneId;
  cardUid: string;
  cardName: string;
  cardCategory: CardCategory;
  cardSubtypes: Subtype[];
}

/** Event emitted when a debuff lands on a target (post-prevention). */
export interface DebuffAppliedEvent {
  type: "debuff_applied";
  /** Side of the source card that applied the debuff. */
  sourceSide: "player" | "enemy";
  sourceUid: string;
  sourceName: string;
  sourceLane: LaneId;
  /** Side of the target card that received the debuff. */
  targetSide: "player" | "enemy";
  targetUid: string;
  targetName: string;
  targetLane: LaneId;
  /** Actual delta applied (negative). */
  delta: number;
}

/** Event emitted when a card is destroyed (sacrificed, remated, etc.). */
export interface CardDestroyedEvent {
  type: "card_destroyed";
  /** Side whose card was destroyed. */
  side: "player" | "enemy";
  lane: LaneId;
  cardUid: string;
  cardName: string;
  cardCategory: CardCategory;
  /** Why it was destroyed: "sacrificio" | "remate" | ... */
  reason: string;
}

/** Union of all top-level game events REACTION cards can respond to. */
export type GameEvent = CardPlayedEvent | DebuffAppliedEvent | CardDestroyedEvent;

export interface ReactionResult {
  espinasFired?: boolean;
  enrabiaFired?: boolean;
  logs: TriggerResult["logs"];
}

/**
 * Dispatch a game event to all REACTION-trigger cards on `reactingSide`.
 * Iterates over every card on the reacting side with `trigger === "reaction"`
 * and invokes the keyword-specific handler if the event matches.
 *
 * Returns logs + flags indicating which reactions fired (useful for tests and
 * for the game log).
 *
 * NOTE: Reactions that apply debuffs (e.g. Espinas counter-attack) use
 * `applyPowerDelta` directly — NOT `applyDebuff` — to avoid infinite recursion
 * (a counter-debuff would otherwise emit another `debuff_applied` event).
 */
export function applyReactionEffects(
  board: Board,
  reactingSide: "player" | "enemy",
  event: GameEvent,
): ReactionResult {
  const logs: TriggerResult["logs"] = [];
  let espinasFired = false;
  let enrabiaFired = false;

  for (const lane of LANE_IDS) {
    const arr = board[lane][reactingSide];
    for (let i = 0; i < arr.length; i++) {
      const card = arr[i];
      if (card.trigger !== "reaction") continue;

      // ----- ESPINAS [X]: reacts to debuff_applied where target is self -----
      if (
        card.keyword === "espinas" &&
        card.keywordValue &&
        event.type === "debuff_applied" &&
        event.targetSide === reactingSide &&
        event.targetUid === card.uid
      ) {
        const x = card.keywordValue;
        // Counter-attack: -X to the source card (applyPowerDelta, NOT applyDebuff,
        // to avoid infinite recursion).
        const sArr = board[event.sourceLane]?.[event.sourceSide];
        const sIdx = sArr?.findIndex((c) => c.uid === event.sourceUid);
        if (sArr && sIdx !== undefined && sIdx >= 0) {
          applyPowerDelta(
            board,
            event.sourceSide,
            event.sourceLane,
            event.sourceUid,
            -x,
            `${card.name} (Espinas)`,
            "debuff",
          );
          espinasFired = true;
          logs.push({
            side: reactingSide,
            text: `🌵 ${card.name} (Espinas): -${x} a ${event.sourceName} (contraataque)`,
          });
        }
      }

      // ----- ENRABIA [X]: one-shot +X to self when debuffed -----
      if (
        card.keyword === "enrabia" &&
        card.keywordValue &&
        !card.enrabiadUsed &&
        event.type === "debuff_applied" &&
        event.targetSide === reactingSide &&
        event.targetUid === card.uid
      ) {
        const x = card.keywordValue;
        // Re-fetch the card from the array (applyPowerDelta may have replaced
        // the array element via spread).
        const tIdx = board[lane][reactingSide].findIndex((c) => c.uid === card.uid);
        if (tIdx >= 0) {
          board[lane][reactingSide][tIdx] = {
            ...board[lane][reactingSide][tIdx],
            enrabiadUsed: true,
          };
          applyPowerDelta(
            board,
            reactingSide,
            lane,
            card.uid,
            x,
            `${card.name} (Enrabia)`,
            "buff",
          );
          enrabiaFired = true;
          logs.push({
            side: reactingSide,
            text: `😡 ${card.name} (Enrabia): +${x} (primera reducción sufrida)`,
          });
        }
      }

      // ----- Future REACTION keywords can hook here -----
      // e.g. a "Centinela" keyword reacting to `card_played` events where
      // event.side !== reactingSide (rival played a card) and event.cardCategory
      // matches some condition.
    }
  }

  return { espinasFired, enrabiaFired, logs };
}

/**
 * ETAPA 3 — Frenesí [X] helper.
 * Frenesí grants +X to the card itself every time its trigger fires. This helper
 * is invoked from EVERY trigger dispatcher (start_turn / end_turn / on_death /
 * umbral) AFTER the main effect runs, so the cumulative +X composes with the
 * card's normal effect.
 *
 * On ON_DEATH the helper is a no-op (the card is leaving the board, so a +X
 * bonus would be wasted).
 *
 * The +X is logged via `logs` so the game log shows the Frenesí stack.
 */
function triggerFrenesiIfApplicable(
  board: Board,
  side: "player" | "enemy",
  lane: LaneId,
  cardUid: string,
  cardName: string,
  triggerLabel: string,
  logs: TriggerResult["logs"],
): void {
  const arr = board[lane][side];
  const idx = arr.findIndex((c) => c.uid === cardUid);
  if (idx < 0) return;
  const card = arr[idx];
  if (card.keyword !== "frenesi" || !card.keywordValue) return;
  const x = card.keywordValue;
  applyPowerDelta(board, side, lane, cardUid, x, `${cardName} (Frenesí)`, "buff");
  logs.push({
    side,
    text: `🌀 ${cardName} (Frenesí): +${x} por disparar ${triggerLabel}`,
  });
}

// ===========================================================================
// FIRE KEYWORD EFFECTS — dispatcher genérico (spec 2026-10 amendment)
// ===========================================================================
// Llamado desde TODOS los dispatchers de trigger (on_play, start_turn, end_turn,
// despertar, y el caso Sacrificio para ofrenda). Esto permite que CUALQUIER
// keyword dispare con CUALQUIER trigger sin causar confusión.
//
// Solo maneja keywords que tienen sentido como EFECTOS one-shot o per-turn
// (no passive auras como Baluarte/Sigilo/Cúpula/Guardián que se chequean
// dinámicamente, ni keywords que requieren removedCards/energy/deck como
// Sacrificio/Remate/Reagrupar/Trampa/Retorno/Reciclar/Renovación).
// ===========================================================================

function fireKeywordEffects(
  board: Board,
  side: "player" | "enemy",
  lane: LaneId,
  card: BoardCard,
  hand: HandCard[] = [],
  logs: TriggerResult["logs"] = [],
): void {
  if (!card.keyword || card.keyword === "none") return;
  const x = card.keywordValue ?? 0;
  const enemySide: "player" | "enemy" = side === "player" ? "enemy" : "player";

  switch (card.keyword) {
    // ---- CELERIDAD: reduce coste de carta ALEATORIA en mano ----
    case "celeridad": {
      if (x > 0 && hand.length > 0) {
        const randomIdx = Math.floor(Math.random() * hand.length);
        const target = hand[randomIdx];
        const tIdx = hand.findIndex((c) => c.uid === target.uid);
        if (tIdx >= 0) {
          hand[tIdx] = {
            ...target,
            costReduction: (target.costReduction ?? 0) + x,
            costReductionSources: [
              ...(target.costReductionSources ?? []),
              { source: card.name, delta: x },
            ],
          };
          logs.push({ side, text: `💨 ${card.name} (Celeridad): -${x} al coste de ${target.name}` });
        }
      }
      break;
    }

    // ---- MEJORA: +X al aliado más débil del carril ----
    case "mejora": {
      if (x > 0) {
        const candidates = board[lane][side].filter((c) => c.uid !== card.uid);
        const target = lowestPowerCard(candidates);
        if (target) {
          applyPowerDelta(board, side, lane, target.uid, x, `${card.name} (Mejora)`, "buff");
          logs.push({ side, text: `⭐ ${card.name} (Mejora): +${x} a ${target.name}` });
        }
      }
      break;
    }

    // ---- DESARME: reduce keywordValue del enemigo más fuerte ----
    case "desarme": {
      if (x > 0) {
        const target = highestPowerCard(board[lane][enemySide]);
        if (target && target.keywordValue !== undefined && target.keywordValue > 0) {
          const idx = board[lane][enemySide].findIndex((c) => c.uid === target.uid);
          if (idx >= 0) {
            const newValue = Math.max(0, target.keywordValue - x);
            board[lane][enemySide][idx] = {
              ...target,
              keywordValue: newValue,
              powerLog: [
                ...(target.powerLog ?? []),
                { source: card.name, delta: -x, kind: "debuff" },
              ],
            };
            logs.push({ side, text: `🛠️ ${card.name} (Desarme): ${target.keywordValue} → ${newValue} en ${target.name}` });
          }
        }
      }
      break;
    }

    // ---- REFUERZO: +X al aliado marcado (refuerzoTargetUid) o al último aliado ----
    case "refuerzo": {
      if (x > 0) {
        // Priority 1: marked ally (refuerzoTargetUid)
        let targetUid = card.refuerzoTargetUid;
        // Priority 2: last ally in lane (if no marked ally or marked ally is gone)
        if (!targetUid || !board[lane][side].find((c) => c.uid === targetUid)) {
          const others = board[lane][side].filter((c) => c.uid !== card.uid);
          if (others.length > 0) targetUid = others[others.length - 1].uid;
        }
        if (targetUid) {
          const target = board[lane][side].find((c) => c.uid === targetUid);
          if (target) {
            applyPowerDelta(board, side, lane, targetUid, x, `${card.name} (Refuerzo)`, "buff");
            logs.push({ side, text: `🛡️ ${card.name} (Refuerzo): +${x} a ${target.name}` });
          }
        }
      }
      break;
    }

    // ---- SANGRADO: -X al enemigo más fuerte del carril (via applyDebuff) ----
    case "sangrado": {
      if (x > 0) {
        const target = highestPowerCard(board[lane][enemySide]);
        if (target) {
          const res = applyDebuff(board, enemySide, lane, target.uid, -x, card.name, "start_turn", {
            sourceUid: card.uid, sourceSide: side, sourceLane: lane,
          });
          if (res.blockedByBaluarte || res.appliedDelta === 0) {
            logs.push({ side, text: `🩸 ${card.name} (Sangrado): BLOQUEADO por Baluarte` });
          } else {
            logs.push({ side, text: `🩸 ${card.name} (Sangrado): ${res.appliedDelta} a ${target.name}` });
          }
        }
      }
      break;
    }

    // ---- VENTAJA: +X si ally power < enemy power (per-lane) ----
    case "ventaja": {
      if (x > 0) {
        const allyTotal = calcLanePower(board[lane][side]);
        const enemyTotal = calcLanePower(board[lane][enemySide]);
        if (allyTotal < enemyTotal) {
          applyPowerDelta(board, side, lane, card.uid, x, `${card.name} (Ventaja)`, "buff");
          logs.push({ side, text: `⚖️ ${card.name} (Ventaja): +${x} (poder ${allyTotal} < ${enemyTotal})` });
        }
      }
      break;
    }

    // ---- AISLADO: +X si es la única aliada en el carril ----
    case "aislado": {
      if (x > 0) {
        const others = board[lane][side].filter((c) => c.uid !== card.uid);
        if (others.length === 0) {
          applyPowerDelta(board, side, lane, card.uid, x, `${card.name} (Aislado)`, "buff");
          logs.push({ side, text: `🪨 ${card.name} (Aislado): +${x} (única aliada)` });
        }
      }
      break;
    }

    // ---- EMBOSCADA: +X si el carril enemigo está lleno (4 cartas) ----
    case "emboscada": {
      if (x > 0) {
        const enemyCount = board[lane][enemySide].length;
        if (enemyCount >= 4) {
          applyPowerDelta(board, side, lane, card.uid, x, `${card.name} (Emboscada)`, "buff");
          logs.push({ side, text: `🎯 ${card.name} (Emboscada): +${x} (carril enemigo lleno)` });
        }
      }
      break;
    }

    // ---- ECO: +X a cartas en mano que compartan subtipo o categoría ----
    case "eco": {
      if (x > 0 && hand.length > 0) {
        let buffed = 0;
        for (let i = 0; i < hand.length; i++) {
          const hc = hand[i];
          const sharesSubtype = hc.subtypes.some((s) => card.subtypes.includes(s));
          const sharesCategory = hc.category === card.category;
          if (sharesSubtype || sharesCategory) {
            hand[i] = {
              ...hc,
              handBonus: (hc.handBonus ?? 0) + x,
              handBonusSources: [
                ...(hc.handBonusSources ?? []),
                { source: `${card.name} (Eco)`, delta: x },
              ],
            };
            buffed++;
          }
        }
        if (buffed > 0) {
          logs.push({ side, text: `🔁 ${card.name} (Eco): +${x} a ${buffed} carta(s) en mano` });
        }
      }
      break;
    }

    // ---- TRANSFERENCIA: -X a aliado aquí, +X a aliado en otro carril ----
    case "transferencia": {
      if (x > 0) {
        // Find weakest ally here (excluding self)
        const candidates = board[lane][side].filter((c) => c.uid !== card.uid);
        const weakest = lowestPowerCard(candidates);
        // Find strongest ally in another lane
        let strongestElsewhere: BoardCard | null = null;
        let strongestLane: LaneId = lane;
        for (const ln of LANE_IDS) {
          if (ln === lane) continue;
          for (const c of board[ln][side]) {
            if (!strongestElsewhere || c.currentPower > strongestElsewhere.currentPower) {
              strongestElsewhere = c;
              strongestLane = ln;
            }
          }
        }
        if (weakest && strongestElsewhere) {
          applyPowerDelta(board, side, lane, weakest.uid, -x, `${card.name} (Transferencia)`, "debuff");
          applyPowerDelta(board, side, strongestLane, strongestElsewhere.uid, x, `${card.name} (Transferencia)`, "buff");
          logs.push({ side, text: `➡️ ${card.name} (Transferencia): -${x} a ${weakest.name}, +${x} a ${strongestElsewhere.name}` });
        }
      }
      break;
    }

    // ---- MIMETISMO: copia keyword+valor del aliado más fuerte ----
    case "mimetismo": {
      const candidates = board[lane][side].filter((c) => c.uid !== card.uid);
      const strongest = highestPowerCard(candidates);
      if (strongest && strongest.keyword && strongest.keyword !== "none") {
        // Copy the strongest ally's keyword + keywordValue to self
        const idx = board[lane][side].findIndex((c) => c.uid === card.uid);
        if (idx >= 0) {
          board[lane][side][idx] = {
            ...board[lane][side][idx],
            keyword: strongest.keyword,
            keywordValue: strongest.keywordValue,
          };
          logs.push({ side, text: `🪞 ${card.name} (Mimetismo): copió ${strongest.keyword}[${strongest.keywordValue ?? "?"}] de ${strongest.name}` });
        }
      }
      break;
    }

    // ---- VANGUARDIA: +X si es la primera carta del carril ----
    case "vanguardia": {
      if (x > 0) {
        // Simplified: "first card in lane" = only ally in this lane.
        // True "first card played this turn" would need gameStore turn tracking.
        const others = board[lane][side].filter((c) => c.uid !== card.uid);
        if (others.length === 0) {
          applyPowerDelta(board, side, lane, card.uid, x, `${card.name} (Vanguardia)`, "buff");
          logs.push({ side, text: `🚩 ${card.name} (Vanguardia): +${x} (primera carta del carril)` });
        }
      }
      break;
    }

    // ---- PASSIVE/FLAG KEYWORDS: no effect to fire (checked dynamically) ----
    // baluarte, sigilo, vinculo, muro, refugio, cupula, guardian, perforacion, enrabia, espinas
    // These are handled by their respective systems (applyDebuff pipeline, applyReactionEffects, etc.)
    default:
      break;
  }
}

/**
 * Fire all START_TURN effects on the board for the given side.
 * Currently re-uses effectIds whose semantics naturally fit a per-turn tick
 * (e.g. grito_batalla giving +2 to hand-Furia cards each turn start, avatar_titan
 * gaining +1 per board card). Effect dispatch is filtered by `trigger === "start_turn"`.
 */
export function applyStartTurnEffects(board: Board, side: "player" | "enemy", hand: HandCard[] = []): TriggerResult {
  const newBoard = cloneBoard(board);
  const logs: TriggerResult["logs"] = [];

  // ====== Etapa 2: refresh Cúpula pools at the start of each of the owner's turns.
  // Cúpula is a PASSIVE keyword per spec, but its absorption pool refreshes each
  // turn so it stays useful. We iterate over ALL cards on this side (not just
  // those with trigger=start_turn) because Cúpula cards have trigger=passive.
  // This must run BEFORE the trigger=start_turn dispatcher so a freshly refreshed
  // Cúpula can absorb debuffs from start_turn effects that fire this tick.
  for (const ln of LANE_IDS) {
    const arr = newBoard[ln][side];
    for (let i = 0; i < arr.length; i++) {
      const c = arr[i];
      if (c.keyword === "cupula" && c.keywordValue !== undefined) {
        const before = c.cupulaRemaining ?? 0;
        if (before !== c.keywordValue) {
          arr[i] = { ...c, cupulaRemaining: c.keywordValue };
          logs.push({
            side,
            text: `🛡️ ${c.name} (Cúpula): pool renovado a ${c.keywordValue} (era ${before})`,
          });
        }
      }
    }
  }

  for (const lane of LANE_IDS) {
    for (const card of newBoard[lane][side]) {
      if (card.trigger !== "start_turn") continue;
      // Per-turn effect: small steady buff to allies in lane (example semantics)
      switch (card.effectId) {
        case "golpe_heroico": {
          // +2 to other allies in this lane each turn
          for (const ally of newBoard[lane][side]) {
            if (ally.uid === card.uid) continue;
            applyPowerDelta(newBoard, side, lane, ally.uid, 2, card.name, "start_turn");
          }
          logs.push({
            side,
            text: `🌅 ${card.name}: +2 a aliados del carril ${lane} (Inicio de Turno)`,
          });
          break;
        }
        case "avatar_titan": {
          // +1 per board card each turn (capped at +5 per tick)
          const total = LANE_IDS.reduce(
            (acc, ln) => acc + newBoard[ln].player.length + newBoard[ln].enemy.length,
            0
          );
          const gain = Math.min(5, total);
          if (gain > 0) {
            applyPowerDelta(newBoard, side, lane, card.uid, gain, card.name, "start_turn");
            logs.push({
              side,
              text: `🌅 ${card.name}: +${gain} (1 por carta en mesa, Inicio de Turno)`,
            });
          }
          break;
        }
        // NOTE: sangrado case removed — now handled by fireKeywordEffects() below.
        // This avoids double-firing (effectId switch + fireKeywordEffects).
        default:
          break;
      }
      // ====== FIRE KEYWORD EFFECTS (start_turn) ======
      // Generic keyword dispatcher — fires ANY keyword's effect at start_turn.
      // Replaces the old inline Refuerzo check (now handled by fireKeywordEffects).
      fireKeywordEffects(newBoard, side, lane, card, hand, logs);
      // Etapa 3: Frenesí fires after the main start_turn effect.
      triggerFrenesiIfApplicable(newBoard, side, lane, card.uid, card.name, "Inicio de Turno", logs);
    }
  }

  return { board: newBoard, logs, umbralFired: [] };
}

/**
 * Fire all END_TURN effects on the board for the given side.
 * Fires just before scoring the lane. Examples: renewal, small heals, card draw.
 */
export function applyEndTurnEffects(board: Board, side: "player" | "enemy", hand: HandCard[] = []): TriggerResult {
  const newBoard = cloneBoard(board);
  const logs: TriggerResult["logs"] = [];

  for (const lane of LANE_IDS) {
    for (const card of newBoard[lane][side]) {
      if (card.trigger !== "end_turn") continue;
      switch (card.effectId) {
        case "pocion_vida": {
          // +1 to all ally Items in this lane at end of turn
          for (const ally of newBoard[lane][side]) {
            if (ally.category === "Ítem") {
              applyPowerDelta(newBoard, side, lane, ally.uid, 1, card.name, "end_turn");
            }
          }
          logs.push({
            side,
            text: `🌇 ${card.name}: +1 a Ítems del carril ${lane} (Fin de Turno)`,
          });
          break;
        }
        case "grito_batalla": {
          // +1 to self at end of turn (steady growth)
          applyPowerDelta(newBoard, side, lane, card.uid, 1, card.name, "end_turn");
          logs.push({
            side,
            text: `🌇 ${card.name}: +1 a sí mismo (Fin de Turno)`,
          });
          break;
        }
        case "renovacion": {
          // 25 Renovación [X]: (End Turn) - discard 1 to draw X.
          // Engine can't draw cards (no hand/deck context here); gameStore
          // handles the actual draw. We just log the intent here.
          const x = card.keywordValue ?? 1;
          logs.push({
            side,
            text: `🌙 ${card.name} (Renovación): descarta 1, robaría ${x} (End Turn)`,
          });
          break;
        }
        default:
          break;
      }
      // ====== FIRE KEYWORD EFFECTS (end_turn) ======
      fireKeywordEffects(newBoard, side, lane, card, hand, logs);
      // Etapa 3: Frenesí fires after the main end_turn effect.
      triggerFrenesiIfApplicable(newBoard, side, lane, card.uid, card.name, "Fin de Turno", logs);
    }
  }

  return { board: newBoard, logs, umbralFired: [] };
}

/**
 * Recompute PASSIVE effects on the board. Passive effects don't fire once —
 * they're continuously active while the card is on the board. This function
 * is called after every board mutation to re-buff allies / re-debuff enemies
 * according to each passive card's effectId.
 *
 * Implementation note: passive buffs stack onto `currentPower` directly. To
 * avoid double-counting on each call, callers should pass a board where the
 * passive buff has been reset (e.g. by re-cloning from base values). For now
 * we only apply a SMALL passive buff (+1) per passive card so re-calls
 * don't spiral out of control — proper passive semantics would require
 * tracking buff sources separately.
 */
export function applyPassiveEffects(board: Board): TriggerResult {
  const newBoard = cloneBoard(board);
  const logs: TriggerResult["logs"] = [];

  for (const lane of LANE_IDS) {
    for (const side of ["player", "enemy"] as const) {
      for (const card of newBoard[lane][side]) {
        if (card.trigger !== "passive") continue;
        switch (card.effectId) {
          case "muro_escudos": {
            // Aura: +1 to ally Items in this lane (continuous)
            let buffed = 0;
            for (const ally of newBoard[lane][side]) {
              if (ally.uid === card.uid) continue;
              if (ally.category === "Ítem") {
                applyPowerDelta(newBoard, side, lane, ally.uid, 1, card.name, "passive");
                buffed++;
              }
            }
            if (buffed > 0) {
              logs.push({
                side,
                text: `♾️ ${card.name}: aura +1 a ${buffed} Ítem(s) del carril ${lane}`,
              });
            }
            break;
          }
          case "trono_hierro": {
            // Aura: +1 to ALL allies on the board (continuous, capped)
            let buffed = 0;
            for (const ln of LANE_IDS) {
              for (const ally of newBoard[ln][side]) {
                if (ally.uid === card.uid) continue;
                applyPowerDelta(newBoard, side, ln, ally.uid, 1, card.name, "passive");
                buffed++;
              }
            }
            if (buffed > 0) {
              logs.push({
                side,
                text: `♾️ ${card.name}: aura +1 a ${buffed} aliado(s) en mesa`,
              });
            }
            break;
          }
          case "baluarte": {
            // 14 Baluarte: passive - allies here can't be debuffed.
            // Implementation: +1 buff to allies here each passive tick (proxy
            // for the protection mechanic — proper implementation would track
            // debuff sources and block them).
            let buffed = 0;
            for (const ally of newBoard[lane][side]) {
              if (ally.uid === card.uid) continue;
              applyPowerDelta(newBoard, side, lane, ally.uid, 1, card.name, "passive");
              buffed++;
            }
            if (buffed > 0) {
              logs.push({
                side,
                text: `🏰 ${card.name} (Baluarte): +1 a ${buffed} aliado(s) del carril ${lane}`,
              });
            }
            break;
          }
          case "vinculo": {
            // 16 Vínculo [X]: passive - gana +X por cada carta de Ítem en el carril
            const x = card.keywordValue ?? 2;
            const itemAllies = newBoard[lane][side].filter(
              (c) => c.uid !== card.uid && c.category === "Ítem"
            );
            if (itemAllies.length > 0) {
              const totalGain = x * itemAllies.length;
              applyPowerDelta(newBoard, side, lane, card.uid, totalGain, card.name, "passive");
              logs.push({
                side,
                text: `🔗 ${card.name} (Vínculo): +${totalGain} (${x} × ${itemAllies.length} Ítem(s) en ${lane})`,
              });
            }
            break;
          }
          case "muro_keyword": {
            // 17 Muro: passive - enemy must play here if not full.
            // We can't enforce this from the engine's passive dispatcher (it
            // would need to be integrated into planEnemyTurn). Just log the
            // presence of the Muro aura.
            logs.push({
              side,
              text: `🧱 ${card.name} (Muro): el rival debería jugar aquí`,
            });
            break;
          }
          case "refugio": {
            // 22 Refugio [X]: passive - absorb up to X debuff points to ally here.
            // Implementation: +1 buff to weakest ally here (proxy for the
            // absorb mechanic — proper implementation would intercept debuffs).
            const x = card.keywordValue ?? 2;
            const weakest = lowestPowerCard(newBoard[lane][side].filter((c) => c.uid !== card.uid));
            if (weakest) {
              applyPowerDelta(newBoard, side, lane, weakest.uid, Math.min(x, 2), card.name, "passive");
              logs.push({
                side,
                text: `⛺ ${card.name} (Refugio): +${Math.min(x, 2)} a ${weakest.name}`,
              });
            }
            break;
          }
          case "sigilo": {
            // 15 Sigilo: passive - first turn on board, immune to direct enemy effects.
            // The `sigiloActive` flag is set when the card is played and cleared
            // at the start of the owner's NEXT turn (gameStore handles that).
            // Here we just log presence during the first turn.
            if (card.sigiloActive) {
              logs.push({
                side,
                text: `👁️ ${card.name} (Sigilo): inmune a efectos enemigos directos este turno`,
              });
            }
            break;
          }
          default:
            break;
        }
      }
    }
  }

  return { board: newBoard, logs, umbralFired: [] };
}

/**
 * Fire ON_DEATH effects when a card is destroyed. The caller passes the
 * dying card and its location; this function dispatches its effectId in the
 * "on death" context.
 */
export function applyOnDeathEffects(
  board: Board,
  side: "player" | "enemy",
  lane: LaneId,
  deadCard: BoardCard
): TriggerResult {
  const newBoard = cloneBoard(board);
  const logs: TriggerResult["logs"] = [];

  if (deadCard.trigger !== "on_death") {
    return { board: newBoard, logs, umbralFired: [] };
  }

  const enemySide: "player" | "enemy" = side === "player" ? "enemy" : "player";

  switch (deadCard.effectId) {
    case "seccionar": {
      // -3 to strongest enemy in this lane on death (goes through the defensive pipeline:
      // Guardián/Baluarte/Cúpula may reduce or redirect the debuff).
      const target = highestPowerCard(newBoard[lane][enemySide]);
      if (target) {
        const res = applyDebuff(newBoard, enemySide, lane, target.uid, -3, deadCard.name, "on_death", {
          // Source is the dying card — no UID/position on the board anymore,
          // so reactions that need a source (Espinas) can't fire.
          // But Cúpula/Baluarte/Guardián will still apply.
        });
        if (res.blockedByBaluarte || res.appliedDelta === 0) {
          logs.push({
            side,
            text: `💀 ${deadCard.name}: -3 a ${target.name} fue BLOQUEADO (Baluarte) en carril ${lane}`,
          });
        } else {
          logs.push({
            side,
            text: `💀 ${deadCard.name}: ${res.appliedDelta} a ${target.name} en carril ${lane} (Último Aliento, post-prevención)`,
          });
        }
      }
      break;
    }
    case "filotormenta": {
      // -1 to ALL enemies on board on death (each debuff goes through the pipeline)
      let debuffed = 0;
      let blocked = 0;
      for (const ln of LANE_IDS) {
        // Snapshot the UIDs first since applyDebuff may mutate the array.
        const enemyUids = newBoard[ln][enemySide].map((c) => c.uid);
        for (const eUid of enemyUids) {
          const res = applyDebuff(newBoard, enemySide, ln, eUid, -1, deadCard.name, "on_death", {});
          if (res.blockedByBaluarte || res.appliedDelta === 0) blocked++;
          else debuffed++;
        }
      }
      if (debuffed > 0 || blocked > 0) {
        logs.push({
          side,
          text: `💀 ${deadCard.name}: -1 a ${debuffed} enemigo(s) en mesa${blocked > 0 ? `, ${blocked} bloqueado(s) por Baluarte` : ""} (Último Aliento)`,
        });
      }
      break;
    }
    case "ultimo_aliento": {
      // 13 Último Aliento [X]: On Death - transfer +X to weakest ally in this lane
      const x = deadCard.keywordValue ?? 3;
      const target = lowestPowerCard(newBoard[lane][side]);
      if (target) {
        applyPowerDelta(newBoard, side, lane, target.uid, x, deadCard.name, "on_death");
        logs.push({
          side,
          text: `💀 ${deadCard.name}: +${x} a ${target.name} (Último Aliento)`,
        });
      }
      break;
    }
    case "reciclar": {
      // 20 Reciclar [X]: On Death - recover X energy.
      // gameStore handles the actual energy refund (we can't `set` energy from
      // the engine). Log the intent.
      const x = deadCard.keywordValue ?? 2;
      logs.push({
        side,
        text: `♻️ ${deadCard.name}: recupera ${x} de energía (Reciclar)`,
      });
      break;
    }
    case "retorno": {
      // 18 Retorno [X]: On Death - if cost ≤ X, return to hand.
      // gameStore handles the actual hand insertion. Log the intent.
      const x = deadCard.keywordValue ?? deadCard.cost;
      if (deadCard.cost <= x) {
        logs.push({
          side,
          text: `🔄 ${deadCard.name} regresa a la mano (Retorno: coste ${deadCard.cost} ≤ ${x})`,
        });
      }
      break;
    }
    default:
      break;
  }

  return { board: newBoard, logs, umbralFired: [] };
}

/**
 * CHECK RETORNO — fire when a card's power drops to ≤ its retorno keywordValue.
 * Removes the card from the board and adds it to the hand with cost 0.
 * Called from gameStore after each major board mutation (play, end_turn, start_turn, AI play).
 */
export function checkRetorno(
  board: Board,
  hand: HandCard[],
  side: "player" | "enemy",
  logs: TriggerResult["logs"] = [],
): { board: Board; hand: HandCard[] } {
  const newBoard = cloneBoard(board);
  const newHand = [...hand];

  for (const lane of LANE_IDS) {
    const arr = newBoard[lane][side];
    for (let i = arr.length - 1; i >= 0; i--) {
      const card = arr[i];
      if (card.keyword === "retorno" && card.keywordValue && card.currentPower <= card.keywordValue) {
        // Return to hand with cost 0
        arr.splice(i, 1);
        newHand.push({
          ...card,
          uid: uuidv4(),
          cost: 0,
          handBonus: 0,
          costReduction: undefined,
          costReductionSources: undefined,
          powerLog: [],
        });
        logs.push({ side, text: `🔄 ${card.name} (Retorno): poder ${card.currentPower} ≤ ${card.keywordValue}, regresa a mano con coste 0` });
      }
    }
  }

  return { board: newBoard, hand: newHand };
}

/**
 * Check UMBRAL triggers on the board. Fires each card whose `umbralCondition`
 * is now satisfied (and hasn't already fired). Marks the card so it doesn't
 * fire again. Returns the new board + log entries + list of fired cards.
 */
export function checkUmbralTriggers(board: Board, hand: HandCard[] = []): TriggerResult {
  const newBoard = cloneBoard(board);
  const logs: TriggerResult["logs"] = [];
  const umbralFired: TriggerResult["umbralFired"] = [];

  for (const lane of LANE_IDS) {
    for (const side of ["player", "enemy"] as const) {
      for (const card of newBoard[lane][side]) {
        if (card.trigger !== "despertar") continue;
        if (card.umbralTriggered) continue;
        const threshold = card.umbralCondition?.powerThreshold;
        if (threshold === undefined) continue;
        if (card.currentPower >= threshold) {
          // Fire: +5 permanent bonus to self (one-shot)
          applyPowerDelta(newBoard, side, lane, card.uid, 5, card.name, "despertar");
          // applyPowerDelta REPLACES the array element with a new object (via
          // spread), so `card` now points to the OLD object. We must find the
          // new array element by uid to set umbralTriggered on it, otherwise
          // the trigger would re-fire every turn (pre-existing bug fixed here).
          const arrAfter = newBoard[lane][side];
          const idxAfter = arrAfter.findIndex((c) => c.uid === card.uid);
          if (idxAfter >= 0) {
            arrAfter[idxAfter] = { ...arrAfter[idxAfter], umbralTriggered: true };
          }
          umbralFired.push({ side, lane, uid: card.uid });
          logs.push({
            side,
            text: `🔥 ${card.name} despierta! Superó ${threshold} de poder: +5 (Despertar)`,
          });
          // Etapa 3: Frenesí fires after the umbral +5 bonus.
          // Re-read the card from the array (applyPowerDelta replaced it).
          const cardAfter = newBoard[lane][side].find((c) => c.uid === card.uid);
          if (cardAfter) {
            // ====== FIRE KEYWORD EFFECTS (despertar) ======
            // Generic keyword dispatcher — fires ANY keyword's effect when despertar triggers.
            // E.g. Tótem Sangriento (trigger=despertar, keyword=celeridad) will now
            // fire Celeridity when its power threshold is met.
            fireKeywordEffects(newBoard, side, lane, cardAfter, side === "player" ? hand : [], logs);
            triggerFrenesiIfApplicable(newBoard, side, lane, cardAfter.uid, cardAfter.name, "Despertar", logs);
          }
        }
      }
    }
  }

  return { board: newBoard, logs, umbralFired };
}
