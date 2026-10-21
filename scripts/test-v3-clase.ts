// ============================================================================
// TEST V3.0 — SUITE POR CLASE (paramétrica: bun scripts/test-v3-clase.ts <clase>)
// ============================================================================
// Guardianes del pool de 28 de cada clase nueva (plan-expansion-v3 §5):
//   · 28 ids únicos · carriles 8/8/12 (el de 12 = tema del jefe)
//   · por carril 2 Ataque + 1 Ítem + 1 Acción por tanda de 4
//   · mazo I y mazo II: curva exacta 1×2/2×3/3×5/4×1/5×1 y 12 keywords distintas
//   · id = slug(nombre) (patrón de arte public/cards/{id}.webp)
//   · PTP ±0.5 en todas · texto cita SU X (coherencia texto↔keyword)
//   · sin keywords de clase ajena en los carriles propios
// Ejecutar: bun scripts/test-v3-clase.ts botanico
// ============================================================================

import { CLASS_DECKS, CLASS_DECKS_SECOND, BOSS_DECKS, classCardsOf, cardPoolForClass } from "../src/lib/game/cards";
import { getBalanceInfo, materializeCard } from "../src/lib/game/balance";
import { CLASS_META, KEYWORD_META, type GameClass, type Keyword } from "../src/lib/game/types";
import { V3_NEW_CLASSES } from "../src/lib/game/v3";

const cls = (process.argv[2] ?? "") as GameClass;
const KNOWN = [...V3_NEW_CLASSES];

