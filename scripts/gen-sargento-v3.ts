import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";

const DIR = "/home/z/my-project/public/cards";
const SIZE = "864x1152";

const CARDS = [
  { id: "veterano", prompt: `Stylized painterly digital illustration of a battle-hardened sergeant with graying beard and facial scars, holding a notched war axe, weathered armor with dents, calm confident expression, dark battlefield background. Visible brushstrokes, NOT photorealistic, Hearthstone card art style, character fully contained within the frame, head and feet visible, centered composition, no cropping, no cut-off, warm orange and steel-blue palette, heroic bright lighting, rim light, Blizzard Entertainment concept art, flat color zones in shadows, exaggerated heroic proportions, fantasy card game illustration.` },
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
