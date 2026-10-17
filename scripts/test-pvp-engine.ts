// ============================================================================
// Test del motor PvP (src/lib/game/pvp.ts) — corre con: bun scripts/test-pvp-engine.ts
// Verifica: salas, sorteo aleatorio del primer jugador, emparejamiento
// posicional de carriles entre clases distintas, alternancia de turnos,
// vistas espejo A/B, acciones ilegales, partida completa aleatoria y revancha.
// ============================================================================

import {
  applyPvpAction,
  buildClientView,
  createPvpState,
  joinPvpState,
  laneBonusesForSide,
  requestRematch,
  startPvpMatch,
  type PvpSide,
  type PvpState,
} from "../src/lib/game/pvp";
import { CLASS_META, LANE_META } from "../src/lib/game/types";
import type { GameClass } from "../src/lib/game/types";
import { getFinalCost } from "../src/lib/game/engine";

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

function section(title: string) {
  console.log(`\n── ${title} ──`);
}

function makeRoom(clsA: GameClass, clsB: GameClass): { state: PvpState; viewA: ReturnType<typeof buildClientView> } {
  const state = createPvpState("TEST", { name: "Ana", gameClass: clsA });
  joinPvpState(state, { name: "Beto", gameClass: clsB });
  return { state, viewA: buildClientView(state, "a") };
}

// ---------------------------------------------------------------------------
section("1. Creación de sala y arranque (lobby → playing)");
{
  const { state } = makeRoom("mago", "guerrero");
  assert(state.phase === "playing", "joinPvpState inicia la partida");
  assert(state.players.a.hand.length === 5, "mano inicial A = 5 cartas");
  assert(state.players.b.hand.length === 5, "mano inicial B = 5 cartas");
  assert(state.players.a.drawPile.length === 7, "pila de robo A = 7 (12-5)");
  assert(state.players.b.drawPile.length === 7, "pila de robo B = 7");
  assert(state.players.a.lanes.join() === "arcana,fuego,hielo", "carriles A = Mago");
  assert(state.players.b.lanes.join() === "armas,proteccion,furia", "carriles B = Guerrero");
  assert(state.players.a.energy === 1 && state.players.b.energy === 1, "energía 1/1 en turno 1");
  const viewA = buildClientView(state, "a");
  const viewB = buildClientView(state, "b");
  assert(viewA.yourTurn === (state.activeSide === "a"), "yourTurn(A) consistente con activeSide");
  assert(viewB.yourTurn === (state.activeSide === "b"), "yourTurn(B) consistente con activeSide");
  assert(viewA.you.hand.length === 5 && viewA.rival.handCount === 5, "vista A: mano propia 5, rival 5");
  assert(viewB.rival.handCount === 5 && viewB.you.hand.length === 5, "vista B: rival 5, mano propia 5");
  // La mano del rival NUNCA viaja
  assert(viewA.rival.lanes.length === 3, "vista A expone carriles del rival (para pintarlos)");
  assert(!("hand" in (viewA as any).rival), "la vista del rival NO incluye hand");
}

// ---------------------------------------------------------------------------
section("2. Primer jugador ALEATORIO (distribución en 60 partidas)");
{
  let aFirst = 0;
  let bFirst = 0;
  for (let i = 0; i < 60; i++) {
    const { state } = makeRoom("mago", "asesino");
    if (state.firstSide === "a") aFirst++;
    else bFirst++;
  }
  assert(aFirst > 5 && bFirst > 5, `sorteo aleatorio OK (A=${aFirst}, B=${bFirst} de 60)`);
  assert(aFirst + bFirst === 60, "siempre hay exactamente un primero");
}

