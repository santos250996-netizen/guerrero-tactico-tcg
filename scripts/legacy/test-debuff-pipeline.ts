// Smoke test for the Etapa 2 debuff pipeline (applyDebuff).
// Run with: bun /home/z/my-project/scripts/test-debuff-pipeline.ts

import { applyDebuff, type Board } from "../src/lib/game/engine";
import type { BoardCard, LaneId } from "../src/lib/game/types";
import { KEYWORD_META } from "../src/lib/game/types";

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

// ====== Scenario 1: Cúpula absorbs up to X points ======
console.log("\n=== Scenario 1: Cúpula absorbs 3 of -5 ===");
{
  const board = emptyBoard();
  const cupula = makeBoardCard({
    uid: "cup-1", name: "Escudo Cúpula",
    keyword: "cupula", keywordValue: 3,
    basePower: 6, currentPower: 6,
    cupulaRemaining: 3,
  });
  const ally = makeBoardCard({
    uid: "ally-1", name: "Ally",
    basePower: 5, currentPower: 5,
  });
  board.proteccion.player = [cupula, ally];
  // Apply -5 to ally — Cúpula should absorb 3, ally takes -2
  const res = applyDebuff(board, "player", "proteccion", ally.uid, -5, "Enemy Atk", "debuff", {
    sourceUid: "enemy-src", sourceSide: "enemy", sourceLane: "proteccion",
  });
  const allyNow = board.proteccion.player.find((c) => c.uid === ally.uid)!;
  const cupNow = board.proteccion.player.find((c) => c.uid === cupula.uid)!;
  assert("Cúpula absorbed 3 points", res.absorbedByCupula === 3, `absorbed=${res.appliedDelta}, cupulaRemaining=${cupNow.cupulaRemaining}`);
  assert("Ally took only -2", allyNow.currentPower === 3, `power=${allyNow.currentPower} (expected 3)`);
  assert("Cúpula pool decremented to 0", cupNow.cupulaRemaining === 0, `pool=${cupNow.cupulaRemaining}`);
  assert("Cúpula card itself unchanged", cupNow.currentPower === 6, `cupulaPower=${cupNow.currentPower}`);
}

// ====== Scenario 2: Guardián redirects debuff to self ======
console.log("\n=== Scenario 2: Guardián redirects -4 from ally to self ===");
{
  const board = emptyBoard();
  const guardian = makeBoardCard({
    uid: "grd-1", name: "Guardián",
    keyword: "guardian", isGuardian: true,
    basePower: 10, currentPower: 10,
  });
  const ally = makeBoardCard({
    uid: "ally-2", name: "Ally",
    basePower: 5, currentPower: 5,
  });
  board.proteccion.player = [guardian, ally];
  // Apply -4 to ally — should redirect to Guardián
  const res = applyDebuff(board, "player", "proteccion", ally.uid, -4, "Enemy", "debuff", {
    sourceUid: "enemy-src", sourceSide: "enemy", sourceLane: "proteccion",
  });
  const allyNow = board.proteccion.player.find((c) => c.uid === ally.uid)!;
  const grdNow = board.proteccion.player.find((c) => c.uid === guardian.uid)!;
  assert("Debuff was redirected to Guardián", res.redirectedByGuardian === guardian.uid, `finalTarget=${res.finalTargetUid}`);
  assert("Ally unchanged", allyNow.currentPower === 5, `power=${allyNow.currentPower}`);
  assert("Guardián took -4", grdNow.currentPower === 6, `power=${grdNow.currentPower} (expected 6)`);
}

