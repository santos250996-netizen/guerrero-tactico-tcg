// Smoke test for the Etapa 4 REACTION event system.
// Verifies that:
//   1. `debuff_applied` events fire when applyDebuff hits a target with Espinas/Enrabia
//      (these now go through `applyReactionEffects` instead of being inline in applyDebuff).
//   2. `card_played` events can be dispatched manually (the infrastructure is wired, even
//      though no keywords currently react to card_played — future keywords can hook in).
//   3. `card_destroyed` events can be dispatched manually (same — future keywords can react).
//   4. The reaction system is non-recursive: Espinas counter-attack uses applyPowerDelta
//      directly, so it doesn't emit another debuff_applied event (no infinite loop).
//   5. applyReactionEffects is idempotent across multiple calls (Enrabia only fires once
//      because of enrabiadUsed flag).

import { applyDebuff, applyReactionEffects, type Board } from "../src/lib/game/engine";
import type { BoardCard, CardPlayedEvent, CardDestroyedEvent } from "../src/lib/game/engine";
import type { LaneId } from "../src/lib/game/types";

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

// ====== Scenario 1: debuff_applied event fires Espinas (via applyDebuff) ======
console.log("\n=== Scenario 1: applyDebuff emits debuff_applied → Espinas counter-attacks ===");
{
  const board = emptyBoard();
  const espinas = makeBoardCard({
    uid: "esp-1", name: "Armadura Espinada",
    keyword: "espinas", keywordValue: 2, trigger: "reaction",
    basePower: 6, currentPower: 6,
  });
  const attacker = makeBoardCard({
    uid: "atk-1", name: "Attacker",
    basePower: 8, currentPower: 8,
  });
  board.proteccion.player = [espinas];
  board.proteccion.enemy = [attacker];
  // applyDebuff should emit debuff_applied event internally and call applyReactionEffects.
  const res = applyDebuff(board, "player", "proteccion", espinas.uid, -3, "Attacker", "debuff", {
    sourceUid: attacker.uid, sourceSide: "enemy", sourceLane: "proteccion",
  });
  const espNow = board.proteccion.player.find((c) => c.uid === espinas.uid)!;
  const atkNow = board.proteccion.enemy.find((c) => c.uid === attacker.uid)!;
  assert("Espinas fired flag set on DebuffResult", res.espinasFired === true, `fired=${res.espinasFired}`);
  assert("Espinas took -3 (6 → 3)", espNow.currentPower === 3, `power=${espNow.currentPower}`);
  assert("Attacker took -2 counter via event system", atkNow.currentPower === 6, `power=${atkNow.currentPower}`);
  // Verify no infinite recursion: attacker's powerLog should have just ONE Espinas entry,
  // not multiple (which would happen if the counter-debuff re-triggered Espinas).
  const espinasEntries = atkNow.powerLog?.filter((e) => e.source.includes("Espinas")) ?? [];
  assert("No infinite recursion (only 1 Espinas entry in attacker's powerLog)", espinasEntries.length === 1, `entries=${espinasEntries.length}`);
}

// ====== Scenario 2: debuff_applied event fires Enrabia (one-shot) ======
console.log("\n=== Scenario 2: applyDebuff emits debuff_applied → Enrabia gains +4 one-shot ===");
{
  const board = emptyBoard();
  const enrabia = makeBoardCard({
    uid: "enr-1", name: "Berseker Enrabia",
    keyword: "enrabia", keywordValue: 4, trigger: "reaction",
    basePower: 5, currentPower: 5,
  });
  const attacker = makeBoardCard({
    uid: "atk-2", name: "Attacker",
    basePower: 8, currentPower: 8,
  });
  board.furia.player = [enrabia];
  board.furia.enemy = [attacker];
  // First debuff — should trigger Enrabia (+4)
  const res1 = applyDebuff(board, "player", "furia", enrabia.uid, -3, "Attacker", "debuff", {
    sourceUid: attacker.uid, sourceSide: "enemy", sourceLane: "furia",
  });
  const enr1 = board.furia.player.find((c) => c.uid === enrabia.uid)!;
  assert("Enrabia fired flag set on DebuffResult (1st time)", res1.enrabiaFired === true, `fired=${res1.enrabiaFired}`);
  assert("Enrabia: -3 + 4 = +1 net (5 → 6)", enr1.currentPower === 6, `power=${enr1.currentPower}`);
  assert("enrabiadUsed flag set", enr1.enrabiadUsed === true, `used=${enr1.enrabiadUsed}`);

  // Second debuff — should NOT trigger Enrabia (already used)
  const res2 = applyDebuff(board, "player", "furia", enrabia.uid, -2, "Attacker", "debuff", {
    sourceUid: attacker.uid, sourceSide: "enemy", sourceLane: "furia",
  });
  const enr2 = board.furia.player.find((c) => c.uid === enrabia.uid)!;
  assert("Enrabia did NOT fire (2nd time)", res2.enrabiaFired !== true, `fired=${res2.enrabiaFired}`);
  assert("Enrabia: 6 - 2 = 4 (no +4 bonus this time)", enr2.currentPower === 4, `power=${enr2.currentPower}`);
}

