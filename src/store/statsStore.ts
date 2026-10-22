"use client";

// ============================================================================
// statsStore — estadísticas amplias del jugador + LIGA de PvP.
//
// Dos responsabilidades:
//  1. Stats por clase (partidas/victorias) y rachas — se alimentan de TODOS
//     los modos (historia vs bot y PvP online).
//  2. Rangos PvP (Bronce → Plata → Oro → Leyenda): puntos SOLO del PvP
//     online (jugar contra bots es práctica y no da liga).
//
// Persistencia: localStorage ("pacto-de-guerra-stats").
// ============================================================================

import { create } from "zustand";
import type { GameClass, Rarity } from "@/lib/game/types";

export type MatchResult = "WIN" | "LOSS" | "DRAW";

export interface League {
  id: "bronce" | "plata" | "oro" | "leyenda";
  name: string;
  min: number;
}

export const LEAGUES: League[] = [
  { id: "bronce", name: "Bronce", min: 0 },
  { id: "plata", name: "Plata", min: 100 },
  { id: "oro", name: "Oro", min: 250 },
  { id: "leyenda", name: "Leyenda", min: 450 },
];

/** Puntos de liga por partida online. */
export const RANK_WIN = 25;
export const RANK_LOSS = -10;
export const RANK_DRAW = 5;

// ── NIVEL DEL JUGADOR (progresión de drops) ──────────────────────────────
// XP por partida: ganar 6 · perder 3 · empate 4 · +10 extra por JEFE ganado.
// Cada nivel sube la MESA DE DROPS: al principio solo comunes; con los
// niveles llegan raras, épicas y por fin legendarias (véase dropTableFor).
export const XP_WIN = 6;
export const XP_LOSS = 3;
export const XP_DRAW = 4;
export const XP_BOSS_BONUS = 10;
export const XP_MISSION = 4;

/** XP necesaria para pasar DEL nivel `level` al siguiente. */
export function xpForNext(level: number): number {
  return 10 + (level - 1) * 6;
}

/** Mesa de rareza de los DROPS según el nivel: el progreso se SIENTE. */
export function dropTableFor(level: number): [Rarity, number][] {
  if (level >= 10) return [["common", 0.5], ["rare", 0.28], ["epic", 0.15], ["legendary", 0.07]];
  if (level >= 7) return [["common", 0.55], ["rare", 0.29], ["epic", 0.13], ["legendary", 0.03]];
  if (level >= 5) return [["common", 0.65], ["rare", 0.28], ["epic", 0.07]];
  if (level >= 3) return [["common", 0.8], ["rare", 0.2]];
  return [["common", 1]];
}

/** Cartas EXTRA por victoria (además de las 2 base): +1 en N5, +1 más en N10. */
export function bonusDropCards(level: number): number {
  return (level >= 10 ? 1 : 0) + (level >= 5 ? 1 : 0);
}

export function leagueOf(points: number): League {
  let cur = LEAGUES[0];
  for (const l of LEAGUES) if (points >= l.min) cur = l;
  return cur;
}

/** Siguiente liga (null si ya es Leyenda). */
export function nextLeagueOf(points: number): League | null {
  const idx = LEAGUES.indexOf(leagueOf(points));
  return idx < LEAGUES.length - 1 ? LEAGUES[idx + 1] : null;
}

export interface ClassStat {
  matches: number;
  wins: number;
}

const STORAGE_KEY = "pacto-de-guerra-stats";

interface StatsState {
  /** partidas/victorias por clase (todos los modos). */
  perClass: Partial<Record<GameClass, ClassStat>>;
  /** +N racha de victorias · −N racha de derrotas · 0 tras empate. */
  streak: number;
  bestWinStreak: number;
  /** Puntos de la liga PvP (solo online). */
  rankPoints: number;
  /** Partidas PvP online jugadas (para misiones y stats). */
  onlineGames: number;
  bossWins: number;
  /** Nivel del jugador + XP acumulada hacia el siguiente nivel. */
  level: number;
  xp: number;
  /** Última subida de nivel (para celebrarla en UI; null si ya se vio). */
  levelUpFlash: { from: number; to: number } | null;
  // ── RUSH DE JEFES (plan-expansion-v3 §3.2) ──
  /** Mejor run por clase: jefes vencidos en una sola run (0..3). */
  rushBest: Partial<Record<GameClass, number>>;
  /** Runs de Rush jugadas (stat de perfil). */
  rushRuns: number;
  /** Ciclos de campaña (prestigio) con al menos UNA run completa — la 1ª
   *  vez que completas un ciclo el jefe 3 paga legendaria garantizada. */
  rushCyclesDone: number[];
  registerMatch: (
    result: MatchResult,
    opts: { cls?: GameClass | null; online: boolean; boss?: boolean }
  ) => void;
  /** Registra el cierre de una run de Rush (victoria parcial, derrota o run
   *  completa): mejor run por clase, contador de runs y ciclos completados. */
  registerRush: (opts: { cls: GameClass; beaten: number; completed: boolean; cycle: number }) => void;
  /** Suma XP (misiones, hitos) y devuelve el nivel resultante. */
  addXp: (amount: number) => { level: number; leveledUp: boolean };
  clearLevelUpFlash: () => void;
  resetStats: () => void;
}

