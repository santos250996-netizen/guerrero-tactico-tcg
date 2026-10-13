import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";

const DIR = "/home/z/my-project/public/cards";
const SIZE = "864x1152";

const CARDS = [
  { id: "trampa_eterea", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. An undead warrior (Forsaken, skeletal, glowing eyes) crouching and inscribing glowing purple runes on a stone floor, creating an arcane circle trap pattern, swirling spectral purple mist rising from the runes, the undead is actively drawing the trap with a glowing finger, ominous purple glow illuminating the scene, dark dungeon background, 3rd person view from above. Vibrant saturated purple and arcane violet colors, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },
  { id: "mimetismo", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. A goblin warrior (small, green, big ears) shimmering and transforming, with multiple ghostly translucent echo silhouettes of himself in different poses around him, iridescent shifting colors rippling across his body, one of the ghostly echoes is clearly copying the appearance of a nearby orc warrior, magical doppelganger effect, arcane energy crackling, 3rd person view. Vibrant saturated iridescent rainbow and green colors, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },
  { id: "despertar_bélico", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. An orc warrior (green skin, tusks) surrounded by an erupting aura of crimson battle energy, eyes glowing with fierce determination, spectral weapons floating around him orbiting in a circle, war banners unfurling behind him, the orc is powering up with fists clenched, crimson energy exploding outward from his body, legendary awakening moment, 3rd person dramatic view. Vibrant saturated crimson red and dark energy colors, dramatic rim lighting, high contrast, heroic exaggerated colossal proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },
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
