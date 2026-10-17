"use client";

// ============================================================================
// Store PvP (cliente) — sala, polling del estado autoritativo (~1.2 s) y
// efectos de UI (números flotantes, banners de turno, ráfaga legendaria).
// El token vive en sessionStorage (clave por sala) para que DOS PESTAÑAS del
// mismo navegador puedan probar la partida como dos jugadores distintos.
// ============================================================================

import { create } from "zustand";
import type { PvpClientView, PvpSide } from "@/lib/game/pvp";
import type { CardDef, GameClass } from "@/lib/game/types";
import { emitFx, type FxEvent } from "@/lib/game/fx";
import { sfx } from "@/lib/sound";
import { useSettings } from "@/lib/settings";

export type PvpScreen = "setup" | "lobby" | "game";

export interface PvpFloatingNumber {
  id: string;
  uid: string;
  value: number;
}

const POLL_MS = 1200;

interface PvpStoreState {
  screen: PvpScreen;
  code: string | null;
  token: string | null;
  mySide: PvpSide | null;
  view: PvpClientView | null;

  // Formulario de setup
  playerName: string;
  gameClass: GameClass;
  joinCode: string;
  busy: boolean;
  error: string | null;
  lanUrls: string[];
  lanPort: number;

  // Polling / sincronización
  polling: boolean;
  connectionLost: boolean;
  lastActionSeq: number;
  resumed: boolean;

  // UI
  selectedCardUid: string | null;
  floatingNumbers: PvpFloatingNumber[];
  turnBanner: { text: string; mine: boolean } | null;
  legendaryBurst: boolean;
  invalidPlayMsg: string | null;
  previewCard: CardDef | null;

  // Acciones
  selectCard: (uid: string | null) => void;
  setName: (n: string) => void;
  setGameClass: (c: GameClass) => void;
  setJoinCode: (c: string) => void;
  setPreviewCard: (c: CardDef | null) => void;
  dismissInvalidMsg: () => void;
  clearError: () => void;

  openSetup: () => void;
  exitToMenu: () => void;

  createRoom: () => Promise<void>;
  joinRoom: () => Promise<void>;
  sendPlay: (uid: string, lane: string) => Promise<void>;
  sendPass: () => Promise<void>;
  requestRematch: () => Promise<void>;
  copyShareUrl: () => Promise<void>;

  tryResume: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
}

let pollTimer: ReturnType<typeof setInterval> | null = null;
let floatId = 0;
/** Guard anti doble-disparo: el drop del drag dispara onPlayCard + click del carril. */
let actionInFlight = false;

function myDeckIds(cls: GameClass): string[] | undefined {
  // Solo Guerrero admite mazo custom (localStorage); Mago/Asesino usan su espejo oficial.
  if (cls !== "guerrero") return undefined;
  try {
    const raw = localStorage.getItem("guerrero-tactico-deck");
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.cardIds) && parsed.cardIds.length === 12) {
      return parsed.cardIds as string[];
    }
  } catch {
    // noop
  }
  return undefined;
}

