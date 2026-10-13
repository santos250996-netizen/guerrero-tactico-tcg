"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Skull, Loader2 } from "lucide-react";

export function TurnTransitionBanner({ visible, phase }: { visible: boolean; phase: "transition" | "thinking" }) {
  if (phase === "thinking") {
    return <AnimatePresence>{visible && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="pointer-events-none fixed left-1/2 top-20 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-rose-700/50 bg-rose-950/90 px-4 py-1.5 text-xs font-bold text-rose-300 shadow-lg backdrop-blur"><Loader2 className="h-3.5 w-3.5 animate-spin" />Rival está pensando…</motion.div>}</AnimatePresence>;
  }
  return <AnimatePresence>{visible && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"><motion.div initial={{ scale: 0.6, rotate: -5 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ type: "spring", stiffness: 200, damping: 18 }} className="flex flex-col items-center gap-3 rounded-2xl border-2 border-rose-700/60 bg-gradient-to-b from-rose-950 to-black px-8 py-6 shadow-2xl"><motion.div animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 1.2, repeat: Infinity }}><Skull className="h-12 w-12 text-rose-500" /></motion.div><div className="text-center text-xl font-black uppercase tracking-widest text-rose-400">Turno del rival</div><div className="text-[10px] uppercase tracking-widest text-zinc-500">Preparando jugadas…</div></motion.div></motion.div>}</AnimatePresence>;
}
