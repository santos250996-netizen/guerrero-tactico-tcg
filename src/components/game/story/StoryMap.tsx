"use client";

// ============================================================================
// StoryMap — MODO HISTORIA «EL PACTO DE GUERRA»: el mapa de capítulos.
//
//   ┌─ cabecera: HISTORIA · El Pacto de Guerra + clase activa + volver
//   ├─ 7 nodos de capítulo (hecho · actual · cerrado) con lugar y peleas
//   ├─ diálogo de INTRO por pelea (tap a tap) → «¡A LUCHAR!»
//   ├─ epílogo de capítulo al volver tras superar el último combate
//   ├─ DECISIONES (3): dos opciones que dejan flag permanente en storyStore
//   └─ final: epílogo por clase + reinicio voluntario
//
// El combate es el de siempre (pvpStore.startStoryFight): el bot juega como
// un player y la REGLA DE CAPÍTULO (bonos forzados) entra por pvp.ts.
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, Check, ChevronRight, Lock, Play, RotateCcw, ScrollText, Shield, Skull, Swords, Users,
} from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { useStoryStore } from "@/store/storyStore";
import { usePvpStore } from "@/store/pvpStore";
import {
  STORY_CHAPTERS,
  STORY_TOTAL,
  STORY_ENDINGS,
  choiceAfterChapter,
  resolveFight,
  type StoryChapter,
  type StoryFight,
  type StoryLine,
} from "@/lib/game/story";
import { biomeById, storyClassForChapter } from "@/lib/game/campaign";
import { CLASS_META, LANE_BONUS_POOL } from "@/lib/game/types";
import { sfx } from "@/lib/sound";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ── Retratos baratos: iconos por voz (sin arte de personajes) ──────────────
function SpeakerAvatar({ who, accentHex }: { who: string; accentHex: string }) {
  const w = who.toLowerCase();
  const Icon = w.includes("narrador")
    ? ScrollText
    : w.includes("tú") || w.includes("heroe") || w.includes("héroe")
      ? Shield
      : w.includes("vharos") || w.includes("heraldo") || w.includes("yggra")
        ? Skull
        : Users;
  return (
    <div
      className="flex h-11 w-11 items-center justify-center rounded-full border"
      style={{ borderColor: `rgba(${accentHex},0.6)`, background: "rgba(0,0,0,0.35)" }}
    >
      <Icon className="h-5 w-5" style={{ color: `rgb(${accentHex})` }} />
    </div>
  );
}

/** Etiquetas legibles de la regla de capítulo (bonos forzados). */
function ruleLabels(fight: StoryFight): string[] {
  if (!fight.forcedBonuses) return [];
  return fight.forcedBonuses
    .map((k) => (k ? LANE_BONUS_POOL.find((b) => b.kind === k)?.label ?? null : null))
    .filter((l): l is string => !!l);
}

