// ============================================================================
// AUDITORÍA DE BALANCE DE CARTAS — herramienta para programadores
// ============================================================================
// Corre con: bun /home/z/my-project/scripts/audit-card-balance.ts
//
// Lista TODAS las cartas de cards.ts con su PTP actual vs PTP objetivo
// (cost*4 + 1.5) y marca cuáles cumplen la fórmula (±0.5 de tolerancia).
//
// Uso:
//   bun run scripts/audit-card-balance.ts             # lista completa
//   bun run scripts/audit-card-balance.ts --unbalanced # solo las desbalanceadas
//   bun run scripts/audit-card-balance.ts --summary    # solo el resumen final
// ============================================================================

import { ALL_CARDS, WARRIOR_DECK } from "../src/lib/game/cards";
import {
  getBalanceInfo,
  getKeywordBaseValue,
  getTriggerModifier,
  getTargetPTP,
  TOLERANCE,
} from "../src/lib/game/balance";
import type { CardDef } from "../src/lib/game/types";
import { KEYWORD_META } from "../src/lib/game/types";

// ----- CLI flags -----
const args = process.argv.slice(2);
const onlyUnbalanced = args.includes("--unbalanced");
const onlySummary = args.includes("--summary");

// ----- Audit logic -----
const targetDeck = WARRIOR_DECK;
const targetPool = ALL_CARDS;

console.log("=".repeat(80));
console.log("AUDITORÍA DE BALANCE DE CARTAS — Guerrero Táctico TCG");
console.log("=".repeat(80));
console.log(`\nFórmula: PTP = Poder_Base + Σ(Valor_Keyword × Mod_Trigger × Mod_Scope × Mod_Once)`);
console.log(`Objetivo: PTP_esperado = Coste × 4.0 + 1.5 (tolerancia ±${TOLERANCE})\n`);
console.log(`Cartas en WARRIOR_DECK: ${targetDeck.length}`);
console.log(`Cartas en ALL_CARDS (pool completo): ${targetPool.length}\n`);

if (!onlySummary) {
  console.log("-".repeat(80));
  console.log(
    "Cartas en ALL_CARDS".padEnd(40) +
      "Coste  Poder  Efecto  PTP_Act  PTP_Obj  Δ        Status",
  );
  console.log("-".repeat(80));
}

let balanced = 0;
let marginal = 0;
let unbalanced = 0;
let missingKeywordValue = 0;
let totalAbsDelta = 0;

const unbalancedList: CardDef[] = [];
const marginalList: CardDef[] = [];

for (const card of targetPool) {
  const info = getBalanceInfo(card);

  // Stats
  if (info.status === "balanced") balanced++;
  else if (info.status === "marginal") marginalList.push(card) && marginal++;
  else unbalancedList.push(card) && unbalanced++;
  totalAbsDelta += info.absDelta;

  // Detect missing keywordValue for keywords that take [X]
  // Use KEYWORD_META.hasValue (authoritative) instead of a hardcoded list.
  const kwVal = card.keywordValue;
  if (
    card.keyword &&
    card.keyword !== "none" &&
    card.keyword !== "despertar" && // legacy alias, treated as umbral trigger
    KEYWORD_META[card.keyword]?.hasValue === true &&
    kwVal === undefined
  ) {
    missingKeywordValue++;
  }

  // Print row (unless --summary)
  if (!onlySummary) {
    const isUnbalanced = info.status === "unbalanced";
    const isMarginal = info.status === "marginal";
    if (onlyUnbalanced && !isUnbalanced && !isMarginal) continue;

    const emoji = info.status === "balanced" ? "✓" : info.status === "marginal" ? "~" : "✗";
    const statusLabel =
      info.status === "balanced"
        ? "BALANCED"
        : info.status === "marginal"
          ? "MARGINAL"
          : info.delta > 0
            ? "SOBREPUESTO"
            : "FALTANTE";

    const effectStr = info.effectPoints > 0 ? `+${info.effectPoints.toFixed(2)}` : "0";
    const deltaStr = info.delta >= 0 ? `+${info.delta.toFixed(2)}` : info.delta.toFixed(2);

    console.log(
      `${emoji} ${card.name.padEnd(38).slice(0, 38)}  ` +
        `${String(card.cost).padStart(5)}  ` +
        `${String(card.power).padStart(5)}  ` +
        `${effectStr.padStart(6)}  ` +
        `${info.current.toFixed(2).padStart(7)}  ` +
        `${info.target.toFixed(2).padStart(7)}  ` +
        `${deltaStr.padStart(7)}  ` +
        `${statusLabel}`,
    );
  }
}

