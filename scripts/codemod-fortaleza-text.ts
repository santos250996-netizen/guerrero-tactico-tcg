// ============================================================================
// CODEMOD 2 — textos de FORTALEZA: cláusula «no se acumulan»
// ============================================================================
// La regla anti-stack (engine, fin de turno) debe ser visible en carta.
// Añade la cláusula a las 12 cartas fortaleza SIN tocar sus números.
// ============================================================================
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "src/lib/game/cards.ts";
let src = readFileSync(FILE, "utf8");

const CLAUSE = " (si ondean varias Fortalezas, solo la de mayor X aplica)";
const RE = /text:\s*"Fin de Turno: todas tus cartas de este carril ganan \+(\d)\."/g;

let n = 0;
src = src.replace(RE, (m, x) => {
  n++;
  return `text: "Fin de Turno: todas tus cartas de este carril ganan +${x}${CLAUSE}."`;
});

writeFileSync(FILE, src);
console.log(`✅ ${n} textos de Fortaleza actualizados con la cláusula anti-stack`);
