"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { WARRIOR_DECK } from "@/lib/game/cards";
import { CATEGORY_META } from "@/lib/game/types";
import { Swords, Shield, Flame, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface RulesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RulesModal({ open, onOpenChange }: RulesModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-zinc-800 bg-zinc-950 text-zinc-200 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-amber-400">
            Reglas del Guerrero Táctico
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Juego de cartas por carriles inspirado en WoW TCG. Vence al rival en 2
            de 3 líneas para ganar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* Objetivo */}
          <section>
            <h3 className="mb-1 flex items-center gap-2 text-base font-bold text-white">
              <Swords className="h-4 w-4 text-amber-400" /> Objetivo
            </h3>
            <p className="text-zinc-300">
              Tienes <strong>6 turnos</strong>. En cada turno gastas tu energía en
              cartas para acumular poder en 3 carriles (Armas, Protección, Furia). Al
              final, comparas tu poder con el del rival en cada carril. Ganas si
              vences en al menos 2 de los 3 carriles.
            </p>
          </section>

          {/* Energía */}
          <section>
            <h3 className="mb-1 flex items-center gap-2 text-base font-bold text-white">
              <Zap className="h-4 w-4 text-emerald-400" /> Energía
            </h3>
            <p className="text-zinc-300">
              Empiezas con <strong>1 de energía</strong> en el turno 1. Cada turno
              sube +1 (máx. 6 en el turno 6). Cada carta cuesta entre 1 y 5 puntos
              de energía. Si no puedes (o no quieres) jugar más cartas, pulsa{" "}
              <em>Pasar Turno</em>.
            </p>
          </section>

          {/* Carriles */}
          <section>
            <h3 className="mb-1 flex items-center gap-2 text-base font-bold text-white">
              <Shield className="h-4 w-4 text-sky-400" /> Carriles y bonos
            </h3>
            <ul className="space-y-1.5 text-zinc-300">
              <li className="flex items-start gap-2">
                <span>⚔️</span>
                <span>
                  <strong className="text-amber-300">ARMAS</strong> — bono de campo{" "}
                  <strong>+3</strong> a cartas de la categoría <em>Ataque</em>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span>🛡️</span>
                <span>
                  <strong className="text-sky-300">PROTECCIÓN</strong> — bono de
                  campo <strong>+3</strong> a cartas de la categoría <em>Ítem</em>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span>🔥</span>
                <span>
                  <strong className="text-rose-300">FURIA</strong> — bono de campo{" "}
                  <strong>+3</strong> a cartas de la categoría <em>Magia</em>.
                </span>
              </li>
            </ul>
          </section>

          {/* Sinergia de subtipo */}
          <section>
            <h3 className="mb-1 flex items-center gap-2 text-base font-bold text-white">
              <Flame className="h-4 w-4 text-rose-400" /> Sinergia de subtipo
            </h3>
            <p className="text-zinc-300">
              Cada carta lista uno o más subtipos (armas/proteccion/furia). Si la
              juegas en un carril que coincide con uno de sus subtipos, gana{" "}
              <strong className="text-emerald-400">+4 de poder</strong> adicional. El
              bono de campo (+3) y la sinergia (+4) son acumulables.
            </p>
          </section>

          {/* Cómo jugar */}
          <section>
            <h3 className="mb-1 text-base font-bold text-white">Cómo jugar</h3>
            <ol className="list-inside list-decimal space-y-1 text-zinc-300">
              <li>Toca una carta de tu mano para seleccionarla.</li>
              <li>
                Toca el carril donde quieras jugarla. Si no tienes energía
                suficiente, verás un aviso.
              </li>
              <li>
                Repite hasta quedarte sin energía o sin ganas de jugar más.
              </li>
              <li>Pulsa <em>Pasar Turno</em>. El rival jugará sus cartas.</li>
              <li>Cada carril admite un máximo de 4 cartas por bando.</li>
            </ol>
          </section>

          {/* Mazo */}
          <section>
            <h3 className="mb-1 text-base font-bold text-white">
              El mazo del Guerrero
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {WARRIOR_DECK.map((c) => {
                const cat = CATEGORY_META[c.category];
                return (
                  <div
                    key={c.id}
                    className={cn(
                      "rounded border bg-zinc-900/60 p-2",
                      cat.borderClass
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn("text-xs font-bold", cat.textClass)}>
                        {c.name}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        ⚡{c.cost} · ⚔{c.power}
                      </span>
                    </div>
                    <div className="mt-1 text-[10px] uppercase text-zinc-400">
                      {cat.label} · {c.subtypes.join(" / ")}
                    </div>
                    <div className="mt-1 text-[11px] text-zinc-300">{c.text}</div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
