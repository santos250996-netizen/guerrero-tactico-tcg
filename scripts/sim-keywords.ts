// ============================================================================
// SIM KEYWORDS — auditoría de "keywords inservibles" (Task 46)
// ============================================================================
// Ejecutar: bun scripts/sim-keywords.ts [N]
// Juega N partidas IA-vs-IA por cada emparejamiento de clases (mazos oficiales
// CLASS_DECKS) + escalones de campaña (mazos del BOT de historia), con el MISMO
// planner para ambos lados, y报告a por keyword:
//   triggers · poder total movido · bajas · NOOOPS (oportunidades perdidas)
// Una keyword "inservible" = triggers raros, poder ~0 y/o noops >> triggers.
// ============================================================================

import {
  createPvpState,
  joinPvpState,
  startPvpMatch,
  applyPvpAction,
  type PvpAction,
  type PvpSide,
  type PvpState,
} from "../src/lib/game/pvp";
import { planEnemyTurn, type Board, type ClassRulesState } from "../src/lib/game/engine";
import { CLASS_DECKS, BOSS_DECKS } from "../src/lib/game/cards";
import {
  resetKeywordStats,
  keywordStatsSnapshot,
} from "../src/lib/game/keyword-stats";
import type { CardDef, GameClass, LaneBonuses, LaneId } from "../src/lib/game/types";

function otherSide(s: PvpSide): PvpSide {
  return s === "a" ? "b" : "a";
}

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

function playGame(deckA: CardDef[], deckB: CardDef[], clsA: GameClass, clsB: GameClass): void {
  const state = createPvpState("SIM", { name: "A", gameClass: clsA, deck: deckA });
  joinPvpState(state, { name: "B", gameClass: clsB, deck: deckB });
  startPvpMatch(state);
  let guard = 0;
  while (state.phase === "playing" && guard++ < 300) {
    const side = state.activeSide;
    for (const action of planSide(state, side)) {
      try {
        applyPvpAction(state, side, action);
      } catch {
        break;
      }
    }
    if (state.phase !== "playing" || state.activeSide !== side) continue;
    applyPvpAction(state, side, { type: "pass" });
  }
}

const CLASSES: GameClass[] = ["guerrero", "mago", "asesino"];
const N = Number(process.argv[2] ?? 40);

// ── Emparejamientos de clases (mazos oficiales) ──
const pairings: [CardDef[], CardDef[], GameClass, GameClass][] = [];
for (let i = 0; i < CLASSES.length; i++) {
  for (let j = i + 1; j < CLASSES.length; j++) {
    pairings.push([CLASS_DECKS[CLASSES[i]], CLASS_DECKS[CLASSES[j]], CLASSES[i], CLASSES[j]]);
  }
}

resetKeywordStats();
let games = 0;
for (let g = 0; g < N; g++) {
  for (const [dA, dB, cA, cB] of pairings) {
    playGame(dA, dB, cA, cB);
    playGame(dB, dA, cB, cA);
    games += 2;
  }
}

// ── Campaña: mazos de los jefes contra las clases (más variedad de keywords) ──
const bossClasses = Object.keys(BOSS_DECKS ?? {}) as GameClass[];
if (typeof BOSS_DECKS !== "undefined" && bossClasses.length > 0) {
  for (const bc of bossClasses) {
    for (const pc of CLASSES) {
      for (let g = 0; g < Math.max(4, Math.floor(N / 4)); g++) {
        playGame(BOSS_DECKS[bc], CLASS_DECKS[pc], bc, pc);
        playGame(CLASS_DECKS[pc], BOSS_DECKS[bc], pc, bc);
        games += 2;
      }
    }
  }
}

// ── Reporte ──
const snap = keywordStatsSnapshot();
const rows = Object.entries(snap).map(([kw, s]) => ({
  kw,
  triggers: s.triggers,
  noops: s.noops,
  power: s.power,
  kills: s.kills,
  noopPct: s.triggers + s.noops > 0 ? Math.round((s.noops * 100) / (s.triggers + s.noops)) : 0,
  perGame: +(s.power / games).toFixed(2),
}));
rows.sort((a, b) => a.perGame - b.perGame || a.triggers - b.triggers);

console.log(`═══ ${games} partidas (IA vs IA, mazos oficiales + jefes) ═══`);
console.log(
  "KEYWORD".padEnd(18) + "TRIG".padStart(6) + "NOOP%".padStart(6) +
  "PODER".padStart(9) + "PODER/JUEGO".padStart(12) + "BAJAS".padStart(7)
);
for (const r of rows) {
  console.log(
    r.kw.padEnd(18) + String(r.triggers).padStart(6) + String(r.noopPct).padStart(5) + "%" +
    String(r.power).padStart(9) + String(r.perGame).padStart(12) + String(r.kills).padStart(7)
  );
}
console.log("\nCriterio «inservible»: poder/juego ≈ 0 · noop% alto · o triggers casi nulos.");
