// ============================================================================
// V3.0 — INTERRUPTOR MAESTRO DEL MEGA-RELEASE (plan-expansion-v3 §5)
// ============================================================================
// Estrategia de despliegue aprobada: las tandas T-A…T-F se codean y commitean
// en main (CI verde, suites crecen) pero las clases nuevas NO aparecen en la
// UI hasta T-G. El release V3.0 enciende todo de golpe con esta constante:
//
//   V3_CLASSES_UNLOCKED = false  → Botánico/Pirata/Tinker OCULTOS (T-A…T-F)
//   V3_CLASSES_UNLOCKED = true   → mega-release: selector 6 clases, campana
//                                  con 6 rivales, Rush de Jefes, banner V3.
//
// Un solo módulo, un solo cambio para el release — el resto de la UI consulta
// visibleClasses() / isNewClass() y jamás hard-codea la lista de clases.
// ============================================================================

import type { GameClass } from "./types";

/** ⛔ Bandera de release: SOLO T-G la enciende (versionName 3.0). */
export const V3_CLASSES_UNLOCKED = false;

/** Clases base (V1/V2) — siempre visibles. */
export const BASE_CLASSES: readonly GameClass[] = ["guerrero", "mago", "asesino"];

/** Clases nuevas V3.0 — visibles solo con la bandera encendida. */
export const V3_NEW_CLASSES: readonly GameClass[] = ["botanico", "pirata", "tinker"];

/** Clases que la UI debe mostrar (orden estable: base primero, V3 después). */
export function visibleClasses(): readonly GameClass[] {
  return V3_CLASSES_UNLOCKED ? [...BASE_CLASSES, ...V3_NEW_CLASSES] : BASE_CLASSES;
}

/** ¿Es una clase nueva V3.0 (oculta hasta el release)? */
export function isNewClass(cls: GameClass): boolean {
  return (V3_NEW_CLASSES as readonly string[]).includes(cls);
}
