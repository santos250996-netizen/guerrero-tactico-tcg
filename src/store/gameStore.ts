"use client";

import { create } from "zustand";
import type {
  BoardCard,
  CardDef,
  FinalResult,
  GameClass,
  GamePhase,
  GameResult,
  HandCard,
  LaneBonuses,
  LaneId,
  PowerLogEntry,
} from "@/lib/game/types";
import { CLASS_META, KEYWORD_META } from "@/lib/game/types";
import {
  MAX_HAND_SIZE,
  MAX_TURNS,
  STARTING_HAND_SIZE,
  ALL_LANE_IDS,
  applyEndTurnEffects,
  applyOnDeathEffects,
  applyStartTurnEffects,
  computeFinalResult,
  emptyLaneTraps,
  getLaneBonusPower,
  getFinalCost,
  getLaneMaxCards,
  isCardCostAllowed,
  lanesForClass,
  LANE_IDS,
  planEnemyTurn,
  playCard,
  rollLaneBonuses,
  type AIPlay,
  type Board,
  type LaneTraps,
  type TrapState,
  type TriggerResult,
} from "@/lib/game/engine";
import { ALL_CARDS, buildDrawPileFrom, CLASS_DECKS, cardPoolForClass, WARRIOR_DECK } from "@/lib/game/cards";
import { sfx } from "@/lib/sound";
import { useSettings } from "@/lib/settings";
import { v4 as uuidv4 } from "uuid";

// ---------------------------------------------------------------------------
// Auxiliary types
// ---------------------------------------------------------------------------

export interface FloatingNumber {
  id: string;
  uid: string;
  value: number;
}

export interface GameStats {
  cardsPlayedByPlayer: number;
  cardsPlayedByEnemy: number;
  buffsApplied: number;
  debuffsToEnemy: number;
  enemyCardsDestroyed: number;
  laneTurnarounds: number;
  totalEnergyUsed: number;
}

interface UndoSnapshot {
  board: Board;
  hand: HandCard[];
  energy: number;
  laneTraps: LaneTraps;
  nextTurnEnergyPenalty: number;
  gameStats: GameStats;
  playsThisTurn: number;
}

// ---------------------------------------------------------------------------

interface GameStoreState {
  // Core game state
  turn: number;
  energy: number;
  maxEnergy: number;
  /** Cards the PLAYER has played this turn (reset each turn) — drives Ímpetu. */
  playsThisTurn: number;
  phase: GamePhase;
  result: GameResult | null;
  finalResult: FinalResult | null;

  // Cards
  drawPile: HandCard[];
  hand: HandCard[];
  board: Board;

  // Per-game lane bonuses (2 lanes have one, 1 has none)
  laneBonuses: LaneBonuses;

  // Flash overlay state — when set, each lane with a non-null entry shows a
  // brief animated flash explaining the bonus (e.g. "1 VS 1" for limit_1).
  // Auto-cleared after 1.5s by the flashLaneBonuses helper.
  laneBonusFlashes: LaneBonuses;

  // Traps (Trampa Etérea) per lane
  laneTraps: LaneTraps;

  // Sobrecarga penalty to apply to the player's NEXT turn energy
  nextTurnEnergyPenalty: number;

  // Floating numbers (visual feedback for buffs/debuffs)
  floatingNumbers: FloatingNumber[];

  // AI turn UI phase
  aiTurnPhase: "idle" | "banner" | "thinking";

  // Card preview (deck editor)
  previewCard: CardDef | null;

  // Game stats
  gameStats: GameStats;

  // Single-level undo snapshot (saved before each player play)
  undoSnapshot: UndoSnapshot | null;

  // Legendary burst animation trigger
  legendaryBurst: boolean;

  // View switch (game / editor)
  view: "main-menu" | "class-select" | "game" | "editor" | "profile";

  // Clase elegida + sus carriles activos (el tablero solo usa estos 3)
  gameClass: GameClass;
  activeLanes: LaneId[];

  // Deck editor state
  cardPool: CardDef[];
  deckCardIds: string[];
  deckDirty: boolean;
  deckSaveStatus: "idle" | "saving" | "ok" | "err";
  deckLoading: boolean;
  // Contextual return target when leaving DeckEditor ("game" header button vs "class-select" flow)
  deckEditorReturn: "game" | "class-select" | "main-menu";

  // UI state
  selectedCardUid: string | null;
  draggingCardUid: string | null;
  invalidPlayMsg: string | null;
  lastEnemyPlays: AIPlay[];
  log: LogEntry[];

