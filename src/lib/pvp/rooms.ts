// ============================================================================
// Registro de salas PvP — memoria (globalThis, sobrevive a HMR de Next dev)
// + persistencia en SQLite (modelo PvpRoom) para sobrevivir reinicios.
// Cada sala envuelve el estado puro del juego (src/lib/game/pvp.ts) con los
// tokens secretos de cada jugador (transporte/autenticación, no lógica).
// ============================================================================

import { db } from "@/lib/db";
import {
  buildClientView,
  createPvpState,
  joinPvpState,
  sanitizeClientDeck,
  type PvpClientView,
  type PvpPlayerInput,
  type PvpSide,
  type PvpState,
} from "@/lib/game/pvp";
import type { GameClass } from "@/lib/game/types";

const ROOM_TTL_MS = 12 * 60 * 60 * 1000; // 12 h
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export interface RoomEnvelope {
  state: PvpState;
  tokens: { a: string | null; b: string | null };
}

// --- singleton global (HMR-safe) -------------------------------------------
interface PvpRoomCache {
  rooms: Map<string, RoomEnvelope>;
}

const g = globalThis as unknown as { __pvpRooms?: PvpRoomCache };
function cache(): PvpRoomCache {
  if (!g.__pvpRooms) g.__pvpRooms = { rooms: new Map() };
  return g.__pvpRooms;
}

// --- persistencia -----------------------------------------------------------

function serialize(env: RoomEnvelope): string {
  return JSON.stringify({ state: env.state, tokens: env.tokens });
}

function deserialize(json: string): RoomEnvelope | null {
  try {
    const parsed = JSON.parse(json);
    if (!parsed?.state || !parsed?.tokens) return null;
    return parsed as RoomEnvelope;
  } catch {
    return null;
  }
}

async function persistRoom(env: RoomEnvelope): Promise<void> {
  try {
    await db.pvpRoom.upsert({
      where: { code: env.state.code },
      create: { code: env.state.code, stateJson: serialize(env) },
      update: { stateJson: serialize(env) },
    });
  } catch (err) {
    console.error(`[pvp] persistRoom(${env.state.code}) falló:`, err);
  }
}

/** Archiva el resultado una única vez cuando la partida termina. */
async function archiveMatchIfEnded(env: RoomEnvelope): Promise<void> {
  const s = env.state;
  if (s.phase !== "ended" || s.endedSaved || !s.finalResultA) return;
  s.endedSaved = true;
  try {
    await db.pvpMatch.create({
      data: {
        code: s.code,
        nameA: s.players.a.name || "Jugador A",
        nameB: s.players.b.name || "Jugador B",
        classA: s.players.a.gameClass,
        classB: s.players.b.gameClass,
        winsA: s.finalResultA.playerWins,
        winsB: s.finalResultA.enemyWins,
        draws: s.finalResultA.draws,
        scoreA: s.finalResultA.totalPlayer,
        scoreB: s.finalResultA.totalEnemy,
        turnsPlayed: s.turn,
        winnerSide:
          s.finalResultA.result === "WIN" ? "a" : s.finalResultA.result === "LOSS" ? "b" : "draw",
      },
    });
  } catch (err) {
    s.endedSaved = false;
    console.error("[pvp] archiveMatch falló:", err);
  }
}

// --- API pública del registro ----------------------------------------------

