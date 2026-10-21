// ============================================================================
// TESTS KEYWORDS V4 — 3ª tanda: 9 keywords nuevas (1 por spec) + mazos 2
// Ejecutar: npx tsx scripts/test-keywords-v4.ts
//   1. Deltas exactos de orden_batalla/custodia/desafio/drenar_poder/
//      detonacion/ruptura_glacial/miasma/caza_mayor/conspiracion
//   2. Composición de los 3 mazos segundos (curva, categorías, keywords)
//   3. Auditoría PTP de las 72 cartas del catálogo (±0.5)
// ============================================================================

import type { BoardCard, CardDef, HandCard, LaneId } from "../src/lib/game/types";
import {
  computeEffect,
  applyStartTurnEffects,
  applyOnDeathEffects,
  playCard,
  lanesForClass,
  type Board,
} from "../src/lib/game/engine";
import {
  WARRIOR2_CARDS,
  MAGE2_CARDS,
  ROGUE2_CARDS,
  ALL_CARDS_V3,
} from "../src/lib/game/cards";
import { getBalanceInfo } from "../src/lib/game/balance";

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

function toHand(def: CardDef, uid: string): HandCard {
  return { ...def, uid, handBonus: 0 };
}

/** Juega una carta real del catálogo en un carril y devuelve el resultado. */
function play(
  board: Board,
  side: "player" | "enemy",
  lane: LaneId,
  def: CardDef,
  opts: { playsThisTurn?: number } = {}
) {
  const uid = `hand-${Math.random().toString(36).slice(2)}`;
  return playCard(
    board,
    [toHand(def, uid)],
    20,
    side,
    lane,
    toHand(def, uid),
    null,
    null,
    opts.playsThisTurn ?? 1
  );
}

// ============================================================================
console.log("\n🚩 GUERRERO ARMAS — Orden de Batalla (AoE buff one-shot)");
{
  // Legionario p12 + sinergia armas +2 + Orden +1 = 15; 2 aliados ganan +1 c/u.
  const b = emptyBoard();
  const a1 = makeCard(WARRIOR2_CARDS.find((c) => c.id === "quebrantador_de_filas")!);
  const a2 = makeCard(WARRIOR2_CARDS.find((c) => c.id === "munonera_de_asedio")!);
  b.armas.player = [a1, a2];
  const res = play(b, "player", "armas", WARRIOR2_CARDS.find((c) => c.id === "legionario_de_vanguardia")!);
  const legionario = res.board.armas.player.find((c) => c.defId === "legionario_de_vanguardia")!;
  assert("carta gana su propio +X", legionario.currentPower === 15, `p=${legionario.currentPower} (esperado 15)`);
  const q = res.board.armas.player.find((c) => c.defId === "quebrantador_de_filas")!;
  const m = res.board.armas.player.find((c) => c.defId === "munonera_de_asedio")!;
  assert("aliado 1 gana +1", q.currentPower === 8, `p=${q.currentPower}`);
  assert("aliado 2 gana +1", m.currentPower === 4, `p=${m.currentPower}`);
}

console.log("\n🛡️ GUERRERO PROTECCIÓN — Custodia (escudo renovable al más débil)");
{
  // Baluarte p11 ES la más débil sola → se escuda a sí misma.
  let b = emptyBoard();
  b.proteccion.player = [makeCard(WARRIOR2_CARDS.find((c) => c.id === "baluarte_errante")!)];
  b = applyStartTurnEffects(b, "player", [], lanesForClass("guerrero")).board;
  const bal = b.proteccion.player[0];
  assert("siendo la más débil se escuda a sí misma", bal.shieldRemaining === 2, `shield=${bal.shieldRemaining}`);

  // Task 46: apunta al escudo MÁS DAÑADO — el aliado SIN escudo es el objetivo
  // y sube hasta X; el que ya tiene escudo 1 conserva el suyo.
  let b2 = emptyBoard();
  const centinela = makeCard(WARRIOR2_CARDS.find((c) => c.id === "centinela_anclado")!);
  const debil = makeCard(WARRIOR2_CARDS.find((c) => c.id === "estandarte_de_la_cohorte")!, {
    currentPower: 6, shieldRemaining: 1,
  });
  b2.proteccion.player = [makeCard(WARRIOR2_CARDS.find((c) => c.id === "baluarte_errante")!), centinela, debil];
  b2 = applyStartTurnEffects(b2, "player", [], lanesForClass("guerrero")).board;
  const centinelaAfter = b2.proteccion.player.find((c) => c.defId === "centinela_anclado")!;
  assert("el aliado SIN escudo sube hasta X (0→2)", (centinelaAfter.shieldRemaining ?? 0) === 2, `shield=${centinelaAfter.shieldRemaining}`);
  const debilAfter = b2.proteccion.player.find((c) => c.currentPower === 6)!;
  assert("el que ya tenía escudo no se toca (1 intacto)", debilAfter.shieldRemaining === 1, `shield=${debilAfter.shieldRemaining}`);
}

