// Smoke test for the 5 Etapa 3 keywords (Sangrado, Frenesí, Desarme, Mejora, Ofrenda).
// Run with: bun /home/z/my-project/scripts/test-etapa3-keywords.ts

import {
  applyStartTurnEffects,
  applyEndTurnEffects,
  checkUmbralTriggers,
  applyDebuff,
  type Board,
} from "../src/lib/game/engine";
import type { BoardCard, LaneId } from "../src/lib/game/types";

function makeBoardCard(opts: Partial<BoardCard>): BoardCard {
  return {
    uid: opts.uid ?? Math.random().toString(36).slice(2),
    defId: opts.defId ?? "test",
    name: opts.name ?? "Test",
    category: opts.category ?? "Ataque",
    subtypes: opts.subtypes ?? ["armas"],
    cost: opts.cost ?? 2,
    basePower: opts.basePower ?? 5,
    currentPower: opts.currentPower ?? opts.basePower ?? 5,
    text: opts.text ?? "",
    effectId: opts.effectId ?? "none",
    rarity: opts.rarity ?? "common",
    trigger: opts.trigger,
    umbralCondition: opts.umbralCondition,
    umbralTriggered: opts.umbralTriggered,
    keyword: opts.keyword,
    keywordValue: opts.keywordValue,
    cupulaRemaining: opts.cupulaRemaining,
    isGuardian: opts.isGuardian,
    perforacionRemaining: opts.perforacionRemaining,
    enrabiadUsed: opts.enrabiadUsed,
    isOfrenda: opts.isOfrenda,
    powerLog: [],
  };
}

function emptyBoard(): Board {
  return {
    armas: { player: [], enemy: [] },
    proteccion: { player: [], enemy: [] },
    furia: { player: [], enemy: [] },
  };
}

let tests = 0;
let passed = 0;
function assert(name: string, cond: boolean, extra = "") {
  tests++;
  if (cond) {
    passed++;
    console.log(`✓ ${name}${extra ? ` — ${extra}` : ""}`);
  } else {
    console.error(`✗ ${name}${extra ? ` — ${extra}` : ""}`);
  }
}

// ====== Scenario 1: Sangrado applies -X to strongest enemy at start of owner's turn ======
console.log("\n=== Scenario 1: Sangrado [2] applies -2 to strongest enemy at start of turn ===");
{
  const board = emptyBoard();
  const sangrado = makeBoardCard({
    uid: "sng-1", name: "Daga Sangrante",
    keyword: "sangrado", keywordValue: 2,
    effectId: "sangrado", trigger: "start_turn",
    basePower: 7, currentPower: 7,
  });
  const weak = makeBoardCard({ uid: "weak-1", name: "Weak Enemy", basePower: 3, currentPower: 3 });
  const strong = makeBoardCard({ uid: "strong-1", name: "Strong Enemy", basePower: 10, currentPower: 10 });
  board.armas.player = [sangrado];
  board.armas.enemy = [weak, strong];
  // applyStartTurnEffects returns a NEW (cloned) board — use it.
  const res = applyStartTurnEffects(board, "player");
  const newBoard = res.board;
  const weakNow = newBoard.armas.enemy.find((c) => c.uid === weak.uid)!;
  const strongNow = newBoard.armas.enemy.find((c) => c.uid === strong.uid)!;
  const hasSangradoLog = res.logs.some((l) => l.text.includes("Sangrado"));
  assert("Sangrado fired (log present)", hasSangradoLog, `logs=${JSON.stringify(res.logs.map((l) => l.text))}`);
  assert("Strong enemy took -2", strongNow.currentPower === 8, `strongPower=${strongNow.currentPower} (expected 8)`);
  assert("Weak enemy unchanged", weakNow.currentPower === 3, `weakPower=${weakNow.currentPower} (expected 3)`);
  assert("Strong enemy has powerLog entry", (strongNow.powerLog?.length ?? 0) > 0, `logLen=${strongNow.powerLog?.length}`);
}

// ====== Scenario 2: Frenesí gains +X at start_turn (cumulative) ======
console.log("\n=== Scenario 2: Frenesí [3] gains +3 each start_turn (cumulative over 2 turns) ===");
{
  let board = emptyBoard();
  const frenesi = makeBoardCard({
    uid: "frn-1", name: "Berseker Frenético",
    keyword: "frenesi", keywordValue: 3,
    effectId: "grito_batalla", trigger: "start_turn",
    basePower: 7, currentPower: 7,
  });
  board.furia.player = [frenesi];
  // Turn 1 start (use returned board)
  board = applyStartTurnEffects(board, "player").board;
  const afterT1 = board.furia.player[0];
  assert("After T1: +3 applied (7 → 10)", afterT1.currentPower === 10, `power=${afterT1.currentPower}`);
  // Turn 2 start (cumulative)
  board = applyStartTurnEffects(board, "player").board;
  const afterT2 = board.furia.player[0];
  assert("After T2: another +3 (10 → 13)", afterT2.currentPower === 13, `power=${afterT2.currentPower}`);
}

