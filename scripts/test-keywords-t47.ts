// ============================================================================
// TEST KEYWORDS TASK 47 — rediseño Task 46 VERIFICADO + VISIBLE
// ============================================================================
// Ejecutar: bun scripts/test-keywords-t47.ts
// Cubre las 7 keywords rediseñadas con datos de 420 partidas (purga,
// duelista, ruptura_glacial, custodia, purificacion, contagio, crueldad):
//   · las ramas NUEVAS que no tenían test (fallbacks, enfurecer, multi)
//   · DUELISTA VISIBLE: el +X de «Al Jugar» genera mutación cosmética
//     (float + Registro + sword_glint) sin doble-contar poder
//   · la INTERPRETACIÓN (KEYWORD_META) describe el comportamiento nuevo
// ============================================================================

import {
  playCard,
  applyStartTurnEffects,
  applyEndTurnEffects,
  type Board,
  type TrapState,
  emptyBoard,
} from "../src/lib/game/engine";
import type { BoardCard, CardDef, HandCard, LaneId } from "../src/lib/game/types";
import { KEYWORD_META } from "../src/lib/game/types";
import { ALL_CARDS_V3 } from "../src/lib/game/cards";
import { materializeCard } from "../src/lib/game/balance";

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
  const c = ALL_CARDS_V3.find((x) => x.id === id);
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
    // igual que el engine: el trigger por defecto viene de KEYWORD_META
    trigger: def.trigger ?? (def.keyword ? KEYWORD_META[def.keyword].trigger : "on_play"),
    keyword: def.keyword,
    keywordValue: def.keywordValue,
    debuffTaken: 0,
    ...overrides,
  };
}


function place(board: Board, side: "player" | "enemy", lane: LaneId, card: BoardCard): void {
  board[lane][side].push(card);
}

const NO_TRAP: TrapState | null = null;

// ---------------------------------------------------------------------------
console.log("\n🟠 DUELISTA — «Al Jugar: +X» funciona Y SE VE");
{
  const def = cardById("duelista_errante"); // X=1, poder 11, subtype armas
  const board = emptyBoard();
  const hand = [asHand(def)];
  const res = playCard(board, hand, 10, "player", "armas", hand[0], null, NO_TRAP, 1);

  // 11 base + 2 sinergia de subtype (armas en carril armas) + 1 Duelista
  check("Al Jugar entra con +X (11+2+1=14, NO 15)", res.playedCard.currentPower === 14, `real ${res.playedCard.currentPower}`);

  const selfMut = res.mutations.find((m) => m.uid === res.playedCard.uid);
  check("Mutación cosmética presente (float verde +X)", !!selfMut && selfMut.powerDelta === 1, JSON.stringify(res.mutations));
  check("La mutación NO re-aplica poder (carta ya lo trae)", res.playedCard.currentPower === 14);
  check(
    "Registro (powerLog) lista «Duelista +1»",
    (res.playedCard.powerLog ?? []).some((e) => e.source === "Duelista" && e.delta === 1),
    JSON.stringify(res.playedCard.powerLog ?? [])
  );

  // Escalado por rareza — legendaria X=2 y texto sincronizado
  const leg = materializeCard(def, "legendary");
  check("Legendaria X=2", leg.keywordValue === 2, `real ${leg.keywordValue}`);
  check("Texto legendaria dice +2 (sin +1 residual)", leg.text.includes("+2") && !leg.text.includes("+1"), leg.text);
  const board2 = emptyBoard();
  const hand2 = [asHand(leg)];
  const res2 = playCard(board2, hand2, 10, "player", "armas", hand2[0], null, NO_TRAP, 1);
  // legendaria: poder 11+5=16 + 2 sinergia + 2 duelista
  check("Legendaria Al Jugar: +2 (16+2+2=20)", res2.playedCard.currentPower === 20, `real ${res2.playedCard.currentPower}`);
  const legMut = res2.mutations.find((m) => m.uid === res2.playedCard.uid);
  check("Float legendaria vale +2", !!legMut && legMut.powerDelta === 2);

  // Crecimiento solo-carril sigue vivo (start_turn)
  const preST = res.playedCard.currentPower;
  const st = applyStartTurnEffects(res.board, "player");
  const s = st.board.armas.player.find((c) => c.defId === "duelista_errante")!;
  check("Inicio de turno sola → +1 más", s.currentPower === preST + 1, `real ${s.currentPower} vs ${preST}`);
  check("Fx sword_glint del crecimiento presente", st.fx.some((f) => f.keyword === "duelista"));
}

