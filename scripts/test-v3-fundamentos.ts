// ============================================================================
// TEST V3.0 FUNDAMENTOS (T-A) — 18 keywords nuevas + 3 reglas de clase + adyacencia
// ============================================================================
// Ejecutar: bun scripts/test-v3-fundamentos.ts
// Cubre los kits aprobados en docs/plan-expansion-v3.md §2 (Botánico/Pirata/
// Tinker). Afirma deltas EXACTOS de poder/escudos/destrucción y los ejes
// nuevos: contador de turnos (Estación), ranking de poder (Simbiosis),
// robo con botín (Saqueo), SWAP de poder (Motín), buff aleatorio de mano
// (Contrabando), AoE adyacente (Canonazo/Andanada), condición por Ítems
// (Engranaje/Sobrecalentar), escudo de carril completo (Remache) y
// multi-objetivo doble (Descarga).
// ============================================================================

import {
  playCard,
  applyStartTurnEffects,
  applyEndTurnEffects,
  applyOnDeathEffects,
  emptyBoard,
  emptyClassRules,
  type Board,
  type ClassRulesState,
} from "../src/lib/game/engine";
import {
  LANE_ADJACENT,
  CLASS_META,
  type BoardCard,
  type CardCategory,
  type CardDef,
  type GameClass,
  type HandCard,
  type Keyword,
  type LaneId,
  type Rarity,
  type Subtype,
  type Trigger,
} from "../src/lib/game/types";
import { visibleClasses, V3_CLASSES_UNLOCKED, isNewClass } from "../src/lib/game/v3";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string): void {
  if (cond) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ FALLO: ${msg}`);
  }
}
function section(t: string): void {
  console.log(`\n── ${t} ──`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let uidSeq = 0;
function nextUid(): string {
  return `u${++uidSeq}`;
}

interface MkOpts {
  name: string;
  keyword?: Keyword;
  keywordValue?: number;
  category?: CardCategory;
  subtypes?: Subtype[];
  cost?: number;
  power?: number;
  trigger?: Trigger;
  rarity?: Rarity;
}

/** Carta de MANO sintética (para playCard). */
function mkHand(o: MkOpts): HandCard {
  return {
    id: `syn_${o.name.toLowerCase().replace(/\s+/g, "_")}`,
    name: o.name,
    category: o.category ?? "Ataque",
    subtypes: o.subtypes ?? [],
    cost: o.cost ?? 1,
    power: o.power ?? 5,
    text: "",
    effectId: (o.keyword ?? "none") as never,
    keyword: o.keyword,
    keywordValue: o.keywordValue,
    trigger: o.trigger,
    rarity: o.rarity ?? "common",
    uid: nextUid(),
    handBonus: 0,
  } as unknown as HandCard;
}

/** Carta de TABLERO sintética (aliados/enemigos pre-colocados). */
function mkBoard(o: MkOpts & { currentPower?: number; shieldRemaining?: number; debuffTaken?: number; uid?: string }): BoardCard {
  return {
    uid: o.uid ?? nextUid(),
    defId: `syn_${o.name.toLowerCase().replace(/\s+/g, "_")}`,
    name: o.name,
    category: o.category ?? "Ataque",
    subtypes: o.subtypes ?? [],
    cost: o.cost ?? 1,
    basePower: o.power ?? 5,
    currentPower: o.currentPower ?? o.power ?? 5,
    text: "",
    effectId: (o.keyword ?? "none") as never,
    keyword: o.keyword,
    keywordValue: o.keywordValue,
    trigger: o.trigger,
    rarity: o.rarity ?? "common",
    shieldRemaining: o.shieldRemaining,
    debuffTaken: o.debuffTaken ?? 0,
  } as unknown as BoardCard;
}

function place(board: Board, side: "player" | "enemy", lane: LaneId, card: BoardCard): void {
  board[lane][side].push(card);
}

function powerOf(board: Board, side: "player" | "enemy", lane: LaneId, name: string): number {
  const c = board[lane][side].find((x) => x.name === name);
  return c ? c.currentPower : Number.NaN;
}

function shieldOf(board: Board, side: "player" | "enemy", lane: LaneId, name: string): number | undefined {
  return board[lane][side].find((x) => x.name === name)?.shieldRemaining;
}

function exists(board: Board, side: "player" | "enemy", lane: LaneId, name: string): boolean {
  return board[lane][side].some((x) => x.name === name);
}

/** Jugada estándar: jugador coloca `hand[0]` en `lane` con energía de sobra. */
function play(board: Board, card: HandCard, lane: LaneId, extraHand: HandCard[] = []) {
  return playCard(board, [card, ...extraHand], 20, "player", lane, card, null, null, 1);
}

// ---------------------------------------------------------------------------
section("0. Cimientos: flag V3, adyacencia y tablero");
{
  assert(V3_CLASSES_UNLOCKED === true, "V3_CLASSES_UNLOCKED ENCENDIDA (el jugador pidió ver las 6 clases en T-D)");
  assert(visibleClasses().length === 6, "visibleClasses() expone las 6 clases");
  assert(visibleClasses().includes("botanico") && visibleClasses().includes("pirata") && visibleClasses().includes("tinker"), "las 3 clases V3 filtradas a la UI");
  assert(isNewClass("pirata") && isNewClass("botanico") && isNewClass("tinker"), "isNewClass() marca las 3 nuevas");
  assert(!isNewClass("guerrero"), "isNewClass() no marca a las base");

  const b = emptyBoard();
  const lanes = Object.keys(b) as LaneId[];
  assert(lanes.length === 18, `emptyBoard() cubre 18 carriles (hay ${lanes.length})`);

  // Adyacencia: mismo clase, sin auto-adyacencia, simétrica
  let adjOk = true;
  for (const [cls, meta] of Object.entries(CLASS_META)) {
    const set = new Set(meta.lanes);
    for (const lane of meta.lanes) {
      for (const adj of LANE_ADJACENT[lane]) {
        if (!set.has(adj) || adj === lane || !LANE_ADJACENT[adj].includes(lane)) adjOk = false;
      }
    }
    // cadena: extremos con 1 vecino, centro con 2
    const [a, mid, c] = meta.lanes;
    if (LANE_ADJACENT[a].length !== 1 || LANE_ADJACENT[c].length !== 1 || LANE_ADJACENT[mid].length !== 2) adjOk = false;
    void cls;
  }
  assert(adjOk, "LANE_ADJACENT: cadenas por clase simétricas (1-2-1)");
}

// ---------------------------------------------------------------------------
section("1. BOTÁNICO — Micelio [X] (doble escudo)");
{
  const board = emptyBoard();
  const ally = mkBoard({ name: "Musgo", power: 3 });
  place(board, "player", "raiz", ally);
  const card = mkHand({ name: "Red Fúngica", keyword: "micelio", keywordValue: 2, subtypes: ["raiz"], power: 4 });
  const res = play(board, card, "raiz");
  assert(shieldOf(res.board, "player", "raiz", "Red Fúngica") === 2, "la propia carta entra con escudo X");
  assert(shieldOf(res.board, "player", "raiz", "Musgo") === 2, "el aliado más débil gana escudo X");
}

{
  const board = emptyBoard();
  const card = mkHand({ name: "Red Fúngica", keyword: "micelio", keywordValue: 2, subtypes: ["raiz"], power: 4 });
  const res = play(board, card, "raiz");
  assert(shieldOf(res.board, "player", "raiz", "Red Fúngica") === 2, "sola en el carril: solo su propio escudo (sin noop total)");
}

// ---------------------------------------------------------------------------
section("2. BOTÁNICO — Estación [X] (contador de turnos)");
{
  const board = emptyBoard();
  const card = mkBoard({ name: "Semilla", keyword: "estacion", keywordValue: 2, trigger: "start_turn", subtypes: ["raiz"], power: 5 });
  place(board, "player", "raiz", card);

  const t3 = applyStartTurnEffects(board, "player", [], ["raiz", "flor", "esporas"], undefined, 3);
  assert(powerOf(t3.board, "player", "raiz", "Semilla") === 7, "turno 3 (<4): gana +X");
  const t4 = applyStartTurnEffects(t3.board, "player", [], ["raiz", "flor", "esporas"], undefined, 4);
  assert(powerOf(t4.board, "player", "raiz", "Semilla") === 11, "turno 4 (madura): gana +2X");
}

// ---------------------------------------------------------------------------
section("3. BOTÁNICO — Simbiosis [X] (ranking de poder entre propias)");
{
  const board = emptyBoard();
  place(board, "player", "flor", mkBoard({ name: "Menor", power: 3 }));
  place(board, "player", "flor", mkBoard({ name: "Igual", power: 9 }));
  // entrada: power 6 + sinergia subtype flor 2 = 8 → solo "Menor" (3 < 8)
  const card = mkHand({ name: "Liana", keyword: "simbiosis", keywordValue: 2, subtypes: ["flor"], power: 6 });
  const res = play(board, card, "flor");
  assert(powerOf(res.board, "player", "flor", "Liana") === 10, "8 base + 2×1 aliado menor (X=2)");
}

{
  const board = emptyBoard();
  place(board, "player", "flor", mkBoard({ name: "Mayor", power: 20 }));
  const card = mkHand({ name: "Liana", keyword: "simbiosis", keywordValue: 2, subtypes: ["flor"], power: 6 });
  const res = play(board, card, "flor");
  assert(powerOf(res.board, "player", "flor", "Liana") === 8, "sin aliados menores: entra sin bonus");
}

// ---------------------------------------------------------------------------
section("4. BOTÁNICO — Floración [X] (muerte que buffa el carril)");
{
  const board = emptyBoard();
  const flor = mkBoard({ name: "Flor Muerta", keyword: "floracion", keywordValue: 3, trigger: "on_death", power: 0, currentPower: 0 });
  place(board, "player", "flor", flor);
  place(board, "player", "flor", mkBoard({ name: "Brote A", power: 4 }));
  place(board, "player", "flor", mkBoard({ name: "Brote B", power: 6 }));
  const res = applyOnDeathEffects(board, "player", "flor", flor);
  assert(powerOf(res.board, "player", "flor", "Brote A") === 7 && powerOf(res.board, "player", "flor", "Brote B") === 9, "TODAS las cartas del carril ganan +X al morir");
}

// ---------------------------------------------------------------------------
section("5. BOTÁNICO — Polen [X] (el enemigo con MENOS reducciones)");
{
  const board = emptyBoard();
  place(board, "enemy", "esporas", mkBoard({ name: "Tocado", power: 10, debuffTaken: 5 }));
  place(board, "enemy", "esporas", mkBoard({ name: "Fresco", power: 10, debuffTaken: 0 }));
  const card = mkHand({ name: "Nube", keyword: "polen", keywordValue: 2, subtypes: ["esporas"], power: 4 });
  const res = play(board, card, "esporas");
  assert(powerOf(res.board, "enemy", "esporas", "Tocado") === 10, "NO pica al más debuffeado (espejo de Ruptura)");
  assert(powerOf(res.board, "enemy", "esporas", "Fresco") === 8, "pica al de MENOS reducciones (−X honesto)");
}

{
  // honesto: los escudos absorben
  const board = emptyBoard();
  place(board, "enemy", "esporas", mkBoard({ name: "Blindado", power: 10, shieldRemaining: 5 }));
  const card = mkHand({ name: "Nube", keyword: "polen", keywordValue: 2, subtypes: ["esporas"], power: 4 });
  const res = play(board, card, "esporas");
  assert(powerOf(res.board, "enemy", "esporas", "Blindado") === 10, "escudo absorbe el polen (poder intacto)");
  assert(shieldOf(res.board, "enemy", "esporas", "Blindado") === 3, "…y el escudo baja a 3 (absorbidos 2)");
}

// ---------------------------------------------------------------------------
section("6. BOTÁNICO — Carnívora [X] (devora y se alimenta)");
{
  const board = emptyBoard();
  place(board, "enemy", "esporas", mkBoard({ name: "Presilla", power: 3 }));
  place(board, "enemy", "esporas", mkBoard({ name: "Grande", power: 12 }));
  const card = mkHand({ name: "Dentina", keyword: "carnivora", keywordValue: 4, subtypes: ["esporas"], power: 5 });
  const res = play(board, card, "esporas");
  assert(!exists(res.board, "enemy", "esporas", "Presilla"), "devora la más débil con poder ≤ X");
  assert(exists(res.board, "enemy", "esporas", "Grande"), "la grande sobrevive");
  // entrada 5+2 sinergia + 2 de la digestión
  assert(powerOf(res.board, "player", "esporas", "Dentina") === 9, "gana +2 al devorar (5+2+2)");
}

{
  const board = emptyBoard();
  place(board, "enemy", "esporas", mkBoard({ name: "Grande", power: 12 }));
  const card = mkHand({ name: "Dentina", keyword: "carnivora", keywordValue: 4, subtypes: ["esporas"], power: 5 });
  const res = play(board, card, "esporas");
  assert(powerOf(res.board, "player", "esporas", "Dentina") === 8, "sin presa: mastica tierra y gana +1 (5+2+1)");
}

// ---------------------------------------------------------------------------
section("7. PIRATA — Saqueo [X] (robo con botín)");
{
  const board = emptyBoard();
  place(board, "enemy", "puente", mkBoard({ name: "Mercante", power: 12 }));
  const card = mkHand({ name: "Abordador", keyword: "saqueo", keywordValue: 3, subtypes: ["puente"], power: 5 });
  const res = play(board, card, "puente");
  assert(powerOf(res.board, "enemy", "puente", "Mercante") === 9, "la víctima pierde X (12−3)");
  assert(powerOf(res.board, "player", "puente", "Abordador") === 10, "el saqueador roba X (5+2+3)");
}

{
  const board = emptyBoard();
  place(board, "enemy", "puente", mkBoard({ name: "Balandra", power: 3 }));
  const card = mkHand({ name: "Abordador", keyword: "saqueo", keywordValue: 3, subtypes: ["puente"], power: 5 });
  const res = play(board, card, "puente");
  assert(!exists(res.board, "enemy", "puente", "Balandra"), "el robo la deja a 0 → cae");
  assert(powerOf(res.board, "player", "puente", "Abordador") === 12, "botín: roba X y gana +2 (5+2+3+2)");
}

// ---------------------------------------------------------------------------
section("8. PIRATA — Tripulación [X] (+X por grumete)");
{
  const board = emptyBoard();
  const cap = mkBoard({ name: "Capitana", keyword: "tripulacion", keywordValue: 2, trigger: "start_turn", power: 5 });
  place(board, "player", "puente", cap);
  place(board, "player", "puente", mkBoard({ name: "Grumete", power: 4 }));
  place(board, "player", "puente", mkBoard({ name: "Timonel", power: 4 }));
  const res = applyStartTurnEffects(board, "player", [], ["puente", "bodega", "artilleria"]);
  assert(powerOf(res.board, "player", "puente", "Capitana") === 11, "3 cartas propias (ella incluida) → +3X");
}

// ---------------------------------------------------------------------------
section("9. PIRATA — Motín (primer SWAP de poder)");
{
  const board = emptyBoard();
  place(board, "enemy", "bodega", mkBoard({ name: "Capitán Rico", power: 14 }));
  const card = mkHand({ name: "Amotinado", keyword: "motin", subtypes: ["bodega"], power: 4, category: "Ataque" });
  const res = play(board, card, "bodega");
  assert(powerOf(res.board, "player", "bodega", "Amotinado") === 14, "el amotinado entra con el poder del capitán (14)");
  assert(powerOf(res.board, "enemy", "bodega", "Capitán Rico") === 6, "el capitán queda con la base del amotinado (4+2 sinergia)");
}

{
  // motín descendente: el "swap" puede jugar en contra (riesgo político)
  const board = emptyBoard();
  place(board, "enemy", "bodega", mkBoard({ name: "Grumete", power: 3 }));
  const card = mkHand({ name: "Amotinado", keyword: "motin", subtypes: ["bodega"], power: 8, category: "Ataque" });
  const res = play(board, card, "bodega");
  assert(powerOf(res.board, "player", "bodega", "Amotinado") === 3, "si el enemigo es más débil, el amotinado BAJA a su poder");
  assert(powerOf(res.board, "enemy", "bodega", "Grumete") === 10, "y el debilitado sube a la base (8+2)");
}

// ---------------------------------------------------------------------------
section("10. PIRATA — Contrabando [X] (buff aleatorio de mano)");
{
  for (let intento = 0; intento < 20; intento++) {
    const board = emptyBoard();
    const h1 = mkHand({ name: "Cómplice A", power: 2 });
    const h2 = mkHand({ name: "Cómplice B", power: 2 });
    const card = mkHand({ name: "Contrabandista", keyword: "contrabando", keywordValue: 3, subtypes: ["bodega"], power: 4 });
    const res = play(board, card, "bodega", [h1, h2]);
    const a = res.hand.find((c) => c.name === "Cómplice A")!;
    const b = res.hand.find((c) => c.name === "Cómplice B")!;
    const buffs = [a.handBonus, b.handBonus];
    const exactlyOne = (buffs[0] === 3 && buffs[1] === 0) || (buffs[0] === 0 && buffs[1] === 3);
    if (!exactlyOne) {
      assert(false, `exactamente UNA carta aleatoria recibe +X (obtuvimos ${buffs.join(",")})`);
      break;
    }
    if (intento === 19) assert(true, "exactamente UNA carta aleatoria recibe +3 (20 partidas)");
  }
}

// ---------------------------------------------------------------------------
section("11. PIRATA — Canonazo [X] (primer AoE ADYACENTE)");
{
  const board = emptyBoard();
  place(board, "enemy", "artilleria", mkBoard({ name: "Objetivo Central", power: 10 }));
  place(board, "enemy", "bodega", mkBoard({ name: "Objetivo Ady", power: 10 }));
  place(board, "enemy", "puente", mkBoard({ name: "Lejos", power: 10 }));
  const card = mkHand({ name: "Boca de Fuego", keyword: "canonazo", keywordValue: 2, subtypes: ["artilleria"], power: 5 });
  const res = play(board, card, "artilleria");
  assert(powerOf(res.board, "enemy", "artilleria", "Objetivo Central") === 8, "carril propio −X");
  assert(powerOf(res.board, "enemy", "bodega", "Objetivo Ady") === 8, "carril ADYACENTE −X (primer alcance multi-carril)");
  assert(powerOf(res.board, "enemy", "puente", "Lejos") === 10, "el carril NO adyacente intacto");
}

// ---------------------------------------------------------------------------
section("12. PIRATA — Andanada [X] (Último Aliento multi-carril)");
{
  const board = emptyBoard();
  const dead = mkBoard({ name: "Polvorín", keyword: "andanada", keywordValue: 2, trigger: "on_death", power: 1, currentPower: 1 });
  // Andanada golpea al bando CONTRARIO de la carta muerta (como Detonación):
  // muere del lado enemy → sus víctimas están del lado player.
  place(board, "player", "puente", mkBoard({ name: "Cerca", power: 9 }));
  place(board, "player", "bodega", mkBoard({ name: "Medio", power: 9 }));
  const res = applyOnDeathEffects(board, "enemy", "bodega", dead);
  assert(powerOf(res.board, "player", "puente", "Cerca") === 7, "adyacente también recibe la salva al morir");
  assert(powerOf(res.board, "player", "bodega", "Medio") === 7, "carril propio recibe la salva");
}

// ---------------------------------------------------------------------------
section("13. TINKER — Remache [X] (escudo al carril COMPLETO)");
{
  const board = emptyBoard();
  place(board, "player", "taller", mkBoard({ name: "Aprendiz", power: 4 }));
  place(board, "player", "taller", mkBoard({ name: "Oficial", power: 6 }));
  const card = mkHand({ name: "Remachadora", keyword: "remache", keywordValue: 2, subtypes: ["taller"], power: 5, category: "Ítem" });
  const res = play(board, card, "taller");
  assert(shieldOf(res.board, "player", "taller", "Remachadora") === 2, "la propia entra con escudo (Amparo lo excluye, Remache NO)");
  assert(shieldOf(res.board, "player", "taller", "Aprendiz") === 2 && shieldOf(res.board, "player", "taller", "Oficial") === 2, "TODOS los aliados del carril con escudo X");
}

// ---------------------------------------------------------------------------
section("14. TINKER — Chatarra [X] (reciclaje: poder + escudo)");
{
  const board = emptyBoard();
  // La carta muerta YA NO está en el tablero cuando dispara su Último Aliento
  // (igual que en partida real): solo sus aliados.
  const dead = mkBoard({ name: "Autómata Roto", keyword: "chatarra", keywordValue: 3, trigger: "on_death", power: 0, currentPower: 0 });
  place(board, "player", "taller", mkBoard({ name: "Enano", power: 2 }));
  place(board, "player", "taller", mkBoard({ name: "Robusto", power: 9 }));
  const res = applyOnDeathEffects(board, "player", "taller", dead);
  assert(powerOf(res.board, "player", "taller", "Enano") === 5, "el más débil gana +X de poder");
  assert(shieldOf(res.board, "player", "taller", "Enano") === 3, "…y un escudo X");
}

// ---------------------------------------------------------------------------
section("15. TINKER — Engranaje [X] (condición por Ítem en carril)");
{
  const board = emptyBoard();
  const eng = mkBoard({ name: "Pistón", keyword: "engranaje", keywordValue: 2, trigger: "start_turn", power: 5 });
  place(board, "player", "maquinaria", eng);
  place(board, "player", "maquinaria", mkBoard({ name: "Llave Inglesa", category: "Ítem", power: 3 }));
  const con = applyStartTurnEffects(board, "player", [], ["taller", "maquinaria", "chispa"]);
  assert(powerOf(con.board, "player", "maquinaria", "Pistón") === 7, "con Ítem propio en carril: +X");

  const board2 = emptyBoard();
  const eng2 = mkBoard({ name: "Pistón", keyword: "engranaje", keywordValue: 2, trigger: "start_turn", power: 5 });
  place(board2, "player", "maquinaria", eng2);
  const sin = applyStartTurnEffects(board2, "player", [], ["taller", "maquinaria", "chispa"]);
  assert(powerOf(sin.board, "player", "maquinaria", "Pistón") === 5, "sin Ítem: el mecanismo se para (+0)");
}

// ---------------------------------------------------------------------------
section("16. TINKER — Sobrecalentar [X] (+2X con otro Ítem)");
{
  const board = emptyBoard();
  place(board, "player", "maquinaria", mkBoard({ name: "Caldera", category: "Ítem", power: 3 }));
  const card = mkHand({ name: "Núcleo", keyword: "sobrecalentar", keywordValue: 2, subtypes: ["maquinaria"], power: 5, category: "Ítem" });
  const res = play(board, card, "maquinaria");
  assert(powerOf(res.board, "player", "maquinaria", "Núcleo") === 11, "con Ítem aliado: 5+2+2X=+4");

  const board2 = emptyBoard();
  const card2 = mkHand({ name: "Núcleo", keyword: "sobrecalentar", keywordValue: 2, subtypes: ["maquinaria"], power: 5, category: "Ítem" });
  const res2 = play(board2, card2, "maquinaria");
  assert(powerOf(res2.board, "player", "maquinaria", "Núcleo") === 9, "sin Ítem aliado: 5+2+X=+2");
}

// ---------------------------------------------------------------------------
section("17. TINKER — Torreta [X] (francotira al MÁS FUERTE)");
{
  const board = emptyBoard();
  const tor = mkBoard({ name: "Torreta", keyword: "torreta", keywordValue: 2, trigger: "end_turn", power: 5 });
  place(board, "player", "chispa", tor);
  place(board, "enemy", "chispa", mkBoard({ name: "Débil", power: 4 }));
  place(board, "enemy", "chispa", mkBoard({ name: "Tanque", power: 12 }));
  const res = applyEndTurnEffects(board, "player", [], ["taller", "maquinaria", "chispa"]);
  assert(powerOf(res.board, "enemy", "chispa", "Tanque") === 10, "pica al MÁS FUERTE (−X)");
  assert(powerOf(res.board, "enemy", "chispa", "Débil") === 4, "el débil intacto (Crueldad pica abajo, Torreta arriba)");
}

// ---------------------------------------------------------------------------
section("18. TINKER — Descarga [X] (los DOS más débiles)");
{
  const board = emptyBoard();
  place(board, "enemy", "chispa", mkBoard({ name: "D1", power: 3 }));
  place(board, "enemy", "chispa", mkBoard({ name: "D2", power: 5 }));
  place(board, "enemy", "chispa", mkBoard({ name: "Fuerte", power: 15 }));
  const card = mkHand({ name: "Bobina", keyword: "descarga", keywordValue: 2, subtypes: ["chispa"], power: 5 });
  const res = play(board, card, "chispa");
  assert(powerOf(res.board, "enemy", "chispa", "D1") === 1 && powerOf(res.board, "enemy", "chispa", "D2") === 3, "los dos más débiles reciben −X");
  assert(powerOf(res.board, "enemy", "chispa", "Fuerte") === 15, "el fuerte intacto");
}

// ---------------------------------------------------------------------------
section("19. REGLA BOTÁNICO — Ecosistema (diversidad de categorías)");
{
  const rules: ClassRulesState = emptyClassRules();
  rules.classes = { player: "botanico", enemy: "guerrero" };
  const board = emptyBoard();
  place(board, "player", "flor", mkBoard({ name: "Ataque Flor", power: 4 })); // Ataque
  place(board, "player", "flor", mkBoard({ name: "Ítem Flor", category: "Ítem", power: 4 })); // Ítem
  place(board, "player", "raiz", mkBoard({ name: "Mono A", power: 4 }));
  place(board, "player", "raiz", mkBoard({ name: "Mono B", power: 4, category: "Ataque" })); // misma categoría
  const res = applyEndTurnEffects(board, "player", [], ["raiz", "flor", "esporas"], rules);
  assert(powerOf(res.board, "player", "flor", "Ataque Flor") === 5 && powerOf(res.board, "player", "flor", "Ítem Flor") === 5, "carril diverso (Ataque+Ítem): +1 a TODAS");
  assert(powerOf(res.board, "player", "raiz", "Mono A") === 4 && powerOf(res.board, "player", "raiz", "Mono B") === 4, "carril monótono: sin bonus");
}

// ---------------------------------------------------------------------------
section("20. REGLA PIRATA — Viento de Popa (menos tripulación → +1)");
{
  const rules: ClassRulesState = emptyClassRules();
  rules.classes = { player: "pirata", enemy: "guerrero" };
  const board = emptyBoard();
  place(board, "player", "puente", mkBoard({ name: "Sola", power: 4 }));
  place(board, "enemy", "puente", mkBoard({ name: "E1", power: 4 }));
  place(board, "enemy", "bodega", mkBoard({ name: "E2", power: 4 }));
  const res = applyStartTurnEffects(board, "player", [], ["puente", "bodega", "artilleria"], rules);
  assert(powerOf(res.board, "player", "puente", "Sola") === 5, "1 carta vs 2: +1 al inicio de turno");

  const board2 = emptyBoard();
  place(board2, "player", "puente", mkBoard({ name: "A", power: 4 }));
  place(board2, "player", "bodega", mkBoard({ name: "B", power: 4 }));
  place(board2, "enemy", "puente", mkBoard({ name: "E1", power: 4 }));
  place(board2, "enemy", "bodega", mkBoard({ name: "E2", power: 4 }));
  const res2 = applyStartTurnEffects(board2, "player", [], ["puente", "bodega", "artilleria"], rules);
  assert(powerOf(res2.board, "player", "puente", "A") === 4 && powerOf(res2.board, "player", "bodega", "B") === 4, "empate de tripulación: sin viento");
}

// ---------------------------------------------------------------------------
section("21. REGLA TINKER — Taller de Campamento (Ítems entran +1)");
{
  const rules: ClassRulesState = emptyClassRules();
  rules.classes = { player: "tinker", enemy: "guerrero" };
  const board = emptyBoard();
  const item = mkHand({ name: "Llave", category: "Ítem", subtypes: ["taller"], power: 5, cost: 2 });
  const res = playCard(board, [item], 20, "player", "taller", item, null, null, 1, rules);
  assert(res.playedCard.currentPower === 8, "Ítem tinker: 5 + 2 sinergia + 1 Taller = 8");
  assert((res.playedCard.powerLog ?? []).some((l) => l.source === "Taller de Campamento"), "el +1 queda registrado en el Registro");

  const board2 = emptyBoard();
  const atk = mkHand({ name: "Espadón", category: "Ataque", subtypes: ["taller"], power: 5, cost: 2 });
  const res2 = playCard(board2, [atk], 20, "player", "taller", atk, null, null, 1, rules);
  assert(res2.playedCard.currentPower === 7, "no-Ítem: sin bonus de Taller (5+2)");
}

// ---------------------------------------------------------------------------
section("22. Simetría: las reglas V3.0 funcionan para el lado ENEMIGO");
{
  // El bot tinker también remacha sus Ítems (línea roja: mismo motor ambos lados)
  const rules: ClassRulesState = emptyClassRules();
  rules.classes = { player: "guerrero", enemy: "tinker" };
  const board = emptyBoard();
  const item = mkHand({ name: "Llave Bot", category: "Ítem", subtypes: ["taller"], power: 5, cost: 2 });
  const res = playCard(board, [item], 20, "enemy", "taller", item, null, null, 1, rules);
  assert(res.playedCard.currentPower === 8, "el BOT tinker también cobra el +1 de Ítem (mismo motor)");
}

// ---------------------------------------------------------------------------
console.log(`\n════════════════════════════════════════`);
console.log(`V3 FUNDAMENTOS: ${passed} ✓ · ${failed} ✗`);
if (failed > 0) process.exit(1);