// ---------------------------------------------------------------------------
section("3. Emparejamiento posicional: A juega en su carril 0 → B lo ve enfrente");
{
  const { state } = makeRoom("mago", "guerrero");
  const side: PvpSide = state.activeSide;
  const player = state.players[side];
  const view = buildClientView(state, side);
  const bonuses0 = laneBonusesForSide(state, side);
  // elige una carta JUGABLE (energía 1 en T1 + restricciones de bono)
  let card = view.you.hand[0];
  let lane = player.lanes[0];
  outer: for (const c of view.you.hand) {
    for (const ln of player.lanes) {
      const bonus = bonuses0[ln] ?? null;
      const restricted = bonus?.kind.startsWith("cost_only") ? c.cost !== Number(bonus.kind.slice(-1)) : false;
      if (!restricted && getFinalCost(c.cost, bonus) <= player.energy) {
        card = c;
        lane = ln;
        break outer;
      }
    }
  }
  const effCost = getFinalCost(card.cost, bonuses0[lane] ?? null);
  applyPvpAction(state, side, { type: "play", uid: card.uid, lane });
  assert(player.energy === 1 - effCost, `energía descontada (${1} − ${effCost} = ${player.energy})`);

  const viewSide = buildClientView(state, side);
  const other: PvpSide = side === "a" ? "b" : "a";
  const viewOther = buildClientView(state, other);
  const posIdx = player.lanes.indexOf(lane);
  assert(state.positions[posIdx][side].some((c) => c.uid !== undefined), `carta en posición ${posIdx} del lado activo`);
  assert(
    state.positions[posIdx][side].some((c) => c.defId === card.id),
    `la carta jugada quedó en la posición ${posIdx} (emparejada con el carril ${posIdx} rival)`
  );
  assert(
    viewSide.board[lane].player.some((c) => c.defId === card.id),
    "vista propia: la carta aparece como player en su carril"
  );
  const otherLane = state.players[other].lanes[posIdx];
  assert(
    viewOther.board[otherLane].enemy.some((c) => c.defId === card.id),
    `vista rival: la carta aparece como enemy en ${otherLane} (posición ${posIdx})`
  );
  assert(player.hand.length === 4, "mano del jugador pasa de 5 a 4");
}

// ---------------------------------------------------------------------------
section("4. Acciones ilegales rechazadas");
{
  const { state } = makeRoom("mago", "guerrero");
  const notActive: PvpSide = state.activeSide === "a" ? "b" : "a";
  let threw = false;
  try {
    applyPvpAction(state, notActive, { type: "pass" });
  } catch {
    threw = true;
  }
  assert(threw, "pasar cuando no es tu turno → error");
  threw = false;
  try {
    const card = state.players[state.activeSide].hand[0];
    const badLane = state.players[state.activeSide].lanes.includes("sigilo") ? "armas" : "sigilo";
    applyPvpAction(state, state.activeSide, { type: "play", uid: card.uid, lane: badLane as never });
  } catch {
    threw = true;
  }
  assert(threw, "jugar en un carril ajeno a tu clase → error");
}

// ---------------------------------------------------------------------------
section("5. Flujo de turnos: pasar → alterna → avanza turno con robo y energía");
{
  const { state } = makeRoom("guerrero", "mago");
  const first = state.activeSide;
  const second: PvpSide = first === "a" ? "b" : "a";
  const t1FirstHand = state.players[first].hand.length;

  applyPvpAction(state, first, { type: "pass" });
  assert(state.activeSide === second, "tras pasar, el turno pasa al otro lado (mismo turno)");
  assert(state.turn === 1, "sigue el turno 1 hasta que ambos pasen");
  applyPvpAction(state, second, { type: "pass" });
  assert(state.turn === 2, "ambos pasaron → turno 2");
  assert(state.players.a.energy === 2 && state.players.b.energy === 2, "energía 2/2 en turno 2");
  assert(state.players[first].hand.length === Math.min(7, t1FirstHand + 1), "robo de 1 carta al avanzar turno");
  // En T2 arranca el OTRO lado (alterno)
  assert(state.activeSide === second, "en T2 arranca el otro lado (alternancia justa)");
  assert(state.firstSide === first, "firstSide del sorteo se conserva");
}

// ---------------------------------------------------------------------------
section("6. Partida completa aleatoria (mago vs guerrero, jugadas legales al azar)");
{
  const { state } = makeRoom("mago", "guerrero");
  let guard = 0;
  while (state.phase === "playing" && guard++ < 400) {
    const side = state.activeSide;
    const player = state.players[side];
    const bonuses = laneBonusesForSide(state, side);
    // intenta jugar 1-3 cartas legales al azar, luego pasa
    const plays = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < plays; i++) {
      const legal = player.hand
        .map((c) => {
          for (const lane of player.lanes) {
            const bonus = bonuses[lane] ?? null;
            const pos = state.positions[player.lanes.indexOf(lane)];
            const costOk = (bonus?.kind.startsWith("cost_only") ? c.cost === Number(bonus.kind.slice(-1)) : true);
            const eff = getFinalCost(c.cost, bonus);
            if (!costOk || eff > player.energy || pos[side].length >= (bonus?.kind === "limit_1" ? 1 : bonus?.kind === "limit_3" ? 3 : 4)) continue;
            return { uid: c.uid, lane };
          }
          return null;
        })
        .find(Boolean);
      if (!legal) break;
      try {
        applyPvpAction(state, side, { type: "play", uid: legal.uid, lane: legal.lane });
      } catch {
        break;
      }
      if (state.phase !== "playing" || state.activeSide !== side) break;
    }
    if (state.phase !== "playing") break;
    applyPvpAction(state, state.activeSide, { type: "pass" });
  }
  assert(state.phase === "ended", `la partida termina (${guard} acciones)`);
  assert(state.finalResultA !== null, "finalResultA calculado");
  assert(state.turn === 6, "terminó en el turno 6");

  const viewA = buildClientView(state, "a");
  const viewB = buildClientView(state, "b");
  assert(viewA.finalResult!.totalPlayer === viewB.finalResult!.totalEnemy, "totales espejo: A.player = B.enemy");
  assert(viewA.finalResult!.totalEnemy === viewB.finalResult!.totalPlayer, "totales espejo: A.enemy = B.player");
  const mirrorOk =
    (viewA.finalResult!.result === "WIN" && viewB.finalResult!.result === "LOSS") ||
    (viewA.finalResult!.result === "LOSS" && viewB.finalResult!.result === "WIN") ||
    (viewA.finalResult!.result === "DRAW" && viewB.finalResult!.result === "DRAW");
  assert(mirrorOk, `resultados espejo (${viewA.finalResult!.result} / ${viewB.finalResult!.result})`);
  assert(state.logs.length <= 40, "log acotado a 40 entradas");
}

