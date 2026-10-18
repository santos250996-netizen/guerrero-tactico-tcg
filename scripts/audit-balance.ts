// Auditoría PTP de todo el catálogo (V2 guerrero + V3 mago/asesino)
import { ALL_CARDS_V3, CLASS_DECKS } from "../src/lib/game/cards";
import { getBalanceInfo } from "../src/lib/game/balance";

const byClass = Object.entries(CLASS_DECKS) as [string, typeof ALL_CARDS_V3][];

console.log("=== AUDITORÍA PTP — catálogo completo ===");
let ok = 0, over = 0, under = 0;
const problems: string[] = [];

for (const card of ALL_CARDS_V3) {
  const info = getBalanceInfo(card);
  if (info.status === "ok") ok++;
  else if (info.status === "over") over++;
  else under++;
  if (!info.balanced) {
    problems.push(
      `[${info.status.toUpperCase()}] ${card.name.padEnd(24)} coste ${info.cost} · PTP ${info.currentPTP.toFixed(1)} / objetivo ${info.targetPTP.toFixed(1)} · delta ${info.delta > 0 ? "+" : ""}${info.delta.toFixed(1)}`
    );
  }
}

console.log(`Total: ${ALL_CARDS_V3.length} cartas → OK ${ok} · SOBRE ${over} · BAJO ${under}\n`);
if (problems.length) {
  console.log("Cartas fuera de rango (±0.5):");
  problems.forEach((p) => console.log("  " + p));
}

console.log("\n=== POR CLASE ===");
for (const [cls, deck] of byClass) {
  const stat = { ok: 0, over: 0, under: 0 };
  for (const c of deck) {
    const s = getBalanceInfo(c).status;
    stat[s]++;
  }
  const avgDelta =
    deck.reduce((a, c) => a + getBalanceInfo(c).delta, 0) / deck.length;
  console.log(
    `${cls.padEnd(10)} ${deck.length} cartas · ok ${stat.ok} / sobre ${stat.over} / bajo ${stat.under} · delta medio ${avgDelta >= 0 ? "+" : ""}${avgDelta.toFixed(2)}`
  );
}
