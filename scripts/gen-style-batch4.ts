import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";

const OUTPUT_DIR = "/home/z/my-project/public/cards";
const SIZE = "864x1152";
const STYLE = "Digital painting, Blizzard Entertainment concept art aesthetic, hyper-detailed, rim lighting with white edge glow, complementary orange-amber and steel-blue palette, extreme saturation, volumetric particle effects, dynamic action pose, chiaroscuro lighting, stylized proportions 70/30 with realistic material rendering, metal with scratches and dents, subsurface scattering on skin, cinematic bloom and vignette, mood of controlled aggressive power, fantasy illustration, 8k quality.";

const CARDS = [
  { id: "muro_hierro", name: "Bastión", prompt: `A massive mobile iron barricade with thick steel plates and rivets, defensive fortification on wheels, battlefield background. ${STYLE}` },
  { id: "campeon", name: "Campeón Sanguinario", prompt: `A battle champion in ornate golden armor wielding a massive two-handed greatsword, triumphant stance, arena background with crowd, covered in battle marks. ${STYLE}` },
  { id: "hechicero", name: "Señor de la Guerra", prompt: `A warlord with imposing presence in flowing dark armor, glowing fierce eyes, holding a massive weapon, stormy battlefield background with war banners. ${STYLE}` },
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
  console.log("=== 12 básicas completas ===");
}
main().catch(e => { console.error(e); process.exit(1); });