console.log("\n🔥 GUERRERO FURIA — Desafío (+X mientras pierdes el carril)");
{
  const gladiador = WARRIOR2_CARDS.find((c) => c.id === "gladiador_enfrentado")!;
  // Pierde el carril (enemigo 20 > propio 10) → +2.
  let b = emptyBoard();
  b.furia.player = [makeCard(gladiador)];
  b.furia.enemy = [makeCard(gladiador, { uid: "e1", currentPower: 20 })];
  b = applyStartTurnEffects(b, "player", [], lanesForClass("guerrero")).board;
  assert("perdiendo el carril gana +X", b.furia.player[0].currentPower === 12, `p=${b.furia.player[0].currentPower}`);

  // Ganando el carril → sin bonus.
  let b2 = emptyBoard();
  b2.furia.player = [makeCard(gladiador), makeCard(gladiador, { uid: "a2", defId: "a2" })];
  b2.furia.enemy = [makeCard(gladiador, { uid: "e1", currentPower: 10 })];
  b2 = applyStartTurnEffects(b2, "player", [], lanesForClass("guerrero")).board;
  assert("ganando el carril no gana nada", b2.furia.player[0].currentPower === 10, `p=${b2.furia.player[0].currentPower}`);
}

console.log("\n🔮 MAGO ARCANA — Drenar Poder (+X propio y −X honesto al más fuerte)");
{
  const tejedor = MAGE2_CARDS.find((c) => c.id === "tejedor_de_mana")!;
  const b = emptyBoard();
  const enemigo = makeCard(MAGE2_CARDS.find((c) => c.id === "boveda_prismatica")!, { uid: "e1", currentPower: 20 });
  b.arcana.enemy = [enemigo];
  const res = play(b, "player", "arcana", tejedor);
  const t = res.board.arcana.player.find((c) => c.defId === "tejedor_de_mana")!;
  assert("carta gana +X", t.currentPower === 14, `p=${t.currentPower} (esperado 10+2 syn+2 drenaje)`);
  const e = res.board.arcana.enemy[0];
  assert("enemigo más fuerte pierde X", e.currentPower === 18 && (e.debuffTaken ?? 0) === 2, `p=${e.currentPower} debuff=${e.debuffTaken}`);

  // Con escudo: la reducción se absorbe, el +X propio se mantiene.
  const b2 = emptyBoard();
  b2.arcana.enemy = [makeCard(MAGE2_CARDS.find((c) => c.id === "boveda_prismatica")!, { uid: "e1", currentPower: 20, shieldRemaining: 5 })];
  const res2 = play(b2, "player", "arcana", tejedor);
  const t2 = res2.board.arcana.player.find((c) => c.defId === "tejedor_de_mana")!;
  const e2 = res2.board.arcana.enemy[0];
  assert("el +X propio se mantiene aunque el escudo absorba", t2.currentPower === 14, `p=${t2.currentPower}`);
  assert("el escudo absorbió la reducción", e2.currentPower === 20 && (e2.shieldRemaining ?? 0) === 3, `p=${e2.currentPower} shield=${e2.shieldRemaining}`);
}