// ---------------------------------------------------------------------------
console.log("\n☠️ PURGA — sin presa débil hiere a la MÁS FUERTE (perfora)");
{
  const def = cardById("cuchilla_del_silencio"); // purga X=3 (Task 48: antes ×2)
  const board = emptyBoard();
  const big = boardCard(cardById("tajo_quebrantamuros")); // poder 17, > 2
  place(board, "enemy", "sigilo", big);
  const hand = [asHand(def)];
  const res = playCard(board, hand, 10, "player", "sigilo", hand[0], null, NO_TRAP, 1);
  const after = res.board.sigilo.enemy.find((c) => c.uid === big.uid)!;
  check("Sin candidato ≤X → el más fuerte recibe −X (17→14)", after.currentPower === 14, `real ${after.currentPower}`);
  check("La herida acumula (debuffTaken) para Contagio", (after.debuffTaken ?? 0) === 3, `real ${after.debuffTaken}`);

  // y con presa ≤X sigue destruyendo (rama original)
  const board2 = emptyBoard();
  const prey = boardCard(cardById("amoladora_de_campamento"), { currentPower: 1, basePower: 3 });
  place(board2, "enemy", "sigilo", prey);
  const hand2 = [asHand(def)];
  const res2 = playCard(board2, hand2, 10, "player", "sigilo", hand2[0], null, NO_TRAP, 1);
  check("Con presa ≤X → la destruye (rama original)", !res2.board.sigilo.enemy.some((c) => c.uid === prey.uid));
}

// ---------------------------------------------------------------------------
console.log("\n🧊 RUPTURA GLACIAL — sin infectados golpea al MÁS FUERTE");
{
  const def = cardById("maza_glacial"); // ruptura X=2
  const board = emptyBoard();
  const big = boardCard(cardById("tajo_quebrantamuros")); // poder 17 — el MÁS fuerte
  const small = boardCard(cardById("adarga_del_centinela")); // poder 6
  place(board, "enemy", "hielo", big);
  place(board, "enemy", "hielo", small);
  const hand = [asHand(def)];
  const res = playCard(board, hand, 10, "player", "hielo", hand[0], null, NO_TRAP, 1);
  const b = res.board.hielo.enemy.find((c) => c.uid === big.uid)!;
  const s = res.board.hielo.enemy.find((c) => c.uid === small.uid)!;
  check("Nadie infectado → el más fuerte recibe −X (17→15)", b.currentPower === 15, `real ${b.currentPower}`);
  check("El pequeño no fue tocado (6)", s.currentPower === 6, `real ${s.currentPower}`);
}

// ---------------------------------------------------------------------------
console.log("\n🎯 CRUELDAD — sin presa SE ENFURECE (+X permanente)");
{
  const def = cardById("colmillo_del_verdugo"); // crueldad X=1
  const board = emptyBoard();
  place(board, "player", "furia", boardCard(def));
  const res = applyEndTurnEffects(board, "player");
  const c = res.board.furia.player.find((x) => x.defId === "colmillo_del_verdugo")!;
  check("Carril enemigo vacío → +1 (se enfurece)", c.currentPower === def.power + 1, `real ${c.currentPower}`);
  check("Log de enfurecida presente", res.logs.some((l) => l.text.includes("enfurece")));

  // con SOLO cuerpos a 0 también se enfurece (no hay presa CON poder)
  const board2 = emptyBoard();
  place(board2, "player", "furia", boardCard(def));
  const cuerpo = boardCard(cardById("amoladora_de_campamento"), { currentPower: 0, basePower: 3 });
  place(board2, "enemy", "furia", cuerpo);
  const res2 = applyEndTurnEffects(board2, "player");
  const c2 = res2.board.furia.player.find((x) => x.defId === "colmillo_del_verdugo")!;
  check("Solo cuerpos a 0 → también se enfurece", c2.currentPower === def.power + 1, `real ${c2.currentPower}`);
}

// ---------------------------------------------------------------------------
console.log("\n✨ PURIFICACIÓN — nada que limpiar → escudo 2 al más débil");
{
  const def = cardById("oracion_del_bastion"); // purificación, sin valor
  const board = emptyBoard();
  const oracion = boardCard(def);
  const fuerte = boardCard(cardById("guardian_juramentado"));
  const debil = boardCard(cardById("adarga_del_centinela")); // poder 6 < 10
  place(board, "player", "proteccion", oracion);
  place(board, "player", "proteccion", fuerte);
  place(board, "player", "proteccion", debil);
  const res = applyStartTurnEffects(board, "player");
  const d = res.board.proteccion.player.find((c) => c.uid === debil.uid)!;
  const f = res.board.proteccion.player.find((c) => c.uid === fuerte.uid)!;
  check("Sin nada que limpiar → el MÁS DÉBIL gana escudo 2", (d.shieldRemaining ?? 0) === 2, `real ${d.shieldRemaining}`);
  check("El fuerte no recibe escudo", (f.shieldRemaining ?? 0) === 0, `real ${f.shieldRemaining}`);
  check("Fx de purificación presente", res.fx.some((fx) => fx.keyword === "purificacion"));
}

