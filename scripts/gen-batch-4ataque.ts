import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";

const DIR = "/home/z/my-project/public/cards";
const SIZE = "864x1152";

const CARDS = [
  // ATAQUE: Ejecutar — Draenei dando golpe final con espada brillante
  { id: "ejecutar", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. A draenei warrior (blue skin, tendrils, hooves, crystal-infused armor) thrusting a glowing white-hot sword straight forward into a kneeling enemy, the blade tip glowing intensely with final-strike energy, the enemy silhouette falling backward, dramatic execution moment, 3rd person side view. Vibrant saturated white-gold and deep blues, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },

  // ATAQUE: Filotormenta — Orco girando con espadas en torbellino
  { id: "filotormenta", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. An orc warrior (green skin, tusks, massive muscles) spinning rapidly in a deadly whirlwind with two swords extended outward, creating a circular storm of steel blades, metallic sparks flying in a perfect circle around him, motion blur showing the spin, enemies being pushed back by the whirlwind force, dynamic 3rd person view from slightly above. Vibrant saturated silver and orange sparks, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },

  // ATAQUE: Herida Letal — Elfo de sangre apuñalando con daga brillante
  { id: "herida_letal", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. A blood elf warrior (pale skin, pointed ears, sleek build) delivering a precise lethal stab with a glowing crimson dagger into a troll enemy, the dagger tip glowing with dark red energy, precise surgical strike to a vital point, the troll recoiling from the precise hit, close-up dynamic 3rd person view focusing on the dagger and the moment of impact. Vibrant saturated crimson and teal colors, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },

  // ATAQUE: Carga Devastadora — Tauren embistiendo con escudo y energia
  { id: "carga_devastadora", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. A tauren warrior (bull humanoid, massive horns, muscular) charging forward at full speed with a large shield raised, glowing yellow energy aura exploding around him doubling in intensity as he charges, dust trail behind him, the ground cracking under his hooves from the sheer force, enemies being thrown aside by the charge, dynamic 3rd person view from the front showing the charging tauren coming toward the viewer. Vibrant saturated golden and earthy colors, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },
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
