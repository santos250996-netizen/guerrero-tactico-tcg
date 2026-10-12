"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Battery, Layers, BookOpen, History, RotateCcw, Swords } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { Button } from "@/components/ui/button";

interface HeaderBarProps {
  onOpenRules: () => void;
  onOpenHistory: () => void;
}

export function HeaderBar({ onOpenRules, onOpenHistory }: HeaderBarProps) {
  const turn = useGameStore((s) => s.turn);
  const maxTurns = useGameStore((s) => s.maxTurns);
  const energy = useGameStore((s) => s.energy);
  const maxEnergy = useGameStore((s) => s.maxEnergy);
  const drawPile = useGameStore((s) => s.drawPile);
  const phase = useGameStore((s) => s.phase);
  const endTurn = useGameStore((s) => s.endTurn);
  const resetGame = useGameStore((s) => s.resetGame);

  const energyPct = maxEnergy > 0 ? (energy / maxEnergy) * 100 : 0;

  return (
    <header className="flex items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-950/80 px-3 py-2 backdrop-blur">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-gradient-to-br from-amber-500 to-rose-600 shadow-md">
          <Swords className="h-4 w-4 text-white" />
        </div>
        <div className="leading-tight">
          <div className="text-[10px] uppercase tracking-widest text-amber-400">
            Guerrero
          </div>
          <div className="text-xs font-bold text-white">Táctico</div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Turn badge */}
        <div className="flex items-center gap-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-200">
          <span className="text-zinc-500">TURNO</span>
          <span className="font-bold tabular-nums text-white">
            {turn}
            <span className="text-zinc-500">/{maxTurns}</span>
          </span>
        </div>

        {/* Energy badge */}
        <div className="flex items-center gap-1.5 rounded border border-emerald-700/50 bg-emerald-950/60 px-2 py-1">
          <Battery className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-[11px] font-bold tabular-nums text-emerald-300">
            {energy}
            <span className="text-emerald-700">/{maxEnergy}</span>
          </span>
          <div className="ml-1 h-1.5 w-10 overflow-hidden rounded bg-emerald-950">
            <div
              className="h-full bg-emerald-400 transition-all"
              style={{ width: `${energyPct}%` }}
            />
          </div>
        </div>

        {/* Deck count */}
        <div className="hidden items-center gap-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-300 sm:flex">
          <Layers className="h-3.5 w-3.5 text-zinc-500" />
          <span className="font-bold tabular-nums">{drawPile.length}</span>
        </div>

        {/* Buttons */}
        <Button
          size="sm"
          variant="outline"
          className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
          onClick={onOpenRules}
          aria-label="Ver reglas"
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Reglas</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
          onClick={onOpenHistory}
          aria-label="Ver historial"
        >
          <History className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Historial</span>
        </Button>

        {phase === "playing" ? (
          <Button
            size="sm"
            className="bg-gradient-to-r from-amber-600 to-rose-600 text-white hover:from-amber-500 hover:to-rose-500"
            onClick={endTurn}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Pasar
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            className="bg-zinc-800 text-zinc-200"
            onClick={resetGame}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reiniciar
          </Button>
        )}
      </div>
    </header>
  );
}

// Animated turn-bar transition helper (optional export)
export function TurnTransition({ phase }: { phase: "playing" | "enemy" | "ended" }) {
  return (
    <AnimatePresence>
      {phase === "enemy" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/60"
        >
          <div className="rounded bg-zinc-900 px-4 py-2 text-sm font-bold text-amber-400">
            Turno del rival…
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
