"use client";

// ============================================================================
// missionStore — MISIONES v2: DIARIAS · SEMANALES · MENSUALES con RECLAMO.
//
// Dos cambios de fondo pedidos por el jugador:
//  1. LA RECOMPENSA YA NO ES AUTOMÁTICA: al completar el objetivo la misión
//     queda «lista» y es EL JUGADOR quien toca RECLAMAR — si el pago fuera
//     automático, nunca se entera de que le dieron algo.
//  2. TRES ESCALONES: 3 diarias (se renuevan cada día) + 3 semanales (cada
//     lunes) + 3 mensuales (día 1). Pools amplios y sorteo determinista por
//     periodo (semilla = clave del periodo): todos los jugadores del mismo
//     día ven las mismas misiones y las suites pueden reproducirlas.
//
// Pagos por reclamo (addRewards + XP al nivel del jugador):
//   diaria +1 carta · semanal +3 cartas · mensual +8 cartas
//
// Eventos de progreso (hooks llamados desde pvpStore / CollectionScreen):
//   win-games · win-class · play-games · play-class · play-cards · fuse ·
//   play-online · win-lanes · beat-boss · destroy-enemies · rush-run ·
//   story-fight
// ============================================================================

import { create } from "zustand";
import type { GameClass } from "@/lib/game/types";
import { useStatsStore, XP_MISSION } from "./statsStore";
import { useCollectionStore } from "./collectionStore";

export type MissionScope = "daily" | "weekly" | "monthly";

type MissionType =
  | "win-games"
  | "win-class"
  | "play-games"
  | "play-class"
  | "play-cards"
  | "fuse"
  | "play-online"
  | "win-lanes"
  | "beat-boss"
  | "destroy-enemies"
  | "rush-run"
  | "story-fight";

export interface Mission {
  id: string;
  scope: MissionScope;
  type: MissionType;
  /** Solo para win-class / play-class: la clase exigida. */
  cls?: GameClass;
  target: number;
  title: string;
  progress: number;
  /** Objetivo cumplido — esperando que EL JUGADOR reclame. */
  ready: boolean;
  /** Recompensa ya cobrada. */
  claimed: boolean;
}

const STORAGE_KEY = "pacto-de-guerra-misiones";
const DAILY_COUNT = 3;
const WEEKLY_COUNT = 3;
const MONTHLY_COUNT = 3;

const CLASS_LABEL: Record<GameClass, string> = {
  guerrero: "Guerrero",
  mago: "Mago",
  asesino: "Asesino",
  botanico: "Botánico",
  pirata: "Pirata",
  tinker: "Tinker",
};

/** Recompensa por RECLAMO de cada escalón (cartas + XP del nivel). */
export const SCOPE_REWARD: Record<MissionScope, { cards: number; xp: number }> = {
  daily: { cards: 1, xp: XP_MISSION },
  weekly: { cards: 3, xp: 15 },
  monthly: { cards: 8, xp: 40 },
};

/** Etiquetas + línea de renovación para la UI. */
export const SCOPE_META: Record<MissionScope, { label: string; renew: string }> = {
  daily: { label: "Diarias", renew: "Se renuevan cada día" },
  weekly: { label: "Semanales", renew: "Se renuevan cada lunes" },
  monthly: { label: "Mensuales", renew: "Se renuevan el día 1 de cada mes" },
};

// ── Claves de periodo (locales, sin zona horaria rara) ────────────────────

/** Fecha local YYYY-MM-DD (formato "sv": ordenable y sin zona horaria rara). */
export function todayKey(): string {
  return new Date().toLocaleDateString("sv-SE");
}

/** Lunes de la semana actual, YYYY-MM-DD — TODAS las fechas de la misma
 *  semana producen la MISMA clave (la semana se renueva el lunes). */
export function weekKey(d: Date = new Date()): string {
  const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (dt.getDay() + 6) % 7; // lunes = 0 … domingo = 6
  dt.setDate(dt.getDate() - dow);
  return dt.toLocaleDateString("sv-SE");
}

/** Mes actual YYYY-MM — se renueva el día 1. */
export function monthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ── Azar determinista (FNV-1a + mulberry32) ───────────────────────────────

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

