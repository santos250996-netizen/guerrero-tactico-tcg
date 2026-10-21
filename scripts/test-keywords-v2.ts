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
    arcana: { player: [], enemy: [] },
    fuego: { player: [], enemy: [] },
    hielo: { player: [], enemy: [] },
    veneno: { player: [], enemy: [] },
    combate: { player: [], enemy: [] },
    sigilo: { player: [], enemy: [] },
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
  const vet = boardCard(cardById("veterano_caido")); // p6
  const colmillo = boardCard(cardById("colmillo_del_verdugo")); // p16
  place(board, "player", "furia", vet);
  place(board, "player", "furia", colmillo);

  const res = playCard(board, [asHand(cardById("guardian_juramentado"))], 10, "player", "furia", asHand(cardById("guardian_juramentado")), null, NO_TRAP);
  const vetAfter = res.board.furia.player.find((c) => c.uid === vet.uid)!;
  const hammer = res.playedCard;
  check("Veterano Caído recibe +3 (era el más débil: 6 < 16)", vetAfter.currentPower === 9, `esperado 9, real ${vetAfter.currentPower}`);
  check("El martillo entra con su poder base (10; sin sinergia: es de Protección en carril Furia)", hammer.currentPower === 10, `esperado 10, real ${hammer.currentPower}`);
  check("powerLog del objetivo registra el buff", (vetAfter.powerLog ?? []).some((e) => e.delta === 3 && e.kind === "buff"));
}

// ---------------------------------------------------------------------------
// 2. REMATE [X] — on_play: resta X al MÁS DÉBIL; si tiene ≤ X lo destruye
// ---------------------------------------------------------------------------
console.log("\n🔵 REMATE (on_play)");
{
  const board = emptyBoard();
  const weak1 = boardCard(cardById("veterano_caido"), { currentPower: 4, basePower: 4 }); // p4: débil pero SOBREVIVE
  const weak2 = boardCard(cardById("hacha_de_ejecucion"), { currentPower: 2, basePower: 2 }); // p2 ≤ 2: MUERE
  const strong = boardCard(cardById("colmillo_del_verdugo")); // p4
  place(board, "enemy", "furia", weak1);
  place(board, "enemy", "furia", weak2);
  place(board, "enemy", "furia", strong);

  const hand = asHand(cardById("hacha_de_ejecucion"));
  const res = playCard(board, [hand], 10, "player", "furia", hand, null, NO_TRAP);
  check("Se destruye exactamente 1 carta", res.removedCards.length === 1);
  check("Apunta al MÁS DÉBIL del carril (p2 muere por ≤ X)", res.removedCards[0]?.uid === weak2.uid);
  const survivor = res.board.furia.enemy.find((c) => c.uid === weak1.uid);
  check("El débil con p4 > X sobrevive intacto", !!survivor && survivor.currentPower === 4, `real ${survivor?.currentPower}`);
  const enemyLeft = res.board.furia.enemy.length;
  check("El carril enemigo queda con 2 cartas (p4 + p4)", enemyLeft === 2, `real ${enemyLeft}`);
}

// ---------------------------------------------------------------------------
// 3. HENDER ARMADURA [X] — on_play: −X al más fuerte, IGNORA escudos
// ---------------------------------------------------------------------------
console.log("\n🟠 HENDER ARMADURA (on_play, clase Armas)");
{
  const board = emptyBoard();
  const shielded = boardCard(cardById("adarga_del_centinela")); // p6, llevará escudo
  const big = boardCard(cardById("tajo_quebrantamuros")); // p17 — el más fuerte
  shielded.shieldRemaining = 3;
  place(board, "enemy", "armas", shielded);
  place(board, "enemy", "armas", big);

  const mandoble = asHand(cardById("tajo_quebrantamuros")); // hender 3
  const res = playCard(board, [mandoble], 10, "player", "armas", mandoble, null, NO_TRAP);
  const bigAfter = res.board.armas.enemy.find((c) => c.uid === big.uid)!;
  const shieldedAfter = res.board.armas.enemy.find((c) => c.uid === shielded.uid)!;
  check("El más fuerte (p17) recibe −3 → p14", bigAfter.currentPower === 14, `real ${bigAfter.currentPower}`);
  check("El escudo de la Adarga NO se consume (perfora)", shieldedAfter.shieldRemaining === 3, `real ${shieldedAfter.shieldRemaining}`);
  check("El objetivo acumula debuffTaken=3 (Purificación lo podría limpiar)", bigAfter.debuffTaken === 3, `real ${bigAfter.debuffTaken}`);
}

