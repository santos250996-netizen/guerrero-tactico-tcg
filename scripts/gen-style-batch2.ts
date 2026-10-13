import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";
import path from "path";

const OUTPUT_DIR = "/home/z/my-project/public/cards";
const SIZE = "864x1152";

const STYLE = "Digital painting, Blizzard Entertainment concept art aesthetic, hyper-detailed, rim lighting with white edge glow, complementary orange-amber and steel-blue palette, extreme saturation, volumetric particle effects, dynamic action pose, chiaroscuro lighting, stylized proportions 70/30 with realistic material rendering, metal with scratches and dents, subsurface scattering on skin, cinematic bloom and vignette, mood of controlled aggressive power, fantasy illustration, 8k quality.";

const CARDS = [
  {
    id: "soldado",
    name: "Legionario",
    prompt: `A heavy infantry soldier with a round shield and spear, dark plate armor with a red military cape, disciplined firm stance, military camp background with banners. ${STYLE}`,
  },
  {
    id: "guardia",
    name: "Centinela",
    prompt: `A city guard in full plate armor holding a halberd, helmet with crest, stoic watchful expression, stone wall background with burning torches. ${STYLE}`,
  },
  {
    id: "veterano",
    name: "Sargento",
    prompt: `A battle-hardened sergeant with graying beard and facial scars, holding a notched war axe, weathered armor with dents, calm confident expression, dark battlefield. ${STYLE}`,
  },
];

async function main() {
  const zai = await ZAI.create();
  for (const card of CARDS) {
    const outPath = path.join(OUTPUT_DIR, `${card.id}.png`);
    console.log(`→ ${card.name}...`);
    const res = await zai.images.generations.create({ prompt: card.prompt, size: SIZE });
    const buf = Buffer.from(res.data[0].base64, "base64");
    fs.writeFileSync(outPath, buf);
    console.log(`✓ ${card.name} — ${(buf.length / 1024).toFixed(1)} KB`);
  }
  console.log("=== Batch 2 completo ===");
}
main().catch(e => { console.error(e); process.exit(1); });
