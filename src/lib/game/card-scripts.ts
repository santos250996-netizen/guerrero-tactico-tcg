// ============================================================================
// card-scripts.ts — ESCAPE HATCH «ESTILO EDOPRO» (Task 60)
// ============================================================================
// Motor híbrido: las ~108 cartas actuales viven en el pipeline de KEYWORDS
// (data-driven, auditable con audit-balance/keyword-stats). Este módulo añade
// la válvula de escape para los efectos ÚNICOS que ninguna keyword expresa:
// scripts individuales por carta, registrados aquí por defId.
//
// Contrato (3 hooks opcionales, inspirados en la propuesta EdoPro del jugador):
//   · canPlay(ctx)  → validación EXTRA para jugar la carta (coste/carril ya
//                     los valida playCard; aquí van condiciones propias).
//   · onPlay(ctx)   → efecto único DESPUÉS del pipeline de keywords.
//   · onEvent(ctx)  → reacción a start_turn / end_turn / on_death.
//
// REGLAS DE ORO para los scripts:
//   1. Los ctx entregan COPIAS frescas del motor → mutar en lugar es seguro
//      (playCard/applyStartTurn/applyEndTurn ya clonaron).
//   2. NUNCA re-aplicar poder que una keyword ya aplica (doble buff).
//   3. VFX visible = patrón Duelista: push en `mutations` (powerDelta 0 se
//      pinta como log) + entrada en `self.powerLog`. Sin mutation no hay float.
//   4. Determinismo: nada de Math.random dentro de onEvent de turno (rompe
//      replays de pvp); si un script necesita azar, que sea solo en onPlay.
//   5. Registro VACÍO = motor 100% keywords. El lookup falla en O(1) y el
//      coste de los hooks es cero — las cartas actuales no cambian NI UNA línea.
// ============================================================================

import type { Board, ClassRulesState, PlayResult } from "./engine"; // type-only: sin ciclo en runtime
import type { BoardCard, HandCard, LaneBonus, LaneId } from "./types";
import type { FxEvent } from "./fx";

/** Momentos del motor en los que una carta con script puede reaccionar. */
export type CardScriptEventKind = "start_turn" | "end_turn" | "on_death";

export interface CardScriptEvent {
  kind: CardScriptEventKind;
  /** Bando dueño del turno (start/end_turn) o de la carta muerta (on_death). */
  side: "player" | "enemy";
  /** Turno global de la partida en start_turn (0 = desconocido, tests legacy). */
  turnNumber: number;
  /** on_death: carril donde moría la carta. null en start/end_turn. */
  lane: LaneId | null;
  /** on_death: la carta que muere (puede ya no estar en el board). */
  deadCard: BoardCard | null;
}

/** Contexto de canPlay — SOLO LECTURA: mutar aquí no tiene efecto. */
export interface CardScriptCheckCtx {
  board: Readonly<Board>;
  hand: readonly HandCard[];
  energy: number;
  side: "player" | "enemy";
  lane: LaneId;
  laneBonus: LaneBonus | null;
  rules?: Readonly<ClassRulesState>;
}

/** Contexto de onPlay — board/hand/mutations son copias frescas mutables. */
export interface CardScriptPlayCtx {
  board: Board;
  hand: HandCard[];
  side: "player" | "enemy";
  lane: LaneId;
  /** Instancia recién colocada en el tablero (uid propio, ya en board). */
  self: BoardCard;
  /** Acumulador de mutaciones del PlayResult (patrón Duelista para VFX). */
  mutations: PlayResult["mutations"];
  rules?: ClassRulesState;
}

/** Entrada de log de un trigger (el cliente la pinta con su bando). */
export interface CardScriptLogEntry {
  side: "player" | "enemy" | "system";
  text: string;
}

/** Contexto de onEvent — board es la copia fresca del trigger, mutable. */
export interface CardScriptEventCtx {
  board: Board;
  /** La carta con script (en on_death puede ser la propia carta muerta). */
  self: BoardCard;
  event: CardScriptEvent;
  /** Log del trigger — añadir entradas aquí las pinta el cliente. */
  logs: CardScriptLogEntry[];
  /** Canal de VFX del trigger — añadir FxEvent aquí dispara animaciones. */
  fx: FxEvent[];
  rules?: ClassRulesState;
}

export interface CardScript {
  /** Validación extra para JUGAR la carta (lanza error el motor si es false). */
  canPlay?(ctx: CardScriptCheckCtx): boolean;
  /** Efecto único tras resolverse las keywords de la carta. */
  onPlay?(ctx: CardScriptPlayCtx): void;
  /** Reacción a start_turn / end_turn / on_death. */
  onEvent?(ctx: CardScriptEventCtx): void;
}

/**
 * REGISTRO CENTRAL: defId → script (el equivalente al CardRegistry de la
 * propuesta). Hoy VACÍO a propósito: la primera carta con efecto único que
 * ninguna keyword expresa se registra aquí, nada más.
 *
 * Ejemplo de referencia (comentado — así se estrena un script):
 *
 *   CARD_SCRIPTS["esbirro_huesudo"] = {
 *     canPlay: ({ energy }) => energy >= 3,
 *     onPlay: ({ self, mutations }) => {
 *       // Escudo propio 2 a la entrada (patrón Remache: mutation cosmética).
 *       self.shieldRemaining = (self.shieldRemaining ?? 0) + 2;
 *       self.powerLog = [...(self.powerLog ?? []), { source: "Ossario", delta: 0, kind: "buff" }];
 *       mutations.push({ side: "player", lane: "proteccion", uid: self.uid, powerDelta: 0, shieldDelta: 2 });
 *     },
 *     onEvent: ({ self, event, logs, fx }) => {
 *       if (event.kind === "start_turn" && event.side === "player") {
 *         self.currentPower += 1; // +1 cada amanecer (efecto ÚNICO, sin keyword)
 *         logs.push({ side: "system", text: "esbirro_huesudo se nutre del alba (+1)" });
 *         fx.push({ kind: "keyword", keyword: "fervor", lane: "proteccion", side: "player", sourceUid: self.uid });
 *       }
 *     },
 *   };
 */
export const CARD_SCRIPTS: Record<string, CardScript> = {};

/** Lookup O(1) — undefined si la carta no tiene script (caso de las 108). */
export function scriptOf(defId: string): CardScript | undefined {
  return CARD_SCRIPTS[defId];
}
