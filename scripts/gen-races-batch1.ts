import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";

const DIR = "/home/z/my-project/public/cards";
const SIZE = "864x1152";
const STYLE = "Stylized realism, visible brushstrokes, NOT photorealistic, full art no borders no frame full bleed, Hearthstone card art style, vibrant saturated complementary orange and steel-blue palette, heroic bright lighting with strong rim light, epic heroic mood, Blizzard Entertainment concept art, flat color zones in shadows, exaggerated heroic proportions, fantasy card game illustration.";

const CARDS = [
  {
    id: "aprendiz",
    prompt: `An orc warrior (green skin, tusks, massive build) with mouth wide open in a fierce battle cry, neck veins bulging, muscles tense, holding a giant war axe in one hand. Dust and debris exploding outward from the force of the shout. Dark stormy battlefield background. ${STYLE}`,
  },
  {
    id: "soldado",
    prompt: `A stocky dwarf warrior (short, broad, thick braided beard) in dark plate armor with a round shield and spear, horned helmet, firm disciplined stance, red military cape flowing. Military camp background with banners in the wind. ${STYLE}`,
  },
  {
    id: "veterano",
    prompt: `An undead warrior (Forsaken, torn flesh revealing bone, glowing blue eyes) holding a notched war axe, rusty dented armor, calm confident expression despite being dead. Dark battlefield background. ${STYLE}`,
  },
];

async function main() {
  const zai = await ZAI.create();
  for (const c of CARDS) {
    console.log(`→ ${c.id}...`);
    const r = await zai.images.generations.create({ prompt: c.prompt, size: SIZE });
    const b = Buffer.from(r.data[0].base64, "base64");
    fs.writeFileSync(`${DIR}/${c.id}.png`, b);
    console.log(`✓ ${c.id} — ${(b.length/1024).toFixed(1)} KB`);
  }
  console.log("=== Batch 1 completo ===");
}
main().catch(e => { console.error(e); process.exit(1); });
