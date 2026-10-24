// ============================================================================
// AUDIT ARQUETIPOS — TEST DE IDENTIDAD DE KEYWORDS POR CLASE (2026-10)
// ============================================================================
// Ejecutar: bun scripts/audit-arquetipos.ts [N]
//
// Pregunta del jugador: «cada clase debería sentirse única, pero no hay un
// estilo de juego definido tipo arquetipo; al final solo se tiran cartas con
// inicio/fin de turno porque son las más fuertes».
//
// Este test mide tres capas:
//
//   PARTE A — ESTÁTICA (pool jugable de cada clase, classCardsOf):
//     · mix de triggers del pool (JUGAR/INICIO/FIN/MUERTE)
//     · VED = Valor Entregado Esperado por carta en una partida de 6 turnos
//       (poder + keywordValue × procs esperados × factor de alcance)
//     · MAZO ÓPTIMO = top-12 por VED → ¿qué % de su VED es inicio/fin?
//       (si el deckbuilding óptimo degenera en INICIO/FIN, aquí se ve)
//
//   PARTE B — DINÁMICA (simulación espejo IA-vs-IA por clase, ambos lados
//   con mazos oficiales I y II de la MISMA clase → todo el poder registrado
//   pertenece a esa clase):
//     · poder real movido por keyword y agregado POR TRIGGER
//     · noop% (oportunidades perdidas) por keyword
//     → la identidad REAL de cada clase sobre el tablero, no la del diseño
//
//   PARTE C — VEREDICTO: arquetipo intencional vs arquetipo medido, con el
//   índice de dominancia INICIO+FIN de cada capa.
// ============================================================================

import {
  classCardsOf,
  CLASS_DECKS,
  CLASS_DECKS_SECOND,
} from "../src/lib/game/cards";
import {
  KEYWORD_META,
  CLASS_META,
  type CardDef,
  type GameClass,
  type Keyword,
  type Trigger,
} from "../src/lib/game/types";
import {
  resetKeywordStats,
  keywordStatsSnapshot,
} from "../src/lib/game/keyword-stats";
import {
  createPvpState,
  joinPvpState,
  startPvpMatch,
  applyPvpAction,
  type PvpAction,
  type PvpSide,
  type PvpState,
} from "../src/lib/game/pvp";
import {
  planEnemyTurn,
  type Board,
  type ClassRulesState,
} from "../src/lib/game/engine";

// ============================================================================
// PARTE A — MODELO VED (Valor Entregado Esperado, partida de 6 turnos)
// ============================================================================

const MAX_T = 6;
const P_DEATH = 0.55; // prob. de que una carta viva alcance a morir con efecto

/** Turno esperado de jugada: la energía = nº de turno, así que una carta de
 *  coste c entra en su turno c (saturado a [1..6]). Heurística de curva. */
function expectedPlayTurn(cost: number): number {
  return Math.max(1, Math.min(MAX_T, cost));
}

/** Procs esperados por trigger dado el turno de entrada. */
function expectedProcs(trigger: Trigger, tPlay: number): number {
  switch (trigger) {
    case "on_play":
      return 1;
    case "start_turn":
      return MAX_T - tPlay; // dispara en t+1..6
    case "end_turn":
      return MAX_T - tPlay + 1; // dispara el mismo turno y en adelante
    case "on_death":
      return P_DEATH;
  }
}

/** Factor de alcance por keyword: cuántos "puntos de carril" mueve cada
 *  punto de X (self=1 · un objetivo=1 · AoE de carril≈2 · adyacente≈3.5 ·
 *  destrucción≈2.2 (remoción + valor de la baja) · mano≈2 · escudo masivo 1.8). */
