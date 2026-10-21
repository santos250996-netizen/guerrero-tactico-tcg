"use client";

// ============================================================================
// ClassRuleBadge — REGLA SISTÉMICA DE CLASE (V3, grupo A): chip de una línea
// que al TAP despliega el lore (2 líneas) + el consejo táctico de la regla.
//
// Minimalista por defecto (feedback del usuario: "mucho texto" en la selección
// de clase): lo visible es solo {sigil} {regla}; el detalle vive tras el tap,
// igual que el nombre completo de las keywords vive SOLO en el preview.
// ============================================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { CLASS_RULE_META } from "@/lib/game/campaign";
import type { GameClass } from "@/lib/game/types";
import { sfx } from "@/lib/sound";
import { cn } from "@/lib/utils";

const TONE: Record<GameClass, { chip: string; text: string; open: string }> = {
  guerrero: {
    chip: "border-amber-500/40 bg-amber-950/40",
    text: "text-amber-200",
    open: "border-amber-500/30 bg-amber-950/20",
  },
  mago: {
    chip: "border-violet-500/40 bg-violet-950/40",
    text: "text-violet-200",
    open: "border-violet-500/30 bg-violet-950/20",
  },
  asesino: {
    chip: "border-emerald-500/40 bg-emerald-950/40",
    text: "text-emerald-200",
    open: "border-emerald-500/30 bg-emerald-950/20",
  },
  // V3.0
  botanico: {
    chip: "border-green-500/40 bg-green-950/40",
    text: "text-green-200",
    open: "border-green-500/30 bg-green-950/20",
  },
  pirata: {
    chip: "border-blue-500/40 bg-blue-950/40",
    text: "text-blue-200",
    open: "border-blue-500/30 bg-blue-950/20",
  },
  tinker: {
    chip: "border-yellow-500/40 bg-yellow-950/40",
    text: "text-yellow-200",
    open: "border-yellow-500/30 bg-yellow-950/20",
  },
};

export function ClassRuleBadge({ gameClass }: { gameClass: GameClass }) {
  const [open, setOpen] = useState(false);
  const meta = CLASS_RULE_META[gameClass];
  const tone = TONE[gameClass];

  return (
    <div className="w-full">
      <button
        onClick={() => {
          sfx.click();
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-center gap-1.5 rounded-full border py-1 transition-colors",
          tone.chip,
          open && "rounded-b-none rounded-t-full"
        )}
        title="Toca para ver el lore y el consejo de la regla"
      >
        <span aria-hidden className="text-[10px] leading-none">{meta.sigil}</span>
        <span className={cn("text-[9px] font-black uppercase tracking-[0.18em]", tone.text)}>
          {meta.rule}
        </span>
        <ChevronDown
          className={cn("h-3 w-3 opacity-60 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className={cn("rounded-b-xl border border-t-0 px-3 pb-2 pt-1.5", tone.open)}>
              <p className="text-[10px] italic leading-relaxed text-zinc-400">
                “{meta.lore}”
              </p>
              <p className={cn("mt-1.5 text-[10px] font-bold leading-relaxed", tone.text)}>
                {meta.tip}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
