// ============================================================================
// TEST REGLAS SISTÉMICAS DE CLASE (V3) — Formación · Resonancia · Marca
// ============================================================================
// Ejecutar: bun scripts/test-clases-v3.ts
// Una regla por clase, ligada a los CARRILES. Afirma deltas EXACTOS, topes,
// suelos, cadenas, persistencia y SIMETRÍA (mismo motor para ambos lados).
// Sin `rules` pasadas, las reglas están INACTIVAS (compatibilidad legacy).
// ============================================================================

import {
  playCard,
  applyStartTurnEffects,
  applyEndTurnEffects,
  emptyClassRules,
  V3_FORMACION_CAP,
  V3_COMBO_CAP,
  V3_COMBO_POWER,
  type Board,
  type ClassRulesState,
} from "../src/lib/game/engine";
import type { BoardCard, HandCard, LaneId } from "../src/lib/game/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(t: string) {
  console.log(`\n── ${t} ${"─".repeat(Math.max(2, 60 - t.length))}`);
}

let seq = 0;
function mkHand(opts: {
  id?: string; name?: string; category?: "Ataque" | "Ítem" | "Acción";
  subtypes?: LaneId[]; cost?: number; power?: number;
  keyword?: HandCard["keyword"]; keywordValue?: number; trigger?: HandCard["trigger"];
}): HandCard {
  seq++;
  return {
    id: opts.id ?? `v3-${seq}`,
    name: opts.name ?? `Carta V3 ${seq}`,
    category: opts.category ?? "Ataque",
    subtypes: opts.subtypes ?? ["armas"],
    cost: opts.cost ?? 1,
    power: opts.power ?? 2,
    text: "carta de test V3",
    effectId: opts.keyword ?? "none",
    rarity: "common",
    keyword: opts.keyword,
    keywordValue: opts.keywordValue,
    trigger: opts.trigger,
    uid: `hand-v3-${seq}`,
    handBonus: 0,
  } as HandCard;
}

function bc(name: string, power: number, overrides: Partial<BoardCard> = {}): BoardCard {
  seq++;
  return {
    uid: `bc-v3-${seq}`,
    defId: `def-${seq}`,
    name,
    category: "Ataque",
    subtypes: ["armas"],
    cost: 1,
    basePower: power,
    currentPower: power,
    text: "",
    effectId: "none",
    rarity: "common",
    debuffTaken: 0,
    ...overrides,
  };
}

function emptyBoard(): Board {
  return {
    armas: { player: [], enemy: [] },
    proteccion: { player: [], enemy: [] },
    furia: { player: [], enemy: [] },
    arcana: { player: [], enemy: [] },
    fuego: { player: [], enemy: [] },
    hielo: { player: [], enemy: [] },
    veneno: { player: [], enemy: [] },
    combate: { player: [], enemy: [] },
    sigilo: { player: [], enemy: [] },
  };
}

function rulesOf(classes: { player?: ClassRulesState["classes"]["player"]; enemy?: ClassRulesState["classes"]["enemy"] }, combo = { player: 0, enemy: 0 }): ClassRulesState {
  const r = emptyClassRules();
  r.classes = { player: classes.player ?? null, enemy: classes.enemy ?? null };
  r.comboPoints = { ...combo };
  return r;
}

const GUERRERO = { player: "guerrero" as const, enemy: null };
const MAGO = { player: "mago" as const, enemy: null };
const ASESINO = { player: "asesino" as const, enemy: null };

// ---------------------------------------------------------------------------
// 1. SIN REGLAS → INACTIVAS
// ---------------------------------------------------------------------------

section("1. Sin rules declaradas, las reglas están INACTIVAS");
{
  const b = emptyBoard();
  b.armas.enemy.push(bc("Rival", 3));
  const c1 = mkHand({ cost: 2, power: 4, subtypes: ["armas"] });
  const r1 = playCard(b, [c1], 5, "player", "armas", c1, null, null, 1);
  check("sin rules: entra con poder base+sinergia (6)", r1.playedCard.currentPower === 6, `=${r1.playedCard.currentPower}`);
  check("sin rules: cuesta el coste completo", r1.remainingEnergy === 3, `=${r1.remainingEnergy}`);
  check("sin rules: rulesOut undefined", r1.rulesOut === undefined);
  const rEnd = applyEndTurnEffects(r1.board, "player");
  const own = rEnd.board.armas.player;
  check("sin rules: end_turn NO aplica Formación", own.every((c) => c.currentPower === r1.playedCard.currentPower), `=${own[0]?.currentPower} vs ${r1.playedCard.currentPower}`);
}