const KW_FACTOR: Record<Keyword, number> = {
  none: 0,
  // neutrales
  fervor: 1, coraza: 1, insignia: 1, remate: 2.2, legado: 1.2, fortaleza: 2,
  // guerrero
  hender_armadura: 1, duelista: 1, amparo: 1.8, purificacion: 1.5, impetu: 1.5, crueldad: 1,
  orden_batalla: 2, custodia: 1.8, desafio: 1, estandarte: 2, muralla: 3, atropello: 1.3,
  // mago
  convergencia: 1.3, sobrecarga: 1, llamarada: 2, combustion: 1, escarcha: 1, ventisca: 2,
  drenar_poder: 1.3, detonacion: 2, ruptura_glacial: 1, eco: 1.5, ceniza: 2, esquirla: 1.3,
  // asesino
  veneno: 1, contagio: 1, refriega: 1.3, golpe_certero: 1, emboscada: 1.5, purga: 2.2,
  miasma: 2, caza_mayor: 1.5, conspiracion: 2, corrosion: 1, finta: 1, octava: 1.3,
  // botanico
  micelio: 1.5, estacion: 1, simbiosis: 1.3, floracion: 2, polen: 1, carnivora: 2.2,
  // pirata
  saqueo: 2.2, tripulacion: 1, motin: 1, contrabando: 1.5, canonazo: 3.5, andanada: 3.5,
  // tinker
  remache: 2, chatarra: 1.5, engranaje: 1, sobrecalentar: 1.5, torreta: 1, descarga: 2,
};

/** Valor fijo para keywords SIN [X] (por proc). */
const KW_FIXED_VALUE: Partial<Record<Keyword, number>> = {
  purificacion: 2, // limpia o escuda 2 por proc
  motin: 5, // swing medio del intercambio (one-shot)
};

function cardX(card: CardDef): number {
  const kw = (card.keyword ?? "none") as Keyword;
  if (kw === "none") return 0;
  if (KEYWORD_META[kw].hasValue) return card.keywordValue ?? 0;
  return KW_FIXED_VALUE[kw] ?? 0;
}

/** VED de una carta: poder base + valor entregado por su keyword. */
function ved(card: CardDef): number {
  const kw = (card.keyword ?? "none") as Keyword;
  const t = card.trigger ?? (kw !== "none" ? KEYWORD_META[kw].trigger : "on_play");
  const procs = expectedProcs(t, expectedPlayTurn(card.cost));
  const x = cardX(card);
  const factor = KW_FACTOR[kw] ?? 1;
  // Sobrecarga/Finta: el +2X/−X se compensa a neto ≈ X por proc
  const netMod = kw === "sobrecarga" ? 0.5 : kw === "finta" ? 0.5 : 1;
  return card.power + x * procs * factor * netMod;
}

const TRIGGER_ORDER: Trigger[] = ["on_play", "start_turn", "end_turn", "on_death"];
const TRIGGER_LABEL: Record<Trigger, string> = {
  on_play: "JUGAR",
  start_turn: "INICIO",
  end_turn: "FIN",
  on_death: "MUERTE",
};

// ============================================================================
// PARTE B — SIM (IA vs IA)
// ============================================================================

function otherSide(s: PvpSide): PvpSide {
  return s === "a" ? "b" : "a";
}

function planSide(state: PvpState, side: PvpSide): PvpAction[] {
  const me = state.players[side];
  const opp = state.players[otherSide(side)];

  const board = {} as Board;
  const bonuses = {} as import("../src/lib/game/types").LaneBonuses;
  const traps: Record<string, null> = {};
  me.lanes.forEach((laneId: import("../src/lib/game/types").LaneId, p: number) => {
    board[laneId] = {
      player: state.positions[p][otherSide(side)].map((c) => ({ ...c })),
      enemy: state.positions[p][side].map((c) => ({ ...c })),
    };
    bonuses[laneId] = state.positionBonuses[p];
    traps[laneId] = null;
  });

  const rules: ClassRulesState = {
    classes: { player: opp.gameClass, enemy: me.gameClass },
    comboPoints: {
      player: state.combo?.[otherSide(side)] ?? 0,
      enemy: state.combo?.[side] ?? 0,
    },
    lastSpec: {
      player: state.lastSpec?.[otherSide(side)] ?? null,
      enemy: state.lastSpec?.[side] ?? null,
    },
  };

  const plays = planEnemyTurn(board, me.hand, me.energy, bonuses, traps as never, me.lanes, rules);
  return plays.map((pl) => ({ type: "play" as const, uid: pl.card.uid, lane: pl.lane }));
}

