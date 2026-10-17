import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";

const DIR = "/home/z/my-project/public/cards";
const SIZE = "864x1152";

const CARDS = [
  // Despertar Bélico — Ser con cuernos (sin decir "demon")
  { id: "despertar_bélico", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. A powerful horned warrior (red skin, large curved horns, muscular, glowing green eyes) surrounded by an erupting aura of crimson battle energy, eyes glowing with fierce determination, spectral weapons floating around him orbiting in a circle, war banners unfurling behind him, the warrior is powering up with fists clenched, crimson energy exploding outward from his body, legendary awakening moment, 3rd person dramatic view. Vibrant saturated crimson red and green energy colors, dramatic rim lighting, high contrast, heroic exaggerated colossal proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },

  // Señor de la Guerra — Tauren siendo coronado por orco anciano
  { id: "hechicero", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. A tauren warrior (bull humanoid, massive horns) kneeling while an orc elder (green skin, tusks, grey beard) places a massive horned war crown on the tauren's head, both in full armor, war banners behind them, an army watching in the background, ceremonial coronation moment, 3rd person view. Vibrant saturated ceremonial gold and warm earth colors, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },

  // Mimetismo — Goblin copiando la pose del tauren en burla
  { id: "mimetismo", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. A goblin warrior (small, green, big ears, big nose) standing next to a tauren warrior (bull humanoid, massive), the goblin is mocking the tauren by copying his exact pose, the goblin has his arms flexed mimicking the tauren's flexing pose, puffing out his tiny chest imitating the tauren's massive chest, making a funny face, the tauren looks confused and annoyed, side by side 3rd person view. Vibrant saturated comedic contrasting colors, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },
];

async function main() {
  const zai = await ZAI.create();
  for (const c of CARDS) {
    console.log(`→ ${c.id}...`);
    try {
      const r = await zai.images.generations.create({ prompt: c.prompt, size: SIZE });
      const b = Buffer.from(r.data[0].base64, "base64");
      fs.writeFileSync(`${DIR}/${c.id}.png`, b);
      console.log(`✓ ${c.id} — ${(b.length/1024).toFixed(1)} KB`);
    } catch (e) { console.error(`✗ ${c.id}: ${(e as Error).message.slice(0, 100)}`); }
  }
  console.log("=== Done ===");
}
main().catch(e => { console.error(e); process.exit(1); });
