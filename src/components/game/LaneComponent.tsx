"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { LaneId } from "@/lib/game/types";
import { LANE_META } from "@/lib/game/types";
import { useGameStore } from "@/store/gameStore";
import { BoardCardMini } from "./BoardCardMini";
import { cn } from "@/lib/utils";

const LANE_COLOR_CLASSES: Record<
  string,
  { bg: string; border: string; text: string; ring: string; scoreWin: string }
> = {
  amber: {
    bg: "bg-amber-950/40",
    border: "border-amber-700/40",
    text: "text-amber-300",
    ring: "ring-amber-400/60",
    scoreWin: "text-amber-300",
  },
  sky: {
    bg: "bg-sky-950/40",
    border: "border-sky-700/40",
    text: "text-sky-300",
    ring: "ring-sky-400/60",
    scoreWin: "text-sky-300",
  },
  rose: {
    bg: "bg-rose-950/40",
    border: "border-rose-700/40",
    text: "text-rose-300",
    ring: "ring-rose-400/60",
    scoreWin: "text-rose-300",
  },
};

interface LaneComponentProps {
  laneId: LaneId;
}

export function LaneComponent({ laneId }: LaneComponentProps) {
  const meta = LANE_META[laneId];
  const colors = LANE_COLOR_CLASSES[meta.color];

  const board = useGameStore((s) => s.board);
  const selectedCardUid = useGameStore((s) => s.selectedCardUid);
  const hand = useGameStore((s) => s.hand);
  const energy = useGameStore((s) => s.energy);
  const phase = useGameStore((s) => s.phase);
  const playSelectedCardIntoLane = useGameStore((s) => s.playSelectedCardIntoLane);

  const laneState = board[laneId];
  const playerScore = laneState.player.reduce((a, c) => a + c.currentPower, 0);
  const enemyScore = laneState.enemy.reduce((a, c) => a + c.currentPower, 0);
  const playerWinning = playerScore > enemyScore;
  const enemyWinning = enemyScore > playerScore;

  const selectedCard = selectedCardUid
    ? hand.find((c) => c.uid === selectedCardUid)
    : null;
  const canDrop =
    phase === "playing" &&
    selectedCard !== null &&
    selectedCard.cost <= energy &&
    laneState.player.length < 4;
  const cardFitsLane =
    selectedCard !== null && selectedCard.subtypes.includes(laneId);

  const onLaneClick = () => {
    // Always attempt the play when there's a selected card; the store will
    // surface an invalidPlayMsg (e.g. "Sin energía suficiente") if needed.
    if (selectedCard !== null && phase === "playing") {
      playSelectedCardIntoLane(laneId);
    }
  };

  return (
    <motion.section
      layout
      className={cn(
        "flex flex-1 flex-col gap-1 rounded-lg border p-1.5",
        colors.bg,
        colors.border,
        canDrop && "cursor-pointer ring-2 " + colors.ring
      )}
      onClick={onLaneClick}
      role="button"
      aria-label={`Carril ${meta.title}`}
    >
      {/* Lane header */}
      <div className="flex items-center justify-between rounded bg-black/40 px-1.5 py-1">
        <div className="flex items-center gap-1">
          <span className="text-sm">{meta.emoji}</span>
          <span
            className={cn(
              "text-[10px] font-bold uppercase tracking-wider",
              colors.text
            )}
          >
            {meta.title}
          </span>
        </div>
        <span className="rounded border border-white/10 bg-black/50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-zinc-300">
          {meta.bonusLabel}
        </span>
      </div>

      {/* Enemy slots */}
      <div className="flex min-h-[3.5rem] flex-col gap-1 rounded bg-black/20 p-1">
        <AnimatePresence mode="popLayout">
          {laneState.enemy.length === 0 ? (
            <div
              key="enemy-empty"
              className="flex h-9 items-center justify-center text-[9px] text-zinc-600"
            >
              Esperando rival…
            </div>
          ) : (
            laneState.enemy.map((c) => (
              <BoardCardMini key={c.uid} card={c} side="enemy" />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Score panel */}
      <div className="flex items-center justify-between rounded border border-white/5 bg-black/60 px-2 py-1">
        <div className="text-right">
          <div className="text-[8px] uppercase text-zinc-500">Rival</div>
          <div
            className={cn(
              "text-base font-bold tabular-nums",
              enemyWinning ? "text-rose-400" : "text-zinc-300"
            )}
          >
            {enemyScore}
          </div>
        </div>
        <span className="px-1 text-[8px] font-bold text-zinc-600">VS</span>
        <div className="text-left">
          <div className="text-[8px] uppercase text-zinc-500">Tú</div>
          <div
            className={cn(
              "text-base font-bold tabular-nums",
              playerWinning ? "text-emerald-400" : "text-zinc-300"
            )}
          >
            {playerScore}
          </div>
        </div>
      </div>

      {/* Player slots (drop zone) */}
      <div
        className={cn(
          "flex min-h-[3.5rem] flex-col gap-1 rounded border border-dashed p-1 transition-colors",
          canDrop
            ? "border-yellow-400/60 bg-yellow-500/5"
            : "border-white/10 bg-black/20"
        )}
      >
        <AnimatePresence mode="popLayout">
          {laneState.player.length === 0 ? (
            <div
              key="player-empty"
              className="flex h-9 items-center justify-center text-[9px] text-zinc-600"
            >
              {canDrop
                ? `Jugar aquí${cardFitsLane ? " (+4 sinergia)" : ""}`
                : "Vacío"}
            </div>
          ) : (
            laneState.player.map((c) => (
              <BoardCardMini key={c.uid} card={c} side="player" />
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