/** Juega una partida con mazos explícitos y devuelve el resultado del lado A. */
function playDecks(clsA: GameClass, deckA: CardDef[], clsB: GameClass, deckB: CardDef[]): "WIN" | "LOSS" | "DRAW" {
  const state = createPvpState("SIM", { name: "A", gameClass: clsA, deck: deckA });
  joinPvpState(state, { name: "B", gameClass: clsB, deck: deckB });
  startPvpMatch(state);
  let guard = 0;
  while (state.phase === "playing" && guard++ < 300) {
    const side = state.activeSide;
    for (const action of planSide(state, side)) {
      try {
        applyPvpAction(state, side, action);
      } catch {
        break;
      }
    }
    if (state.phase !== "playing" || state.activeSide !== side) continue;
    applyPvpAction(state, side, { type: "pass" });
  }
  if (state.phase !== "ended") return "DRAW";
  return state.finalResultA!.result as "WIN" | "LOSS" | "DRAW";
}

function playGame(cls: GameClass): void {
  playDecks(cls, CLASS_DECKS[cls], cls, CLASS_DECKS[cls]);
}

function playGameDeck2(cls: GameClass): void {
  playDecks(cls, CLASS_DECKS_SECOND[cls], cls, CLASS_DECKS_SECOND[cls]);
}

/** Mapa keyword → trigger dominante dentro del pool de la clase. */
function kwTriggerMap(pool: CardDef[]): Map<string, Trigger> {
  const m = new Map<string, Trigger>();
  for (const c of pool) {
    const kw = c.keyword;
    if (!kw || kw === "none") continue;
    const t = c.trigger ?? KEYWORD_META[kw].trigger;
    if (!m.has(kw)) m.set(kw, t);
  }
  return m;
}

// ============================================================================
// EJECUCIÓN
// ============================================================================

const N = Number(process.argv[2] ?? 30);
const N_A2 = Number(process.argv[3] ?? 30);
const CLASSES: GameClass[] = ["guerrero", "mago", "asesino", "botanico", "pirata", "tinker"];

/** Set de keywords neutrales (cards.ts NEUTRAL_KEYWORD_IDS, replicado para no ciclar imports). */
const NEUTRAL_SET = new Set(["fervor", "coraza", "insignia", "remate", "legado", "fortaleza"]);

// Arquetipo INTENCIONAL (spec de diseño: tagline de CLASS_META + specs V3)
const ARQUETIPO: Record<GameClass, string> = {
  guerrero: "LÍNEA DE BATALLA — muro que avanza: escudos, rompe-armaduras y presión constante",
  mago: "RÁFAGA — golpes enormes y puntuales: burst arcano, AoE de fuego, control de hielo",
  asesino: "CAZA SELECTIVA — eliminar la pieza clave: veneno perforante, remates, escalada de mano",
  botanico: "ENJAMBRE TARDÍO — crecer para ganar el final: maduración, multitud, esporas",
  pirata: "SAQUEO — robar el poder rival: botín, motín y pólvora multi-carril",
  tinker: "MAQUINARIA — sinergia de Ítems: escudos en masa, engranajes y torreta anti-élite",
};

interface SimRow {
  kw: string;
  trigger: Trigger;
  triggers: number;
  noops: number;
  power: number;
  kills: number;
}

console.log("╔══════════════════════════════════════════════════════════════════╗");
console.log("║  AUDIT ARQUETIPOS — identidad de keywords por clase              ║");
console.log(`║  ${N} partidas espejo por clase (mitad mazo I, mitad mazo II)      ║`);
console.log("╚══════════════════════════════════════════════════════════════════╝\n");

