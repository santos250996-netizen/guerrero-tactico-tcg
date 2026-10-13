"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { BoardCard } from "@/lib/game/types";
import { CATEGORY_META, RARITY_META } from "@/lib/game/types";
import { cn } from "@/lib/utils";

interface BoardCardMiniProps {
  card: BoardCard;
  side: "player" | "enemy";
  onPreview?: (card: BoardCard) => void;
}

export function BoardCardMini({ card, side, onPreview }: BoardCardMiniProps) {
  const cat = CATEGORY_META[card.category];
  const rar = RARITY_META[card.rarity];
  const isBuffed = card.currentPower > card.basePower;
  const isDebuffed = card.currentPower < card.basePower;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.5, y: side === "player" ? 20 : -20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.3 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      whileHover={onPreview ? { scale: 1.08, zIndex: 10 } : undefined}
      className={cn(
        "relative h-full w-full overflow-hidden rounded-lg border-2",
        rar.borderClass,
        onPreview && "cursor-pointer"
      )}
      data-card-uid={card.uid}
      onClick={(e) => {
        if (onPreview) {
          e.stopPropagation();
          onPreview(card);
        }
      }}
      style={{
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), 0 3px 8px rgba(0,0,0,0.6)",
      }}
    >
      {/* Full square art */}
      <img
        src={`/cards/${card.defId}.png`}
        alt={card.name}
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
        draggable={false}
      />

      {/* Category color tint at bottom */}
      <div className={cn("pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t to-transparent", cat.bgClass.replace("/15", "/30"))} />

      {/* Cost badge (top-left) */}
      <div className="absolute left-1 top-1 z-20 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white/90 bg-gradient-to-b from-sky-500 to-sky-700 text-[11px] font-black text-white shadow-md">
        {card.cost}
      </div>

      {/* Power badge (top-right) */}
      <div className={cn(
        "absolute right-1 top-1 z-20 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white/90 text-[11px] font-black text-white shadow-md",
        isBuffed
          ? "bg-gradient-to-b from-emerald-400 to-emerald-700 ring-2 ring-emerald-300/50"
          : isDebuffed
            ? "bg-gradient-to-b from-rose-500 to-rose-800 ring-2 ring-rose-300/50"
            : "bg-gradient-to-b from-rose-600 to-rose-900"
      )}>
        {card.currentPower}
      </div>

      {/* Buff/debuff indicator */}
      {isBuffed && (
        <div className="absolute bottom-1 right-1 z-20 rounded bg-emerald-500/90 px-1 py-0.5 text-[8px] font-black text-white shadow">
          +{card.currentPower - card.basePower}
        </div>
      )}
      {isDebuffed && (
        <div className="absolute bottom-1 right-1 z-20 rounded bg-rose-500/90 px-1 py-0.5 text-[8px] font-black text-white shadow">
          {card.currentPower - card.basePower}
        </div>
      )}
    </motion.div>
  );
}
