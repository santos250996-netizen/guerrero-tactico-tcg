// ============================================================================
// TESTS FX — eventos visuales (TriggerResult.fx + eventsFromPlayResult)
// Ejecutar: npx tsx scripts/test-fx.ts
// Verifica que las 24 keywords emiten los FxEvents correctos y que las
// absorciones de escudo (shieldAbsorbed) llegan al cliente.
// ============================================================================

import type { BoardCard, CardDef, LaneId } from "../src/lib/game/types";
import {
  applyStartTurnEffects,
  applyEndTurnEffects,
  applyOnDeathEffects,
  playCard,
  type Board,
} from "../src/lib/game/engine";
import { eventsFromPlayResult, KEYWORD_FX } from "../src/lib/game/fx";
import type { HandCard } from "../src/lib/game/types";

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

let uidSeq = 0;
function makeCard(def: Partial<CardDef> & { name: string }, overrides: Partial<BoardCard> = {}): BoardCard {
  uidSeq++;
  return {
    uid: `uid-${uidSeq}`,
    defId: def.id ?? `def-${uidSeq}`,
    name: def.name,
    category: def.category ?? "Ataque",
    subtypes: def.subtypes ?? [],
    cost: def.cost ?? 1,
    basePower: def.power ?? 3,
    currentPower: def.power ?? 3,
    text: "",
    effectId: def.keyword ?? "none",
    rarity: def.rarity ?? "common",
    trigger: def.trigger,
    keyword: def.keyword,
    keywordValue: def.keywordValue,
    shieldRemaining: overrides.shieldRemaining,
    debuffTaken: 0,
    ...overrides,
  };
}

function makeHand(def: Partial<CardDef> & { name: string }): HandCard {
  uidSeq++;
  return {
    ...(makeCard(def) as unknown as HandCard),
    uid: `hand-${uidSeq}`,
    id: def.id ?? `card-${uidSeq}`,
    power: def.power ?? 3,
    handBonus: 0,
  } as HandCard;
}

// ---------------------------------------------------------------------------
// 1. KEYWORD_FX: cobertura total de recetas
// ---------------------------------------------------------------------------
console.log("\n━━ 1. Tabla KEYWORD_FX ━━");
{
  const expected: Record<string, string> = {
    fervor: "buff_up", coraza: "shield_ring", insignia: "award_burst",
    remate: "destroy_slash", legado: "spirit_transfer", fortaleza: "fortify_sweep",
    hender_armadura: "armor_break", duelista: "sword_glint", amparo: "bless_rings",
    purificacion: "cleanse", impetu: "rage_burst", crueldad: "target_debuff",
    convergencia: "arcane_converge", sobrecarga: "overload_burst",
    llamarada: "flame_sweep", combustion: "explosion", escarcha: "frost_renew",
    ventisca: "frost_sweep", veneno: "poison_drip", contagio: "poison_spread",
    refriega: "clash_multi", golpe_certero: "crosshair", emboscada: "shadow_blink",
    purga: "skull_burst",
  };
  for (const [kw, recipe] of Object.entries(expected)) {
    assert(`${kw} → ${recipe}`, (KEYWORD_FX as Record<string, string>)[kw] === recipe);
  }
  assert("none → null", KEYWORD_FX.none === null);
}

