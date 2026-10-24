"use client";

// ============================================================================
// «ELIGE TU HÉROE» — entrada COMPARTIDA de EL PACTO (historia) y LA TORRE
// (escalada 18 pisos, 6 jefes). Diseño COMPACTO + DETALLE (aprobado V3.0):
//  • Píldora HISTORIA (violeta): progreso del Pacto y ENTRADA al mapa —
//    aquí se escoge la clase ANTES de entrar a la historia.
//  • Tira de la Torre (18 segmentos, cráneos en los 6 muros) — dimmed con
//    candado hasta completar El Pacto.
//  • 6 CHIPS compactos en cuadrícula 2×3 — todo el roster visible de un
//    vistazo, con candado y PISTA de desbloqueo (qué jefe los recluta).
//  • UN panel de detalle de la clase seleccionada: icono, lema, sus 3
//    carriles, regla sistémica (lore tras tap) y acciones MAZO / JUGAR.
// La selección recuerda la última clase usada (localStorage). JUGAR lleva
// a la escalera PENDIENTE: historia si El Pacto no está cerrado, torre
// después — los JEFES emergen solos.
// ============================================================================
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import { useCollectionStore, hydrateCollection } from "@/store/collectionStore";
import { usePvpStore } from "@/store/pvpStore";
import { useCampaignStore } from "@/store/campaignStore";
import { useStoryStore } from "@/store/storyStore";
import { STORY_TOTAL } from "@/lib/game/story";
import { CAMPAIGN_STEPS, isBossStep, classUnlocked, classUnlockHint, chaptersCompletedOf } from "@/lib/game/campaign";
import { CLASS_META, LANE_META } from "@/lib/game/types";
import type { GameClass } from "@/lib/game/types";
import { ClassRuleBadge } from "./ClassRuleBadge";
import { ArrowLeft, BookOpen, ChevronRight, EyeOff, Library, Lock, Skull, Star, Swords, Wand2, Sprout, Ship, Wrench } from "lucide-react";
import { visibleClasses } from "@/lib/game/v3";
import { loadStoredProfileBrief } from "@/lib/profile-storage";
import { sfx } from "@/lib/sound";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

interface ClassDef {
  id: GameClass;
  name: string;
  /** Lema corto (una línea — Cinzel, bajo el nombre). */
  tagline: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  color: "amber" | "violet" | "emerald" | "green" | "blue" | "yellow";
}

const CLASSES: ClassDef[] = [
  {
    id: "guerrero",
    name: "GUERRERO",
    tagline: "Fuerza · Disciplina · Sangre",
    icon: Swords,
    color: "amber",
  },
  {
    id: "mago",
    name: "MAGO",
    tagline: "Maná · Elementos · Impulso",
    icon: Wand2,
    color: "violet",
  },
  {
    id: "asesino",
    name: "ASESINO",
    tagline: "Sigilo · Veneno · Precisión",
    icon: EyeOff,
    color: "emerald",
  },
  {
    id: "botanico",
    name: "BOTÁNICO",
    tagline: "Crecimiento · Enjambre · Esporas",
    icon: Sprout,
    color: "green",
  },
  {
    id: "pirata",
    name: "PIRATA",
    tagline: "Saqueo · Abordaje · Pólvora",
    icon: Ship,
    color: "blue",
  },
  {
    id: "tinker",
    name: "TINKER",
    tagline: "Artefactos · Engranajes · Chispa",
    icon: Wrench,
    color: "yellow",
  },
];

