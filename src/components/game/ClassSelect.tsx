"use client";

// ============================================================================
// Entrada del MODO HISTORIA (botón JUGAR del menú): elige tu clase, edita tu
// mazo y a JUGAR — la partida arranca directa contra un BOT ALEATORIO
// (cualquier clase, cualquiera de sus 2 mazos). Sin pantalla intermedia.
// Colección: aquí se entrega el mazo inicial de cada clase (una vez) y se
// muestra cuántas cartas de las 24 tienes desbloqueadas.
// ============================================================================

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import { useCollectionStore, hydrateCollection } from "@/store/collectionStore";
import { usePvpStore } from "@/store/pvpStore";
import { ArrowLeft, ChevronRight, Dices, EyeOff, Library, Lock, Skull, Sparkles, Swords, Wand2 } from "lucide-react";
import type { GameClass } from "@/lib/game/types";
import { CLASS_META } from "@/lib/game/types";
import { classCardsOf } from "@/lib/game/cards";
import { loadStoredProfileBrief } from "@/lib/profile-storage";

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
  // Approximate number of cards in this class's pool (for the "X cartas" badge)
  cardCount: number;
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
    cardCount: 12,
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
    cardCount: 12,
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
    cardCount: 12,
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

export function ClassSelect() {
  const setView = useGameStore((s) => s.setView);
  const selectClass = useGameStore((s) => s.selectClass);
  const loadDeckAndPool = useGameStore((s) => s.loadDeckAndPool);
  const deckLoading = useGameStore((s) => s.deckLoading);
  const setDeckEditorReturn = useGameStore((s) => s.setDeckEditorReturn);
  const startHistoria = usePvpStore((s) => s.startHistoria);
  // `copies` como dependencia de re-render: al ganar cartas cambia el contador.
  const copies = useCollectionStore((s) => s.copies);

  useEffect(() => {
    hydrateCollection();
    // Mazo inicial de CADA clase (una vez): las neutrales + relleno barato.
    ["guerrero", "mago", "asesino"].forEach((c) =>
      useCollectionStore.getState().grantStarterDeck(c as GameClass)
    );
  }, []);

  // Cartas desbloqueadas de la clase (re-renderiza con `copies`).
  function ownedDistinct(cls: GameClass): number {
    return classCardsOf(cls).filter((c) => {
      const t = copies[c.id];
      return !!t && (t.common ?? 0) + (t.rare ?? 0) + (t.epic ?? 0) + (t.legendary ?? 0) > 0;
    }).length;
  }

  // JUGAR PARTIDA → modo historia contra bot aleatorio, SIN más pantallas.
  const quickPlay = async (cls: GameClass) => {
    selectClass(cls);
    if (!deckLoading) await loadDeckAndPool();
    const profileName = loadStoredProfileBrief()?.username ?? "";
    startHistoria({ playerClass: cls, playerName: profileName || undefined });
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
        style={{ backgroundImage: 'url(/menu/main-bg.png)' }}
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
        {/* Rival aleatorio + botín — la partida arranca al tocar JUGAR */}
        <p className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.18em] text-rose-300/80">
          <Dices className="h-2.5 w-2.5" /> Rival aleatorio · ganar: 2 cartas · perder: 1
        </p>
      </motion.div>

      {/* ── Class cards (translucent, color-coded) ── */}
      <main className="app-main relative z-10 mx-auto w-full max-w-md px-3 pb-6 pt-20">
        <div className="flex flex-col gap-3">
          {CLASSES.map((cls, i) => {
            const c = COLOR_MAP[cls.color];
            return (
              <motion.div
                key={cls.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12, duration: 0.5, ease: "easeOut" }}
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
                  <div className="grid grid-cols-5 gap-1.5 border-t border-zinc-800/60 bg-black/30 p-2.5">
                    {/* Personalizar Mazo — secondary, 2/5 width */}
                    <button
                      onClick={() => openDeckEditor(cls.id)}
                      className="col-span-2 flex items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/70 py-2.5 text-[9px] font-black uppercase tracking-wider text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white"
                      title="Personalizar mazo"
                    >
                      <Library className="h-3.5 w-3.5" />
                      <span>Mazo</span>
                    </button>
                    {/* Jugar Partida — primary pill, 3/5 width → MODO HISTORIA (bot aleatorio) */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => quickPlay(cls.id)}
                      className={`col-span-3 flex items-center justify-center gap-2 rounded-lg border bg-gradient-to-r ${c.btnPrimary} py-2.5 text-[10px] font-black uppercase tracking-[0.15em] text-white shadow-md transition-all`}
                      style={{
                        fontFamily: 'var(--font-cinzel), serif',
                      }}
                    >
                      <span>Jugar Partida</span>
                      <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </motion.button>
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