// ---------------------------------------------------------------------------
// 2. GUERRERO — FORMACIÓN DE COMBATE
// ---------------------------------------------------------------------------

section("2. GUERRERO — Formación (+1 a carriles con 2+, tope +1/carta)");
{
  const b = emptyBoard();
  b.armas.player.push(bc("A", 3), bc("B", 2));
  b.proteccion.player.push(bc("C", 2)); // carril con 1 carta: sin formación
  const r = applyEndTurnEffects(b, "player", [], ["armas", "proteccion"], rulesOf(GUERRERO));
  const [a, bb] = r.board.armas.player;
  check("A gana +1", a.currentPower === 4, `=${a.currentPower}`);
  check("B gana +1", bb.currentPower === 3, `=${bb.currentPower}`);
  check("formation acumulado = 1", (a.formation ?? 0) === 1 && (bb.formation ?? 0) === 1);
  const c = r.board.proteccion.player[0];
  check("carril con 1 carta: sin bonus", c.currentPower === 2, `=${c.currentPower}`);
  check("log de Formación presente", r.logs.some((l) => l.text.includes("Formación de combate")));

  // Acumulación hasta el tope +3 (4 cierres de turno → +3, no +4)
  let bb2 = r.board;
  let rules = r.rulesOut!;
  for (let i = 0; i < 3; i++) {
    const rr = applyEndTurnEffects(bb2, "player", [], ["armas"], rules);
    bb2 = rr.board;
    rules = rr.rulesOut!;
  }
  const [a3, b3] = bb2.armas.player;
  check(`tope: tras 4 cierres A = base+${V3_FORMACION_CAP}`, a3.currentPower === 3 + V3_FORMACION_CAP, `=${a3.currentPower}`);
  check("4º cierre ya NO suma (tope)", b3.currentPower === 2 + V3_FORMACION_CAP, `=${b3.currentPower}`);
  check("la Formación NO entra en debuffTaken", a3.debuffTaken === 0);
}

section("2b. GUERRERO — simetría: el lado ENEMY también cobra");
{
  const b = emptyBoard();
  b.armas.enemy.push(bc("X", 5), bc("Y", 1));
  const rules = rulesOf({ player: null, enemy: "guerrero" });
  const r = applyEndTurnEffects(b, "enemy", [], ["armas"], rules);
  check("enemy con 2 cartas: ambas +1", r.board.armas.enemy.every((c) => c.currentPower === c.basePower + 1));
  check("el lado player no cambia", r.board.armas.player.length === 0);
}

// ---------------------------------------------------------------------------
// 3. MAGO — RESONANCIA DE ESCUELA
// ---------------------------------------------------------------------------

section("3. MAGO — Resonancia (misma spec consecutiva: +2 y −1, suelo 0)");
{
  const b = emptyBoard();
  const c1 = mkHand({ name: "Chispa", cost: 2, power: 3, subtypes: ["fuego"] });
  const rules0 = rulesOf(MAGO);
  const r1 = playCard(b, [c1], 9, "player", "fuego", c1, null, null, 1, rules0);
  check("1ª carta del turno: SIN resonancia", !r1.resonancia);
  check("1ª carta: cuesta completo", r1.remainingEnergy === 7, `=${r1.remainingEnergy}`);
  check("lastSpec queda en fuego", r1.rulesOut!.lastSpec.player === "fuego");
  check("1ª carta: poder base+sinergia (5)", r1.playedCard.currentPower === 5, `=${r1.playedCard.currentPower}`);

  // 2ª carta en el MISMO carril → RESONANCIA
  const c2 = mkHand({ name: "Llama", cost: 3, power: 4, subtypes: ["fuego"] });
  const r2 = playCard(r1.board, [c2], 9, "player", "fuego", c2, null, null, 2, r1.rulesOut);
  check("2ª en misma spec: RESONANCIA", r2.resonancia === true);
  check("2ª: +2 de poder (4+2+2 sinergia)", r2.playedCard.currentPower === 8, `=${r2.playedCard.currentPower}`);
  check("2ª: cuesta −1 (3→2)", r2.remainingEnergy === 7, `=${r2.remainingEnergy}`);
  check("lastSpec sigue en fuego (cadenas)", r2.rulesOut!.lastSpec.player === "fuego");

  // 3ª en el mismo carril también resuena (cadena)
  const c3 = mkHand({ name: "Bola", cost: 2, power: 2, subtypes: ["fuego"] });
  const r3 = playCard(r2.board, [c3], 9, "player", "fuego", c3, null, null, 3, r2.rulesOut);
  check("3ª consecutiva: también resuena", r3.resonancia === true);

  // Cambio de carril → sin resonancia
  const c4 = mkHand({ name: "Escarcha", cost: 1, power: 2, subtypes: ["hielo"] });
  const r4 = playCard(r3.board, [c4], 9, "player", "hielo", c4, null, null, 4, r3.rulesOut);
  check("cambio de spec: sin resonancia", !r4.resonancia);
  check("lastSpec ahora hielo", r4.rulesOut!.lastSpec.player === "hielo");

  // Suelo 0: coste 1 resonando paga 0
  const c5 = mkHand({ name: "Floo", cost: 1, power: 1, subtypes: ["hielo"] });
  const r5 = playCard(r4.board, [c5], 9, "player", "hielo", c5, null, null, 5, r4.rulesOut);
  check("suelo 0: coste 1 resonante paga 0", r5.resonancia === true && r5.remainingEnergy === 9, `pagó ${9 - r5.remainingEnergy}`);

  // Cierre de turno → la Resonancia expira
  const rEnd = applyEndTurnEffects(r5.board, "player", [], ["hielo"], r5.rulesOut);
  check("end_turn: lastSpec a null", rEnd.rulesOut!.lastSpec.player === null);
  const c6 = mkHand({ name: "Post", cost: 2, power: 2, subtypes: ["hielo"] });
  const r6 = playCard(rEnd.board, [c6], 5, "player", "hielo", c6, null, null, 1, rEnd.rulesOut);
  check("turno nuevo: sin resonancia", !r6.resonancia);
}