const COLOR_MAP: Record<ClassDef["color"], {
  border: string;
  bg: string;
  glow: string;
  iconBg: string;
  iconRing: string;
  btnPrimary: string;
  accent: string;
  hex: string;
}> = {
  amber: {
    border: "border-amber-500/40",
    bg: "bg-zinc-950/40",
    glow: "shadow-[0_0_28px_rgba(251,191,36,0.18)]",
    iconBg: "bg-amber-950/50",
    iconRing: "ring-amber-400/60",
    btnPrimary: "from-amber-700 via-amber-600 to-rose-700 hover:from-amber-600 hover:via-amber-500 hover:to-rose-600 border-amber-400/50",
    accent: "text-amber-300",
    hex: "251,191,36",
  },
  violet: {
    border: "border-violet-500/40",
    bg: "bg-zinc-950/40",
    glow: "shadow-[0_0_28px_rgba(168,85,247,0.18)]",
    iconBg: "bg-violet-950/50",
    iconRing: "ring-violet-400/60",
    btnPrimary: "from-violet-700 via-violet-600 to-indigo-700 hover:from-violet-600 hover:via-violet-500 hover:to-indigo-600 border-violet-400/50",
    accent: "text-violet-300",
    hex: "168,85,247",
  },
  emerald: {
    border: "border-emerald-500/40",
    bg: "bg-zinc-950/40",
    glow: "shadow-[0_0_28px_rgba(16,185,129,0.18)]",
    iconBg: "bg-emerald-950/50",
    iconRing: "ring-emerald-400/60",
    btnPrimary: "from-emerald-700 via-emerald-600 to-teal-700 hover:from-emerald-600 hover:via-emerald-500 hover:to-teal-600 border-emerald-400/50",
    accent: "text-emerald-300",
    hex: "16,185,129",
  },
  green: {
    border: "border-green-500/40",
    bg: "bg-zinc-950/40",
    glow: "shadow-[0_0_28px_rgba(74,222,128,0.18)]",
    iconBg: "bg-green-950/50",
    iconRing: "ring-green-400/60",
    btnPrimary: "from-green-700 via-green-600 to-lime-700 hover:from-green-600 hover:via-green-500 hover:to-lime-600 border-green-400/50",
    accent: "text-green-300",
    hex: "74,222,128",
  },
  blue: {
    border: "border-blue-500/40",
    bg: "bg-zinc-950/40",
    glow: "shadow-[0_0_28px_rgba(96,165,250,0.18)]",
    iconBg: "bg-blue-950/50",
    iconRing: "ring-blue-400/60",
    btnPrimary: "from-blue-700 via-blue-600 to-indigo-700 hover:from-blue-600 hover:via-blue-500 hover:to-indigo-600 border-blue-400/50",
    accent: "text-blue-300",
    hex: "96,165,250",
  },
  yellow: {
    border: "border-yellow-500/40",
    bg: "bg-zinc-950/40",
    glow: "shadow-[0_0_28px_rgba(250,204,21,0.18)]",
    iconBg: "bg-yellow-950/50",
    iconRing: "ring-yellow-400/60",
    btnPrimary: "from-yellow-700 via-yellow-600 to-amber-700 hover:from-yellow-600 hover:via-yellow-500 hover:to-amber-600 border-yellow-400/50",
    accent: "text-yellow-300",
    hex: "250,204,21",
  },
};

const LAST_CLASS_KEY = "pacto:cls-select:last";

