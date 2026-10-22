// ============================================================================
// TEST-RUSH — V3.0 T-F: RUSH DE JEFES (plan-expansion-v3 §3.2).
//   1. rushBossesForCycle: ciclo 0 = clásicos, 1 = V3, 2+ intercalado
//      determinista (3 distintos, siempre clases válidas, repetible).
//   2. rushXpForBoss: XP ×2 sobre el bono de escalón del jefe equivalente
//      (10/20/30 en 1ª vuelta; ×1.5 con prestigio) + índices fuera de rango.
//   3. rushPickTierForBoss: rara → épica → legendaria (garantizada la 1ª vez
//      del ciclo, 50% después — roll inyectado) y común si no tocó.
//   4. statsStore.registerRush: mejor run por clase, contador de runs,
//      ciclos completados (sin duplicados) y reset.
//   5. pvpStore: bossPickMax por defecto 2; toggleBossPick respeta el tope
//      (1 en rush) y startRush enciende las banderas de la run.
// Ejecutar: bun scripts/test-rush.ts
// ============================================================================
import {
  RUSH_BOSSES,
  rushBossesForCycle,
  rushPickTierForBoss,
  rushXpForBoss,
} from "../src/lib/game/rush";
import type { GameClass } from "../src/lib/game/types";
import { useStatsStore } from "../src/store/statsStore";
import { usePvpStore } from "../src/store/pvpStore";
import { useCampaignStore } from "../src/store/campaignStore";
import { CAMPAIGN_BOSS_NAMES as BOSS_NAMES } from "../src/lib/game/campaign";

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

const TODAS: GameClass[] = ["guerrero", "mago", "asesino", "botanico", "pirata", "tinker"];

// ── 1. Jefes por ciclo ─────────────────────────────────────────────────────
section("rushBossesForCycle — jefes de la run por ciclo de campaña");
{
  const c0 = rushBossesForCycle(0);
  check("ciclo 0 = 3 jefes", c0.length === RUSH_BOSSES, JSON.stringify(c0));
  check(
    "ciclo 0 = clásicos Korgath/Nyx/Vharos",
    c0.join(",") === "guerrero,mago,asesino",
    c0.join(","),
  );
  const c1 = rushBossesForCycle(1);
  check(
    "ciclo 1 = V3 Yggra/Kaela/Dorvik",
    c1.join(",") === "botanico,pirata,tinker",
    c1.join(","),
  );
  let ok = true;
  for (let cycle = 2; cycle <= 7; cycle++) {
    const b = rushBossesForCycle(cycle);
    if (b.length !== 3 || new Set(b).size !== 3 || b.some((x) => !TODAS.includes(x))) ok = false;
  }
  check("ciclos 2..7: siempre 3 clases VÁLIDAS y DISTINTAS", ok);
  const c2 = rushBossesForCycle(2);
  const c4 = rushBossesForCycle(4);
  check(
    "determinista: ciclo 2 ≡ ciclo 4 (periodo 2 de ciclos)",
    c2.join(",") === c4.join(","),
    `${c2.join(",")} vs ${c4.join(",")}`,
  );
  const c3 = rushBossesForCycle(3);
  check("ciclo 3 ≠ ciclo 2 (rotación real)", c2.join(",") !== c3.join(","));
  check("ciclo -3 no explota (clamp a clásicos)", rushBossesForCycle(-3).join(",") === "guerrero,mago,asesino");
}

// ── 2. XP ×2 por jefe ──────────────────────────────────────────────────────
section("rushXpForBoss — XP ×2 (bono de escalón del jefe equivalente doblado)");
{
  check("jefe 1 (prestigio 0) = 10 XP", rushXpForBoss(0, 0) === 10, String(rushXpForBoss(0, 0)));
  check("jefe 2 (prestigio 0) = 20 XP", rushXpForBoss(1, 0) === 20, String(rushXpForBoss(1, 0)));
  check("jefe 3 (prestigio 0) = 30 XP", rushXpForBoss(2, 0) === 30, String(rushXpForBoss(2, 0)));
  // prestigio 1: bono de escalón ×1.5 → 8/15/23 doblados = 16/30/46
  check("jefe 1 (prestigio 1) = 16 XP", rushXpForBoss(0, 1) === 16, String(rushXpForBoss(0, 1)));
  check("jefe 3 (prestigio 1) = 46 XP", rushXpForBoss(2, 1) === 46, String(rushXpForBoss(2, 1)));
  check("índice fuera de rango no explota (clamp)", rushXpForBoss(9, 0) === 30 && rushXpForBoss(-1, 0) === 10);
  check(
    "escalada: jefe 1 < jefe 2 < jefe 3 (la run se SIENTE)",
    rushXpForBoss(0, 0) < rushXpForBoss(1, 0) && rushXpForBoss(1, 0) < rushXpForBoss(2, 0),
  );
}

// ── 3. Rareza del pick ─────────────────────────────────────────────────────
section("rushPickTierForBoss — rara → épica → legendaria (garantía 1ª vez)");
{
  check("jefe 1 → RARA garantizada", rushPickTierForBoss(0, { firstCycleIncomplete: false }) === "rare");
  check("jefe 2 → ÉPICA garantizada", rushPickTierForBoss(1, { firstCycleIncomplete: false }) === "epic");
  check(
    "jefe 3, ciclo NUNCA completado → LEGENDARIA aunque el roll sea alto",
    rushPickTierForBoss(2, { firstCycleIncomplete: true, roll: 0.99 }) === "legendary",
  );
  check(
    "jefe 3, ciclo ya completado, roll bajo (0.4) → LEGENDARIA (50%)",
    rushPickTierForBoss(2, { firstCycleIncomplete: false, roll: 0.4 }) === "legendary",
  );
  check(
    "jefe 3, ciclo ya completado, roll alto (0.7) → COMÚN",
    rushPickTierForBoss(2, { firstCycleIncomplete: false, roll: 0.7 }) === "common",
  );
}

