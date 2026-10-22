// ============================================================================
// TANDA 30 — Ampliación clases base V3.0 (plan-expansion-v3 §2.4)
// +8 cartas por clase (pool 28→36) · +9 keywords nuevos (1 por carril).
// Guardián permanente: estructura, PTP, Regla A/B, textos, mazos de jefe,
// y VERIFICACIÓN FUNCIONAL de los 9 efectos en el engine (mini-sims).
// Uso: npx tsx scripts/test-tanda30.ts
// ============================================================================
import { GUERRERO3_CARDS, MAGO3_CARDS, ASESINO3_CARDS, ALL_CARDS_V3, BOSS_DECKS, cardPoolForClass, CLASS_DECKS, CLASS_DECKS_SECOND } from "../src/lib/game/cards";
import { getBalanceInfo } from "../src/lib/game/balance";
import { CLASS_META, KEYWORD_META } from "../src/lib/game/types";
import type { CardDef, GameClass, Keyword, LaneId, Subtype } from "../src/lib/game/types";
import { playCard, applyStartTurnEffects, applyEndTurnEffects, applyOnDeathEffects, emptyBoard } from "../src/lib/game/engine";
import { materializeCard } from "../src/lib/game/balance";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string): void {
  if (cond) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.log(`  ✗ ${msg}`);
  }
}
function section(t: string): void {
  console.log(`\n── ${t} ──`);
}

const TANDA30_IDS = new Set([...GUERRERO3_CARDS, ...MAGO3_CARDS, ...ASESINO3_CARDS].map((c) => c.id));

// ── Estructura por clase: +8, carriles 11/11/14, cobertura de categorías ──
const EXPECT: Record<GameClass, { arr: CardDef[]; lanes: [Subtype, number][]; nuevas: number }> = {
  guerrero: { arr: GUERRERO3_CARDS, lanes: [["armas", 11], ["furia", 11], ["proteccion", 14]], nuevas: 8 },
  mago: { arr: MAGO3_CARDS, lanes: [["arcana", 11], ["fuego", 11], ["hielo", 14]], nuevas: 8 },
  asesino: { arr: ASESINO3_CARDS, lanes: [["veneno", 11], ["combate", 11], ["sigilo", 14]], nuevas: 8 },
};

