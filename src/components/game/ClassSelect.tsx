"use client";

// ============================================================================
// Entrada del MODO HISTORIA — LA CAMPAÑA (escalera de guerra): eliges tu
// clase y CONTINÚAS la escalera de 15 escalones. Los JEFES emergen solos
// como muros (escalones 5/10/15) — ya NO existe el botón "Desafiar al Jefe".
// El botón único encadena: victoria → siguiente escalón; derrota → repites
// (sin retroceder). El botín y la XP crecen con cada escalón y el escalón 15
// vencido abre el PRESTIGIO (rivales reforzados, bucle infinito).
// Colección: aquí se entrega el mazo inicial de cada clase (una vez) y se
// muestra cuántas cartas de las 24 tienes desbloqueadas.
// ============================================================================

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import { useCollectionStore, hydrateCollection } from "@/store/collectionStore";
import { usePvpStore } from "@/store/pvpStore";
import { useCampaignStore } from "@/store/campaignStore";
import {
  CAMPAIGN_STEPS,
  isBossStep,
  rivalNameForStep,
  stepChipLabel,
} from "@/lib/game/campaign";
import { ArrowLeft, ChevronRight, EyeOff, Library, Lock, Skull, Star, Swords, Wand2 } from "lucide-react";
import type { GameClass } from "@/lib/game/types";
import { CLASS_META } from "@/lib/game/types";
import { classCardsOf } from "@/lib/game/cards";
import { loadStoredProfileBrief } from "@/lib/profile-storage";
import { cn } from "@/lib/utils";

interface ClassDef {
  id: GameClass;
  name: string;
  subtypes: string;
  keywords: string[];
  icon: React.ReactNode;
  color: "amber" | "violet" | "emerald";
  unlocked: boolean;
  desc: string;
  // Short tagline shown as a Cinzel subtitle under the class name
  tagline: string;
}

const CLASSES: ClassDef[] = [
  {
    id: "guerrero",
    name: "GUERRERO",
    subtypes: "Armas · Protección · Furia",
    keywords: ["Hender Armadura", "Duelista", "Amparo", "Purificación", "Ímpetu", "Crueldad"],
    icon: <Swords className="h-7 w-7" strokeWidth={2.2} />,
    color: "amber",
    unlocked: true,
    desc: "Maestro del combate cuerpo a cuerpo. Domina los tres carriles con tácticas agresivas, defensa sólida y furia desatada.",
    tagline: "Fuerza · Disciplina · Sangre",
  },
  {
    id: "mago",
    name: "MAGO",
    subtypes: "Arcana · Fuego · Hielo",
    keywords: ["Convergencia", "Sobrecarga", "Llamarada", "Combustión", "Escarcha", "Ventisca"],
    icon: <Wand2 className="h-7 w-7" strokeWidth={2.2} />,
    color: "violet",
    unlocked: true,
    desc: "Tejedor de arcano. Poder alto que entra de golpe y se disipa: llamaradas devoradoras, hielo restaurable y maná desbordante.",
    tagline: "Maná · Elementos · Burst",
  },
  {
    id: "asesino",
    name: "ASESINO",
    subtypes: "Veneno · Combate · Sigilo",
    keywords: ["Veneno", "Contagio", "Refriega", "Golpe Certero", "Emboscada", "Purga"],
    icon: <EyeOff className="h-7 w-7" strokeWidth={2.2} />,
    color: "emerald",
    unlocked: true,
    desc: "Precisión quirúrgica. Veneno que perfora escudos, golpes que castigan descuidos y cuchillas que limpian a los débiles.",
    tagline: "Sigilo · Veneno · Precisión",
  },
];

