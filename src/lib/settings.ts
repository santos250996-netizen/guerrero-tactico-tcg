"use client";
import { create } from "zustand";

export interface Settings { soundOn: boolean; animationsOn: boolean; onboardingSeen: boolean; }
interface SettingsStore extends Settings {
  setSound: (on: boolean) => void; setAnimations: (on: boolean) => void;
  markOnboardingSeen: () => void; toggleSound: () => void; toggleAnimations: () => void;
}
const KEY = "guerrero-tactico-settings";
const load = (): Partial<Settings> => { if (typeof window === "undefined") return {}; try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : {}; } catch { return {}; } };
const save = (s: Settings) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };
const DEFAULTS: Settings = { soundOn: true, animationsOn: true, onboardingSeen: false };

export const useSettings = create<SettingsStore>((set, get) => {
  const initial = { ...DEFAULTS, ...load() };
  return {
    ...initial,
    setSound: (on) => { const s = { ...get(), soundOn: on }; save(s); set({ soundOn: on }); },
    setAnimations: (on) => { const s = { ...get(), animationsOn: on }; save(s); set({ animationsOn: on }); },
    markOnboardingSeen: () => { const s = { ...get(), onboardingSeen: true }; save(s); set({ onboardingSeen: true }); },
    toggleSound: () => { const n = !get().soundOn; const s = { ...get(), soundOn: n }; save(s); set({ soundOn: n }); },
    toggleAnimations: () => { const n = !get().animationsOn; const s = { ...get(), animationsOn: n }; save(s); set({ animationsOn: n }); },
  };
});