console.log("\n💥 MAGO FUEGO — Detonación (AoE al morir, escudos absorben)");
{
  const fenix = MAGE2_CARDS.find((c) => c.id === "fenix_de_ascuas")!;
  const b = emptyBoard();
  const e1 = makeCard(MAGE2_CARDS.find((c) => c.id === "boveda_prismatica")!, { uid: "e1", currentPower: 17, shieldRemaining: 3 });
  const e2 = makeCard(MAGE2_CARDS.find((c) => c.id === "boveda_prismatica")!, { uid: "e2", currentPower: 10 });
  b.fuego.enemy = [e1, e2];
  const dead = makeCard(fenix);
  b.fuego.player = [dead];
  const result = applyOnDeathEffects(b, "player", "fuego", dead);
  const after1 = result.board.fuego.enemy.find((c) => c.uid === "e1")!;
  const after2 = result.board.fuego.enemy.find((c) => c.uid === "e2")!;
  assert("AoE −X a todos al morir", after2.currentPower === 8 && (after2.debuffTaken ?? 0) === 2, `p=${after2.currentPower}`);
  assert("los escudos absorben (no perfora)", after1.currentPower === 17 && (after1.shieldRemaining ?? 0) === 1, `p=${after1.currentPower} shield=${after1.shieldRemaining}`);
}

console.log("\n🔨 MAGO HIELO — Ruptura Glacial (pierce al más debuffeado, empate→más fuerte)");
{
  const maza = MAGE2_CARDS.find((c) => c.id === "maza_glacial")!;
  // Dos enemigos: A con más grietas y escudo grande (perfora igual), B con menos.
  const b = emptyBoard();
  b.hielo.enemy = [
    makeCard(MAGE2_CARDS.find((c) => c.id === "alma_del_glaciar")!, { uid: "eA", currentPower: 10, debuffTaken: 3, shieldRemaining: 5 }),
    makeCard(MAGE2_CARDS.find((c) => c.id === "aguja_glacial")!, { uid: "eB", currentPower: 5, debuffTaken: 1 }),
  ];
  const res = play(b, "player", "hielo", maza);
  const eA = res.board.hielo.enemy.find((c) => c.uid === "eA")!;
  const eB = res.board.hielo.enemy.find((c) => c.uid === "eB")!;
  assert("golpea al más debuffeado ignorando escudo", eA.currentPower === 8 && (eA.shieldRemaining ?? 0) === 5, `A p=${eA.currentPower} shield=${eA.shieldRemaining}`);
  assert("el otro enemigo intacto", eB.currentPower === 5, `B p=${eB.currentPower}`);

  // Empate de grietas → el más fuerte.
  const b2 = emptyBoard();
  b2.hielo.enemy = [
    makeCard(MAGE2_CARDS.find((c) => c.id === "alma_del_glaciar")!, { uid: "eA", currentPower: 10, debuffTaken: 2 }),
    makeCard(MAGE2_CARDS.find((c) => c.id === "aguja_glacial")!, { uid: "eB", currentPower: 5, debuffTaken: 2 }),
  ];
  const res2 = play(b2, "player", "hielo", maza);
  assert("empate → el más fuerte", res2.board.hielo.enemy.find((c) => c.uid === "eA")!.currentPower === 8, `A=${res2.board.hielo.enemy.find((c) => c.uid === "eA")!.currentPower}`);

  // Sin grietas (Task 46): la maza golpea al MÁS FUERTE igualmente (fallback).
  const b3 = emptyBoard();
  b3.hielo.enemy = [makeCard(MAGE2_CARDS.find((c) => c.id === "alma_del_glaciar")!, { uid: "eA", currentPower: 10, debuffTaken: 0 })];
  const res3 = play(b3, "player", "hielo", maza);
  const r3 = res3.board.hielo.enemy[0];
  assert("sin grietas golpea al más fuerte (fallback, perfora)", r3.currentPower === 8 && (r3.debuffTaken ?? 0) === 2, `p=${r3.currentPower} debuff=${r3.debuffTaken}`);
}

