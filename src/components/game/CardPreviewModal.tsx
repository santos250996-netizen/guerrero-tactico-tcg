"use client";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { CardDef } from "@/lib/game/types";
import { CATEGORY_META, RARITY_META } from "@/lib/game/types";
import { Zap, Swords } from "lucide-react";
import { cn } from "@/lib/utils";

export function CardPreviewModal({ card, open, onOpenChange }: { card: CardDef | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  if (!card) return null;
  const cat = CATEGORY_META[card.category]; const rar = RARITY_META[card.rarity];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Position the dialog at the top of the screen instead of centered */}
      <DialogContent className="border-zinc-800 bg-zinc-950 p-0 top-[6%] translate-y-0 sm:max-w-xs max-w-[calc(100%-1rem)]">
        <DialogTitle className="sr-only">{card.name}</DialogTitle>
        <motion.div initial={{ scale: 0.9, opacity: 0, y: -20 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className={cn("relative flex flex-col overflow-hidden rounded-xl border-2 bg-gradient-to-b from-zinc-800 via-zinc-900 to-black p-2", rar.borderClass, rar.glowClass)}>
          <div className="absolute left-2 top-2 z-30 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/90 bg-gradient-to-b from-sky-500 to-sky-700 text-white shadow-lg"><div className="flex flex-col items-center leading-none"><Zap className="h-3 w-3 fill-white" /><span className="text-xs font-black">{card.cost}</span></div></div>
          <div className="absolute right-2 top-2 z-30 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/90 bg-gradient-to-b from-rose-500 to-rose-800 text-white shadow-lg"><div className="flex flex-col items-center leading-none"><Swords className="h-3 w-3" /><span className="text-xs font-black">{card.power}</span></div></div>
          <div className="relative mx-auto mt-2 h-60 w-full overflow-hidden rounded-2xl border-2 bg-zinc-950">
            <img src={`/cards/${card.id}.png`} alt={card.name} className="h-full w-full object-cover" draggable={false} />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute left-2 top-2 z-10"><span className={cn("rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm", cat.bgClass, cat.textClass, cat.borderClass)}>{cat.label}</span></div>
          </div>
          <div className="mt-2 text-center text-base font-black uppercase tracking-wider text-amber-400 [text-shadow:1px_1px_0_#000]">{card.name}</div>
          <div className={cn("mx-auto mt-0.5 flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-black/40", rar.borderClass, rar.textClass)}><span className={cn("h-1.5 w-1.5 rounded-full", rar.gemClass)} />{rar.label}</div>
          <div className="mx-auto mt-1 rounded border border-amber-600/60 bg-gradient-to-r from-amber-600 to-yellow-500 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-900">{card.subtypes.join(" / ")}</div>
          <div className="mt-2 rounded border border-amber-200/30 bg-gradient-to-b from-amber-50 to-amber-100 px-3 py-2 text-xs leading-snug text-zinc-900" style={{ fontFamily: "Georgia, serif" }}><span className="font-bold">Efecto:</span> {card.text}</div>
          <div className={cn("mt-2 rounded border-2 bg-gradient-to-b px-2 py-1 text-center text-xs font-black uppercase tracking-widest text-white shadow-md", cat.buttonClass, cat.buttonFace)}>{cat.label}</div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
