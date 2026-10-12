"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { HeaderBar } from "@/components/game/HeaderBar";
import { HandBar } from "@/components/game/HandBar";
import { LaneComponent } from "@/components/game/LaneComponent";
import { GameOverModal } from "@/components/game/GameOverModal";
import { RulesModal } from "@/components/game/RulesModal";
import { HistoryModal } from "@/components/game/HistoryModal";
import { LANE_IDS } from "@/lib/game/engine";
import type { LaneId } from "@/lib/game/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const initGame = useGameStore((s) => s.initGame);
  const phase = useGameStore((s) => s.phase);
  const log = useGameStore((s) => s.log);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    initGame();
  }, [initGame]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-zinc-950 to-black text-zinc-100">
      <HeaderBar
        onOpenRules={() => setRulesOpen(true)}
        onOpenHistory={() => setHistoryOpen(true)}
      />

      <main className="flex flex-1 flex-col gap-2 px-2 py-2 lg:flex-row lg:gap-3 lg:px-4">
        {/* Board area */}
        <div className="flex flex-1 flex-col gap-2 md:grid md:grid-cols-3 md:gap-2">
          {LANE_IDS.map((lane: LaneId) => (
            <LaneComponent key={lane} laneId={lane} />
          ))}
        </div>

        {/* Action log sidebar (desktop only) */}
        <aside className="hidden w-64 shrink-0 flex-col rounded-lg border border-zinc-800 bg-zinc-950/60 lg:flex">
          <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2 text-xs font-bold uppercase tracking-wider text-amber-400">
            <Activity className="h-3.5 w-3.5" />
            Registro de batalla
          </div>
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="space-y-1 p-2">
              <AnimatePresence initial={false}>
                {log.length === 0 ? (
                  <div className="py-3 text-center text-[11px] text-zinc-600">
                    Sin actividad todavía.
                  </div>
                ) : (
                  log.map((entry) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`rounded border px-2 py-1 text-[10px] leading-tight ${
                        entry.side === "player"
                          ? "border-emerald-800/40 bg-emerald-950/30 text-emerald-200"
                          : entry.side === "enemy"
                            ? "border-rose-800/40 bg-rose-950/30 text-rose-200"
                            : "border-zinc-800 bg-zinc-900/40 text-zinc-300"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[9px] uppercase opacity-70">
                        <span>
                          {entry.side === "player"
                            ? "Tú"
                            : entry.side === "enemy"
                              ? "Rival"
                              : "Sistema"}
                        </span>
                        <span>T{entry.turn}</span>
                      </div>
                      <div>{entry.text}</div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </aside>
      </main>

      <HandBar />

      <GameOverModal open={phase === "ended"} />
      <RulesModal open={rulesOpen} onOpenChange={setRulesOpen} />
      <HistoryModal open={historyOpen} onOpenChange={setHistoryOpen} />

      {/* Footer hint */}
      <footer className="mt-auto border-t border-zinc-800 bg-zinc-950 px-3 py-1 text-center text-[10px] text-zinc-500">
        Toca una carta para seleccionarla · Toca un carril para jugarla · Pulsa{" "}
        <em className="text-amber-400">Pasar Turno</em> cuando termines.
      </footer>
    </div>
  );
}