// ---------------------------------------------------------------------------
// 2. START_TURN emite fx
// ---------------------------------------------------------------------------
console.log("\n━━ 2. applyStartTurnEffects.fx ━━");
{
  // Fervor
  let b = emptyBoard();
  const fervor = makeCard({ name: "Amuleto de Frenesí", keyword: "fervor", keywordValue: 2, trigger: "start_turn" });
  b.armas.player = [fervor];
  let res = applyStartTurnEffects(b, "player", [], ["armas"]);
  const fx1 = res.fx.find((f) => f.keyword === "fervor");
  assert("Fervor emite buff_up a sí misma", !!fx1 && fx1.side === "player" && fx1.targetUids?.[0] === fervor.uid && fx1.lane === "armas");

  // Escarcha (restaura escudo → fx)
  b = emptyBoard();
  const escarcha = makeCard({ name: "Cristal Glacial", keyword: "escarcha", keywordValue: 2, trigger: "start_turn" }, { shieldRemaining: 0 });
  b.hielo.player = [escarcha];
  res = applyStartTurnEffects(b, "player", [], ["hielo"]);
  assert("Escarcha emite frost_renew (escudo 0→2)", res.fx.some((f) => f.keyword === "escarcha" && f.side === "player" && f.value === 2));

  // Escarcha con escudo lleno → SIN fx (after==before)
  b = emptyBoard();
  const llena = makeCard({ name: "Cristal Glacial", keyword: "escarcha", keywordValue: 2, trigger: "start_turn" }, { shieldRemaining: 2 });
  b.hielo.player = [llena];
  res = applyStartTurnEffects(b, "player", [], ["hielo"]);
  assert("Escarcha con escudo lleno NO emite fx", res.fx.length === 0);

  // Veneno (side = del ENEMIGO afectado)
  b = emptyBoard();
  const veneno = makeCard({ name: "Frasco de Peste", keyword: "veneno", keywordValue: 2, trigger: "start_turn" });
  const victima = makeCard({ name: "Soldado" });
  b.veneno.player = [veneno];
  b.veneno.enemy = [victima];
  res = applyStartTurnEffects(b, "player", [], ["veneno"]);
  const fxVen = res.fx.find((f) => f.keyword === "veneno");
  assert("Veneno emite poison_drip al enemigo", !!fxVen && fxVen.side === "enemy" && fxVen.targetUids?.[0] === victima.uid);

  // Purificación solo con reducciones
  b = emptyBoard();
  const puri = makeCard({ name: "Oración del Bastión", keyword: "purificacion", trigger: "start_turn" });
  const herida = makeCard({ name: "Guardia" }, { debuffTaken: 3, currentPower: 1, basePower: 4 });
  b.proteccion.player = [puri, herida];
  res = applyStartTurnEffects(b, "player", [], ["proteccion"]);
  const fxPuri = res.fx.find((f) => f.keyword === "purificacion");
  assert("Purificación emite cleanse con target restaurado", !!fxPuri && (fxPuri.targetUids?.includes(herida.uid) ?? false));

  // Duelista condicional
  b = emptyBoard();
  const duo = makeCard({ name: "Espada del Duelista", keyword: "duelista", keywordValue: 2, trigger: "start_turn" });
  b.armas.player = [duo];
  res = applyStartTurnEffects(b, "player", [], ["armas"]);
  assert("Duelista única → sword_glint", res.fx.some((f) => f.keyword === "duelista"));
  b.armas.player = [duo, makeCard({ name: "Recluta" })];
  res = applyStartTurnEffects(b, "player", [], ["armas"]);
  assert("Duelista acompañada → sin fx", !res.fx.some((f) => f.keyword === "duelista"));
}

