"use client";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogTitle, DialogOverlay } from "@/components/ui/dialog";
import type { CardDef } from "@/lib/game/types";
import { CATEGORY_META, RARITY_META, LANE_META, TRIGGER_META, KEYWORD_META } from "@/lib/game/types";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { CostBadge, PowerBadge } from "./CardBadges";
import { useState } from "react";
import type { PowerLogEntry } from "@/lib/game/types";

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
  const trigger = card.trigger ?? "on_play";
  const triggerMeta = TRIGGER_META[trigger];
  const keyword = card.keyword ?? "none";
  const keywordMeta = KEYWORD_META[keyword];
  const subtypeMetas = card.subtypes.map((s) => LANE_META[s]).filter(Boolean);

  // Close handler — single tap anywhere (including the card) closes the modal.
  const close = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Darker, full-blocking overlay — intercepts ALL pointer events so the user
          can't tap on underlying hand cards / lanes while the preview is open.
          Tapping anywhere on the overlay (i.e. outside the card) closes the modal. */}
      <DialogOverlay
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
        onClick={close}
      />
      <DialogContent
        showCloseButton={false}
        // Center the card in the viewport (override the default which is fine, but
        // we want a transparent background so only the card itself is visible).
        className="border-transparent bg-transparent p-0 shadow-none left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] sm:max-w-xs max-w-[calc(100%-1rem)] gap-0"
        // Tapping on the dialog content area (which is transparent) should also close
        onClick={close}
      >
        <DialogTitle className="sr-only">{card.name}</DialogTitle>
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.7, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
          onClick={(e) => {
            // Stop the click from bubbling up to the dialog content (which would close).
            // BUT — we WANT the card click to close, so we still call `close()` here.
            e.stopPropagation();
            close();
          }}
          className={cn(
            // Same full-art hand-card design, just larger
            "relative mx-auto flex h-[28rem] w-56 cursor-pointer flex-col overflow-hidden rounded-2xl border-2 shadow-2xl shadow-black/90",
            "bg-zinc-950",
            card.rarity === "common" ? "border-zinc-500"
            : card.rarity === "rare" ? "border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.3)]"
            : card.rarity === "epic" ? "border-violet-400 shadow-[0_0_18px_rgba(168,85,247,0.4)]"
            : "border-amber-400 shadow-[0_0_22px_rgba(251,191,36,0.5)]",
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

          {/* Cost badge (top-left) — crystal */}
          <div className="absolute left-2 top-2 z-30">
            <CostBadge cost={card.cost} size="lg" />
          </div>

          {/* Power badge (top-right) — shield */}
          <div className="absolute right-2 top-2 z-30">
            <PowerBadge power={card.power} size="lg" />
          </div>

          {/* Bottom info panel overlay */}
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

            {/* Trigger + Keyword chips — when the effect fires + which keyword */}
            <div className="flex justify-center gap-1.5 flex-wrap">
              <span
                title={triggerMeta.description}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/70 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider backdrop-blur-sm",
                  triggerMeta.color
                )}
              >
                <span>{triggerMeta.emoji}</span>
                {triggerMeta.label}
              </span>
              {keyword !== "none" && (
                <span
                  title={keywordMeta.description + (keywordMeta.hasValue && card.keywordValue ? ` (X=${card.keywordValue})` : "")}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/70 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider backdrop-blur-sm",
                    keywordMeta.color
                  )}
                >
                  <span>{keywordMeta.emoji}</span>
                  {keywordMeta.label}{keywordMeta.hasValue && card.keywordValue ? ` [${card.keywordValue}]` : ""}
                </span>
              )}
            </div>

            {/* Effect explanation — blood-stained parchment style */}
            <div
              className="rounded-md border border-red-900/40 px-2 py-1.5 text-[11px] leading-snug shadow-inner backdrop-blur-sm"
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                background: "linear-gradient(to bottom, rgba(245, 230, 210, 0.95) 0%, rgba(220, 200, 175, 0.95) 40%, rgba(200, 170, 140, 0.92) 100%)",
                color: "#3b0a0a",
                boxShadow: "inset 0 0 12px rgba(120, 20, 20, 0.25), inset 0 0 3px rgba(80, 10, 10, 0.4)",
                backgroundImage: "linear-gradient(to bottom, rgba(245, 230, 210, 0.95) 0%, rgba(220, 200, 175, 0.95) 40%, rgba(200, 170, 140, 0.92) 100%), radial-gradient(ellipse at 20% 30%, rgba(120, 20, 20, 0.15) 0%, transparent 40%), radial-gradient(ellipse at 80% 70%, rgba(100, 15, 15, 0.12) 0%, transparent 35%)",
              }}
            >
              <div>
                <span className="font-bold">{triggerMeta.emoji} {triggerMeta.label}:</span>{" "}
                <span>{triggerMeta.description}</span>
              </div>
              {keyword !== "none" && (
                <div className="mt-1">
                  <span className="font-bold">{keywordMeta.emoji} {keywordMeta.label}</span>
                  {keywordMeta.hasValue && card.keywordValue ? ` [${card.keywordValue}]` : ""}
                  <span className="font-bold">:</span>{" "}
                  <span>{keywordMeta.description}</span>
                </div>
              )}
              {card.umbralCondition && (
                <div className="mt-1">
                  <span className="font-bold">🔥 Umbral:</span>{" "}
                  <span>Se activa al alcanzar o superar {card.umbralCondition.powerThreshold} puntos de poder.</span>
                </div>
              )}
            </div>

            {/* Floating effect chips on right side (replaces Registro button) */}
            {("powerLog" in card) && (card as any).powerLog && ((card as any).powerLog as PowerLogEntry[]).length > 0 && (
              <div className="absolute right-1 top-12 z-30 flex flex-col gap-0.5">
                {((card as any).powerLog as PowerLogEntry[]).map((entry, i) => (
                  <div key={i} className={cn(
                    "flex items-center gap-0.5 rounded border px-1 py-0.5 text-[7px] font-bold uppercase tracking-wider backdrop-blur-sm shadow-md",
                    entry.delta > 0
                      ? "border-emerald-400/40 bg-emerald-950/80 text-emerald-300"
                      : "border-rose-400/40 bg-rose-950/80 text-rose-300"
                  )}>
                    {entry.delta > 0 ? "+" : ""}{entry.delta}
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
