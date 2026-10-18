"use client";

// ============================================================================
// BattleLogList — lista del Registro de Batalla, aislada en su propio
// componente. Motivo de rendimiento: `log` es un array que crece en cada
// acción; si page.tsx se suscribe a él, cada entrada re-renderiza TODO el
// tablero. Aquí solo este subtree se actualiza (y solo si el modal está
// montado con contenido).
// ============================================================================

import { AnimatePresence, motion } from "framer-motion";
import { useGameStore } from "@/store/gameStore";

export function BattleLogList() {
  const log = useGameStore((s) => s.log);

  return (
    <div className="space-y-1 p-1">
      <AnimatePresence initial={false}>
        {log.length === 0 ? (
          <div className="py-3 text-center text-[11px] text-zinc-600">Sin actividad todavía.</div>
        ) : (
          log.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`rounded border px-2 py-1 text-[10px] leading-tight ${
                entry.side === "player"
                  ? "border-emerald-800/40 bg-emerald-950/30 text-emerald-200"
                  : entry.side === "enemy"
                    ? "border-rose-800/40 bg-rose-950/30 text-rose-200"
                    : "border-zinc-800 bg-zinc-900/40 text-zinc-300"
              }`}
            >
              <div className="flex items-center justify-between text-[9px] uppercase opacity-70">
                <span>{entry.side === "player" ? "Tú" : entry.side === "enemy" ? "Rival" : "Sistema"}</span>
                <span>T{entry.turn}</span>
              </div>
              <div>{entry.text}</div>
            </motion.div>
          ))
        )}
      </AnimatePresence>
    </div>
  );
}