// ---------------------------------------------------------------------------
// 3. END_TURN emite fx
// ---------------------------------------------------------------------------
console.log("\n━━ 3. applyEndTurnEffects.fx ━━");
{
  // Fortaleza
  let b = emptyBoard();
  const fort = makeCard({ name: "Trono de Hierro", keyword: "fortaleza", keywordValue: 2, trigger: "end_turn" });
  const a1 = makeCard({ name: "Paladín" });
  const a2 = makeCard({ name: "Caballero" });
  b.proteccion.player = [fort, a1, a2];
  let res = applyEndTurnEffects(b, "player", [], ["proteccion"]);
  const fxF = res.fx.find((f) => f.keyword === "fortaleza");
  assert("Fortaleza emite fortify_sweep a TODO el carril", !!fxF && fxF.targetUids?.length === 3 && fxF.side === "player");

  // Crueldad perforada y bloqueada
  b = emptyBoard();
  const cruel = makeCard({ name: "Colmillo del Verdugo", keyword: "crueldad", keywordValue: 2, trigger: "end_turn" });
  const sinEscudo = makeCard({ name: "Soldado" });
  b.furia.player = [cruel];
  b.furia.enemy = [sinEscudo];
  res = applyEndTurnEffects(b, "player", [], ["furia"]);
  assert("Crueldad emite target_debuff al enemigo débil", res.fx.some((f) => f.keyword === "crueldad" && f.side === "enemy" && f.targetUids?.[0] === sinEscudo.uid));

  b = emptyBoard();
  const cruel2 = makeCard({ name: "Colmillo del Verdugo", keyword: "crueldad", keywordValue: 2, trigger: "end_turn" });
  const blindado = makeCard({ name: "Aegis del Bastión" }, { shieldRemaining: 5 });
  b.furia.player = [cruel2];
  b.furia.enemy = [blindado];
  res = applyEndTurnEffects(b, "player", [], ["furia"]);
  assert("Crueldad bloqueada → shieldBlock (sin keyword fx)", res.fx.some((f) => f.kind === "shieldBlock" && f.targetUids?.[0] === blindado.uid) && !res.fx.some((f) => f.kind === "keyword" && f.keyword === "crueldad"));

  // Ventisca AoE
  b = emptyBoard();
  const vent = makeCard({ name: "Filotormenta", keyword: "ventisca", keywordValue: 2, trigger: "end_turn" });
  const e1 = makeCard({ name: "Recluta" });
  const e2 = makeCard({ name: "Táctico Ligero" });
  b.hielo.player = [vent];
  b.hielo.enemy = [e1, e2];
  res = applyEndTurnEffects(b, "player", [], ["hielo"]);
  const fxV = res.fx.find((f) => f.keyword === "ventisca");
  assert("Ventisca emite frost_sweep a ambos enemigos", !!fxV && fxV.side === "enemy" && fxV.targetUids?.length === 2);

  // Contagio condicional
  b = emptyBoard();
  const contagio = makeCard({ name: "Cultivo de Hongos", keyword: "contagio", keywordValue: 2, trigger: "end_turn" });
  const limpio = makeCard({ name: "Berserker" });
  b.veneno.player = [contagio];
  b.veneno.enemy = [limpio];
  res = applyEndTurnEffects(b, "player", [], ["veneno"]);
  assert("Contagio sin veneno acumulado → sin fx", res.fx.length === 0);

  b.veneno.enemy = [makeCard({ name: "Berserker" }, { debuffTaken: 2 })];
  res = applyEndTurnEffects(b, "player", [], ["veneno"]);
  assert("Contagio con veneno acumulado → poison_spread", res.fx.some((f) => f.keyword === "contagio"));

  // Sobrecarga decay
  b = emptyBoard();
  const sobre = makeCard({ name: "Núcleo Inestable", keyword: "sobrecarga", keywordValue: 2, trigger: "on_play" }, { powerDecay: 2 });
  b.arcana.player = [sobre];
  res = applyEndTurnEffects(b, "player", [], ["arcana"]);
  assert("Sobrecarga disipa → overload_decay a sí misma", res.fx.some((f) => f.keyword === "sobrecarga" && f.targetUids?.[0] === sobre.uid && f.side === "player"));
}

// ---------------------------------------------------------------------------
// 4. ON_DEATH emite fx
// ---------------------------------------------------------------------------
console.log("\n━━ 4. applyOnDeathEffects.fx ━━");
{
  let b = emptyBoard();
  const legado = makeCard({ name: "Veterano Caído", keyword: "legado", keywordValue: 3, trigger: "on_death" });
  const heredero = makeCard({ name: "Aprendiz" });
  b.armas.player = [heredero];
  const res = applyOnDeathEffects(b, "player", "armas", legado);
  const fxL = res.fx.find((f) => f.keyword === "legado");
  assert("Legado emite spirit_transfer (source→aliado)", !!fxL && fxL.sourceUid === legado.uid && fxL.targetUids?.[0] === heredero.uid && fxL.side === "player");

  b = emptyBoard();
  const bomba = makeCard({ name: "Salamandra Anciana", keyword: "combustion", keywordValue: 2, trigger: "on_death" });
  const objetivo = makeCard({ name: "Muro de Hierro" });
  b.fuego.player = [objetivo];
  b.fuego.enemy = [];
  const res2 = applyOnDeathEffects(b, "enemy", "fuego", bomba);
  const fxC = res2.fx.find((f) => f.keyword === "combustion");
  assert("Combustión emite explosion al enemigo más fuerte", !!fxC && fxC.side === "player" && fxC.targetUids?.[0] === objetivo.uid);
}

