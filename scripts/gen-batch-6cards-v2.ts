import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";

const DIR = "/home/z/my-project/public/cards";
const SIZE = "864x1152";

const CARDS = [
  // ATAQUE: Masacre Sangrienta — Tauren con gran espada barriendo enemigos
  { id: "campeon", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. A tauren warrior (bull humanoid, massive horns, muscular) swinging a giant greatsword in a wide powerful arc, dynamic sweeping motion, enemies knocked flying back from the force, energy shockwave from the swing, the tauren roaring with battle fury, epic battlefield scene, 3rd person wide shot. Vibrant saturated warm colors, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },

  // ATAQUE: Golpe Heroico — Orco golpe heroico con hacha brillante
  { id: "golpe_heroico", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. An orc warrior (green skin, tusks, massive muscles) delivering a powerful overhead strike with a giant battleaxe, the axe coming down in a mighty vertical chop, the blade glowing with golden heroic energy, sparks of light flying from the impact, dynamic 3rd person side view showing the full overhead swing arc, epic dark sky background. Vibrant saturated golden and green colors, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },

  // ATAQUE: Seccionar — No-muerto corte bajo con espada curva
  { id: "seccionar", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. An undead warrior (Forsaken, skeletal, torn cloak, glowing eyes) executing a fast low horizontal slash with a curved sword, the blade leaving a visible silver slash trail, a troll enemy recoiling from the swift cut to his legs, crouching low attack stance, dynamic 3rd person side view of the low sweep. Vibrant saturated teal and silver colors, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },

  // ATAQUE: Machaque Mortal — Ogro golpe demoledor con maza
  { id: "machaque_mortal", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. An ogre warrior (gigantic grey brute, enormous) bringing down a massive two-handed mace in a devastating downward smash, the impact creating a crater with rock and earth exploding outward, a shockwave ring expanding from the impact point, the ogre muscles tensed in full downward swing, 3rd person perspective from slightly above. Vibrant saturated earthy browns and impact oranges, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },

  // ACCIÓN: Burla Sádica — Goblin burlándose de demonio gigante
  { id: "burla_sadica", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. A goblin warrior (small, green, big ears, big nose) standing confidently with one hand on hip and the other hand making a mocking come-here gesture toward a massive demon enemy (huge horned demon, glowing red eyes, towering behind), the goblin laughing with a cocky grin, dramatic size contrast between tiny goblin and gigantic demon, 3rd person view. Vibrant saturated contrasting green and red colors, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },

  // ACCIÓN: Venganza — No-muerto levantándose con furia
  { id: "venganza", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. An undead warrior (Forsaken, skeletal, torn cloak, tattered armor, glowing crimson eyes) rising from the ground with fierce determination, one clenched fist raised upward, dark crimson energy aura erupting around him, broken weapons scattered on the battlefield, rising from rubble, 3rd person dramatic low-angle view looking up at the rising figure. Vibrant saturated dark reds and purples, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },
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
