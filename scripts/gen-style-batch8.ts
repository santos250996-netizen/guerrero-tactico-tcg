import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";

const DIR = "/home/z/my-project/public/cards";
const SIZE = "864x1152";
const STYLE = "Digital painting, Blizzard Entertainment concept art aesthetic, hyper-detailed, rim lighting with white edge glow, complementary orange-amber and steel-blue palette, extreme saturation, volumetric particle effects, dynamic action pose, chiaroscuro lighting, stylized proportions 70/30 with realistic material rendering, metal with scratches and dents, subsurface scattering on skin, cinematic bloom and vignette, mood of controlled aggressive power, fantasy illustration, 8k quality.";

const CARDS = [
  { id: "grito_batalla", name: "Grito de Batalla", prompt: `A mighty war leader roaring on a cliff, visible magical soundwaves spreading outward, inspiring allies. ${STYLE}` },
  { id: "filotormenta", name: "Filotormenta", prompt: `A warrior spinning rapidly in a deadly whirlwind of steel and sharp blades, metallic sparks flying in a circle, epic action. ${STYLE}` },
  { id: "avatar_titan", name: "Avatar del Titán", prompt: `A warrior glowing with divine titan energy, surrounded by floating spectral weapons and golden light, awe-inspiring presence, legendary. ${STYLE}` },
];

async function main() {
  const zai = await ZAI.create();
  for (const c of CARDS) {
    console.log(`→ ${c.name}...`);
    const r = await zai.images.generations.create({ prompt: c.prompt, size: SIZE });
    const b = Buffer.from(r.data[0].base64, "base64");
    fs.writeFileSync(`${DIR}/${c.id}.png`, b);
    console.log(`✓ ${c.name} — ${(b.length/1024).toFixed(1)} KB`);
  }
  console.log("=== Warrior 12/12 completas ===");
}
main().catch(e => { console.error(e); process.exit(1); });
