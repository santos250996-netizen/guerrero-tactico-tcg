"use client";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/settings";
import type { Language } from "@/lib/settings";
import { useGameStore } from "@/store/gameStore";
import { motion } from "framer-motion";
import {
  Volume2, VolumeX, Sparkles, Sparkle, LogOut, Globe, Check,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  showExitToMenu?: boolean;
}

const LANGUAGES: { value: Language; label: string; flag: string }[] = [
  { value: "es", label: "Español", flag: "🇪🇸" },
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "pt", label: "Português", flag: "🇧🇷" },
];

export function SettingsModal({ open, onOpenChange, showExitToMenu = false }: SettingsModalProps) {
  const soundOn = useSettings((s) => s.soundOn);
  const animOn = useSettings((s) => s.animationsOn);
  const volume = useSettings((s) => s.volume);
  const language = useSettings((s) => s.language);
  const setSound = useSettings((s) => s.setSound);
  const setAnimations = useSettings((s) => s.setAnimations);
  const setVolume = useSettings((s) => s.setVolume);
  const setLanguage = useSettings((s) => s.setLanguage);
  const setView = useGameStore((s) => s.setView);
  const setDeckEditorReturn = useGameStore((s) => s.setDeckEditorReturn);

  const [confirmExit, setConfirmExit] = useState(false);
  useEffect(() => { if (!open) setConfirmExit(false); }, [open]);

  const exitToMenu = () => {
    onOpenChange(false);
    setDeckEditorReturn("main-menu");
    setView("main-menu");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="overflow-hidden border border-zinc-800/80 bg-zinc-950/95 p-0 text-zinc-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-md sm:max-w-md"
      >
        {/* ────────────── HEADER con brand mark ────────────── */}
        <div className="relative flex items-center gap-3 border-b border-zinc-800/60 bg-gradient-to-b from-zinc-900/80 to-zinc-950/60 px-4 py-3.5">
          {/* Mini brand mark — transparent game icon */}
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700/60 bg-zinc-900/60 shadow-inner">
            <img
              src="/menu/game-icon-transparent.png"
              alt=""
              className="h-7 w-7 object-contain"
              aria-hidden
            />
          </div>
          <div className="flex flex-col leading-tight">
            <DialogTitle asChild>
              <h2 className="text-sm font-black uppercase tracking-[0.35em] text-zinc-50">
                Ajustes
              </h2>
            </DialogTitle>
            <DialogDescription asChild>
              <p className="text-[9px] uppercase tracking-[0.25em] text-zinc-500">
                Pacto de Guerra
              </p>
            </DialogDescription>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            aria-label="Cerrar"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* ────────────── BODY ────────────── */}
        <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto px-4 py-4">
          {/* ── SECTION: AUDIO ── */}
          <Section title="Audio">
            <ToggleRow
              icon={soundOn ? Volume2 : VolumeX}
              iconAccent={soundOn ? "emerald" : "zinc"}
              label="Sonido"
              hint={soundOn ? "Activado" : "Desactivado"}
              on={soundOn}
              onToggle={() => setSound(!soundOn)}
              accentOn="emerald"
            />
            {/* Volume slider — revealed/expanded when sound is on */}
            <motion.div
              initial={false}
              animate={{ height: soundOn ? "auto" : 0, opacity: soundOn ? 1 : 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-3 px-3 py-2.5 pl-12">
                <VolumeX className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
                <CustomSlider
                  value={volume}
                  onChange={setVolume}
                  disabled={!soundOn}
                />
                <Volume2 className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                <span className="w-7 text-right text-[11px] font-bold tabular-nums text-zinc-300">
                  {volume}
                </span>
              </div>
            </motion.div>
          </Section>

          {/* ── SECTION: PREFERENCIAS ── */}
          <Section title="Preferencias">
            <ToggleRow
              icon={animOn ? Sparkles : Sparkle}
              iconAccent={animOn ? "amber" : "zinc"}
              label="Animaciones"
              hint={animOn ? "Activadas" : "Desactivadas"}
              on={animOn}
              onToggle={() => setAnimations(!animOn)}
              accentOn="amber"
            />
          </Section>

          {/* ── SECTION: IDIOMA ── */}
          <Section
            title="Idioma"
            badge="Próximamente"
          >
            <div className="px-2 py-3">
              <div className="mb-2 flex items-center gap-2 px-1">
                <Globe className="h-3.5 w-3.5 text-zinc-400" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                  Idioma de la interfaz
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {LANGUAGES.map((lang) => {
                  const active = language === lang.value;
                  return (
                    <button
                      key={lang.value}
                      onClick={() => setLanguage(lang.value)}
                      className={cn(
                        "relative flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 transition-all",
                        active
                          ? "border-zinc-500 bg-zinc-800/80 shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset]"
                          : "border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-800/40",
                      )}
                    >
                      <span className="text-base leading-none">{lang.flag}</span>
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wide",
                        active ? "text-zinc-50" : "text-zinc-400",
                      )}>
                        {lang.label}
                      </span>
                      {active && (
                        <motion.span
                          layoutId="lang-active-check"
                          className="absolute -bottom-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-zinc-900 bg-emerald-500"
                        >
                          <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                        </motion.span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 px-1 text-[9px] leading-snug text-zinc-600">
                Tu preferencia se guarda. Las traducciones estarán disponibles en una próxima versión.
              </p>
            </div>
          </Section>

          {/* ── SECTION: SESIÓN (only in combat context) ── */}
          {showExitToMenu && (
            <Section title="Sesión">
              <div className="px-2 py-2.5">
                {!confirmExit ? (
                  <button
                    onClick={() => setConfirmExit(true)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-rose-950/30"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-950/60 text-rose-300 ring-1 ring-rose-700/40">
                      <LogOut className="h-3.5 w-3.5" />
                    </span>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold uppercase tracking-wider text-rose-200">
                        Salir al Menú
                      </span>
                      <span className="text-[10px] text-rose-400/80">
                        Perderás el progreso de la partida
                      </span>
                    </div>
                  </button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-2.5 px-2 py-1"
                  >
                    <div className="flex items-center gap-2.5">
                      <LogOut className="h-4 w-4 text-rose-400" />
                      <p className="text-[11px] font-medium text-zinc-300">
                        ¿Salir de la partida? Se perderá el progreso.
                      </p>
                    </div>
                    <div className="flex gap-2 pl-6">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                        onClick={() => setConfirmExit(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 border border-rose-600 bg-rose-900/70 text-rose-50 hover:bg-rose-800 hover:text-white"
                        onClick={exitToMenu}
                      >
                        <LogOut className="h-3 w-3" />
                        Sí, salir
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            </Section>
          )}
        </div>

        {/* ────────────── FOOTER ────────────── */}
        <div className="border-t border-zinc-800/60 bg-zinc-950/80 px-4 py-2.5">
          <Button
            variant="outline"
            className="w-full border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────────────
// Section — iOS-style grouped container with title + optional badge
// ──────────────────────────────────────────────────────────────
function Section({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-1.5 flex items-center gap-2 px-1.5">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">
          {title}
        </h3>
        {badge && (
          <span className="rounded-full border border-zinc-700/60 bg-zinc-900 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-zinc-500">
            {badge}
          </span>
        )}
      </div>
      <div className="divide-y divide-zinc-800/60 overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/30">
        {children}
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────
// ToggleRow — icon disc + label + hint + smooth animated toggle
// ──────────────────────────────────────────────────────────────
function ToggleRow({
  icon: Icon,
  iconAccent,
  label,
  hint,
  on,
  onToggle,
  accentOn,
}: {
  icon: LucideIcon;
  iconAccent: "zinc" | "emerald" | "amber";
  label: string;
  hint: string;
  on: boolean;
  onToggle: () => void;
  accentOn: "emerald" | "amber";
}) {
  const accentColor =
    iconAccent === "emerald"
      ? "bg-emerald-950/50 text-emerald-400 ring-1 ring-emerald-700/30"
      : iconAccent === "amber"
        ? "bg-amber-950/40 text-amber-400 ring-1 ring-amber-700/30"
        : "bg-zinc-800/60 text-zinc-500 ring-1 ring-zinc-700/40";

  const toggleOnColor =
    accentOn === "emerald" ? "bg-emerald-500" : "bg-amber-500";

  return (
    <div className="flex items-center gap-3 px-2.5 py-2.5">
      <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", accentColor)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex flex-1 flex-col leading-tight">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-100">
          {label}
        </span>
        <span className="text-[10px] text-zinc-500">{hint}</span>
      </div>
      <button
        onClick={onToggle}
        role="switch"
        aria-checked={on}
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors duration-200",
          on ? toggleOnColor : "bg-zinc-700",
        )}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md",
            on ? "left-[22px]" : "left-0.5",
          )}
        />
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// CustomSlider — replaces shadcn Slider with a tactical-themed one:
// dark track + amber fill + white thumb + glow when dragging
// ──────────────────────────────────────────────────────────────
function CustomSlider({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const updateFromEvent = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onChange(Math.round(pct * 100));
  };

  // Pointer events: mouse + touch
  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    updateFromEvent(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || disabled) return;
    updateFromEvent(e.clientX);
  };
  const onPointerUp = () => { setDragging(false); };

  // Keyboard support (arrows for a11y)
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "ArrowLeft") { onChange(Math.max(0, value - 5)); e.preventDefault(); }
    if (e.key === "ArrowRight") { onChange(Math.min(100, value + 5)); e.preventDefault(); }
    if (e.key === "Home") { onChange(0); e.preventDefault(); }
    if (e.key === "End") { onChange(100); e.preventDefault(); }
  };

  return (
    <div
      ref={trackRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      tabIndex={disabled ? -1 : 0}
      role="slider"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-disabled={disabled}
      className={cn(
        "relative h-6 flex-1 cursor-pointer touch-none select-none",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      {/* Track */}
      <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-zinc-800" />
      {/* Filled portion */}
      <div
        className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]"
        style={{ width: `${value}%` }}
      />
      {/* Thumb */}
      <div
        className={cn(
          "absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-400 bg-white shadow-md transition-transform",
          dragging ? "scale-125" : "hover:scale-110",
        )}
        style={{ left: `${value}%` }}
      />
    </div>
  );
}
