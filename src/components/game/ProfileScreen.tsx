"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import { ArrowLeft, Check, X, Image as ImageIcon, Lock, Crown, Trophy, Swords, Scale, Gamepad2, Skull, Pencil } from "lucide-react";
import { ALL_CARDS } from "@/lib/game/cards";
import type { CardDef } from "@/lib/game/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RARITY_META } from "@/lib/game/types";

/** Hex colors for the tiny rarity dot on card thumbnails. */
const RARITY_DOT_COLOR: Record<CardDef["rarity"], string> = {
  common: "#34d399", // emerald-400
  rare: "#38bdf8", // sky-400
  epic: "#c084fc", // violet-400
  legendary: "#fbbf24", // amber-400
};

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
  // null  → use the transparent game icon (default)
  // string → use the card image at /cards/{avatarCardId}.png
  avatarCardId: string | null;
  // Set of card IDs the player has unlocked as avatar eligible. While in
  // testing mode this defaults to ALL cards; later it can be more restrictive.
  unlockedAvatarCardIds: string[];
}

const STORAGE_KEY = "pacto-de-guerra-profile";
const MATCHES_PER_LEVEL = 5;
const USERNAME_MAX = 8;

// All card IDs available right now (testing mode = everything unlocked)
const ALL_CARD_IDS = ALL_CARDS.map((c) => c.id);

// Basic profanity blocklist (lowercase, no diacritics). Catches obvious cases.
// Not exhaustive — for production, server-side validation is recommended.
const PROFANITY_BLOCKLIST = [
  "puta", "puto", "puton", "putazo", "putisimo", "putisima",
  "culo", "culero", "culazo",
  "verga", "vergas", "vergazo",
  "pene", "pito", "pito3", "pene3",
  "vagina", "cono", "coño", "chocha", "chucha",
  "chingar", "chinga", "chingon", "chingader", "chingazo",
  "joder", "jodido", "jode",
  "mierda", "mierd", "mierdita",
  "cabron", "cabrona", "cabrones", "cabronazo",
  "pendejo", "pendeja", "pendejetes",
  "idiota", "imbecil", "imbécil",
  "maricon", "maricona", "marica",
  "perra", "perro", "putona",
  "fuck", "fucker", "fucking", "fucked", "fucks",
  "shit", "shitty", "shitter",
  "bitch", "bitches", "bitchy",
  "ass", "asshole", "asses", "asshat",
  "dick", "dicks", "dickhead",
  "pussy", "cunt", "whore", "slut",
  "bastard", "douche",
  "nigger", "nigga", "nazi", "faggot", "fag",
];

const DEFAULT_PROFILE: ProfileData = {
  username: "Player1",
  level: 1,
  totalMatches: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  favoriteClass: "Guerrero",
  totalCardsPlayed: 0,
  totalEnemyDestroyed: 0,
  avatarCardId: null,
  unlockedAvatarCardIds: ALL_CARD_IDS,
};

/**
 * Map a player level to a rank title (Spanish, tactical theme).
 * Rank progression gives the header a sense of progression even at low levels.
 */
function getRankTitle(level: number): { title: string; tier: "bronze" | "silver" | "gold" | "platinum" | "legend" } {
  if (level >= 50) return { title: "Leyenda", tier: "legend" };
  if (level >= 30) return { title: "Maestro de Guerra", tier: "platinum" };
  if (level >= 20) return { title: "Comandante", tier: "gold" };
  if (level >= 10) return { title: "Veterano", tier: "silver" };
  if (level >= 5) return { title: "Guerrero", tier: "silver" };
  if (level >= 3) return { title: "Soldado", tier: "bronze" };
  return { title: "Recluta", tier: "bronze" };
}

function loadProfile(): ProfileData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge defaults to handle new fields added later
      const merged = { ...DEFAULT_PROFILE, ...parsed };
      // Ensure unlockedAvatarCardIds is set (default = all cards in testing mode)
      if (!Array.isArray(merged.unlockedAvatarCardIds) || merged.unlockedAvatarCardIds.length === 0) {
        merged.unlockedAvatarCardIds = ALL_CARD_IDS;
      }
      return merged;
    }
  } catch {}
  return DEFAULT_PROFILE;
}

