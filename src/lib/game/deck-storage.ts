// ============================================================================
// deck-storage — lectura/validación del MAZO EDITADO por clase (localStorage).
//
// El "mazo principal" es lo que el jugador arma en el editor (12 ids únicos
// del pool de su clase). Vive en localStorage (funciona en la APK estática):
//   · guerrero → "guerrero-tactico-deck"        (clave histórica)
//   · resto    → "guerrero-tactico-deck-<cls>"
//
// Es PURO (sin zustand) para poder testearlo con bun: los tests simulan el
// storage con un global inyectable. `readEditedDeckIds` acepta un storage
// opcional; por defecto usa localStorage en el navegador.
// ============================================================================

import type { GameClass } from "./types";

type DeckStorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function storageKeyFor(cls: GameClass): string {
  return cls === "guerrero" ? "guerrero-tactico-deck" : `guerrero-tactico-deck-${cls}`;
}

function defaultStorage(): DeckStorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Ids del mazo editado de la clase (12 únicos) o null si no hay uno válido.
 * Acepta solo 12 ids de string SIN duplicados — nada parcial.
 */
export function readEditedDeckIds(cls: GameClass, storage?: DeckStorageLike | null): string[] | null {
  const st = storage ?? defaultStorage();
  if (!st) return null;
  try {
    const raw = st.getItem(storageKeyFor(cls));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { cardIds?: unknown };
    if (!Array.isArray(parsed?.cardIds) || parsed.cardIds.length !== 12) return null;
    const ids = parsed.cardIds.filter((x): x is string => typeof x === "string");
    if (ids.length !== 12) return null;
    if (new Set(ids).size !== 12) return null;
    return ids;
  } catch {
    return null;
  }
}
