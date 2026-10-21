// ============================================================================
// SOLVER de combos V3-Tinker — X fijado por diseño, coste ∈ pin±1, poder ∈ PTP.
// Restricciones: curva por mazo, Reglas A/B, unicidad global de combo, PTP.
// Ejecutar: bun scripts/solver-tinker.ts
// ============================================================================
import { ALL_CARDS_V3 } from "../src/lib/game/cards";

type Row = [string, string, 1 | 2 | 0, string, number, number]; // [id, familia, deck, categoría, X, costePin]

const ROWS: Row[] = [
  // ── DECK I «Fragua Ambulante» ──
  ["hojalatero_errante", "remache", 1, "Ataque", 2, 3],
  ["martillo_nivelador", "descarga", 1, "Ataque", 1, 1],
  ["yunque_portatil", "engranaje", 1, "Ítem", 2, 2],
  ["chispa_de_genio", "sobrecalentar", 1, "Acción", 1, 2],
  ["automata_cargador", "torreta", 1, "Ataque", 1, 3],
  ["muneco_de_chatarras", "chatarra", 1, "Ataque", 2, 3],
  ["nucleo_de_reserva", "coraza", 1, "Ítem", 2, 3],
  ["carro_de_herramientas", "insignia", 1, "Acción", 2, 3],
  ["centinela_chispeante", "legado", 1, "Ataque", 1, 1],
  ["bobina_cargada", "fervor", 1, "Ítem", 2, 2],
  ["remachadora_pesada", "remate", 1, "Ataque", 3, 5],
  ["temblor_de_maquinas", "fortaleza", 1, "Acción", 3, 4],
  // ── DECK II «Motor de Guerra» ──
  ["remachadora_de_asalto", "remache", 2, "Ataque", 3, 2],
  ["descargador_de_batalla", "descarga", 2, "Ataque", 2, 3],
  ["engranaje_maestro", "engranaje", 2, "Ítem", 3, 3],
  ["fragua_de_bolsillo", "sobrecalentar", 2, "Acción", 3, 3],
  ["torreta_de_asedio", "torreta", 2, "Ataque", 3, 3],
  ["golem_de_desguace", "chatarra", 2, "Ataque", 3, 3],
  ["caldera_de_presion", "coraza", 2, "Ítem", 3, 2],
  ["decreto_de_la_forja", "insignia", 2, "Acción", 2, 1],
  ["heredero_del_taller", "legado", 2, "Ataque", 4, 2],
  ["motor_de_campana", "fervor", 2, "Ataque", 2, 2],
  ["guillotina_portatil", "remate", 2, "Ataque", 4, 4],
  ["marcha_de_maquinas", "fortaleza", 2, "Acción", 4, 5],
  // ── JEFE (Dorvik, MAQUINARIA) ──
  ["tren_de_asedio", "torreta", 0, "Ataque", 4, 4],
  ["enjambre_de_tornillos", "chatarra", 0, "Ataque", 1, 1],
  ["llave_maestra", "engranaje", 0, "Ítem", 1, 1],
  ["fauces_de_dorvik", "sobrecalentar", 0, "Acción", 4, 5],
];

const BASE: Record<string, number> = {
  remache: 0.85, chatarra: 1.3, engranaje: 2.2, sobrecalentar: 1.4,
  torreta: 1.8, descarga: 1.5, coraza: 1.0, fervor: 3.0, insignia: 1.0,
  legado: 1.0, remate: 2.0, fortaleza: 2.5,
};
const SCOPE: Record<string, number> = {
  remache: 1.2, chatarra: 1.2, engranaje: 1.0, sobrecalentar: 1.0,
  torreta: 1.2, descarga: 1.2, coraza: 1.0, fervor: 1.0, insignia: 1.2,
  legado: 1.2, remate: 1.2, fortaleza: 1.2,
};
const TRIGGER: Record<string, string> = {
  remache: "on_play", chatarra: "on_death", engranaje: "start_turn", sobrecalentar: "on_play",
  torreta: "end_turn", descarga: "on_play", coraza: "on_play", fervor: "start_turn",
  insignia: "on_play", legado: "on_death", remate: "on_play", fortaleza: "end_turn",
};

function epOf(kw: string, X: number): number {
  const once = TRIGGER[kw] === "start_turn" || TRIGGER[kw] === "end_turn" ? 0.8 : 1.0;
  return BASE[kw] * X * SCOPE[kw] * once;
}