export const usePvpStore = create<PvpStoreState>((set, get) => {
  /** Aplica una vista del servidor: sincroniza estado + efectos de UI. */
  function applyView(view: PvpClientView) {
    const st = get();
    const prevSeq = st.lastActionSeq;
    const mine = st.mySide;

    // Efectos de la última acción (solo si es nueva)
    const newFloats: PvpFloatingNumber[] = [];
    let turnBanner = st.turnBanner;
    let legendaryBurst = st.legendaryBurst;
    const la = view.lastAction;
    if (la && la.seq > prevSeq) {
      for (const m of la.mutations) {
        if (m.powerDelta === 0) continue;
        newFloats.push({ id: `pf-${++floatId}`, uid: m.uid, value: m.powerDelta });
      }
      if (la.playedRarity === "legendary") {
        legendaryBurst = true;
        setTimeout(() => set({ legendaryBurst: false }), 1900);
      }
      if (la.bannerFor && la.bannerFor !== mine && view.phase === "playing") {
        // El banner de MI turno lo dispara el flip de activeSide (abajo)
      }
      if (la.bannerFor && la.bannerFor === mine && view.phase === "playing") {
        turnBanner = { text: "TU TURNO", mine: true };
        if (useSettings.getState().soundOn) sfx.turnPass();
      } else if (la.bannerFor && view.phase === "playing") {
        turnBanner = { text: "TURNO DEL RIVAL", mine: false };
        if (useSettings.getState().soundOn) sfx.enemyTurn();
      }
    }

    // Sonidos de mutaciones al llegar jugadas del rival
    if (la && la.seq > prevSeq && la.side !== mine && view.phase === "playing") {
      if (useSettings.getState().soundOn) {
        sfx.cardPlay();
        if (la.mutations.some((m) => m.powerDelta > 0)) sfx.buff();
        if (la.mutations.some((m) => m.powerDelta < 0)) sfx.debuff();
      }
    }

    // Cambio de pantalla lobby → game cuando la partida arranca
    const screen: PvpScreen =
      view.phase === "playing" || view.phase === "ended" ? "game" : st.screen === "lobby" ? "lobby" : st.screen;

    // Auto-limpieza del banner
    if (turnBanner && turnBanner !== st.turnBanner) {
      setTimeout(() => {
        const cur = get().turnBanner;
        if (cur && cur.text === turnBanner!.text) set({ turnBanner: null });
      }, 1600);
    }

    set({
      view,
      lastActionSeq: la?.seq ?? prevSeq,
      code: view.code,
      mySide: view.you.side,
      screen,
      turnBanner,
      legendaryBurst,
      connectionLost: false,
    });

    // ====== VFX: eventos FX de la acción (DESPUÉS del set: los carriles ya
    // están en el DOM). Mapeo: lado absoluto a/b → player/enemy propio y
    // lanePos → carril propio de esa posición (el board viaja con MIS claves).
    if (la && la.seq > prevSeq && la.fx && la.fx.length > 0 && useSettings.getState().animationsOn) {
      const mapped: FxEvent[] = la.fx.map((f) => ({
        kind: f.kind,
        keyword: f.keyword,
        lanePos: f.lanePos,
        lane: view.you.lanes[f.lanePos] ?? view.you.lanes[0],
        side: f.side === mine ? "player" : "enemy",
        sourceUid: f.sourceUid,
        targetUids: f.targetUids,
        value: f.value,
        delayMs: Math.max(f.delayMs ?? 0, 120), // margen para el re-render
      }));
      emitFx(mapped);
    }

    if (newFloats.length > 0) {
      set({ floatingNumbers: [...get().floatingNumbers, ...newFloats] });
      setTimeout(() => {
        const ids = new Set(newFloats.map((f) => f.id));
        set({ floatingNumbers: get().floatingNumbers.filter((f) => !ids.has(f.id)) });
      }, 1600);
    }
  }

  async function postJson<T>(url: string, body: unknown, token?: string): Promise<{ ok: boolean; status: number; data: T | null }> {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-pvp-token": token } : {}),
        },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as T | null;
      return { ok: res.ok, status: res.status, data };
    } catch {
      return { ok: false, status: 0, data: null };
    }
  }

  return {
    screen: "setup",
    code: null,
    token: null,
    mySide: null,
    view: null,
    playerName: "",
    gameClass: "guerrero",
    joinCode: "",
    busy: false,
    error: null,
    lanUrls: [],
    lanPort: 3000,
    polling: false,
    connectionLost: false,
    lastActionSeq: 0,
    resumed: false,
    selectedCardUid: null,
    floatingNumbers: [],
    turnBanner: null,
    legendaryBurst: false,
    invalidPlayMsg: null,
    previewCard: null,

    selectCard: (uid) => {
      const cur = get().selectedCardUid;
      set({ selectedCardUid: cur === uid ? null : uid, invalidPlayMsg: null });
      if (useSettings.getState().soundOn) sfx.select();
    },

    setName: (n) => set({ playerName: n }),
    setGameClass: (c) => set({ gameClass: c }),
    setJoinCode: (c) => set({ joinCode: c.toUpperCase().slice(0, 4) }),
    setPreviewCard: (c) => set({ previewCard: c }),
    dismissInvalidMsg: () => set({ invalidPlayMsg: null }),
    clearError: () => set({ error: null }),

    openSetup: () => {
      get().stopPolling();
      set({
        screen: "setup",
        code: null,
        token: null,
        mySide: null,
        view: null,
        joinCode: "",
        error: null,
        lanUrls: [],
        lastActionSeq: 0,
        resumed: false,
        selectedCardUid: null,
      });
    },

    exitToMenu: () => {
      get().stopPolling();
      set({
        screen: "setup",
        code: null,
        token: null,
        mySide: null,
        view: null,
        joinCode: "",
        error: null,
        lanUrls: [],
        lastActionSeq: 0,
        resumed: false,
        selectedCardUid: null,
      });
      // vuelve al menú principal (gameStore)
      import("@/store/gameStore").then(({ useGameStore }) => {
        useGameStore.getState().setView("main-menu");
      });
    },

    createRoom: async () => {
      const { playerName, gameClass } = get();
      set({ busy: true, error: null });
      const { ok, data } = await postJson<{ code: string; token: string; view: PvpClientView }>(
        "/api/pvp/rooms",
        {
          name: playerName || "Anfitrión",
          gameClass,
          deckIds: myDeckIds(gameClass),
        }
      );
      if (!ok || !data) {
        set({ busy: false, error: "No se pudo crear la sala. ¿El servidor está activo?" });
        return;
      }
      try {
        sessionStorage.setItem(`pvp-token-${data.code}`, data.token);
        sessionStorage.setItem("pvp-code", data.code);
      } catch {
        // sessionStorage no disponible (modo privado) — la partida funciona igual
      }
      set({ code: data.code, token: data.token, mySide: "a", busy: false, lastActionSeq: 0 });
      applyView(data.view);
      // applyView no mueve de pantalla en lobby — el anfitrión va al lobby explícitamente
      set({ screen: "lobby" });
      get().startPolling();
      // URLs LAN para compartir (solo informativo en el lobby)
      try {
        const res = await fetch("/api/pvp/lan-info");
        const info = (await res.json()) as { ips: string[]; port: number };
        set({
          lanUrls: info.ips.map((ip) => `http://${ip}:${info.port}`),
          lanPort: info.port,
        });
      } catch {
        // noop
      }
    },

    joinRoom: async () => {
      const { joinCode, playerName, gameClass } = get();
      if (joinCode.length !== 4) {
        set({ error: "El código tiene 4 caracteres." });
        return;
      }
      set({ busy: true, error: null });
      const { ok, status, data } = await postJson<{ token: string; view: PvpClientView }>(
        `/api/pvp/rooms/${joinCode}/join`,
        {
          name: playerName || "Reto",
          gameClass,
          deckIds: myDeckIds(gameClass),
        }
      );
      if (!ok || !data) {
        const msg =
          status === 404
            ? "Sala no encontrada. Revisa el código."
            : status === 409
              ? "La sala está llena o ya comenzó."
              : "No se pudo conectar a la sala.";
        set({ busy: false, error: msg });
        return;
      }
      try {
        sessionStorage.setItem(`pvp-token-${joinCode}`, data.token);
        sessionStorage.setItem("pvp-code", joinCode);
      } catch {
        // noop
      }
      set({ code: joinCode, token: data.token, mySide: data.view.you.side, busy: false, lastActionSeq: 0 });
      applyView(data.view);
      get().startPolling();
    },

    sendPlay: async (uid, lane) => {
      const { code, token } = get();
      if (!code || !token || actionInFlight) return;
      actionInFlight = true;
      try {
      const { ok, data } = await postJson<{ view: PvpClientView; error?: string }>(
        `/api/pvp/rooms/${code}/action`,
        { token, action: { type: "play", uid, lane } },
        token
      );
      if (ok && data?.view) {
        set({ invalidPlayMsg: null, selectedCardUid: null });
        applyView(data.view);
      } else {
        const msg = (data as { error?: string } | null)?.error ?? "No se pudo jugar la carta.";
        set({ invalidPlayMsg: msg });
      }
      } finally {
        actionInFlight = false;
      }
    },

    sendPass: async () => {
      const { code, token } = get();
      if (!code || !token || actionInFlight) return;
      actionInFlight = true;
      try {
      if (useSettings.getState().soundOn) sfx.click();
      const { ok, data } = await postJson<{ view: PvpClientView }>(
        `/api/pvp/rooms/${code}/action`,
        { token, action: { type: "pass" } },
        token
      );
      if (ok && data?.view) {
        applyView(data.view);
        set({ selectedCardUid: null });
      }
      } finally {
        actionInFlight = false;
      }
    },

    requestRematch: async () => {
      const { code, token } = get();
      if (!code || !token) return;
      const { ok, data } = await postJson<{ view: PvpClientView }>(
        `/api/pvp/rooms/${code}/rematch`,
        { token },
        token
      );
      if (ok && data?.view) applyView(data.view);
    },

    copyShareUrl: async () => {
      const { lanUrls, code } = get();
      if (lanUrls.length === 0) return;
      try {
        await navigator.clipboard.writeText(`${lanUrls[0]}  ·  Código: ${code}`);
      } catch {
        // clipboard bloqueado — nada crítico
      }
    },

    tryResume: async () => {
      if (get().resumed) return;
      set({ resumed: true });
      let code: string | null = null;
      let token: string | null = null;
      try {
        code = sessionStorage.getItem("pvp-code");
        token = code ? sessionStorage.getItem(`pvp-token-${code}`) : null;
      } catch {
        return;
      }
      if (!code || !token) return;
      try {
        const res = await fetch(`/api/pvp/rooms/${code}/state`, {
          headers: { "x-pvp-token": token },
        });
        if (!res.ok) {
          sessionStorage.removeItem("pvp-code");
          return;
        }
        const data = (await res.json()) as { view: PvpClientView };
        set({ code, token, mySide: data.view.you.side });
        applyView(data.view);
        // La vista puede seguir en lobby: mueve la pantalla según la fase real
        if (data.view.phase === "lobby") set({ screen: "lobby" });
        get().startPolling();
      } catch {
        // servidor caído — el usuario puede crear otra sala
      }
    },

    startPolling: () => {
      if (pollTimer) return;
      set({ polling: true });
      pollTimer = setInterval(async () => {
        const { code, token } = get();
        if (!code || !token) return;
        try {
          const res = await fetch(`/api/pvp/rooms/${code}/state`, {
            headers: { "x-pvp-token": token },
          });
          if (res.status === 404 || res.status === 403) {
            get().stopPolling();
            set({ error: "La sala ya no existe." });
            return;
          }
          if (!res.ok) {
            set({ connectionLost: true });
            return;
          }
          const data = (await res.json()) as { view: PvpClientView };
          applyView(data.view);
        } catch {
          set({ connectionLost: true });
        }
      }, POLL_MS);
    },

    stopPolling: () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      set({ polling: false });
    },
  };
});
