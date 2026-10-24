// ============================================================================
// COMPENSACIÓN DE PODER — cartas on_death tras reprecbrar el trigger (×0.5)
// ============================================================================
// El audit (scripts/audit-arquetipos.ts) demostró que MUERTE casi nunca dispara
// (0 procs en espejos). Pagar presupuesto completo por un efecto que no ocurre
// deja las cartas como palos de stats con presupuesto desperdiciado.
//
// Cambio: MOD_ONCE_ON_DEATH = 0.5 en balance.ts → las keywords de Último
// Aliento consumen la mitad del presupuesto → el sobrante vuelve como PODER
// base (los textos no mencionan el poder propio, así que no hay que tocarlos).
//
// Este script IMPRIME los deltas exactos para llevar cada carta al rango ±0.5.
// ============================================================================
import { ALL_CARDS_V3 } from "../src/lib/game/cards";
import { getBalanceInfo, KEYWORD_BASE_VALUES } from "../src/lib/game/balance";
import { KEYWORD_META, SCOPE_MODS, type CardDef } from "../src/lib/game/types";

const DEATH_KWS = new Set([
  "legado", "combustion", "detonacion", "floracion", "andanada",
  "chatarra", "ceniza", "muralla",
]);

function effectPoints(card: CardDef): number {
  const kw = card.keyword ?? "none";
  if (kw === "none") return 0;
  const meta = KEYWORD_META[kw];
  const base = KEYWORD_BASE_VALUES[kw];
  const hasX = meta.hasValue;
  const x = hasX ? (card.keywordValue ?? 1) : 1;
  const scope = card.scope ?? meta.scope;
  return base * x * (SCOPE_MODS[scope] ?? 1) * 0.5; // nuevo mod on_death
}

const rows: { name: string; id: string; oldPower: number; newPower: number; delta: number; status: string }[] = [];

for (const card of ALL_CARDS_V3) {
  if (!card.keyword || !DEATH_KWS.has(card.keyword)) continue;
  if (card.trigger !== "on_death") continue; // solo las de Último Aliento propio
  const info = getBalanceInfo(card);
  // Puntero de poder tras el cambio: newPower = power + (target − (power*0? + effectNew))
  const target = info.targetPTP;
  const effectNew = effectPoints(card);
  const idealPower = target - effectNew;
  const newPower = Math.max(1, Math.round(idealPower));
  const status = Math.abs(newPower + effectNew - target) <= 0.5 ? "ok" : "REVISAR";
  rows.push({ name: card.name, id: card.id, oldPower: card.power, newPower, delta: newPower - card.power, status });
}

console.log("CARTA".padEnd(26) + "PODER VIEJO".padStart(12) + "PODER NUEVO".padStart(12) + "DELTA".padStart(7) + "  ESTADO");
for (const r of rows.sort((a, b) => b.delta - a.delta)) {
  console.log(
    r.name.padEnd(26) + String(r.oldPower).padStart(12) + String(r.newPower).padStart(12) +
    (r.delta >= 0 ? "+" : "") + String(r.delta).padStart(6) + "  " + r.status
  );
}
console.log(`\nTotal: ${rows.length} cartas on_death · media delta ${(rows.reduce((a, r) => a + r.delta, 0) / rows.length).toFixed(1)}`);
