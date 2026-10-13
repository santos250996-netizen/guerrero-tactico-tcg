import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { BASIC_CARDS, TACTICAL_CARDS, WARRIOR_DECK } from "@/lib/game/cards";
import type { CardDef } from "@/lib/game/types";

export async function GET() {
  try {
    const customRows = await db.customCard.findMany({ orderBy: { createdAt: "asc" } });
    const customCards: CardDef[] = customRows.map((c) => ({
      id: c.defId, name: c.name, category: c.category as CardDef["category"],
      subtypes: c.subtypes.split(",") as CardDef["subtypes"],
      cost: c.cost, power: c.power, text: c.text,
      effectId: c.effectId as CardDef["effectId"], rarity: "common" as CardDef["rarity"],
    }));
    return NextResponse.json({
      cards: [...BASIC_CARDS, ...WARRIOR_DECK, ...TACTICAL_CARDS, ...customCards],
    });
  } catch (e) {
    console.error("GET /api/cards error:", e);
    return NextResponse.json({ error: "No se pudo listar el pool de cartas." }, { status: 500 });
  }
}
