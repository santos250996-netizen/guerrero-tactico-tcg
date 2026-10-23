"use client";
import { useSettings } from "@/lib/settings";
import { getAudioCtx, noise } from "@/lib/sound";

// ══ Música procedural de Pacto de Guerra ══
// Tambores de guerra + drone sintetizados EN VIVO con WebAudio — 0 KB de
// assets en la APK (coherente con la Optimización de la tanda 31).
//
// - Dos intensidades: "menu" (latido lento, espacioso) y "battle"
//   (marcha de guerra con tomadas y cuerno).
// - Scheduler con lookahead (patrón metrónomo clásico): loops sin costuras
//   e inmune al throttling de setInterval en segundo plano.
// - Autoplay: el AudioContext nace suspendido hasta el primer toque — el
//   arranque se difiere con un listener one-shot al primer pointerdown.
// - Segundo plano: visibilitychange suspende/reanuda el contexto compartido
//   (lección de sound.ts: la APK va a fondo para el hotspot/llamadas).
// - A PRUEBA DE FALLOS: TODO blindado — un fallo de audio JAMÁS rompe el juego.

type MusicMode = "menu" | "battle";

const BPM: Record<MusicMode, number> = { menu: 72, battle: 96 };
const LOOKAHEAD_MS = 120;
const SCHEDULE_AHEAD_S = 0.35;
// La música NO puede pisar a los SFX: toca más bajo que el volumen maestro.
const MUSIC_GAIN = 0.5;

let mode: MusicMode = "menu";
let lastMode: MusicMode = "menu";
let playing = false;
let timer: ReturnType<typeof setInterval> | null = null;
let nextStepTime = 0;
let step = 0; // corcheas: 8 por compás
let bar = 0;
let drone: { stop: () => void } | null = null;
let deferredByGesture = false;
let suspendedByBackground = false;
let visibilityBound = false;
let settingsBound = false;

/** Volumen efectivo de la música: maestro × musicOn × ganancia fija. */
function musicVol(): number {
  const s = useSettings.getState();
  if (!s.soundOn || !s.musicOn) return 0;
  return Math.max(0, Math.min(1, s.volume / 100)) * MUSIC_GAIN;
}

type DrumKind = "kick" | "tom" | "shaker";

function drum(time: number, kind: DrumKind, v: number) {
  const a = getAudioCtx();
  if (!a || v <= 0) return;
  try {
    if (kind === "shaker") {
      noise(0.05, 0.045 * v, 6200, "highpass", Math.max(0, time - a.currentTime));
      return;
    }
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = "sine";
    if (kind === "kick") {
      o.frequency.setValueAtTime(120, time);
      o.frequency.exponentialRampToValueAtTime(38, time + 0.12);
      g.gain.setValueAtTime(0.9 * v, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.32);
    } else {
      // tom de guerra: más alto y seco que el bombo
      o.frequency.setValueAtTime(190, time);
      o.frequency.exponentialRampToValueAtTime(85, time + 0.15);
      g.gain.setValueAtTime(0.55 * v, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.24);
    }
    o.connect(g).connect(a.destination);
    o.start(time);
    o.stop(time + 0.4);
  } catch {
    // nunca romper el juego por un tambor
  }
}

/** Cuerno de guerra grave (frigio, amenaza) — cada 8 compases en batalla. */
function horn(time: number, v: number) {
  const a = getAudioCtx();
  if (!a || v <= 0) return;
  const notes: [number, number][] = [
    [73.42, 0], // D2
    [87.31, 0.55], // F2
    [98.0, 1.1], // G2
  ];
  for (const [freq, t] of notes) {
    try {
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = "triangle";
      o.frequency.value = freq;
      const s = time + t;
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.11 * v, s + 0.09);
      g.gain.exponentialRampToValueAtTime(0.001, s + 0.55);
      o.connect(g).connect(a.destination);
      o.start(s);
      o.stop(s + 0.65);
    } catch {
      // noop
    }
  }
}

/** Drone bélico: dos sierras desafinadas en A1 → lowpass con LFO lento. */
function startDrone(): void {
  if (drone) return;
  const a = getAudioCtx();
  if (!a) return;
  try {
    const v = musicVol();
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, a.currentTime);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, 0.055 * v), a.currentTime + 3);
    const f = a.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 170;
    f.Q.value = 0.7;
    const lfo = a.createOscillator();
    const lg = a.createGain();
    lfo.frequency.value = 0.07;
    lg.gain.value = 60;
    lfo.connect(lg).connect(f.frequency);
    lfo.start();
    const o1 = a.createOscillator();
    const o2 = a.createOscillator();
    o1.type = "sawtooth";
    o2.type = "sawtooth";
    o1.frequency.value = 55; // A1
    o2.frequency.value = 55.4; // desafinado = latido del drone
    o1.connect(f);
    o2.connect(f);
    f.connect(g).connect(a.destination);
    o1.start();
    o2.start();
    drone = {
      stop: () => {
        try {
          g.gain.cancelScheduledValues(a.currentTime);
          g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), a.currentTime);
          g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.9);
          o1.stop(a.currentTime + 1.1);
          o2.stop(a.currentTime + 1.1);
          lfo.stop(a.currentTime + 1.1);
        } catch {
          // noop
        }
      },
    };
  } catch {
    drone = null;
  }
}

