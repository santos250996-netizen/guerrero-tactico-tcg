// ============================================================================
// update-keywords-txt.ts — regenera download/keywords-con-efectos-v4.txt
//   1. Hereda la documentación de keywords V2/V3 del txt anterior (cabecera
//      hasta el bloque MAZOS ESPEJO, excluido).
//   2. Añade la sección de las 9 keywords de la 3ª tanda (1 por spec).
//   3. Regenera el bloque de MAZOS desde cards.ts (fuente de verdad real,
//      ya no duplicada a mano): los 6 mazos predeterminados.
// Ejecutar: npx tsx scripts/update-keywords-txt.ts
// ============================================================================

import fs from "node:fs";
import {
  ALL_CARDS_V3,
  WARRIOR_DECK,
  MAGE_DECK,
  ROGUE_DECK,
  WARRIOR2_CARDS,
  MAGE2_CARDS,
  ROGUE2_CARDS,
} from "../src/lib/game/cards";
import { KEYWORD_BASE_VALUES } from "../src/lib/game/balance";
import { KEYWORD_META, type CardDef } from "../src/lib/game/types";

const PREV = "/home/z/my-project/download/keywords-con-efectos-v3.txt";
const OUT = "/home/z/my-project/download/keywords-con-efectos-v4.txt";

// --- 1. Heredar documentación V2/V3 -----------------------------------------
const prev = fs.readFileSync(PREV, "utf-8");
const cut = prev.indexOf("================================================================================\nMAZOS ESPEJO");
if (cut < 0) throw new Error("No se encontró el bloque MAZOS ESPEJO en el txt anterior");
let body = prev.slice(0, cut).trimEnd();

// --- 2. Sección de las 9 keywords nuevas -------------------------------------
const NEW_KEYWORDS: { id: string; label: string; clase: string; spec: string; niche: string }[] = [
  { id: "orden_batalla", label: "ORDEN DE BATALLA [X]", clase: "GUERRERO", spec: "ARMAS", niche: "buff AoE one-shot al carril (la carta y sus aliados) — la versión INSTANTÁNEA de Fortaleza." },
  { id: "custodia", label: "CUSTODIA [X]", clase: "GUERRERO", spec: "PROTECCIÓN", niche: "escudo renovable al aliado más débil (puede ser ella misma) — el espejo defensivo de Escarcha repartido al más vulnerable." },
  { id: "desafio", label: "DESAFÍO [X]", clase: "GUERRERO", spec: "FURIA", niche: "remontada: +X/turno SOLO mientras el carril enemigo supere al tuyo — cuanto peor está el carril, más pega." },
  { id: "drenar_poder", label: "DRENAR PODER [X]", clase: "MAGO", spec: "ARCANA", niche: "único swing emparejado del juego: gana +X propio Y reduce X al más fuerte (la reducción es honesta, los escudos absorben)." },
  { id: "detonacion", label: "DETONACIÓN [X]", clase: "MAGO", spec: "FUEGO", niche: "explosión AoE al morir (los escudos absorben) — Combustión es su hermana perforante single-target." },
  { id: "ruptura_glacial", label: "RUPTURA GLACIAL [X]", clase: "MAGO", spec: "HIELO", niche: "finisher del desgaste: −X perforante al enemigo con MÁS reducciones acumuladas (empate → el más fuerte). Sin grietas no hace nada." },
  { id: "miasma", label: "MIASMA [X]", clase: "ASESINO", spec: "VENENO", niche: "AoE perforante al jugar: el gas atraviesa escudos — la versión venenosa de Llamarada." },
  { id: "caza_mayor", label: "CAZA MAYOR [X]", clase: "ASESINO", spec: "COMBATE", niche: "cazar gigantes: +2X si el enemigo más fuerte del carril supera el poder base de esta carta; si no, +X." },
  { id: "conspiracion", label: "CONSPIRACIÓN [X]", clase: "ASESINO", spec: "SIGILO", niche: "PRIMERA keyword de MANO del juego: el resto de tu mano gana +X permanente (handBonus ya tipado en el motor)." },
];

