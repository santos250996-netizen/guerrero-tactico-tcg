import { NextResponse } from "next/server";
import { joinRoom } from "@/lib/pvp/rooms";
import { pvpInputSchema, readBody } from "@/lib/pvp/api-helpers";

export const dynamic = "force-dynamic";

/** POST /api/pvp/rooms/[code]/join — el invitado entra como lado B. */
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = await readBody(req);
  const parsed = pvpInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos para unirse." }, { status: 400 });
  }
  try {
    const result = await joinRoom(code.toUpperCase(), parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const msg = (err as Error).message || "No se pudo unir a la sala.";
    const status = msg.includes("no encontrada") ? 404 : 409;
    return NextResponse.json({ error: msg }, { status });
  }
}
