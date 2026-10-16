"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import { HandCardComponent } from "./HandCardComponent";
import { AlertTriangle, Lock, Activity, Settings as SettingsIcon } from "lucide-react";
import { sfx } from "@/lib/sound";
import type { LaneId } from "@/lib/game/types";

// Total turns is a fixed rule constant (6 turns, energy 1→6).
const MAX_TURNS = 6;

export function HandBar({ onOpenRegistro, onOpenSettings }: { onOpenRegistro: () => void; onOpenSettings: () => void }) {
  const hand = useGameStore((s) => s.hand);
  const selectedCardUid = useGameStore((s) => s.selectedCardUid);
  const draggingCardUid = useGameStore((s) => s.draggingCardUid);
  const energy = useGameStore((s) => s.energy);
  const turn = useGameStore((s) => s.turn);
  const drawPile = useGameStore((s) => s.drawPile);
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
    <div className="relative border-t border-amber-700/30 bg-zinc-950/95">
      {/* Top decorative accent line — replaces the hard black border with a
          subtle gold gradient so the hand area blends with the lanes above
          instead of looking like a flat black slab. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

      {/* Status bar — CHIMERA-style: turn text left + big energy circle center
          (golden border + lightning icon) + draw pile count right. Sits ABOVE
          the hand so the top of the screen is clean. Subtle vertical gradient
          bg instead of flat black for warmth. */}
      <div className="relative flex items-center justify-between gap-2 border-b border-amber-700/15 bg-gradient-to-b from-zinc-900/80 to-zinc-950/60 px-3 py-1.5">
        {/* LEFT: Turn text (plain, no pill) */}
        <div className="flex items-baseline gap-1">
          <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-500">
            Turno
          </span>
          <span
            className="text-sm font-black tabular-nums text-white"
            style={{ fontFamily: 'var(--font-cinzel), serif' }}
          >
            {turn}
          </span>
          <span className="text-[9px] font-bold tabular-nums text-zinc-500">/{MAX_TURNS}</span>
        </div>

        {/* CENTER: Big energy circle with golden border + lightning + number */}
        <div className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-amber-400 bg-zinc-950 shadow-[0_0_10px_rgba(251,191,36,0.4)]">
          <span className="absolute -top-1 -right-0.5 text-[10px] text-amber-300" aria-hidden>⚡</span>
          <span
            className="text-base font-black tabular-nums text-amber-300"
            style={{ fontFamily: 'var(--font-cinzel), serif' }}
          >
            {energy}
          </span>
        </div>

        {/* RIGHT: Draw pile count */}
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-500">
            Mazo
          </span>
          <span
            className="text-sm font-black tabular-nums text-white"
            style={{ fontFamily: 'var(--font-cinzel), serif' }}
          >
            {drawPile.length}
          </span>
        </div>
      </div>

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

      {/* Hand container — horizontal scroll when needed; data-hand-container is used by
          HandCardComponent's pointer handlers for manual horizontal scrolling on mouse drag.
          Touch users get native scrolling via `touch-action: pan-x` on the cards themselves.
          (Removed the old 'Tu mano · X cartas' label — players can count by intuition.)
          Subtle amber-to-black radial gradient bg so the empty space around cards
          doesn't look like a flat black slab. */}
      <div
        data-hand-container
        className="no-scrollbar relative flex gap-1.5 overflow-x-auto px-2 pb-1 pt-0.5"
        style={{
          backgroundImage: 'radial-gradient(ellipse at center, rgba(120, 53, 15, 0.18) 0%, rgba(9, 9, 11, 0.95) 70%)',
        }}
      >
        {/* Inner top highlight — thin gradient line at the top of the hand area */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/20 to-transparent" />
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

      {/* Action bar — Pasar (big) + Registro + Opciones (small)
          Opciones replaces 'Salir' button —Salir is now in the Opciones modal
          ('Salir al Menú Principal' with confirmation flow).
          Gradient bg instead of flat black for visual warmth. */}
      <div className="relative flex items-center gap-1.5 border-t border-amber-700/15 bg-gradient-to-b from-zinc-950/80 to-black/60 px-2 py-1.5">
        {/* Top accent line above the action bar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/25 to-transparent" />
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
          title="Registro de batalla"
        >
          <Activity className="h-3 w-3" />
          Registro
        </button>
        <button
          onClick={onOpenSettings}
          className="flex items-center justify-center gap-1 rounded-full border border-amber-600/40 bg-amber-950/30 px-2.5 py-2 text-[9px] font-bold uppercase tracking-wider text-amber-300 transition-colors hover:bg-amber-900/40 hover:text-amber-200"
          title="Ajustes (sonido, animaciones, idioma, reglas, salir)"
        >
          <SettingsIcon className="h-3 w-3" />
          Opciones
        </button>
      </div>
    </div>
  );
}
