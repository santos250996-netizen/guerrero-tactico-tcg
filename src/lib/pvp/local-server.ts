// ============================================================================
// local-server — PvP offline por hotspot (APK Capacitor, sin internet)
//
// El ANFITRIÓN monta un servidor HTTP DENTRO de la APK con el plugin nativo
// @cantoo/capacitor-http-server (foreground service: sobrevive al bloqueo de
// pantalla). Sirve el MISMO API /api/pvp/* que el backend Next, pero con el
// registro de salas EN MEMORIA (la APK es export estático: no hay SQLite ni
// Prisma). El invitado conecta a http://<ip-del-anfitrión>:8787 desde el suyo
// (uno crea el hotspot, el otro se une por WiFi — sin internet en ninguno).
//
// El propio anfitrión NO pasa por la red: pvpStore llama a handleLocalPvpApi()
// directamente (transporte "in-process"), así una partida funciona incluso si
// el stack de red del webview se pone quisquilloso.
//
// Semántica replicada 1:1 de las rutas Next (mismos códigos de estado y
// mensajes de error) para que el cliente no distinga el backend.
// ============================================================================

import {
  applyPvpAction,
  buildClientView,
  createPvpState,
  joinPvpState,
  requestRematch,
  sanitizeClientDeck,
  touchPresence,
  type PvpAction,
  type PvpClientView,
  type PvpPlayerInput,
  type PvpSide,
  type PvpState,
} from "@/lib/game/pvp";

export const LOCAL_PVP_PORT = 8787;
const ROOM_TTL_MS = 12 * 60 * 60 * 1000;

// --- registro de salas en memoria (singleton de módulo) ----------------------

interface MemRoom {
  state: PvpState;
  tokens: { a: string | null; b: string | null };
}

const rooms = new Map<string, MemRoom>();

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function uuid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
}

function genCode(): string {
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

/** Limpia salas caducadas (>12 h) — higiene al crear, el registro es memoria. */
function pruneExpired(): void {
  const now = Date.now();
  for (const [code, env] of rooms) {
    if (now - env.state.createdAt > ROOM_TTL_MS) rooms.delete(code);
  }
}

function getRoom(code: string): MemRoom | null {
  return rooms.get(code.toUpperCase()) ?? null;
}

function sideForToken(env: MemRoom, token: string | null): PvpSide | null {
  if (!token) return null;
  if (env.tokens.a === token) return "a";
  if (env.tokens.b === token) return "b";
  return null;
}

/** Valida la entrada como pvpInputSchema (name catch→"Jugador", clase enum)
 *  + mazo de la colección del cliente reconstruido canónico (sanitizeClientDeck). */
function parseInput(body: unknown): PvpPlayerInput | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  const rawName = typeof b.name === "string" ? b.name.trim() : "";
  const name = (rawName.length >= 1 && rawName.length <= 16 ? rawName : "Jugador").slice(0, 16);
  if (b.gameClass !== "guerrero" && b.gameClass !== "mago" && b.gameClass !== "asesino") return null;
  let deckIds: string[] | undefined;
  if (Array.isArray(b.deckIds)) {
    if (b.deckIds.length > 12 || b.deckIds.some((d) => typeof d !== "string")) return null;
    deckIds = b.deckIds as string[];
  }
  // Colección del jugador (copias raras/épicas por fusión): se reconstruye
  // desde el catálogo base — si es inválida, el buildPlayer cae al mazo espejo.
  const deck = b.deck !== undefined ? (sanitizeClientDeck(b.deck, b.gameClass) ?? undefined) : undefined;
  return { name, gameClass: b.gameClass, deckIds, deck };
}

// --- router (misma semántica que las rutas Next) -----------------------------

export interface LocalApiResult {
  status: number;
  body: unknown;
}

type CreateJoinOk = { code: string; token: string; side: PvpSide; view: PvpClientView };
type JoinOk = { token: string; side: PvpSide; view: PvpClientView };

/**
 * Punto de entrada único del API PvP local. `method`/`path`/`query`/`body`
 * replican lo que llegaría por HTTP. No lanza: devuelve status + body JSON.
 */
