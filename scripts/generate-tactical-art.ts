// Generate the 12 new tactical card images using z-ai-web-dev-sdk.
// Same style/concept as the previous 12: epic fantasy TCG, WoW-inspired.
// Run: bun /home/z/my-project/scripts/generate-tactical-art.ts

import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";
import path from "path";

const OUTPUT_DIR = "/home/z/my-project/public/cards";
const SIZE = "864x1152"; // portrait TCG aspect (matches existing cards)

interface CardArt {
  id: string;
  name: string;
  prompt: string;
}

const CARDS: CardArt[] = [
  {
    id: "herida_letal",
    name: "Herida Letal",
    prompt:
      "Epic fantasy TCG card art of a warrior delivering a precise lethal stab with a glowing crimson dagger, blood drops frozen in mid-air, dark shadowy battlefield background, menacing dark red aura, dramatic cinematic lighting.",
  },
  {
    id: "carga_devastadora",
    name: "Carga Devastadora",
    prompt:
      "Dynamic fantasy TCG card art of a warrior charging forward with explosive energy burst, glowing yellow aura doubling in intensity, dust trail behind, fierce expression, epic cinematic action scene, dark background.",
  },
  {
    id: "asalto_coordinado",
    name: "Asalto Coordinado",
    prompt:
      "World of Warcraft style TCG card illustration of three warriors coordinating an assault from multiple directions, synchronized weapons raised in formation, dynamic battlefield composition, epic team action scene.",
  },
  {
    id: "burla_sadica",
    name: "Burla Sádica",
    prompt:
      "Fantasy TCG card art of a battle-scarred warrior laughing defiantly at a massive looming enemy shadow, arms spread wide in mocking challenge, dark ominous atmosphere, dramatic backlight, menacing grin.",
  },
  {
    id: "sobrecarga",
    name: "Sobrecarga",
    prompt:
      "Detailed TCG item card illustration of a glowing power crystal overflowing with unstable crackling blue-white energy, lightning arcs, sparking intensity, dark stone pedestal, magical overload effect.",
  },
  {
    id: "purificacion",
    name: "Purificación",
    prompt:
      "Epic fantasy TCG card art of a holy purification ritual, a fading warrior dissolving into golden light particles that flow toward a stronger standing warrior, sacred geometry, divine aura, dramatic sacrifice scene.",
  },
  {
    id: "tormenta_rayos",
    name: "Tormenta de Relámpagos",
    prompt:
      "World of Warcraft style TCG card illustration of a furious lightning storm, multiple blue-white thunderbolts striking down on enemy ranks, electrified storm clouds, dramatic sky, epic magical devastation.",
  },
  {
    id: "trampa_eterea",
    name: "Trampa Etérea",
    prompt:
      "Mystical fantasy TCG card art of an ethereal magical trap, glowing purple runes inscribed on a stone floor, swirling spectral mist, arcane circle pattern, ominous purple glow, hidden danger atmosphere.",
  },
  {
    id: "reflejo_arcano",
    name: "Reflejo Arcano",
    prompt:
      "Epic fantasy TCG card art of a floating arcane mirror reflecting a powerful enemy warrior's silhouette, glowing violet energy edges, magical glass surface, mystical reflection, dark arcane atmosphere.",
  },
  {
    id: "venganza",
    name: "Venganza",
    prompt:
      "World of Warcraft style TCG card illustration of a wounded warrior rising with vengeful fury, glowing red eyes, blood-stained armor, clenched fist, dark crimson aura of retribution, epic comeback moment.",
  },
  {
    id: "mimetismo",
    name: "Mimetismo",
    prompt:
      "Mystical fantasy TCG card art of a shimmering shapeshifting warrior with multiple echoing ghostly silhouettes around them, iridescent shifting colors, morphing body outline, arcane doppelganger illusion, mystical atmosphere.",
  },
  {
    id: "empuje_tactico",
    name: "Empuje Táctico",
    prompt:
      "World of Warcraft style TCG card illustration of a tactical commander in ornate armor pointing at a glowing strategic map, magical movement arrows showing troop relocation, blue tactical aura, command table scene.",
  },
];

async function generateOne(zai: any, card: CardArt): Promise<void> {
  const outPath = path.join(OUTPUT_DIR, `${card.id}.png`);
  if (fs.existsSync(outPath)) {
    console.log(`✓ ${card.name} — ya existe, saltando`);
    return;
  }
  console.log(`→ Generando ${card.name} ...`);
  const response = await zai.images.generations.create({
    prompt: card.prompt,
    size: SIZE,
  });
  const base64 = response.data[0].base64;
  const buffer = Buffer.from(base64, "base64");
  fs.writeFileSync(outPath, buffer);
  console.log(`✓ ${card.name} — ${(buffer.length / 1024).toFixed(1)} KB`);
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  const zai = await ZAI.create();
  let ok = 0;
  let err = 0;
  for (const card of CARDS) {
    try {
      await generateOne(zai, card);
      ok++;
    } catch (e) {
      console.error(`✗ ${card.name}:`, (e as Error).message);
      err++;
    }
  }
  console.log(`=== Generación completada: ${ok} OK, ${err} errores ===`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
