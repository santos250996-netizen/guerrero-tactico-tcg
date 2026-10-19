"use client";

// ============================================================================
// PvpLane — UN lado de una posición del tablero PvP.
//   side="me"    → mis carriles (abajo): zona de juego, click/drag para jugar.
//   side="rival" → carriles del rival (arriba): solo lectura, con SU fondo de
//                  clase y SU título de spec (p.ej. rival Mago → ARCANA/FUEGO/HIELO).
// El emparejamiento es POSICIONAL: mi carril p se enfrenta al carril p del rival.
// IMPORTANTE: el board del servidor viaja con MIS claves de carril, así que la
// fila rival se resuelve por POSICIÓN: sus cartas son board[miCarrilP].enemy.
// ============================================================================

import { motion, AnimatePresence } from "framer-motion";
import type { LaneId } from "@/lib/game/types";
import { LANE_META } from "@/lib/game/types";
import { usePvpStore } from "@/store/pvpStore";
import { BoardCardMini } from "../BoardCardMini";
import { LANE_COLOR_CLASSES } from "../LaneComponent";
import {
  getEffectiveCost,
  getLaneMaxCards,
  isCardCostAllowed,
} from "@/lib/game/engine";
import { cn } from "@/lib/utils";
import { EmptySlot, LaneBanner, LANE_HEX } from "../LaneDecor";

const BONUS_CHIP_CLASS: Record<string, { chip: string }> = {
  positive: { chip: "bg-emerald-700/80 border-emerald-400/50 text-emerald-50" },
  penalty: { chip: "bg-rose-800/80 border-rose-400/50 text-rose-50" },
  restrictive: { chip: "bg-amber-700/80 border-amber-400/50 text-amber-50" },
};

interface PvpLaneProps {
  /** Índice posicional (0-2): define la pareja de carriles enfrentados. */
  position: number;
  side: "me" | "rival";
}

