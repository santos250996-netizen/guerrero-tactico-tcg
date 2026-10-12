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
        "flex h-9 w-full items-center justify-between gap-1 rounded border px-1.5 text-[10px]",
        cat.bgClass,
        cat.borderClass
      )}
    >
      <span className="flex min-w-0 items-center gap-1">
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", cat.bgClass.replace("/15", ""))} />
        <span className="truncate font-semibold text-zinc-100">{card.name}</span>
      </span>
      <span
        className={cn(
          "shrink-0 rounded px-1 text-[10px] font-bold tabular-nums",
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
