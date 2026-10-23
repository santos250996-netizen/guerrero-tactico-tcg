// ============================================================================
// TEST-ADMIN-MYTHIC — V3.2: MODO ADMIN OCULTO + REGLA MÍTICO-COMPLETADA.
//   1. lib/game/admin: flag persistente (write/read/isAdminOn) sobre un
//      polyfill de localStorage (en bun no existe — los guards de SSR
//      devuelven estado vacío sin él).
//   2. campaign.classUnlocked: sin admin respeta la escalera; con admin
//      ON devuelve true para TODAS las clases con 0 escalones.
//   3. adminStore.enable: backup EXACTO del progreso real + TODAS las cartas
//      en MÍTICO (1 copia) + las 6 clases otorgadas + wins preservado.
//   4. adminStore.disable: restaura el backup al byte y apaga el flag.
//   5. REGLA MÍTICO-COMPLETADA en collectionStore (jugador normal):
//      addRewards y rollPickOptions jamás proponen cartas completadas;
//      grantPick blinda contra completadas; grantStarterDeck las salta;
//      colección 100% mítico → botín/picks = [] y allCompleted() = true.
// Ejecutar: bun scripts/test-admin-mythic.ts
// ============================================================================

// Polyfill de localStorage + window ANTES de los imports dinámicos (los
// stores usan guards `typeof window === "undefined"` — en bun no existe ni
// window ni localStorage; aquí ambos apuntan al Map en memoria).
const __mem = new Map<string, string>();
const __g = globalThis as unknown as Record<string, unknown>;
__g.localStorage = {
  getItem: (k: string) => __mem.get(k) ?? null,
  setItem: (k: string, v: string) => void __mem.set(k, v),
  removeItem: (k: string) => void __mem.delete(k),
  clear: () => void __mem.clear(),
};
__g.window = globalThis;

const { isAdminOn, readAdminState, ADMIN_STORAGE_KEY } = await import("../src/lib/game/admin");
const { classUnlocked } = await import("../src/lib/game/campaign");
const { ALL_CARDS_V3 } = await import("../src/lib/game/cards");
const { starterDeckFor } = await import("../src/lib/game/cards");
const { useAdminStore } = await import("../src/store/adminStore");
const { useCollectionStore } = await import("../src/store/collectionStore");

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

const TODAS: string[] = ["guerrero", "mago", "asesino", "botanico", "pirata", "tinker"];

// ── 1. Flag persistente ────────────────────────────────────────────────────
section("lib/game/admin — flag persistente");
{
  check("isAdminOn() = false por defecto", isAdminOn() === false);
  check("readAdminState() sin backup", readAdminState().backup === null);
  const { writeAdminState } = await import("../src/lib/game/admin");
  writeAdminState(true, { copies: { x: { mythic: 1 } }, grantedClasses: ["guerrero"], wins: 3 });
  check("writeAdminState(true) → isAdminOn() = true", isAdminOn() === true);
  const st = readAdminState();
  check("backup persiste con el flag", st.backup?.copies?.x?.mythic === 1 && st.backup?.wins === 3);
  check("key de storage dedicada", ADMIN_STORAGE_KEY === "pacto-de-guerra-admin");
  writeAdminState(false, null);
  check("writeAdminState(false) → off y sin backup", isAdminOn() === false && readAdminState().backup === null);
}

// ── 2. classUnlocked ──────────────────────────────────────────────────────
section("campaign.classUnlocked — bypass del admin");
{
  check("sin admin: tinker a 0 escalones BLOQUEADA", !classUnlocked("tinker", 0));
  check("sin admin: mago a 4 escalones BLOQUEADA (necesita 5)", !classUnlocked("mago", 4));
  check("sin admin: guerrero libre", classUnlocked("guerrero", 0));
  // Simular flag ON escribiendo directo al storage polyfill
  const { writeAdminState } = await import("../src/lib/game/admin");
  writeAdminState(true, null);
  let todasLibres = true;
  for (const c of TODAS) if (!classUnlocked(c as never, 0)) todasLibres = false;
  check("con admin: TODAS las clases jugables a 0 escalones", todasLibres);
  writeAdminState(false, null);
}

// ── 3. enable — backup + 192 MÍTICO + 6 clases ────────────────────────────
section("adminStore.enable — backup exacto + todo MÍTICO");
{
  const col = useCollectionStore.getState();
  // Colección "real" de ejemplo del jugador (antes del admin)
  const realCopies: Record<string, Record<string, number>> = {
    [ALL_CARDS_V3[0].id]: { common: 2, rare: 1 },
    [ALL_CARDS_V3[1].id]: { epic: 1 },
    [ALL_CARDS_V3[5].id]: { legendary: 1 },
  };
  useCollectionStore.setState({ copies: realCopies, grantedClasses: ["guerrero"], wins: 7 });

  useAdminStore.getState().enable();
  const after = useCollectionStore.getState();

  check("on = true tras enable", useAdminStore.getState().on === true);
  check("wins preservado (7)", after.wins === 7);
  const todasMythic = ALL_CARDS_V3.every((c) => (after.copies[c.id]?.mythic ?? 0) === 1);
  check(`las ${ALL_CARDS_V3.length} cartas con exactamente 1 MÍTICA`, todasMythic);
  check(
    "cartas de ejemplo NO contaminadas con tiers viejos",
    (after.copies[ALL_CARDS_V3[0].id]?.common ?? 0) === 0,
  );
  check("6 clases otorgadas", TODAS.every((c) => after.grantedClasses.includes(c as never)));
  check("isCompleted = true para cualquier carta", after.isCompleted(ALL_CARDS_V3[3].id) === true);
  check("allCompleted() = true", after.allCompleted() === true);
  check(
    "classUnlocked con admin = todas libres",
    TODAS.every((c) => classUnlocked(c as never, 0)),
  );

  // Botín con admin: colección 100% mítico → nada que dar
  const r1 = after.addRewards(5, { bonusForLevel: true, floorLevel: 10 });
  check("addRewards con colección completa = []", r1.length === 0);
  const p1 = after.rollPickOptions(3, "epic");
  check("rollPickOptions con colección completa = []", p1.length === 0);

  // grantPick blindado contra completadas
  const g1 = after.grantPick({ id: ALL_CARDS_V3[2].id, rarity: "legendary", isNew: false });
  check(
    "grantPick sobre completada NO añade copia",
    (useCollectionStore.getState().copies[ALL_CARDS_V3[2].id]?.legendary ?? 0) === 0 && g1.isNew === false,
  );

  // El flag persistido lleva el backup
  const persisted = readAdminState();
  check("flag persistido = on", persisted.on === true);
  check("backup persistido = 7 wins y guerrero", persisted.backup?.wins === 7 && persisted.backup?.grantedClasses?.[0] === "guerrero");
}

