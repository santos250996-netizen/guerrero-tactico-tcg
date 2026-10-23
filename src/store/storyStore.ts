"use client";

// ============================================================================
// storyStore — MODO HISTORIA «EL PACTO DE GUERRA» (persistencia).
// localStorage: "pacto-de-guerra-historia".
//
// Guarda SOLO el progreso narrativo: capítulo/pelea pendientes, las 3
// decisiones (flags) y si la historia está cerrada. La lógica del guion vive
// en lib/game/story.ts; el combate reutiliza el motor de historia del
// pvpStore (patrón Rush: el modo vive dentro de "historia" con una bandera).
// Perder una pelea NO retrocede: se repite la misma pelea.
// ============================================================================

import { create } from "zustand";
import { STORY_CHAPTERS, STORY_CHOICES, STORY_TOTAL } from "@/lib/game/story";

const STORAGE_KEY = "pacto-de-guerra-historia";

interface StoryState {
  /** Capítulo pendiente (0..STORY_TOTAL-1). */
  chapter: number;
  /** Pelea pendiente dentro del capítulo (0-based). */
  fight: number;
  /** Decisiones tomadas (flags del guion: perdon_bram, peaje_pagado…). */
  flags: Record<string, boolean>;
  /** Historia COMPLETADA (el Heraldo cayó). */
  completed: boolean;

  /** Victoria de pelea: avanza pelea → capítulo. true si cerró la historia. */
  advance: () => { completed: boolean };
  /** Registra una decisión (idempotente: la primera manda). */
  choose: (flag: string) => void;
  /** ¿Decisión ya tomada? */
  hasFlag: (flag: string) => boolean;
  /** ¿Capítulo idx superado? (todo lo anterior al pendiente). */
  isChapterDone: (idx: number) => boolean;
  /** Empezar de cero (desde el mapa, con confirmación en la UI). */
  resetStory: () => void;
  /** Hidrata desde localStorage (llamar 1ª vez al abrir la UI). */
  hydrate: () => void;
}

interface StorySave {
  chapter: number;
  fight: number;
  flags: Record<string, boolean>;
  completed: boolean;
}

function load(): StorySave {
  if (typeof window === "undefined") return { chapter: 0, fight: 0, flags: {}, completed: false };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { chapter: 0, fight: 0, flags: {}, completed: false };
    const p = JSON.parse(raw) as Partial<StorySave>;
    const chapter = Math.min(STORY_TOTAL - 1, Math.max(0, p.chapter ?? 0));
    const fight = Math.max(0, p.fight ?? 0);
    const flags = p.flags ?? {};
    const completed = p.completed ?? false;
    return { chapter, fight, flags, completed };
  } catch {
    return { chapter: 0, fight: 0, flags: {}, completed: false };
  }
}

function persist(s: StorySave): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // almacenamiento lleno/bloqueado — la sesión sigue sin persistir
  }
}

export const useStoryStore = create<StoryState>((set, get) => ({
  ...load(),

  advance: () => {
    const s = get();
    const chapter = STORY_CHAPTERS[Math.min(s.chapter, STORY_TOTAL - 1)];
    // Última pelea del capítulo → capítulo siguiente (pelea 0)
    if (s.fight >= chapter.fights.length - 1) {
      // Último capítulo → HISTORIA COMPLETADA
      if (s.chapter >= STORY_TOTAL - 1) {
        const next = { chapter: s.chapter, fight: s.fight, flags: s.flags, completed: true };
        set(next);
        persist(next);
        return { completed: true };
      }
      const next = { chapter: s.chapter + 1, fight: 0, flags: s.flags, completed: false };
      set(next);
      persist(next);
      return { completed: false };
    }
    const next = { chapter: s.chapter, fight: s.fight + 1, flags: s.flags, completed: false };
    set(next);
    persist(next);
    return { completed: false };
  },

  choose: (flag) => {
    const s = get();
    // DECISIÓN POR PUNTO: si el punto ya está decidido (cualquiera de sus dos
    // opciones), la PRIMERA decisión manda — el guion no cambia de opinión.
    const def = STORY_CHOICES.find((c) => c.options.some((o) => o.flag === flag));
    if (def && def.options.some((o) => s.flags[o.flag])) return;
    if (s.flags[flag]) return;
    const next = { chapter: s.chapter, fight: s.fight, flags: { ...s.flags, [flag]: true }, completed: s.completed };
    set(next);
    persist(next);
  },

  hasFlag: (flag) => !!get().flags[flag],

  isChapterDone: (idx) => {
    const s = get();
    if (s.completed) return true;
    return idx < s.chapter;
  },

  resetStory: () => {
    const empty = { chapter: 0, fight: 0, flags: {}, completed: false };
    set(empty);
    persist(empty);
  },

  hydrate: () => {
    set(load());
  },
}));
