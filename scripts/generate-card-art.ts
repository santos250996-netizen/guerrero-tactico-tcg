// Generate all 12 WoW TCG card images using z-ai-web-dev-sdk.
// Run: bun /home/z/my-project/scripts/generate-card-art.ts

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
    id: "golpe_heroico",
    name: "Golpe Heroico",
    prompt:
      "An epic fantasy TCG card art of a fierce Orc warrior delivering a powerful, glowing orange overhead strike with a giant battleaxe, dynamic motion blur, fiery sparks, dark epic background.",
  },
  {
    id: "seccionar",
    name: "Seccionar",
    prompt:
      "World of Warcraft style TCG card illustration of a nimble warrior slicing low with a sharp broadsword, swift silver blade trail, detailed armor, combat action scene.",
  },
  {
    id: "machaque_mortal",
    name: "Machaque Mortal",
    prompt:
      "High fantasy TCG card art depicting a brutal Tauren warrior crushing the ground with a massive two-handed weapon, dust and rock debris flying, epic cinematic lighting.",
  },
  {
    id: "ejecutar",
    name: "Ejecutar",
    prompt:
      "Epic TCG illustration of a battle-scarred warrior thrusting a glowing red-hot sword forward for a finishing blow, intense dark atmosphere, dramatic shadows.",
  },
  {
    id: "bloqueo_escudo",
    name: "Bloqueo Escudo",
    prompt:
      "World of Warcraft style TCG art showing a heavily armored warrior holding a massive steel tower shield that blocks incoming magical sparks, sturdy defense pose.",
  },
  {
    id: "muro_escudos",
    name: "Muro Escudos",
    prompt:
      "Fantasy card game artwork featuring a line of dwarven shields glowing with blue defensive magic runic barriers, impenetrable wall, epic composition.",
  },
  {
    id: "pocion_vida",
    name: "Poción de Vida",
    prompt:
      "Detailed TCG item card illustration of a glowing red health potion flask resting on a stone table inside a warrior's armory, magical healing smoke.",
  },
  {
    id: "provocar",
    name: "Provocar",
    prompt:
      "Intense TCG card art of an angry warrior shouting fiercely, beating his chest armor, surrounded by dark menacing battleground aura, taunting expression.",
  },
  {
    id: "ira_rabiosa",
    name: "Ira Rabiosa",
    prompt:
      "Fantasy TCG illustration of a warrior's eyes glowing with fierce crimson rage, veins pulsing with fiery red energy, berserker mood, dark background.",
  },
  {
    id: "grito_batalla",
    name: "Grito de Batalla",
    prompt:
      "World of Warcraft style card art showing a mighty war leader roaring on a cliff, visible magical soundwaves spreading outward, inspiring allies.",
  },
  {
    id: "filotormenta",
    name: "Filotormenta",
    prompt:
      "Dynamic TCG card illustration of a warrior spinning rapidly in a deadly whirlwind of steel and sharp blades, metallic sparks flying in a circle, epic action.",
  },
  {
    id: "avatar_titan",
    name: "Avatar del Titán",
    prompt:
      "Masterpiece legendary TCG card art of a warrior glowing with divine titan energy, surrounded by floating spectral weapons and golden light, awe-inspiring presence.",
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
  for (const card of CARDS) {
    try {
      await generateOne(zai, card);
    } catch (e) {
      console.error(`✗ ${card.name}:`, (e as Error).message);
      // continue with next card
    }
  }
  console.log("=== Generación completada ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