const myIds = new Set(ROWS.map((r) => r[0]));
const globalUsed = new Set(
  ALL_CARDS_V3.filter((c) => !myIds.has(c.id)).map(
    (c) => `${c.cost}|${c.power}|${c.keyword}|${c.keywordValue ?? 0}|${c.trigger}`
  )
);

interface Opt { cost: number; power: number; combo: string }
function optionsFor(row: Row): Opt[] {
  const [id, kw, , , X, costPin] = row;
  const out: Opt[] = [];
  for (const cost of [costPin - 1, costPin, costPin + 1]) {
    if (cost < 1 || cost > 5) continue;
    const ep = epOf(kw, X);
    const target = cost * 4 + 1.5;
    for (let power = 0; power <= 25; power++) {
      const cur = power + ep;
      if (cur < target - 0.5 - 1e-9 || cur > target + 0.5 + 1e-9) continue;
      const combo = `${cost}|${power}|${kw}|${X}|${TRIGGER[kw]}`;
      if (globalUsed.has(combo)) continue;
      out.push({ cost, power, combo });
    }
  }
  if (out.length === 0) console.error(`SIN OPCIONES: ${id}`);
  return out;
}

const opts = ROWS.map(optionsFor);
const CURVE: Record<number, number> = { 1: 2, 2: 3, 3: 5, 4: 1, 5: 1 };
const chosen: (Opt | null)[] = ROWS.map(() => null);
const comboSeen = new Set<string>();
const kwXTrig = new Set<string>();
const kwTrigCost = new Set<string>();
let nodes = 0;

function solve(active: Set<number>, counters: Map<number, Record<number, number>>): boolean {
  if (++nodes > 2_000_000) { console.error("presupuesto de nodos agotado"); return false; }
  if (active.size === 0) {
    for (const deck of [1, 2] as const) {
      const c = counters.get(deck)!;
      for (const cost of [1, 2, 3, 4, 5]) if ((c[cost] ?? 0) !== CURVE[cost]) return false;
    }
    return true;
  }
  let bestI = -1;
  let bestList: Opt[] = [];
  for (const i of active) {
    const [, kw, deck] = ROWS[i];
    const trig = TRIGGER[kw];
    const list = opts[i].filter((o) => {
      if (comboSeen.has(o.combo)) return false;
      if (kwXTrig.has(`${kw}|${ROWS[i][4]}|${trig}`)) return false;
      if (kwTrigCost.has(`${kw}|${trig}|${o.cost}`)) return false;
      if (deck !== 0) {
        const c = counters.get(deck)!;
        if ((c[o.cost] ?? 0) >= CURVE[o.cost]) return false;
      }
      return true;
    });
    if (bestI === -1 || list.length < bestList.length) { bestI = i; bestList = list; }
    if (bestList.length === 0) break;
  }
  if (bestList.length === 0) return false;
  const i = bestI;
  const [, kw, deck] = ROWS[i];
  const trig = TRIGGER[kw];
  for (const o of bestList) {
    comboSeen.add(o.combo); kwXTrig.add(`${kw}|${ROWS[i][4]}|${trig}`); kwTrigCost.add(`${kw}|${trig}|${o.cost}`);
    if (deck !== 0) counters.get(deck)![o.cost] = (counters.get(deck)![o.cost] ?? 0) + 1;
    chosen[i] = o;
    active.delete(i);
    if (solve(active, counters)) return true;
    active.add(i);
    chosen[i] = null;
    if (deck !== 0) counters.get(deck)![o.cost]!--;
    comboSeen.delete(o.combo); kwXTrig.delete(`${kw}|${ROWS[i][4]}|${trig}`); kwTrigCost.delete(`${kw}|${trig}|${o.cost}`);
  }
  return false;
}

if (!solve(new Set(ROWS.map((_, i) => i)), new Map([[1, {} as Record<number, number>], [2, {} as Record<number, number>]]))) {
  console.error("SIN SOLUCIÓN");
  process.exit(1);
}

console.log("SOLUCIÓN TINKER:\n");
for (let i = 0; i < ROWS.length; i++) {
  const [id, kw, deck, , X] = ROWS[i];
  const o = chosen[i]!;
  console.log(`${id.padEnd(26)} ${kw.padEnd(14)} deck${deck} → cost ${o.cost} · X ${X} · power ${o.power}`);
}
