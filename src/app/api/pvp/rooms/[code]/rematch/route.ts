import { NextResponse } from "next/server";
import { buildClientView, requestRematch } from "@/lib/game/pvp";
import { saveRoom } from "@/lib/pvp/rooms";
import { authenticate } from "@/lib/pvp/api-helpers";

export const dynamic = "force-dynamic";

/** POST /api/pvp/rooms/[code]/rematch — pide revancha; cuando ambos piden, re-inicia. */
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const auth = await authenticate(req, code);
  if ("err" in auth) return auth.err;

  requestRematch(auth.env.state, auth.side);
  await saveRoom(auth.env);
  const view = buildClientView(auth.env.state, auth.side);
  return NextResponse.json({ view });
}
