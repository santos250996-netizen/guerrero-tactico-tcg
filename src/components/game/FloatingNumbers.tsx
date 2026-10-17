"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import { cn } from "@/lib/utils";

export function FloatingNumbersLayer() {
  const floats = useGameStore((s) => s.floatingNumbers);
  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      <AnimatePresence>
        {floats.map((f) => {
          const el = document.querySelector(`[data-card-uid="${f.uid}"]`);
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          const x = rect.left + rect.width / 2; const y = rect.top;
          return <motion.div key={f.id} initial={{ opacity: 0, y: 0, scale: 0.5 }} animate={{ opacity: 1, y: -30, scale: 1.2 }} exit={{ opacity: 0, y: -50, scale: 0.8 }} transition={{ duration: 1.0, ease: "easeOut" }} className={cn("absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 px-2 py-0.5 text-sm font-black tabular-nums shadow-lg", f.value > 0 ? "border-emerald-300 bg-emerald-600 text-white" : "border-rose-300 bg-rose-700 text-white")} style={{ left: x, top: y }}>{f.value > 0 ? `+${f.value}` : `${f.value}`}</motion.div>;
        })}
      </AnimatePresence>
    </div>
  );
}
