"use client";

// ============================================================================
// MainMenu — HUB DEL MENÚ PRINCIPAL (rediseño de ORDEN, no de identidad).
//
// Problema que resuelve: el menú acumuló 6 píldoras sueltas (4 envolvían a 2
// líneas en pantallas estrechas, cada bloque anclaba al fondo por su cuenta,
// colores y tamaños sin jerarquía) = reguero ilegible.
//
// Solución: un PANEL-HUB inferior con jerarquía piramidal FIJA (nada envuelve,
// nada flota suelto):
//   · 1 tarjeta primaria a todo lo ancho → EL PACTO (la historia, SIEMPRE abierta)
//   · 2 tarjetas medianas → LA TORRE (se abre al completar El Pacto) + RUSH
//     (se abre al vencer al jefe del piso 3 de la Torre)
//   · 2 tarjetas compactas → COLECCIÓN + PVP LOCAL
// Escalera narrativa «de la vida real»: primero vives El Pacto → escalas la
// Torre (sus jefes reclutan clases) → conoces a los jefes → se abre el Rush.
// El modo admin (oculto, 7 toques) se salta los candados.
// Cada tarjeta muestra el PROGRESO real del jugador (piso de torre, capítulo
// de historia, mejor run de rush, cartas de colección) — pintado SOLO tras
// hidratar los stores (patrón anti-mismatch de siempre: servidor y cliente
// estrenan con los fallbacks estáticos y recién tras el mount aparece el
// dato real, sin mismatch SSR↔cliente).
// El cromo (perfil · misiones · ajustes) sube a la barra superior: los modos
// dejan de competir con las utilidades por el fondo de la pantalla.
// El gesto secreto del modo admin vive en el pie del panel (7 toques).
// ============================================================================

