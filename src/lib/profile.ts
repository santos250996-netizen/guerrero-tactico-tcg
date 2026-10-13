"use client";
export interface ProfileStats {
  totalGames: number; wins: number; losses: number; draws: number;
  currentStreak: number; bestStreak: number;
  totalCardsPlayed: number; totalBuffsApplied: number; totalEnemiesDestroyed: number;
  cardPlayCounts: Record<string, number>;
}
const KEY = "guerrero-tactico-profile";
const DEFAULTS: ProfileStats = { totalGames: 0, wins: 0, losses: 0, draws: 0, currentStreak: 0, bestStreak: 0, totalCardsPlayed: 0, totalBuffsApplied: 0, totalEnemiesDestroyed: 0, cardPlayCounts: {} };
export function loadProfileStats(): ProfileStats { if (typeof window === "undefined") return { ...DEFAULTS }; try { const r = localStorage.getItem(KEY); return r ? { ...DEFAULTS, ...JSON.parse(r) } : { ...DEFAULTS }; } catch { return { ...DEFAULTS }; } }
export function saveProfileStats(s: ProfileStats) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} }
export function updateProfileAfterGame(result: "WIN" | "LOSS" | "DRAW", gs: { cardsPlayedByPlayer: number; buffsApplied: number; enemyCardsDestroyed: number; }, ids: string[]): ProfileStats {
  const c = loadProfileStats(); const n: ProfileStats = { ...c };
  n.totalGames++; n.totalCardsPlayed += gs.cardsPlayedByPlayer; n.totalBuffsApplied += gs.buffsApplied; n.totalEnemiesDestroyed += gs.enemyCardsDestroyed;
  if (result === "WIN") { n.wins++; n.currentStreak++; n.bestStreak = Math.max(n.bestStreak, n.currentStreak); }
  else if (result === "LOSS") { n.losses++; n.currentStreak = 0; } else { n.draws++; }
  for (const id of ids) n.cardPlayCounts[id] = (n.cardPlayCounts[id] || 0) + 1;
  saveProfileStats(n); return n;
}
export function getMostPlayedCard(s: ProfileStats): string | null { let b: string | null = null, bc = 0; for (const [id, c] of Object.entries(s.cardPlayCounts)) if (c > bc) { b = id; bc = c; } return b; }
