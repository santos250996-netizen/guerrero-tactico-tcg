"use client";

import { useEffect } from "react";
import { usePvpStore } from "@/store/pvpStore";
import { PvpSetup } from "./PvpSetup";
import { PvpLobby } from "./PvpLobby";
import { PvpGame } from "./PvpGame";
import { PvpErrorBoundary } from "./PvpErrorBoundary";

/** Raíz del flujo PvP: setup → lobby → partida. Reanuda sesión si refrescas.
 *  Toda la partida vive dentro de PvpErrorBoundary: un crash de render nunca
 *  deja la APK congelada — ofrece Reintentar / Salir al menú. */
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

  return (
    <PvpErrorBoundary>
      {screen === "setup" ? <PvpSetup /> : screen === "lobby" ? <PvpLobby /> : <PvpGame />}
    </PvpErrorBoundary>
  );
}
