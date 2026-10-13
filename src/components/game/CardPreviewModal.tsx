"use client";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { CardDef } from "@/lib/game/types";
import { CATEGORY_META, RARITY_META, LANE_META } from "@/lib/game/types";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// Rarity letter per user spec: common=rare lowercase, epic=legendary uppercase.
const RARITY_LETTER: Record<string, string> = {
  common: "c",
  rare: "r",
  epic: "E",
  legendary: "L",
};

const RARITY_SOLID_BG: Record<string, string> = {
  common: "bg-gradient-to-b from-zinc-400 to-zinc-700 text-zinc-950",
  rare: "bg-gradient-to-b from-sky-400 to-sky-700 text-white",
  epic: "bg-gradient-to-b from-violet-400 to-violet-700 text-white",
  legendary: "bg-gradient-to-b from-amber-300 to-amber-600 text-zinc-950",
};

export function CardPreviewModal({ card, open, onOpenChange }: { card: CardDef | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  if (!card) return null;
  const cat = CATEGORY_META[card.category];
  const rar = RARITY_META[card.rarity];
  const laneSubtype = card.subtypes[0];
  const laneMeta = LANE_META[laneSubtype];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Position the dialog at the top of the screen instead of centered */}
      <DialogContent
        showCloseButton={false}
        className="border-transparent bg-transparent p-0 shadow-none top-[6%] translate-y-0 sm:max-w-xs max-w-[calc(100%-1rem)] gap-0"
      >
        <DialogTitle className="sr-only">{card.name}</DialogTitle>
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: -20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
          className={cn(
            // Same full-art hand-card design, just larger
            "relative mx-auto flex h-[28rem] w-56 flex-col overflow-hidden rounded-2xl border-2 shadow-2xl shadow-black/90",
            "bg-zinc-950",
            rar.borderClass,
            rar.glowClass
          )}
          style={{
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -2px 8px rgba(0,0,0,0.6), 0 18px 40px rgba(0,0,0,0.8)",
          }}
        >
          {/* Full-bleed art */}
          <img
            src={`/cards/${card.id}.png`}
            alt={card.name}
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />

          {/* Dark gradient at the bottom for legibility */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/95 via-black/75 to-transparent" />

          {/* Cost badge (top-left) */}
          <div
            className="absolute left-2 top-2 z-30 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/90 bg-gradient-to-b from-sky-400 to-sky-700 text-base font-black text-white shadow-lg"
            style={{ boxShadow: "0 0 10px rgba(56,189,248,0.55)" }}
          >
            {card.cost}
          </div>

          {/* Power badge (top-right) */}
          <div
            className="absolute right-2 top-2 z-30 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/90 bg-gradient-to-b from-rose-500 to-rose-800 text-base font-black text-white shadow-lg"
            style={{ boxShadow: "0 0 10px rgba(244,63,94,0.55)" }}
          >
            {card.power}
          </div>

          {/* Bottom info panel overlay — same structure as hand card */}
          <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-1 px-3 py-2.5">
            {/* Top row of bottom panel: card type (left) + subtype icon (right) */}
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm",
                  cat.bgClass,
                  cat.textClass,
                  cat.borderClass
                )}
              >
                {cat.label}
              </span>
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full border border-white/40 bg-black/60 text-sm leading-none backdrop-blur-sm"
                title={laneMeta?.title}
              >
                {laneMeta?.emoji}
              </span>
            </div>

            {/* Card name */}
            <div className="text-center text-base font-black uppercase tracking-wider text-amber-300 [text-shadow:1px_1px_0_#000,0_0_6px_rgba(0,0,0,0.9)] leading-tight">
              {card.name}
            </div>

            {/* Effect text (replaces the "Toca para ver efecto" hint) */}
            <div className="rounded-md border border-amber-200/30 bg-gradient-to-b from-amber-50/95 to-amber-100/95 px-2 py-1.5 text-[11px] leading-snug text-zinc-900 shadow-inner backdrop-blur-sm" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
              <span className="font-bold">Efecto:</span> {card.text}
            </div>

            {/* Bottom row: subtype chip (left, parallel) + rarity letter (right) */}
            <div className="flex items-end justify-between gap-2">
              <span className="rounded border border-amber-600/60 bg-gradient-to-r from-amber-600 to-yellow-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-900 shadow">
                {card.subtypes.join(" / ")}
              </span>
              <span
                title={rar.label}
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-white/80 text-sm font-black shadow-md",
                  RARITY_SOLID_BG[card.rarity]
                )}
              >
                {RARITY_LETTER[card.rarity]}
              </span>
            </div>
          </div>

          {/* Subtle "Sparkles" icon top-center as a flourish (no functional role) */}
          <div className="pointer-events-none absolute left-1/2 top-2 z-30 -translate-x-1/2 rounded-full bg-black/50 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-amber-200/70 backdrop-blur-sm">
            <Sparkles className="inline h-2.5 w-2.5" /> Vista previa
          </div>
        </motion.div>

        {/* Close button below the card */}
        <button
          onClick={() => onOpenChange(false)}
          className="mx-auto mt-3 flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-300 shadow-md transition-colors hover:bg-zinc-800 hover:text-white"
          aria-label="Cerrar"
        >
          ✕
        </button>
      </DialogContent>
    </Dialog>
  );
}
