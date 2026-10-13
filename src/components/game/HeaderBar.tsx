"use client";

import {
  BookOpen, History, Swords, Library, Settings, User,
} from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { Button } from "@/components/ui/button";
import { EnergyCrystals } from "./EnergyCrystals";

// Total turns is a fixed rule constant (6 turns, energy 1→6).
const MAX_TURNS = 6;

interface HeaderBarProps {
  onOpenRules: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
}

export function HeaderBar({ onOpenRules, onOpenHistory, onOpenSettings, onOpenProfile }: HeaderBarProps) {
  const turn = useGameStore((s) => s.turn);
  const energy = useGameStore((s) => s.energy);
  const maxEnergy = useGameStore((s) => s.maxEnergy);
  const drawPile = useGameStore((s) => s.drawPile);
  const phase = useGameStore((s) => s.phase);
  const setView = useGameStore((s) => s.setView);
  const deckDirty = useGameStore((s) => s.deckDirty);

  return (
    <header className="relative flex items-center justify-between gap-1 border-b border-zinc-800/80 bg-zinc-950/95 px-2.5 pt-3 pb-2 backdrop-blur">
      {/* Left: brand */}
      <div className="flex items-center gap-1.5 min-w-0">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-amber-500 to-rose-600 shadow-md shrink-0">
          <Swords className="h-3.5 w-3.5 text-white" />
        </div>
        <div className="leading-tight min-w-0">
          <div className="text-[9px] uppercase tracking-widest text-amber-400 truncate">Guerrero</div>
          <div className="text-[11px] font-bold text-white truncate">Táctico</div>
        </div>
      </div>

      {/* Center: turn + energy compact */}
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-0.5 rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[9px] text-zinc-200">
          <span className="text-zinc-500">T</span>
          <span className="font-bold tabular-nums text-white">{turn}<span className="text-zinc-500">/{MAX_TURNS}</span></span>
        </div>
        <EnergyCrystals current={energy} max={maxEnergy} />
        <div className="flex items-center gap-0.5 rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[9px] text-zinc-300">
          <span className="text-zinc-500">☗</span>
          <span className="font-bold tabular-nums">{drawPile.length}</span>
        </div>
      </div>

      {/* Right: action buttons — icon only */}
      <div className="flex items-center gap-0.5 shrink-0">
        <Button size="sm" variant="outline" className="relative h-7 w-7 border-amber-700/60 bg-amber-950/40 p-0 text-amber-300 hover:bg-amber-900/40" onClick={() => setView("editor")} title="Editor de mazo">
          <Library className="h-3.5 w-3.5" />
          {deckDirty && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-zinc-900 bg-amber-400" />}
        </Button>
        <Button size="sm" variant="outline" className="h-7 w-7 border-zinc-700 bg-zinc-900 p-0 text-zinc-200 hover:bg-zinc-800" onClick={onOpenRules} title="Reglas">
          <BookOpen className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="outline" className="h-7 w-7 border-zinc-700 bg-zinc-900 p-0 text-zinc-200 hover:bg-zinc-800" onClick={onOpenHistory} title="Historial">
          <History className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="outline" className="h-7 w-7 border-zinc-700 bg-zinc-900 p-0 text-zinc-300 hover:bg-zinc-800" onClick={onOpenProfile} title="Perfil">
          <User className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="outline" className="h-7 w-7 border-zinc-700 bg-zinc-900 p-0 text-zinc-300 hover:bg-zinc-800" onClick={onOpenSettings} title="Ajustes">
          <Settings className="h-3.5 w-3.5" />
        </Button>
      </div>
    </header>
  );
}