section("3b. MAGO — simetría: el lado ENEMY resuena igual");
{
  const b = emptyBoard();
  const c1 = mkHand({ cost: 2, power: 3, subtypes: ["arcana"] });
  const rules = rulesOf({ player: null, enemy: "mago" });
  const r1 = playCard(b, [c1], 5, "enemy", "arcana", c1, null, null, 1, rules);
  const c2 = mkHand({ cost: 2, power: 3, subtypes: ["arcana"] });
  const r2 = playCard(r1.board, [c2], r1.remainingEnergy, "enemy", "arcana", c2, null, null, 2, r1.rulesOut);
  check("enemy mago: 2ª resonante entra +2", r2.playedCard.currentPower === 7, `=${r2.playedCard.currentPower}`);
  check("enemy mago: cuesta −1", r2.remainingEnergy === 2, `=${r2.remainingEnergy}`);
}

// ---------------------------------------------------------------------------
// 4. ASESINO — MARCA DE EJECUCIÓN
// ---------------------------------------------------------------------------

section("4. ASESINO — Marca de ejecución (PC por debuff, consumo +2/PC)");
{
  // Debuff REAL → +1 PC
  const b = emptyBoard();
  b.armas.enemy.push(bc("Presa", 8));
  const golpe = mkHand({ name: "Golpe", cost: 2, power: 2, subtypes: ["armas"], keyword: "golpe_certero", keywordValue: 2, trigger: "on_play" });
  const rules0 = rulesOf(ASESINO);
  const r1 = playCard(b, [golpe], 5, "player", "armas", golpe, null, null, 1, rules0);
  check("debuff real: +1 PC", r1.comboGained === 1 && r1.rulesOut!.comboPoints.player === 1, `gained=${r1.comboGained}`);

  // Consumo: jugar en carril con debilitado consume TODOS los PC
  const cualquiera = mkHand({ name: "Remache", cost: 1, power: 2, subtypes: ["armas"] });
  const r2 = playCard(r1.board, [cualquiera], 5, "player", "armas", cualquiera, null, null, 2, r1.rulesOut);
  check("consume todos los PC", r2.comboConsumed === 1, `=${r2.comboConsumed}`);
  check(`+V3_COMBO_POWER por PC (${2 + 2 + V3_COMBO_POWER})`, r2.playedCard.currentPower === 2 + 2 + V3_COMBO_POWER, `=${r2.playedCard.currentPower}`);
  check("PC a cero tras consumir", r2.rulesOut!.comboPoints.player === 0);

  // Sin presa debilitada → NO consume (los PC se guardan)
  const b2 = emptyBoard();
  b2.armas.enemy.push(bc("Fresco", 8));
  const rules3 = rulesOf(ASESINO, { player: 3, enemy: 0 });
  const r3 = playCard(b2, [mkHand({ name: "Nada", cost: 1, power: 2, subtypes: ["armas"] })], 5, "player", "armas", mkHand({ name: "Nada", cost: 1, power: 2, subtypes: ["armas"] }), null, null, 1, rules3);
  check("sin debilitado: NO consume", (r3.comboConsumed ?? 0) === 0);
  check("sin debilitado: poder sin bonus", r3.playedCard.currentPower === 4, `=${r3.playedCard.currentPower}`);
  check("PC persisten intactos", r3.rulesOut!.comboPoints.player === 3);

  // Tope de PC: Ventisca sobre 4 enemigos 2 turnos → tope 5
  const b3 = emptyBoard();
  b3.armas.enemy.push(bc("e1", 10), bc("e2", 10), bc("e3", 10), bc("e4", 10));
  const rules4 = rulesOf(ASESINO, { player: 4, enemy: 0 });
  const ventisca = bc("Ventisca", 1, { keyword: "ventisca", keywordValue: 1, trigger: "end_turn" });
  b3.armas.player.push(ventisca);
  const rEnd1 = applyEndTurnEffects(b3, "player", [], ["armas"], rules4);
  check("Ventisca 4 hits: +4 PC (4+4=8 → tope)", rEnd1.rulesOut!.comboPoints.player === V3_COMBO_CAP, `=${rEnd1.rulesOut!.comboPoints.player}`);

  // Absorbido por escudo NO da PC
  const b4 = emptyBoard();
  b4.armas.enemy.push(bc("Blindado", 8, { shieldRemaining: 5 }));
  const g2 = mkHand({ name: "Golpe2", cost: 2, power: 2, subtypes: ["armas"], keyword: "golpe_certero", keywordValue: 2, trigger: "on_play" });
  const r5 = playCard(b4, [g2], 5, "player", "armas", g2, null, null, 1, rulesOf(ASESINO));
  check("debuff absorbido por escudo: 0 PC", (r5.comboGained ?? 0) === 0, `=${r5.comboGained}`);

  // start_turn (Veneno) y on_death (Detonación) también dan PC
  const b5 = emptyBoard();
  b5.armas.enemy.push(bc("Víctima", 9));
  b5.armas.player.push(bc("Serpiente", 2, { keyword: "veneno", keywordValue: 1, trigger: "start_turn" }));
  const rStart = applyStartTurnEffects(b5, "player", [], ["armas"], rulesOf(ASESINO, { player: 0, enemy: 0 }));
  check("Veneno en start_turn: +1 PC", rStart.rulesOut!.comboPoints.player === 1, `=${rStart.rulesOut!.comboPoints.player}`);
}

