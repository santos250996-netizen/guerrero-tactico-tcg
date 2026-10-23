"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import { usePvpStore } from "@/store/pvpStore";
import { useStoryStore } from "@/store/storyStore";
import { useStatsStore } from "@/store/statsStore";
import { sfx } from "@/lib/sound";
import { music } from "@/lib/music";
import { useState, useEffect, useRef } from "react";
import { User, Settings as SettingsIcon, Wifi, ScrollText, Gift, X, ClipboardPaste, Skull, BookOpen } from "lucide-react";
import { SettingsModal } from "./SettingsModal";
import { AdminSecretModal } from "./AdminSecretModal";
import { useAdminStore } from "@/store/adminStore";
import { isFreshInstall, applyProgressCode, readClipboardText } from "@/lib/progress-backup";
import { haptic } from "@/lib/haptics";
import { CollectionMenuButton } from "./CollectionScreen";
import { loadStoredProfileBrief } from "@/lib/profile-storage";
import { useMissionStore, type Mission } from "@/store/missionStore";
import { cn } from "@/lib/utils";

/** Toast global de misión completada (reutilizado también dentro de partidas). */
export function MissionToast() {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const unsub = useMissionStore.subscribe((s) => {
      if (s.lastCompleted) {
        setText(s.lastCompleted.title);
        window.setTimeout(() => setText(null), 4200);
      }
    });
    return unsub;
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-14 z-[60] flex justify-center">
      <AnimatePresence>
        {text && (
          <motion.div
            key={text}
            initial={{ opacity: 0, y: -14, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="relative flex items-center gap-2 rounded-full border border-amber-400/70 bg-gradient-to-b from-amber-950/95 to-black/95 px-4 py-1.5 shadow-2xl shadow-black/60"
          >
            <Gift className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-200">
              ¡Misión completada! +1 carta · {text}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MainMenu() {
  const setView = useGameStore((s) => s.setView);
  const gameClass = useGameStore((s) => s.gameClass);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [misionesOpen, setMisionesOpen] = useState(false);
  // true tras la rehidratación de stores persistidos (localStorage). El contador
  // de misiones se pinta SOLO entonces: el HTML prerenderizado muestra "Misiones"
  // a secas y el cliente también en el primer render → sin mismatch de hidratación
  // (el store persist se rehidrata SINCRONO antes del mount → servidor 0/3 vs cliente 3/3).
  // Avatar elegido en Perfil → visible en el propio botón (si no, icono User).
  const [ready, setReady] = useState(false);
  const [avatarCardId, setAvatarCardId] = useState<string | null>(null);
  const [avatarBroken, setAvatarBroken] = useState(false);
  // RESTAURACIÓN DE UN TOQUE (Task 50 — «no hay forma de hacerlo sin que el
  // usuario intervenga»): instalación fresca + código de respaldo copiado →
  // UN botón lee el portapapeles y restaura. La migración queda en: copiar
  // (app vieja) → reinstalar → PEGAR Y RESTAURAR. El banner solo aparece si
  // NO hay perfil ni campaña ni colección (nunca molesta si hay progreso) y se
  // puede cerrar; tras restaurar, el perfil existe y desaparece solo.
  const [restoreBanner, setRestoreBanner] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);
  const [restoreBusy, setRestoreBusy] = useState(false);
  // RUSH DE JEFES: mejor run de la clase activa (pintada SOLO tras hidratar —
  // mismo patrón anti-mismatch que el contador de misiones de arriba).
  const [rushReady, setRushReady] = useState(false);
  // MODO ADMIN (oculto): estado para el footer + el panel secreto. El flag se
  // hidrata en el effect de abajo (mismo patrón anti-mismatch que `ready`).
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminOn, setAdminOn] = useState(false);
  const [adminTaps, setAdminTaps] = useState(0);
  const adminTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const missions = useMissionStore((s) => s.missions);
  const ensureToday = useMissionStore((s) => s.ensureToday);

  useEffect(() => {
    // El menú se remonta en cada cambio de vista → se relee el perfil fresco.
    // Diferido en microtask (mismo patrón que page.tsx) para no hacer setState
    // síncrono dentro del effect y evitar mismatch de hidratación SSR↔cliente.
    let alive = true;
    Promise.resolve().then(() => {
      if (!alive) return;
      setReady(true);
      setRushReady(true);
      useAdminStore.getState().hydrate();
      setAdminOn(useAdminStore.getState().on);
      const brief = loadStoredProfileBrief();
      setAvatarCardId(brief?.avatarCardId ?? null);
      setAvatarBroken(false);
      ensureToday();
      // Banner de rescate SOLO en instalación sin progreso (y una vez por sesión).
      if (!sessionStorage.getItem("pacto-restore-dismissed") && isFreshInstall()) {
        setRestoreBanner(true);
      }
    });
    // Música de campamento (latido lento): idempotente — si ya suena (vuelta de
    // partida) solo asegura el modo menú; si el autoplay bloquea, difiere al
    // primer toque (gestor dentro de music.start).
    music.start("menu");
    return () => { alive = false; };
  }, [ensureToday]);

  const click = () => {
    // Unified sound system (src/lib/sound.ts) — replaces the old
    // `new Audio("/click.mp3")` which 404'd because the asset never existed.
    sfx.click();
  };
  // Etiqueta del Rush: mejor run de la clase activa («· mejor 2/3») o nada.
  const rushBestLabel = (() => {
    const best = useStatsStore.getState().rushBest[gameClass] ?? 0;
    return best > 0 ? `mejor ${best}/3` : "3 jefes";
  })();

  const goToProfile = () => {
    click();
    setView("profile");
  };

  const goToClassSelect = () => {
    click();
    setView("class-select");
  };

  const goToPvp = () => {
    click();
    setView("pvp");
  };

  // GESTO SECRETO DEL MODO ADMIN: 7 toques en la versión del menú (como las
  // opciones de desarrollador de Android). Sin feedback visible hasta abrir —
  // solo un haptic light por toque. Una pausa >1.6s reinicia la cuenta.
  const adminFooterTap = () => {
    haptic("light");
    if (adminTapTimer.current) clearTimeout(adminTapTimer.current);
    const next = adminTaps + 1;
    if (next >= 7) {
      setAdminTaps(0);
      sfx.select();
      setAdminOpen(true);
      return;
    }
    setAdminTaps(next);
    adminTapTimer.current = setTimeout(() => setAdminTaps(0), 1600);
  };

  const dismissRestore = () => {
    click();
    sessionStorage.setItem("pacto-restore-dismissed", "1");
    setRestoreBanner(false);
  };

  const restoreFromClipboard = async () => {
    if (restoreBusy) return;
    setRestoreBusy(true);
    setRestoreMsg(null);
    const text = await readClipboardText();
    if (text === null) {
      setRestoreMsg("No se pudo leer el portapapeles — usa Ajustes → Importar progreso.");
      setRestoreBusy(false);
      return;
    }
    const res = applyProgressCode(text);
    if (!res.ok) {
      setRestoreMsg(res.error);
      setRestoreBusy(false);
      return;
    }
    haptic("success");
    // El perfil restaurado hace desaparecer el banner tras el reload.
    setTimeout(() => { location.reload(); }, 600);
  };

  return (
    <div className="app-frame relative overflow-hidden text-zinc-100">
      {/* Background image — title + emblem baked in (matches launcher icon) */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/menu/main-bg.webp)' }}
      />
      {/* Resplandores ambientales (G2) — ESTÁTICOS (el animate-pulse + blur
          en móvil costaba GPU y se notaba). Dan profundidad sin moverse. */}
      <div className="pointer-events-none absolute -left-16 -top-16 z-0 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-16 z-0 h-64 w-64 rounded-full bg-rose-600/10 blur-3xl" />
      {/* Bottom darkening overlay for button legibility */}
      <div className="absolute inset-x-0 bottom-0 z-0 h-2/3 bg-gradient-to-b from-transparent via-black/55 to-black/95" />

      {/* ── TOP-CENTER: BANNER DE RESCATE (solo instalación fresca) ── */}
      <AnimatePresence>
        {restoreBanner && (
          <motion.div
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.9 } }}
            exit={{ opacity: 0, y: -14 }}
            className="absolute inset-x-4 top-14 z-30"
          >
            <div className="relative rounded-xl border border-emerald-500/40 bg-gradient-to-b from-zinc-950/95 to-black/95 p-3 shadow-[0_0_18px_rgba(16,185,129,0.2)]">
              <button
                onClick={dismissRestore}
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-zinc-500 hover:text-zinc-200"
                aria-label="Cerrar rescate"
              >
                <X className="h-3 w-3" />
              </button>
              <p className="pr-6 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300">
                ¿Vienes de otra instalación?
              </p>
              <p className="mt-0.5 text-[9px] leading-snug text-zinc-400">
                Si copiaste tu código de respaldo (Ajustes → Exportar progreso en la app vieja), recupera tu avance con un toque.
              </p>
              <button
                onClick={restoreFromClipboard}
                disabled={restoreBusy}
                className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-400/60 bg-emerald-900/60 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100 transition-colors hover:bg-emerald-800/70 disabled:opacity-50"
              >
                <ClipboardPaste className="h-3.5 w-3.5" />
                {restoreBusy ? "Leyendo…" : "Pegar y restaurar"}
              </button>
              {restoreMsg && (
                <p className="mt-1.5 text-[9px] leading-snug text-amber-300">{restoreMsg}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
            src={`/cards/${avatarCardId}.webp`}
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

      {/* ── ZONA DE JUEGO — UN stack flex-col con gap real. Los offsets
             mágicos (bottom-24/70/9) anclaban cada pill POR SEPARADO al fondo:
             con pantallas cortas, fuentes del sistema o un label que envolvía
             (PVP LOCAL en 2 líneas) los tres bloques se pisaban entre sí. */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
        className="pointer-events-none absolute inset-x-0 bottom-7 z-20 flex flex-col items-center gap-1.5 px-6"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.96 }}
          onClick={goToClassSelect}
          className="pointer-events-auto group relative inline-flex items-center justify-center rounded-full border border-amber-300/60 bg-gradient-to-b from-amber-600 via-amber-700 to-rose-800 px-8 py-2.5 text-white shadow-[0_4px_18px_-3px_rgba(251,191,36,0.55),0_0_0_1px_rgba(0,0,0,0.4)_inset] transition-all hover:border-amber-200/80 hover:from-amber-500 hover:via-amber-600 hover:to-rose-700"
        >
          {/* Top inner highlight (glossy) */}
          <span className="pointer-events-none absolute inset-x-3 top-0.5 h-1/2 rounded-full bg-gradient-to-b from-white/40 to-transparent opacity-70" />
          {/* The label — Cinzel Black for that Roman-inscription fantasy feel */}
          <span
            className="relative select-none whitespace-nowrap text-[21px] font-black uppercase tracking-[0.32em] text-amber-50"
            style={{
              fontFamily: 'var(--font-cinzel), serif',
              textShadow: '0 1px 1px rgba(0,0,0,0.95), 0 0 12px rgba(251,191,36,0.55)',
              paddingLeft: '0.32em',  // optical centering with tracking
            }}
          >
          {/* El modo de escalada AHORA SE LLAMA LA TORRE (la historia real vive
              en su propia píldora «El Pacto»): la escalera siempre fue torre. */}
            LA TORRE
          </span>
        </motion.button>

        {/* HISTORIA · EL PACTO DE GUERRA + COLECCIÓN + PVP LOCAL + RUSH —
            fila flexible: con 4 píldoras en pantallas estrechas ENVUELVE en 2 líneas */}
        <div className="flex max-w-[92%] flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => {
              click();
              haptic("light");
              useStoryStore.getState().hydrate();
              setView("story");
            }}
            className="pointer-events-auto inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-violet-400/50 bg-gradient-to-b from-violet-800/80 to-zinc-950/90 px-3.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-violet-200 transition-colors hover:border-violet-300/70"
            style={{ fontFamily: "var(--font-cinzel), serif" }}
          >
            <BookOpen className="h-3 w-3" /> El Pacto
          </button>
          <div className="pointer-events-auto">
            <CollectionMenuButton />
          </div>
          <button
            onClick={goToPvp}
            className="pointer-events-auto inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-teal-400/50 bg-gradient-to-b from-teal-800/80 to-zinc-950/90 px-3.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-teal-200 transition-colors hover:border-teal-300/70"
            style={{ fontFamily: "var(--font-cinzel), serif" }}
          >
            <Wifi className="h-3 w-3" /> PvP Local
          </button>
          <button
            onClick={() => {
              click();
              haptic("light");
              usePvpStore.getState().startRush({ playerClass: gameClass });
            }}
            className="pointer-events-auto inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-rose-400/50 bg-gradient-to-b from-rose-800/80 to-zinc-950/90 px-3.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-rose-200 transition-colors hover:border-rose-300/70"
            style={{ fontFamily: "var(--font-cinzel), serif" }}
            title="3 jefes seguidos · XP ×2 · botín por escalón — se juega con el mazo de la clase activa"
          >
            <Skull className="h-3 w-3" /> Rush{rushReady ? ` · ${rushBestLabel}` : ""}
          </button>
        </div>

        {/* MISIONES del día */}
        <button
          onClick={() => { click(); setMisionesOpen(true); }}
          className="pointer-events-auto inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-500/50 bg-gradient-to-b from-amber-900/80 to-zinc-950/90 px-4 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-amber-200 transition-colors hover:border-amber-300/70"
          style={{ fontFamily: "var(--font-cinzel), serif" }}
        >
          <ScrollText className="h-3 w-3" />
          Misiones{ready ? ` ${missions.filter((m) => m.done).length}/${missions.length}` : ""}
        </button>
      </motion.div>

      {/* ── BOTTOM-CENTER (version, bajo Misiones — no pisa el título).
              También es el GESTO SECRETO: 7 toques abren el modo admin. Con
              el admin encendido la etiqueta cambia a «modo admin» en rojo —
              discreto, solo para el dueño. ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="absolute inset-x-0 bottom-2.5 z-20 flex justify-center px-8"
      >
        <p
          onClick={adminFooterTap}
          className={cn(
            "select-none text-center text-[7px] font-bold uppercase tracking-[0.35em]",
            adminOn ? "text-rose-500/80" : "text-amber-700/60"
          )}
        >
          v3.2 · 6 clases · 192 cartas · {adminOn ? "modo admin" : "rush de jefes"}
        </p>
      </motion.div>

      {/* Panel SECRETO del modo admin (solo llega aquí con 7 toques) */}
      <AdminSecretModal open={adminOpen} onClose={() => setAdminOpen(false)} />

      {/* Toast de misión completada */}
      <MissionToast />

      {/* Panel de MISIONES DIARIAS */}
      <AnimatePresence>
        {misionesOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
            onClick={() => setMisionesOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 22 }}
              className="w-full max-w-sm rounded-2xl border-2 border-amber-500/50 bg-gradient-to-b from-zinc-950 to-black p-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ScrollText className="h-4 w-4 text-amber-400" />
                  <h2
                    className="text-sm font-black uppercase tracking-[0.25em] text-amber-300"
                    style={{ fontFamily: "var(--font-cinzel), serif" }}
                  >
                    Misiones de hoy
                  </h2>
                </div>
                <button
                  onClick={() => setMisionesOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-700 text-zinc-400 hover:text-zinc-100"
                  aria-label="Cerrar"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-1 text-[8px] uppercase tracking-[0.2em] text-zinc-500">
                Se renuevan cada día · cada una paga +1 carta
              </p>
              <div className="mt-3 space-y-2">
                {missions.map((m) => (
                  <MissionRow key={m.id} m={m} />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings modal overlay */}
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Fila de una misión diaria: título, barra de progreso y estado.
// ──────────────────────────────────────────────────────────────
function MissionRow({ m }: { m: Mission }) {
  const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
  return (
    <div
      className={
        "rounded-lg border px-2.5 py-2 " +
        (m.done
          ? "border-emerald-500/50 bg-emerald-950/30"
          : "border-zinc-800 bg-zinc-900/50")
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={
            "text-[10px] font-bold leading-tight " +
            (m.done ? "text-emerald-300" : "text-zinc-200")
          }
        >
          {m.title}
        </span>
        {m.done ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-emerald-400/60 bg-emerald-900/60 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest text-emerald-300">
            <Gift className="h-2.5 w-2.5" /> +1 carta
          </span>
        ) : (
          <span className="shrink-0 text-[9px] font-black tabular-nums text-amber-300">
            {m.progress}/{m.target}
          </span>
        )}
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-black/60">
        <div
          className={
            "h-full rounded-full transition-all duration-500 " +
            (m.done
              ? "bg-gradient-to-r from-emerald-600 to-emerald-400"
              : "bg-gradient-to-r from-amber-700 to-amber-400")
          }
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
