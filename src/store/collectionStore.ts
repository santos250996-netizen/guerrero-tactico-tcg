"use client";

// ============================================================================
// Colección del jugador — cartas ganadas en el modo historia + FUSIONES.
// Persistencia: localStorage ("guerrero-tactico-coleccion"). La rareza se
// GANA: todas las cartas nacen comunes y 3 copias idénticas del mismo tier
// se fusionan en 1 del tier siguiente (véase balance.ts — +2 PTP por tier).
// ============================================================================

import { create } from "zustand";
import type { GameClass, Rarity } from "@/lib/game/types";
import { ALL_CARDS_V3, starterDeckFor } from "@/lib/game/cards";
import { FUSION_COPIES, MAX_FUSION_RARITY, nextRarity } from "@/lib/game/balance";

export interface CardReward {
  id: string;
  rarity: Rarity;
  /** true si el jugador no tenía NINGUNA copia de esta carta. */
  isNew: boolean;
}

interface Copies {
  common?: number;
  rare?: number;
  epic?: number;
  legendary?: number;
}

const STORAGE_KEY = "guerrero-tactico-coleccion";

// Probabilidad del rollo de rareza de las recompensas. La LEGENDARIA no se
// reparte: solo se alcanza fusionando (decisión de diseño).
const REWARD_RARITY_WEIGHTS: [Rarity, number][] = [
  ["common", 0.7],
  ["rare", 0.25],
  ["epic", 0.05],
];

function rollRarity(): Rarity {
  const roll = Math.random();
  let acc = 0;
  for (const [rarity, w] of REWARD_RARITY_WEIGHTS) {
    acc += w;
    if (roll < acc) return rarity;
  }
  return "common";
}

function loadCopies(): Record<string, Copies> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { copies?: Record<string, Copies>; grantedClasses?: GameClass[] };
    return parsed.copies ?? {};
  } catch {
    return {};
  }
}

function loadGranted(): GameClass[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { grantedClasses?: GameClass[] };
    return parsed.grantedClasses ?? [];
  } catch {
    return [];
  }
}

function persist(copies: Record<string, Copies>, grantedClasses: GameClass[], wins: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ copies, grantedClasses, wins }));
  } catch {
    // almacenamiento lleno/bloqueado — la sesión sigue sin persistir
  }
}

interface CollectionState {
  copies: Record<string, Copies>;
  grantedClasses: GameClass[];
  wins: number;

  /** Regala el mazo inicial (12 cartas: las neutrales de la clase + relleno), una sola vez. */
  grantStarterDeck: (cls: GameClass) => boolean;
  /** Recompensa por victoria: n cartas aleatorias de cualquier clase. */
  addRewards: (n?: number) => CardReward[];
  canFuse: (id: string, rarity: Rarity) => boolean;
  /** Fusiona 3 copias del mismo tier → 1 del siguiente. Devuelve el tier nuevo o null. */
  fuse: (id: string, rarity: Rarity) => Rarity | null;
  /** El tier más alto con al menos 1 copia (common si no tiene). */
  bestTier: (id: string) => Rarity;
  /** −1 si NO tiene copias; si no 0 common…3 legendary (para battleDeckFromOwned). */
  tierRankOf: (id: string) => number;
  /** ¿Tiene al menos 1 copia (de cualquier tier)? */
  owns: (id: string) => boolean;
  countOf: (id: string, rarity: Rarity) => number;
  totalCopies: () => number;
  distinctCards: () => number;
  registerWin: () => void;
  /** Devuelve TODAS las copias (p.ej. para reinicio voluntario). */
  resetAll: () => void;
}

