"use client";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogTitle, DialogOverlay } from "@/components/ui/dialog";
import type { CardDef } from "@/lib/game/types";
import { CATEGORY_META, RARITY_META, LANE_META, TRIGGER_META, KEYWORD_META } from "@/lib/game/types";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBalanceInfo } from "@/lib/game/balance";

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
  // Balance info — PTP target vs current with delta
  const bal = getBalanceInfo(card);
  const balColorClass = bal.status === "balanced" ? "text-emerald-300 border-emerald-500/40 bg-emerald-950/40" : bal.status === "marginal" ? "text-amber-300 border-amber-500/40 bg-amber-950/40" : "text-rose-300 border-rose-500/40 bg-rose-950/40";
  const balSign = bal.delta > 0 ? "+" : "";

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

          {/* Subtle "Toca para cerrar" pill at top-center (replaces "Vista previa") */}
          <div className="pointer-events-none absolute left-1/2 top-2 z-30 -translate-x-1/2 rounded-full bg-black/70 px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest text-amber-200/90 backdrop-blur-sm">
            <Sparkles className="inline h-2.5 w-2.5" /> Toca para cerrar
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

            {/* Effect text */}
            <div className="rounded-md border border-amber-200/30 bg-gradient-to-b from-amber-50/95 to-amber-100/95 px-2 py-1.5 text-[11px] leading-snug text-zinc-900 shadow-inner backdrop-blur-sm" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
              <span className="font-bold">Efecto:</span> {card.text}
            </div>

            {/* Rarity as TEXT at bottom center */}
            <div className={cn("mt-0.5 flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-widest", RARITY_TEXT_COLOR[card.rarity])}>
              <span className={cn("inline-block h-2 w-2 rounded-full", rar.gemClass)} />
              <span>{RARITY_LETTER[card.rarity]}</span>
              <span className="opacity-70">·</span>
              <span>{rar.label}</span>
            </div>

            {/* Balance badge — PTP target vs current with delta color-coded */}
            <div className={cn("mt-1 flex items-center justify-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-wider backdrop-blur-sm", balColorClass)}>
              <span className="opacity-80">PTP</span>
              <span className="tabular-nums">{bal.current.toFixed(1)}</span>
              <span className="opacity-60">/</span>
              <span className="tabular-nums opacity-80">{bal.target.toFixed(1)}</span>
              <span className="opacity-60">·</span>
              <span className="tabular-nums">{balSign}{bal.delta.toFixed(1)}</span>
              <span className="opacity-60">·</span>
              <span>{bal.status === "balanced" ? "✓ OK" : bal.status === "marginal" ? "~ Marginal" : bal.delta > 0 ? "↑ Sobre" : "↓ Falta"}</span>
            </div>
          </div>
        </motion.div>

        {/* Hint below the card */}
        <div className="pointer-events-none mt-4 text-center text-[10px] uppercase tracking-widest text-zinc-400">
          Toca en cualquier lugar para cerrar
        </div>
      </DialogContent>
    </Dialog>
  );
}
