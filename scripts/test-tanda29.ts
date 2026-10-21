// ============================================================================
// test-tanda29 — Tanda 29: cost_neg→0, Remate nuevo, rareza MÍTICA,
// niveles con drops, mazos de jefe temáticos, token por HEADER (PvP online),
// anti-duplicados del catálogo y renames de bots.
// Uso: bun scripts/test-tanda29.ts
// ============================================================================

import {
  getFinalCost,
  isCardCostAllowed,
  playCard,
  computeFinalResult,
  type Board,
} from "../src/lib/game/engine";
import { LANE_BONUS_POOL, LANE_META, type BoardCard, type CardDef, type LaneBonus, type LaneId } from "../src/lib/game/types";
import { ALL_CARDS_V3, BOSS_DECKS, cardPoolForClass, CLASS_DECKS, classCardsOf } from "../src/lib/game/cards";
import {
  materializeCard,
  nextRarity,
  RARITY_BONUS,
  RARITY_ORDER,
  getBalanceInfo,
} from "../src/lib/game/balance";
import {
  handleLocalPvpApi,
} from "../src/lib/pvp/local-server";
import { sanitizeClientDeck } from "../src/lib/game/pvp";
import { useStatsStore, xpForNext, dropTableFor, bonusDropCards, XP_MISSION } from "../src/store/statsStore";
import { useCollectionStore } from "../src/store/collectionStore";
import { CAMPAIGN_BOT_NAMES, CAMPAIGN_BOSS_NAMES, CAMPAIGN_BOSS_THEMES, rivalNameForStep } from "../src/lib/game/campaign";

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
section("1. Bono 'Coste -1': las cartas de coste 1 cuestan 0");
{
  const costNeg = LANE_BONUS_POOL.find((b) => b.kind === "cost_neg")!;
  assert(getFinalCost(1, costNeg) === 0, "coste 1 + Coste -1 → 0");
  assert(getFinalCost(2, costNeg) === 1, "coste 2 + Coste -1 → 1");
  assert(getFinalCost(5, costNeg) === 4, "coste 5 + Coste -1 → 4");
  assert(getFinalCost(3, null) === 3, "sin bono el coste es el base");
  // jugada REAL con energía 0: una carta de coste 1 en carril cost_neg es legal
  const cost1 = ALL_CARDS_V3.find((c) => c.cost === 1 && !c.keyword?.startsWith("remate"))!;
  const board: Board = {
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
  const hand = [{ ...cost1, uid: "c1", handBonus: 0 } as never];
  let ok = false;
  try {
    const res = playCard(board, hand as never, 0, "player", cost1.subtypes[0] as never, hand[0] as never, costNeg, null, 1);
    ok = res.remainingEnergy === 0 && res.board[cost1.subtypes[0] as "armas"].player.length === 1;
  } catch {
    ok = false;
  }
  assert(ok, "coste 1 se juega con 0 de energía en carril cost_neg (antes bloqueada)");
}

// ---------------------------------------------------------------------------
section("2. REMATE nuevo: resta X al MÁS DÉBIL; si tiene ≤ X lo destruye");
{
  const mk = (uid: string, power: number): BoardCard => ({
    uid, defId: "x", name: "X", category: "Ataque", subtypes: [], cost: 1,
    basePower: power, currentPower: power, text: "", effectId: "none",
    rarity: "common", trigger: "on_play", keyword: "none", debuffTaken: 0,
  });
  const remateCard = ALL_CARDS_V3.find((c) => c.keyword === "remate" && c.keywordValue === 2)!;
  const hand = [{ ...remateCard, uid: "r", handBonus: 0 } as never];
  const baseBoard = (): Board => ({
    armas: { player: [], enemy: [] }, proteccion: { player: [], enemy: [] }, furia: { player: [], enemy: [] },
    arcana: { player: [], enemy: [] }, fuego: { player: [], enemy: [] }, hielo: { player: [], enemy: [] },
    veneno: { player: [], enemy: [] }, combate: { player: [], enemy: [] }, sigilo: { player: [], enemy: [] },
  });

  // (a) el MÁS DÉBIL con poder > X → sobrevive con −X
  {
    const b = baseBoard();
    b.combate.player = [];
    b.combate.enemy = [mk("e1", 9), mk("e2", 3), mk("e3", 12)];
    const res = playCard(b, hand as never, 5, "player", "combate", hand[0] as never, null, null, 1);
    const surv = res.board.combate.enemy.find((c) => c.uid === "e2");
    const dead = res.removedCards.length === 0;
    assert(!!surv && surv.currentPower === 1 && dead, "débil (3) con remate 2 → queda en 1, NO muere");
    assert(!res.board.combate.enemy.some((c) => c.uid === "e3" && c.currentPower !== 12), "el más fuerte (12) NO es tocado");
  }
  // (b) el débil con poder ≤ X → DESTRUIDO
  {
    const b = baseBoard();
    b.combate.enemy = [mk("e1", 9), mk("e2", 2), mk("e3", 12)];
    const res = playCard(b, hand as never, 5, "player", "combate", hand[0] as never, null, null, 1);
    assert(res.removedCards.length === 1 && res.removedCards[0].uid === "e2" && res.removedCards[0].reason === "remate",
      "débil (2) con remate 2 → destruido");
  }
  // (c) apunta al MÁS DÉBIL aunque haya otros en rango (antes mataba al más fuerte candidato)
  {
    const b = baseBoard();
    b.combate.enemy = [mk("a", 2), mk("b", 1), mk("c", 9)];
    const res = playCard(b, hand as never, 5, "player", "combate", hand[0] as never, null, null, 1);
    assert(res.removedCards.length === 1 && res.removedCards[0].uid === "b", "remate elige al más débil (1), no al más fuerte en rango");
  }
}

// ---------------------------------------------------------------------------
section("3. Rareza MÍTICA + nuevos bonos por tier");
{
  assert(RARITY_ORDER[RARITY_ORDER.length - 1] === "mythic", "mítica es el último tier");
  assert(nextRarity("legendary") === "mythic" && nextRarity("mythic") === null, "cadena: legendary → mythic → ∅");

  const kwCard = ALL_CARDS_V3.find((c) => c.keyword === "refriega" && c.keywordValue === 2)!; // bandido
  const noValCard = ALL_CARDS_V3.find((c) => c.keyword === "purificacion")!;
  const plainCard = ALL_CARDS_V3.find((c) => !c.keyword) ?? noValCard;

  const rare = materializeCard(kwCard, "rare");
  const epic = materializeCard(kwCard, "epic");
  const leg = materializeCard(kwCard, "legendary");
  const myth = materializeCard(kwCard, "mythic");
  assert(rare.power === kwCard.power + 2 && rare.keywordValue === 2, "rara: +2 poder, keyword intacta");
  assert(epic.power === kwCard.power + 4 && epic.keywordValue === 2, "épica: +4 poder, keyword intacta");
  assert(leg.power === kwCard.power + 5 && leg.keywordValue === 3, "legendaria: +5 poder y +1 keyword");
  assert(myth.power === kwCard.power + 6 && myth.keywordValue === 5, "mítica: +6 poder y +3 keyword");
  assert(RARITY_BONUS.legendary.keyword === 1 && RARITY_BONUS.mythic.keyword === 3, "tabla de bonos 1/3");
  assert(materializeCard(kwCard, "common") === kwCard, "común devuelve la definición intacta");
  // keyword SIN valor (Purificación): solo poder
  const legNV = materializeCard(noValCard, "legendary");
  assert(legNV.power === noValCard.power + 5 && legNV.keywordValue === undefined, "purificación (sin valor): solo +5 poder");
  const mythPlain = materializeCard(plainCard, "mythic");
  assert(mythPlain.power === plainCard.power + 6, "carta sin keyword: solo +6 poder");

  // Las copias materializadas son SIEMPRE más fuertes que la forma anterior
  assert(myth.power > leg.power && leg.power > epic.power && epic.power >= rare.power, "progresión de poder monótona");

  // SINCRONIZACIÓN DE TEXTO POR RAREZA (reporte del jugador: «Colmillos
  // Curvos» legendaria tenía keyword 2 pero el texto decía «reduce en 1»):
  // los números del efecto derivan de X — al subir el X por rareza, el texto
  // se actualiza con él (y el 2X de fórmulas dobles también).
  const colmillos = ALL_CARDS_V3.find((c) => c.id === "colmillos_curvos")!; // veneno X=1
  const colLeg = materializeCard(colmillos, "legendary");
  assert(colLeg.keywordValue === 2, "Colmillos legendaria: X 1→2");
  assert(colLeg.text.includes("reduce en 2") && !colLeg.text.includes("reduce en 1"),
    `Colmillos legendaria: texto dice «reduce en 2» (${colLeg.text})`);
  const colMyth = materializeCard(colmillos, "mythic");
  assert(colMyth.keywordValue === 4 && colMyth.text.includes("reduce en 4"),
    `Colmillos mítica: texto dice «reduce en 4» (${colMyth.text})`);
  // Fórmula 2X (Combustión: salamandra X=2 → texto «reduce en 4» = 2X)
  const salamandra = ALL_CARDS_V3.find((c) => c.id === "salamandra_anciana")!;
  const salLeg = materializeCard(salamandra, "legendary");
  assert(salLeg.keywordValue === 3, "salamandra legendaria: X 2→3");
  assert(salLeg.text.includes("reduce en 6") && !salLeg.text.includes("reduce en 4"),
    `salamandra legendaria: 2X en texto 4→6 (${salLeg.text})`);
  // Remate doble mención (Hacha: «resta 2… si tiene 2 o menos»)
  const hacha = ALL_CARDS_V3.find((c) => c.id === "hacha_de_ejecucion")!;
  const hachaLeg = materializeCard(hacha, "legendary");
  assert(hachaLeg.text.includes("resta 3") && hachaLeg.text.includes("3 o menos"),
    `Hacha legendaria: ambas menciones X→3 (${hachaLeg.text})`);
  // La común sale INTACTA (misma referencia)
  assert(materializeCard(colmillos, "common") === colmillos, "común: texto intacto");
}

// ---------------------------------------------------------------------------
section("4. Fusión hasta MÍTICA en la colección");
{
  const store = useCollectionStore.getState();
  const id = ALL_CARDS_V3[0].id;
  // 3 legendaries → 1 mítica
  useCollectionStore.setState((s) => ({ copies: { ...s.copies, [id]: { legendary: 3 } } }));
  const st1 = useCollectionStore.getState();
  assert(st1.canFuse(id, "legendary"), "3 legendarias pueden fusionar");
  const target = st1.fuse(id, "legendary");
  assert(target === "mythic", "fusión legendaria → MÍTICA");
  const c = useCollectionStore.getState().copies[id];
  assert((c?.mythic ?? 0) === 1 && (c?.legendary ?? 0) === 0, "queda 1 mítica, 0 legendarias");
  assert(useCollectionStore.getState().tierRankOf(id) === 4, "tierRankOf mítica = 4");
  assert(useCollectionStore.getState().bestTier(id) === "mythic", "bestTier = mythic");
  assert(!useCollectionStore.getState().canFuse(id, "mythic"), "la mítica ya no fusiona");
  // limpieza
  useCollectionStore.setState((s) => ({ copies: { ...s.copies, [id]: {} } }));
}

// ---------------------------------------------------------------------------
section("5. NIVELES: XP, curva y mesas de drop");
{
  useStatsStore.setState({ level: 1, xp: 0, levelUpFlash: null });
  assert(xpForNext(1) === 10 && xpForNext(2) === 16 && xpForNext(5) === 34, "curva XP 10+6·(n−1)");
  // victoria: +6 XP (no sube aún)
  useStatsStore.getState().registerMatch("WIN", { cls: "guerrero", online: false });
  let st = useStatsStore.getState();
  assert(st.xp === 6 && st.level === 1, "victoria N1 = +6 XP");
  // derrota: +3 → 9
  useStatsStore.getState().registerMatch("LOSS", { online: false });
  st = useStatsStore.getState();
  assert(st.xp === 9, "derrota = +3 XP (acumula 9)");
  // otra victoria: +6 → 15 ≥ 10 → sube a N2 con 5 sobrantes
  useStatsStore.getState().registerMatch("WIN", { online: false });
  st = useStatsStore.getState();
  assert(st.level === 2 && st.xp === 5, "subida de nivel: 15 XP → N2 con 5 sobrantes");
  assert(!!st.levelUpFlash && st.levelUpFlash.to === 2, "levelUpFlash para celebrar en UI");
  // jefe ganado: 6 + 10 = 16 ≥ 16 → N3
  useStatsStore.getState().registerMatch("WIN", { online: false, boss: true });
  st = useStatsStore.getState();
  assert(st.level === 3, "victoria contra JEFE (+16 XP) sube a N3");

  // Mesas de drop: N1-2 solo comunes; legendarias aparecen en N7
  assert(dropTableFor(1).length === 1 && dropTableFor(1)[0][0] === "common", "N1: 100% comunes");
  assert(dropTableFor(3).some(([r]) => r === "rare"), "N3: entran las raras");
  assert(dropTableFor(5).some(([r]) => r === "epic"), "N5: entran las épicas");
  assert(dropTableFor(7).some(([r]) => r === "legendary"), "N7: entran las legendarias");
  assert(bonusDropCards(1) === 0 && bonusDropCards(5) === 1 && bonusDropCards(10) === 2, "+1 carta en N5, +2 en N10");

  // addRewards con bonusForLevel: 2 base + bonus de nivel
  useStatsStore.setState({ level: 5, xp: 0 });
  const col = useCollectionStore.getState();
  const before = col.totalCopies();
  col.addRewards(2, { bonusForLevel: true });
  assert(useCollectionStore.getState().totalCopies() === before + 3, "N5: victoria suelta 2+1=3 cartas");
  useStatsStore.setState({ level: 1, xp: 0 });
  useCollectionStore.setState(() => ({ copies: {} }));
  assert(XP_MISSION === 4, "las misiones también pagan XP");
}

// ---------------------------------------------------------------------------
section("6. MAZOS DE JEFE: 12 únicas, una sola spec, sin clonar combos");
{
  const comboKey = (c: CardDef) => `${c.cost}|${c.power}|${c.keyword ?? "-"}|${c.keywordValue ?? "-"}|${c.trigger ?? "-"}`;
  const catalogCombos = new Map<string, string>();
  for (const c of ALL_CARDS_V3) {
    const k = comboKey(c);
    if (catalogCombos.has(k)) {
      assert(false, `combo duplicado en catálogo: ${catalogCombos.get(k)} ≡ ${c.id} (${k})`);
    }
    catalogCombos.set(k, c.id);
  }
  assert(catalogCombos.size === ALL_CARDS_V3.length, `sin combos duplicados en las ${ALL_CARDS_V3.length} cartas (Bandido ≠ Mercenario)`);
  const bandido = ALL_CARDS_V3.find((c) => c.id === "bandido_de_la_ruta")!;
  const mercenario = ALL_CARDS_V3.find((c) => c.id === "mercenario_sin_bandera")!;
  assert(bandido.keyword !== mercenario.keyword && bandido.power !== mercenario.power,
    "Bandido y Mercenario ya NO son gemelos (efecto y poder distintos)");

  const themes: Record<string, LaneId> = { guerrero: "proteccion", mago: "hielo", asesino: "sigilo" };
  for (const [cls, spec] of Object.entries(themes)) {
    const deck = BOSS_DECKS[cls as keyof typeof BOSS_DECKS];
    assert(deck.length === 12, `${cls}: mazo de jefe con 12 cartas`);
    assert(new Set(deck.map((c) => c.id)).size === 12, `${cls}: 12 ids únicos`);
    assert(deck.every((c) => c.subtypes.includes(spec)), `${cls}: todo el mazo es ${spec}`);
    const combos = new Set(deck.map(comboKey));
    assert(combos.size === 12, `${cls}: sin combos repetidos dentro del mazo`);
    // todas en rango de balance
    const off = deck.filter((c) => !getBalanceInfo(c).balanced);
    assert(off.length === 0, `${cls}: 12/12 calibradas al PTP (±0.5)`);
  }
  // las cartas nuevas SON obtenibles por el jugador (pool de su clase)
  const sigiloNew = ["punialada_traicionera", "cuchilla_susurrante", "velo_nocturno", "cobro_por_encargo"];
  const hieloNew = ["aliento_gelido", "estatua_viviente", "cetro_de_escarcha", "granizo_defensivo"];
  const protNew = ["escudero_diligente", "torre_de_asedio_viviente", "paves_de_la_muralla", "juramento_de_acero"];
  const pools = {
    asesino: cardPoolForClass("asesino").map((c) => c.id),
    mago: cardPoolForClass("mago").map((c) => c.id),
    guerrero: cardPoolForClass("guerrero").map((c) => c.id),
  };
  assert(sigiloNew.every((id) => pools.asesino.includes(id)), "cartas nuevas de SIGILO en el pool del asesino");
  assert(hieloNew.every((id) => pools.mago.includes(id)), "cartas nuevas de HIELO en el pool del mago");
  assert(protNew.every((id) => pools.guerrero.includes(id)), "cartas nuevas de PROTECCIÓN en el pool del guerrero");
  assert(classCardsOf("asesino").length === 28 && classCardsOf("mago").length === 28 && classCardsOf("guerrero").length === 28,
    "28 cartas por clase (24 + 4 de jefe)");
}

// ---------------------------------------------------------------------------
section("7. PvP online: el token viaja por HEADER (fix del 'turno del rival')");
{
  // anfitrión crea la sala
  const created = handleLocalPvpApi("POST", "/api/pvp/rooms", {}, {
    name: "Anfitrion", gameClass: "guerrero",
  });
  const room = created.body as { code: string; token: string };
  assert(created.status === 201 && !!room.token, "sala creada (lado A)");
  // invitado entra
  const joined = handleLocalPvpApi("POST", `/api/pvp/rooms/${room.code}/join`, {}, {
    name: "Invitado", gameClass: "mago",
  });
  const jb = joined.body as { token: string };
  assert(joined.status === 200 && !!jb.token, "invitado unido (lado B)");
  // EL BUG: el invitado pollaea con el token en el HEADER (como hace fetch)
  const poll = handleLocalPvpApi("GET", `/api/pvp/rooms/${room.code}/state`, {}, undefined, {
    "x-pvp-token": jb.token,
  });
  assert(poll.status === 200, "GET state con token SOLO en header → 200 (antes 403 y la UI se congelaba)");
  const view = (poll.body as { view: { you: { side: string } } }).view;
  assert(view.you.side === "b", "la vista del invitado es del lado B");
  // el lado ACTIVO puede pasar el turno con token por header (el abridor es sorteo)
  const poll0 = handleLocalPvpApi("GET", `/api/pvp/rooms/${room.code}/state`, {}, undefined, { "x-pvp-token": jb.token });
  const active = (poll0.body as { view: { activeSide: "a" | "b" } }).view.activeSide;
  const activeToken = active === "b" ? jb.token : room.token;
  const pass = handleLocalPvpApi("POST", `/api/pvp/rooms/${room.code}/action`, {}, { action: { type: "pass" } }, {
    "x-pvp-token": activeToken,
  });
  assert(pass.status === 200, `acción (pass) con token por header → 200 (abre lado ${active})`);
  // token basura sigue rechazado
  const bad = handleLocalPvpApi("GET", `/api/pvp/rooms/${room.code}/state`, {}, undefined, { "x-pvp-token": "no-soy" });
  assert(bad.status === 403, "token inválido → 403");
}

// ---------------------------------------------------------------------------
section("8. sanitizeClientDeck acepta MÍTICA (colección online)");
{
  const pool = cardPoolForClass("guerrero");
  const deck = pool.slice(0, 12).map((c, i) => ({
    id: c.id,
    rarity: i === 0 ? "mythic" : i === 1 ? "legendary" : "common",
  }));
  const out = sanitizeClientDeck(deck, "guerrero");
  assert(!!out && out.length === 12, "deck con mítica valida");
  assert(out![0].rarity === "mythic" && out![0].power === pool[0].power + 6, "la mítica viaja como id+tier y se materializa +6");
  assert(out![1].keywordValue === (pool[1].keywordValue !== undefined ? pool[1].keywordValue! + 1 : undefined) || out![1].power === pool[1].power + 5,
    "la legendaria materializa +5 poder (+1 keyword si procede)");
}

// ---------------------------------------------------------------------------
section("9. Bots de la CAMPAÑA + temas de jefe");
{
  assert(rivalNameForStep(1).includes("Aprendiz de Guerrero"), "escalón 1 = Aprendiz de Guerrero");
  assert(rivalNameForStep(2).includes("Aprendiz de Mago"), "escalón 2 = Aprendiz de Mago");
  assert(rivalNameForStep(3).includes("Aprendiz de Asesino"), "escalón 3 = Aprendiz de Asesino");
  assert(CAMPAIGN_BOSS_THEMES.guerrero === "Protección" && CAMPAIGN_BOSS_THEMES.mago === "Hielo" && CAMPAIGN_BOSS_THEMES.asesino === "Sigilo",
    "tema del jefe por clase (Protección/Hielo/Sigilo)");
  assert(CAMPAIGN_BOSS_NAMES.asesino.startsWith("Vharos") && CAMPAIGN_BOSS_NAMES.mago.startsWith("Nyx") && CAMPAIGN_BOSS_NAMES.guerrero.startsWith("Korgath"),
    "nombres de jefes intactos");
  assert(CAMPAIGN_BOT_NAMES.guerrero === "Bram" && CAMPAIGN_BOT_NAMES.mago === "Iria" && CAMPAIGN_BOT_NAMES.asesino === "Kess",
    "nombres base de bots intactos");
}

// ---------------------------------------------------------------------------
// 10. Sanidad de fin de partida tras los cambios (motor completo)
section("10. Partida completa bot vs jugador scriptado sin errores");
{
  const mirror = CLASS_DECKS.guerrero;
  const board: Board = {
    armas: { player: [], enemy: [] }, proteccion: { player: [], enemy: [] }, furia: { player: [], enemy: [] },
    arcana: { player: [], enemy: [] }, fuego: { player: [], enemy: [] }, hielo: { player: [], enemy: [] },
    veneno: { player: [], enemy: [] }, combate: { player: [], enemy: [] }, sigilo: { player: [], enemy: [] },
  };
  let energy = 1;
  let crashed = false;
  try {
    for (let t = 1; t <= 6; t++) {
      const hand = mirror.slice(0, 4).map((c) => ({ ...c, uid: `p${t}-${c.id}`, handBonus: 0 }) as never);
      for (const card of hand) {
        const lane = (card as unknown as CardDef).subtypes[0] as keyof Board;
        const bonus: LaneBonus | null = null;
        if (!isCardCostAllowed((card as unknown as CardDef).cost, bonus)) continue;
        if (getFinalCost((card as unknown as CardDef).cost, bonus) > energy) continue;
        if (board[lane].player.length >= 4) continue;
        const res = playCard(board, hand, energy, "player", lane as never, card, bonus, null, 1);
        energy = res.remainingEnergy;
        board[lane] = res.board[lane];
      }
      energy = Math.min(6, t + 1);
    }
    const fin = computeFinalResult(board, ["armas", "proteccion", "furia"]);
    assert(fin.playerWins + fin.enemyWins + fin.draws === 3, "resultado final coherente (3 carriles)");
  } catch (err) {
    crashed = true;
    console.error("   crash:", (err as Error).message);
  }
  assert(!crashed, "6 turnos sin excepciones con las cartas retocadas");
}

console.log("\n════════════════════════════════════════");
console.log(`RESULTADO: ${passed} pasan · ${failed} fallan`);
if (failed > 0) process.exit(1);
console.log("✨ Coste 0, Remate nuevo, MÍTICA, niveles, jefes temáticos y PvP online verificados.");
