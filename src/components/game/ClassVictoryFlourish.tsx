"use client";

// ============================================================================
// ClassVictoryFlourish — MOMENTO FIRMA DE VICTORIA (V3, grupo A).
// Cada clase cierra sus victorias con SU propio gesto (mismo ritual que en
// pista, mismo color de clase):
//   ⚔ guerrero — tres estandartes ámbar se izan tras el trofeo
//   🔮 mago    — un anillo de runas violetas gira y se desvanece
//   🗡 asesino — dos cuchillas fucsia barren la tarjeta en diagonal
//
// DOM puro + framer-motion (sin canvas extra, sin blur, coste mínimo y UNA
// sola vez por partida). Los sonidos usan los mismos sfx de ritual (ellos
// ya respetan soundOn/volumen; el visual respeta animationsOn).
// ============================================================================

import { useEffect } from "react";
import { motion } from "framer-motion";
import type { GameClass } from "@/lib/game/types";
import { useSettings } from "@/lib/settings";
import { sfx } from "@/lib/sound";

const RUNES = ["✦", "◆", "✧", "◈", "✦", "◇"];

export function ClassVictoryFlourish({ gameClass }: { gameClass: GameClass }) {
  const animOn = useSettings((s) => s.animationsOn);

  // Acento sonoro de la clase (los sfx se auto-gatean con soundOn/volumen).
  // Va con retardo para NO pisar la fanfarria de victoria.
  useEffect(() => {
    const t = setTimeout(() => {
      if (gameClass === "guerrero") sfx.formation();
      else if (gameClass === "mago") sfx.resonance();
      else sfx.combo();
    }, 620);
    return () => clearTimeout(t);
  }, [gameClass]);

  if (!animOn) return null;

  // ── ⚔ GUERRERO: estandartes que se izan ──
  if (gameClass === "guerrero") {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-2xl">
        {[16, 50, 84].map((x, i) => (
          <motion.div
            key={x}
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: ["100%", "0%", "0%", "-6%"], opacity: [0, 0.5, 0.42, 0] }}
            transition={{ duration: 1.9, times: [0, 0.3, 0.75, 1], delay: i * 0.14, ease: "easeOut" }}
            className="absolute bottom-0 w-2 rounded-t-full"
            style={{
              left: `${x}%`,
              height: "72%",
              background: "linear-gradient(to top, rgba(251,191,36,0.05), rgba(251,191,36,0.55))",
              boxShadow: "0 0 18px rgba(251,191,36,0.35)",
            }}
          />
        ))}
      </div>
    );
  }

  // ── 🔮 MAGO: runas orbitando y disipándose ──
  if (gameClass === "mago") {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-2xl">
        <motion.div
          initial={{ rotate: 0, opacity: 0 }}
          animate={{ rotate: 210, opacity: [0, 0.9, 0.75, 0] }}
          transition={{ duration: 2.1, times: [0, 0.3, 0.7, 1], ease: "easeOut" }}
          className="absolute left-1/2 top-[64px] h-[150px] w-[150px] -translate-x-1/2 -translate-y-1/2"
        >
          {RUNES.map((r, i) => {
            const a = (i / RUNES.length) * Math.PI * 2;
            return (
              <span
                key={i}
                className="absolute left-1/2 top-1/2 text-violet-300"
                style={{
                  transform: `translate(-50%,-50%) translate(${Math.cos(a) * 72}px, ${Math.sin(a) * 72}px)`,
                  fontSize: 13,
                  textShadow: "0 0 10px rgba(167,139,250,0.9)",
                  fontFamily: "var(--font-cinzel), serif",
                }}
              >
                {r}
              </span>
            );
          })}
        </motion.div>
      </div>
    );
  }

  // ── 🗡 ASESINO: cuchillas que barren la tarjeta ──
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-2xl">
      {[
        { rot: -14, top: "26%", delay: 0.05, w: "rgba(217,70,239,0.85)" },
        { rot: 9, top: "58%", delay: 0.3, w: "rgba(240,171,252,0.7)" },
      ].map((s, i) => (
        <motion.div
          key={i}
          initial={{ x: "-130%", opacity: 0 }}
          animate={{ x: ["-130%", "10%", "10%", "130%"], opacity: [0, 1, 0.85, 0] }}
          transition={{ duration: 0.95, times: [0, 0.35, 0.7, 1], delay: s.delay, ease: "easeInOut" }}
          className="absolute h-[2px] w-[140%]"
          style={{
            top: s.top,
            left: "-20%",
            rotate: `${s.rot}deg`,
            background: `linear-gradient(to right, transparent, ${s.w}, transparent)`,
            boxShadow: "0 0 12px rgba(217,70,239,0.5)",
          }}
        />
      ))}
    </div>
  );
}