// ---------------------------------------------------------------------------
// 4. AMPARO [X] — on_play: escudo X a las demás cartas del carril
// ---------------------------------------------------------------------------
console.log("\n🟠 AMPARO (on_play, clase Protección)");
{
  const board = emptyBoard();
  const adarga = boardCard(cardById("adarga_del_centinela")); // p6
  const martillo = boardCard(cardById("guardian_juramentado")); // p10
  place(board, "player", "proteccion", adarga);
  place(board, "player", "proteccion", martillo);

  const hand = asHand(cardById("abanderado_de_la_cohorte")); // amparo 2
  const res = playCard(board, [hand], 10, "player", "proteccion", hand, null, NO_TRAP);
  const a1 = res.board.proteccion.player.find((c) => c.uid === adarga.uid)!;
  const a2 = res.board.proteccion.player.find((c) => c.uid === martillo.uid)!;
  check("Adarga gana escudo 2", a1.shieldRemaining === 2, `real ${a1.shieldRemaining}`);
  check("Martillo gana escudo 2", a2.shieldRemaining === 2, `real ${a2.shieldRemaining}`);
  check("El Abanderado NO se da escudo a sí mismo", res.playedCard.shieldRemaining === undefined, `real ${res.playedCard.shieldRemaining}`);
}

// ---------------------------------------------------------------------------
// 5. ÍMPETU [X] — on_play: +X por carta jugada este turno (incluida esta)
// ---------------------------------------------------------------------------
console.log("\n🟠 ÍMPETU (on_play, clase Furia)");
{
  const board = emptyBoard();
  const hand1 = asHand(cardById("berserker_recluta"));
  // 1ª carta del turno (playsThisTurn=1): +1 → 8 base + 2 sinergia furia + 1 = 11
  const res1 = playCard(board, [hand1], 10, "player", "furia", hand1, null, NO_TRAP, 1);
  check("1ª carta del turno: poder 8+2(sinergia)+1(ímpetu)=11", res1.playedCard.currentPower === 11, `real ${res1.playedCard.currentPower}`);

  // 3ª carta del turno: +3 → 8 + 2 + 3 = 13
  const board2 = emptyBoard();
  const hand2 = asHand(cardById("berserker_recluta"));
  const res2 = playCard(board2, [hand2], 10, "player", "furia", hand2, null, NO_TRAP, 3);
  check("3ª carta del turno: poder 8+2+3=13", res2.playedCard.currentPower === 13, `real ${res2.playedCard.currentPower}`);
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
  check("Poder base + sinergia protección = 6+2 = 8", res.playedCard.currentPower === 8, `real ${res.playedCard.currentPower}`);
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
  check("3 inicios de turno → +3 (1+1+1)", after.currentPower === 6, `esperado 6 (3 base + 3), real ${after.currentPower}`);
  check("powerLog registra 3 entradas de Fervor", (after.powerLog ?? []).filter((e) => e.source.includes("Fervor")).length === 3);
}

// ---------------------------------------------------------------------------
// 8. DUELISTA [X] — start_turn: +X si es única carta del carril
// ---------------------------------------------------------------------------
console.log("\n🟠 DUELISTA (start_turn, clase Armas)");
{
  const board = emptyBoard();
  const espada = boardCard(cardById("duelista_errante")); // duelista 1
  place(board, "player", "armas", espada);

  const res1 = applyStartTurnEffects(board, "player");
  const s1 = res1.board.armas.player.find((c) => c.uid === espada.uid)!;
  check("Sola en el carril → +1", s1.currentPower === 12, `esperado 12 (11 base + 1), real ${s1.currentPower}`);

  // Ahora el jugador añade otra carta al carril → deja de crecer
  const res2 = applyStartTurnEffects(res1.board, "player");
  const s2 = res2.board.armas.player.find((c) => c.uid === espada.uid)!;
  place(res2.board, "player", "armas", boardCard(cardById("amoladora_de_campamento")));
  const res3 = applyStartTurnEffects(res2.board, "player");
  const s3 = res3.board.armas.player.find((c) => c.uid === espada.uid)!;
  check("Sigue sola en el 2º inicio → +1 (p13)", s2.currentPower === 13, `real ${s2.currentPower}`);
  check("Ya NO está sola → +0 (p13)", s3.currentPower === 13, `real ${s3.currentPower}`);
}

