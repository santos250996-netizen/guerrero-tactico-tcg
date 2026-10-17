import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";

const DIR = "/home/z/my-project/public/cards";
const SIZE = "864x1152";

const CARDS = [
  {
    id: "soldado",
    prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. A massive tauren warrior (bull-like humanoid with large horns, brown fur, hooves) charging head-first at full speed into an undead enemy (Forsaken, skeletal frame, glowing blue eyes, tattered flesh), the tauren's horns slam into the undead's chest sending him flying backward through the air, dust and rock debris exploding from the impact point, motion blur streaks on the charging tauren showing incredible speed, the undead is knocked back mid-air with limbs splayed, dynamic 3rd person combat scene from the side, dark battlefield background with smoke. Vibrant saturated colors reflecting the scene, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard Entertainment concept art, fantasy illustration, NO text in image, full art no borders.`,
  },
  {
    id: "veterano",
    prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. An ogre warrior (gigantic grey-skinned brute, enormous muscles, tusks) mid-swing bringing down a colossal two-headed war axe crashing onto an orc enemy below, the axe blade buried deep in the cracked ground, the orc crushed and knocked down under the devastating blow, rock debris and dust exploding upward from the massive impact, the ogre's muscles tensed in full downward swing, 3rd person perspective watching the crushing blow from the side. Vibrant saturated colors reflecting the brutal scene, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard Entertainment concept art, fantasy illustration, NO text in image, full art no borders.`,
  },
  {
    id: "caballero",
    prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. A blood elf warrior (pale skin, pointed ears, long blonde hair, slender elegant build) in a perfect fencing lunge stance executing a masterful thrust with a slender rapier, the blade extending straight forward piercing the air with a glowing sharp tip, one arm extended back for balance, front leg deeply bent in classical lunge, ornate golden armor, dynamic 3rd person side view showing the full elegant lunge form, ornate dueling hall with tall windows in background. Vibrant saturated colors reflecting the elegant scene, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard Entertainment concept art, fantasy illustration, NO text in image, full art no borders.`,
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
  console.log("=== Done ===");
}
main().catch(e => { console.error(e); process.exit(1); });
