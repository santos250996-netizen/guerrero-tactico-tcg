import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";

const DIR = "/home/z/my-project/public/cards";
const SIZE = "864x1152";

const STYLE = "Stylized painterly digital illustration, visible brushstrokes, NOT photorealistic, NOT 3D render, full art no borders no frame full bleed, character centered within frame, Hearthstone card art style, character as glowing light source with warm orange emissive glow, vibrant saturated complementary orange and steel-blue palette, heroic bright lighting with strong rim light, epic heroic mood, Blizzard Entertainment concept art, flat color zones in shadows, exaggerated heroic proportions, fantasy card game illustration.";

const CARDS = [
  { id: "veterano", prompt: `A battle-hardened sergeant with graying beard and facial scars, holding a notched war axe, weathered armor with dents, calm confident expression, dark battlefield background. ${STYLE}` },
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
  console.log("=== Done ===");
}
main().catch(e => { console.error(e); process.exit(1); });
