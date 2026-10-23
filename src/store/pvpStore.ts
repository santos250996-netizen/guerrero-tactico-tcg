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
  enableBossMode,
  joinBotPvpState,
  reconcileView,
  startPvpMatch,
} from "@/lib/game/pvp";
import { LANE_META, type CardDef, type GameClass } from "@/lib/game/types";
import { BOSS_DECKS, classDecksOf } from "@/lib/game/cards";
import { materializeCard } from "@/lib/game/balance";
import { planBotTurn } from "@/lib/game/pvp-ai";
import { emitFx, type FxEvent } from "@/lib/game/fx";
import { sfx } from "@/lib/sound";
import { haptic } from "@/lib/haptics";
import { useSettings } from "@/lib/settings";
import { useCollectionStore, type CardReward } from "./collectionStore";
import { useStatsStore, type MatchResult } from "./statsStore";
import { useMissionStore } from "./missionStore";
import { useCampaignStore } from "./campaignStore";
import {
  botTierForStep,
  bossTierForPrestige,
  bossClassForStep,
  effectiveDropLevel,
  isBossStep,
  rewardCountForStep,
  rivalClassForStep,
  rivalDeckIndexForStep,
  rivalNameForStep,
  xpBonusForStep,
  CAMPAIGN_BOSS_NAMES,
  CAMPAIGN_BOSS_STEPS,
} from "@/lib/game/campaign";
import {
  RUSH_BOSSES,
  rushBossesForCycle,
  rushPickTierForBoss,
  rushXpForBoss,
} from "@/lib/game/rush";
import {
  LOCAL_PVP_PORT,
  handleLocalPvpApi,
  startLocalPvpServer,
  stopLocalPvpServer,
} from "@/lib/pvp/local-server";

type PvpScreen = "setup" | "lobby" | "game";
type PvpMode = "online" | "historia";

// LA CAMPAÑA: los nombres de bots y jefes viven en lib/game/campaign.ts
// (junto al resto de la lógica de la escalera). Los jefes ya no se desafían
// con un botón aparte: EMERGEN de la escalera en los escalones 5, 10 y 15.

interface PvpFloatingNumber {
  id: string;
  uid: string;
  value: number;
}

/** Anuncio visual de la jugada del rival — para que su turno se VEA,
 *  no solo el cartel "TURNO DEL RIVAL". */
interface RivalPlayAnnounce {
  id: number;
  name: string;
  defId: string;
  rarity: string;
  cost: number;
  power: number;
  laneTitle: string;
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
  /** MODO JEFE activo en esta partida de historia (escalón 5/10/15). */
  bossActive: boolean;
  /** LA CAMPAÑA — escalón que se está jugando (null en PvP online). */
  campaignStep: number | null;
  /** Splash pre-batalla de LA CAMPAÑA (lore del rival) pendiente de confirmar. */
  battleIntro: boolean;
  /** Botín del JEFE a ELEGIR: 3 ÉPICAS — toma 2 (null fuera del caso). */
  bossPickOptions: CardReward[] | null;
  /** Opciones ya marcadas del pick del jefe (índices, máx bossPickMax). */
  bossPickSelected: number[];
  /** Cartas a ELEGIR del pick: 2 = jefe de campaña clásico · 1 = Rush. */
  bossPickMax: number;
  // ── RUSH DE JEFES (plan-expansion-v3 §3.2) — run de 3 jefes seguidos ──
  /** Run de Rush en curso (el modo vive DENTRO de historia con esta bandera). */
  rushActive: boolean;
  /** Jefe ACTUAL de la run (0..2). */
  rushIndex: number;
  /** Ciclo de campaña (prestigio) al empezar la run. */
  rushCycle: number;
  /** ¿Nunca completó una run en este ciclo? → legendaria garantizada. */
  rushFirstCycle: boolean;
  /** Jefes vencidos en la run hasta ahora (modal + registro). */
  rushBeaten: number;
  /** Clase del jefe actual (splash del rush: lore + bioma propios). */
  rushBossClass: GameClass | null;
  /** RUSH: empieza una run de 3 jefes con la clase activa. */
  startRush: (opts: { playerClass: GameClass; playerName?: string }) => void;
  /** RUSH: encadena el siguiente jefe (tras cobrar el pick del anterior). */
  advanceRush: () => void;
  /** La victoria acaba de CERRAR la campaña (escalón 15) → celebración ★. */
  campaignCompleted: boolean;

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
  invalidPlayMsg: string | null;
  previewCard: CardDef | null;
  rivalPlay: RivalPlayAnnounce | null;
  /** uid de la carta recién jugada por el rival (anillo ámbar en el tablero). */
  highlightUid: string | null;

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
  /** Cierra el splash de lore y deja ver el tablero (tap en «¡A LUCHAR!»). */
  dismissBattleIntro: () => void;
  /** Marca/desmarca una opción del botín del JEFE (máximo 2). */
  toggleBossPick: (index: number) => void;
  /** Confirma el pick: concede las marcadas y las añade al botín mostrado. */
  confirmBossPick: () => void;

