// Validate that cards respect exclusiveSubtype restrictions on keywords.
import { ALL_CARDS } from "../src/lib/game/cards";
import { KEYWORD_META } from "../src/lib/game/types";

let violations = 0;
console.log("\n=== VALIDACIÓN DE KEYWORDS EXCLUSIVAS POR SUBTIPO ===\n");

const restrictions: Record<string, string> = {
  cupula: "proteccion",
  espinas: "proteccion",
  guardian: "proteccion",
  perforacion: "armas",
  desarme: "armas",
  mejora: "armas",
  sangrado: "furia",
  frenesi: "furia",
  enrabia: "furia",
};

for (const card of ALL_CARDS) {
  if (!card.keyword || card.keyword === "none") continue;
  const requiredSubtype = restrictions[card.keyword];
  if (!requiredSubtype) continue;

  if (!card.subtypes.includes(requiredSubtype as any)) {
    violations++;
    console.log(`✗ ${card.name} tiene keyword="${card.keyword}" (exclusiva de "${requiredSubtype}") pero sus subtypes son [${card.subtypes.join(", ")}]`);
  }
}

if (violations === 0) {
  console.log("✓ Todas las cartas respetan las restricciones de subtipo exclusivo.");
} else {
  console.log(`\n✗ ${violations} violaciones encontradas.`);
}
console.log(`\nTotal: ${ALL_CARDS.length} cartas validadas.`);
