// ============================================================================
// Test del flujo de turnos PvP — corre con: bun scripts/test-pvp-turn-flow.ts
// INVARIANTE central (fix "turno mareado" en dispositivos reales):
//   Tras CUALQUIER pase, el turno pasa al OTRO jugador o termina la partida.
//   Nunca le vuelve a tocar al mismo que acabó de pasar.
//   El abridor de cada turno es SIEMPRE firstSide (sorteo inicial).
// ============================================================================

import {
  applyPvpAction,
  buildClientView,
  createPvpState,
  joinPvpState,
  startPvpMatch,
  type PvpSide,
  type PvpState,
} from "../src/lib/game/pvp";
import type { GameClass } from "../src/lib/game/types";

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

function makeRoom(clsA: GameClass, clsB: GameClass): PvpState {
  const state = createPvpState("TEST", { name: "Ana", gameClass: clsA });
  joinPvpState(state, { name: "Beto", gameClass: clsB });
  return state;
}

/** Pasa con el lado activo y devuelve el lado que pasó. */
function pass(state: PvpState): PvpSide {
  const side = state.activeSide;
  applyPvpAction(state, side, { type: "pass" }); // lanza si es ilegal
  return side;
}

function tryPass(state: PvpState, side: PvpSide): boolean {
  try {
    applyPvpAction(state, side, { type: "pass" });
    return true;
  } catch {
    return false;
  }
}

function passHand(state: PvpState, side: PvpSide): void {
  try {
    applyPvpAction(state, side, { type: "pass" });
  } catch {
    // intencional: fuera de turno debe fallar
  }
}

// ---------------------------------------------------------------------------
section("1. Invariante tras cada pase: el turno es del OTRO (o ended)");
{
  for (let seed = 0; seed < 4; seed++) {
    const state = makeRoom("guerrero", "mago");
    startPvpMatch(state);
    const firstSide = state.firstSide;
    let ok = true;
    let transitions = 0;
    for (let i = 0; i < 24 && state.phase === "playing"; i++) {
      const passer = pass(state);
      const after = state.activeSide;
      if (state.phase === "playing") {
        if (after === passer) {
          ok = false;
          console.error(`    paso i=${i}: ${passer} pasó y el turno le volvió a caer`);
          break;
        }
        transitions++;
      }
    }
    assert(ok, `seed ${seed}: ninguna pasada de turno re-abre para el mismo jugador`);
    assert(transitions >= 8, `seed ${seed}: la partida avanzó varios turnos (${transitions} transiciones)`);
    void firstSide;
  }
}

// ---------------------------------------------------------------------------
section("2. El abridor de TODOS los turnos es firstSide");
{
  const state = makeRoom("asesino", "guerrero");
  startPvpMatch(state);
  const firstSide = state.firstSide;
  assert(state.turn === 1 && state.activeSide === firstSide, "T1 abre firstSide");
  const openers: PvpSide[] = [state.activeSide];
  let lastTurn = state.turn;
  for (let i = 0; i < 30 && state.phase === "playing"; i++) {
    pass(state);
    if (state.phase === "playing" && state.turn !== lastTurn) {
      // justo al cruzar de turno, el activo es el abridor del nuevo turno
      lastTurn = state.turn;
      openers.push(state.activeSide);
    }
  }
  const allOpenersFirst = openers.every((s) => s === firstSide);
  assert(allOpenersFirst, `los abridores de ${openers.length} turnos son todos firstSide (${openers.join(",")})`);
}

// ---------------------------------------------------------------------------
section("3. Doble pase inmediato (ambos pasan sin jugar): el juego AVANZA");
{
  for (let k = 0; k < 3; k++) {
    const state = makeRoom("mago", "asesino");
    startPvpMatch(state);
    const turnBefore = state.turn;
    pass(state); // opener pasa
    assert(state.turn === turnBefore && state.phase === "playing", "tras 1er pase, turno del otro en el MISMO turno");
    pass(state); // el otro pasa → cierra el turno
    assert(state.turn === turnBefore + 1, "tras 2º pase, el turno avanza");
    assert(state.phase === "playing", "sigue playing");
    assert(state.activeSide === state.firstSide, "el nuevo turno abre firstSide");
  }
}

// ---------------------------------------------------------------------------
section("4. Pase fuera de turno es rechazado (sin efecto fantasma)");
{
  const state = makeRoom("guerrero", "guerrero");
  startPvpMatch(state);
  const active = state.activeSide;
  const other: PvpSide = active === "a" ? "b" : "a";
  const seqBefore = state.actionSeq;
  const res = tryPass(state, other);
  assert(!res, "pass del lado NO activo rechazado");
  assert(state.actionSeq === seqBefore, "el estado no cambió (sin seq fantasma)");
  // y el activo sí puede
  const res2 = tryPass(state, active);
  assert(res2, "pass del lado activo aceptado");
  assert(state.activeSide === other, "tras el pase, le toca al otro");
}

// ---------------------------------------------------------------------------
section("5. Vista de cliente: yourTurn nunca true para el que acaba de pasar");
{
  const state = makeRoom("mago", "guerrero");
  startPvpMatch(state);
  let ok = true;
  for (let i = 0; i < 20 && state.phase === "playing"; i++) {
    const passer = state.activeSide;
    const viewBefore = buildClientView(state, passer);
    if (!viewBefore.yourTurn) {
      ok = false;
      console.error(`    i=${i}: el lado activo ${passer} no ve yourTurn=true`);
      break;
    }
    pass(state);
    const viewAfter = buildClientView(state, passer);
    if (state.phase === "playing" && viewAfter.yourTurn) {
      ok = false;
      console.error(`    i=${i}: ${passer} pasó y su vista TODAVÍA dice yourTurn=true`);
      break;
    }
  }
  assert(ok, "yourTurn del cliente es fiel a activeSide antes y después de pasar");
}

// ---------------------------------------------------------------------------

console.log("\n" + "=".repeat(60));
console.log(`RESULTADO: ${passed} pasados, ${failed} fallidos`);
if (failed > 0) process.exit(1);
console.log("✨ Flujo de turnos PvP correcto: pasar SIEMPRE cede el turno al otro.");
