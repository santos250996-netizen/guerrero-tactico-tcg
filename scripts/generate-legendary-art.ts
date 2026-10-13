import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";
import path from "path";

const OUTPUT_DIR = "/home/z/my-project/public/cards";
const SIZE = "864x1152";

const CARDS = [
  {
    id: "colera_titan",
    name: "Cólera del Titán",
    prompt: "Masterpiece legendary TCG card art of a colossal titan warrior unleashing a devastating shockwave of golden energy that disintegrates enemy ranks, divine wrath, glowing golden cracks in the ground, apocalyptic battlefield background, awe-inspiring power.",
  },
  {
    id: "despertar_bélico",
    name: "Despertar Bélico",
    prompt: "Epic legendary TCG card art of a warrior surrounded by an erupting aura of crimson battle energy, eyes glowing with fierce determination, spectral weapons floating around them, war banners unfurling, empowering battlefield presence, dark epic background with red energy streaks.",
  },
  {
    id: "trono_hierro",
    name: "Trono de Hierro",
    prompt: "Masterpiece legendary TCG card art of a massive iron throne on a battlefield, a battle-hardened warrior king sitting upon it with a massive two-handed sword, iron spikes and chains, dark stormy sky, commanding presence, epic dark fantasy, imposing metallic textures.",
  },
];

async function generateOne(zai: any, card: { id: string; name: string; prompt: string }): Promise<void> {
  const outPath = path.join(OUTPUT_DIR, `${card.id}.png`);
  if (fs.existsSync(outPath)) {
    console.log(`✓ ${card.name} — ya existe, saltando`);
    return;
  }
  console.log(`→ Generando ${card.name} ...`);
  const response = await zai.images.generations.create({ prompt: card.prompt, size: SIZE });
  const buffer = Buffer.from(response.data[0].base64, "base64");
  fs.writeFileSync(outPath, buffer);
  console.log(`✓ ${card.name} — ${(buffer.length / 1024).toFixed(1)} KB`);
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const zai = await ZAI.create();
  for (const card of CARDS) {
    try { await generateOne(zai, card); } catch (e) { console.error(`✗ ${card.name}:`, (e as Error).message); }
  }
  console.log("=== Done ===");
}

main().catch((e) => { console.error(e); process.exit(1); });
