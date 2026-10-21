"use client";

// ============================================================================
// CardJuiceLayer — juice FÍSICO sobre las cartas (DOM), complementa el canvas
// de FxLayer. Se suscribe al mismo fxBus y opera sobre [data-card-uid]:
//
//   ▸ mutation value>0 : PULSO DE BUFF — flash esmeralda + scale up y vuelta.
//   ▸ mutation value<0 : HIT — flash rojo (SIN empujón: el knockback era un
//                        «choque» imperceptible que costaba layout — fuera).
//   ▸ destroy          : MUERTE POR SPEC — clona la carta en un overlay fijo y
//                        la anima según su spec (quemado / congelación /
//                        disolución venenosa / desvanecimiento en sombra /
//                        tajo genérico) mientras la real se desmonta.
//
// Todo imperativo (WAAPI + nodos temporales): no toca React state, así que no
// provoca re-renders. Respeta settings.animationsOn y prefers-reduced-motion.
// Los rects se capturan SINCRÓNICAMENTE al llegar el evento (las stores emiten
// ANTES del set() del store) y la animación se aplica tras el delayMs.
// ============================================================================

import { useEffect } from "react";
import { subscribeFx, type FxEvent } from "@/lib/game/fx";
import { useSettings } from "@/lib/settings";

// ---------------------------------------------------------------------------
// Guardas
// ---------------------------------------------------------------------------

const reducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const enabled = () => useSettings.getState().animationsOn && !reducedMotion();

const uidEl = (uid: string): HTMLElement | null =>
  document.querySelector<HTMLElement>(`[data-card-uid="${uid}"]`);

// ---------------------------------------------------------------------------
// Overlays temporales
// ---------------------------------------------------------------------------

function flashOverlay(el: HTMLElement, color: string, duration = 340) {
  const r = el.getBoundingClientRect();
  if (r.width < 2) return;
  const div = document.createElement("div");
  div.style.cssText = [
    "position:fixed",
    `left:${r.left}px`, `top:${r.top}px`,
    `width:${r.width}px`, `height:${r.height}px`,
    "border-radius:8px",
    `background:${color}`,
    "pointer-events:none",
    "z-index:60",
    "mix-blend-mode:screen",
  ].join(";");
  div.animate(
    [{ opacity: 0 }, { opacity: 0.9, offset: 0.22 }, { opacity: 0 }],
    { duration, easing: "ease-out", fill: "forwards" }
  );
  document.body.appendChild(div);
  setTimeout(() => div.remove(), duration + 60);
}

/** Vector de empuje eliminado — el «choque» entre cartas era imperceptible
 *  y movía layout en WebView low-end (jank). El flash rojo basta. */

function buffPulse(el: HTMLElement) {
  el.animate(
    [
      { transform: "scale(1)" },
      { transform: "scale(1.13)", offset: 0.35 },
      { transform: "scale(1)" },
    ],
    { duration: 420, easing: "ease-out" }
  );
}

// ---------------------------------------------------------------------------
// Muerte por spec — clon animado
// ---------------------------------------------------------------------------

type DeathKeyframes = Keyframe[];

const DEATH_BY_SPEC: Record<string, DeathKeyframes> = {
  // Mago — fuego: se consume en brasas ascendiendo
  fuego: [
    { transform: "scale(1) translateY(0)", filter: "brightness(1) saturate(1)", opacity: 1 },
    { transform: "scale(1.1) translateY(-4px)", filter: "brightness(2.1) saturate(2.4) sepia(0.55) hue-rotate(-25deg)", opacity: 0.92, offset: 0.35 },
    { transform: "scale(1.3) translateY(-16px)", filter: "brightness(2.7) saturate(3) sepia(0.85) hue-rotate(-30deg)", opacity: 0 },
  ],
  // Mago — hielo: cristaliza y se quiebra
  hielo: [
    { transform: "scale(1)", filter: "brightness(1) saturate(1)", opacity: 1 },
    { transform: "scale(1.06)", filter: "brightness(1.8) saturate(0.45) hue-rotate(150deg)", opacity: 0.95, offset: 0.3 },
    { transform: "scale(0.92)", filter: "brightness(2.1) saturate(0.2) hue-rotate(165deg) blur(1.5px)", opacity: 0 },
  ],
  // Asesino — veneno: se disuelve en bilis hacia abajo
  veneno: [
    { transform: "scale(1) translateY(0)", filter: "saturate(1)", opacity: 1 },
    { transform: "scale(1.05)", filter: "saturate(2.1) hue-rotate(45deg) brightness(1.15)", opacity: 0.9, offset: 0.3 },
    { transform: "scale(0.9) translateY(13px)", filter: "saturate(2.6) hue-rotate(65deg) blur(2.5px) brightness(0.75)", opacity: 0 },
  ],
  // Asesino — sigilo: se desvanece en sombras
  sigilo: [
    { transform: "scale(1) translateX(0)", filter: "grayscale(0) brightness(1)", opacity: 1 },
    { transform: "scale(0.96) translateX(4px)", filter: "grayscale(1) blur(1px) brightness(0.55)", opacity: 0.5, offset: 0.5 },
    { transform: "scale(0.88) translateX(-3px)", filter: "grayscale(1) blur(3px) brightness(0.35)", opacity: 0 },
  ],
};

