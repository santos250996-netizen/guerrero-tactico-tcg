"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import { HandCardComponent } from "./HandCardComponent";
import { AlertTriangle, Lock, LogOut, Activity } from "lucide-react";
import { sfx } from "@/lib/sound";

export function HandBar({ onOpenRegistro }: { onOpenRegistro: () => void }) {
  const hand = useGameStore((s) => s.hand);
  const selectedCardUid = useGameStore((s) => s.selectedCardUid);
  const energy = useGameStore((s) => s.energy);
  const selectCard = useGameStore((s) => s.selectCard);
  const invalidPlayMsg = useGameStore((s) => s.invalidPlayMsg);
  const dismissInvalidMsg = useGameStore((s) => s.dismissInvalidMsg);
  const phase = useGameStore((s) => s.phase);
  const endTurn = useGameStore((s) => s.endTurn);
  const resetGame = useGameStore((s) => s.resetGame);

  return (
    <div className="border-t border-zinc-800 bg-zinc-950/95">
      {/* Invalid message */}
      <AnimatePresence>
        {invalidPlayMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 border-b border-rose-800/40 bg-rose-950/40 px-3 py-1.5 text-[11px] text-rose-200"
          >
            <AlertTriangle className="h-3 w-3" />
            <span className="flex-1">{invalidPlayMsg}</span>
            <button
              className="text-rose-400 hover:underline"
              onClick={dismissInvalidMsg}
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between px-3 py-1">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">
          Tu mano · {hand.length} carta(s)
        </span>
        {phase === "playing" && selectedCardUid && (
          <span className="text-[10px] text-yellow-400">
            Toca un carril para jugar la carta seleccionada
          </span>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto px-3 pb-2 pt-1">
        <AnimatePresence mode="popLayout">
          {hand.length === 0 ? (
            <div className="flex h-32 w-full items-center justify-center text-xs text-zinc-600">
              Sin cartas en mano
            </div>
          ) : (
            hand.map((card) => (
              <HandCardComponent
                key={card.uid}
                card={card}
                selected={selectedCardUid === card.uid}
                affordable={card.cost <= energy}
                onClick={() => phase === "playing" && selectCard(card.uid)}
                onPreview={(c) => useGameStore.getState().setPreviewCard?.(c as any)}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Action bar — Pasar + Registro + Abandonar */}
      <div className="flex items-center gap-2 border-t border-zinc-800 bg-black/40 px-3 py-2">
        {phase === "playing" ? (
          <button
            onClick={() => { sfx.click(); endTurn(); }}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-teal-500 to-emerald-600 px-6 py-2.5 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-900/50 transition-all hover:from-teal-400 hover:to-emerald-500 active:scale-95"
          >
            <Lock className="h-4 w-4" />
            Pasar
          </button>
        ) : (
          <button
            onClick={() => resetGame()}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-600 to-rose-600 px-6 py-2.5 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-rose-900/50 transition-all hover:from-amber-500 hover:to-rose-500 active:scale-95"
          >
            <Lock className="h-4 w-4" />
            Reiniciar
          </button>
        )}
        <button
          onClick={onOpenRegistro}
          className="flex items-center justify-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
        >
          <Activity className="h-3.5 w-3.5" />
          Registro
        </button>
        <button
          onClick={() => { if (confirm("¿Abandonar la partida?")) resetGame(); }}
          className="flex items-center justify-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
        >
          <LogOut className="h-3.5 w-3.5" />
          Abandonar
        </button>
      </div>
    </div>
  );
}
