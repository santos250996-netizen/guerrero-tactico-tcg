// ============================================================================
// GUERRERO TÁCTICO — SISTEMA DE FX (efectos ambientales + VFX de keywords)
// ============================================================================
// Este módulo es PURO (sin DOM): lo usan el engine (servidor/Node incluido)
// para DESCRIBIR efectos visuales, y FxLayer.tsx (cliente) para PINTARLOS en
// una capa única de canvas.
//
//   engine.ts  ──(TriggerResult.fx / PlayResult.shieldAbsorbed)──▶
//   gameStore / pvpStore ──(emitFx)──▶ fxBus ──▶ FxLayer (canvas)
//
// Reglas de temporización:
//   - Los eventos se emiten ANTES del set() del store cuando destruyen cartas
//     (los rects del DOM aún existen → anclaje preciso).
//   - delayMs da tiempo a React a montar cartas nuevas antes de anclarlas.
//   - Si un uid no está en el DOM, FxLayer hace fallback al rect del carril.
// ============================================================================

import type { Keyword, LaneId } from "./types";

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------

export type FxKind = "keyword" | "play" | "destroy" | "shieldBlock" | "trap" | "mutation";

/**
 * Un efecto visual puntual. `side` = bando dueño de las cartas afectadas
 * (NO el actor): define sobre qué mitad del carril se pinta.
 *   - solitario: `lane` (LaneId de la partida) ancla a [data-lane-id].
 *   - PvP: `lanePos` (0-2 posicional) + side absoluto → el cliente lo mapea a
 *     [data-pvp-lane="me-X" | "rival-X"] según su propia vista.
 */
export interface FxEvent {
  kind: FxKind;
  /** Keyword disparadora (elige la receta en KEYWORD_FX). */
  keyword?: Keyword;
  /** Solitario: carril de la partida. */
  lane?: LaneId;
  /** PvP: posición 0-2 (el carril viaja con claves propias por jugador). */
  lanePos?: number;
  /** Bando dueño de las cartas afectadas. */
  side?: "player" | "enemy";
  /** Carta origen del efecto (p.ej. la que muere con Legado). */
  sourceUid?: string;
  /** Cartas afectadas (anclaje preciso por [data-card-uid]). */
  targetUids?: string[];
  /** Valor [X] implicado (para escalar intensidad). */
  value?: number;
  /** Retardo antes de resolver anclas + pintar (ms). */
  delayMs?: number;
}

// ---------------------------------------------------------------------------
// Recetas visuales
// ---------------------------------------------------------------------------

/** Primitivas que sabe pintar FxLayer por keyword. */
export type FxRecipe =
  // neutrales
  | "buff_up" // fervor — ascenso de energía + pulso
  | "shield_ring" // coraza — anillo de escudo
  | "award_burst" // insignia — ráfaga dorada al aliado débil
  | "destroy_slash" // remate — tajo + calavera
  | "spirit_transfer" // legado — espíritu vuela de la muerta al aliado
  | "fortify_sweep" // fortaleza — barrido potenciador por el carril
  // guerrero
  | "armor_break" // hender armadura — esquirlas perforantes
  | "sword_glint" // duelista — destello de esgrima
  | "bless_rings" // amparo — anillos de protección a los aliados
  | "cleanse" // purificación — chispas que restauran
  | "rage_burst" | "target_debuff" // ímpetu / crueldad
  // mago
  | "arcane_converge" // convergencia — maná vuela hacia la carta nueva
  | "overload_burst" | "overload_decay" // sobrecarga al jugar / disiparse
  | "flame_sweep" | "explosion" // llamarada / combustión
  | "frost_renew" | "frost_sweep" // escarcha / ventisca
  // asesino
  | "poison_drip" | "poison_spread" // veneno / contagio
  | "clash_multi" | "crosshair" // refriega / golpe certero
  | "shadow_blink" | "skull_burst" // emboscada / purga
  // genéricos
  | "shield_flash" | "trap_burst" | "play_dust" | "shatter";

export const KEYWORD_FX: Record<Keyword, FxRecipe | null> = {
  none: null,
  // neutrales
  fervor: "buff_up",
  coraza: "shield_ring",
  insignia: "award_burst",
  remate: "destroy_slash",
  legado: "spirit_transfer",
  fortaleza: "fortify_sweep",
  // guerrero
  hender_armadura: "armor_break",
  duelista: "sword_glint",
  amparo: "bless_rings",
  purificacion: "cleanse",
  impetu: "rage_burst",
  crueldad: "target_debuff",
  // mago
  convergencia: "arcane_converge",
  sobrecarga: "overload_burst",
  llamarada: "flame_sweep",
  combustion: "explosion",
  escarcha: "frost_renew",
  ventisca: "frost_sweep",
  // asesino
  veneno: "poison_drip",
  contagio: "poison_spread",
  refriega: "clash_multi",
  golpe_certero: "crosshair",
  emboscada: "shadow_blink",
  purga: "skull_burst",
};

// ---------------------------------------------------------------------------
// Ambiente por carril (partículas continuas)
// ---------------------------------------------------------------------------

export type AmbientRecipe =
  | "motes" // armas — motas ámbar flotando
  | "light" // protección — halo celestial suave
  | "embers" // furia — brasas rosadas ascendiendo
  | "arcane" // arcana — destellos violeta titilando
  | "flames" // fuego — chispas naranjas veloces
  | "snow" // hielo — copos cayendo
  | "bubbles" // veneno — burbujas lima
  | "clash" // combate — motas rojas agitadas
  | "mist"; // sigilo — bruma índigo

export const LANE_AMBIENT: Record<LaneId, AmbientRecipe> = {
  armas: "motes",
  proteccion: "light",
  furia: "embers",
  arcana: "arcane",
  fuego: "flames",
  hielo: "snow",
  veneno: "bubbles",
  combate: "clash",
  sigilo: "mist",
};