// ── Pools de plantillas por escalón ───────────────────────────────────────

interface Template {
  type: MissionType;
  cls?: GameClass;
  target: number;
  title: string;
}

/** 12 plantillas diarias — salen 3 por día (sin repetir tipo) con clases
 *  sorteadas: el día a día varía de verdad. */
function dailyTemplates(dateKey: string): Template[] {
  const rnd = mulberry32(hashStr(`pacto-${dateKey}`));
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
  const clsWin = pick(["guerrero", "mago", "asesino", "botanico", "pirata", "tinker"] as GameClass[]);
  const clsPlay = pick(["guerrero", "mago", "asesino", "botanico", "pirata", "tinker"] as GameClass[]);
  return [
    { type: "win-games", target: 2, title: "Gana 2 partidas (cualquier modo)" },
    { type: "win-class", cls: clsWin, target: 2, title: `Gana 2 partidas con el ${CLASS_LABEL[clsWin]}` },
    { type: "play-games", target: 3, title: "Juega 3 partidas (ganes o pierdas)" },
    { type: "play-class", cls: clsPlay, target: 2, title: `Juega 2 partidas con el ${CLASS_LABEL[clsPlay]}` },
    { type: "play-cards", target: 8, title: "Juega 8 cartas" },
    { type: "fuse", target: 1, title: "Fusiona 1 carta en la Colección" },
    { type: "play-online", target: 1, title: "Juega 1 partida de PvP online" },
    { type: "win-lanes", target: 6, title: "Gana 6 carriles (total)" },
    { type: "beat-boss", target: 1, title: "Vence a 1 JEFE" },
    { type: "destroy-enemies", target: 6, title: "Destruye 6 cartas enemigas" },
    { type: "rush-run", target: 1, title: "Juega 1 partida del Rush de Jefes" },
    { type: "story-fight", target: 2, title: "Gana 2 peleas de El Pacto" },
  ];
}

/** 7 plantillas semanales — salen 3 por semana (objetivos de constancia). */
function weeklyTemplates(weekK: string): Template[] {
  const rnd = mulberry32(hashStr(`pacto-w-${weekK}`));
  return [
    { type: "win-games", target: 10, title: "Gana 10 partidas esta semana" },
    { type: "play-cards", target: 40, title: "Juega 40 cartas esta semana" },
    { type: "win-lanes", target: 25, title: "Gana 25 carriles esta semana" },
    { type: "beat-boss", target: 5, title: "Vence a 5 JEFES esta semana" },
    { type: "fuse", target: 3, title: "Fusiona 3 cartas esta semana" },
    { type: "play-online", target: 5, title: "Juega 5 partidas online esta semana" },
    { type: "destroy-enemies", target: 25, title: "Destruye 25 cartas enemigas esta semana" },
  ];
}

/** 5 plantillas mensuales — salen 3 por mes (objetivos grandes, pago grande). */
function monthlyTemplates(monthK: string): Template[] {
  const rnd = mulberry32(hashStr(`pacto-m-${monthK}`));
  return [
    { type: "win-games", target: 40, title: "Gana 40 partidas este mes" },
    { type: "play-cards", target: 120, title: "Juega 120 cartas este mes" },
    { type: "beat-boss", target: 15, title: "Vence a 15 JEFES este mes" },
    { type: "win-lanes", target: 80, title: "Gana 80 carriles este mes" },
    { type: "destroy-enemies", target: 80, title: "Destruye 80 cartas enemigas este mes" },
  ];
}

/** Fisher-Yates con la semilla del periodo y tomamos N distintas. */
function sampleN<T>(arr: T[], n: number, rnd: () => number): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, n);
}

