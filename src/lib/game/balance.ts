// ===========================================================================
// GUERRERO TÁCTICO TCG - FÓRMULA MATEMÁTICA DE BALANCE DEFINITIVA
// ===========================================================================
// Poder_Base + Puntos_Efecto = PTP_Objetivo
//   • Poder_Base: Ataque directo de la carta (≥ 0).
//   • Puntos_Efecto: Valor numérico total de las habilidades y keywords.
//   • PTP_Obetivo: Bolsa de puntos fija que otorga el coste de energía.
//
// PTP_Obetivo = (Coste_Energía * 4.0) + 1.5
// Puntos_Efecto = SUMA(Valor_Keyword × Mod_Trigger × Mod_Scope × Mod_Once)
// ===========================================================================

import type { CardDef, Keyword, Trigger } from "./types";
import { KEYWORD_META, SCOPE_MODS, MOD_ONCE_PER_TURN, MOD_ONCE_SINGLE } from "./types";

// ----- Core formula constants -----
export const ENERGY_MULTIPLIER = 4.0;
export const BASE_ENTRY_POINTS = 1.5;
export const TOLERANCE = 0.5;

/**
 * Bolsa de Puntos Totales (PTP) que otorga un coste de energía dado.
 * PTP = (cost * 4.0) + 1.5
 *
 * Tabla de referencia:
 *   Coste 1:  5.5 PTP  (rango 5.0-6.0)
 *   Coste 2:  9.5 PTP  (rango 9.0-10.0)
 *   Coste 3: 13.5 PTP  (rango 13.0-14.0)
 *   Coste 4: 17.5 PTP  (rango 17.0-18.0)
 *   Coste 5: 21.5 PTP  (rango 21.0-22.0)
 */
export function getTargetPTP(energyCost: number): number {
  return energyCost * ENERGY_MULTIPLIER + BASE_ENTRY_POINTS;
}

/**
 * Rango legal de PTP para un coste dado (con tolerancia ±0.5).
 */
export function getPTPRange(energyCost: number): { min: number; max: number; target: number } {
  const target = getTargetPTP(energyCost);
  return {
    target,
    min: target - TOLERANCE,
    max: target + TOLERANCE,
  };
}

/**
 * Modificadores por trigger — cuánto multiplica el valor base del keyword
 * según CUÁNDO se dispara el efecto.
 *
 * After the simplification (user spec), only 4 triggers remain — all with
 * modifier 1.0 (the trigger no longer affects balance; only the keyword's
 * base value + scope + once-modifier matter).
 *
 * • ON_PLAY     = 1.0  (Efecto único instantáneo)
 * • START_TURN  = 1.0  (Se dispara cada inicio de turno)
 * • END_TURN    = 1.0  (Se dispara cada fin de turno)
 * • ON_DEATH    = 1.0  (Solo al morir)
 */
export function getTriggerModifier(trigger: Trigger | undefined): number {
  // After the simplification, only 4 triggers remain.
  // Modifiers are all 1.0 (per TRIGGER_MODS in types.ts).
  switch (trigger ?? "on_play") {
    case "on_play":
      return 1.0;
    case "start_turn":
      return 1.0;
    case "end_turn":
      return 1.0;
    case "on_death":
      return 1.0;
    default:
      return 1.0;
  }
}

/**
 * Valor base numérico de un keyword dado su tipo y magnitud (X).
 *
 * Heurística: estima cuánto "poder efectivo" aportaena la keyword si se
 * activara una vez en condiciones medias. El modificador del trigger se
 * aplica después en `calculateEffectPoints`.
 *
 * Notas:
 * - Para keywords con [X], el valor escala con X.
 * - Para keywords condicionales (Ventaja, Vanguardia, Aislado, Emboscada),
 *   se asume que la condición se cumple el ~50% de las veces, así que el
 *   valor base es X * 0.7 (reducido).
 * - Para keywords que re-distribuyen poder (Transferencia), el neto es 0 pero
 *   el "valor posicional" es X.
 */
