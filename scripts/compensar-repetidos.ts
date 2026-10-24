// ============================================================================
// COMPENSACIÓN DE PODER — cartas start_turn/end_turn tras eliminar el
// descuento MOD_ONCE_PER_TURN (0.8 → 1.0)
// ============================================================================
// Con el mod a 1.0, cada keyword de trigger repetido consume 0.2 × base × X ×
// scope MÁS presupuesto que antes → el poder base de la carta baja ese margen
// para volver al PTP objetivo (±0.5). IMPRIME los deltas exactos.
// ============================================================================
import { ALL_CARDS_V3 } from "../src/lib/game/cards";
import { getBalanceInfo, KEYWORD_BASE_VALUES } from "../src/lib/game/balance";
import { KEYWORD_META, SCOPE_MODS, type CardDef, type Trigger } from "../src/lib/game/types";

function effectPoints(card: CardDef, onceMod: number): number {
  const kw = card.keyword ?? "none";
  if (kw === "none") return 0;
  const meta = KEYWORD_META[kw];
  const trigger: Trigger = card.trigger ?? meta.trigger;
  if (trigger !== "start_turn" && trigger !== "end_turn") return 0;
  const base = KEYWORD_BASE_VALUES[kw];
  const x = meta.hasValue ? (card.keywordValue ?? 1) : 1;
  const scope = card.scope ?? meta.scope;
  return base * x * (SCOPE_MODS[scope] ?? 1) * onceMod;
}

const rows: { name: string; id: string; oldPower: number; newPower: number; delta: number; status: string }[] = [];

for (const card of ALL_CARDS_V3) {
  if (!card.keyword || card.keyword === "none") continue;
  const trigger = card.trigger ?? KEYWORD_META[card.keyword].trigger;
  if (trigger !== "start_turn" && trigger !== "end_turn") continue;
  const oldEffect = effectPoints(card, 0.8);
  const newEffect = effectPoints(card, 1.0);
  const freed = newEffect - oldEffect; // presupuesto extra que consume la keyword
  const info = getBalanceInfo(card);
  const idealPower = info.targetPTP - newEffect;
  const newPower = Math.max(1, Math.round(idealPower));
  const status = Math.abs(newPower + newEffect - info.targetPTP) <= 0.5 ? "ok" : "REVISAR";
  rows.push({ name: card.name, id: card.id, oldPower: card.power, newPower, delta: newPower - card.power, status });
}

rows.sort((a, b) => a.delta - b.delta);
for (const r of rows) {
  console.log(
    `  ${r.name.padEnd(28)} ${String(r.oldPower).padStart(4)} → ${String(r.newPower).padStart(4)} (${r.delta >= 0 ? "+" : ""}${r.delta})  ${r.status}`
  );
}
console.log(`\nTotal: ${rows.length} cartas de trigger repetido · delta medio ${(rows.reduce((a, r) => a + r.delta, 0) / rows.length).toFixed(1)}`);
console.log(`\nCodemod listo:`, JSON.stringify(rows.map((r) => ({ id: r.id, power: r.newPower }))));