import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import { usePvpStore } from "@/store/pvpStore";
import { useStoryStore } from "@/store/storyStore";
import { useCampaignStore } from "@/store/campaignStore";
import { CAMPAIGN_STEPS } from "@/lib/game/campaign";
import { STORY_TOTAL } from "@/lib/game/story";
import { useCollectionStore, hydrateCollection } from "@/store/collectionStore";
import { ALL_CARDS_V3 } from "@/lib/game/cards";
import { useStatsStore } from "@/store/statsStore";
import { sfx } from "@/lib/sound";
import { music } from "@/lib/music";
import { useState, useEffect, useRef } from "react";
import {
  User,
  Settings as SettingsIcon,
  ScrollText,
  Gift,
  X,
  Check,
  ClipboardPaste,
  Skull,
  BookOpen,
  Castle,
  Lock,
  Swords,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { SettingsModal } from "./SettingsModal";
import { AdminSecretModal } from "./AdminSecretModal";
import { useAdminStore } from "@/store/adminStore";
import { isFreshInstall, applyProgressCode, readClipboardText } from "@/lib/progress-backup";
import { haptic } from "@/lib/haptics";
import { loadStoredProfileBrief } from "@/lib/profile-storage";
import {
  useMissionStore,
  type Mission,
  type MissionScope,
  SCOPE_META,
  SCOPE_REWARD,
} from "@/store/missionStore";
import { cn } from "@/lib/utils";

/** Toast global de recompensa RECLAMADA (reutilizado también dentro de partidas). */
export function MissionToast() {
  const [toast, setToast] = useState<{ text: string; at: number } | null>(null);
  useEffect(() => {
    const unsub = useMissionStore.subscribe((s) => {
      if (s.lastClaimed) {
        const { cards, title, at } = s.lastClaimed;
        setToast({ text: `+${cards} ${cards === 1 ? "carta" : "cartas"} · ${title}`, at });
        window.setTimeout(() => setToast((t) => (t?.at === at ? null : t)), 4200);
      }
    });
    return unsub;
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-14 z-[60] flex justify-center">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.at}
            initial={{ opacity: 0, y: -14, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="relative flex items-center gap-2 rounded-full border border-emerald-400/70 bg-gradient-to-b from-emerald-950/95 to-black/95 px-4 py-1.5 shadow-2xl shadow-black/60"
          >
            <Gift className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
              ¡Recompensa reclamada! +{toast.text}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Identidad por modo: cada tarjeta hereda el color del botón que
// sustituye (ámbar=Torre, violeta=Pacto, rosa=Rush, púrpura=Colección,
// teal=PvP) — continuidad con el menú anterior; el ORDEN es lo nuevo.
// Subtinturas desde el propio matiz (nunca gris sobre color).
// ──────────────────────────────────────────────────────────────
interface ModeTone {
  card: string; // borde + fondo + sombra + hover
  medallion: string; // cajita del icono
  title: string;
  sub: string;
}

const TONES: Record<"torre" | "pacto" | "rush" | "coleccion" | "pvp", ModeTone> = {
  torre: {
    card:
      "border-amber-300/60 bg-gradient-to-b from-amber-600 via-amber-700 to-rose-900 shadow-[0_6px_22px_-8px_rgba(251,191,36,0.55)] hover:border-amber-200/80",
    medallion: "border-amber-200/50 bg-black/25 text-amber-100",
    title: "text-amber-50",
    sub: "text-amber-100/75",
  },
  pacto: {
    card:
      "border-violet-300/60 bg-gradient-to-b from-violet-600 via-violet-800 to-zinc-950 shadow-[0_6px_22px_-8px_rgba(139,92,246,0.6)] hover:border-violet-200/80",
    medallion: "border-violet-200/50 bg-black/25 text-violet-100",
    title: "text-violet-50",
    sub: "text-violet-100/75",
  },
  rush: {
    card:
      "border-rose-400/50 bg-gradient-to-b from-rose-900/80 to-zinc-950/95 shadow-[0_6px_20px_-10px_rgba(244,63,94,0.45)] hover:border-rose-300/70",
    medallion: "border-rose-300/40 bg-rose-950/60 text-rose-200",
    title: "text-rose-100",
    sub: "text-rose-200/70",
  },
  coleccion: {
    card:
      "border-purple-400/50 bg-gradient-to-b from-purple-900/80 to-zinc-950/95 shadow-[0_6px_20px_-10px_rgba(192,132,252,0.4)] hover:border-purple-300/70",
    medallion: "border-purple-300/40 bg-purple-950/60 text-purple-200",
    title: "text-purple-100",
    sub: "text-purple-200/70",
  },
  pvp: {
    card:
      "border-teal-400/50 bg-gradient-to-b from-teal-900/80 to-zinc-950/95 shadow-[0_6px_20px_-10px_rgba(45,212,191,0.4)] hover:border-teal-300/70",
    medallion: "border-teal-300/40 bg-teal-950/60 text-teal-200",
    title: "text-teal-100",
    sub: "text-teal-200/70",
  },
};

// ── Coreografía de entrada (UN solo momento: el hub sube y las tarjetas
//    caen en cascada — sin efectos sueltos por todas partes). ──
const panelV: Variants = {
  hidden: { opacity: 0, y: 36 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
};
const listV: Variants = {
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } },
};
const cardV: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

// ── Tarjeta de modo: [medallón] TÍTULO / progreso [chip de estado] ──
// Con `locked`, la tarjeta se apaga, el medallón muestra un candado y el
// toque NO navega: sacudida física + golpe grave + zumbido descendente.
function ModeCard({
  tone,
  icon: Icon,
  title,
  subtitle,
  stat,
  tooltip,
  big,
  locked,
  onClick,
}: {
  tone: ModeTone;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  /** Chip de estado a la derecha (progreso o condición de desbloqueo). */
  stat?: string;
  /** Tooltip nativo (título HTML). */
  tooltip?: string;
  /** true → tarjeta primaria (más alta, tipografía mayor). */
  big?: boolean;
  /** true → candado: el toque niega (no navega). */
  locked?: boolean;
  onClick: () => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  return (
    <motion.button
      ref={btnRef}
      variants={cardV}
      whileTap={{ scale: 0.97 }}
      onClick={() => {
        if (locked) {
          // NEGADO: sacudida física + golpe háptico grave + zumbido descendente.
          btnRef.current?.animate(
            [
              { transform: "translateX(0)" },
              { transform: "translateX(-7px)" },
              { transform: "translateX(7px)" },
              { transform: "translateX(-5px)" },
              { transform: "translateX(5px)" },
              { transform: "translateX(0)" },
            ],
            { duration: 320, easing: "ease-in-out" }
          );
          haptic("heavy");
          sfx.debuff();
          return;
        }
        onClick();
      }}
      title={tooltip}
      aria-label={`${title} — ${subtitle}`}
      aria-disabled={locked || undefined}
      className={cn(
        "group relative flex w-full items-center gap-2 rounded-xl border px-2.5 text-left transition-colors min-[360px]:gap-2.5 min-[360px]:px-3",
        big ? "min-h-[60px] py-2.5" : "min-h-[52px] py-2",
        locked && "saturate-[0.4] opacity-80",
        tone.card
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg border",
          big ? "h-9 w-9 min-[360px]:h-10 min-[360px]:w-10" : "h-8 w-8 min-[360px]:h-9 min-[360px]:w-9",
          tone.medallion
        )}
      >
        {locked ? (
          <Lock className="h-3.5 w-3.5" strokeWidth={2.4} />
        ) : (
          <Icon
            className={big ? "h-4 w-4 min-[360px]:h-[18px] min-[360px]:w-[18px]" : "h-3.5 w-3.5 min-[360px]:h-4 min-[360px]:w-4"}
            strokeWidth={2.1}
          />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        <span
          className={cn(
            "select-none truncate font-black uppercase",
            big
              ? "text-[13px] tracking-[0.2em] min-[360px]:text-[15px] min-[360px]:tracking-[0.22em]"
              : "text-[9px] tracking-[0.1em] min-[360px]:text-[10px] min-[360px]:tracking-[0.15em]",
            tone.title
          )}
          style={{ fontFamily: "var(--font-cinzel), serif" }}
        >
          {title}
        </span>
        <span
          className={cn(
            "select-none truncate text-[7.5px] font-bold uppercase tracking-[0.1em] tabular-nums min-[360px]:text-[8px] min-[360px]:tracking-[0.16em]",
            tone.sub
          )}
        >
          {subtitle}
        </span>
      </span>
      {stat && (
        <span className="shrink-0 rounded-full border border-white/20 bg-black/40 px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.1em] text-zinc-100 tabular-nums min-[360px]:text-[8px] min-[360px]:tracking-[0.12em]">
          {stat}
        </span>
      )}
    </motion.button>
  );
}

export function MainMenu() {
  const setView = useGameStore((s) => s.setView);
  const gameClass = useGameStore((s) => s.gameClass);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [misionesOpen, setMisionesOpen] = useState(false);
  // Pestaña activa del panel de misiones (diarias/semanales/mensuales).
  const [misionesTab, setMisionesTab] = useState<MissionScope>("daily");
  // true tras la rehidratación de stores persistidos (localStorage). Los
  // contadores de progreso (piso/capítulo/cartas/misiones) se pintan SOLO
  // entonces: el HTML prerenderizado muestra los fallbacks estáticos y el
  // cliente también en el primer render → sin mismatch de hidratación.
  const [ready, setReady] = useState(false);
  const [avatarCardId, setAvatarCardId] = useState<string | null>(null);
  const [avatarBroken, setAvatarBroken] = useState(false);
  // RESTAURACIÓN DE UN TOQUE (Task 50): instalación fresca + código de
  // respaldo copiado → UN botón lee el portapapeles y restaura. El banner solo
  // aparece si NO hay perfil ni campaña ni colección (nunca molesta si hay
  // progreso) y se puede cerrar; tras restaurar desaparece solo.
  const [restoreBanner, setRestoreBanner] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);
  const [restoreBusy, setRestoreBusy] = useState(false);
  // RUSH DE JEFES: mejor run de la clase activa (pintada SOLO tras hidratar —
  // mismo patrón anti-mismatch que el resto de contadores).
  const [rushReady, setRushReady] = useState(false);
  // MODO ADMIN (oculto): estado para el pie del panel + panel secreto.
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminOn, setAdminOn] = useState(false);
  const [adminTaps, setAdminTaps] = useState(0);
  const adminTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Progreso real por modo (hooks suscritos; el dato se MUESTRA tras `ready`).
  const campaignStep = useCampaignStore((s) => s.step);
  const campaignPrestige = useCampaignStore((s) => s.prestige);
  const campaignStepsCleared = useCampaignStore((s) => s.stepsCleared);
  const storyChapter = useStoryStore((s) => s.chapter);
  const storyCompleted = useStoryStore((s) => s.completed);
  const copies = useCollectionStore((s) => s.copies);
  const dailyMissions = useMissionStore((s) => s.daily);
  const weeklyMissions = useMissionStore((s) => s.weekly);
  const monthlyMissions = useMissionStore((s) => s.monthly);
  const ensurePeriods = useMissionStore((s) => s.ensurePeriods);
  const allMissions = [...dailyMissions, ...weeklyMissions, ...monthlyMissions];
  /** Misiones LISTAS sin reclamar — el imán que lleva al jugador a cobrar. */
  const claimable = allMissions.filter((m) => m.ready && !m.claimed).length;

  useEffect(() => {
    // El menú se remonta en cada cambio de vista → se relee todo el progreso.
    // Diferido en microtask (mismo patrón que page.tsx) para no hacer setState
    // síncrono dentro del effect y evitar mismatch de hidratación SSR↔cliente.
    let alive = true;
    Promise.resolve().then(() => {
      if (!alive) return;
      useCampaignStore.getState().hydrate();
      useStoryStore.getState().hydrate();
      hydrateCollection();
      setReady(true);
      setRushReady(true);
      useAdminStore.getState().hydrate();
      setAdminOn(useAdminStore.getState().on);
      const brief = loadStoredProfileBrief();
      setAvatarCardId(brief?.avatarCardId ?? null);
      setAvatarBroken(false);
      ensurePeriods();
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
  }, [ensurePeriods]);

  const click = () => {
    // Unified sound system (src/lib/sound.ts) — replaces the old
    // `new Audio("/click.mp3")` which 404'd because the asset never existed.
    sfx.click();
  };
  // Mejor run de Rush en la clase activa («mejor 2/3») o el gancho por defecto.
  const rushBest = useStatsStore.getState().rushBest[gameClass] ?? 0;

  // ── Etiquetas de progreso (fallback estático hasta que `ready` sea true) ──
  // CANDADOS (escalera narrativa): El Pacto SIEMPRE abierto → LA TORRE se
  // abre al COMPLETAR la historia → RUSH al vencer al jefe del piso 3 de la
  // Torre (stepsCleared es HISTÓRICO: los veteranos de v3.0-3.2 ya lo
  // cumplieron). El modo admin lo salta todo. Pre-`ready` todo se ve abierto
  // (servidor y cliente estrenan igual → sin mismatch de hidratación).
  const torreLocked = ready && !adminOn && !storyCompleted;
  const rushLocked = ready && !adminOn && !storyCompleted && campaignStepsCleared < 3;

  const pactoStat = ready
    ? storyCompleted
      ? "Completada"
      : `Capítulo ${Math.min(storyChapter + 1, STORY_TOTAL)}/${STORY_TOTAL}`
    : undefined;
  const pactoSub = "Campaña principal";
  // Con candado NO hay chip (no cabe en media tarjeta a 320px): la condición
  // corta va como subtítulo y el tooltip lleva la frase completa.
  const torreSub = torreLocked ? "Pacto 7/7" : "Escalada infinita";
  const torreStat = torreLocked
    ? undefined
    : ready
      ? `Piso ${campaignStep}/${CAMPAIGN_STEPS}${campaignPrestige > 0 ? ` · ★${campaignPrestige}` : ""}`
      : undefined;
  const rushSub = rushLocked ? "Piso 3" : "XP ×2";
  const rushStat = rushLocked
    ? undefined
    : rushReady && rushBest > 0
      ? `Mejor ${rushBest}/3`
      : undefined;
  const ownedCards = Object.values(copies).filter(
    (c) =>
      (c.common ?? 0) + (c.rare ?? 0) + (c.epic ?? 0) + (c.legendary ?? 0) + (c.mythic ?? 0) > 0
  ).length;
  const coleccionSub = ready ? `${ownedCards}/${ALL_CARDS_V3.length} cartas` : "Cartas ganadas";

  const goToProfile = () => {
    click();
    setView("profile");
  };

  const goToClassSelect = () => {
    click();
    setView("class-select");
  };

  const goToStory = () => {
    click();
    haptic("light");
    useStoryStore.getState().hydrate();
    setView("story");
  };

  const goToRush = () => {
    click();
    haptic("light");
    usePvpStore.getState().startRush({ playerClass: gameClass });
  };

  const goToColeccion = () => {
    click();
    setView("coleccion");
  };

  const goToPvp = () => {
    click();
    setView("pvp");
  };

  /** Abre MISIONES: rota periodos y aterriza en la primera pestaña con
   *  recompensas por reclamar (si no hay, en Diarias). */
  const openMissions = () => {
    click();
    const s = useMissionStore.getState();
    s.ensurePeriods();
    const withClaim = (["daily", "weekly", "monthly"] as const).find((sc) =>
      s[sc].some((m) => m.ready && !m.claimed)
    );
    setMisionesTab(withClaim ?? "daily");
    setMisionesOpen(true);
  };

  // GESTO SECRETO DEL MODO ADMIN: 7 toques en la versión del pie del panel
  // (como las opciones de desarrollador de Android). Sin feedback visible
  // hasta abrir — solo un haptic light por toque. Pausa >1.6s reinicia.
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
      {/* Bottom darkening overlay for panel legibility */}
      <div className="absolute inset-x-0 bottom-0 z-0 h-2/3 bg-gradient-to-b from-transparent via-black/55 to-black/95" />

      {/* ── TOP-CENTER: BANNER DE RESCATE (solo instalación fresca) ── */}
      <AnimatePresence>
        {restoreBanner && (
          <motion.div
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.9 } }}
            exit={{ opacity: 0, y: -14 }}
            className="absolute inset-x-4 top-16 z-30"
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

      {/* ── BARRA SUPERIOR: perfil (izq) · misiones + ajustes (der).
              Los iconos suben aquí y liberan el fondo para los modos. ── */}
      <div className="absolute inset-x-3 top-3 z-30 flex items-center justify-between">
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.95 }}
          onClick={goToProfile}
          className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-amber-500/40 bg-zinc-950/70 text-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.25)] backdrop-blur-sm transition-colors hover:border-amber-400/70 hover:bg-zinc-900/80"
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
            <User className="h-[18px] w-[18px]" strokeWidth={2.2} />
          )}
        </motion.button>

        <div className="flex items-center gap-2">
          {/* MISIONES (diarias/semanales/mensuales): el badge muestra SOLO
              las recompensas POR RECLAMAR — pulsa para llevar al cobro. */}
          <motion.button
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.95 }}
            onClick={openMissions}
            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-amber-500/40 bg-zinc-950/70 text-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.25)] backdrop-blur-sm transition-colors hover:border-amber-300/70 hover:bg-zinc-900/80"
            title="Misiones"
            aria-label="Misiones"
          >
            <ScrollText className="h-[18px] w-[18px]" strokeWidth={2.2} />
            {ready && claimable > 0 && (
              <span className="absolute -right-1 -top-1 flex h-[17px] min-w-[17px] animate-pulse items-center justify-center rounded-full border border-black/70 bg-emerald-500 px-1 text-[8px] font-black leading-none text-black tabular-nums shadow-[0_0_10px_rgba(16,185,129,0.8)]">
                {claimable}
              </span>
            )}
          </motion.button>

          {/* OPCIONES (mismo estilo que PERFIL y MISIONES) */}
          <motion.button
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { click(); setSettingsOpen(true); }}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-amber-500/40 bg-zinc-950/70 text-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.25)] backdrop-blur-sm transition-colors hover:border-amber-300/70 hover:bg-zinc-900/80"
            title="Opciones"
            aria-label="Opciones"
          >
            <SettingsIcon className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </motion.button>
        </div>
      </div>

      {/* ── PANEL-HUB INFERIOR — jerarquía piramidal fija: nada envuelve ni
              flota suelto. La cascada de entrada es el único momento animado. ── */}
      <motion.div
        variants={panelV}
        initial="hidden"
        animate="show"
        className="absolute inset-x-3 bottom-3 z-20 overflow-hidden rounded-2xl border border-amber-200/15 bg-gradient-to-b from-zinc-950/90 via-black/95 to-black/[0.98] shadow-[0_-12px_44px_-18px_rgba(0,0,0,0.95)]"
      >
        {/* Hairline superior: filo iluminado del panel (oficio, no glow) */}
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/25 to-transparent" />

        <motion.div
          variants={listV}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-2 px-3 pb-1.5 pt-3"
        >
          {/* PRIMARIA → la historia: SIEMPRE abierta (el juego ES El Pacto) */}
          <ModeCard
            big
            tone={TONES.pacto}
            icon={BookOpen}
            title="EL PACTO"
            subtitle={pactoSub}
            stat={pactoStat}
            onClick={goToStory}
          />

          {/* MEDIANAS → el endgame: Torre (post-historia) + Rush (post-piso 3) */}
          <div className="grid grid-cols-2 gap-2">
            <ModeCard
              tone={TONES.torre}
              icon={Castle}
              title="LA TORRE"
              subtitle={torreSub}
              stat={torreStat}
              tooltip={
                torreLocked
                  ? "Bloqueada — completa El Pacto de Guerra para abrir La Torre de los Muros"
                  : undefined
              }
              locked={torreLocked}
              onClick={goToClassSelect}
            />
            <ModeCard
              tone={TONES.rush}
              icon={Skull}
              title="RUSH"
              subtitle={rushSub}
              stat={rushStat}
              tooltip={
                rushLocked
                  ? "Bloqueado — vence al jefe del piso 3 de La Torre para abrir el Rush de Jefes"
                  : "3 jefes seguidos · XP ×2 · botín por escalón — se juega con el mazo de la clase activa"
              }
              locked={rushLocked}
              onClick={goToRush}
            />
          </div>

          {/* COMPACTAS → utilidades de juego */}
          <div className="grid grid-cols-2 gap-2">
            <ModeCard
              tone={TONES.coleccion}
              icon={Sparkles}
              title="COLECCIÓN"
              subtitle={coleccionSub}
              onClick={goToColeccion}
            />
            <ModeCard
              tone={TONES.pvp}
              icon={Swords}
              title="PVP LOCAL"
              subtitle="2 jugadores"
              onClick={goToPvp}
            />
          </div>

          {/* Pie del panel: versión + GESTO SECRETO (7 toques → modo admin).
              Con el admin encendido la etiqueta cambia a «modo admin» en rojo. */}
          <p
            onClick={adminFooterTap}
            className={cn(
              "mt-0.5 select-none py-1 text-center text-[7px] font-bold uppercase tracking-[0.3em]",
              adminOn ? "text-rose-500/80" : "text-amber-700/70"
            )}
          >
            v3.3 · 6 clases · {ALL_CARDS_V3.length} cartas{adminOn ? " · modo admin" : ""}
          </p>
        </motion.div>
      </motion.div>

      {/* Panel SECRETO del modo admin (solo llega aquí con 7 toques) */}
      <AdminSecretModal open={adminOpen} onClose={() => setAdminOpen(false)} />

      {/* Toast de misión completada */}
      <MissionToast />

      {/* Panel de MISIONES — 3 pestañas (diarias/semanales/mensuales) con
              RECLAMO manual: completar NO paga, cobrar es un toque del jugador. */}
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
                    Misiones
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

              {/* Pestañas con puntito de «hay algo por cobrar aquí» */}
              <div className="mt-3 grid grid-cols-3 gap-1.5">
                {(["daily", "weekly", "monthly"] as const).map((sc) => {
                  const list = sc === "daily" ? dailyMissions : sc === "weekly" ? weeklyMissions : monthlyMissions;
                  const tabClaim = list.filter((m) => m.ready && !m.claimed).length;
                  const active = misionesTab === sc;
                  return (
                    <button
                      key={sc}
                      onClick={() => { click(); setMisionesTab(sc); }}
                      className={cn(
                        "relative rounded-lg border px-1 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] transition-colors min-[360px]:text-[10px]",
                        active
                          ? "border-amber-400/80 bg-amber-500/15 text-amber-200"
                          : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200"
                      )}
                    >
                      {SCOPE_META[sc].label}
                      {tabClaim > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-[13px] min-w-[13px] items-center justify-center rounded-full border border-black/70 bg-emerald-500 px-0.5 text-[7px] font-black leading-none text-black tabular-nums">
                          {tabClaim}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="mt-2 text-[8px] uppercase tracking-[0.18em] text-zinc-500">
                {SCOPE_META[misionesTab].renew} · cada misión paga +{SCOPE_REWARD[misionesTab].cards}{" "}
                {SCOPE_REWARD[misionesTab].cards === 1 ? "carta" : "cartas"} al reclamarla
              </p>

              <div className="mt-2.5 space-y-2">
                {(misionesTab === "daily"
                  ? dailyMissions
                  : misionesTab === "weekly"
                    ? weeklyMissions
                    : monthlyMissions
                ).map((m) => (
                  <MissionRow key={m.id} m={m} />
                ))}
              </div>

              <p className="mt-3 text-center text-[8px] uppercase tracking-[0.16em] text-zinc-600">
                Completa el objetivo y toca RECLAMAR para cobrar
              </p>
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
// Fila de una misión (cualquier escalón): título, barra de progreso y
// RECLAMO manual — completar NO paga: el jugador cobra con un toque.
// ──────────────────────────────────────────────────────────────
function MissionRow({ m }: { m: Mission }) {
  const claim = useMissionStore((s) => s.claim);
  const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
  const canClaim = m.ready && !m.claimed;
  const reward = SCOPE_REWARD[m.scope];
  const rewardLabel = `+${reward.cards} ${reward.cards === 1 ? "carta" : "cartas"}`;
  const doClaim = () => {
    if (!canClaim) return;
    sfx.select();
    haptic("success");
    claim(m.scope, m.id);
  };
  return (
    <div
      className={
        "rounded-lg border px-2.5 py-2 " +
        (m.claimed
          ? "border-zinc-800 bg-zinc-900/30 opacity-60"
          : canClaim
            ? "border-emerald-500/60 bg-emerald-950/30 shadow-[0_0_14px_rgba(16,185,129,0.15)]"
            : "border-zinc-800 bg-zinc-900/50")
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={
            "text-[10px] font-bold leading-tight " +
            (m.claimed ? "text-zinc-500 line-through" : canClaim ? "text-emerald-200" : "text-zinc-200")
          }
        >
          {m.title}
        </span>
        {m.claimed ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest text-zinc-400">
            <Check className="h-2.5 w-2.5" /> Reclamada
          </span>
        ) : canClaim ? (
          <button
            onClick={doClaim}
            className="flex shrink-0 animate-pulse items-center gap-1 rounded-full border border-emerald-300/80 bg-gradient-to-b from-emerald-500 to-emerald-700 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-white shadow-[0_0_12px_rgba(16,185,129,0.5)] transition-transform active:scale-95"
          >
            <Gift className="h-2.5 w-2.5" /> Reclamar
          </button>
        ) : (
          <span className="shrink-0 text-[9px] font-black tabular-nums text-amber-300">
            {m.progress}/{m.target}
          </span>
        )}
      </div>
      {m.claimed ? (
        <p className="mt-1 text-[8px] uppercase tracking-[0.14em] text-zinc-600">
          Recompensa cobrada: {rewardLabel}
        </p>
      ) : (
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-black/60">
          <div
            className={
              "h-full rounded-full transition-all duration-500 " +
              (canClaim
                ? "bg-gradient-to-r from-emerald-600 to-emerald-400"
                : "bg-gradient-to-r from-amber-700 to-amber-400")
            }
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
