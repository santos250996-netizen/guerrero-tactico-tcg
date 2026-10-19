"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BoardCard } from "@/lib/game/types";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { isLowPowerDevice } from "@/lib/game/perf";
import { CardShell } from "./CardFrame";

interface BoardCardMiniProps {
  card: BoardCard;
  side: "player" | "enemy";
  onPreview?: (card: BoardCard) => void;
  /** Recién jugada por el RIVAL: anillo ámbar pulsante — su turno se ve. */
  justPlayed?: boolean;
}

function BoardCardMiniImpl({ card, side, onPreview, justPlayed }: BoardCardMiniProps) {
  const isBuffed = card.currentPower > card.basePower;
  const isDebuffed = card.currentPower < card.basePower;

  return (
    <motion.div
      // layout-anim FLIP: se omite en móviles low-power (medición costosa)
      layout={!isLowPowerDevice() || undefined}
      // ENTRADA CON EMBESTIDA: la carta entra volando desde la mano del
      // dueño (abajo=tuyo / arriba=rival) con leve rotación y aterriza.
      initial={{
        opacity: 0,
        scale: 0.62,
        y: side === "player" ? 78 : -78,
        rotate: side === "player" ? 3.5 : -3.5,
      }}
      animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
      // SALIDA: apagado a blanco y desaturación mientras el clon de muerte
      // (CardJuiceLayer) hace el efecto de spec. Sin AnimatePresence en el
      // grid esto no corre — se añadió en LaneComponent/PvpLane.
      exit={{
        opacity: 0,
        scale: 0.82,
        y: side === "player" ? -24 : 24,
        filter: "brightness(1.9) saturate(0.15)",
        transition: { duration: 0.26, ease: "easeOut" },
      }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
      whileHover={onPreview ? { scale: 1.08, zIndex: 10 } : undefined}
      className={cn("relative aspect-[3/4] w-full", onPreview && "cursor-pointer")}
      data-card-uid={card.uid}
      // Spec principal (para la animación de muerte por spec del CardJuiceLayer)
      data-spec={card.subtypes[0] ?? ""}
      onClick={(e) => {
        if (onPreview) {
          e.stopPropagation();
          onPreview(card);
        }
      }}
    >
      {/* Anillo "recién jugada por el rival" — fuera del CardShell para que
          el borde negativo no lo recorte ningún overflow-hidden interno. */}
      {justPlayed && (
        <motion.div
          initial={{ opacity: 0, scale: 1.3 }}
          animate={{ opacity: [0, 1, 0.55, 1, 0.55, 1], scale: 1 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
          className="pointer-events-none absolute -inset-[3px] z-30 rounded-md border-2 border-amber-300"
          style={{ boxShadow: "0 0 14px rgba(252,211,77,0.9), inset 0 0 8px rgba(252,211,77,0.45)" }}
        />
      )}
      {/* Marco TCG por rareza (simplificado: sin name plate en mini) —
          con pips de TIER DE FUSIÓN: lo ganado fusionando se VE en tablero */}
      <CardShell rarity={card.rarity} corners cornerSize={9} tierPips className="h-full w-full">
        {/* Full square art */}
        <img
          src={`/cards/${card.defId}.webp`}
          alt={card.name}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          draggable={false}
        />

        {/* Dark gradient at bottom for badge legibility */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" />

        {/* Cost badge (top-left) */}
        <div className="absolute left-0.5 top-0.5 z-20 flex h-4 w-4 items-center justify-center rounded-full border border-white/90 bg-gradient-to-b from-sky-500 to-sky-700 text-[8px] font-black text-white shadow-md">
          {card.cost}
        </div>

        {/* Power badge (top-right) — con anillo del TIER: rara cielo, épica
            magenta, legendaria ámbar (G3: la rareza se lee de un vistazo) */}
        <div className={cn(
          "absolute right-0.5 top-0.5 z-20 flex h-4 w-4 items-center justify-center rounded-full border text-[8px] font-black text-white shadow-md",
          card.rarity === "rare"
            ? "border-sky-300 bg-gradient-to-b from-sky-500 to-sky-800 ring-1 ring-sky-300/60"
            : card.rarity === "epic"
              ? "border-fuchsia-300 bg-gradient-to-b from-fuchsia-600 to-fuchsia-900 ring-1 ring-fuchsia-300/60"
              : card.rarity === "legendary"
                ? "border-amber-300 bg-gradient-to-b from-amber-500 to-amber-800 ring-1 ring-amber-300/70"
                : card.rarity === "mythic"
                  ? "border-rose-300 bg-gradient-to-b from-rose-500 to-rose-900 ring-2 ring-rose-300/80"
                  : isBuffed
                  ? "bg-gradient-to-b from-emerald-400 to-emerald-700 ring-1 ring-emerald-300/50"
                  : isDebuffed
                    ? "bg-gradient-to-b from-rose-500 to-rose-800 ring-1 ring-rose-300/50"
                    : "border-white/90 bg-gradient-to-b from-rose-600 to-rose-900"
        )}>
          {card.currentPower}
        </div>

        {/* Shield badge (apilado bajo el coste) — escudo restante (Coraza/Amparo).
            Antes iba en el centro superior, en medio de coste y poder, tapando ambos.
            En la columna izquierda forma una columna de stats: coste arriba, escudo
            debajo; el poder (top-right) y el arte central quedan siempre legibles. */}
        {(card.shieldRemaining ?? 0) > 0 && (
          <div
            title={`Escudo: absorbe ${card.shieldRemaining} puntos de reducción`}
            className="absolute left-0.5 top-[21px] z-20 flex h-4 items-center gap-0.5 rounded-full border border-sky-200/90 bg-gradient-to-b from-sky-400 to-sky-700 px-1 text-[8px] font-black text-white shadow-md"
          >
            <Shield className="h-2 w-2" />
            {card.shieldRemaining}
          </div>
        )}

        {/* Buff total (ally) — bottom-right, green */}
        {isBuffed && (
          <div className="absolute bottom-1 right-0.5 z-20 rounded bg-emerald-500/90 px-0.5 py-0 text-[6px] font-black text-white shadow">
            +{card.currentPower - card.basePower}
          </div>
        )}
        {/* Debuff total (enemy) — bottom-left, red */}
        {isDebuffed && (
          <div className="absolute bottom-1 left-0.5 z-20 rounded bg-rose-500/90 px-0.5 py-0 text-[6px] font-black text-white shadow">
            {card.currentPower - card.basePower}
          </div>
        )}
      </CardShell>
    </motion.div>
  );
}

// Memo: los objetos BoardCard se recrean de forma inmutable en la store —
// si la referencia no cambia, el subtree completo se salta el re-render.
export const BoardCardMini = memo(BoardCardMiniImpl);
