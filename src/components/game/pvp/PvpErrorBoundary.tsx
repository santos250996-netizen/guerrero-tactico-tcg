"use client";

// ============================================================================
// PvpErrorBoundary — rescate ante un CRASH de render en la partida PvP.
// Antes, cualquier excepción de React en PvpGame desmontaba el árbol y la
// APK quedaba en negro/congelada sin salida. Ahora mostramos una pantalla de
// recuperación: Reintentar (re-monta) o Salir al menú (limpia el estado PvP).
// ============================================================================

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { usePvpStore } from "@/store/pvpStore";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  attempt: number;
}

export class PvpErrorBoundary extends Component<Props, State> {
  state: State = { error: null, attempt: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[pvp] crash de render atrapado por PvpErrorBoundary:", error, info.componentStack);
  }

  private retry = () => {
    // Re-monta el subtree (attempt cambia la key) y re-sincroniza con el
    // servidor: si el crash fue puntual, la partida sigue donde estaba.
    this.setState((s) => ({ error: null, attempt: s.attempt + 1 }));
    usePvpStore.getState().resync();
  };

  private exitToMenu = () => {
    usePvpStore.getState().exitToMenu();
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="app-frame flex flex-col items-center justify-center gap-4 px-6 text-center text-zinc-100">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-rose-500/50 bg-rose-950/50">
            <AlertTriangle className="h-6 w-6 text-rose-300" />
          </div>
          <div>
            <p
              className="text-sm font-black uppercase tracking-[0.3em] text-rose-300"
              style={{ fontFamily: "var(--font-cinzel), serif" }}
            >
              Algo se rompió
            </p>
            <p className="mt-2 max-w-xs text-[11px] leading-snug text-zinc-400">
              La partida falló al pintarse. Tus datos no se perdieron: reintenta para volver a
              sincronizar con la sala, o sal al menú.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={this.retry}
              className="bg-gradient-to-r from-teal-500 to-emerald-600 text-xs font-black uppercase tracking-wider text-white"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reintentar
            </Button>
            <Button
              onClick={this.exitToMenu}
              variant="outline"
              className="border-zinc-700 bg-zinc-950/60 text-[11px] font-bold uppercase tracking-wider text-zinc-300"
            >
              <Home className="mr-1.5 h-3.5 w-3.5" /> Menú
            </Button>
          </div>
        </div>
      );
    }
    // key={attempt}: fuerza re-montaje completo al reintentar
    return <div key={this.state.attempt} className="contents">{this.props.children}</div>;
  }
}
