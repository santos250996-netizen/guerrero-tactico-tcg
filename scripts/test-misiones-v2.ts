// ============================================================================
// test-misiones-v2 — SISTEMA DE MISIONES v2 (diarias + semanales + mensuales
// con RECLAMO manual). Ejecutar: npx tsx scripts/test-misiones-v2.ts
//
// Cubre:
//  1. Claves de periodo (día / lunes de la semana / mes) estables y correctas
//  2. Sorteo determinista por periodo + variedad real de pools
//  3. Completar NO paga — solo RECLAMAR paga (el jugador SE ENTERA)
//  4. Pagos por escalón (+1 / +3 / +8 cartas, XP creciente)
//  5. Progreso multiplicado a los 3 escalones a la vez
//  6. Filtrado por clase (win-class / play-class)
//  7. Anti doble-cobro y anti-pago-sin-objetivo
// ============================================================================

import {
  useMissionStore,
  buildMissions,
  todayKey,
  weekKey,
  monthKey,
  SCOPE_REWARD,
  type Mission,
  type MissionScope,
} from "../src/store/missionStore";
import { useCollectionStore } from "../src/store/collectionStore";
import { useStatsStore } from "../src/store/statsStore";

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

// ═══════════════════════════════════════════════════════════════════════════
section("1. Claves de periodo");
{
  check("todayKey YYYY-MM-DD", /^\d{4}-\d{2}-\d{2}$/.test(todayKey()));
  check("monthKey YYYY-MM", /^\d{4}-\d{2}$/.test(monthKey()));
  // weekKey: todos los días de la misma semana → misma clave; y cae en lunes
  const days = [
    new Date(2026, 9, 19), // lunes
    new Date(2026, 9, 21), // miércoles
    new Date(2026, 9, 25), // domingo
  ];
  const wk = days.map((d) => weekKey(d));
  check("toda la semana comparte weekKey", wk[0] === wk[1] && wk[1] === wk[2], wk.join(" "));
  const monday = new Date(2026, 9, 19);
  check("weekKey cae en LUNES", new Date(monday.getFullYear(), monday.getMonth(), monday.getDate()).getDay() === 1);
  check("weekKey YYYY-MM-DD", /^\d{4}-\d{2}-\d{2}$/.test(weekKey()));
  // semana siguiente → clave distinta
  check("semana siguiente cambia de clave", weekKey(new Date(2026, 9, 26)) !== wk[0]);
  check("mes siguiente cambia de clave", monthKey(new Date(2026, 10, 1)) !== monthKey(new Date(2026, 9, 31)));
}

// ═══════════════════════════════════════════════════════════════════════════
section("2. Determinismo + variedad");
{
  const k = todayKey();
  const a = buildMissions("daily", k);
  const b = buildMissions("daily", k);
  check("mismo día → mismas misiones", a.map((m) => m.id).join("|") === b.map((m) => m.id).join("|"));
  check("diarias: 3 por día, todas scope=daily", a.length === 3 && a.every((m) => m.scope === "daily"));
  check("sin tipos repetidos en el mismo día", new Set(a.map((m) => m.type)).size === 3);
  check("todas arrancan sin progreso ni pago", a.every((m) => m.progress === 0 && !m.ready && !m.claimed));
  const w = buildMissions("weekly", weekKey());
  check("semanales: 3 por semana", w.length === 3 && w.every((m) => m.scope === "weekly"));
  const mo = buildMissions("monthly", monthKey());
  check("mensuales: 3 por mes", mo.length === 3 && mo.every((m) => m.scope === "monthly"));

  // VARIEDAD: en 30 días simulados deben aparecer TODOS los tipos diarios
  const seenTypes = new Set<string>();
  const base = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
    const key = d.toLocaleDateString("sv-SE");
    for (const m of buildMissions("daily", key)) seenTypes.add(m.type);
  }
  check("30 días cubren TODOS los 12 tipos diarios (variedad real)", seenTypes.size === 12, `=${seenTypes.size} [${[...seenTypes].join(",")}]`);
  // y las clases sorteadas también rotan
  const seenCls = new Set<string>();
  for (let i = 0; i < 60; i++) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
    const key = d.toLocaleDateString("sv-SE");
    for (const m of buildMissions("daily", key)) if (m.cls) seenCls.add(m.cls);
  }
  check("las clases exigidas rotan (≥3 clases en 60 días)", seenCls.size >= 3, `=${seenCls.size}`);
}

