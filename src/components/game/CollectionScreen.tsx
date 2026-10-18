"use client";

// ============================================================================
// COLECCIÓN — tus copias por rareza y la FUSIÓN: 3 iguales → 1 del tier
// siguiente (+2 de poder por tier, dentro del PTP; véase balance.ts).
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/store/gameStore";
import { useCollectionStore, hydrateCollection } from "@/store/collectionStore";
import { ALL_CARDS_V3, classCardsOf } from "@/lib/game/cards";
import {
  FUSION_COPIES,
  RARITY_LABEL,
  RARITY_ORDER,
  materializeCard,
  nextRarity,
} from "@/lib/game/balance";
import { RARITY_META } from "@/lib/game/types";
import type { GameClass, Rarity } from "@/lib/game/types";
import { sfx } from "@/lib/sound";
import { useSettings } from "@/lib/settings";

const CLASSES: GameClass[] = ["guerrero", "mago", "asesino"];

const TIER_DOT: Record<Rarity, string> = {
  common: "bg-zinc-400",
  rare: "bg-sky-400",
  epic: "bg-fuchsia-400",
  legendary: "bg-amber-400",
};

export function CollectionScreen() {
  const setView = useGameStore((s) => s.setView);
  const soundOn = useSettings((s) => s.soundOn);
  const copies = useCollectionStore((s) => s.copies);
  const fuse = useCollectionStore((s) => s.fuse);
  const canFuse = useCollectionStore((s) => s.canFuse);
  const bestTier = useCollectionStore((s) => s.bestTier);
  const countOf = useCollectionStore((s) => s.countOf);
  const distinctCards = useCollectionStore((s) => s.distinctCards);
  const totalCopies = useCollectionStore((s) => s.totalCopies);

  const [tab, setTab] = useState<GameClass>("guerrero");
  const [fusionMsg, setFusionMsg] = useState<string | null>(null);

  useEffect(() => {
    hydrateCollection();
  }, []);

  const deckCards = useMemo(() => classCardsOf(tab), [tab]);

  function tryFuse(id: string, rarity: Rarity, name: string) {
    const target = fuse(id, rarity);
    if (target && soundOn) sfx.buff();
    setFusionMsg(
      target
        ? `✨ ${name} fusionada: ahora ${RARITY_LABEL[target]} (+2 poder)`
        : null
    );
    setTimeout(() => setFusionMsg(null), 2600);
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
            Colección
          </h1>
          <div className="rounded-full border border-zinc-800 bg-zinc-900/70 px-2 py-1 text-[9px] font-bold text-zinc-300">
            {distinctCards()}/{ALL_CARDS_V3.length} · {totalCopies()} copias
          </div>
        </div>

        {/* Aviso de fusión */}
        <AnimatePresence>
          {fusionMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-950/60 py-1.5 text-[10px] font-bold text-amber-200"
            >
              <Sparkles className="h-3.5 w-3.5" /> {fusionMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pestañas por clase */}
        <div className="grid grid-cols-3 gap-1.5">
          {CLASSES.map((cls) => (
            <button
              key={cls}
              onClick={() => { setTab(cls); if (soundOn) sfx.select(); }}
              className={cn(
                "rounded-lg border py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors",
                tab === cls
                  ? "border-amber-400 bg-amber-950/60 text-amber-200"
                  : "border-zinc-800 bg-zinc-950/70 text-zinc-500"
              )}
              style={{ fontFamily: "var(--font-cinzel), serif" }}
            >
              {cls === "guerrero" ? "Guerrero" : cls === "mago" ? "Mago" : "Asesino"}
            </button>
          ))}
        </div>

        {/* Cómo funciona el bucle de progresión */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-[9px] leading-relaxed text-zinc-400">
          <p className="mb-1 text-center text-[9px] font-black uppercase tracking-[0.3em] text-amber-300/90" style={{ fontFamily: "var(--font-cinzel), serif" }}>
            Cómo funciona
          </p>
          <p className="mb-0.5">
            <span className="font-black text-amber-300">1.</span> Gana partidas de Historia: cada victoria te da{" "}
            <span className="font-bold text-zinc-200">2 cartas aleatorias</span> de cualquier clase.
          </p>
          <p className="mb-0.5">
            <span className="font-black text-amber-300">2.</span> Fusiona{" "}
            <span className="font-bold text-zinc-200">{FUSION_COPIES} copias idénticas</span> del mismo tier → 1 del tier
            siguiente, con <span className="font-bold text-zinc-200">+2 de poder</span> por fusión.
          </p>
          <p>
            <span className="font-black text-amber-300">3.</span> En batalla juegas con tus{" "}
            <span className="font-bold text-zinc-200">12 mejores cartas</span> de la clase. Empiezas con las neutrales;
            el resto se desbloquea jugando.
          </p>
        </div>

        {/* Lista de cartas de la clase */}
        <div className="flex flex-col gap-1.5 pb-3">
          {deckCards.map((card) => {
            const owned = RARITY_ORDER.map((r) => countOf(card.id, r));
            const total = owned.reduce((a, b) => a + b, 0);
            const tier = bestTier(card.id);
            const effective = materializeCard(card, tier);
            const fusionableRarity = RARITY_ORDER.find((r) => canFuse(card.id, r));
            return (
              <div
                key={card.id}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-2 py-1.5",
                  total > 0 ? "border-zinc-800 bg-zinc-950/80" : "border-zinc-900 bg-zinc-950/40 opacity-50"
                )}
              >
                {/* Mini arte */}
                <div
                  className="h-12 w-9 shrink-0 rounded border border-zinc-700 bg-cover bg-center"
                  style={{ backgroundImage: `url(/cards/${card.id}.png)` }}
                />
                {/* Nombre + stats efectivos */}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11px] font-bold text-zinc-200">{card.name}</div>
                  {total > 0 ? (
                    <div className="text-[9px] text-zinc-500">
                      Tu mejor copia:{" "}
                      <span className={cn("font-bold", RARITY_META[tier].textClass)}>
                        {RARITY_LABEL[tier]}
                      </span>{" "}
                      · poder {effective.power}
                      {effective.power !== card.power && (
                        <span className="text-emerald-400"> (+{effective.power - card.power})</span>
                      )}
                    </div>
                  ) : (
                    <div className="text-[9px] text-zinc-600">
                      🔒 Bloqueada · gana partidas para conseguirla
                    </div>
                  )}
                </div>
                {/* Pips por tier + fusión */}
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <div className="flex items-center gap-1">
                    {RARITY_ORDER.map((r, i) => (
                      <span key={r} className="flex items-center gap-0.5" title={`${RARITY_LABEL[r]}: ${owned[i]}`}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", TIER_DOT[r], owned[i] === 0 && "opacity-25")} />
                        <span className={cn("text-[8px] font-bold", owned[i] === 0 ? "text-zinc-600" : "text-zinc-300")}>
                          {owned[i]}
                        </span>
                      </span>
                    ))}
                  </div>
                  {fusionableRarity && (
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={() => tryFuse(card.id, fusionableRarity, card.name)}
                      className="rounded-full border border-amber-400/70 bg-gradient-to-b from-amber-600 to-amber-800 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-amber-100 shadow-[0_0_10px_-2px_rgba(251,191,36,0.7)]"
                    >
                      <Sparkles className="mr-0.5 inline h-2.5 w-2.5" />
                      Fusionar → {RARITY_LABEL[nextRarity(fusionableRarity)!]}
                    </motion.button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

/** Botón compacto para abrir la colección desde el menú. */
export function CollectionMenuButton() {
  const setView = useGameStore((s) => s.setView);
  const soundOn = useSettings((s) => s.soundOn);
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.96 }}
      onClick={() => { if (soundOn) sfx.click(); setView("coleccion"); }}
      className="inline-flex items-center gap-2 rounded-full border border-purple-400/50 bg-gradient-to-b from-purple-800/90 via-purple-950/90 to-zinc-950/90 px-6 py-1.5 text-purple-100 shadow-[0_3px_14px_-3px_rgba(192,132,252,0.4)] transition-all hover:border-purple-300/70"
    >
      <Sparkles className="h-3.5 w-3.5" />
      <span
        className="select-none text-sm font-black uppercase tracking-[0.3em]"
        style={{ fontFamily: "var(--font-cinzel), serif", textShadow: "0 1px 1px rgba(0,0,0,0.9)", paddingLeft: "0.3em" }}
      >
        Colección
      </span>
    </motion.button>
  );
}
