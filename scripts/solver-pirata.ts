// ============================================================================
// SOLVER de combos V3-Pirata — asigna poder (coste y X fijados por diseño)
// satisfaciendo: curva por mazo, Reglas A/B, unicidad global de combo, PTP.
// NOTA: Motín es hasValue=false (único en el pool) → deck II repite CORAZA.
// Ejecutar: bun scripts/solver-pirata.ts
// ============================================================================
import { ALL_CARDS_V3 } from "../src/lib/game/cards";

type Row = [string, string, 0 | 1 | 2, string, number | null, number];

const ROWS: Row[] = [
  ["abordaje_al_amanecer", "saqueo", 1, "Ataque", 2, 3],
  ["grumete_ruidoso", "tripulacion", 1, "Ataque", 1, 1],
  ["cofres_de_remo", "coraza", 1, "Ítem", 3, 2],
  ["viento_favorable", "fervor", 1, "Acción", 1, 3],
  ["amotinado_del_ron", "motin", 1, "Ataque", null, 4],
  ["pacto_de_contrabando", "contrabando", 1, "Ítem", 2, 2],
  ["cofre_del_ahogado", "legado", 1, "Ataque", 2, 1],
  ["noche_de_velas", "insignia", 1, "Acción", 1, 2],
  ["andanada_de_saludo", "canonazo", 1, "Ataque", 1, 3],
  ["polvorin_viejo", "andanada", 1, "Ataque", 2, 3],
  ["mecha_cortada", "remate", 1, "Ítem", 4, 5],
  ["humo_de_polvora", "fortaleza", 1, "Acción", 2, 3],
  ["saqueo_del_baron", "saqueo", 2, "Ataque", 3, 4],
  ["marinero_de_aguas_negras", "tripulacion", 2, "Ataque", 2, 2],
  ["coraza_de_roble", "coraza", 2, "Ítem", 2, 1],
  ["grito_de_abordaje", "fervor", 2, "Acción", 4, 3],
  ["contrabando_de_polvora", "contrabando", 2, "Ítem", 3, 2],
  ["lobo_del_mar", "legado", 2, "Ataque", 3, 1],
  ["bandera_negra", "insignia", 2, "Acción", 3, 3],
  ["cuchillo_de_sable", "remate", 2, "Ataque", 3, 3],
  ["canon_de_cubierta", "canonazo", 2, "Ataque", 2, 2],
  ["salva_de_despedida", "andanada", 2, "Ataque", 3, 3],
  ["placas_del_casco", "coraza", 2, "Ítem", 4, 5],
  ["bateria_de_cubierta", "fortaleza", 2, "Acción", 3, 3],
  ["canon_volador", "canonazo", 0, "Ataque", 3, 4],
  ["kraken_de_polvora", "andanada", 0, "Ataque", 1, 1],
  ["paquete_sospechoso", "contrabando", 0, "Ítem", 1, 1],
  ["boca_de_kaela", "canonazo", 0, "Acción", 4, 5],
];

const BASE: Record<string, number> = {
  saqueo: 1.6, tripulacion: 2.0, motin: 5.0, contrabando: 0.35,
  canonazo: 1.7, andanada: 1.3, coraza: 1.0, fervor: 3.0, insignia: 1.0,
  legado: 1.0, remate: 2.0, fortaleza: 2.5,
};
const SCOPE: Record<string, number> = {
  saqueo: 1.2, tripulacion: 1.0, motin: 1.0, contrabando: 1.2,
  canonazo: 1.4, andanada: 1.4, coraza: 1.0, fervor: 1.0, insignia: 1.2,
  legado: 1.2, remate: 1.2, fortaleza: 1.2,
};
const TRIGGER: Record<string, string> = {
  saqueo: "on_play", tripulacion: "start_turn", motin: "on_play", contrabando: "on_play",
  canonazo: "on_play", andanada: "on_death", coraza: "on_play", fervor: "start_turn",
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

interface Opt { cost: number; X: number; power: number; combo: string }
function optionsFor(row: Row): Opt[] {
  const [id, kw, , , xFix, costFix] = row;
  const xs = xFix === null ? [0] : [1, 2, 3, 4, 5];
  const out: Opt[] = [];
  for (const c2 of [costFix - 1, costFix, costFix + 1]) {
    if (c2 < 1 || c2 > 5) continue;
    for (const X of xs) {
    const ep = epOf(kw, X);
    const target = c2 * 4 + 1.5;
    for (let power = 0; power <= 25; power++) {
      const cur = power + ep;
      if (cur < target - 0.5 - 1e-9 || cur > target + 0.5 + 1e-9) continue;
      const combo = `${c2}|${power}|${kw}|${X}|${TRIGGER[kw]}`;
      if (globalUsed.has(combo)) continue;
      out.push({ cost: c2, X, power, combo });
    }
    }
  }
  if (out.length === 0) console.error(`SIN OPCIONES PREVIAS: ${id}`);
  return out;
}

const opts = ROWS.map(optionsFor);
const CURVE: Record<number, number> = { 1: 2, 2: 3, 3: 5, 4: 1, 5: 1 };
const chosen: (Opt | null)[] = ROWS.map(() => null);
const comboSeen = new Set<string>();
const kwXTrig = new Set<string>();
const kwTrigCost = new Set<string>();

function solve(active: Set<number>, counters: Map<number, Record<number, number>>): boolean {
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
      if (kwXTrig.has(`${kw}|${o.X}|${trig}`)) return false;
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
    comboSeen.add(o.combo); kwXTrig.add(`${kw}|${o.X}|${trig}`); kwTrigCost.add(`${kw}|${trig}|${o.cost}`);
    if (deck !== 0) counters.get(deck)![o.cost] = (counters.get(deck)![o.cost] ?? 0) + 1;
    chosen[i] = o;
    active.delete(i);
    if (solve(active, counters)) return true;
    active.add(i);
    chosen[i] = null;
    if (deck !== 0) counters.get(deck)![o.cost]!--;
    comboSeen.delete(o.combo); kwXTrig.delete(`${kw}|${o.X}|${trig}`); kwTrigCost.delete(`${kw}|${trig}|${o.cost}`);
  }
  return false;
}

if (!solve(new Set(ROWS.map((_, i) => i)), new Map([[1, {} as Record<number, number>], [2, {} as Record<number, number>]]))) {
  console.error("SIN SOLUCIÓN");
  process.exit(1);
}

console.log("SOLUCIÓN PIRATA:\n");
for (let i = 0; i < ROWS.length; i++) {
  const [id, kw, deck, , X] = ROWS[i];
  const o = chosen[i]!;
  console.log(`${id.padEnd(26)} ${kw.padEnd(12)} deck${deck} → cost ${o.cost} · X ${X ?? "—"} · power ${o.power}`);
}
