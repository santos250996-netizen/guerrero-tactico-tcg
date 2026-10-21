/**
 * AUDITORÍA DE CARTAS GEMELAS — Task 48
 * El usuario: «hay cartas q practicamente tienen mismo efecto y poder en un
 * juego donde cada clase aun tiene 28 cartas no se puede permitir eso».
 *
 * Reglas (por clase, sobre classCardsOf(cls) = 28 cartas):
 *   A) GEMELA DURA  — mismo keyword + mismo keywordValue + mismo trigger
 *                     → texto literal idéntico salvo cuerpo. SIEMPRE corrección.
 *   B) GEMELA DE HUECO — mismo keyword + mismo trigger + mismo coste
 *                     → misma ranura de curva con X distinto. Corregir.
 *   C) AVISOS       — mismo keyword + mismo trigger (X y coste distintos)
 *                     → tiering legítimo, solo se informa.
 */
import { classCardsOf } from "../src/lib/game/cards";
import { CLASS_META, type GameClass } from "../src/lib/game/types";

const CLASSES: GameClass[] = ["guerrero", "mago", "asesino"];

interface Finding {
  rule: "A" | "B" | "C";
  cls: GameClass;
  a: string;
  b: string;
  detail: string;
}

const findings: Finding[] = [];

for (const cls of CLASSES) {
  const cards = classCardsOf(cls);
  const lanes = CLASS_META[cls].lanes;
  console.log(`\n=== ${cls.toUpperCase()} (${cards.length} cartas, carriles ${lanes.join("·")}) ===`);

  // sanity: ids únicos
  const ids = new Set(cards.map((c) => c.id));
  if (ids.size !== cards.length) console.log("  !! IDs duplicados en el pool");

  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      const a = cards[i], b = cards[j];
      if (!a.keyword || a.keyword !== b.keyword) continue;
      if (a.trigger !== b.trigger) continue;
      const sameX = (a.keywordValue ?? 0) === (b.keywordValue ?? 0);
      const sameCost = a.cost === b.cost;
      const dPower = Math.abs(a.power - b.power);
      const tag = (c: typeof a) => `${c.name} [${c.cost}/${c.power} ${c.keyword}${c.keywordValue ? "×" + c.keywordValue : ""} ${c.trigger}]`;
      if (sameX) {
        findings.push({ rule: "A", cls, a: tag(a), b: tag(b), detail: `texto idéntico (Δpoder ${dPower})` });
      } else if (sameCost) {
        findings.push({ rule: "B", cls, a: tag(a), b: tag(b), detail: `mismo coste ${a.cost}, X ${a.keywordValue} vs ${b.keywordValue}` });
      } else {
        findings.push({ rule: "C", cls, a: tag(a), b: tag(b), detail: `tiering coste ${a.cost} vs ${b.cost}, X ${a.keywordValue} vs ${b.keywordValue}` });
      }
    }
  }
}

console.log("\n\n########## RESUMEN ##########");
const count = (r: Finding["rule"]) => findings.filter((f) => f.rule === r).length;
console.log(`Regla A (gemelas duras): ${count("A")}`);
console.log(`Regla B (mismo coste+keyword+trigger): ${count("B")}`);
console.log(`Regla C (tiering legítimo, informativo): ${count("C")}`);

for (const r of ["A", "B", "C"] as const) {
  const list = findings.filter((f) => f.rule === r);
  if (!list.length) continue;
  console.log(`\n--- REGLA ${r} ---`);
  for (const f of list) console.log(`[${f.cls}] ${f.a}  ⟷  ${f.b}   (${f.detail})`);
}
