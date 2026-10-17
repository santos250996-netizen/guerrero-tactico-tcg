"use client";

// ============================================================================
// PvpLobby — sala de espera: código gigante para compartir, URLs LAN del
// anfitrión (para abrir el juego en el otro dispositivo por hotspot/WiFi) y
// estado de ambos jugadores. Cuando el rival se une, la partida arranca sola.
// ============================================================================

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Copy, Check, Loader2, Smartphone, Wifi } from "lucide-react";
import { usePvpStore } from "@/store/pvpStore";
import { CLASS_META } from "@/lib/game/types";
import { sfx } from "@/lib/sound";
import { cn } from "@/lib/utils";

export function PvpLobby() {
  const code = usePvpStore((s) => s.code);
  const view = usePvpStore((s) => s.view);
  const lanUrls = usePvpStore((s) => s.lanUrls);
  const mySide = usePvpStore((s) => s.mySide);
  const openSetup = usePvpStore((s) => s.openSetup);
  const copyShareUrl = usePvpStore((s) => s.copyShareUrl);
  const [copied, setCopied] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // refresca el indicador de copiado
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  const host = view?.lobby;
  const isHost = mySide === "a";
  const guestJoined = !!host?.guestJoined;

  return (
    <div className="app-frame text-zinc-100">
      <div className="mx-auto flex h-full w-full max-w-md flex-col px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => { sfx.click(); openSetup(); }}
            className="flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-300 hover:bg-zinc-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Salir
          </button>
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400" style={{ fontFamily: "var(--font-cinzel), serif" }}>
            Sala de espera
          </div>
          <div className="w-16" />
        </div>

        {/* Código gigante */}
        <div className="mt-5 text-center">
          <div className="text-[9px] font-bold uppercase tracking-[0.35em] text-zinc-500">Código de sala</div>
          <div
            className="mt-1 text-6xl font-black tracking-[0.25em] text-amber-300"
            style={{ fontFamily: "var(--font-cinzel), serif", textShadow: "0 0 24px rgba(251,191,36,0.4)" }}
          >
            {code}
          </div>
          <button
            onClick={async () => { await copyShareUrl(); setCopied(true); }}
            disabled={lanUrls.length === 0}
            className="mx-auto mt-2 flex items-center gap-1.5 rounded-full border border-amber-600/40 bg-amber-950/40 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300 hover:bg-amber-900/40 disabled:opacity-40"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copiado" : "Copiar enlace + código"}
          </button>
        </div>

        {/* URLs LAN (anfitrión) */}
        {isHost && lanUrls.length > 0 && (
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-500">
              <Wifi className="h-3 w-3" /> Enlace directo en tu red
            </div>
            {lanUrls.slice(0, 3).map((url) => (
              <div key={url} className="truncate rounded bg-black/40 px-2 py-1 font-mono text-[10px] text-teal-300">
                {url}
              </div>
            ))}
            <button
              onClick={() => setShowHelp((v) => !v)}
              className="mt-1.5 text-[9px] uppercase tracking-wider text-zinc-500 underline-offset-2 hover:underline"
            >
              {showHelp ? "Ocultar ayuda" : "¿Cómo invito a mi rival?"}
            </button>
            {showHelp && (
              <ol className="mt-1 list-decimal space-y-1 pl-4 text-[9px] leading-relaxed text-zinc-400">
                <li>El anfitrión crea un <b>hotspot</b> (o ambos se conectan al mismo WiFi).</li>
                <li>El rival abre el navegador y entra a una de las URLs de arriba.</li>
                <li>En la pantalla PvP escribe el código de sala y pulsa <b>Unirse</b>.</li>
                <li>La partida arranca sola con <b>sorteo aleatorio</b> de quién empieza.</li>
              </ol>
            )}
          </div>
        )}

        {/* Jugadores */}
        <div className="mt-4 space-y-2">
          <PlayerRow name={host?.hostName ?? "Anfitrión"} gameClass={host?.hostClass} label={isHost ? "Tú (anfitrión)" : "Anfitrión"} connected />
          <PlayerRow
            name={guestJoined ? host!.guestName : "Esperando rival…"}
            gameClass={guestJoined ? host!.guestClass : undefined}
            label={!isHost ? "Tú (invitado)" : "Invitado"}
            connected={guestJoined}
            waiting={!guestJoined}
          />
        </div>

        {/* Estado */}
        <div className="mt-auto pb-3 text-center">
          {guestJoined ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-full border border-emerald-500/50 bg-emerald-950/50 px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-300"
            >
              ¡Rival conectado! Entrando a la batalla…
            </motion.div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Esperando al rival…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlayerRow({ name, gameClass, label, connected, waiting }: {
  name: string;
  gameClass?: import("@/lib/game/types").GameClass;
  label: string;
  connected: boolean;
  waiting?: boolean;
}) {
  const Icon = gameClass ? CLASS_META[gameClass].icon : Smartphone;
  return (
    <div className={cn(
      "flex items-center gap-3 rounded-xl border bg-zinc-950/70 px-3 py-2.5",
      connected ? "border-emerald-700/40" : "border-zinc-800"
    )}>
      <div className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full border",
        connected ? "border-amber-500/50 bg-amber-950/40" : "border-zinc-800 bg-zinc-900"
      )}>
        <Icon className={cn("h-5 w-5", connected ? "text-amber-300" : "text-zinc-600")} strokeWidth={2.2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold text-zinc-100">{name}</div>
        <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
          {label}{gameClass ? ` · ${CLASS_META[gameClass].label}` : ""}
        </div>
      </div>
      <div className={cn(
        "h-2.5 w-2.5 rounded-full",
        connected ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-zinc-700"
      )} title={connected ? "Conectado" : "Esperando…"} />
    </div>
  );
}
