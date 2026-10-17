import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";

const DIR = "/home/z/my-project/public/cards";
const SIZE = "864x1152";

const CARDS = [
  // ACCIÓN: Berserker — Troll en rage
  { id: "mago_joven", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. A troll warrior (blue skin, long tusks, mohawk crest) in a berserker rage state, bloodshot eyes wide open, foaming mouth, wielding two hand axes raised high, muscles tensed and veins bulging, torn clothing, pure fury aura radiating, dark battlefield with debris, 3rd person full body view. Vibrant saturated wild colors, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },

  // ACCIÓN: Caudillo — Orco arengando tropas
  { id: "paladin", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. An orc commander (green skin, tusks, war scars) standing on a rocky outcrop rallying troops below, sword raised to the sky pointing forward, ornate war armor, fierce determined expression, war banners fluttering behind him, an army visible below him, 3rd person dramatic view from below looking up. Vibrant saturated warm reds and greens, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },

  // ACCIÓN: Provocar — Tauren provocando a enemigo
  { id: "provocar", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. A tauren warrior (bull humanoid, massive horns, muscular) beating his own chest with both fists, shouting directly at an orc enemy standing in front of him, the tauren is looking straight at the orc's face with a challenging taunting expression, the orc looks intimidated, dark battleground aura, 3rd person side view showing both facing each other. Vibrant saturated warm earthy colors, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },

  // ACCIÓN: Grito de Batalla — Humano arengando desde acantilado
  { id: "grito_batalla", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. A human war leader (armored, cape flowing) on a cliff edge roaring with mouth wide open, visible magical soundwave rings spreading outward from his mouth, an army of warriors visible below cheering, golden armor gleaming, epic sky background with sun breaking through clouds, 3rd person view from the side. Vibrant saturated golden and sky blue colors, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },

  // LEGENDARY: Avatar del Titán — Guerrero con energía divina
  { id: "avatar_titan", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. A colossal warrior glowing with divine golden titan energy, the figure is massive and translucent with golden light emanating from within, surrounded by floating spectral weapons orbiting around him, golden light rays bursting outward, awe-inspiring legendary presence, the figure stands amid golden energy, 3rd person dramatic view. Vibrant saturated divine golds and white light, dramatic rim lighting, high contrast, heroic exaggerated colossal proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },

  // ACCIÓN: Burla Sádica — Goblin mirando directamente al demonio y burlándose
  { id: "burla_sadica", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. A goblin warrior (small, green, big ears, big nose) standing face-to-face looking directly at a massive demon enemy, the goblin is looking up at the demon's face with a cocky mocking grin, one hand making a come-here beckoning gesture right at the demon's face, the demon looks furious and is looking back down at the goblin, both are looking at each other not at the viewer, dramatic size contrast, 3rd person side view showing the two facing each other. Vibrant saturated contrasting green and red colors, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },

  // ACCIÓN: Purificación — Draenei ritual de luz
  { id: "purificacion", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. A draenei warrior (blue skin, hooves, tendrils) performing a holy purification ritual, golden light particles flowing from a fading ally dissolving into light toward a stronger standing draenei, divine golden aura surrounding the scene, hands raised channeling holy energy, sacred temple background with light rays, 3rd person view. Vibrant saturated divine gold and holy white colors, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },

  // ACCIÓN: Trampa Etérea — No-muerto colocando trampa mágica
  { id: "trampa_eterea", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. An undead warrior (Forsaken, skeletal, glowing eyes) crouching and inscribing glowing purple runes on a stone floor, creating an arcane circle trap pattern, swirling spectral purple mist rising from the runes, the undead is actively drawing the trap with a glowing finger, ominous purple glow illuminating the scene, dark dungeon background, 3rd person view from above. Vibrant saturated purple and arcane violet colors, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },

  // ACCIÓN: Mimetismo — Goblin copiando a otro
  { id: "mimetismo", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. A goblin warrior (small, green, big ears) shimmering and transforming, with multiple ghostly translucent echo silhouettes of himself in different poses around him, iridescent shifting colors rippling across his body, one of the ghostly echoes is clearly copying the appearance of a nearby orc warrior, magical doppelganger effect, arcane energy crackling, 3rd person view. Vibrant saturated iridescent rainbow and green colors, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },

  // LEGENDARY: Despertar Bélico — Orco con aura carmesí
  { id: "despertar_bélico", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. An orc warrior (green skin, tusks) surrounded by an erupting aura of crimson battle energy, eyes glowing with fierce determination, spectral weapons floating around him orbiting in a circle, war banners unfurling behind him, the orc is powering up with fists clenched, crimson energy exploding outward from his body, legendary awakening moment, 3rd person dramatic view. Vibrant saturated crimson red and dark energy colors, dramatic rim lighting, high contrast, heroic exaggerated colossal proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },
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
