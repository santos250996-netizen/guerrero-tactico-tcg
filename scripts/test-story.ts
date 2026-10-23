// ============================================================================
// Tests del MODO HISTORIA «EL PACTO DE GUERRA» — bun scripts/test-story.ts
// 1) Integridad del guion (7 capítulos, peleas completas, reglas válidas)
// 2) Lógica pura (resolveFight/variantes, decisiones, XP, épilogos por clase)
// 3) storyStore: avance pelea→capítulo→historia, decisiones, persistencia
// 4) Integración: setForcedPositionBonuses aplica la REGLA DE CAPÍTULO
// ============================================================================

import {
  STORY_CHAPTERS,
  STORY_TOTAL,
  STORY_CHOICES,
  STORY_ENDINGS,
  choiceAfterChapter,
  resolveFight,
  fightCry,
  isLastFight,
  storyXpForFight,
} from "../src/lib/game/story";
import { useStoryStore } from "../src/store/storyStore";
import { LANE_BONUS_POOL } from "../src/lib/game/types";
import type { LaneBonusKind } from "../src/lib/game/types";
import { biomeById } from "../src/lib/game/campaign";
import { createPvpState, joinBotPvpState, enableBossMode, setForcedPositionBonuses } from "../src/lib/game/pvp";
import { classDecksOf, BOSS_DECKS } from "../src/lib/game/cards";
import { materializeCard } from "../src/lib/game/balance";

// Polyfill localStorage + window para bun (los guards SSR del store usan
// `typeof window` — igual que test-admin-mythic)
if (typeof (globalThis as { localStorage?: unknown }).localStorage === "undefined") {
  const mem = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
    clear: () => mem.clear(),
  };
  (globalThis as { window?: unknown }).window = globalThis;
}

let passed = 0;
let failed = 0;

