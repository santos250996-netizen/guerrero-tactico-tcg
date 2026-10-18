"use client";

// ============================================================================
// HISTORIA · selección de batalla — elige tu clase y el bot al que retas.
// Victoria = 2 cartas aleatorias para la colección (para fusionar).
// ============================================================================

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Crown, Swords, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/store/gameStore";
import { useCollectionStore, hydrateCollection } from "@/store/collectionStore";
import { usePvpStore, HISTORIA_BOTS } from "@/store/pvpStore";
import { CLASS_META, type GameClass } from "@/lib/game/types";
import { ALL_CARDS_V3 } from "@/lib/game/cards";
import { sfx } from "@/lib/sound";
import { useSettings } from "@/lib/settings";

const CLASSES: GameClass[] = ["guerrero", "mago", "asesino"];

const CLASS_ART: Record<GameClass, string> = {
  guerrero: "/menu/lane-armas.png",
  mago: "/menu/lane-arcana.png",
  asesino: "/menu/lane-sigilo.png",
};

export function HistoriaSelect() {
  const setView = useGameStore((s) => s.setView);
  const startHistoria = usePvpStore((s) => s.startHistoria);
  const distinctCards = useCollectionStore((s) => s.distinctCards);
  const totalCopies = useCollectionStore((s) => s.totalCopies);
  const wins = useCollectionStore((s) => s.wins);
  const soundOn = useSettings((s) => s.soundOn);

  const [playerClass, setPlayerClass] = useState<GameClass>("guerrero");
  const [botClass, setBotClass] = useState<GameClass>("mago");

  useEffect(() => {
    hydrateCollection();
  }, []);

  function start() {
    if (soundOn) sfx.click();
    startHistoria({ playerClass, botClass });
  }

  return (
    <div className="app-frame text-zinc-100">
      <main className="app-main mx-auto flex w-full flex-1 flex-col gap-2 overflow-y-auto px-3 py-2">
        {/* Cabecera */}
        <div className="flex items-center justify-between">
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => { if (soundOn) sfx.click(); setView("main-menu"); }}
            className="flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-900/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-300"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Menú
          </motion.button>
          <h1
            className="text-base font-black uppercase tracking-[0.3em] text-amber-300"
            style={{ fontFamily: "var(--font-cinzel), serif" }}
          >
            Historia
          </h1>
          <div className="flex items-center gap-1 rounded-full border border-amber-900/60 bg-amber-950/40 px-2 py-1 text-[9px] font-bold text-amber-300">
            <Trophy className="h-3 w-3" /> {wins}
          </div>
        </div>

        {/* Colección rápida */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-1.5 text-center text-[9px] uppercase tracking-widest text-zinc-400">
          Colección: <span className="font-black text-amber-300">{distinctCards()}</span> / {ALL_CARDS_V3.length} cartas ·{" "}
          <span className="font-black text-amber-300">{totalCopies()}</span> copias
        </div>

        {/* TU CLASE */}
        <p className="mt-1 text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500" style={{ fontFamily: "var(--font-cinzel), serif" }}>
          Tu héroe
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {CLASSES.map((cls) => {
            const meta = CLASS_META[cls];
            const active = playerClass === cls;
            return (
              <motion.button
                key={cls}
                whileTap={{ scale: 0.96 }}
                onClick={() => { if (soundOn) sfx.select(); setPlayerClass(cls); }}
                className={cn(
                  "relative overflow-hidden rounded-lg border-2 transition-colors",
                  active ? "border-amber-400 shadow-[0_0_14px_-2px_rgba(251,191,36,0.6)]" : "border-zinc-800"
                )}
              >
                <div
                  className="h-14 w-full bg-cover bg-center bg-no-repeat"
                  style={{ backgroundImage: `url(${CLASS_ART[cls]})` }}
                />
                <div className={cn("py-1 text-center text-[9px] font-black uppercase tracking-widest", active ? "bg-amber-950/80 text-amber-200" : "bg-zinc-950/90 text-zinc-400")}>
                  {meta.label}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* RIVAL */}
        <p className="mt-1 text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500" style={{ fontFamily: "var(--font-cinzel), serif" }}>
          Tu rival
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {CLASSES.map((cls) => {
            const meta = CLASS_META[cls];
            const active = botClass === cls;
            return (
              <motion.button
                key={cls}
                whileTap={{ scale: 0.96 }}
                onClick={() => { if (soundOn) sfx.select(); setBotClass(cls); }}
                className={cn(
                  "relative overflow-hidden rounded-lg border-2 transition-colors",
                  active ? "border-rose-500 shadow-[0_0_14px_-2px_rgba(244,63,94,0.6)]" : "border-zinc-800"
                )}
              >
                <div className="absolute inset-x-0 top-0 z-10 flex justify-center pt-0.5">
                  {active && <Crown className="h-3 w-3 text-rose-400" />}
                </div>
                <div
                  className={cn("h-14 w-full bg-cover bg-center bg-no-repeat", !active && "opacity-60 grayscale")}
                  style={{ backgroundImage: `url(${CLASS_ART[cls]})` }}
                />
                <div className={cn("truncate px-1 py-1 text-center text-[8px] font-black uppercase tracking-wider", active ? "bg-rose-950/80 text-rose-200" : "bg-zinc-950/90 text-zinc-500")}>
                  {HISTORIA_BOTS[cls].split(",")[0]}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Botón de batalla */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={start}
          className="mt-3 flex items-center justify-center gap-2 rounded-full border border-amber-300/60 bg-gradient-to-b from-amber-600 via-amber-700 to-rose-800 px-8 py-2.5 shadow-[0_4px_18px_-3px_rgba(251,191,36,0.55)]"
        >
          <Swords className="h-4 w-4 text-amber-100" />
          <span
            className="text-lg font-black uppercase tracking-[0.4em] text-amber-50"
            style={{ fontFamily: "var(--font-cinzel), serif", paddingLeft: "0.4em" }}
          >
            Batallar
          </span>
        </motion.button>

        <p className="pb-2 text-center text-[8px] uppercase tracking-[0.25em] text-zinc-600">
          Al vencer: 2 cartas aleatorias · fusiona 3 iguales para mejorarlas
        </p>
      </main>
    </div>
  );
}
