import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";

const OUTPUT_DIR = "/home/z/my-project/public/cards";
const SIZE = "864x1152";
const STYLE = "Digital painting, Blizzard Entertainment concept art aesthetic, hyper-detailed, rim lighting with white edge glow, complementary orange-amber and steel-blue palette, extreme saturation, volumetric particle effects, dynamic action pose, chiaroscuro lighting, stylized proportions 70/30 with realistic material rendering, metal with scratches and dents, subsurface scattering on skin, cinematic bloom and vignette, mood of controlled aggressive power, fantasy illustration, 8k quality.";

const CARDS = [
  { id: "golpe_heroico", name: "Golpe Heroico", prompt: `A fierce orc warrior delivering a powerful glowing orange overhead strike with a giant battleaxe, dynamic motion blur, fiery sparks, dark epic background. ${STYLE}` },
  { id: "seccionar", name: "Seccionar", prompt: `A nimble warrior slicing low with a sharp broadsword, swift silver blade trail, detailed armor, combat action scene. ${STYLE}` },
  { id: "machaque_mortal", name: "Machaque Mortal", prompt: `A brutal tauren warrior crushing the ground with a massive two-handed weapon, dust and rock debris flying, epic cinematic lighting. ${STYLE}` },
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
  console.log("=== Warrior batch 1 completo ===");
}
main().catch(e => { console.error(e); process.exit(1); });
