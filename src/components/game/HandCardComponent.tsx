"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Info } from "lucide-react";
import type { HandCard } from "@/lib/game/types";
import { CATEGORY_META, RARITY_META, LANE_META, TRIGGER_META, KEYWORD_META } from "@/lib/game/types";
import type { LaneId } from "@/lib/game/types";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { sfx } from "@/lib/sound";

interface HandCardComponentProps {
  card: HandCard;
  selected: boolean;
  affordable: boolean; // can pay the cost with current energy
  onPlayCard: (cardUid: string, laneId: LaneId) => void;
  onDragStart?: (cardUid: string) => void;
  onDragEnd?: () => void;
  onPreview?: (card: HandCard) => void;
  phase: "playing" | "enemy" | "ended";
}

// Rarity letters — all uppercase per user spec (C / R / E / L)
const RARITY_LETTER: Record<string, string> = {
  common: "C",
  rare: "R",
  epic: "E",
  legendary: "L",
};

// Solid rarity background color (used for the bottom-right badge fill)
const RARITY_SOLID_BG: Record<string, string> = {
  common: "bg-gradient-to-b from-zinc-400 to-zinc-700 text-zinc-950",
  rare: "bg-gradient-to-b from-sky-400 to-sky-700 text-white",
  epic: "bg-gradient-to-b from-violet-400 to-violet-700 text-white",
  legendary: "bg-gradient-to-b from-amber-300 to-amber-600 text-zinc-950",
};

// Prominent rarity border colors — replaces old subtle borderClass
const RARITY_BORDER: Record<string, string> = {
  common: "border-2 border-zinc-500",
  rare: "border-2 border-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.3)]",
  epic: "border-2 border-violet-400 shadow-[0_0_10px_rgba(168,85,247,0.4)]",
  legendary: "border-2 border-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.5)]",
};

// Direction the user is dragging the card — determines whether we
// drag the card to the board (vertical) or scroll the hand (horizontal).
type DragMode = "none" | "vertical" | "horizontal";

const DIRECTION_THRESHOLD = 8; // px before we lock to a direction

