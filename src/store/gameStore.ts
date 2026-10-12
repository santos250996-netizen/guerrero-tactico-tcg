"use client";

import { create } from "zustand";
import type {
  BoardCard,
  FinalResult,
  GamePhase,
  GameResult,
  HandCard,
  LaneBonuses,
  LaneId,
} from "@/lib/game/types";
import {
  MAX_HAND_SIZE,
  MAX_TURNS,
  STARTING_HAND_SIZE,
  computeFinalResult,
  type AIPlay,
  type Board,
  getEffectiveCost,
  getLaneMaxCards,
  isCardCostAllowed,
  LANE_IDS,
  planEnemyTurn,
  playCard,
  rollLaneBonuses,
} from "@/lib/game/engine";
import { buildDrawPile } from "@/lib/game/cards";
import { v4 as uuidv4 } from "uuid";

interface GameStoreState {
  // Core game state
  turn: number;
  energy: number;
  maxEnergy: number;
  phase: GamePhase;
  result: GameResult | null;
  finalResult: FinalResult | null;

  // Cards
  drawPile: HandCard[];
  hand: HandCard[];
  board: Board;

  // Per-game lane bonuses (2 lanes have one, 1 has none)
  laneBonuses: LaneBonuses;

  // UI state
  selectedCardUid: string | null;
  invalidPlayMsg: string | null;
  lastEnemyPlays: AIPlay[];
  log: LogEntry[];

  // Actions
  initGame: () => void;
  selectCard: (uid: string | null) => void;
  playSelectedCardIntoLane: (lane: LaneId) => void;
  endTurn: () => void;
  canPlaySelected: (lane: LaneId) => boolean;
  resetGame: () => void;
  dismissInvalidMsg: () => void;
}

export interface LogEntry {
  id: string;
  turn: number;
  side: "player" | "enemy" | "system";
  text: string;
  kind: "play" | "buff" | "debuff" | "info" | "end";
}

const MAX_LOG_ENTRIES = 30;

function emptyBoard(): Board {
  return {
    armas: { player: [], enemy: [] },
    proteccion: { player: [], enemy: [] },
    furia: { player: [], enemy: [] },
  };
}

function freshHandFromPile(pile: HandCard[], n: number): HandCard[] {
  const out: HandCard[] = [];
  for (let i = 0; i < n && pile.length > 0; i++) {
    const card = pile.pop()!;
    out.push({ ...card, uid: uuidv4(), handBonus: 0 });
  }
  return out;
}