export function getKeywordBaseValue(keyword: Keyword, magnitude?: number): number {
  const X = magnitude ?? 0;
  switch (keyword) {
    // I. ACTIVACIÓN DIRECTA (ON PLAY)
    case "sacrificio":
      // Sacrificio [X]: destruye aliado ≤X, ganas +X a sí misma.
      // El aliado perdido compensa parte del bonus. Valor neto: +X (el bonus).
      return X;
    case "remate":
      // Remate [X]: destruye enemigo con poder ≤ X. Valor = X (el daño/destrucción).
      return X;
    case "celeridad":
      // -1 al coste de la próxima carta (mín 1). Ahorro ~1 energía, valor ~1.5.
      return 1.5;
    case "sobrecarga":
      // -1 coste esta carta, -X energía próximo turno. El +X bonus a esta carta
      // compensa la penalización. Valor neto: +X (el bonus).
      return X;
    case "mimetismo":
      // Copia efecto del aliado más fuerte. Valor promedio = 4.
      return 4;
    // II. SINERGIA DE MANO Y POSICIÓN
    case "eco":
      // +X a cartas en mano que compartan subtipo/categoría. Asumiendo 1 carta
      // compartida en promedio (no 2). Valor = X.
      return X;
    case "refuerzo":
      // +X a una carta aliada. Valor = X.
      return X;
    case "ventaja":
      // +X condicional (si ally power < enemy). Asumimos 50% se cumple.
      return X * 0.7;
    case "vanguardia":
      // +X condicional (primera carta del turno). Asumimos 50%.
      return X * 0.7;
    case "aislado":
      // +X condicional (única aliada). Asumimos 50%.
      return X * 0.7;
    // III. TABLERO Y TRIGGERS ESPECIALES
    case "trampa":
      // -X a próxima carta enemiga aquí. Valor = X (el debuff).
      return X;
    case "reagrupar":
      // Mueve aliado más débil de otro carril. Valor posicional = 3.
      return 3;
    case "ultimo_aliento":
      // (On Death) +X a aliado. Valor = X.
      return X;
    case "baluarte":
      // (Passive) los aliados aquí no pueden ser debuffados. Aura valiosa.
      return 4;
    case "sigilo":
      // (Passive) primer turno inmune a efectos enemigos directos.
      return 3;
    case "vinculo":
      // (Passive) misma categoría → AMBAS ganan +X. Valor = X (solo self-bonus).
      return X;
    case "muro":
      // (Passive) el rival debe jugar aquí. Control posicional.
      return 3;
    case "retorno":
      // (On Death) si coste ≤ X, regresa a mano. Valor de recursión = X.
      return X;
    // IV. UMBRALES Y RECURSOS
    case "reciclar":
      // (On Death) recupera X energía. Valor = X.
      return X;
    // V. NUEVAS KEYWORDS TÁCTICAS
    case "doble_golpe":
      // -X aquí y en carril adyacente. Valor = 2*X (dos carriles).
      return 2 * X;
    case "refugio":
      // (Passive) absorbe hasta X debuff. Valor = X.
      return X;
    case "emboscada":
      // +X condicional (si lane enemigo lleno). Asumimos 30%.
      return X * 0.5;
    case "transferencia":
      // -X a aliado aquí, +X a aliado en otro carril. Neto = 0, valor
      // posicional = X.
      return X;
    case "renovacion":
      // (End Turn) descarta 1, roba X. Valor = X - 1 (la carta descartada).
      return Math.max(0, X - 1);

    // ====== 10 NUEVAS KEYWORDS (spec 2026-10) ======
    // Valor_Keyword asignado según especificación de balance. Para keywords con [X],
    // el valor escala con X; para keywords sin [X], se usa un valor fijo.
    case "sangrado":
      // Reducción progresiva de X por turno (persistente). Valor = X (el debuff por turno).
      return X;
    case "frenesi":
      // +X cada vez que se dispara su trigger (acumulativo). Valor = X por disparo.
      return X;
    case "enrabia":
      // +X una vez al recibir primer debuff. Valor = X (one-shot).
      return X;
    case "espinas":
      // -X al atacante que debuffea a esta carta. Valor = X (el counter-debuff).
      return X;
    case "cupula":
      // Cancela hasta X puntos de reducción. Valor = X (puntos de debuff absorbidos).
      return X;
    case "guardian":
      // Redirige debuffs a esta carta (sin [X]). Valor posicional = 4 (similar a Baluarte).
      return 4;
    case "perforacion":
      // Ignora hasta X de Prevención (Cúpula/Baluarte). Valor = X (el bypass).
      return X;
    case "desarme":
      // Reduce en X el keywordValue de carta enemiga. Valor = X (la reducción).
      return X;
    case "mejora":
      // +X permanente a aliada (no se pierde si la fuente muere). Valor = X.
      return X;
    case "none":
    default:
      return 0;
  }
}

/**
 * Calcula el total de "Puntos de Efecto" de una carta, sumando el valor base
 * de su keyword × el modificador del trigger × el modificador del scope × el modificador once.
 *
 * Fórmula completa (spec 2026-10):
 *   effectPoints = Valor_Keyword × Mod_Trigger × Mod_Scope × Mod_Once
 *
 * Mod_Once se deriva del trigger: start_turn/end_turn = 0.8 (repite cada turno), on_play/on_death = 1.0 (one-shot).
 * Mod_Scope se obtiene de SCOPE_MODS, defaulteando al scope del keyword si la carta no override.
 */
