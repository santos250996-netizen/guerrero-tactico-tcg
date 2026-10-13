"use client";

import {
  Layers, BookOpen, History, RotateCcw, Swords, Library, Settings, User,
} from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { Button } from "@/components/ui/button";
import { EnergyCrystals } from "./EnergyCrystals";
import { sfx } from "@/lib/sound";

interface HeaderBarProps {
  onOpenRules: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
}

export function HeaderBar({ onOpenRules, onOpenHistory, onOpenSettings, onOpenProfile }: HeaderBarProps) {
  const turn = useGameStore((s) => s.turn);
  const maxTurns = useGameStore((s) => s.maxTurns);
  const energy = useGameStore((s) => s.energy);
  const maxEnergy = useGameStore((s) => s.maxEnergy);
  const drawPile = useGameStore((s) => s.drawPile);
  const phase = useGameStore((s) => s.phase);
  const endTurn = useGameStore((s) => s.endTurn);
  const resetGame = useGameStore((s) => s.resetGame);
  const setView = useGameStore((s) => s.setView);
  const deckDirty = useGameStore((s) => s.deckDirty);

  return (
    <header className="flex items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-950/80 px-3 py-2 backdrop-blur">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-gradient-to-br from-amber-500 to-rose-600 shadow-md">
          <Swords className="h-4 w-4 text-white" />
        </div>
        <div className="leading-tight">
          <div className="text-[10px] uppercase tracking-widest text-amber-400">Guerrero</div>
          <div className="text-xs font-bold text-white">Táctico</div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-200">
          <span className="text-zinc-500">TURNO</span>
          <span className="font-bold tabular-nums text-white">{turn}<span className="text-zinc-500">/{maxTurns}</span></span>
        </div>

        <EnergyCrystals current={energy} max={maxEnergy} />

        <div className="hidden items-center gap-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-300 sm:flex">
          <Layers className="h-3.5 w-3.5 text-zinc-500" />
          <span className="font-bold tabular-nums">{drawPile.length}</span>
        </div>

        <Button size="sm" variant="outline" className="border-amber-700/60 bg-amber-950/40 text-amber-300 hover:bg-amber-900/40" onClick={() => setView("editor")}>
          <Library className="h-3.5 w-3.5" /><span className="hidden sm:inline">Editor</span>
          {deckDirty && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-zinc-900 bg-amber-400" />}
        </Button>

        <Button size="sm" variant="outline" className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800" onClick={onOpenRules}>
          <BookOpen className="h-3.5 w-3.5" /><span className="hidden sm:inline">Reglas</span>
        </Button>
        <Button size="sm" variant="outline" className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800" onClick={onOpenHistory}>
          <History className="h-3.5 w-3.5" /><span className="hidden sm:inline">Historial</span>
        </Button>
        <Button size="sm" variant="outline" className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800" onClick={onOpenProfile}>
          <User className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="outline" className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800" onClick={onOpenSettings}>
          <Settings className="h-3.5 w-3.5" />
        </Button>

        {phase === "playing" ? (
          <Button size="sm" className="bg-gradient-to-r from-amber-600 to-rose-600 text-white hover:from-amber-500 hover:to-rose-500" onClick={() => { sfx.click(); endTurn(); }}>
            <RotateCcw className="h-3.5 w-3.5" />Pasar
          </Button>
        ) : (
          <Button size="sm" variant="secondary" className="bg-zinc-800 text-zinc-200" onClick={resetGame}>
            <RotateCcw className="h-3.5 w-3.5" />Reiniciar
          </Button>
        )}
      </div>
    </header>
  );
}