const globalSummary: {
  cls: GameClass;
  poolShare: number; // % VED de inicio+fin en el pool
  topShare: number; // % VED de inicio+fin en el mazo óptimo top-12
  simShare: number; // % poder real de inicio+fin en la sim
  topKw: string;
}[] = [];

const a2Results: {
  cls: GameClass;
  wr: number; // winrate del mazo óptimo vs el oficial
  decided: number;
  draws: number;
  deck: Record<Trigger, { n: number; ved: number }>;
}[] = [];

const a3Results: { cls: GameClass; wr: number; decided: number; draws: number }[] = [];
const a4Results: { cls: GameClass; wr: number; decided: number; draws: number }[] = [];

for (const cls of CLASSES) {
  const pool = classCardsOf(cls);
  const meta = CLASS_META[cls];

  // ── PARTE A: mix de triggers del pool ──
  const poolMix: Record<Trigger, number> = { on_play: 0, start_turn: 0, end_turn: 0, on_death: 0 };
  for (const c of pool) {
    const t = c.trigger ?? (c.keyword && c.keyword !== "none" ? KEYWORD_META[c.keyword].trigger : "on_play");
    poolMix[t]++;
  }

  const vedRows = pool
    .map((c) => ({
      card: c,
      t: c.trigger ?? (c.keyword && c.keyword !== "none" ? KEYWORD_META[c.keyword].trigger : "on_play"),
      ved: ved(c),
    }))
    .sort((a, b) => b.ved - a.ved);

  const vedByTrigger: Record<Trigger, number> = { on_play: 0, start_turn: 0, end_turn: 0, on_death: 0 };
  for (const r of vedRows) vedByTrigger[r.t] += r.ved;
  const vedTotal = vedRows.reduce((a, r) => a + r.ved, 0) || 1;

  // Mazo óptimo top-12 por VED
  const top12 = vedRows.slice(0, 12);
  const top12ByTrigger: Record<Trigger, { n: number; ved: number }> = {
    on_play: { n: 0, ved: 0 }, start_turn: { n: 0, ved: 0 },
    end_turn: { n: 0, ved: 0 }, on_death: { n: 0, ved: 0 },
  };
  for (const r of top12) {
    top12ByTrigger[r.t].n++;
    top12ByTrigger[r.t].ved += r.ved;
  }
  const top12Ved = top12.reduce((a, r) => a + r.ved, 0) || 1;
  const topShare = ((top12ByTrigger.start_turn.ved + top12ByTrigger.end_turn.ved) / top12Ved) * 100;
  const poolShare = ((vedByTrigger.start_turn + vedByTrigger.end_turn) / vedTotal) * 100;

  // ── PARTE B: sim espejo ──
  resetKeywordStats();
  const half = Math.ceil(N / 2);
  for (let g = 0; g < N; g++) {
    if (g < half) playGame(cls);
    else playGameDeck2(cls);
  }
  const snap = keywordStatsSnapshot();
  const kwTrig = kwTriggerMap(pool);
  const games = N; // cada juego acumula ambos lados de la misma clase

  const rows: SimRow[] = Object.entries(snap).map(([kw, s]) => ({
    kw,
    trigger: kwTrig.get(kw) ?? KEYWORD_META[kw as Keyword]?.trigger ?? "on_play",
    triggers: s.triggers,
    noops: s.noops,
    power: s.power,
    kills: s.kills,
  }));

  const simByTrigger: Record<Trigger, { power: number; procs: number; noops: number }> = {
    on_play: { power: 0, procs: 0, noops: 0 },
    start_turn: { power: 0, procs: 0, noops: 0 },
    end_turn: { power: 0, procs: 0, noops: 0 },
    on_death: { power: 0, procs: 0, noops: 0 },
  };
  for (const r of rows) {
    simByTrigger[r.trigger].power += Math.abs(r.power);
    simByTrigger[r.trigger].procs += r.triggers;
    simByTrigger[r.trigger].noops += r.noops;
  }
  const simTotal = TRIGGER_ORDER.reduce((a, t) => a + simByTrigger[t].power, 0) || 1;
  const simShare = ((simByTrigger.start_turn.power + simByTrigger.end_turn.power) / simTotal) * 100;

  const sorted = [...rows].sort((a, b) => Math.abs(b.power) - Math.abs(a.power));
  const topKw = sorted.length ? `${sorted[0].kw} (${Math.round(Math.abs(sorted[0].power) / games)}/partida)` : "—";

  globalSummary.push({ cls, poolShare, topShare, simShare, topKw });

  // ── PARTE A2: ¿el mazo óptimo (top-12 VED) GANA al oficial? ──
  const optimalDeck = top12.map((r) => r.card);
  let optWins = 0, optLosses = 0, draws = 0;
  for (let g = 0; g < N_A2; g++) {
    const r1 = playDecks(cls, optimalDeck, cls, CLASS_DECKS[cls]);
    const r2 = playDecks(cls, CLASS_DECKS[cls], cls, optimalDeck);
    if (r1 === "WIN") optWins++; else if (r1 === "LOSS") optLosses++; else draws++;
    if (r2 === "LOSS") optWins++; else if (r2 === "WIN") optLosses++; else draws++;
  }
  const decided = optWins + optLosses;
  const optWr = decided > 0 ? (optWins / decided) * 100 : 50;
  a2Results.push({ cls, wr: optWr, decided, draws, deck: top12ByTrigger });

  // ── PARTE A3: el test DIRECTO del hipótesis del jugador — apilar INICIO+FIN
  // vs no apilar. Top-12 VED restringido a triggers repetidos VS top-12 VED
  // restringido a one-shot (JUGAR+MUERTE), mismo pool, misma IA. ──
  const stackDeck = vedRows.filter((r) => r.t === "start_turn" || r.t === "end_turn").slice(0, 12).map((r) => r.card);
  const oneshotDeck = vedRows.filter((r) => r.t === "on_play" || r.t === "on_death").slice(0, 12).map((r) => r.card);
  let sWins = 0, sLoss = 0, sDraws = 0;
  if (stackDeck.length >= 6 && oneshotDeck.length >= 6) {
    for (let g = 0; g < N_A2; g++) {
      const r1 = playDecks(cls, stackDeck, cls, oneshotDeck);
      const r2 = playDecks(cls, oneshotDeck, cls, stackDeck);
      if (r1 === "WIN") sWins++; else if (r1 === "LOSS") sLoss++; else sDraws++;
      if (r2 === "LOSS") sWins++; else if (r2 === "WIN") sLoss++; else sDraws++;
    }
  }
  const sDecided = sWins + sLoss;
  a3Results.push({ cls, wr: sDecided > 0 ? (sWins / sDecided) * 100 : 50, decided: sDecided, draws: sDraws });

  // ── PARTE A4: el all-in stack vs EL CAMPO REAL (mazos oficiales I y II).
  // Un arquetipo fuerte pero alcanzable es sano; lo degenerado es >60% vs campo.
  let aWins = 0, aLoss = 0, aDraws = 0;
  if (stackDeck.length >= 8) {
    const tally = (r: "WIN" | "LOSS" | "DRAW") => {
      if (r === "WIN") aWins++;
      else if (r === "LOSS") aLoss++;
      else aDraws++;
    };
    for (let g = 0; g < N_A2; g++) {
      // stack como lado A y como lado B (el stack es del MISMO cls que el oficial)
      tally(playDecks(cls, stackDeck, cls, CLASS_DECKS[cls]));
      tally(playDecks(cls, CLASS_DECKS[cls], cls, stackDeck));
      tally(playDecks(cls, stackDeck, cls, CLASS_DECKS_SECOND[cls]));
      tally(playDecks(cls, CLASS_DECKS_SECOND[cls], cls, stackDeck));
    }
  }
  const aDecided = aWins + aLoss;
  a4Results.push({ cls, wr: aDecided > 0 ? (aWins / aDecided) * 100 : 50, decided: aDecided, draws: aDraws });

  // ── REPORTE DE LA CLASE ──
  console.log(`━━━ ${meta.label.toUpperCase()} — "${meta.tagline}" ━━━`);
  console.log(`  Arquetipo intencional: ${ARQUETIPO[cls]}`);
  console.log(`  Pool ${pool.length} cartas · triggers: ${TRIGGER_ORDER.map((t) => `${TRIGGER_LABEL[t]} ${poolMix[t]} (${Math.round((poolMix[t] / pool.length) * 100)}%)`).join(" · ")}`);
  console.log(`  VED del pool: ${TRIGGER_ORDER.map((t) => `${TRIGGER_LABEL[t]} ${Math.round((vedByTrigger[t] / vedTotal) * 100)}%`).join(" · ")}`);
  console.log(`  MAZO ÓPTIMO (top-12 VED): ${TRIGGER_ORDER.filter((t) => top12ByTrigger[t].n > 0).map((t) => `${TRIGGER_LABEL[t]}×${top12ByTrigger[t].n}`).join(" + ")}`);
  console.log(`  → VED del mazo óptimo en INICIO+FIN: ${topShare.toFixed(0)}%${topShare >= 55 ? "  ⚠️ DEGENERACIÓN" : ""}`);

  console.log(`\n  SIM ESPEJO (${games} partidas) — poder movido POR TRIGGER:`);
  for (const t of TRIGGER_ORDER) {
    const s = simByTrigger[t];
    const pct = (s.power / simTotal) * 100;
    const noopPct = s.procs + s.noops > 0 ? Math.round((s.noops * 100) / (s.procs + s.noops)) : 0;
    const flag = t !== "on_play" && t !== "end_turn" && pct > 30 ? "  ⚠️" : t === "end_turn" && pct > 35 ? "  ⚠️" : "";
    console.log(
      `    ${TRIGGER_LABEL[t].padEnd(8)} ${String(Math.round(s.power)).padStart(6)}  ${pct.toFixed(1).padStart(5)}%  ·  ${s.procs} procs · noop ${noopPct}%${flag}`
    );
  }

  console.log(`\n  Top keywords reales (poder/partida):`);
  for (const r of sorted.slice(0, 6)) {
    const noopPct = r.triggers + r.noops > 0 ? Math.round((r.noops * 100) / (r.triggers + r.noops)) : 0;
    console.log(
      `    ${r.kw.padEnd(16)} ${TRIGGER_LABEL[r.trigger].padEnd(7)} ${String(Math.round(Math.abs(r.power) / games)).padStart(4)}/part · ${r.triggers} procs · noop ${noopPct}%`
    );
  }

  // Keywords EXCLUSIVAS de la clase ordenadas de más dormida a menos
  const exclKws = new Set<string>();
  for (const c of pool) {
    const kw = c.keyword;
    if (kw && kw !== "none" && !(NEUTRAL_SET as Set<string>).has(kw)) exclKws.add(kw);
  }
  const exclRows = sorted.filter((r) => exclKws.has(r.kw));
  const absent = [...exclKws].filter((kw) => !rows.some((r) => r.kw === kw));
  console.log(`  Exclusivas DORMIDAS (menos poder movido):`);
  for (const r of [...absent.map((kw) => ({ kw, power: 0, triggers: 0, noops: 0, trigger: kwTrig.get(kw) ?? "on_play" as Trigger })), ...exclRows].slice(0, 5)) {
    const noopPct = r.triggers + r.noops > 0 ? Math.round((r.noops * 100) / (r.triggers + r.noops)) : 0;
    console.log(
      `    ${r.kw.padEnd(16)} ${TRIGGER_LABEL[r.trigger as Trigger].padEnd(7)} ${String(Math.round(Math.abs(r.power) / games)).padStart(4)}/part · ${r.triggers} procs · noop ${noopPct}%`
    );
  }

  // Mazo óptimo con NOMBRES (para decidir nerfs quirúrgicos)
  console.log(`  Mazo óptimo: ${top12.map((r) => `${r.card.name} [${TRIGGER_LABEL[r.t]}]`).join(", ")}`);
  console.log("");
}

