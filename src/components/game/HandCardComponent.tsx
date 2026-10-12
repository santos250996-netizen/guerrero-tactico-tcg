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
  const artUrl = `/cards/${card.id}.png`;
  const effectivePower = card.power + (card.handBonus || 0);

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
        "relative flex h-56 w-32 shrink-0 flex-col overflow-hidden rounded-lg border-2 bg-zinc-900 shadow-lg shadow-black/60",
        selected
          ? "border-yellow-400 ring-2 ring-yellow-400/50"
          : cat.borderClass,
        !affordable && "opacity-60 grayscale"
      )}
    >
      {/* Cost badge (top-left) */}
      <div className="absolute -left-1.5 -top-1.5 z-20 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-sky-600 text-xs font-bold text-white shadow-md">
        {card.cost}
      </div>

      {/* Power badge (top-right) */}
      <div className="absolute -right-1.5 -top-1.5 z-20 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-rose-600 text-xs font-bold text-white shadow-md">
        {effectivePower}
      </div>

      {card.handBonus ? (
        <div className="absolute right-0 top-7 z-20 flex items-center gap-0.5 rounded-bl bg-emerald-500/95 px-1.5 py-0.5 text-[10px] font-bold text-white">
          <Sparkles className="h-3 w-3" />+{card.handBonus}
        </div>
      ) : null}

      {/* Card art (top ~55%) */}
      <div className="relative h-28 w-full overflow-hidden border-b-2 border-black/60 bg-zinc-950">
        <img
          src={artUrl}
          alt={card.name}
          className="h-full w-full object-cover"
          loading="lazy"
          draggable={false}
        />
        {/* gradient fade into the text area */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-zinc-900 to-transparent" />
        {/* Category pill overlaid on the art */}
        <div className="absolute left-1 top-1 z-10">
          <span
            className={cn(
              "rounded border px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider backdrop-blur-sm",
              cat.bgClass,
              cat.textClass,
              cat.borderClass
            )}
          >
            {cat.label}
          </span>
        </div>
      </div>

      {/* Text area (bottom ~45%) */}
      <div className="flex flex-1 flex-col gap-0.5 px-1.5 py-1">
        <div
          className={cn(
            "text-center text-[10px] font-bold uppercase leading-tight tracking-tight",
            cat.textClass
          )}
        >
          {card.name}
        </div>
        <div className="text-center text-[8px] font-bold uppercase tracking-wide text-zinc-400">
          {card.subtypes.join(" / ")}
        </div>
        <div className="flex-1 rounded bg-black/50 px-1 py-0.5 text-center text-[8px] leading-tight text-zinc-300">
          {card.text}
        </div>
        <div className="flex items-center justify-between text-[9px] text-zinc-500">
          <span className="flex items-center gap-0.5">
            <Coins className="h-2.5 w-2.5" />
            {card.cost}
          </span>
          <span className="flex items-center gap-0.5 text-rose-400">
            <Crosshair className="h-2.5 w-2.5" />
            {effectivePower}
          </span>
        </div>
      </div>
    </motion.button>
  );
}