// ---------------------------------------------------------------------------
section("7. Partida completa aleatoria (guerrero vs asesino) — regression cruzada");
{
  const { state } = makeRoom("guerrero", "asesino");
  let guard = 0;
  while (state.phase === "playing" && guard++ < 400) {
    const side = state.activeSide;
    const player = state.players[side];
    const bonuses = laneBonusesForSide(state, side);
    const legal = player.hand
      .flatMap((c) =>
        player.lanes.map((lane) => {
          const bonus = bonuses[lane] ?? null;
          const eff = getFinalCost(c.cost, bonus);
          const restricted = bonus?.kind.startsWith("cost_only") ? c.cost !== Number(bonus.kind.slice(-1)) : false;
          return restricted || eff > player.energy ? null : { uid: c.uid, lane };
        })
      )
      .find(Boolean);
    if (legal && Math.random() < 0.8) {
      try {
        applyPvpAction(state, side, { type: "play", uid: legal.uid, lane: legal.lane });
      } catch {
        applyPvpAction(state, side, { type: "pass" });
      }
    } else {
      applyPvpAction(state, side, { type: "pass" });
    }
  }
  assert(state.phase === "ended", "segunda partida termina sin crash");
  assert(state.finalResultA!.playerWins + state.finalResultA!.enemyWins + state.finalResultA!.draws === 3, "3 carriles resueltos");
}

// ---------------------------------------------------------------------------
section("8. Revancha: re-inicia con sorteo nuevo y mazos frescos");
{
  const { state } = makeRoom("mago", "guerrero");
  // forzar fin rápido: pasar todo
  let guard = 0;
  while (state.phase === "playing" && guard++ < 30) applyPvpAction(state, state.activeSide, { type: "pass" });
  assert(state.phase === "ended", "partida forzada a fin");
  const firstGameFirstSide = state.firstSide;
  requestRematch(state, "a");
  assert(state.phase === "ended" && state.rematch.a === true, "revancha A marcada, sigue ended");
  requestRematch(state, "b");
  assert(state.phase === "playing", "ambos piden revancha → nueva partida");
  assert(state.players.a.hand.length === 5 && state.players.b.hand.length === 5, "manos re-repartidas (5/5)");
  assert(state.turn === 1, "turno reiniciado a 1");
  assert(state.finalResultA === null, "resultado anterior limpiado");
  assert(state.firstSide === "a" || state.firstSide === "b", "nuevo sorteo de primer jugador válido");
}

// ---------------------------------------------------------------------------
section("9. Villanos visuales: cada clase ve sus LANE_META y bonos por posición");
{
  const { state } = makeRoom("mago", "guerrero");
  const bonA = laneBonusesForSide(state, "a");
  const bonB = laneBonusesForSide(state, "b");
  const pos0 = state.positionBonuses[0];
  assert((bonA[state.players.a.lanes[0]] ?? null) === pos0, "bono posición 0 visible para A");
  assert((bonB[state.players.b.lanes[0]] ?? null) === pos0, "bono posición 0 visible para B (mismo bono compartido)");
  const titlesA = state.players.a.lanes.map((l) => LANE_META[l].title).join("/");
  const titlesB = state.players.b.lanes.map((l) => LANE_META[l].title).join("/");
  assert(titlesA === "ARCANA/FUEGO/HIELO", `carriles Mago: ${titlesA}`);
  assert(titlesB === "ARMAS/PROTECCIÓN/FURIA", `carriles Guerrero: ${titlesB}`);
}

console.log(`\n════════════════════════════════════════`);
console.log(`  RESULTADO: ${passed} pasan · ${failed} fallan`);
console.log(`════════════════════════════════════════`);
if (failed > 0) process.exit(1);
