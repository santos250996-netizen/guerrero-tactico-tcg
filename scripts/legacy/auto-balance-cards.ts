// ============================================================================
// AUTO-BALANCEO DE CARTAS — ajusta poder/coste para cumplir la fórmula PTP.
// ============================================================================
// Estrategia:
//   1. Para cada carta desbalanceada (|Δ| > 0.5), calcular el poder ideal
//      manteniendo el coste actual: poderIdeal = PTP_objetivo - effectPoints.
//   2. Si poderIdeal >= 1 (mínimo razonable), ajustar el poder a ese valor.
//   3. Si poderIdeal < 1, en cambio subir el coste manteniendo el poder:
//      costeIdeal = ceil((poder + effectPoints - 1.5) / 4)
//   4. Reemplazar `power: X` o `cost: Y` en cards.ts con los nuevos valores.
//
// NOTA: Esto edita src/lib/game/cards.ts en sitio. Hacé un commit/git diff
// después para revisar los cambios antes de pushear.
// ============================================================================

import { readFile, writeFile } from "fs/promises";
import { ALL_CARDS } from "../src/lib/game/cards";
import { getBalanceInfo } from "../src/lib/game/balance";
import type { CardDef } from "../src/lib/game/types";

const CARDS_PATH = "/home/z/my-project/src/lib/game/cards.ts";

interface Change {
  cardId: string;
  cardName: string;
  field: "power" | "cost";
  oldValue: number;
  newValue: number;
  oldDelta: number;
  newDelta: number;
  reason: string;
}

const changes: Change[] = [];

for (const card of ALL_CARDS) {
  const info = getBalanceInfo(card);
  if (info.status === "balanced") continue; // |Δ| ≤ 0.5, no tocar

  // Calcular poder ideal manteniendo el coste
  const targetPower = info.target - info.effectPoints;

  if (targetPower >= 1) {
    // Caso A: ajustar poder
    const newPower = Math.round(targetPower);
    if (newPower !== card.power) {
      // Simular el cambio y verificar que el nuevo Δ está dentro de tolerancia
      const newCard: CardDef = { ...card, power: newPower };
      const newInfo = getBalanceInfo(newCard);
      changes.push({
        cardId: card.id,
        cardName: card.name,
        field: "power",
        oldValue: card.power,
        newValue: newPower,
        oldDelta: info.delta,
        newDelta: newInfo.delta,
        reason: `PTP actual ${info.current.toFixed(2)} → ${newInfo.current.toFixed(2)} (esperado ${info.target.toFixed(2)})`,
      });
    }
  } else {
    // Caso B: ajustar coste (poder muy bajo, no se puede bajar más)
    // costeIdeal = ceil((poder + effectPoints - 1.5) / 4)
    const idealCost = Math.max(1, Math.ceil((card.power + info.effectPoints - 1.5) / 4));
    if (idealCost !== card.cost) {
      const newCard: CardDef = { ...card, cost: idealCost };
      const newInfo = getBalanceInfo(newCard);
      changes.push({
        cardId: card.id,
        cardName: card.name,
        field: "cost",
        oldValue: card.cost,
        newValue: idealCost,
        oldDelta: info.delta,
        newDelta: newInfo.delta,
        reason: `PTP actual ${info.current.toFixed(2)} → ${newInfo.current.toFixed(2)} (esperado ${newInfo.target.toFixed(2)}, nuevo coste ${idealCost})`,
      });
    }
  }
}

if (changes.length === 0) {
  console.log("No hay cambios que aplicar — todas las cartas están balanced (o no se pudo encontrar un valor válido).");
  process.exit(0);
}

console.log(`\n${changes.length} cambios a aplicar:\n`);
for (const c of changes) {
  const emoji = c.newDelta >= -0.5 && c.newDelta <= 0.5 ? "✓" : "~";
  console.log(`${emoji} ${c.cardName.padEnd(35)} ${c.field} ${c.oldValue} → ${c.newValue}  (Δ ${c.oldDelta.toFixed(2)} → ${c.newDelta.toFixed(2)})`);
}

console.log("\n" + "=".repeat(80));
console.log("Aplicando cambios a cards.ts...");

// Leer el archivo
let content = await readFile(CARDS_PATH, "utf-8");

// Aplicar cada cambio
let applied = 0;
let skipped = 0;
for (const c of changes) {
  // Buscar el bloque de la carta por su `id: "..."`
  const idPattern = `id: "${c.cardId}",`;
  const idIdx = content.indexOf(idPattern);
  if (idIdx < 0) {
    console.warn(`  ! No se encontró el cardId "${c.cardId}" en cards.ts — saltando`);
    skipped++;
    continue;
  }

  // Encontrar el campo power: o cost: dentro del bloque de la carta (hasta la próxima `}` o `id:`)
  // Buscamos la próxima definición de carta o fin del array para delimitar el bloque
  let blockEnd = content.indexOf("\n  },", idIdx);
  if (blockEnd < 0) blockEnd = content.indexOf("\n  ]", idIdx);
  if (blockEnd < 0) {
    console.warn(`  ! No se pudo delimitar el bloque de la carta "${c.cardId}" — saltando`);
    skipped++;
    continue;
  }

  const blockStart = idIdx;
  const block = content.slice(blockStart, blockEnd);

  // Reemplazar `    power: X,` o `    cost: X,` (con 4 espacios de indent)
  const fieldRegex = new RegExp(`^(\\s+)${c.field}:\\s*${c.oldValue},`, "m");
  const newBlock = block.replace(fieldRegex, (match, indent) => `${indent}${c.field}: ${c.newValue}, // AUTO-BALANCED (era ${c.oldValue}, Δ ${c.oldDelta.toFixed(2)} → ${c.newDelta.toFixed(2)})`);

  if (newBlock === block) {
    console.warn(`  ! No se encontró el campo ${c.field}: ${c.oldValue} en la carta "${c.cardId}" — saltando`);
    skipped++;
    continue;
  }

  content = content.slice(0, blockStart) + newBlock + content.slice(blockEnd);
  applied++;
}

console.log(`  ✓ ${applied} cambios aplicados`);
if (skipped > 0) console.log(`  ! ${skipped} cambios saltados (no se encontraron)`);

// Escribir el archivo
await writeFile(CARDS_PATH, content, "utf-8");
console.log(`\n✓ cards.ts actualizado. Ejecutá de nuevo 'bun run scripts/audit-card-balance.ts --summary' para verificar.`);
