// ============================================================================
// ESTANDARIZACIÓN DE TEXTOS DE CARTAS — convierte prefijos de trigger en
// inglés a español, alineados con TRIGGER_META en types.ts.
// ============================================================================
// Mapeo:
//   "On Play:"    → "Al Jugar:"
//   "Start Turn:" → "Inicio de Turno:"
//   "End Turn:"   → "Fin de Turno:"
//   "On Death:"   → "Último Aliento:"
//   "Pasivo:"     → "Pasivo:" (sin cambio, ya está en español)
//   "Despertar"   → "Despertar" (sin cambio)
//   "Reacción:"   → "Reacción:" (sin cambio)
//   "Ofrenda:"    → "Ofrenda:" (sin cambio)
//
// Idempotente: si lo corrés de nuevo no hace nada.
// ============================================================================

import { readFile, writeFile } from "fs/promises";

const CARDS_PATH = "/home/z/my-project/src/lib/game/cards.ts";

const REPLACEMENTS: [RegExp, string][] = [
  // Order matters: longer prefixes first to avoid partial matches.
  // Use word-boundary + colon to avoid matching "On Playbook" or similar.
  [/\bOn Play:\s*/g, "Al Jugar: "],
  [/\bStart Turn:\s*/g, "Inicio de Turno: "],
  [/\bEnd Turn:\s*/g, "Fin de Turno: "],
  [/\bOn Death:\s*/g, "Último Aliento: "],
];

const content = await readFile(CARDS_PATH, "utf-8");

let totalReplacements = 0;
let newContent = content;
for (const [pattern, replacement] of REPLACEMENTS) {
  const matches = newContent.match(pattern);
  if (matches) {
    totalReplacements += matches.length;
    newContent = newContent.replace(pattern, replacement);
    console.log(`✓ "${pattern.source}" → "${replacement.trim()}" — ${matches.length} reemplazos`);
  }
}

if (totalReplacements === 0) {
  console.log("\nNo hay cambios que aplicar — todos los prefijos ya están en español.");
  process.exit(0);
}

await writeFile(CARDS_PATH, newContent, "utf-8");
console.log(`\n✓ ${totalReplacements} prefijos estandarizados en cards.ts.`);
