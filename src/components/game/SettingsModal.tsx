"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useSettings } from "@/lib/settings";
import type { Language } from "@/lib/settings";
import { useGameStore } from "@/store/gameStore";
import { Volume2, VolumeX, Sparkles, Sparkle, LogOut, Globe, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  // When opened from the combat header, show "Salir al Menú Principal" so the
  // user can abandon the match and return to the main menu. When opened from
  // the main menu, this button is hidden (no game in progress).
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
  const toggleSound = useSettings((s) => s.toggleSound);
  const toggleAnim = useSettings((s) => s.toggleAnimations);
  const setVolume = useSettings((s) => s.setVolume);
  const setLanguage = useSettings((s) => s.setLanguage);
  const setView = useGameStore((s) => s.setView);
  const setDeckEditorReturn = useGameStore((s) => s.setDeckEditorReturn);

  // Local state for the "salir" confirmation (so the user has to confirm
  // abandoning the match — second-tap confirmation pattern)
  const [confirmExit, setConfirmExit] = useState(false);

  // Reset confirmation state whenever the modal opens/closes
  if (!open && confirmExit) {
    // schedule reset on next tick to avoid React state-update-during-render
    setTimeout(() => setConfirmExit(false), 0);
  }

  const exitToMenu = () => {
    onOpenChange(false);
    setDeckEditorReturn("main-menu");
    setView("main-menu");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-black uppercase tracking-[0.3em] text-zinc-200">
            Ajustes
          </DialogTitle>
          <DialogDescription className="text-[11px] text-zinc-500">
            Personaliza tu experiencia.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {/* ─────────── SONIDO + VOLUMEN ─────────── */}
          <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-zinc-300">
                  {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-zinc-500" />}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">Sonido</span>
              </div>
              {/* Toggle switch */}
              <button
                onClick={toggleSound}
                className={cn(
                  "relative h-6 w-11 rounded-full transition-colors",
                  soundOn ? "bg-emerald-500" : "bg-zinc-700",
                )}
                aria-label={soundOn ? "Desactivar sonido" : "Activar sonido"}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                    soundOn ? "translate-x-5" : "translate-x-0.5",
                  )}
                />
              </button>
            </div>

            {/* Volume slider — disabled when sound is off */}
            <div className={cn("flex items-center gap-2 transition-opacity", !soundOn && "pointer-events-none opacity-40")}>
              <VolumeX className="h-3 w-3 text-zinc-500" />
              <Slider
                value={[soundOn ? volume : 0]}
                min={0}
                max={100}
                step={5}
                onValueChange={(v) => setVolume(v[0])}
                className="flex-1"
                aria-label="Volumen"
              />
              <Volume2 className="h-3 w-3 text-zinc-400" />
              <span className="w-8 text-right text-[10px] font-bold tabular-nums text-zinc-300">
                {soundOn ? volume : 0}
              </span>
            </div>
          </section>

          {/* ─────────── ANIMACIONES ─────────── */}
          <button
            onClick={toggleAnim}
            className={cn(
              "flex w-full items-center justify-between rounded-lg border px-3 py-3 transition-colors",
              animOn ? "border-amber-700/40 bg-amber-950/20" : "border-zinc-800 bg-zinc-900/50",
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-zinc-300">
                {animOn ? <Sparkles className="h-4 w-4 text-amber-400" /> : <Sparkle className="h-4 w-4 text-zinc-500" />}
              </span>
              <div className="text-left">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-200">Animaciones</div>
                <div className="text-[10px] text-zinc-500">
                  {animOn ? "Activadas" : "Desactivadas"}
                </div>
              </div>
            </div>
            <div
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors",
                animOn ? "bg-amber-500" : "bg-zinc-700",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  animOn ? "translate-x-5" : "translate-x-0.5",
                )}
              />
            </div>
          </button>

          {/* ─────────── IDIOMA ─────────── */}
          <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Globe className="h-4 w-4 text-zinc-300" />
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">Idioma</span>
              <span className="ml-auto text-[9px] uppercase tracking-wider text-zinc-600">
                Próximamente
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
                      "flex flex-col items-center gap-1 rounded-md border px-2 py-2 transition-all",
                      active
                        ? "border-zinc-400 bg-zinc-800 text-zinc-50"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200",
                    )}
                  >
                    <span className="text-base leading-none">{lang.flag}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide">{lang.label}</span>
                    {active && <Check className="h-3 w-3 text-emerald-400" />}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[9px] leading-tight text-zinc-600">
              Tu preferencia se guarda. Las traducciones estarán disponibles en una próxima versión.
            </p>
          </section>

          {/* ─────────── SALIR AL MENÚ (only in combat context) ─────────── */}
          {showExitToMenu && (
            <div className="border-t border-zinc-800 pt-2">
              {!confirmExit ? (
                <Button
                  variant="outline"
                  className="w-full border-rose-800/50 bg-rose-950/30 text-rose-300 hover:bg-rose-900/40 hover:text-rose-200"
                  onClick={() => setConfirmExit(true)}
                >
                  <LogOut className="h-4 w-4" />
                  Salir al Menú Principal
                </Button>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-center text-[11px] text-zinc-300">
                    ¿Salir de la partida? Se perderá el progreso.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                      onClick={() => setConfirmExit(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-rose-700 bg-rose-900/60 text-rose-100 hover:bg-rose-800"
                      onClick={exitToMenu}
                    >
                      <LogOut className="h-4 w-4" />
                      Sí, salir
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─────────── CERRAR ─────────── */}
          <Button
            variant="outline"
            className="w-full border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
