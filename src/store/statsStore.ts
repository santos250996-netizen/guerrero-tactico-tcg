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
import type { GameClass } from "@/lib/game/types";

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
  registerMatch: (
    result: MatchResult,
    opts: { cls?: GameClass | null; online: boolean; boss?: boolean }
  ) => void;
  resetStats: () => void;
}

function load(): Pick<StatsState, "perClass" | "streak" | "bestWinStreak" | "rankPoints" | "onlineGames" | "bossWins"> {
  if (typeof window === "undefined") {
    return { perClass: {}, streak: 0, bestWinStreak: 0, rankPoints: 0, onlineGames: 0, bossWins: 0 };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { perClass: {}, streak: 0, bestWinStreak: 0, rankPoints: 0, onlineGames: 0, bossWins: 0 };
    const p = JSON.parse(raw) as Partial<StatsState>;
    return {
      perClass: p.perClass ?? {},
      streak: p.streak ?? 0,
      bestWinStreak: p.bestWinStreak ?? 0,
      rankPoints: p.rankPoints ?? 0,
      onlineGames: p.onlineGames ?? 0,
      bossWins: p.bossWins ?? 0,
    };
  } catch {
    return { perClass: {}, streak: 0, bestWinStreak: 0, rankPoints: 0, onlineGames: 0, bossWins: 0 };
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
      })
    );
  } catch {
    // almacenamiento lleno/bloqueado — la sesión sigue sin persistir
  }
}

export const useStatsStore = create<StatsState>((set, get) => ({
  ...load(),

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
    const next = { perClass, streak, bestWinStreak, rankPoints, onlineGames, bossWins };
    set(next);
    persist({ ...next } as StatsState);
  },

  resetStats: () => {
    const empty = { perClass: {}, streak: 0, bestWinStreak: 0, rankPoints: 0, onlineGames: 0, bossWins: 0 };
    set(empty);
    persist({ ...empty } as StatsState);
  },
}));
