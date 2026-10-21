"use client";

// ============================================================================
// PvpHandBar — barra inferior del tablero PvP: estado propio (turno, energía,
// mazo), mano con drag&drop reutilizando HandCardComponent, y acciones
// (PASAR habilitado SOLO en tu turno, Registro, Opciones).
// ============================================================================

import { AnimatePresence, motion } from "framer-motion";
import { memo } from "react";
import { AlertTriangle, Activity, Settings as SettingsIcon, LogOut, Loader2, Zap, Wand2 } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { usePvpStore } from "@/store/pvpStore";
import { HandCardComponent } from "../HandCardComponent";
import { getEffectiveCost, isCardCostAllowed } from "@/lib/game/engine";
import { LANE_META } from "@/lib/game/types";
import { sfx } from "@/lib/sound";
import { cn } from "@/lib/utils";

export function PvpHandBarImpl({
  onOpenRegistro,
  onOpenSettings,
}: {
  onOpenRegistro: () => void;
  onOpenSettings: () => void;
}) {
  // PERF Task 46: snapshot ESTRECHO (useShallow) — la barra solo se abre
  // cuando cambia SU estado real (mano, energía, turno, selección, mensajes).
  // Con reconcileView las refs (hand) se mantienen si la mano no cambió.
  const bar = usePvpStore(
    useShallow((s) => {
      const v = s.view;
      if (!v) return null;
      return {
        you: v.you,
        turn: v.turn,
        maxTurns: v.maxTurns,
        myTurn: v.yourTurn,
        selectedCardUid: s.selectedCardUid,
        passing: s.passing,
        invalidPlayMsg: s.invalidPlayMsg,
      };
    })
  );
  const selectCard = usePvpStore((s) => s.selectCard);
  const sendPlay = usePvpStore((s) => s.sendPlay);
  const sendPass = usePvpStore((s) => s.sendPass);
  const exitToMenu = usePvpStore((s) => s.exitToMenu);
  const dismissInvalidMsg = usePvpStore((s) => s.dismissInvalidMsg);

  if (!bar) return null;
  const { you, turn, maxTurns, myTurn, selectedCardUid, passing, invalidPlayMsg } = bar;
  const view = { you, turn, maxTurns } as const;

  // Affordability consciente del BONO de carril: una carta se ve jugable si
  // existe ALGÚN carril donde el coste efectivo (con el bono, p.ej. "Coste -1")
  // cabe en la energía actual. Antes se comparaba el coste base y una carta
  // de coste 4 con 3 de energía se veía muerta aunque el carril la rebajara a 3.
  // V3: si eres MAGO, tu último carril del turno (you.lastSpec) rebaja −1 más.
  const cardPlayableAnywhere = (cost: number): boolean =>
    you.lanes.some((lane) => {
      const bonus = you.laneBonuses[lane] ?? null;
      const reson = you.gameClass === "mago" && you.lastSpec === lane;
      return (
        isCardCostAllowed(cost, bonus) &&
        Math.max(0, getEffectiveCost(cost, bonus) - (reson ? 1 : 0)) <= you.energy
      );
    });

  const handlePlayCard = (cardUid: string, laneId: import("@/lib/game/types").LaneId) => {
    if (!myTurn) return;
    // el drag-and-drop ya dejó la carta seleccionada; jugar directo
    sendPlay(cardUid, laneId);
  };

  return (
    <div className="relative border-t border-amber-700/30 bg-zinc-950/95">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

      {/* Estado propio — mismo estilo CHIMERA que solitario: turno a la
          izquierda, GRAN CÍRCULO DE ENERGÍA al centro, mazo a la derecha.
          (El "Tu turno" grande vive en el separador del tablero y en el
          banner — aquí va la energía, que era lo que faltaba.) */}
      <div className="relative flex items-center justify-between gap-2 border-b border-amber-700/15 bg-gradient-to-b from-zinc-900/80 to-zinc-950/60 px-3 py-1.5">
        <div className="flex items-baseline gap-1">
          <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-500">Turno</span>
          <span className="text-sm font-black tabular-nums text-white" style={{ fontFamily: "var(--font-cinzel), serif" }}>
            {view.turn}
          </span>
          <span className="text-[9px] font-bold tabular-nums text-zinc-500">/{view.maxTurns}</span>
        </div>

        {/* CENTRO: gran círculo de energía con borde dorado + rayo + número */}
        <div className="flex items-center gap-1.5">
          {/* REGLAS V3 — MARCA DE EJECUCIÓN (Asesino): contador ritual de PC —
              5 pips de cuchilla (llenos = PC). Persisten entre turnos. */}
          {you.gameClass === "asesino" && (
            <div
              className="relative flex h-9 items-center gap-1.5 rounded-full border border-fuchsia-400/60 bg-fuchsia-950/50 px-2 shadow-[0_0_8px_rgba(217,70,239,0.35)]"
              title="Marca de ejecución — Puntos de Combo: debuffear enemigos gana PC (tope 5, persisten); jugar en un carril con enemigo debilitado los consume TODOS (+4 de poder c/u)"
            >
              <div className="flex items-center gap-[3px]" aria-hidden>
                {Array.from({ length: 5 }, (_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-2.5 w-[3px] rounded-full transition-colors",
                      i < you.comboPoints
                        ? "bg-fuchsia-300 shadow-[0_0_4px_rgba(240,171,252,0.9)]"
                        : "bg-fuchsia-900/80"
                    )}
                  />
                ))}
              </div>
              <span
                className="text-sm font-black tabular-nums text-fuchsia-200"
                style={{ fontFamily: "var(--font-cinzel), serif" }}
              >
                {you.comboPoints}
              </span>
              <span className="text-[8px] font-bold tabular-nums text-fuchsia-400/70">PC</span>
            </div>
          )}
          {/* REGLAS V3 — RESONANCIA (Mago): aviso de cadena LISTA — otra carta
              en ese mismo carril entra +2 y cuesta −1 (solo en tu turno). */}
          {you.gameClass === "mago" && myTurn && you.lastSpec && (
            <div
              className="flex h-9 items-center gap-1 rounded-full border border-violet-400/60 bg-violet-950/50 px-2 shadow-[0_0_8px_rgba(139,92,246,0.35)]"
              title="Resonancia de escuela: juega otra carta de este carril y entra con +2 de poder pagando −1 de energía"
            >
              <Wand2 className="h-3 w-3 text-violet-300" aria-hidden />
              <span className="text-[9px] font-black uppercase tracking-wider text-violet-200">
                Resona · {LANE_META[you.lastSpec].title}
              </span>
            </div>
          )}
          <div
            className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-amber-400 bg-zinc-950 shadow-[0_0_10px_rgba(251,191,36,0.4)]"
            title="Tu energía"
          >
            <Zap className="absolute -top-1 -right-0.5 h-2.5 w-2.5 text-amber-300" aria-hidden />
            <span
              className="text-base font-black tabular-nums text-amber-300"
              style={{ fontFamily: "var(--font-cinzel), serif" }}
            >
              {you.energy}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-500">Mazo</span>
          <span className="text-sm font-black tabular-nums text-white" style={{ fontFamily: "var(--font-cinzel), serif" }}>
            {you.drawPileCount}
          </span>
        </div>
      </div>

      {/* Mensaje de jugada inválida */}
      <AnimatePresence>
        {invalidPlayMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-1.5 border-b border-rose-800/40 bg-rose-950/40 px-2 py-1 text-[10px] text-rose-200"
          >
            <AlertTriangle className="h-3 w-3" />
            <span className="flex-1">{invalidPlayMsg}</span>
            <button className="text-rose-400 hover:underline" onClick={dismissInvalidMsg}>✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mano */}
      <div
        data-hand-container
        className="no-scrollbar relative flex gap-1.5 overflow-x-auto px-2 pb-1 pt-0.5"
        style={{ backgroundImage: "radial-gradient(ellipse at center, rgba(120, 53, 15, 0.18) 0%, rgba(9, 9, 11, 0.95) 70%)" }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/20 to-transparent" />
        <AnimatePresence mode="popLayout">
          {you.hand.length === 0 ? (
            <div className="flex h-36 w-full items-center justify-center text-[10px] text-zinc-600">Sin cartas en mano</div>
          ) : (
            you.hand.map((card) => (
              <HandCardComponent
                key={card.uid}
                card={card}
                selected={selectedCardUid === card.uid}
                affordable={cardPlayableAnywhere(card.cost)}
                onPlayCard={handlePlayCard}
                onDragStart={handleDragStart}
                onDragEnd={() => undefined}
                onPreview={(c) => usePvpStore.getState().setPreviewCard(c)}
                phase={myTurn ? "playing" : "enemy"}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Acciones */}
      <div className="relative flex items-center gap-1.5 border-t border-amber-700/15 bg-gradient-to-b from-zinc-950/80 to-black/60 px-2 py-1.5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/25 to-transparent" />
        <button
          onClick={() => { if (myTurn && !passing) sendPass(); }}
          disabled={!myTurn || passing}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-lg transition-all active:scale-95",
            myTurn && !passing
              ? "bg-gradient-to-r from-teal-500 to-emerald-600 shadow-emerald-900/50 hover:from-teal-400 hover:to-emerald-500"
              : "cursor-not-allowed bg-gradient-to-r from-zinc-800 to-zinc-800 shadow-none text-zinc-500"
          )}
        >
          {passing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Pasando…
            </>
          ) : myTurn ? (
            "Pasar"
          ) : (
            "Espera…"
          )}
        </button>
        <button
          onClick={onOpenRegistro}
          className="flex items-center justify-center gap-1 rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-[9px] font-bold uppercase tracking-wider text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          title="Registro de batalla"
        >
          <Activity className="h-3 w-3" />
          Registro
        </button>
        <button
          onClick={onOpenSettings}
          className="flex items-center justify-center gap-1 rounded-full border border-amber-600/40 bg-amber-950/30 px-2.5 py-2 text-[9px] font-bold uppercase tracking-wider text-amber-300 transition-colors hover:bg-amber-900/40 hover:text-amber-200"
          title="Ajustes"
        >
          <SettingsIcon className="h-3 w-3" />
        </button>
        <button
          onClick={() => {
            const msg =
              usePvpStore.getState().mode === "historia"
                ? "¿Abandonar la partida? Perderás el progreso de esta batalla."
                : "¿Salir de la partida PvP? El rival quedará esperando.";
            if (window.confirm(msg)) {
              sfx.click();
              exitToMenu();
            }
          }}
          className="flex items-center justify-center gap-1 rounded-full border border-rose-800/50 bg-rose-950/30 px-2.5 py-2 text-[9px] font-bold uppercase tracking-wider text-rose-300 transition-colors hover:bg-rose-900/40"
          title="Salir al menú"
        >
          <LogOut className="h-3 w-3" />
        </button>
      </div>
    </div>
  );

  function handleDragStart(cardUid: string) {
    if (!myTurn) return;
    selectCard(cardUid);
  }
}

// PERF Task 46: memo — sin esto, el re-render de PvpGame (cada acción) re-pintaba
// TODA la mano (8 cartas con marcos/badges). Los props deben ser estables
// (PvpGame los envuelve en useCallback).
export const PvpHandBar = memo(PvpHandBarImpl);
