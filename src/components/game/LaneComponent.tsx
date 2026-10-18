"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { LaneBonus, LaneId } from "@/lib/game/types";
import { LANE_META } from "@/lib/game/types";
import { Zap } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { BoardCardMini } from "./BoardCardMini";
import {
  getEffectiveCost,
  getLaneMaxCards,
  isCardCostAllowed,
} from "@/lib/game/engine";
import { cn } from "@/lib/utils";

// Tabla de paletas por color de carril — compartida con el tablero PvP
// (PvpLane) para que ambos tableros se vean idénticos.
export const LANE_COLOR_CLASSES: Record<
  string,
  {
    bg: string;
    border: string;
    text: string;
    ring: string;
    glow: string;
    headerBg: string;
    dividerLine: string;
  }
> = {
  amber: {
    bg: "bg-gradient-to-b from-amber-950/60 via-zinc-950/80 to-black",
    border: "border-amber-700/50",
    text: "text-amber-300",
    ring: "ring-amber-400/60",
    glow: "shadow-[0_0_20px_-2px_rgba(251,191,36,0.2)]",
    headerBg: "bg-gradient-to-r from-amber-950/80 to-zinc-950/80",
    dividerLine: "from-amber-600/40",
  },
  sky: {
    bg: "bg-gradient-to-b from-sky-950/60 via-zinc-950/80 to-black",
    border: "border-sky-700/50",
    text: "text-sky-300",
    ring: "ring-sky-400/60",
    glow: "shadow-[0_0_20px_-2px_rgba(56,189,248,0.2)]",
    headerBg: "bg-gradient-to-r from-sky-950/80 to-zinc-950/80",
    dividerLine: "from-sky-600/40",
  },
  rose: {
    bg: "bg-gradient-to-b from-rose-950/60 via-zinc-950/80 to-black",
    border: "border-rose-700/50",
    text: "text-rose-300",
    ring: "ring-rose-400/60",
    glow: "shadow-[0_0_20px_-2px_rgba(244,63,94,0.2)]",
    headerBg: "bg-gradient-to-r from-rose-950/80 to-zinc-950/80",
    dividerLine: "from-rose-600/40",
  },
  // ── Mago (V3) ──
  violet: {
    bg: "bg-gradient-to-b from-violet-950/60 via-zinc-950/80 to-black",
    border: "border-violet-700/50",
    text: "text-violet-300",
    ring: "ring-violet-400/60",
    glow: "shadow-[0_0_20px_-2px_rgba(139,92,246,0.2)]",
    headerBg: "bg-gradient-to-r from-violet-950/80 to-zinc-950/80",
    dividerLine: "from-violet-600/40",
  },
  orange: {
    bg: "bg-gradient-to-b from-orange-950/60 via-zinc-950/80 to-black",
    border: "border-orange-700/50",
    text: "text-orange-300",
    ring: "ring-orange-400/60",
    glow: "shadow-[0_0_20px_-2px_rgba(249,115,22,0.2)]",
    headerBg: "bg-gradient-to-r from-orange-950/80 to-zinc-950/80",
    dividerLine: "from-orange-600/40",
  },
  cyan: {
    bg: "bg-gradient-to-b from-cyan-950/60 via-zinc-950/80 to-black",
    border: "border-cyan-700/50",
    text: "text-cyan-300",
    ring: "ring-cyan-400/60",
    glow: "shadow-[0_0_20px_-2px_rgba(34,211,238,0.2)]",
    headerBg: "bg-gradient-to-r from-cyan-950/80 to-zinc-950/80",
    dividerLine: "from-cyan-600/40",
  },
  // ── Asesino (V3) ──
  lime: {
    bg: "bg-gradient-to-b from-lime-950/60 via-zinc-950/80 to-black",
    border: "border-lime-700/50",
    text: "text-lime-300",
    ring: "ring-lime-400/60",
    glow: "shadow-[0_0_20px_-2px_rgba(132,204,22,0.2)]",
    headerBg: "bg-gradient-to-r from-lime-950/80 to-zinc-950/80",
    dividerLine: "from-lime-600/40",
  },
  red: {
    bg: "bg-gradient-to-b from-red-950/60 via-zinc-950/80 to-black",
    border: "border-red-700/50",
    text: "text-red-300",
    ring: "ring-red-400/60",
    glow: "shadow-[0_0_20px_-2px_rgba(239,68,68,0.2)]",
    headerBg: "bg-gradient-to-r from-red-950/80 to-zinc-950/80",
    dividerLine: "from-red-600/40",
  },
  indigo: {
    bg: "bg-gradient-to-b from-indigo-950/60 via-zinc-950/80 to-black",
    border: "border-indigo-700/50",
    text: "text-indigo-300",
    ring: "ring-indigo-400/60",
    glow: "shadow-[0_0_20px_-2px_rgba(99,102,241,0.2)]",
    headerBg: "bg-gradient-to-r from-indigo-950/80 to-zinc-950/80",
    dividerLine: "from-indigo-600/40",
  },
};