function pushLog(
  list: LogEntry[],
  turn: number,
  side: LogEntry["side"],
  text: string,
  kind: LogEntry["kind"] = "info"
): LogEntry[] {
  const entry: LogEntry = {
    id: uuidv4(),
    turn,
    side,
    text,
    kind,
  };
  return [entry, ...list].slice(0, MAX_LOG_ENTRIES);
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  turn: 1,
  energy: 1,
  maxEnergy: 1,
  phase: "playing",
  result: null,
  finalResult: null,
  drawPile: [],
  hand: [],
  board: emptyBoard(),
  laneBonuses: { armas: null, proteccion: null, furia: null },
  selectedCardUid: null,
  invalidPlayMsg: null,
  lastEnemyPlays: [],
  log: [],

  initGame: () => {
    const pile = buildDrawPile().map((c) => ({ ...c, uid: "", handBonus: 0 }));
    const drawPile = pile.map((c) => ({ ...c, uid: uuidv4() }));
    const hand = freshHandFromPile(drawPile, STARTING_HAND_SIZE);
    const laneBonuses = rollLaneBonuses();
    const bonusSummary = LANE_IDS.map((ln) => {
      const b = laneBonuses[ln];
      return b ? `${ln}: ${b.label}` : `${ln}: sin bono`;
    }).join(" · ");
    set({
      turn: 1,
      energy: 1,
      maxEnergy: 1,
      phase: "playing",
      result: null,
      finalResult: null,
      drawPile,
      hand,
      board: emptyBoard(),
      laneBonuses,
      selectedCardUid: null,
      invalidPlayMsg: null,
      lastEnemyPlays: [],
      log: pushLog(
        pushLog([], 1, "system", "¡Comienza la batalla! Tienes 6 turnos.", "info"),
        1,
        "system",
        `Bonos de carril: ${bonusSummary}.`,
        "info"
      ),
    });
  },

  selectCard: (uid) => {
    const cur = get().selectedCardUid;
    set({ selectedCardUid: cur === uid ? null : uid, invalidPlayMsg: null });
  },

  canPlaySelected: (lane) => {
    const { selectedCardUid, hand, board, energy, laneBonuses } = get();
    if (!selectedCardUid) return false;
    const card = hand.find((c) => c.uid === selectedCardUid);
    if (!card) return false;
    const laneBonus = laneBonuses[lane];
    if (!isCardCostAllowed(card.cost, laneBonus)) return false;
    if (getEffectiveCost(card.cost, laneBonus) > energy) return false;
    if (board[lane].player.length >= getLaneMaxCards(laneBonus)) return false;
    return true;
  },

  playSelectedCardIntoLane: (lane) => {
    const state = get();
    if (state.phase !== "playing") return;
    if (!state.selectedCardUid) return;

    const card = state.hand.find((c) => c.uid === state.selectedCardUid);
    if (!card) return;

    const laneBonus = state.laneBonuses[lane];

    // Pre-flight checks with friendly messages (before playCard throws)
    if (!isCardCostAllowed(card.cost, laneBonus)) {
      set({
        invalidPlayMsg: `"${card.name}" no se puede jugar en ${lane}: el bono exige coste exacto.`,
      });
      return;
    }
    const effCost = getEffectiveCost(card.cost, laneBonus);
    if (effCost > state.energy) {
      set({
        invalidPlayMsg: `Sin energía suficiente para "${card.name}" (necesita ${effCost}${laneBonus?.kind === "cost_neg" || laneBonus?.kind === "cost_pos" ? " ajustado por bono" : ""}, tienes ${state.energy}).`,
      });
      return;
    }
    const maxCards = getLaneMaxCards(laneBonus);
    if (state.board[lane].player.length >= maxCards) {
      set({
        invalidPlayMsg: `El carril ${lane} está lleno (máx. ${maxCards} por bando).`,
      });
      return;
    }

    try {
      const res = playCard(
        state.board,
        state.hand,
        state.energy,
        "player",
        lane,
        card,
        laneBonus
      );
      let log = pushLog(
        state.log,
        state.turn,
        "player",
        `Juega "${card.name}" en ${lane} (Poder ${res.playedCard.currentPower}).`,
        "play"
      );
      for (const m of res.mutations) {
        const verb = m.powerDelta > 0 ? "buff" : "debuff";
        const sign = m.powerDelta > 0 ? "+" : "";
        log = pushLog(
          log,
          state.turn,
          m.side === "player" ? "player" : "enemy",
          `${verb === "buff" ? "Buff" : "Debuff"} ${sign}${m.powerDelta} en ${m.lane}.`,
          verb as "buff" | "debuff"
        );
      }

      set({
        board: res.board,
        hand: res.hand,
        energy: res.remainingEnergy,
        selectedCardUid: null,
        invalidPlayMsg: null,
        log,
      });
    } catch (e) {
      set({
        invalidPlayMsg: (e as Error).message,
      });
    }
  },

  endTurn: () => {
    const state = get();
    if (state.phase !== "playing") return;

    // 1. Enemy plays its turn with the SAME energy budget as the player had this turn.
    const enemyEnergy = state.maxEnergy;
    const enemyHand: HandCard[] = [];
    const deckPool = [...buildDrawPile()];
    for (let i = 0; i < 3 && deckPool.length > 0; i++) {
      const idx = Math.floor(Math.random() * deckPool.length);
      const c = deckPool.splice(idx, 1)[0];
      enemyHand.push({ ...c, uid: uuidv4(), handBonus: 0 });
    }

    // Plan and execute the AI plays on the actual board, respecting lane bonuses.
    const plan = planEnemyTurn(state.board, enemyHand, enemyEnergy, state.laneBonuses);
    let workBoard = state.board;
    let workEnergy = enemyEnergy;
    let log = state.log;
    for (const play of plan) {
      try {
        const res = playCard(
          workBoard,
          enemyHand,
          workEnergy,
          "enemy",
          play.lane,
          play.card,
          state.laneBonuses[play.lane]
        );
        workBoard = res.board;
        workEnergy = res.remainingEnergy;
        log = pushLog(
          log,
          state.turn,
          "enemy",
          `Rival juega "${play.card.name}" en ${play.lane} (Poder ${res.playedCard.currentPower}).`,
          "play"
        );
        for (const m of res.mutations) {
          const sign = m.powerDelta > 0 ? "+" : "";
          log = pushLog(
            log,
            state.turn,
            m.side === "player" ? "player" : "enemy",
            `${sign}${m.powerDelta} en ${m.lane} (${m.side === "player" ? "tú" : "rival"}).`,
            m.powerDelta > 0 ? "buff" : "debuff"
          );
        }
      } catch {
        // ignore failed plays
      }
    }

    // 2. Advance turn
    const newTurn = state.turn + 1;
    const newMaxEnergy = Math.min(MAX_TURNS, state.maxEnergy + 1);

    if (newTurn > MAX_TURNS) {
      // Game over
      const finalResult = computeFinalResult(workBoard);
      log = pushLog(
        log,
        MAX_TURNS,
        "system",
        `Fin del juego: ${finalResult.result === "WIN" ? "¡Victoria!" : finalResult.result === "LOSS" ? "Derrota" : "Empate"} (${finalResult.playerWins}-${finalResult.enemyWins}, E ${finalResult.draws}).`,
        "end"
      );
      set({
        board: workBoard,
        phase: "ended",
        result: finalResult.result,
        finalResult,
        lastEnemyPlays: plan,
        log,
      });
      return;
    }

    // 3. Draw a card, refill energy, etc.
    const newDrawPile = [...state.drawPile];
    let newHand = [...state.hand];
    if (newHand.length < MAX_HAND_SIZE && newDrawPile.length > 0) {
      const drawn = newDrawPile.pop()!;
      newHand.push({ ...drawn, uid: uuidv4(), handBonus: 0 });
    }
    log = pushLog(
      log,
      newTurn,
      "system",
      `Turno ${newTurn} — Energía ${newMaxEnergy}/${newMaxEnergy}.`,
      "info"
    );

    set({
      board: workBoard,
      turn: newTurn,
      energy: newMaxEnergy,
      maxEnergy: newMaxEnergy,
      drawPile: newDrawPile,
      hand: newHand,
      selectedCardUid: null,
      invalidPlayMsg: null,
      lastEnemyPlays: plan,
      log,
    });
  },

  resetGame: () => {
    get().initGame();
  },

  dismissInvalidMsg: () => set({ invalidPlayMsg: null }),
}));

// Convenience selector for lane scores
export function laneScores(board: Board, lane: LaneId) {
  const p = board[lane].player.reduce((a, c) => a + c.currentPower, 0);
  const e = board[lane].enemy.reduce((a, c) => a + c.currentPower, 0);
  return { player: p, enemy: e };
}

// Re-export BoardCard type for components
export type { BoardCard };