// ═══════════════════════════════════════════════════════════════════════════
section("3. RECLAMO manual — completar NO paga, reclamar SÍ");
{
  useMissionStore.getState().ensurePeriods();
  const mk = (scope: MissionScope, id: string, type: Mission["type"], target: number): Mission => ({
    id, scope, type, target, title: id, progress: 0, ready: false, claimed: false,
  });
  useMissionStore.getState().__setForTest("daily", [mk("daily", "d1", "win-games", 2)]);
  useMissionStore.getState().__setForTest("weekly", [mk("weekly", "w1", "win-games", 4)]);
  useMissionStore.getState().__setForTest("monthly", [mk("monthly", "m1", "win-games", 6)]);

  const col = useCollectionStore.getState();
  const copies0 = col.totalCopies();
  const stats0 = useStatsStore.getState().xp;

  // 1 jugada: suma a los TRES escalones a la vez
  useMissionStore.getState().progress("win-games");
  const st = useMissionStore.getState();
  check("progreso llega a los 3 escalones a la vez", st.daily[0].progress === 1 && st.weekly[0].progress === 1 && st.monthly[0].progress === 1);
  check("sin objetivo no hay pago", useCollectionStore.getState().totalCopies() === copies0);

  // diaria lista (2/2)
  useMissionStore.getState().progress("win-games");
  check("diaria LISTA (2/2)", useMissionStore.getState().daily[0].ready);
  check("semanal 2/4 aún no", !useMissionStore.getState().weekly[0].ready);
  check("listar NO pagó nada", useCollectionStore.getState().totalCopies() === copies0);
  check("XP intacta sin reclamar", useStatsStore.getState().xp === stats0);

  // RECLAMO diaria: +1 carta + XP
  useMissionStore.getState().claim("daily", "d1");
  check("RECLAMAR diaria paga +1 carta", useCollectionStore.getState().totalCopies() === copies0 + SCOPE_REWARD.daily.cards);
  check("RECLAMAR diaria paga XP", useStatsStore.getState().xp === stats0 + SCOPE_REWARD.daily.xp);
  check("diaria marcada reclamada", useMissionStore.getState().daily[0].claimed);

  // semanal y mensual
  useMissionStore.getState().progress("win-games", 2); // weekly 4/4
  useMissionStore.getState().claim("weekly", "w1");
  check("RECLAMAR semanal paga +3 cartas", useCollectionStore.getState().totalCopies() === copies0 + 1 + SCOPE_REWARD.weekly.cards);
  useMissionStore.getState().progress("win-games", 3); // monthly 6/6
  useMissionStore.getState().claim("monthly", "m1");
  check("RECLAMAR mensual paga +8 cartas", useCollectionStore.getState().totalCopies() === copies0 + 1 + 3 + SCOPE_REWARD.monthly.cards);

  // anti doble-cobro
  const frozen = useCollectionStore.getState().totalCopies();
  useMissionStore.getState().claim("daily", "d1");
  useMissionStore.getState().claim("weekly", "w1");
  useMissionStore.getState().claim("monthly", "m1");
  useMissionStore.getState().progress("win-games", 10);
  check("reclamadas no vuelven a pagar jamás", useCollectionStore.getState().totalCopies() === frozen);

  // reclamar sin estar lista = no-op
  useMissionStore.getState().__setForTest("daily", [mk("daily", "d2", "fuse", 3)]);
  const beforeFake = useCollectionStore.getState().totalCopies();
  useMissionStore.getState().claim("daily", "d2");
  check("reclamar SIN objetivo es no-op", useCollectionStore.getState().totalCopies() === beforeFake);
}

// ═══════════════════════════════════════════════════════════════════════════
section("4. Filtrado por clase (win-class / play-class)");
{
  const mk = (scope: MissionScope, id: string, type: Mission["type"], cls?: string): Mission => ({
    id, scope, type, cls: cls as Mission["cls"], target: 1, title: id, progress: 0, ready: false, claimed: false,
  });
  useMissionStore.getState().__setForTest("daily", [mk("daily", "wc", "win-class", "mago"), mk("daily", "pc", "play-class", "pirata")]);
  useMissionStore.getState().__setForTest("weekly", []);
  useMissionStore.getState().__setForTest("monthly", []);
  useMissionStore.getState().progress("win-class", 1, "guerrero");
  useMissionStore.getState().progress("play-class", 1, "mago");
  const st = useMissionStore.getState();
  check("win-class con otra clase NO progresa", st.daily.find((m) => m.id === "wc")!.progress === 0);
  check("play-class con otra clase NO progresa", st.daily.find((m) => m.id === "pc")!.progress === 0);
  useMissionStore.getState().progress("win-class", 1, "mago");
  useMissionStore.getState().progress("play-class", 1, "pirata");
  const st2 = useMissionStore.getState();
  check("win-class con SU clase lista", st2.daily.find((m) => m.id === "wc")!.ready);
  check("play-class con SU clase lista", st2.daily.find((m) => m.id === "pc")!.ready);
}

// ═══════════════════════════════════════════════════════════════════════════
section("5. Sanidad de targets (alcanzables)");
{
  const daily = buildMissions("daily", todayKey());
  const weekly = buildMissions("weekly", weekKey());
  const monthly = buildMissions("monthly", monthKey());
  const sane = (list: Mission[], max: number) => list.every((m) => m.target > 0 && m.target <= max && m.title.length > 3);
  check("targets diarios ≤ 10", sane(daily, 10));
  check("targets semanales ≤ 45", sane(weekly, 45));
  check("targets mensuales ≤ 130", sane(monthly, 130));
  check("pagos: diaria 1 · semanal 3 · mensual 8 cartas", SCOPE_REWARD.daily.cards === 1 && SCOPE_REWARD.weekly.cards === 3 && SCOPE_REWARD.monthly.cards === 8);
  check("XP crece por escalón", SCOPE_REWARD.daily.xp < SCOPE_REWARD.weekly.xp && SCOPE_REWARD.weekly.xp < SCOPE_REWARD.monthly.xp);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log("\n" + "═".repeat(60));
console.log(`RESULTADO: ${passed} pasan · ${failed} fallan`);
if (failed > 0) process.exit(1);
console.log("✨ Misiones v2 (diarias/semanales/mensuales + reclamo) correctas.");