// ---------------------------------------------------------------------------
// 9. PURIFICACIÓN — start_turn: limpia debuffs del carril
// ---------------------------------------------------------------------------
console.log("\n🟠 PURIFICACIÓN (start_turn, clase Protección)");
{
  const board = emptyBoard();
  const oracion = boardCard(cardById("oracion_del_bastion")); // purificación
  const martillo = boardCard(cardById("guardian_juramentado"));
  martillo.currentPower = 1; // p10 base, sufrió −9
  martillo.debuffTaken = 2;
  place(board, "player", "proteccion", oracion);
  place(board, "player", "proteccion", martillo);

  const res = applyStartTurnEffects(board, "player");
  const m = res.board.proteccion.player.find((c) => c.uid === martillo.uid)!;
  check("Martillo restaurado en lo acumulado (1 actual + 2 debuff = 3; no hasta base)", m.currentPower === 3, `real ${m.currentPower}`);
  check("debuffTaken reiniciado a 0", m.debuffTaken === 0, `real ${m.debuffTaken}`);
}

// ---------------------------------------------------------------------------
// 10. FORTALEZA [X] — end_turn: +X a todas tus cartas del carril
// ---------------------------------------------------------------------------
console.log("\n🔵 FORTALEZA (end_turn)");
{
  const board = emptyBoard();
  const cuerno = boardCard(cardById("toque_de_guerra")); // fortaleza 1
  const amoladora = boardCard(cardById("amoladora_de_campamento"));
  const espada = boardCard(cardById("duelista_errante"));
  place(board, "player", "armas", cuerno);
  place(board, "player", "armas", amoladora);
  place(board, "player", "proteccion", espada); // OTRO carril: no debe recibir

  const res = applyEndTurnEffects(board, "player");
  const c = res.board.armas.player.find((x) => x.uid === cuerno.uid)!;
  const a = res.board.armas.player.find((x) => x.uid === amoladora.uid)!;
  const e = res.board.proteccion.player.find((x) => x.uid === espada.uid)!;
  check("Cuerno +1", c.currentPower === 12, `real ${c.currentPower} (base 11, place directo sin sinergia)`);
  check("Amoladora +1", a.currentPower === 4, `real ${a.currentPower}`);
  check("Espada (otro carril) sin cambio", e.currentPower === 11, `real ${e.currentPower}`);
}

// ---------------------------------------------------------------------------
// 11. CRUELDAD [X] — end_turn: −X al enemigo más débil CON PODER (ignora
//     cuerpos a 0) · REGLA DEL CAMPO: a 0 por debuff → la carta CAE.
// ---------------------------------------------------------------------------
console.log("\n🟠 CRUELDAD (end_turn, clase Furia)");
{
  // 11a: sin escudo — el débil (1 poder) recibe −1, llega a 0 y CAE
  const board = emptyBoard();
  const colmillo = boardCard(cardById("colmillo_del_verdugo")); // crueldad 1
  place(board, "player", "furia", colmillo);
  const weak = boardCard(cardById("amoladora_de_campamento"), { currentPower: 1, basePower: 1 });
  const strong = boardCard(cardById("tajo_quebrantamuros"));
  place(board, "enemy", "furia", weak);
  place(board, "enemy", "furia", strong);

  const res = applyEndTurnEffects(board, "player");
  const w = res.board.furia.enemy.find((c) => c.uid === weak.uid);
  const s = res.board.furia.enemy.find((c) => c.uid === strong.uid)!;
  check("El débil llegó a 0 y CAE (regla del campo)", !w, w ? `sigue vivo con ${w.currentPower}` : "destruido");
  check("El fuerte NO fue tocado", s.currentPower === 17, `real ${s.currentPower}`);
  check("Log de caída presente", res.logs.some((l) => l.text.includes("cae")));

  // 11b: con escudo (Coraza absorbe)
  const board2 = emptyBoard();
  place(board2, "player", "furia", boardCard(cardById("colmillo_del_verdugo")));
  const shielded = boardCard(cardById("adarga_del_centinela"), { currentPower: 1, basePower: 1 });
  shielded.shieldRemaining = 2;
  place(board2, "enemy", "furia", shielded);
  const res2 = applyEndTurnEffects(board2, "player");
  const sh = res2.board.furia.enemy.find((c) => c.uid === shielded.uid)!;
  check("El escudo absorbe el debuff (poder intacto, escudo 2→1)", sh.currentPower === 1 && sh.shieldRemaining === 1, `poder=${sh.currentPower} escudo=${sh.shieldRemaining}`);

  // 11c: RETARGET — no apunta a cuerpos a 0: va contra el más débil CON PODER
  const board3 = emptyBoard();
  place(board3, "player", "furia", boardCard(cardById("colmillo_del_verdugo"))); // crueldad 1
  const cuerpo0 = boardCard(cardById("amoladora_de_campamento"), { currentPower: 0, basePower: 3 });
  cuerpo0.debuffTaken = 3;
  const vivo = boardCard(cardById("duelista_errante"), { currentPower: 11, basePower: 11 });
  place(board3, "enemy", "furia", cuerpo0);
  place(board3, "enemy", "furia", vivo);
  const res3 = applyEndTurnEffects(board3, "player");
  const v = res3.board.furia.enemy.find((c) => c.uid === vivo.uid)!;
  check("Crueldad apunta al débil CON PODER (no al cuerpo a 0)", v.currentPower === 10, `real ${v.currentPower}`);
}

