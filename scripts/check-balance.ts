// =============================================================================
// GUERRERO TÁCTICO TCG — Balance Audit CLI Tool
// =============================================================================
// Usage (from project root):
//   bun run scripts/check-balance.ts            # all cards, full report
//   bun run scripts/check-balance.ts --unbalanced   # only unbalanced cards
//   bun run scripts/check-balance.ts --marginal     # only marginal cards
//   bun run scripts/check-balance.ts --group cost   # group by energy cost
//
// This script is for DESIGNERS only. It audits every card in the pool
// (WARRIOR_DECK, BASIC_CARDS, TACTICAL_CARDS) against the PTP mathematical
// balance formula:
//
//   PTP_objetivo = (Coste_Energía * 4.0) + 1.5
//   Puntos_Efecto = SUMA(Valor_Keyword * Modificador_Trigger)
//   Poder_Base + Puntos_Efecto = PTP_objetivo  (tolerancia ±0.5)
//
// Output is a color-coded (ANSI) table to stdout, sorted by |delta| (most
// unbalanced first).
// =============================================================================

import {
  WARRIOR_DECK,
  BASIC_CARDS,
  TACTICAL_CARDS,
} from "../src/lib/game/cards";
import {
  getBalanceInfo,
  getDeckBalanceSummary,
  type BalanceInfo,
} from "../src/lib/game/balance";
import type { CardDef } from "../src/lib/game/types";

// ----- ANSI color codes for terminal output -----
const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

const STATUS_COLOR: Record<BalanceInfo["status"], string> = {
  balanced: ANSI.green,
  marginal: ANSI.yellow,
  unbalanced: ANSI.red,
};

const STATUS_SYMBOL: Record<BalanceInfo["status"], string> = {
  balanced: "✓",
  marginal: "~",
  unbalanced: "✗",
};

// ----- Parse CLI args -----
const args = process.argv.slice(2);
const onlyUnbalanced = args.includes("--unbalanced");
const onlyMarginal = args.includes("--marginal");
const groupByCost = args.includes("--group", "cost") || args.includes("--group=cost");

// ----- Gather all cards -----
const allCards: CardDef[] = [...WARRIOR_DECK, ...BASIC_CARDS, ...TACTICAL_CARDS];

console.log(`${ANSI.bold}${ANSI.cyan}═══════════════════════════════════════════════════════════════════════${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}  GUERRERO TÁCTICO TCG — AUDITORÍA DE BALANCE PTP${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}═══════════════════════════════════════════════════════════════════════${ANSI.reset}`);
console.log(`${ANSI.dim}Fórmula: PTP = (coste * 4.0) + 1.5 ± 0.5 (tolerancia)${ANSI.reset}`);
console.log(`${ANSI.dim}Cartas auditadas: ${allCards.length} (WARRIOR_DECK=${WARRIOR_DECK.length}, BASIC=${BASIC_CARDS.length}, TACTICAL=${TACTICAL_CARDS.length})${ANSI.reset}`);
console.log();

// ----- Aggregate summary -----
const summary = getDeckBalanceSummary(allCards);
const pctBalanced = ((summary.balanced / summary.total) * 100).toFixed(1);
const pctMarginal = ((summary.marginal / summary.total) * 100).toFixed(1);
const pctUnbalanced = ((summary.unbalanced / summary.total) * 100).toFixed(1);

console.log(`${ANSI.bold}Resumen agregado:${ANSI.reset}`);
console.log(`  ${ANSI.green}✓ Balanceadas:   ${summary.balanced}/${summary.total} (${pctBalanced}%)${ANSI.reset}`);
console.log(`  ${ANSI.yellow}~ Marginales:     ${summary.marginal}/${summary.total} (${pctMarginal}%)${ANSI.reset}`);
console.log(`  ${ANSI.red}✗ Desbalanceadas: ${summary.unbalanced}/${summary.total} (${pctUnbalanced}%)${ANSI.reset}`);
console.log(`  ${ANSI.dim}Δ medio:         ${summary.avgDelta >= 0 ? "+" : ""}${summary.avgDelta.toFixed(2)}${ANSI.reset}`);
console.log();