export function handleLocalPvpApi(
  method: string,
  rawPath: string,
  query: Record<string, string> = {},
  body: unknown = undefined
): LocalApiResult {
  const path = (rawPath || "/").replace(/\/+$/, "") || "/";
  const M = method.toUpperCase();

  try {
    // POST /api/pvp/rooms — crea sala (creador = lado A / anfitrión)
    if (M === "POST" && path === "/api/pvp/rooms") {
      const input = parseInput(body);
      if (!input) return { status: 400, body: { error: "Datos inválidos para crear la sala." } };
      pruneExpired();
      let code = genCode();
      for (let i = 0; i < 20 && rooms.has(code); i++) code = genCode();
      const state = createPvpState(code, input);
      const env: MemRoom = { state, tokens: { a: uuid(), b: null } };
      rooms.set(code, env);
      return {
        status: 201,
        body: { code, token: env.tokens.a!, side: "a", view: buildClientView(state, "a") } satisfies CreateJoinOk,
      };
    }

    // GET /api/pvp/lan-info — IPs/puerto del servidor local (probe del invitado)
    if (M === "GET" && path === "/api/pvp/lan-info") {
      const info = localServerInfo();
      return { status: 200, body: { ips: info?.ips ?? [], port: info?.port ?? LOCAL_PVP_PORT } };
    }

    // GET /api/pvp/health — probe simple de conectividad
    if (M === "GET" && path === "/api/pvp/health") {
      return { status: 200, body: { ok: true } };
    }

    // /api/pvp/rooms/[code]/...
    const roomMatch = path.match(/^\/api\/pvp\/rooms\/([A-Z0-9]{1,8})(\/(join|state|action|rematch))?$/i);
    if (roomMatch) {
      const code = roomMatch[1].toUpperCase();
      const verb = roomMatch[3] ?? "";

      // POST /join — el invitado entra como lado B
      if (M === "POST" && verb === "join") {
        const input = parseInput(body);
        if (!input) return { status: 400, body: { error: "Datos inválidos para unirse." } };
        const env = getRoom(code);
        if (!env) return { status: 404, body: { error: "Sala no encontrada. Revisa el código." } };
        if (env.state.players.b.name) return { status: 409, body: { error: "La sala está llena." } };
        joinPvpState(env.state, input);
        env.tokens.b = uuid();
        return {
          status: 200,
          body: { token: env.tokens.b!, side: "b", view: buildClientView(env.state, "b") } satisfies JoinOk,
        };
      }

      // GET /state — polling + heartbeat
      if (M === "GET" && verb === "state") {
        const env = getRoom(code);
        const token = query.token ?? null;
        const side = env ? sideForToken(env, token) : null;
        if (!env || !side) {
          return env
            ? { status: 403, body: { error: "No perteneces a esta sala." } }
            : { status: 404, body: { error: "Sala no encontrada. Revisa el código." } };
        }
        touchPresence(env.state, side, Date.now());
        return { status: 200, body: { view: buildClientView(env.state, side, Date.now()) } };
      }

      // POST /action — jugar carta o pasar (servidor autoritativo)
      if (M === "POST" && verb === "action") {
        const env = getRoom(code);
        const b = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
        const token = (query.token ?? (typeof b.token === "string" ? b.token : null)) || null;
        const side = env ? sideForToken(env, token) : null;
        if (!env || !side) {
          return env
            ? { status: 403, body: { error: "No perteneces a esta sala." } }
            : { status: 404, body: { error: "Sala no encontrada. Revisa el código." } };
        }
        const action = b.action as PvpAction | undefined;
        if (!action || (action.type !== "play" && action.type !== "pass")) {
          return { status: 400, body: { error: "Acción inválida." } };
        }
        if (action.type === "play" && (typeof action.uid !== "string" || typeof action.lane !== "string")) {
          return { status: 400, body: { error: "Acción de juego inválida." } };
        }
        try {
          applyPvpAction(env.state, side, action);
        } catch (err) {
          return { status: 409, body: { error: (err as Error).message } };
        }
        return { status: 200, body: { view: buildClientView(env.state, side) } };
      }

      // POST /rematch — revancha cuando ambos piden
      if (M === "POST" && verb === "rematch") {
        const env = getRoom(code);
        const b = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
        const token = (query.token ?? (typeof b.token === "string" ? b.token : null)) || null;
        const side = env ? sideForToken(env, token) : null;
        if (!env || !side) {
          return env
            ? { status: 403, body: { error: "No perteneces a esta sala." } }
            : { status: 404, body: { error: "Sala no encontrada. Revisa el código." } };
        }
        requestRematch(env.state, side);
        return { status: 200, body: { view: buildClientView(env.state, side) } };
      }
    }

    return { status: 404, body: { error: "Ruta no encontrada." } };
  } catch (err) {
    console.error("[pvp-local] handleLocalPvpApi error:", err);
    return { status: 500, body: { error: "Error interno del servidor local." } };
  }
}

