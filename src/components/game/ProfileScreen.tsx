"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import { ArrowLeft, User, Trophy, Swords, Crown } from "lucide-react";

interface ProfileData {
  username: string;
  level: number;
  totalMatches: number;
  wins: number;
  losses: number;
  draws: number;
  favoriteClass: string;
  totalCardsPlayed: number;
  totalEnemyDestroyed: number;
}

const DEFAULT_PROFILE: ProfileData = {
  username: "Comandante",
  level: 1,
  totalMatches: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  favoriteClass: "Guerrero",
  totalCardsPlayed: 0,
  totalEnemyDestroyed: 0,
};

function loadProfile(): ProfileData {
  try {
    const saved = localStorage.getItem("pacto-de-guerra-profile");
    if (saved) {
      return { ...DEFAULT_PROFILE, ...JSON.parse(saved) };
    }
  } catch {}
  return DEFAULT_PROFILE;
}

function saveProfile(data: ProfileData) {
  try {
    localStorage.setItem("pacto-de-guerra-profile", JSON.stringify(data));
  } catch {}
}

export function recordMatchResult(result: "WIN" | "LOSS" | "DRAW") {
  const profile = loadProfile();
  profile.totalMatches++;
  if (result === "WIN") profile.wins++;
  else if (result === "LOSS") profile.losses++;
  else profile.draws++;
  profile.level = Math.floor(profile.totalMatches / 5) + 1;
  saveProfile(profile);
}

export function ProfileScreen() {
  const setView = useGameStore((s) => s.setView);
  const [profile, setProfile] = useState<ProfileData>(DEFAULT_PROFILE);
  const [editing, setEditing] = useState(false);
  const [tempName, setTempName] = useState("");

  useEffect(() => {
    setProfile(loadProfile());
  }, []);

  const winrate = profile.totalMatches > 0
    ? Math.round((profile.wins / profile.totalMatches) * 100)
    : 0;

  const handleSaveName = () => {
    if (tempName.trim().length > 0) {
      const updated = { ...profile, username: tempName.trim().slice(0, 20) };
      setProfile(updated);
      saveProfile(updated);
    }
    setEditing(false);
  };

  return (
    <div className="app-frame items-center justify-center text-zinc-100">
      {/* Back button */}
      <button
        onClick={() => setView("main-menu")}
        className="absolute left-3 top-3 flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex w-80 flex-col gap-4"
      >
        <h2 className="text-center text-2xl font-black uppercase tracking-[0.15em] text-amber-400">
          Perfil
        </h2>

        {/* Profile header */}
        <div className="flex items-center gap-4 rounded-xl border border-zinc-700 bg-zinc-900 p-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-amber-500/50 bg-amber-900/30">
            <User className="h-8 w-8 text-amber-400" />
          </div>
          <div className="flex-1">
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  maxLength={20}
                  className="w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-white outline-none focus:border-amber-500"
                  placeholder="Nombre..."
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                />
                <button
                  onClick={handleSaveName}
                  className="rounded bg-amber-600 px-2 py-1 text-[10px] font-bold text-white"
                >
                  OK
                </button>
              </div>
            ) : (
              <button onClick={() => { setTempName(profile.username); setEditing(true); }}>
                <h3 className="text-lg font-bold text-white">{profile.username}</h3>
              </button>
            )}
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">
              Nivel {profile.level}
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          <StatCard icon={<Trophy className="h-4 w-4" />} label="Partidas" value={profile.totalMatches} color="amber" />
          <StatCard icon={<Crown className="h-4 w-4" />} label="Victorias" value={profile.wins} color="emerald" />
          <StatCard icon={<Swords className="h-4 w-4" />} label="Derrotas" value={profile.losses} color="rose" />
          <StatCard icon={<Trophy className="h-4 w-4" />} label="Winrate" value={`${winrate}%`} color="amber" />
        </div>

        {/* Extra stats */}
        <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-3">
          <h4 className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Estadísticas de Batalla
          </h4>
          <div className="flex flex-col gap-1.5 text-[11px]">
            <StatRow label="Empates" value={profile.draws} />
            <StatRow label="Clase Favorita" value={profile.favoriteClass} />
            <StatRow label="Cartas Jugadas" value={profile.totalCardsPlayed} />
            <StatRow label="Enemigos Destruidos" value={profile.totalEnemyDestroyed} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    amber: "border-amber-600/40 bg-amber-950/30 text-amber-300",
    emerald: "border-emerald-600/40 bg-emerald-950/30 text-emerald-300",
    rose: "border-rose-600/40 bg-rose-950/30 text-rose-300",
  };
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${colors[color]}`}>
      {icon}
      <div>
        <div className="text-[8px] uppercase tracking-wider opacity-70">{label}</div>
        <div className="text-base font-black tabular-nums">{value}</div>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className="font-bold tabular-nums text-zinc-200">{value}</span>
    </div>
  );
}
