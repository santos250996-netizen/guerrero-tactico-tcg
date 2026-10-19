"use client";

// ============================================================================
// PvpGame — tablero PvP espejo:
//
//   ┌─ FRANJA RIVAL (esquina superior, compacta): clase+nombre · cartas en mano ·
//   │  energía · mazo · estado de conexión + turno global
//   ├─ FILA RIVAL: 3 carriles del RIVAL con SUS fondos de clase (solo lectura)
//   ├─ separador
//   ├─ FILA PROPIA: 3 carriles MÍOS con MIS fondos (zona de juego)
//   └─ barra de mano propia (energía, cartas, PASAR)
//
// Mago vs Guerrero ⇒ 6 specs en campo y 6 fondos de carriles distintos, como
// pidió el diseño. Datos: pvpStore (polling del servidor autoritativo).
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hand, Zap, Layers, Swords, Wand2, EyeOff, Activity, Skull, Loader2,
  WifiOff, Trophy, ScrollText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { usePvpStore } from "@/store/pvpStore";
import { CLASS_META, LANE_META, RARITY_META } from "@/lib/game/types";
import { RARITY_LABEL } from "@/lib/game/balance";
import { cardById } from "@/lib/game/cards";
import { PvpLane } from "./PvpLane";
import { PvpHandBar } from "./PvpHandBar";
import { CardPreviewModal } from "../CardPreviewModal";
import { FxLayer } from "../FxLayer";
import { CardJuiceLayer } from "../CardJuiceLayer";
import { CornerOrnaments } from "../CardFrame";
import { Confetti } from "../Confetti";
import { LegendaryBurst } from "../LegendaryBurst";
import { SettingsModal } from "../SettingsModal";
import { sfx } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

const CLASS_ICON: Record<string, LucideIcon> = { guerrero: Swords, mago: Wand2, asesino: EyeOff };