function load(): Pick<StatsState, "perClass" | "streak" | "bestWinStreak" | "rankPoints" | "onlineGames" | "bossWins" | "level" | "xp" | "rushBest" | "rushRuns" | "rushCyclesDone"> {
  const empty = { perClass: {}, streak: 0, bestWinStreak: 0, rankPoints: 0, onlineGames: 0, bossWins: 0, level: 1, xp: 0, rushBest: {}, rushRuns: 0, rushCyclesDone: [] as number[] };
  if (typeof window === "undefined") return empty;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const p = JSON.parse(raw) as Partial<StatsState>;
    return {
      perClass: p.perClass ?? {},
      streak: p.streak ?? 0,
      bestWinStreak: p.bestWinStreak ?? 0,
      rankPoints: p.rankPoints ?? 0,
      onlineGames: p.onlineGames ?? 0,
      bossWins: p.bossWins ?? 0,
      level: p.level ?? 1,
      xp: p.xp ?? 0,
      rushBest: p.rushBest ?? {},
      rushRuns: p.rushRuns ?? 0,
      rushCyclesDone: Array.isArray(p.rushCyclesDone) ? p.rushCyclesDone : [],
    };
  } catch {
    return empty;
  }
}

function persist(s: StatsState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        perClass: s.perClass,
        streak: s.streak,
        bestWinStreak: s.bestWinStreak,
        rankPoints: s.rankPoints,
        onlineGames: s.onlineGames,
        bossWins: s.bossWins,
        level: s.level,
        xp: s.xp,
        rushBest: s.rushBest,
        rushRuns: s.rushRuns,
        rushCyclesDone: s.rushCyclesDone,
      })
    );
  } catch {
    // almacenamiento lleno/bloqueado — la sesión sigue sin persistir
  }
}

export const useStatsStore = create<StatsState>((set, get) => ({
  ...load(),
  levelUpFlash: null,

  registerMatch: (result, opts) => {
    const s = get();
    const perClass = { ...s.perClass };
    if (opts.cls) {
      const cur = perClass[opts.cls] ?? { matches: 0, wins: 0 };
      perClass[opts.cls] = { matches: cur.matches + 1, wins: cur.wins + (result === "WIN" ? 1 : 0) };
    }
    let streak = s.streak;
    if (result === "WIN") streak = Math.max(0, streak) + 1;
    else if (result === "LOSS") streak = Math.min(0, streak) - 1;
    else streak = 0;
    const bestWinStreak = Math.max(s.bestWinStreak, streak);
    let rankPoints = s.rankPoints;
    let onlineGames = s.onlineGames;
    if (opts.online) {
      onlineGames += 1;
      const delta = result === "WIN" ? RANK_WIN : result === "LOSS" ? RANK_LOSS : RANK_DRAW;
      rankPoints = Math.max(0, rankPoints + delta);
    }
    const bossWins = s.bossWins + (opts.boss && result === "WIN" ? 1 : 0);

    // XP de la partida (todas las modalidades cuentan para el nivel)
    let xp = s.xp + (result === "WIN" ? XP_WIN : result === "LOSS" ? XP_LOSS : XP_DRAW);
    if (opts.boss && result === "WIN") xp += XP_BOSS_BONUS;
    let level = s.level;
    let levelUpFlash: StatsState["levelUpFlash"] = s.levelUpFlash;
    while (xp >= xpForNext(level) && level < 99) {
      xp -= xpForNext(level);
      levelUpFlash = { from: level, to: level + 1 };
      level += 1;
    }

    const next = { perClass, streak, bestWinStreak, rankPoints, onlineGames, bossWins, level, xp, levelUpFlash };
    set(next);
    persist({ ...next } as StatsState);
  },

  addXp: (amount) => {
    const s = get();
    let xp = s.xp + amount;
    let level = s.level;
    let leveledUp = false;
    while (xp >= xpForNext(level) && level < 99) {
      xp -= xpForNext(level);
      level += 1;
      leveledUp = true;
    }
    set({ xp, level, levelUpFlash: leveledUp ? { from: s.level, to: level } : s.levelUpFlash });
    persist(get() as StatsState);
    return { level, leveledUp };
  },

  registerRush: ({ cls, beaten, completed, cycle }) => {
    const s = get();
    const prev = s.rushBest[cls] ?? 0;
    const rushBest = { ...s.rushBest, [cls]: Math.max(prev, beaten) };
    const rushCyclesDone = completed && !s.rushCyclesDone.includes(cycle)
      ? [...s.rushCyclesDone, cycle]
      : s.rushCyclesDone;
    const next = { ...s, rushBest, rushRuns: s.rushRuns + 1, rushCyclesDone };
    set(next);
    persist(next);
  },

  clearLevelUpFlash: () => {
    set({ levelUpFlash: null });
  },

  resetStats: () => {
    const empty = { perClass: {}, streak: 0, bestWinStreak: 0, rankPoints: 0, onlineGames: 0, bossWins: 0, level: 1, xp: 0, levelUpFlash: null, rushBest: {}, rushRuns: 0, rushCyclesDone: [] } as unknown as StatsState;
    set(empty);
    persist({ ...empty } as StatsState);
  },
}));
