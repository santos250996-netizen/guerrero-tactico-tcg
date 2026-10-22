// ===========================================================================
// RUSH DE JEFES — lógica PURA del modo (sin stores ni React).
// plan-expansion-v3 §3.2 + decisiones Task 39:
//   · 3 jefes SEGUIDOS del ciclo de campaña actual (mazos temáticos épicos,
//     jugada gratis + 3 bonos como en la escalera). Sin curación entre peleas.
//   · Pierdes → fin del run. Vences → siguiente jefe, XP ×2 por jefe.
//   · Botín por escalón: jefe 1 → RARA garantizada · jefe 2 → ÉPICA
//     garantizada · jefe 3 → LEGENDARIA 50% (100% la 1ª vez que completas
//     ese ciclo). El pick es 1 de 3 (decisión > azar).
//   · Registro persistente: mejor run por clase + runs totales + ciclos con
//     run completa (statsStore).
// El bot juega como un player real (mismo motor PvP): sin trucos, sin
// efectos independientes — solo su mazo temático + jugada gratis + bonos.
// ===========================================================================

import type { GameClass } from "./types";
import { CAMPAIGN_BOSS_STEPS, xpBonusForStep } from "./campaign";

/** Jefes por run (fijo: la run completa paga el botín grande). */
export const RUSH_BOSSES = 3;

/** Ciclo 0 = los 3 jefes clásicos · ciclo 1 = los 3 jefes V3 · ciclo 2+
 *  intercalado determinista de los 6 (rotación por pares de ciclos). */
export function rushBossesForCycle(cycle: number): GameClass[] {
  const base: GameClass[] = ["guerrero", "mago", "asesino"];
  const v3: GameClass[] = ["botanico", "pirata", "tinker"];
  if (cycle <= 0) return [...base];
  if (cycle === 1) return [...v3];
  const inter = [base[0], v3[0], base[1], v3[1], base[2], v3[2]];
  const start = ((((cycle - 2) % 2) + 2) % 2) * 3;
  return [inter[start], inter[(start + 1) % 6], inter[(start + 2) % 6]];
}

/**
 * XP EXTRA por jefe vencido: el Rush DOBLA el bono de escalón del jefe
 * equivalente (5/10/15 → 10/20/30 en la 1ª vuelta, ×1.5 por prestigio).
 * La XP base de la partida (+6 victoria) y el bono de JEFE (+10) ya los paga
 * registerMatch(boss:true) — esta cantidad se SUMA encima vía addXp.
 */
export function rushXpForBoss(index: number, prestige: number): number {
  const step = CAMPAIGN_BOSS_STEPS[Math.min(Math.max(0, index), CAMPAIGN_BOSS_STEPS.length - 1)];
  return 2 * xpBonusForStep(step, prestige);
}

export type RushPickTier = "rare" | "epic" | "legendary" | "common";

/**
 * Rareza del pick (1 de 3) tras vencer al jefe `index`.
 * `firstCycleIncomplete` = el jugador aún NUNCA completó una run en este
 * ciclo → el jefe 3 paga legendaria GARANTIZADA (progresión asegurada).
 * En ciclos ya completados la legendaria queda al 50% (roll 0..1).
 */
export function rushPickTierForBoss(
  index: number,
  opts: { firstCycleIncomplete: boolean; roll?: number },
): RushPickTier {
  if (index === 0) return "rare";
  if (index === 1) return "epic";
  const roll = opts.roll ?? Math.random();
  return opts.firstCycleIncomplete || roll < 0.5 ? "legendary" : "common";
}

/** Etiqueta ES del tier del pick para el modal («Elige 1 de 3 ÉPICAS»). */
export const RUSH_PICK_TIER_LABEL: Record<RushPickTier, string> = {
  rare: "raras",
  epic: "épicas",
  legendary: "legendarias",
  common: "comunes",
};