// ----- Per-card table -----
function printCardRow(card: CardDef, idx: number) {
  const bal = getBalanceInfo(card);
  const color = STATUS_COLOR[bal.status];
  const sym = STATUS_SYMBOL[bal.status];
  const sign = bal.delta > 0 ? "+" : "";
  const keyword = card.keyword ?? "—";
  const trigger = card.trigger ?? "on_play";
  // Truncate name to 24 chars for alignment
  const nameStr = card.name.padEnd(24).slice(0, 24);
  const costStr = String(card.cost).padStart(2);
  const powerStr = String(card.power).padStart(3);
  const targetStr = bal.target.toFixed(1).padStart(5);
  const currentStr = bal.current.toFixed(1).padStart(6);
  const deltaStr = `${sign}${bal.delta.toFixed(1)}`.padStart(6);
  const kwStr = (keyword === "—" ? "—" : `${keyword}[${card.keywordValue ?? "-"}]`).padEnd(14).slice(0, 14);
  const trgStr = trigger.padEnd(11).slice(0, 11);
  console.log(
    `  ${ANSI.gray}${String(idx + 1).padStart(3)}${ANSI.reset} ` +
    `${color}${sym}${ANSI.reset} ` +
    `${ANSI.bold}${nameStr}${ANSI.reset} ` +
    `${ANSI.gray}c=${costStr} p=${powerStr}${ANSI.reset}  ` +
    `PTP ${ANSI.cyan}${currentStr}${ANSI.reset}/${ANSI.dim}${targetStr}${ANSI.reset}  ` +
    `Δ ${color}${deltaStr}${ANSI.reset}  ` +
    `${ANSI.dim}${kwStr} ${trgStr}${ANSI.reset}`
  );
}

// Filter + sort
const items = allCards
  .map((card, idx) => ({ card, idx, bal: getBalanceInfo(card) }))
  .filter(({ bal }) => {
    if (onlyUnbalanced) return bal.status === "unbalanced";
    if (onlyMarginal) return bal.status === "marginal";
    return true;
  })
  .sort((a, b) => {
    // Most unbalanced first (largest |delta|)
    const aDelta = a.bal.absDelta;
    const bDelta = b.bal.absDelta;
    if (bDelta !== aDelta) return bDelta - aDelta;
    // Then by cost
    return a.card.cost - b.card.cost;
  });

if (groupByCost) {
  // Group by cost
  const byCost: Record<number, typeof items> = {};
  for (const it of items) {
    if (!byCost[it.card.cost]) byCost[it.card.cost] = [];
    byCost[it.card.cost].push(it);
  }
  for (const cost of Object.keys(byCost).map(Number).sort((a, b) => a - b)) {
    console.log(`${ANSI.bold}${ANSI.blue}── Coste ${cost} ──${ANSI.reset} ${ANSI.dim}(PTP objetivo = ${(cost * 4 + 1.5).toFixed(1)} ± 0.5)${ANSI.reset}`);
    for (const it of byCost[cost]) printCardRow(it.card, it.idx);
    console.log();
  }
} else {
  console.log(`${ANSI.bold}Detalle por carta (ordenadas por |Δ| descendente):${ANSI.reset}`);
  console.log(`${ANSI.dim}  #   S  Nombre                       Coste/Poder  PTP actual/objetivo  Δ        Keyword           Trigger${ANSI.reset}`);
  console.log(`${ANSI.dim}  ─── ─ ──────────────────────────── ──────────── ───────────────────── ──────── ─────────────── ───────────${ANSI.reset}`);
  for (const it of items) printCardRow(it.card, it.idx);
}

console.log();
console.log(`${ANSI.dim}Leyenda:  ${ANSI.green}✓ Balanceada (|Δ| ≤ 0.5)${ANSI.reset}  ${ANSI.yellow}~ Marginal (0.5 < |Δ| ≤ 1.0)${ANSI.reset}  ${ANSI.red}✗ Desbalanceada (|Δ| > 1.0)${ANSI.reset}`);
console.log(`${ANSI.dim}Δ positivo = carta sobrepasa el PTP objetivo (muy fuerte) · negativo = le falta poder (muy débil)${ANSI.reset}`);