for (const [cls, exp] of Object.entries(EXPECT) as [GameClass, typeof EXPECT[GameClass]][]) {
  section(`${cls}: tanda 30`);
  const pool = cardPoolForClass(cls);
  assert(exp.arr.length === exp.nuevas, `+${exp.nuevas} cartas nuevas`);
  assert(pool.length === 36, `pool de la clase = 36 (hay ${pool.length})`);
  assert(new Set(pool.map((c) => c.id)).size === pool.length, "ids únicos en el pool");
  for (const [lane, expected] of exp.lanes) {
    const n = pool.filter((c) => c.subtypes[0] === lane).length;
    assert(n === expected, `carril ${lane}: ${expected} cartas (había ${expected === 14 ? 12 : 8})`);
    const lanePool = pool.filter((c) => c.subtypes[0] === lane);
    const cats = new Set(lanePool.map((c) => c.category));
    assert(cats.has("Ataque") && cats.has("Ítem") && cats.has("Acción"), `carril ${lane}: cobertura Ataque/Ítem/Acción`);
  }
  // Regla A: keywords exclusivas de su carril
  const badA = exp.arr.filter((c) => {
    if (!c.keyword) return false;
    const excl = KEYWORD_META[c.keyword as Keyword].exclusiveSubtype;
    return excl !== undefined && !c.subtypes.includes(excl);
  });
  assert(badA.length === 0, `Regla A: keywords de su carril (${badA.map((c) => c.id).join(",") || "limpio"})`);

  // Regla B: unicidad global de combo (coste|poder|keyword|X|trigger)
  const combo = (c: CardDef) => `${c.cost}|${c.power}|${c.keyword ?? "none"}|${c.keywordValue ?? 0}|${c.trigger ?? (c.keyword ? KEYWORD_META[c.keyword as Keyword].trigger : "on_play")}`;
  const seen = new Map<string, string>();
  let dupe = "";
  outer: for (const c of ALL_CARDS_V3) {
    const k = combo(c);
    if (seen.has(k)) { dupe = `${c.id} = ${seen.get(k)} (${k})`; break outer; }
    seen.set(k, c.id);
  }
  assert(dupe === "", `unicidad global de combo en ${ALL_CARDS_V3.length} cartas ${dupe ? "— " + dupe : ""}`);

  // PTP ±0.5 en TODA la clase (las nuevas incluidas)
  const bad = pool.filter((c) => Math.abs(getBalanceInfo(c).delta) > 0.5);
  assert(bad.length === 0, `36/36 PTP ±0.5 ${bad.map((c) => `${c.id}(${getBalanceInfo(c).delta.toFixed(1)})`).join(" ")}`);

  // Texto cita SU X (y 2X en fórmulas dobles: finta cobra 2X, combustion pega 2X;
  // ceniza es X por objetivo — sin fórmula doble; combustion solo cita 2X).
  const textBad: string[] = [];
  for (const c of exp.arr) {
    if (!c.keyword || !c.keywordValue) continue;
    const x = c.keywordValue;
    if (c.keyword === "combustion") {
      if (!c.text.includes(String(2 * x))) textBad.push(`${c.id} (2X=${2 * x})`);
      continue;
    }
    const doble = c.keyword === "finta";
    if (!c.text.includes(String(x)) || (doble && !c.text.includes(String(2 * x)))) textBad.push(`${c.id} (X=${x})`);
  }
  assert(textBad.length === 0, `texto cita su X ${textBad.join(", ")}`);

  // id = slug(nombre) (patrón de arte)
  const slugBad = exp.arr.filter((c) => {
    const slug = c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    return slug !== c.id;
  });
  assert(slugBad.length === 0, `id = slug(nombre) ${slugBad.map((c) => c.id).join(", ")}`);
}

section("mazos de jefe intactos (slice 12)");
{
  for (const cls of ["guerrero", "mago", "asesino", "botanico", "pirata", "tinker"] as GameClass[]) {
    const bossLane = CLASS_META[cls].lanes.find((l) => l === "proteccion" || l === "hielo" || l === "sigilo" || l === "esporas" || l === "artilleria" || l === "maquinaria")!;
    assert(BOSS_DECKS[cls].length === 12, `${cls}: mazo del jefe = 12 (${BOSS_DECKS[cls].length})`);
    const nuevasEnJefe = BOSS_DECKS[cls].filter((c) => TANDA30_IDS.has(c.id)).length;
    assert(nuevasEnJefe === 0, `${cls}: el jefe NO recibe cartas de la tanda 30`);
    void bossLane;
  }
  // Los mazos I/II oficiales siguen existiendo y son subset del pool
  for (const cls of ["guerrero", "mago", "asesino"] as GameClass[]) {
    assert(CLASS_DECKS[cls].length === 12 && CLASS_DECKS_SECOND[cls].length === 12, `${cls}: mazos I/II de 12`);
    const poolIds = new Set(cardPoolForClass(cls).map((c) => c.id));
    const validos = [...CLASS_DECKS[cls], ...CLASS_DECKS_SECOND[cls]].every((c) => poolIds.has(c.id));
    assert(validos, `${cls}: mazos I/II siguen siendo subset del pool de 36`);
  }
}

// ============================================================================
// VERIFICACIÓN FUNCIONAL de los 9 keywords nuevos (mini-sims del engine)
// ============================================================================
function mkLane(board: ReturnType<typeof emptyBoard>, lane: LaneId): ReturnType<typeof emptyBoard> {
  void board; void lane;
  return emptyBoard();
}

