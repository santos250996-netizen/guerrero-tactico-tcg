import * as C from "../src/lib/game/cards";
import { readdirSync } from "fs";
const mod = C as unknown as Record<string, unknown>;
// Reunir TODOS los exports de arrays de cartas Tinker
const arrays = Object.entries(mod).filter(([k]) => k.startsWith("TINKER"));
const seen = new Map<string, string>();
for (const [, v] of arrays) {
  if (Array.isArray(v)) for (const c of v as { id: string; name: string }[]) seen.set(c.id, c.name);
}
const files = new Set(readdirSync("public/cards"));
const missing: string[] = [];
for (const [id] of seen) if (!files.has(id + ".webp") && !files.has(id + ".png")) missing.push(id);
console.log("Arrays:", arrays.map(([k]) => k).join(", "));
console.log("Total únicos:", seen.size, "| artes presentes:", seen.size - missing.length, "| FALTAN:", missing.length);
console.log(missing.join("\n"));