// --- transporte Capacitor (solo APK nativa) -----------------------------------

import { Capacitor } from "@capacitor/core";

export interface LocalServerInfo {
  port: number;
  ips: string[];
  urls: string[];
}

let running: LocalServerInfo | null = null;
let requestHandle: { remove: () => Promise<void> } | null = null;
let errorHandle: { remove: () => Promise<void> } | null = null;

export function localServerInfo(): LocalServerInfo | null {
  return running;
}

/** Arranca el servidor HTTP local (APK nativa). Idempotente. */
export async function startLocalPvpServer(): Promise<LocalServerInfo> {
  if (running) return running;
  if (!Capacitor.isNativePlatform()) {
    throw new Error("El servidor local solo está disponible en la app instalada.");
  }
  const { HttpServer } = await import("@cantoo/capacitor-http-server");

  // Quita listeners de una sesión anterior (start/stop repetidos)
  await requestHandle?.remove().catch(() => undefined);
  await errorHandle?.remove().catch(() => undefined);

  requestHandle = await HttpServer.addListener("request", async (req) => {
    // CORS: el invitado viene de otro origen (http://localhost en su webview)
    const cors = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type, x-pvp-token",
      "access-control-allow-methods": "GET, POST, OPTIONS",
    };
    try {
      if (req.method === "OPTIONS") {
        await HttpServer.respond({ requestId: req.requestId, status: 204, headers: cors });
        return;
      }
      let body: unknown;
      if (req.bodyText) {
        try {
          body = JSON.parse(req.bodyText);
        } catch {
          body = null;
        }
      }
      const res = handleLocalPvpApi(req.method, req.path, req.query ?? {}, body);
      await HttpServer.respond({
        requestId: req.requestId,
        status: res.status,
        headers: { "content-type": "application/json; charset=utf-8", ...cors },
        bodyText: JSON.stringify(res.body ?? {}),
      });
    } catch (err) {
      console.error("[pvp-local] request handling error:", err);
      await HttpServer.respond({
        requestId: req.requestId,
        status: 500,
        headers: { "content-type": "application/json; charset=utf-8", ...cors },
        bodyText: JSON.stringify({ error: "Error interno." }),
      }).catch(() => undefined);
    }
  });

  errorHandle = await HttpServer.addListener("server-error", ({ message, fatal }) => {
    console.warn("[pvp-local] server-error:", message, "fatal:", fatal);
    if (fatal) running = null;
  });

  const res = await HttpServer.start({
    port: LOCAL_PVP_PORT,
    android: {
      notificationTitle: "Pacto de Guerra",
      notificationText: "Servidor PvP activo — esperando al rival",
    },
  });
  running = {
    port: res.port,
    ips: res.addresses?.length ? res.addresses : res.localIp ? [res.localIp] : [],
    urls: res.urls ?? [],
  };
  console.log("[pvp-local] servidor activo:", running.ips.join(", "), "puerto", running.port);
  return running;
}

/** Detiene el servidor local y limpia listeners. Idempotente. */
export async function stopLocalPvpServer(): Promise<void> {
  if (!running && !requestHandle && !errorHandle) return;
  try {
    const { HttpServer } = await import("@cantoo/capacitor-http-server");
    await HttpServer.stop().catch(() => undefined);
  } catch {
    // plugin no disponible — nada que parar
  }
  await requestHandle?.remove().catch(() => undefined);
  await errorHandle?.remove().catch(() => undefined);
  requestHandle = null;
  errorHandle = null;
  running = null;
}
