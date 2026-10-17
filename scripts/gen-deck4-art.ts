import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const BASE_PROMPT = `Stylized realism, visible brushstrokes, NOT photorealistic, NOT 3D render, full art no borders no frame full bleed, Hearthstone card art style, vibrant saturated colors reflecting the scene's theme, dramatic lighting with strong rim light, high contrast, epic heroic mood, Blizzard Entertainment concept art, flat color zones in shadows, exaggerated heroic proportions, fantasy card game illustration, NO text in image.`;

// Deck 4: IMPULSO SANGRIENTO (Furia y Agresión Clásica) — 12 cards
const CARDS = [
  {
    id: "grito_salvaje_kw",
    name: "Grito Salvaje",
    category: "Acción",
    prompt: `A troll berserker throwing their head back in a primal roar to the sky, visible sound waves rippling as red energy, muscles tensed with veins bulging, tribal war paint glowing, jungle clearing background with other trolls rallying behind, rain and lightning,`,
  },
  {
    id: "pocion_vida_kw",
    name: "Poción de Vida",
    category: "Ítem",
    prompt: `A tauren shaman holding a glowing green vial of healing potion, the vial is the visual focus — bubbling emerald liquid with golden sparkles inside, cork top with tribal string wrapping, the tauren's large hand cradling it gently, herbal hut background with drying plants, the vial larger and brighter than the character,`,
  },
  {
    id: "seccionar_kw",
    name: "Seccionar",
    category: "Ataque",
    prompt: `First person view of a serrated combat blade slashing diagonally across an armored enemy's chest, the cut visibly weakening the enemy with red energy draining from the wound, motion blur on the blade, sparks where blade meets armor, dark arena background,`,
  },
  {
    id: "ira_rabiosa_kw",
    name: "Ira Rabiosa",
    category: "Acción",
    prompt: `An orc blademaster consumed by battle rage, eyes blazing red, veins pulsing with fury energy, surrounded by other fur-marked warriors who amplify his rage, red aura growing brighter with each nearby ally, frothing mouth, dual axes raised, battlefield background with war banners,`,
  },
  {
    id: "burla_sadica_kw",
    name: "Burla Sádica",
    category: "Acción",
    prompt: `A forsaken (undead) rogue grinning sadistically with a crooked smile, pointing mockingly at an enemy whose lane is overflowing with troops, the rogue's poisoned daggers gleaming, green toxin dripping from the blades, dark alley background with shadows, the enemy's crowded formation visible in the background,`,
  },
  {
    id: "berserker_kw",
    name: "Berserker",
    category: "Acción",
    prompt: `A worgen (werewolf) berserker in full transformation, fur matted with blood and battle, eyes glowing amber with primal fury, mid-leap with claws extended toward the weakest enemy, muscles rippling under fur, full moon behind, forest clearing background with broken weapons scattered,`,
  },
  {
    id: "grito_batalla_kw",
    name: "Grito de Batalla",
    category: "Acción",
    prompt: `An orc warlord on a cliff edge sounding a massive battle cry, red shockwave expanding outward, visible energy flowing to fur-marked allies in the valley below who glow with renewed power, war banner planted beside the warlord, epic landscape background with army formations, golden hour,`,
  },
  {
    id: "venganza_kw",
    name: "Venganza",
    category: "Acción",
    prompt: `A blood elf death knight with cold fury in their eyes, raising a runeblade that glows with vengeful red energy, behind them a ghostly memory of a fallen comrade, the knight's armor cracked from the previous battle, dark cathedral ruins background, red mist swirling around the blade,`,
  },
  {
    id: "filotormenta_kw",
    name: "Filotormenta",
    category: "Ataque",
    prompt: `A storm of glowing blades swirling through an enemy formation, multiple razor-sharp weapon silhouettes cutting through enemies simultaneously, red energy trailing each blade, enemies staggering from the cuts, whirlwind of steel visible in the center, dark battlefield background,`,
  },
  {
    id: "carga_devastadora_kw",
    name: "Carga Devastadora",
    category: "Ataque",
    prompt: `A massive tauren charger barreling through enemy lines, shield-first, the impact shattering shields and sending enemies flying, the tauren's eyes glowing with unstoppable momentum, a small fallen ally visible being left behind as sacrifice, dust trail behind, canyon battlefield background,`,
  },
  {
    id: "masacre_sangrienta_kw",
    name: "Masacre Sangrienta",
    category: "Ataque",
    prompt: `A lone orc executioner standing victorious on a battlefield of fallen enemies, blood-soaked greatsword resting on their shoulder, the lone figure silhouetted against a blood-red sky, scattered weapons and banners of defeated enemies around them, solitary and deadly, epic wide shot,`,
  },
  {
    id: "avatar_titan_kw",
    name: "Avatar del Titán",
    category: "Acción",
    prompt: `A colossal titan avatar descending onto the battlefield, golden energy radiating outward in proportion to the armies present below, the titan's form made of molten gold and starlight, armies on both sides looking up in awe, the avatar's power scaling visibly with the number of soldiers, epic celestial background,`,
  },
];

async function main() {
  const zai = await ZAI.create();
  const outDir = path.join(process.cwd(), 'public', 'cards');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  let ok = 0, fail = 0;
  for (const card of CARDS) {
    const outPath = path.join(outDir, `${card.id}.png`);
    if (fs.existsSync(outPath)) { console.log(`⏭️  ${card.name} — already exists`); ok++; continue; }
    const fullPrompt = `${card.prompt} ${BASE_PROMPT}`;
    console.log(`🎨 Generating: ${card.name} (${card.id})...`);
    try {
      const response = await zai.images.generations.create({ prompt: fullPrompt, size: '864x1152' });
      if (!response.data?.[0]?.base64) throw new Error('No image data');
      const buffer = Buffer.from(response.data[0].base64, 'base64');
      fs.writeFileSync(outPath, buffer);
      // Convert JPEG→PNG if needed
      try {
        const { execSync } = require('child_process');
        execSync(`python3 -c "from PIL import Image; Image.open('${outPath}').save('${outPath}','PNG')"`, { timeout: 10000 });
      } catch {}
      const finalSize = fs.statSync(outPath).size;
      console.log(`✅ ${card.name} → ${outPath} (${(finalSize / 1024).toFixed(0)} KB)`);
      ok++;
    } catch (err: any) { console.error(`❌ ${card.name} — ${err.message}`); fail++; }
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log(`\n${ok}/${CARDS.length} generated, ${fail} failed`);
}

main().catch(console.error);