// Construye un BoardCard rápido para los sims
let uidSeq = 0;
function bc(partial: Partial<CardDef> & { power: number }): import("../src/lib/game/types").BoardCard {
  return {
    uid: `sim-${uidSeq++}`,
    defId: partial.id ?? "sim",
    name: partial.name ?? "Sim",
    category: (partial.category as import("../src/lib/game/types").CardCategory) ?? "Ataque",
    subtypes: (partial.subtypes as import("../src/lib/game/types").Subtype[]) ?? ["armas"],
    cost: partial.cost ?? 1,
    power: partial.power,
    basePower: partial.power,
    currentPower: partial.power,
    text: partial.text ?? "",
    effectId: (partial.effectId as never) ?? "none",
    rarity: "common",
    keyword: partial.keyword as Keyword | undefined,
    keywordValue: partial.keywordValue,
    trigger: partial.trigger as never,
    debuffTaken: 0,
  } as unknown as import("../src/lib/game/types").BoardCard;
}
type B = ReturnType<typeof emptyBoard>;
function put(board: B, lane: LaneId, side: "player" | "enemy", card: import("../src/lib/game/types").BoardCard): void {
  board[lane][side].push(card);
}

section("engine: estandarte buffa el carril ADYACENTE");
{
  const board = emptyBoard();
  put(board, "proteccion", "player", bc({ id: "a", power: 5 }));
  put(board, "furia", "player", bc({ id: "b", power: 6 }));
  put(board, "armas", "enemy", bc({ id: "e", power: 9 }));
  const card = { ...bc({ id: "est", name: "Estandarte", subtypes: ["armas"], keyword: "estandarte", keywordValue: 1, trigger: "on_play", cost: 2, power: 4 }), uid: "h1", handBonus: 0 };
  const hand = [card] as never;
  // ARMAS es carril EXTREMO (cadena 1-2-1): su único adyacente es PROTECCIÓN.
  const res = playCard(board, hand, 2, "player", "armas", card as never, null, null, 1, undefined);
  const adjP = res.board["proteccion"].player[0];
  const adjF = res.board["furia"].player[0];
  const enemy = res.board["armas"].enemy[0];
  assert(adjP.currentPower === 6, `adyacente proteccion +1 (5→${adjP.currentPower})`);
  assert(adjF.currentPower === 6, `furia NO es adyacente de armas (6→${adjF.currentPower})`);
  assert(enemy.currentPower === 9, `el enemigo del PROPIO carril NO recibe (${enemy.currentPower})`);
}

section("engine: atropello +2X a sí y −X al aliado débil");
{
  const board = emptyBoard();
  put(board, "furia", "player", bc({ id: "debil", name: "Débil", power: 3 }));
  put(board, "furia", "player", bc({ id: "fuerte", name: "Fuerte", power: 9 }));
  const card = { ...bc({ id: "at", name: "Arrollo", subtypes: ["furia"], keyword: "atropello", keywordValue: 1, trigger: "on_play", cost: 2, power: 8 }), uid: "h1", handBonus: 0 };
  const hand = [card] as never;
  const res = playCard(board, hand, 2, "player", "furia", card as never, null, null, 1, undefined);
  const me = res.board["furia"].player.find((c) => c.name === "Arrollo")!;
  const debil = res.board["furia"].player.find((c) => c.name === "Débil")!;
  assert(me.currentPower === 12, `entra con +2X y sinergia de carril (base 8 +4 +2 → ${me.currentPower})`);
  assert(debil.currentPower === 2, `el aliado débil recibe −X (${debil.currentPower})`);
}

section("engine: eco cuenta la mano restante");
{
  const board = emptyBoard();
  const card = { ...bc({ id: "eco", name: "Eco", subtypes: ["arcana"], keyword: "eco", keywordValue: 1, trigger: "on_play", cost: 2, power: 4 }), uid: "h1", handBonus: 0 };
  const rest = [
    { ...bc({ id: "m1", power: 2 }), uid: "m1", handBonus: 0 },
    { ...bc({ id: "m2", power: 2 }), uid: "m2", handBonus: 0 },
  ] as never[];
  const hand = [card, ...rest] as never;
  const res = playCard(board, hand, 2, "player", "arcana", card as never, null, null, 1, undefined);
  const me = res.board["arcana"].player[0];
  assert(me.currentPower === 8, `+X×2 en mano + sinergia (base 4 +2 +2 → ${me.currentPower})`);
}