if (!KNOWN.includes(cls)) {
  console.error(`Uso: bun scripts/test-v3-clase.ts <${KNOWN.join("|")}>`);
  process.exit(2);
}

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, extra = "") {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}${extra ? ` — ${extra}` : ""}`);
  }
}
function section(t: string) {
  console.log(`\n── ${t} ${"─".repeat(Math.max(0, 58 - t.length))}`);
}

const pool = classCardsOf(cls);
const deckI = CLASS_DECKS[cls];
const deckII = CLASS_DECKS_SECOND[cls];
const lanes = CLASS_META[cls].lanes;
// El carril del JEFE es el de 12 cartas (Botánico/Pirata: el 3º; Tinker:
// MAQUINARIA, el central — plan-expansion-v3 §2.3).
const bossLane = lanes.find((l) => pool.filter((c) => c.subtypes[0] === l).length === 12) ?? lanes[2];
const laneSet = new Set<string>(lanes);

section(`${cls}: pool de 28`);
{
  check("28 cartas", pool.length === 28, `n=${pool.length}`);
  check("ids únicos", new Set(pool.map((c) => c.id)).size === 28);
  check("mazo I 12 + mazo II 12 + 4 del jefe", deckI.length === 12 && deckII.length === 12 && pool.length === 28);
  check("mazo I y II sin solaparse", !deckI.some((d) => deckII.some((e) => e.id === d.id)));
  const bossOnly = pool.filter((c) => !deckI.some((d) => d.id === c.id) && !deckII.some((d) => d.id === c.id));
  check("4 cartas exclusivas del jefe", bossOnly.length === 4, `n=${bossOnly.length}`);
  check("las 4 del jefe son del carril temático", bossOnly.every((c) => c.subtypes[0] === bossLane));

  const laneCount: Record<string, number> = {};
  for (const c of pool) laneCount[c.subtypes[0]] = (laneCount[c.subtypes[0]] ?? 0) + 1;
  check(
    `carriles 8/8/12 (12 = ${bossLane})`,
    lanes.every((l) => laneCount[l] === (l === bossLane ? 12 : 8)),
    JSON.stringify(laneCount)
  );

  for (const lane of lanes) {
    const cards = pool.filter((c) => c.subtypes[0] === lane);
    const cats = cards.map((c) => c.category);
    const ataques = cats.filter((c) => c === "Ataque").length;
    const items = cats.filter((c) => c === "Ítem").length;
    const acciones = cats.filter((c) => c === "Acción").length;
    check(
      `${lane}: patrón por tandas de 4 (2A+1I+1A ×${cards.length / 4})`,
      ataques === (cards.length / 4) * 2 && items === cards.length / 4 && acciones === cards.length / 4,
      `A${ataques}/I${items}/Ac${acciones}`
    );
  }
}

section(`${cls}: mazos I y II (curva + 12 keywords + patrón)`);
{
  const EXPECT_CURVE: Record<number, number> = { 1: 2, 2: 3, 3: 5, 4: 1, 5: 1 };
  for (const [name, deck] of [["mazo I", deckI], ["mazo II", deckII]] as const) {
    const curve: Record<number, number> = {};
    for (const c of deck) curve[c.cost] = (curve[c.cost] ?? 0) + 1;
    check(
      `${name}: curva 1×2 2×3 3×5 4×1 5×1`,
      JSON.stringify(curve) === JSON.stringify(EXPECT_CURVE),
      JSON.stringify(curve)
    );
    // Pirata: Motín (hasValue=false) es ÚNICO en el pool → vive SOLO en el
    // mazo I; el mazo II repite una neutral con otra X → 11 familias.
    const expectDistinct = cls === "pirata" && name === "mazo II" ? 11 : 12;
    check(`${name}: ${expectDistinct} keywords distintas`, new Set(deck.map((c) => c.keyword!)).size === expectDistinct, `hay ${new Set(deck.map((c) => c.keyword!)).size}`);
    check(`${name}: id = slug(nombre) (patrón de arte)`, deck.every((c) => c.id === c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")));
    for (const lane of lanes) {
      const laneCards = deck.filter((c) => c.subtypes.includes(lane));
      const cats = laneCards.map((c) => c.category).sort().join(",");
      check(
        `${name} · ${lane}: 2 Ataque + 1 Ítem + 1 Acción`,
        laneCards.length === 4 && cats === "Acción,Ataque,Ataque,Ítem",
        `[${cats}]`
      );
      const foreign = laneCards.filter((c) => c.keyword && c.subtypes.some((s) => !laneSet.has(s)));
      check(`${name} · ${lane}: sin keywords de clase ajena`, foreign.length === 0);
    }
  }
}

section(`${cls}: balance y coherencia de texto`);
{
  const bad = pool.filter((c) => !getBalanceInfo(c).balanced);
  check("28/28 PTP ±0.5", bad.length === 0, bad.map((c) => `${c.name} (${getBalanceInfo(c).delta.toFixed(1)})`).join(" · "));

  // El texto debe citar el X de la carta (los números derivados de X: X y 2X).
  const textBad: string[] = [];
  for (const c of pool) {
    if (!c.keyword || !c.keywordValue) continue;
    const x = c.keywordValue;
    const usaX = c.text.includes(String(x));
    const usa2X = c.text.includes(String(2 * x));
    const doble = /2X|dobla|madura/i.test(c.text) || c.keyword === "estacion" || c.keyword === "sobrecalentar";
    if (!usaX || (doble && !usa2X)) textBad.push(`${c.id} (X=${x})`);
  }
  check("texto cita SU X (y 2X en fórmulas dobles)", textBad.length === 0, textBad.join(", "));

  // Escalado por rareza determinista: la legendaria sube +5 poder y +1 X, y el
  // texto debe reflejar el nuevo número (mismo mecanismo que las clases base).
  const sample = pool.find((c) => c.keyword && c.keywordValue && KEYWORD_META[c.keyword as Keyword].hasValue)!;
  const legend = materializeCard(sample, "legendary");
  check(
    `fusión determinista (${sample.id}: X${sample.keywordValue}→X${legend.keywordValue})`,
    legend.power === sample.power + 5 && legend.keywordValue === (sample.keywordValue ?? 0) + 1 && legend.text.includes(String((sample.keywordValue ?? 0) + 1))
  );

  // El pool completo está disponible para el constructor de mazos por clase.
  check("cardPoolForClass incluye TODO el pool de la clase", cardPoolForClass(cls).length >= pool.length);
  check("BOSS_DECKS = 12 del carril temático", BOSS_DECKS[cls].length === 12, `n=${BOSS_DECKS[cls].length}`);
}

console.log(`\n════════════════════════════════════════`);
console.log(`${cls.toUpperCase()}: ${passed} ✓ · ${failed} ✗`);
if (failed > 0) process.exit(1);
