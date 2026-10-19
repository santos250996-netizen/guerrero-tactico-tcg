// ===========================================================================
// LA CAMPAÑA — escalera de guerra del MODO HISTORIA (lógica PURA, sin stores)
// ===========================================================================
// Un solo camino de 15 escalones con 3 JEFES integrados como muros (5, 10 y
// 15). Ya no existe el botón "Desafiar al Jefe": el jefe EMERGE del progreso.
//
// Reglas de diseño (acordadas con el jugador):
//  • GLOBAL: una sola escalera compartida por las 3 clases (la colección es
//    global; la clase solo elige tu héroe).
//  • El rival de cada escalón es DETERMINÍSTICO (clase + mazo fijos por
//    escalón): reintentar el escalón 7 siempre es el mismo rival con nueva
//    barajada — la campaña se siente escrita, no aleatoria.
//  • Dificultad: el tier de material del mazo rival escala con el escalón
//    (común → raro → épico) y sube otro peldaño en cada PRESTIGIO (tope
//    legendaria). Los jefes juegan su mazo temático épico (legendaria en
//    prestigio).
//  • Botín y XP escalan: más cartas y más XP cuanto más alto el escalón; la
//    mesa de drops usa max(nivel, escalón+2) para que avanzar se SIENTA.
//  • Al perder NO retrocedes: repites el mismo escalón.
//  • Escalón 15 vencido → CAMPAÑA COMPLETADA ★ Prestigio+1 y la escalera
//    recomienza con rivales reforzados (bucle infinito).
// ===========================================================================

import type { GameClass, Rarity } from "./types";
import { CLASS_META } from "./types";
import { nextRarity } from "./balance";

/** Longitud de la escalera (escalones por vuelta de campaña). */
export const CAMPAIGN_STEPS = 15;

/** Escalones donde el JEFE bloquea el paso. */
export const CAMPAIGN_BOSS_STEPS: readonly number[] = [5, 10, 15];

/** Jefe de cada escalón-jefe (índice paralelo a CAMPAIGN_BOSS_STEPS). */
const CAMPAIGN_BOSS_ORDER: readonly GameClass[] = ["guerrero", "mago", "asesino"];

/** Nombre corto de cada bot de la escalera (el título depende del escalón). */
export const CAMPAIGN_BOT_NAMES: Record<GameClass, string> = {
  guerrero: "Bram",
  mago: "Iria",
  asesino: "Kess",
};

/** Jefes de la campaña (mazo temático propio + jugada gratis + 3 bonos). */
export const CAMPAIGN_BOSS_NAMES: Record<GameClass, string> = {
  guerrero: "Korgath, Coloso de Hierro",
  mago: "Nyx, Reina de Escarcha",
  asesino: "Vharos, Sombra Primigenia",
};

/** Tema del mazo del jefe de cada clase (coincide con BOSS_DECKS en cards.ts). */
export const CAMPAIGN_BOSS_THEMES: Record<GameClass, string> = {
  guerrero: "Protección",
  mago: "Hielo",
  asesino: "Sigilo",
};

const RIVAL_ROTATION: readonly GameClass[] = ["guerrero", "mago", "asesino"];

// ── Estructura de la escalera ──────────────────────────────────────────────

/** ¿Es este escalón un muro de JEFE? */
export function isBossStep(step: number): boolean {
  return CAMPAIGN_BOSS_STEPS.includes(step);
}

/** Clase del JEFE que bloquea un escalón-jefe (null si el escalón es normal). */
export function bossClassForStep(step: number): GameClass | null {
  const idx = CAMPAIGN_BOSS_STEPS.indexOf(step);
  return idx >= 0 ? CAMPAIGN_BOSS_ORDER[idx] : null;
}

/** Clase del rival normal de un escalón (rotación fija — determinista). */
export function rivalClassForStep(step: number): GameClass {
  return RIVAL_ROTATION[(step - 1) % RIVAL_ROTATION.length];
}

/** Mazo del rival normal (de los 2 oficiales de su clase) — determinista. */
export function rivalDeckIndexForStep(step: number): 0 | 1 {
  return (Math.floor(step / 2) % 2) as 0 | 1;
}

/** Título del bot según el tramo de la escalera: la carrera se SIENTE. */
export function botTitleForStep(step: number): string {
  if (step >= 11) return "Campeón";
  if (step >= 6) return "Veterano";
  return "Aprendiz";
}

/** Nombre completo para mostrar del rival de un escalón (normal o jefe). */
export function rivalNameForStep(step: number): string {
  const boss = bossClassForStep(step);
  if (boss) return CAMPAIGN_BOSS_NAMES[boss];
  const cls = rivalClassForStep(step);
  return `${CAMPAIGN_BOT_NAMES[cls]}, ${botTitleForStep(step)} de ${CLASS_META[cls].label}`;
}

// ── Dificultad: material del mazo rival ────────────────────────────────────

/** Tier BASE del mazo rival según el tramo: 1-4 común · 5-9 raro · 10-14 épico. */
function baseTierForStep(step: number): Rarity {
  if (step >= 10) return "epic";
  if (step >= 5) return "rare";
  return "common";
}

/**
 * Tier de material del mazo rival: base por tramo + 1 peldaño por prestigio
 * (tope LEGENDARIA — la mítica queda reservada al jugador por fusión).
 */
export function botTierForStep(step: number, prestige: number): Rarity {
  let tier: Rarity = baseTierForStep(step);
  for (let i = 0; i < Math.max(0, prestige); i++) {
    const next = nextRarity(tier);
    if (!next || next === "mythic") break;
    tier = next;
  }
  return tier;
}

/** Tier del mazo del JEFE: épico en la 1ª vuelta, legendaria desde el prestigio 1. */
export function bossTierForPrestige(prestige: number): Rarity {
  return prestige >= 1 ? "legendary" : "epic";
}

// ── Recompensas y XP escalables ────────────────────────────────────────────

/** Cartas por VICTORIA normal: 2 → 3 → 4 → 5 según el escalón (jefe paga aparte). */
export function rewardCountForStep(step: number): number {
  return 2 + Math.floor(step / 4);
}

/** XP EXTRA de escalón por victoria (encima de la base 6): 6+escalón; ×1.5 en prestigio. */
export function xpBonusForStep(step: number, prestige: number): number {
  return Math.round(step * (prestige > 0 ? 1.5 : 1));
}

/** Mesa de drops: el nivel EFECTIVO nunca baja de escalón+2 — avanzar mejora drops. */
export function effectiveDropLevel(level: number, step: number): number {
  return Math.max(level, step + 2);
}

// ── Etiquetas de UI ────────────────────────────────────────────────────────

/** Texto corto del escalón para chips/botones ("Escalón 7", "JEFE · Escalón 5"). */
export function stepChipLabel(step: number): string {
  return isBossStep(step) ? `JEFE · Escalón ${step}` : `Escalón ${step}`;
}
