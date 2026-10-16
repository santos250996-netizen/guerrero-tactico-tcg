"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/settings";
import { useGameStore } from "@/store/gameStore";
import { Volume2, VolumeX, Sparkles, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export function SettingsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const soundOn = useSettings((s) => s.soundOn); const animOn = useSettings((s) => s.animationsOn);
  const toggleSound = useSettings((s) => s.toggleSound); const toggleAnim = useSettings((s) => s.toggleAnimations);
  const setView = useGameStore((s) => s.setView);
  const setDeckEditorReturn = useGameStore((s) => s.setDeckEditorReturn);

  // Exit-to-menu action: closes the modal and routes back to the main menu
  const exitToMenu = () => {
    onOpenChange(false);
    setDeckEditorReturn("main-menu");
    setView("main-menu");
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-md">
      <DialogHeader><DialogTitle className="text-amber-400">Ajustes</DialogTitle><DialogDescription className="text-zinc-400">Personaliza tu experiencia.</DialogDescription></DialogHeader>
      <div className="space-y-3">
        <button onClick={toggleSound} className={cn("flex w-full items-center justify-between rounded-lg border px-4 py-3 transition-colors", soundOn ? "border-emerald-700/50 bg-emerald-950/40" : "border-zinc-700 bg-zinc-900")}>
          <div className="flex items-center gap-3">{soundOn ? <Volume2 className="h-5 w-5 text-emerald-400" /> : <VolumeX className="h-5 w-5 text-zinc-500" />}<div className="text-left"><div className="text-sm font-bold text-white">Sonido</div><div className="text-[10px] text-zinc-400">{soundOn ? "Activado" : "Desactivado"}</div></div></div>
          <div className={cn("relative h-6 w-11 rounded-full transition-colors", soundOn ? "bg-emerald-500" : "bg-zinc-700")}><span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", soundOn ? "translate-x-5" : "translate-x-0.5")} /></div>
        </button>
        <button onClick={toggleAnim} className={cn("flex w-full items-center justify-between rounded-lg border px-4 py-3 transition-colors", animOn ? "border-amber-700/50 bg-amber-950/40" : "border-zinc-700 bg-zinc-900")}>
          <div className="flex items-center gap-3">{animOn ? <Sparkles className="h-5 w-5 text-amber-400" /> : <Sparkles className="h-5 w-5 text-zinc-500" />}<div className="text-left"><div className="text-sm font-bold text-white">Animaciones</div><div className="text-[10px] text-zinc-400">{animOn ? "Activadas" : "Desactivadas"}</div></div></div>
          <div className={cn("relative h-6 w-11 rounded-full transition-colors", animOn ? "bg-amber-500" : "bg-zinc-700")}><span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", animOn ? "translate-x-5" : "translate-x-0.5")} /></div>
        </button>

        {/* Exit to main menu — only shown in combat context (rendered above the game header) */}
        <div className="pt-1 border-t border-zinc-800">
          <Button
            variant="outline"
            className="w-full border-rose-800/50 bg-rose-950/40 text-rose-300 hover:bg-rose-900/40 hover:text-rose-200"
            onClick={exitToMenu}
          >
            <LogOut className="h-4 w-4" />
            Salir al Menú Principal
          </Button>
          <p className="mt-1 text-center text-[9px] uppercase tracking-widest text-zinc-600">
            La partida en curso se perderá
          </p>
        </div>

        <Button variant="outline" className="w-full border-zinc-700 bg-zinc-900 text-zinc-200" onClick={() => onOpenChange(false)}>Cerrar</Button>
      </div>
    </DialogContent>
  </Dialog>;
}
