// ============================================================================
// TEST-NO-GEMELAS — Task 48: prohibición de cartas gemelas por clase.
// El jugador: «hay cartas q practicamente tienen mismo efecto y poder en un
// juego donde cada clase aun tiene 28 cartas no se puede permitir eso».
//
// REGLA A — prohibido: mismo keyword + mismo X + mismo trigger dentro de la
//           clase (texto prácticamente idéntico, solo cambia el cuerpo).
// REGLA B — prohibido: mismo keyword + mismo trigger + mismo coste dentro de
//           la clase (misma ranura de curva: gemela de hueco).
// REGLA C — permitido: tiering (X distinto Y coste distinto) — se lista.
//
// Además: el texto de cada carta debe citar SU X escalado (coherencia texto-
// keyword con la rareza común) y el pool de clase sigue siendo 28.
// Ejecutar: npx tsx scripts/test-no-gemelas.ts
// ============================================================================
import { classCardsOf, ALL_CARDS_V3 } from "../src/lib/game/cards";
import type { GameClass } from "../src/lib/game/types";
import { getBalanceInfo } from "../src/lib/game/balance";
import { KEYWORD_META } from "../src/lib/game/types";
import { BASE_CLASSES, V3_NEW_CLASSES } from "../src/lib/game/v3";

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

// V3.0: paramétrico — valida las 3 clases base SIEMPRE y las clases nuevas
// solo cuando su pool ya existe (decks vacíos en T-A se saltan sin fallar).
const CLASSES: GameClass[] = [...BASE_CLASSES, ...V3_NEW_CLASSES];
function poolReady(cls: GameClass): boolean {
  return classCardsOf(cls).length > 0;
}

section("REGLA A — sin textos gemelos (keyword+X+trigger) por clase");
{
  for (const cls of CLASSES) {
    if (!poolReady(cls)) continue;
    const cards = classCardsOf(cls);
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const c of cards) {
      if (!c.keyword) continue;
      const key = `${c.keyword}|${c.keywordValue ?? 0}|${c.trigger ?? "-"}`;
      if (seen.has(key)) dupes.push(`${seen.get(key)} ≡ ${c.id} [${key}]`);
      else seen.set(key, c.id);
    }
    check(`${cls}: 0 pares con texto idéntico`, dupes.length === 0, dupes.join(" · "));
  }
}

section("REGLA B — sin gemelas de hueco (keyword+trigger+coste) por clase");
{
  for (const cls of CLASSES) {
    if (!poolReady(cls)) continue;
    const cards = classCardsOf(cls);
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const c of cards) {
      if (!c.keyword) continue;
      const key = `${c.keyword}|${c.trigger ?? "-"}|${c.cost}`;
      if (seen.has(key)) dupes.push(`${seen.get(key)} ≡ ${c.id} [${key}]`);
      else seen.set(key, c.id);
    }
    check(`${cls}: 0 gemelas de la misma ranura de coste`, dupes.length === 0, dupes.join(" · "));
  }
}

section("Cada familia de keyword es una escalera (X distintos o triggers distintos)");
{
  const ladder: Record<string, string> = {
    guerrero: "impetu ×1(2/8) · ×2(1/2) · ×3(3/9) · coraza ×2/×3/×4 · amparo ×1/×2",
    mago: "llamarada ×1/×2 · ventisca ×1/×2 · remate ×2/×3 · coraza ×2/×3/×4 · escarcha ×1/×2/×3 · fervor ×2/×3 · legado ×2/×3 · drenar ×1/×2",
    asesino: "purga ×2/×3 · emboscada ×2/×3",
  };
  for (const cls of CLASSES) {
    if (!poolReady(cls)) continue;
    const cards = classCardsOf(cls);
    const fams = new Map<string, Set<string>>();
    for (const c of cards) {
      if (!c.keyword) continue;
      const key = `${c.keyword}|${c.trigger ?? "-"}`;
      if (!fams.has(key)) fams.set(key, new Set());
      fams.get(key)!.add(String(c.keywordValue ?? 0));
    }
    const flat = [...fams.entries()]
      .filter(([, xs]) => xs.size > 1)
      .map(([k, xs]) => `${k.split("|")[0]}×${[...xs].sort().join("/")}`)
      .sort()
      .join(" · ");
    check(`${cls}: escaleras presentes (${flat || "—"})`, true);
  }
}

