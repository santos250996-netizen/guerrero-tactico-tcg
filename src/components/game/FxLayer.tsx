"use client";

// ============================================================================
// FxLayer — capa ÚNICA de efectos (canvas 2D) para todo el juego.
//
//   ▸ Ambiente: partículas continuas por carril (9 recetas, LANE_AMBIENT),
//     ancladas a los rects del DOM con re-sincronización periódica.
//   ▸ VFX de keywords: recetas por keyword (KEYWORD_FX en lib/game/fx.ts)
//     disparadas por el fxBus (gameStore / pvpStore emiten eventos).
//   ▸ Anclaje: [data-card-uid] (preciso) → [data-pvp-lane] / [data-lane-id]
//     (fallback del carril) → centro de pantalla (último recurso).
//
// Rendimiento: calidad adaptativa por dispositivo (lib/game/perf.ts) —
// presupuesto de partículas / DPR / tope de FPS / rate ambiental según tier.
// Sin mix-blend-mode CSS (caro en móvil): el glow se logra con
// globalCompositeOperation="lighter" DENTRO del canvas. Se pausa con la
// pestaña oculta. Respeta settings.animationsOn y prefers-reduced-motion.
// ============================================================================

import { useEffect, useRef } from "react";
import type { LaneId } from "@/lib/game/types";
import { KEYWORD_META } from "@/lib/game/types";
import {
  KEYWORD_FX,
  LANE_AMBIENT,
  subscribeFx,
  type AmbientRecipe,
  type FxEvent,
  type FxRecipe,
} from "@/lib/game/fx";
import { useSettings } from "@/lib/settings";
import { perfTier } from "@/lib/game/perf";

// ---------------------------------------------------------------------------
// Paletas
// ---------------------------------------------------------------------------

type RGB = [number, number, number];

const RECIPE_COLOR: Record<FxRecipe, RGB> = {
  buff_up: [52, 211, 153],
  shield_ring: [56, 189, 248],
  award_burst: [251, 191, 36],
  destroy_slash: [244, 63, 94],
  spirit_transfer: [74, 222, 128],
  fortify_sweep: [251, 191, 36],
  armor_break: [245, 158, 11],
  sword_glint: [253, 230, 138],
  bless_rings: [125, 211, 252],
  cleanse: [186, 230, 253],
  rage_burst: [251, 113, 133],
  target_debuff: [244, 63, 94],
  arcane_converge: [167, 139, 250],
  overload_burst: [196, 181, 253],
  overload_decay: [167, 139, 250],
  flame_sweep: [251, 146, 60],
  explosion: [251, 146, 60],
  frost_renew: [103, 232, 249],
  frost_sweep: [103, 232, 249],
  poison_drip: [163, 230, 53],
  poison_spread: [163, 230, 53],
  clash_multi: [248, 113, 113],
  crosshair: [248, 113, 113],
  shadow_blink: [129, 140, 248],
  skull_burst: [148, 163, 184],
  shield_flash: [56, 189, 248],
  trap_burst: [251, 191, 36],
  play_dust: [253, 224, 71],
  shatter: [226, 232, 240],
};

const AMBIENT_COLOR: Record<AmbientRecipe, RGB> = {
  motes: [251, 191, 36],
  light: [125, 211, 252],
  embers: [251, 113, 133],
  arcane: [167, 139, 250],
  flames: [251, 146, 60],
  snow: [165, 243, 252],
  bubbles: [163, 230, 53],
  clash: [248, 113, 113],
  mist: [129, 140, 248],
};

/** Partículas/segundo por carril (bajas a propósito: ambiente, no ruido). */
const AMBIENT_RATE: Record<AmbientRecipe, number> = {
  motes: 2.6,
  light: 0.7,
  embers: 3.4,
  arcane: 2.6,
  flames: 4.2,
  snow: 3.6,
  bubbles: 2.2,
  clash: 2.8,
  mist: 1.4,
};

// ---------------------------------------------------------------------------
// Partículas
// ---------------------------------------------------------------------------

type Shape =
  | "dot" | "spark" | "flake" | "ring" | "slash"
  | "hex" | "bubble" | "star" | "text";

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  rot: number; rotSpeed: number;
  color: RGB; alpha0: number;
  shape: Shape;
  gravity: number; drag: number;
  twinkle: number; // 0 = no; velocidad de parpadeo
  growth: number; // px/s para ring/hex
  text?: string;
  // convergencia: moverse hacia un punto durante su vida
  endX?: number; endY?: number;
  startLife?: number;
}

