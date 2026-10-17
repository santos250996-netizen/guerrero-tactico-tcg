import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";
import path from "path";

const OUTPUT_DIR = "/home/z/my-project/public/cards";
const SIZE = "864x1152";

const STYLE = "Digital painting, Blizzard Entertainment concept art aesthetic, hyper-detailed, rim lighting with white edge glow, complementary orange-amber and steel-blue palette, extreme saturation, volumetric particle effects, dynamic action pose, chiaroscuro lighting, stylized proportions 70/30 with realistic material rendering, metal with scratches and dents, subsurface scattering on skin, cinematic bloom and vignette, mood of controlled aggressive power, fantasy illustration, 8k quality.";

const CARDS = [
  {
    id: "recluta",
    name: "Cadete",
    prompt: `A young human warrior cadet in simple leather training armor, holding a basic iron sword, standing in a dusty training yard, determined but youthful expression, warm golden sunlight. ${STYLE}`,
  },
  {
    id: "aprendiz",
    name: "Grito Salvaje",
    prompt: `A battle-scarred warrior mid-roar, mouth wide open in a fierce war cry, veins bulging on neck, dust and debris exploding outward from the shout, dark stormy battlefield. ${STYLE}`,
  },
  {
    id: "sanador",
    name: "Vendas de Guerra",
    prompt: `Blood-stained war bandages on a worn wooden table in a military camp, rusty iron helmet and notched dagger nearby, warm candlelight, gritty realism. ${STYLE}`,
  },
];

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const zai = await ZAI.create();
  for (const card of CARDS) {
    const outPath = path.join(OUTPUT_DIR, `${card.id}.png`);
    console.log(`→ ${card.name}...`);
    const res = await zai.images.generations.create({ prompt: card.prompt, size: SIZE });
    const buf = Buffer.from(res.data[0].base64, "base64");
    fs.writeFileSync(outPath, buf);
    console.log(`✓ ${card.name} — ${(buf.length / 1024).toFixed(1)} KB`);
  }
  console.log("=== Batch 1 completo ===");
}
main().catch(e => { console.error(e); process.exit(1); });
