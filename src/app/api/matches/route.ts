import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

// Matches API — persists battle results (Match model) and serves the history
// used by HistoryModal. GameOverModal POSTs here when a match ends.
// Dynamic (force-dynamic) so every save/load hits the DB. For the Capacitor
// static build (bun run build:static) this route is skipped — the client
// handles fetch failures gracefully (GameOverModal shows save error state).

export const dynamic = "force-dynamic";

const laneScore = z.number().int().min(0);

const matchInputSchema = z.object({
  result: z.enum(["WIN", "LOSS", "DRAW"]),
  playerWins: z.number().int().min(0).max(3),
  enemyWins: z.number().int().min(0).max(3),
  draws: z.number().int().min(0).max(3),
  turnsPlayed: z.number().int().min(0).max(50),
  scorePlayer: z.number().int().min(0),
  scoreEnemy: z.number().int().min(0),
  laneArmasP: laneScore,
  laneArmasE: laneScore,
  laneProtP: laneScore,
  laneProtE: laneScore,
  laneFuriaP: laneScore,
  laneFuriaE: laneScore,
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = matchInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Payload inválido",
          details: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }
    const match = await db.match.create({ data: parsed.data });
    return NextResponse.json({ match }, { status: 201 });
  } catch (err) {
    console.error("POST /api/matches error:", err);
    return NextResponse.json(
      { error: "No se pudo guardar la partida" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const matches = await db.match.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ matches });
  } catch (err) {
    console.error("GET /api/matches error:", err);
    return NextResponse.json(
      { error: "No se pudo cargar el historial" },
      { status: 500 }
    );
  }
}