export function PvpGame() {
  const view = usePvpStore((s) => s.view);
  const floatingNumbers = usePvpStore((s) => s.floatingNumbers);
  const turnBanner = usePvpStore((s) => s.turnBanner);
  const legendaryBurst = usePvpStore((s) => s.legendaryBurst);
  const rivalPlay = usePvpStore((s) => s.rivalPlay);
  const connectionLost = usePvpStore((s) => s.connectionLost);
  const previewCard = usePvpStore((s) => s.previewCard);
  const setPreviewCard = usePvpStore((s) => s.setPreviewCard);
  const requestRematch = usePvpStore((s) => s.requestRematch);
  const exitToMenu = usePvpStore((s) => s.exitToMenu);
  const mode = usePvpStore((s) => s.mode);
  const pendingRewards = usePvpStore((s) => s.pendingRewards);

  const [registroOpen, setRegistroOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Rescate anti-congelamiento: al volver del fondo (el anfitrión suele salir
  // a activar el hotspot), re-sincroniza YA en vez de esperar el siguiente poll.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        usePvpStore.getState().resync();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // sfx de victoria/derrota (una vez por partida — ref para no re-render)
  const endSoundRef = useRef(false);
  useEffect(() => {
    if (view?.phase !== "ended" || endSoundRef.current) return;
    endSoundRef.current = true;
    const result = usePvpStore.getState().view?.finalResult?.result;
    if (result === "WIN") sfx.victory();
    else if (result === "LOSS") sfx.defeat();
  }, [view?.phase]);

  if (!view) {
    return (
      <div className="app-frame flex items-center justify-center text-zinc-100">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  const rivalIcon = CLASS_ICON[view.rival.gameClass] ?? Swords;
  const myIcon = CLASS_ICON[view.you.gameClass] ?? Swords;
  const RivalIcon = rivalIcon;

  return (
    <div className="app-frame text-zinc-100">
      {/* ══ FRANJA RIVAL (compacta, esquina superior) ══ */}
      <div className="relative z-30 flex items-center justify-between gap-2 border-b border-rose-900/40 bg-gradient-to-b from-rose-950/60 to-zinc-950/90 px-2 py-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-rose-500/50 bg-rose-950/50">
            <RivalIcon className="h-3.5 w-3.5 text-rose-300" strokeWidth={2.2} />
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-zinc-950",
                (mode === "historia" || view.rival.connected) ? "bg-emerald-400" : "bg-zinc-600"
              )}
              title={mode === "historia" ? "Bot local" : view.rival.connected ? "Conectado" : "Sin señal…"}
            />
          </div>
          <div className="min-w-0 leading-none">
            <div className="truncate text-[10px] font-black uppercase tracking-wider text-rose-200">
              {view.rival.name}
            </div>
            <div className="text-[7px] font-bold uppercase tracking-widest text-rose-400/70">
              {CLASS_META[view.rival.gameClass].label}
            </div>
          </div>
        </div>

        {/* Mano del rival (solo cantidad) + energía + mazo */}
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1 rounded-full border border-zinc-700/70 bg-black/40 px-1.5 py-0.5" title="Cartas en mano del rival">
            <Hand className="h-3 w-3 text-zinc-400" />
            <span className="text-xs font-black tabular-nums text-zinc-100">{view.rival.handCount}</span>
          </span>
          <span className="flex items-center gap-1 rounded-full border border-amber-700/50 bg-black/40 px-1.5 py-0.5" title="Energía del rival">
            <Zap className="h-3 w-3 text-amber-400" />
            <span className="text-xs font-black tabular-nums text-amber-300">{view.rival.energy}</span>
          </span>
          <span className="hidden items-center gap-1 rounded-full border border-zinc-700/70 bg-black/40 px-1.5 py-0.5 sm:flex" title="Mazo del rival">
            <Layers className="h-3 w-3 text-zinc-500" />
            <span className="text-[10px] font-black tabular-nums text-zinc-300">{view.rival.drawPileCount}</span>
          </span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">
            T{view.turn}/{view.maxTurns}
          </span>
        </div>
      </div>

      {/* Aviso de conexión */}
      <AnimatePresence>
        {connectionLost && view.phase === "playing" && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-center justify-center gap-1.5 bg-amber-950/70 py-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-300"
          >
            <WifiOff className="h-3 w-3" /> Reconectando al anfitrión…
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ TABLERO: fila rival + separador + fila propia ══
          data-board-root: ancla de la sacudida global del tablero (juice). */}
      <main className="app-main mx-auto flex w-full flex-1 flex-col px-1.5 py-1">
        <div
          data-board-root
          className="relative grid h-full min-h-0 flex-1 grid-rows-[1fr_auto_1fr] gap-1 rounded-lg"
        >
          {/* Filigranas heráldicas en las esquinas del tablero completo */}
          <CornerOrnaments size={26} className="-inset-x-1 -inset-y-1 z-20" />
          {/* FILA RIVAL — sus 3 specs con sus fondos */}
          <div className="grid min-h-0 grid-cols-3 gap-1">
            {[0, 1, 2].map((p) => (
              <PvpLane key={`rival-${p}`} position={p} side="rival" />
            ))}
          </div>

          {/* Separador VS — cuando el rival está jugando, el indicador late:
              el turno de la IA se VE, no es un hueco silencioso. */}
          <div className="flex items-center justify-center gap-2 py-0.5">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-rose-700/40 to-transparent" />
            <span
              className={cn(
                "text-[7px] font-black uppercase tracking-[0.4em]",
                view.yourTurn ? "text-zinc-600" : "animate-pulse text-rose-300",
              )}
              style={{ fontFamily: "var(--font-cinzel), serif" }}
            >
              Turno {view.turn} · {view.yourTurn ? "Te toca" : view.rival.name + " juega…"}
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-rose-700/40 to-transparent" />
          </div>

          {/* FILA PROPIA — mis 3 specs con mis fondos */}
          <div className="grid min-h-0 grid-cols-3 gap-1">
            {[0, 1, 2].map((p) => (
              <PvpLane key={`me-${p}`} position={p} side="me" />
            ))}
          </div>
        </div>
      </main>

      {/* ══ BARRA DE MANO PROPIA ══ */}
      <PvpHandBar
        onOpenRegistro={() => setRegistroOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* ══ Overlays ══ */}
      <PvpTurnBanner banner={turnBanner} />
      <RivalPlayAnnouncer announce={rivalPlay} rivalName={view.rival.name} />
      <PvpFloatingNumbersLayer floats={floatingNumbers} />
      <FxLayer />
      <CardJuiceLayer />
      <Confetti trigger={view.phase === "ended" && view.finalResult?.result === "WIN"} />
      <LegendaryBurst trigger={legendaryBurst} onDone={() => usePvpStore.setState({ legendaryBurst: false })} />

      {/* Game over */}
      {mode === "historia" ? (
        <HistoriaEndOverlay
          open={view.phase === "ended"}
          rewards={pendingRewards}
          onRematch={() => { sfx.click(); requestRematch(); }}
          onExit={() => { sfx.click(); exitToMenu(); }}
        />
      ) : (
        <PvpGameOverModal
          open={view.phase === "ended"}
          onRematch={() => { sfx.click(); requestRematch(); }}
          onExit={() => { sfx.click(); exitToMenu(); }}
        />
      )}

      {/* Preview de carta (reutilizado del solitario) */}
      <CardPreviewModal
        card={previewCard}
        open={previewCard !== null}
        onOpenChange={(o) => { if (!o) setPreviewCard(null); }}
      />
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />

      {/* Registro de batalla */}
      <Dialog open={registroOpen} onOpenChange={setRegistroOpen}>
        <DialogContent className="max-h-[80vh] overflow-hidden border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <Activity className="h-4 w-4" />
              Registro de Batalla
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] overflow-y-auto">
            <div className="space-y-1 p-1">
              <AnimatePresence initial={false}>
                {view.logs.length === 0 ? (
                  <div className="py-3 text-center text-[11px] text-zinc-600">Sin actividad todavía.</div>
                ) : (
                  view.logs.map((entry) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "rounded border px-2 py-1 text-[10px] leading-tight",
                        entry.side === "system"
                          ? "border-zinc-800 bg-zinc-900/40 text-zinc-300"
                          : entry.side === view.you.side
                            ? "border-emerald-800/40 bg-emerald-950/30 text-emerald-200"
                            : "border-rose-800/40 bg-rose-950/30 text-rose-200"
                      )}
                    >
                      <div className="flex items-center justify-between text-[9px] uppercase opacity-70">
                        <span>
                          {entry.side === "system" ? "Sistema" : entry.side === view.you.side ? "Tú" : view.rival.name}
                        </span>
                        <span>T{entry.turn}</span>
                      </div>
                      <div>{entry.text}</div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// ───────────────────────────────────────────────────
// Fin de partida en MODO HISTORIA: victoria paga 2 cartas, derrota/empate
// paga 1 (regla del usuario: siempre hay botín, ganar paga doble).
// ───────────────────────────────────────────────────
function HistoriaEndOverlay({
  open,
  rewards,
  onRematch,
  onExit,
}: {
  open: boolean;
  rewards: { id: string; rarity: string; isNew: boolean }[] | null;
  onRematch: () => void;
  onExit: () => void;
}) {
  const result = usePvpStore.getState().view?.finalResult?.result;
  const won = result === "WIN";
  const loot = rewards ?? [];
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.85, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className={cn(
              "mx-4 w-full max-w-sm rounded-2xl border-2 bg-gradient-to-b to-black p-5 text-center shadow-2xl",
              won ? "border-amber-500/60 from-amber-950" : "border-rose-800/60 from-rose-950"
            )}
          >
            <Trophy className={cn("mx-auto h-9 w-9", won ? "text-amber-400" : "text-rose-500/60")} />
            <div
              className={cn(
                "mt-1 text-xl font-black uppercase tracking-[0.3em]",
                won ? "text-amber-300" : "text-rose-300"
              )}
              style={{ fontFamily: "var(--font-cinzel), serif" }}
            >
              {won ? "¡Victoria!" : "Derrota"}
            </div>

            {loot.length > 0 && (
              <>
                <p className="mt-2 text-[10px] uppercase tracking-widest text-amber-200/80">
                  Botín · {loot.length} {loot.length === 1 ? "carta" : "cartas"} para tu colección
                </p>
                <div className="mt-3 flex justify-center gap-3">
                  {loot.map((r, i) => {
                    const def = cardById(r.id);
                    const rar = r.rarity as keyof typeof RARITY_META;
                    return (
                      <motion.div
                        key={`${r.id}-${i}`}
                        initial={{ rotateY: 90, opacity: 0 }}
                        animate={{ rotateY: 0, opacity: 1 }}
                        transition={{ delay: 0.5 + i * 0.5, duration: 0.45 }}
                        className="w-24 overflow-hidden rounded-lg border-2 bg-zinc-950"
                        style={{ borderColor: rar === "epic" ? "rgb(217 70 239 / 0.7)" : rar === "rare" ? "rgb(56 189 248 / 0.7)" : "rgb(113 113 122 / 0.7)" }}
                      >
                        <div
                          className="aspect-[3/4] w-full bg-cover bg-center"
                          style={{ backgroundImage: `url(/cards/${r.id}.png)` }}
                        />
                        <div className="px-1 py-1">
                          <div className="truncate text-[8px] font-bold text-zinc-200">{def?.name ?? r.id}</div>
                          <div className="text-[7px] font-black uppercase tracking-widest text-zinc-500">
                            {RARITY_LABEL[rar]}
                            {r.isNew && <span className="ml-1 text-emerald-400">NUEVA</span>}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                <p className="mt-2 text-[8px] uppercase tracking-widest text-zinc-500">
                  3 iguales del mismo tier → fusión (+2 poder)
                </p>
              </>
            )}
            {loot.length === 0 && (
              <p className="mt-2 text-[10px] text-zinc-500">Sin botín esta vez…</p>
            )}
            {!won && loot.length > 0 && (
              <p className="mt-1 text-[9px] uppercase tracking-widest text-rose-200/70">
                El bot te venció — igual te llevas 1 carta
              </p>
            )}
            {!won && loot.length === 0 && (
              <p className="mt-1 text-[10px] uppercase tracking-widest text-rose-200/70">
                El bot te venció — afina tu mazo y reintenta
              </p>
            )}

            <div className="mt-4 flex justify-center gap-2">
              <Button
                onClick={onRematch}
                className="border-amber-400/60 bg-gradient-to-b from-amber-600 to-amber-800 text-amber-50 hover:from-amber-500 hover:to-amber-700"
              >
                Revancha
              </Button>
              <Button
                onClick={onExit}
                variant="outline"
                className="border-zinc-700 bg-zinc-950/60 text-zinc-300 hover:bg-zinc-900"
              >
                Menú
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Banner de turno (TU TURNO / TURNO DEL RIVAL)
// ──────────────────────────────────────────────────────────────
function PvpTurnBanner({ banner }: { banner: { text: string; mine: boolean } | null }) {
  return (
    <AnimatePresence>
      {banner && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.6, rotate: -4 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
            className={cn(
              "flex flex-col items-center gap-2 rounded-2xl border-2 px-8 py-5 shadow-2xl",
              banner.mine
                ? "border-emerald-500/60 bg-gradient-to-b from-emerald-950 to-black"
                : "border-rose-700/60 bg-gradient-to-b from-rose-950 to-black"
            )}
          >
            <motion.div animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 1.2, repeat: Infinity }}>
              {banner.mine
                ? <Trophy className="h-10 w-10 text-emerald-400" />
                : <ScrollText className="h-10 w-10 text-rose-400" />}
            </motion.div>
            <div
              className={cn(
                "text-xl font-black uppercase tracking-widest",
                banner.mine ? "text-emerald-300" : "text-rose-300"
              )}
              style={{ fontFamily: "var(--font-cinzel), serif" }}
            >
              {banner.text}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ──────────────────────────────────────────────────────────────
// Anuncio de la jugada del rival: tarjeta compacta con el ARTE de la carta
// jugada + nombre + coste/poder + carril. Hace el turno de la IA legible —
// antes solo aparecía el cartel "TURNO DEL RIVAL" y las cartas aparecían
// en el tablero sin que se supiera qué había jugado.
// ──────────────────────────────────────────────────────────────
function RivalPlayAnnouncer({
  announce,
  rivalName,
}: {
  announce: { id: number; name: string; defId: string; cost: number; power: number; laneTitle: string; rarity: string } | null;
  rivalName: string;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-11 z-40 flex justify-center">
      <AnimatePresence>
        {announce && (
          <motion.div
            key={announce.id}
            initial={{ opacity: 0, y: -16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            style={{ x: "-50%" }}
            className="absolute flex items-center gap-2 rounded-xl border-2 border-rose-600/70 bg-gradient-to-b from-rose-950/95 to-black/95 py-1.5 pl-1.5 pr-3 shadow-2xl shadow-black/60"
            data-testid="rival-play-announce"
          >
            {announce.defId ? (
              <img
                src={`/cards/${announce.defId}.png`}
                alt=""
                className="h-11 w-8 shrink-0 rounded-md border border-rose-400/50 object-cover"
                draggable={false}
              />
            ) : (
              <ScrollText className="h-6 w-6 shrink-0 text-rose-400" />
            )}
            <div className="leading-tight">
              <div className="flex items-center gap-1 text-[7px] font-black uppercase tracking-[0.22em] text-rose-400">
                <ScrollText className="h-2 w-2" />
                {rivalName} jugó{announce.laneTitle ? ` · ${announce.laneTitle}` : ""}
              </div>
              <div className="max-w-[180px] truncate text-[12px] font-black text-rose-50">
                {announce.name}
              </div>
              <div className="flex items-center gap-2 text-[8px] font-bold tabular-nums text-zinc-300">
                <span className="flex items-center gap-0.5">
                  <Zap className="h-2.5 w-2.5 text-sky-400" />
                  {announce.cost}
                </span>
                <span className="flex items-center gap-0.5">
                  <Swords className="h-2.5 w-2.5 text-rose-400" />
                  {announce.power}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Números flotantes (misma mecánica que solitario, data del store PvP)
// ──────────────────────────────────────────────────────────────
function PvpFloatingNumbersLayer({ floats }: { floats: { id: string; uid: string; value: number }[] }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      <AnimatePresence>
        {floats.map((f) => {
          const el = typeof document !== "undefined" ? document.querySelector(`[data-card-uid="${f.uid}"]`) : null;
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          const x = rect.left + rect.width / 2;
          const y = rect.top;
          return (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 0, scale: 0.5 }}
              animate={{ opacity: 1, y: -30, scale: 1.2 }}
              exit={{ opacity: 0, y: -50, scale: 0.8 }}
              transition={{ duration: 1.0, ease: "easeOut" }}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 px-2 py-0.5 text-sm font-black tabular-nums shadow-lg",
                f.value > 0 ? "border-emerald-300 bg-emerald-600 text-white" : "border-rose-300 bg-rose-700 text-white"
              )}
              style={{ left: x, top: y }}
            >
              {f.value > 0 ? `+${f.value}` : `${f.value}`}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Game over PvP: resultado desde TU perspectiva + revancha
// ──────────────────────────────────────────────────────────────
function PvpGameOverModal({ open, onRematch, onExit }: {
  open: boolean;
  onRematch: () => void;
  onExit: () => void;
}) {
  const view = usePvpStore((s) => s.view);
  if (!view) return null;
  const f = view.finalResult;
  const result = f?.result ?? "DRAW";
  const win = result === "WIN";

  return (
    <Dialog open={open}>
      <DialogContent className="border-amber-800/40 bg-zinc-950 text-zinc-100 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 text-2xl font-black uppercase tracking-widest" style={{ fontFamily: "var(--font-cinzel), serif" }}>
            <Skull className={cn("h-6 w-6", win ? "hidden" : "text-rose-400")} />
            {win && <Trophy className="h-6 w-6 text-amber-400" />}
            <span className={win ? "text-amber-300" : result === "LOSS" ? "text-rose-400" : "text-zinc-300"}>
              {win ? "¡Victoria!" : result === "LOSS" ? "Derrota" : "Empate"}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Marcador global */}
          <div className="rounded-xl border border-zinc-800 bg-black/40 p-3 text-center">
            <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500">Carriles ganados</div>
            <div className="mt-1 flex items-center justify-center gap-3">
              <span className="text-3xl font-black tabular-nums text-emerald-400">{f?.playerWins ?? 0}</span>
              <span className="text-sm text-zinc-600">—</span>
              <span className="text-3xl font-black tabular-nums text-rose-400">{f?.enemyWins ?? 0}</span>
              <span className="text-[9px] font-bold uppercase text-zinc-500">E {f?.draws ?? 0}</span>
            </div>
            <div className="mt-1 text-[10px] text-zinc-500">
              Poder total <b className="text-zinc-300">{f?.totalPlayer ?? 0}</b> vs <b className="text-zinc-300">{f?.totalEnemy ?? 0}</b>
            </div>
          </div>

          {/* Detalle por pareja de carriles */}
          {f && (
            <div className="space-y-1">
              {f.laneOutcomes.map((lo, i) => {
                const laneId = view.you.lanes[i];
                const meta = LANE_META[laneId];
                return (
                  <div key={`${lo.lane}-${i}`} className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900/40 px-2 py-1 text-[10px]">
                    <span className="font-bold uppercase tracking-wider text-zinc-400">
                      {meta.title}
                    </span>
                    <span className="tabular-nums text-zinc-300">
                      {lo.playerScore} <span className="text-zinc-600">vs</span> {lo.enemyScore}
                    </span>
                    <span className={cn(
                      "font-black uppercase",
                      lo.winner === "player" ? "text-emerald-400" : lo.winner === "enemy" ? "text-rose-400" : "text-zinc-500"
                    )}>
                      {lo.winner === "player" ? "Ganado" : lo.winner === "enemy" ? "Perdido" : "Empate"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Revancha */}
          <div className="space-y-2 pt-1">
            {view.rematch.you && !view.rematch.rival ? (
              <div className="flex items-center justify-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/60 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Esperando la revancha del rival…
              </div>
            ) : view.rematch.rival && !view.rematch.you ? (
              <Button onClick={onRematch} className="w-full bg-gradient-to-r from-amber-600 to-rose-600 text-xs font-black uppercase tracking-wider text-white">
                {view.rival.name} quiere revancha — ¡Aceptar!
              </Button>
            ) : (
              <Button onClick={onRematch} className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-xs font-black uppercase tracking-wider text-white">
                Revancha
              </Button>
            )}
            <Button onClick={onExit} variant="outline" className="w-full border-zinc-700 bg-transparent text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Salir al menú
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