interface AmbientEmitter {
  key: string;
  laneId: LaneId;
  rect: DOMRect;
  acc: number;
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function rectCenter(r: DOMRect): { x: number; y: number } {
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function cardAnchor(r: DOMRect): { x: number; y: number; w: number; h: number } {
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function FxLayer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ── Singleton: si ya hay otra instancia viva, esta no hace nada ──
    const w = window as unknown as { __fxLayerActive?: symbol };
    const myToken = Symbol("fx");
    if (w.__fxLayerActive) return;
    w.__fxLayerActive = myToken;

    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const enabled = () =>
      useSettings.getState().animationsOn && !reducedMotion;

    // ── Estado + calidad adaptativa ──
    const CFG = {
      low:  { maxParticles: 190, dprCap: 1.25, fps: 30, ambientMul: 0.55, textGlow: false },
      med:  { maxParticles: 320, dprCap: 1.5,  fps: 60, ambientMul: 0.8,  textGlow: false },
      high: { maxParticles: 460, dprCap: 2,    fps: 60, ambientMul: 1,    textGlow: true },
    }[perfTier()];
    const FRAME_MS = 1000 / CFG.fps;

    let particles: Particle[] = [];
    const MAX_PARTICLES = CFG.maxParticles;
    let emitters: AmbientEmitter[] = [];
    let raf = 0;
    let lastT = performance.now();
    let lastFrame = 0;
    let resyncT = 0;
    let disposed = false;

    const dpr = () => Math.min(CFG.dprCap, window.devicePixelRatio || 1);

    const resize = () => {
      const r = dpr();
      canvas!.width = Math.round(window.innerWidth * r);
      canvas!.height = Math.round(window.innerHeight * r);
      canvas!.style.width = `${window.innerWidth}px`;
      canvas!.style.height = `${window.innerHeight}px`;
      ctx!.setTransform(r, 0, 0, r, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // ── Anclaje DOM ──
    const laneSelector = (ev: FxEvent): string | null => {
      if (ev.lanePos !== undefined && ev.lanePos !== null) {
        const row = ev.side === "player" ? "me" : "rival";
        return `[data-pvp-lane="${row}-${ev.lanePos}"]`;
      }
      if (ev.lane) return `[data-lane-id="${ev.lane}"]`;
      return null;
    };

    const rectOf = (el: Element | null): DOMRect | null =>
      el ? el.getBoundingClientRect() : null;

    const laneRect = (ev: FxEvent): DOMRect | null => {
      const sel = laneSelector(ev);
      return sel ? rectOf(document.querySelector(sel)) : null;
    };

    const uidRect = (uid: string): DOMRect | null =>
      rectOf(document.querySelector(`[data-card-uid="${uid}"]`));

    const shakeEl = (el: Element | null) => {
      if (!el) return;
      el.classList.remove("fx-shake");
      // forzar reflow para reiniciar la animación
      void (el as HTMLElement).offsetWidth;
      el.classList.add("fx-shake");
      setTimeout(() => el.classList.remove("fx-shake"), 480);
    };

    /** Sacudida global del tablero (explosiones grandes / impactos fuertes). */
    const shakeBoard = () => {
      const board = document.querySelector("[data-board-root]");
      if (!board) return;
      board.classList.remove("fx-shake-board");
      void (board as HTMLElement).offsetWidth;
      board.classList.add("fx-shake-board");
      setTimeout(() => board.classList.remove("fx-shake-board"), 400);
    };

    // ── Spawning de partículas ──
    const push = (p: Particle) => {
      if (particles.length >= MAX_PARTICLES) return;
      p.startLife = p.life;
      particles.push(p);
    };

    const baseParticle = (x: number, y: number, color: RGB, over: Partial<Particle> = {}): Particle => ({
      x, y,
      vx: 0, vy: 0,
      life: 0.8, maxLife: 0.8,
      size: 2.4,
      rot: rand(0, Math.PI * 2), rotSpeed: rand(-2, 2),
      color, alpha0: 0.85,
      shape: "dot",
      gravity: 0, drag: 1,
      twinkle: 0,
      growth: 0,
      ...over,
    });

    /** Ráfaga radial de puntos/chispas. */
    const burst = (
      cx: number, cy: number, color: RGB,
      count = 16, speed = 90, opts: Partial<Particle> = {}
    ) => {
      for (let i = 0; i < count; i++) {
        const a = rand(0, Math.PI * 2);
        const v = rand(speed * 0.35, speed);
        push(baseParticle(cx, cy, color, {
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v,
          life: rand(0.4, 0.85),
          maxLife: 0.85,
          size: rand(1.6, 3.4),
          shape: Math.random() < 0.35 ? "spark" : "dot",
          drag: 0.92,
          gravity: opts.gravity ?? 40,
          ...opts,
        }));
      }
    };

    /** Anillo expansivo. */
    const ring = (cx: number, cy: number, color: RGB, size = 10, growth = 90, life = 0.55, lineWidth = 2.2) => {
      void lineWidth;
      push(baseParticle(cx, cy, color, {
        shape: "ring", size, growth, life, maxLife: life, alpha0: 0.9,
        rotSpeed: 0,
      }));
    };

    /** Tajo diagonal sobre una carta. */
    const slash = (c: { x: number; y: number; w: number; h: number }, color: RGB, life = 0.28, tilt = rand(-0.5, -0.2)) => {
      push(baseParticle(c.x + rand(-c.w * 0.15, c.w * 0.15), c.y, color, {
        shape: "slash", life, maxLife: life, size: Math.max(c.w, 34) * 0.95,
        rot: tilt, alpha0: 0.95, drag: 1,
      }));
    };

    /** Columna de energía vertical. */
    const column = (cx: number, cy: number, color: RGB, h = 60, life = 0.5) => {
      for (let i = 0; i < 10; i++) {
        const t = i / 10;
        push(baseParticle(cx + rand(-5, 5), cy + h / 2 - t * h, color, {
          vy: rand(-30, -70), life: life * rand(0.6, 1), maxLife: life,
          size: rand(2, 3.6), shape: "dot", drag: 0.96, alpha0: 0.7,
        }));
      }
    };

    /** Copo de nieve dibujado (6 brazos). */
    const flake = (x: number, y: number, color: RGB, size = 3, vy = 22) => {
      push(baseParticle(x, y, color, {
        shape: "flake", size, vy, vx: rand(-6, 6),
        life: rand(1.2, 2), maxLife: 2, alpha0: 0.7, rotSpeed: rand(-1, 1), gravity: 0, drag: 1,
      }));
    };

    /** Burbuja de veneno. */
    const bubble = (x: number, y: number, color: RGB, size = 3) => {
      push(baseParticle(x, y, color, {
        shape: "bubble", size, vy: rand(-16, -34), vx: rand(-5, 5),
        life: rand(1.1, 1.9), maxLife: 1.9, alpha0: 0.55, gravity: -4, drag: 1,
      }));
    };

    /** Convergencia: partículas que vuelan hacia (ex, ey). */
    const converge = (from: { x: number; y: number }, to: { x: number; y: number }, color: RGB, count = 12, life = 0.6) => {
      for (let i = 0; i < count; i++) {
        const a = rand(0, Math.PI * 2);
        const d = rand(8, 30);
        push(baseParticle(from.x + Math.cos(a) * d, from.y + Math.sin(a) * d, color, {
          endX: to.x + rand(-6, 6), endY: to.y + rand(-6, 6),
          life: life * rand(0.75, 1.1), maxLife: life,
          size: rand(1.8, 3), alpha0: 0.9, drag: 1, gravity: 0,
        }));
      }
    };

    /** Destello arcano (estrella de 4 puntas). */
    const star = (x: number, y: number, color: RGB, size = 3) => {
      push(baseParticle(x, y, color, {
        shape: "star", size, life: rand(0.5, 1), maxLife: 1,
        alpha0: 0.85, twinkle: 9, drag: 1,
      }));
    };

    /** Etiqueta de texto flotante (nombre corto de la keyword). */
    const label = (x: number, y: number, text: string, color: RGB) => {
      push(baseParticle(x, y, color, {
        shape: "text", text, vy: -26, life: 0.95, maxLife: 0.95,
        size: 10, alpha0: 0.95, drag: 0.99, gravity: 0, rotSpeed: 0,
      }));
    };

    /** PROYECTIL: orbe brillante con estela que viaja de `from` a `to`.
        Núcleo grueso + 5 gotas de estela desfasadas (convergencia easiada). */
    const orb = (
      from: { x: number; y: number },
      to: { x: number; y: number },
      color: RGB,
      size = 4.2,
      life = 0.3
    ) => {
      push(baseParticle(from.x, from.y, color, {
        endX: to.x, endY: to.y,
        life, maxLife: life,
        size, alpha0: 1, drag: 1, gravity: 0, shape: "dot", rotSpeed: 0,
      }));
      for (let i = 1; i <= 5; i++) {
        const t = i / 6;
        push(baseParticle(
          from.x + (to.x - from.x) * t,
          from.y + (to.y - from.y) * t,
          color,
          {
            endX: to.x, endY: to.y,
            life: life * (1 - t * 0.55), maxLife: life,
            size: size * (0.72 - t * 0.42), alpha0: 0.55,
            drag: 1, gravity: 0, shape: "dot", rotSpeed: 0,
          }
        ));
      }
    };

    /** Rect de la carta origen (para proyectiles), si sigue en el DOM. */
    const sourceRectOf = (ev: FxEvent): DOMRect | null =>
      ev.sourceUid ? uidRect(ev.sourceUid) : null;

    // ── Recetas por keyword ──

    const atTargets = (
      ev: FxEvent,
      fallback: DOMRect | null,
      fn: (c: { x: number; y: number; w: number; h: number }, rect: DOMRect, i: number) => void
    ) => {
      const uids = ev.targetUids ?? [];
      let used = 0;
      uids.forEach((uid, i) => {
        const r = uidRect(uid);
        if (r && r.width > 0) {
          fn(cardAnchor(r), r, i);
          used++;
        }
      });
      if (used === 0 && fallback) {
        const c = cardAnchor(fallback);
        fn({ x: c.x, y: c.y, w: fallback.width * 0.6, h: fallback.height * 0.4 }, fallback, 0);
      }
    };

    const recipeAt = (recipe: FxRecipe, ev: FxEvent, laneR: DOMRect | null) => {
      const color = RECIPE_COLOR[recipe];
      const intensity = Math.min(1.6, 0.8 + (ev.value ?? 1) * 0.12);

      // ── Barridos horizontales por el carril (AoE) ──
      if (recipe === "fortify_sweep" || recipe === "flame_sweep" || recipe === "frost_sweep") {
        const r = laneR;
        if (!r) return;
        const cy = r.top + r.height * 0.5;
        const up = recipe === "fortify_sweep";
        // línea de barrido
        push(baseParticle(r.left + 6, cy, color, {
          shape: "slash", size: r.width - 12, rot: 0,
          life: 0.5, maxLife: 0.5, alpha0: 0.75, rotSpeed: 0,
        }));
        const n = Math.max(6, Math.round(r.width / 22));
        for (let i = 0; i < n; i++) {
          const t = i / n;
          push(baseParticle(r.left + t * r.width, cy + rand(-8, 8), color, {
            vx: rand(30, 90) * (up ? 0.4 : 1), vy: up ? rand(-40, -80) : rand(-14, 14),
            life: rand(0.35, 0.8), maxLife: 0.8, size: rand(1.8, 3.6),
            shape: recipe === "frost_sweep" ? "flake" : "spark",
            drag: 0.97, gravity: up ? -20 : 10, alpha0: 0.8,
          }));
        }
        // golpes por objetivo
        atTargets(ev, r, (c) => {
          ring(c.x, c.y, color, 8, 70, 0.45);
          burst(c.x, c.y, color, 8, 60);
        });
        return;
      }

      // ── Transferencias (origen → objetivo) ──
      if (recipe === "spirit_transfer" || recipe === "arcane_converge") {
        const from: { x: number; y: number } | null = (() => {
          if (ev.sourceUid) {
            const r = uidRect(ev.sourceUid);
            if (r) return rectCenter(r);
          }
          if (laneR) {
            const c = rectCenter(laneR);
            return { x: c.x + rand(-laneR.width / 3, laneR.width / 3), y: laneR.top + laneR.height * 0.15 };
          }
          return null;
        })();
        if (!from) return;
        atTargets(ev, laneR, (c) => {
          converge(from, c, color, recipe === "arcane_converge" ? 16 : 12, 0.65);
          ring(c.x, c.y, color, 6, 55, 0.5);
          burst(c.x, c.y, color, 7, 55);
        });
        return;
      }

      // ── Por objetivo (o carril como fallback) ──
      atTargets(ev, laneR, (c, _r, i) => {
        switch (recipe) {
          case "buff_up": {
            ring(c.x, c.y, color, 7, 55, 0.5);
            column(c.x, c.y, color, c.h * 0.9, 0.55);
            burst(c.x, c.y, color, 9, 55);
            break;
          }
          case "shield_ring":
          case "bless_rings": {
            ring(c.x, c.y, color, 8, 65, 0.6, 2.6);
            push(baseParticle(c.x, c.y, color, {
              shape: "hex", size: c.w * 0.42, life: 0.7, maxLife: 0.7,
              alpha0: 0.85, growth: 26, rotSpeed: 0.6,
            }));
            burst(c.x, c.y, color, 6, 40);
            break;
          }
          case "award_burst": {
            burst(c.x, c.y, color, 14, 85, { gravity: 30 });
            ring(c.x, c.y, color, 6, 60, 0.45);
            break;
          }
          case "destroy_slash": {
            slash(c, color);
            slash(c, [255, 255, 255], 0.22, rand(-0.7, -0.4));
            break;
          }
          case "armor_break": {
            slash(c, color, 0.3, rand(-0.6, -0.3));
            burst(c.x, c.y, color, 12, 95, { gravity: 120, shape: "spark" });
            break;
          }
          case "sword_glint": {
            slash(c, color, 0.3, -0.35);
            burst(c.x, c.y, [255, 255, 255], 6, 60);
            break;
          }
          case "cleanse": {
            converge({ x: c.x + rand(-c.w, c.w), y: c.y + c.h }, c, color, 10, 0.55);
            ring(c.x, c.y, color, 6, 50, 0.5);
            break;
          }
          case "rage_burst": {
            burst(c.x, c.y, color, 16, 110, { gravity: 60 });
            ring(c.x, c.y, color, 8, 80, 0.4);
            break;
          }
          case "target_debuff": {
            // Crueldad: proyectil de sombra desde el atacante si está en el DOM
            const srcD = sourceRectOf(ev);
            if (srcD) {
              orb(rectCenter(srcD), c, color, 3.8, 0.28);
              queued.push(setTimeout(() => {
                ring(c.x, c.y, color, c.w * 0.4, 0, 0.55, 2);
                for (let d = 0; d < 5; d++) {
                  push(baseParticle(c.x + rand(-c.w * 0.3, c.w * 0.3), c.y - c.h * 0.35, color, {
                    vy: rand(30, 60), life: rand(0.4, 0.7), maxLife: 0.7,
                    size: rand(1.8, 3), gravity: 60, shape: "dot",
                  }));
                }
                burst(c.x, c.y, color, 6, 50);
              }, 280));
            } else {
              ring(c.x, c.y, color, c.w * 0.4, 0, 0.55, 2);
              for (let d = 0; d < 5; d++) {
                push(baseParticle(c.x + rand(-c.w * 0.3, c.w * 0.3), c.y - c.h * 0.35, color, {
                  vy: rand(30, 60), life: rand(0.4, 0.7), maxLife: 0.7,
                  size: rand(1.8, 3), gravity: 60, shape: "dot",
                }));
              }
            }
            break;
          }
          case "overload_burst": {
            burst(c.x, c.y, color, 18, 120, { gravity: -30 });
            ring(c.x, c.y, [255, 255, 255], 8, 110, 0.35);
            column(c.x, c.y, color, c.h, 0.4);
            break;
          }
          case "overload_decay": {
            column(c.x, c.y, color, c.h * 0.8, 0.45);
            burst(c.x, c.y, [148, 163, 184], 7, 45, { gravity: 90 });
            break;
          }
          case "explosion": {
            // Combustión: bola de fuego desde el atacante + detonación al aterrizar
            const srcE = sourceRectOf(ev);
            if (srcE) {
              orb(rectCenter(srcE), c, color, 6, 0.3);
              queued.push(setTimeout(() => {
                burst(c.x, c.y, color, 26, 150 * intensity, { gravity: 40 });
                burst(c.x, c.y, [255, 237, 213], 10, 90);
                ring(c.x, c.y, color, 10, 130, 0.5, 3);
                const sel = laneSelector(ev);
                if (sel) shakeEl(document.querySelector(sel));
                shakeBoard();
              }, 300));
            } else {
              burst(c.x, c.y, color, 26, 150 * intensity, { gravity: 40 });
              burst(c.x, c.y, [255, 237, 213], 10, 90);
              ring(c.x, c.y, color, 10, 130, 0.5, 3);
              shakeBoard();
            }
            break;
          }
          case "frost_renew": {
            for (let f = 0; f < 8; f++) {
              flake(c.x + rand(-c.w * 0.5, c.w * 0.5), c.y + rand(-c.h * 0.5, c.h * 0.1), color, rand(2.4, 4), rand(10, 30));
            }
            converge({ x: c.x + rand(-20, 20), y: c.y - c.h }, c, color, 8, 0.6);
            ring(c.x, c.y, color, 7, 45, 0.6);
            break;
          }
          case "poison_drip": {
            for (let d = 0; d < 7; d++) {
              push(baseParticle(c.x + rand(-c.w * 0.35, c.w * 0.35), c.y - c.h * 0.6, color, {
                vy: rand(50, 90), life: rand(0.35, 0.6), maxLife: 0.6,
                size: rand(1.8, 3.2), shape: "bubble", gravity: 80,
              }));
            }
            ring(c.x, c.y, color, 6, 40, 0.5);
            break;
          }
          case "poison_spread": {
            for (let d = 0; d < 3; d++) {
              bubble(c.x + rand(-c.w * 0.5, c.w * 0.5), c.y + rand(-c.h * 0.3, c.h * 0.3), color, rand(2.6, 4.2));
            }
            ring(c.x, c.y, color, 6, 50, 0.55);
            break;
          }
          case "clash_multi": {
            for (let s = 0; s < 3; s++) {
              slash(c, color, 0.24 + s * 0.07, rand(-0.8, -0.1));
            }
            burst(c.x, c.y, color, 8, 70);
            break;
          }
          case "crosshair": {
            // Golpe Certero: daga-proyectil desde el atacante
            const srcC = sourceRectOf(ev);
            if (srcC) {
              orb(rectCenter(srcC), c, color, 3.2, 0.24);
              queued.push(setTimeout(() => {
                ring(c.x, c.y, color, c.w * 0.42, 0, 0.5, 2);
                push(baseParticle(c.x, c.y, color, {
                  shape: "slash", size: c.w * 0.5, rot: 0, life: 0.4, maxLife: 0.4, alpha0: 0.8, rotSpeed: 0,
                }));
                push(baseParticle(c.x, c.y, color, {
                  shape: "slash", size: c.w * 0.5, rot: Math.PI / 2, life: 0.4, maxLife: 0.4, alpha0: 0.8, rotSpeed: 0,
                }));
                burst(c.x, c.y, color, 8, 65);
              }, 240));
            } else {
              ring(c.x, c.y, color, c.w * 0.42, 0, 0.5, 2);
              push(baseParticle(c.x, c.y, color, {
                shape: "slash", size: c.w * 0.5, rot: 0, life: 0.4, maxLife: 0.4, alpha0: 0.8, rotSpeed: 0,
              }));
              push(baseParticle(c.x, c.y, color, {
                shape: "slash", size: c.w * 0.5, rot: Math.PI / 2, life: 0.4, maxLife: 0.4, alpha0: 0.8, rotSpeed: 0,
              }));
              burst(c.x, c.y, color, 8, 65);
            }
            break;
          }
          case "shadow_blink": {
            burst(c.x, c.y, color, 12, 70, { gravity: -20 });
            push(baseParticle(c.x, c.y, color, {
              shape: "hex", size: c.w * 0.45, life: 0.5, maxLife: 0.5,
              alpha0: 0.5, growth: 40, rotSpeed: -1,
            }));
            break;
          }
          case "skull_burst": {
            burst(c.x, c.y, color, 16, 100, { gravity: 70 });
            slash(c, color, 0.3, -0.5);
            ring(c.x, c.y, [99, 102, 241], 7, 70, 0.5);
            break;
          }
          case "shatter": {
            burst(c.x, c.y, color, 14, 100, { gravity: 130, shape: "spark" });
            burst(c.x, c.y, [244, 63, 94], 8, 70);
            break;
          }
          default:
            burst(c.x, c.y, color, 10, 70);
            break;
        }
        void i;
      });
    };

    // ── Procesado de eventos ──

    const spawnEvent = (ev: FxEvent) => {
      if (disposed || !enabled()) return;
      const laneR = laneRect(ev);

      switch (ev.kind) {
        case "play": {
          const anchor = (ev.sourceUid && uidRect(ev.sourceUid)) ?? laneR;
          if (!anchor) return;
          const c = cardAnchor(anchor);
          const y = anchor.height > 80 ? c.y + anchor.height * 0.25 : c.y;
          burst(c.x, y, RECIPE_COLOR.play_dust, 10, 55, { gravity: -30 });
          ring(c.x, y, [253, 230, 138], 8, 55, 0.4);
          break;
        }
        case "destroy": {
          atTargets(ev, laneR, (c) => {
            burst(c.x, c.y, RECIPE_COLOR.shatter, 13, 95, { gravity: 120, shape: "spark" });
            burst(c.x, c.y, [244, 63, 94], 7, 65);
            ring(c.x, c.y, [244, 63, 94], 7, 60, 0.4);
          });
          if (laneR) {
            const sel = laneSelector(ev);
            if (sel) shakeEl(document.querySelector(sel));
          }
          break;
        }
        case "shieldBlock": {
          atTargets(ev, laneR, (c) => {
            push(baseParticle(c.x, c.y, RECIPE_COLOR.shield_flash, {
              shape: "hex", size: c.w * 0.45, life: 0.6, maxLife: 0.6,
              alpha0: 0.9, growth: 30, rotSpeed: 0.4,
            }));
            ring(c.x, c.y, RECIPE_COLOR.shield_flash, 8, 55, 0.5, 2.4);
            burst(c.x, c.y, RECIPE_COLOR.shield_flash, 6, 40);
          });
          break;
        }
        case "trap": {
          const r = laneR;
          if (!r) return;
          const c = rectCenter(r);
          burst(c.x, c.y, RECIPE_COLOR.trap_burst, 14, 85, { gravity: 60 });
          label(c.x, r.top + r.height * 0.3, "¡TRAMPA!", RECIPE_COLOR.trap_burst);
          break;
        }
        case "keyword": {
          const kw = ev.keyword ?? "none";
          const recipe = KEYWORD_FX[kw];
          if (!recipe) return;
          recipeAt(recipe, ev, laneR);
          // etiqueta con el nombre corto de la keyword
          const anchorRect = (() => {
            const first = ev.targetUids?.[0];
            if (first) {
              const r = uidRect(first);
              if (r) return r;
            }
            return laneR;
          })();
          if (anchorRect) {
            const c = rectCenter(anchorRect);
            label(c.x, anchorRect.top + anchorRect.height * 0.22, KEYWORD_META[kw].short, RECIPE_COLOR[recipe]);
          }
          break;
        }
      }
    };

    const queued: ReturnType<typeof setTimeout>[] = [];
    const onEvents = (events: FxEvent[]) => {
      if (!enabled()) return;
      for (const ev of events) {
        queued.push(setTimeout(() => spawnEvent(ev), Math.max(0, ev.delayMs ?? 0)));
      }
    };
    const unsubFx = subscribeFx(onEvents);

    // ── Ambiente: re-sincroniza rects de carriles ──
    const resyncAmbient = () => {
      const next: AmbientEmitter[] = [];
      // PvP primero (data-pvp-lane); si existen, SOLO esos (evita duplicar los
      // data-lane-id que PvpLane también pinta).
      const pvpEls = document.querySelectorAll<HTMLElement>("[data-pvp-lane]");
      if (pvpEls.length > 0) {
        pvpEls.forEach((el) => {
          const key = el.dataset.pvpLane!;
          const laneId = (el.dataset.laneRecipe ?? el.dataset.laneId) as LaneId | undefined;
          if (!laneId || !LANE_AMBIENT[laneId]) return;
          const rect = el.getBoundingClientRect();
          if (rect.width < 10 || rect.height < 10) return;
          next.push({ key, laneId, rect, acc: emitters.find((e) => e.key === key)?.acc ?? 0 });
        });
      } else {
        const soloEls = document.querySelectorAll<HTMLElement>("[data-lane-id]");
        soloEls.forEach((el) => {
          const laneId = (el.dataset.laneRecipe ?? el.dataset.laneId) as LaneId | undefined;
          if (!laneId || !LANE_AMBIENT[laneId]) return;
          const rect = el.getBoundingClientRect();
          if (rect.width < 10 || rect.height < 10) return;
          next.push({ key: laneId, laneId, rect, acc: emitters.find((e) => e.key === laneId)?.acc ?? 0 });
        });
      }
      emitters = next;
    };

    const spawnAmbient = (e: AmbientEmitter, dt: number) => {
      const recipe = LANE_AMBIENT[e.laneId];
      const color = AMBIENT_COLOR[recipe];
      e.acc += AMBIENT_RATE[recipe] * dt * CFG.ambientMul;
      while (e.acc >= 1) {
        e.acc -= 1;
        if (particles.length >= MAX_PARTICLES) break;
        const x = rand(e.rect.left + 4, e.rect.right - 4);
        const y = rand(e.rect.top + 4, e.rect.bottom - 4);
        switch (recipe) {
          case "motes":
            push(baseParticle(x, y, color, {
              vy: rand(-6, -14), vx: rand(-3, 3), size: rand(1, 2.2),
              life: rand(1.6, 2.8), maxLife: 2.8, alpha0: rand(0.14, 0.3), twinkle: 2.2,
            }));
            break;
          case "light":
            push(baseParticle(x, y, color, {
              size: rand(6, 14), life: rand(1.8, 3), maxLife: 3,
              alpha0: rand(0.05, 0.11), vy: rand(-2, -6), twinkle: 1.2,
            }));
            break;
          case "embers":
            push(baseParticle(x, y, color, {
              vy: rand(-22, -48), vx: rand(-8, 8), size: rand(1.4, 2.8),
              life: rand(1, 2), maxLife: 2, alpha0: rand(0.2, 0.42),
              twinkle: 5, gravity: -8, drag: 1,
            }));
            break;
          case "arcane":
            star(x, y, color, rand(1.6, 3.4));
            break;
          case "flames":
            push(baseParticle(x, y, color, {
              vy: rand(-40, -80), vx: rand(-10, 10), size: rand(1.4, 3),
              life: rand(0.5, 1.1), maxLife: 1.1, alpha0: rand(0.25, 0.5),
              twinkle: 8, drag: 0.98,
            }));
            break;
          case "snow":
            flake(x, e.rect.top + 2, color, rand(1.8, 3.6), rand(14, 30));
            break;
          case "bubbles":
            bubble(x, y, color, rand(1.6, 3.4));
            break;
          case "clash":
            push(baseParticle(x, y, color, {
              vx: rand(-70, 70), vy: rand(-8, 8), size: rand(1.2, 2),
              life: rand(0.3, 0.7), maxLife: 0.7, alpha0: rand(0.2, 0.4),
              shape: "spark", drag: 0.96,
            }));
            break;
          case "mist":
            push(baseParticle(x, y, color, {
              size: rand(10, 24), life: rand(2.5, 4), maxLife: 4,
              alpha0: rand(0.04, 0.09), vx: rand(-8, 8), vy: rand(-3, 3), twinkle: 0.6,
            }));
            break;
        }
      }
    };

    // ── Loop (con tope de FPS por tier) ──
    const loop = (t: number) => {
      if (disposed) return;
      raf = requestAnimationFrame(loop);
      if (t - lastFrame < FRAME_MS - 1) return; // salta frames intermedios
      lastFrame = t;
      const dt = Math.min(0.05, (t - lastT) / 1000);
      lastT = t;

      resyncT += dt;
      if (resyncT > 0.7) {
        resyncT = 0;
        resyncAmbient();
      }

      ctx!.clearRect(0, 0, window.innerWidth, window.innerHeight);
      if (!enabled()) {
        // apagado: vacía todo y no genera
        if (particles.length) particles = [];
        return;
      }

      // Glow aditivo DENTRO del canvas (equivale al antiguo mix-blend screen
      // CSS, pero sin forzar el recompositado de toda la página cada frame).
      ctx!.globalCompositeOperation = "lighter";

      for (const e of emitters) spawnAmbient(e, dt);

      // update + draw
      const next: Particle[] = [];
      for (const p of particles) {
        p.life -= dt;
        if (p.life <= 0) continue;

        if (p.endX !== undefined && p.endY !== undefined && p.startLife) {
          // convergencia: interpolación hacia el destino
          const prog = 1 - p.life / p.startLife;
          const ease = 1 - Math.pow(1 - prog, 2);
          p.x += (p.endX - p.x) * ease * Math.min(1, dt * 14);
          p.y += (p.endY - p.y) * ease * Math.min(1, dt * 14);
        } else {
          p.vy += p.gravity * dt;
          const d = Math.pow(p.drag, dt * 60);
          p.vx *= d;
          p.vy *= d;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
        }
        p.rot += p.rotSpeed * dt;
        if (p.growth) p.size += p.growth * dt;

        const lifeF = Math.max(0, p.life / (p.maxLife || 1));
        let alpha = p.alpha0 * (p.shape === "ring" || p.shape === "hex" ? lifeF : Math.min(1, lifeF * 2.2));
        if (p.twinkle) alpha *= 0.62 + 0.38 * Math.sin(t / 1000 * p.twinkle * Math.PI * 2 + p.x);
        if (alpha <= 0.004) continue;

        const [r, g, b] = p.color;
        ctx!.globalAlpha = alpha;

        switch (p.shape) {
          case "dot": {
            ctx!.fillStyle = `rgba(${r},${g},${b},${0.32})`;
            ctx!.beginPath();
            ctx!.arc(p.x, p.y, p.size * 1.9, 0, Math.PI * 2);
            ctx!.fill();
            ctx!.fillStyle = `rgb(${r},${g},${b})`;
            ctx!.beginPath();
            ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx!.fill();
            break;
          }
          case "spark": {
            const len = Math.max(3, Math.hypot(p.vx, p.vy) * 0.06);
            const a = Math.atan2(p.vy, p.vx);
            ctx!.strokeStyle = `rgb(${r},${g},${b})`;
            ctx!.lineWidth = Math.max(1, p.size * 0.7);
            ctx!.beginPath();
            ctx!.moveTo(p.x, p.y);
            ctx!.lineTo(p.x - Math.cos(a) * len, p.y - Math.sin(a) * len);
            ctx!.stroke();
            break;
          }
          case "flake": {
            ctx!.strokeStyle = `rgb(${r},${g},${b})`;
            ctx!.lineWidth = 1;
            ctx!.save();
            ctx!.translate(p.x, p.y);
            ctx!.rotate(p.rot);
            for (let i = 0; i < 3; i++) {
              const a = (i * Math.PI) / 3;
              ctx!.beginPath();
              ctx!.moveTo(-Math.cos(a) * p.size * 2, -Math.sin(a) * p.size * 2);
              ctx!.lineTo(Math.cos(a) * p.size * 2, Math.sin(a) * p.size * 2);
              ctx!.stroke();
            }
            ctx!.restore();
            break;
          }
          case "ring": {
            ctx!.strokeStyle = `rgb(${r},${g},${b})`;
            ctx!.lineWidth = 2.2;
            ctx!.beginPath();
            ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx!.stroke();
            break;
          }
          case "hex": {
            ctx!.strokeStyle = `rgb(${r},${g},${b})`;
            ctx!.lineWidth = 1.6;
            ctx!.save();
            ctx!.translate(p.x, p.y);
            ctx!.rotate(p.rot);
            ctx!.beginPath();
            for (let i = 0; i < 6; i++) {
              const a = (i * Math.PI) / 3;
              const px = Math.cos(a) * p.size;
              const py = Math.sin(a) * p.size;
              if (i === 0) ctx!.moveTo(px, py);
              else ctx!.lineTo(px, py);
            }
            ctx!.closePath();
            ctx!.stroke();
            ctx!.restore();
            break;
          }
          case "slash": {
            ctx!.save();
            ctx!.translate(p.x, p.y);
            ctx!.rotate(p.rot);
            const grad = ctx!.createLinearGradient(-p.size / 2, 0, p.size / 2, 0);
            grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
            grad.addColorStop(0.5, `rgb(${r},${g},${b})`);
            grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
            ctx!.strokeStyle = grad;
            ctx!.lineWidth = 2.6 * lifeF + 0.6;
            ctx!.beginPath();
            ctx!.moveTo(-p.size / 2, 0);
            ctx!.lineTo(p.size / 2, 0);
            ctx!.stroke();
            ctx!.restore();
            break;
          }
          case "bubble": {
            ctx!.strokeStyle = `rgb(${r},${g},${b})`;
            ctx!.lineWidth = 1.1;
            ctx!.beginPath();
            ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx!.stroke();
            ctx!.fillStyle = `rgba(${r},${g},${b},0.25)`;
            ctx!.beginPath();
            ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx!.fill();
            break;
          }
          case "star": {
            ctx!.strokeStyle = `rgb(${r},${g},${b})`;
            ctx!.lineWidth = 1;
            ctx!.save();
            ctx!.translate(p.x, p.y);
            ctx!.rotate(p.rot);
            ctx!.beginPath();
            ctx!.moveTo(-p.size * 2, 0);
            ctx!.lineTo(p.size * 2, 0);
            ctx!.moveTo(0, -p.size * 2);
            ctx!.lineTo(0, p.size * 2);
            ctx!.stroke();
            ctx!.restore();
            break;
          }
          case "text": {
            ctx!.font = `800 ${p.size}px ui-sans-serif, system-ui, sans-serif`;
            ctx!.textAlign = "center";
            ctx!.fillStyle = `rgb(${r},${g},${b})`;
            if (CFG.textGlow) {
              ctx!.shadowColor = `rgba(${r},${g},${b},0.8)`;
              ctx!.shadowBlur = 6;
            }
            ctx!.fillText(p.text ?? "", p.x, p.y);
            ctx!.shadowBlur = 0;
            break;
          }
        }
        next.push(p);
      }
      particles = next;
      ctx!.globalAlpha = 1;
      ctx!.globalCompositeOperation = "source-over";
    };

    // Pausa total con la pestaña/app oculta (batería + FPS al volver).
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !disposed) {
        lastT = performance.now();
        lastFrame = 0;
        raf = requestAnimationFrame(loop);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(loop);

    // ── Limpieza ──
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      for (const t of queued) clearTimeout(t);
      queued.length = 0;
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
      unsubFx();
      if (w.__fxLayerActive === myToken) delete w.__fxLayerActive;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[45]"
    />
  );
}
