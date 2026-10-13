import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";

const DIR = "/home/z/my-project/public/cards";
const SIZE = "864x1152";

const CARDS = [
  // ATAQUE: Masacre Sangrienta — Tauren masacrando múltiples enemigos
  { id: "campeon", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. A tauren warrior (bull humanoid, massive horns, covered in blood) swinging a giant greatsword in a wide arc cutting through multiple enemies at once, bodies and body parts flying, blood splatter across the scene, the tauren roaring with battle fury, surrounded by fallen enemies, 3rd person wide shot of a massacre. Vibrant saturated reds and browns reflecting the carnage, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },

  // ATAQUE: Golpe Heroico — Orco dando golpe heroico con hacha
  { id: "golpe_heroico", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. An orc warrior (green skin, tusks, massive muscles) delivering a powerful overhead strike with a giant battleaxe, the axe coming down in a mighty vertical chop, the blade glowing with orange energy, sparks and fire flying from the impact, dynamic 3rd person side view showing the full overhead swing arc, dark epic background. Vibrant saturated orange and red fire colors, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },

  // ATAQUE: Seccionar — No-muerto cortando bajo a enemigo
  { id: "seccionar", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. An undead warrior (Forsaken, skeletal, torn flesh, glowing eyes) executing a fast low horizontal slash with a curved sword at a troll enemy's legs, the blade leaving a visible silver slash trail, the troll recoiling from the cut to his legs, blood spray from the wound, crouching low attack stance, 3rd person side view of the low cut. Vibrant saturated cold blues and greens, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },

  // ATAQUE: Machaque Mortal — Ogro aplastando con maza a enemigo
  { id: "machaque_mortal", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. An ogre warrior (gigantic grey brute, enormous) bringing down a massive two-handed mace crushing a worgen enemy (werewolf) into the ground, the mace impact creating a crater with rock and earth exploding outward, the worgen pinned under the blow, shockwave rings expanding from the impact, 3rd person perspective from slightly above showing the devastating downward crush. Vibrant saturated earthy browns and impact whites, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },

  // ACCIÓN: Burla Sádica — Goblin burlándose de enemigo gigante
  { id: "burla_sadica", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. A goblin warrior (small, green, big ears, big nose) standing with one hand on hip and the other hand making a mocking come-here gesture at a massive demon enemy (huge horned demon, glowing red eyes), the goblin laughing with a cocky grin, the demon looming behind him looking furious, dramatic size contrast between tiny goblin and gigantic demon, 3rd person view. Vibrant saturated contrasting colors, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },

  // ACCIÓN: Venganza — No-muerto levantándose con furia
  { id: "venganza", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. An undead warrior (Forsaken, skeletal, torn flesh, tattered armor, glowing crimson eyes) rising from the ground with vengeful fury, one clenched fist raised upward, dark crimson aura erupting around him, broken weapons scattered on the battlefield around him, face twisted in rage despite being dead, rising from rubble and bones, 3rd person dramatic low-angle view looking up at the rising figure. Vibrant saturated dark reds and purples reflecting rage, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },
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
  console.log("=== 6 cartas completas ===");
}
main().catch(e => { console.error(e); process.exit(1); });
