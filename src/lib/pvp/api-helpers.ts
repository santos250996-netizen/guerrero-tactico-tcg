// Helpers compartidos por las rutas /api/pvp/* — autenticación por token +
// validación de entrada. Token → lado (a/b) vía el registro de salas.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getRoomEnvelope, sideForToken, type RoomEnvelope } from "@/lib/pvp/rooms";
import type { PvpSide } from "@/lib/game/pvp";

export const pvpInputSchema = z.object({
  name: z.string().trim().min(1).max(16).catch("Jugador"),
  gameClass: z.enum(["guerrero", "mago", "asesino"]),
  deckIds: z.array(z.string()).max(12).optional(),
  // Colección materializada del cliente (id + tier). El servidor la
  // reconstruye canónica con sanitizeClientDeck (el poder nunca viaja).
  deck: z
    .array(
      z.union([
        z.string(),
        z.object({
          id: z.string().min(1),
          rarity: z.enum(["common", "rare", "epic", "legendary", "mythic"]).optional(),
        }),
      ])
    )
    .max(12)
    .optional(),
});

export type AuthOk = { env: RoomEnvelope; side: PvpSide };

/** Autentica por código de sala + token (header x-pvp-token o query ?token=). */
export async function authenticate(
  req: Request,
  code: string
): Promise<AuthOk | { err: NextResponse }> {
  const url = new URL(req.url);
  const token = req.headers.get("x-pvp-token") ?? url.searchParams.get("token");
  const env = await getRoomEnvelope(code.toUpperCase());
  if (!env) {
    return { err: NextResponse.json({ error: "Sala no encontrada." }, { status: 404 }) };
  }
  const side = sideForToken(env, token);
  if (!side) {
    return { err: NextResponse.json({ error: "No perteneces a esta sala." }, { status: 403 }) };
  }
  return { env, side };
}

export function readBody<T>(req: Request): Promise<T | null> {
  return req.json().catch(() => null);
}
