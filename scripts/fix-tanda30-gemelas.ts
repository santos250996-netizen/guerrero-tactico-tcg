// Mini-resolvedor T-E: para los 4 "relleno" de tanda30 que colisionan con
// Regla A/B dentro del pool de 36, prueba vecinos (X, coste, keyword) y
// devuelve ajustes con PTP ±0.5, sin Regla A (kw|X|trigger) ni Regla B
// (kw|trigger|coste) dentro de su clase, sin duplicar combo global
// (coste|poder|kw|X|trigger) y sin repetir combo dentro de su carril.
// NO toca cards.ts: imprime la propuesta y yo edito a mano.
import { classCardsOf, ALL_CARDS_V3 } from "../src/lib/game/cards";
import { getBalanceInfo } from "../src/lib/game/balance";
import { KEYWORD_META, type CardDef, type Keyword } from "../src/lib/game/types";

const OBJETIVOS: { id: string; cls: "guerrero" | "mago" | "asesino" }[] = [
  { id: "rompefilas_orco", cls: "guerrero" },   // A: orden_batalla|1 = legionario
  { id: "maza_berserker", cls: "guerrero" },    // A: impetu|1 = berserker_recluta · B: impetu c1 = emblema
  { id: "aprendiz_inquieto", cls: "mago" },     // A: drenar_poder|1 = aberracion
  { id: "mantis_verde", cls: "asesino" },       // A: contagio|1 = frasco_de_peste
  { id: "navaja_de_taberna", cls: "asesino" },  // A: golpe_certero|1 = punialada
];

// keywords que existen en el juego y pueden llevarse en el carril (Regla A
// global: exclusiveSubtype debe coincidir o ser null)
const KW_TODOS = Object.keys(KEYWORD_META) as Keyword[];

const combo = (c: CardDef) =>
  `${c.cost}|${c.power}|${c.keyword ?? "none"}|${c.keywordValue ?? 0}|${c.trigger ?? (c.keyword ? KEYWORD_META[c.keyword].trigger : "on_play")}`;

const globalCombos = new Map<string, string>();
for (const c of ALL_CARDS_V3) globalCombos.set(combo(c), c.id);

for (const { id, cls } of OBJETIVOS) {
  const pool = classCardsOf(cls).filter((c) => c.id !== id);
  const original = classCardsOf(cls).find((c) => c.id === id)!;
  const lane = original.subtypes[0];
  const laneCombos = new Set(
    pool.filter((c) => c.subtypes[0] === lane).map((c) => `${c.keyword}|${c.keywordValue ?? 0}`)
  );
  const reglaA = new Set(pool.filter((c) => c.keyword).map((c) => `${c.keyword}|${c.keywordValue ?? 0}|${c.trigger ?? "-"}`));
  const reglaB = new Set(pool.filter((c) => c.keyword).map((c) => `${c.keyword}|${c.trigger ?? "-"}|${c.cost}`));
  const opciones: string[] = [];

  for (const kw of KW_TODOS) {
    if (kw === ("none" as unknown as Keyword)) continue;
    const excl = KEYWORD_META[kw].exclusiveSubtype;
    if (excl && excl !== lane) continue;
    for (const X of [1, 2, 3]) {
      for (const coste of [Math.max(1, original.cost - 1), original.cost, original.cost + 1]) {
        for (let poder = Math.max(1, original.power - 6); poder <= original.power + 6; poder++) {
          const base = {
            ...original,
            cost: coste,
            power: poder,
            keyword: kw,
            keywordValue: X,
            trigger: KEYWORD_META[kw].trigger,
          } as CardDef;
          const info = getBalanceInfo(base);
          if (Math.abs(info.delta) > 0.5) continue;
          const trig = KEYWORD_META[kw].trigger;
          if (reglaA.has(`${kw}|${X}|${trig}`)) continue;
          if (reglaB.has(`${kw}|${trig}|${coste}`)) continue;
          if (laneCombos.has(`${kw}|${X}`)) continue;
          const k = combo(base);
          if (globalCombos.has(k)) continue;
          opciones.push(`kw=${kw} X=${X} coste=${coste} poder=${poder} (delta ${info.delta.toFixed(2)})`);
          if (opciones.length >= 6) break;
        }
        if (opciones.length >= 6) break;
      }
      if (opciones.length >= 6) break;
    }
    if (opciones.length >= 6) break;
  }
  console.log(`\n── ${id} (${cls}/${lane}, original kw=${original.keyword} X=${original.keywordValue} c${original.cost} p${original.power})`);
  console.log(opciones.length ? opciones.map((o) => "  · " + o).join("\n") : "  ✗ SIN OPCIONES");
}
