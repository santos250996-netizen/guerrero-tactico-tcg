import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { BASIC_CARDS, TACTICAL_CARDS, WARRIOR_DECK } from "@/lib/game/cards";

const DEFAULT_DECK_IDS = WARRIOR_DECK.map((c) => c.id);
const DECK_SIZE = 12;

export async function GET() {
  try {
    let decks = await db.deck.findMany({ where: { isCurrent: true } });
    if (decks.length === 0) {
      decks = [await db.deck.create({ data: { name: "Mazo Guerrero", cardIds: DEFAULT_DECK_IDS.join(","), isCurrent: true } })];
    }
    const deck = decks[0];
    const ids = deck.cardIds.split(",").map((s) => s.trim()).filter(Boolean);
    return NextResponse.json({ deck: { id: deck.id, name: deck.name, cardIds: ids.length === DECK_SIZE ? ids : DEFAULT_DECK_IDS, isCurrent: deck.isCurrent } });
  } catch (e) {
    console.error("GET /api/deck error:", e);
    return NextResponse.json({ error: "No se pudo cargar el mazo." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cardIds: unknown = body?.cardIds;
    if (!Array.isArray(cardIds) || cardIds.length !== DECK_SIZE)
      return NextResponse.json({ error: `El mazo debe tener ${DECK_SIZE} cartas.` }, { status: 400 });
    if (new Set(cardIds).size !== cardIds.length)
      return NextResponse.json({ error: "Sin duplicados." }, { status: 400 });
    const baseIds = new Set([...BASIC_CARDS, ...WARRIOR_DECK, ...TACTICAL_CARDS].map((c) => c.id));
    const customIds = (await db.customCard.findMany({ select: { defId: true } })).map((c) => c.defId);
    const customIdSet = new Set(customIds);
    for (const id of cardIds) {
      if (typeof id !== "string") return NextResponse.json({ error: "cardId debe ser string." }, { status: 400 });
      if (!baseIds.has(id) && !customIdSet.has(id)) return NextResponse.json({ error: `cardId desconocido: ${id}` }, { status: 400 });
    }
    let decks = await db.deck.findMany({ where: { isCurrent: true } });
    let deck;
    if (decks.length > 0) {
      deck = await db.deck.update({ where: { id: decks[0].id }, data: { cardIds: (cardIds as string[]).join(","), name: body?.name ?? decks[0].name } });
    } else {
      deck = await db.deck.create({ data: { name: body?.name ?? "Mazo Guerrero", cardIds: (cardIds as string[]).join(","), isCurrent: true } });
    }
    return NextResponse.json({ deck: { id: deck.id, name: deck.name, cardIds, isCurrent: deck.isCurrent } });
  } catch (e) {
    console.error("POST /api/deck error:", e);
    return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    let decks = await db.deck.findMany({ where: { isCurrent: true } });
    if (decks.length > 0) {
      await db.deck.update({ where: { id: decks[0].id }, data: { cardIds: DEFAULT_DECK_IDS.join(",") } });
    } else {
      await db.deck.create({ data: { name: "Mazo Guerrero", cardIds: DEFAULT_DECK_IDS.join(","), isCurrent: true } });
    }
    return NextResponse.json({ deck: { cardIds: DEFAULT_DECK_IDS } });
  } catch (e) {
    return NextResponse.json({ error: "No se pudo resetear." }, { status: 500 });
  }
}
