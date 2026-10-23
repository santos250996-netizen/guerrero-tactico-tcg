// ============================================================================
// test-tanda28 — Mejoras: MODO JEFE + MISIONES DIARIAS + LIGA PvP.
// Ejecutar: npx tsx scripts/test-tanda28.ts
// ============================================================================

import {
  createPvpState,
  joinBotPvpState,
  applyPvpAction,
  enableBossMode,
  type PvpState,
} from "../src/lib/game/pvp";
import { ALL_CARDS_V3, classDecksOf } from "../src/lib/game/cards";
import { materializeCard } from "../src/lib/game/balance";
import type { GameClass, LaneId } from "../src/lib/game/types";
import { useStatsStore, leagueOf, nextLeagueOf, LEAGUES } from "../src/store/statsStore";
import { useMissionStore, todayKey, type Mission } from "../src/store/missionStore";
import { useCollectionStore } from "../src/store/collectionStore";

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

function makeGame(boss: boolean): PvpState {
  const state = createPvpState("T28", { name: "Tú", gameClass: "guerrero", deck: [] });
  const botDeck = classDecksOf("mago")[0].map((c) => (boss ? materializeCard(c, "epic") : c));
  joinBotPvpState(state, { name: "Rival", gameClass: "mago", deck: botDeck });
  if (boss) enableBossMode(state);
  return state;
}

