// ============================================================================
// TEST ENGINE V2 — 12 keywords + 4 triggers (spec 2026-10)
// ============================================================================
// Ejecutar: bun scripts/test-keywords-v2.ts
// Cada test construye un tablero mínimo y afirma los deltas EXACTOS de poder,
// escudos y destrucciones que produce cada keyword en su trigger.
// ============================================================================

import {
  playCard,
  applyStartTurnEffects,
  applyEndTurnEffects,
  applyOnDeathEffects,
  computeFinalResult,
  type Board,
  type TrapState,
} from "../src/lib/game/engine";
import type { BoardCard, CardDef, HandCard, LaneId } from "../src/lib/game/types";
import { KEYWORD_META as KEYWORD_META_V2 } from "../src/lib/game/types";
import { ALL_CARDS } from "../src/lib/game/cards";

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

function cardById(id: string): CardDef {
  const c = ALL_CARDS.find((x) => x.id === id);
  if (!c) throw new Error(`Carta no encontrada: ${id}`);
  return c;
}

function asHand(def: CardDef): HandCard {
  return { ...def, uid: `hand-${Math.random().toString(36).slice(2, 8)}`, handBonus: 0 };
}

function boardCard(def: CardDef, overrides: Partial<BoardCard> = {}): BoardCard {
  return {
    uid: `bc-${Math.random().toString(36).slice(2, 8)}`,
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
    trigger: def.trigger ?? "on_play",
    keyword: def.keyword,
    keywordValue: def.keywordValue,
    debuffTaken: 0,
    ...overrides,
  };
}

function emptyBoard(): Board {
  return {
    armas: { player: [], enemy: [] },
    proteccion: { player: [], enemy: [] },
    furia: { player: [], enemy: [] },
  };
}

const NO_TRAP: TrapState | null = null;

/** Coloca una carta directamente en el tablero y devuelve el board. */
function place(board: Board, side: "player" | "enemy", lane: LaneId, card: BoardCard): void {
  board[lane][side].push(card);
}

// ---------------------------------------------------------------------------
// 1. INSIGNIA [X] — on_play: +X al aliado más débil del carril
// ---------------------------------------------------------------------------
console.log("\n🔵 INSIGNIA (on_play)");
{
  const board = emptyBoard();
  const vet = boardCard(cardById("veterano_caido")); // p3
  const colmillo = boardCard(cardById("colmillo_del_verdugo")); // p4
  place(board, "player", "furia", vet);
  place(board, "player", "furia", colmillo);

  const res = playCard(board, [asHand(cardById("martillo_del_veterano"))], 10, "player", "furia", asHand(cardById("martillo_del_veterano")), null, NO_TRAP);
  const vetAfter = res.board.furia.player.find((c) => c.uid === vet.uid)!;
  const hammer = res.playedCard;
  check("Veterano Caído recibe +3 (era el más débil: 3 < 4)", vetAfter.currentPower === 6, `esperado 6, real ${vetAfter.currentPower}`);
  check("El martillo entra con su poder base (3; sin sinergia: es de Protección en carril Furia)", hammer.currentPower === 3, `esperado 3, real ${hammer.currentPower}`);
  check("powerLog del objetivo registra el buff", (vetAfter.powerLog ?? []).some((e) => e.delta === 3 && e.kind === "buff"));
}

// ---------------------------------------------------------------------------
// 2. REMATE [X] — on_play: destruye la carta enemiga más fuerte con poder ≤ X
// ---------------------------------------------------------------------------
console.log("\n🔵 REMATE (on_play)");
{
  const board = emptyBoard();
  const weak1 = boardCard(cardById("veterano_caido"), { currentPower: 1, basePower: 1 }); // p1
  const weak2 = boardCard(cardById("hacha_de_ejecucion"), { currentPower: 2, basePower: 2 }); // p2
  const strong = boardCard(cardById("colmillo_del_verdugo")); // p4 (fuera de alcance)
  place(board, "enemy", "furia", weak1);
  place(board, "enemy", "furia", weak2);
  place(board, "enemy", "furia", strong);

  const hand = asHand(cardById("hacha_de_ejecucion"));
  const res = playCard(board, [hand], 10, "player", "furia", hand, null, NO_TRAP);
  check("Se destruye exactamente 1 carta", res.removedCards.length === 1);
  check("Es la MÁS FUERTE de las que cumplen (p2, no p1)", res.removedCards[0]?.uid === weak2.uid);
  const enemyLeft = res.board.furia.enemy.length;
  check("El carril enemigo queda con 2 cartas (p1 + p4)", enemyLeft === 2, `real ${enemyLeft}`);
}

