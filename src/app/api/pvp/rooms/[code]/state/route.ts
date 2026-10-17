import { NextResponse } from "next/server";
import { buildClientView, touchPresence } from "@/lib/game/pvp";
import { saveRoom } from "@/lib/pvp/rooms";
import { authenticate } from "@/lib/pvp/api-helpers";

export const dynamic = "force-dynamic";

/**
 * GET /api/pvp/rooms/[code]/state — polling del cliente (~1.2 s).
 * Devuelve la vista SANEADA del lado del token (la mano del rival nunca viaja).
 * También funciona de heartbeat: actualiza lastSeen para el indicador "conectado".
 */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const auth = await authenticate(req, code);
  if ("err" in auth) return auth.err;

  const now = Date.now();
  const prevConnected = auth.env.state.lastSeen[auth.side];
  touchPresence(auth.env.state, auth.side, now);
  // Persiste solo el PRIMER heartbeat tras un hueco largo (>30 s) — evita
  // escribir en SQLite cada 1.2 s solo por presencia.
  if (now - prevConnected > 30_000) await saveRoom(auth.env);

  const view = buildClientView(auth.env.state, auth.side, now);
  return NextResponse.json({ view });
}