export function HandCardComponent({
  card,
  selected,
  affordable,
  onPlayCard,
  onDragStart,
  onDragEnd,
  onPreview,
  phase,
}: HandCardComponentProps) {
  const cat = CATEGORY_META[card.category];
  const rar = RARITY_META[card.rarity];
  const trigger = card.trigger ?? "on_play";
  const triggerMeta = TRIGGER_META[trigger];
  const keyword = card.keyword ?? "none";
  const keywordMeta = KEYWORD_META[keyword];
  const artUrl = `/cards/${card.id}.png`;
  const effectivePower = card.power + (card.handBonus || 0);
  const subtypeMetas = card.subtypes.map((s) => LANE_META[s]).filter(Boolean);

  // ====== Custom drag state (direction-aware) ======
  const [isDragging, setIsDragging] = useState(false);
  const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 });
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const modeRef = useRef<DragMode>("none");
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // Cleanup on unmount: clear drag state if component unmounts mid-drag
  useEffect(() => {
    return () => {
      if (modeRef.current === "vertical" && isDragging) {
        onDragEnd?.();
      }
    };
  }, [isDragging, onDragEnd]);

  // ====== Direction-aware pointer handlers ======
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Skip non-primary pointers / non-playing phase
    if (!e.isPrimary) return;
    if (phase !== "playing") return;
    // Ignore right-click / middle-click
    if (e.button !== 0 && e.pointerType === "mouse") return;
    startRef.current = { x: e.clientX, y: e.clientY };
    modeRef.current = "none";
    // Capture the pointer so we keep receiving pointermove/pointerup events even
    // when the pointer leaves the card. This is needed for the drag to work.
    // The `hadPointerDown` guard in handlePointerUp filters out stray pointerup
    // events that target the card after the modal closes (Radix Dialog closes on
    // pointerdown-outside, which makes the subsequent pointerup land on the card).
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore — some browsers throw if pointerId is invalid
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!startRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;

    // Lock to a direction once movement exceeds the threshold
    if (modeRef.current === "none") {
      if (Math.abs(dx) > DIRECTION_THRESHOLD || Math.abs(dy) > DIRECTION_THRESHOLD) {
        if (Math.abs(dy) * 2 >= Math.abs(dx)) {
          // ====== VERTICAL ====== → drag the card to play it on the board
          modeRef.current = "vertical";
          setIsDragging(true);
          // Now that a real drag is starting, capture the pointer so we keep
          // receiving pointermove/pointerup events even if the pointer leaves the card.
          try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
          setGhostPos({ x: e.clientX, y: e.clientY });
          onDragStart?.(card.uid);
        } else {
          // ====== HORIZONTAL ====== → scroll the hand container
          // (Touch users will already have triggered native scrolling via
          // `touch-action: pan-x`; this branch only matters for mouse users.)
          modeRef.current = "horizontal";
        }
      }
    }

    if (modeRef.current === "vertical") {
      setGhostPos({ x: e.clientX, y: e.clientY });
    } else if (modeRef.current === "horizontal") {
      // Manual horizontal scroll for mouse drag (touch already handled natively)
      const container = buttonRef.current?.closest(
        "[data-hand-container]"
      ) as HTMLElement | null;
      if (container) {
        container.scrollLeft -= dx;
        // Re-baseline so subsequent moves are relative to the new scroll position
        startRef.current = { x: e.clientX, y: e.clientY };
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    // GUARD: only treat as a tap/click if pointerdown was actually received on THIS card.
    // Radix Dialog closes on `pointerdown` (outside-click), so by the time `pointerup`
    // fires, the modal may already be closed — the underlying hand card then receives
    // a "stray" pointerup without a matching pointerdown. We must ignore these stray
    // events, otherwise the close-click opens another card (the bug we're fixing).
    const hadPointerDown = startRef.current !== null;
    if (modeRef.current === "vertical" && hadPointerDown) {
      // Find the lane under the pointer at drop time
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const laneEl = el?.closest("[data-lane-id]") as HTMLElement | null;
      const laneId = laneEl?.dataset.laneId as LaneId | undefined;
      if (laneId) {
        onPlayCard(card.uid, laneId);
      }
      setIsDragging(false);
      onDragEnd?.();
    } else if (modeRef.current === "none" && hadPointerDown) {
      // No drag movement exceeded the threshold → treat as a click/tap → open preview.
      // Only if pointerdown was actually received on this card (not a stray pointerup
      // from closing the modal).
      onPreview?.(card);
    }
    // Reset state
    startRef.current = null;
    modeRef.current = "none";
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (modeRef.current === "vertical" && isDragging) {
      setIsDragging(false);
      onDragEnd?.();
    }
    startRef.current = null;
    modeRef.current = "none";
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // The actual card visual (shared between the in-place button and the drag ghost)
  const CardVisual = (
    <>
      {/* Full-bleed art */}
      <img
        src={artUrl}
        alt={card.name}
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
        draggable={false}
      />

      {/* Dark gradient at the bottom for badge legibility */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />

      {/* Cost badge (top-left) */}
      <div
        className="absolute left-1 top-1 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-white/90 bg-gradient-to-b from-sky-400 to-sky-700 text-[10px] font-black text-white shadow-md"
        style={{ boxShadow: "0 0 6px rgba(56,189,248,0.55)" }}
      >
        {card.cost}
      </div>

      {/* Power badge (top-right) */}
      <div
        className={cn(
          "absolute right-1 top-1 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-white/90 text-[10px] font-black text-white shadow-md",
          card.handBonus
            ? "bg-gradient-to-b from-emerald-400 to-emerald-700 ring-1 ring-emerald-300/60"
            : "bg-gradient-to-b from-rose-500 to-rose-800"
        )}
        style={{
          boxShadow: card.handBonus
            ? "0 0 6px rgba(16,185,129,0.55)"
            : "0 0 6px rgba(244,63,94,0.55)",
        }}
      >
        {effectivePower}
      </div>

      {/* Hand-bonus floating chip */}
      {card.handBonus ? (
        <div className="absolute right-1 top-8 z-30 flex items-center gap-0.5 rounded bg-emerald-500/95 px-1 py-0 text-[8px] font-bold text-white shadow-md">
          <Sparkles className="h-2 w-2" />+{card.handBonus}
        </div>
      ) : null}

      {/* Bottom info panel overlay */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-0.5 px-1.5 py-1">
        {/* Type chip (left) + ALL subtype icons (right) */}
        <div className="flex items-center justify-between gap-0.5">
          <span
            className={cn(
              "rounded border px-1 py-0 text-[7px] font-bold uppercase tracking-wider backdrop-blur-sm",
              cat.bgClass,
              cat.textClass,
              cat.borderClass
            )}
          >
            {cat.label}
          </span>
          <div className="flex items-center gap-0.5">
            <AnimatePresence>
              {subtypeMetas.map((lm) => (
                <span
                  key={lm.title}
                  title={lm.title}
                  className="flex h-4 w-4 items-center justify-center rounded-full border border-white/40 bg-black/60 text-[9px] leading-none backdrop-blur-sm"
                >
                  {lm.emoji}
                </span>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Card name */}
        <div className="text-center text-[9px] font-black uppercase tracking-wider text-amber-300 [text-shadow:1px_1px_0_#000,0_0_4px_rgba(0,0,0,0.85)] leading-tight">
          {card.name}
        </div>

        {/* Bottom row: trigger + keyword chips — bigger now */}
        <div className="flex items-center justify-center gap-1 flex-wrap">
          <span
            title={triggerMeta.description}
            className={cn(
              "inline-flex items-center gap-1 rounded border border-white/20 bg-black/70 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider backdrop-blur-sm",
              triggerMeta.color
            )}
          >
            <span>{triggerMeta.emoji}</span>
            {triggerMeta.short}
          </span>
          {keyword !== "none" && (
            <span
              title={keywordMeta.description}
              className={cn(
                "inline-flex items-center gap-1 rounded border border-white/20 bg-black/70 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider backdrop-blur-sm",
                keywordMeta.color
              )}
            >
              <span>{keywordMeta.emoji}</span>
              {keywordMeta.short}{keywordMeta.hasValue && card.keywordValue ? `[${card.keywordValue}]` : ""}
            </span>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      <motion.button
        ref={buttonRef}
        layout
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30, scale: 0.85 }}
        whileHover={{ y: -6, scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        data-hand-card-uid={card.uid}
        className={cn(
          "relative flex h-44 w-28 shrink-0 touch-pan-x select-none flex-col overflow-hidden rounded-lg border-2 shadow-2xl shadow-black/80",
          "bg-zinc-950",
          selected
            ? "border-amber-400 ring-2 ring-amber-400/70 z-10"
            : RARITY_BORDER[card.rarity],
          !affordable && "opacity-65 grayscale",
          // While dragging the in-place card is dimmed (ghost takes over)
          isDragging && "opacity-30"
        )}
        style={{
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -2px 6px rgba(0,0,0,0.6), 0 6px 14px rgba(0,0,0,0.7)" +
            (selected ? ", 0 0 18px rgba(251,191,36,0.5)" : ""),
          willChange: "transform",
          // Hide the in-place card visual during drag (ghost is shown instead)
          visibility: isDragging ? "hidden" : "visible",
        }}
      >
        {CardVisual}
      </motion.button>

      {/* Drag ghost: follows the pointer while the card is being dragged */}
      {isDragging &&
        typeof document !== "undefined" &&
        createFixedPortal(
          <div
            style={{
              position: "fixed",
              left: ghostPos.x - 56,
              top: ghostPos.y - 88,
              width: 112,
              height: 176,
              pointerEvents: "none",
              zIndex: 9999,
              transform: "scale(1.18)",
              transformOrigin: "center",
              filter: "drop-shadow(0 12px 20px rgba(0,0,0,0.7))",
            }}
            className="relative overflow-hidden rounded-lg border-2 border-amber-400 bg-zinc-950 shadow-2xl"
          >
            {CardVisual}
          </div>
        )}
    </>
  );
}

// Helper to render a React node at the document body level (no portal lib needed).
// We use position:fixed so the ghost escapes any overflow-clipped ancestor.
function createFixedPortal(node: React.ReactNode) {
  if (typeof document === "undefined") return null;
  return createPortal(node, document.body);
}