// ---------------------------------------------------------------------------
// 3. HENDER ARMADURA [X] — on_play: −X al más fuerte, IGNORA escudos
// ---------------------------------------------------------------------------
console.log("\n🟠 HENDER ARMADURA (on_play, clase Armas)");
{
  const board = emptyBoard();
  const shielded = boardCard(cardById("adarga_del_centinela")); // p1, llevará escudo
  const big = boardCard(cardById("mandoble_quebrantamuros")); // p5 — el más fuerte
  shielded.shieldRemaining = 3;
  place(board, "enemy", "armas", shielded);
  place(board, "enemy", "armas", big);

  const mandoble = asHand(cardById("mandoble_quebrantamuros")); // hender 3
  const res = playCard(board, [mandoble], 10, "player", "armas", mandoble, null, NO_TRAP);
  const bigAfter = res.board.armas.enemy.find((c) => c.uid === big.uid)!;
  const shieldedAfter = res.board.armas.enemy.find((c) => c.uid === shielded.uid)!;
  check("El más fuerte (p5) recibe −3 → p2", bigAfter.currentPower === 2, `real ${bigAfter.currentPower}`);
  check("El escudo de la Adarga NO se consume (perfora)", shieldedAfter.shieldRemaining === 3, `real ${shieldedAfter.shieldRemaining}`);
  check("El objetivo acumula debuffTaken=3 (Purificación lo podría limpiar)", bigAfter.debuffTaken === 3, `real ${bigAfter.debuffTaken}`);
}

// ---------------------------------------------------------------------------
// 4. AMPARO [X] — on_play: escudo X a las demás cartas del carril
// ---------------------------------------------------------------------------
console.log("\n🟠 AMPARO (on_play, clase Protección)");
{
  const board = emptyBoard();
  const adarga = boardCard(cardById("adarga_del_centinela")); // p1
  const martillo = boardCard(cardById("martillo_del_veterano")); // p3
  place(board, "player", "proteccion", adarga);
  place(board, "player", "proteccion", martillo);

  const hand = asHand(cardById("estandarte_de_la_cohorte")); // amparo 2
  const res = playCard(board, [hand], 10, "player", "proteccion", hand, null, NO_TRAP);
  const a1 = res.board.proteccion.player.find((c) => c.uid === adarga.uid)!;
  const a2 = res.board.proteccion.player.find((c) => c.uid === martillo.uid)!;
  check("Adarga gana escudo 2", a1.shieldRemaining === 2, `real ${a1.shieldRemaining}`);
  check("Martillo gana escudo 2", a2.shieldRemaining === 2, `real ${a2.shieldRemaining}`);
  check("El Estandarte NO se da escudo a sí mismo", res.playedCard.shieldRemaining === undefined, `real ${res.playedCard.shieldRemaining}`);
}

