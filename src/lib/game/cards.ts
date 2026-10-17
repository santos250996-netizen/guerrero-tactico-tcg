import type { CardDef } from "./types";

// ============================================================================
// PACTO DE GUERRA TCG — CATÁLOGO OFICIAL (RESET)
// ============================================================================
// All 94 legacy cards were deleted on user request — we're starting over with
// a clean slate so the new trigger model (only 4: on_play / start_turn /
// end_turn / on_death) and the upcoming on-target keyword system can be
// designed from scratch without legacy baggage.
//
// Status: EMPTY. New cards will be designed one-by-one with the new rules.
//
// Exports kept (as empty arrays) so existing imports in engine.ts,
// gameStore.ts, and components don't break the build:
//   - ALL_CARDS: []   (used by DeckEditor card pool + SettingsModal filters)
//   - WARRIOR_DECK: []  (used by gameStore initGame as default draw pile)
//   - PRESET_DECKS: []  (used by DeckEditor preset deck selector)
//   - BASIC_CARDS / TACTICAL_CARDS: []  (legacy filters)
//
// buildDrawPileFrom is still exported so the engine's deck-shuffling logic
// works when cards are added back later.
// ============================================================================

/** All available cards in the game (EMPTY during reset). */
export const ALL_CARDS: CardDef[] = [];

/** Default deck for new games (EMPTY during reset — game will start with
 *  empty hand + drawPile until cards are designed and added back). */
export const WARRIOR_DECK: CardDef[] = [];

/** Preset decks shown in the DeckEditor dropdown (EMPTY during reset). */
export const PRESET_DECKS: { id: string; name: string; emoji: string; description: string; cards: CardDef[] }[] = [];

/** Legacy rarity filters (EMPTY during reset). */
export const BASIC_CARDS: CardDef[] = [];
export const TACTICAL_CARDS: CardDef[] = [];

/**
 * Build a draw pile from a deck (clones each card with fresh uid + handBonus).
 * Used by gameStore.initGame — works correctly even with an empty deck
 * (returns an empty pile, which results in an empty hand on the first turn).
 */
export function buildDrawPileFrom(deck: CardDef[]): CardDef[] {
  return deck.map((c) => ({ ...c }));
}
