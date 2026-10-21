// Audita los textos de las cartas: números sueltos que coincidan con
// keywordValue (riesgo de falso positivo al sincronizar rareza).
import { ALL_CARDS_V3 as POOL } from "../src/lib/game/cards";
import { KEYWORD_META } from "../src/lib/game/types";

let risky = 0;
for (const c of POOL) {
  const kw = c.keyword ?? "none";
  if (kw === "none" || !KEYWORD_META[kw]?.hasValue || c.keywordValue === undefined) continue;
  const x = c.keywordValue;
  const reX = new RegExp(`(?<![0-9])${x}(?![0-9])`, "g");
  const re2X = new RegExp(`(?<![0-9])${2 * x}(?![0-9])`, "g");
  const mx = c.text.match(reX) ?? [];
  const m2 = c.text.match(re2X) ?? [];
  if (mx.length === 0 && m2.length === 0) {
    console.log(`SIN X EN TEXTO: ${c.id} (X=${x}) → "${c.text}"`);
    continue;
  }
  if (mx.length + m2.length > 2) {
    risky++;
    console.log(`MUCHOS (${mx.length}x + ${m2.length}x2X): ${c.id} (X=${x}) → "${c.text}"`);
  } else if (m2.length > 0) {
    console.log(`2X (${m2.length}): ${c.id} (X=${x}) → "${c.text}"`);
  }
}
console.log(`\nTotal sospechosos: ${risky}`);