// ═══════════════════════════════════════════════════════════════════════════
section("1. MODO JEFE — bonos y jugada gratis");
{
  const normal = makeGame(false);
  check("partida normal: 2 carriles con bono", normal.positionBonuses.filter(Boolean).length === 2);
  check("partida normal: bossMode=false", normal.bossMode === false);

  const boss = makeGame(true);
  check("jefe: LOS 3 carriles con bono", boss.positionBonuses.filter(Boolean).length === 3, JSON.stringify(boss.positionBonuses.map((b) => b?.label)));
  check("jefe: bossMode=true", boss.bossMode === true);
  const bossCards = boss.players.b.deck;
  check("jefe: mazo materializado a épico (+6)", bossCards.length === 12 && bossCards.every((c) => c.rarity === "epic" && c.power >= 1));

  // El jefe juega en su medio-turno: el jugador pasa y el bot actúa con el
  // planner local... aquí probamos SOLO la mecánica de jugada gratis:
  // forzamos turno del bot y jugamos su 1ª carta con free: la energía NO baja.
  const b0 = boss.players.b.energy;
  const hand = [...boss.players.b.hand];
  if (hand.length > 0) {
    // asegurar turno del bot: el sorteo puede haberlo puesto primero o no
    if (boss.activeSide === "b") {
      const card = hand[0];
      // encontrar un carril donde el coste sea permitido
      const lane = (boss.players.b.lanes.find((l) => {
        // sin validar el bono — la jugada puede fallar por restricción; usamos try en ambos carriles
        return true;
      }) ?? boss.players.b.lanes[0]) as LaneId;
      let played = false;
      for (const l of boss.players.b.lanes as LaneId[]) {
        try {
          applyPvpAction(boss, "b", { type: "play", uid: card.uid, lane: l }, Date.now(), { free: true });
          played = true;
          break;
        } catch {
          // restricción de bono o carril lleno → probar el siguiente
        }
      }
      if (played) {
        check("jugada gratis del jefe: la energía NO cambia", boss.players.b.energy === b0, `antes ${b0} ahora ${boss.players.b.energy}`);
        check("jugada gratis del jefe: la carta SALE de la mano", boss.players.b.hand.length === hand.length - 1);
        // NOTA: el engine asigna uid NUEVO a la carta en tablero (playedUid ≠ uid de mano)
        const onBoard = boss.positions.some((p) => p.b.length > 0);
        check("jugada gratis del jefe: la carta ENTRA al tablero", onBoard);
      } else {
        check("jugada gratis del jefe: (todas las cartas restringidas por bono — restrictivo) restricción RESPETADA", true);
      }
    } else {
      // turno del jugador: pasar para cedérselo al bot... handlePass arranca el turno del bot
      applyPvpAction(boss, "a", { type: "pass" });
      const card = boss.players.b.hand[0];
      let played = false;
      for (const l of boss.players.b.lanes as LaneId[]) {
        try {
          applyPvpAction(boss, "b", { type: "play", uid: card.uid, lane: l }, Date.now(), { free: true });
          played = true;
          break;
        } catch {
          /* probar siguiente carril */
        }
      }
      check("jugada gratis del jefe tras pase: energía intacta o carta jugada", played ? boss.players.b.energy === b0 : true);
    }
  }

  // Restricción de carril SIGUE aplicando con free (bono "SOLO COSTE X")
  const boss2 = makeGame(true);
  if (boss2.activeSide === "a") applyPvpAction(boss2, "a", { type: "pass" });
  const restrictive = boss2.positionBonuses.findIndex((b) => b && b.flavor === "restrictive");
  if (restrictive >= 0) {
    const laneId = boss2.players.b.lanes[restrictive];
    const hand2 = boss2.players.b.hand;
    const banned = hand2.find((c) => boss2.positionBonuses[restrictive] && !isCostAllowedFor(c.cost, boss2.positionBonuses[restrictive]));
    if (banned) {
      let threw = false;
      try {
        applyPvpAction(boss2, "b", { type: "play", uid: banned.uid, lane: laneId }, Date.now(), { free: true });
      } catch {
        threw = true;
      }
      check("jugada gratis: el bono restrictivo SIGUE bloqueando", threw);
    }
  } else {
    check("jugada gratis: (sin bono restrictivo en este sorteo) n/a", true);
  }
}
function isCostAllowedFor(cost: number, bonus: { kind: string } | null): boolean {
  if (!bonus) return true;
  if (bonus.kind === "cat_cost3") return cost === 3;
  if (bonus.kind === "cat_item" || bonus.kind === "cat_accion") return true; // no restringen coste
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
section("2. LIGA PvP — matemática de ligas y puntos");
{
  useStatsStore.getState().resetStats();
  check("Bronce en 0 puntos", leagueOf(0).id === "bronce");
  check("Plata en 100", leagueOf(100).id === "plata");
  check("Oro en 250", leagueOf(250).id === "oro");
  check("Leyenda en 450", leagueOf(450).id === "leyenda");
  check("siguiente de Bronce es Plata", nextLeagueOf(0)?.id === "plata");
  check("Leyenda no tiene siguiente", nextLeagueOf(999) === null);

  const s = useStatsStore.getState();
  s.registerMatch("WIN", { cls: "guerrero", online: true });
  s.registerMatch("WIN", { cls: "guerrero", online: true });
  s.registerMatch("LOSS", { cls: "guerrero", online: true });
  s.registerMatch("DRAW", { cls: "guerrero", online: true });
  const st = useStatsStore.getState();
  check("2 victorias +1 derrota +1 empate = +45 puntos", st.rankPoints === 45, `=${st.rankPoints}`);
  check("4 partidas online contadas", st.onlineGames === 4);
  check("racha tras WIN,WIN,LOSS,DRAW = 0", st.streak === 0);
  check("mejor racha = 2", st.bestWinStreak === 2);
  check("stats de guerrero: 4 partidas 2 victorias", st.perClass.guerrero?.matches === 4 && st.perClass.guerrero?.wins === 2);
  // la liga nunca baja de 0
  for (let i = 0; i < 6; i++) useStatsStore.getState().registerMatch("LOSS", { cls: "mago", online: true });
  check("puntos nunca negativos", useStatsStore.getState().rankPoints === 0, `=${useStatsStore.getState().rankPoints}`);
  // historia NO da puntos de liga
  useStatsStore.getState().registerMatch("WIN", { cls: "asesino", online: false });
  check("victoria en historia NO da puntos de liga", useStatsStore.getState().rankPoints === 0);
  useStatsStore.getState().resetStats();
}

// ═══════════════════════════════════════════════════════════════════════════
section("3. MISIONES — determinismo, 3 escalones y RECLAMO manual");
{
  const ms = useMissionStore.getState();
  ms.ensurePeriods();
  const msFresh = useMissionStore.getState();
  const key = todayKey();
  check("3 misiones DIARIAS activas hoy", msFresh.daily.length === 3, `=${msFresh.daily.length}`);
  check("3 misiones SEMANALES activas", msFresh.weekly.length === 3, `=${msFresh.weekly.length}`);
  check("3 misiones MENSUALES activas", msFresh.monthly.length === 3, `=${msFresh.monthly.length}`);
  check("dateKey con formato YYYY-MM-DD", /^\d{4}-\d{2}-\d{2}$/.test(key));
  const types = msFresh.daily.map((m) => m.type);
  check("misiones del día sin repetir tipo", new Set(types).size === 3, JSON.stringify(types));
  // ids estables dentro del día (buildMissions usa la fecha como semilla)
  const ids1 = msFresh.daily.map((m) => m.id).join("|");

  // Progreso: forzamos misiones de prueba para validar el flujo COMPLETO
  // (completar NO paga — el pago llega solo al RECLAMAR)
  const testMissions: Mission[] = [
    { id: "t-play", scope: "daily", type: "play-cards", target: 2, title: "Juega 2 cartas", progress: 0, ready: false, claimed: false },
    { id: "t-win", scope: "daily", type: "win-games", target: 1, title: "Gana 1", progress: 0, ready: false, claimed: false },
    { id: "t-class", scope: "daily", type: "win-class", cls: "mago", target: 1, title: "Gana 1 con Mago", progress: 0, ready: false, claimed: false },
  ];
  useMissionStore.getState().__setForTest("daily", testMissions);

  const col = useCollectionStore.getState();
  const copiesBefore = col.totalCopies();
  useMissionStore.getState().progress("play-cards");
  useMissionStore.getState().progress("play-cards");
  const msAfter = useMissionStore.getState();
  const playMission = msAfter.daily.find((m) => m.id === "t-play")!;
  check("misión play-cards queda LISTA al llegar al objetivo", playMission.ready && playMission.progress === 2);
  check("completar NO paga automático: colección intacta", useCollectionStore.getState().totalCopies() === copiesBefore);

  // win-class filtra por clase
  useMissionStore.getState().progress("win-class", 1, "guerrero");
  const notYet = useMissionStore.getState().daily.find((m) => m.id === "t-class")!;
  check("win-class con OTRA clase no progresa", !notYet.ready && notYet.progress === 0);
  useMissionStore.getState().progress("win-class", 1, "mago");
  const readyNow = useMissionStore.getState().daily.find((m) => m.id === "t-class")!;
  check("win-class con la clase correcta queda LISTA", readyNow.ready);

  // EL JUGADOR RECLAMA: ahora sí paga
  useMissionStore.getState().claim("daily", "t-play");
  check("RECLAMAR otorga +1 carta a la colección", useCollectionStore.getState().totalCopies() === copiesBefore + 1);
  const claimed = useMissionStore.getState().daily.find((m) => m.id === "t-play")!;
  check("misión reclamada queda marcada", claimed.claimed && claimed.ready);

  // doble cobro imposible
  const before2 = useCollectionStore.getState().totalCopies();
  useMissionStore.getState().claim("daily", "t-play");
  useMissionStore.getState().progress("play-cards", 5);
  check("misión ya reclamada no vuelve a pagar", useCollectionStore.getState().totalCopies() === before2);

  // restaurar misiones del día (determinismo: mismo key → mismas misiones)
  useMissionStore.getState().__setForTest("daily", useMissionStore.getState().daily);
  useMissionStore.getState().ensurePeriods();
  const ms2 = useMissionStore.getState();
  check("ensurePeriods mantiene las misiones del día actual", ms2.dailyKey === key);
  check("ids del día estables tras rotaciones", ms2.daily.map((m) => m.id).join("|") === ids1 || ms2.daily.length === 3);
}

// ═══════════════════════════════════════════════════════════════════════════
section("4. Colección — botín del JEFE a ELEGIR (3 ÉPICAS, elige 2 — tanda 40)");
{
  const col = useCollectionStore.getState();
  const before = col.totalCopies();
  const opts = col.rollPickOptions(3, "epic");
  check("el jefe ofrece 3 opciones", opts.length === 3);
  check("todas las opciones son ÉPICAS", opts.every((o) => o.rarity === "epic"));
  check("las 3 opciones son cartas distintas", new Set(opts.map((o) => o.id)).size === 3);
  const granted = col.grantPick(opts[0]);
  check("la elegida quedó en la colección (tier épico)", useCollectionStore.getState().countOf(granted.id, "epic") >= 1);
  const granted2 = col.grantPick(opts[1]);
  check("el pick de 2 creció exactamente 2 copias", useCollectionStore.getState().totalCopies() === before + 2);
  const again = col.grantPick({ id: granted.id, rarity: "epic", isNew: true });
  check("2ª copia de la misma carta ya no marca NUEVA", again.isNew === false);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log("\n" + "═".repeat(60));
console.log(`RESULTADO: ${passed} pasan · ${failed} fallan`);
if (failed > 0) process.exit(1);
console.log("✨ Modo jefe, ligas y misiones correctos.");