// ---------------------------------------------------------------------------
// 5. ÍMPETU [X] — on_play: +X por carta jugada este turno (incluida esta)
// ---------------------------------------------------------------------------
console.log("\n🟠 ÍMPETU (on_play, clase Furia)");
{
  const board = emptyBoard();
  const hand1 = asHand(cardById("berserker_recluta"));
  // 1ª carta del turno (playsThisTurn=1): +1 → 2 base + 2 sinergia furia + 1 = 5
  const res1 = playCard(board, [hand1], 10, "player", "furia", hand1, null, NO_TRAP, 1);
  check("1ª carta del turno: poder 2+2(sinergia)+1(ímpetu)=5", res1.playedCard.currentPower === 5, `real ${res1.playedCard.currentPower}`);

  // 3ª carta del turno: +3 → 2 + 2 + 3 = 7
  const board2 = emptyBoard();
  const hand2 = asHand(cardById("berserker_recluta"));
  const res2 = playCard(board2, [hand2], 10, "player", "furia", hand2, null, NO_TRAP, 3);
  check("3ª carta del turno: poder 2+2+3=7", res2.playedCard.currentPower === 7, `real ${res2.playedCard.currentPower}`);
}

// ---------------------------------------------------------------------------
// 6. CORAZA [X] — on_play: escudo propio
// ---------------------------------------------------------------------------
console.log("\n🔵 CORAZA (on_play)");
{
  const board = emptyBoard();
  const hand = asHand(cardById("adarga_del_centinela")); // coraza 3
  const res = playCard(board, [hand], 10, "player", "proteccion", hand, null, NO_TRAP);
  check("La Adarga entra con escudo 3", res.playedCard.shieldRemaining === 3, `real ${res.playedCard.shieldRemaining}`);
  check("Poder base + sinergia protección = 1+2 = 3", res.playedCard.currentPower === 3, `real ${res.playedCard.currentPower}`);
}

// ---------------------------------------------------------------------------
// 7. FERVOR [X] — start_turn: +X acumulativo
// ---------------------------------------------------------------------------
console.log("\n🔵 FERVOR (start_turn)");
{
  const board = emptyBoard();
  const amoladora = boardCard(cardById("amoladora_de_campamento")); // fervor 1
  place(board, "player", "armas", amoladora);

  let b = board;
  for (let i = 0; i < 3; i++) {
    const res = applyStartTurnEffects(b, "player");
    b = res.board;
  }
  const after = b.armas.player.find((c) => c.uid === amoladora.uid)!;
  check("3 inicios de turno → +3 (1+1+1)", after.currentPower === 4, `esperado 4 (1 base + 3), real ${after.currentPower}`);
  check("powerLog registra 3 entradas de Fervor", (after.powerLog ?? []).filter((e) => e.source.includes("Fervor")).length === 3);
}

// ---------------------------------------------------------------------------
// 8. DUELISTA [X] — start_turn: +X si es única carta del carril
// ---------------------------------------------------------------------------
console.log("\n🟠 DUELISTA (start_turn, clase Armas)");
{
  const board = emptyBoard();
  const espada = boardCard(cardById("espada_del_duelista")); // duelista 1
  place(board, "player", "armas", espada);

  const res1 = applyStartTurnEffects(board, "player");
  const s1 = res1.board.armas.player.find((c) => c.uid === espada.uid)!;
  check("Sola en el carril → +1", s1.currentPower === 4, `esperado 4 (3 base + 1), real ${s1.currentPower}`);

  // Ahora el jugador añade otra carta al carril → deja de crecer
  const res2 = applyStartTurnEffects(res1.board, "player");
  const s2 = res2.board.armas.player.find((c) => c.uid === espada.uid)!;
  place(res2.board, "player", "armas", boardCard(cardById("amoladora_de_campamento")));
  const res3 = applyStartTurnEffects(res2.board, "player");
  const s3 = res3.board.armas.player.find((c) => c.uid === espada.uid)!;
  check("Sigue sola en el 2º inicio → +1 (p5)", s2.currentPower === 5, `real ${s2.currentPower}`);
  check("Ya NO está sola → +0 (p5)", s3.currentPower === 5, `real ${s3.currentPower}`);
}

