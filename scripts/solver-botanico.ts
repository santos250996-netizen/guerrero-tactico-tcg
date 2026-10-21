// ============================================================================
// SOLVER de combos V3-Botánico — asigna (coste, X, poder) a las 28 cartas
// satisfaciendo TODAS las restricciones a la vez:
//   1. curva exacta por mazo (1×2/2×3/3×5/4×1/5×1) en deck I y deck II
//   2. Regla A: sin (keyword, X, trigger) repetido en el pool de 28
//   3. Regla B: sin (keyword, trigger, coste) repetido en el pool de 28
//   4. combo global (coste,poder,keyword,X,trigger) ∉ catálogo existente (84)
//   5. PTP: power + ep ∈ [cost*4+1.5 ± 0.5], power entero ≥ 0
// Los BLOQUEOS fijan cartas que ya están como deben estar.
// Ejecutar: bun scripts/solver-botanico.ts
// ============================================================================
import { ALL_CARDS_V3, BOTANICO_CARDS, BOTANICO2_CARDS, BOTANICO_BOSS_CARDS } from "../src/lib/game/cards";
import { KEYWORD_META } from "../src/lib/game/types";

// [id, familia keyword, deck (1|2|0=jefe), categoría, coste fijo?, X fijo?, poder fijo?]
type Row = [string, string, 0 | 1 | 2, string, number | null, number | null, number | null];

const ROWS: Row[] = [
  // ── DECK I ──
  ["guardian_de_corteza", "micelio", 1, "Ataque", null, 2, null],
  ["anciano_raiz", "estacion", 1, "Acción", null, 2, null],
  ["yema_protegida", "coraza", 1, "Ítem", null, 4, null],
  ["brote_fervoroso", "fervor", 1, "Ataque", null, 2, null],
  ["polinizador_solar", "simbiosis", 1, "Ataque", null, 2, null],
  ["lecho_de_petalos", "floracion", 1, "Acción", null, 2, null],
  ["estandarte_de_savia", "insignia", 1, "Ítem", null, 2, null],
  ["cepa_heredada", "legado", 1, "Ataque", null, 3, null],
  ["vientrespora", "polen", 1, "Ataque", null, 2, null],
  ["boca_de_musgo", "carnivora", 1, "Ataque", null, 3, null],
  ["esporas_toxicas", "remate", 1, "Ítem", null, 2, null],
  ["circulo_de_hongos", "fortaleza", 1, "Acción", null, 2, null],
  // ── DECK II ──
  ["zarcillo_tenaz", "fervor", 2, "Ataque", null, 4, null],
  ["estacion_invernal", "estacion", 2, "Acción", null, 1, null],
  ["reserva_de_savia", "coraza", 2, "Ítem", null, 1, null],
  ["corteza_de_hierro", "micelio", 2, "Ataque", null, 3, null],
  ["enjambre_de_zumbidos", "simbiosis", 2, "Ataque", null, 1, null],
  ["jardin_colgante", "floracion", 2, "Acción", null, 1, null],
  ["nectar_concentrado", "insignia", 2, "Ítem", null, 1, null],
  ["raiz_del_antiguo", "legado", 2, "Ataque", null, 2, null],
  ["esporas_punzantes", "polen", 2, "Ataque", null, 3, null],
  ["flor_devoradora", "carnivora", 2, "Ataque", null, 2, null],
  ["amanita_mortal", "remate", 2, "Ítem", null, 3, null],
  ["coro_de_setas", "fortaleza", 2, "Acción", null, 3, null],
  // ── JEFE (sin curva) ──
  ["moho_penetrante", "polen", 0, "Ataque", null, 1, null],
  ["hongopardo_colosal", "carnivora", 0, "Ataque", null, 1, null],
  ["tripa_de_tronco", "fortaleza", 0, "Ítem", null, 1, null],
  ["boca_de_yggra", "carnivora", 0, "Acción", null, 4, null],
];

const BASE: Record<string, number> = {
  micelio: 0.9, estacion: 2.6, simbiosis: 1.1, floracion: 1.2, polen: 1.4,
  carnivora: 1.9, coraza: 1.0, fervor: 3.0, insignia: 1.0, legado: 1.0,
  remate: 2.0, fortaleza: 2.5,
};
const SCOPE: Record<string, number> = {
  micelio: 1.2, estacion: 1.0, simbiosis: 1.0, floracion: 1.2, polen: 1.2,
  carnivora: 1.2, coraza: 1.0, fervor: 1.0, insignia: 1.2, legado: 1.2,
  remate: 1.2, fortaleza: 1.2,
};
const TRIGGER: Record<string, string> = {
  micelio: "on_play", estacion: "start_turn", simbiosis: "on_play", floracion: "on_death",
  polen: "on_play", carnivora: "on_play", coraza: "on_play", fervor: "start_turn",
  insignia: "on_play", legado: "on_death", remate: "on_play", fortaleza: "end_turn",
};

