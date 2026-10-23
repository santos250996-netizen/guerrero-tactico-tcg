"use client";

// ---------------------------------------------------------------------------
// gameStore (POST-AUDITORÍA)
// El modo solitario fue retirado: toda la partida (historia, jefes y PvP)
// vive en pvpStore + pvp.ts. Este store queda SOLO con lo global:
//   · navegación de vistas (view)
//   · clase elegida (gameClass)
//   · editor de mazo (pool de la clase, ids del mazo, guardado)
//   · carta en preview (CardPreviewModal)
// ---------------------------------------------------------------------------

import { create } from "zustand";
import type { CardDef, GameClass } from "@/lib/game/types";
import { cardPoolForClass, battleDeckFromOwned } from "@/lib/game/cards";
import { readEditedDeckIds, storageKeyFor } from "@/lib/game/deck-storage";
import { useCollectionStore, hydrateCollection } from "@/store/collectionStore";

type View =
  | "main-menu"
  | "class-select"
  | "story"
  | "editor"
  | "profile"
  | "pvp"
  | "coleccion";

interface GameStoreState {
  /** Vista activa de la app. */
  view: View;
  /** Contextual return target when leaving DeckEditor. */
  deckEditorReturn: Exclude<View, "editor">;

  gameClass: GameClass;

  // ── Editor de mazo ──
  cardPool: CardDef[];
  deckCardIds: string[];
  deckDirty: boolean;
  deckSaveStatus: "idle" | "saving" | "ok" | "err";
  deckLoading: boolean;

  // ── Preview ──
  previewCard: CardDef | null;

  // ── Acciones ──
  selectClass: (cls: GameClass) => void;
  setView: (view: View) => void;
  setDeckEditorReturn: (target: Exclude<View, "editor">) => void;
  setPreviewCard: (c: CardDef | null) => void;

  loadDeckAndPool: () => Promise<void>;
  swapCardInDeck: (index: number, cardId: string) => void;
  saveDeck: () => Promise<void>;
  resetDeck: () => Promise<void>;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  view: "main-menu",
  deckEditorReturn: "main-menu",

  gameClass: "guerrero",

  cardPool: [],
  deckCardIds: [],
  deckDirty: false,
  deckSaveStatus: "idle",
  deckLoading: false,

  previewCard: null,

  selectClass: (cls) => {
    set({ gameClass: cls });
  },

  setView: (view) => set({ view }),

  setDeckEditorReturn: (target) => set({ deckEditorReturn: target }),

  setPreviewCard: (c) => set({ previewCard: c }),

  loadDeckAndPool: async () => {
    set({ deckLoading: true });
    try {
      const cls = get().gameClass;
      // Pool por clase: neutrales + exclusivas de la clase (evita mezclar
      // keywords). Para las 3 clases por igual — incluye los 2 mazos (I y II).
      const cardPool: CardDef[] = cardPoolForClass(cls);

      // Deck por defecto: las 12 MEJORES PROPIAS de la colección (progresión),
      // NO el espejo oficial completo — así el editor muestra el mismo mazo
      // que se juega en historia/PvP (battleDeckFor). Si hay mazo guardado,
      // ese manda (el editor bloquea cartas bloqueadas; battleDeckFor valida).
      hydrateCollection();
      let deckCardIds: string[];
      const col = useCollectionStore.getState();
      const savedDeck = readEditedDeckIds(cls);
      if (savedDeck) {
        deckCardIds = savedDeck;
      } else {
        deckCardIds = battleDeckFromOwned(cls, (id) => col.tierRankOf(id)).map((c) => c.id);
      }

      set({
        cardPool,
        deckCardIds,
        deckDirty: false,
        deckSaveStatus: "idle",
        deckLoading: false,
      });
    } catch (e) {
      console.error("loadDeckAndPool error:", e);
      set({ deckLoading: false, deckSaveStatus: "err" });
    }
  },

  swapCardInDeck: (index, cardId) => {
    // Allow placing a card into ANY of the 12 deck slots, even if the slot is
    // beyond the current deckCardIds length (e.g. user emptied the deck then
    // clicks slot 5 — we pad with empty strings up to that index).
    if (index < 0 || index >= 12) return;
    const { deckCardIds } = get();
    if (deckCardIds[index] === cardId) return;
    // Prevent duplicates (deck is 12 unique cards) — if the card is already in
    // the deck at a DIFFERENT slot, move it from the old slot to the new one
    // (old slot becomes empty). This is the "drag-to-rearrange" UX.
    const next = [...deckCardIds];
    // Pad with empty strings up to the target index so we can place at any slot
    while (next.length <= index) next.push("");
    if (deckCardIds.includes(cardId)) {
      const existingIdx = deckCardIds.indexOf(cardId);
      next[existingIdx] = "";  // clear old slot
    }
    next[index] = cardId;
    // Always store exactly 12 entries (pad/truncate to 12)
    while (next.length < 12) next.push("");
    set({ deckCardIds: next.slice(0, 12), deckDirty: true, deckSaveStatus: "idle" });
  },

  saveDeck: async () => {
    const { deckCardIds, gameClass } = get();
    if (deckCardIds.length !== 12) return;
    set({ deckSaveStatus: "saving" });
    try {
      // Save to localStorage (no API route needed — works in static export / APK)
      localStorage.setItem(storageKeyFor(gameClass), JSON.stringify({ cardIds: deckCardIds }));
      set({ deckSaveStatus: "ok", deckDirty: false });
      setTimeout(() => {
        if (get().deckSaveStatus === "ok") set({ deckSaveStatus: "idle" });
      }, 2000);
    } catch (e) {
      console.error("saveDeck error:", e);
      set({ deckSaveStatus: "err" });
    }
  },

  resetDeck: async () => {
    set({ deckSaveStatus: "saving" });
    try {
      // Clear localStorage and reload default deck
      const cls = get().gameClass;
      localStorage.removeItem(storageKeyFor(cls));
      await get().loadDeckAndPool();
      set({ deckSaveStatus: "idle", deckDirty: false });
    } catch (e) {
      console.error("resetDeck error:", e);
      set({ deckSaveStatus: "err" });
    }
  },
}));