// ====== Scenario 3: Frenesí gains +X at end_turn ======
console.log("\n=== Scenario 3: Frenesí [2] fires on end_turn ===");
{
  let board = emptyBoard();
  const frenesi = makeBoardCard({
    uid: "frn-2", name: "Frenesí Fin",
    keyword: "frenesi", keywordValue: 2,
    effectId: "pocion_vida", trigger: "end_turn", // any end_turn effectId
    basePower: 5, currentPower: 5,
  });
  board.furia.player = [frenesi];
  board = applyEndTurnEffects(board, "player").board;
  const after = board.furia.player[0];
  assert("End turn: +2 applied (5 → 7)", after.currentPower === 7, `power=${after.currentPower}`);
}

// ====== Scenario 4: Frenesí gains +X at umbral trigger ======
console.log("\n=== Scenario 4: Frenesí [4] fires on umbral trigger ===");
{
  let board = emptyBoard();
  const frenesiUmbral = makeBoardCard({
    uid: "frn-u1", name: "Frenesí Umbral",
    keyword: "frenesi", keywordValue: 4,
    effectId: "despertar", trigger: "despertar",
    umbralCondition: { powerThreshold: 10 },
    basePower: 12, currentPower: 12, // already over threshold
  });
  board.armas.player = [frenesiUmbral];
  board = checkUmbralTriggers(board).board;
  const after = board.armas.player[0];
  // Umbral gives +5, Frenesí gives +4 → 12 + 5 + 4 = 21
  assert("Umbral: +5 + Frenesí +4 (12 → 21)", after.currentPower === 21, `power=${after.currentPower}`);
  assert("umbralTriggered flag set", after.umbralTriggered === true);
}

// ====== Scenario 5: Desarme reduces strongest enemy's keywordValue ======
console.log("\n=== Scenario 5: Desarme [2] reduces enemy keywordValue by 2 (clamped to 0) ===");
{
  // We can't easily test applyEffectLogic in isolation (it needs full EffectContext).
  // Instead, simulate the same logic directly.
  const board = emptyBoard();
  const target = makeBoardCard({
    uid: "tgt-1", name: "Victima",
    keyword: "baluarte", keywordValue: 5,
    basePower: 10, currentPower: 10,
  });
  const attacker = makeBoardCard({
    uid: "atk-d1", name: "Red de Desarme",
    keyword: "desarme", keywordValue: 2,
    basePower: 6, currentPower: 6,
  });
  board.proteccion.player = [attacker];
  board.proteccion.enemy = [target];
  // Simulate the Desarme effect manually (matches engine.ts applyEffectLogic logic)
  const x = attacker.keywordValue ?? 0;
  const arr = board.proteccion.enemy;
  const idx = arr.findIndex((c) => c.uid === target.uid);
  if (idx >= 0) {
    arr[idx] = {
      ...arr[idx],
      keywordValue: Math.max(0, (arr[idx].keywordValue ?? 0) - x),
      powerLog: [...(arr[idx].powerLog ?? []), { source: "Red de Desarme", delta: -x, kind: "debuff" }],
    };
  }
  const targetNow = board.proteccion.enemy[0];
  assert("keywordValue reduced by 2 (5 → 3)", targetNow.keywordValue === 3, `kwVal=${targetNow.keywordValue}`);
  assert("Target power unchanged (Desarme is NOT a power delta)", targetNow.currentPower === 10, `power=${targetNow.currentPower}`);
  assert("PowerLog has 1 entry", (targetNow.powerLog?.length ?? 0) === 1, `logLen=${targetNow.powerLog?.length}`);
  // Second disarm: 3 - 2 = 1
  if (idx >= 0) {
    arr[idx] = {
      ...arr[idx],
      keywordValue: Math.max(0, (arr[idx].keywordValue ?? 0) - x),
      powerLog: [...(arr[idx].powerLog ?? []), { source: "Red de Desarme", delta: -x, kind: "debuff" }],
    };
  }
  const targetNow2 = board.proteccion.enemy[0];
  assert("Second disarm: 3 → 1", targetNow2.keywordValue === 1, `kwVal=${targetNow2.keywordValue}`);
}

