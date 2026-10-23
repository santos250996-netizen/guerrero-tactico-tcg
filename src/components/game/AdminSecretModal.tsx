"use client";

// ============================================================================
// AdminSecretModal — panel OCULTO del modo admin (solo se abre con el gesto
// secreto: 7 toques en la versión del menú). Toggle con confirmación en dos
// pasos y reload al aplicar, para que todas las vistas relean el estado.
// ============================================================================

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { KeyRound, X, ShieldCheck, ShieldOff, Crown, AlertTriangle } from "lucide-react";
import { useAdminStore } from "@/store/adminStore";
import { ALL_CARDS_V3 } from "@/lib/game/cards";
import { sfx } from "@/lib/sound";
import { haptic } from "@/lib/haptics";

export function AdminSecretModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const on = useAdminStore((s) => s.on);
  // Confirmación en 2 toques: la 1ª pulsación arma el botón (se desarma sola).
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!open) setArmed(false);
  }, [open]);

  const apply = () => {
    haptic("success");
    if (on) useAdminStore.getState().disable();
    else useAdminStore.getState().enable();
    // Reload limpio: menús, selector y colección releen el estado persistido.
    setTimeout(() => location.reload(), 350);
  };

  const press = () => {
    sfx.click();
    if (!armed) {
      setArmed(true);
      setTimeout(() => setArmed(false), 3000);
      return;
    }
    apply();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 22 }}
            className="w-full max-w-sm rounded-2xl border-2 border-rose-500/40 bg-gradient-to-b from-zinc-950 to-black p-4 shadow-[0_0_30px_rgba(244,63,94,0.15)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-rose-400" />
                <h2
                  className="text-sm font-black uppercase tracking-[0.25em] text-rose-300"
                  style={{ fontFamily: "var(--font-cinzel), serif" }}
                >
                  Modo Admin
                </h2>
              </div>
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-700 text-zinc-400 hover:text-zinc-100"
                aria-label="Cerrar"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Estado actual */}
            <div className="mt-3 flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Estado</span>
              {on ? (
                <span className="flex items-center gap-1 rounded-full border border-emerald-400/60 bg-emerald-900/60 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-300">
                  <ShieldCheck className="h-3 w-3" /> Activo
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-zinc-400">
                  <ShieldOff className="h-3 w-3" /> Inactivo
                </span>
              )}
            </div>

            {/* Qué hace cada acción */}
            <div className="mt-2 space-y-1 text-[9px] leading-relaxed text-zinc-400">
              {on ? (
                <p className="flex gap-1.5">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
                  <span>
                    Al <b className="text-amber-300">desactivar</b> se restaura tu colección, clases y victorias
                    EXACTAS de antes de activar el modo. Lo ganado con el admin encendido se descarta.
                  </span>
                </p>
              ) : (
                <p className="flex gap-1.5">
                  <Crown className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
                  <span>
                    Al <b className="text-amber-300">activar</b>: las <b className="text-zinc-200">6 clases</b> se
                    vuelven jugables y recibes las{" "}
                    <b className="text-zinc-200">{ALL_CARDS_V3.length} cartas en MÍTICO</b>. Tu progreso real queda
                    guardado y vuelve al desactivar.
                  </span>
                </p>
              )}
              <p className="text-zinc-500">
                Recuerda: una carta en MÍTICO está <b className="text-rose-300">COMPLETADA</b> — deja de aparecer en
                el botín de cualquier rareza.
              </p>
            </div>

            {/* Botón toggle con confirmación */}
            <button
              onClick={press}
              className={
                "mt-3 w-full rounded-lg border px-3 py-2.5 text-[11px] font-black uppercase tracking-[0.2em] transition-colors " +
                (armed
                  ? "border-amber-300/80 bg-amber-900/70 text-amber-100"
                  : on
                    ? "border-rose-400/60 bg-gradient-to-b from-rose-800/80 to-zinc-950/90 text-rose-100 hover:border-rose-300/70"
                    : "border-emerald-400/60 bg-gradient-to-b from-emerald-800/80 to-zinc-950/90 text-emerald-100 hover:border-emerald-300/70")
              }
              style={{ fontFamily: "var(--font-cinzel), serif" }}
            >
              {armed
                ? "¿Seguro? Toca de nuevo para confirmar"
                : on
                  ? "Desactivar modo admin"
                  : "Activar modo admin"}
            </button>

            <p className="mt-2 text-center text-[8px] uppercase tracking-[0.2em] text-zinc-600">
              Acceso: 7 toques en la versión del menú
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
