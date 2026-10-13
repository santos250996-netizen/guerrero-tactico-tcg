import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";

const DIR = "/home/z/my-project/public/cards";
const SIZE = "864x1152";

const CARDS = [
  { id: "estandarte_guerra", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. A dwarf warrior (short, thick beard) planting a tall war banner with a golden emblem into the battlefield ground, the banner is the focus — tall, detailed cloth with golden fringes and a glowing emblem, waving in the wind, the dwarf is secondary smaller below the banner, battlefield background. Vibrant saturated golden and red colors, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },
  { id: "cuerno_batalla", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. A tauren warrior (bull humanoid, horns) blowing a massive curved war horn, the horn is the focus — large, ornate, glowing with energy, soundwaves visible emanating from it, the tauren is holding it up with both hands, soundwave ripples spreading across the scene, battlefield background. Vibrant saturated amber and blue colors, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },
  { id: "pergamino_tactico", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. A gnome warrior (very small, pink skin) holding up an unrolled tactical scroll with battle plans drawn on it, the scroll is the focus — large, detailed parchment with glowing tactical marks and arrows, the gnome is small below holding it open, war tent background with maps. Vibrant saturated parchment yellows and ink blues, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },
  { id: "yunque_guerra", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. A dwarf warrior forging a glowing weapon on a massive war anvil, the anvil is the focus — large, detailed dark iron with glowing runes, sparks flying from the hammer striking hot metal, the dwarf is secondary working at the anvil, forge background with fire glow. Vibrant saturated orange firelight and dark iron greys, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },
  { id: "coraza_acero", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. An orc warrior (green skin, tusks) wearing a massive shining steel cuirass armor with spikes, the armor is the focus — large, detailed, gleaming metal with battle scratches and spike decorations, the orc is striking a powerful pose showing off the armor, dark background. Vibrant saturated steel blues and green skin, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },
  { id: "casco_ornamentado", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. A troll warrior (blue skin, tusks, mohawk) wearing an ornate golden war helmet with crests and ceremonial horns, the helmet is the focus — massive, detailed golden metal with engravings and crests, glowing with power, the troll is secondary below the imposing helmet, dark temple background. Vibrant saturated gold and blue colors, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },
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
  console.log("=== 6 items done ===");
}
main().catch(e => { console.error(e); process.exit(1); });