console.log("\n☣️ ASESINO VENENO — Miasma (AoE perforante al jugar)");
{
  const culebra = ROGUE2_CARDS.find((c) => c.id === "culebra_de_peste")!;
  const b = emptyBoard();
  b.veneno.enemy = [
    makeCard(ROGUE2_CARDS.find((c) => c.id === "pacto_de_las_sombras")!, { uid: "e1", currentPower: 17, shieldRemaining: 4 }),
    makeCard(ROGUE2_CARDS.find((c) => c.id === "pacto_de_las_sombras")!, { uid: "e2", currentPower: 17 }),
  ];
  const res = play(b, "player", "veneno", culebra);
  const e1 = res.board.veneno.enemy.find((c) => c.uid === "e1")!;
  const e2 = res.board.veneno.enemy.find((c) => c.uid === "e2")!;
  assert("el gas IGNORA el escudo", e1.currentPower === 15 && (e1.shieldRemaining ?? 0) === 4, `p=${e1.currentPower} shield=${e1.shieldRemaining}`);
  assert("segundo enemigo también −X", e2.currentPower === 15, `p=${e2.currentPower}`);
  assert("acumula debuffTaken (Purificación rival la limpia)", (e1.debuffTaken ?? 0) === 2, `debuff=${e1.debuffTaken}`);
}

console.log("\n🎯 ASESINO COMBATE — Caza Mayor (+2X si el más fuerte te supera; si no +X)");
{
  const cazador = ROGUE2_CARDS.find((c) => c.id === "cazador_de_titanes")!;
  // Enemigo 20 > base 11 → +4 (final 11+2 syn+4 = 17).
  const b = emptyBoard();
  b.combate.enemy = [makeCard(cazador, { uid: "e1", currentPower: 20 })];
  const res = play(b, "player", "combate", cazador);
  const c = res.board.combate.player.find((x) => x.defId === "cazador_de_titanes")!;
  assert("presa mayor → +2X", c.currentPower === 17, `p=${c.currentPower}`);

  // Enemigo 10 ≤ 11 → +2 (final 15).
  const b2 = emptyBoard();
  b2.combate.enemy = [makeCard(cazador, { uid: "e1", currentPower: 10 })];
  const res2 = play(b2, "player", "combate", cazador);
  const c2 = res2.board.combate.player.find((x) => x.defId === "cazador_de_titanes")!;
  assert("presa menor → +X", c2.currentPower === 15, `p=${c2.currentPower}`);
}

console.log("\n🤝 ASESINO SIGILO — Conspiración (buff de MANO al resto)");
{
  const emisario = ROGUE2_CARDS.find((c) => c.id === "emisario_oculto")!;
  const b = emptyBoard();
  const h1 = toHand(ROGUE2_CARDS.find((c) => c.id === "sombra_veloz")!, "h1");
  const h2 = toHand(ROGUE2_CARDS.find((c) => c.id === "dardo_sombrio")!, "h2");
  const res = playCard(b, [toHand(emisario, "me"), h1, h2], 20, "player", "sigilo", toHand(emisario, "me"), null, null, 1);
  assert("la carta jugada sale de la mano", res.hand.length === 2, `n=${res.hand.length}`);
  const r1 = res.hand.find((c) => c.uid === "h1")!;
  const r2 = res.hand.find((c) => c.uid === "h2")!;
  assert("resto de la mano gana +X", r1.handBonus === 2 && r2.handBonus === 2, `h1=${r1.handBonus} h2=${r2.handBonus}`);
  assert("queda trazado el origen del buff", (r1.handBonusSources ?? [])[0]?.source === "Emisario Oculto");

  // El buff entra en juego: jugar h1 después suma el handBonus al poder final.
  const res2 = playCard(res.board, res.hand, 20, "player", "sigilo", r1, null, null, 2);
  // Sombra Veloz p10 + syn sigilo 2 + emboscada 2ª carta +2 + handBonus 2 = 16.
  const jugada = res2.playedCard;
  assert("el buff de mano se materializa al jugar", jugada.currentPower === 16, `p=${jugada.currentPower} (esperado 16)`);
}