export const useCollectionStore = create<CollectionState>((set, get) => ({
  copies: {},
  grantedClasses: [],
  wins: 0,

  grantStarterDeck: (cls) => {
    const { grantedClasses, copies } = get();
    if (grantedClasses.includes(cls)) return false;
    const next = { ...copies };
    for (const card of starterDeckFor(cls)) {
      const cur = next[card.id] ?? {};
      next[card.id] = { ...cur, common: (cur.common ?? 0) + 1 };
    }
    const granted = [...grantedClasses, cls];
    set({ copies: next, grantedClasses: granted });
    persist(next, granted, get().wins);
    return true;
  },

  addRewards: (n = 2) => {
    const { copies } = get();
    const pool = ALL_CARDS_V3;
    const rewards: CardReward[] = [];
    const next = { ...copies };
    for (let i = 0; i < n; i++) {
      const card = pool[Math.floor(Math.random() * pool.length)];
      const rarity = rollRarity();
      const cur = next[card.id] ?? {};
      const isNew = !cur.common && !cur.rare && !cur.epic && !cur.legendary;
      next[card.id] = { ...cur, [rarity]: (cur[rarity] ?? 0) + 1 };
      rewards.push({ id: card.id, rarity, isNew });
    }
    set({ copies: next });
    persist(next, get().grantedClasses, get().wins);
    return rewards;
  },

  canFuse: (id, rarity) => {
    const { copies } = get();
    if (rarity === MAX_FUSION_RARITY) return false;
    return (copies[id]?.[rarity] ?? 0) >= FUSION_COPIES;
  },

  fuse: (id, rarity) => {
    const target = nextRarity(rarity);
    if (!target || !get().canFuse(id, rarity)) return null;
    const { copies } = get();
    const cur = copies[id] ?? {};
    const remaining = (cur[rarity] ?? 0) - FUSION_COPIES;
    const nextCopies: Copies = {
      ...cur,
      [rarity]: Math.max(0, remaining),
      [target]: (cur[target] ?? 0) + 1,
    };
    const next = { ...copies, [id]: nextCopies };
    set({ copies: next });
    persist(next, get().grantedClasses, get().wins);
    return target;
  },

  bestTier: (id) => {
    const c = get().copies[id];
    if (!c) return "common";
    if ((c.legendary ?? 0) > 0) return "legendary";
    if ((c.epic ?? 0) > 0) return "epic";
    if ((c.rare ?? 0) > 0) return "rare";
    return "common";
  },

  tierRankOf: (id) => {
    const c = get().copies[id];
    if (!c) return -1;
    if ((c.legendary ?? 0) > 0) return 3;
    if ((c.epic ?? 0) > 0) return 2;
    if ((c.rare ?? 0) > 0) return 1;
    if ((c.common ?? 0) > 0) return 0;
    return -1;
  },

  owns: (id) => get().tierRankOf(id) >= 0,

  countOf: (id, rarity) => get().copies[id]?.[rarity] ?? 0,

  totalCopies: () => {
    const { copies } = get();
    return Object.values(copies).reduce(
      (acc, c) => acc + (c.common ?? 0) + (c.rare ?? 0) + (c.epic ?? 0) + (c.legendary ?? 0),
      0
    );
  },

  distinctCards: () => {
    const { copies } = get();
    return Object.values(copies).filter(
      (c) => (c.common ?? 0) + (c.rare ?? 0) + (c.epic ?? 0) + (c.legendary ?? 0) > 0
    ).length;
  },

  registerWin: () => {
    const wins = get().wins + 1;
    set({ wins });
    persist(get().copies, get().grantedClasses, wins);
  },

  resetAll: () => {
    set({ copies: {}, grantedClasses: [], wins: 0 });
    persist({}, [], 0);
  },
}));

/** Hidrata la colección desde localStorage (llamar 1ª vez al abrir la UI). */
export function hydrateCollection(): void {
  const copies = loadCopies();
  const grantedClasses = loadGranted();
  let wins = 0;
  if (typeof window !== "undefined") {
    try {
      wins = (JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as { wins?: number }).wins ?? 0;
    } catch {
      wins = 0;
    }
  }
  useCollectionStore.setState({ copies, grantedClasses, wins });
}
