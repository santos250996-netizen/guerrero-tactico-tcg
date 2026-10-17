"use client";
import { useSettings } from "@/lib/settings";
let ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      const A = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!A) return null;
      ctx = new A();
    } catch {
      return null;
    }
  }
  return ctx;
}

/**
 * Play a tone with the user's master volume applied.
 * Volume 0-100 from settings is multiplied with the per-tone gain.
 * Returns early if soundOn is false or volume is 0.
 */
function tone(f: number, d: number, t: OscillatorType = "sine", g = 0.15, delay = 0, slide?: number) {
  const settings = useSettings.getState();
  if (!settings.soundOn) return;
  // Volume 0-100 → gain multiplier 0-1
  const vol = Math.max(0, Math.min(1, settings.volume / 100));
  if (vol === 0) return;
  const effectiveGain = g * vol;
  if (effectiveGain <= 0.001) return;

  const a = getCtx();
  if (!a) return;
  if (a.state === "suspended") a.resume().catch(() => {});

  const s = a.currentTime + delay;
  const o = a.createOscillator();
  const gn = a.createGain();
  o.type = t;
  o.frequency.setValueAtTime(f, s);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(1, slide), s + d);
  gn.gain.setValueAtTime(0, s);
  gn.gain.linearRampToValueAtTime(effectiveGain, s + 0.01);
  gn.gain.exponentialRampToValueAtTime(0.001, s + d);
  o.connect(gn).connect(a.destination);
  o.start(s);
  o.stop(s + d + 0.05);
}
export const sfx = {
  click: () => tone(600, 0.04, "square", 0.05),
  select: () => tone(880, 0.06, "sine", 0.07),
  cardPlay: () => { tone(220, 0.08, "triangle", 0.12); tone(330, 0.12, "triangle", 0.10, 0.05); },
  buff: () => { tone(523, 0.08); tone(659, 0.08, "sine", 0.10, 0.07); tone(784, 0.12, "sine", 0.10, 0.14); },
  debuff: () => tone(440, 0.20, "sawtooth", 0.08, 0, 110),
  remove: () => { tone(330, 0.10, "square", 0.08); tone(110, 0.15, "sawtooth", 0.10, 0.08); },
  turnPass: () => { tone(440, 0.10, "triangle", 0.08); tone(330, 0.15, "triangle", 0.08, 0.10); },
  enemyTurn: () => tone(220, 0.30, "sawtooth", 0.06, 0, 165),
  trapTrigger: () => { tone(880, 0.06, "square", 0.10); tone(440, 0.18, "sawtooth", 0.10, 0.05); },
  victory: () => { tone(523, 0.15, "triangle", 0.15); tone(659, 0.15, "triangle", 0.15, 0.13); tone(784, 0.15, "triangle", 0.15, 0.26); tone(1047, 0.45, "triangle", 0.18, 0.39); },
  defeat: () => { tone(392, 0.25, "triangle", 0.12); tone(311, 0.25, "triangle", 0.12, 0.20); tone(262, 0.50, "triangle", 0.15, 0.40); },
  draw: () => tone(1320, 0.06, "sine", 0.06),
};
