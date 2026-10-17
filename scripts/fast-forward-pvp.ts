// Fast-forward: pasa turnos vía API hasta el fin de la partida y juega cartas
// baratas al azar para dejar un tablero con contenido.
import { db } from "../src/lib/db";

const CODE = process.argv[2] ?? "63AQ";

const row = await db.pvpRoom.findUnique({ where: { code: CODE } });
if (!row) {
  console.error("Sala no encontrada");
  process.exit(1);
}
const { tokens } = JSON.parse(row.stateJson);
console.log("Tokens:", Object.keys(tokens).join(","));

async function act(token: string, action: unknown) {
  const res = await fetch(`http://localhost:3000/api/pvp/rooms/${CODE}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-pvp-token": token },
    body: JSON.stringify({ token, action }),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

let guard = 0;
let plays = 0;
while (guard++ < 60) {
  const st = await (await fetch(`http://localhost:3000/api/pvp/rooms/${CODE}/state`, {
    headers: { "x-pvp-token": tokens.a },
  })).json();
  const view = st.view;
  if (!view || view.phase !== "playing") {
    console.log("Fase:", view?.phase, "— fin del bucle");
    console.log("Final:", JSON.stringify(view?.finalResult?.result), `${view?.finalResult?.playerWins}-${view?.finalResult?.enemyWins}`);
    break;
  }
  const side = view.activeSide;
  const token = tokens[side];
  const you = view.you;
  // juega hasta 2 cartas baratas si es tu turno
  if (plays < 8) {
    const card = you.hand.find((c: { cost: number }) => c.cost <= you.energy);
    if (card) {
      const r = await act(token, { type: "play", uid: card.uid, lane: you.lanes[0] });
      if (r.status === 200) { plays++; continue; }
      if (r.status === 409) {
        // carril lleno o coste restringido → prueba otro carril
        const r2 = await act(token, { type: "play", uid: card.uid, lane: you.lanes[1] });
        if (r2.status === 200) { plays++; continue; }
      }
    }
  }
  const r = await act(token, { type: "pass" });
  if (r.status !== 200) {
    console.log("pase falló:", r.status, JSON.stringify(r.data));
    break;
  }
}
console.log(`acciones: ${guard}, jugadas: ${plays}`);
process.exit(0);
