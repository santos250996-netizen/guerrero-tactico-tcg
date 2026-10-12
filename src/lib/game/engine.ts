import type {
  BoardCard,
  CardDef,
  EffectId,
  FinalResult,
  HandCard,
  LaneId,
  LaneOutcome,
  LaneState,
} from "./types";
import { LANE_META } from "./types";
import { v4 as uuidv4 } from "uuid";

export type Board = Record<LaneId, LaneState>;

export const LANE_IDS: LaneId[] = ["armas", "proteccion", "furia"];

export const MAX_TURNS = 6;
export const MAX_HAND_SIZE = 5;
export const MAX_LANE_CARDS = 4;
export const STARTING_HAND_SIZE = 4;

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
}

interface EffectResult {
  /** Final power for the new card after all static bonuses and self-effects */
  finalPower: number;
  /** Optional list of mutations to apply to the board (buffs, debuffs) */
  mutations: BoardMutation[];
  /** Optional list of mutations to apply to remaining hand cards */
  handMutations: HandMutation[];
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

/**
 * Compute the final power of a card being played into `lane`, including:
 *   - in-hand bonus (e.g. Grito de Batalla)
 *   - subtype synergy (+2)
 *   - field bonus (+3 if category matches lane bonus category)
 *   - the card's own conditional effect (effectId)
 *
 * Also returns any side-effect mutations (debuffs to enemy, buffs to allies,
 * hand buffs for Grito de Batalla, etc.).
 */
export function computeEffect(ctx: EffectContext): EffectResult {
  const { board, side, lane, card, handBonus, hand } = ctx;

  let finalPower = card.power + handBonus;

  // 1. Subtype synergy: +2 if card has the lane as a subtype
  if (card.subtypes.includes(lane)) finalPower += 2;

  // 2. Field bonus: +3 if card's category matches lane bonus category
  const fieldBonus = LANE_META[lane];
  if (card.category === fieldBonus.bonusCategory) finalPower += fieldBonus.bonusValue;

  const mutations: BoardMutation[] = [];
  const handMutations: HandMutation[] = [];

  const allyLane = board[lane][side];
  const enemySide: "player" | "enemy" = side === "player" ? "enemy" : "player";
  const enemyLane = board[lane][enemySide];

  // 3. Effect-specific logic
  switch (card.effectId) {
    case "golpe_heroico": {
      // +4 to your OTHER cards in this lane (does NOT include the new card itself)
      for (const c of allyLane) {
        mutations.push({ side, lane, uid: c.uid, powerDelta: 4 });
      }
      break;
    }
    case "seccionar": {
      // -2 to the highest-power enemy card in this lane
      const target = highestPowerCard(enemyLane);
      if (target) {
        mutations.push({ side: enemySide, lane, uid: target.uid, powerDelta: -2 });
      }
      break;
    }
    case "machaque_mortal": {
      // +2 for each Attack card already in this lane (allies only)
      const atkCount = allyLane.filter((c) => c.category === "Ataque").length;
      finalPower += atkCount * 2;
      break;
    }
    case "ejecutar": {
      // +5 if enemy total in this lane > 20
      const enemyTotal = calcLanePower(enemyLane);
      if (enemyTotal > 20) finalPower += 5;
      break;
    }
    case "bloqueo_escudo": {
      // -3 to the highest-power enemy card in this lane
      const target = highestPowerCard(enemyLane);
      if (target) {
        mutations.push({ side: enemySide, lane, uid: target.uid, powerDelta: -3 });
      }
      break;
    }
    case "muro_escudos": {
      // +3 to your other Item cards in this lane
      for (const c of allyLane) {
        if (c.category === "Ítem") {
          mutations.push({ side, lane, uid: c.uid, powerDelta: 3 });
        }
      }
      break;
    }
    case "pocion_vida": {
      // +2 for each Item card already in this lane (allies only)
      const itemCount = allyLane.filter((c) => c.category === "Ítem").length;
      finalPower += itemCount * 2;
      break;
    }
    case "provocar": {
      // +3 if any ally card in this lane has subtype "proteccion"
      const hasProt = allyLane.some((c) => c.subtypes.includes("proteccion"));
      if (hasProt) finalPower += 3;
      break;
    }
    case "ira_rabiosa": {
      // +3 if any ally card in this lane has subtype "furia"
      const hasFury = allyLane.some((c) => c.subtypes.includes("furia"));
      if (hasFury) finalPower += 3;
      break;
    }
    case "grito_batalla": {
      // +2 to OTHER cards in hand with subtype "furia"
      for (const hc of hand) {
        if (hc.uid === (ctx.card as HandCard & { uid?: string })?.uid) continue;
        if (hc.subtypes.includes("furia")) {
          handMutations.push({ uid: hc.uid, powerDelta: 2 });
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
          mutations.push({ side: enemySide, lane: ln, uid: c.uid, powerDelta: -1 });
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
      finalPower += Math.min(10, total);
      break;
    }
    case "none":
    default:
      break;
  }

  return { finalPower, mutations, handMutations };
}

function highestPowerCard(cards: BoardCard[]): BoardCard | null {
  if (cards.length === 0) return null;
  let best = cards[0];
  for (const c of cards) {
    if (c.currentPower > best.currentPower) best = c;
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
}

/**
 * Immutably play a card from the hand into a lane. Returns a new board+hand+energy.
 * Throws if invalid (not enough energy, lane full, card not in hand).
 */
export function playCard(
  board: Board,
  hand: HandCard[],
  energy: number,
  side: "player" | "enemy",
  lane: LaneId,
  handCard: HandCard
): PlayResult {
  if (handCard.cost > energy) {
    throw new Error(`Sin energía suficiente (necesita ${handCard.cost}, tiene ${energy})`);
  }
  if (board[lane][side].length >= MAX_LANE_CARDS) {
    throw new Error(`Carril ${lane} lleno (máximo ${MAX_LANE_CARDS} cartas)`);
  }

  const effect = computeEffect({
    board,
    side,
    lane,
    card: handCard,
    handBonus: handCard.handBonus,
    hand: hand.filter((c) => c.uid !== handCard.uid),
  });

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

  // Place the new card
  const newCard: BoardCard = {
    uid: uuidv4(),
    defId: handCard.id,
    name: handCard.name,
    category: handCard.category,
    subtypes: handCard.subtypes,
    cost: handCard.cost,
    basePower: handCard.power,
    currentPower: effect.finalPower,
    text: handCard.text,
    effectId: handCard.effectId,
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
    remainingEnergy: energy - handCard.cost,
    playedCard: newCard,
    mutations: effect.mutations,
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
 */
export function scoreAIPlay(
  board: Board,
  hand: HandCard[],
  energy: number,
  card: HandCard,
  lane: LaneId
): number {
  if (card.cost > energy) return -Infinity;
  if (board[lane].enemy.length >= MAX_LANE_CARDS) return -Infinity;

  const enemySide: "player" | "enemy" = "enemy";
  const allySide: "player" | "enemy" = "player";

  const currentEnemyPower = calcLanePower(board[lane].enemy);
  const currentPlayerPower = calcLanePower(board[lane].player);

  // Simulate the play
  let sim;
  try {
    sim = playCard(board, hand, energy, enemySide, lane, card);
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
  if (oldMargin < 0 && newMargin >= 0) score += 80; // turning loss into tie/win
  if (oldMargin < 0 && newMargin > 0) score += 40; // turning loss into win
  if (oldMargin === 0 && newMargin > 0) score += 60; // turning tie into win

  // 3. Penalty for playing in already-won lane (waste)
  if (oldMargin > 10) score -= 50;
  else if (oldMargin > 0) score -= 20;

  // 4. Small penalty for playing a high-cost card when it's overkill
  if (card.cost >= 4 && oldMargin > 5) score -= 15;

  // 5. Subtype synergy bonus is already in `gain` but add a small explicit bonus
  if (card.subtypes.includes(lane)) score += 5;

  // 6. Field bonus already factored in `gain` — small explicit bonus for matching
  const fieldBonus = LANE_META[lane];
  if (card.category === fieldBonus.bonusCategory) score += 5;

  // 7. Slight preference for spending closer to (but not exceeding) energy budget
  const efficiency = card.cost / Math.max(1, energy);
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

  // 10. Mutations that debuff player are worth more
  const debuffValue = sim.mutations
    .filter((m) => m.side === allySide && m.powerDelta < 0)
    .reduce((acc, m) => acc + Math.abs(m.powerDelta), 0);
  score += debuffValue * 2;

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
 */
export function planEnemyTurn(
  board: Board,
  hand: HandCard[],
  energy: number
): AIPlay[] {
  const plays: AIPlay[] = [];
  let workBoard: Board = board;
  let workHand: HandCard[] = hand;
  let workEnergy = energy;

  // Try up to 3 plays per turn
  for (let iter = 0; iter < 3; iter++) {
    if (workEnergy < 1 || workHand.length === 0) break;

    let best: AIPlay | null = null;
    for (const card of workHand) {
      if (card.cost > workEnergy) continue;
      for (const lane of LANE_IDS) {
        if (workBoard[lane].enemy.length >= MAX_LANE_CARDS) continue;
        const s = scoreAIPlay(workBoard, workHand, workEnergy, card, lane);
        if (!best || s > best.score) {
          best = { card, lane, score: s };
        }
      }
    }

    // Only play if the score is positive (worth doing)
    if (!best || best.score <= 0) break;

    // Apply the play to the working state
    try {
      const res = playCard(workBoard, workHand, workEnergy, "enemy", best.lane, best.card);
      workBoard = res.board;
      workHand = res.hand;
      workEnergy = res.remainingEnergy;
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
    default:
      return "—";
  }
}