// ---------------------------------------------------------------------------
console.log("\n🛡️ CUSTODIA — el escudo MÁS DAÑADO sube hasta X");
{
  const def = cardById("baluarte_errante"); // custodia X=2
  const board = emptyBoard();
  const baluarte = boardCard(def);
  const herido = boardCard(cardById("adarga_del_centinela"));
  herido.shieldRemaining = 1; // escudo dañado (2 → falta 1)
  const intacto = boardCard(cardById("guardian_juramentado"));
  intacto.shieldRemaining = 2; // al tope
  const desnudo = boardCard(cardById("amoladora_de_campamento")); // SIN escudo
  place(board, "player", "proteccion", baluarte);
  place(board, "player", "proteccion", herido);
  place(board, "player", "proteccion", intacto);
  place(board, "player", "proteccion", desnudo);
  const res = applyStartTurnEffects(board, "player");
  const n = res.board.proteccion.player.find((c) => c.uid === desnudo.uid)!;
  check("El SIN escudo es el más dañado → sube hasta 2", (n.shieldRemaining ?? 0) === 2, `real ${n.shieldRemaining}`);
  const h = res.board.proteccion.player.find((c) => c.uid === herido.uid)!;
  check("Los demás no tocados (1 se queda)", (h.shieldRemaining ?? 0) === 1, `real ${h.shieldRemaining}`);
}

// ---------------------------------------------------------------------------
console.log("\n🧪 CONTAGIO — la plaga golpea a TODOS los infectados");
{
  const def = cardById("frasco_de_peste"); // contagio X=1
  const board = emptyBoard();
  place(board, "player", "veneno", boardCard(def));
  const inf1 = boardCard(cardById("bandido_de_la_ruta"));
  inf1.debuffTaken = 2;
  const inf2 = boardCard(cardById("ajuste_de_cuentas"));
  inf2.debuffTaken = 1;
  const limpio = boardCard(cardById("tajo_quebrantamuros"));
  place(board, "enemy", "veneno", inf1);
  place(board, "enemy", "veneno", inf2);
  place(board, "enemy", "veneno", limpio);
  // Capturar poderes ANTES (cloneBoard comparte refs de carta)
  const p1 = inf1.currentPower, p2 = inf2.currentPower, pl = limpio.currentPower;
  // El contagio vive en carriles asesino → pasar lanes explícitos (igual que producción)
  const res = applyEndTurnEffects(board, "player", [], ["veneno", "combate", "sigilo"]);
  const a = res.board.veneno.enemy.find((c) => c.uid === inf1.uid)!;
  const b = res.board.veneno.enemy.find((c) => c.uid === inf2.uid)!;
  const l = res.board.veneno.enemy.find((c) => c.uid === limpio.uid)!;
  check("Infectado 1 recibe −X", a.currentPower === p1 - 1, `real ${a.currentPower} vs ${p1}`);
  check("Infectado 2 recibe −X (multi-objetivo)", b.currentPower === p2 - 1, `real ${b.currentPower} vs ${p2}`);
  check("El limpio NO es tocado", l.currentPower === pl, `real ${l.currentPower} vs ${pl}`);
}

// ---------------------------------------------------------------------------
console.log("\n📖 INTERPRETACIÓN — KEYWORD_META describe el rediseño (tooltip)");
{
  check("Duelista menciona «Al Jugar: gana +X garantizado»", KEYWORD_META.duelista.description.includes("Al Jugar: gana +X garantizado"));
  check("Purga menciona la herida a la más fuerte", KEYWORD_META.purga.description.includes("hiere en X a la más fuerte"));
  check("Custodia menciona el escudo MÁS DAÑADO", KEYWORD_META.custodia.description.includes("MÁS DAÑADO"));
  check("Contagio menciona TODAS las cartas infectadas", KEYWORD_META.contagio.description.includes("TODAS"));
  check("Ruptura menciona el golpe alternativo al más fuerte", KEYWORD_META.ruptura_glacial.description.includes("golpea al más fuerte"));
  check("Crueldad menciona el enfurecimiento", KEYWORD_META.crueldad.description.includes("enfurece"));
  check("Purificación menciona el escudo de consuelo", KEYWORD_META.purificacion.description.includes("escudo de 2"));

  // Los textos de carta también cuentan la historia nueva
  check("Texto Duelista Errante actualizado", cardById("duelista_errante").text.startsWith("Al Jugar: gana +1."));
  check("Texto Cuchilla del Silencio actualizado", cardById("cuchilla_del_silencio").text.includes("hiere en 3"));
  check("Texto Baluarte Errante actualizado", cardById("baluarte_errante").text.includes("MÁS DAÑADO"));
  check("Texto Frasco de Peste actualizado", cardById("frasco_de_peste").text.includes("TODAS"));
  check("Texto Maza Glacial actualizada", cardById("maza_glacial").text.includes("golpea al más fuerte"));
  check("Texto Colmillo del Verdugo actualizado", cardById("colmillo_del_verdugo").text.includes("enfurece"));
}

// ============================================================================
console.log("\n============================================================================");
console.log(`RESULTADO: ${passed} pasados, ${failed} fallidos`);
if (failed > 0) {
  for (const f of failures) console.log(`   · ${f}`);
  process.exit(1);
}
console.log("✨ Keywords del rediseño verificadas y VISIBLES.");
