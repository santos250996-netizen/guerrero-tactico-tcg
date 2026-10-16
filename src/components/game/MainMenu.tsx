"use client";

import { motion } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import { useSettings } from "@/lib/settings";
import { useState } from "react";
import { User, Settings as SettingsIcon, Play, ChevronRight } from "lucide-react";
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

  const navigate = (view: "class-select" | "profile") => {
    click();
    setView(view);
  };

  return (
    <div className="app-frame relative overflow-hidden text-zinc-100">
      {/* Background image — has the 'PACTO DE GUERRA' title baked in */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/menu/main-bg.png)' }}
      />
      {/* Bottom darkening overlay so buttons read clearly */}
      <div className="absolute inset-x-0 bottom-0 z-0 h-2/3 bg-gradient-to-b from-transparent via-black/55 to-black/90" />

      {/* Content layer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 flex h-full w-full flex-col justify-end px-6 pb-10"
      >
        {/* ────────────────── MENU BUTTONS ────────────────── */}
        <nav className="mx-auto flex w-full max-w-xs flex-col gap-2.5">
          <MenuButton
            icon={<Play className="h-5 w-5" strokeWidth={2.5} />}
            label="JUGAR"
            sublabel="Iniciar batalla"
            variant="primary"
            onClick={() => navigate("class-select")}
          />
          <MenuButton
            icon={<User className="h-5 w-5" />}
            label="PERFIL"
            sublabel="Estadísticas del comandante"
            variant="secondary"
            onClick={() => navigate("profile")}
          />
          <MenuButton
            icon={<SettingsIcon className="h-5 w-5" />}
            label="OPCIONES"
            sublabel="Sonido, animaciones"
            variant="utility"
            onClick={() => { click(); setSettingsOpen(true); }}
          />
        </nav>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-5 flex flex-col items-center gap-0.5"
        >
          <p className="text-[8px] font-bold uppercase tracking-[0.4em] text-amber-700/80">
            v2.0 · 94 cartas · 33 keywords
          </p>
          <p className="text-[7px] uppercase tracking-widest text-zinc-700">
            Sincroniza para compilar APK
          </p>
        </motion.div>
      </motion.div>

      {/* Settings modal overlay */}
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}

function MenuButton({
  icon,
  label,
  sublabel,
  variant,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  variant: "primary" | "secondary" | "utility";
  onClick: () => void;
}) {
  const styles = {
    primary:
      "bg-gradient-to-r from-amber-700 via-amber-600 to-rose-700 text-white shadow-[0_6px_24px_-6px_rgba(251,191,36,0.6)] hover:from-amber-600 hover:via-amber-500 hover:to-rose-600 border-amber-400/40",
    secondary:
      "bg-zinc-900/80 backdrop-blur-sm text-zinc-100 border-zinc-700/80 hover:bg-zinc-800/80 hover:border-zinc-600",
    utility:
      "bg-black/60 backdrop-blur-sm text-zinc-400 border-zinc-800/80 hover:bg-zinc-900/70 hover:text-zinc-200",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02, x: 2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-all ${styles[variant]}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black/30">
        {icon}
      </span>
      <span className="flex flex-1 flex-col">
        <span className="text-sm font-black uppercase tracking-[0.18em]">
          {label}
        </span>
        <span className={`text-[10px] font-medium uppercase tracking-wider ${
          variant === "primary" ? "text-amber-100/80" : "text-zinc-500"
        }`}>
          {sublabel}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 opacity-50" />
    </motion.button>
  );
}
