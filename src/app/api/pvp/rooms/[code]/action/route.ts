import { NextResponse } from "next/server";
import { applyPvpAction, buildClientView, type PvpAction } from "@/lib/game/pvp";
import { saveRoom } from "@/lib/pvp/rooms";
import { authenticate, readBody } from "@/lib/pvp/api-helpers";

export const dynamic = "force-dynamic";

interface ActionBody {
  token?: string;
  action?: PvpAction;
}

/** POST /api/pvp/rooms/[code]/action — jugar carta o pasar turno (servidor autoritativo). */
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const auth = await authenticate(req, code);
  if ("err" in auth) return auth.err;

  const body = await readBody<ActionBody>(req);
  const action = body?.action;
  if (!action || (action.type !== "play" && action.type !== "pass")) {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }
  if (action.type === "play" && (typeof action.uid !== "string" || typeof action.lane !== "string")) {
    return NextResponse.json({ error: "Acción de juego inválida." }, { status: 400 });
  }

  try {
    applyPvpAction(auth.env.state, auth.side, action);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 409 });
  }
  await saveRoom(auth.env);
  const view = buildClientView(auth.env.state, auth.side);
  return NextResponse.json({ view });
}
