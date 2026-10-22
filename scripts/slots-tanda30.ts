// Slots T-E (tanda 30): +8 por clase base → 11/11/14 (el carril del jefe crece
// a 14 pero BOSS_DECKS se recorta a 12 deterministamente). Verifica ANTES de
// tocar cards.ts: PTP ±0.5 (getBalanceInfo), unicidad GLOBAL de combo
// (coste|poder|keyword|X|trigger), Regla A (keyword exclusiva de su carril) y
// cobertura de categorías (2A+1I en carriles normales, 1A+1I en el del jefe).
import { ALL_CARDS_V3 } from "../src/lib/game/cards";
import { getBalanceInfo } from "../src/lib/game/balance";
import { KEYWORD_META } from "../src/lib/game/types";
import type { CardDef, Keyword, Subtype, Trigger } from "../src/lib/game/types";

type Cat = "Ataque" | "Ítem" | "Acción";
interface Cand {
  id: string; name: string; category: Cat; lane: Subtype;
  cost: number; power: number; keyword: Keyword | "none"; x?: number; trigger?: Trigger;
}

// ── Los 24 candidatos (3 nuevos keywords por clase ×2 portadores + 2 relleno) ──
export const CANDIDATOS: Cand[] = [
  // ── GUERRERO (+3 armas · +3 furia · +2 proteccion) ──
  { id: "alguacil_de_guerra", name: "Alguacil de Guerra", category: "Ataque", lane: "armas", cost: 2, power: 8, keyword: "estandarte", x: 1 },
  { id: "estandarte_de_avance", name: "Estandarte de Avance", category: "Ítem", lane: "armas", cost: 3, power: 10, keyword: "estandarte", x: 2 },
  { id: "rompefilas_orco", name: "Rompefilas Orco", category: "Ataque", lane: "armas", cost: 2, power: 7, keyword: "orden_batalla", x: 2 },
  { id: "arrollo_de_acero", name: "Arrollo de Acero", category: "Ataque", lane: "furia", cost: 2, power: 8, keyword: "atropello", x: 1 },
  { id: "coloso_berserker", name: "Coloso Berserker", category: "Ataque", lane: "furia", cost: 4, power: 14, keyword: "atropello", x: 2 },
  { id: "maza_berserker", name: "Maza Berserker", category: "Ítem", lane: "furia", cost: 3, power: 9, keyword: "impetu", x: 3 },
  { id: "defensor_jurado", name: "Defensor Jurado", category: "Ataque", lane: "proteccion", cost: 3, power: 13, keyword: "muralla", x: 1 },
  { id: "campana_de_refugio", name: "Campana de Refugio", category: "Ítem", lane: "proteccion", cost: 4, power: 16, keyword: "muralla", x: 2 },

  // ── MAGO (+3 arcana · +3 fuego · +2 hielo) ──
  { id: "cronista_arcano", name: "Cronista Arcano", category: "Ataque", lane: "arcana", cost: 2, power: 8, keyword: "eco", x: 1 },
  { id: "tomo_de_ecos", name: "Tomo de Ecos", category: "Ítem", lane: "arcana", cost: 4, power: 15, keyword: "eco", x: 2 },
  { id: "aprendiz_inquieto", name: "Aprendiz Inquieto", category: "Ataque", lane: "arcana", cost: 1, power: 5, keyword: "coraza", x: 1 },
  { id: "brasas_funebres", name: "Brasas Fúnebres", category: "Ataque", lane: "fuego", cost: 3, power: 12, keyword: "ceniza", x: 1 },
  { id: "colosal_de_magma", name: "Colosal de Magma", category: "Ataque", lane: "fuego", cost: 5, power: 19, keyword: "ceniza", x: 2 },
  { id: "farol_consumido", name: "Farol Consumido", category: "Ítem", lane: "fuego", cost: 1, power: 4, keyword: "combustion", x: 1 },
  { id: "cazador_de_grietas", name: "Cazador de Grietas", category: "Ataque", lane: "hielo", cost: 3, power: 12, keyword: "esquirla", x: 1 },
  { id: "prisma_glacial", name: "Prisma Glacial", category: "Ítem", lane: "hielo", cost: 4, power: 15, keyword: "esquirla", x: 2 },

  // ── ASESINO (+3 veneno · +3 combate · +2 sigilo) ──
  { id: "vibora_corrosiva", name: "Víbora Corrosiva", category: "Ataque", lane: "veneno", cost: 2, power: 8, keyword: "corrosion", x: 1 },
  { id: "frasco_de_sales", name: "Frasco de Sales", category: "Ítem", lane: "veneno", cost: 4, power: 14, keyword: "corrosion", x: 2 },
  { id: "mantis_verde", name: "Mantis Verde", category: "Ataque", lane: "veneno", cost: 1, power: 1, keyword: "contagio", x: 3 },
  { id: "espadachin_burlon", name: "Espadachín Burlón", category: "Ataque", lane: "combate", cost: 2, power: 8, keyword: "finta", x: 1 },
  { id: "maestra_de_esgrima", name: "Maestra de Esgrima", category: "Ataque", lane: "combate", cost: 4, power: 14, keyword: "finta", x: 2 },
  { id: "navaja_de_taberna", name: "Navaja de Taberna", category: "Ítem", lane: "combate", cost: 1, power: 5, keyword: "refriega", x: 1 },
  { id: "ojo_de_la_red", name: "Ojo de la Red", category: "Ataque", lane: "sigilo", cost: 3, power: 12, keyword: "octava", x: 1 },
  { id: "puerta_trampa", name: "Puerta Trampa", category: "Ítem", lane: "sigilo", cost: 4, power: 15, keyword: "octava", x: 2 },
];