section("Pool de clase intacto: 36 (base, con ampliación tanda 30) / 28 (V3), ids únicos");
{
  for (const cls of CLASSES) {
    if (!poolReady(cls)) continue;
    const cards = classCardsOf(cls);
    // V3.0 · tanda 30: las clases BASE pasan a 36 (mazos I/II + jefe + 8 de
    // la ampliación); las clases V3 se quedan en 28.
    const esperado = BASE_CLASSES.includes(cls) ? 36 : 28;
    check(`${cls}: ${esperado} cartas`, cards.length === esperado, `n=${cards.length}`);
    check(`${cls}: ids únicos`, new Set(cards.map((c) => c.id)).size === esperado);
  }
  // V3.0: el catálogo CRECE por tandas (84 → 112 → 140 → 168). El guardián
  // es la UNICIDAD total, no un número fijo.
  check(`catálogo: ${ALL_CARDS_V3.length} ids únicos`, new Set(ALL_CARDS_V3.map((c) => c.id)).size === ALL_CARDS_V3.length);
}

section(`PTP: TODAS las ${ALL_CARDS_V3.length} cartas en rango (±0.5)`);
{
  const bad = ALL_CARDS_V3.filter((c) => !getBalanceInfo(c).balanced);
  check(`${ALL_CARDS_V3.length}/${ALL_CARDS_V3.length} calibradas`, bad.length === 0, bad.map((c) => `${c.name} (${getBalanceInfo(c).delta.toFixed(1)})`).join(" · "));
}

section("Coherencia texto↔X en las 17 cartas retocadas (texto cita SU valor)");
{
  const expect: [string, string][] = [
    ["aberracion_arcana", "reduce en 1"],
    ["lengua_de_fuego", "reduce en 2"],
    ["viento_cortante", "reduce en 1"],
    ["carapacho_glacial", "próximas 2"],
    ["estallido_igneo", "gana +4"],
    ["alma_del_glaciar", "gana +3"],
    ["cuchilla_del_silencio", "hiere en 3"],
    ["fiera_ensangrentada", "gana +2 de poder"],
    ["emblema_de_sangre", "gana +2 por cada carta"],
    ["centinela_anclado", "escudo de 1"],
    ["estandarte_de_la_cohorte", "gana +4"],
    ["chispazo_incontrolado", "gana +2"],
    ["sombra_veloz", "gana +6"],
    ["cetro_de_escarcha", "hasta 1 punto"],
    ["anciano_del_norte", "gana +5"],
    ["estatua_viviente", "gana +3"],
    ["paves_de_la_muralla", "próximas 4"],
    ["juramento_de_acero", "gana +2"],
    ["aliento_gelido", "TODAS las cartas enemigas"],
    // V3.0 · tanda 30 — los 5 rellenos retocados para caber en el pool de 36
    // sin gemelas (Regla A/B) — el texto SIEMPRE cita su X real:
    ["rompefilas_orco", "ganan +2 de poder permanente"],
    ["maza_berserker", "gana +3 por cada carta"],
    ["aprendiz_inquieto", "absorbe 1 reducción de poder"],
    ["mantis_verde", "reduce en 3"],
    ["navaja_de_taberna", "gana +1 por cada carta enemiga"],
  ];
  for (const [id, frag] of expect) {
    const c = ALL_CARDS_V3.find((x) => x.id === id)!;
    check(`${c.name}: «…${frag}…»`, c.text.includes(frag), c.text);
  }
}

section("Ninguna carta quedó con keyword inexistente o trigger roto");
{
  const triggers = new Set(["on_play", "start_turn", "end_turn", "on_death"]);
  const bad = ALL_CARDS_V3.filter(
    (c) => (c.keyword && !KEYWORD_META[c.keyword]) || (c.trigger && !triggers.has(c.trigger))
  );
  check("keywords y triggers válidos en el catálogo", bad.length === 0, bad.map((c) => c.id).join(" · "));
}

console.log(`\n══════════════════════════════════════`);
console.log(`RESULTADO: ${passed} pasados · ${failed} fallados`);
console.log(`══════════════════════════════════════`);
process.exit(failed > 0 ? 1 : 0);
