"use client";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogTitle, DialogOverlay } from "@/components/ui/dialog";
import type { CardDef } from "@/lib/game/types";
import { CATEGORY_META, LANE_META, TRIGGER_META, KEYWORD_META } from "@/lib/game/types";
import {
  Sparkles,
  Link2,
  Map,
  TrendingUp,
  TrendingDown,
  Target,
  Flame,
  Infinity as InfinityIcon,
  Sunrise,
  Sunset,
  Skull,
  Hand,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CostBadge, PowerBadge } from "./CardBadges";
import { CardShell } from "./CardFrame";
import { useState } from "react";
import type { PowerLogEntry } from "@/lib/game/types";

// PowerLogEntry kind → lucide icon + label + color (for the Registro de Modificadores panel)
const KIND_META: Record<NonNullable<PowerLogEntry["kind"]>, { icon: LucideIcon; label: string; text: string; bg: string; border: string }> = {
  synergy:   { icon: Link2,        label: "Sinergia",       text: "text-sky-300",     bg: "bg-sky-950/70",     border: "border-sky-500/40" },
  field:      { icon: Map,          label: "Campo",          text: "text-amber-300",  bg: "bg-amber-950/70",   border: "border-amber-500/40" },
  effect:     { icon: Sparkles,     label: "Efecto",         text: "text-fuchsia-300",bg: "bg-fuchsia-950/70",border: "border-fuchsia-500/40" },
  buff:       { icon: TrendingUp,   label: "Mejora",         text: "text-emerald-300",bg: "bg-emerald-950/70",border: "border-emerald-500/40" },
  debuff:     { icon: TrendingDown, label: "Reducción",      text: "text-rose-300",   bg: "bg-rose-950/70",   border: "border-rose-500/40" },
  trap:       { icon: Target,       label: "Trampa",        text: "text-rose-400",   bg: "bg-rose-950/80",   border: "border-rose-400/50" },
  passive:    { icon: InfinityIcon, label: "Pasivo",         text: "text-emerald-300",bg: "bg-emerald-950/70",border: "border-emerald-500/40" },
  start_turn: { icon: Sunrise,      label: "Inicio turno",   text: "text-amber-300",  bg: "bg-amber-950/70",  border: "border-amber-500/40" },
  end_turn:   { icon: Sunset,       label: "Fin turno",      text: "text-violet-300", bg: "bg-violet-950/70", border: "border-violet-500/40" },
  on_death:   { icon: Skull,        label: "Al morir",       text: "text-rose-300",   bg: "bg-rose-950/70",   border: "border-rose-500/40" },
  hand:       { icon: Hand,         label: "En mano",        text: "text-emerald-300",bg: "bg-emerald-950/70",border: "border-emerald-500/40" },
};