// ---------------------------------------------------------------------------
// Bus de eventos (pub/sub singleton del cliente)
// ---------------------------------------------------------------------------

type FxListener = (events: FxEvent[]) => void;

const listeners = new Set<FxListener>();

/** Emite una tanda de eventos FX (no-op seguro si viene vacío/undefined). */
export function emitFx(events: FxEvent[] | null | undefined): void {
  if (!events || events.length === 0) return;
  for (const fn of listeners) {
    try {
      fn(events);
    } catch {
      // un listener roto nunca tumba el juego
    }
  }
}

/** Suscribe el renderizador. Devuelve la función de des-suscripción. */
export function subscribeFx(fn: FxListener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// ---------------------------------------------------------------------------
// Constructores de eventos desde resultados del engine
// ---------------------------------------------------------------------------

/** Keywords cuyo efecto escala sobre SÍ MISMA (bonusPower, sin mutaciones). */
const SELF_SCALING_KEYWORDS = new Set<Keyword>([
  "impetu",
  "convergencia",
  "sobrecarga",
  "refriega",
  "emboscada",
]);

interface PlayResultLike {
  playedCard: { uid: string; keyword?: Keyword };
  mutations: { side: "player" | "enemy"; lane: LaneId; uid: string; powerDelta: number; shieldDelta?: number }[];
  removedCards: { side: "player" | "enemy"; lane: LaneId; uid: string; reason: string }[];
  trapTriggered: boolean;
  shieldAbsorbed?: { side: "player" | "enemy"; lane: LaneId; uid: string; absorbed: number }[];
}

/**
 * Construye los FxEvents de una carta jugada (on_play).
 * Llamar ANTES del set() del store para que los rects de cartas destruidas
 * sigan en el DOM.
 */
export function eventsFromPlayResult(
  res: PlayResultLike,
  lane: LaneId,
  actorSide: "player" | "enemy"
): FxEvent[] {
  const events: FxEvent[] = [];
  const keyword = res.playedCard.keyword ?? "none";
  const recipe = KEYWORD_FX[keyword];

  // 1. Colocación de la carta (genérico, sutil)
  events.push({
    kind: "play",
    lane,
    side: actorSide,
    sourceUid: res.playedCard.uid,
    delayMs: 200,
  });

  if (recipe && keyword !== "none") {
    // 2. Mutaciones agrupadas por bando → un evento por grupo
    const bySide = new Map<"player" | "enemy", string[]>();
    for (const m of res.mutations) {
      const arr = bySide.get(m.side) ?? [];
      arr.push(m.uid);
      bySide.set(m.side, arr);
    }
    const groups = [...bySide.entries()];

    if (groups.length > 0) {
      for (const [side, uids] of groups) {
        events.push({
          kind: "keyword",
          keyword,
          lane,
          side,
          targetUids: uids,
          value: undefined,
          delayMs: 120,
        });
      }
    } else if (res.removedCards.length > 0) {
      // 2b. Keywords de destrucción (Remate/Purga): el objetivo es la carta
      // que MUERE, no la que juega — un evento por bando afectado.
      const destroyedBySide = new Map<"player" | "enemy", string[]>();
      for (const rc of res.removedCards) {
        const arr = destroyedBySide.get(rc.side) ?? [];
        arr.push(rc.uid);
        destroyedBySide.set(rc.side, arr);
      }
      for (const [side, uids] of destroyedBySide) {
        events.push({
          kind: "keyword",
          keyword,
          lane,
          side,
          targetUids: uids,
          delayMs: 120,
        });
      }
    } else {
      // 3. Sin mutaciones → efecto sobre sí misma (o escudo propio)
      events.push({
        kind: "keyword",
        keyword,
        lane,
        side: actorSide,
        targetUids: [res.playedCard.uid],
        delayMs: 220, // React aún monta la carta nueva
      });
    }
  }

  // 4. Destrucciones (shatter genérico + la receta de la keyword ya remata)
  for (const rc of res.removedCards) {
    events.push({
      kind: "destroy",
      lane,
      side: rc.side,
      targetUids: [rc.uid],
      delayMs: 180,
    });
  }

  // 5. Escudos que absorbieron (Golpe Certero / Llamarada vía viaDebuff)
  for (const sb of res.shieldAbsorbed ?? []) {
    events.push({
      kind: "shieldBlock",
      lane,
      side: sb.side,
      targetUids: [sb.uid],
      value: sb.absorbed,
      delayMs: 120,
    });
  }

  // 5b. JUICE FÍSICO: mutaciones de poder → hit-flash + knockback (delta<0)
  //     o pulso de buff (delta>0) sobre la carta afectada. Lo pinta el
  //     CardJuiceLayer (DOM) — el canvas de keywords ya añade las partículas.
  {
    const hitBySide = new Map<"player" | "enemy", string[]>();
    const buffBySide = new Map<"player" | "enemy", string[]>();
    for (const m of res.mutations) {
      if (m.powerDelta === 0) continue;
      const map = m.powerDelta < 0 ? hitBySide : buffBySide;
      const arr = map.get(m.side) ?? [];
      arr.push(m.uid);
      map.set(m.side, arr);
    }
    for (const [side, uids] of hitBySide) {
      events.push({ kind: "mutation", lane, side, targetUids: uids, value: -1, delayMs: 150 });
    }
    for (const [side, uids] of buffBySide) {
      events.push({ kind: "mutation", lane, side, targetUids: uids, value: 1, delayMs: 150 });
    }
  }

  // 6. Trampa
  if (res.trapTriggered) {
    events.push({ kind: "trap", lane, side: actorSide, delayMs: 140 });
  }

  return events;
}