// ---------------------------------------------------------------------------
// 11bis. REGLA DEL CAMPO — poder a 0 dispara ÚLTIMO ALIENTO (on_death)
// ---------------------------------------------------------------------------
console.log("\n💀 PODER A CERO → ÚLTIMO ALIENTO");
{
  // Legado: la muerta deja +3 al aliado más débil del carril
  const board = emptyBoard();
  place(board, "player", "furia", boardCard(cardById("colmillo_del_verdugo"))); // crueldad 1
  const moribundo = boardCard(cardById("veterano_caido"), { currentPower: 1, basePower: 6 }); // legado 3
  const herido = boardCard(cardById("berserker_recluta"), { currentPower: 2, basePower: 5 });
  place(board, "enemy", "furia", moribundo);
  place(board, "enemy", "furia", herido);
  const res = applyEndTurnEffects(board, "player");
  const muerto = res.board.furia.enemy.find((c) => c.uid === moribundo.uid);
  const vivo = res.board.furia.enemy.find((c) => c.uid === herido.uid)!;
  check("Último Aliento se DISPARA: la carta a 0 cae", !muerto, muerto ? `sigue con ${muerto.currentPower}` : "destruido");
  check("Legado deja +3 al aliado más débil", vivo.currentPower === 5, `real ${vivo.currentPower}`);
}

// ---------------------------------------------------------------------------
// 12. LEGADO [X] — on_death: +X al aliado más débil del carril
// ---------------------------------------------------------------------------
console.log("\n🔵 LEGADO (on_death)");
{
  const board = emptyBoard();
  const amoladora = boardCard(cardById("amoladora_de_campamento")); // p3 — el más débil
  const colmillo = boardCard(cardById("colmillo_del_verdugo")); // p16
  place(board, "player", "furia", amoladora);
  place(board, "player", "furia", colmillo);

  const deadVet = boardCard(cardById("veterano_caido")); // legado 3
  const res = applyOnDeathEffects(board, "player", "furia", deadVet);
  const a = res.board.furia.player.find((c) => c.uid === amoladora.uid)!;
  check("El aliado más débil recibe +3", a.currentPower === 6, `real ${a.currentPower}`);
}

// ---------------------------------------------------------------------------
// 13. CADENA COMPLETA: Remate mata al Veterano rival → su Legado dispara
// ---------------------------------------------------------------------------
console.log("\n🔗 CADENA Remate → on_death (Legado)");
{
  const board = emptyBoard();
  const enemyVet = boardCard(cardById("veterano_caido"), { currentPower: 1, basePower: 1 }); // p1: el MÁS DÉBIL
  const enemyWeak = boardCard(cardById("amoladora_de_campamento"), { currentPower: 3, basePower: 3 }); // p3: sobrevive
  place(board, "enemy", "furia", enemyVet);
  place(board, "enemy", "furia", enemyWeak);

  const hand = asHand(cardById("hacha_de_ejecucion")); // remate 2
  const res = playCard(board, [hand], 10, "player", "furia", hand, null, NO_TRAP);
  check("Hacha destruye al Veterano rival (p1 ≤ 2, el más débil)", res.removedCards.length === 1 && res.removedCards[0].uid === enemyVet.uid);

  // gameStore hace esto tras cada destrucción:
  const deathRes = applyOnDeathEffects(res.board, "enemy", "furia", enemyVet);
  const weakAfter = deathRes.board.furia.enemy.find((c) => c.uid === enemyWeak.uid)!;
  check("Legado del Veterano: +3 al aliado débil rival (3→6)", weakAfter.currentPower === 6, `real ${weakAfter.currentPower}`);
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
  place(board, "player", "armas", boardCard(cardById("tajo_quebrantamuros"))); // place directo = p17 (sin sinergia)
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