/** Construye las misiones de un periodo (pura — reproducible en tests). */
export function buildMissions(scope: MissionScope, periodKey: string): Mission[] {
  let pool: Template[];
  let seed = periodKey;
  let count = DAILY_COUNT;
  if (scope === "daily") {
    pool = dailyTemplates(periodKey);
  } else if (scope === "weekly") {
    pool = weeklyTemplates(periodKey);
    seed = `w-${periodKey}`;
    count = WEEKLY_COUNT;
  } else {
    pool = monthlyTemplates(periodKey);
    seed = `m-${periodKey}`;
    count = MONTHLY_COUNT;
  }
  const rnd = mulberry32(hashStr(`pacto-${seed}`));
  return sampleN(pool, count, rnd).map((t, i) => ({
    id: `${periodKey}-${t.type}-${i}`,
    scope,
    type: t.type,
    cls: t.cls,
    target: t.target,
    title: t.title,
    progress: 0,
    ready: false,
    claimed: false,
  }));
}

// ── Persistencia (1 sola clave, 3 escalones dentro) ───────────────────────

interface ScopeSave {
  key: string;
  missions: Mission[];
}
interface Save {
  daily: ScopeSave;
  weekly: ScopeSave;
  monthly: ScopeSave;
}

function currentPeriods(): { daily: string; weekly: string; monthly: string } {
  return { daily: todayKey(), weekly: weekKey(), monthly: monthKey() };
}

function buildScope(scope: MissionScope, key: string): ScopeSave {
  return { key, missions: buildMissions(scope, key) };
}

function validList(list: unknown): list is Mission[] {
  return (
    Array.isArray(list) &&
    list.length > 0 &&
    list.every(
      (m) =>
        m &&
        typeof m.id === "string" &&
        typeof m.type === "string" &&
        typeof m.target === "number" &&
        typeof m.progress === "number" &&
        typeof m.ready === "boolean" &&
        typeof m.claimed === "boolean" &&
        typeof m.title === "string"
    )
  );
}

function loadState(): Save {
  const p = currentPeriods();
  const fresh = (): Save => ({
    daily: buildScope("daily", p.daily),
    weekly: buildScope("weekly", p.weekly),
    monthly: buildScope("monthly", p.monthly),
  });
  if (typeof window === "undefined") {
    // SSR: mismas misiones deterministas que el cliente → sin mismatch.
    return fresh();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Save>;
      if (
        parsed?.daily &&
        typeof parsed.daily.key === "string" &&
        validList(parsed.daily.missions) &&
        parsed?.weekly &&
        typeof parsed.weekly.key === "string" &&
        validList(parsed.weekly.missions) &&
        parsed?.monthly &&
        typeof parsed.monthly.key === "string" &&
        validList(parsed.monthly.missions)
      ) {
        return { daily: parsed.daily, weekly: parsed.weekly, monthly: parsed.monthly };
      }
      // Formato v1 ({dateKey, missions} auto-pagadas) u JSON corrupto →
      // se regenera: las diarias viejas ya pagaron en su día, no hay doble cobro.
    }
  } catch {
    // JSON corrupto → regenerar
  }
  const s = fresh();
  persistSave(s);
  return s;
}

function persistSave(s: Save): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // sin persistencia — la sesión sigue
  }
}

// ── Store ─────────────────────────────────────────────────────────────────

interface MissionState {
  dailyKey: string;
  daily: Mission[];
  weeklyKey: string;
  weekly: Mission[];
  monthlyKey: string;
  monthly: Mission[];
  /** Última recompensa RECLAMADA (para toast; {title, cards, at}). */
  lastClaimed: { title: string; cards: number; xp: number; at: number } | null;
  /** Rota a las misiones del periodo vigente si cambió el día/semana/mes. */
  ensurePeriods: () => void;
  /** Suma progreso a TODOS los escalones con ese tipo. Al llegar al objetivo
   *  la misión queda LISTA — el pago lo da claim(). */
  progress: (type: MissionType, amount?: number, cls?: GameClass | null) => void;
  /** EL JUGADOR cobra: paga cartas + XP y marca la misión reclamada. */
  claim: (scope: MissionScope, id: string) => void;
  clearClaimedToast: () => void;
  /** Solo tests: fuerza misiones arbitrarias en un escalón. */
  __setForTest: (scope: MissionScope, missions: Mission[]) => void;
}

