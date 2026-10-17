"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/settings";
import { Swords, Shield, Flame, Zap, Trophy } from "lucide-react";

export function OnboardingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const markSeen = useSettings((s) => s.markOnboardingSeen);
  return <Dialog open={open} onOpenChange={(o) => { if (!o) { markSeen(); onClose(); } }}>
    <DialogContent className="max-h-[90vh] overflow-y-auto border-amber-700/50 bg-zinc-950 text-zinc-100 sm:max-w-lg">
      <DialogHeader><DialogTitle className="flex items-center gap-2 text-2xl font-black text-amber-400"><Swords className="h-6 w-6" />¡Bienvenido, Guerrero!</DialogTitle>
        <DialogDescription className="text-zinc-400">TCG táctico por carriles. Tienes 6 turnos para acumular poder en 3 carriles y vencer al rival.</DialogDescription></DialogHeader>
      <div className="space-y-4 text-sm">
        <section className="rounded-lg border border-amber-800/40 bg-amber-950/30 p-3"><h3 className="mb-2 flex items-center gap-2 font-bold text-amber-300"><Trophy className="h-4 w-4" />Objetivo</h3><p className="text-zinc-300">Vence al rival en <strong>2 de 3 carriles</strong>.</p></section>
        <section className="grid grid-cols-3 gap-2">
          <div className="rounded border border-amber-800/40 bg-amber-950/20 p-2 text-center"><Swords className="mx-auto mb-1 h-5 w-5 text-amber-400" /><div className="text-[10px] font-bold uppercase text-amber-300">Armas</div><div className="text-[9px] text-zinc-500">Ataque</div></div>
          <div className="rounded border border-sky-800/40 bg-sky-950/20 p-2 text-center"><Shield className="mx-auto mb-1 h-5 w-5 text-sky-400" /><div className="text-[10px] font-bold uppercase text-sky-300">Protección</div><div className="text-[9px] text-zinc-500">Ítem</div></div>
          <div className="rounded border border-rose-800/40 bg-rose-950/20 p-2 text-center"><Flame className="mx-auto mb-1 h-5 w-5 text-rose-400" /><div className="text-[10px] font-bold uppercase text-rose-300">Furia</div><div className="text-[9px] text-zinc-500">Acción</div></div>
        </section>
        <section className="rounded-lg border border-emerald-800/40 bg-emerald-950/20 p-3"><h3 className="mb-1 flex items-center gap-2 font-bold text-emerald-300"><Zap className="h-4 w-4" />Energía</h3><p className="text-zinc-300">Empiezas con <strong>1</strong> y sube +1 cada turno (máx. 6).</p></section>
        <section className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-3 text-zinc-300"><h3 className="mb-1 font-bold text-white">Cómo jugar</h3><ol className="list-inside list-decimal space-y-1 text-sm"><li>Toca una carta para seleccionarla.</li><li>Toca el carril donde quieras jugarla.</li><li>Pulsa "Pasar Turno" cuando termines.</li></ol></section>
      </div>
      <Button className="mt-2 w-full bg-gradient-to-r from-amber-600 to-rose-600 text-white hover:from-amber-500 hover:to-rose-500" onClick={() => { markSeen(); onClose(); }}>¡A la batalla!</Button>
    </DialogContent>
  </Dialog>;
}