const COLOR_MAP: Record<ClassDef["color"], {
  border: string;
  borderStrong: string;
  bg: string;
  glow: string;
  chipBorder: string;
  iconBg: string;
  iconRing: string;
  btnPrimary: string;
  accent: string;
  hex: string;
}> = {
  amber: {
    border: "border-amber-500/40",
    borderStrong: "border-amber-400/70",
    bg: "bg-zinc-950/40",
    glow: "shadow-[0_0_28px_rgba(251,191,36,0.18)]",
    chipBorder: "border-amber-600/40 bg-amber-950/40 text-amber-300",
    iconBg: "bg-amber-950/50",
    iconRing: "ring-amber-400/60",
    btnPrimary: "from-amber-700 via-amber-600 to-rose-700 hover:from-amber-600 hover:via-amber-500 hover:to-rose-600 border-amber-400/50",
    accent: "text-amber-300",
    hex: "251,191,36",
  },
  violet: {
    border: "border-violet-500/40",
    borderStrong: "border-violet-400/70",
    bg: "bg-zinc-950/40",
    glow: "shadow-[0_0_28px_rgba(168,85,247,0.18)]",
    chipBorder: "border-violet-600/40 bg-violet-950/40 text-violet-300",
    iconBg: "bg-violet-950/50",
    iconRing: "ring-violet-400/60",
    btnPrimary: "from-violet-700 via-violet-600 to-indigo-700 hover:from-violet-600 hover:via-violet-500 hover:to-indigo-600 border-violet-400/50",
    accent: "text-violet-300",
    hex: "168,85,247",
  },
  emerald: {
    border: "border-emerald-500/40",
    borderStrong: "border-emerald-400/70",
    bg: "bg-zinc-950/40",
    glow: "shadow-[0_0_28px_rgba(16,185,129,0.18)]",
    chipBorder: "border-emerald-600/40 bg-emerald-950/40 text-emerald-300",
    iconBg: "bg-emerald-950/50",
    iconRing: "ring-emerald-400/60",
    btnPrimary: "from-emerald-700 via-emerald-600 to-teal-700 hover:from-emerald-600 hover:via-emerald-500 hover:to-teal-600 border-emerald-400/50",
    accent: "text-emerald-300",
    hex: "16,185,129",
  },
};