/** Un paso del patrón (corchea). Cada modo tiene su marcha. */
function scheduleStep(time: number) {
  const s = step % 8;
  const v = musicVol();
  if (v > 0) {
    if (mode === "menu") {
      // Latido de campamento: bombo seco + shaker distante, sin prisa
      if (s === 0) drum(time, "kick", v);
      if (s === 4) drum(time, "shaker", v);
      if (s === 6 && bar % 2 === 1) drum(time, "tom", v * 0.7);
    } else {
      // Marcha de guerra: bombo en 0 y 5 (ritmo punteado), shaker continuo,
      // tomadas en compases alternos y cuerno de guerra cada 8 compases
      if (s === 0 || s === 5) drum(time, "kick", v);
      if (s % 2 === 0) drum(time, "shaker", v);
      if (bar % 2 === 1 && (s === 3 || s === 7)) drum(time, "tom", v);
      if (s === 0 && bar % 8 === 0 && bar > 0) horn(time, v);
    }
  }
  step += 1;
  if (step % 8 === 0) bar += 1;
}

function tick() {
  try {
    const a = getAudioCtx();
    if (!a || !playing) return;
    const stepDur = 60 / BPM[mode] / 2; // corcheas
    while (nextStepTime < a.currentTime + SCHEDULE_AHEAD_S) {
      scheduleStep(nextStepTime);
      nextStepTime += stepDur;
    }
  } catch {
    // el scheduler nunca tumba nada
  }
}

function bindVisibility() {
  if (visibilityBound || typeof document === "undefined") return;
  visibilityBound = true;
  document.addEventListener("visibilitychange", () => {
    try {
      const a = getAudioCtx();
      if (!a) return;
      if (document.hidden) {
        // APK a segundo plano: silenciar YA (hotspot, llamada, otra app)
        if (a.state === "running") {
          suspendedByBackground = true;
          a.suspend().catch(() => {});
        }
      } else if (suspendedByBackground && playing) {
        suspendedByBackground = false;
        a.resume().catch(() => {});
        if (nextStepTime < a.currentTime) nextStepTime = a.currentTime + 0.08;
      }
    } catch {
      // noop
    }
  });
}

function begin() {
  const a = getAudioCtx();
  if (!a) return;
  try {
    if (a.state === "suspended") a.resume().catch(() => {});
    startDrone();
    if (nextStepTime < a.currentTime) nextStepTime = a.currentTime + 0.08;
    if (timer == null) timer = setInterval(tick, LOOKAHEAD_MS);
    bindVisibility();
  } catch {
    // noop
  }
}

export const music = {
  /** Arranca (o asegura) la música en el modo pedido. Idempotente: si ya
   *  suena solo cambia el modo. Con autoplay bloqueado difiere al primer toque. */
  start(m?: MusicMode) {
    if (m) {
      mode = m;
      lastMode = m;
    }
    playing = true;
    if (typeof window === "undefined") return;
    const a = getAudioCtx();
    if (!a) return;
    if (a.state === "suspended" && !deferredByGesture) {
      // Autoplay policy: sin gesto del usuario el context queda suspendido.
      // Se arma UNA vez: el primer toque en cualquier parte lanza begin().
      deferredByGesture = true;
      const onFirstGesture = () => {
        try {
          document.removeEventListener("pointerdown", onFirstGesture);
          deferredByGesture = false;
          if (playing) begin();
        } catch {
          // noop
        }
      };
      try {
        document.addEventListener("pointerdown", onFirstGesture, { once: true, passive: true });
      } catch {
        deferredByGesture = false;
      }
      return;
    }
    begin();
  },

  /** Cambia de intensidad sin reiniciar (menú ↔ batalla). El patrón adapta
   *  en el siguiente tick — transición sin costura. */
  setMode(m: MusicMode) {
    mode = m;
    lastMode = m;
    if (playing) music.start();
  },

  stop() {
    playing = false;
    try {
      if (timer != null) {
        clearInterval(timer);
        timer = null;
      }
      drone?.stop();
      drone = null;
    } catch {
      // noop
    }
  },

  mode: (): MusicMode => mode,
};

// Reacción a ajustes: apagar la música al desactivar; al reactivar, volver
// con el último modo pedido (evita quedarse mudo hasta remontar pantalla).
if (typeof window !== "undefined" && !settingsBound) {
  settingsBound = true;
  try {
    useSettings.subscribe((s, prev) => {
      try {
        if (!s.musicOn && playing) music.stop();
        else if (s.musicOn && !prev.musicOn && !playing && s.soundOn) music.start(lastMode);
      } catch {
        // noop
      }
    });
  } catch {
    // noop
  }
}
