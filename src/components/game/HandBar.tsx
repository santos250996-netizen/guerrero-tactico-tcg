"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import { HandCardComponent } from "./HandCardComponent";
import { AlertTriangle, Lock, LogOut, Activity } from "lucide-react";
import { sfx } from "@/lib/sound";
import type { LaneId } from "@/lib/game/types";

export function HandBar({ onOpenRegistro }: { onOpenRegistro: () => void }) {
  const hand = useGameStore((s) => s.hand);
  const selectedCardUid = useGameStore((s) => s.selectedCardUid);
  const draggingCardUid = useGameStore((s) => s.draggingCardUid);
  const energy = useGameStore((s) => s.energy);
  const selectCard = useGameStore((s) => s.selectCard);
  const setDraggingCard = useGameStore((s) => s.setDraggingCard);
  const playSelectedCardIntoLane = useGameStore((s) => s.playSelectedCardIntoLane);
  const invalidPlayMsg = useGameStore((s) => s.invalidPlayMsg);
  const dismissInvalidMsg = useGameStore((s) => s.dismissInvalidMsg);
  const phase = useGameStore((s) => s.phase);
  const endTurn = useGameStore((s) => s.endTurn);
  const resetGame = useGameStore((s) => s.resetGame);

  const handleDragStart = (cardUid: string) => {
    selectCard(cardUid);
    setDraggingCard(cardUid);
  };
  const handleDragEnd = () => {
    setDraggingCard(null);
  };
  const handlePlayCard = (cardUid: string, laneId: LaneId) => {
    // selectCard was already called during onDragStart, so we just need to play.
    // (selectCard toggles, so calling it again here would deselect.)
    // Safety fallback: if selection got cleared somehow, re-select first.
    const state = useGameStore.getState();
    if (state.selectedCardUid !== cardUid) {
      selectCard(cardUid);
    }
    playSelectedCardIntoLane(laneId);
  };

  return (
    <div className="border-t border-zinc-800 bg-zinc-950/95">
      {/* Invalid message */}
      <AnimatePresence>
        {invalidPlayMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-1.5 border-b border-rose-800/40 bg-rose-950/40 px-2 py-1 text-[10px] text-rose-200"
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

      <div className="flex items-center justify-between px-2 py-0.5">
        <span className="text-[9px] uppercase tracking-wider text-zinc-500">
          Tu mano · {hand.length} carta(s)
        </span>
        {phase === "playing" && draggingCardUid ? (
          <span className="text-[9px] text-amber-400 animate-pulse">
            Arrastra a un carril
          </span>
        ) : phase === "playing" && selectedCardUid ? (
          <span className="text-[9px] text-yellow-400">
            Toca un carril para jugarla
          </span>
        ) : null}
      </div>

      {/* Hand container — horizontal scroll when needed; data-hand-container is used by
          HandCardComponent's pointer handlers for manual horizontal scrolling on mouse drag.
          Touch users get native scrolling via `touch-action: pan-x` on the cards themselves. */}
      <div
        data-hand-container
        className="no-scrollbar flex gap-1.5 overflow-x-auto px-2 pb-1 pt-0.5"
      >
        <AnimatePresence mode="popLayout">
          {hand.length === 0 ? (
            <div className="flex h-44 w-full items-center justify-center text-[10px] text-zinc-600">
              Sin cartas en mano
            </div>
          ) : (
            hand.map((card) => (
              <HandCardComponent
                key={card.uid}
                card={card}
                selected={selectedCardUid === card.uid}
                affordable={card.cost <= energy}
                onPlayCard={handlePlayCard}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onPreview={(c) => useGameStore.getState().setPreviewCard?.(c as any)}
                phase={phase}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Action bar — Pasar (big) + Registro + Salir (small) */}
      <div className="flex items-center gap-1.5 border-t border-zinc-800 bg-black/40 px-2 py-1.5">
        {phase === "playing" ? (
          <button
            onClick={() => { sfx.click(); endTurn(); }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-teal-500 to-emerald-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-900/50 transition-all hover:from-teal-400 hover:to-emerald-500 active:scale-95"
          >
            <Lock className="h-3.5 w-3.5" />
            Pasar
          </button>
        ) : (
          <button
            onClick={() => resetGame()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-amber-600 to-rose-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-rose-900/50 transition-all hover:from-amber-500 hover:to-rose-500 active:scale-95"
          >
            <Lock className="h-3.5 w-3.5" />
            Reiniciar
          </button>
        )}
        <button
          onClick={onOpenRegistro}
          className="flex items-center justify-center gap-1 rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-[9px] font-bold uppercase tracking-wider text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
        >
          <Activity className="h-3 w-3" />
          Registro
        </button>
        <button
          onClick={() => { if (confirm("¿Abandonar la partida?")) resetGame(); }}
          className="flex items-center justify-center gap-1 rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-[9px] font-bold uppercase tracking-wider text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
        >
          <LogOut className="h-3 w-3" />
          Salir
        </button>
      </div>
    </div>
  );
}
