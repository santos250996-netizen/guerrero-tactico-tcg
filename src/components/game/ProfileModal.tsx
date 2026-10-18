"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Trophy, Skull, Equal, Flame, Swords, Zap, Target } from "lucide-react";
import { loadProfileStats, getMostPlayedCard } from "@/lib/profile";
import { WARRIOR_DECK, TACTICAL_CARDS, BASIC_CARDS } from "@/lib/game/cards";
import { useEffect, useState } from "react";

const ALL = [...BASIC_CARDS, ...WARRIOR_DECK, ...TACTICAL_CARDS];

export function ProfileModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [stats, setStats] = useState(loadProfileStats());
  useEffect(() => { if (open) { let c = false; Promise.resolve().then(() => { if (!c) setStats(loadProfileStats()); }); return () => { c = true; }; } }, [open]);
  const winRate = stats.totalGames > 0 ? Math.round((stats.wins / stats.totalGames) * 100) : 0;
  const mpId = getMostPlayedCard(stats); const mpCard = mpId ? ALL.find((c) => c.id === mpId) : null;
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-md">
      <DialogHeader><DialogTitle className="text-amber-400">Perfil de Jugador</DialogTitle><DialogDescription className="text-zinc-400">Tu historial de batallas.</DialogDescription></DialogHeader>
      {stats.totalGames === 0 ? <div className="py-6 text-center text-sm text-zinc-500">Aún no has jugado ninguna partida.</div> :
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded border border-emerald-800/40 bg-emerald-950/40 p-2 text-center"><Trophy className="mx-auto mb-1 h-4 w-4 text-emerald-400" /><div className="text-lg font-bold text-emerald-400">{stats.wins}</div><div className="text-[9px] uppercase text-zinc-500">Victorias</div></div>
          <div className="rounded border border-rose-800/40 bg-rose-950/40 p-2 text-center"><Skull className="mx-auto mb-1 h-4 w-4 text-rose-400" /><div className="text-lg font-bold text-rose-400">{stats.losses}</div><div className="text-[9px] uppercase text-zinc-500">Derrotas</div></div>
          <div className="rounded border border-amber-800/40 bg-amber-950/40 p-2 text-center"><Equal className="mx-auto mb-1 h-4 w-4 text-amber-400" /><div className="text-lg font-bold text-amber-400">{stats.draws}</div><div className="text-[9px] uppercase text-zinc-500">Empates</div></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded border border-zinc-700 bg-zinc-900 p-2 text-center"><div className="text-[9px] uppercase text-zinc-500">Win Rate</div><div className="text-xl font-bold text-white">{winRate}%</div></div>
          <div className="rounded border border-zinc-700 bg-zinc-900 p-2 text-center"><Flame className="mx-auto mb-0.5 h-3 w-3 text-amber-400" /><div className="text-[9px] uppercase text-zinc-500">Racha</div><div className="text-xl font-bold text-amber-400">{stats.currentStreak}</div></div>
        </div>
        {stats.bestStreak > 0 && <div className="flex items-center justify-between rounded border border-amber-800/40 bg-amber-950/20 px-3 py-1.5 text-xs"><span className="flex items-center gap-1.5 text-amber-300"><Trophy className="h-3.5 w-3.5" /> Mejor racha</span><span className="font-bold text-amber-400">{stats.bestStreak} seguidas</span></div>}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="rounded border border-zinc-700 bg-zinc-900 p-1.5 text-center"><Swords className="mx-auto mb-0.5 h-3 w-3 text-rose-400" /><div className="text-sm font-bold text-white">{stats.totalCardsPlayed}</div><div className="text-[8px] text-zinc-500">Cartas</div></div>
          <div className="rounded border border-zinc-700 bg-zinc-900 p-1.5 text-center"><Zap className="mx-auto mb-0.5 h-3 w-3 text-emerald-400" /><div className="text-sm font-bold text-white">{stats.totalBuffsApplied}</div><div className="text-[8px] text-zinc-500">Buffs</div></div>
          <div className="rounded border border-zinc-700 bg-zinc-900 p-1.5 text-center"><Target className="mx-auto mb-0.5 h-3 w-3 text-amber-400" /><div className="text-sm font-bold text-white">{stats.totalEnemiesDestroyed}</div><div className="text-[8px] text-zinc-500">Bajas</div></div>
        </div>
        {mpCard && <div className="rounded border border-zinc-700 bg-zinc-900 p-2"><div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Carta más jugada</div><div className="mt-1 flex items-center gap-2"><div className="h-10 w-10 overflow-hidden rounded border border-zinc-700"><img src={`/cards/${mpCard.id}.png`} alt={mpCard.name} className="h-full w-full object-cover" draggable={false}
        decoding="async" /></div><div><div className="text-sm font-bold text-white">{mpCard.name}</div><div className="text-[10px] text-zinc-500">Jugada {stats.cardPlayCounts[mpCard.id]} veces</div></div></div></div>}
      </div>}
    </DialogContent>
  </Dialog>;
}
