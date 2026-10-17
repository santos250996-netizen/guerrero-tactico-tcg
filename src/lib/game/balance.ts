// ===========================================================================
// GUERRERO TÁCTICO TCG — FÓRMULA DE BALANCE (V2, keywords 2026-10)
// ===========================================================================
// Poder_Base + Puntos_Efecto = PTP_Objetivo
//   • Poder_Base: Ataque directo de la carta (≥ 0).
//   • Puntos_Efecto: Valor numérico total de las keywords.
//   • PTP_Objetivo: Bolsa de puntos fija que otorga el coste de energía.
//
// PTP_Objetivo = (Coste_Energía * 4.0) + 1.5
// Puntos_Efecto = Valor_Keyword × Mod_Scope × Mod_Once
//
// Mod_Once: efectos por turno (start_turn/end_turn) × 0.8; one-shot × 1.0.
// ===========================================================================

import type { CardDef, Keyword, Trigger, ScopeKind } from "./types";
import { KEYWORD_META, SCOPE_MODS, MOD_ONCE_PER_TURN, MOD_ONCE_SINGLE } from "./types";

// ----- Core formula constants -----
export const ENERGY_MULTIPLIER = 4.0;
export const BASE_ENTRY_POINTS = 1.5;
export const TOLERANCE = 0.5;

/** Bolsa de Puntos Totales (PTP) que otorga un coste de energía dado. */
export function getTargetPTP(energyCost: number): number {
  return energyCost * ENERGY_MULTIPLIER + BASE_ENTRY_POINTS;
}

/** Rango legal de PTP para un coste dado (con tolerancia ±0.5). */
export function getPTPRange(energyCost: number): { min: number; max: number; target: number } {
  const target = getTargetPTP(energyCost);
  return {
    target,
    min: target - TOLERANCE,
    max: target + TOLERANCE,
  };
}

/** Modificador por repetición: start_turn/end_turn son efectos peri-turno. */
export function getOnceModifier(trigger: Trigger | undefined): number {
  if (trigger === "start_turn" || trigger === "end_turn") return MOD_ONCE_PER_TURN;
  return MOD_ONCE_SINGLE;
}

/**
 * Valor base de cada keyword V2 para X = 1 (multiplicar por keywordValue).
 * Purificación no lleva [X] — valor fijo 2 (utilidad constante).
 */
export const KEYWORD_BASE_VALUES: Record<Keyword, number> = {
  none: 0,
  // --- Neutrales ---
  fervor: 3.0, // +X/turno acumulativo: ~3-5 turnos de vida media
  coraza: 1.0, // absorbe X puntos one-shot
  insignia: 1.0, // +X permanente one-shot a un aliado
  remate: 2.0, // destrucción condicional (vale ~2× el poder rematado)
  legado: 1.0, // +X permanente condicional al morir
  fortaleza: 2.5, // +X/turno a TODO el carril (escala con nº de cartas)
  // --- Guerrero ---
  hender_armadura: 1.2, // como debuff one-shot + prima por perforar escudos
  duelista: 2.5, // +X/turno condicional (única en carril)
  amparo: 0.8, // escudo X por aliado (depende de tablero propio)
  purificacion: 2.0, // utilidad fija (restaura debuffs)
  impetu: 1.5, // +X por carta jugada ese turno (1-3 típico)
  crueldad: 2.0, // −X/turno al más débil (presión constante)
  // --- Mago V3 (Burst) ---
  convergencia: 1.0, // +X por aliado propio ya en carril (0-3 típico)
  sobrecarga: 1.5, // neto +X pero frontloaded +2X (prima burst)
  llamarada: 1.5, // −X AoE one-shot (media ~1.8 objetivos)
  combustion: 1.0, // −2X al morir perforando (condicional on_death)
  escarcha: 1.5, // escudo renovable hasta X cada turno
  ventisca: 1.5, // −X AoE cada fin de turno (desgaste)
  // --- Asesino V3 (Precisión) ---
  veneno: 2.0, // −X/turno perforante al más fuerte (anti-tanque)
  contagio: 1.5, // −X/turno condicional al más envenenado
  refriega: 1.0, // +X por enemigo en carril (anti-numbers)
  golpe_certero: 1.0, // −X one-shot honesto (escudos absorben)
  emboscada: 1.5, // media entre +2X (1ª carta) y +X
  purga: 1.8, // destrucción del más débil ≤X (algo más fácil que Remate)
};

export function getKeywordBaseValue(keyword: Keyword, magnitude?: number): number {
  const base = KEYWORD_BASE_VALUES[keyword] ?? 0;
  const hasValue = keyword !== "none" ? KEYWORD_META[keyword].hasValue : false;
  if (!hasValue) return base;
  return base * (magnitude ?? 1);
}

/**
 * Puntos de efecto de una carta según su keyword, valor X, trigger y scope.
 */
export function calculateEffectPoints(card: CardDef): number {
  const keyword: Keyword = card.keyword ?? "none";
  if (keyword === "none") return 0;
  const meta = KEYWORD_META[keyword];
  const trigger: Trigger = card.trigger ?? meta.trigger;
  const scope: ScopeKind = card.scope ?? meta.scope;
  const scopeMod = SCOPE_MODS[scope] ?? 1.0;
  const onceMod = getOnceModifier(trigger);
  return getKeywordBaseValue(keyword, card.keywordValue) * scopeMod * onceMod;
}

/** PTP actual de una carta (base + efectos). */
export function getCurrentPTP(card: CardDef): number {
  return card.power + calculateEffectPoints(card);
}

export interface BalanceInfo {
  cost: number;
  targetPTP: number;
  currentPTP: number;
  delta: number;
  balanced: boolean;
  status: "ok" | "over" | "under";
}

export function getBalanceInfo(card: CardDef): BalanceInfo {
  const range = getPTPRange(card.cost);
  const current = getCurrentPTP(card);
  const delta = current - range.target;
  const balanced = current >= range.min && current <= range.max;
  return {
    cost: card.cost,
    targetPTP: range.target,
    currentPTP: current,
    delta,
    balanced,
    status: balanced ? "ok" : delta > 0 ? "over" : "under",
  };
}

export function isCardBalanced(card: CardDef): boolean {
  return getBalanceInfo(card).balanced;
}

export function getBalanceStatusLabel(card: CardDef): string {
  const info = getBalanceInfo(card);
  if (info.status === "ok") return "Balanceada";
  if (info.status === "over") return `Sobre-balanceada (+${info.delta.toFixed(1)})`;
  return `Sub-balanceada (${info.delta.toFixed(1)})`;
}

/** Resumen de balance de un mazo completo. */
export function getDeckBalanceSummary(cards: CardDef[]): {
  balanced: number;
  over: number;
  under: number;
  details: { name: string; status: string }[];
} {
  let balanced = 0;
  let over = 0;
  let under = 0;
  const details: { name: string; status: string }[] = [];
  for (const card of cards) {
    const info = getBalanceInfo(card);
    if (info.status === "ok") balanced++;
    else if (info.status === "over") over++;
    else under++;
    details.push({ name: card.name, status: getBalanceStatusLabel(card) });
  }
  return { balanced, over, under, details };
}
