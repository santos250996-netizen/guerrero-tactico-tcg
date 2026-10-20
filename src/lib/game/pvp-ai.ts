"use client";

// ============================================================================
// IA del modo historia — conduce el lado "b" de una PvpState local.
// Reutiliza el planner del solitario (planEnemyTurn/scoreAIPlay) sobre un
// Board traducido: los carriles se indexan con los del BOT y el bot es el
// lado "enemy" del engine (así lo espera scoreAIPlay).
// Devuelve las acciones en ORDEN; el store las ejecuta con applyPvpAction.
// ============================================================================

import type { PvpAction, PvpState } from "./pvp";
import { planEnemyTurn, type ClassRulesState, type Board } from "./engine";
import type { LaneBonuses, LaneId } from "./types";

export interface BotPlan {
  actions: PvpAction[];
  /** Score del mejor plan (para logs/debug). */
  bestScore: number;
}

export function planBotTurn(state: PvpState): BotPlan {
  if (state.phase !== "playing") return { actions: [], bestScore: 0 };
  const me = state.players.b;
  const opp = state.players.a;

  // Board con MIS claves de carril; el bot es "enemy" (el planner juega así)
  const board = {} as Board;
  me.lanes.forEach((laneId: LaneId, p: number) => {
    board[laneId] = {
      player: state.positions[p].a.map((c) => ({ ...c })),
      enemy: state.positions[p].b.map((c) => ({ ...c })),
    };
  });

  const bonuses = {} as LaneBonuses;
  me.lanes.forEach((laneId: LaneId, p: number) => {
    bonuses[laneId] = state.positionBonuses[p];
  });

  // PvP no usa trampas: mapa vacío por carril
  const traps: Record<string, null> = {};
  for (const lane of me.lanes) traps[lane] = null;

  // REGLAS SISTÉMICAS V3: el bot planifica bajo las MISMAS reglas que el
  // jugador (línea roja: sin trucos). Board relativo: player = rival (a).
  const rules: ClassRulesState = {
    classes: { player: opp.gameClass, enemy: me.gameClass },
    comboPoints: { player: state.combo?.a ?? 0, enemy: state.combo?.b ?? 0 },
    lastSpec: { player: state.lastSpec?.a ?? null, enemy: state.lastSpec?.b ?? null },
  };

  const plays = planEnemyTurn(board, me.hand, me.energy, bonuses, traps as never, me.lanes, rules);

  return {
    actions: plays.map((pl) => ({ type: "play" as const, uid: pl.card.uid, lane: pl.lane })),
    bestScore: plays.length > 0 ? Math.max(...plays.map((p) => p.score)) : 0,
  };
}
