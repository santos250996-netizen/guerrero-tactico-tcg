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

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hand, Zap, Layers, Swords, Sword, Wand2, EyeOff, Activity, Skull, Loader2,
  WifiOff, Trophy, ScrollText, Star,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { usePvpStore } from "@/store/pvpStore";
import { useCampaignStore } from "@/store/campaignStore";
import { useCollectionStore } from "@/store/collectionStore";
import {
  CAMPAIGN_STEPS,
  isBossStep,
  rivalNameForStep,
  stepChipLabel,
  xpBonusForStep,
  biomeForStep,
  biomeById,
  loreForStep,
  rushBiomeForIndex,
  CAMPAIGN_BOSS_NAMES,
  CAMPAIGN_BOSS_LORE,
} from "@/lib/game/campaign";
import { chapterAt, resolveFight, fightCry, isLastFight, storyXpForFight } from "@/lib/game/story";
import { useStoryStore } from "@/store/storyStore";
import { RUSH_BOSSES, RUSH_PICK_TIER_LABEL, rushBossesForCycle, rushXpForBoss } from "@/lib/game/rush";
import { useStatsStore, xpForNext, XP_DRAW, XP_LOSS, XP_WIN } from "@/store/statsStore";
import { useSettings } from "@/lib/settings";
import { music } from "@/lib/music";
import { haptic } from "@/lib/haptics";
import { CLASS_META, LANE_META, RARITY_META, type GameClass } from "@/lib/game/types";
import { RARITY_LABEL } from "@/lib/game/balance";
import { cardById } from "@/lib/game/cards";
import { PvpLane } from "./PvpLane";
import { PvpHandBar } from "./PvpHandBar";
import { CardPreviewModal } from "../CardPreviewModal";
import { FxLayer } from "../FxLayer";
import { CardJuiceLayer } from "../CardJuiceLayer";
import { CornerOrnaments } from "../CardFrame";
import { Confetti } from "../Confetti";
import { SettingsModal } from "../SettingsModal";
import { MissionToast } from "../MainMenu";
import { sfx } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

const CLASS_ICON: Record<string, LucideIcon> = { guerrero: Swords, mago: Wand2, asesino: EyeOff };

// ──────────────────────────────────────────────────────────────
// handPlayOptions ELIMINADO — la sugerencia «Jugar en X» del preview salió
// del juego (petición del jugador): cada uno decide dónde jugar. El drag es
// la única ruta de jugada.
// ──────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────
// NOTA PERF (reporte del jugador «se pega al cambiar turno en móvil»):
// el CHOQUE DE CARRILES (sacudida del tablero + chispas + boom al cerrar
// medio-turno) fue ELIMINADO — animaba el tablero entero 2 veces por pase
// (setClash true/false) y en WebView low-end eso ES el jank del cambio de
// turno. El pase ahora solo suena (turnPass/enemyTurn) y cambia el separador.
// ──────────────────────────────────────────────────────────────