export const useMissionStore = create<MissionState>((set, get) => {
  const initial = loadState();

  /** Rota los escalones cuyo periodo cambió; devuelve el estado (nuevo o no). */
  const rotateIfStale = (): MissionState => {
    const s = get();
    const p = currentPeriods();
    if (s.dailyKey === p.daily && s.weeklyKey === p.weekly && s.monthlyKey === p.monthly) {
      return s;
    }
    const next: MissionState = {
      ...s,
      dailyKey: p.daily,
      weeklyKey: p.weekly,
      monthlyKey: p.monthly,
      daily: s.dailyKey === p.daily ? s.daily : buildMissions("daily", p.daily),
      weekly: s.weeklyKey === p.weekly ? s.weekly : buildMissions("weekly", p.weekly),
      monthly: s.monthlyKey === p.monthly ? s.monthly : buildMissions("monthly", p.monthly),
      lastClaimed: null,
    };
    set(next);
    persistSave({ daily: { key: next.dailyKey, missions: next.daily }, weekly: { key: next.weeklyKey, missions: next.weekly }, monthly: { key: next.monthlyKey, missions: next.monthly } });
    return next;
  };

  return {
    dailyKey: initial.daily.key,
    daily: initial.daily.missions,
    weeklyKey: initial.weekly.key,
    weekly: initial.weekly.missions,
    monthlyKey: initial.monthly.key,
    monthly: initial.monthly.missions,
    lastClaimed: null,

    ensurePeriods: () => {
      rotateIfStale();
    },

    progress: (type, amount = 1, cls = null) => {
      // Si cambió el día/semana/mes mientras jugabas, rota primero.
      const s0 = rotateIfStale();
      let changed = false;
      const step = (m: Mission): Mission => {
        if (m.ready || m.claimed || m.type !== type) return m;
        if ((type === "win-class" || type === "play-class") && m.cls && cls && m.cls !== cls) return m;
        changed = true;
        const p = Math.min(m.target, m.progress + amount);
        return { ...m, progress: p, ready: p >= m.target };
      };
      const daily = s0.daily.map(step);
      const weekly = s0.weekly.map(step);
      const monthly = s0.monthly.map(step);
      if (!changed) return;
      set({ daily, weekly, monthly });
      persistSave({ daily: { key: get().dailyKey, missions: daily }, weekly: { key: get().weeklyKey, missions: weekly }, monthly: { key: get().monthlyKey, missions: monthly } });
    },

    claim: (scope, id) => {
      const s = get();
      const list = scope === "daily" ? s.daily : scope === "weekly" ? s.weekly : s.monthly;
      const m = list.find((x) => x.id === id);
      if (!m || !m.ready || m.claimed) return;
      const reward = SCOPE_REWARD[scope];
      try {
        useCollectionStore.getState().addRewards(reward.cards);
        useStatsStore.getState().addXp(reward.xp);
      } catch {
        // sin colección disponible — la misión se marca igual
      }
      const next = list.map((x) => (x.id === id ? { ...x, claimed: true } : x));
      const lastClaimed = { title: m.title, cards: reward.cards, xp: reward.xp, at: Date.now() };
      if (scope === "daily") set({ daily: next, lastClaimed });
      else if (scope === "weekly") set({ weekly: next, lastClaimed });
      else set({ monthly: next, lastClaimed });
      persistSave({ daily: { key: get().dailyKey, missions: get().daily }, weekly: { key: get().weeklyKey, missions: get().weekly }, monthly: { key: get().monthlyKey, missions: get().monthly } });
    },

    clearClaimedToast: () => set({ lastClaimed: null }),

    __setForTest: (scope, missions) => {
      const p = currentPeriods();
      const key = scope === "daily" ? p.daily : scope === "weekly" ? p.weekly : p.monthly;
      if (scope === "daily") set({ daily: missions, dailyKey: key });
      else if (scope === "weekly") set({ weekly: missions, weeklyKey: key });
      else set({ monthly: missions, monthlyKey: key });
      persistSave({ daily: { key: get().dailyKey, missions: get().daily }, weekly: { key: get().weeklyKey, missions: get().weekly }, monthly: { key: get().monthlyKey, missions: get().monthly } });
    },
  };
});