function assert(cond: boolean, label: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ FALLO: ${label}`);
  }
}

function section(t: string) {
  console.log(`\n── ${t} ──`);
}

// ===========================================================================
section("1. Integridad del guion: 7 capítulos, peleas completas, reglas válidas");
{
  assert(STORY_TOTAL === 7 && STORY_CHAPTERS.length === 7, "7 capítulos");
  assert(new Set(STORY_CHAPTERS.map((c) => c.id)).size === 7, "ids de capítulo únicos");
  assert(
    STORY_CHAPTERS.every((c, i) => c.num === i + 1),
    "numeración 1..7 en orden"
  );
  assert(
    STORY_CHAPTERS.every((c) => c.title.length > 2 && c.place.length > 2),
    "título y lugar en todos los capítulos"
  );
  // Biomas: cada capítulo cita una región real de la torre
  assert(
    STORY_CHAPTERS.every((c) => biomeById(c.biomeId).id === c.biomeId),
    "biomeId de cada capítulo existe (biomeById no cae al fallback)"
  );
  // Peleas: intro/win/lose completos, tier válido, rival con clase real
  for (const ch of STORY_CHAPTERS) {
    for (const f of ch.fights) {
      assert(f.intro.length >= 2, `c${ch.num} «${f.rival}»: intro con ${f.intro.length} líneas`);
      assert(f.win.length >= 1 && f.lose.length > 8, `c${ch.num} «${f.rival}»: win/lose presentes`);
      assert(fightCry(f).length > 5, `c${ch.num} «${f.rival}»: arenga para el splash`);
      if (f.bossDeck) {
        assert(BOSS_DECKS[f.rivalClass].length === 12, `c${ch.num} «${f.rival}»: mazo de JEFE con 12 cartas`);
        assert(f.bossMode === true, `c${ch.num} «${f.rival}»: jefe con bossMode (jugada gratis + 3 bonos)`);
      } else {
        const deck = classDecksOf(f.rivalClass)[f.deckIndex ?? 0];
        assert(deck.length === 12, `c${ch.num} «${f.rival}»: mazo oficial con 12 cartas`);
      }
      // Reglas de capítulo: los kinds existen en el pool (tipado ya lo exige — doble red)
      for (const k of f.forcedBonuses ?? []) {
        if (k) assert(LANE_BONUS_POOL.some((b) => b.kind === k), `c${ch.num}: bono «${k}» válido`);
      }
    }
    // Epílogo del capítulo
    assert(ch.epilogue.length >= 1, `c${ch.num}: epílogo presente`);
    assert(ch.rewardCards >= 3, `c${ch.num}: botín de capítulo ≥ 3`);
  }
  // Cada clase tiene campeón en la historia (6 rivales con bossDeck + heraldo)
  const bossClasses = new Set(
    STORY_CHAPTERS.flatMap((c) => c.fights.filter((f) => f.bossDeck).map((f) => f.rivalClass))
  );
  assert(bossClasses.size >= 5, `los 6 guardianes cubren ≥5 clases (${[...bossClasses].join(",")})`);
}

// ===========================================================================
section("2. Decisiones: 3 puntos, flags únicos, variantes que responden");
{
  assert(STORY_CHOICES.length === 3, "3 decisiones");
  assert(
    STORY_CHOICES.map((c) => c.afterChapter).join(",") === "0,2,4",
    "decisiones tras los capítulos 1, 3 y 5 (índices 0/2/4)"
  );
  for (const c of STORY_CHOICES) {
    assert(c.options.length === 2 && c.options[0].flag !== c.options[1].flag, `decisión ${c.id}: 2 opciones distintas`);
    assert(c.question.length > 10 && c.options.every((o) => o.label && o.desc), `decisión ${c.id}: texto completo`);
    assert(choiceAfterChapter(c.afterChapter)?.id === c.id, `decisión ${c.id} cuelga del capítulo correcto`);
  }
  // Variantes: los flags de las decisiones se usan en peleas posteriores
  const variantFlags = STORY_CHAPTERS.flatMap((c) => c.fights.flatMap((f) => (f.variants ?? []).map((v) => v.flag)));
  const choiceFlags = STORY_CHOICES.flatMap((c) => c.options.map((o) => o.flag));
  assert(
    variantFlags.every((f) => choiceFlags.includes(f)),
    "todas las variantes responden a flags de decisiones reales"
  );
  assert(variantFlags.length >= 3, `hay ≥3 variantes narrativas (${variantFlags.join(",")})`);

  // resolveFight: sin flags → base · con flag → variante aplicada
  const iria = STORY_CHAPTERS[3].fights[0];
  const base = resolveFight(iria, {});
  const variant = resolveFight(iria, { perdon_bram: true });
  assert(base.intro !== variant.intro, "Iria cambia de intro según la decisión del capítulo 1");
  assert(base.rival === variant.rival && base.tier === variant.tier, "…pero rival y tier se mantienen");
  // Variante de win en Kess (decisión de la bahía)
  const kess = STORY_CHAPTERS[5].fights[0];
  assert(resolveFight(kess, {}).win !== resolveFight(kess, { motin: true }).win, "Kess cambia su epílogo según la decisión de la bahía");
}

// ===========================================================================
section("3. storyStore: avance, decisiones, cierre y persistencia");
{
  useStoryStore.getState().resetStory();
  let st = useStoryStore.getState();
  assert(st.chapter === 0 && st.fight === 0 && !st.completed, "estado inicial limpio");

  // Capítulo 1 (1 pelea): ganarla cierra capítulo y avanza al 2
  let r = st.advance();
  st = useStoryStore.getState();
  assert(!r.completed && st.chapter === 1 && st.fight === 0, "c1 vencido → capítulo 2, pelea 1");
  // Capítulo 2 (2 peleas): la primera NO cierra
  r = st.advance();
  st = useStoryStore.getState();
  assert(!r.completed && st.chapter === 1 && st.fight === 1, "pelea 1 de c2 → pelea 2 del mismo capítulo");
  r = st.advance();
  st = useStoryStore.getState();
  assert(!r.completed && st.chapter === 2 && st.fight === 0, "c2 vencido → capítulo 3");
  assert(st.isChapterDone(0) && st.isChapterDone(1) && !st.isChapterDone(2), "isChapterDone marca 1-2");

  // Decisiones: primera manda, idempotente
  st.choose("perdon_bram");
  st.choose("toma_hierro"); // la segunda opción del MISMO punto no pisa
  st = useStoryStore.getState();
  assert(st.hasFlag("perdon_bram") && !st.hasFlag("toma_hierro"), "la primera decisión manda (idempotente)");

  // Cadena hasta el final de la historia (siempre releer el store — snapshots
  // viejos de zustand NO se actualizan)
  let guard = 0;
  while (!useStoryStore.getState().completed && guard++ < 50) {
    useStoryStore.getState().advance();
  }
  st = useStoryStore.getState();
  assert(st.completed, "la historia COMPLETA al vencer al Heraldo (c7)");
  assert(st.isChapterDone(6), "el capítulo 7 queda como hecho");

  // Persistencia: el store sobrevive a una recarga (hydrate re-lee localStorage)
  useStoryStore.getState().hydrate();
  assert(useStoryStore.getState().completed, "hydrate recupera la historia completada");

  // Reset: vuelve a cero (las cartas ganadas NO se tocan — fuera del store)
  useStoryStore.getState().resetStory();
  st = useStoryStore.getState();
  assert(st.chapter === 0 && st.fight === 0 && !st.completed && Object.keys(st.flags).length === 0, "reset vuelve a cero");
}

// ===========================================================================
section("4. Integración con el motor: regla de capítulo + montaje de peleas");
{
  useStoryStore.getState().resetStory();
  // La regla de capítulo SOBREESCRIBE los bonos (incluso tras enableBossMode)
  const state = createPvpState("HIST", {
    name: "Tú",
    gameClass: "guerrero",
    deck: classDecksOf("guerrero")[0],
  });
  joinBotPvpState(state, {
    name: "Yggra, el Jardín Devorador",
    gameClass: "botanico",
    deck: BOSS_DECKS.botanico.map((c) => materializeCard(c, "epic")),
  });
  enableBossMode(state);
  setForcedPositionBonuses(state, ["limit_1", "cat_accion", "cost_pos"]);
  const kinds = state.positionBonuses.map((b) => b?.kind ?? null);
  assert(
    kinds[0] === "limit_1" && kinds[1] === "cat_accion" && kinds[2] === "cost_pos",
    `regla de capítulo aplicada por posición (${kinds.join(",")})`
  );
  assert(state.bossMode === true, "bossMode sigue activo bajo la regla de capítulo");

  // Sin regla forzada → los sorteados quedan intactos
  const state2 = createPvpState("HIST", {
    name: "Tú",
    gameClass: "mago",
    deck: classDecksOf("mago")[0],
  });
  joinBotPvpState(state2, { name: "Kess", gameClass: "asesino", deck: classDecksOf("asesino")[1] });
  const before = state2.positionBonuses.map((b) => b?.kind ?? null);
  setForcedPositionBonuses(state2, before); // re-aplicar lo mismo es idempotente
  assert(
    state2.positionBonuses.map((b) => b?.kind ?? null).join(",") === before.join(","),
    "setForcedPositionBonuses con kinds válidos es idempotente"
  );

  // Todas las peleas del guion montan una partida real (mazo rival materializado)
  let mounted = 0;
  for (const ch of STORY_CHAPTERS) {
    for (const f of ch.fights) {
      const deck = f.bossDeck
        ? BOSS_DECKS[f.rivalClass].map((c) => materializeCard(c, f.tier))
        : classDecksOf(f.rivalClass)[f.deckIndex ?? 0].map((c) => materializeCard(c, f.tier));
      const s = createPvpState("HIST", {
        name: "Tú",
        gameClass: "guerrero",
        deck: classDecksOf("guerrero")[0],
      });
      joinBotPvpState(s, { name: f.rival, gameClass: f.rivalClass, deck });
      if (f.bossMode) enableBossMode(s);
      if (f.forcedBonuses) setForcedPositionBonuses(s, f.forcedBonuses);
      assert(deck.length === 12, `«${f.rival}»: partida montable (12 cartas)`);
      mounted++;
    }
  }
  assert(mounted === 12, `12 peleas montadas (${STORY_CHAPTERS.reduce((a, c) => a + c.fights.length, 0)} en el guion)`);

  // isLastFight por capítulo
  assert(isLastFight(STORY_CHAPTERS[0], 0), "c1: su única pelea es la última");
  assert(!isLastFight(STORY_CHAPTERS[1], 0) && isLastFight(STORY_CHAPTERS[1], 1), "c2: 2 peleas, la 2ª cierra");

  // XP de historia crece por capítulo
  assert(storyXpForFight(0) === 8 && storyXpForFight(6) === 32, "XP de historia: 8 + 4×capítulo");
}

// ===========================================================================
section("5. Epílogos por clase (6 cierres distintos)");
{
  const classes = ["guerrero", "mago", "asesino", "botanico", "pirata", "tinker"] as const;
  assert(
    classes.every((c) => (STORY_ENDINGS[c] ?? "").length > 40),
    "epílogo propio y con carne para las 6 clases"
  );
  assert(new Set(classes.map((c) => STORY_ENDINGS[c])).size === 6, "los 6 epílogos son distintos");
}

// ===========================================================================
console.log(`\n═══ RESULTADO: ${passed} pasan · ${failed} fallan ═══`);
if (failed > 0) process.exit(1);