export function PvpGame() {
  const view = usePvpStore((s) => s.view);
  const floatingNumbers = usePvpStore((s) => s.floatingNumbers);
  const rivalPlay = usePvpStore((s) => s.rivalPlay);
  const connectionLost = usePvpStore((s) => s.connectionLost);
  const previewCard = usePvpStore((s) => s.previewCard);
  const setPreviewCard = usePvpStore((s) => s.setPreviewCard);
  const requestRematch = usePvpStore((s) => s.requestRematch);
  const exitToMenu = usePvpStore((s) => s.exitToMenu);
  const mode = usePvpStore((s) => s.mode);
  const pendingRewards = usePvpStore((s) => s.pendingRewards);
  const bossActive = usePvpStore((s) => s.bossActive);
  const campaignStep = usePvpStore((s) => s.campaignStep);
  // LA CAMPAÑA: splash de lore + bioma + botín del jefe a elegir
  const battleIntro = usePvpStore((s) => s.battleIntro);
  const bossPickOptions = usePvpStore((s) => s.bossPickOptions);
  const dismissBattleIntro = usePvpStore((s) => s.dismissBattleIntro);
  // RUSH DE JEFES: la run vive dentro de historia con estas banderas
  const rushActive = usePvpStore((s) => s.rushActive);
  const rushIndex = usePvpStore((s) => s.rushIndex);
  const rushBossClass = usePvpStore((s) => s.rushBossClass);
  // HISTORIA «EL PACTO DE GUERRA»: los capítulos viven dentro de historia
  const storyActive = usePvpStore((s) => s.storyActive);
  const storyChapter = usePvpStore((s) => s.storyChapter);
  const storyFight = usePvpStore((s) => s.storyFight);
  const exitToStoryMap = usePvpStore((s) => s.exitToStoryMap);

  const [registroOpen, setRegistroOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // PERF Task 46: callbacks ESTABLES — PvpHandBar y los modales de fin son
  // memo'd; lambdas inline los re-pintaban en cada acción del tablero.
  const openRegistro = useCallback(() => setRegistroOpen(true), []);
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const onRematchCb = useCallback(() => { sfx.click(); requestRematch(); }, [requestRematch]);
  const onExitCb = useCallback(() => {
    sfx.click();
    // En la historia el «Menú» es el MAPA de capítulos (el progreso narrativo manda)
    if (usePvpStore.getState().storyActive) exitToStoryMap();
    else exitToMenu();
  }, [exitToMenu, exitToStoryMap]);

  // MÚSICA: entra en modo batalla al montar; al salir, vuelve al latido del menú.
  useEffect(() => {
    music.setMode("battle");
    return () => music.setMode("menu");
  }, []);

  // Reparto de la mano inicial (5 cartas): el único draw real de la partida.
  const dealSoundRef = useRef(false);
  useEffect(() => {
    if (view?.phase !== "playing" || dealSoundRef.current) return;
    dealSoundRef.current = true;
    if (useSettings.getState().soundOn) sfx.draw();
  }, [view?.phase]);

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
    if (result === "WIN") {
      sfx.victory();
      haptic("success");
    } else if (result === "LOSS") {
      sfx.defeat();
      haptic("heavy");
    }
  }, [view?.phase]);

  if (!view) {
    return (
      <div className="app-frame flex items-center justify-center text-zinc-100">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }


  return (
    <div className="app-frame relative overflow-hidden text-zinc-100">
      {/* ══ BIOMA — tinte ambiental del tramo (capa FIJA y estática, sin blur) ══
          La campaña cruza paisajes: Tierras Bajas → Ceniza → Corona de Hielo,
          con muro propio en cada jefe. Cero coste de render. */}
      {mode === "historia" && campaignStep != null && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{ background: biomeForStep(campaignStep).tint }}
        />
      )}

      {/* ══ FRANJA RIVAL (compacta, esquina superior) — memo'd: solo se repinta
          cuando cambian los datos del rival o el turno (PERF Task 46) ══ */}
      <PvpRivalStrip bossActive={bossActive} mode={mode} />

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

      {/* ══ TABLERO: fila rival + separador + fila propia ══ */}
      <main className="app-main mx-auto flex w-full flex-1 flex-col px-1.5 py-1">
        <div className="relative grid h-full min-h-0 flex-1 grid-rows-[1fr_auto_1fr] gap-1 rounded-lg">
          {/* Filigranas heráldicas en las esquinas del tablero completo */}
          <CornerOrnaments size={26} className="-inset-x-1 -inset-y-1 z-20" />
          {/* FILA RIVAL */}
          <div className="grid min-h-0 grid-cols-3 gap-1">
            {[0, 1, 2].map((p) => (
              <PvpLane key={`rival-${p}`} position={p} side="rival" />
            ))}
          </div>

          {/* Separador VS — indicador latiendo cuando el rival está jugando
              (su turno se VE). Sin chispas: FX invisible = coste sin retorno. */}
          <div className="relative flex items-center justify-center gap-2 py-0.5">
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

          {/* FILA PROPIA */}
          <div className="grid min-h-0 grid-cols-3 gap-1">
            {[0, 1, 2].map((p) => (
              <PvpLane key={`me-${p}`} position={p} side="me" />
            ))}
          </div>
        </div>
      </main>

      {/* ══ BARRA DE MANO PROPIA ══ */}
      <PvpHandBar
        onOpenRegistro={openRegistro}
        onOpenSettings={openSettings}
      />

      {/* ══ Overlays ══
          SIN cartel de turno full-screen (era el jank del cambio de turno:
          dim de 1.6s + spring + rotación infinita tapando el tablero). El
          separador central ya dice "Turno N · Te toca / Rival juega…" y los
          sonidos de pase se mantienen. SIN burst de legendaria (se quedaba
          clavado en pantalla con el polling). */}
      <RivalPlayAnnouncer announce={rivalPlay} rivalName={view.rival.name} />
      <MissionToast />
      <PvpFloatingNumbersLayer floats={floatingNumbers} />
      <FxLayer />
      <CardJuiceLayer />
      <Confetti trigger={view.phase === "ended" && view.finalResult?.result === "WIN"} />

      {/* ══ SPLASH PRE-BATALLA — lore del rival (CAMPAÑA · RUSH · HISTORIA) ══ */}
      {(mode === "historia" && (rushActive || campaignStep != null || storyActive)) && (
        <BattleIntroSplash
          open={battleIntro && view.phase === "playing"}
          step={campaignStep ?? CAMPAIGN_STEPS}
          rush={rushActive && rushBossClass ? { index: rushIndex, bossClass: rushBossClass } : undefined}
          story={storyActive && storyChapter != null && storyFight != null ? { chapter: storyChapter, fight: storyFight } : undefined}
          onEnter={() => { sfx.click(); dismissBattleIntro(); }}
        />
      )}

      {/* Game over */}
      {mode === "historia" ? (
        <HistoriaEndOverlay
          open={view.phase === "ended"}
          rewards={pendingRewards}
          onRematch={onRematchCb}
          onExit={onExitCb}
        />
      ) : (
        <PvpGameOverModal
          open={view.phase === "ended"}
          rewards={pendingRewards}
          onRematch={onRematchCb}
          onExit={onExitCb}
        />
      )}

      {/* Preview de carta — SOLO LECTURA: el jugador decide dónde jugar
          (drag o carril). Fuera la sugerencia «Jugar en X»: decisión del
          jugador (petición explícita). */}
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
// Fin de partida — LA CAMPAÑA: el botín y la XP salen del ESCALÓN jugado
// (crecen al avanzar; el JEFE deja ELEGIR 1 de 3 raras). Los botones
// encadenan la escalera: victoria → SIGUIENTE ESCALÓN (o NUEVA CAMPAÑA ★
// si cerró la escalera) · derrota → REINTENTAR ESCALÓN (sin retroceder).
// ───────────────────────────────────────────────────
// Splash pre-batalla (solo LA CAMPAÑA): el rival se PRESENTA con una línea
// de lore y el bioma del tramo. Tap en «¡A LUCHAR!» entra al duelo — el bot
// no actúa durante el splash (es el turno 1 del jugador).
function BattleIntroSplash({
  open,
  step,
  onEnter,
  rush,
  story,
}: {
  open: boolean;
  step: number;
  onEnter: () => void;
  /** RUSH DE JEFES: el jefe de la run sustituye a lore/rival/bioma/chip. */
  rush?: { index: number; bossClass: GameClass };
  /** HISTORIA: el capítulo manda — rival resuelto + arenga + bioma del capítulo. */
  story?: { chapter: number; fight: number };
}) {
  const storyFightDef = story
    ? resolveFight(
        chapterAt(story.chapter).fights[Math.min(story.fight, chapterAt(story.chapter).fights.length - 1)],
        useStoryStore.getState().flags,
      )
    : null;
  const lore = story && storyFightDef
    ? { text: fightCry(storyFightDef), isBoss: !!storyFightDef.bossDeck }
    : rush
      ? { text: CAMPAIGN_BOSS_LORE[rush.bossClass], isBoss: true }
      : loreForStep(step);
  const biome = story
    ? biomeById(chapterAt(story.chapter).biomeId)
    : rush
      ? rushBiomeForIndex(rush.index)
      : biomeForStep(step);
  const rival = story && storyFightDef
    ? storyFightDef.rival
    : rush
      ? CAMPAIGN_BOSS_NAMES[rush.bossClass]
      : rivalNameForStep(step);
  const chip = story
    ? `HISTORIA · ${chapterAt(story.chapter).title.toUpperCase()}`
    : rush
      ? `RUSH DE JEFES · JEFE ${rush.index + 1}/${RUSH_BOSSES}`
      : `${biome.name}`;
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onPointerDown={onEnter}
          className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/90 px-6"
        >
          <motion.div
            initial={{ scale: 0.9, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="w-full max-w-sm rounded-2xl border-2 p-6 text-center"
            style={{
              borderColor: `rgba(${biome.hex},0.55)`,
              background: `linear-gradient(to bottom, rgba(${biome.hex},0.14), rgba(0,0,0,0.92))`,
              boxShadow: `0 0 40px rgba(${biome.hex},0.18)`,
            }}
          >
            {/* Bioma del tramo / chip del RUSH */}
            <p
              className="text-[9px] font-black uppercase tracking-[0.4em]"
              style={{ color: `rgb(${biome.hex})`, fontFamily: "var(--font-cinzel), serif" }}
            >
              {chip}
            </p>

            {lore.isBoss ? (
              <Skull className="mx-auto mt-3 h-10 w-10 text-rose-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.7)]" />
            ) : (
              <div
                className="mx-auto mt-3 flex h-10 w-10 items-center justify-center rounded-full border"
                style={{ borderColor: `rgba(${biome.hex},0.6)` }}
              >
                <Swords className="h-5 w-5" style={{ color: `rgb(${biome.hex})` }} />
              </div>
            )}

            <h2
              className={cn(
                "mt-3 text-lg font-black uppercase leading-tight tracking-[0.18em]",
                lore.isBoss ? "text-rose-300" : "text-zinc-50"
              )}
              style={{ fontFamily: "var(--font-cinzel), serif" }}
            >
              {rival}
            </h2>

            <p className="mt-3 text-[11px] leading-relaxed text-zinc-300">“{lore.text}”</p>

            <p className="mt-2 text-[8px] font-bold uppercase tracking-[0.25em] text-zinc-500">
              {story
                ? `Capítulo ${chapterAt(story.chapter).num}/7 · Pelea ${Math.min(story.fight + 1, chapterAt(story.chapter).fights.length)}/${chapterAt(story.chapter).fights.length}`
                : rush
                  ? `Ciclo ★${useCampaignStore.getState().prestige} · mazo temático épico`
                  : `${stepChipLabel(step)} / ${CAMPAIGN_STEPS}`}
            </p>

            <Button
              onClick={(e) => { e.stopPropagation(); }}
              className="mt-5 w-full border text-white"
              style={{
                borderColor: `rgba(${biome.hex},0.6)`,
                background: `linear-gradient(to bottom, rgba(${biome.hex},0.8), rgba(${biome.hex},0.5))`,
              }}
            >
              ¡A LUCHAR!
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

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
  const bossActive = usePvpStore.getState().bossActive;
  const playedStep = usePvpStore.getState().campaignStep ?? 1;
  const campaignClosed = usePvpStore.getState().campaignCompleted;
  // RUSH DE JEFES: título, chip, XP y botones propios de la run
  const rushActive = usePvpStore.getState().rushActive;
  const rushIndex = usePvpStore.getState().rushIndex;
  const rushBeaten = usePvpStore.getState().rushBeaten;
  const rushCycle = usePvpStore.getState().rushCycle;
  // HISTORIA «EL PACTO DE GUERRA»: capítulo/pelea y cierre de capítulo
  const storyActive = usePvpStore.getState().storyActive;
  const storyChapterIdx = usePvpStore.getState().storyChapter ?? 0;
  const storyFightIdx = usePvpStore.getState().storyFight ?? 0;
  const storyChapterClosed = usePvpStore.getState().storyChapterClosed;
  const storyCompletedFlag = usePvpStore.getState().storyCompletedFlag;
  const storyFlags = useStoryStore.getState().flags;
  const storyChapterDef = chapterAt(storyChapterIdx);
  const storyFightDef = resolveFight(
    storyChapterDef.fights[Math.min(storyFightIdx, storyChapterDef.fights.length - 1)],
    storyFlags,
  );
  const bossPickMax = usePvpStore((s) => s.bossPickMax);
  const { step: nextStep, prestige } = useCampaignStore.getState();
  // NIVEL: celebra la subida (flash del statsStore) y muestra el XP ganado
  const stats = useStatsStore.getState();
  const need = xpForNext(stats.level);
  const rushBestOfCls = stats.rushBest[usePvpStore.getState().gameClass] ?? 0;
  // Botín del JEFE a ELEGIR — suscripción reactiva: al confirmar el pick
  // desaparece y el botín completo aparece. Rush: 1 de 3 · jefe clásico: 2 de 3.
  const bossPick = usePvpStore((s) => s.bossPickOptions);
  const bossPickSelected = usePvpStore((s) => s.bossPickSelected);
  const picking = result === "WIN" && !!bossPick?.length;
  const pickComplete = picking && bossPickSelected.length >= bossPickMax;
  const pickTierLabel = bossPick?.length ? RUSH_PICK_TIER_LABEL[bossPick[0].rarity as keyof typeof RUSH_PICK_TIER_LABEL] ?? "épicas" : "épicas";
  const won = result === "WIN";
  const loot = rewards ?? [];
  // FIX MODAL BLOQUEADO (reporte del jugador: «no deja continuar, hay que
  // cerrar la app»): los botones de navegación NUNCA se ocultan. Si el pick
  // del jefe está pendiente, convive arriba — elegir es OPCIONAL (son épicas
  // extra sobre el botín del escalón, que ya está pagado y visible).
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
        >
          {/* sin blur también aquí: la partida terminó pero el tablero sigue
              debajo — el blur full-screen es el filtro más caro de WebView */}
          <motion.div
            initial={{ scale: 0.85, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className={cn(
              "mx-4 w-full max-w-sm rounded-2xl border-2 bg-gradient-to-b to-black p-5 text-center shadow-2xl",
              won ? "border-amber-500/60 from-amber-950" : "border-rose-800/60 from-rose-950"
            )}
          >
            {won && storyCompletedFlag ? (
              <Star className="mx-auto h-9 w-9 text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
            ) : won && campaignClosed ? (
              <Star className="mx-auto h-9 w-9 text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
            ) : won && rushActive && rushIndex >= RUSH_BOSSES - 1 ? (
              <Star className="mx-auto h-9 w-9 text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
            ) : won && bossActive ? (
              <Skull className="mx-auto h-9 w-9 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
            ) : (
              <Trophy className={cn("mx-auto h-9 w-9", won ? "text-amber-400" : "text-rose-500/60")} />
            )}
            <div
              className={cn(
                "mt-1 text-xl font-black uppercase tracking-[0.3em]",
                won ? "text-amber-300" : "text-rose-300"
              )}
              style={{ fontFamily: "var(--font-cinzel), serif" }}
            >
              {won
                ? storyActive
                  ? storyCompletedFlag
                    ? "¡Historia completada!"
                    : storyChapterClosed
                      ? `¡Capítulo ${storyChapterDef.num} superado!`
                      : bossActive
                        ? "¡Campeón derrotado!"
                        : "¡Victoria!"
                  : rushActive
                    ? rushIndex >= RUSH_BOSSES - 1
                      ? "¡Run completada!"
                      : `¡Jefe ${rushIndex + 1}/${RUSH_BOSSES}!`
                    : campaignClosed
                      ? "¡Torre completada!"
                      : bossActive
                        ? "¡Jefe derrotado!"
                        : "¡Victoria!"
                : storyActive
                  ? "Pelea perdida"
                  : rushActive
                    ? "Run terminada"
                    : "Derrota"}
            </div>

            {/* Chip de contexto: ESCALÓN (campaña) o RUSH n/3 · ciclo */}
            <p
              className={cn(
                "mt-1 text-[9px] font-black uppercase tracking-[0.25em]",
                rushActive || isBossStep(playedStep) ? "text-rose-300/90" : "text-zinc-400"
              )}
            >
              {storyActive
                ? `EL PACTO DE GUERRA · CAPÍTULO ${storyChapterDef.num}/7`
                : rushActive
                  ? `RUSH · ${rushBeaten}/${RUSH_BOSSES} jefes · ciclo ★${rushCycle}`
                  : `${stepChipLabel(playedStep)} / ${CAMPAIGN_STEPS}`}
              {prestige > 0 && <span className="text-amber-300/80"> · ★ {prestige}</span>}
            </p>

            {stats.levelUpFlash && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.35, type: "spring", stiffness: 260, damping: 18 }}
                className="mx-auto mt-2 flex items-center gap-1.5 rounded-full border border-amber-300/70 bg-gradient-to-b from-amber-500/25 to-amber-900/40 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-amber-200 shadow-[0_0_16px_rgba(251,191,36,0.45)]"
              >
                <Star className="h-3 w-3 text-amber-300" />
                ¡Nivel {stats.levelUpFlash.to}! Mejoran tus drops
              </motion.div>
            )}
            <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              Nivel {stats.level} · {stats.xp}/{need} XP
              {won && rushActive && (
                <span className="text-amber-300/90"> · +{rushXpForBoss(rushIndex, prestige)} XP ×2</span>
              )}
              {won && storyActive && (
                <span className="text-amber-300/90"> · +{storyXpForFight(storyChapterIdx)} XP de historia</span>
              )}
              {won && !rushActive && !storyActive && (
                <span className="text-amber-300/90"> · +{xpBonusForStep(playedStep, prestige)} XP de escalón</span>
              )}
            </p>

            {/* ELIGE TU BOTÍN (jefe vencido): 3 ÉPICAS, te llevas 2 —
                decisión > azar. El jefe TAMBIÉN paga el botín del escalón
                (se ve al confirmar). */}
            {picking && bossPick && (
              <>
                <p className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">
                  <Skull className="h-3.5 w-3.5 shrink-0" />
                  Elige {bossPickMax} de 3 {pickTierLabel}
                </p>
                <div className="mt-3 flex justify-center gap-3">
                  {bossPick.map((opt, i) => {
                    const chosen = bossPickSelected.includes(i);
                    return (
                    <motion.button
                      key={`${opt.id}-${i}`}
                      initial={{ rotateY: 90, opacity: 0 }}
                      animate={{ rotateY: 0, opacity: 1 }}
                      transition={{ delay: 0.3 + i * 0.4, duration: 0.45 }}
                      whileHover={{ scale: 1.06, y: -4 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        sfx.click();
                        haptic("light");
                        usePvpStore.getState().toggleBossPick(i);
                      }}
                      className={cn(
                        "relative w-24 overflow-hidden rounded-lg border-2 bg-zinc-950 shadow-lg transition-transform",
                        chosen && "-translate-y-1.5 scale-[1.04]"
                      )}
                      style={{ borderColor: chosen ? "rgb(217 70 239 / 0.95)" : rarityBorderColor(opt.rarity) }}
                    >
                      {chosen && (
                        <span className="absolute left-1 top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-fuchsia-600 text-[9px] font-black text-white shadow-md">✓</span>
                      )}
                      <div
                        className="aspect-[3/4] w-full bg-cover bg-center"
                        style={{ backgroundImage: `url(/cards/${opt.id}.webp)` }}
                      />
                      <div className="px-1 py-1">
                        <div className="truncate text-[8px] font-bold text-zinc-200">{cardById(opt.id)?.name ?? opt.id}</div>
                        <div className="text-[7px] font-black uppercase tracking-widest text-zinc-500">
                          {RARITY_LABEL[opt.rarity]}
                          {opt.isNew && <span className="ml-1 text-emerald-400">NUEVA</span>}
                        </div>
                      </div>
                    </motion.button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[8px] uppercase tracking-widest text-zinc-500">
                  {pickComplete
                    ? "Toca CONFIRMAR para llevártela"
                    : `Marcadas ${bossPickSelected.length}/${bossPickMax} — toca ${bossPickMax === 1 ? "una carta" : "2 cartas"}`}
                </p>
                <Button
                  disabled={!pickComplete}
                  onClick={() => {
                    haptic("success");
                    usePvpStore.getState().confirmBossPick();
                  }}
                  className={cn(
                    "mt-1.5 w-full border",
                    pickComplete
                      ? "border-fuchsia-300/60 bg-gradient-to-b from-fuchsia-600 to-fuchsia-800 text-white hover:from-fuchsia-500 hover:to-fuchsia-700"
                      : "cursor-not-allowed border-zinc-800 bg-zinc-900 text-zinc-600"
                  )}
                >
                  Confirmar botín
                </Button>
              </>
            )}

            {/* BOTÍN — SIEMPRE visible (también durante el pick del jefe):
                la recompensa existe y se ve. El pick de épicas es extra. */}
            {loot.length > 0 && (
              <>
                <p className="mt-2 text-[10px] uppercase tracking-widest text-amber-200/80">
                  {bossActive && won
                    ? picking
                      ? "Botín del escalón (las épicas van aparte)"
                      : "Botín del JEFE · escalón + tus 2 épicas"
                    : `Botín · ${loot.length} ${loot.length === 1 ? "carta" : "cartas"} para tu colección`}
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
                        style={{
                          borderColor:
                            rar === "mythic" ? "rgb(251 113 133 / 0.85)" :
                            rar === "legendary" ? "rgb(251 191 36 / 0.85)" :
                            rar === "epic" ? "rgb(217 70 239 / 0.7)" :
                            rar === "rare" ? "rgb(56 189 248 / 0.7)" :
                            "rgb(113 113 122 / 0.7)",
                        }}
                      >
                        <div
                          className="aspect-[3/4] w-full bg-cover bg-center"
                          style={{ backgroundImage: `url(/cards/${r.id}.webp)` }}
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
                  3 iguales del mismo tier → fusión (+poder · desde legendaria, +keyword)
                </p>
              </>
            )}
            {loot.length === 0 && (
              <p className="mt-2 text-[10px] text-zinc-500">
                {useCollectionStore.getState().allCompleted()
                  ? "Colección COMPLETADA: todas las cartas ya son MÍTICAS — no hay botín que dar"
                  : "Sin botín esta vez…"}
              </p>
            )}
            {!won && rushActive && loot.length > 0 && (
              <p className="mt-1 text-[9px] uppercase tracking-widest text-rose-200/70">
                La run acaba aquí: venciste a {rushBeaten} de {RUSH_BOSSES} jefes — igual te llevas 1 carta
              </p>
            )}
            {!won && rushActive && loot.length === 0 && (
              <p className="mt-1 text-[10px] uppercase tracking-widest text-rose-200/70">
                La run acaba aquí: venciste a {rushBeaten} de {RUSH_BOSSES} jefes
              </p>
            )}
            {!won && storyActive && (
              <p className="mt-2 text-[11px] italic leading-relaxed text-zinc-300">“{storyFightDef.lose}”</p>
            )}
            {!won && !storyActive && !rushActive && loot.length > 0 && (
              <p className="mt-1 text-[9px] uppercase tracking-widest text-rose-200/70">
                El bot te venció — igual te llevas 1 carta y el escalón te espera
              </p>
            )}
            {!won && !storyActive && !rushActive && loot.length === 0 && (
              <p className="mt-1 text-[10px] uppercase tracking-widest text-rose-200/70">
                El bot te venció — afina tu mazo y reintenta
              </p>
            )}

            {/* LA CAMPAÑA encadena: siguiente escalón / reintentar / nueva vuelta.
                SIEMPRE disponibles — el modal no puede quedar atrapado jamás. */}
            <div className="mt-4 flex flex-col items-center gap-2">
              <Button
                onClick={onRematch}
                className={cn(
                  "w-full border",
                  won
                    ? "border-amber-400/60 bg-gradient-to-b from-amber-600 to-amber-800 text-amber-50 hover:from-amber-500 hover:to-amber-700"
                    : "border-rose-400/60 bg-gradient-to-b from-rose-700 to-rose-900 text-rose-50 hover:from-rose-600 hover:to-rose-800"
                )}
              >
                {storyActive
                  ? won
                    ? storyCompletedFlag
                      ? "Fin — El Pacto de Guerra"
                      : storyChapterClosed
                        ? "Volver al Mapa"
                        : "Siguiente Pelea"
                    : "Reintentar Pelea"
                  : rushActive
                  ? won
                    ? rushIndex >= RUSH_BOSSES - 1
                      ? "Nueva Run"
                      : "Siguiente Jefe"
                    : "Reintentar Run"
                  : won
                    ? campaignClosed
                      ? "Nueva Vuelta ★"
                      : isBossStep(playedStep)
                        ? "Continuar la Torre"
                        : "Siguiente Piso"
                    : "Reintentar Piso"}
              </Button>
              {storyActive && won && !storyCompletedFlag && !storyChapterClosed && (
                <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                  Siguiente: <span className="text-zinc-300">
                    {resolveFight(
                      storyChapterDef.fights[Math.min(storyFightIdx + 1, storyChapterDef.fights.length - 1)],
                      storyFlags,
                    ).rival}
                  </span>
                </p>
              )}
              {storyActive && won && storyChapterClosed && !storyCompletedFlag && (
                <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-amber-300/80">
                  El epílogo te espera en el mapa del Pacto
                </p>
              )}
              {storyActive && won && storyCompletedFlag && (
                <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-amber-300/80">
                  La Torre de los Muros sigue en pie — como prueba
                </p>
              )}
              {storyActive && !won && (
                <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                  La historia no retrocede: la misma pelea, otra barajada
                </p>
              )}
              {rushActive && won && rushIndex < RUSH_BOSSES - 1 && (
                <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                  Siguiente: <span className="text-zinc-300">{CAMPAIGN_BOSS_NAMES[rushBossesForCycle(rushCycle)[rushIndex + 1]]}</span>
                </p>
              )}
              {rushActive && (!won || rushIndex >= RUSH_BOSSES - 1) && (
                <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                  Mejor run ({usePvpStore.getState().gameClass}): <span className="text-amber-300/90">{Math.max(rushBestOfCls, rushBeaten)}/3</span>
                </p>
              )}
              {won && !storyActive && !rushActive && !campaignClosed && (
                <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                  Siguiente: <span className="text-zinc-300">{rivalNameForStep(nextStep)}</span>
                </p>
              )}
              {won && campaignClosed && (
                <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-amber-300/80">
                  ★ Prestigio {prestige} — la torre recomienza con rivales reforzados
                </p>
              )}
              <Button
                onClick={onExit}
                variant="outline"
                className="border-zinc-700 bg-zinc-950/60 text-zinc-300 hover:bg-zinc-900"
              >
                {storyActive ? "Mapa del Pacto" : "Menú"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Anuncio de la jugada del rival: tarjeta compacta con el ARTE de la carta
// jugada + nombre + coste/poder + carril. Hace el turno de la IA legible —
// antes solo aparecía el cartel "TURNO DEL RIVAL" y las cartas aparecían
// en el tablero sin que se supiera qué había jugado.
// ──────────────────────────────────────────────────────────────
function RivalPlayAnnouncerImpl({
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
            // Tween simple (150ms): los springs re-disparan layout en WebView
            // low-end; el anuncio debe costar casi nada en el turno rival.
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="relative flex items-center gap-2 rounded-xl border-2 border-rose-600/70 bg-gradient-to-b from-rose-950/95 to-black/95 py-1.5 pl-1.5 pr-3 shadow-2xl shadow-black/60"
            data-testid="rival-play-announce"
          >
            {announce.defId ? (
              <img
                src={`/cards/${announce.defId}.webp`}
                alt=""
                className="h-11 w-8 shrink-0 rounded-md border border-rose-400/50 object-cover"
                draggable={false}
                // decoding async: el WebP 432×576 NO bloquea el raster del
                // anuncio (la primera jugada del rival era el pico de decode)
                decoding="async"
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
const RivalPlayAnnouncer = memo(RivalPlayAnnouncerImpl);

// ══ FRANJA RIVAL (Task 46) — extraída y memo'd con snapshot ESTRECHO: se
// repinta solo cuando cambian los datos del rival o el turno. Antes vivía
// inline en PvpGame y se reconciliaba con CADA acción (mano/energía propias,
// floats…) aunque el rival no se moviera.
const PvpRivalStrip = memo(function PvpRivalStrip({
  bossActive,
  mode,
}: {
  bossActive: boolean;
  mode: string;
}) {
  const strip = usePvpStore(
    useShallow((s) => {
      const v = s.view;
      if (!v) return null;
      return {
        rival: v.rival,
        turn: v.turn,
        maxTurns: v.maxTurns,
      };
    })
  );
  if (!strip) return null;
  const { rival, turn, maxTurns } = strip;
  const RivalIcon = CLASS_ICON[rival.gameClass] ?? Swords;
  return (
    <div className="relative z-30 flex items-center justify-between gap-2 border-b border-rose-900/40 bg-gradient-to-b from-rose-950/60 to-zinc-950/90 px-2 py-1">
      <div className="flex min-w-0 items-center gap-1.5">
        <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-rose-500/50 bg-rose-950/50">
          <RivalIcon className="h-3.5 w-3.5 text-rose-300" strokeWidth={2.2} />
          {bossActive ? (
            <Skull className="absolute -bottom-1 -right-1.5 h-3 w-3 text-rose-400 drop-shadow" />
          ) : (
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-zinc-950",
                (mode === "historia" || rival.connected) ? "bg-emerald-400" : "bg-zinc-600"
              )}
              title={mode === "historia" ? "Bot local" : rival.connected ? "Conectado" : "Sin señal…"}
            />
          )}
        </div>
        <div className="min-w-0 leading-none">
          <div className="truncate text-[10px] font-black uppercase tracking-wider text-rose-200">
            {rival.name}
          </div>
          <div className="text-[7px] font-bold uppercase tracking-widest text-rose-400/70">
            {CLASS_META[rival.gameClass].label}
          </div>
        </div>
      </div>

      {/* Mano del rival (solo cantidad) + energía + mazo */}
      <div className="flex items-center gap-2.5">
        <span className="flex items-center gap-1 rounded-full border border-zinc-700/70 bg-black/40 px-1.5 py-0.5" title="Cartas en mano del rival">
          <Hand className="h-3 w-3 text-zinc-400" />
          <span className="text-xs font-black tabular-nums text-zinc-100">{rival.handCount}</span>
        </span>
        <span className="flex items-center gap-1 rounded-full border border-amber-700/50 bg-black/40 px-1.5 py-0.5" title="Energía del rival">
          <Zap className="h-3 w-3 text-amber-400" />
          <span className="text-xs font-black tabular-nums text-amber-300">{rival.energy}</span>
        </span>
        {/* REGLAS V3 — PC del rival (Asesino): lee el peligro de su ráfaga */}
        {rival.gameClass === "asesino" && rival.rivalComboPoints > 0 && (
          <span
            className="flex items-center gap-1 rounded-full border border-fuchsia-700/60 bg-black/40 px-1.5 py-0.5"
            title="Marca de ejecución del rival: PC acumulados (+2 de poder por PC al jugar en carril con debuff)"
          >
            <Sword className="h-3 w-3 text-fuchsia-400" />
            <span className="text-xs font-black tabular-nums text-fuchsia-300">{rival.rivalComboPoints}</span>
          </span>
        )}
        <span className="hidden items-center gap-1 rounded-full border border-zinc-700/70 bg-black/40 px-1.5 py-0.5 sm:flex" title="Mazo del rival">
          <Layers className="h-3 w-3 text-zinc-500" />
          <span className="text-[10px] font-black tabular-nums text-zinc-300">{rival.drawPileCount}</span>
        </span>
        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">
          T{turn}/{maxTurns}
        </span>
      </div>
    </div>
  );
});

// ──────────────────────────────────────────────────────────────
// Números flotantes (misma mecánica que solitario, data del store PvP)
// El padre (PvpGame) re-renderiza en CADA cambio de store (banner, choque,
// anuncio…): la posición de cada float se captura UNA vez al montar y el
// componente es memo — querySelector/getBoundingClientRect durante cada
// render forzaba layout repetido (layout thrash) justo cuando más anima.
// ──────────────────────────────────────────────────────────────
const PvpFloat = memo(function PvpFloat({ uid, value, id }: { uid: string; value: number; id: string }) {
  // El ancla se resuelve DESPUÉS del commit: la carta recién jugada entra al
  // DOM en el MISMO render que este float (el initializer de useState corría
  // ANTES del commit → querySelector daba null → el float se descartaba en
  // silencio: el buff de entrada —p. ej. Duelista «Al Jugar: +X»— no se veía).
  // useLayoutEffect corre tras pintar el DOM del commit → encuentra la carta;
  // el reintento por rAF cubre portales/montajes diferidos. Ventana ≪ 1600ms
  // de vida del float en el store.
  const [pos, setPos] = useState<{ x: number; y: number } | null>(() => {
    if (typeof document === "undefined") return null;
    const el = document.querySelector(`[data-card-uid="${uid}"]`);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top };
  });
  useLayoutEffect(() => {
    if (pos) return;
    let raf = 0;
    let cancelled = false;
    const attempt = (n: number) => {
      if (cancelled) return;
      const el = document.querySelector(`[data-card-uid="${uid}"]`);
      if (el) {
        const rect = el.getBoundingClientRect();
        setPos({ x: rect.left + rect.width / 2, y: rect.top });
        return;
      }
      if (n <= 0) return;
      raf = requestAnimationFrame(() => attempt(n - 1));
    };
    attempt(8);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [uid, pos]);
  if (!pos) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 0, scale: 0.5 }}
      animate={{ opacity: 1, y: -30, scale: 1.2 }}
      exit={{ opacity: 0, y: -50, scale: 0.8 }}
      transition={{ duration: 1.0, ease: "easeOut" }}
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 px-2 py-0.5 text-sm font-black tabular-nums shadow-lg",
        value > 0 ? "border-emerald-300 bg-emerald-600 text-white" : "border-rose-300 bg-rose-700 text-white"
      )}
      style={{ left: pos.x, top: pos.y }}
    >
      {value > 0 ? `+${value}` : `${value}`}
    </motion.div>
  );
});

const PvpFloatingNumbersLayer = memo(function PvpFloatingNumbersLayer({ floats }: { floats: { id: string; uid: string; value: number }[] }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      <AnimatePresence>
        {floats.map((f) => (
          <PvpFloat key={f.id} id={f.id} uid={f.uid} value={f.value} />
        ))}
      </AnimatePresence>
    </div>
  );
});

// ──────────────────────────────────────────────────────────────
// Game over PvP: resultado desde TU perspectiva + revancha
// ──────────────────────────────────────────────────────────────
// Borde del tile de botín según rareza (compartido por los dos overlays).
function rarityBorderColor(rar: string): string {
  return rar === "mythic" ? "rgb(251 113 133 / 0.85)"
    : rar === "legendary" ? "rgb(251 191 36 / 0.85)"
    : rar === "epic" ? "rgb(217 70 239 / 0.7)"
    : rar === "rare" ? "rgb(56 189 248 / 0.7)"
    : "rgb(113 113 122 / 0.7)";
}

function PvpGameOverModal({ open, rewards, onRematch, onExit }: {
  open: boolean;
  rewards: { id: string; rarity: string; isNew: boolean }[] | null;
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

          {/* Botín — el PvP también paga (victoria 2 · derrota/empate 1) */}
          {rewards && rewards.length > 0 && (
            <div className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-3">
              <div className="text-center text-[9px] font-bold uppercase tracking-[0.25em] text-amber-200/80">
                Botín · {rewards.length} {rewards.length === 1 ? "carta" : "cartas"} para tu colección
              </div>
              <div className="mt-2 flex justify-center gap-2.5">
                {rewards.map((r, i) => {
                  const def = cardById(r.id);
                  const rar = r.rarity as keyof typeof RARITY_META;
                  return (
                    <motion.div
                      key={`${r.id}-${i}`}
                      initial={{ rotateY: 90, opacity: 0 }}
                      animate={{ rotateY: 0, opacity: 1 }}
                      transition={{ delay: 0.25 + i * 0.25, duration: 0.4 }}
                      className="w-16 overflow-hidden rounded-md border-2 bg-zinc-950"
                      style={{ borderColor: rarityBorderColor(r.rarity) }}
                    >
                      <div
                        className="aspect-[3/4] w-full bg-cover bg-center"
                        style={{ backgroundImage: `url(/cards/${r.id}.webp)` }}
                      />
                      <div className="px-1 py-0.5">
                        <div className="truncate text-[7px] font-bold text-zinc-200">{def?.name ?? r.id}</div>
                        <div className="text-[6px] font-black uppercase tracking-widest text-zinc-500">
                          {RARITY_LABEL[rar]}
                          {r.isNew && <span className="ml-0.5 text-emerald-400">NUEVA</span>}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              <p className="mt-1.5 text-center text-[8px] font-bold uppercase tracking-widest text-zinc-500">
                +{result === "WIN" ? XP_WIN : result === "LOSS" ? XP_LOSS : XP_DRAW} XP · 3 iguales del tier → fusión
              </p>
            </div>
          )}

          {/* Botín vacío — colección 100% mítico (regla completada) o caso extremo */}
          {rewards && rewards.length === 0 && (
            <p className="text-center text-[10px] text-zinc-500">
              {useCollectionStore.getState().allCompleted()
                ? "Colección COMPLETADA: todas las cartas ya son MÍTICAS — no hay botín que dar"
                : "Sin botín esta vez…"}
            </p>
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
