"use client";

import { useEffect } from "react";
import { usePvpStore } from "@/store/pvpStore";
import { PvpSetup } from "./PvpSetup";
import { PvpLobby } from "./PvpLobby";
import { PvpGame } from "./PvpGame";

/** Raíz del flujo PvP: setup → lobby → partida. Reanuda sesión si refrescas. */
export function PvpRoot() {
  const screen = usePvpStore((s) => s.screen);
  const tryResume = usePvpStore((s) => s.tryResume);

  useEffect(() => {
    tryResume();
    // Limpieza: si algo externo cambia la vista (p.ej. "Salir al menú" de
    // Opciones), detenemos el polling al desmontar.
    return () => {
      usePvpStore.getState().stopPolling();
    };
  }, [tryResume]);

  if (screen === "setup") return <PvpSetup />;
  if (screen === "lobby") return <PvpLobby />;
  return <PvpGame />;
}
