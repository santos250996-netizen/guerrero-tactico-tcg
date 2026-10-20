"use client";
import { useSettings } from "@/lib/settings";
let ctx: AudioContext | null = null;
/** AudioContext compartido (sfx + música procedural comparten UNA instancia —
 *  los móviles limitan el número de contexts vivos). */
export function getAudioCtx(): AudioContext | null {
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

  const a = getAudioCtx();
  if (!a) return;
  if (a.state === "suspended") a.resume().catch(() => {});

  // Blindaje: si el AudioContext quedó "closed"/"interrupted" (la APK pasó a
  // segundo plano para tocar el hotspot, llamada, etc.), crear nodos LANZA —
  // y un throw aquí subía por applyView/sfx y congelaba la partida del
  // anfitrión. Un tono que suena mal NUNCA debe romper el flujo del juego.
  try {
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
  } catch {
    // AudioContext en estado inválido — silencio esta vez
  }
}

let noiseBuf: AudioBuffer | null = null;
/** Ráfaga de ruido blanco filtrado (estallidos, golpes metálicos, shakers).
 *  El buffer se sintetiza UNA vez — 0 KB de assets. */
export function noise(d: number, g: number, freq = 3000, type: BiquadFilterType = "bandpass", delay = 0) {
  const settings = useSettings.getState();
  if (!settings.soundOn) return;
  const vol = Math.max(0, Math.min(1, settings.volume / 100));
  if (vol === 0) return;
  const a = getAudioCtx();
  if (!a) return;
  if (a.state === "suspended") a.resume().catch(() => {});
  try {
    let buf = noiseBuf;
    if (!buf) {
      buf = a.createBuffer(1, Math.floor(a.sampleRate * 0.4), a.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      noiseBuf = buf;
    }
    const s = a.currentTime + delay;
    const src = a.createBufferSource();
    src.buffer = buf;
    const f = a.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = 0.9;
    const gn = a.createGain();
    gn.gain.setValueAtTime(g * vol, s);
    gn.gain.exponentialRampToValueAtTime(0.001, s + d);
    src.connect(f).connect(gn).connect(a.destination);
    src.start(s);
    src.stop(s + d + 0.05);
  } catch {
    // AudioContext en estado inválido — silencio esta vez
  }
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
  /** CHOQUE DE CARRILES: golpe grave con caída + estallido metálico.
   *  Acompaña las chispas + shake del clash — antes era un impacto mudo. */
  clash: () => {
    tone(150, 0.28, "sine", 0.22, 0, 38);
    tone(98, 0.20, "triangle", 0.14, 0.02);
    noise(0.16, 0.12, 1100);
    noise(0.08, 0.07, 4200, "highpass", 0.03);
  },
  victory: () => { tone(523, 0.15, "triangle", 0.15); tone(659, 0.15, "triangle", 0.15, 0.13); tone(784, 0.15, "triangle", 0.15, 0.26); tone(1047, 0.45, "triangle", 0.18, 0.39); },
  defeat: () => { tone(392, 0.25, "triangle", 0.12); tone(311, 0.25, "triangle", 0.12, 0.20); tone(262, 0.50, "triangle", 0.15, 0.40); },
  draw: () => tone(1320, 0.06, "sine", 0.06),
  // ── RITUALES DE CLASE V3 (grupo A): cada regla sistémica SUENA distinto ──
  /** ⚔ FORMACIÓN (Guerrero): tambor grave + anvil metálico — la línea se asienta. */
  formation: () => {
    tone(98, 0.22, "triangle", 0.16, 0, 60);
    noise(0.14, 0.09, 850, "bandpass", 0.03);
    tone(392, 0.20, "square", 0.05, 0.08);
  },
  /** 🔮 RESONANCIA (Mago): shimmer arcano ascendente — el conjuro cabalga la estela. */
  resonance: () => {
    tone(659, 0.10, "sine", 0.08);
    tone(880, 0.10, "sine", 0.08, 0.07);
    tone(1175, 0.22, "sine", 0.09, 0.14);
  },
  /** 🗡 MARCA DE EJECUCIÓN (Asesino): shing agudo de cuchillas al cobrar los PC. */
  combo: () => {
    noise(0.09, 0.10, 5200, "highpass");
    tone(1568, 0.14, "triangle", 0.07, 0.02, 2093);
    tone(196, 0.16, "sawtooth", 0.06, 0, 90);
  },
};
