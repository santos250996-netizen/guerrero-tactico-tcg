// ============================================================================
// SIM BALANCE V3 — winrates IA-vs-IA con las reglas sistémicas de clase
// ============================================================================
// Ejecutar: bun scripts/sim-clases-v3.ts [N]
// Ambos lados usan el MISMO planner (planEnemyTurn) bajo las MISMAS reglas —
// la única diferencia entre lados es la CLASE y su mazo oficial. Si una clase
// supera ~55% o cae bajo ~45% de forma sistemática, hay que afinar los V3_*.
// ============================================================================

import {
  createPvpState,
  joinPvpState,
  applyPvpAction,
  type PvpAction,
  type PvpSide,
  type PvpState,
} from "../src/lib/game/pvp";
import { planEnemyTurn, type Board, type ClassRulesState } from "../src/lib/game/engine";
import { CLASS_DECKS } from "../src/lib/game/cards";
import type { GameClass, LaneBonuses, LaneId } from "../src/lib/game/types";

function otherSide(s: PvpSide): PvpSide {
  return s === "a" ? "b" : "a";
}

/** El plan de jugadas de UN lado cualquiera (el planner siempre juega "enemy"). */
function planSide(state: PvpState, side: PvpSide): PvpAction[] {
  const me = state.players[side];
  const opp = state.players[otherSide(side)];

  const board = {} as Board;
  const bonuses = {} as LaneBonuses;
  const traps: Record<string, null> = {};
  me.lanes.forEach((laneId: LaneId, p: number) => {
    board[laneId] = {
      player: state.positions[p][otherSide(side)].map((c) => ({ ...c })),
      enemy: state.positions[p][side].map((c) => ({ ...c })),
    };
    bonuses[laneId] = state.positionBonuses[p];
    traps[laneId] = null;
  });

  const rules: ClassRulesState = {
    classes: { player: opp.gameClass, enemy: me.gameClass },
    comboPoints: {
      player: state.combo?.[otherSide(side)] ?? 0,
      enemy: state.combo?.[side] ?? 0,
    },
    lastSpec: {
      player: state.lastSpec?.[otherSide(side)] ?? null,
      enemy: state.lastSpec?.[side] ?? null,
    },
  };

  const plays = planEnemyTurn(board, me.hand, me.energy, bonuses, traps as never, me.lanes, rules);
  return plays.map((pl) => ({ type: "play" as const, uid: pl.card.uid, lane: pl.lane }));
}

function playGame(clsA: GameClass, clsB: GameClass): "WIN" | "LOSS" | "DRAW" {
  const state = createPvpState("SIM", { name: "A", gameClass: clsA, deck: CLASS_DECKS[clsA] });
  joinPvpState(state, { name: "B", gameClass: clsB, deck: CLASS_DECKS[clsB] });
  let guard = 0;
  while (state.phase === "playing" && guard++ < 300) {
    const side = state.activeSide;
    for (const action of planSide(state, side)) {
      try {
        applyPvpAction(state, side, action);
      } catch {
        break; // plan desincronizado → pasa
      }
    }
    if (state.phase !== "playing" || state.activeSide !== side) continue;
    applyPvpAction(state, side, { type: "pass" });
  }
  if (state.phase !== "ended") return "DRAW"; // atasco cuenta como empate
  return state.finalResultA!.result as "WIN" | "LOSS" | "DRAW";
}

const CLASSES: GameClass[] = ["guerrero", "mago", "asesino"];
const N = Number(process.argv[2] ?? 60);

console.log(`\n══ SIM BALANCE V3 — ${N} partidas por emparejamiento (IA vs IA, mazos oficiales) ══\n`);

const tally: Record<string, { w: number; l: number; d: number }> = {};
for (const a of CLASSES) {
  for (const b of CLASSES) {
    if (a === b) continue; // espejos: siempre 50% por construcción
    const key = `${a} vs ${b}`;
    tally[key] = { w: 0, l: 0, d: 0 };
  }
}

for (let g = 0; g < N; g++) {
  for (const a of CLASSES) {
    for (const b of CLASSES) {
      if (a === b) continue;
      const r = playGame(a, b);
      const key = `${a} vs ${b}`;
      if (r === "WIN") tally[key].w++;
      else if (r === "LOSS") tally[key].l++;
      else tally[key].d++;
    }
  }
}

// El par inverso es el mismo emparejamiento con colores cambiados — agrupa.
const rows = new Map<string, { a: string; b: string; ab: number; ba: number; games: number }>();
for (const a of CLASSES) {
  for (const b of CLASSES) {
    if (a >= b) continue;
    const ab = tally[`${a} vs ${b}`];
    const ba = tally[`${b} vs ${a}`];
    rows.set(`${a} ↔ ${b}`, {
      a, b,
      ab: ab.w, ba: ba.w,
      games: ab.w + ab.l + ab.d,
    });
  }
}

console.log("Emparejamiento        · wins A · wins B · empates · winrate A");
let worst = -1;
let worstPair = "";
for (const [key, r] of rows) {
  const decided = r.ab + r.ba;
  const wrA = decided > 0 ? (r.ab / decided) * 100 : 50;
  if (worst === -1 || Math.abs(wrA - 50) > Math.abs(worst - 50)) {
    worst = wrA;
    worstPair = key;
  }
  const drawN = N * 2 - decided;
  console.log(
    `${key.padEnd(20)} · ${String(r.ab).padStart(4)}    · ${String(r.ba).padStart(4)}    · ${String(drawN).padStart(4)}     · ${wrA.toFixed(1)}%`
  );
}
console.log(`\nDesbalance máximo: ${worst.toFixed(1)}% en "${worstPair}" (objetivo 45–55%).`);
console.log(worst >= 45 && worst <= 55 ? "✅ BALANCEADO" : "⚠️ AFUERA DEL OBJETIVO — ajustar V3_* en engine.ts");