section("engine: esquirla cosecha reducciones acumuladas");
{
  const board = emptyBoard();
  const e1 = bc({ id: "e1", power: 9 });
  e1.debuffTaken = 3;
  const e2 = bc({ id: "e2", power: 7 });
  e2.debuffTaken = 1;
  put(board, "hielo", "enemy", e1);
  put(board, "hielo", "enemy", e2);
  const card = { ...bc({ id: "esq", name: "Esquirla", subtypes: ["hielo"], keyword: "esquirla", keywordValue: 1, trigger: "on_play", cost: 3, power: 5 }), uid: "h1", handBonus: 0 };
  const hand = [card] as never;
  const res = playCard(board, hand, 3, "player", "hielo", card as never, null, null, 1, undefined);
  const me = res.board["hielo"].player[0];
  assert(me.currentPower === 11, `+X×4 reducciones + sinergia (base 5 +4 +2 → ${me.currentPower})`);
}

section("engine: corrosión funde el escudo más grande");
{
  const board = emptyBoard();
  const s1 = bc({ id: "s1", power: 8 });
  s1.shieldRemaining = 2;
  const s2 = bc({ id: "s2", power: 6 });
  s2.shieldRemaining = 5;
  put(board, "veneno", "enemy", s1);
  put(board, "veneno", "enemy", s2);
  const card = { ...bc({ id: "cor", name: "Corrosión", subtypes: ["veneno"], keyword: "corrosion", keywordValue: 3, trigger: "on_play", cost: 2, power: 4 }), uid: "h1", handBonus: 0 };
  const hand = [card] as never;
  const res = playCard(board, hand, 2, "player", "veneno", card as never, null, null, 1, undefined);
  const t1 = res.board["veneno"].enemy.find((c) => c.defId === "s1")!;
  const t2 = res.board["veneno"].enemy.find((c) => c.defId === "s2")!;
  assert(t2.shieldRemaining === 2 && t2.currentPower === 6, `al de 5: escudo 5→2 sin tocar poder (${t2.shieldRemaining}/${t2.currentPower})`);
  assert(t1.shieldRemaining === 2, `el de 2 intacto (${t1.shieldRemaining})`);
}

section("engine: corrosión sin escudos perfora al más fuerte");
{
  const board = emptyBoard();
  put(board, "veneno", "enemy", bc({ id: "w", power: 5 }));
  put(board, "veneno", "enemy", bc({ id: "s", name: "Fuerte", power: 11 }));
  const card = { ...bc({ id: "cor", name: "Corrosión", subtypes: ["veneno"], keyword: "corrosion", keywordValue: 2, trigger: "on_play", cost: 2, power: 4 }), uid: "h1", handBonus: 0 };
  const hand = [card] as never;
  const res = playCard(board, hand, 2, "player", "veneno", card as never, null, null, 1, undefined);
  const fuerte = res.board["veneno"].enemy.find((c) => c.defId === "s")!;
  assert(fuerte.currentPower === 9, `−2 perforante al más fuerte (${fuerte.currentPower})`);
}

section("engine: finta expone y cobra al turno siguiente");
{
  const board = emptyBoard();
  const card = { ...bc({ id: "fin", name: "Finta", subtypes: ["combate"], keyword: "finta", keywordValue: 2, trigger: "on_play", cost: 4, power: 14 }), uid: "h1", handBonus: 0 };
  const hand = [card] as never;
  const res = playCard(board, hand, 4, "player", "combate", card as never, null, null, 1, undefined);
  const me = res.board["combate"].player[0];
  assert(me.currentPower === 14, `entra expuesta −X con sinergia (base 14 −2 +2 → ${me.currentPower})`);
  assert(me.pendingBonus?.turnsLeft === 1 && me.pendingBonus?.amount === 4, `pendingBonus registrado (+4 en 1 turno)`);
  // Inicio del siguiente turno: cobra +4 y limpia pending
  const res2 = applyStartTurnEffects(res.board, "player", [], ["combate"], undefined, 2);
  const me2 = res2.board["combate"].player[0];
  assert(me2.currentPower === 18, `cobra +2X al iniciar turno (${me2.currentPower})`);
  assert(!me2.pendingBonus, `pendingBonus consumido`);
}

