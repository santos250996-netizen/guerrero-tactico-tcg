"use client";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { CardDef } from "@/lib/game/types";
import { CATEGORY_META, RARITY_META, LANE_META } from "@/lib/game/types";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// Rarity letters — all uppercase per user spec (C / R / E / L)
const RARITY_LETTER: Record<string, string> = {
  common: "C",
  rare: "R",
  epic: "E",
  legendary: "L",
};

// Solid rarity background color for the rare pill text
const RARITY_TEXT_COLOR: Record<string, string> = {
  common: "text-zinc-300",
  rare: "text-sky-300",
  epic: "text-violet-300",
  legendary: "text-amber-300",
};

export function CardPreviewModal({ card, open, onOpenChange }: { card: CardDef | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  if (!card) return null;
  const cat = CATEGORY_META[card.category];
  const rar = RARITY_META[card.rarity];
  // All subtype metas
  const subtypeMetas = card.subtypes.map((s) => LANE_META[s]).filter(Boolean);

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

          {/* Subtle "Vista previa" pill at top-center */}
          <div className="pointer-events-none absolute left-1/2 top-2 z-30 -translate-x-1/2 rounded-full bg-black/50 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-amber-200/70 backdrop-blur-sm">
            <Sparkles className="inline h-2.5 w-2.5" /> Vista previa
          </div>

          {/* Bottom info panel overlay — same structure as hand card, minus the rare-row parallel */}
          <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-1 px-3 py-2.5">
            {/* Top row of bottom panel: card type (left) + ALL subtype icons (right) */}
            <div className="flex items-center justify-between gap-1">
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
              <div className="flex items-center gap-0.5">
                {subtypeMetas.map((lm) => (
                  <span
                    key={lm.title}
                    title={lm.title}
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-white/40 bg-black/60 text-sm leading-none backdrop-blur-sm"
                  >
                    {lm.emoji}
                  </span>
                ))}
              </div>
            </div>

            {/* Card name */}
            <div className="text-center text-base font-black uppercase tracking-wider text-amber-300 [text-shadow:1px_1px_0_#000,0_0_6px_rgba(0,0,0,0.9)] leading-tight">
              {card.name}
            </div>

            {/* Effect text (replaces the "Toca para ver efecto" hint) */}
            <div className="rounded-md border border-amber-200/30 bg-gradient-to-b from-amber-50/95 to-amber-100/95 px-2 py-1.5 text-[11px] leading-snug text-zinc-900 shadow-inner backdrop-blur-sm" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
              <span className="font-bold">Efecto:</span> {card.text}
            </div>

            {/* Rarity as TEXT at bottom center (no parallel subtype, no badge) */}
            <div className={cn("mt-0.5 flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-widest", RARITY_TEXT_COLOR[card.rarity])}>
              <span className={cn("inline-block h-2 w-2 rounded-full", rar.gemClass)} />
              <span>{RARITY_LETTER[card.rarity]}</span>
              <span className="opacity-70">·</span>
              <span>{rar.label}</span>
            </div>
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