// ---------------------------------------------------------------------------
// 9. PURIFICACIÓN — start_turn: limpia debuffs del carril
// ---------------------------------------------------------------------------
console.log("\n🟠 PURIFICACIÓN (start_turn, clase Protección)");
{
  const board = emptyBoard();
  const oracion = boardCard(cardById("oracion_del_bastion")); // purificación
  const martillo = boardCard(cardById("martillo_del_veterano"));
  martillo.currentPower = 1; // p3 base, sufrió −2
  martillo.debuffTaken = 2;
  place(board, "player", "proteccion", oracion);
  place(board, "player", "proteccion", martillo);

  const res = applyStartTurnEffects(board, "player");
  const m = res.board.proteccion.player.find((c) => c.uid === martillo.uid)!;
  check("Martillo restaurado a su poder base (3)", m.currentPower === 3, `real ${m.currentPower}`);
  check("debuffTaken reiniciado a 0", m.debuffTaken === 0, `real ${m.debuffTaken}`);
}

// ---------------------------------------------------------------------------
// 10. FORTALEZA [X] — end_turn: +X a todas tus cartas del carril
// ---------------------------------------------------------------------------
console.log("\n🔵 FORTALEZA (end_turn)");
{
  const board = emptyBoard();
  const cuerno = boardCard(cardById("cuerno_de_guerra")); // fortaleza 1
  const amoladora = boardCard(cardById("amoladora_de_campamento"));
  const espada = boardCard(cardById("espada_del_duelista"));
  place(board, "player", "armas", cuerno);
  place(board, "player", "armas", amoladora);
  place(board, "player", "proteccion", espada); // OTRO carril: no debe recibir

  const res = applyEndTurnEffects(board, "player");
  const c = res.board.armas.player.find((x) => x.uid === cuerno.uid)!;
  const a = res.board.armas.player.find((x) => x.uid === amoladora.uid)!;
  const e = res.board.proteccion.player.find((x) => x.uid === espada.uid)!;
  check("Cuerno +1", c.currentPower === 3, `real ${c.currentPower} (base 2 + sinergia armas 2 = 4… ver nota)`);
  check("Amoladora +1", a.currentPower === 2, `real ${a.currentPower}`);
  check("Espada (otro carril) sin cambio", e.currentPower === 3, `real ${e.currentPower}`);
}

// ---------------------------------------------------------------------------
// 11. CRUELDAD [X] — end_turn: −X al enemigo más débil (respeta escudos)
// ---------------------------------------------------------------------------
console.log("\n🟠 CRUELDAD (end_turn, clase Furia)");
{
  // 11a: sin escudo
  const board = emptyBoard();
  const colmillo = boardCard(cardById("colmillo_del_verdugo")); // crueldad 1
  place(board, "player", "furia", colmillo);
  const weak = boardCard(cardById("amoladora_de_campamento"), { currentPower: 1, basePower: 1 });
  const strong = boardCard(cardById("mandoble_quebrantamuros"));
  place(board, "enemy", "furia", weak);
  place(board, "enemy", "furia", strong);

  const res = applyEndTurnEffects(board, "player");
  const w = res.board.furia.enemy.find((c) => c.uid === weak.uid)!;
  const s = res.board.furia.enemy.find((c) => c.uid === strong.uid)!;
  check("El MÁS DÉBIL enemigo recibe −1", w.currentPower === 0 && s.currentPower === 5, `weak=${w.currentPower} strong=${s.currentPower}`);
  check("debuffTaken acumulado en el objetivo", w.debuffTaken === 1);

  // 11b: con escudo (Coraza absorbe)
  const board2 = emptyBoard();
  place(board2, "player", "furia", boardCard(cardById("colmillo_del_verdugo")));
  const shielded = boardCard(cardById("adarga_del_centinela"), { currentPower: 1, basePower: 1 });
  shielded.shieldRemaining = 2;
  place(board2, "enemy", "furia", shielded);
  const res2 = applyEndTurnEffects(board2, "player");
  const sh = res2.board.furia.enemy.find((c) => c.uid === shielded.uid)!;
  check("El escudo absorbe el debuff (poder intacto, escudo 2→1)", sh.currentPower === 1 && sh.shieldRemaining === 1, `poder=${sh.currentPower} escudo=${sh.shieldRemaining}`);
}