function epOf(kw: string, X: number): number {
  const trig = TRIGGER[kw];
  const once = trig === "start_turn" || trig === "end_turn" ? 0.8 : 1.0;
  return BASE[kw] * X * SCOPE[kw] * once;
}

// Combos GLOBALES ya ocupados por el catálogo EXISTENTE (las 84 + ninguna mía)
const myIds = new Set([...ROWS.map((r) => r[0])]);
const globalUsed = new Set(
  ALL_CARDS_V3.filter((c) => !myIds.has(c.id)).map(
    (c) => `${c.cost}|${c.power}|${c.keyword}|${c.keywordValue ?? 0}|${c.trigger}`
  )
);

// Opciones válidas por carta
interface Opt { cost: number; X: number; power: number; combo: string }
function optionsFor(row: Row): Opt[] {
  const [id, kw, , , cFix, xFix, pFix] = row;
  const out: Opt[] = [];
  for (let cost = 1; cost <= 5; cost++) {
    if (cFix !== null && cost !== cFix) continue;
    for (let X = 1; X <= 5; X++) {
      if (xFix !== null && X !== xFix) continue;
      const ep = epOf(kw, X);
      const target = cost * 4 + 1.5;
      for (let power = Math.floor(target - ep - 0.5); power <= Math.ceil(target - ep + 0.5); power++) {
        if (pFix !== null && power !== pFix) continue;
        if (power < 0) continue;
        const cur = power + ep;
        if (cur < target - 0.5 - 1e-9 || cur > target + 0.5 + 1e-9) continue;
        const combo = `${cost}|${power}|${kw}|${X}|${TRIGGER[kw]}`;
        if (globalUsed.has(combo)) continue;
        out.push({ cost, X, power, combo });
      }
    }
  }
  return out;
}

// DFS con backtracking
const opts = ROWS.map(optionsFor);
for (let i = 0; i < ROWS.length; i++) {
  if (opts[i].length === 0) { console.error(`SIN OPCIONES: ${ROWS[i][0]}`); process.exit(1); }
}

// Contadores de curva por deck: {1:2, 2:3, 3:5, 4:1, 5:1}
const CURVE: Record<number, number> = { 1: 2, 2: 3, 3: 5, 4: 1, 5: 1 };

const chosen: (Opt | null)[] = ROWS.map(() => null);
const comboSeen = new Set<string>();
const kwXTrig = new Set<string>(); // Regla A
const kwTrigCost = new Set<string>(); // Regla B

// Orden: primero las de deck (curva las ata), jefe al final
const order = ROWS.map((_, i) => i).sort((a, b) => (ROWS[a][2] === 0 ? 1 : 0) - (ROWS[b][2] === 0 ? 1 : 0));

function deckCounters(deck: 0 | 1 | 2, cost: number, sign: 1 | -1, counters: Map<number, Record<number, number>>): boolean {
  if (deck === 0) return true;
  const c = counters.get(deck)!;
  c[cost] = (c[cost] ?? 0) + sign;
  if (c[cost] < 0 || c[cost] > CURVE[cost]) { c[cost] -= sign; return false; }
  return true;
}

function solve(pos: number, counters: Map<number, Record<number, number>>): boolean {
  if (pos === order.length) {
    // verificar curvas completas
    for (const deck of [1, 2] as const) {
      const c = counters.get(deck)!;
      for (const cost of [1, 2, 3, 4, 5]) if ((c[cost] ?? 0) !== CURVE[cost]) return false;
    }
    return true;
  }
  const i = order[pos];
  const [id, kw, deck] = ROWS[i];
  const trig = TRIGGER[kw];
  for (const o of opts[i]) {
    if (comboSeen.has(o.combo)) continue;
    const aKey = `${kw}|${o.X}|${trig}`;
    if (kwXTrig.has(aKey)) continue;
    const bKey = `${kw}|${trig}|${o.cost}`;
    if (kwTrigCost.has(bKey)) continue;
    if (!deckCounters(deck, o.cost, 1, counters)) continue;
    chosen[i] = o; comboSeen.add(o.combo); kwXTrig.add(aKey); kwTrigCost.add(bKey);
    if (solve(pos + 1, counters)) return true;
    chosen[i] = null; comboSeen.delete(o.combo); kwXTrig.delete(aKey); kwTrigCost.delete(bKey);
    deckCounters(deck, o.cost, -1, counters);
  }
  return false;
}

const counters = new Map([[1, {} as Record<number, number>], [2, {} as Record<number, number>]]);
if (!solve(0, counters)) {
  console.error("SIN SOLUCIÓN — relajar bloqueos o X fijos");
  process.exit(1);
}

console.log("SOLUCIÓN ENCONTRADA:\n");
for (let i = 0; i < ROWS.length; i++) {
  const [id, kw, deck] = ROWS[i];
  const o = chosen[i]!;
  console.log(`${id.padEnd(24)} ${kw.padEnd(11)} deck${deck} → cost ${o.cost} · X ${o.X} · power ${o.power}`);
}