function genCode(): string {
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

async function codeAvailable(code: string): Promise<boolean> {
  if (cache().rooms.has(code)) return false;
  try {
    const row = await db.pvpRoom.findUnique({ where: { code } });
    return !row;
  } catch {
    return true; // si la BD falla, igual dejamos crear la sala en memoria
  }
}

/**
 * Entrada cruda del cliente (tras zod): `deck` es la colección materializada
 * (id + tier) ANTES de validar. Se reconstruye canónica en el servidor.
 */
export type RoomPlayerInput = {
  name: string;
  gameClass: GameClass;
  deckIds?: string[];
  deck?: unknown;
};

/** Valida el mazo del cliente; si es inválido, cae al mazo por defecto (logs). */
function resolveInputDeck(input: RoomPlayerInput): PvpPlayerInput {
  const { deck: rawDeck, ...rest } = input;
  if (rawDeck === undefined) return rest as PvpPlayerInput;
  const deck = sanitizeClientDeck(rawDeck, input.gameClass);
  if (!deck) {
    console.warn("[pvp] mazo del cliente inválido — se usa el mazo por defecto de la clase");
    return rest as PvpPlayerInput;
  }
  return { ...rest, deck } as PvpPlayerInput;
}

export async function createRoom(
  input: RoomPlayerInput
): Promise<{ code: string; token: string; side: PvpSide; view: PvpClientView }> {
  // Purga en segundo plano: salas caducadas (TTL) no deben acumularse en
  // memoria ni en BD. Fire-and-forget — nunca bloquea la creación.
  void purgeExpiredRooms().catch(() => undefined);

  let code = genCode();
  for (let i = 0; i < 20 && !(await codeAvailable(code)); i++) code = genCode();

  const state = createPvpState(code, resolveInputDeck(input));
  const env: RoomEnvelope = { state, tokens: { a: crypto.randomUUID(), b: null } };
  cache().rooms.set(code, env);
  await persistRoom(env);
  return {
    code,
    token: env.tokens.a!,
    side: "a",
    view: buildClientView(state, "a"),
  };
}

export async function joinRoom(
  code: string,
  input: RoomPlayerInput
): Promise<{ token: string; side: PvpSide; view: PvpClientView }> {
  const env = await getRoomEnvelope(code);
  if (!env) throw new Error("Sala no encontrada. Revisa el código.");
  if (env.state.players.b.name) throw new Error("La sala está llena.");

  joinPvpState(env.state, resolveInputDeck(input));
  env.tokens.b = crypto.randomUUID();
  await persistRoom(env);
  return { token: env.tokens.b!, side: "b", view: buildClientView(env.state, "b") };
}

export async function getRoomEnvelope(code: string): Promise<RoomEnvelope | null> {
  const c = cache();
  const mem = c.rooms.get(code);
  if (mem) return mem;
  // memoria falló → intenta recuperar de BD (reinicio del servidor)
  try {
    const row = await db.pvpRoom.findUnique({ where: { code } });
    if (!row) return null;
    const env = deserialize(row.stateJson);
    if (!env) return null;
    if (Date.now() - env.state.createdAt > ROOM_TTL_MS) return null;
    c.rooms.set(code, env);
    return env;
  } catch (err) {
    console.error(`[pvp] getRoomEnvelope(${code}) falló:`, err);
    return null;
  }
}

export function sideForToken(env: RoomEnvelope, token: string | null): PvpSide | null {
  if (!token) return null;
  if (env.tokens.a === token) return "a";
  if (env.tokens.b === token) return "b";
  return null;
}

/** Guarda el estado tras una mutación (acción / revancha / unión). */
export async function saveRoom(env: RoomEnvelope): Promise<void> {
  await persistRoom(env);
  await archiveMatchIfEnded(env);
}

/**
 * Elimina salas caducadas (más antiguas que ROOM_TTL_MS) de la memoria y de
 * la BD. Llamada en fire-and-forget desde createRoom para que las salas
 * abandonadas no se acumulen para siempre.
 */
export async function purgeExpiredRooms(): Promise<number> {
  const c = cache();
  const now = Date.now();
  let purged = 0;
  for (const [code, env] of c.rooms) {
    if (now - env.state.createdAt > ROOM_TTL_MS) {
      c.rooms.delete(code);
      purged++;
    }
  }
  try {
    const res = await db.pvpRoom.deleteMany({
      where: { createdAt: { lt: new Date(now - ROOM_TTL_MS) } },
    });
    purged += res.count;
  } catch {
    // BD opcional (modo memoria pura)
  }
  if (purged > 0) console.log(`[pvp] purgeExpiredRooms: ${purged} salas eliminadas`);
  return purged;
}