// ---------------------------------------------------------------------------
// 12. LEGADO [X] — on_death: +X al aliado más débil del carril
// ---------------------------------------------------------------------------
console.log("\n🔵 LEGADO (on_death)");
{
  const board = emptyBoard();
  const amoladora = boardCard(cardById("amoladora_de_campamento")); // p1 — el más débil
  const colmillo = boardCard(cardById("colmillo_del_verdugo")); // p4
  place(board, "player", "furia", amoladora);
  place(board, "player", "furia", colmillo);

  const deadVet = boardCard(cardById("veterano_caido")); // legado 3
  const res = applyOnDeathEffects(board, "player", "furia", deadVet);
  const a = res.board.furia.player.find((c) => c.uid === amoladora.uid)!;
  check("El aliado más débil recibe +3", a.currentPower === 4, `real ${a.currentPower}`);
}

// ---------------------------------------------------------------------------
// 13. CADENA COMPLETA: Remate mata al Veterano rival → su Legado dispara
// ---------------------------------------------------------------------------
console.log("\n🔗 CADENA Remate → on_death (Legado)");
{
  const board = emptyBoard();
  const enemyVet = boardCard(cardById("veterano_caido"), { currentPower: 2, basePower: 2 });
  const enemyWeak = boardCard(cardById("amoladora_de_campamento"), { currentPower: 1, basePower: 1 });
  place(board, "enemy", "furia", enemyVet);
  place(board, "enemy", "furia", enemyWeak);

  const hand = asHand(cardById("hacha_de_ejecucion")); // remate 2
  const res = playCard(board, [hand], 10, "player", "furia", hand, null, NO_TRAP);
  check("Hacha destruye al Veterano rival (p2 ≤ 2)", res.removedCards.length === 1 && res.removedCards[0].uid === enemyVet.uid);

  // gameStore hace esto tras cada destrucción:
  const deathRes = applyOnDeathEffects(res.board, "enemy", "furia", enemyVet);
  const weakAfter = deathRes.board.furia.enemy.find((c) => c.uid === enemyWeak.uid)!;
  check("Legado del Veterano: +3 al aliado débil rival (1→4)", weakAfter.currentPower === 4, `real ${weakAfter.currentPower}`);
}

// ---------------------------------------------------------------------------
// 14. VALIDADOR DE RESTRICCIONES: keywords de clase solo en su spec
// ---------------------------------------------------------------------------
console.log("\n🛡️ VALIDADOR: exclusiveSubtype por spec");
{
  let ok = true;
  for (const card of ALL_CARDS) {
    const kw = card.keyword;
    if (!kw || kw === "none") continue;
    const meta = KEYWORD_META_V2[kw];
    if (meta?.exclusiveSubtype && !card.subtypes.includes(meta.exclusiveSubtype)) {
      ok = false;
      console.log(`  ❌ ${card.name} lleva ${meta.label} pero no tiene subtipo ${meta.exclusiveSubtype}`);
    }
  }
  check("Las 12 cartas respetan exclusiveSubtype", ok);
}

// ---------------------------------------------------------------------------
// 15. FIN DE PARTIDA: computeFinalResult sigue funcionando
// ---------------------------------------------------------------------------
console.log("\n🏁 computeFinalResult");
{
  const board = emptyBoard();
  place(board, "player", "armas", boardCard(cardById("mandoble_quebrantamuros"))); // p7 con sinergia? no: place directo = p5
  place(board, "enemy", "proteccion", boardCard(cardById("adarga_del_centinela")));
  const r = computeFinalResult(board);
  check("Player gana armas, enemy gana proteccion, furia empate", r.playerWins === 1 && r.enemyWins === 1 && r.draws === 1);
}

// ---------------------------------------------------------------------------

console.log("\n" + "=".repeat(60));
console.log(`RESULTADO: ${passed} pasados, ${failed} fallidos`);
if (failures.length > 0) {
  console.log("\nFallos:");
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
} else {
  console.log("✨ Todos los tests del engine V2 pasaron.");
}
