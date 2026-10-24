// ============================================================================
// CODEMOD — Parche de Arquetipos v1 (audit-arquetipos 2026-10)
// ============================================================================
// Aplica los cambios de stats/textos a cartas concretas, localizando cada
// bloque por `id: "..."` y sustituyendo SOLO dentro de ese bloque:
//   · power:  compensación on_death (MOD 0.5) + rebalances de identidad
//   · keywordValue: buffs/nerfs quirúrgicos (veneno/crueldad/ventisca/fortaleza)
//   · text: sincronización de números y comportamiento (torreta perfora,
//           simbiosis cuenta empates)
// Idempotente: si un valor ya está aplicado, no toca nada.
// ============================================================================
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "src/lib/game/cards.ts";
const src = readFileSync(FILE, "utf8");

interface Patch {
  id: string;
  power?: number;
  keywordValue?: number;
  text?: string;
  textReplacements?: [RegExp | string, string][];
}

const PATCHES: Patch[] = [
  // ── A. MUERTE revive: compensación de poder (MOD_ONCE_ON_DEATH 0.5) ──
  { id: "anciano_del_norte", power: 19 },
  { id: "veterano_caido", power: 8 },
  { id: "maestro_caido", power: 19 },
  { id: "estandarte_de_la_cohorte", power: 11 },
  { id: "bomba_de_fuego_inestable", power: 12 },
  { id: "alma_del_glaciar", power: 12 },
  { id: "cepa_heredada", power: 4 },
  { id: "cofre_del_ahogado", power: 3 },
  { id: "heredero_del_taller", power: 15 },
  { id: "salamandra_anciana", power: 8 },
  { id: "fenix_de_ascuas", power: 16 },
  { id: "grito_de_agonia", power: 5 },
  { id: "juramento_de_acero", power: 4 },
  { id: "aliento_gelido", power: 9 },
  { id: "cobro_por_encargo", power: 12 },
  { id: "raiz_del_antiguo", power: 8 },
  { id: "lobo_del_mar", power: 9 },
  { id: "centinela_chispeante", power: 13 },
  { id: "campana_de_refugio", power: 17 },
  { id: "colosal_de_magma", power: 20 },
  { id: "farol_consumido", power: 5 },
  { id: "defensor_jurado", power: 13 }, // delta 0 — el mod ya cuadra
  { id: "salva_de_despedida", power: 7 },
  { id: "polvorin_viejo", power: 12 },
  { id: "muneco_de_chatarras", power: 12 },
  { id: "golem_de_desguace", power: 7 },
  { id: "enjambre_de_tornillos", power: 5 },
  { id: "brasas_funebres", power: 13 },
  { id: "kraken_de_polvora", power: 5 },
  { id: "lecho_de_petalos", power: 12 },
  { id: "jardin_colgante", power: 9 },

  // ── B. Anti-stack botánico (el único stack INICIO+FIN que gana: 68%) ──
  {
    id: "coro_de_setas",
    keywordValue: 3,
    power: 10,
    text: "Fin de Turno: todas tus cartas de este carril ganan +3.",
  },
  {
    id: "circulo_de_hongos",
    keywordValue: 1,
    power: 3,
    text: "Fin de Turno: todas tus cartas de este carril ganan +1.",
  },

  // ── C. Identidad: firmas dormidas ──
  // VENENO (Asesino — anti-tanque perforante, share 1.3% medido)
  {
    id: "colmillos_curvos",
    keywordValue: 2,
    power: 10,
    text: "Inicio de Turno: reduce en 2 el poder del enemigo más fuerte. El veneno ignora los escudos.",
  },
  {
    id: "serpiente_del_cienago",
    keywordValue: 3,
    power: 12,
    text: "Inicio de Turno: reduce en 3 el poder del enemigo más fuerte. El veneno ignora los escudos.",
  },
  // CRUELDAD (Guerrero furia — presión constante, invisible en sims)
  {
    id: "colmillo_del_verdugo",
    keywordValue: 2,
    power: 14,
    text: "Fin de Turno: reduce en 2 el poder del enemigo más débil CON PODER de este carril (a 0, la carta cae). Sin presa, esta carta se enfurece y gana +2.",
  },
  {
    id: "furia_desatada",
    keywordValue: 3,
    power: 8,
    text: "Fin de Turno: reduce en 3 el poder del enemigo más débil CON PODER de este carril (a 0, la carta cae). Sin presa, esta carta se enfurece y gana +3.",
  },
  // VENTISCA (Mago hielo — control, única carta X=1 subida a X=2)
  {
    id: "viento_cortante",
    keywordValue: 2,
    power: 11,
    text: "Fin de Turno: reduce en 2 el poder de TODAS las cartas enemigas de este carril.",
  },
  // TORRETA (Tinker chispa — anti-élite; ahora PERFORA, texto + poder)
  {
    id: "automata_cargador",
    text: "Fin de Turno: reduce en 1 el poder del enemigo MÁS FUERTE de este carril. El rayo salta los escudos.",
  },
  {
    id: "torreta_de_asedio",
    text: "Fin de Turno: reduce en 3 el poder del enemigo MÁS FUERTE de este carril. El rayo salta los escudos.",
  },
  {
    id: "tren_de_asedio",
    power: 10,
    text: "Fin de Turno: reduce en 4 el poder del enemigo MÁS FUERTE de este carril. El rayo salta los escudos.",
  },
  // SIMBIOSIS (Botánico flor — noop 51% → cuenta empates, solo texto)
  {
    id: "polinizador_solar",
    text: "Al Jugar: gana +2 por cada carta tuya de este carril que tenga MENOS O IGUAL poder que esta (los empates alimentan la red).",
  },
  {
    id: "enjambre_de_zumbidos",
    text: "Al Jugar: gana +1 por cada carta tuya de este carril que tenga MENOS O IGUAL poder que esta (los empates alimentan la red).",
  },
];