export function CardPreviewModal({ card, open, onOpenChange }: { card: CardDef | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  if (!card) return null;
  const cat = CATEGORY_META[card.category];
  const trigger = card.trigger ?? "on_play";
  const triggerMeta = TRIGGER_META[trigger];
  const keyword = card.keyword ?? "none";
  const keywordMeta = KEYWORD_META[keyword];
  const subtypeMetas = card.subtypes.map((s) => LANE_META[s]).filter(Boolean);

  // ====== POWER MODIFIERS COMPUTATION ======
  // Effective power = currentPower (board) or power + handBonus (hand) or just power.
  const basePower = card.basePower ?? card.power;
  const effectivePower = card.currentPower ?? (card.power + (card.handBonus ?? 0));
  const powerDelta = effectivePower - basePower;
  const isBuffed = powerDelta > 0;
  const isDebuffed = powerDelta < 0;

  // Unified modifiers list — board cards use `powerLog`, hand cards use `handBonusSources`.
  // Each entry: { source, delta, kind }
  type ModEntry = { source: string; delta: number; kind: PowerLogEntry["kind"] };
  const modifiers: ModEntry[] = [];
  if (card.powerLog && card.powerLog.length > 0) {
    for (const e of card.powerLog) modifiers.push({ source: e.source, delta: e.delta, kind: e.kind });
  } else if (card.handBonusSources && card.handBonusSources.length > 0) {
    for (const e of card.handBonusSources) modifiers.push({ source: e.source, delta: e.delta, kind: "hand" });
  } else if (card.handBonus && card.handBonus !== 0) {
    // Fallback if sources weren't broken down — show a single aggregate entry.
    modifiers.push({ source: keyword !== "none" ? keywordMeta.label : "Bonificador en mano", delta: card.handBonus, kind: "hand" });
  }

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
            e.stopPropagation();
            close();
          }}
          className={cn(
            "relative mx-auto flex w-56 cursor-pointer flex-col",
            // Auto-grow height: base 28rem + extra for the Registro panel when there are modifiers.
            modifiers.length > 0 ? "h-[34rem]" : "h-[28rem]"
          )}
        >
          {/* Marco TCG completo: bisel + filigranas + foil + name plate */}
          <CardShell rarity={card.rarity} name={card.name} nameSize="lg" className="h-full w-full">
            {/* Full-bleed art */}
            <img
              src={`/cards/${card.id}.png`}
              alt={card.name}
              className="absolute inset-0 h-full w-full object-cover"
              draggable={false}
              decoding="async"
            />

            {/* Dark gradient at the bottom for legibility */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/95 via-black/75 to-transparent" />

            {/* Cost badge (top-left) — crystal */}
            <div className="absolute left-2 top-2 z-30">
              <CostBadge cost={card.cost} size="lg" />
            </div>

            {/* Power badge (top-right) — shield, shows EFFECTIVE power (currentPower on board, power+handBonus in hand). */}
            <div className="absolute right-2 top-2 z-30 flex flex-col items-end gap-0.5">
              <PowerBadge power={effectivePower} size="lg" />
              {/* Delta chip — only when effective ≠ base */}
              {powerDelta !== 0 && (
                <div className={cn(
                  "rounded-full border px-1.5 py-0.5 text-[9px] font-black tabular-nums whitespace-nowrap backdrop-blur-sm shadow-md",
                  isBuffed
                    ? "border-emerald-300/70 bg-emerald-900/80 text-emerald-200"
                    : "border-rose-300/70 bg-rose-900/80 text-rose-200"
                )}>
                  {isBuffed ? "+" : ""}{powerDelta}
                </div>
              )}
            </div>

            {/* Bottom info panel overlay — el nombre vive en el NAME PLATE del marco */}
            <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-1 px-3 pb-9 pt-2.5">
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
                    <lm.icon className="h-3.5 w-3.5" />
                  </span>
                ))}
              </div>
            </div>

            {/* Card name eliminado de aquí — vive en el name plate del marco */}

            {/* Trigger + Keyword chips — when the effect fires + which keyword */}
            <div className="flex justify-center gap-1.5 flex-wrap">
              <span
                title={triggerMeta.description}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/70 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider backdrop-blur-sm",
                  triggerMeta.color
                )}
              >
                <triggerMeta.icon className="h-3 w-3" />
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
                  <keywordMeta.icon className="h-3 w-3" />
                  {keywordMeta.label}{keywordMeta.hasValue && card.keywordValue ? ` [${card.keywordValue}]` : ""}
                </span>
              )}
            </div>

            {/* Effect explanation — blood-stained parchment style.
                Content: the card's per-card `text` field (specific behavior description
                in Spanish). The old generic TRIGGER_META/KEYWORD_META descriptions were
                removed because the `text` field is more specific and already mentions
                exact numbers and conditions. The umbralCondition line is kept because
                it's dynamic (depends on the card's powerThreshold) and not always
                encoded in the `text` field. */}
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
              {card.text && (
                <div className="italic">{card.text}</div>
              )}
            </div>

            {/* ====== REGISTRO DE MODIFICADORES ====== */}
            {modifiers.length > 0 && (
              <div className="mt-1 px-0.5">
                <ul className="space-y-0.5">
                  {modifiers.map((m, i) => {
                    const km = KIND_META[m.kind] ?? KIND_META.effect;
                    const positive = m.delta > 0;
                    return (
                      <li key={i} className="flex items-center gap-1 text-[10px] leading-none">
                        <km.icon className="h-2.5 w-2.5 shrink-0" />
                        <span className="flex-1 truncate text-zinc-400">{m.source}</span>
                        <span className={cn("shrink-0 font-bold tabular-nums", positive ? "text-emerald-400" : "text-rose-400")}>
                          {positive ? "+" : ""}{m.delta}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-0.5 flex items-center justify-end gap-1 border-t border-white/5 pt-0.5 text-[10px] font-bold tabular-nums">
                  <span className="text-zinc-600">{basePower}</span>
                  <span className="text-zinc-700">→</span>
                  <span className={cn(isBuffed ? "text-emerald-400" : isDebuffed ? "text-rose-400" : "text-zinc-300")}>
                    {effectivePower}
                  </span>
                </div>
              </div>
            )}

          </div>
          </CardShell>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
