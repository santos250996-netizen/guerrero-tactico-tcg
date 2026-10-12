"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import { HandCardComponent } from "./HandCardComponent";
import { AlertTriangle } from "lucide-react";

export function HandBar() {
  const hand = useGameStore((s) => s.hand);
  const selectedCardUid = useGameStore((s) => s.selectedCardUid);
  const energy = useGameStore((s) => s.energy);
  const selectCard = useGameStore((s) => s.selectCard);
  const invalidPlayMsg = useGameStore((s) => s.invalidPlayMsg);
  const dismissInvalidMsg = useGameStore((s) => s.dismissInvalidMsg);
  const phase = useGameStore((s) => s.phase);

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

      <div className="flex gap-2 overflow-x-auto px-3 pb-3 pt-1">
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
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
