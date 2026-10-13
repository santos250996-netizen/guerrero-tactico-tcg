"use client";

import { motion } from "framer-motion";
import { Sparkles, Info } from "lucide-react";
import type { HandCard } from "@/lib/game/types";
import { CATEGORY_META, RARITY_META, LANE_META } from "@/lib/game/types";
import { cn } from "@/lib/utils";

interface HandCardComponentProps {
  card: HandCard;
  selected: boolean;
  affordable: boolean; // can pay the cost with current energy
  onClick: () => void;
  onPreview?: (card: HandCard) => void;
}

// Rarity letter per user spec: common=rare lowercase, epic=legendary uppercase.
// c / r / E / L
const RARITY_LETTER: Record<string, string> = {
  common: "c",
  rare: "r",
  epic: "E",
  legendary: "L",
};

// Solid rarity background color (used for the bottom-right badge fill)
const RARITY_SOLID_BG: Record<string, string> = {
  common: "bg-gradient-to-b from-zinc-400 to-zinc-700 text-zinc-950",
  rare: "bg-gradient-to-b from-sky-400 to-sky-700 text-white",
  epic: "bg-gradient-to-b from-violet-400 to-violet-700 text-white",
  legendary: "bg-gradient-to-b from-amber-300 to-amber-600 text-zinc-950",
};

export function HandCardComponent({
  card,
  selected,
  affordable,
  onClick,
  onPreview,
}: HandCardComponentProps) {
  const cat = CATEGORY_META[card.category];
  const rar = RARITY_META[card.rarity];
  const artUrl = `/cards/${card.id}.png`;
  const effectivePower = card.power + (card.handBonus || 0);
  const laneSubtype = card.subtypes[0];
  const laneMeta = LANE_META[laneSubtype];

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30, scale: 0.85 }}
      whileHover={{ y: -6, scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      onClick={onClick}
      className={cn(
        // Full-art card: just a thin rarity-colored border around the full image
        "relative flex h-44 w-28 shrink-0 flex-col overflow-hidden rounded-lg border-2 shadow-2xl shadow-black/80",
        "bg-zinc-950",
        selected
          ? "border-amber-400 ring-2 ring-amber-400/70 z-10"
          : rar.borderClass,
        !affordable && "opacity-65 grayscale"
      )}
      style={{
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -2px 6px rgba(0,0,0,0.6), 0 6px 14px rgba(0,0,0,0.7)" +
          (selected ? ", 0 0 18px rgba(251,191,36,0.5)" : ""),
      }}
    >
      {/* Full-bleed art (same as board cards) */}
      <img
        src={artUrl}
        alt={card.name}
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
        draggable={false}
      />

      {/* Dark gradient at the bottom for badge legibility */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />

      {/* Cost badge (top-left): sky/cyan */}
      <div
        className="absolute left-1 top-1 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-white/90 bg-gradient-to-b from-sky-400 to-sky-700 text-[10px] font-black text-white shadow-md"
        style={{ boxShadow: "0 0 6px rgba(56,189,248,0.55)" }}
      >
        {card.cost}
      </div>

      {/* Power badge (top-right): rose/red */}
      <div
        className={cn(
          "absolute right-1 top-1 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-white/90 text-[10px] font-black text-white shadow-md",
          card.handBonus
            ? "bg-gradient-to-b from-emerald-400 to-emerald-700 ring-1 ring-emerald-300/60"
            : "bg-gradient-to-b from-rose-500 to-rose-800"
        )}
        style={{ boxShadow: card.handBonus ? "0 0 6px rgba(16,185,129,0.55)" : "0 0 6px rgba(244,63,94,0.55)" }}
      >
        {effectivePower}
      </div>

      {/* Hand-bonus floating chip (visible when buffed) */}
      {card.handBonus ? (
        <div className="absolute right-1 top-8 z-30 flex items-center gap-0.5 rounded bg-emerald-500/95 px-1 py-0 text-[8px] font-bold text-white shadow-md">
          <Sparkles className="h-2 w-2" />+{card.handBonus}
        </div>
      ) : null}

      {/* Bottom info panel overlay */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-0.5 px-1.5 py-1">
        {/* Top row of bottom panel: card type (left) + subtype icon (right) */}
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "rounded border px-1 py-0 text-[7px] font-bold uppercase tracking-wider backdrop-blur-sm",
              cat.bgClass,
              cat.textClass,
              cat.borderClass
            )}
          >
            {cat.label}
          </span>
          <span
            className="flex h-4 w-4 items-center justify-center rounded-full border border-white/40 bg-black/60 text-[9px] leading-none backdrop-blur-sm"
            title={laneMeta?.title}
          >
            {laneMeta?.emoji}
          </span>
        </div>

        {/* Card name */}
        <div className="text-center text-[9px] font-black uppercase tracking-wider text-amber-300 [text-shadow:1px_1px_0_#000,0_0_4px_rgba(0,0,0,0.85)] leading-tight">
          {card.name}
        </div>

        {/* Bottom row: "Toca para ver efecto" (left) parallel to rarity letter (right) */}
        <div className="flex items-end justify-between gap-1">
          {onPreview ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onPreview(card);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onPreview(card);
                }
              }}
              className="inline-flex items-center gap-0.5 text-[6px] uppercase tracking-widest text-zinc-400 hover:text-amber-300 transition-colors cursor-pointer"
            >
              <Info className="h-2 w-2" />
              Toca para ver efecto
            </span>
          ) : (
            <span className="h-1 w-1" />
          )}
          <span
            title={rar.label}
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/80 text-[10px] font-black shadow-md",
              RARITY_SOLID_BG[card.rarity]
            )}
          >
            {RARITY_LETTER[card.rarity]}
          </span>
        </div>
      </div>
    </motion.button>
  );
}
