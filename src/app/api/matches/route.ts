import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/matches — list match history (most recent first)
export async function GET() {
  try {
    const matches = await db.match.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ matches });
  } catch (e) {
    console.error("GET /api/matches error:", e);
    return NextResponse.json(
      { error: "No se pudo listar el historial de partidas." },
      { status: 500 }
    );
  }
}

// POST /api/matches — save a finished match
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      result,
      playerWins,
      enemyWins,
      draws,
      turnsPlayed,
      scorePlayer,
      scoreEnemy,
      laneArmasP,
      laneArmasE,
      laneProtP,
      laneProtE,
      laneFuriaP,
      laneFuriaE,
    } = body ?? {};

    if (!["WIN", "LOSS", "DRAW"].includes(result)) {
      return NextResponse.json(
        { error: "Campo 'result' inválido (esperado WIN | LOSS | DRAW)." },
        { status: 400 }
      );
    }
    if (
      typeof playerWins !== "number" ||
      typeof enemyWins !== "number" ||
      typeof draws !== "number" ||
      typeof turnsPlayed !== "number" ||
      typeof scorePlayer !== "number" ||
      typeof scoreEnemy !== "number" ||
      typeof laneArmasP !== "number" ||
      typeof laneArmasE !== "number" ||
      typeof laneProtP !== "number" ||
      typeof laneProtE !== "number" ||
      typeof laneFuriaP !== "number" ||
      typeof laneFuriaE !== "number"
    ) {
      return NextResponse.json(
        { error: "Faltan campos numéricos obligatorios." },
        { status: 400 }
      );
    }

    const match = await db.match.create({
      data: {
        result,
        playerWins,
        enemyWins,
        draws,
        turnsPlayed,
        scorePlayer,
        scoreEnemy,
        laneArmasP,
        laneArmasE,
        laneProtP,
        laneProtE,
        laneFuriaP,
        laneFuriaE,
      },
    });

    return NextResponse.json({ match }, { status: 201 });
  } catch (e) {
    console.error("POST /api/matches error:", e);
    return NextResponse.json(
      { error: "No se pudo guardar la partida." },
      { status: 500 }
    );
  }
}
