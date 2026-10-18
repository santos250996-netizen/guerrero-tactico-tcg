"use client";

// ============================================================================
// Store PvP (cliente) — sala, polling del estado autoritativo (~1.2 s) y
// efectos de UI (números flotantes, banners de turno, ráfaga legendaria).
// El token vive en sessionStorage (clave por sala) para que DOS PESTAÑAS del
// mismo navegador puedan probar la partida como dos jugadores distintos.
// ============================================================================

import { create } from "zustand";
import { Capacitor } from "@capacitor/core";
import type { PvpClientView, PvpSide, PvpState } from "@/lib/game/pvp";
import {
  applyPvpAction,
  buildClientView,
  createPvpState,
  joinBotPvpState,
  startPvpMatch,
} from "@/lib/game/pvp";
import type { CardDef, GameClass } from "@/lib/game/types";
import { CLASS_DECKS, classDecksOf } from "@/lib/game/cards";
import { materializeCard } from "@/lib/game/balance";
import { planBotTurn } from "@/lib/game/pvp-ai";
import { emitFx, type FxEvent } from "@/lib/game/fx";
import { sfx } from "@/lib/sound";
import { useSettings } from "@/lib/settings";
import { useCollectionStore, type CardReward } from "@/store/collectionStore";
import {
  LOCAL_PVP_PORT,
  handleLocalPvpApi,
  startLocalPvpServer,
  stopLocalPvpServer,
} from "@/lib/pvp/local-server";

export type PvpScreen = "setup" | "lobby" | "game";
export type PvpMode = "online" | "historia";

/** Bots predeterminados del modo historia (mazos espejo oficiales). */
export const HISTORIA_BOTS: Record<GameClass, string> = {
  guerrero: "Thralgrim, Señor de la Guerra",
  mago: "Selene, Tejedora de Escarcha",
  asesino: "Umbris, Cuchilla en las Sombras",
};

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

  // Modo historia: partida LOCAL contra bot (mismo motor PvP, sin red)
  mode: PvpMode;
  localState: PvpState | null;
  botClass: GameClass | null;
  pendingRewards: CardReward[] | null;

  // Formulario de setup
  playerName: string;
  gameClass: GameClass;
  joinCode: string;
  busy: boolean;
  error: string | null;
  lanUrls: string[];
  lanPort: number;

  // PvP offline por hotspot (APK nativa)
  hostingLocal: boolean; // este dispositivo sirve el API en proceso
  localPort: number | null;
  localIps: string[];
  remoteBase: string | null; // invitado: http://<ip-anfitrión>:8787
  hostIp: string; // input del invitado

  // Polling / sincronización
  polling: boolean;
  connectionLost: boolean;
  lastActionSeq: number;
  resumed: boolean;
  /** true mientras el pase está en vuelo — feedback inmediato del botón. */
  passing: boolean;

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
  setHostIp: (ip: string) => void;
  setPreviewCard: (c: CardDef | null) => void;
  dismissInvalidMsg: () => void;
  clearError: () => void;

  openSetup: () => void;
  exitToMenu: () => void;

  /** Modo historia: crea la partida local contra un bot predeterminado. */
  startHistoria: (opts: { playerClass: GameClass; botClass: GameClass; playerName?: string }) => void;

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
let botTimer: ReturnType<typeof setTimeout> | null = null;
let botRunToken = 0;

