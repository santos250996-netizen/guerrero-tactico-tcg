// ============================================================================
// TESTS KEYWORDS V3 — Mazo espejo MAGO + ASESINO (2026-10)
// Ejecutar: npx tsx scripts/test-keywords-v3.ts
// Verifica los deltas exactos de las 12 keywords nuevas de clase sobre
// carriles arcana/fuego/hielo y veneno/combate/sigilo.
// ============================================================================

import type { BoardCard, CardDef, LaneId } from "../src/lib/game/types";
import {
  computeEffect,
  applyStartTurnEffects,
  applyEndTurnEffects,
  applyOnDeathEffects,
  computeFinalResult,
  rollLaneBonuses,
  lanesForClass,
  type Board,
} from "../src/lib/game/engine";
import { MAGE_CARDS, ROGUE_CARDS } from "../src/lib/game/cards";

let passed = 0;
let failed = 0;

function assert(name: string, cond: boolean, detail?: string) {
  if (cond) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const ALL_LANE_IDS: LaneId[] = [
  "armas", "proteccion", "furia",
  "arcana", "fuego", "hielo",
  "veneno", "combate", "sigilo",
];

function emptyBoard(): Board {
  const b = {} as Board;
  for (const ln of ALL_LANE_IDS) b[ln] = { player: [], enemy: [] };
  return b;
}

function makeCard(def: CardDef, overrides: Partial<BoardCard> = {}): BoardCard {
  return {
    uid: `uid-${Math.random().toString(36).slice(2)}`,
    defId: def.id,
    name: def.name,
    category: def.category,
    subtypes: def.subtypes,
    cost: def.cost,
    basePower: def.power,
    currentPower: def.power,
    text: def.text,
    effectId: def.effectId,
    rarity: def.rarity,
    trigger: def.trigger,
    keyword: def.keyword,
    keywordValue: def.keywordValue,
    debuffTaken: 0,
    ...overrides,
  };
}

function enemyOf(side: "player" | "enemy"): "player" | "enemy" {
  return side === "player" ? "enemy" : "player";
}

/** Envuelve computeEffect para jugar una carta definida en un carril. */
function simulatePlay(
  board: Board,
  side: "player" | "enemy",
  lane: LaneId,
  def: CardDef,
  opts: { playsThisTurn?: number; shieldSelf?: number } = {}
) {
  const ctx = {
    board,
    side,
    lane,
    card: def,
    handBonus: 0,
    hand: [],
    laneBonus: null,
    playsThisTurn: opts.playsThisTurn ?? 1,
  };
  const effect = computeEffect(ctx);
  // Aplicar mutaciones manualmente (igual que playCard)
  const newBoard: Board = JSON.parse(JSON.stringify(board));
  for (const m of effect.mutations) {
    const arr = newBoard[m.lane][m.side];
    const idx = arr.findIndex((c) => c.uid === m.uid);
    if (idx < 0) continue;
    if (m.viaDebuff && m.powerDelta < 0) {
      // vía applyDebuff: escudos absorben
      const t = arr[idx];
      const mag = Math.abs(m.powerDelta);
      const shield = t.shieldRemaining ?? 0;
      const absorbed = Math.min(mag, shield);
      const eff = mag - absorbed;
      arr[idx] = { ...t, shieldRemaining: shield - absorbed };
      if (eff > 0) {
        arr[idx] = {
          ...arr[idx],
          currentPower: Math.max(0, arr[idx].currentPower - eff),
          debuffTaken: (arr[idx].debuffTaken ?? 0) + eff,
        };
      }
      continue;
    }
    const t = arr[idx];
    arr[idx] = {
      ...t,
      currentPower: Math.max(0, t.currentPower + m.powerDelta),
      debuffTaken:
        m.powerDelta < 0 ? (t.debuffTaken ?? 0) + Math.abs(m.powerDelta) : t.debuffTaken,
    };
  }
  for (const rc of effect.removedCards) {
    newBoard[rc.lane][rc.side] = newBoard[rc.lane][rc.side].filter((c) => c.uid !== rc.uid);
  }
  // Colocar la carta jugada
  const placed: BoardCard = {
    uid: "placed",
    defId: def.id,
    name: def.name,
    category: def.category,
    subtypes: def.subtypes,
    cost: def.cost,
    basePower: def.power,
    currentPower: effect.finalPower,
    text: def.text,
    effectId: def.effectId,
    rarity: def.rarity,
    trigger: def.trigger,
    keyword: def.keyword,
    keywordValue: def.keywordValue,
    shieldRemaining: opts.shieldSelf,
    debuffTaken: 0,
  };
  newBoard[lane][side] = [...newBoard[lane][side], placed];
  return { board: newBoard, finalPower: effect.finalPower, removed: effect.removedCards };
}

function byId(cards: CardDef[], id: string): CardDef {
  const c = cards.find((x) => x.id === id);
  if (!c) throw new Error(`Carta no encontrada: ${id}`);
  return c;
}

// ============================================================================
console.log("\n🧙 MAGO — ARCANA (convergencia · sobrecarga)");
{
  const lane: LaneId = "arcana";
  const def = byId(MAGE_CARDS, "conjurador_de_estrellas"); // Convergencia[2]

  // Con 2 aliados ya en carril: +2×2=4 (+2 sinergia de subtipo)
  let b = emptyBoard();
  b[lane].player = [
    makeCard(byId(MAGE_CARDS, "grimorio_anotado"), { uid: "a1", currentPower: 3 }),
    makeCard(byId(MAGE_CARDS, "aberracion_arcana"), { uid: "a2", currentPower: 7 }),
  ];
  const r1 = simulatePlay(b, "player", lane, def);
  // poder 11 + sinergia 2 + convergencia 4 = 17
  assert("Convergencia: +2 por aliado (2 aliados → +4)", r1.finalPower === 17, `finalPower=${r1.finalPower} (esperado 17)`);

  // Con 0 aliados: +0
  b = emptyBoard();
  const r2 = simulatePlay(b, "player", lane, def);
  assert("Convergencia: carril vacío → +0", r2.finalPower === 13, `finalPower=${r2.finalPower} (esperado 11+2)`);

  // SOBRECARGA: +2X al jugar; powerDecay = X
  const sob = byId(MAGE_CARDS, "aberracion_arcana"); // X=2
  b = emptyBoard();
  const r3 = simulatePlay(b, "player", lane, sob);
  // poder 7 + sinergia 2 + 4 = 13
  assert("Sobrecarga: +2X al entrar (X=2 → +4)", r3.finalPower === 13, `finalPower=${r3.finalPower}`);
  const placed = r3.board[lane].player[0];
  // Simular powerDecay como lo hace playCard real
  placed.powerDecay = sob.keywordValue;
  const endRes = applyEndTurnEffects(r3.board, "player", [], ["arcana", "fuego", "hielo"]);
  const after = endRes.board[lane].player[0];
  assert("Sobrecarga: fin de turno pierde X (13→11)", after.currentPower === 11, `power=${after.currentPower}`);
  assert("Sobrecarga: decay consumido (powerDecay=0)", after.powerDecay === 0, `decay=${after.powerDecay}`);
}

console.log("\n🔥 MAGO — FUEGO (llamarada · combustión)");
{
  const lane: LaneId = "fuego";
  const lla = byId(MAGE_CARDS, "tormenta_de_brasas"); // X=1

  // Llamarada: −1 a TODOS los enemigos; escudos absorben
  let b = emptyBoard();
  b[lane].enemy = [
    makeCard(byId(MAGE_CARDS, "estallido_igneo"), { uid: "e1", currentPower: 13 }),
    makeCard(byId(MAGE_CARDS, "farol_igneo"), { uid: "e2", currentPower: 6, shieldRemaining: 5 }),
  ];
  const r1 = simulatePlay(b, "player", lane, lla);
  const e1 = r1.board[lane].enemy.find((c) => c.uid === "e1")!;
  const e2 = r1.board[lane].enemy.find((c) => c.uid === "e2")!;
  assert("Llamarada: −1 a enemigo sin escudo (13→12)", e1.currentPower === 12, `power=${e1.currentPower}`);
  assert("Llamarada: escudo absorbe (poder 6 intacto, escudo 5→4)", e2.currentPower === 6 && e2.shieldRemaining === 4, `power=${e2.currentPower} shield=${e2.shieldRemaining}`);

  // Combustión: al morir, −2X al más fuerte IGNORANDO escudos
  const com = byId(MAGE_CARDS, "salamandra_anciana"); // X=2 → −4
  b = emptyBoard();
  b[lane].player = [makeCard(com, { uid: "dead" })];
  b[lane].enemy = [
    makeCard(byId(MAGE_CARDS, "estallido_igneo"), { uid: "big", currentPower: 13, shieldRemaining: 10 }),
    makeCard(byId(MAGE_CARDS, "farol_igneo"), { uid: "small", currentPower: 6 }),
  ];
  const deathRes = applyOnDeathEffects(b, "player", lane, makeCard(com, { uid: "dead" }));
  const big = deathRes.board[lane].enemy.find((c) => c.uid === "big")!;
  const small = deathRes.board[lane].enemy.find((c) => c.uid === "small")!;
  assert("Combustión: −2X al más fuerte (13→9)", big.currentPower === 9, `power=${big.currentPower}`);
  assert("Combustión: IGNORA escudo (escudo 10 intacto)", big.shieldRemaining === 10, `shield=${big.shieldRemaining}`);
  assert("Combustión: el débil NO recibe nada (6)", small.currentPower === 6, `power=${small.currentPower}`);
}

console.log("\n❄️ MAGO — HIELO (escarcha · ventisca)");
{
  const lane: LaneId = "hielo";
  const esc = byId(MAGE_CARDS, "coloso_de_escarcha"); // X=2

  // Escarcha: escudo restaurado hasta X (0 → 2; 1 → 2 cap)
  let b = emptyBoard();
  b[lane].player = [makeCard(esc, { uid: "cry", shieldRemaining: 0 })];
  let res = applyStartTurnEffects(b, "player", [], ["arcana", "fuego", "hielo"]);
  let cry = res.board[lane].player[0];
  assert("Escarcha: 0 → restaurado a 2", cry.shieldRemaining === 2, `shield=${cry.shieldRemaining}`);

  b = emptyBoard();
  b[lane].player = [makeCard(esc, { uid: "cry", shieldRemaining: 1 })];
  res = applyStartTurnEffects(b, "player", [], ["arcana", "fuego", "hielo"]);
  cry = res.board[lane].player[0];
  assert("Escarcha: 1 → capped a 2 (no suma infinito)", cry.shieldRemaining === 2, `shield=${cry.shieldRemaining}`);

  // Ventisca: −X a TODOS los enemigos al fin de turno
  const ven = byId(MAGE_CARDS, "viento_cortante"); // X=1
  b = emptyBoard();
  b[lane].player = [makeCard(ven, { uid: "v1" })];
  b[lane].enemy = [
    makeCard(byId(MAGE_CARDS, "estallido_igneo"), { uid: "e1", currentPower: 13 }),
    makeCard(byId(MAGE_CARDS, "farol_igneo"), { uid: "e2", currentPower: 1 }),
  ];
  const endRes = applyEndTurnEffects(b, "player", [], ["arcana", "fuego", "hielo"]);
  const e1 = endRes.board[lane].enemy.find((c) => c.uid === "e1")!;
  const e2 = endRes.board[lane].enemy.find((c) => c.uid === "e2")!;
  assert("Ventisca: −1 a todos (13→12)", e1.currentPower === 12, `power=${e1.currentPower}`);
  assert("Ventisca: piso en 0 (1→0)", e2.currentPower === 0, `power=${e2.currentPower}`);
}

// ============================================================================
console.log("\n🗡️ ASESINO — VENENO (veneno · contagio)");
{
  const lane: LaneId = "veneno";
  const ven = byId(ROGUE_CARDS, "colmillos_curvos"); // X=1

  // Veneno: −X al MÁS FUERTE, IGNORA escudos (start_turn)
  let b = emptyBoard();
  b[lane].player = [makeCard(ven, { uid: "p1" })];
  b[lane].enemy = [
    makeCard(byId(ROGUE_CARDS, "ajuste_de_cuentas"), { uid: "big", currentPower: 13, shieldRemaining: 9 }),
    makeCard(byId(ROGUE_CARDS, "bandido_de_la_ruta"), { uid: "small", currentPower: 8 }),
  ];
  const res = applyStartTurnEffects(b, "player", [], ["veneno", "combate", "sigilo"]);
  const big = res.board[lane].enemy.find((c) => c.uid === "big")!;
  assert("Veneno: −1 al más fuerte (13→12)", big.currentPower === 12, `power=${big.currentPower}`);
  assert("Veneno: IGNORA escudo (escudo 9 intacto)", big.shieldRemaining === 9, `shield=${big.shieldRemaining}`);

  // Contagio: −X al enemigo con MÁS debuffTaken; si nadie, nada
  const con = byId(ROGUE_CARDS, "frasco_de_peste"); // X=1
  b = emptyBoard();
  b[lane].player = [makeCard(con, { uid: "c1" })];
  b[lane].enemy = [
    makeCard(byId(ROGUE_CARDS, "ajuste_de_cuentas"), { uid: "e1", currentPower: 13, debuffTaken: 3 }),
    makeCard(byId(ROGUE_CARDS, "bandido_de_la_ruta"), { uid: "e2", currentPower: 8, debuffTaken: 1 }),
  ];
  let endRes = applyEndTurnEffects(b, "player", [], ["veneno", "combate", "sigilo"]);
  const e1 = endRes.board[lane].enemy.find((c) => c.uid === "e1")!;
  const e2 = endRes.board[lane].enemy.find((c) => c.uid === "e2")!;
  assert("Contagio: pega al MÁS ENVENENADO (13→12), no al otro", e1.currentPower === 12 && e2.currentPower === 8, `e1=${e1.currentPower} e2=${e2.currentPower}`);

  // Sin veneno acumulado → no hace nada
  b = emptyBoard();
  b[lane].player = [makeCard(con, { uid: "c1" })];
  b[lane].enemy = [makeCard(byId(ROGUE_CARDS, "bandido_de_la_ruta"), { uid: "e2", currentPower: 8 })];
  endRes = applyEndTurnEffects(b, "player", [], ["veneno", "combate", "sigilo"]);
  const untouched = endRes.board[lane].enemy[0];
  assert("Contagio: sin veneno previo → 8 intacto", untouched.currentPower === 8, `power=${untouched.currentPower}`);
}

console.log("\n⚔️ ASESINO — COMBATE (refriega · golpe certero)");
{
  const lane: LaneId = "combate";
  const ref = byId(ROGUE_CARDS, "bandido_de_la_ruta"); // X=2

  // Refriega: +X por cada enemigo ya en carril (3 enemigos → +6) (+2 sinergia)
  let b = emptyBoard();
  b[lane].enemy = [
    makeCard(byId(ROGUE_CARDS, "ajuste_de_cuentas"), { uid: "e1" }),
    makeCard(byId(ROGUE_CARDS, "estoque_afilado"), { uid: "e2" }),
    makeCard(byId(ROGUE_CARDS, "capitan_de_milicia"), { uid: "e3" }),
  ];
  const r1 = simulatePlay(b, "player", lane, ref);
  // poder 8 + sinergia 2 + 2×3 = 16
  assert("Refriega: +2×3 enemigos (+6)", r1.finalPower === 16, `finalPower=${r1.finalPower} (esperado 16)`);

  // Golpe Certero: −X al más fuerte PERO los escudos absorben
  const gol = byId(ROGUE_CARDS, "estoque_afilado"); // X=3
  b = emptyBoard();
  b[lane].enemy = [
    makeCard(byId(ROGUE_CARDS, "ajuste_de_cuentas"), { uid: "big", currentPower: 13, shieldRemaining: 5 }),
  ];
  const r2 = simulatePlay(b, "player", lane, gol);
  const big = r2.board[lane].enemy.find((c) => c.uid === "big")!;
  assert("Golpe Certero: escudo absorbe todo (poder 13 intacto)", big.currentPower === 13, `power=${big.currentPower}`);
  assert("Golpe Certero: escudo consume (5→2)", big.shieldRemaining === 2, `shield=${big.shieldRemaining}`);

  // Sin escudo: aplica completo y acumula debuffTaken
  b = emptyBoard();
  b[lane].enemy = [makeCard(byId(ROGUE_CARDS, "ajuste_de_cuentas"), { uid: "big", currentPower: 13 })];
  const r3 = simulatePlay(b, "player", lane, gol);
  const big2 = r3.board[lane].enemy.find((c) => c.uid === "big")!;
  assert("Golpe Certero: sin escudo −3 (13→10)", big2.currentPower === 10 && big2.debuffTaken === 3, `power=${big2.currentPower} taken=${big2.debuffTaken}`);
}

console.log("\n🌑 ASESINO — SIGILO (emboscada · purga)");
{
  const lane: LaneId = "sigilo";
  const emb = byId(ROGUE_CARDS, "acechador_nocturno"); // X=2

  // Emboscada: 1ª carta del turno +2X=4; posterior +X=2 (+2 sinergia)
  let b = emptyBoard();
  const r1 = simulatePlay(b, "player", lane, emb, { playsThisTurn: 1 });
  assert("Emboscada: 1ª carta +4 (7+2+4=13)", r1.finalPower === 13, `finalPower=${r1.finalPower}`);

  const r2 = simulatePlay(b, "player", lane, emb, { playsThisTurn: 2 });
  assert("Emboscada: 2ª carta +2 (7+2+2=11)", r2.finalPower === 11, `finalPower=${r2.finalPower}`);

  // Purga: destruye al MÁS DÉBIL ≤ X (no al más fuerte como Remate)
  const pur = byId(ROGUE_CARDS, "cuchilla_del_silencio"); // X=2
  b = emptyBoard();
  b[lane].enemy = [
    makeCard(byId(ROGUE_CARDS, "ajuste_de_cuentas"), { uid: "strong", currentPower: 1, }), // ≤2 pero MÁS FUERTE entre candidatos... power 1
    makeCard(byId(ROGUE_CARDS, "bandido_de_la_ruta"), { uid: "mid", currentPower: 2 }),
    makeCard(byId(ROGUE_CARDS, "acechador_nocturno"), { uid: "big", currentPower: 9 }),
  ];
  const r3 = simulatePlay(b, "player", lane, pur);
  const ids = r3.board[lane].enemy.map((c) => c.uid);
  assert("Purga: mata al MÁS DÉBIL ≤2 (power 1)", !ids.includes("strong"), `supervivientes: ${ids.join(",")}`);
  assert("Purga: respeta al mid (2) y al big (9)", ids.includes("mid") && ids.includes("big"), `supervivientes: ${ids.join(",")}`);
}

// ============================================================================
console.log("\n🎲 PLUMBING V3 (clases, carriles, resultado)");
{
  assert("lanesForClass(mago) = arcana/fuego/hielo", JSON.stringify(lanesForClass("mago")) === JSON.stringify(["arcana", "fuego", "hielo"]));
  assert("lanesForClass(asesino) = veneno/combate/sigilo", JSON.stringify(lanesForClass("asesino")) === JSON.stringify(["veneno", "combate", "sigilo"]));

  const bonuses = rollLaneBonuses(["arcana", "fuego", "hielo"]);
  const keys = Object.entries(bonuses).filter(([, v]) => v !== null).map(([k]) => k).sort();
  assert("rollLaneBonuses solo toca carriles de la clase", keys.every((k) => ["arcana", "fuego", "hielo"].includes(k)), `keys=${keys.join(",")}`);

  // computeFinalResult sobre carriles de mago
  const b = emptyBoard();
  b.arcana.player = [makeCard(byId(MAGE_CARDS, "grimorio_anotado"), { currentPower: 5 })];
  b.fuego.enemy = [makeCard(byId(MAGE_CARDS, "tormenta_de_brasas"), { currentPower: 7 })];
  const fr = computeFinalResult(b, ["arcana", "fuego", "hielo"]);
  assert("computeFinalResult con carriles de mago (1-1)", fr.playerWins === 1 && fr.enemyWins === 1 && fr.draws === 1, `${fr.playerWins}-${fr.enemyWins}-${fr.draws}`);
}

// ============================================================================
console.log("\n============================================================================");
console.log(`RESULTADO: ${passed} pasados, ${failed} fallidos`);
if (failed > 0) process.exit(1);
console.log("✨ Todos los tests de keywords V3 pasaron.");