// ====== Scenario 3: Baluarte blocks the debuff entirely ======
console.log("\n=== Scenario 3: Baluarte blocks -3 to ally ===");
{
  const board = emptyBoard();
  const baluarte = makeBoardCard({
    uid: "bal-1", name: "Baluarte",
    keyword: "baluarte",
    basePower: 7, currentPower: 7,
  });
  const ally = makeBoardCard({
    uid: "ally-3", name: "Ally",
    basePower: 5, currentPower: 5,
  });
  board.proteccion.player = [baluarte, ally];
  const res = applyDebuff(board, "player", "proteccion", ally.uid, -3, "Enemy", "debuff", {
    sourceUid: "enemy-src", sourceSide: "enemy", sourceLane: "proteccion",
  });
  const allyNow = board.proteccion.player.find((c) => c.uid === ally.uid)!;
  assert("Debuff was blocked", res.blockedByBaluarte === true, `blocked=${res.blockedByBaluarte}`);
  assert("Ally unchanged", allyNow.currentPower === 5, `power=${allyNow.currentPower}`);
}

// ====== Scenario 4: Perforación bypasses Cúpula ======
console.log("\n=== Scenario 4: Perforación 2 bypasses Cúpula 3 ===");
{
  const board = emptyBoard();
  const cupula = makeBoardCard({
    uid: "cup-2", name: "Escudo Cúpula",
    keyword: "cupula", keywordValue: 3,
    basePower: 6, currentPower: 6,
    cupulaRemaining: 3,
  });
  const ally = makeBoardCard({
    uid: "ally-4", name: "Ally",
    basePower: 10, currentPower: 10,
  });
  const attacker = makeBoardCard({
    uid: "atk-1", name: "Lanza Perforante",
    keyword: "perforacion", keywordValue: 2,
    perforacionRemaining: 2,
    basePower: 5, currentPower: 5,
  });
  board.proteccion.player = [cupula, ally];
  board.proteccion.enemy = [attacker];
  // Apply -5 to ally — Cúpula 3 with Perforación 2: effective cap = 3 - 2 = 1, so absorbs 1, ally takes -4
  const res = applyDebuff(board, "player", "proteccion", ally.uid, -5, "Lanza Perforante", "debuff", {
    sourceUid: attacker.uid, sourceSide: "enemy", sourceLane: "proteccion",
  });
  const allyNow = board.proteccion.player.find((c) => c.uid === ally.uid)!;
  const cupNow = board.proteccion.player.find((c) => c.uid === cupula.uid)!;
  const atkNow = board.proteccion.enemy.find((c) => c.uid === attacker.uid)!;
  assert("Cúpula absorbed only 1 (effective cap 3-2=1)", res.absorbedByCupula === 1, `absorbed=${res.absorbedByCupula}`);
  assert("Ally took -4", allyNow.currentPower === 6, `power=${allyNow.currentPower} (expected 6)`);
  assert("Cúpula pool decremented to 2", cupNow.cupulaRemaining === 2, `pool=${cupNow.cupulaRemaining}`);
  assert("Perforación consumed (now 0)", atkNow.perforacionRemaining === 0, `perforacion=${atkNow.perforacionRemaining}`);
}

// ====== Scenario 5: Espinas counter-attacks the attacker ======
console.log("\n=== Scenario 5: Espinas 2 counter-attacks attacker with -2 ===");
{
  const board = emptyBoard();
  const espinas = makeBoardCard({
    uid: "esp-1", name: "Armadura Espinada",
    keyword: "espinas", keywordValue: 2,
    trigger: "reaction",
    basePower: 6, currentPower: 6,
  });
  const attacker = makeBoardCard({
    uid: "atk-2", name: "Attacker",
    basePower: 8, currentPower: 8,
  });
  board.proteccion.player = [espinas];
  board.proteccion.enemy = [attacker];
  // Apply -3 to espinas — should counter-attack the attacker with -2
  const res = applyDebuff(board, "player", "proteccion", espinas.uid, -3, "Attacker", "debuff", {
    sourceUid: attacker.uid, sourceSide: "enemy", sourceLane: "proteccion",
  });
  const espNow = board.proteccion.player.find((c) => c.uid === espinas.uid)!;
  const atkNow = board.proteccion.enemy.find((c) => c.uid === attacker.uid)!;
  assert("Espinas reaction fired", res.espinasFired === true, `fired=${res.espinasFired}`);
  assert("Espinas took -3", espNow.currentPower === 3, `power=${espNow.currentPower}`);
  assert("Attacker took -2 counter", atkNow.currentPower === 6, `power=${atkNow.currentPower} (expected 6)`);
}

