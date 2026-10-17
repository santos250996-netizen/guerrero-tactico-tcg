import { NextResponse } from "next/server";
import { createRoom } from "@/lib/pvp/rooms";
import { pvpInputSchema, readBody } from "@/lib/pvp/api-helpers";

export const dynamic = "force-dynamic";

/** POST /api/pvp/rooms — crea una sala PvP (el creador es el lado A / anfitrión). */
export async function POST(req: Request) {
  const body = await readBody(req);
  const parsed = pvpInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos para crear la sala." }, { status: 400 });
  }
  try {
    const room = await createRoom(parsed.data);
    return NextResponse.json(room, { status: 201 });
  } catch (err) {
    console.error("POST /api/pvp/rooms error:", err);
    return NextResponse.json({ error: "No se pudo crear la sala." }, { status: 500 });
  }
}
