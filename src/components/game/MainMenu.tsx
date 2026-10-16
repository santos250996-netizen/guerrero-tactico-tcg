"use client";

import { motion } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import { useSettings } from "@/lib/settings";
import { useState } from "react";
import { User, Settings as SettingsIcon, Play } from "lucide-react";
import { SettingsModal } from "./SettingsModal";

export function MainMenu() {
  const setView = useGameStore((s) => s.setView);
  const soundOn = useSettings((s) => s.soundOn);

  const [settingsOpen, setSettingsOpen] = useState(false);

  const click = () => {
    if (soundOn) {
      const audio = new Audio("/click.mp3");
      audio.volume = 0.3;
      audio.play().catch(() => {});
    }
  };

  const goToProfile = () => {
    click();
    setView("profile");
  };

  const goToClassSelect = () => {
    click();
    setView("class-select");
  };

  return (
    <div className="app-frame relative overflow-hidden text-zinc-100">
      {/* Background image — title baked in */}
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
        className="absolute left-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-amber-500/40 bg-zinc-950/70 backdrop-blur-sm text-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.25)] hover:bg-zinc-900/80 hover:border-amber-400/70"
        title="Perfil"
      >
        <User className="h-4 w-4" strokeWidth={2.2} />
      </motion.button>

      {/* ── BOTTOM-RIGHT: OPCIONES (small icon button) ── */}
      <motion.button
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => { click(); setSettingsOpen(true); }}
        className="absolute bottom-3 right-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-600/60 bg-zinc-950/70 backdrop-blur-sm text-zinc-300 shadow-[0_0_14px_rgba(0,0,0,0.6)] hover:bg-zinc-900/80 hover:text-zinc-100 hover:border-zinc-400/60"
        title="Opciones"
      >
        <SettingsIcon className="h-4 w-4" strokeWidth={2.2} />
      </motion.button>

      {/* ── CENTER: JUGAR button (prominent, professional) ── */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
        className="absolute inset-x-0 bottom-24 z-20 flex flex-col items-center gap-2 px-6"
      >
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={goToClassSelect}
          className="group relative flex w-full max-w-[260px] items-center justify-center gap-3 overflow-hidden rounded-xl border-2 border-amber-400/50 bg-gradient-to-r from-amber-700 via-amber-600 to-rose-700 px-6 py-4 text-white shadow-[0_8px_30px_-6px_rgba(251,191,36,0.6),0_0_0_1px_rgba(0,0,0,0.4)] transition-all hover:border-amber-300/80 hover:from-amber-600 hover:via-amber-500 hover:to-rose-600"
        >
          {/* Inner shine (top highlight) */}
          <span className="pointer-events-none absolute inset-x-2 top-1 h-1/3 rounded-full bg-gradient-to-b from-white/30 to-transparent opacity-60" />
          {/* Icon disc */}
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-black/30 ring-1 ring-amber-300/40">
            <Play className="h-4 w-4" fill="currentColor" strokeWidth={2.4} />
          </span>
          {/* Label */}
          <span className="relative flex flex-col leading-none">
            <span className="text-base font-black uppercase tracking-[0.22em]" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}>
              Jugar
            </span>
            <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.3em] text-amber-100/80">
              Iniciar batalla
            </span>
          </span>
        </motion.button>
      </motion.div>

      {/* ── FOOTER (version) ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="absolute inset-x-0 bottom-2 z-20 flex justify-center"
      >
        <p className="text-[8px] font-bold uppercase tracking-[0.4em] text-amber-700/70">
          v2.0 · 94 cartas · 33 keywords
        </p>
      </motion.div>

      {/* Settings modal overlay */}
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
