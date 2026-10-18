"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BoardCard } from "@/lib/game/types";
import { CATEGORY_META, RARITY_META } from "@/lib/game/types";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { isLowPowerDevice } from "@/lib/game/perf";

interface BoardCardMiniProps {
  card: BoardCard;
  side: "player" | "enemy";
  onPreview?: (card: BoardCard) => void;
}

function BoardCardMiniImpl({ card, side, onPreview }: BoardCardMiniProps) {
  const cat = CATEGORY_META[card.category];
  const rar = RARITY_META[card.rarity];
  const isBuffed = card.currentPower > card.basePower;
  const isDebuffed = card.currentPower < card.basePower;

  return (
    <motion.div
      // layout-anim FLIP: se omite en móviles low-power (medición costosa)
      layout={!isLowPowerDevice() || undefined}
      initial={{ opacity: 0, scale: 0.5, y: side === "player" ? 20 : -20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.3 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      whileHover={onPreview ? { scale: 1.08, zIndex: 10 } : undefined}
      className={cn(
        "relative aspect-[3/4] w-full overflow-hidden rounded-lg border-2",
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
        decoding="async"
        draggable={false}
      />

      {/* Dark gradient at bottom for badge legibility */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" />

      {/* Cost badge (top-left) */}
      <div className="absolute left-0.5 top-0.5 z-20 flex h-4 w-4 items-center justify-center rounded-full border border-white/90 bg-gradient-to-b from-sky-500 to-sky-700 text-[8px] font-black text-white shadow-md">
        {card.cost}
      </div>

      {/* Power badge (top-right) */}
      <div className={cn(
        "absolute right-0.5 top-0.5 z-20 flex h-4 w-4 items-center justify-center rounded-full border border-white/90 text-[8px] font-black text-white shadow-md",
        isBuffed
          ? "bg-gradient-to-b from-emerald-400 to-emerald-700 ring-1 ring-emerald-300/50"
          : isDebuffed
            ? "bg-gradient-to-b from-rose-500 to-rose-800 ring-1 ring-rose-300/50"
            : "bg-gradient-to-b from-rose-600 to-rose-900"
      )}>
        {card.currentPower}
      </div>

      {/* Shield badge (apilado bajo el coste) — escudo restante (Coraza/Amparo).
          Antes iba en el centro superior, en medio de coste y poder, tapando ambos.
          En la columna izquierda forma una columna de stats: coste arriba, escudo
          debajo; el poder (top-right) y el arte central quedan siempre legibles. */}
      {(card.shieldRemaining ?? 0) > 0 && (
        <div
          title={`Escudo: absorbe ${card.shieldRemaining} puntos de reducción`}
          className="absolute left-0.5 top-[21px] z-20 flex h-4 items-center gap-0.5 rounded-full border border-sky-200/90 bg-gradient-to-b from-sky-400 to-sky-700 px-1 text-[8px] font-black text-white shadow-md"
        >
          <Shield className="h-2 w-2" />
          {card.shieldRemaining}
        </div>
      )}

      {/* Floating effect chips on right side (from powerLog) — removed, replaced by 2B below */}

      {/* Buff total (ally) — bottom-right, green */}
      {isBuffed && (
        <div className="absolute bottom-0.5 right-0.5 z-20 rounded bg-emerald-500/90 px-0.5 py-0 text-[6px] font-black text-white shadow">
          +{card.currentPower - card.basePower}
        </div>
      )}
      {/* Debuff total (enemy) — bottom-left, red */}
      {isDebuffed && (
        <div className="absolute bottom-0.5 left-0.5 z-20 rounded bg-rose-500/90 px-0.5 py-0 text-[6px] font-black text-white shadow">
          {card.currentPower - card.basePower}
        </div>
      )}
    </motion.div>
  );
}

// Memo: los objetos BoardCard se recrean de forma inmutable en la store —
// si la referencia no cambia, el subtree completo se salta el re-render.
export const BoardCardMini = memo(BoardCardMiniImpl);
