"use client";

// ============================================================================
// Colección del jugador — cartas ganadas en el modo historia + FUSIONES.
// Persistencia: localStorage ("guerrero-tactico-coleccion"). La rareza se
// GANA: todas las cartas nacen comunes y 3 copias idénticas del mismo tier
// se fusionan en 1 del tier siguiente (véase balance.ts — +2 PTP por tier).
// ============================================================================

import { create } from "zustand";
import type { CardDef, GameClass, Rarity } from "@/lib/game/types";
import { ALL_CARDS_V3, starterDeckFor, cardPoolForClass, battleDeckFromOwned } from "@/lib/game/cards";
import { FUSION_COPIES, MAX_FUSION_RARITY, nextRarity, materializeCard } from "@/lib/game/balance";
import { readEditedDeckIds } from "@/lib/game/deck-storage";
import { useStatsStore, bonusDropCards, dropTableFor } from "./statsStore";

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
  mythic?: number;
}

const STORAGE_KEY = "guerrero-tactico-coleccion";

// Mesa de rareza de los DROPS según el NIVEL del jugador (statsStore):
// N1-2 solo comunes → N3 llegan raras → N5 épicas → N7 legendarias →
// N10 mesas generosas. Así el progreso del personaje SE SIENTE en el botín.

function copiesOf(c: Copies | undefined): number {
  if (!c) return 0;
  return (c.common ?? 0) + (c.rare ?? 0) + (c.epic ?? 0) + (c.legendary ?? 0) + (c.mythic ?? 0);
}

function rollRarity(): Rarity {
  const level = useStatsStore.getState().level;
  const table = dropTableFor(level);
  const roll = Math.random();
  let acc = 0;
  for (const [rarity, w] of table) {
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
  /**
   * Recompensa de cartas aleatorias de cualquier clase. La rareza sale de la
   * MESA DE DROPS del nivel del jugador; con bonusForLevel la victoria añade
   * las cartas extra de nivel (+1 en N5, +1 más en N10).
   */
  addRewards: (n?: number, opts?: { bonusForLevel?: boolean }) => CardReward[];
  /** Botín del JEFE (solo victoria): 1 LEGENDARIA garantizada + 1 de rollo. */
  addBossRewards: () => CardReward[];
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
  /**
   * MAZO DE BATALLA de la clase, MATERIALIZADO (+2 poder por tier ganado en
   * fusiones). Es el mazo que se juega en TODOS los modos — historia (vs bots)
   * y PvP online: la colección es global, no solo del modo historia.
   * Prioridad: (1) mazo editado en el editor si es válido y 100% propio;
   * (2) las 12 mejores propias (battleDeckFromOwned, incluye el starter).
   */
  battleDeckFor: (cls: GameClass) => CardDef[];
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

  addRewards: (n = 2, opts) => {
    const { copies } = get();
    const pool = ALL_CARDS_V3;
    const rewards: CardReward[] = [];
    const next = { ...copies };
    const total = n + (opts?.bonusForLevel ? bonusDropCards(useStatsStore.getState().level) : 0);
    for (let i = 0; i < total; i++) {
      const card = pool[Math.floor(Math.random() * pool.length)];
      const rarity = rollRarity();
      const cur = next[card.id] ?? {};
      const isNew = copiesOf(cur) === 0;
      next[card.id] = { ...cur, [rarity]: (cur[rarity] ?? 0) + 1 };
      rewards.push({ id: card.id, rarity, isNew });
    }
    set({ copies: next });
    persist(next, get().grantedClasses, get().wins);
    return rewards;
  },

  addBossRewards: () => {
    const { copies } = get();
    const pool = ALL_CARDS_V3;
    const next = { ...copies };
    const rewards: CardReward[] = [];
    // 1 LEGENDARIA garantizada — el trofeo del jefe
    const legCard = pool[Math.floor(Math.random() * pool.length)];
    const curL = next[legCard.id] ?? {};
    const isNewL = copiesOf(curL) === 0;
    next[legCard.id] = { ...curL, legendary: (curL.legendary ?? 0) + 1 };
    rewards.push({ id: legCard.id, rarity: "legendary", isNew: isNewL });
    // +1 carta con el rollo normal
    const card = pool[Math.floor(Math.random() * pool.length)];
    const rarity = rollRarity();
    const cur = next[card.id] ?? {};
    const isNew = copiesOf(cur) === 0;
    next[card.id] = { ...cur, [rarity]: (cur[rarity] ?? 0) + 1 };
    rewards.push({ id: card.id, rarity, isNew });
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
    if ((c.mythic ?? 0) > 0) return "mythic";
    if ((c.legendary ?? 0) > 0) return "legendary";
    if ((c.epic ?? 0) > 0) return "epic";
    if ((c.rare ?? 0) > 0) return "rare";
    return "common";
  },

  tierRankOf: (id) => {
    const c = get().copies[id];
    if (!c) return -1;
    if ((c.mythic ?? 0) > 0) return 4;
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
    return Object.values(copies).reduce((acc, c) => acc + copiesOf(c), 0);
  },

  distinctCards: () => {
    const { copies } = get();
    return Object.values(copies).filter((c) => copiesOf(c) > 0).length;
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

  battleDeckFor: (cls) => {
    const pool = cardPoolForClass(cls);
    const ids = readEditedDeckIds(cls);
    if (ids) {
      const { copies } = get();
      const allOwned = ids.every((id) => {
        const c = copies[id];
        return !!c && copiesOf(c) > 0 && pool.some((p) => p.id === id);
      });
      if (allOwned) {
        return ids.map((id) => {
          const base = pool.find((p) => p.id === id)!;
          return materializeCard(base, get().bestTier(id));
        });
      }
    }
    // Sin mazo editado válido (o con cartas ya no propias) → las 12 mejores.
    return battleDeckFromOwned(cls, (id) => get().tierRankOf(id)).map((c) =>
      materializeCard(c, get().bestTier(c.id))
    );
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
