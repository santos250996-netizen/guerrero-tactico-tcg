import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";

const DIR = "/home/z/my-project/public/cards";
const SIZE = "864x1152";
const STYLE = "Digital painting, Blizzard Entertainment concept art aesthetic, hyper-detailed, rim lighting with white edge glow, complementary orange-amber and steel-blue palette, extreme saturation, volumetric particle effects, dynamic action pose, chiaroscuro lighting, stylized proportions 70/30 with realistic material rendering, metal with scratches and dents, subsurface scattering on skin, cinematic bloom and vignette, mood of controlled aggressive power, fantasy illustration, 8k quality.";

const CARDS = [
  { id: "pocion_vida", name: "Poción de Vida", prompt: `A glowing red health potion flask on a stone table inside a warrior's armory, magical healing smoke rising. ${STYLE}` },
  { id: "provocar", name: "Provocar", prompt: `An angry warrior shouting fiercely, beating his chest armor, surrounded by dark menacing battleground aura, taunting expression. ${STYLE}` },
  { id: "ira_rabiosa", name: "Ira Rabiosa", prompt: `A warrior's eyes glowing with fierce crimson rage, veins pulsing with fiery red energy, berserker mood, dark background. ${STYLE}` },
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
  console.log("=== Warrior batch 3 completo ===");
}
main().catch(e => { console.error(e); process.exit(1); });