// ── 4. Registro persistente (statsStore) ───────────────────────────────────
section("statsStore.registerRush — mejor run por clase + ciclos completados");
{
  const s0 = useStatsStore.getState();
  useStatsStore.setState({ rushBest: {}, rushRuns: 0, rushCyclesDone: [] });

  useStatsStore.getState().registerRush({ cls: "guerrero", beaten: 1, completed: false, cycle: 0 });
  let st = useStatsStore.getState();
  check("run de 1 jefe → rushBest.guerrero = 1", st.rushBest.guerrero === 1);
  check("runs = 1", st.rushRuns === 1);
  check("run incompleta NO marca el ciclo", !st.rushCyclesDone.includes(0));

  useStatsStore.getState().registerRush({ cls: "guerrero", beaten: 3, completed: true, cycle: 0 });
  st = useStatsStore.getState();
  check("run completa → rushBest.guerrero = 3", st.rushBest.guerrero === 3);
  check("run completa marca el ciclo 0", st.rushCyclesDone.includes(0));

  useStatsStore.getState().registerRush({ cls: "mago", beaten: 2, completed: false, cycle: 1 });
  st = useStatsStore.getState();
  check("best run es POR CLASE (mago=2 no pisa guerrero=3)", st.rushBest.mago === 2 && st.rushBest.guerrero === 3);
  check("runs = 3", st.rushRuns === 3);

  useStatsStore.getState().registerRush({ cls: "mago", beaten: 1, completed: true, cycle: 0 });
  st = useStatsStore.getState();
  check("best run NO retrocede", st.rushBest.mago === 2);
  check("ciclo 0 NO se duplica en ciclos completados", st.rushCyclesDone.filter((c) => c === 0).length === 1);

  useStatsStore.setState({ rushBest: s0.rushBest, rushRuns: s0.rushRuns, rushCyclesDone: s0.rushCyclesDone });
}

// ── 5. Store de partida: pick 1 de 3 y banderas de run ────────────────────
section("pvpStore — bossPickMax por defecto 2 · toggle respeta el tope · startRush");
{
  const pvp = usePvpStore.getState();
  check("bossPickMax por defecto = 2 (jefe clásico)", pvp.bossPickMax === 2);
  check("rush apagado por defecto", !pvp.rushActive && pvp.rushIndex === 0);

  // El tope del pick: con bossPickMax=1 el 2º toggle se ignora
  usePvpStore.setState({ bossPickMax: 1, bossPickOptions: null, bossPickSelected: [] });
  usePvpStore.getState().toggleBossPick(0);
  usePvpStore.getState().toggleBossPick(1);
  check("tope 1: tras 2 toggles solo hay 1 marcada", usePvpStore.getState().bossPickSelected.length === 1);
  usePvpStore.getState().toggleBossPick(0); // quita la marcada (toggle)
  usePvpStore.getState().toggleBossPick(1); // marca la otra
  check("tope 1: se puede CAMBIAR (quitar y poner)", usePvpStore.getState().bossPickSelected.join(",") === "1");
  usePvpStore.setState({ bossPickSelected: [] });

  // startRush enciende la run con el ciclo de campaña actual
  const prestige = useCampaignStore.getState().prestige;
  const runsBefore = useStatsStore.getState().rushRuns;
  usePvpStore.getState().startRush({ playerClass: "guerrero", playerName: "Tester" });
  const after = usePvpStore.getState();
  check("startRush → rushActive", after.rushActive);
  check("startRush → jefe 0 de la run", after.rushIndex === 0 && after.rushBeaten === 0);
  check("startRush → ciclo = prestigio actual", after.rushCycle === prestige);
  check("startRush → montó el JEFE clásico 1 (Korgath)", after.botClass === "guerrero", String(after.botClass));
  check("startRush → modo historia con mazo de jefe", after.mode === "historia" && after.bossActive);
  check("startRush → código de sala RUSH", after.code === "RUSH");
  check("startRush → splash pre-batalla armado", after.battleIntro);
  check(
    "startRush → firstCycle coherente con rushCyclesDone",
    after.rushFirstCycle === !useStatsStore.getState().rushCyclesDone.includes(prestige),
  );
  check("startRush NO registró la run aún (se registra al CERRAR)", useStatsStore.getState().rushRuns === runsBefore);

  // advanceRush encadena el jefe 2 (Nyx)
  usePvpStore.getState().advanceRush();
  const adv = usePvpStore.getState();
  check("advanceRush → jefe 1 (índice) = Nyx (mago)", adv.rushIndex === 1 && adv.botClass === "mago", String(adv.botClass));
  check("advanceRush limpia el botín pendiente", adv.pendingRewards === null && adv.bossPickOptions === null);

  // Nombres de jefes correctos para el splash
  check(
    "CAMPAIGN_BOSS_NAMES cubre las 6 clases",
    TODAS.every((c) => (BOSS_NAMES[c] ?? "").length > 3),
  );
}

console.log(`\n${"═".repeat(62)}`);
console.log(`RESULTADO: ${passed} pasan · ${failed} fallan`);
if (failed > 0) process.exit(1);