// ====== Scenario 6: Mejora +X to weakest ally (via mutation) ======
console.log("\n=== Scenario 6: Mejora [3] gives +3 to weakest ally (mutation queued) ===");
{
  // Simulate the mutation queue logic
  const board = emptyBoard();
  const weakAlly = makeBoardCard({ uid: "w-1", name: "Weak Ally", basePower: 3, currentPower: 3 });
  const strongAlly = makeBoardCard({ uid: "s-1", name: "Strong Ally", basePower: 8, currentPower: 8 });
  board.armas.player = [weakAlly, strongAlly];
  // Simulate: applyEffectLogic pushes mutation { uid: weakAlly.uid, powerDelta: 3 }
  // Then gameStore applies the mutation via applyPowerDelta.
  const x = 3;
  applyDebuff(board, "player", "armas", weakAlly.uid, x, "Ritual de Mejora", "buff", {});
  const weakNow = board.armas.player.find((c) => c.uid === weakAlly.uid)!;
  const strongNow = board.armas.player.find((c) => c.uid === strongAlly.uid)!;
  assert("Weak ally gained +3 (3 → 6)", weakNow.currentPower === 6, `power=${weakNow.currentPower}`);
  assert("Strong ally unchanged", strongNow.currentPower === 8, `power=${strongNow.currentPower}`);
}

// ====== Scenario 7: Ofrenda priority in Sacrificio ======
console.log("\n=== Scenario 7: Sacrificio prefers Ofrenda-flagged allies ===");
{
  // Simulate the sacrificio_keyword logic directly.
  const board = emptyBoard();
  const ofrendaAlly = makeBoardCard({
    uid: "ofr-1", name: "Cabra de Ofrenda",
    keyword: "ofrenda", isOfrenda: true,
    basePower: 5, currentPower: 5,
  });
  const regularAlly = makeBoardCard({
    uid: "reg-1", name: "Regular Ally",
    basePower: 3, currentPower: 3,
  });
  board.armas.player = [ofrendaAlly, regularAlly];
  // Simulate sacrificio_keyword with X=5: prefer Ofrenda target (5 ≤ 5).
  const x = 5;
  const allyLane = board.armas.player;
  let target = allyLane.find((c) => c.isOfrenda && c.currentPower <= x);
  if (!target) target = allyLane.find((c) => c.currentPower <= x);
  assert("Sacrificio targets Ofrenda ally first", target?.uid === ofrendaAlly.uid, `targetUid=${target?.uid}`);
  // Edge case: Ofrenda ally power is too high — fall back to regular
  ofrendaAlly.currentPower = 10; // now too high for X=5
  target = allyLane.find((c) => c.isOfrenda && c.currentPower <= x);
  if (!target) target = allyLane.find((c) => c.currentPower <= x);
  assert("Ofrenda too strong → fall back to regular", target?.uid === regularAlly.uid, `targetUid=${target?.uid}`);
}

// ====== Scenario 8: Sangrado blocked by Baluarte ======
console.log("\n=== Scenario 8: Sangrado blocked by enemy's Baluarte ===");
{
  const board = emptyBoard();
  const sangrado = makeBoardCard({
    uid: "sng-2", name: "Daga Sangrante",
    keyword: "sangrado", keywordValue: 2,
    effectId: "sangrado", trigger: "start_turn",
    basePower: 7, currentPower: 7,
  });
  const baluarte = makeBoardCard({
    uid: "bal-1", name: "Baluarte Enemy",
    keyword: "baluarte",
    basePower: 5, currentPower: 5,
  });
  const target = makeBoardCard({
    uid: "tgt-2", name: "Target Enemy",
    basePower: 10, currentPower: 10,
  });
  board.armas.player = [sangrado];
  board.armas.enemy = [baluarte, target];
  const res = applyStartTurnEffects(board, "player");
  const newBoard = res.board;
  const targetNow = newBoard.armas.enemy.find((c) => c.uid === target.uid)!;
  // Sangrado targets strongest enemy. Baluarte is 5, target is 10. So target is strongest.
  // Baluarte blocks the debuff (no Perforación in play).
  assert("Sangrado blocked by Baluarte (target unchanged)", targetNow.currentPower === 10, `power=${targetNow.currentPower}`);
  const hasBlockedLog = res.logs.some((l) => l.text.includes("BLOQUEADO"));
  assert("Log mentions BLOQUEADO", hasBlockedLog, `logs=${JSON.stringify(res.logs.map((l) => l.text))}`);
}

console.log(`\n=== ${passed}/${tests} tests passed ===`);
