import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";
import path from "path";

const OUTPUT_DIR = "/home/z/my-project/public/cards";
const SIZE = "864x1152";

const CARDS = [
  {
    id: "soldado",
    name: "Legionario",
    prompt:
      "World of Warcraft style TCG card art of a heavy infantry soldier with a round shield and spear, dark plate armor with a red military cape, disciplined firm stance, military camp background with banners in the wind, no magical effects, realistic fantasy painting.",
  },
  {
    id: "guardia",
    name: "Centinela",
    prompt:
      "Fantasy TCG card art of a city guard in full plate armor holding a halberd, helmet with crest, stoic watchful expression, stone wall background with burning torches, no magical effects, professional soldier look, realistic painting style.",
  },
  {
    id: "veterano",
    name: "Sargento",
    prompt:
      "Epic fantasy TCG card art of a battle-hardened sergeant with graying beard and facial scars, holding a notched war axe in one hand, weathered armor with dents and battle marks, calm confident expression, dark battlefield background, no magical effects, realistic dark fantasy painting.",
  },
];

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const zai = await ZAI.create();
  for (const card of CARDS) {
    const outPath = path.join(OUTPUT_DIR, `${card.id}.png`);
    console.log(`→ Generando ${card.name}...`);
    const response = await zai.images.generations.create({ prompt: card.prompt, size: SIZE });
    const buffer = Buffer.from(response.data[0].base64, "base64");
    fs.writeFileSync(outPath, buffer);
    console.log(`✓ ${card.name} — ${(buffer.length / 1024).toFixed(1)} KB`);
  }
  console.log("=== 3 imágenes completadas ===");
}

main().catch((e) => { console.error(e); process.exit(1); });
