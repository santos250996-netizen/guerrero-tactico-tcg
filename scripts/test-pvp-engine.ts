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
  sanitizeClientDeck,
  startPvpMatch,
  type PvpSide,
  type PvpState,
} from "../src/lib/game/pvp";
import { CLASS_META, LANE_META } from "../src/lib/game/types";
import type { GameClass } from "../src/lib/game/types";
import { getFinalCost, isCardCostAllowed } from "../src/lib/game/engine";
import { planBotTurn } from "../src/lib/game/pvp-ai";

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
  // Regla fija (fix "turno mareado"): T2 abre SIEMPRE firstSide — tras pasar,
  // el turno cae invariablemente en el OTRO jugador.
  assert(state.activeSide === first, "en T2 vuelve a arrancar firstSide (apertura fija)");
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

// ---------------------------------------------------------------------------
section("10. Mano inicial ALEATORIA (misma sala recreada → manos distintas)");
{
  // buildPlayer ahora BARAJA el draw pile: con el mismo mazo, manos distintas.
  const signatures = new Set<string>();
  for (let i = 0; i < 5; i++) {
    const state = createPvpState("SHUF", { name: "Ana", gameClass: "guerrero" });
    joinPvpState(state, { name: "Beto", gameClass: "mago" });
    signatures.add(
      state.players.a.hand.map((c) => c.id).join(",") + "|" + state.players.b.hand.map((c) => c.id).join(",")
    );
  }
  assert(signatures.size >= 3, `5 repartos del mismo mazo → ${signatures.size} manos distintas (>=3)`);
  // Cada mano sigue siendo un subconjunto válido de 5 del mazo de 12
  const state = createPvpState("SHUF2", { name: "Ana", gameClass: "guerrero" });
  joinPvpState(state, { name: "Beto", gameClass: "mago" });
  const deckIds = new Set(state.players.a.deck.map((c) => c.id));
  assert(state.players.a.hand.every((c) => deckIds.has(c.id)), "la mano barajada es subconjunto del mazo");
  assert(new Set(state.players.a.hand.map((c) => c.uid)).size === 5, "uids únicos en la mano");
}

// ---------------------------------------------------------------------------
section("11. Bono 'Coste -1': descuento REAL al jugar (energía) + sanitizeClientDeck");
{
  // 11a: partida real forzada hasta tener un carril cost_neg con energía justa
  let found = false;
  for (let attempt = 0; attempt < 40 && !found; attempt++) {
    const { state } = makeRoom("guerrero", "mago");
    const negPos = state.positionBonuses.findIndex((b) => b?.kind === "cost_neg");
    if (negPos < 0) continue;
    // avanza hasta turno 2 (energía 2) y juega una carta de coste 3 en el carril negativo
    applyPvpAction(state, state.activeSide, { type: "pass" });
    applyPvpAction(state, state.activeSide, { type: "pass" });
    const side = state.activeSide;
    const player = state.players[side];
    const lane = player.lanes[negPos];
    const card = player.hand.find((c) => c.cost === 3);
    if (!card) continue;
    applyPvpAction(state, side, { type: "play", uid: card.uid, lane });
    assert(player.energy === 0, `coste 3 en carril 'Coste -1' con energía 2 → gasta 2, queda 0 (queda ${player.energy})`);
    found = true;
  }
  assert(found, "se encontró un escenario con bono cost_neg (40 intentos)");
  // 11b: sanitizeClientDeck — reconstrucción canónica desde id+tier
  const base = makeRoom("guerrero", "mago").state.players.a.deck[0];
  const deck = sanitizeClientDeck(
    [{ id: base.id, rarity: "rare" }, ...Array.from({ length: 11 }, (_, i) => ({ id: makeRoom("guerrero", "mago").state.players.a.deck[(i + 1) % 12].id, rarity: "common" }))],
    "guerrero"
  );
  assert(deck !== null && deck.length === 12, "sanitizeClientDeck acepta 12 {id, rarity}");
  assert(deck![0].rarity === "rare" && deck![0].power === base.power + 2, "sanitizeClientDeck materializa +2 poder al tier rare");
  assert(sanitizeClientDeck([{ id: base.id }, ...Array.from({ length: 10 }, () => base.id)], "guerrero") === null, "sanitizeClientDeck rechaza ids duplicados");
  assert(sanitizeClientDeck(["no-existe", "no-existe-2"], "guerrero") === null, "sanitizeClientDeck rechaza ids desconocidos");
}

// ---------------------------------------------------------------------------
section("12. AUDITORÍA IA: energía por turno respetada en 40 partidas (planBotTurn)");
{
  let violations = 0;
  let gamesCompleted = 0;
  const CLASSES: GameClass[] = ["guerrero", "mago", "asesino"];
  for (let g = 0; g < 40; g++) {
    const clsA = CLASSES[Math.floor(Math.random() * 3)];
    const clsB = CLASSES[Math.floor(Math.random() * 3)];
    const { state } = makeRoom(clsA, clsB);
    let guard = 0;
    let broken = false;
    while (state.phase === "playing" && guard++ < 400) {
      const side = state.activeSide;
      const player = state.players[side];
      if (side === "b") {
        // Turno del BOT: plan → cada jugada debe caber en la energía restante
        const plan = planBotTurn(state);
        let energyLeft = player.energy;
        for (const action of plan.actions) {
          if (action.type !== "play") continue; // el plan puede incluir pass
          const card = player.hand.find((c) => c.uid === action.uid);
          if (!card) { broken = true; violations++; break; }
          const bonus = laneBonusesForSide(state, side)[action.lane] ?? null;
          // V3: el bot MAGO con Resonancia paga −1 (misma spec consecutiva).
          const reson = player.gameClass === "mago" && (state.lastSpec?.b ?? null) === action.lane;
          const eff = Math.max(0, getFinalCost(card.cost, bonus) - (reson ? 1 : 0));
          if (!isCardCostAllowed(card.cost, bonus) || eff > energyLeft) {
            violations++;
            broken = true;
            break;
          }
          energyLeft -= eff;
          try {
            applyPvpAction(state, side, action);
          } catch {
            violations++;
            broken = true;
            break;
          }
        }
        if (broken) break;
        if (state.phase !== "playing" || state.activeSide !== side) continue;
        applyPvpAction(state, side, { type: "pass" });
      } else {
        // Jugador scriptado: jugadas legales al azar (como secciones 6/7)
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
        if (legal && Math.random() < 0.7) {
          try {
            applyPvpAction(state, side, { type: "play", uid: legal.uid, lane: legal.lane });
          } catch {
            applyPvpAction(state, side, { type: "pass" });
          }
        } else {
          applyPvpAction(state, side, { type: "pass" });
        }
      }
      // INVARIANTE por medio-turno: la energía NUNCA es negativa ni supera maxEnergy
      for (const s of ["a", "b"] as PvpSide[]) {
        const p = state.players[s];
        if (p.energy < 0 || p.energy > p.maxEnergy) {
          violations++;
          broken = true;
        }
      }
      if (broken) break;
    }
    if (!broken) gamesCompleted++;
  }
  assert(violations === 0, `0 violaciones de energía en 40 partidas (IA + jugador scriptado)`);
  assert(gamesCompleted >= 38, `${gamesCompleted}/40 partidas completadas sin atascos`);
}

console.log(`\n════════════════════════════════════════`);
console.log(`  RESULTADO: ${passed} pasan · ${failed} fallan`);
console.log(`════════════════════════════════════════`);
if (failed > 0) process.exit(1);
