"use client";

import { motion } from "framer-motion";
import { Coins, Crosshair, Sparkles } from "lucide-react";
import type { HandCard } from "@/lib/game/types";
import { CATEGORY_META } from "@/lib/game/types";
import { cn } from "@/lib/utils";

interface HandCardComponentProps {
  card: HandCard;
  selected: boolean;
  affordable: boolean; // can pay the cost with current energy
  onClick: () => void;
}

export function HandCardComponent({
  card,
  selected,
  affordable,
  onClick,
}: HandCardComponentProps) {
  const cat = CATEGORY_META[card.category];
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40, scale: 0.85 }}
      whileHover={{ y: -8, scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      onClick={onClick}
      className={cn(
        "relative flex h-44 w-28 shrink-0 flex-col overflow-hidden rounded-lg border-2 bg-zinc-900/95 p-2 text-left shadow-lg shadow-black/60",
        selected
          ? "border-yellow-400 ring-2 ring-yellow-400/50"
          : cat.borderClass,
        !affordable && "opacity-50 grayscale"
      )}
    >
      {/* Cost badge (top-left) */}
      <div className="absolute -left-1.5 -top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-sky-600 text-[11px] font-bold text-white shadow-md">
        {card.cost}
      </div>

      {/* Power badge (top-right) */}
      <div className="absolute -right-1.5 -top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-rose-600 text-[11px] font-bold text-white shadow-md">
        {card.power + (card.handBonus || 0)}
      </div>

      {card.handBonus ? (
        <div className="absolute right-0 top-6 z-10 flex items-center gap-0.5 rounded-bl bg-emerald-500/90 px-1 py-0.5 text-[9px] font-bold text-white">
          <Sparkles className="h-2.5 w-2.5" />+{card.handBonus}
        </div>
      ) : null}

      {/* Title */}
      <div
        className={cn(
          "mt-4 text-center text-[10px] font-bold uppercase tracking-tight",
          cat.textClass
        )}
      >
        {card.name}
      </div>

      {/* Category pill */}
      <div className="mt-1 flex justify-center">
        <span
          className={cn(
            "rounded px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider",
            cat.bgClass,
            cat.textClass
          )}
        >
          {cat.label}
        </span>
      </div>

      {/* Subtypes */}
      <div className="mt-1 text-center text-[8px] font-bold uppercase tracking-wide text-zinc-400">
        {card.subtypes.join(" / ")}
      </div>

      {/* Effect text */}
      <div className="mt-1 flex-1 rounded bg-black/40 px-1 py-1 text-center text-[8px] leading-tight text-zinc-300">
        {card.text}
      </div>

      {/* Footer indicators */}
      <div className="mt-1 flex items-center justify-between text-[9px] text-zinc-500">
        <span className="flex items-center gap-0.5">
          <Coins className="h-2.5 w-2.5" />
          {card.cost}
        </span>
        <span className="flex items-center gap-0.5 text-rose-400">
          <Crosshair className="h-2.5 w-2.5" />
          {card.power + (card.handBonus || 0)}
        </span>
      </div>
    </motion.button>
  );
}
