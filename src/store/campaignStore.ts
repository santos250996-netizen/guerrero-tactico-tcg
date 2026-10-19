"use client";

// ============================================================================
// campaignStore — LA CAMPAÑA (escalera de guerra del modo historia).
// Persistencia: localStorage ("pacto-de-guerra-campana").
//
// Estado mínimo: el escalón PENDIENTE de jugar (1..15), el prestigio (vueltas
// completadas) y el total histórico de escalones superados. La lógica de la
// escalera (jefes, tiers, botín) vive en lib/game/campaign.ts — aquí solo
// persistencia + avanzar/reiniciar. Al perder NO se retrocede (el jugador
// repite el mismo escalón): advance() solo se llama tras una VICTORIA.
// ============================================================================

import { create } from "zustand";
import { CAMPAIGN_STEPS } from "@/lib/game/campaign";

const STORAGE_KEY = "pacto-de-guerra-campana";

interface CampaignState {
  /** Escalón pendiente de jugar (1..CAMPAIGN_STEPS). */
  step: number;
  /** Campañas completadas (★). Cada prestigio refuerza a los rivales. */
  prestige: number;
  /** Total histórico de escalones superados (stat de perfil). */
  stepsCleared: number;

  /** Avanza tras una VICTORIA. Devuelve el nuevo step y si cerró la campaña. */
  advance: () => { step: number; completed: boolean };
  /** Reinicio voluntario (desde Perfil). */
  resetCampaign: () => void;
  /** Hidrata desde localStorage (llamar 1ª vez al abrir la UI). */
  hydrate: () => void;
}

function load(): { step: number; prestige: number; stepsCleared: number } {
  if (typeof window === "undefined") return { step: 1, prestige: 0, stepsCleared: 0 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { step: 1, prestige: 0, stepsCleared: 0 };
    const p = JSON.parse(raw) as Partial<{ step: number; prestige: number; stepsCleared: number }>;
    const step = Math.min(CAMPAIGN_STEPS, Math.max(1, p.step ?? 1));
    const prestige = Math.max(0, p.prestige ?? 0);
    const stepsCleared = Math.max(0, p.stepsCleared ?? 0);
    return { step, prestige, stepsCleared };
  } catch {
    return { step: 1, prestige: 0, stepsCleared: 0 };
  }
}

function persist(s: { step: number; prestige: number; stepsCleared: number }): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // almacenamiento lleno/bloqueado — la sesión sigue sin persistir
  }
}

export const useCampaignStore = create<CampaignState>((set, get) => ({
  ...load(),

  advance: () => {
    const s = get();
    // Último escalón vencido → CIERRA LA CAMPAÑA: prestigio +1 y la escalera
    // recomienza (rivales reforzados por botTierForStep/bossTierForPrestige).
    if (s.step >= CAMPAIGN_STEPS) {
      const next = { step: 1, prestige: s.prestige + 1, stepsCleared: s.stepsCleared + 1 };
      set(next);
      persist(next);
      return { step: 1, completed: true };
    }
    const next = { step: s.step + 1, prestige: s.prestige, stepsCleared: s.stepsCleared + 1 };
    set(next);
    persist(next);
    return { step: next.step, completed: false };
  },

  resetCampaign: () => {
    const empty = { step: 1, prestige: 0, stepsCleared: 0 };
    set(empty);
    persist(empty);
  },

  hydrate: () => {
    set(load());
  },
}));
