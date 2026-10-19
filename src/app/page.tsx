"use client";

import { useEffect } from "react";
import { useGameStore } from "@/store/gameStore";
import { MainMenu } from "@/components/game/MainMenu";
import { ClassSelect } from "@/components/game/ClassSelect";
import { CollectionScreen } from "@/components/game/CollectionScreen";
import { ProfileScreen } from "@/components/game/ProfileScreen";
import { DeckEditor } from "@/components/game/DeckEditor";
import { PvpRoot } from "@/components/game/pvp/PvpRoot";
import { Loader2 } from "lucide-react";

export default function Home() {
  const loadDeckAndPool = useGameStore((s) => s.loadDeckAndPool);
  const deckLoading = useGameStore((s) => s.deckLoading);
  const view = useGameStore((s) => s.view);

  // Precarga el pool y el mazo de la clase por defecto al arrancar (el editor
  // y el flujo de clase vuelven a cargarlo si la clase cambia).
  useEffect(() => {
    void loadDeckAndPool();
  }, [loadDeckAndPool]);

  if (view === "coleccion") return <CollectionScreen />;
  if (view === "class-select") return <ClassSelect />;
  if (view === "profile") return <ProfileScreen />;
  if (view === "editor") return <DeckEditor />;
  if (view === "pvp") return <PvpRoot />;
  if (deckLoading) {
    return (
      <div className="app-frame items-center justify-center text-zinc-100">
        <Loader2 className="h-10 w-10 animate-spin text-amber-400" />
        <div className="mt-3 text-sm font-bold uppercase tracking-widest text-amber-400">Cargando…</div>
      </div>
    );
  }
  // "main-menu" y cualquier valor desconocido → menú principal (fallback seguro).
  return <MainMenu />;
}
