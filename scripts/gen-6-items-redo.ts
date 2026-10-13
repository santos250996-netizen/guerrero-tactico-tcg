import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";

const DIR = "/home/z/my-project/public/cards";
const SIZE = "864x1152";

const CARDS = [
  // Centinela — Elfo Nocturno sosteniendo alabarda, arma es el foco
  { id: "guardia", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. A night elf warrior (purple skin, long ears, glowing amber eyes) standing guard holding a massive ornate halberd, the halberd is the focus — tall, detailed steel shaft with glowing engravings and a large crescent blade, the elf is secondary holding it upright, stone wall background with burning torches. Vibrant saturated purple and amber torchlight colors, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },

  // Bastión — Barricada de hierro masiva, objeto es el foco
  { id: "muro_hierro", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. A massive mobile iron barricade with thick steel plates, sharp spikes and rivets, the barricade is the focus — enormous, detailed dark iron with battle scars and glowing rune wards, a goblin warrior (small, green) is behind it pushing it forward, the barricade dominates the composition, smoky battlefield background. Vibrant saturated iron greys and glowing ward blues, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },

  // Muro Escudos — Línea de escudos enanos con runas brillantes
  { id: "muro_escudos", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. A wall of dwarven shields glowing with blue defensive magic runic barriers, the shields are the focus — row of large detailed metal shields with glowing blue runes, forming an impenetrable wall, dwarf warriors (short, bearded) are behind the shields barely visible, blue magical energy crackling between the shields, battlefield background. Vibrant saturated steel blues and glowing rune cyan, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },

  // Poción de Vida — No-muerto sosteniendo poción brillante, poción es el foco
  { id: "pocion_vida", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. An undead warrior (Forsaken, skeletal, glowing eyes) holding up a large glowing red health potion flask, the potion is the focus — big, detailed glass flask with swirling crimson liquid and rising healing smoke, glowing intensely, the undead is secondary holding it up admiringly, stone armory table with rusty weapons, warm candlelight. Vibrant saturated crimson glow and dark stone colors, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },

  // Sobrecarga — Gnomo sosteniendo cristal desbordando energía, cristal es el foco
  { id: "sobrecarga", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. A gnome warrior (very small, pink skin) holding a massive power crystal overflowing with unstable crackling blue-white energy, the crystal is the focus — large, detailed, glowing intensely with lightning arcs shooting out from it, energy overflowing onto the gnome's hands, dark stone pedestal nearby, sparks everywhere, dark cavern background. Vibrant saturated electric blues and white energy, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },

  // Trono de Hierro — No-muerto rey en trono, trono es el foco
  { id: "trono_hierro", prompt: `PAINTED DIGITAL ILLUSTRATION, NOT a photo, NOT 3D render, hand-painted with visible brushstrokes. A massive iron throne with spikes and chains, the throne is the focus — enormous, detailed dark iron with sharp spikes, chains hanging, skull decorations, an undead warrior king (Forsaken, skeletal, crown) sits on it holding a two-handed sword, the throne dominates the composition dwarfing the king, dark stormy sky background. Vibrant saturated iron darks and crown gold, dramatic rim lighting, high contrast, heroic exaggerated proportions, Hearthstone card art style, Blizzard concept art, fantasy illustration, NO text in image, full art no borders.` },
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
  console.log("=== 6 items recreated ===");
}
main().catch(e => { console.error(e); process.exit(1); });