export function calculateEffectPoints(card: CardDef): number {
  const keyword = card.keyword ?? "none";
  if (keyword === "none") return 0;

  const baseValue = getKeywordBaseValue(keyword, card.keywordValue);
  // Trigger modifier (cuándo se dispara).
  const triggerMod = getTriggerModifier(card.trigger);
  // Scope modifier (dónde impacta). Defaulteamos al scope del keyword.
  const scope = card.scope ?? KEYWORD_META[keyword].scope ?? "PROPIO";
  const scopeMod = SCOPE_MODS[scope];
  // Once modifier (si el efecto se repite indefinidamente). Lo derivamos del trigger.
  // After the simplification: only start_turn / end_turn repeat each turn.
  const isRepeating = card.trigger === "start_turn" || card.trigger === "end_turn";
  const onceMod = isRepeating ? MOD_ONCE_PER_TURN : MOD_ONCE_SINGLE;
  return baseValue * triggerMod * scopeMod * onceMod;
}

/**
 * PTP actual de una carta = Poder_Base + Puntos_Efecto.
 */
export function getCurrentPTP(card: CardDef): number {
  return card.power + calculateEffectPoints(card);
}

export interface BalanceInfo {
  /** PTP objetivo según el coste de energía. */
  target: number;
  /** PTP actual de la carta. */
  current: number;
  /** Puntos provenientes solo del efecto (sin base power). */
  effectPoints: number;
  /** Rango legal [min, max] con tolerancia ±0.5. */
  range: { min: number; max: number };
  /** Diferencia entre actual y objetivo (positivo = sobrepasado, negativo = faltante). */
  delta: number;
  /** Valor absoluto de delta. */
  absDelta: number;
  /** True si |delta| ≤ TOLERANCE. */
  balanced: boolean;
  /** "balanced" (verde), "marginal" (amarillo, ±0.5-1.0), "unbalanced" (rojo, >1.0). */
  status: "balanced" | "marginal" | "unbalanced";
}

/**
 * Devuelve toda la información de balance de una carta en un solo objeto.
 * Útil para mostrar un resumen completo en la UI (deck editor, preview modal).
 */
export function getBalanceInfo(card: CardDef): BalanceInfo {
  const target = getTargetPTP(card.cost);
  const effectPoints = calculateEffectPoints(card);
  const current = card.power + effectPoints;
  const range = getPTPRange(card.cost);
  const delta = current - target;
  const absDelta = Math.abs(delta);
  let status: BalanceInfo["status"];
  if (absDelta <= TOLERANCE) status = "balanced";
  else if (absDelta <= TOLERANCE * 2) status = "marginal";
  else status = "unbalanced";
  return {
    target,
    current,
    effectPoints,
    range,
    delta,
    absDelta,
    balanced: absDelta <= TOLERANCE,
    status,
  };
}

/**
 * Comprueba si una carta está balanceada según la fórmula matemática.
 * Retorna `true` si |Poder_Base + Puntos_Efecto - PTP_Obetivo| ≤ TOLERANCE.
 */
export function isCardBalanced(card: CardDef): boolean {
  if (card.power < 0 || card.cost < 1) return false;
  return getBalanceInfo(card).balanced;
}

/**
 * Etiqueta legible para humanos del estado de balance.
 */
export function getBalanceStatusLabel(card: CardDef): string {
  const info = getBalanceInfo(card);
  switch (info.status) {
    case "balanced":
      return "Balanceada";
    case "marginal":
      return "Marginal";
    case "unbalanced":
      return info.delta > 0 ? "Sobrepuesta" : "Faltante";
  }
}

/**
 * Resumen agregado del balance de un conjunto de cartas (típicamente el mazo).
 */
export function getDeckBalanceSummary(cards: CardDef[]): {
  total: number;
  balanced: number;
  marginal: number;
  unbalanced: number;
  avgDelta: number;
} {
  if (cards.length === 0) {
    return { total: 0, balanced: 0, marginal: 0, unbalanced: 0, avgDelta: 0 };
  }
  let balanced = 0;
  let marginal = 0;
  let unbalanced = 0;
  let sumDelta = 0;
  for (const c of cards) {
    const info = getBalanceInfo(c);
    if (info.status === "balanced") balanced++;
    else if (info.status === "marginal") marginal++;
    else unbalanced++;
    sumDelta += info.delta;
  }
  return {
    total: cards.length,
    balanced,
    marginal,
    unbalanced,
    avgDelta: sumDelta / cards.length,
  };
}
