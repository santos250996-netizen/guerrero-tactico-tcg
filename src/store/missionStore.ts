"use client";

// ============================================================================
// missionStore — MISIONES DIARIAS (3 al día, deterministas por fecha).
//
// Todas las misiones pagan +1 carta al completarse (auto-reclamada). El
// sorteo usa una semilla derivada de la fecha local (YYYY-MM-DD): todos los
// días 3 misiones distintas del mismo pool, iguales durante todo el día y
// reproducibles en tests.
//
// Eventos de progreso (hooks llamados desde pvpStore / CollectionScreen):
//   win-games · win-class · play-cards · fuse · play-online · win-lanes ·
//   beat-boss
// ============================================================================

import { create } from "zustand";
import type { GameClass } from "@/lib/game/types";
import { useCollectionStore } from "@/store/collectionStore";

export type MissionType =
  | "win-games"
  | "win-class"
  | "play-cards"
  | "fuse"
  | "play-online"
  | "win-lanes"
  | "beat-boss";

export interface Mission {
  id: string;
  type: MissionType;
  /** Solo para win-class: la clase exigida. */
  cls?: GameClass;
  target: number;
  title: string;
  progress: number;
  done: boolean;
}

const STORAGE_KEY = "pacto-de-guerra-misiones";
const DAILY_COUNT = 3;

const CLASS_LABEL: Record<GameClass, string> = {
  guerrero: "Guerrero",
  mago: "Mago",
  asesino: "Asesino",
};

/** Fecha local YYYY-MM-DD (formato "sv": ordenable y sin zona horaria rara). */
export function todayKey(): string {
  return new Date().toLocaleDateString("sv-SE");
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Template {
  type: MissionType;
  cls?: GameClass;
  target: number;
  title: string;
}

function buildTemplates(dateKey: string): Template[] {
  const rnd = mulberry32(hashStr(`pacto-${dateKey}`));
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
  const cls = pick(["guerrero", "mago", "asesino"] as GameClass[]);
  const pool: Template[] = [
    { type: "win-games", target: 2, title: "Gana 2 partidas (cualquier modo)" },
    { type: "win-class", cls, target: 2, title: `Gana 2 partidas con el ${CLASS_LABEL[cls]}` },
    { type: "play-cards", target: 6, title: "Juega 6 cartas" },
    { type: "fuse", target: 1, title: "Fusiona 1 carta en la Colección" },
    { type: "play-online", target: 1, title: "Juega 1 partida de PvP online" },
    { type: "win-lanes", target: 5, title: "Gana 5 carriles (total)" },
    { type: "beat-boss", target: 1, title: "Vence a 1 JEFE" },
  ];
  // Fisher-Yates con la misma semilla y tomamos 3 distintas
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, DAILY_COUNT);
}

function buildMissions(dateKey: string): Mission[] {
  return buildTemplates(dateKey).map((t, i) => ({
    id: `${dateKey}-${t.type}-${i}`,
    type: t.type,
    cls: t.cls,
    target: t.target,
    title: t.title,
    progress: 0,
    done: false,
  }));
}

function loadState(): { dateKey: string; missions: Mission[] } {
  if (typeof window === "undefined") return { dateKey: "", missions: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as { dateKey?: string; missions?: Mission[] };
      if (p.dateKey && Array.isArray(p.missions) && p.missions.length === DAILY_COUNT) {
        return { dateKey: p.dateKey, missions: p.missions };
      }
    }
  } catch {
    // JSON corrupto → regenerar
  }
  const dateKey = todayKey();
  const missions = buildMissions(dateKey);
  // PERSISTIR YA: sin esto el progreso del día vivía solo en memoria
  // (ensureToday veía dateKey === hoy y hacía early-return sin escribir).
  persist(dateKey, missions);
  return { dateKey, missions };
}

function persist(dateKey: string, missions: Mission[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ dateKey, missions }));
  } catch {
    // sin persistencia — la sesión sigue
  }
}

interface MissionState {
  dateKey: string;
  missions: Mission[];
  /** Última misión completada (para toast; {title, at}). */
  lastCompleted: { title: string; at: number } | null;
  /** Regenera las misiones si cambió el día (llamar al montar UI). */
  ensureToday: () => void;
  /** Suma progreso a las misiones del tipo dado. Al completar: +1 carta. */
  progress: (type: MissionType, amount?: number, cls?: GameClass | null) => void;
  clearCompletedToast: () => void;
  /** Solo tests: fuerza misiones arbitrarias. */
  __setForTest: (missions: Mission[]) => void;
}

export const useMissionStore = create<MissionState>((set, get) => {
  const initial = loadState();

  const complete = (m: Mission): Mission => {
    // Recompensa: +1 carta (auto-reclamada)
    try {
      useCollectionStore.getState().addRewards(1);
    } catch {
      // sin colección disponible — la misión se marca igual
    }
    return { ...m, done: true, progress: m.target };
  };

  return {
    dateKey: initial.dateKey,
    missions: initial.missions,
    lastCompleted: null,

    ensureToday: () => {
      const key = todayKey();
      if (get().dateKey === key) return;
      const missions = buildMissions(key);
      set({ dateKey: key, missions, lastCompleted: null });
      persist(key, missions);
    },

    progress: (type, amount = 1, cls = null) => {
      // Si cambió el día mientras jugabas, rota primero
      const key = todayKey();
      let missions = get().missions;
      let dateKey = get().dateKey;
      if (dateKey !== key) {
        dateKey = key;
        missions = buildMissions(key);
      }
      let lastCompleted = get().lastCompleted;
      let changed = false;
      const next = missions.map((m) => {
        if (m.done || m.type !== type) return m;
        if (type === "win-class" && m.cls && cls && m.cls !== cls) return m;
        changed = true;
        const p = Math.min(m.target, m.progress + amount);
        if (p >= m.target) {
          const done = complete(m);
          lastCompleted = { title: m.title, at: Date.now() };
          return done;
        }
        return { ...m, progress: p };
      });
      if (!changed) {
        if (dateKey !== get().dateKey) {
          set({ dateKey, missions: next });
          persist(dateKey, next);
        }
        return;
      }
      set({ dateKey, missions: next, lastCompleted });
      persist(dateKey, next);
    },

    clearCompletedToast: () => set({ lastCompleted: null }),

    __setForTest: (missions) => set({ missions, dateKey: todayKey() }),
  };
});