section("4b. ASESINO — simetría: el ENEMY acumula y consume igual");
{
  const b = emptyBoard();
  b.armas.player.push(bc("Tú", 9));
  const rules = rulesOf({ player: null, enemy: "asesino" });
  // El enemy juega Golpe Certero contra el player
  const golpe = mkHand({ name: "GolpeE", cost: 2, power: 2, subtypes: ["armas"], keyword: "golpe_certero", keywordValue: 2, trigger: "on_play" });
  const r1 = playCard(b, [golpe], 5, "enemy", "armas", golpe, null, null, 1, rules);
  check("enemy debuffea: SUS PC suben", r1.rulesOut!.comboPoints.enemy === 1, `=${r1.rulesOut!.comboPoints.enemy}`);
  const remache = mkHand({ name: "RemE", cost: 1, power: 2, subtypes: ["armas"] });
  const r2 = playCard(r1.board, [remache], 5, "enemy", "armas", remache, null, null, 2, r1.rulesOut);
  check("enemy consume: +V3_COMBO_POWER a SU carta", r2.playedCard.currentPower === 2 + 2 + V3_COMBO_POWER, `=${r2.playedCard.currentPower}`);
  check("PC del enemy a cero", r2.rulesOut!.comboPoints.enemy === 0);
}

// ---------------------------------------------------------------------------
// 5. REGLAS INDEPENDIENTES POR LADO
// ---------------------------------------------------------------------------

section("5. Dos clases conviven: cada lado solo cobra SU regla");
{
  const b = emptyBoard();
  b.armas.player.push(bc("P1", 3), bc("P2", 3));
  b.armas.enemy.push(bc("E1", 3), bc("E2", 3));
  const rules = rulesOf({ player: "guerrero", enemy: "mago" });
  const r = applyEndTurnEffects(b, "player", [], ["armas"], rules);
  check("guerrero (player) cobra formación", r.board.armas.player.every((c) => c.currentPower === 4));
  check("mago (enemy) NO cobra formación", r.board.armas.enemy.every((c) => c.currentPower === 3));
  check("lastSpec del player expira, enemy intacto", r.rulesOut!.lastSpec.player === null && r.rulesOut!.lastSpec.enemy === null);
}

// ---------------------------------------------------------------------------
console.log(`\n════════════════════════════════════════`);
console.log(`  RESULTADO: ${passed} pasan · ${failed} fallan`);
console.log(`════════════════════════════════════════`);
if (failed > 0) {
  console.log("\nFallos:");
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
