"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Skull, Equal, RefreshCw, Save, LogOut } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { Button } from "@/components/ui/button";
import { LANE_META } from "@/lib/game/types";
import { useEffect, useState } from "react";
import type { LaneId } from "@/lib/game/types";

interface GameOverModalProps {
  open: boolean;
}

export function GameOverModal({ open }: GameOverModalProps) {
  const finalResult = useGameStore((s) => s.finalResult);
  const resetGame = useGameStore((s) => s.resetGame);
  const setView = useGameStore((s) => s.setView);
  const setDeckEditorReturn = useGameStore((s) => s.setDeckEditorReturn);
  const [saved, setSaved] = useState<"idle" | "saving" | "ok" | "err">("idle");

  // Auto-save the match once when the modal opens.
  useEffect(() => {
    if (!open || !finalResult || saved !== "idle") return;
    let cancelled = false;
    // Defer the synchronous state update to avoid cascading renders (React 19 rule).
    Promise.resolve().then(() => {
      if (!cancelled) setSaved("saving");
    });
    const payload = {
      result: finalResult.result,
      playerWins: finalResult.playerWins,
      enemyWins: finalResult.enemyWins,
      draws: finalResult.draws,
      turnsPlayed: 6,
      scorePlayer: finalResult.totalPlayer,
      scoreEnemy: finalResult.totalEnemy,
      // Carriles guardados POSICIONALMENTE (lane 1/2/3 de la clase jugada) —
      // las columnas de BD mantienen sus nombres históricos de Guerrero.
      laneArmasP: finalResult.laneOutcomes[0]?.playerScore ?? 0,
      laneArmasE: finalResult.laneOutcomes[0]?.enemyScore ?? 0,
      laneProtP: finalResult.laneOutcomes[1]?.playerScore ?? 0,
      laneProtE: finalResult.laneOutcomes[1]?.enemyScore ?? 0,
      laneFuriaP: finalResult.laneOutcomes[2]?.playerScore ?? 0,
      laneFuriaE: finalResult.laneOutcomes[2]?.enemyScore ?? 0,
      gameClass: useGameStore.getState().gameClass,
    };
    fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(() => {
        if (!cancelled) setSaved("ok");
      })
      .catch(() => {
        if (!cancelled) setSaved("err");
      });
    return () => {
      cancelled = true;
    };
  }, [open, finalResult, saved]);

  if (!finalResult) return null;

  const isWin = finalResult.result === "WIN";
  const isDraw = finalResult.result === "DRAW";

  const title = isWin ? "¡VICTORIA!" : isDraw ? "EMPATE" : "DERROTA";
  const titleColor = isWin
    ? "text-emerald-400"
    : isDraw
      ? "text-amber-400"
      : "text-rose-400";
  const Icon = isWin ? Trophy : isDraw ? Equal : Skull;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.85, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.85, y: 20 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className="w-[min(90vw,420px)] rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl"
          >
            <div className="flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/30 to-rose-600/30 ring-2 ring-white/10"
              >
                <Icon className={`h-8 w-8 ${titleColor}`} />
              </motion.div>
              <h2
                className={`text-3xl font-black tracking-wider ${titleColor}`}
              >
                {title}
              </h2>
              <p className="mt-1 text-xs text-zinc-400">
                Líneas ganadas:{" "}
                <span className="text-emerald-400">{finalResult.playerWins}</span>
                {" · "}
                <span className="text-zinc-500">{finalResult.draws} empate(s)</span>
                {" · "}
                <span className="text-rose-400">{finalResult.enemyWins}</span>
              </p>

              {/* Lane outcomes */}
              <div className="mt-4 w-full space-y-1.5">
                {finalResult.laneOutcomes.map((lo) => {
                  const meta = LANE_META[lo.lane as LaneId];
                  const pWon = lo.winner === "player";
                  const eWon = lo.winner === "enemy";
                  return (
                    <div
                      key={lo.lane}
                      className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs"
                    >
                      <span className="flex items-center gap-1.5 text-zinc-300">
                        <meta.icon className="h-3 w-3 shrink-0" />
                        <span className="font-semibold uppercase tracking-wider">
                          {meta.title}
                        </span>
                      </span>
                      <span className="flex items-center gap-2 tabular-nums">
                        <span
                          className={pWon ? "font-bold text-emerald-400" : "text-zinc-300"}
                        >
                          {lo.playerScore}
                        </span>
                        <span className="text-zinc-600">·</span>
                        <span
                          className={eWon ? "font-bold text-rose-400" : "text-zinc-300"}
                        >
                          {lo.enemyScore}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex w-full items-center justify-between rounded bg-black/40 px-3 py-1.5 text-[11px] text-zinc-400">
                <span>Total acumulado</span>
                <span className="tabular-nums">
                  <span className="text-emerald-400">{finalResult.totalPlayer}</span>
                  {" · "}
                  <span className="text-rose-400">{finalResult.totalEnemy}</span>
                </span>
              </div>

              {/* Save status */}
              <div className="mt-3 text-[10px] text-zinc-500">
                {saved === "saving" && (
                  <span className="flex items-center gap-1">
                    <Save className="h-3 w-3" /> Guardando partida…
                  </span>
                )}
                {saved === "ok" && (
                  <span className="text-emerald-400">Partida guardada en el historial.</span>
                )}
                {saved === "err" && (
                  <span className="text-rose-400">No se pudo guardar la partida.</span>
                )}
              </div>

              <div className="mt-4 flex w-full gap-2">
                <Button
                  variant="outline"
                  className="flex-1 border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                  onClick={() => {
                    setDeckEditorReturn("main-menu");
                    setView("main-menu");
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Salir
                </Button>
                <Button
                  className="flex-[2] bg-gradient-to-r from-amber-600 to-rose-600 text-white hover:from-amber-500 hover:to-rose-500"
                  onClick={() => {
                    resetGame();
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                  Jugar de nuevo
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