export function PvpLane({ position, side }: PvpLaneProps) {
  const view = usePvpStore((s) => s.view);
  const selectedCardUid = usePvpStore((s) => s.selectedCardUid);
  const sendPlay = usePvpStore((s) => s.sendPlay);
  const highlightUid = usePvpStore((s) => s.highlightUid);

  if (!view) return null;

  const myLaneId: LaneId = view.you.lanes[position];
  const rivalLaneId: LaneId = view.rival.lanes[position];
  // El id del carril que PINTA esta componente es el del propietario de la fila.
  const laneId = side === "me" ? myLaneId : rivalLaneId;
  const meta = LANE_META[laneId];
  const colors = LANE_COLOR_CLASSES[meta.color];
  const hex = LANE_HEX[meta.color] ?? "#fbbf24";

  // Datos de la posición (tablero con mis claves):
  const posState = view.board[myLaneId];
  const myCards = posState.player;
  const rivalCards = posState.enemy;
  const cards = side === "me" ? myCards : rivalCards;
  const bonus = (side === "me" ? view.you.laneBonuses[myLaneId] : view.rival.laneBonuses[rivalLaneId]) ?? null;

  const myScore = myCards.reduce((a, c) => a + c.currentPower, 0);
  const rivalScore = rivalCards.reduce((a, c) => a + c.currentPower, 0);

  const maxCards = getLaneMaxCards(bonus);
  const myTurn = view.yourTurn;
  const selectedCard = selectedCardUid ? view.you.hand.find((c) => c.uid === selectedCardUid) ?? null : null;

  const canDrop =
    side === "me" &&
    myTurn &&
    selectedCard !== null &&
    isCardCostAllowed(selectedCard.cost, bonus) &&
    getEffectiveCost(selectedCard.cost, bonus) <= view.you.energy &&
    myCards.length < maxCards;

  // Coste EFECTIVO de la carta seleccionada EN ESTE carril (bono aplicado).
  // Con el bono "Coste -1" una carta de 4 se juega aquí por 3 — y ahora se VE.
  const selectedEffCost =
    side === "me" && selectedCard !== null && isCardCostAllowed(selectedCard.cost, bonus)
      ? getEffectiveCost(selectedCard.cost, bonus)
      : null;
  const discount = selectedCard !== null && selectedEffCost !== null ? selectedCard.cost - selectedEffCost : 0;

  const onLaneClick = () => {
    if (side !== "me" || !myTurn || !selectedCard) return;
    // El servidor valida y responde con el mensaje exacto si es ilegal.
    sendPlay(selectedCard.uid, myLaneId);
  };

  return (
    <section
      data-pvp-lane={`${side}-${position}`}
      data-lane-id={side === "me" ? myLaneId : undefined}
      data-lane-recipe={laneId}
      className={cn(
        "relative flex h-full min-h-0 flex-col gap-0.5 overflow-hidden rounded-lg border p-1",
        colors.border,
        bonus && colors.glow,
        canDrop && "cursor-pointer ring-2 " + colors.ring
      )}
      onClick={onLaneClick}
      role={side === "me" ? "button" : undefined}
      aria-label={side === "me" ? `Carril ${meta.title}` : `Carril rival ${meta.title}`}
      style={{
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -2px 8px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.5)",
      }}
    >
      {/* Fondo del carril — de la CLASE propietaria: Mago vs Guerrero muestran
          6 fondos distintos (3 del rival arriba + 3 tuyos abajo).
          Overlay ALIGERADO (V2 gráficos): el arte es protagonista. */}
      <div
        className="pointer-events-none absolute inset-0 z-0 scale-105 bg-cover bg-center"
        style={{ backgroundImage: `url(/menu/lane-${laneId}.png)` }}
      />
      {/* Tinte del color del carril (cohesión) + viñeta ligera */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{ background: `linear-gradient(180deg, ${hex}14 0%, transparent 30%, transparent 65%, rgba(0,0,0,0.42) 100%)` }}
      />
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-black/15 via-transparent to-black/25" />

      {/* Header del carril (propietario) — BANNER HERÁLDICO. El chip de bono SOLO
          en la fila propia: el bono es compartido por la pareja de carriles
          (positionBonuses[p] en pvp.ts), pintarlo también en la fila rival era
          redundante y robaba altura de pantalla. */}
      <LaneBanner
        title={meta.title}
        icon={meta.icon}
        hex={hex}
        right={
          side === "me" && (bonus || selectedEffCost !== null) ? (
            <span className="flex shrink-0 items-center gap-1">
              {bonus && (
                <span
                  title={bonus.description}
                  className={cn(
                    "whitespace-nowrap rounded-full border px-1 py-0 text-[6.5px] font-bold uppercase leading-[11px]",
                    BONUS_CHIP_CLASS[bonus.flavor].chip
                  )}
                >
                  {bonus.label}
                </span>
              )}
              {selectedEffCost !== null && discount > 0 && (
                <span
                  title={`Coste efectivo en este carril: ${selectedEffCost} (bono -${discount})`}
                  className="whitespace-nowrap rounded-full border border-amber-300/70 bg-amber-500/90 px-1 py-0 text-[6.5px] font-black uppercase leading-[11px] text-zinc-950"
                >
                  ⚡ {selectedEffCost}
                  <span className="ml-0.5 line-through opacity-70">{selectedCard!.cost}</span>
                </span>
              )}
            </span>
          ) : undefined
        }
      />

      {/* Zona de cartas: 2 columnas × 2 filas (máx 4 por bando). */}
      <div
        className={cn(
          "relative z-10 grid flex-1 grid-cols-2 grid-rows-2 gap-0.5 rounded border p-0.5 min-h-0",
          side === "me" && canDrop
            ? "border-dashed border-yellow-400/60 bg-yellow-500/5"
            : side === "me"
              ? "border-dashed border-white/10 bg-black/30"
              : "border-white/5 bg-black/30"
        )}
        style={{ boxShadow: "inset 0 2px 6px rgba(0,0,0,0.5)" }}
      >
        <AnimatePresence initial={false}>
        {Array.from({ length: Math.max(maxCards, cards.length) }).map((_, i) => {
          const card = cards[i];
          if (card) {
            return (
              <BoardCardMini
                key={card.uid}
                card={card}
                side={side === "me" ? "player" : "enemy"}
                justPlayed={card.uid === highlightUid}
                onPreview={(bc) =>
                  usePvpStore.getState().setPreviewCard({
                    id: bc.defId,
                    name: bc.name,
                    category: bc.category,
                    subtypes: bc.subtypes,
                    cost: bc.cost,
                    power: bc.basePower,
                    text: bc.text,
                    effectId: bc.effectId,
                    rarity: bc.rarity,
                    keyword: bc.keyword,
                    keywordValue: bc.keywordValue,
                    trigger: bc.trigger,
                    powerLog: bc.powerLog,
                    basePower: bc.basePower,
                    currentPower: bc.currentPower,
                  })
                }
              />
            );
          }
          return (
            <EmptySlot
              key={`empty-${i}`}
              hex={hex}
              icon={meta.icon}
              active={side === "me" && canDrop}
              enemy={side === "rival"}
            />
          );
        })}
        </AnimatePresence>
      </div>

      {/* Puntuación de la PAREJA (mi carril vs su carril pareado) — SOLO en
          la fila propia. Antes se pintaba el marcador idéntico en las dos
          filas (una por jugador) y era ruido duplicado en pantalla. */}
      {side === "me" && (
        <div className="relative z-10 rounded border border-white/5 bg-black/50 px-1 py-0.5">
          <div className="flex items-center justify-between">
            <div className="leading-none">
              <div className="text-[7px] font-bold uppercase tracking-widest text-zinc-400">Tú</div>
              <div
                className={cn(
                  "text-[12px] font-black tabular-nums leading-none",
                  myScore >= rivalScore ? "text-emerald-400" : "text-zinc-400"
                )}
              >
                {myScore}
              </div>
            </div>
            {myScore !== rivalScore && (
              <span className={cn("text-[8px] font-bold tabular-nums", myScore > rivalScore ? "text-emerald-500" : "text-rose-500")}>
                +{Math.abs(myScore - rivalScore)}
              </span>
            )}
            <div className="text-right leading-none">
              <div className="text-[7px] font-bold uppercase tracking-widest text-zinc-400">{view.rival.name}</div>
              <div
                className={cn(
                  "text-[12px] font-black tabular-nums leading-none",
                  rivalScore > myScore ? "text-rose-400" : "text-zinc-400"
                )}
              >
                {rivalScore}
              </div>
            </div>
          </div>
          {(myScore > 0 || rivalScore > 0) && (
            <div className="mt-0.5 flex h-1 w-full overflow-hidden rounded-full bg-black/60">
              <div
                className="bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
                style={{ width: `${(myScore / (myScore + rivalScore)) * 100}%` }}
              />
              <div
                className="bg-gradient-to-r from-rose-500 to-rose-700 transition-all duration-500"
                style={{ width: `${(rivalScore / (myScore + rivalScore)) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Overlay "esperando" cuando no es mi turno (solo fila propia) */}
      <AnimatePresence>
        {side === "me" && !myTurn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 z-20 bg-black/25"
          />
        )}
      </AnimatePresence>
    </section>
  );
}
