// Generate the 12 BASIC card images using z-ai-web-dev-sdk.
// Same WoW TCG art style as the previous cards, but simpler "vanilla" subjects:
// soldiers, guards, apprentices — no magical effects, just warriors with weapons.
// Run: bun /home/z/my-project/scripts/generate-basic-art.ts

import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";
import path from "path";

const OUTPUT_DIR = "/home/z/my-project/public/cards";
const SIZE = "864x1152"; // portrait TCG aspect

interface CardArt {
  id: string;
  name: string;
  prompt: string;
}

const CARDS: CardArt[] = [
  {
    id: "recluta",
    name: "Recluta",
    prompt:
      "World of Warcraft style TCG card art of a young human recruit holding a basic iron sword, simple leather armor, determined but inexperienced expression, plain battlefield background, no magical effects.",
  },
  {
    id: "aprendiz",
    name: "Aprendiz",
    prompt:
      "Fantasy TCG card art of a young magic apprentice in simple robes holding a wooden staff, basic arcane spark at the tip, humble expression, modest study room background, no advanced magical effects.",
  },
  {
    id: "sanador",
    name: "Sanador",
    prompt:
      "Detailed TCG item card illustration of a basic first-aid herbal kit with rolled bandages, healing salve jar, and cloth wraps on a wooden table, simple and practical, no magical glow.",
  },
  {
    id: "soldado",
    name: "Soldado",
    prompt:
      "World of Warcraft style TCG card art of a standard infantry soldier with spear and round shield, medium armor, disciplined stance, battlefield camp background, no magical effects.",
  },
  {
    id: "guardia",
    name: "Guardia",
    prompt:
      "Fantasy TCG card art of a city guard in heavy plate armor holding a halberd, stern watchful expression, stone wall background with torches, no magical effects, professional soldier look.",
  },
  {
    id: "veterano",
    name: "Veterano",
    prompt:
      "Epic fantasy TCG card art of a battle-scarred veteran warrior with graying beard, holding a notched greatsword, weathered armor with dents and scratches, calm confident expression, dark battlefield background, no magical effects.",
  },
  {
    id: "mago_joven",
    name: "Mago Joven",
    prompt:
      "Fantasy TCG card art of a young talented mage in flowing blue robes holding an ornate wooden staff, bright intelligent eyes, modest arcane glow around the staff, library background, no advanced spellcasting effects.",
  },
  {
    id: "caballero",
    name: "Caballero",
    prompt:
      "Epic fantasy TCG card art of a noble knight in full plate armor holding a longsword with both hands, flowing cape, heroic stance, castle courtyard background, no magical effects, pure warrior presence.",
  },
  {
    id: "paladin",
    name: "Paladín",
    prompt:
      "World of Warcraft style TCG card art of a holy paladin in shining plate armor holding a warhammer, determined expression with subtle faith, cathedral background, no visible magical auras, sacred warrior look.",
  },
  {
    id: "muro_hierro",
    name: "Muro de Hierro",
    prompt:
      "Fantasy TCG card art of a massive mobile iron barricade with thick steel plates and rivets, defensive fortification on wheels, battlefield background, no magical effects, pure mechanical defense.",
  },
  {
    id: "campeon",
    name: "Campeón",
    prompt:
      "Masterpiece fantasy TCG card art of a battle champion in ornate golden armor wielding a massive two-handed greatsword, triumphant stance, arena background with cheering crowd, no magical effects, pure martial prowess.",
  },
  {
    id: "hechicero",
    name: "Hechicero",
    prompt:
      "Epic fantasy TCG card art of a battle sorcerer in flowing dark robes holding a glowing crystal staff, focused intense expression, raw arcane energy without specific spell effects, stormy battlefield background.",
  },
];

async function generateOne(zai: any, card: CardArt): Promise<void> {
  const outPath = path.join(OUTPUT_DIR, `${card.id}.png`);
  if (fs.existsSync(outPath)) {
    console.log(`✓ ${card.name} — ya existe, saltando`);
    return;
  }
  console.log(`→ Generando ${card.name} ...`);
  const response = await zai.images.generations.create({
    prompt: card.prompt,
    size: SIZE,
  });
  const base64 = response.data[0].base64;
  const buffer = Buffer.from(base64, "base64");
  fs.writeFileSync(outPath, buffer);
  console.log(`✓ ${card.name} — ${(buffer.length / 1024).toFixed(1)} KB`);
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  const zai = await ZAI.create();
  let ok = 0;
  let err = 0;
  for (const card of CARDS) {
    try {
      await generateOne(zai, card);
      ok++;
    } catch (e) {
      console.error(`✗ ${card.name}:`, (e as Error).message);
      err++;
    }
  }
  console.log(`=== Generación completada: ${ok} OK, ${err} errores ===`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
