"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import { ArrowLeft, Check, X } from "lucide-react";

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

const STORAGE_KEY = "pacto-de-guerra-profile";
// XP needed to advance from level N to level N+1 (linear 5 matches per level)
const MATCHES_PER_LEVEL = 5;

function loadProfile(): ProfileData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_PROFILE, ...JSON.parse(saved) };
    }
  } catch {}
  return DEFAULT_PROFILE;
}

function saveProfile(data: ProfileData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export function recordMatchResult(result: "WIN" | "LOSS" | "DRAW") {
  const profile = loadProfile();
  profile.totalMatches++;
  if (result === "WIN") profile.wins++;
  else if (result === "LOSS") profile.losses++;
  else profile.draws++;
  profile.level = Math.floor(profile.totalMatches / MATCHES_PER_LEVEL) + 1;
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

  // XP progress within current level (matches into this level / matches per level)
  const matchesIntoLevel = profile.totalMatches % MATCHES_PER_LEVEL;
  const xpPct = (matchesIntoLevel / MATCHES_PER_LEVEL) * 100;

  const startEditing = () => {
    setTempName(profile.username);
    setEditing(true);
  };

  const handleSaveName = () => {
    const trimmed = tempName.trim().slice(0, 20);
    if (trimmed.length > 0) {
      const updated = { ...profile, username: trimmed };
      setProfile(updated);
      saveProfile(updated);
    }
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setTempName("");
  };

  return (
    <div className="app-frame relative overflow-hidden text-zinc-100">
      {/* ── Background: blurred stylized-realism backdrop ── */}
      <div
        className="absolute inset-0 z-0 scale-110 bg-cover bg-center blur-[6px]"
        style={{ backgroundImage: 'url(/menu/main-bg.png)' }}
      />
      <div className="absolute inset-0 z-0 bg-black/75" />

      {/* ── Back button (top-left, matches menu's PERFIL button style) ── */}
      <button
        onClick={() => setView("main-menu")}
        className="absolute left-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-amber-500/40 bg-zinc-950/70 backdrop-blur-sm text-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.25)] transition-colors hover:bg-zinc-900/80 hover:border-amber-400/70"
        title="Volver"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2.2} />
      </button>

      {/* ── Title at the top ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute inset-x-0 top-3 z-20 flex justify-center"
      >
        <h2
          className="text-sm font-black uppercase tracking-[0.4em] text-amber-400"
          style={{
            fontFamily: 'var(--font-cinzel), serif',
            textShadow: '0 0 10px rgba(251,191,36,0.5), 0 1px 2px rgba(0,0,0,0.9)',
          }}
        >
          Perfil
        </h2>
      </motion.div>

      {/* ── Main scroll container ── */}
      <main className="app-main relative z-10 mx-auto w-full max-w-md px-4 pb-6 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          className="flex flex-col gap-4"
        >
          {/* ────────────── PROFILE HEADER ────────────── */}
          <section className="flex flex-col items-center gap-3 rounded-2xl border border-amber-600/40 bg-zinc-950/70 p-5 shadow-[0_0_30px_rgba(251,191,36,0.15)] backdrop-blur-sm">
            {/* Avatar — the transparent game icon in a gold-ringed frame */}
            <div className="relative">
              {/* Outer gold ring */}
              <div className="absolute -inset-1.5 rounded-full bg-gradient-to-br from-amber-400/60 via-amber-600/40 to-rose-700/50 blur-[1px]" />
              <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-amber-400/60 bg-zinc-950 shadow-[0_0_20px_rgba(251,191,36,0.3)]">
                {/* The transparent game icon as the avatar */}
                <img
                  src="/menu/game-icon-transparent.png"
                  alt="Avatar"
                  className="h-full w-full scale-110 object-contain"
                  style={{ imageRendering: 'auto' }}
                />
              </div>
            </div>

            {/* Username — inline editable, Cinzel typography */}
            <div className="flex flex-col items-center gap-1">
              {editing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    maxLength={20}
                    className="w-44 rounded-lg border border-amber-500/60 bg-zinc-950 px-3 py-1.5 text-center text-lg font-bold text-amber-50 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/30"
                    style={{ fontFamily: 'var(--font-cinzel), serif', letterSpacing: '0.08em' }}
                    placeholder="Nombre..."
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveName();
                      if (e.key === "Escape") handleCancelEdit();
                    }}
                  />
                  <button
                    onClick={handleSaveName}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-500/60 bg-emerald-950/60 text-emerald-300 transition-colors hover:bg-emerald-900/60"
                    title="Guardar"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-600 bg-zinc-900 text-zinc-400 transition-colors hover:bg-zinc-800"
                    title="Cancelar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={startEditing}
                  className="group flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-zinc-900/50"
                  title="Click para editar"
                >
                  <h3
                    className="text-xl font-black uppercase tracking-[0.12em] text-amber-50"
                    style={{
                      fontFamily: 'var(--font-cinzel), serif',
                      textShadow: '0 1px 2px rgba(0,0,0,0.9)',
                    }}
                  >
                    {profile.username}
                  </h3>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 opacity-0 transition-opacity group-hover:opacity-100">
                    ✎ editar
                  </span>
                </button>
              )}
            </div>

            {/* Level + XP progress bar */}
            <div className="w-full">
              <div className="mb-1 flex items-center justify-between">
                <span
                  className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-300"
                  style={{ fontFamily: 'var(--font-cinzel), serif' }}
                >
                  Nivel {profile.level}
                </span>
                <span className="text-[9px] font-bold tabular-nums text-zinc-500">
                  {matchesIntoLevel}/{MATCHES_PER_LEVEL} para nivel {profile.level + 1}
                </span>
              </div>
              {/* Progress bar — gold gradient fill on dark track */}
              <div className="h-2 w-full overflow-hidden rounded-full border border-amber-700/30 bg-zinc-950">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${xpPct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                  className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-500 to-rose-600 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                />
              </div>
            </div>
          </section>

          {/* ────────────── STATS DE PARTIDAS ────────────── */}
          <section className="flex flex-col gap-2.5">
            <SectionHeader title="Estadísticas de Partidas" />
            <div className="grid grid-cols-2 gap-2">
              <StatCard
                label="Partidas"
                value={profile.totalMatches}
                accent="amber"
                icon="♟"
              />
              <StatCard
                label="Victorias"
                value={profile.wins}
                accent="emerald"
                icon="♛"
              />
              <StatCard
                label="Derrotas"
                value={profile.losses}
                accent="rose"
                icon="✟"
              />
              <StatCard
                label="Winrate"
                value={`${winrate}%`}
                accent="amber"
                icon="⚖"
              />
            </div>
          </section>

          {/* ────────────── STATS DE BATALLA ────────────── */}
          <section className="flex flex-col gap-2.5">
            <SectionHeader title="Estadísticas de Batalla" />
            <div className="flex flex-col gap-1 rounded-xl border border-zinc-700/60 bg-zinc-950/70 p-3 backdrop-blur-sm">
              <StatRow label="Empates" value={profile.draws} />
              <DividerLine />
              <StatRow label="Clase favorita" value={profile.favoriteClass} />
              <DividerLine />
              <StatRow label="Cartas jugadas" value={profile.totalCardsPlayed} />
              <DividerLine />
              <StatRow label="Enemigos destruidos" value={profile.totalEnemyDestroyed} />
            </div>
          </section>
        </motion.div>
      </main>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      {/* Small crossed-swords decorative mark — matches the brand emblem */}
      <span
        className="text-amber-500/80"
        style={{ fontSize: '12px', lineHeight: 1 }}
        aria-hidden
      >
        ⚔
      </span>
      <h4
        className="text-[11px] font-black uppercase tracking-[0.3em] text-amber-300"
        style={{
          fontFamily: 'var(--font-cinzel), serif',
          textShadow: '0 1px 2px rgba(0,0,0,0.9)',
        }}
      >
        {title}
      </h4>
      <span className="h-px flex-1 bg-gradient-to-r from-amber-700/60 to-transparent" />
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string | number;
  accent: "amber" | "emerald" | "rose";
  icon: string;
}) {
  const accents: Record<string, string> = {
    amber: "border-amber-600/40 bg-gradient-to-br from-amber-950/60 to-zinc-950/80 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.12)]",
    emerald: "border-emerald-600/40 bg-gradient-to-br from-emerald-950/60 to-zinc-950/80 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.12)]",
    rose: "border-rose-600/40 bg-gradient-to-br from-rose-950/60 to-zinc-950/80 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.12)]",
  };
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 backdrop-blur-sm transition-all ${accents[accent]}`}
    >
      <span className="text-xl leading-none opacity-90">{icon}</span>
      <div className="flex flex-col leading-tight">
        <span className="text-[8px] font-bold uppercase tracking-[0.2em] opacity-70">
          {label}
        </span>
        <span
          className="text-lg font-black tabular-nums"
          style={{ fontFamily: 'var(--font-cinzel), serif' }}
        >
          {value}
        </span>
      </div>
    </motion.div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between px-1 py-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
        {label}
      </span>
      <span
        className="text-sm font-black tabular-nums text-amber-100"
        style={{ fontFamily: 'var(--font-cinzel), serif' }}
      >
        {value}
      </span>
    </div>
  );
}

function DividerLine() {
  return <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-700/60 to-transparent" />;
}
