import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";

const DIR = "/home/z/my-project/public/cards";
const SIZE = "864x1152";
const STYLE = "Stylized realism, visible brushstrokes, NOT photorealistic, NOT 3D render, full art no borders no frame full bleed, Hearthstone card art style, vibrant saturated colors reflecting the scene theme, dramatic lighting with strong rim light, high contrast, epic heroic mood, Blizzard Entertainment concept art, flat color zones in shadows, exaggerated heroic proportions, fantasy card game illustration, NO text in image.";

const CARDS = [
  {
    id: "soldado",
    prompt: `A massive tauren warrior (bull-like humanoid, large horns, fur, hooves) charging head-first at full speed into an undead enemy (Forsaken, skeletal, glowing eyes), the tauren horns hit the undead sending him flying backward, dust and rock debris exploding from the impact, motion blur on the charging tauren showing incredible speed, the undead is being knocked back mid-air, dynamic 3rd person combat scene, battlefield background. ${STYLE}`,
  },
  {
    id: "veterano",
    prompt: `An ogre warrior (gigantic, massive, two-headed or single, grey skin, huge muscles) bringing down a colossal war axe crashing onto an orc enemy, the axe buried deep in the ground splitting the earth, the orc knocked down crushed by the impact, rock debris and dust exploding upward, devastating brutal blow, 3rd person perspective watching the crushing impact. ${STYLE}`,
  },
  {
    id: "caballero",
    prompt: `A blood elf warrior (pale skin, pointed ears, long blonde hair) executing a masterful precise thrust with a rapier, the blade piercing forward in a perfect fencing lunge stance, elegant but deadly technique, the blade tip glowing with sharp energy, dynamic 3rd person side view showing the full lunge form, ornate dueling hall background. ${STYLE}`,
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