// ---------------------------------------------------------------------------
// 5. eventsFromPlayResult — on_play + destroy + shield + trap
// ---------------------------------------------------------------------------
console.log("\n━━ 5. eventsFromPlayResult ━━");
{
  // Hender Armadura: mutación directa al enemigo
  const hender = makeHand({ name: "Hacha de Ejecución", keyword: "hender_armadura", keywordValue: 3 });
  let b = emptyBoard();
  const fuerte = makeCard({ name: "Coloso" });
  b.armas.enemy = [fuerte];
  const res = playCard(b, [hender], 5, "player", "armas", hender, null, null, 1);
  const evs = eventsFromPlayResult(res, "armas", "player");
  assert("play event con delay 200", evs.some((e) => e.kind === "play" && e.delayMs === 200));
  const fxH = evs.find((e) => e.kind === "keyword" && e.keyword === "hender_armadura");
  assert("Hender → armor_break agrupado al bando enemigo", !!fxH && fxH.side === "enemy" && fxH.targetUids?.[0] === fuerte.uid);
  assert("Hender sin shieldBlock (perfora)", !evs.some((e) => e.kind === "shieldBlock"));

  // Remate: destroy + keyword
  const remate = makeHand({ name: "Ejecutar", keyword: "remate", keywordValue: 4 });
  b = emptyBoard();
  const debil = makeCard({ name: "Recluta" }, { currentPower: 3, basePower: 3 });
  b.armas.enemy = [debil];
  const res2 = playCard(b, [remate], 5, "player", "armas", remate, null, null, 1);
  const evs2 = eventsFromPlayResult(res2, "armas", "player");
  assert("Remate → destroy_slash con target", evs2.some((e) => e.kind === "keyword" && e.keyword === "remate" && e.side === "enemy" && e.targetUids?.[0] === debil.uid));
  assert("Remate → destroy genérico del uid destruido", evs2.some((e) => e.kind === "destroy" && e.targetUids?.[0] === debil.uid));

  // Golpe Certero contra Coraza: shieldBlock + shieldAbsorbed en PlayResult
  const certero = makeHand({ name: "Estocada Maestra", keyword: "golpe_certero", keywordValue: 4 });
  b = emptyBoard();
  const coraza = makeCard({ name: "Campeón Revestido" }, { shieldRemaining: 10 });
  b.combate.enemy = [coraza];
  const res3 = playCard(b, [certero], 5, "player", "combate", certero, null, null, 1);
  assert("PlayResult.shieldAbsorbed registra absorción", res3.shieldAbsorbed.length === 1 && res3.shieldAbsorbed[0].absorbed === 4 && res3.shieldAbsorbed[0].uid === coraza.uid);
  const evs3 = eventsFromPlayResult(res3, "combate", "player");
  assert("Golpe Certero → shieldBlock al objetivo", evs3.some((e) => e.kind === "shieldBlock" && e.targetUids?.[0] === coraza.uid && e.value === 4));

  // Ímpetu: self-scaling sobre la carta nueva (delay 220)
  const impetu = makeHand({ name: "Ira Rabiosa", keyword: "impetu", keywordValue: 2 });
  b = emptyBoard();
  const res4 = playCard(b, [impetu], 5, "player", "furia", impetu, null, null, 2);
  const evs4 = eventsFromPlayResult(res4, "furia", "player");
  const fxI = evs4.find((e) => e.kind === "keyword" && e.keyword === "impetu");
  assert("Ímpetu → rage_burst sobre sí misma con delay 220", !!fxI && fxI.side === "player" && fxI.delayMs === 220 && fxI.targetUids?.[0] === res4.playedCard.uid);

  // Amparo: mutations con shieldDelta → bless_rings a los aliados
  const amparo = makeHand({ name: "Muro de Escudos", keyword: "amparo", keywordValue: 3 });
  b = emptyBoard();
  const aliado = makeCard({ name: "Centinela" });
  b.proteccion.player = [aliado];
  const res5 = playCard(b, [amparo], 5, "player", "proteccion", amparo, null, null, 1);
  const evs5 = eventsFromPlayResult(res5, "proteccion", "player");
  const fxA = evs5.find((e) => e.kind === "keyword" && e.keyword === "amparo");
  assert("Amparo → bless_rings al aliado (no a sí misma)", !!fxA && fxA.side === "player" && fxA.targetUids?.length === 1 && fxA.targetUids[0] === aliado.uid);

  // Trampa
  const simple = makeHand({ name: "Soldado" });
  b = emptyBoard();
  const res6 = playCard(b, [simple], 5, "player", "combate", simple, null, { owner: "enemy", value: 2 }, 1);
  const evs6 = eventsFromPlayResult(res6, "combate", "player");
  assert("Trampa activada → evento trap", Boolean(res6.trapTriggered) && evs6.some((e) => e.kind === "trap"));
}

// ---------------------------------------------------------------------------
console.log(`\n══════════════════════════════════════`);
console.log(`  RESULTADO: ${passed} pasan · ${failed} fallan`);
console.log(`══════════════════════════════════════`);
if (failed > 0) process.exit(1);