function saveProfile(data: ProfileData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

/**
 * Validate a username candidate.
 * Returns `{ ok: true }` or `{ ok: false, error: "..." }`.
 */
function validateUsername(name: string): { ok: true } | { ok: false; error: string } {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "El nombre no puede estar vacío." };
  }
  if (trimmed.length > USERNAME_MAX) {
    return { ok: false, error: `Máximo ${USERNAME_MAX} caracteres.` };
  }
  if (!/^[a-zA-Z0-9]+$/.test(trimmed)) {
    return { ok: false, error: "Solo letras y números (sin espacios ni símbolos)." };
  }
  // Normalize (lowercase, no diacritics) for profanity check
  const normalized = trimmed
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  for (const bad of PROFANITY_BLOCKLIST) {
    if (normalized === bad || normalized.includes(bad)) {
      return { ok: false, error: "El nombre contiene palabras no permitidas." };
    }
  }
  return { ok: true };
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
  const [validationError, setValidationError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    setProfile(loadProfile());
  }, []);

  const winrate = profile.totalMatches > 0
    ? Math.round((profile.wins / profile.totalMatches) * 100)
    : 0;

  const matchesIntoLevel = profile.totalMatches % MATCHES_PER_LEVEL;
  const xpPct = (matchesIntoLevel / MATCHES_PER_LEVEL) * 100;

  // Rank title (auto from level — gives a sense of progression)
  const rank = getRankTitle(profile.level);

  // ── Username edit handlers ──
  const startEditing = () => {
    setTempName(profile.username);
    setValidationError(null);
    setEditing(true);
  };

  const handleNameChange = (raw: string) => {
    // Filter out non-alphanumeric chars at input time (visual feedback)
    const filtered = raw.replace(/[^a-zA-Z0-9]/g, "").slice(0, USERNAME_MAX);
    setTempName(filtered);
    const result = validateUsername(filtered);
    setValidationError(result.ok ? null : result.error);
  };

  const handleSaveName = () => {
    const result = validateUsername(tempName);
    if (!result.ok) {
      setValidationError(result.error);
      return;
    }
    const updated = { ...profile, username: tempName };
    setProfile(updated);
    saveProfile(updated);
    setEditing(false);
    setValidationError(null);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setTempName("");
    setValidationError(null);
  };

  // ── Avatar picker handlers ──
  const handleSelectAvatar = (cardId: string | null) => {
    const updated = { ...profile, avatarCardId: cardId };
    setProfile(updated);
    saveProfile(updated);
    setPickerOpen(false);
  };

  // Resolve avatar image source
  const avatarSrc = useMemo(() => {
    if (profile.avatarCardId) {
      return `/cards/${profile.avatarCardId}.png`;
    }
    return "/menu/game-icon-transparent.png";
  }, [profile.avatarCardId]);

  return (
    <div className="app-frame relative overflow-hidden text-zinc-100">
      {/* ── Background: armory/trophy-hall backdrop (unique to profile) ──
          Subtle blur + lighter overlay so the armory is actually visible
          (not just a black void). Cards still have their own bg-zinc-950/70
          so they remain readable on top of this. */}
      <div
        className="absolute inset-0 z-0 scale-105 bg-cover bg-center blur-[2px]"
        style={{ backgroundImage: 'url(/menu/profile-bg-raw.png)' }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/80 via-black/55 to-black/80" />

      {/* ── Back button ── */}
      <button
        onClick={() => setView("main-menu")}
        className="absolute left-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-amber-500/40 bg-zinc-950/70 backdrop-blur-sm text-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.25)] transition-colors hover:bg-zinc-900/80 hover:border-amber-400/70"
        title="Volver"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2.2} />
      </button>

      {/* ── Title ── */}
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
          {/* ────────────── PROFILE HEADER ──────────────
              Card is intentionally semi-transparent (no backdrop-blur) so the
              armory background shows through. Inner elements (avatar button,
              XP bar, mini-stats chips) have their own bg-zinc-950 for contrast. */}
          <section className="flex flex-col items-center gap-3 rounded-2xl border border-amber-600/40 bg-zinc-950/40 p-5 shadow-[0_0_30px_rgba(251,191,36,0.15)]">
            {/* Avatar — clickable to open the card picker */}
            <div className="relative">
              <div className="absolute -inset-1.5 rounded-full bg-gradient-to-br from-amber-400/60 via-amber-600/40 to-rose-700/50 blur-[1px]" />
              <button
                onClick={() => setPickerOpen(true)}
                className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-amber-400/60 bg-zinc-950 shadow-[0_0_20px_rgba(251,191,36,0.3)] transition-all hover:border-amber-300/90 hover:shadow-[0_0_30px_rgba(251,191,36,0.5)]"
                title="Cambiar avatar"
              >
                {/* Avatar image (card image OR default game icon) */}
                <img
                  src={avatarSrc}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
                {/* Hover overlay with "Cambiar" hint */}
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/70 opacity-0 transition-opacity group-hover:opacity-100">
                  <ImageIcon className="h-6 w-6 text-amber-300" />
                </span>
              </button>
              {/* Small "edit" badge in the bottom-right corner */}
              <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-amber-400/60 bg-zinc-950 text-amber-300 shadow-md">
                <ImageIcon className="h-3.5 w-3.5" />
              </span>
            </div>

            {/* Username — inline editable, alphanumeric max 8, profanity filter */}
            <div className="flex flex-col items-center gap-1">
              {editing ? (
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      maxLength={USERNAME_MAX}
                      pattern="[a-zA-Z0-9]+"
                      autoComplete="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      className={`w-44 rounded-lg border bg-zinc-950 px-3 py-1.5 text-center text-lg font-bold text-amber-50 outline-none focus:ring-2 ${
                        validationError
                          ? "border-rose-500/80 focus:border-rose-400 focus:ring-rose-500/30"
                          : "border-amber-500/60 focus:border-amber-400 focus:ring-amber-500/30"
                      }`}
                      style={{ fontFamily: 'var(--font-cinzel), serif', letterSpacing: '0.08em' }}
                      placeholder="Player1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveName();
                        if (e.key === "Escape") handleCancelEdit();
                      }}
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={!!validationError || tempName.trim().length === 0}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-500/60 bg-emerald-950/60 text-emerald-300 transition-colors enabled:hover:bg-emerald-900/60 disabled:opacity-40"
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
                  {/* Helper / error text */}
                  <div className="h-3 text-center text-[9px] uppercase tracking-wider">
                    {validationError ? (
                      <span className="text-rose-400">{validationError}</span>
                    ) : (
                      <span className="text-zinc-500">
                        {tempName.length}/{USERNAME_MAX} · solo letras y números
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  onClick={startEditing}
                  className="group relative flex flex-col items-center gap-1 rounded-lg px-3 py-1 transition-colors hover:bg-zinc-900/40"
                  title="Click para editar"
                >
                  {/* Username — centered, no inline hint next to it (was causing off-center alignment) */}
                  <h3
                    className="text-center text-xl font-black uppercase tracking-[0.12em] text-amber-50"
                    style={{
                      fontFamily: 'var(--font-cinzel), serif',
                      textShadow: '0 1px 2px rgba(0,0,0,0.9)',
                    }}
                  >
                    {profile.username}
                  </h3>
                  {/* Rank title — auto-derived from level, centered below username */}
                  <RankTitle title={rank.title} tier={rank.tier} />
                  {/* Hover-only "editar" hint — absolute positioned so it doesn't shift the username */}
                  <span className="pointer-events-none absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-[0.25em] text-amber-400/0 transition-opacity duration-200 group-hover:text-amber-400/80">
                    <Pencil className="h-2.5 w-2.5" /> editar
                  </span>
                </button>
              )}
            </div>

            {/* Decorative crossed-swords divider between identity block and progress block */}
            <DecorativeDivider />

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
              <div className="h-2 w-full overflow-hidden rounded-full border border-amber-700/30 bg-zinc-950">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${xpPct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                  className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-500 to-rose-600 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                />
              </div>
            </div>

            {/* Inline mini-stats row — quick glance of W / L / WR */}
            <MiniStats wins={profile.wins} losses={profile.losses} winrate={winrate} />
          </section>

          {/* ────────────── STATS DE PARTIDAS ────────────── */}
          <section className="flex flex-col gap-2.5">
            <SectionHeader title="Estadísticas de Partidas" />
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="Partidas" value={profile.totalMatches} accent="amber" icon={<Gamepad2 className="h-5 w-5" />} />
              <StatCard label="Victorias" value={profile.wins} accent="emerald" icon={<Trophy className="h-5 w-5" />} />
              <StatCard label="Derrotas" value={profile.losses} accent="rose" icon={<Skull className="h-5 w-5" />} />
              <StatCard label="Winrate" value={`${winrate}%`} accent="amber" icon={<Scale className="h-5 w-5" />} />
            </div>
          </section>

          {/* ────────────── STATS DE BATALLA ────────────── */}
          <section className="flex flex-col gap-2.5">
            <SectionHeader title="Estadísticas de Batalla" />
            <div className="flex flex-col gap-1 rounded-xl border border-zinc-700/60 bg-zinc-950/40 p-3">
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

      {/* ────────────── AVATAR PICKER MODAL ────────────── */}
      <AvatarPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        currentAvatarCardId={profile.avatarCardId}
        unlockedCardIds={profile.unlockedAvatarCardIds}
        onSelect={handleSelectAvatar}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// AvatarPickerModal — choose between the default game icon OR any card image
// ──────────────────────────────────────────────────────────────

interface AvatarPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAvatarCardId: string | null;
  unlockedCardIds: string[];
  onSelect: (cardId: string | null) => void;
}

function AvatarPickerModal({
  open,
  onOpenChange,
  currentAvatarCardId,
  unlockedCardIds,
  onSelect,
}: AvatarPickerModalProps) {
  // Build the list of available cards (only those the player has unlocked)
  const availableCards = useMemo(() => {
    const unlocked = new Set(unlockedCardIds);
    return ALL_CARDS.filter((c) => unlocked.has(c.id));
  }, [unlockedCardIds]);

  // Locked cards (for visual "you don't have this yet" feedback)
  const lockedCards = useMemo(() => {
    const unlocked = new Set(unlockedCardIds);
    return ALL_CARDS.filter((c) => !unlocked.has(c.id));
  }, [unlockedCardIds]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-hidden border-amber-600/40 bg-zinc-950 text-zinc-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle
            className="text-center text-base font-black uppercase tracking-[0.3em] text-amber-400"
            style={{ fontFamily: 'var(--font-cinzel), serif' }}
          >
            Elegir Avatar
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {/* ── Default game icon option ── */}
          <button
            onClick={() => onSelect(null)}
            className={`flex items-center gap-3 rounded-lg border-2 p-2 transition-all ${
              currentAvatarCardId === null
                ? "border-amber-400 bg-amber-950/40 shadow-[0_0_14px_rgba(251,191,36,0.3)]"
                : "border-zinc-700 bg-zinc-900 hover:border-amber-600/50"
            }`}
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-amber-500/40 bg-zinc-950">
              <img
                src="/menu/game-icon-transparent.png"
                alt="Ícono del juego"
                className="h-full w-full scale-110 object-contain"
              />
            </div>
            <div className="flex flex-col items-start">
              <span
                className="text-sm font-black uppercase tracking-wider text-amber-50"
                style={{ fontFamily: 'var(--font-cinzel), serif' }}
              >
                Ícono del juego
              </span>
              <span className="text-[9px] uppercase tracking-widest text-zinc-500">
                Emblema por defecto
              </span>
            </div>
            {currentAvatarCardId === null && (
              <Check className="ml-auto h-5 w-5 text-amber-400" />
            )}
          </button>

          {/* ── Cards grid ── */}
          <div className="border-t border-zinc-800 pt-2">
            <h4 className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-amber-300" style={{ fontFamily: 'var(--font-cinzel), serif' }}>
              Cartas desbloqueadas
              <span className="ml-2 text-zinc-500">({availableCards.length})</span>
            </h4>
            <div className="grid max-h-[50vh] grid-cols-4 gap-1.5 overflow-y-auto pr-1">
              {availableCards.map((card) => (
                <CardAvatarOption
                  key={card.id}
                  card={card}
                  selected={currentAvatarCardId === card.id}
                  onSelect={() => onSelect(card.id)}
                />
              ))}
              {/* Locked cards (greyed out, non-clickable) */}
              {lockedCards.map((card) => (
                <CardAvatarOption key={card.id} card={card} selected={false} onSelect={() => {}} locked />
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CardAvatarOption({
  card,
  selected,
  onSelect,
  locked,
}: {
  card: CardDef;
  selected: boolean;
  onSelect: () => void;
  locked?: boolean;
}) {
  const rarity = RARITY_META[card.rarity];
  return (
    <motion.button
      whileHover={!locked ? { scale: 1.06 } : undefined}
      whileTap={!locked ? { scale: 0.96 } : undefined}
      onClick={onSelect}
      disabled={locked}
      className={`relative aspect-[3/4] overflow-hidden rounded-md border-2 transition-all ${
        locked
          ? "cursor-not-allowed border-zinc-800 opacity-50"
          : selected
            ? "border-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.5)]"
            : "border-zinc-700 hover:border-amber-500/60"
      }`}
      title={locked ? "Bloqueada" : card.name}
    >
      <img
        src={`/cards/${card.id}.png`}
        alt={card.name}
        className="h-full w-full object-cover"
        loading="lazy"
      />
      {locked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <Lock className="h-4 w-4 text-zinc-600" />
        </div>
      )}
      {selected && !locked && (
        <span className="absolute bottom-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-black">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      )}
      {!locked && (
        <span
          className="absolute left-0.5 top-0.5 h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: RARITY_DOT_COLOR[card.rarity] ?? "#a1a1aa" }}
          title={rarity.label}
        />
      )}
    </motion.button>
  );
}

// ──────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="flex items-center text-amber-500/80"
        style={{ fontSize: '12px', lineHeight: 1 }}
        aria-hidden
      >
        <Swords className="h-3 w-3" />
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
  icon: React.ReactNode;
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
      <span className="flex h-5 w-5 items-center justify-center text-xl leading-none opacity-90">{icon}</span>
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

// ──────────────────────────────────────────────────────────────
// NEW: RankTitle — auto-derived rank title below the username
// Color-coded by tier (bronze/silver/gold/platinum/legend) so the user
// sees their progression visually.
// ──────────────────────────────────────────────────────────────
const TIER_STYLES: Record<string, { text: string; glow: string; icon: string }> = {
  bronze:   { text: "text-amber-700",  glow: "rgba(180,83,9,0.35)",   icon: "bg-amber-900/40 text-amber-600 ring-1 ring-amber-700/40" },
  silver:   { text: "text-zinc-300",   glow: "rgba(161,161,170,0.4)", icon: "bg-zinc-800/60 text-zinc-300 ring-1 ring-zinc-600/40" },
  gold:     { text: "text-amber-400",  glow: "rgba(251,191,36,0.5)",  icon: "bg-amber-950/50 text-amber-400 ring-1 ring-amber-500/40" },
  platinum: { text: "text-cyan-300",   glow: "rgba(103,232,249,0.4)", icon: "bg-cyan-950/50 text-cyan-300 ring-1 ring-cyan-500/40" },
  legend:   { text: "text-rose-300",   glow: "rgba(244,63,94,0.55)",  icon: "bg-rose-950/50 text-rose-300 ring-1 ring-rose-500/40" },
};

function RankTitle({ title, tier }: { title: string; tier: "bronze" | "silver" | "gold" | "platinum" | "legend" }) {
  const style = TIER_STYLES[tier];
  return (
    <div className="flex items-center gap-1.5">
      <span className={`flex h-4 w-4 items-center justify-center rounded-full ${style.icon}`}>
        <Crown className="h-2.5 w-2.5" strokeWidth={2.4} />
      </span>
      <span
        className={`text-[10px] font-black uppercase tracking-[0.3em] ${style.text}`}
        style={{ textShadow: `0 0 8px ${style.glow}, 0 1px 2px rgba(0,0,0,0.95)` }}
      >
        {title}
      </span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// NEW: DecorativeDivider — crossed-swords icon centered between two
// fading gradient lines. Gives the header a clear visual break between
// the identity block (avatar+name+rank) and the progression block (level+xp).
// ──────────────────────────────────────────────────────────────
function DecorativeDivider() {
  return (
    <div className="flex w-full items-center gap-2 py-1">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-700/40" />
      <span
        className="flex items-center text-amber-500/70"
        style={{ fontSize: '10px', lineHeight: 1 }}
        aria-hidden
      >
        <Swords className="h-2.5 w-2.5" />
      </span>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-700/40" />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// NEW: MiniStats — inline quick-glance row showing W / L / WR
// Sits below the XP bar, color-coded (emerald/rose/amber) for instant scan.
// This complements (not duplicates) the detailed Stats section below by
// giving the user a one-glance summary of their record.
// ──────────────────────────────────────────────────────────────
function MiniStats({ wins, losses, winrate }: { wins: number; losses: number; winrate: number }) {
  return (
    <div className="grid w-full grid-cols-3 gap-1.5">
      <MiniStatChip
        icon={<Trophy className="h-3 w-3" />}
        label="V"
        value={wins}
        accent="emerald"
      />
      <MiniStatChip
        icon={<Swords className="h-3 w-3" />}
        label="D"
        value={losses}
        accent="rose"
      />
      <MiniStatChip
        icon={<Scale className="h-3 w-3" />}
        label="WR"
        value={`${winrate}%`}
        accent="amber"
      />
    </div>
  );
}

function MiniStatChip({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: "emerald" | "rose" | "amber";
}) {
  const accents: Record<string, string> = {
    emerald: "border-emerald-700/40 bg-emerald-950/30 text-emerald-300",
    rose: "border-rose-700/40 bg-rose-950/30 text-rose-300",
    amber: "border-amber-700/40 bg-amber-950/30 text-amber-300",
  };
  return (
    <div className={`flex items-center justify-center gap-1.5 rounded-lg border px-1 py-1.5 ${accents[accent]}`}>
      <span className="opacity-80">{icon}</span>
      <span className="text-[8px] font-bold uppercase tracking-widest opacity-70">{label}</span>
      <span
        className="text-[12px] font-black tabular-nums"
        style={{ fontFamily: 'var(--font-cinzel), serif' }}
      >
        {value}
      </span>
    </div>
  );
}