function cancelBotTimer(): void {
  botRunToken++;
  if (botTimer) {
    clearTimeout(botTimer);
    botTimer = null;
  }
}

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

  async function apiJson<T>(
    method: "GET" | "POST",
    path: string,
    opts: { body?: unknown; token?: string; base?: string | null } = {}
  ): Promise<{ ok: boolean; status: number; data: T | null }> {
    // Anfitrión offline: el API corre en proceso (sin red) → respuesta directa.
    if (get().hostingLocal) {
      const query: Record<string, string> = {};
      if (opts.token) query.token = opts.token;
      const res = handleLocalPvpApi(method, path, query, opts.body);
      const data = (res.body ?? null) as T | null;
      return { ok: res.status >= 200 && res.status < 300, status: res.status, data };
    }
    const base = opts.base !== undefined ? opts.base : get().remoteBase;
    try {
      const res = await fetch(`${base ?? ""}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(opts.token ? { "x-pvp-token": opts.token } : {}),
        },
        ...(method === "POST" && opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
      });
      const data = (await res.json().catch(() => null)) as T | null;
      return { ok: res.ok, status: res.status, data };
    } catch {
      return { ok: false, status: 0, data: null };
    }
  }

  /** Un ciclo de polling (GET state + applyView). Usado por el interval y
   *  tras una acción rechazada para disipar el desync al instante. */
  async function pollOnce(): Promise<void> {
    const { code, token } = get();
    if (!code || !token) return;
    const { ok, status, data } = await apiJson<{ view: PvpClientView }>(
      "GET",
      `/api/pvp/rooms/${code}/state`,
      { token }
    );
    if (status === 404 || status === 403) {
      get().stopPolling();
      set({ error: "La sala ya no existe." });
      return;
    }
    if (!ok || !data) {
      set({ connectionLost: true });
      return;
    }
    set({ connectionLost: false });
    applyView(data.view);
  }

  // ═══════════════════ MODO HISTORIA (partida local vs bot) ═══════════════════

  /** Aplica una acción del JUGADOR (side a) al estado local y refresca la vista. */
  function applyLocalAction(action: { type: "play"; uid: string; lane: string } | { type: "pass" }): boolean {
    const st = get();
    const local = st.localState;
    if (!local || st.mode !== "historia") return false;
    try {
      if (action.type === "pass") {
        applyPvpAction(local, "a", { type: "pass" });
      } else {
        applyPvpAction(local, "a", { type: "play", uid: action.uid, lane: action.lane as never });
      }
      set({ invalidPlayMsg: null, selectedCardUid: null });
      applyView(buildClientView(local, "a"));
      checkHistoriaEnd();
      scheduleBotIfNeeded();
      return true;
    } catch (err) {
      set({ invalidPlayMsg: (err as Error).message ?? "Acción inválida." });
      applyView(buildClientView(local, "a"));
      return false;
    }
  }

  /** Si le toca al bot, programa su actuación con pausas narrativas. */
  function scheduleBotIfNeeded(): void {
    const st = get();
    const local = st.localState;
    if (st.mode !== "historia" || !local) return;
    if (local.phase !== "playing" || local.activeSide !== "b") return;
    const token = ++botRunToken;
    botTimer = setTimeout(() => {
      void runBotTurn(token);
    }, 1000);
  }

  async function runBotTurn(token: number): Promise<void> {
    const st = get();
    const local = st.localState;
    if (!local || st.mode !== "historia" || token !== botRunToken) return;
    if (local.phase !== "playing" || local.activeSide !== "b") return;

    const plan = planBotTurn(local);
    for (const action of plan.actions) {
      if (token !== botRunToken) return;
      try {
        applyPvpAction(local, "b", action);
      } catch {
        break; // plan desincronizado — el pase de abajo cierra el turno igual
      }
      applyView(buildClientView(local, "a"));
      checkHistoriaEnd();
      if (local.phase !== "playing") return;
      await new Promise((r) => setTimeout(r, 850));
    }
    if (token !== botRunToken || local.phase !== "playing") return;
    try {
      applyPvpAction(local, "b", { type: "pass" });
    } catch {
      // el turno ya no es del bot — nada que hacer
    }
    applyView(buildClientView(local, "a"));
    checkHistoriaEnd();
  }

  /** Al terminar la partida: victoria → 2 cartas aleatorias a la colección. */
  function checkHistoriaEnd(): void {
    const st = get();
    const local = st.localState;
    if (st.mode !== "historia" || !local || local.phase !== "ended") return;
    if (st.pendingRewards) return;
    const final = local.finalResultA;
    const won = final ? final.playerWins > final.enemyWins : false;
    const col = useCollectionStore.getState();
    if (won) {
      col.registerWin();
      const rewards = col.addRewards(2);
      set({ pendingRewards: rewards });
    } else {
      set({ pendingRewards: [] });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════

  return {
    screen: "setup",
    code: null,
    token: null,
    mySide: null,
    view: null,
    mode: "online",
    localState: null,
    botClass: null,
    pendingRewards: null,
    playerName: "",
    gameClass: "guerrero",
    joinCode: "",
    busy: false,
    error: null,
    lanUrls: [],
    lanPort: 3000,
    hostingLocal: false,
    localPort: null,
    localIps: [],
    remoteBase: null,
    hostIp: "192.168.43.1",
    polling: false,
    connectionLost: false,
    lastActionSeq: 0,
    resumed: false,
    selectedCardUid: null,
    floatingNumbers: [],
    turnBanner: null,
    legendaryBurst: false,
    invalidPlayMsg: null,
    passing: false,
    previewCard: null,

    selectCard: (uid) => {
      const cur = get().selectedCardUid;
      set({ selectedCardUid: cur === uid ? null : uid, invalidPlayMsg: null });
      if (useSettings.getState().soundOn) sfx.select();
    },

    setName: (n) => set({ playerName: n }),
    setGameClass: (c) => set({ gameClass: c }),
    setJoinCode: (c) => set({ joinCode: c.toUpperCase().slice(0, 4) }),
    setHostIp: (ip) => set({ hostIp: ip }),
    setPreviewCard: (c) => set({ previewCard: c }),
    dismissInvalidMsg: () => set({ invalidPlayMsg: null }),
    clearError: () => set({ error: null }),

    openSetup: () => {
      get().stopPolling();
      cancelBotTimer();
      if (get().hostingLocal) void stopLocalPvpServer();
      set({
        screen: "setup",
        code: null,
        token: null,
        mySide: null,
        view: null,
        mode: "online",
        localState: null,
        botClass: null,
        pendingRewards: null,
        joinCode: "",
        error: null,
        lanUrls: [],
        lastActionSeq: 0,
        resumed: false,
        selectedCardUid: null,
        hostingLocal: false,
        localPort: null,
        localIps: [],
        remoteBase: null,
      });
    },

    exitToMenu: () => {
      get().stopPolling();
      cancelBotTimer();
      if (get().hostingLocal) void stopLocalPvpServer();
      set({
        screen: "setup",
        code: null,
        token: null,
        mySide: null,
        view: null,
        mode: "online",
        localState: null,
        botClass: null,
        pendingRewards: null,
        joinCode: "",
        error: null,
        lanUrls: [],
        lastActionSeq: 0,
        resumed: false,
        selectedCardUid: null,
        hostingLocal: false,
        localPort: null,
        localIps: [],
        remoteBase: null,
      });
      // vuelve al menú principal (gameStore)
      import("@/store/gameStore").then(({ useGameStore }) => {
        useGameStore.getState().setView("main-menu");
      });
    },

    startHistoria: ({ playerClass, botClass, playerName }) => {
      cancelBotTimer();
      get().stopPolling();
      if (get().hostingLocal) void stopLocalPvpServer();

      // Colección: arranca el mazo de la clase (una vez) y materializa el
      // mazo del jugador con sus mejores copias (+2 poder por fusión).
      const col = useCollectionStore.getState();
      col.grantStarterDeck(playerClass);
      const deck: CardDef[] = CLASS_DECKS[playerClass].map((c) =>
        materializeCard(c, useCollectionStore.getState().bestTier(c.id))
      );

      const state = createPvpState("HIST", {
        name: playerName || "Tú",
        gameClass: playerClass,
        deck,
      });
      // El bot lleva CUALQUIERA de los 2 mazos predeterminados de su clase (50/50).
      const botDecks = classDecksOf(botClass);
      joinBotPvpState(state, {
        name: HISTORIA_BOTS[botClass],
        gameClass: botClass,
        deck: botDecks[Math.floor(Math.random() * botDecks.length)],
      });

      set({
        mode: "historia",
        localState: state,
        botClass,
        pendingRewards: null,
        mySide: "a",
        code: "HIST",
        token: null,
        screen: "game",
        lastActionSeq: 0,
        selectedCardUid: null,
        invalidPlayMsg: null,
        connectionLost: false,
        error: null,
      });
      // La ruta es propiedad del gameStore: entra a la vista PvP (PvpGame)
      import("@/store/gameStore").then(({ useGameStore }) => {
        useGameStore.getState().setView("pvp");
      });
      applyView(buildClientView(state, "a"));
      scheduleBotIfNeeded();
    },

    createRoom: async () => {
      const { playerName, gameClass } = get();
      set({ busy: true, error: null });
      const payload = {
        name: playerName || "Anfitrión",
        gameClass,
        deckIds: myDeckIds(gameClass),
      };

      // ── APK nativa: servidor PvP DENTRO de la app (PvP offline por hotspot) ──
      if (Capacitor.isNativePlatform()) {
        let info;
        try {
          info = await startLocalPvpServer();
        } catch (err) {
          set({ busy: false, error: `No se pudo iniciar el servidor local: ${(err as Error).message}` });
          return;
        }
        const res = handleLocalPvpApi("POST", "/api/pvp/rooms", {}, payload);
        const data = res.body as { code: string; token: string; view: PvpClientView } | { error: string } | null;
        if (res.status !== 201 || !data || !("code" in data)) {
          void stopLocalPvpServer();
          set({ busy: false, error: "No se pudo crear la sala local." });
          return;
        }
        const ok = data as { code: string; token: string; view: PvpClientView };
        try {
          sessionStorage.setItem(`pvp-token-${ok.code}`, ok.token);
          sessionStorage.setItem("pvp-code", ok.code);
        } catch {
          // noop
        }
        set({
          hostingLocal: true,
          localPort: info.port,
          localIps: info.ips,
          remoteBase: null,
          code: ok.code,
          token: ok.token,
          mySide: "a",
          busy: false,
          lastActionSeq: 0,
        });
        applyView(ok.view);
        set({ screen: "lobby" });
        set({ lanUrls: info.ips.map((ip) => `http://${ip}:${info.port}`), lanPort: info.port });
        get().startPolling();
        return;
      }

      // ── Web/preview: backend Next en el mismo origen ──
      const { ok, data } = await apiJson<{ code: string; token: string; view: PvpClientView }>(
        "POST",
        "/api/pvp/rooms",
        { body: payload, base: "" }
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
      const payload = {
        name: playerName || "Reto",
        gameClass,
        deckIds: myDeckIds(gameClass),
      };

      // ── APK nativa: conectar al servidor del anfitrión por su IP (hotspot) ──
      let base: string | null = null;
      if (Capacitor.isNativePlatform()) {
        const ip = (get().hostIp || "").trim() || "192.168.43.1";
        base = `http://${ip}:${LOCAL_PVP_PORT}`;
        // Probe rápido con timeout corto → mensaje claro si no hay ruta
        let reachable = false;
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 3500);
          const r = await fetch(`${base}/api/pvp/lan-info`, { signal: ctrl.signal });
          clearTimeout(timer);
          reachable = r.ok;
        } catch {
          reachable = false;
        }
        if (!reachable) {
          set({
            busy: false,
            error: `No llego a ${ip}:${LOCAL_PVP_PORT}. Conéctate al WiFi del hotspot del anfitrión y verifica su IP en su pantalla de sala.`,
          });
          return;
        }
        set({ remoteBase: base });
        try {
          sessionStorage.setItem("pvp-remote-base", base);
        } catch {
          // noop
        }
      }

      const { ok, status, data } = await apiJson<{ token: string; view: PvpClientView }>(
        "POST",
        `/api/pvp/rooms/${joinCode}/join`,
        { body: payload, base }
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
      const st = get();
      if (st.mode === "historia") {
        if (actionInFlight) return;
        actionInFlight = true;
        try {
          applyLocalAction({ type: "play", uid, lane });
        } finally {
          actionInFlight = false;
        }
        return;
      }
      const { code, token } = get();
      if (!code || !token || actionInFlight) return;
      actionInFlight = true;
      try {
      const { ok, data } = await apiJson<{ view: PvpClientView; error?: string }>(
        "POST",
        `/api/pvp/rooms/${code}/action`,
        { body: { token, action: { type: "play", uid, lane } }, token }
      );
      if (ok && data?.view) {
        set({ invalidPlayMsg: null, selectedCardUid: null });
        applyView(data.view);
      } else {
        const msg = (data as { error?: string } | null)?.error ?? "No se pudo jugar la carta.";
        set({ invalidPlayMsg: msg });
        // Re-sincroniza YA: el server puede estar en otro turno (desync del poll)
        void pollOnce();
      }
      } finally {
        actionInFlight = false;
      }
    },

    sendPass: async () => {
      const st = get();
      if (st.mode === "historia") {
        if (actionInFlight) return;
        actionInFlight = true;
        set({ passing: true });
        try {
          if (useSettings.getState().soundOn) sfx.click();
          applyLocalAction({ type: "pass" });
        } finally {
          actionInFlight = false;
          set({ passing: false });
        }
        return;
      }
      const { code, token } = get();
      if (!code || !token || actionInFlight) return;
      actionInFlight = true;
      set({ passing: true });
      try {
      if (useSettings.getState().soundOn) sfx.click();
      const { ok, data } = await apiJson<{ view: PvpClientView; error?: string }>(
        "POST",
        `/api/pvp/rooms/${code}/action`,
        { body: { token, action: { type: "pass" } }, token }
      );
      if (ok && data?.view) {
        set({ invalidPlayMsg: null, selectedCardUid: null });
        applyView(data.view);
      } else {
        // El pase fue rechazado (p.ej. "No es tu turno" por desync del poll):
        // NUNCA silencio — muestra el motivo y re-sincroniza el estado real.
        const msg = (data as { error?: string } | null)?.error ?? "No se pudo pasar el turno. Reintentando…";
        set({ invalidPlayMsg: msg });
        void pollOnce();
      }
      } finally {
        actionInFlight = false;
        set({ passing: false });
      }
    },

    requestRematch: async () => {
      const st = get();
      // Historia: revancha local contra el MISMO bot (mismos mazos, nuevo sorteo)
      if (st.mode === "historia" && st.localState) {
        cancelBotTimer();
        startPvpMatch(st.localState);
        set({ pendingRewards: null, lastActionSeq: 0, selectedCardUid: null, invalidPlayMsg: null });
        applyView(buildClientView(st.localState, "a"));
        scheduleBotIfNeeded();
        return;
      }
      const { code, token } = get();
      if (!code || !token) return;
      const { ok, data } = await apiJson<{ view: PvpClientView }>(
        "POST",
        `/api/pvp/rooms/${code}/rematch`,
        { body: { token }, token }
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
      // Restaurar la base remota si el invitado se recargó a mitad de partida
      let base: string | null = get().remoteBase;
      try {
        const saved = sessionStorage.getItem("pvp-remote-base");
        if (!base && saved) base = saved;
      } catch {
        // noop
      }
      if (Capacitor.isNativePlatform() && !base) {
        // Sin IP recordada no hay ruta al anfitrión — limpia y vuelve a setup
        try {
          sessionStorage.removeItem("pvp-code");
        } catch {
          // noop
        }
        return;
      }
      try {
        const res = await apiJson<{ view: PvpClientView }>("GET", `/api/pvp/rooms/${code}/state`, {
          token,
          base,
        });
        if (!res.ok || !res.data) {
          sessionStorage.removeItem("pvp-code");
          return;
        }
        const data = res.data as { view: PvpClientView };
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
      pollTimer = setInterval(() => {
        void pollOnce();
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
