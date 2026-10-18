"use client";

// ============================================================================
// PvpHandBar — barra inferior del tablero PvP: estado propio (turno, energía,
// mazo), mano con drag&drop reutilizando HandCardComponent, y acciones
// (PASAR habilitado SOLO en tu turno, Registro, Opciones).
// ============================================================================

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Activity, Settings as SettingsIcon, LogOut, Hourglass, Loader2 } from "lucide-react";
import { usePvpStore } from "@/store/pvpStore";
import { HandCardComponent } from "../HandCardComponent";
import { sfx } from "@/lib/sound";
import { cn } from "@/lib/utils";

export function PvpHandBar({
  onOpenRegistro,
  onOpenSettings,
}: {
  onOpenRegistro: () => void;
  onOpenSettings: () => void;
}) {
  const view = usePvpStore((s) => s.view);
  const selectedCardUid = usePvpStore((s) => s.selectedCardUid);
  const passing = usePvpStore((s) => s.passing);
  const selectCard = usePvpStore((s) => s.selectCard);
  const sendPlay = usePvpStore((s) => s.sendPlay);
  const sendPass = usePvpStore((s) => s.sendPass);
  const exitToMenu = usePvpStore((s) => s.exitToMenu);
  const invalidPlayMsg = usePvpStore((s) => s.invalidPlayMsg);
  const dismissInvalidMsg = usePvpStore((s) => s.dismissInvalidMsg);

  if (!view) return null;
  const you = view.you;
  const myTurn = view.yourTurn;

  const handlePlayCard = (cardUid: string, laneId: import("@/lib/game/types").LaneId) => {
    if (!myTurn) return;
    // el drag-and-drop ya dejó la carta seleccionada; jugar directo
    sendPlay(cardUid, laneId);
  };

  return (
    <div className="relative border-t border-amber-700/30 bg-zinc-950/95">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

      {/* Estado propio — mismo estilo CHIMERA que solitario */}
      <div className="relative flex items-center justify-between gap-2 border-b border-amber-700/15 bg-gradient-to-b from-zinc-900/80 to-zinc-950/60 px-3 py-1.5">
        <div className="flex items-baseline gap-1">
          <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-500">Turno</span>
          <span className="text-sm font-black tabular-nums text-white" style={{ fontFamily: "var(--font-cinzel), serif" }}>
            {view.turn}
          </span>
          <span className="text-[9px] font-bold tabular-nums text-zinc-500">/{view.maxTurns}</span>
        </div>

        {/* Indicador de turno */}
        {myTurn ? (
          <span className="rounded-full border border-emerald-500/50 bg-emerald-950/60 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-emerald-300">
            Tu turno
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-full border border-rose-800/50 bg-rose-950/50 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-rose-300">
            <Hourglass className="h-2.5 w-2.5" /> Rival juega
          </span>
        )}

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
                affordable={card.cost <= you.energy}
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
            if (window.confirm("¿Salir de la partida PvP? El rival quedará esperando.")) {
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