// ============================================================================
// PARTE C — VEREDICTO GLOBAL
// ============================================================================

console.log("═══ VEREDICTO — dominancia INICIO+FIN por capa ═══\n");
console.log(
  "CLASE".padEnd(10) +
  "POOL VED".padStart(10) +
  "MAZO ÓPTIMO".padStart(13) +
  "SIM REAL".padStart(10) +
  "  TOP KEYWORD REAL"
);
for (const s of globalSummary) {
  console.log(
    CLASS_META[s.cls].label.padEnd(10) +
    (s.poolShare.toFixed(0) + "%").padStart(10) +
    (s.topShare.toFixed(0) + "%").padStart(13) +
    (s.simShare.toFixed(0) + "%").padStart(10) +
    ("  " + s.topKw).padEnd(30)
  );
}
console.log(
  "\nLectura: si MAZO ÓPTIMO o SIM REAL superan ~55% en INICIO+FIN, el juego"
    + "\npremia apilar triggers repetidos y las demás keywords quedan decorativas."
);

console.log("\n═══ PARTE A2 — ¿apilar INICIO+FIN gana? (mazo óptimo VED vs oficial) ═══\n");
for (const r of a2Results) {
  const mix = TRIGGER_ORDER.filter((t) => r.deck[t].n > 0)
    .map((t) => `${TRIGGER_LABEL[t]}×${r.deck[t].n}`).join("+");
  const flag = r.wr >= 60 ? "  ⚠️ EL STACK GANA" : r.wr <= 40 ? "  (el óptimo pierde — VED sobrevalorado)" : "  ✓ competitivo";
  console.log(
    `${CLASS_META[r.cls].label.padEnd(10)} winrate óptimo ${(r.wr.toFixed(1) + "%").padStart(6)}  (${r.decided} decididas, ${r.draws} empates)  · mazo: ${mix}${flag}`
  );
}

