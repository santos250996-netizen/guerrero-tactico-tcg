"use client";

import { motion } from "framer-motion";
import type { BoardCard } from "@/lib/game/types";
import { CATEGORY_META } from "@/lib/game/types";
import { cn } from "@/lib/utils";

interface BoardCardMiniProps {
  card: BoardCard;
  side: "player" | "enemy";
}

export function BoardCardMini({ card, side }: BoardCardMiniProps) {
  const cat = CATEGORY_META[card.category];
  const isBuffed = card.currentPower > card.basePower;
  const isDebuffed = card.currentPower < card.basePower;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.6, y: side === "player" ? 24 : -24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className={cn(
        "flex h-10 w-full items-center gap-1.5 overflow-hidden rounded border px-1 text-[10px]",
        cat.bgClass,
        cat.borderClass
      )}
    >
      {/* Thumbnail */}
      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-sm bg-zinc-950">
        <img
          src={`/cards/${card.defId}.png`}
          alt={card.name}
          className="h-full w-full object-cover"
          loading="lazy"
          draggable={false}
        />
      </div>
      {/* Name */}
      <span className="min-w-0 flex-1 truncate font-semibold text-zinc-100">
        {card.name}
      </span>
      {/* Power */}
      <span
        className={cn(
          "shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold tabular-nums",
          isBuffed
            ? "bg-emerald-500/30 text-emerald-200"
            : isDebuffed
              ? "bg-rose-500/30 text-rose-200"
              : "bg-black/40 text-zinc-100"
        )}
      >
        {card.currentPower}
      </span>
    </motion.div>
  );
}