section("engine: octava cuenta las cartas de los OTROS carriles");
{
  const board = emptyBoard();
  put(board, "sigilo", "player", bc({ id: "ya", power: 5 })); // mismo carril: NO cuenta
  put(board, "veneno", "player", bc({ id: "o1", power: 5 }));
  put(board, "combate", "player", bc({ id: "o2", power: 5 }));
  const card = { ...bc({ id: "oct", name: "Octava", subtypes: ["sigilo"], keyword: "octava", keywordValue: 1, trigger: "on_play", cost: 3, power: 6 }), uid: "h1", handBonus: 0 };
  const hand = [card] as never;
  const res = playCard(board, hand, 3, "player", "sigilo", card as never, null, null, 1, undefined);
  const me = res.board["sigilo"].player.find((c) => c.name === "Octava")!;
  assert(me.currentPower === 10, `+X×2 (veneno+combate; sigilo no cuenta) + sinergia (base 6 +2 +2 → ${me.currentPower})`);
}

section("engine: muralla blinda TODOS tus carriles al morir");
{
  const board = emptyBoard();
  put(board, "armas", "player", bc({ id: "a", power: 5 }));
  put(board, "furia", "player", bc({ id: "b", power: 5 }));
  put(board, "proteccion", "player", bc({ id: "c", name: "Defensor", power: 5, keyword: "muralla", keywordValue: 2, trigger: "on_death" }));
  put(board, "raiz", "player", bc({ id: "x", power: 5 })); // clase ajena: NO recibe
  const res = applyOnDeathEffects(board, "player", "proteccion", board["proteccion"].player[0], undefined);
  assert(res.board["armas"].player[0].shieldRemaining === 2, `armas escudo 2 (${res.board["armas"].player[0].shieldRemaining})`);
  assert(res.board["furia"].player[0].shieldRemaining === 2, `furia escudo 2 (${res.board["furia"].player[0].shieldRemaining})`);
  assert(res.board["raiz"].player[0].shieldRemaining === undefined, `carril de otra clase intacto`);
}

section("engine: ceniza pica a los DOS más débiles al morir");
{
  const board = emptyBoard();
  put(board, "fuego", "enemy", bc({ id: "w1", name: "Débil1", power: 4 }));
  put(board, "fuego", "enemy", bc({ id: "w2", name: "Débil2", power: 6 }));
  put(board, "fuego", "enemy", bc({ id: "s", name: "Fuerte", power: 12 }));
  const dead = bc({ id: "br", name: "Brasas", power: 5, keyword: "ceniza", keywordValue: 2, trigger: "on_death" });
  const res = applyOnDeathEffects(board, "player", "fuego", dead, undefined);
  const d1 = res.board["fuego"].enemy.find((c) => c.defId === "w1")!;
  const d2 = res.board["fuego"].enemy.find((c) => c.defId === "w2")!;
  const f = res.board["fuego"].enemy.find((c) => c.defId === "s")!;
  assert(d1.currentPower === 2 && d2.currentPower === 4, `los dos débiles −2 (${d1.currentPower}/${d2.currentPower})`);
  assert(f.currentPower === 12, `el fuerte intacto (${f.currentPower})`);
}

section("fusión determinista (materialize) en las nuevas");
{
  const sample = GUERRERO3_CARDS.find((c) => c.keyword && c.keywordValue && KEYWORD_META[c.keyword as Keyword].hasValue)!;
  const legend = materializeCard(sample, "legendary");
  assert(
    legend.power === sample.power + 5 && legend.keywordValue === (sample.keywordValue ?? 0) + 1 && legend.text.includes(String((sample.keywordValue ?? 0) + 1)),
    `${sample.id}: X${sample.keywordValue}→X${legend.keywordValue} y +5 poder`
  );
}

console.log(`\n════════════════════════════════════════`);
console.log(`TANDA 30: ${passed} ✓ · ${failed} ✗`);
if (failed > 0) process.exit(1);
