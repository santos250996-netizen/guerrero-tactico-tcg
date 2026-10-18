"use client";

import { motion } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import { sfx } from "@/lib/sound";
import { useState, useEffect } from "react";
import { User, Settings as SettingsIcon, Wifi } from "lucide-react";
import { SettingsModal } from "./SettingsModal";
import { CollectionMenuButton } from "./CollectionScreen";
import { loadStoredProfileBrief } from "@/lib/profile-storage";

export function MainMenu() {
  const setView = useGameStore((s) => s.setView);

  const [settingsOpen, setSettingsOpen] = useState(false);
  // Avatar elegido en Perfil → visible en el propio botón (si no, icono User).
  const [avatarCardId, setAvatarCardId] = useState<string | null>(null);
  const [avatarBroken, setAvatarBroken] = useState(false);

  useEffect(() => {
    // El menú se remonta en cada cambio de vista → se relee el perfil fresco.
    // Diferido en microtask (mismo patrón que page.tsx) para no hacer setState
    // síncrono dentro del effect y evitar mismatch de hidratación SSR↔cliente.
    let alive = true;
    Promise.resolve().then(() => {
      if (!alive) return;
      const brief = loadStoredProfileBrief();
      setAvatarCardId(brief?.avatarCardId ?? null);
      setAvatarBroken(false);
    });
    return () => { alive = false; };
  }, []);

  const click = () => {
    // Unified sound system (src/lib/sound.ts) — replaces the old
    // `new Audio("/click.mp3")` which 404'd because the asset never existed.
    sfx.click();
  };

  const goToProfile = () => {
    click();
    setView("profile");
  };

  const goToClassSelect = () => {
    click();
    setView("class-select");
  };

  const goToHistoria = () => {
    click();
    setView("historia-select");
  };

  const goToPvp = () => {
    click();
    setView("pvp");
  };

  return (
    <div className="app-frame relative overflow-hidden text-zinc-100">
      {/* Background image — title + emblem baked in (matches launcher icon) */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/menu/main-bg.png)' }}
      />
      {/* Bottom darkening overlay for button legibility */}
      <div className="absolute inset-x-0 bottom-0 z-0 h-2/3 bg-gradient-to-b from-transparent via-black/55 to-black/95" />

      {/* ── TOP-LEFT: PERFIL (small icon button) ── */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        onClick={goToProfile}
        className="absolute left-3 top-3 z-20 flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-amber-500/40 bg-zinc-950/70 backdrop-blur-sm text-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.25)] hover:bg-zinc-900/80 hover:border-amber-400/70"
        title="Perfil"
        aria-label="Perfil"
      >
        {avatarCardId && !avatarBroken ? (
          <img
            src={`/cards/${avatarCardId}.png`}
            alt="Tu avatar"
            className="pointer-events-none h-full w-full rounded-full object-cover"
            decoding="async"
            draggable={false}
            onError={() => setAvatarBroken(true)}
          />
        ) : (
          <User className="h-4 w-4" strokeWidth={2.2} />
        )}
      </motion.button>

      {/* ── BOTTOM-RIGHT: OPCIONES (small icon button — same style as PERFIL) ── */}
      <motion.button
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => { click(); setSettingsOpen(true); }}
        className="absolute bottom-3 right-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-amber-500/40 bg-zinc-950/70 backdrop-blur-sm text-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.25)] transition-colors hover:bg-zinc-900/80 hover:border-amber-400/70"
        title="Opciones"
      >
        <SettingsIcon className="h-4 w-4" strokeWidth={2.2} />
      </motion.button>

      {/* ── CENTER: HISTORIA button (modo principal — JUGAR) ── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
        className="pointer-events-none absolute inset-x-0 bottom-20 z-20 flex justify-center px-6"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.96 }}
          onClick={goToHistoria}
          className="pointer-events-auto group relative inline-flex items-center justify-center rounded-full border border-amber-300/60 bg-gradient-to-b from-amber-600 via-amber-700 to-rose-800 px-10 py-2.5 text-white shadow-[0_4px_18px_-3px_rgba(251,191,36,0.55),0_0_0_1px_rgba(0,0,0,0.4)_inset] transition-all hover:border-amber-200/80 hover:from-amber-500 hover:via-amber-600 hover:to-rose-700"
        >
          {/* Top inner highlight (glossy) */}
          <span className="pointer-events-none absolute inset-x-3 top-0.5 h-1/2 rounded-full bg-gradient-to-b from-white/40 to-transparent opacity-70" />
          {/* The label — Cinzel Black for that Roman-inscription fantasy feel */}
          <span
            className="relative select-none text-2xl font-black uppercase tracking-[0.45em] text-amber-50"
            style={{
              fontFamily: 'var(--font-cinzel), serif',
              textShadow: '0 1px 1px rgba(0,0,0,0.95), 0 0 12px rgba(251,191,36,0.55)',
              paddingLeft: '0.45em',  // optical centering with tracking
            }}
          >
            Historia
          </span>
        </motion.button>
      </motion.div>

      {/* ── BELOW: COLECCIÓN + PRÁCTICA + PVP LOCAL (secondary pills) ── */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.35 }}
        className="pointer-events-none absolute inset-x-0 bottom-11 z-20 flex justify-center gap-2 px-6"
      >
        <div className="pointer-events-auto">
          <CollectionMenuButton />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.42 }}
        className="pointer-events-none absolute inset-x-0 bottom-3.5 z-20 flex justify-center gap-2 px-6"
      >
        <button
          onClick={goToClassSelect}
          className="pointer-events-auto rounded-full border border-zinc-600/60 bg-zinc-950/80 px-4 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400 transition-colors hover:border-zinc-400/70 hover:text-zinc-200"
          style={{ fontFamily: "var(--font-cinzel), serif" }}
        >
          Práctica
        </button>
        <button
          onClick={goToPvp}
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-teal-400/50 bg-gradient-to-b from-teal-800/80 to-zinc-950/90 px-4 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-teal-200 transition-colors hover:border-teal-300/70"
          style={{ fontFamily: "var(--font-cinzel), serif" }}
        >
          <Wifi className="h-3 w-3" /> PvP Local
        </button>
      </motion.div>

      {/* ── TOP-CENTER (version) ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="absolute inset-x-0 top-4 z-20 flex justify-center"
      >
        <p className="text-[8px] font-bold uppercase tracking-[0.4em] text-amber-700/70">
          v2.2 · 72 cartas · progresión por colección
        </p>
      </motion.div>

      {/* Settings modal overlay */}
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
