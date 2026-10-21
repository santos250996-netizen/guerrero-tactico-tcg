// ============================================================================
// V3.0 — INTERRUPTOR MAESTRO DEL MEGA-RELEASE (plan-expansion-v3 §5)
// ============================================================================
// Estrategia original: tandas T-A…T-F ocultas y T-G encendía todo. El jugador
// pidió ver las 6 clases ANTES del release final («arreglalo para q me salgan
// todas») → bandera encendida desde T-D. Lo restante de T-F/T-G (Rush de
// Jefes, selector compacto, banner 3.0) llega después SIN re-apagar esto.
//
//   V3_CLASSES_UNLOCKED = true   → selector 6 clases, campana con 6 rivales.
//
// Un solo módulo, un solo cambio para el release — el resto de la UI consulta
// visibleClasses() / isNewClass() y jamás hard-codea la lista de clases.
// ============================================================================

import type { GameClass } from "./types";

/** ✅ Bandera encendida (petición del jugador, T-D): las 6 clases visibles. */
export const V3_CLASSES_UNLOCKED = true;

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
