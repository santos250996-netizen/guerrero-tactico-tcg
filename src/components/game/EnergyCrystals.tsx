"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/settings";

export function EnergyCrystals({ current, max }: { current: number; max: number }) {
  const anim = useSettings((s) => s.animationsOn);
  const slots = Math.max(1, Math.min(6, max));
  const filled = Math.min(current, slots);
  return (
    <div className="flex items-center gap-1.5 rounded border border-emerald-700/50 bg-emerald-950/60 px-2 py-1">
      <div className="flex items-center gap-1">
        {Array.from({ length: slots }).map((_, i) => (
          <motion.div key={i} initial={anim ? { scale: 0.4, opacity: 0 } : false} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 350, damping: 20, delay: anim ? i * 0.04 : 0 }}
            className={cn("relative h-4 w-3.5 overflow-hidden rounded-sm", i < filled ? "bg-gradient-to-b from-emerald-300 via-emerald-500 to-emerald-700 shadow-[0_0_6px_rgba(16,185,129,0.6)]" : "bg-zinc-800 border border-zinc-700")}>
            {i < filled && <span className="absolute inset-x-0.5 top-0.5 h-1 rounded-sm bg-emerald-200/80" />}
          </motion.div>
        ))}
      </div>
      <span className="ml-1 text-[11px] font-bold tabular-nums text-emerald-300">{current}<span className="text-emerald-700">/{max}</span></span>
    </div>
  );
}