// ============================================================================
console.log("\n📋 COMPOSICIÓN de los 3 mazos segundos");
{
  const decks: [string, CardDef[], string[]][] = [
    ["Cohorte de Hierro", WARRIOR2_CARDS, ["armas", "proteccion", "furia"]],
    ["Cónclave Prismático", MAGE2_CARDS, ["arcana", "fuego", "hielo"]],
    ["Gremio de la Daga", ROGUE2_CARDS, ["veneno", "combate", "sigilo"]],
  ];
  const EXPECT_CURVE: Record<number, number> = { 1: 2, 2: 3, 3: 5, 4: 1, 5: 1 };
  const NEW_KEYWORDS_BY_LANE: Record<string, string> = {
    armas: "orden_batalla", proteccion: "custodia", furia: "desafio",
    arcana: "drenar_poder", fuego: "detonacion", hielo: "ruptura_glacial",
    veneno: "miasma", combate: "caza_mayor", sigilo: "conspiracion",
  };

  for (const [name, cards, lanes] of decks) {
    console.log(`\n  — ${name}`);
    assert("12 cartas", cards.length === 12, `n=${cards.length}`);

    const curve: Record<number, number> = {};
    for (const c of cards) curve[c.cost] = (curve[c.cost] ?? 0) + 1;
    assert(
      "curva 1×2 2×3 3×5 4×1 5×1",
      JSON.stringify(curve) === JSON.stringify(EXPECT_CURVE),
      JSON.stringify(curve)
    );

    const allUnique = new Set(cards.map((c) => c.id)).size === 12;
    assert("ids únicos", allUnique);

    const slugOk = cards.every((c) => c.id === c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""));
    assert("slug id = nombre (patrón de arte)", slugOk, cards.filter((c) => c.id !== c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")).map((c) => c.id).join(","));

    const kws = cards.map((c) => c.keyword!);
    assert("12 keywords distintas (sin repetir)", new Set(kws).size === 12);

    for (const lane of lanes) {
      const laneCards = cards.filter((c) => c.subtypes.includes(lane as LaneId));
      const cats = laneCards.map((c) => c.category).sort().join(",");
      assert(
        `${lane}: 2 Ataque + 1 Ítem + 1 Acción`,
        laneCards.length === 4 && cats === "Acción,Ataque,Ataque,Ítem",
        `${laneCards.length} cartas [${cats}]`
      );
      const hasNew = laneCards.some((c) => c.keyword === NEW_KEYWORDS_BY_LANE[lane]);
      assert(`${lane}: estrena su keyword nueva (${NEW_KEYWORDS_BY_LANE[lane]})`, hasNew);
      const exclusiveOk = laneCards.every((c) => !c.keyword || !c.subtypes.some((s) => !lanes.includes(s)));
      assert(`${lane}: sin keywords de clase ajena`, exclusiveOk);
    }
  }

  // Catálogo global: ids únicos entre los 72.
  const ids = new Set(ALL_CARDS_V3.map((c) => c.id));
  assert("catálogo: 84 ids únicos", ALL_CARDS_V3.length === 84 && ids.size === 84, `${ALL_CARDS_V3.length} cartas, ${ids.size} ids`);
}

console.log("\n⚖️ PTP — catálogo completo en rango (±0.5)");
{
  let ok = 0;
  const bad: string[] = [];
  for (const card of ALL_CARDS_V3) {
    const info = getBalanceInfo(card);
    if (info.balanced) ok++;
    else bad.push(`${card.name} (${info.status} ${info.delta.toFixed(1)})`);
  }
  assert(`72/72 cartas calibradas (OK ${ok})`, ok === ALL_CARDS_V3.length, bad.join(" · "));
}

// ============================================================================
console.log(`\n══════════════════════════════════════`);
console.log(`RESULTADO: ${passed} pasados · ${failed} fallados`);
console.log(`══════════════════════════════════════`);
process.exit(failed > 0 ? 1 : 0);