  // Actions
  selectClass: (cls: GameClass) => void;
  initGame: () => void;
  selectCard: (uid: string | null) => void;
  setDraggingCard: (uid: string | null) => void;
  playSelectedCardIntoLane: (lane: LaneId) => void;
  endTurn: () => Promise<void>;
  canPlaySelected: (lane: LaneId) => boolean;
  resetGame: () => void;
  dismissInvalidMsg: () => void;
  undoLastPlay: () => void;
  clearFloatingNumbers: () => void;

  // View + preview
  setView: (view: "main-menu" | "class-select" | "game" | "editor" | "profile") => void;
  setDeckEditorReturn: (target: "game" | "class-select" | "main-menu") => void;
  setPreviewCard: (c: CardDef | null) => void;

  // Deck editor actions
  loadDeckAndPool: () => Promise<void>;
  swapCardInDeck: (index: number, cardId: string) => void;
  saveDeck: () => Promise<void>;
  resetDeck: () => Promise<void>;
}

export interface LogEntry {
  id: string;
  turn: number;
  side: "player" | "enemy" | "system";
  text: string;
  kind: "play" | "buff" | "debuff" | "info" | "end";
}

const MAX_LOG_ENTRIES = 30;

function emptyBoard(lanes: LaneId[] = LANE_IDS): Board {
  const b = {} as Board;
  for (const ln of lanes) b[ln] = { player: [], enemy: [] };
  return b;
}

function nullBonuses(lanes: LaneId[] = LANE_IDS): LaneBonuses {
  return Object.fromEntries(lanes.map((ln) => [ln, null])) as LaneBonuses;
}

function emptyGameStats(): GameStats {
  return {
    cardsPlayedByPlayer: 0,
    cardsPlayedByEnemy: 0,
    buffsApplied: 0,
    debuffsToEnemy: 0,
    enemyCardsDestroyed: 0,
    laneTurnarounds: 0,
    totalEnergyUsed: 0,
  };
}