// ====== Scenario 6: Enrabia gains +X one-shot on first debuff ======
console.log("\n=== Scenario 6: Enrabia 4 gains +4 the first time it's debuffed ===");
{
  const board = emptyBoard();
  const enrabia = makeBoardCard({
    uid: "enr-1", name: "Berseker Enrabia",
    keyword: "enrabia", keywordValue: 4,
    trigger: "reaction",
    basePower: 5, currentPower: 5,
  });
  const attacker = makeBoardCard({
    uid: "atk-3", name: "Attacker",
    basePower: 8, currentPower: 8,
  });
  board.furia.player = [enrabia];
  board.furia.enemy = [attacker];
  // First debuff: -3 to enrabia, then +4 (one-shot)
  const res1 = applyDebuff(board, "player", "furia", enrabia.uid, -3, "Attacker", "debuff", {
    sourceUid: attacker.uid, sourceSide: "enemy", sourceLane: "furia",
  });
  const enr1 = board.furia.player.find((c) => c.uid === enrabia.uid)!;
  assert("Enrabia reaction fired (first time)", res1.enrabiaFired === true, `fired=${res1.enrabiaFired}`);
  assert("Enrabia: -3 + 4 = +1 net", enr1.currentPower === 6, `power=${enr1.currentPower} (expected 6: 5-3+4)`);
  assert("Enrabia enrabiadUsed flag is true", enr1.enrabiadUsed === true, `used=${enr1.enrabiadUsed}`);

  // Second debuff: -2 to enrabia, NO reaction this time
  const res2 = applyDebuff(board, "player", "furia", enrabia.uid, -2, "Attacker", "debuff", {
    sourceUid: attacker.uid, sourceSide: "enemy", sourceLane: "furia",
  });
  const enr2 = board.furia.player.find((c) => c.uid === enrabia.uid)!;
  assert("Enrabia reaction did NOT fire (second time)", res2.enrabiaFired !== true, `fired=${res2.enrabiaFired}`);
  assert("Enrabia: 6 - 2 = 4", enr2.currentPower === 4, `power=${enr2.currentPower}`);
}

// ====== Scenario 7: Buffs (delta >= 0) bypass the pipeline ======
console.log("\n=== Scenario 7: Buffs don't trigger Cúpula/Guardián/Baluarte ===");
{
  const board = emptyBoard();
  const guardian = makeBoardCard({
    uid: "grd-2", name: "Guardián",
    keyword: "guardian", isGuardian: true,
    basePower: 10, currentPower: 10,
  });
  const ally = makeBoardCard({
    uid: "ally-7", name: "Ally",
    basePower: 5, currentPower: 5,
  });
  board.proteccion.player = [guardian, ally];
  // Apply +3 to ally — should NOT be redirected to Guardián
  const res = applyDebuff(board, "player", "proteccion", ally.uid, 3, "Buffer", "buff", {});
  const allyNow = board.proteccion.player.find((c) => c.uid === ally.uid)!;
  const grdNow = board.proteccion.player.find((c) => c.uid === guardian.uid)!;
  assert("Buff applied directly to ally", res.appliedDelta === 3 && res.finalTargetUid === ally.uid, `finalTarget=${res.finalTargetUid}`);
  assert("Ally gained +3", allyNow.currentPower === 8, `power=${allyNow.currentPower}`);
  assert("Guardián unchanged", grdNow.currentPower === 10, `power=${grdNow.currentPower}`);
}

console.log(`\n=== ${passed}/${tests} tests passed ===`);
