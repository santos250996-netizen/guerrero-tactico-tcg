"use client";

import { motion } from "framer-motion";
import { Zap, Swords, Sparkles } from "lucide-react";
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
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30, scale: 0.85 }}
      whileHover={{ y: -6, scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      onClick={onClick}
      className={cn(
        // Compact TCG frame for mobile hand
        "relative flex h-44 w-28 shrink-0 flex-col overflow-hidden rounded-lg border-2 p-1 shadow-2xl shadow-black/80",
        "bg-gradient-to-b from-zinc-800 via-zinc-900 to-black",
        selected
          ? "border-amber-400 ring-2 ring-amber-400/60 z-10"
          : cn("border-zinc-700", cat.frameBorder),
        !affordable && "opacity-60 grayscale"
      )}
      style={{
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -2px 6px rgba(0,0,0,0.6), 0 6px 14px rgba(0,0,0,0.7)",
      }}
    >
      {/* Decorative rivets in corners */}
      <span className="pointer-events-none absolute left-0.5 top-0.5 h-1 w-1 rounded-full bg-zinc-500 shadow-inner" />
      <span className="pointer-events-none absolute right-0.5 top-0.5 h-1 w-1 rounded-full bg-zinc-500 shadow-inner" />
      <span className="pointer-events-none absolute bottom-0.5 left-0.5 h-1 w-1 rounded-full bg-zinc-500 shadow-inner" />
      <span className="pointer-events-none absolute bottom-0.5 right-0.5 h-1 w-1 rounded-full bg-zinc-500 shadow-inner" />

      {/* Cost badge (top-left): green with lightning icon */}
      <div
        className="absolute left-1 top-1 z-30 flex h-7 w-7 flex-col items-center justify-center rounded-full border border-white/90 bg-gradient-to-b from-emerald-400 to-emerald-700 text-white shadow-lg"
        style={{ boxShadow: "0 0 6px rgba(16,185,129,0.6)" }}
      >
        <Zap className="h-2.5 w-2.5 fill-white" />
        <span className="text-[10px] font-black leading-none">{card.cost}</span>
      </div>

      {/* Power badge (top-right): red with crossed swords */}
      <div
        className="absolute right-1 top-1 z-30 flex h-7 w-7 flex-col items-center justify-center rounded-full border border-white/90 bg-gradient-to-b from-rose-500 to-rose-800 text-white shadow-lg"
        style={{ boxShadow: "0 0 6px rgba(244,63,94,0.6)" }}
      >
        <Swords className="h-2.5 w-2.5" />
        <span className="text-[10px] font-black leading-none">{effectivePower}</span>
      </div>

      {/* Hand-bonus floating chip (visible when buffed) */}
      {card.handBonus ? (
        <div className="absolute right-1 top-9 z-30 flex items-center gap-0.5 rounded bg-emerald-500/95 px-1 py-0.5 text-[8px] font-bold text-white shadow-md">
          <Sparkles className="h-2 w-2" />+{card.handBonus}
        </div>
      ) : null}

      {/* Art frame: rounded rectangle for max art visibility */}
      <div
        className={cn(
          "relative mx-auto mt-1 h-20 w-full overflow-hidden rounded-md border-2 bg-zinc-950 shadow-inner",
          cat.frameBorder
        )}
      >
        <img
          src={artUrl}
          alt={card.name}
          className="h-full w-full object-cover"
          loading="lazy"
          draggable={false}
        />
        {/* Soft inner glow at bottom for depth */}
        <div className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-inset ring-white/5" />
        {/* Subtle vignette to blend into frame */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-black/70 to-transparent" />
      </div>

      {/* Card name */}
      <div className="mt-0.5 text-center text-[9px] font-black uppercase tracking-wider text-amber-400 [text-shadow:1px_1px_0_#000,0_0_4px_rgba(0,0,0,0.8)] leading-tight">
        {card.name}
      </div>

      {/* Subtypes: golden pill */}
      <div className="mx-auto mt-0.5 rounded border border-amber-600/60 bg-gradient-to-r from-amber-600 to-yellow-500 px-1 py-0 text-[6px] font-bold uppercase tracking-wider text-zinc-900 shadow">
        {card.subtypes.join(" / ")}
      </div>

      {/* Effect text: parchment box */}
      <div className="mt-0.5 flex-1 overflow-hidden rounded border border-amber-200/30 bg-gradient-to-b from-amber-50 to-amber-100 px-1 py-0.5 text-[7.5px] leading-tight text-zinc-900 shadow-inner" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
        <span className="font-bold">E:</span> {card.text}
      </div>

      {/* Category button at bottom */}
      <div
        className={cn(
          "mt-0.5 rounded border bg-gradient-to-b px-1 py-0 text-center text-[7px] font-black uppercase tracking-widest text-white shadow-md",
          cat.buttonClass,
          cat.buttonFace
        )}
      >
        {cat.label}
      </div>
    </motion.button>
  );
}
