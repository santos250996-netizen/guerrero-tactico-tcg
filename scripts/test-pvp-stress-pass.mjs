// ============================================================================
// test-pvp-stress-pass.mjs — estrés del flujo pasar/jugar turnos en PvP.
//
// Reproduce el bug reportado: "al dar pasar turno no siempre pasa, no paso de
// 2º turno". Simula N partidas completas con decisiones aleatorias (jugar carta
// válida o pasar) y detecta ESTANCAMIENTO: el turno activo no consigue cerrar
// la ronda aunque ambos lados sigan actuando, o el juego no llega a ended.
// ============================================================================

// Carga los módulos TS del proyecto vía bun (soporta TS directo).
import { createPvpState, joinPvpState, applyPvpAction } from "../src/lib/game/pvp.ts";
import { CLASS_DECKS } from "../src/lib/game/cards.ts";

const N_GAMES = Number(process.argv[2] ?? 300);
const SEED = Number(process.argv[3] ?? 42);

// PRNG determinista (mulberry32)
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = makeRng(SEED);

let stuck = 0;
let ended = 0;
const stuckReports = [];

for (let g = 0; g < N_GAMES; g++) {
  const state = createPvpState("TEST", { name: "A", gameClass: "guerrero" });
  joinPvpState(state, { name: "B", gameClass: "mago" });

  let actions = 0;
  const MAX_ACTIONS = 400; // partida = 12 turnos reales máx; 400 acciones sobra
  let lastTurn = state.turn;
  let actionsSinceTurnChange = 0;

  while (state.phase === "playing" && actions < MAX_ACTIONS) {
    const side = state.activeSide;
    const player = state.players[side];
    const lanes = player.lanes;

    // Decisión aleatoria: 60% jugar carta válida si puede, 40% pasar
    let acted = false;
    if (rng() < 0.6) {
      const jugables = [];
      for (const lane of lanes) {
        const pos = lanes.indexOf(lane);
        const bonus = state.positionBonuses[pos];
        for (const card of player.hand) {
          const effCost = card.cost; // simplificado: sin getFinalCost para el stress
          if (effCost <= player.energy && state.positions[pos][side].length < 4) {
            jugables.push({ uid: card.uid, lane });
          }
        }
      }
      if (jugables.length > 0) {
        const pick = jugables[Math.floor(rng() * jugables.length)];
        try {
          applyPvpAction(state, side, { type: "play", uid: pick.uid, lane: pick.lane });
          acted = true;
        } catch {
          // jugada inválida (coste exacto, etc.) → cae al pase
        }
      }
    }
    if (!acted) {
      try {
        applyPvpAction(state, side, { type: "pass" });
      } catch (e) {
        stuck++;
        stuckReports.push({
          game: g, turn: state.turn, activeSide: side, phase: state.phase,
          acted: { ...state.actedThisTurn }, error: e.message,
          turnStuckFor: actionsSinceTurnChange,
        });
        break;
      }
    }
    actions++;

    if (state.turn !== lastTurn) {
      lastTurn = state.turn;
      actionsSinceTurnChange = 0;
    } else {
      actionsSinceTurnChange++;
      if (actionsSinceTurnChange > 30) {
        stuck++;
        stuckReports.push({
          game: g, turn: state.turn, activeSide: side, phase: state.phase,
          acted: { ...state.actedThisTurn }, error: "ESTANCAMIENTO: >30 acciones sin cambiar de turno",
          turnStuckFor: actionsSinceTurnChange,
          board: JSON.parse(JSON.stringify(state.positions)),
          hand: state.players[side].hand.map((c) => `${c.name}(tr:${c.trigger},kw:${c.keyword})`),
        });
        break;
      }
    }
  }

  if (state.phase === "ended") ended++;
  else if (stuckReports.length === 0 || stuckReports[stuckReports.length - 1].game !== g) {
    stuckReports.push({ game: g, error: "MAX_ACTIONS agotado sin ended", turn: state.turn, phase: state.phase, activeSide: state.activeSide, acted: { ...state.actedThisTurn } });
    stuck++;
  }
}

console.log(`\nPartidas: ${N_GAMES} · terminadas: ${ended} · estancadas/error: ${stuck}`);
for (const r of stuckReports.slice(0, 5)) {
  console.log("\n--- REPORTE DE ESTANCAMIENTO ---");
  console.log(JSON.stringify(r, null, 2).slice(0, 2500));
}
if (stuck > 0) process.exit(1);
console.log("✓ Sin estancamientos: el flujo pasar/jugar avanza siempre.");
