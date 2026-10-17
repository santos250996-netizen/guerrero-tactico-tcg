// Quick smoke test for the 10 new keywords + REACTION trigger
// Verifies that getBalanceInfo returns sensible values for each new keyword
// without crashing. Run with: bun /home/z/my-project/scripts/test-new-keywords-balance.ts

import {
  getBalanceInfo,
  getKeywordBaseValue,
  getTriggerModifier,
} from "../src/lib/game/balance";
import type { CardDef, Keyword, Trigger } from "../src/lib/game/types";
import { TRIGGER_MODS, SCOPE_MODS, MOD_ONCE_SINGLE, MOD_ONCE_PER_TURN } from "../src/lib/game/types";

const NEW_KEYWORDS: { kw: Keyword; X: number; trigger: Trigger }[] = [
  { kw: "sangrado", X: 2, trigger: "start_turn" },
  { kw: "frenesi", X: 3, trigger: "start_turn" },
  { kw: "enrabia", X: 4, trigger: "reaction" },
  { kw: "espinas", X: 2, trigger: "reaction" },
  { kw: "cupula", X: 3, trigger: "passive" },
  { kw: "guardian", X: 0, trigger: "passive" },
  { kw: "perforacion", X: 2, trigger: "on_play" },
  { kw: "desarme", X: 2, trigger: "on_play" },
  { kw: "mejora", X: 3, trigger: "on_play" },
  { kw: "ofrenda", X: 0, trigger: "passive" },
];

console.log("=== TRIGGER_MODS ===");
console.log(TRIGGER_MODS);
console.log("\n=== SCOPE_MODS ===");
console.log(SCOPE_MODS);
console.log(`MOD_ONCE_SINGLE = ${MOD_ONCE_SINGLE}`);
console.log(`MOD_ONCE_PER_TURN = ${MOD_ONCE_PER_TURN}`);

console.log("\n=== getTriggerModifier('reaction') ===");
console.log(getTriggerModifier("reaction"));

console.log("\n=== Testing each new keyword with cost 3 (target PTP 13.5) ===");
const TARGET_COST = 3;
const targetPTP = 3 * 4.0 + 1.5;
console.log(`Target PTP for cost ${TARGET_COST}: ${targetPTP}\n`);

for (const { kw, X, trigger } of NEW_KEYWORDS) {
  const baseValue = getKeywordBaseValue(kw, X);
  const triggerMod = getTriggerModifier(trigger);
  const effectPoints = baseValue * triggerMod;
  // Pick a base power so the card is balanced: power = targetPTP - effectPoints
  const idealPower = Math.max(0, Math.round(targetPTP - effectPoints));
  const card: CardDef = {
    id: `test_${kw}`,
    name: `Test ${kw}`,
    category: "Ataque",
    subtypes: ["armas"],
    cost: TARGET_COST,
    power: idealPower,
    text: "test",
    effectId: "none",
    rarity: "common",
    keyword: kw,
    keywordValue: X || undefined,
    trigger,
  };
  const info = getBalanceInfo(card);
  const emoji = info.status === "balanced" ? "✓" : info.status === "marginal" ? "~" : "✗";
  console.log(
    `${emoji} ${kw.padEnd(12)} | X=${X} | trigger=${trigger.padEnd(10)} | ` +
    `valor=${baseValue.toFixed(2)} | effect=${effectPoints.toFixed(2)} | ` +
    `power=${idealPower} | PTP=${info.current.toFixed(2)} | ` +
    `target=${info.target.toFixed(2)} | delta=${info.delta.toFixed(2)} | ${info.status}`
  );
}

console.log("\n=== Smoke test complete ===");
