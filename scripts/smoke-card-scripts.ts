// ============================================================================
// smoke-card-scripts.ts — prueba end-to-end del escape hatch CardScript
// (Task 60). Registra un script TEMPORAL para una carta real, ejercita los
// 3 hooks y borra el registro al final. NO deja estado en el motor.
// Uso: bun scripts/smoke-card-scripts.ts
// ============================================================================
import assert from "node:assert";
import { emptyBoard } from "../src/lib/game/engine";
import { playCard, applyStartTurnEffects } from "../src/lib/game/engine";
import { CARD_SCRIPTS } from "../src/lib/game/card-scripts";
import { GUERRERO3_CARDS } from "../src/lib/game/cards";
import type { HandCard } from "../src/lib/game/types";
import type { Board } from "../src/lib/game/engine";

const def = GUERRERO3_CARDS[0];
console.log(`Carta de prueba: ${def.id} (${def.name})`);

function handOf(def2: (typeof GUERRERO3_CARDS)[number], uid: string): HandCard {
  // El juego real siempre instancia HandCard con handBonus numérico (0 base).
  return { ...def2, uid, handBonus: 0 } as unknown as HandCard;
}

// ── 1. canPlay: false → playCard DEBE lanzar ────────────────────────────────
CARD_SCRIPTS[def.id] = {
  canPlay: () => false,
};
const board0: Board = emptyBoard();
const h0 = handOf(def, "t0");
let threw = false;
try {
  playCard(board0, [h0], 10, "player", "armas", h0, null, null);
} catch {
  threw = true;
}
assert.ok(threw, "canPlay=false debe denegar la jugada");
console.log("✓ canPlay=false deniega la jugada (throw)");

// ── 2. onPlay: mutación cosmética visible en el resultado ──────────────────
CARD_SCRIPTS[def.id] = {
  onPlay: ({ self, mutations }) => {
    self.currentPower += 5;
    self.powerLog = [...(self.powerLog ?? []), { source: "SmokeTest", delta: 5, kind: "buff" }];
    mutations.push({ side: "player", lane: "armas", uid: self.uid, powerDelta: 0 });
  },
};
const board1: Board = emptyBoard();
const h1 = handOf(def, "t1");
const res = playCard(board1, [h1], 10, "player", "armas", h1, null, null);
const placed = res.board.armas.player[res.board.armas.player.length - 1];
assert.strictEqual(
  placed.currentPower,
  res.playedCard.basePower + 2 + 5,
  "onPlay suma +5 (8 base + 2 sinergia subtipo armas + 5 script)"
);
assert.ok(
  (placed.powerLog ?? []).some((e) => e.source === "SmokeTest"),
  "powerLog registrado"
);
assert.ok(res.mutations.length >= 1, "mutación cosmética acumulada");
console.log(`✓ onPlay aplicado (+5 → ${placed.currentPower}, ${res.mutations.length} mutación(es))`);

// ── 3. onEvent start_turn: el script ve el turno y escribe log+fx ──────────
CARD_SCRIPTS[def.id] = {
  onEvent: ({ event, logs, fx }) => {
    if (event.kind === "start_turn") {
      logs.push({ side: "system", text: "SMOKE: onEvent start_turn disparado" });
      fx.push({ kind: "keyword", keyword: "fervor" });
    }
  },
};
const board2 = res.board;
const trig = applyStartTurnEffects(board2, "player", [], ["armas", "proteccion", "furia"], undefined, 1);
assert.ok(
  trig.logs.some((l) => l.text.includes("SMOKE")),
  "onEvent(start_turn) despachado al log del trigger"
);
assert.ok(trig.fx.length >= 1, "fx del script en el canal del trigger");
console.log(`✓ onEvent start_turn despachado (${trig.logs.length} log, ${trig.fx.length} fx)`);

// ── Limpieza: el registro vuelve a quedar VACÍO ────────────────────────────
delete CARD_SCRIPTS[def.id];
assert.strictEqual(Object.keys(CARD_SCRIPTS).length, 0, "registro vacío al terminar");
console.log("✓ registro CARD_SCRIPTS vacío de nuevo — motor 100% keywords");
console.log("\nSMOKE OK — los 3 hooks (canPlay/onPlay/onEvent) disparan y el estado base es intacto.");