console.log("\n═══ PARTE A3 — TEST DIRECTO: top-12 solo INICIO+FIN vs top-12 solo JUGAR+MUERTE ═══\n");
for (const r of a3Results) {
  const flag = r.decided === 0 ? "  (pool sin cartas suficientes en alguna capa)"
    : r.wr >= 60 ? "  ⚠️ APILAR GANA — hipótesis del jugador confirmada"
    : r.wr <= 40 ? "  (apilar PIERDE — los one-shot mandan)"
    : "  ✓ equilibrado";
  console.log(
    `${CLASS_META[r.cls].label.padEnd(10)} winrate del stack ${(r.wr.toFixed(1) + "%").padStart(6)}  (${r.decided} decididas, ${r.draws} empates)${flag}`
  );
}
console.log("\n═══ PARTE A4 — all-in stack (INICIO+FIN) vs CAMPO REAL (oficiales I+II) ═══\n");
for (const r of a4Results) {
  if (r.decided === 0) { console.log(`${CLASS_META[r.cls].label.padEnd(10)} (pool sin stack suficiente)`); continue; }
  const flag = r.wr >= 62 ? "  ⚠️ ARQUETIPO DEGENERADO vs campo" : r.wr >= 55 ? "  · fuerte pero alcanzable" : "  ✓ sano";
  console.log(
    `${CLASS_META[r.cls].label.padEnd(10)} winrate del stack ${(r.wr.toFixed(1) + "%").padStart(6)}  (${r.decided} decididas, ${r.draws} empates)${flag}`
  );
}
