"use client";
import { create } from "zustand";

export type Language = "es" | "en" | "pt";

export interface Settings {
  soundOn: boolean;
  animationsOn: boolean;
  // Master volume 0-100 (only applies when soundOn is true)
  volume: number;
  // UI language preference (persisted for future i18n wiring)
  language: Language;
}
interface SettingsStore extends Settings {
  setSound: (on: boolean) => void;
  setAnimations: (on: boolean) => void;
  setVolume: (v: number) => void;
  setLanguage: (lang: Language) => void;
  toggleSound: () => void;
  toggleAnimations: () => void;
}
const KEY = "guerrero-tactico-settings";
const load = (): Partial<Settings> => {
  if (typeof window === "undefined") return {};
  try {
    const r = localStorage.getItem(KEY);
    return r ? JSON.parse(r) : {};
  } catch {
    return {};
  }
};
const save = (s: Settings) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
};
const DEFAULTS: Settings = {
  soundOn: true,
  animationsOn: true,
  volume: 100,
  language: "es",
};

export const useSettings = create<SettingsStore>((set, get) => {
  const initial = { ...DEFAULTS, ...load() };
  return {
    ...initial,
    setSound: (on) => { const s = { ...get(), soundOn: on }; save(s); set({ soundOn: on }); },
    setAnimations: (on) => { const s = { ...get(), animationsOn: on }; save(s); set({ animationsOn: on }); },
    setVolume: (v) => {
      const clamped = Math.max(0, Math.min(100, Math.round(v)));
      const s = { ...get(), volume: clamped };
      save(s);
      set({ volume: clamped });
    },
    setLanguage: (lang) => { const s = { ...get(), language: lang }; save(s); set({ language: lang }); },
    toggleSound: () => { const n = !get().soundOn; const s = { ...get(), soundOn: n }; save(s); set({ soundOn: n }); },
    toggleAnimations: () => { const n = !get().animationsOn; const s = { ...get(), animationsOn: n }; save(s); set({ animationsOn: n }); },
  };
});
