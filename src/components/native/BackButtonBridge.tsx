"use client";

// ============================================================================
// BackButtonBridge — traduce el botón "atrás" hardware de Android a navegación
// interna de la app. Sin esto, el botón atrás CIERRA la aplicación: las vistas
// (menú/perfil/editor/juego/PvP) son estado de Zustand (setView), no rutas del
// navegador, así que el WebView no tiene historial al que volver.
//
// Comportamiento:
//   · Modal abierto (Radix Dialog)        → lo cierra (simula Escape)
//   · Dentro de PvP (partida o lobby)     → un nivel atrás (setup del PvP)
//   · Perfil / Editor / Seleccion / Juego → menú principal
//   · Menú principal                      → 2 pulsaciones seguidas = salir
//
// Solo se activa en el APK (isNativePlatform); en el navegador es un no-op.
// ============================================================================

import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { useGameStore } from "@/store/gameStore";
import { usePvpStore } from "@/store/pvpStore";
import { toast } from "@/hooks/use-toast";

const EXIT_CONFIRM_MS = 2200;

export function BackButtonBridge() {
  const lastBackAt = useRef(0);

  useEffect(() => {
    // Solo interesa en el build nativo (APK). En web, el botón atrás del
    // navegador ya navega el historial por su cuenta.
    if (!Capacitor.isNativePlatform()) return;

    let disposed = false;
    let removeListener: (() => void) | null = null;

    (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("backButton", () => {
          // 1) Un modal abierto tiene prioridad: cerrarlo, no navegar.
          //    Radix (Dialog/Select/…) cierra con la tecla Escape — le
          //    despachamos un keydown sintético que su DismissableLayer escucha.
          const openDialog = document.querySelector('[role="dialog"][data-state="open"]');
          if (openDialog) {
            document.dispatchEvent(
              new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
            );
            return;
          }

          const game = useGameStore.getState();

          // 2) PvP: un nivel atrás dentro de su propio flujo.
          if (game.view === "pvp") {
            const pvp = usePvpStore.getState();
            if (pvp.screen === "game" || pvp.screen === "lobby") {
              // Detiene polling/servidor local y vuelve al setup del PvP.
              pvp.exitToMenu();
              return;
            }
            // screen === "setup" → atrás de verdad: al menú principal.
            game.setView("main-menu");
            return;
          }

          // 3) Resto de vistas → menú principal.
          if (game.view !== "main-menu") {
            game.setView("main-menu");
            return;
          }

          // 4) Ya en el menú: doble pulsación para salir (patrón Android).
          const now = Date.now();
          if (now - lastBackAt.current < EXIT_CONFIRM_MS) {
            void App.exitApp();
            return;
          }
          lastBackAt.current = now;
          toast({
            title: "Pulsa atrás otra vez para salir",
            duration: EXIT_CONFIRM_MS,
          });
        });

        if (disposed) {
          void handle.remove();
          return;
        }
        removeListener = () => { void handle.remove(); };
      } catch {
        // Plugin no disponible (p.ej. build web inesperada): ignorar.
      }
    })();

    return () => {
      disposed = true;
      removeListener?.();
    };
  }, []);

  // No renderiza nada — es solo un puente nativo.
  return null;
}
