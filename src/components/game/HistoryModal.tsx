"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Trophy, Skull, Equal } from "lucide-react";
import { LANE_META, CLASS_META } from "@/lib/game/types";
import type { LaneId, GameClass } from "@/lib/game/types";
import { cn } from "@/lib/utils";

interface HistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MatchRow {
  id: string;
  result: "WIN" | "LOSS" | "DRAW";
  playerWins: number;
  enemyWins: number;
  draws: number;
  turnsPlayed: number;
  scorePlayer: number;
  scoreEnemy: number;
  laneArmasP: number;
  laneArmasE: number;
  laneProtP: number;
  laneProtE: number;
  laneFuriaP: number;
  laneFuriaE: number;
  gameClass?: "guerrero" | "mago" | "asesino";
  createdAt: string;
}

export function HistoryModal({ open, onOpenChange }: HistoryModalProps) {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // Defer synchronous state update to avoid cascading renders (React 19 rule).
    Promise.resolve().then(() => {
      if (!cancelled) {
        setLoading(true);
        setError(null);
      }
    });
    fetch("/api/matches", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => {
        if (!cancelled) {
          setMatches(data.matches ?? []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("No se pudo cargar el historial.");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const wins = matches.filter((m) => m.result === "WIN").length;
  const losses = matches.filter((m) => m.result === "LOSS").length;
  const draws = matches.filter((m) => m.result === "DRAW").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-zinc-800 bg-zinc-950 text-zinc-200 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-amber-400">Historial de partidas</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Tus últimas {matches.length} partidas guardadas en la base de datos.
          </DialogDescription>
        </DialogHeader>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded border border-emerald-800/40 bg-emerald-950/40 p-2 text-center">
            <Trophy className="mx-auto mb-1 h-4 w-4 text-emerald-400" />
            <div className="text-xl font-bold text-emerald-400">{wins}</div>
            <div className="text-[10px] uppercase text-zinc-500">Victorias</div>
          </div>
          <div className="rounded border border-amber-800/40 bg-amber-950/40 p-2 text-center">
            <Equal className="mx-auto mb-1 h-4 w-4 text-amber-400" />
            <div className="text-xl font-bold text-amber-400">{draws}</div>
            <div className="text-[10px] uppercase text-zinc-500">Empates</div>
          </div>
          <div className="rounded border border-rose-800/40 bg-rose-950/40 p-2 text-center">
            <Skull className="mx-auto mb-1 h-4 w-4 text-rose-400" />
            <div className="text-xl font-bold text-rose-400">{losses}</div>
            <div className="text-[10px] uppercase text-zinc-500">Derrotas</div>
          </div>
        </div>

        {loading && (
          <div className="py-6 text-center text-sm text-zinc-400">Cargando…</div>
        )}
        {error && (
          <div className="rounded border border-rose-800 bg-rose-950/40 p-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        {/* Match list */}
        <div className="mt-2 space-y-1.5">
          {matches.length === 0 && !loading && !error && (
            <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3 text-center text-xs text-zinc-500">
              Aún no hay partidas registradas. ¡Juega una!
            </div>
          )}
          {matches.map((m) => {
            const isWin = m.result === "WIN";
            const isDraw = m.result === "DRAW";
            const Icon = isWin ? Trophy : isDraw ? Equal : Skull;
            const color = isWin
              ? "border-emerald-800/40"
              : isDraw
                ? "border-amber-800/40"
                : "border-rose-800/40";
            const title = isWin ? "Victoria" : isDraw ? "Empate" : "Derrota";
            const date = new Date(m.createdAt);
            const dateStr = date.toLocaleString("es-ES", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <div
                key={m.id}
                className={cn(
                  "rounded border bg-zinc-900/60 p-2 text-xs",
                  color
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Icon
                      className={cn(
                        "h-3.5 w-3.5",
                        isWin
                          ? "text-emerald-400"
                          : isDraw
                            ? "text-amber-400"
                            : "text-rose-400"
                      )}
                    />
                    <span className="font-bold text-zinc-200">{title}</span>
                    <span className="text-zinc-500">·</span>
                    <span className="tabular-nums text-zinc-400">
                      {m.playerWins}-{m.enemyWins}
                      {m.draws ? ` (${m.draws}E)` : ""}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500">{dateStr}</span>
                </div>
                <div className="mt-1 grid grid-cols-3 gap-1 text-[10px]">
                  {(CLASS_META[(m.gameClass as GameClass) ?? "guerrero"]?.lanes ??
                    (["armas", "proteccion", "furia"] as LaneId[])
                  ).map((ln, i) => {
                    const meta = LANE_META[ln];
                    // Los scores están guardados posicionalmente (carril 1/2/3)
                    const p = [m.laneArmasP, m.laneProtP, m.laneFuriaP][i];
                    const e = [m.laneArmasE, m.laneProtE, m.laneFuriaE][i];
                    return (
                      <div
                        key={ln}
                        className="rounded bg-black/30 px-1.5 py-0.5 text-center"
                      >
                        <div className="flex items-center justify-center gap-1 text-zinc-500">
                          <meta.icon className="h-3 w-3" />
                          {meta.title}
                        </div>
                        <div className="tabular-nums">
                          <span className="text-emerald-400">{p}</span>
                          {" · "}
                          <span className="text-rose-400">{e}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
