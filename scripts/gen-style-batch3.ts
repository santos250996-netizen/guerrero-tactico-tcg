import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";

const OUTPUT_DIR = "/home/z/my-project/public/cards";
const SIZE = "864x1152";
const STYLE = "Digital painting, Blizzard Entertainment concept art aesthetic, hyper-detailed, rim lighting with white edge glow, complementary orange-amber and steel-blue palette, extreme saturation, volumetric particle effects, dynamic action pose, chiaroscuro lighting, stylized proportions 70/30 with realistic material rendering, metal with scratches and dents, subsurface scattering on skin, cinematic bloom and vignette, mood of controlled aggressive power, fantasy illustration, 8k quality.";

const CARDS = [
  { id: "mago_joven", name: "Berserker", prompt: `A berserker warrior in a rage state, bloodshot eyes, foaming mouth, wielding two hand axes, tense muscles and bulging veins, torn clothing, pure fury aura, dark battlefield with debris. ${STYLE}` },
  { id: "caballero", name: "Espadachín", prompt: `A master swordsman in full plate armor, holding a longsword with both hands in a classic guard stance, cape flowing, experienced warrior posture, tournament arena background. ${STYLE}` },
  { id: "paladin", name: "Caudillo", prompt: `A battle commander on a rocky outcrop rallying troops, sword raised to the sky, ornate war armor, fierce expression, war banners fluttering behind. ${STYLE}` },
];

async function main() {
  const zai = await ZAI.create();
  for (const c of CARDS) {
    console.log(`→ ${c.name}...`);
    const r = await zai.images.generations.create({ prompt: c.prompt, size: SIZE });
    const b = Buffer.from(r.data[0].base64, "base64");
    fs.writeFileSync(`${OUTPUT_DIR}/${c.id}.png`, b);
    console.log(`✓ ${c.name} — ${(b.length/1024).toFixed(1)} KB`);
  }
  console.log("=== Batch 3 completo ===");
}
main().catch(e => { console.error(e); process.exit(1); });