// ── Diálogo (tap a tap) ────────────────────────────────────────────────────
function StoryDialogBox({
  title,
  subtitle,
  lines,
  accentHex,
  rule,
  finishLabel,
  onFinish,
}: {
  title: string;
  subtitle: string;
  lines: StoryLine[];
  accentHex: string;
  rule?: string[];
  finishLabel: string;
  onFinish: () => void;
}) {
  const [step, setStep] = useState(0);
  const line = lines[Math.min(step, lines.length - 1)];
  const last = step >= lines.length - 1;
  const advance = () => {
    if (last) return;
    sfx.click();
    haptic("light");
    setStep((s) => s + 1);
  };
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onPointerDown={advance}
      className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/90 px-5"
    >
      <motion.div
        initial={{ scale: 0.92, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="w-full max-w-sm rounded-2xl border-2 p-5"
        style={{
          borderColor: `rgba(${accentHex},0.55)`,
          background: `linear-gradient(to bottom, rgba(${accentHex},0.14), rgba(0,0,0,0.94))`,
          boxShadow: `0 0 40px rgba(${accentHex},0.16)`,
        }}
      >
        <p
          className="text-[9px] font-black uppercase tracking-[0.4em]"
          style={{ color: `rgb(${accentHex})`, fontFamily: "var(--font-cinzel), serif" }}
        >
          {title}
        </p>
        <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.22em] text-zinc-500">{subtitle}</p>

        {rule && rule.length > 0 && (
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            {rule.map((r) => (
              <span
                key={r}
                className="rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.18em] text-amber-200"
              >
                Regla: {r}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex min-h-[150px] flex-col items-center text-center">
          <SpeakerAvatar who={line.who} accentHex={accentHex} />
          <p
            className="mt-2 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-300"
            style={{ fontFamily: "var(--font-cinzel), serif" }}
          >
            {line.who}
          </p>
          <motion.p
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 text-[12px] leading-relaxed text-zinc-100"
          >
            {line.text}
          </motion.p>
        </div>

        <p className="mt-2 text-center text-[8px] font-bold uppercase tracking-[0.25em] text-zinc-600">
          {last ? "" : `toca para continuar · ${step + 1}/${lines.length}`}
        </p>

        {last && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              sfx.click();
              haptic("light");
              onFinish();
            }}
            className="mt-3 w-full border text-white"
            style={{
              borderColor: `rgba(${accentHex},0.6)`,
              background: `linear-gradient(to bottom, rgba(${accentHex},0.8), rgba(${accentHex},0.5))`,
            }}
          >
            {finishLabel}
          </Button>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Decisión (2 opciones) ──────────────────────────────────────────────────
function StoryChoiceBox({
  question,
  options,
  accentHex,
  onChoose,
}: {
  question: string;
  options: readonly { flag: string; label: string; desc: string }[];
  accentHex: string;
  onChoose: (flag: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-5"
    >
      <motion.div
        initial={{ scale: 0.92, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="w-full max-w-sm rounded-2xl border-2 p-5"
        style={{
          borderColor: `rgba(${accentHex},0.55)`,
          background: `linear-gradient(to bottom, rgba(${accentHex},0.14), rgba(0,0,0,0.94))`,
        }}
      >
        <p
          className="text-[9px] font-black uppercase tracking-[0.4em]"
          style={{ color: `rgb(${accentHex})`, fontFamily: "var(--font-cinzel), serif" }}
        >
          Una decisión
        </p>
        <p className="mt-2 text-center text-[13px] font-bold leading-snug text-zinc-100">{question}</p>
        <div className="mt-4 flex flex-col gap-3">
          {options.map((opt) => (
            <motion.button
              key={opt.flag}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                sfx.click();
                haptic("medium");
                onChoose(opt.flag);
              }}
              className="rounded-xl border p-3 text-left transition-colors hover:bg-zinc-900/60"
              style={{ borderColor: `rgba(${accentHex},0.4)` }}
            >
              <p
                className="text-[12px] font-black uppercase tracking-[0.14em]"
                style={{ color: `rgb(${accentHex})`, fontFamily: "var(--font-cinzel), serif" }}
              >
                {opt.label}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-zinc-400">{opt.desc}</p>
            </motion.button>
          ))}
        </div>
        <p className="mt-3 text-center text-[8px] font-bold uppercase tracking-[0.25em] text-zinc-600">
          esta decisión se recuerda para el resto de la historia
        </p>
      </motion.div>
    </motion.div>
  );
}

// ── El mapa ────────────────────────────────────────────────────────────────
type DialogState =
  | { kind: "intro" }
  | { kind: "epilogue"; chapterIdx: number }
  | { kind: "choice"; choiceIdx: number }
  | null;

export function StoryMap() {
  const setView = useGameStore((s) => s.setView);
  const gameClass = useGameStore((s) => s.gameClass);
  const hydrate = useStoryStore((s) => s.hydrate);
  const chapter = useStoryStore((s) => s.chapter);
  const fight = useStoryStore((s) => s.fight);
  const flags = useStoryStore((s) => s.flags);
  const completed = useStoryStore((s) => s.completed);
  const choose = useStoryStore((s) => s.choose);
  const resetStory = useStoryStore((s) => s.resetStory);
  const startStoryFight = usePvpStore((s) => s.startStoryFight);

  const [dialog, setDialog] = useState<DialogState>(() => {
    // RESUME-SEGURO (lazy init): al volver del combate con capítulo cerrado
    // → epílogo (+ decisión pendiente). El store ya se hidrató al importar.
    const pvp = usePvpStore.getState();
    const story = useStoryStore.getState();
    let closedIdx = -1;
    if (pvp.storyChapterClosed) {
      closedIdx = story.completed ? STORY_TOTAL - 1 : story.chapter - 1;
    } else if (story.chapter > 0) {
      // una decisión quedó pendiente de una sesión anterior (recarga de la app)
      const ch = choiceAfterChapter(story.chapter - 1);
      if (ch && !ch.options.some((o) => story.flags[o.flag])) closedIdx = story.chapter - 1;
    }
    return closedIdx >= 0 ? { kind: "epilogue" as const, chapterIdx: closedIdx } : null;
  });
  const [resetAsk, setResetAsk] = useState(false);

  useEffect(() => {
    hydrate(); // re-sync idempotente con localStorage
  }, [hydrate]);

  const chapterDef = STORY_CHAPTERS[Math.min(chapter, STORY_TOTAL - 1)];
  const pendingFight = useMemo(
    () => resolveFight(chapterDef.fights[Math.min(fight, chapterDef.fights.length - 1)], flags),
    [chapterDef, fight, flags],
  );

  /** Tras el epílogo: decisión pendiente → decisión; si no, cerrar. */
  const afterEpilogue = (chapterIdx: number) => {
    const ch = choiceAfterChapter(chapterIdx);
    if (ch && !ch.options.some((o) => flags[o.flag])) {
      setDialog({ kind: "choice", choiceIdx: chapterIdx });
      return;
    }
    setDialog(null);
  };

  const goBack = () => {
    sfx.click();
    haptic("light");
    setView("main-menu");
  };

  const launchFight = () => {
    haptic("medium");
    // El combate (startStoryFight) lee la clase del pvpStore: sincroniza
    // SIEMPRE con la que muestra esta cabecera (gameStore). Sin este puente,
    // una torre/rush anterior dejaría una clase residual y la pelea saldría
    // con otro héroe distinto al del chip.
    usePvpStore.getState().setGameClass(gameClass);
    startStoryFight(chapter, fight);
  };

  const accentOf = (ch: StoryChapter) => biomeById(ch.biomeId).hex;

  return (
    <div className="app-frame flex flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Cabecera */}
      <div className="relative z-10 flex items-center gap-2 px-4 pb-2 pt-4">
        <button
          onClick={goBack}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/80 text-zinc-300 transition-colors hover:bg-zinc-800"
          aria-label="Volver al menú"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-[12px] font-black uppercase tracking-[0.14em] text-amber-200 min-[420px]:text-[13px] min-[420px]:tracking-[0.22em]"
            style={{ fontFamily: "var(--font-cinzel), serif" }}
          >
            <span className="min-[380px]:hidden">El Pacto</span>
            <span className="hidden min-[380px]:inline">El Pacto de Guerra</span>
          </p>
          <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-zinc-500">
            Historia · {completed ? "Completada ★" : `Capítulo ${chapterDef.num} de ${STORY_TOTAL}`}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-900/80 px-2.5 py-1">
          {(() => {
            const Meta = CLASS_META[gameClass];
            const Icon = Meta.icon;
            return (
              <>
                <Icon className="h-3.5 w-3.5 text-amber-300" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-300">{Meta.label}</span>
              </>
            );
          })()}
        </div>
      </div>

      {/* Nodos de capítulo */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-6 pt-2">
        <div className="relative mx-auto max-w-sm">
          {/* línea del camino */}
          <div className="absolute bottom-6 left-[27px] top-4 w-px bg-gradient-to-b from-amber-500/40 via-zinc-700/60 to-zinc-800" />
          {STORY_CHAPTERS.map((ch, idx) => {
            const done = completed || idx < chapter;
            const current = !completed && idx === chapter;
            const locked = !completed && idx > chapter;
            const accent = accentOf(ch);
            const fightsTotal = ch.fights.length;
            const fightsWon = current ? fight : done ? fightsTotal : 0;
            // El capítulo RECLUTA una clase al superarse (c2→Botánico…):
            // visible SIEMPRE — el jugador sabe qué gana y cuándo se abre.
            const recruits = storyClassForChapter(idx);
            const RecruitIcon = recruits ? CLASS_META[recruits].icon : null;
            return (
              <motion.div
                key={ch.id}
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={cn("relative mb-3 flex items-start gap-3 pl-0", locked && "opacity-45")}
              >
                {/* nodo */}
                <div
                  className={cn(
                    "relative z-10 mt-1 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border-2",
                    done && "border-emerald-400/70 bg-emerald-500/15",
                    current && "border-amber-300 bg-amber-500/20 shadow-[0_0_16px_rgba(251,191,36,0.45)]",
                    locked && "border-zinc-700 bg-zinc-900",
                  )}
                >
                  {done ? (
                    <Check className="h-3.5 w-3.5 text-emerald-300" />
                  ) : current ? (
                    <Play className="h-3.5 w-3.5 text-amber-200" />
                  ) : (
                    <Lock className="h-3 w-3 text-zinc-600" />
                  )}
                </div>

                {/* tarjeta */}
                <div
                  className={cn(
                    "min-w-0 flex-1 rounded-xl border p-3",
                    current ? "border-amber-400/50 bg-gradient-to-b from-amber-950/40 to-zinc-950" : "border-zinc-800 bg-zinc-900/50",
                  )}
                  style={current ? { boxShadow: `0 0 24px rgba(${accent},0.12)` } : undefined}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                    <p
                      className={cn(
                        "min-w-0 max-w-full text-[12px] font-black uppercase leading-tight tracking-[0.16em]",
                        current ? "text-amber-200" : done ? "text-zinc-300" : "text-zinc-500",
                      )}
                      style={{ fontFamily: "var(--font-cinzel), serif" }}
                    >
                      {ch.num}. {ch.title}
                    </p>
                    <span className="shrink-0 text-[8px] font-bold uppercase tracking-[0.2em] text-zinc-600">
                      {ch.place}
                    </span>
                  </div>

                  {/* progreso de peleas + acción */}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: fightsTotal }, (_, f) => (
                        <span
                          key={f}
                          className={cn(
                            "h-1.5 w-4 rounded-full",
                            f < fightsWon ? "bg-amber-400/80" : "bg-zinc-700/70",
                          )}
                        />
                      ))}
                      <span className="ml-1 text-[8px] font-bold uppercase tracking-[0.18em] text-zinc-600">
                        {fightsWon}/{fightsTotal} peleas
                      </span>
                    </div>
                    {current && (
                      <Button
                        onClick={() => {
                          sfx.click();
                          haptic("light");
                          setDialog({ kind: "intro" });
                        }}
                        className="h-8 border border-amber-400/60 bg-gradient-to-b from-amber-600 to-amber-800 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-amber-50 hover:from-amber-500 hover:to-amber-700"
                      >
                        {fight > 0 ? "Continuar" : "Jugar"}
                        <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* BOTÍN + RECLUTA del capítulo — a la vista, sin sorpresas:
                      +N cartas al superar y la clase que se une al Pacto. */}
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    <span
                      className={cn(
                        "rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.15em]",
                        done
                          ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-300/80"
                          : current
                            ? "border-amber-400/40 bg-amber-500/10 text-amber-200"
                            : "border-zinc-800 bg-zinc-950/60 text-zinc-600",
                      )}
                    >
                      +{ch.rewardCards} cartas
                    </span>
                    {recruits && RecruitIcon && (
                      <span
                        title={`Al superar este capítulo, ${CLASS_META[recruits].label} se une al Pacto y queda jugable`}
                        className={cn(
                          "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.15em]",
                          done
                            ? "border-violet-400/30 bg-violet-950/40 text-violet-300/70"
                            : current
                              ? "border-violet-400/50 bg-violet-950/60 text-violet-200 shadow-[0_0_12px_rgba(139,92,246,0.2)]"
                              : "border-zinc-800 bg-zinc-950/60 text-zinc-600",
                        )}
                      >
                        <RecruitIcon className="h-2.5 w-2.5" />
                        Recluta: {CLASS_META[recruits].label}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* FINAL: historia completada */}
        {completed && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mt-4 max-w-sm rounded-xl border border-amber-400/50 bg-gradient-to-b from-amber-950/50 to-zinc-950 p-4 text-center"
            style={{ boxShadow: "0 0 30px rgba(251,191,36,0.14)" }}
          >
            <p
              className="text-[11px] font-black uppercase tracking-[0.3em] text-amber-200"
              style={{ fontFamily: "var(--font-cinzel), serif" }}
            >
              El Pacto quedó firmado ★
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-zinc-300">{STORY_ENDINGS[gameClass]}</p>
            <div className="mt-3 flex justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  sfx.click();
                  setView("class-select");
                }}
                className="h-8 border-zinc-700 bg-zinc-950/60 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 hover:bg-zinc-900"
              >
                <Swords className="mr-1 h-3.5 w-3.5" /> La Torre
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  sfx.click();
                  setResetAsk(true);
                }}
                className="h-8 border-zinc-700 bg-zinc-950/60 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 hover:bg-zinc-900"
              >
                <RotateCcw className="mr-1 h-3.5 w-3.5" /> Revivir historia
              </Button>
            </div>
            {resetAsk && (
              <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-950/30 p-3">
                <p className="text-[11px] text-zinc-300">
                  ¿Empezar de cero? Se borra el progreso y las 3 decisiones (las cartas ganadas SE QUEDAN).
                </p>
                <div className="mt-2 flex justify-center gap-2">
                  <Button
                    variant="outline"
                    className="h-7 border-zinc-700 px-3 text-[9px] uppercase tracking-widest text-zinc-400"
                    onClick={() => setResetAsk(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="h-7 border border-rose-400/60 bg-gradient-to-b from-rose-700 to-rose-900 px-3 text-[9px] font-black uppercase tracking-widest text-rose-50"
                    onClick={() => {
                      haptic("medium");
                      resetStory();
                      setResetAsk(false);
                      setDialog(null);
                    }}
                  >
                    Sí, desde el Capítulo 1
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {!completed && (
          <p className="mx-auto mt-2 max-w-sm text-center text-[9px] font-bold uppercase tracking-[0.22em] text-zinc-600">
            pelea {fight + 1}/{chapterDef.fights.length} de {chapterDef.title} — la historia no retrocede
          </p>
        )}
      </div>

      {/* Diálogos */}
      <AnimatePresence>
        {dialog?.kind === "intro" && (
          <StoryDialogBox
            key="intro"
            title={`Capítulo ${chapterDef.num} · ${chapterDef.title}`}
            subtitle={`${chapterDef.place} · Pelea ${fight + 1}/${chapterDef.fights.length}`}
            lines={pendingFight.intro}
            accentHex={accentOf(chapterDef)}
            rule={ruleLabels(pendingFight)}
            finishLabel="¡A LUCHAR!"
            onFinish={launchFight}
          />
        )}
        {dialog?.kind === "epilogue" && (
          <StoryDialogBox
            key={`epi-${dialog.chapterIdx}`}
            title={`Epílogo · ${STORY_CHAPTERS[dialog.chapterIdx].title}`}
            subtitle={STORY_CHAPTERS[dialog.chapterIdx].place}
            lines={STORY_CHAPTERS[dialog.chapterIdx].epilogue}
            accentHex={accentOf(STORY_CHAPTERS[dialog.chapterIdx])}
            finishLabel="Continuar"
            onFinish={() => afterEpilogue(dialog.chapterIdx)}
          />
        )}
        {dialog?.kind === "choice" && (
          <StoryChoiceBox
            key={`choice-${dialog.choiceIdx}`}
            question={choiceAfterChapter(dialog.choiceIdx)?.question ?? ""}
            options={choiceAfterChapter(dialog.choiceIdx)?.options ?? []}
            accentHex={accentOf(STORY_CHAPTERS[Math.min(dialog.choiceIdx, STORY_TOTAL - 1)])}
            onChoose={(flag) => {
              choose(flag);
              setDialog(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