// C3: Background tint overlay classes based on the active lane bonus type
const BONUS_TINT: Record<string, string> = {
  cat_ataque: "from-rose-950/30",
  cat_item: "from-sky-950/30",
  cat_accion: "from-violet-950/30",
  cost_neg: "from-emerald-950/30",
  cost_pos: "from-rose-950/40",
  limit_1: "from-amber-950/30",
  limit_3: "from-amber-950/20",
  cost_only_1: "from-amber-950/25",
  cost_only_3: "from-amber-950/25",
  cost_only_5: "from-amber-950/25",
};

const BONUS_CHIP_CLASS: Record<
  LaneBonus["flavor"],
  { chip: string }
> = {
  positive: { chip: "bg-emerald-700/80 border-emerald-400/50 text-emerald-50" },
  penalty: { chip: "bg-rose-800/80 border-rose-400/50 text-rose-50" },
  restrictive: { chip: "bg-amber-700/80 border-amber-400/50 text-amber-50" },
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
  const laneBonuses = useGameStore((s) => s.laneBonuses);
  const laneBonusFlash = useGameStore((s) => s.laneBonusFlashes[laneId]);
  const playSelectedCardIntoLane = useGameStore((s) => s.playSelectedCardIntoLane);

  const laneState = board[laneId];
  const playerScore = laneState.player.reduce((a, c) => a + c.currentPower, 0);
  const enemyScore = laneState.enemy.reduce((a, c) => a + c.currentPower, 0);
  const playerWinning = playerScore > enemyScore;
  const enemyWinning = enemyScore > playerScore;
  const scoreDiff = Math.abs(playerScore - enemyScore);

  const laneBonus = laneBonuses[laneId];
  const maxCards = getLaneMaxCards(laneBonus);

  const selectedCard = selectedCardUid
    ? hand.find((c) => c.uid === selectedCardUid) ?? null
    : null;

  const canDrop =
    phase === "playing" &&
    selectedCard !== null &&
    isCardCostAllowed(selectedCard.cost, laneBonus) &&
    getEffectiveCost(selectedCard.cost, laneBonus) <= energy &&
    laneState.player.length < maxCards;

  const cardFitsLane =
    selectedCard !== null && selectedCard.subtypes.includes(laneId);

  const onLaneClick = () => {
    if (selectedCard !== null && phase === "playing") {
      playSelectedCardIntoLane(laneId);
    }
  };

  const buildHint = () => {
    if (!canDrop) return "Vacío";
    const parts: string[] = [`Jugar aquí`];
    if (cardFitsLane) parts.push("(+2 sinergia)");
    return parts.join(" ");
  };

  return (
    <section
      data-lane-id={laneId}
      className={cn(
        "relative flex h-full min-h-0 flex-1 flex-col gap-0.5 overflow-hidden rounded-lg border p-1",
        colors.border,
        laneBonus && colors.glow,
        canDrop && "cursor-pointer ring-2 " + colors.ring
      )}
      onClick={onLaneClick}
      role="button"
      aria-label={`Carril ${meta.title}`}
      style={{
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -2px 8px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.5)",
      }}
    >
      {/* Lane background image — subtype-specific per class.
          For Guerrero: armas / proteccion / furia each have a distinct bg.
          Very light overlay so the art is clearly visible.
          Scale-105 to zoom slightly past any white border artifacts at the
          image edges (some AI-generated lane bgs have a thin white frame). */}
      <div
        className="pointer-events-none absolute inset-0 z-0 scale-105 bg-cover bg-center"
        style={{ backgroundImage: `url(/menu/lane-${laneId}.png)` }}
      />
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-black/35 via-black/10 to-black/35" />

      {/* C3: Bonus background tint (sits above the image) */}
      {laneBonus && BONUS_TINT[laneBonus.kind] && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-0 bg-gradient-to-b to-transparent",
            BONUS_TINT[laneBonus.kind]
          )}
        />
      )}

      {/* Lane header — JUST the name (top), bonus moved INSIDE the lane body */}
      <div className={cn(
        "relative z-10 flex items-center justify-center rounded border border-white/5 px-1 py-0.5 bg-black/30",
        colors.headerBg
      )}>
        <meta.icon className="h-3 w-3 shrink-0 drop-shadow" />
        <span
          className={cn(
            "ml-0.5 truncate text-[8px] font-black uppercase tracking-wider drop-shadow",
            colors.text
          )}
          style={{ fontFamily: 'var(--font-cinzel), serif' }}
        >
          {meta.title}
        </span>
      </div>

      {/* Enemy slots — fixed 2x2 grid, always 4 slots. flex-1 so it stretches
          vertically to fill the lane height (was fixed before, leaving empty space). */}
      <div
        className={cn(
          "relative z-10 grid flex-1 grid-cols-2 grid-rows-2 gap-0.5 rounded border p-0.5 min-h-0",
          enemyWinning
            ? "border-rose-500/30 bg-rose-950/10"
            : "border-white/5 bg-black/30"
        )}
        style={{ boxShadow: "inset 0 2px 6px rgba(0,0,0,0.5)" }}
      >
        {Array.from({ length: maxCards }).map((_, i) => {
          const card = laneState.enemy[i];
          if (card) {
            return <BoardCardMini key={card.uid} card={card} side="enemy" onPreview={(bc) => useGameStore.getState().setPreviewCard?.({ id: bc.defId, name: bc.name, category: bc.category, subtypes: bc.subtypes, cost: bc.cost, power: bc.basePower, text: bc.text, effectId: bc.effectId, rarity: bc.rarity, keyword: bc.keyword, keywordValue: bc.keywordValue, trigger: bc.trigger, powerLog: bc.powerLog, basePower: bc.basePower, currentPower: bc.currentPower })} />;
          }
          return <div key={`enemy-empty-${i}`} className="aspect-[3/4] rounded border border-dashed border-white/5 bg-black/20" />;
        })}
      </div>

      {/* Central divider with VS + bonus chip inside the lane (not in header) */}
      <div className="relative z-10 flex items-center justify-center gap-1 py-0.5">
        <div className={cn("h-[1px] flex-1 rounded-full bg-gradient-to-r to-transparent", colors.dividerLine)} />
        {/* Bonus chip — sits INSIDE the lane body so the header stays clean */}
        {laneBonus ? (
          <span
            title={laneBonus.description}
            className={cn(
              "rounded-full border px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wide shadow-sm",
              BONUS_CHIP_CLASS[laneBonus.flavor].chip
            )}
          >
            {laneBonus.label}
          </span>
        ) : (
          <span className="text-[6px] font-black uppercase tracking-widest text-zinc-600">VS</span>
        )}
        <div className={cn("h-[1px] flex-1 rounded-full bg-gradient-to-l to-transparent", colors.dividerLine)} />
      </div>

      {/* Score panel with visual bar */}
      <div className="relative z-10 rounded border border-white/5 bg-black/50 px-1 py-0.5">
        <div className="flex items-center justify-between mb-0.5">
          <div className="text-right leading-none">
            <div className="text-[5px] uppercase tracking-widest text-zinc-500">Rival</div>
            <div className={cn("text-[10px] font-black tabular-nums leading-none", enemyWinning ? "text-rose-400" : "text-zinc-300")}>
              {enemyScore}
            </div>
          </div>
          {scoreDiff > 0 && (
            <span className={cn(
              "text-[6px] font-bold tabular-nums",
              playerWinning ? "text-emerald-500" : "text-rose-500"
            )}>
              +{scoreDiff}
            </span>
          )}
          <div className="text-left leading-none">
            <div className="text-[5px] uppercase tracking-widest text-zinc-500">Tú</div>
            <div className={cn("text-[10px] font-black tabular-nums leading-none", playerWinning ? "text-emerald-400" : "text-zinc-300")}>
              {playerScore}
            </div>
          </div>
        </div>
        {/* Visual diff bar */}
        {(playerScore > 0 || enemyScore > 0) && (
          <div className="flex h-1 w-full overflow-hidden rounded-full bg-black/60">
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500" style={{ width: `${(playerScore / (playerScore + enemyScore)) * 100}%` }} />
            <div className="bg-gradient-to-r from-rose-500 to-rose-700 transition-all duration-500" style={{ width: `${(enemyScore / (playerScore + enemyScore)) * 100}%` }} />
          </div>
        )}
      </div>

      {/* Player slots (drop zone) — fixed 2x2 grid, always 4 slots. flex-1
          so it stretches vertically to fill the lane height. */}
      <div
        className={cn(
          "relative z-10 grid flex-1 grid-cols-2 grid-rows-2 gap-0.5 rounded border border-dashed p-0.5 transition-colors min-h-0",
          canDrop
            ? "border-yellow-400/60 bg-yellow-500/5"
            : playerWinning
              ? "border-emerald-500/30 bg-emerald-950/10"
              : "border-white/10 bg-black/30"
        )}
        style={{ boxShadow: "inset 0 2px 6px rgba(0,0,0,0.5)" }}
      >
        {Array.from({ length: maxCards }).map((_, i) => {
          const card = laneState.player[i];
          if (card) {
            return <BoardCardMini key={card.uid} card={card} side="player" onPreview={(bc) => useGameStore.getState().setPreviewCard?.({ id: bc.defId, name: bc.name, category: bc.category, subtypes: bc.subtypes, cost: bc.cost, power: bc.basePower, text: bc.text, effectId: bc.effectId, rarity: bc.rarity, keyword: bc.keyword, keywordValue: bc.keywordValue, trigger: bc.trigger, powerLog: bc.powerLog, basePower: bc.basePower, currentPower: bc.currentPower })} />;
          }
          return <div key={`player-empty-${i}`} className="aspect-[3/4] rounded border border-dashed border-white/5 bg-black/20" />;
        })}
      </div>

      {/* Bonus flash overlay — brief animated effect shown when lane bonuses
          are (re-)rolled (game start + turn 4 re-roll). Auto-clears after 1.5s
          via flashLaneBonuses() helper in gameStore. */}
      <AnimatePresence>
        {laneBonusFlash && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-black/85"
          >
            <LaneBonusFlashContent bonus={laneBonusFlash} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────
// LaneBonusFlashContent — renders the big text/effect for each bonus kind.
// Each kind has a custom visual: limit_1 → "1 VS 1", cost_only_X → "MAX ⚡X",
// cat_X → "+3 [emoji]", etc.
// ──────────────────────────────────────────────────────────────
function LaneBonusFlashContent({ bonus }: { bonus: import("@/lib/game/types").LaneBonus }) {
  // Each bonus kind gets a custom visual
  const FLASH_BY_KIND: Record<string, { big: string; sub: string; color: string; zap?: boolean }> = {
    // Restrictive (amber) — show "X VS X" format per user spec
    limit_1:     { big: "1", sub: "VS 1",    color: "text-amber-300" },
    limit_3:     { big: "3", sub: "VS 3",    color: "text-amber-300" },
    cost_only_1: { big: "1", sub: "COSTE MÁX",   color: "text-amber-300", zap: true },
    cost_only_3: { big: "3", sub: "COSTE MÁX",   color: "text-amber-300", zap: true },
    cost_only_5: { big: "5", sub: "COSTE MÁX",   color: "text-amber-300", zap: true },
    // Positive (emerald) — show the buff value
    cost_neg:    { big: "-1", sub: "COSTE",   color: "text-emerald-300" },
    cat_item:    { big: "+3", sub: "ÍTEM",    color: "text-emerald-300" },
    cat_accion:  { big: "+3", sub: "ACCIÓN",  color: "text-emerald-300" },
    cat_ataque:  { big: "+3", sub: "ATAQUE",  color: "text-emerald-300" },
    // Penalty (rose)
    cost_pos:    { big: "+1", sub: "COSTE",   color: "text-rose-300" },
  };
  const flash = FLASH_BY_KIND[bonus.kind] || { big: bonus.label, sub: "BONO", color: "text-zinc-300", zap: false };
  return (
    <div className="flex flex-col items-center gap-0.5 text-center">
      <div
        className={`flex items-center gap-1 text-5xl font-black tabular-nums leading-none ${flash.color}`}
        style={{
          fontFamily: 'var(--font-cinzel), serif',
          textShadow: '0 0 12px currentColor, 0 2px 4px rgba(0,0,0,0.9)',
        }}
      >
        {flash.zap && <Zap className="h-8 w-8" strokeWidth={2.5} />}
        {flash.big}
      </div>
      <div
        className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-300"
        style={{ fontFamily: 'var(--font-cinzel), serif' }}
      >
        {flash.sub}
      </div>
    </div>
  );
}