// ─────────────────────────────────────────────────────────────
// LA TORRE — tira VISUAL de una línea: 18 segmentos (cráneos en los
// 6 muros), ★ prestigio y chip del piso. Cero texto explicativo:
// la torre se lee sola. Persistente y GLOBAL entre clases.
// Con `locked` (El Pacto sin cerrar) se apaga con candado: se VE la
// escalera que viene después, pero todavía no se pisa.
// ─────────────────────────────────────────────────────────────
function CampaignStrip({ step, prestige, locked }: { step: number; prestige: number; locked?: boolean }) {
  const nextIsBoss = isBossStep(step);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      title={locked ? "La Torre se abre al completar El Pacto de Guerra" : undefined}
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-2",
        locked
          ? "border-zinc-800 bg-zinc-950/70 opacity-55 saturate-[0.35]"
          : "border-amber-500/30 bg-zinc-950/70 shadow-[0_0_20px_rgba(251,191,36,0.08)]"
      )}
    >
      {locked && <Lock className="h-3 w-3 shrink-0 text-zinc-500" />}
      {prestige > 0 && (
        <span
          className="flex shrink-0 items-center gap-0.5 rounded-full border border-amber-400/50 bg-amber-950/50 px-1.5 py-0.5 text-[9px] font-black text-amber-300"
          title={`Prestigio ${prestige}`}
        >
          <Star className="h-2.5 w-2.5" />
          {prestige}
        </span>
      )}

      {/* La torre — superados en ámbar, jefes como cráneos, actual latiendo */}
      <div className="flex min-w-0 flex-1 items-center gap-[3px]" aria-hidden>
        {Array.from({ length: CAMPAIGN_STEPS }, (_, i) => {
          const s = i + 1;
          const boss = isBossStep(s);
          const done = s < step;
          const current = s === step;
          if (boss) {
            return (
              <Skull
                key={s}
                className={cn(
                  "h-3 w-3 shrink-0",
                  done
                    ? "text-rose-400/80"
                    : current
                      ? "animate-pulse text-rose-300"
                      : "text-rose-500/40"
                )}
              />
            );
          }
          return (
            <div
              key={s}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                done
                  ? "bg-amber-500/70"
                  : current
                    ? "animate-pulse bg-zinc-100"
                    : "bg-zinc-700/50"
              )}
            />
          );
        })}
      </div>

      <span
        className={cn(
          "shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider",
          nextIsBoss
            ? "border-rose-500/50 bg-rose-950/50 text-rose-300"
            : "border-zinc-700 bg-zinc-900/70 text-zinc-300"
        )}
      >
        {nextIsBoss && <Skull className="mr-0.5 inline h-2.5 w-2.5" />}
        PISO {step}/{CAMPAIGN_STEPS}
      </span>
    </motion.div>
  );
}