  /** Modo historia — LA CAMPAÑA: juega el ESCALÓN dado de la escalera de
   *  guerra (5/10/15 son JEFES). Rival determinista, tier que escala. */
  startHistoria: (opts: { playerClass: GameClass; playerName?: string; step: number }) => void;

  createRoom: () => Promise<void>;
  joinRoom: () => Promise<void>;
  sendPlay: (uid: string, lane: string) => Promise<void>;
  sendPass: () => Promise<void>;
  requestRematch: () => Promise<void>;
  copyShareUrl: () => Promise<void>;

  tryResume: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  /** Re-sincroniza YA con el servidor (poll único). Botón de rescate y
   *  visibilitychange (al volver del fondo tras tocar el hotspot). */
  resync: () => void;
}

let pollTimer: ReturnType<typeof setInterval> | null = null;
let floatId = 0;
let rivalPlayId = 0;
/** Guard anti doble-disparo: el drop del drag dispara onPlayCard + click del carril. */
let actionInFlight = false;
let botTimer: ReturnType<typeof setTimeout> | null = null;
let botRunToken = 0;
/** Fin de partida ONLINE ya contabilizado (stats/rango/misiones, 1 vez por sala). */
let onlineEndNoted = false;

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
  /** Aplica una vista del servidor: sincroniza estado + efectos de UI.
   *  A PRUEBA DE FALLOS: el set({ view }) se ejecuta SIEMPRE — cualquier
   *  excepción en sonido/FX/banner no puede dejar la UI congelada con un
   *  estado viejo (bug del anfitrión congelado tras tocar Pasar: un throw
   *  aquí mataba applyView antes del set y CADA poll re-fallaba para siempre). */
  function applyView(view: PvpClientView) {
    const st = get();
    const prevSeq = st.lastActionSeq;
    const mine = st.mySide;

    // Efectos de la última acción (solo si es nueva)
    const newFloats: PvpFloatingNumber[] = [];
    let rivalPlay: RivalPlayAnnounce | null = null;
    let highlightUid: string | null = null;
    try {
      const la = view.lastAction;
      if (la && la.seq > prevSeq) {
        // NOTA: el CHOQUE DE CARRILES (boom+vibración al pasar turno) fue
        // eliminado por jank en móvil — el pase ya suena con turnPass/
        // enemyTurn abajo. Nada de sacudidas.
        for (const m of la.mutations) {
          if (m.powerDelta === 0) continue;
          newFloats.push({ id: `pf-${++floatId}`, uid: m.uid, value: m.powerDelta });
        }
        // SONIDOS de cambio de turno (sin cartel: el full-screen de 1.6s era
        // el jank del cambio de turno y el burst de legendaria se quedaba
        // clavado en pantalla — el anillo ámbar de la carta + el separador
        // ya comunican lo que pasa).
        if (la.bannerFor && la.bannerFor === mine && view.phase === "playing") {
          if (useSettings.getState().soundOn) sfx.turnPass();
        } else if (la.bannerFor && view.phase === "playing") {
          if (useSettings.getState().soundOn) sfx.enemyTurn();
        }

        // Jugada del RIVAL → anuncio con la carta (nombre/arte/coste/poder)
        // + anillo ámbar sobre la carta recién entrada al carril. Sin esto el
        // turno de la IA era invisible: solo el cartel y el tablero cambiaba.
        if (la.type === "play" && la.side !== mine) {
          let played: { defId: string; name: string; cost: number; currentPower: number; rarity: string } | undefined;
          for (const laneId of view.you.lanes) {
            const found = view.board[laneId]?.enemy.find((c) => c.uid === la.playedUid);
            if (found) {
              played = found;
              break;
            }
          }
          rivalPlay = {
            id: ++rivalPlayId,
            name: played?.name ?? la.cardName ?? "una carta",
            defId: played?.defId ?? "",
            rarity: played?.rarity ?? la.playedRarity ?? "common",
            cost: played?.cost ?? 0,
            power: played?.currentPower ?? 0,
            laneTitle: la.lane ? (LANE_META[la.lane]?.title ?? "") : "",
          };
          highlightUid = la.playedUid ?? null;
        }
      }

      // Sonidos de jugadas (RIVAL con anuncio, PROPIAS antes mudas) + háptica
      if (la && la.seq > prevSeq && la.type === "play" && view.phase === "playing") {
        if (useSettings.getState().soundOn) {
          sfx.cardPlay();
          if (la.mutations.some((m) => m.powerDelta > 0)) sfx.buff();
          if (la.mutations.some((m) => m.powerDelta < 0)) sfx.debuff();
        }
        if (la.side === mine) haptic("light");
      }
    } catch (err) {
      // El audio/FX NUNCA tumba la sincronización del estado.
      console.error("[pvp] applyView: efectos de UI descartados:", err);
    }

    // Cambio de pantalla lobby → game cuando la partida arranca
    const screen: PvpScreen =
      view.phase === "playing" || view.phase === "ended" ? "game" : st.screen === "lobby" ? "lobby" : st.screen;

    // PERF: los floats viajan EN el set principal — una sola notificación →
    // un solo render por acción (en el móvil low-end cada render completo del
    // tablero cuesta; dos sets seguidos era un render doble por jugada).
    // PERF Task 46: reconcileView reutiliza las referencias previas de TODO lo
    // que no cambió por valor → los memo() de carriles/minis/mano funcionan de
    // verdad y el re-render por acción toca SOLO lo que cambió (medido: PASAR
    // pasaba de 40-48ms input→paint a ~margen de ruido).
    const reconciled = st.view ? reconcileView(st.view, view) : view;
    set({
      view: reconciled,
      lastActionSeq: view.lastAction?.seq ?? prevSeq,
      code: view.code,
      mySide: view.you.side,
      screen,
      rivalPlay,
      highlightUid,
      connectionLost: false,
      ...(newFloats.length > 0
        ? { floatingNumbers: [...st.floatingNumbers, ...newFloats] }
        : null),
    });

    // ══ Nueva partida (revancha aceptada): rearma el guard de fin y limpia
    //    el botín mostrado — la revancha TAMBIÉN paga y contabiliza.
    if (view.phase !== "ended" && onlineEndNoted) {
      onlineEndNoted = false;
      set({ pendingRewards: null });
    }

    // ══ Fin de partida ONLINE: EL PVP TAMBIÉN PAGA — victoria 2 cartas
    //    (+1 en N5/N10) con mesa de drops del nivel del jugador; derrota/
    //    empate 1 de consuelo (misma regla que la campaña: nunca manos
    //    vacías). Además stats + liga + misiones, UNA vez por sala (guard
    //    onlineEndNoted; los polls repetirían este bloque).
    if (view.phase === "ended" && st.mode === "online" && !onlineEndNoted) {
      const f = view.finalResult;
      if (f) {
        onlineEndNoted = true;
        try {
          const cls = get().gameClass;
          const result: MatchResult =
            f.result === "WIN" || f.result === "LOSS" ? f.result : "DRAW";
          useStatsStore.getState().registerMatch(result, { cls, online: true });
          const col = useCollectionStore.getState();
          const rewards = result === "WIN"
            ? col.addRewards(2, {
                bonusForLevel: true, // +1 carta extra en N5/N10
                floorLevel: useStatsStore.getState().level,
              })
            : col.addRewards(1);
          set({ pendingRewards: rewards });
          const ms = useMissionStore.getState();
          if (result === "WIN") ms.progress("win-games");
          if (result === "WIN") ms.progress("win-class", 1, cls);
          ms.progress("play-online");
          const laneWins = f.laneOutcomes.filter((o) => o.winner === "player").length;
          if (laneWins > 0) ms.progress("win-lanes", laneWins);
        } catch (err) {
          console.error("[pvp] fin online: botín/stats/misiones descartados:", err);
        }
      }
    }

    // Auto-limpieza del anuncio del rival y del anillo de la carta jugada
    if (rivalPlay) {
      const rid = rivalPlay.id;
      setTimeout(() => {
        try {
          const cur = get().rivalPlay;
          if (cur && cur.id === rid) set({ rivalPlay: null });
        } catch {
          // noop
        }
      }, 1900);
    }
    if (highlightUid) {
      setTimeout(() => {
        try {
          if (get().highlightUid === highlightUid) set({ highlightUid: null });
        } catch {
          // noop
        }
      }, 1500);
    }

    // ====== VFX: eventos FX de la acción (DESPUÉS del set: los carriles ya
    // están en el DOM). Mapeo: lado absoluto a/b → player/enemy propio y
    // lanePos → carril propio de esa posición (el board viaja con MIS claves).
    // Sonidos de keywords (trampas/destrucciones) INDEPENDIENTES de animationsOn.
    try {
      const la = view.lastAction;
      if (la && la.seq > prevSeq && la.fx && la.fx.length > 0 && useSettings.getState().soundOn) {
        if (la.fx.some((f) => f.kind === "trap")) {
          sfx.trapTrigger();
          haptic("medium");
        }
        if (la.fx.some((f) => f.kind === "destroy")) sfx.remove();
        // RITUALES DE CLASE V3 (grupo A): cada regla SUENA distinto al activarse
        // (independiente de animationsOn, igual que trampa/destrucción).
        for (const f of la.fx) {
          if (f.kind !== "class") continue;
          if (f.recipe === "formation_banner") { sfx.formation(); haptic("medium"); }
          else if (f.recipe === "resonance_runes") { sfx.resonance(); haptic("light"); }
          else if (f.recipe === "combo_blades") { sfx.combo(); haptic("medium"); }
        }
      }
    } catch (err) {
      console.error("[pvp] applyView: sonidos de FX descartados:", err);
    }
    try {
      const la = view.lastAction;
      if (la && la.seq > prevSeq && la.fx && la.fx.length > 0 && useSettings.getState().animationsOn) {
        const mapped: FxEvent[] = la.fx.map((f) => ({
          kind: f.kind,
          keyword: f.keyword,
          recipe: f.recipe,
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
    } catch (err) {
      console.error("[pvp] applyView: FX descartados:", err);
    }

    // Auto-limpieza de floats — CON GUARD: si sus ids ya no están (reset,
    // limpieza previa) NO se hace set → cero re-render innecesario a los
    // 1600ms (antes re-renderizaba el tablero completo sin motivo).
    if (newFloats.length > 0) {
      const ids = new Set(newFloats.map((f) => f.id));
      setTimeout(() => {
        try {
          const cur = get().floatingNumbers;
          if (!cur.some((f) => ids.has(f.id))) return;
          set({ floatingNumbers: cur.filter((f) => !ids.has(f.id)) });
        } catch {
          // noop
        }
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
      // Belt & suspenders: el token VIAJA TAMBIÉN en la query de los GET.
      // (El servidor local del anfitrión ya acepta header x-pvp-token, pero
      // así el polling funciona aunque un backend ignore headers.)
      let url = `${base ?? ""}${path}`;
      if (method === "GET" && opts.token) {
        url += (url.includes("?") ? "&" : "?") + `token=${encodeURIComponent(opts.token)}`;
      }
      const res = await fetch(url, {
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
    // PERF: si el version del servidor NO cambió, no hay nada nuevo — saltar
    // applyView evita re-renderizar TODO el tablero cada 1.2 s (era el mayor
    // coste invisible del juego en móvil: poll → set → render completo).
    const cur = get().view;
    if (cur && data.view.version === cur.version) return;
    try {
      applyView(data.view);
    } catch (err) {
      // Red de seguridad: si el mapeo de UI falla, el ESTADO se sincroniza
      // igual para que la partida nunca quede pintada en un turno viejo.
      console.error("[pvp] pollOnce: applyView falló — sync mínimo:", err);
      set({ view: data.view, lastActionSeq: data.view.lastAction?.seq ?? get().lastActionSeq });
    }
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
      if (action.type === "play") useMissionStore.getState().progress("play-cards");
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

  /** Si le toca al bot, programa su actuación con pausas narrativas.
   *  1900ms: el cartel "TURNO DEL RIVAL" vive ~1600ms — el bot NO debe jugar
   *  detrás del cartel (antes empezaba a los 1000ms y su primera jugada se
   *  perdía detrás del overlay, el turno parecía invisible). */
  function scheduleBotIfNeeded(): void {
    const st = get();
    const local = st.localState;
    if (st.mode !== "historia" || !local) return;
    if (local.phase !== "playing" || local.activeSide !== "b") return;
    const token = ++botRunToken;
    botTimer = setTimeout(() => {
      void runBotTurn(token);
    }, 1900);
  }

  async function runBotTurn(token: number): Promise<void> {
    const st = get();
    const local = st.localState;
    if (!local || st.mode !== "historia" || token !== botRunToken) return;
    if (local.phase !== "playing" || local.activeSide !== "b") return;

    const plan = planBotTurn(local);
    // MODO JEFE: en sus turnos PARES (2, 4, 6) el jefe juega su 1ª carta GRATIS
    const bossFreeCard = local.bossMode && local.turn % 2 === 0;
    for (const [i, action] of plan.actions.entries()) {
      if (token !== botRunToken) return;
      try {
        applyPvpAction(local, "b", action, Date.now(), { free: bossFreeCard && i === 0 });
      } catch {
        break; // plan desincronizado — el pase de abajo cierra el turno igual
      }
      applyView(buildClientView(local, "a"));
      checkHistoriaEnd();
      if (local.phase !== "playing") return;
      // Cadencia legible: cada jugada del bot deja ver su anuncio
      // (tarjeta "RIVAL JUGÓ") + el anillo ámbar antes de la siguiente.
      await new Promise((r) => setTimeout(r, 1100));
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

  /** Al terminar la partida: la CAMPAÑA paga según el ESCALÓN — botín y XP
   *  crecen al avanzar (regla del jugador: perder SIEMPRE paga 1 carta para
   *  que el farming siga vivo; perder NO hace retroceder la escalera).
   *  VICTORIA normal: rewardCountForStep cartas (2→5) con mesa de drops
   *  max(nivel, escalón+2) + XP extra de escalón + advance().
   *  VICTORIA de JEFE: ELIGE 1 de 3 RARAS (decisión > azar; sin legendarias
   *  que aplanen la progresión).
   *  Escalón 15 vencido → cierra la campaña: ★ Prestigio+1.
   *  Además contabiliza stats por clase + rachas y misiones diarias. */
  function checkHistoriaEnd(): void {
    const st = get();
    const local = st.localState;
    if (st.mode !== "historia" || !local || local.phase !== "ended") return;
    if (st.pendingRewards || st.bossPickOptions) return;
    const final = local.finalResultA;
    const won = final ? final.playerWins > final.enemyWins : false;
    const lost = final ? final.playerWins < final.enemyWins : false;
    const result: MatchResult = won ? "WIN" : lost ? "LOSS" : "DRAW";
    const step = st.campaignStep ?? 1;
    const col = useCollectionStore.getState();

    // ══ RUSH DE JEFES: la RUN manda — la campaña NO avanza y el botín sale
    //    del escalón de la run (§3.2). XP ×2 por jefe: registerMatch(boss)
    //    paga base 6 + jefe 10 y encima se dobla el bono de escalón. Pick
    //    SIEMPRE 1 de 3: rara / épica / legendaria 50% (100% 1ª vez del
    //    ciclo) — o común en el jefe 3 si no tocó. Perder CIERRA la run.
    if (st.rushActive) {
      const idx = st.rushIndex;
      const prestige = useCampaignStore.getState().prestige;
      if (won) {
        col.registerWin();
        useStatsStore.getState().addXp(rushXpForBoss(idx, prestige));
        const tier = rushPickTierForBoss(idx, { firstCycleIncomplete: st.rushFirstCycle });
        const rewards = col.addRewards(2, {
          bonusForLevel: true,
          floorLevel: effectiveDropLevel(useStatsStore.getState().level, CAMPAIGN_BOSS_STEPS[Math.min(idx, CAMPAIGN_BOSS_STEPS.length - 1)]),
        });
        set({
          pendingRewards: rewards,
          bossPickOptions: col.rollPickOptions(3, tier),
          bossPickSelected: [],
          bossPickMax: 1,
          rushBeaten: idx + 1,
        });
      } else {
        const rewards = col.addRewards(1); // la derrota nunca deja manos vacías
        set({ pendingRewards: rewards, rushBeaten: idx });
      }
      try {
        useStatsStore.getState().registerMatch(result, {
          cls: st.gameClass,
          online: false,
          boss: won,
        });
        useStatsStore.getState().registerRush({
          cls: st.gameClass,
          beaten: won ? idx + 1 : idx,
          completed: won && idx >= RUSH_BOSSES - 1,
          cycle: st.rushCycle,
        });
        const ms = useMissionStore.getState();
        if (won) ms.progress("win-games");
        if (won) ms.progress("win-class", 1, st.gameClass);
        if (won) ms.progress("beat-boss");
        if (final) {
          const laneWins = final.laneOutcomes.filter((o) => o.winner === "player").length;
          if (laneWins > 0) ms.progress("win-lanes", laneWins);
        }
      } catch {
        // noop
      }
      return;
    }

    if (won) {
      col.registerWin();
      if (st.bossActive) {
        // EL JEFE PAGA DE VERDAD (se sentía pobre junto a las normales):
        // el botín COMPLETO del escalón + ELIGE 2 de 3 ÉPICAS (decisión >
        // azar; sin legendarias que aplanen la progresión).
        const rewards = col.addRewards(rewardCountForStep(step), {
          bonusForLevel: true, // +1 carta extra en N5/N10
          floorLevel: effectiveDropLevel(useStatsStore.getState().level, step),
        });
        set({
          pendingRewards: rewards,
          bossPickOptions: col.rollPickOptions(3, "epic"),
          bossPickSelected: [],
        });
      } else {
        const rewards = col.addRewards(rewardCountForStep(step), {
          bonusForLevel: true, // +1 carta extra en N5/N10
          floorLevel: effectiveDropLevel(useStatsStore.getState().level, step),
        });
        set({ pendingRewards: rewards });
      }
      // LA CAMPAÑA avanza (persistente) + XP EXTRA de escalón (6+step, ×1.5
      // en prestigio) encima de la XP base que ya dio registerMatch.
      const campaign = useCampaignStore.getState();
      const done = campaign.advance().completed;
      useStatsStore.getState().addXp(xpBonusForStep(step, campaign.prestige));
      if (done) set({ campaignCompleted: true });
    } else {
      const rewards = col.addRewards(1);
      set({ pendingRewards: rewards });
    }
    // Stats + misiones (nunca tumban el fin de partida)
    try {
      useStatsStore.getState().registerMatch(result, {
        cls: st.gameClass,
        online: false,
        boss: st.bossActive,
      });
      const ms = useMissionStore.getState();
      if (won) ms.progress("win-games");
      if (won) ms.progress("win-class", 1, st.gameClass);
      if (won && st.bossActive) ms.progress("beat-boss");
      if (final) {
        const laneWins = final.laneOutcomes.filter((o) => o.winner === "player").length;
        if (laneWins > 0) ms.progress("win-lanes", laneWins);
      }
    } catch {
      // noop
    }
  }

  // ═══════════════ RUSH DE JEFES — montaje de cada jefe de la run ═══════════

  /** Monta el jefe `index` de la run EN CURSO (mismo motor de historia: el
   *  bot juega como un player — mazo temático materializado al tier del
   *  ciclo + jugada gratis + 3 bonos). Sin curación entre peleas: cada
   *  combate es una partida fresca pero la run sigue viva (rushActive). */
  function startRushFight(index: number): void {
    const st = get();
    cancelBotTimer();
    get().stopPolling();
    if (get().hostingLocal) void stopLocalPvpServer();
    onlineEndNoted = false;
    useStatsStore.getState().clearLevelUpFlash();

    const col = useCollectionStore.getState();
    col.grantStarterDeck(st.gameClass);
    const deck: CardDef[] = useCollectionStore.getState().battleDeckFor(st.gameClass);

    const state = createPvpState("RUSH", {
      name: st.playerName || "Tú",
      gameClass: st.gameClass,
      deck,
    });
    const prestige = useCampaignStore.getState().prestige;
    const bossClass = rushBossesForCycle(st.rushCycle)[Math.min(Math.max(0, index), RUSH_BOSSES - 1)];
    const botDeck = BOSS_DECKS[bossClass].map((c) => materializeCard(c, bossTierForPrestige(prestige)));
    joinBotPvpState(state, {
      name: CAMPAIGN_BOSS_NAMES[bossClass],
      gameClass: bossClass,
      deck: botDeck,
    });
    enableBossMode(state);

    set({
      mode: "historia",
      localState: state,
      botClass: bossClass,
      pendingRewards: null,
      battleIntro: true,
      bossPickOptions: null,
      bossPickSelected: [],
      bossPickMax: 1, // rush: el pick SIEMPRE es 1 de 3
      mySide: "a",
      code: "RUSH",
      token: null,
      screen: "game",
      lastActionSeq: 0,
      selectedCardUid: null,
      invalidPlayMsg: null,
      connectionLost: false,
      error: null,
      gameClass: st.gameClass,
      bossActive: true,
      campaignStep: null,
      campaignCompleted: false,
      rivalPlay: null,
      highlightUid: null,
      rushActive: true,
      rushIndex: index,
      rushBossClass: bossClass,
    });
    import("@/store/gameStore").then(({ useGameStore }) => {
      useGameStore.getState().setView("pvp");
    });
    applyView(buildClientView(state, "a"));
    scheduleBotIfNeeded();
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
    battleIntro: false,
    bossPickOptions: null,
    bossPickSelected: [],
    bossPickMax: 2,
    rushActive: false,
    rushIndex: 0,
    rushCycle: 0,
    rushFirstCycle: false,
    rushBeaten: 0,
    rushBossClass: null,
    bossActive: false,
    campaignStep: null,
    campaignCompleted: false,
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
    invalidPlayMsg: null,
    passing: false,
    previewCard: null,
    rivalPlay: null,
    highlightUid: null,

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
      onlineEndNoted = false;
      useStatsStore.getState().clearLevelUpFlash();
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
        battleIntro: false,
        bossPickOptions: null,
        bossPickSelected: [],
        bossPickMax: 2,
        rushActive: false,
        rushIndex: 0,
        rushCycle: 0,
        rushFirstCycle: false,
        rushBeaten: 0,
        rushBossClass: null,
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
      onlineEndNoted = false;
      useStatsStore.getState().clearLevelUpFlash();
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
        battleIntro: false,
        bossPickOptions: null,
        bossPickSelected: [],
        bossPickMax: 2,
        rushActive: false,
        rushIndex: 0,
        rushCycle: 0,
        rushFirstCycle: false,
        rushBeaten: 0,
        rushBossClass: null,
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
        rivalPlay: null,
        highlightUid: null,
        bossActive: false,
        campaignStep: null,
        campaignCompleted: false,
      });
      // vuelve al menú principal (gameStore)
      import("@/store/gameStore").then(({ useGameStore }) => {
        useGameStore.getState().setView("main-menu");
      });
    },

    dismissBattleIntro: () => set({ battleIntro: false }),

    toggleBossPick: (index) => {
      const sel = get().bossPickSelected;
      if (sel.includes(index)) {
        set({ bossPickSelected: sel.filter((i) => i !== index) });
        return;
      }
      if (sel.length >= get().bossPickMax) return; // 2 (jefe) o 1 (rush) — ni una más
      set({ bossPickSelected: [...sel, index] });
    },

    confirmBossPick: () => {
      const { bossPickOptions, bossPickSelected, pendingRewards } = get();
      if (!bossPickOptions || bossPickSelected.length === 0) return;
      const col = useCollectionStore.getState();
      const granted = bossPickSelected.map((i) => col.grantPick(bossPickOptions[i]));
      set({
        pendingRewards: [...(pendingRewards ?? []), ...granted],
        bossPickOptions: null,
        bossPickSelected: [],
      });
    },

    startHistoria: ({ playerClass, playerName, step }) => {
      cancelBotTimer();
      get().stopPolling();
      if (get().hostingLocal) void stopLocalPvpServer();
      onlineEndNoted = false;
      useStatsStore.getState().clearLevelUpFlash();

      // Colección: entrega el mazo inicial (neutrales, 1 vez) y arma el mazo
      // de BATALLA con lo editado por el jugador (12 propias, materializadas
      // con su tier de fusión) — o las 12 mejores propias si nunca editó.
      const col = useCollectionStore.getState();
      col.grantStarterDeck(playerClass);
      const deck: CardDef[] = useCollectionStore.getState().battleDeckFor(playerClass);

      const state = createPvpState("HIST", {
        name: playerName || "Tú",
        gameClass: playerClass,
        deck,
      });
      // LA CAMPAÑA — el rival sale del ESCALÓN (determinista): los escalones
      // 5/10/15 son JEFES con su mazo temático materializado (épico, o
      // legendaria en prestigio) y enableBossMode (jugada gratis + 3 bonos).
      // El resto son bots de rotación fija cuyo mazo oficial se materializa
      // al tier del tramo (común → raro → épico, +1 por prestigio).
      const boss = isBossStep(step);
      const prestige = useCampaignStore.getState().prestige;
      const bossClass = bossClassForStep(step);
      const botClass = bossClass ?? rivalClassForStep(step);
      const botName = rivalNameForStep(step);
      const botDeck = boss
        ? BOSS_DECKS[botClass].map((c) => materializeCard(c, bossTierForPrestige(prestige)))
        : classDecksOf(botClass)[rivalDeckIndexForStep(step)].map((c) =>
            materializeCard(c, botTierForStep(step, prestige))
          );
      joinBotPvpState(state, {
        name: botName,
        gameClass: botClass,
        deck: botDeck,
      });
      if (boss) enableBossMode(state);

      set({
        mode: "historia",
        localState: state,
        botClass,
        pendingRewards: null,
        battleIntro: true, // splash de lore — se cierra con «¡A LUCHAR!»
        bossPickOptions: null,
        bossPickSelected: [],
        bossPickMax: 2, // jefe de campaña clásico: ELIGE 2 de 3 épicas
        rushActive: false,
        rushBeaten: 0,
        rushBossClass: null,
        mySide: "a",
        code: "HIST",
        token: null,
        screen: "game",
        lastActionSeq: 0,
        selectedCardUid: null,
        invalidPlayMsg: null,
        connectionLost: false,
        error: null,
        gameClass: playerClass,
        bossActive: boss,
        campaignStep: step,
        campaignCompleted: false,
        rivalPlay: null,
        highlightUid: null,
      });
      // La ruta es propiedad del gameStore: entra a la vista PvP (PvpGame)
      import("@/store/gameStore").then(({ useGameStore }) => {
        useGameStore.getState().setView("pvp");
      });
      applyView(buildClientView(state, "a"));
      scheduleBotIfNeeded();
    },

    startRush: ({ playerClass, playerName }) => {
      const cycle = useCampaignStore.getState().prestige;
      const firstCycle = !useStatsStore.getState().rushCyclesDone.includes(cycle);
      set({
        gameClass: playerClass,
        playerName: playerName ?? get().playerName,
        rushActive: true,
        rushCycle: cycle,
        rushFirstCycle: firstCycle,
        rushBeaten: 0,
      });
      startRushFight(0);
    },

    advanceRush: () => {
      const st = get();
      if (!st.rushActive) return;
      startRushFight(st.rushIndex + 1);
    },

    createRoom: async () => {
      const { playerName, gameClass } = get();
      set({ busy: true, error: null });
      // La COLECCIÓN viaja al servidor: copias raras/épicas ganadas jugando
      // también valen en PvP (farming con sentido). El servidor la reconstruye
      // canónica con sanitizeClientDeck (solo id+tier, nunca poder crudo).
      const battleDeck = useCollectionStore.getState().battleDeckFor(gameClass);
      const payload = {
        name: playerName || "Anfitrión",
        gameClass,
        deck: battleDeck,
        deckIds: myDeckIds(gameClass),
      };

      // ── APK nativa: servidor PvP DENTRO de la app (PvP offline por hotspot) ──
      if (Capacitor.isNativePlatform()) {
        onlineEndNoted = false;
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
      onlineEndNoted = false;
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
      onlineEndNoted = false;
      const battleDeck = useCollectionStore.getState().battleDeckFor(gameClass);
      const payload = {
        name: playerName || "Reto",
        gameClass,
        deck: battleDeck,
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
        useMissionStore.getState().progress("play-cards");
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
      // RUSH: victoria intermedia → SIGUIENTE JEFE (sin pausa). Run completa
      // o derrota → NUEVA RUN completa con la misma clase.
      if (st.mode === "historia" && st.rushActive && st.localState) {
        cancelBotTimer();
        const f = st.localState.finalResultA;
        const wonRush = f ? f.playerWins > f.enemyWins : false;
        if (wonRush && st.rushIndex < RUSH_BOSSES - 1) {
          get().advanceRush();
        } else {
          get().startRush({ playerClass: st.gameClass, playerName: st.localState.players.a.name });
        }
        return;
      }
      // Historia — LA CAMPAÑA: la revancha es el ESCALÓN ACTUAL de la escalera.
      // Tras una victoria el campaignStore ya avanzó → esto encadena el
      // siguiente escalón; tras una derrota repite el mismo (sin retroceder).
      if (st.mode === "historia" && st.localState) {
        cancelBotTimer();
        const playerName = st.localState.players.a.name;
        const step = useCampaignStore.getState().step;
        get().startHistoria({ playerClass: st.gameClass, playerName: playerName || undefined, step });
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

    resync: () => {
      // Poll inmediato; si el intervalo había muerto, lo re-arranca.
      void pollOnce();
      if (!pollTimer && (get().code || get().mode === "historia")) get().startPolling();
    },
  };
});