/** Genérico (armas/protección/furia/combate): tajo — flash blanco, rígido, cae. */
const DEATH_DEFAULT: DeathKeyframes = [
  { transform: "scale(1) rotate(0deg) translateY(0)", filter: "brightness(1) saturate(1)", opacity: 1 },
  { transform: "scale(1.07) rotate(1.6deg)", filter: "brightness(2.3) saturate(0.15)", opacity: 0.9, offset: 0.25 },
  { transform: "scale(0.88) rotate(-2.4deg) translateY(9px)", filter: "brightness(0.65) saturate(0.1)", opacity: 0 },
];

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function CardJuiceLayer() {
  useEffect(() => {
    let disposed = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => {
      timers.push(setTimeout(() => { if (!disposed) fn(); }, Math.max(0, ms)));
    };

    const onEvents = (events: FxEvent[]) => {
      if (!enabled()) return;

      for (const ev of events) {
        // ── MUTACIÓN: buff o hit ──
        if (ev.kind === "mutation" && ev.targetUids?.length) {
          const positive = (ev.value ?? 0) > 0;
          for (const uid of ev.targetUids) {
            // captura del elemento en el momento del evento (aún existe)
            const el = uidEl(uid);
            if (!el) continue;
            later(() => {
              const live = uidEl(uid); // re-resuelve tras el delay
              if (!live) return;
              if (positive) {
                buffPulse(live);
                flashOverlay(live, "radial-gradient(circle, rgba(52,211,153,0.5), rgba(16,185,129,0.15))");
              } else {
                flashOverlay(live, "radial-gradient(circle, rgba(255,80,100,0.55), rgba(225,29,72,0.2))");
              }
            }, ev.delayMs ?? 0);
          }
          continue;
        }

        // ── DESTRUCCIÓN: clon de muerte por spec ──
        if (ev.kind === "destroy" && ev.targetUids?.length) {
          for (const uid of ev.targetUids) {
            const el = uidEl(uid);
            if (!el) continue;
            // captura SINCRÓNICA (rect + src + spec) — el set() del store aún no corrió
            const rect = el.getBoundingClientRect();
            const imgSrc = el.querySelector("img")?.getAttribute("src") ?? null;
            const spec = el.dataset.spec ?? "";
            if (!imgSrc || rect.width < 2) continue;
            later(() => {
              const ghost = buildDeathGhost(rect, imgSrc, spec);
              if (ghost) document.body.appendChild(ghost);
            }, ev.delayMs ?? 0);
          }
        }
      }
    };

    const unsub = subscribeFx(onEvents);
    return () => {
      disposed = true;
      unsub();
      for (const t of timers) clearTimeout(t);
      timers.length = 0;
    };
  }, []);

  return null;
}

// ---------------------------------------------------------------------------
// Constructor del clon de muerte (fuera del effect para poder testearlo solo)
// ---------------------------------------------------------------------------

function buildDeathGhost(
  rect: DOMRect,
  imgSrc: string,
  spec: string
): HTMLDivElement | null {
  const keyframes = DEATH_BY_SPEC[spec] ?? DEATH_DEFAULT;
  const duration = spec === "veneno" ? 520 : spec === "fuego" ? 500 : 430;

  const clone = document.createElement("div");
  clone.style.cssText = [
    "position:fixed",
    `left:${rect.left}px`, `top:${rect.top}px`,
    `width:${rect.width}px`, `height:${rect.height}px`,
    "border-radius:8px",
    "overflow:hidden",
    "pointer-events:none",
    "z-index:58",
    "will-change:transform,filter,opacity",
  ].join(";");
  const im = document.createElement("img");
  im.src = imgSrc;
  im.alt = "";
  im.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";
  clone.appendChild(im);

  const anim = clone.animate(keyframes, { duration, easing: "ease-out", fill: "forwards" });
  const cleanup = () => clone.remove();
  anim.onfinish = cleanup;
  setTimeout(cleanup, duration + 250);
  return clone;
}