export function ClassSelect() {
  const setView = useGameStore((s) => s.setView);
  const selectClass = useGameStore((s) => s.selectClass);
  const loadDeckAndPool = useGameStore((s) => s.loadDeckAndPool);
  const deckLoading = useGameStore((s) => s.deckLoading);
  const setDeckEditorReturn = useGameStore((s) => s.setDeckEditorReturn);
  const startHistoria = usePvpStore((s) => s.startHistoria);
  // LA TORRE — escalada persistente (global entre clases)
  const campaignStep = useCampaignStore((s) => s.step);
  const prestige = useCampaignStore((s) => s.prestige);
  // DESBLOQUEO: cada jefe vencido recluta a la siguiente clase (0/3/6/9/12/15).
  const stepsCleared = useCampaignStore((s) => s.stepsCleared);
  // EL PACTO — progreso narrativo: define qué escalera está pendiente
  // (historia abierta → JUGAR entra al mapa; cerrada → JUGAR escala la torre).
  const storyChapter = useStoryStore((s) => s.chapter);
  const storyCompleted = useStoryStore((s) => s.completed);

  // Clase seleccionada (chips) — recuerda la última usada; cae a GUERRERO.
  const [selected, setSelected] = useState<GameClass>(() => {
    if (typeof window === "undefined") return "guerrero";
    const last = window.localStorage.getItem(LAST_CLASS_KEY) as GameClass | null;
    return last && visibleClasses().includes(last) ? last : "guerrero";
  });

  useEffect(() => {
    hydrateCollection();
    useCampaignStore.getState().hydrate();
    useStoryStore.getState().hydrate();
    // Mazo inicial de CADA clase VISIBLE (una vez): las neutrales + relleno
    // barato. grantStarterDeck es idempotente y no-op si ya tiene mazo.
    visibleClasses().forEach((c) =>
      useCollectionStore.getState().grantStarterDeck(c as GameClass)
    );
  }, []);

  const sel = CLASSES.find((c) => c.id === selected) ?? CLASSES[0];
  const c = COLOR_MAP[sel.color];
  // DESBLOQUEO BIVÍA: historia (capítulos del Pacto superados) O torre
  // (escalones). La historia va PRIMERO → sus capítulos mandan en la pista.
  const chaptersDone = chaptersCompletedOf(storyChapter, storyCompleted);
  const selUnlocked = classUnlocked(sel.id, stepsCleared, chaptersDone);
  const selHint = classUnlockHint(sel.id, chaptersDone);

  const pick = (cls: GameClass) => {
    setSelected(cls);
    try {
      window.localStorage.setItem(LAST_CLASS_KEY, cls);
    } catch {
      /* almacenamiento no disponible — la selección no persiste y listo */
    }
  };

  // JUGAR → LA CAMPAÑA en el ESCALÓN PENDIENTE (jefes incluidos: emergen
  // solos de la torre — sin botón aparte).
  const startCampaign = async (cls: GameClass) => {
    if (!classUnlocked(cls, stepsCleared, chaptersDone)) return;
    selectClass(cls);
    if (!deckLoading) await loadDeckAndPool();
    const profileName = loadStoredProfileBrief()?.username ?? "";
    startHistoria({
      playerClass: cls,
      playerName: profileName || undefined,
      step: useCampaignStore.getState().step,
    });
  };

  // HISTORIA — entrar al mapa de EL PACTO con el héroe elegido (la clase se
  // escoge AQUÍ, antes de entrar). Sincroniza TAMBIÉN el gameClass del
  // pvpStore: startStoryFight lee de ALLÍ, y sin este puente la pelea
  // usaría la clase residual de la última torre/rush — no la del chip.
  const enterStory = async (cls: GameClass) => {
    if (!classUnlocked(cls, stepsCleared, chaptersDone)) {
      // Clase bloqueada: toque NEGADO (mismo lenguaje que el menú).
      haptic("heavy");
      sfx.debuff();
      return;
    }
    selectClass(cls);
    usePvpStore.getState().setGameClass(cls);
    if (!deckLoading) await loadDeckAndPool();
    useStoryStore.getState().hydrate();
    sfx.select();
    haptic("light");
    setView("story");
  };

  // Open deck editor — remember we came from class-select
  const openDeckEditor = async (cls: GameClass) => {
    if (!classUnlocked(cls, stepsCleared, chaptersDone)) return;
    selectClass(cls);
    if (!deckLoading) await loadDeckAndPool();
    setDeckEditorReturn("class-select");
    setView("editor");
  };

  const nextIsBoss = isBossStep(campaignStep);

  return (
    <div className="app-frame relative overflow-hidden text-zinc-100">
      {/* ── Background: blurred battlefield (the menu's main-bg) ── */}
      <div
        className="absolute inset-0 z-0 scale-105 bg-cover bg-center blur-[2px]"
        style={{ backgroundImage: 'url(/menu/main-bg.webp)' }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/85 via-black/65 to-black/85" />

      {/* ── Back button (small circular icon, top-left — matches menu/profile) ── */}
      <button
        onClick={() => setView("main-menu")}
        className="absolute left-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-amber-500/40 bg-zinc-950/70 text-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.25)] transition-colors hover:border-amber-400/70 hover:bg-zinc-900/80"
        title="Volver"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2.2} />
      </button>

      {/* ── Title (top center, Cinzel — matches menu/profile) ── */}
      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute inset-x-0 top-3 z-20 text-center text-sm font-black uppercase tracking-[0.4em] text-amber-400"
        style={{
          fontFamily: 'var(--font-cinzel), serif',
          textShadow: '0 0 10px rgba(251,191,36,0.5), 0 1px 2px rgba(0,0,0,0.9)',
        }}
      >
        Elige tu Héroe
      </motion.h2>

      <main className="app-main relative z-10 mx-auto flex w-full max-w-md flex-col justify-center gap-2.5 px-3 pb-4 pt-16">
        {/* HISTORIA — la escalera activa de El Pacto: progreso + ENTRADA al
            mapa con el héroe elegido (también revivir la historia cerrada:
            cada clase tiene su propio final). */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          whileTap={{ scale: 0.985 }}
          onClick={() => enterStory(sel.id)}
          title={
            storyCompleted
              ? "Historia completada — revívela con otro héroe (cada clase tiene su final)"
              : "Entrar al mapa de El Pacto de Guerra"
          }
          className="flex w-full items-center gap-2 rounded-full border border-violet-400/50 bg-violet-950/60 px-3 py-2 shadow-[0_0_20px_rgba(139,92,246,0.12)] transition-colors hover:border-violet-300/70"
        >
          <BookOpen className="h-3.5 w-3.5 shrink-0 text-violet-300" />
          <span className="min-w-0 flex-1 truncate text-left text-[9px] font-black uppercase tracking-[0.18em] text-violet-200">
            Historia · {storyCompleted ? "Completada ★" : `Capítulo ${Math.min(storyChapter + 1, STORY_TOTAL)}/${STORY_TOTAL}`}
          </span>
          {storyCompleted && (
            <span className="hidden shrink-0 rounded-full border border-violet-400/40 bg-violet-900/60 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-violet-200 min-[360px]:inline-flex">
              Revivir
            </span>
          )}
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-violet-300" />
        </motion.button>

        {/* LA TORRE — una tira, cero párrafos (dimmed con candado hasta
            cerrar El Pacto: se ve la escalera que viene después). */}
        <CampaignStrip step={campaignStep} prestige={prestige} locked={!storyCompleted} />

        {/* ── CHIPS COMPACTOS (2×3): toda la oferta sin scroll. ── */}
        <div className="grid grid-cols-3 gap-1.5">
          {CLASSES.map((cls, i) => {
            const cc = COLOR_MAP[cls.color];
            const isSel = cls.id === selected;
            const unlocked = classUnlocked(cls.id, stepsCleared, chaptersDone);
            const Icon = cls.icon;
            return (
              <motion.button
                key={cls.id}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 + i * 0.05, duration: 0.3, ease: "easeOut" }}
                whileTap={{ scale: 0.96 }}
                onClick={() => pick(cls.id)}
                aria-pressed={isSel}
                className={cn(
                  "relative flex flex-col items-center gap-1 rounded-xl border py-2 transition-all duration-150",
                  isSel
                    ? `border-2 ${cc.border} ${cc.bg} ${cc.glow}`
                    : "border-zinc-800 bg-zinc-950/50 hover:border-zinc-600 hover:bg-zinc-900/60",
                  !unlocked && !isSel && "opacity-60"
                )}
              >
                {/* Marcadores esquina: V3 = novedad (arriba-izq) · candado (arriba-der) */}
                <span
                  className="absolute left-1 top-1 rounded-full bg-zinc-200 px-1 text-[6px] font-black leading-[1.4] text-zinc-950"
                  title="Nuevo en V3.0"
                >
                  V3
                </span>
                {!unlocked && <Lock className="absolute right-1 top-1 h-2.5 w-2.5 text-zinc-500" />}
                <Icon
                  className={cn("h-5 w-5", isSel ? cc.accent : "text-zinc-400")}
                  strokeWidth={2.2}
                />
                <span
                  className={cn(
                    "text-[8px] font-black uppercase tracking-wider",
                    isSel ? "text-zinc-50" : "text-zinc-400"
                  )}
                >
                  {cls.name}
                </span>
                {/* Indicador inferior del chip seleccionado */}
                <span
                  className={cn(
                    "absolute inset-x-3 bottom-0 h-[2px] rounded-full transition-opacity",
                    isSel ? "opacity-100" : "opacity-0"
                  )}
                  style={{ background: `rgba(${cc.hex},0.8)` }}
                />
              </motion.button>
            );
          })}
        </div>

        {/* ── PANEL DE DETALLE — una sola tarjeta para la clase elegida ── */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={sel.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn("relative overflow-hidden rounded-2xl border-2", c.border, c.bg, c.glow)}
          >
            {/* Top accent line — color band matching the class */}
            <div
              className="absolute inset-x-0 top-0 h-0.5"
              style={{
                background: `linear-gradient(to right, transparent, rgba(${c.hex},0.6), transparent)`,
              }}
            />

            {/* Header: icon disc + name + tagline */}
            <div className="flex items-center gap-3 p-3.5">
              <motion.div
                key={`${sel.id}-icon`}
                initial={{ scale: 0.85, rotate: -6 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${c.iconBg} ring-2 ${c.iconRing}`}
              >
                <sel.icon className="h-6 w-6 text-zinc-100" strokeWidth={2.2} />
              </motion.div>
              <div className="min-w-0 flex-1">
                <h3
                  className="truncate text-base font-black uppercase tracking-[0.12em] text-zinc-50"
                  style={{ fontFamily: 'var(--font-cinzel), serif' }}
                >
                  {sel.name}
                </h3>
                <p
                  className={`truncate text-[9px] font-black uppercase tracking-[0.2em] ${c.accent}`}
                  style={{ fontFamily: 'var(--font-cinzel), serif' }}
                >
                  {sel.tagline}
                </p>
              </div>
            </div>

            {/* CARRILES PROPIOS — los 3 del estilo de juego de la clase */}
            <div className="flex flex-wrap items-center gap-1.5 px-3.5 pb-2">
              {CLASS_META[sel.id].lanes.map((lane) => {
                const L = LANE_META[lane];
                const LIcon = L.icon;
                return (
                  <span
                    key={lane}
                    className="flex items-center gap-1 rounded-full border border-zinc-700/70 bg-zinc-900/60 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.15em] text-zinc-300"
                  >
                    <LIcon className="h-2.5 w-2.5" />
                    {L.title}
                  </span>
                );
              })}
            </div>

            {/* REGLA SISTÉMICA — chip de una línea que al tap despliega
                lore + consejo (texto oculto: pantalla minimalista). */}
            <div className="px-3.5 pb-2">
              <ClassRuleBadge gameClass={sel.id} />
            </div>

            {/* Actions: MAZO (secondary) + JUGAR (único botón de la torre) */}
            <div className="border-t border-zinc-800/60 bg-black/30 p-2.5">
              {!selUnlocked ? (
                /* CLASE BLOQUEADA — candado + qué jefe la abre. Sin trampas:
                   ni MAZO ni JUGAR responden hasta vencer al muro. */
                <div className="flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/70 py-2.5 text-[9px] font-black uppercase tracking-[0.15em] text-zinc-500">
                  <Lock className="h-3.5 w-3.5 text-zinc-500" />
                  <span>{selHint}</span>
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-1.5">
                  <button
                    onClick={() => openDeckEditor(sel.id)}
                    className="col-span-2 flex items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/70 py-2.5 text-[9px] font-black uppercase tracking-wider text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white"
                    title="Personalizar mazo"
                  >
                    <Library className="h-3.5 w-3.5" />
                    <span>Mazo</span>
                  </button>
                  {/* BOTÓN ÚNICO — la escalera PENDIENTE: historia abierta →
                      el mapa de El Pacto; cerrada → la Torre (jefes incluidos,
                      se tiñe de rosa cuando el próximo escalón es JEFE). */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => (storyCompleted ? startCampaign(sel.id) : enterStory(sel.id))}
                    className={cn(
                      "col-span-3 flex items-center justify-center gap-2 rounded-lg border bg-gradient-to-r py-2.5 text-[10px] font-black uppercase tracking-[0.15em] text-white shadow-md transition-all",
                      storyCompleted && nextIsBoss
                        ? "border-rose-400/60 from-rose-700 via-rose-600 to-rose-800 hover:from-rose-600 hover:via-rose-500 hover:to-rose-700"
                        : c.btnPrimary
                    )}
                    style={{ fontFamily: 'var(--font-cinzel), serif' }}
                  >
                    {storyCompleted && nextIsBoss && <Skull className="h-3.5 w-3.5" />}
                    <span>Jugar</span>
                    <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