// ── 4. disable — restauración al byte ─────────────────────────────────────
section("adminStore.disable — restaura el progreso real");
{
  useAdminStore.getState().disable();
  const col = useCollectionStore.getState();
  check("on = false tras disable", useAdminStore.getState().on === false);
  check(
    "copies restauradas (ejemplo exacto)",
    (col.copies[ALL_CARDS_V3[0].id]?.common ?? 0) === 2 &&
      (col.copies[ALL_CARDS_V3[0].id]?.rare ?? 0) === 1 &&
      (col.copies[ALL_CARDS_V3[1].id]?.epic ?? 0) === 1 &&
      (col.copies[ALL_CARDS_V3[5].id]?.legendary ?? 0) === 1 &&
      Object.keys(col.copies).length === 3,
  );
  check("grantedClasses restauradas (solo guerrero)", col.grantedClasses.length === 1 && col.grantedClasses[0] === "guerrero");
  check("wins restaurados (7)", col.wins === 7);
  check("allCompleted() = false tras restaurar", col.allCompleted() === false);
  const persisted = readAdminState();
  check("flag persistido = off y sin backup", persisted.on === false && persisted.backup === null);
  check("tinker vuelve a BLOQUEADA sin admin", !classUnlocked("tinker", 0));
}

// ── 5. Regla completada en jugador NORMAL (sin admin) ─────────────────────
section("regla mítico-completada — jugador normal");
{
  // 3 cartas completadas (mítico) + resto vacío
  const completadas = [ALL_CARDS_V3[0].id, ALL_CARDS_V3[1].id, ALL_CARDS_V3[2].id];
  useCollectionStore.setState({
    copies: {
      [completadas[0]]: { mythic: 1 },
      [completadas[1]]: { mythic: 1 },
      [completadas[2]]: { mythic: 2 },
    },
    grantedClasses: [],
    wins: 0,
  });
  const col = useCollectionStore.getState();

  // addRewards: 60 drops NUNCA caen en completadas
  const rewards = col.addRewards(60, { bonusForLevel: true, floorLevel: 10 });
  const filtradas = rewards.filter((r) => completadas.includes(r.id));
  check(`addRewards(60): 0 cartas completadas (${rewards.length} drops)`, filtradas.length === 0);

  // rollPickOptions: mismas reglas
  for (let i = 0; i < 10; i++) {
    const picks = useCollectionStore.getState().rollPickOptions(3, "rare");
    if (picks.some((p) => completadas.includes(p.id))) {
      check("rollPickOptions nunca propone completadas", false);
      break;
    }
    if (i === 9) check("rollPickOptions nunca propone completadas (10 rolls)", true);
  }

  // grantStarterDeck salta completadas
  const starter = starterDeckFor("guerrero");
  const enStarterCompletada = starter.find((c) => completadas.includes(c.id));
  if (enStarterCompletada) {
    useCollectionStore.getState().grantStarterDeck("guerrero");
    const c = useCollectionStore.getState().copies[enStarterCompletada.id];
    check(
      "starter NO toca cartas completadas",
      c !== undefined && (c.common ?? 0) === 0 && (c.mythic ?? 0) >= 1,
    );
    const otras = starter.filter((x) => x.id !== enStarterCompletada.id);
    const algunaOtra = otras.some((x) => (useCollectionStore.getState().copies[x.id]?.common ?? 0) > 0);
    check("starter SÍ otorga las no completadas", algunaOtra);
  } else {
    check("starter NO toca cartas completadas (sin completadas en el starter)", true);
    check("starter SÍ otorga las no completadas", useCollectionStore.getState().grantStarterDeck("guerrero"));
  }
}

// ── 6. Idempotencia ───────────────────────────────────────────────────────
section("idempotencia del toggle");
{
  const antes = JSON.stringify(useCollectionStore.getState().copies);
  useAdminStore.getState().disable(); // sin admin activo → no-op
  check("disable sin admin = no-op", useAdminStore.getState().on === false);
  useAdminStore.getState().enable();
  const snapBackup = readAdminState().backup;
  useAdminStore.getState().enable(); // doble enable → no re-backup (backup intacto)
  const snapBackup2 = readAdminState().backup;
  check(
    "doble enable NO rompe el backup",
    JSON.stringify(snapBackup) === JSON.stringify(snapBackup2),
  );
  useAdminStore.getState().disable();
  const despues = JSON.stringify(useCollectionStore.getState().copies);
  check("enable→disable con doble enable restaura igual", antes === despues);
}

console.log(`\n═══ RESULTADO: ${passed} ✓ · ${failed} ✗ ═══`);
if (failed > 0) process.exit(1);

export {}; // módulo: permite top-level await bajo tsc