let kwSection = `

================================================================================
3ª TANDA (2026-10) — 9 KEYWORDS NUEVAS, 1 POR SPEC (segundos mazos)
================================================================================
Cada spec estrena una keyword mecánicamente distinta a las 24 anteriores.
Todas calibradas dentro de la fórmula PTP (coste×4+1.5) vía valor base.

`;

for (const [i, k] of NEW_KEYWORDS.entries()) {
  const meta = KEYWORD_META[k.id as keyof typeof KEYWORD_META];
  const base = KEYWORD_BASE_VALUES[k.id as keyof typeof KEYWORD_BASE_VALUES];
  kwSection += `${k.clase} — ${k.spec}\n`;
  kwSection += `\n${String(i + 1).padStart(2, "0")}. ${k.label}${" ".repeat(Math.max(1, 44 - k.label.length))}id: ${k.id}\n`;
  kwSection += `    Trigger: ${meta.trigger} | Scope: ${meta.scope}\n`;
  kwSection += `    Efecto: ${meta.description}\n`;
  kwSection += `    Nicho: ${k.niche}\n`;
  kwSection += `    Valor base PTP: ${base.toFixed(1)} × X\n\n`;
}

// --- 3. Bloque de MAZOS desde cards.ts (fuente de verdad) --------------------
const deckBlock = (title: string, deck: CardDef[]): string[] => {
  const lines = [`${title}:`];
  let lastSpec: string | null = null;
  for (const c of deck) {
    const spec = (c.subtypes[0] ?? "?").toUpperCase();
    const kw = c.keyword && c.keyword !== "none" ? `${KEYWORD_META[c.keyword].label}[${c.keywordValue ?? 0}]` : "—";
    const row = `  ${spec === lastSpec ? "        " : spec.padEnd(9)}${c.name.padEnd(26)}${c.category.padEnd(8)}c${c.cost} p${String(c.power).padEnd(3)}${kw}`;
    lines.push(row);
    lastSpec = spec;
  }
  return lines;
};

let mazos = `

================================================================================
MAZOS PREDETERMINADOS (6 — 2 por clase, 12 cartas, curva 1×2 · 2×3 · 3×5 · 4×1 · 5×1)
Por spec: 2 Ataque + 1 Ítem + 1 Acción · 12 keywords distintas por mazo ·
PTP calibrado 72/72 (scripts/audit-balance.ts). La rareza se GANA por fusión:
todas las cartas nacen comunes (+2 poder por tier de rareza).
================================================================================
`;

for (const [title, deck] of [
  ["GUERRERO I (CLASS_DECKS.guerrero)", WARRIOR_DECK],
  ["GUERRERO II — COHORTE DE HIERRO (CLASS_DECKS_SECOND.guerrero)", WARRIOR2_CARDS],
  ["MAGO I (CLASS_DECKS.mago)", MAGE_DECK],
  ["MAGO II — CÓNCLAVE PRISMÁTICO (CLASS_DECKS_SECOND.mago)", MAGE2_CARDS],
  ["ASESINO I (CLASS_DECKS.asesino)", ROGUE_DECK],
  ["ASESINO II — GREMIO DE LA DAGA (CLASS_DECKS_SECOND.asesino)", ROGUE2_CARDS],
] as [string, CardDef[]][]) {
  mazos += "\n" + deckBlock(title, deck).join("\n") + "\n";
}

mazos += `\nTotal catálogo: ${ALL_CARDS_V3.length} cartas.\n`;

fs.writeFileSync(OUT, body + kwSection + mazos, "utf-8");
console.log(`✓ ${OUT} regenerado (${ALL_CARDS_V3.length} cartas, 6 mazos, 33 keywords documentadas)`);
