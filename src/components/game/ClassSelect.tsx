"use client";

import { motion } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import { ArrowLeft, Lock, Swords, Sun, Sparkles, Library, Play } from "lucide-react";

const CLASSES = [
  {
    id: "guerrero",
    name: "GUERRERO",
    subtypes: "Armas · Protección · Furia",
    keywords: ["Sangrado", "Cúpula", "Perforación", "Espinas", "Guardián", "Desarme", "Mejora", "Frenesí", "Enrabia"],
    icon: <Swords className="h-6 w-6" strokeWidth={2.2} />,
    color: "amber",
    unlocked: true,
    desc: "Maestro del combate cuerpo a cuerpo. Domina los tres carriles con tácticas agresivas, defensa sólida y furia desatada.",
  },
  {
    id: "imperio",
    name: "IMPERIO DEL SOL",
    subtypes: "Sacerdocio · Órdenes · Naguales",
    keywords: ["Hecatombe", "Garra", "Metamorfosis"],
    icon: <Sun className="h-6 w-6" strokeWidth={2.2} />,
    color: "orange",
    unlocked: false,
    desc: "Sacerdotes guerreros del sol. Invocan naguales y ejecutan rituales de sangre.",
  },
  {
    id: "mago",
    name: "MAGO",
    subtypes: "Arcano · Elemental · Ilusión",
    keywords: ["Drenaje", "Calcinar", "Espejismo"],
    icon: <Sparkles className="h-6 w-6" strokeWidth={2.2} />,
    color: "violet",
    unlocked: false,
    desc: "Tejedores de arcano. Manipulan elementos y crean ilusiones para confundir al enemigo.",
  },
];

const COLOR_MAP = {
  amber: {
    border: "border-amber-500/50",
    bg: "bg-zinc-900/90",
    glow: "shadow-[0_0_20px_rgba(251,191,36,0.18)]",
    chipBorder: "border-amber-600/40 bg-amber-950/40 text-amber-300",
    iconBg: "bg-amber-900/40 text-amber-400",
    btnPrimary: "from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500",
  },
  orange: {
    border: "border-orange-500/50",
    bg: "bg-zinc-900/90",
    glow: "shadow-[0_0_20px_rgba(249,115,22,0.18)]",
    chipBorder: "border-orange-600/40 bg-orange-950/40 text-orange-300",
    iconBg: "bg-orange-900/40 text-orange-400",
    btnPrimary: "from-orange-600 to-rose-600 hover:from-orange-500 hover:to-rose-500",
  },
  violet: {
    border: "border-violet-500/50",
    bg: "bg-zinc-900/90",
    glow: "shadow-[0_0_20px_rgba(168,85,247,0.18)]",
    chipBorder: "border-violet-600/40 bg-violet-950/40 text-violet-300",
    iconBg: "bg-violet-900/40 text-violet-400",
    btnPrimary: "from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500",
  },
} as const;

export function ClassSelect() {
  const setView = useGameStore((s) => s.setView);
  const initGame = useGameStore((s) => s.initGame);
  const loadDeckAndPool = useGameStore((s) => s.loadDeckAndPool);
  const deckLoading = useGameStore((s) => s.deckLoading);
  const setDeckEditorReturn = useGameStore((s) => s.setDeckEditorReturn);

  // Quick-play with default deck for selected class
  const quickPlay = async () => {
    if (!deckLoading) await loadDeckAndPool();
    initGame();
    setView("game");
  };

  // Open deck editor — remember we came from class-select
  const openDeckEditor = async () => {
    if (!deckLoading) await loadDeckAndPool();
    setDeckEditorReturn("class-select");
    setView("editor");
  };

  return (
    <div className="app-frame text-zinc-100">
      {/* Header */}
      <header className="flex items-center justify-between gap-2 border-b border-zinc-800/80 bg-zinc-950/90 px-3 pt-3 pb-2 backdrop-blur">
        <button
          onClick={() => setView("main-menu")}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver
        </button>
        <div className="text-right">
          <div className="text-[9px] uppercase tracking-[0.3em] text-amber-400">Pacto de Guerra</div>
          <div className="text-sm font-black uppercase tracking-wider text-white">Selecciona tu Clase</div>
        </div>
      </header>

      {/* Class cards */}
      <main className="app-main mx-auto w-full max-w-md px-3 py-3">
        <div className="flex flex-col gap-3">
          {CLASSES.map((cls, i) => {
            const c = COLOR_MAP[cls.color as keyof typeof COLOR_MAP];
            return (
              <motion.div
                key={cls.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.12 }}
                className={`relative overflow-hidden rounded-xl border-2 ${c.border} ${c.bg} ${c.glow}`}
              >
                {/* Lock overlay */}
                {!cls.unlocked && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/75 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-2">
                      <Lock className="h-7 w-7 text-zinc-600" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                        Próximamente
                      </span>
                    </div>
                  </div>
                )}

                {/* Body */}
                <div className="flex gap-3 p-3">
                  {/* Icon block */}
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg ${c.iconBg}`}>
                    {cls.icon}
                  </div>

                  {/* Right column */}
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="truncate text-base font-black uppercase tracking-wider text-white">
                        {cls.name}
                      </h3>
                      {cls.unlocked && (
                        <span className="shrink-0 rounded border border-emerald-600/40 bg-emerald-950/40 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-emerald-300">
                          Disponible
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] font-bold uppercase tracking-wide text-zinc-500">
                      {cls.subtypes}
                    </p>
                    <p className="text-[11px] leading-tight text-zinc-400">
                      {cls.desc}
                    </p>

                    {/* Keywords */}
                    <div className="flex flex-wrap gap-1 pt-0.5">
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
                </div>

                {/* Action buttons */}
                {cls.unlocked && (
                  <div className="grid grid-cols-2 gap-1.5 border-t border-zinc-800/80 bg-black/30 p-2">
                    <button
                      onClick={openDeckEditor}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 py-2 text-[10px] font-black uppercase tracking-wider text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white"
                    >
                      <Library className="h-3.5 w-3.5" />
                      Personalizar Mazo
                    </button>
                    <button
                      onClick={quickPlay}
                      className={`flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r ${c.btnPrimary} py-2 text-[10px] font-black uppercase tracking-wider text-white shadow-md`}
                    >
                      <Play className="h-3.5 w-3.5" fill="currentColor" />
                      Jugar Partida
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
