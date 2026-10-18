// Auditoría del patrón de diseño de cartas:
//   · cada spec = 2 Ataque + 1 Ítem + 1 Acción
//   · id = slug del nombre
//   · existe public/cards/{id}.png
import { ALL_CARDS_V3 } from "../src/lib/game/cards";
import type { Subtype } from "../src/lib/game/types";
import { existsSync } from "node:fs";
import { join } from "node:path";

const slug = (n: string) =>
  n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

const bySpec = new Map<Subtype, { Ataque: number; "Ítem": number; "Acción": number }>();
const problems: string[] = [];

for (const c of ALL_CARDS_V3) {
  const spec = c.subtypes[0];
  const bucket = bySpec.get(spec) ?? { Ataque: 0, "Ítem": 0, "Acción": 0 };
  bucket[c.category] += 1;
  bySpec.set(spec, bucket);

  if (slug(c.name) !== c.id) problems.push(`ID no es slug del nombre: ${c.id} (esperado ${slug(c.name)})`);
  const art = join(process.cwd(), "public/cards", `${c.id}.png`);
  if (!existsSync(art)) problems.push(`FALTA ARTE: ${c.id} → ${art}`);
}

for (const [spec, b] of [...bySpec.entries()].sort()) {
  const ok = b.Ataque === 2 && b["Ítem"] === 1 && b["Acción"] === 1;
  console.log(`${ok ? "OK " : "BAD"} ${spec.padEnd(11)} Ataque=${b.Ataque} Ítem=${b["Ítem"]} Acción=${b["Acción"]}`);
}

console.log(`\nTotal cartas: ${ALL_CARDS_V3.length}`);
console.log(problems.length ? problems.join("\n") : "Sin problemas de slug/arte.");
