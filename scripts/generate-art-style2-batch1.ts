import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";
import path from "path";

const OUTPUT_DIR = "/home/z/my-project/public/cards";
const SIZE = "864x1152";

// Consistent style suffix for ALL card art going forward
const STYLE = "Digital concept art painting, cinematic dramatic lighting with bloom and atmospheric depth, vibrant saturated colors, highly detailed Blizzard Entertainment World of Warcraft art style, epic dynamic composition, polished AAA game quality.";

const CARDS = [
  {
    id: "recluta",
    name: "Cadete",
    prompt: `A young human warrior cadet in simple leather training armor, holding a basic iron sword, standing in a dusty training yard, determined but youthful expression, warm golden sunlight filtering through dust. ${STYLE}`,
  },
  {
    id: "aprendiz",
    name: "Grito Salvaje",
    prompt: `A battle-scarred warrior mid-roar, mouth wide open in a fierce war cry, veins bulging on neck and temples, dust and debris flying from the force of the shout, dark stormy battlefield background, raw primal fury. ${STYLE}`,
  },
  {
    id: "sanador",
    name: "Vendas de Guerra",
    prompt: `Blood-stained war bandages rolled on a worn wooden table in a military camp tent, a rusty iron helmet and a notched dagger nearby, warm flickering candlelight, gritty battlefield realism. ${STYLE}`,
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
  console.log("=== 3 imágenes completadas (estilo 2) ===");
}

main().catch((e) => { console.error(e); process.exit(1); });
