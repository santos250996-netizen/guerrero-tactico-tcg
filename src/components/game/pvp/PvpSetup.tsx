"use client";

// ============================================================================
// PvpSetup — pantalla de entrada al PvP local: elige nombre + clase y crea una
// sala o únete con el código de 4 letras que te pase el anfitrión.
// ============================================================================

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Swords, Wand2, EyeOff, Radio, LogIn, Loader2, Wifi } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { usePvpStore } from "@/store/pvpStore";
import type { GameClass } from "@/lib/game/types";
import { CLASS_META } from "@/lib/game/types";
import { LOCAL_PVP_PORT } from "@/lib/pvp/local-server";
import { sfx } from "@/lib/sound";
import { cn } from "@/lib/utils";

const CLASS_PICKS: { id: GameClass; icon: LucideIcon; ring: string; glow: string; text: string }[] = [
  { id: "guerrero", icon: Swords, ring: "border-amber-400/70", glow: "shadow-[0_0_22px_rgba(251,191,36,0.3)]", text: "text-amber-300" },
  { id: "mago", icon: Wand2, ring: "border-violet-400/70", glow: "shadow-[0_0_22px_rgba(168,85,247,0.3)]", text: "text-violet-300" },
  { id: "asesino", icon: EyeOff, ring: "border-emerald-400/70", glow: "shadow-[0_0_22px_rgba(52,211,153,0.3)]", text: "text-emerald-300" },
];

export function PvpSetup() {
  const playerName = usePvpStore((s) => s.playerName);
  const gameClass = usePvpStore((s) => s.gameClass);
  const joinCode = usePvpStore((s) => s.joinCode);
  const hostIp = usePvpStore((s) => s.hostIp);
  const busy = usePvpStore((s) => s.busy);
  const error = usePvpStore((s) => s.error);
  const setName = usePvpStore((s) => s.setName);
  const setGameClass = usePvpStore((s) => s.setGameClass);
  const setJoinCode = usePvpStore((s) => s.setJoinCode);
  const setHostIp = usePvpStore((s) => s.setHostIp);
  const createRoom = usePvpStore((s) => s.createRoom);
  const joinRoom = usePvpStore((s) => s.joinRoom);
  const exitToMenu = usePvpStore((s) => s.exitToMenu);

  // Solo en la APK existe modo sin internet (servidor dentro de la app).
  const isNative = Capacitor.isNativePlatform();
  const [isNativeState] = useState(isNative);
  useEffect(() => {
    // noop — isNative se evalúa en cliente tras hidratar
  }, []);

  return (
    <div className="app-frame text-zinc-100">
      <div className="mx-auto flex h-full w-full max-w-md flex-col px-4 py-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => { sfx.click(); exitToMenu(); }}
            className="flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-300 hover:bg-zinc-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Menú
          </button>
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-amber-400" style={{ fontFamily: "var(--font-cinzel), serif" }}>
            <Radio className="h-4 w-4" /> PvP Local
          </div>
          <div className="w-16" />
        </div>

        <p className="mt-2 text-center text-[10px] leading-relaxed text-zinc-500">
          {isNativeState ? (
            <>
              <b className="text-amber-400">Sin internet:</b> el anfitrión activa su hotspot y crea
              la sala; el rival se conecta al WiFi del hotspot y une con el código + la IP que
              muestra la pantalla del anfitrión.
            </>
          ) : (
            <>
              Dos jugadores en la misma red WiFi o hotspot. El anfitrión crea la sala y
              comparte el código; el rival se une desde su dispositivo.
            </>
          )}
        </p>

        {/* Nombre */}
        <div className="mt-3">
          <label className="mb-1 block text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-500">Tu nombre</label>
          <input
            value={playerName}
            onChange={(e) => setName(e.target.value.slice(0, 16))}
            placeholder="Ej: Thralgrim"
            className="w-full rounded-lg border border-amber-700/40 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/70 focus:outline-none"
          />
        </div>

        {/* Clase */}
        <div className="mt-3">
          <label className="mb-1 block text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-500">Tu clase</label>
          <div className="grid grid-cols-3 gap-2">
            {CLASS_PICKS.map((pick) => {
              const meta = CLASS_META[pick.id];
              const selected = gameClass === pick.id;
              return (
                <motion.button
                  key={pick.id}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { sfx.select(); setGameClass(pick.id); }}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border bg-zinc-950/60 px-2 py-2.5 transition-all",
                    selected ? cn(pick.ring, pick.glow, "bg-zinc-900/80") : "border-zinc-800"
                  )}
                >
                  <pick.icon className={cn("h-6 w-6", selected ? pick.text : "text-zinc-500")} strokeWidth={2.2} />
                  <span className={cn("text-[10px] font-black uppercase tracking-wider", selected ? pick.text : "text-zinc-400")}>
                    {meta.label}
                  </span>
                  <span className="text-center text-[7px] leading-tight text-zinc-600">{meta.tagline}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-3 rounded-lg border border-rose-800/50 bg-rose-950/40 px-3 py-2 text-[10px] text-rose-200">
            {error}
          </div>
        )}

        {/* Acciones */}
        <div className="mt-auto space-y-3 pb-2">
          {/* Crear */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            disabled={busy}
            onClick={() => { sfx.click(); createRoom(); }}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-amber-300/60 bg-gradient-to-b from-amber-600 via-amber-700 to-rose-800 px-6 py-3 text-sm font-black uppercase tracking-[0.3em] text-amber-50 shadow-[0_4px_18px_-3px_rgba(251,191,36,0.55)] disabled:opacity-60"
            style={{ fontFamily: "var(--font-cinzel), serif" }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
            Crear sala (anfitrión)
          </motion.button>

          {/* Unirse */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
            <div className="mb-2 text-center text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-500">
              ¿Tienes un código?
            </div>
            {isNativeState && (
              <div className="mb-2">
                <label className="mb-1 block text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-500">
                  IP del anfitrión (ver su pantalla de sala)
                </label>
                <input
                  value={hostIp}
                  onChange={(e) => setHostIp(e.target.value.trim())}
                  placeholder={`192.168.43.1 (hotspot típico)`}
                  inputMode="decimal"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-center text-sm font-bold tracking-wider text-teal-200 placeholder:text-zinc-700 focus:border-teal-500/70 focus:outline-none"
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="ABCD"
                inputMode="text"
                autoCapitalize="characters"
                className="w-28 rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-center text-lg font-black tracking-[0.35em] text-amber-300 placeholder:text-zinc-700 focus:border-amber-500/70 focus:outline-none"
                style={{ fontFamily: "var(--font-cinzel), serif" }}
              />
              <motion.button
                whileTap={{ scale: 0.97 }}
                disabled={busy || joinCode.length !== 4}
                onClick={() => { sfx.click(); joinRoom(); }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-teal-500/50 bg-gradient-to-r from-teal-600 to-emerald-700 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-900/40 disabled:opacity-40"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                Unirse
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