// ─────────────────────────────────────────────────────────────
// LA CAMPAÑA — barra de la escalera: 15 segmentos con los cráneos de los
// jefes encima de los muros (5/10/15). Persistente y GLOBAL (se comparte
// entre clases): avanzar en cualquier clase avanza LA escalera.
// ─────────────────────────────────────────────────────────────
function CampaignLadder({ step, prestige }: { step: number; prestige: number }) {
  const nextIsBoss = isBossStep(step);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="rounded-2xl border border-amber-500/30 bg-zinc-950/60 p-3 shadow-[0_0_24px_rgba(251,191,36,0.08)]"
    >
      {/* Cabecera: título + prestigio + escalón */}
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-300"
          style={{ fontFamily: "var(--font-cinzel), serif" }}
        >
          La Campaña
        </span>
        <div className="flex items-center gap-1.5">
          {prestige > 0 && (
            <span className="flex items-center gap-0.5 rounded-full border border-amber-400/50 bg-amber-950/50 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-amber-300">
              <Star className="h-2.5 w-2.5" />
              Prestigio {prestige}
            </span>
          )}
          <span
            className={cn(
              "rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider",
              nextIsBoss
                ? "border-rose-500/50 bg-rose-950/50 text-rose-300"
                : "border-zinc-700 bg-zinc-900/70 text-zinc-300"
            )}
          >
            {stepChipLabel(step)} / {CAMPAIGN_STEPS}
          </span>
        </div>
      </div>

      {/* La escalera — superados en ámbar, jefes en rosa, actual latiendo */}
      <div className="mt-3 flex items-center gap-[3px] pt-2">
        {Array.from({ length: CAMPAIGN_STEPS }, (_, i) => {
          const s = i + 1;
          const boss = isBossStep(s);
          const done = s < step;
          const current = s === step;
          return (
            <div key={s} className={cn("relative", boss ? "flex-[1.5]" : "flex-1")}>
              {boss && (
                <Skull
                  className={cn(
                    "absolute -top-2 left-1/2 h-2 w-2 -translate-x-1/2",
                    done ? "text-rose-400/80" : current ? "text-rose-300" : "text-rose-500/50"
                  )}
                />
              )}
              <div
                className={cn(
                  "h-2 rounded-full border",
                  done
                    ? boss
                      ? "border-rose-400/60 bg-rose-500/70"
                      : "border-amber-400/50 bg-amber-500/70"
                    : current
                      ? boss
                        ? "animate-pulse border-rose-300 bg-rose-400"
                        : "border-zinc-100 bg-zinc-200"
                      : boss
                        ? "border-rose-800/60 bg-rose-950/60"
                        : "border-zinc-700/60 bg-zinc-800/80"
                )}
              />
            </div>
          );
        })}
      </div>

      {/* Lo que hay EN JUEGO ahora mismo */}
      {nextIsBoss ? (
        <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-[9px] font-black uppercase tracking-[0.18em] text-rose-300">
          <Skull className="h-3 w-3 shrink-0" />
          <span>{rivalNameForStep(step)} bloquea el paso · botín: legendaria</span>
        </p>
      ) : (
        <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-400">
          <ChevronRight className="h-3 w-3 shrink-0 text-amber-400" />
          <span>
            Siguiente rival: <span className="text-zinc-200">{rivalNameForStep(step)}</span>
          </span>
        </p>
      )}
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
  // `copies` como dependencia de re-render: al ganar cartas cambia el contador.
  const copies = useCollectionStore((s) => s.copies);
  // LA CAMPAÑA — escalera persistente (global entre clases)
  const campaignStep = useCampaignStore((s) => s.step);
  const prestige = useCampaignStore((s) => s.prestige);
  const stepsCleared = useCampaignStore((s) => s.stepsCleared);

  useEffect(() => {
    hydrateCollection();
    useCampaignStore.getState().hydrate();
    // Mazo inicial de CADA clase (una vez): las neutrales + relleno barato.
    ["guerrero", "mago", "asesino"].forEach((c) =>
      useCollectionStore.getState().grantStarterDeck(c as GameClass)
    );
  }, []);

  // Cartas desbloqueadas de la clase (re-renderiza con `copies`).
  function ownedDistinct(cls: GameClass): number {
    return classCardsOf(cls).filter((c) => {
      const t = copies[c.id];
      return !!t && (t.common ?? 0) + (t.rare ?? 0) + (t.epic ?? 0) + (t.legendary ?? 0) + (t.mythic ?? 0) > 0;
    }).length;
  }

  // ¿La campaña ya fue iniciada alguna vez? (para el label del botón)
  const campaignStarted = prestige > 0 || stepsCleared > 0;
  const nextIsBoss = isBossStep(campaignStep);

  // JUGAR → LA CAMPAÑA en el ESCALÓN PENDIENTE (jefes incluidos: emergen
  // solos de la escalera — sin botón aparte).
  const startCampaign = async (cls: GameClass) => {
    selectClass(cls);
    if (!deckLoading) await loadDeckAndPool();
    const profileName = loadStoredProfileBrief()?.username ?? "";
    startHistoria({
      playerClass: cls,
      playerName: profileName || undefined,
      step: useCampaignStore.getState().step,
    });
  };

  // Open deck editor — remember we came from class-select
  const openDeckEditor = async (cls: GameClass) => {
    selectClass(cls);
    if (!deckLoading) await loadDeckAndPool();
    setDeckEditorReturn("class-select");
    setView("editor");
  };

  return (
    <div className="app-frame relative overflow-hidden text-zinc-100">
      {/* ── Background: blurred battlefield (the menu's main-bg) ──
          Choosing a class is the last step before going to war, so the
          battlefield backdrop fits thematically. Translucent cards let
          the bg show through. */}
      <div
        className="absolute inset-0 z-0 scale-105 bg-cover bg-center blur-[2px]"
        style={{ backgroundImage: 'url(/menu/main-bg.webp)' }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/85 via-black/65 to-black/85" />

      {/* ── Back button (small circular icon, top-left — matches menu/profile) ── */}
      <button
        onClick={() => setView("main-menu")}
        className="absolute left-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-amber-500/40 bg-zinc-950/70 backdrop-blur-sm text-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.25)] transition-colors hover:bg-zinc-900/80 hover:border-amber-400/70"
        title="Volver"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2.2} />
      </button>

      {/* ── Title (top center, Cinzel — matches menu/profile) ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute inset-x-0 top-3 z-20 flex flex-col items-center gap-1"
      >
        <h2
          className="text-sm font-black uppercase tracking-[0.4em] text-amber-400"
          style={{
            fontFamily: 'var(--font-cinzel), serif',
            textShadow: '0 0 10px rgba(251,191,36,0.5), 0 1px 2px rgba(0,0,0,0.9)',
          }}
        >
          Elige tu Héroe
        </h2>
        {/* LA CAMPAÑA — avanzar paga */}
        <p className="px-14 text-center text-[8px] font-bold uppercase tracking-[0.18em] text-amber-300/80">
          El botín y la XP crecen con cada escalón
        </p>
      </motion.div>

      {/* ── Class cards (translucent, color-coded) ── */}
      <main className="app-main relative z-10 mx-auto w-full max-w-md px-3 pb-6 pt-20">
        <div className="flex flex-col gap-3">
          {/* LA CAMPAÑA — la escalera arriba, siempre visible */}
          <CampaignLadder step={campaignStep} prestige={prestige} />

          {CLASSES.map((cls, i) => {
            const c = COLOR_MAP[cls.color];
            return (
              <motion.div
                key={cls.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.12, duration: 0.5, ease: "easeOut" }}
                whileHover={cls.unlocked ? { scale: 1.01 } : undefined}
                className={`relative overflow-hidden rounded-2xl border-2 ${c.border} ${c.bg} ${c.glow} backdrop-blur-[1px]`}
              >
                {/* Top accent line — subtle color band that matches class color */}
                <div
                  className="absolute inset-x-0 top-0 h-0.5"
                  style={{
                    background: `linear-gradient(to right, transparent, rgba(${c.hex},0.6), transparent)`,
                  }}
                />

                {/* Lock overlay (when class is not unlocked) */}
                {!cls.unlocked && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-[2px]">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900">
                        <Lock className="h-5 w-5 text-zinc-500" />
                      </div>
                      <span
                        className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500"
                        style={{ fontFamily: 'var(--font-cinzel), serif' }}
                      >
                        Próximamente
                      </span>
                    </div>
                  </div>
                )}

                {/* Card body — header row + description + keywords */}
                <div className="flex flex-col gap-2.5 p-4">
                  {/* Header row: icon disc + name + tagline + status badge */}
                  <div className="flex items-center gap-3">
                    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${c.iconBg} ring-2 ${c.iconRing}`}>
                      {cls.icon}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3
                          className="truncate text-lg font-black uppercase tracking-[0.12em] text-zinc-50"
                          style={{ fontFamily: 'var(--font-cinzel), serif' }}
                        >
                          {cls.name}
                        </h3>
                        {cls.unlocked ? (
                          <span className="shrink-0 rounded-full border border-emerald-600/40 bg-emerald-950/40 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-emerald-300">
                            {ownedDistinct(cls.id)}/24 cartas
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full border border-zinc-700 bg-zinc-900/60 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-zinc-500">
                            En desarrollo
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-[10px] font-black uppercase tracking-[0.2em] ${c.accent}`}
                        style={{ fontFamily: 'var(--font-cinzel), serif' }}
                      >
                        {cls.tagline}
                      </p>
                      <p className="text-[9px] font-bold uppercase tracking-wide text-zinc-500">
                        {cls.subtypes}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-[11px] leading-snug text-zinc-300">
                    {cls.desc}
                  </p>

                  {/* Decorative crossed-swords divider (only when unlocked) */}
                  {cls.unlocked && (
                    <div className="flex w-full items-center gap-2 py-0.5">
                      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-zinc-700/60" />
                      <span
                        className="text-amber-500/60"
                        style={{ fontSize: '9px', lineHeight: 1 }}
                        aria-hidden
                      >
                        ⚔
                      </span>
                      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-zinc-700/60" />
                    </div>
                  )}

                  {/* Keywords */}
                  <div className="flex flex-wrap gap-1">
                    {cls.keywords.map((kw, j) => (
                      <span
                        key={j}
                        className={`rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${c.chipBorder}`}
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action buttons — only when unlocked */}
                {cls.unlocked && (
                  <div className="border-t border-zinc-800/60 bg-black/30 p-2.5">
                    <div className="grid grid-cols-5 gap-1.5">
                      {/* Personalizar Mazo — secondary, 2/5 width */}
                      <button
                        onClick={() => openDeckEditor(cls.id)}
                        className="col-span-2 flex items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/70 py-2.5 text-[9px] font-black uppercase tracking-wider text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white"
                        title="Personalizar mazo"
                      >
                        <Library className="h-3.5 w-3.5" />
                        <span>Mazo</span>
                      </button>
                      {/* BOTÓN ÚNICO — LA CAMPAÑA en el escalón pendiente.
                          Si el próximo escalón es JEFE, el botón se tiñe de
                          rosa: el muro avisa antes de golpear. */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => startCampaign(cls.id)}
                        className={cn(
                          "col-span-3 flex items-center justify-center gap-2 rounded-lg border bg-gradient-to-r py-2.5 text-[10px] font-black uppercase tracking-[0.15em] text-white shadow-md transition-all",
                          nextIsBoss
                            ? "border-rose-400/60 from-rose-700 via-rose-600 to-rose-800 hover:from-rose-600 hover:via-rose-500 hover:to-rose-700"
                            : c.btnPrimary
                        )}
                        style={{
                          fontFamily: 'var(--font-cinzel), serif',
                        }}
                      >
                        {nextIsBoss && <Skull className="h-3.5 w-3.5" />}
                        <span>
                          {!campaignStarted
                            ? "Iniciar Campaña"
                            : nextIsBoss
                              ? `Enfrentar · ${stepChipLabel(campaignStep)}`
                              : `Continuar · ${stepChipLabel(campaignStep)}`}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                      </motion.button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}

          {/* Reglas de la campaña — pie discreto */}
          <p className="text-center text-[8px] font-bold uppercase tracking-[0.18em] text-zinc-600">
            Ganar avanza y paga mejor · perder repite el escalón · escalón {CAMPAIGN_STEPS} = ★ prestigio
          </p>
        </div>
      </main>
    </div>
  );
}