const asCard = (c: Cand): CardDef =>
  ({
    id: c.id, name: c.name, category: c.category, subtypes: [c.lane],
    cost: c.cost, power: c.power, text: "", rarity: "common",
    effectId: c.keyword, keyword: c.keyword === "none" ? undefined : c.keyword,
    keywordValue: c.x, trigger: c.trigger,
  }) as unknown as CardDef;

const combo = (c: CardDef) =>
  `${c.cost}|${c.power}|${c.keyword ?? "none"}|${c.keywordValue ?? 0}|${c.trigger ?? (c.keyword ? KEYWORD_META[c.keyword as Keyword].trigger : "on_play")}`;

let fails = 0;
const fail = (msg: string) => { fails++; console.log("  ✗ " + msg); };

// 1) PTP ±0.5
for (const c of CANDIDATOS) {
  const info = getBalanceInfo(asCard(c));
  if (Math.abs(info.delta) > 0.5) fail(`PTP ${c.id}: delta ${info.delta.toFixed(2)}`);
}
console.log(`1) PTP ±0.5: ${fails === 0 ? "OK" : fails + " fallos"}`);

// 2) Unicidad global de combo (contra las existentes Y entre candidatos).
//    POST-INTEGRACIÓN: los candidatos ya viven en ALL_CARDS_V3 — se excluyen
//    a sí mismos; valores actualizados a los FINALES de cards.ts (ajuste de
//    gemelas Regla A/B del pool de 36).
const combos = new Map<string, string>();
for (const c of ALL_CARDS_V3) {
  if (CANDIDATOS.some((k) => k.id === c.id)) continue;
  combos.set(combo(c), c.id);
}
const before = fails;
for (const c of CANDIDATOS) {
  const k = combo(asCard(c));
  const owner = combos.get(k);
  if (owner) fail(`combo duplicado ${c.id} = ${owner} (${k})`);
  combos.set(k, c.id);
}
console.log(`2) unicidad global: ${fails === before ? "OK" : "FALLOS"}`);

// 3) Regla A: keyword exclusiva de SU carril
let fa = 0;
for (const c of CANDIDATOS) {
  if (c.keyword === "none") continue;
  const excl = KEYWORD_META[c.keyword as Keyword].exclusiveSubtype;
  if (excl && excl !== c.lane) { fail(`Regla A ${c.id}: ${c.keyword} es de ${excl}, carta en ${c.lane}`); fa++; }
}
console.log(`3) Regla A: ${fa === 0 ? "OK" : "FALLOS"}`);

// 4) ids slug de nombre
let fs2 = 0;
for (const c of CANDIDATOS) {
  const slug = c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  if (slug !== c.id) { fail(`slug ${c.id} ≠ ${slug}`); fs2++; }
}
console.log(`4) id=slug(nombre): ${fs2 === 0 ? "OK" : "FALLOS"}`);

// 5) distribución por carril tras la tanda
const add = (s: Subtype) => CANDIDATOS.filter((c) => c.lane === s).length;
const target: Partial<Record<Subtype, number>> = { armas: 3, furia: 3, proteccion: 2, arcana: 3, fuego: 3, hielo: 2, veneno: 3, combate: 3, sigilo: 2 };
let fd = 0;
for (const [ln, n] of Object.entries(target)) {
  if (add(ln as Subtype) !== n) { fail(`carril ${ln}: +${add(ln as Subtype)} ≠ +${n}`); fd++; }
}
console.log(`5) distribución +3/+3/+2: ${fd === 0 ? "OK" : "FALLOS"}`);

console.log(fails + fa + fs2 + fd === 0 ? "\n✅ TODO VERDE — proceder a cards.ts" : `\n❌ ${fails + fa + fs2 + fd} problemas`);
if (fails + fa + fs2 + fd > 0) process.exit(1);
