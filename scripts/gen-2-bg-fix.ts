import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";

const DIR = "/home/z/my-project/public/cards";
const SIZE = "864x1152";

const CARDS = [
  // Avatar del Titán — guerrero colosal con fondo épico
  { id: "avatar_titan", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. A colossal warrior glowing with divine golden titan energy, the figure is massive and translucent with golden light emanating from within, surrounded by floating spectral weapons orbiting around him, golden light rays bursting outward, awe-inspiring legendary presence, epic battlefield background with stormy golden sky, distant mountains, shattered ground beneath him, the background fills the entire image with no white space, 3rd person dramatic view. Vibrant saturated divine golds and deep storm blues, dramatic rim lighting, high contrast, heroic exaggerated colossal proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders, background must fill entire canvas.` },

  // Mimetismo — goblin burlándose del tauren con fondo
  { id: "mimetismo", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. A goblin warrior (small, green, big ears, big nose) standing next to a tauren warrior (bull humanoid, massive), the goblin is mocking the tauren by copying his exact pose, the goblin has his arms flexed mimicking the tauren's flexing pose, puffing out his tiny chest imitating the tauren's massive chest, making a funny face, the tauren looks confused and annoyed, side by side 3rd person view, full background of a lively battlefield camp with tents, weapons, banners, smoke, NO white space, background fills entire canvas. Vibrant saturated comedic contrasting colors, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders, background must fill entire canvas.` },
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