// ----- Summary -----
console.log("\n" + "=".repeat(80));
console.log("RESUMEN");
console.log("=".repeat(80));
console.log(`✓ Balanceadas (|Δ| ≤ ${TOLERANCE}):    ${balanced}/${targetPool.length} (${((balanced / targetPool.length) * 100).toFixed(1)}%)`);
console.log(`~ Marginales  (|Δ| ≤ ${TOLERANCE * 2}):  ${marginal}/${targetPool.length} (${((marginal / targetPool.length) * 100).toFixed(1)}%)`);
console.log(`✗ Desbalanceadas (|Δ| > ${TOLERANCE * 2}): ${unbalanced}/${targetPool.length} (${((unbalanced / targetPool.length) * 100).toFixed(1)}%)`);
console.log(`\nΔ absoluto promedio: ${(totalAbsDelta / targetPool.length).toFixed(2)} puntos`);
console.log(`Cartas con keyword que toma [X] pero sin keywordValue: ${missingKeywordValue}`);

if (unbalanced > 0 && !onlySummary) {
  console.log("\n" + "-".repeat(80));
  console.log("CARTAS DESBALANCEADAS (sugerencias de ajuste):");
  console.log("-".repeat(80));
  for (const card of unbalancedList) {
    const info = getBalanceInfo(card);
    const idealPower = Math.round(info.target - info.effectPoints);
    const powerDiff = idealPower - card.power;
    const idealCost = Math.max(1, Math.round((info.current - 1.5) / 4));
    const costDiff = idealCost - card.cost;
    console.log(`\n  ✗ ${card.name} (cost ${card.cost}, power ${card.power}, keyword ${card.keyword}[${card.keywordValue ?? "-"}])`);
    console.log(`     PTP actual: ${info.current.toFixed(2)} | PTP esperado: ${info.target.toFixed(2)} | Δ = ${info.delta >= 0 ? "+" : ""}${info.delta.toFixed(2)}`);
    console.log(`     → Si mantenés el coste ${card.cost}: ajustá poder ${card.power} → ${idealPower} (Δpoder ${powerDiff >= 0 ? "+" : ""}${powerDiff})`);
    console.log(`     → Si mantenés el poder ${card.power}: ajustá coste ${card.cost} → ${idealCost} (Δcoste ${costDiff >= 0 ? "+" : ""}${costDiff})`);
  }
}

// ----- Trigger modifier reference -----
console.log("\n" + "=".repeat(80));
console.log("REFERENCIA — Modificadores de balance");
console.log("=".repeat(80));
console.log("\nModificadores por trigger (Mod_Trigger):");
for (const t of ["on_play", "passive", "start_turn", "end_turn", "on_death", "umbral", "reaction", "ofrenda"] as const) {
  console.log(`  ${t.padEnd(12)} × ${getTriggerModifier(t).toFixed(1)}`);
}
console.log("\nPTP esperado por coste (Coste × 4 + 1.5):");
for (let c = 1; c <= 5; c++) {
  const t = getTargetPTP(c);
  console.log(`  Coste ${c}: ${t.toFixed(1)} (rango ${t - TOLERANCE}-${t + TOLERANCE})`);
}

// ----- Keyword value reference (sample) -----
console.log("\nValor_Keyword (X=2) para keywords con [X]:");
const sampleKws = ["sacrificio", "remate", "celeridad", "sobrecarga", "eco", "refuerzo", "ventaja", "vanguardia", "aislado", "trampa", "ultimo_aliento", "vinculo", "retorno", "doble_golpe", "refugio", "emboscada", "transferencia", "renovacion", "sangrado", "frenesi", "enrabia", "espinas", "cupula", "perforacion", "desarme", "mejora"] as const;
for (const kw of sampleKws) {
  const v = getKeywordBaseValue(kw, 2);
  console.log(`  ${kw.padEnd(18)} X=2 → valor ${v.toFixed(2)}`);
}