function freshHandFromPile(pile: HandCard[], n: number): HandCard[] {
  const out: HandCard[] = [];
  for (let i = 0; i < n && pile.length > 0; i++) {
    const card = pile.pop()!;
    out.push({ ...card, uid: uuidv4(), handBonus: 0 });
  }
  // ensureCost1 guarantee: if the starting hand has no cost-1 card, swap in
  // one from the pile (so the player can always play something on turn 1).
  if (!out.some((c) => c.cost === 1) && pile.length > 0) {
    const idx = pile.findIndex((c) => c.cost === 1);
    if (idx >= 0) {
      const replacement = pile.splice(idx, 1)[0];
      // Swap out the highest-cost card to make room
      let swapIdx = 0;
      for (let i = 1; i < out.length; i++) {
        if (out[i].cost > out[swapIdx].cost) swapIdx = i;
      }
      pile.push(out[swapIdx]);
      out[swapIdx] = { ...replacement, uid: uuidv4(), handBonus: 0 };
    }
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

/**
 * Push all log entries from a TriggerResult onto the game log.
 * Used by the turn-lifecycle hooks (start_turn, end_turn, on_death, umbral).
 */
function pushTriggerLogs(
  list: LogEntry[],
  turn: number,
  result: { logs: TriggerResult["logs"] }
): LogEntry[] {
  let next = list;
  for (const l of result.logs) {
    next = pushLog(next, turn, l.side, l.text, "info");
  }
  return next;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Resolve the player's deck from the loaded card pool + deck card IDs.
 * Mago/Asesino siempre usan su mazo espejo; Guerrero permite custom de BD.
 */
function resolveDeck(state: GameStoreState): CardDef[] {
  if (state.gameClass !== "guerrero") {
    return CLASS_DECKS[state.gameClass];
  }
  const { cardPool, deckCardIds } = state;
  if (cardPool.length > 0 && deckCardIds.length > 0) {
    const resolved = deckCardIds
      .map((id) => cardPool.find((c) => c.id === id))
      .filter((c): c is CardDef => Boolean(c));
    if (resolved.length === deckCardIds.length) {
      return resolved;
    }
  }
  return WARRIOR_DECK;
}

/**
 * Trigger a brief visual flash on each lane showing its current bonus.
 * Used when lane bonuses are (re-)rolled — at game start (initGame) and
 * at the start of turn 4 (re-roll). Auto-clears after 1.5s.
 */
export function flashLaneBonuses(bonuses: LaneBonuses) {
  useGameStore.setState({ laneBonusFlashes: { ...bonuses } });
  setTimeout(() => {
    useGameStore.setState({
      laneBonusFlashes: nullBonuses(ALL_LANE_IDS),
    });
  }, 1500);
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  turn: 1,
  energy: 1,
  maxEnergy: 1,
  playsThisTurn: 0,
  phase: "playing",
  result: null,
  finalResult: null,
  drawPile: [],
  hand: [],
  board: emptyBoard(),
  laneBonuses: nullBonuses(ALL_LANE_IDS),
  laneBonusFlashes: nullBonuses(ALL_LANE_IDS),
  laneTraps: emptyLaneTraps(),
  nextTurnEnergyPenalty: 0,
  floatingNumbers: [],
  aiTurnPhase: "idle",
  previewCard: null,
  gameStats: emptyGameStats(),
  undoSnapshot: null,
  legendaryBurst: false,
  view: "main-menu",
  gameClass: "guerrero",
  activeLanes: lanesForClass("guerrero"),
  cardPool: [],
  deckCardIds: [],
  deckDirty: false,
  deckSaveStatus: "idle",
  deckLoading: false,
  deckEditorReturn: "main-menu",
  selectedCardUid: null,
  draggingCardUid: null,
  invalidPlayMsg: null,
  lastEnemyPlays: [],
  log: [],

  selectClass: (cls) => {
    set({ gameClass: cls, activeLanes: lanesForClass(cls) });
  },

  initGame: () => {
    const resolvedDeck = resolveDeck(get());
    const pile = buildDrawPileFrom(resolvedDeck).map((c) => ({
      ...c,
      uid: "",
      handBonus: 0,
    }));
    const drawPile = pile.map((c) => ({ ...c, uid: uuidv4() }));
    const hand = freshHandFromPile(drawPile, STARTING_HAND_SIZE);
    const activeLanes = get().activeLanes;
    const laneBonuses = rollLaneBonuses(activeLanes);
    const bonusSummary = activeLanes.map((ln) => {
      const b = laneBonuses[ln];
      return b ? `${ln}: ${b.label}` : `${ln}: sin bono`;
    }).join(" · ");
    set({
      turn: 1,
      energy: 1,
      maxEnergy: 1,
      playsThisTurn: 0,
      phase: "playing",
      result: null,
      finalResult: null,
      drawPile,
      hand,
      board: emptyBoard(activeLanes),
      laneBonuses,
      laneTraps: emptyLaneTraps(),
      nextTurnEnergyPenalty: 0,
      floatingNumbers: [],
      aiTurnPhase: "idle",
      previewCard: null,
      gameStats: emptyGameStats(),
      undoSnapshot: null,
      legendaryBurst: false,
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
    // Trigger visual flash on each lane showing its bonus
    flashLaneBonuses(laneBonuses);
  },

  selectCard: (uid) => {
    const cur = get().selectedCardUid;
    set({ selectedCardUid: cur === uid ? null : uid, invalidPlayMsg: null });
    if (useSettings.getState().soundOn) sfx.select();
  },

  setDraggingCard: (uid) => {
    set({ draggingCardUid: uid });
  },

  canPlaySelected: (lane) => {
    const { selectedCardUid, hand, board, energy, laneBonuses } = get();
    if (!selectedCardUid) return false;
    const card = hand.find((c) => c.uid === selectedCardUid);
    if (!card) return false;
    const laneBonus = laneBonuses[lane];
    if (!isCardCostAllowed(card.cost, laneBonus)) return false;
    const baseCost = Math.max(1, card.cost - (card.costReduction ?? 0));
    if (getFinalCost(baseCost, laneBonus) > energy) return false;
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
    const activeTrap = state.laneTraps[lane];

    // Pre-flight checks with friendly messages (before playCard throws)
    if (!isCardCostAllowed(card.cost, laneBonus)) {
      set({
        invalidPlayMsg: `"${card.name}" no se puede jugar en ${lane}: el bono exige coste exacto.`,
      });
      return;
    }
    const baseCost = Math.max(1, card.cost - (card.costReduction ?? 0));
    const effCost = getFinalCost(baseCost, laneBonus);
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
      // Capture undo snapshot BEFORE the play
      const undoSnapshot: UndoSnapshot = {
        board: state.board,
        hand: state.hand,
        energy: state.energy,
        laneTraps: state.laneTraps,
        nextTurnEnergyPenalty: state.nextTurnEnergyPenalty,
        gameStats: { ...state.gameStats },
        playsThisTurn: state.playsThisTurn,
      };

      const res = playCard(
        state.board,
        state.hand,
        state.energy,
        "player",
        lane,
        card,
        laneBonus,
        activeTrap,
        state.playsThisTurn + 1
      );

      // Sounds: card play, then buff/debuff/remove/trap as appropriate
      if (useSettings.getState().soundOn) {
        sfx.cardPlay();
        const hasBuff = res.mutations.some((m) => m.powerDelta > 0);
        const hasDebuff = res.mutations.some((m) => m.powerDelta < 0);
        const hasRemove = res.removedCards.length > 0;
        if (hasBuff) sfx.buff();
        if (hasDebuff) sfx.debuff();
        if (hasRemove) sfx.remove();
        if (res.trapTriggered) sfx.trapTrigger();
      }

      // Floating numbers from mutations
      const floatingNumbers: FloatingNumber[] = res.mutations.map((m) => ({
        id: uuidv4(),
        uid: m.uid,
        value: m.powerDelta,
      }));

      // Track game stats
      const stats: GameStats = { ...state.gameStats };
      stats.cardsPlayedByPlayer++;
      stats.buffsApplied += res.mutations.filter((m) => m.powerDelta > 0).length;
      stats.debuffsToEnemy += res.mutations.filter(
        (m) => m.powerDelta < 0 && m.side === "enemy"
      ).length;
      stats.enemyCardsDestroyed += res.removedCards.filter(
        (rc) => rc.side === "enemy"
      ).length;
      stats.totalEnergyUsed += effCost;
      // Lane turnaround: was losing or tied, now winning
      const oldPlayerPower = state.board[lane].player.reduce(
        (a, c) => a + c.currentPower,
        0
      );
      const oldEnemyPower = state.board[lane].enemy.reduce(
        (a, c) => a + c.currentPower,
        0
      );
      const newPlayerPower = res.board[lane].player.reduce(
        (a, c) => a + c.currentPower,
        0
      );
      const newEnemyPower = res.board[lane].enemy.reduce(
        (a, c) => a + c.currentPower,
        0
      );
      if (oldPlayerPower <= oldEnemyPower && newPlayerPower > newEnemyPower) {
        stats.laneTurnarounds++;
      }

      // Update lane traps: clear if triggered (consumed), set if newTrap
      let newLaneTraps: LaneTraps = state.laneTraps;
      if (res.trapTriggered) {
        newLaneTraps = { ...newLaneTraps, [lane]: null };
      }
      if (res.newTrap) {
        newLaneTraps = { ...newLaneTraps, [lane]: res.newTrap };
      }

      // Energy penalty for next turn (Sobrecarga)
      let nextTurnEnergyPenalty = state.nextTurnEnergyPenalty;
      if (res.energyNextTurnDelta) {
        nextTurnEnergyPenalty += res.energyNextTurnDelta;
      }

      let log = pushLog(
        state.log,
        state.turn,
        "player",
        `Juega "${card.name}" en ${lane} (Poder ${res.playedCard.currentPower}).`,
        "play"
      );
      for (const m of res.mutations) {
        // Shield-only mutations (Amparo) log as "Escudo +X" instead of "Debuff 0"
        if (m.powerDelta === 0 && m.shieldDelta !== undefined && m.shieldDelta !== 0) {
          log = pushLog(
            log,
            state.turn,
            m.side === "player" ? "player" : "enemy",
            `Escudo +${m.shieldDelta} en ${m.lane}.`,
            "buff"
          );
          continue;
        }
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
      for (const rc of res.removedCards) {
        log = pushLog(
          log,
          state.turn,
          rc.side === "player" ? "player" : "enemy",
          `Carta destruida en ${rc.lane} (${rc.reason}).`,
          "debuff"
        );
      }
      if (res.trapTriggered) {
        log = pushLog(
          log,
          state.turn,
          "system",
          `¡Trampa activada en ${lane}! -${activeTrap?.value ?? 0} al poder.`,
          "debuff"
        );
      }
      if (res.newTrap) {
        log = pushLog(
          log,
          state.turn,
          "player",
          `Trampa colocada en ${lane}.`,
          "info"
        );
      }

      // ====== TRIGGER DISPATCH ======
      // ON_DEATH: for each card destroyed by this play, fire its on_death effect.
      // The dying card's full state is recovered from the pre-mutation board.
      let triggerBoard = res.board;
      for (const rc of res.removedCards) {
        const deadCard = state.board[rc.lane][rc.side].find((c) => c.uid === rc.uid);
        if (!deadCard) continue;
        const deathRes = applyOnDeathEffects(triggerBoard, rc.side, rc.lane, deadCard);
        triggerBoard = deathRes.board;
        log = pushTriggerLogs(log, state.turn, deathRes);
      }

      // ====== POWER LOG TRACKING ======
      const playedUid = res.playedCard.uid;
      const _playedOnBoard = triggerBoard[lane]["player" as "player" | "enemy"].find(c => c.uid === playedUid)
        ?? triggerBoard[lane]["enemy" as "player" | "enemy"].find(c => c.uid === playedUid);
      if (_playedOnBoard) {
        const pLog: PowerLogEntry[] = [];
        if (card.handBonus) pLog.push({ source: card.keyword ? KEYWORD_META[card.keyword].label : "Bonificador en mano", delta: card.handBonus, kind: "hand" });
        if (card.subtypes.includes(lane)) pLog.push({ source: "Sinergia", delta: 2, kind: "synergy" });
        const lbGain = getLaneBonusPower(card.category, laneBonus);
        if (lbGain > 0) pLog.push({ source: laneBonus?.label ?? "Campo", delta: lbGain, kind: "field" });
        const effBonus = res.playedCard.currentPower - card.power - card.handBonus - (card.subtypes.includes(lane) ? 2 : 0) - lbGain;
        if (effBonus !== 0) pLog.push({ source: "Efecto propio", delta: effBonus, kind: "effect" });
        if (res.trapTriggered && activeTrap) pLog.push({ source: "Trampa enemiga", delta: -activeTrap.value, kind: "trap" });
        _playedOnBoard.powerLog = pLog;
      }
      for (const m of res.mutations) {
        const arr = triggerBoard[m.lane][m.side];
        const tgt = arr.find(c => c.uid === m.uid);
        if (tgt) {
          if (!tgt.powerLog) tgt.powerLog = [];
          tgt.powerLog.push({ source: card.name, delta: m.powerDelta, kind: m.powerDelta > 0 ? "buff" : "debuff" });
        }
      }

      set({
        board: triggerBoard,
        hand: res.hand,
        energy: res.remainingEnergy,
        laneTraps: newLaneTraps,
        nextTurnEnergyPenalty,
        floatingNumbers,
        gameStats: stats,
        undoSnapshot,
        playsThisTurn: state.playsThisTurn + 1,
        legendaryBurst: card.rarity === "legendary",
        selectedCardUid: null,
        invalidPlayMsg: null,
        log,
      });

      // Clear floating numbers after they've had time to animate
      setTimeout(() => {
        get().clearFloatingNumbers();
      }, 1500);

      // Clear legendary burst after the animation completes
      if (card.rarity === "legendary") {
        setTimeout(() => {
          set({ legendaryBurst: false });
        }, 1900);
      }
    } catch (e) {
      set({
        invalidPlayMsg: (e as Error).message,
      });
    }
  },

  endTurn: async () => {
    const state = get();
    if (state.phase !== "playing") return;

    // Pasar button click sound
    if (useSettings.getState().soundOn) sfx.click();

    // 0. Show banner, freeze the board
    set({
      aiTurnPhase: "banner",
      phase: "enemy",
      selectedCardUid: null,
      invalidPlayMsg: null,
    });
    if (useSettings.getState().soundOn) sfx.turnPass();
    await sleep(1500);

    // 1. Switch to "thinking" phase
    set({ aiTurnPhase: "thinking" });
    if (useSettings.getState().soundOn) sfx.enemyTurn();
    await sleep(450);

    // Re-read state after the async waits
    const freshState = get();

    // ====== TRIGGER: END_TURN (player) ======
    // Player just pressed "Pasar" — fire their end_turn effects before AI plays.
    const playerEndRes = applyEndTurnEffects(freshState.board, "player", freshState.hand, freshState.activeLanes);
    let triggerBoard = playerEndRes.board;
    let triggerLogs: LogEntry[] = pushTriggerLogs(freshState.log, freshState.turn, playerEndRes);

    // ====== TRIGGER: START_TURN (enemy) ======
    const enemyStartRes = applyStartTurnEffects(triggerBoard, "enemy", [], freshState.activeLanes);
    triggerBoard = enemyStartRes.board;
    triggerLogs = pushTriggerLogs(triggerLogs, freshState.turn, enemyStartRes);

    // 2. Build the enemy hand: draw 3 random cards from a fresh shuffled pile.
    const resolvedDeck = resolveDeck(freshState);
    const enemyEnergy = freshState.maxEnergy;
    const enemyHand: HandCard[] = [];
    const deckPool = [...buildDrawPileFrom(resolvedDeck)];
    for (let i = 0; i < 3 && deckPool.length > 0; i++) {
      const idx = Math.floor(Math.random() * deckPool.length);
      const c = deckPool.splice(idx, 1)[0];
      enemyHand.push({ ...c, uid: uuidv4(), handBonus: 0 });
    }

    // 3. Plan and execute the AI plays on the actual board, respecting lane
    //    bonuses AND lane traps. Use the post-trigger board as starting point.
    const plan = planEnemyTurn(
      triggerBoard,
      enemyHand,
      enemyEnergy,
      freshState.laneBonuses,
      freshState.laneTraps,
      freshState.activeLanes
    );
    let workBoard = triggerBoard;
    let workEnemyHand = [...enemyHand];
    let workEnergy = enemyEnergy;
    let workTraps: LaneTraps = { ...freshState.laneTraps };
    let log = triggerLogs;
    let gameStats: GameStats = { ...freshState.gameStats };

    for (const play of plan) {
      try {
        const prePlayBoard = workBoard;
        const res = playCard(
          workBoard,
          workEnemyHand,
          workEnergy,
          "enemy",
          play.lane,
          play.card,
          freshState.laneBonuses[play.lane],
          workTraps[play.lane]
        );
        workBoard = res.board;
        workEnemyHand = res.hand;
        workEnergy = res.remainingEnergy;

        // Update traps: clear if triggered, set if newTrap
        if (res.trapTriggered) {
          workTraps = { ...workTraps, [play.lane]: null };
        }
        if (res.newTrap) {
          workTraps = { ...workTraps, [play.lane]: res.newTrap };
        }

        // Sound: enemy card play + buffs/debuffs/remove/trap
        if (useSettings.getState().soundOn) {
          sfx.cardPlay();
          if (res.mutations.some((m) => m.powerDelta > 0)) sfx.buff();
          if (res.mutations.some((m) => m.powerDelta < 0)) sfx.debuff();
          if (res.removedCards.length > 0) sfx.remove();
          if (res.trapTriggered) sfx.trapTrigger();
        }

        // Enemy stats
        gameStats.cardsPlayedByEnemy++;
        gameStats.buffsApplied += res.mutations.filter(
          (m) => m.powerDelta > 0
        ).length;
        // debuffs to PLAYER cards count as "debuffs to enemy" from enemy's
        // perspective — we still keep a single "debuffsToEnemy" counter that
        // tracks debuffs applied TO the enemy side, so for enemy plays we
        // don't increment it (the enemy isn't debuffing itself).
        // (Player cards destroyed by enemy plays don't increment
        // `enemyCardsDestroyed` either — that stat is player-centric.)

        log = pushLog(
          log,
          freshState.turn,
          "enemy",
          `Rival juega "${play.card.name}" en ${play.lane} (Poder ${res.playedCard.currentPower}).`,
          "play"
        );
        for (const m of res.mutations) {
          // Shield-only mutations (Amparo) log as "Escudo +X" instead of "0"
          if (m.powerDelta === 0 && m.shieldDelta !== undefined && m.shieldDelta !== 0) {
            log = pushLog(
              log,
              freshState.turn,
              m.side === "player" ? "player" : "enemy",
              `Escudo +${m.shieldDelta} en ${m.lane} (${m.side === "player" ? "tú" : "rival"}).`,
              "buff"
            );
            continue;
          }
          const sign = m.powerDelta > 0 ? "+" : "";
          log = pushLog(
            log,
            freshState.turn,
            m.side === "player" ? "player" : "enemy",
            `${sign}${m.powerDelta} en ${m.lane} (${m.side === "player" ? "tú" : "rival"}).`,
            m.powerDelta > 0 ? "buff" : "debuff"
          );
        }
        for (const rc of res.removedCards) {
          log = pushLog(
            log,
            freshState.turn,
            rc.side === "player" ? "player" : "enemy",
            `Carta destruida en ${rc.lane} (${rc.reason}).`,
            "debuff"
          );
        }
        if (res.trapTriggered) {
          log = pushLog(
            log,
            freshState.turn,
            "system",
            `¡Trampa enemiga activada en ${play.lane}!`,
            "debuff"
          );
        }
        if (res.newTrap) {
          log = pushLog(
            log,
            freshState.turn,
            "enemy",
            `Trampa enemiga colocada en ${play.lane}.`,
            "info"
          );
        }

        // ====== TRIGGER DISPATCH (enemy play) ======
        // ON_DEATH: for each card destroyed by the enemy's play.
        // Look up the dying card in the PRE-play board (prePlayBoard) because
        // workBoard (= res.board) has already had removedCards filtered out.
        for (const rc of res.removedCards) {
          const deadCard = prePlayBoard[rc.lane][rc.side].find((c) => c.uid === rc.uid);
          if (!deadCard) continue;
          const deathRes = applyOnDeathEffects(workBoard, rc.side, rc.lane, deadCard);
          workBoard = deathRes.board;
          log = pushTriggerLogs(log, freshState.turn, deathRes);
        }
      } catch {
        // ignore failed plays
      }
    }

    // ====== TRIGGER: END_TURN (enemy) ======
    // Enemy just finished playing — fire their end_turn effects before turn advances.
    const enemyEndRes = applyEndTurnEffects(workBoard, "enemy", [], freshState.activeLanes);
    workBoard = enemyEndRes.board;
    log = pushTriggerLogs(log, freshState.turn, enemyEndRes);

    // 4. Advance turn, apply Sobrecarga energy penalty
    const newTurn = freshState.turn + 1;
    const newMaxEnergy = Math.min(MAX_TURNS, freshState.maxEnergy + 1);
    const newEnergy = Math.max(0, newMaxEnergy + freshState.nextTurnEnergyPenalty);

    if (newTurn > MAX_TURNS) {
      // Game over
      const finalResult = computeFinalResult(workBoard, freshState.activeLanes);
      log = pushLog(
        log,
        MAX_TURNS,
        "system",
        `Fin del juego: ${finalResult.result === "WIN" ? "¡Victoria!" : finalResult.result === "LOSS" ? "Derrota" : "Empate"} (${finalResult.playerWins}-${finalResult.enemyWins}, E ${finalResult.draws}).`,
        "end"
      );
      if (useSettings.getState().soundOn) {
        if (finalResult.result === "WIN") sfx.victory();
        else if (finalResult.result === "LOSS") sfx.defeat();
      }
      set({
        board: workBoard,
        phase: "ended",
        result: finalResult.result,
        finalResult,
        lastEnemyPlays: plan,
        laneTraps: workTraps,
        nextTurnEnergyPenalty: 0,
        aiTurnPhase: "idle",
        log,
        gameStats,
        playsThisTurn: 0,
      });
      return;
    }

    // 5. Draw a card, refill energy, etc.
    const newDrawPile = [...freshState.drawPile];
    let newHand = [...freshState.hand];
    if (newHand.length < MAX_HAND_SIZE && newDrawPile.length > 0) {
      const drawn = newDrawPile.pop()!;
      newHand.push({ ...drawn, uid: uuidv4(), handBonus: 0 });
    }

    log = pushLog(
      log,
      newTurn,
      "system",
      `Turno ${newTurn} — Energía ${newEnergy}/${newMaxEnergy}${freshState.nextTurnEnergyPenalty ? ` (penalización ${freshState.nextTurnEnergyPenalty})` : ""}.`,
      "info"
    );

    // ====== TRIGGER: START_TURN (player) ======
    // Player's new turn begins — fire their start_turn effects before they play.
    const playerStartRes = applyStartTurnEffects(workBoard, "player", newHand, freshState.activeLanes);
    workBoard = playerStartRes.board;
    log = pushTriggerLogs(log, newTurn, playerStartRes);

    // ====== RE-ROLL LANE BONUSES AT TURN 4 ======
    // User spec: at the start of turn 4, do another random roll of lane bonuses
    // so the player needs to adapt their strategy mid-match (was static before).
    let newLaneBonuses = freshState.laneBonuses;
    if (newTurn === 4) {
      newLaneBonuses = rollLaneBonuses(freshState.activeLanes);
      const bonusSummary = freshState.activeLanes.map((ln) => {
        const b = newLaneBonuses[ln];
        return b ? `${ln}: ${b.label}` : `${ln}: sin bono`;
      }).join(" · ");
      log = pushLog(log, newTurn, "system", `🔮 ¡Bonos re-rollados! ${bonusSummary}`, "buff");
      // Trigger visual flash on each lane showing the new bonus
      flashLaneBonuses(newLaneBonuses);
    }

    set({
      board: workBoard,
      turn: newTurn,
      energy: newEnergy,
      maxEnergy: newMaxEnergy,
      drawPile: newDrawPile,
      hand: newHand,
      phase: "playing",
      selectedCardUid: null,
      invalidPlayMsg: null,
      lastEnemyPlays: plan,
      laneTraps: workTraps,
      laneBonuses: newLaneBonuses,
      nextTurnEnergyPenalty: 0,
      aiTurnPhase: "idle",
      log,
      gameStats,
      playsThisTurn: 0,
    });
  },

  resetGame: () => {
    get().initGame();
  },

  dismissInvalidMsg: () => set({ invalidPlayMsg: null }),

  clearFloatingNumbers: () => set({ floatingNumbers: [] }),

  undoLastPlay: () => {
    const snap = get().undoSnapshot;
    if (!snap) return;
    set({
      board: snap.board,
      hand: snap.hand,
      energy: snap.energy,
      laneTraps: snap.laneTraps,
      nextTurnEnergyPenalty: snap.nextTurnEnergyPenalty,
      gameStats: snap.gameStats,
      playsThisTurn: snap.playsThisTurn,
      undoSnapshot: null,
      selectedCardUid: null,
      invalidPlayMsg: null,
      floatingNumbers: [],
      legendaryBurst: false,
    });
  },

  setView: (view) => set({ view }),

  setDeckEditorReturn: (target) => set({ deckEditorReturn: target }),

  setPreviewCard: (c) => set({ previewCard: c }),

  loadDeckAndPool: async () => {
    set({ deckLoading: true });
    try {
      const cls = get().gameClass;
      // Pool por clase: neutrales + exclusivas de la clase (evita mezclar keywords)
      const cardPool: CardDef[] = cls === "guerrero" ? ALL_CARDS : cardPoolForClass(cls);

      const storageKey = cls === "guerrero" ? "guerrero-tactico-deck" : `guerrero-tactico-deck-${cls}`;
      // Load deck from localStorage (fallback al mazo espejo de la clase)
      let deckCardIds: string[] = CLASS_DECKS[cls].map((c) => c.id);
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed?.cardIds) && parsed.cardIds.length === 12) {
            deckCardIds = parsed.cardIds;
          }
        }
      } catch {
        // localStorage not available — use default deck
      }
      
      set({
        cardPool,
        deckCardIds,
        deckDirty: false,
        deckSaveStatus: "idle",
        deckLoading: false,
      });
    } catch (e) {
      console.error("loadDeckAndPool error:", e);
      set({ deckLoading: false, deckSaveStatus: "err" });
    }
  },

  swapCardInDeck: (index, cardId) => {
    // Allow placing a card into ANY of the 12 deck slots, even if the slot is
    // beyond the current deckCardIds length (e.g. user emptied the deck then
    // clicks slot 5 — we pad with empty strings up to that index).
    if (index < 0 || index >= 12) return;
    const { deckCardIds } = get();
    if (deckCardIds[index] === cardId) return;
    // Prevent duplicates (deck is 12 unique cards) — if the card is already in
    // the deck at a DIFFERENT slot, move it from the old slot to the new one
    // (old slot becomes empty). This is the "drag-to-rearrange" UX.
    const next = [...deckCardIds];
    // Pad with empty strings up to the target index so we can place at any slot
    while (next.length <= index) next.push("");
    if (deckCardIds.includes(cardId)) {
      const existingIdx = deckCardIds.indexOf(cardId);
      next[existingIdx] = "";  // clear old slot
    }
    next[index] = cardId;
    // Always store exactly 12 entries (pad/truncate to 12)
    while (next.length < 12) next.push("");
    set({ deckCardIds: next.slice(0, 12), deckDirty: true, deckSaveStatus: "idle" });
  },

  saveDeck: async () => {
    const { deckCardIds, gameClass } = get();
    if (deckCardIds.length !== 12) return;
    set({ deckSaveStatus: "saving" });
    try {
      const storageKey = gameClass === "guerrero" ? "guerrero-tactico-deck" : `guerrero-tactico-deck-${gameClass}`;
      // Save to localStorage (no API route needed — works in static export / APK)
      localStorage.setItem(storageKey, JSON.stringify({ cardIds: deckCardIds }));
      set({ deckSaveStatus: "ok", deckDirty: false });
      setTimeout(() => {
        if (get().deckSaveStatus === "ok") set({ deckSaveStatus: "idle" });
      }, 2000);
    } catch (e) {
      console.error("saveDeck error:", e);
      set({ deckSaveStatus: "err" });
    }
  },

  resetDeck: async () => {
    set({ deckSaveStatus: "saving" });
    try {
      // Clear localStorage and reload default deck
      const cls = get().gameClass;
      localStorage.removeItem(cls === "guerrero" ? "guerrero-tactico-deck" : `guerrero-tactico-deck-${cls}`);
      await get().loadDeckAndPool();
      set({ deckSaveStatus: "idle", deckDirty: false });
    } catch (e) {
      console.error("resetDeck error:", e);
      set({ deckSaveStatus: "err" });
    }
  },
}));

// Convenience selector for lane scores
export function laneScores(board: Board, lane: LaneId) {
  const p = board[lane].player.reduce((a, c) => a + c.currentPower, 0);
  const e = board[lane].enemy.reduce((a, c) => a + c.currentPower, 0);
  return { player: p, enemy: e };
}

// Re-export BoardCard type for components
export type { BoardCard };