// ── Localiza ids reales (por si el codemod usa un id mal escrito) ──
const ids = new Set<string>();
for (const m of src.matchAll(/id:\s*"([a-z0-9_]+)"/g)) ids.add(m[1]);

let applied = 0;
let skipped: string[] = [];
let out = src;

function patchBlock(block: string, p: Patch): string {
  let b = block;
  if (p.power !== undefined) {
    b = b.replace(/(\n\s*power:\s*)(\d+)(,)/, (_m, a, n, c) => `${a}${p.power}${c}`);
  }
  if (p.keywordValue !== undefined) {
    if (/keywordValue:/.test(b)) {
      b = b.replace(/(\n\s*keywordValue:\s*)(\d+)(,)/, (_m, a, _n, c) => `${a}${p.keywordValue}${c}`);
    } else {
      throw new Error(`keywordValue ausente en ${p.id}`);
    }
  }
  if (p.text !== undefined) {
    b = b.replace(/(\n\s*text:\s*")([^"]+)(")/, (_m, a, _old, c) => `${a}${p.text}${c}`);
  }
  for (const [from, to] of p.textReplacements ?? []) {
    b = b.replace(from, to);
  }
  return b;
}

for (const p of PATCHES) {
  if (!ids.has(p.id)) {
    skipped.push(p.id);
    continue;
  }
  // Bloque de la carta: desde `id: "<id>"` hasta el cierre `},` al nivel del objeto
  const startMarker = `id: "${p.id}"`;
  const start = out.indexOf(startMarker);
  if (start < 0) {
    skipped.push(p.id);
    continue;
  }
  // El bloque termina en el siguiente `\n  },` (cierre del objeto de carta)
  const end = out.indexOf("\n  },", start);
  if (end < 0) {
    skipped.push(p.id);
    continue;
  }
  const block = out.slice(start, end);
  const patched = patchBlock(block, p);
  if (patched !== block) {
    out = out.slice(0, start) + patched + out.slice(end);
    applied++;
  } else {
    skipped.push(`${p.id} (sin cambios)`);
  }
}

writeFileSync(FILE, out);
console.log(`✅ ${applied}/${PATCHES.length} bloques parcheados`);
if (skipped.length) console.log(`⚠️ Sin aplicar: ${skipped.join(", ")}`);