// ====== Scenario 3: card_played event can be dispatched manually ======
console.log("\n=== Scenario 3: card_played event dispatches (no current keywords react, but infra works) ===");
{
  const board = emptyBoard();
  // No reaction cards on the board — event should be a no-op (return empty logs).
  const event: CardPlayedEvent = {
    type: "card_played",
    side: "enemy", // rival played
    lane: "armas",
    cardUid: "fake-enemy-uid",
    cardName: "Rival Card",
    cardCategory: "Ataque",
    cardSubtypes: ["armas"],
  };
  const res = applyReactionEffects(board, "player", event);
  assert("card_played dispatches without errors", res.logs.length === 0, `logs=${res.logs.length}`);
  assert("espinasFired is undefined/false (no reaction)", !res.espinasFired, `fired=${res.espinasFired}`);
}

// ====== Scenario 4: card_destroyed event can be dispatched manually ======
console.log("\n=== Scenario 4: card_destroyed event dispatches (no current keywords react) ===");
{
  const board = emptyBoard();
  const event: CardDestroyedEvent = {
    type: "card_destroyed",
    side: "player", // an ally was destroyed
    lane: "furia",
    cardUid: "fake-ally-uid",
    cardName: "Fallen Ally",
    cardCategory: "Ataque",
    reason: "sacrificio",
  };
  const res = applyReactionEffects(board, "player", event);
  assert("card_destroyed dispatches without errors", res.logs.length === 0, `logs=${res.logs.length}`);
}

// ====== Scenario 5: applyDebuff WITHOUT sourceUid (e.g. on_death debuffs) doesn't fire reactions ======
console.log("\n=== Scenario 5: debuff without sourceUid skips reactions (no infinite loop from on_death) ===");
{
  const board = emptyBoard();
  const espinas = makeBoardCard({
    uid: "esp-2", name: "Espinas Card",
    keyword: "espinas", keywordValue: 3, trigger: "reaction",
    basePower: 5, currentPower: 5,
  });
  board.armas.enemy = [espinas];
  // No sourceUid provided (simulates on_death debuff where source is no longer on board)
  const res = applyDebuff(board, "enemy", "armas", espinas.uid, -3, "Dying Card", "on_death", {});
  const espNow = board.armas.enemy.find((c) => c.uid === espinas.uid)!;
  assert("Espinas did NOT fire (no sourceUid)", !res.espinasFired, `fired=${res.espinasFired}`);
  assert("Espinas still took -3 (debuff applied)", espNow.currentPower === 2, `power=${espNow.currentPower}`);
}

// ====== Scenario 6: debuff_applied event does NOT fire if debuff was fully absorbed ======
console.log("\n=== Scenario 6: fully-absorbed debuff (Cúpula) does NOT fire Enrabia ===");
{
  const board = emptyBoard();
  const cupula = makeBoardCard({
    uid: "cup-1", name: "Cúpula",
    keyword: "cupula", keywordValue: 5,
    cupulaRemaining: 5,
    basePower: 4, currentPower: 4,
  });
  const enrabia = makeBoardCard({
    uid: "enr-2", name: "Enrabia",
    keyword: "enrabia", keywordValue: 4, trigger: "reaction",
    basePower: 5, currentPower: 5,
  });
  const attacker = makeBoardCard({
    uid: "atk-3", name: "Attacker",
    basePower: 8, currentPower: 8,
  });
  board.proteccion.player = [cupula, enrabia];
  board.proteccion.enemy = [attacker];
  // Apply -3 to enrabia — Cúpula should absorb 3 (pool 5 → 2), enrabia takes 0.
  // Since enrabia didn't actually take damage, no reaction should fire.
  const res = applyDebuff(board, "player", "proteccion", enrabia.uid, -3, "Attacker", "debuff", {
    sourceUid: attacker.uid, sourceSide: "enemy", sourceLane: "proteccion",
  });
  const enrNow = board.proteccion.player.find((c) => c.uid === enrabia.uid)!;
  const cupNow = board.proteccion.player.find((c) => c.uid === cupula.uid)!;
  assert("Cúpula absorbed 3 (pool 5 → 2)", cupNow.cupulaRemaining === 2, `pool=${cupNow.cupulaRemaining}`);
  assert("Enrabia took 0 damage (debuff fully absorbed)", enrNow.currentPower === 5, `power=${enrNow.currentPower}`);
  assert("appliedDelta is 0 (no damage)", res.appliedDelta === 0, `applied=${res.appliedDelta}`);
  assert("Enrabia did NOT fire (no damage taken)", !res.enrabiaFired, `fired=${res.enrabiaFired}`);
  assert("enrabiadUsed flag still false", !enrNow.enrabiadUsed, `used=${enrNow.enrabiadUsed}`);
}

console.log(`\n=== ${passed}/${tests} tests passed ===`);
