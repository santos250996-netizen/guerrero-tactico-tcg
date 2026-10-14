import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const BASE_PROMPT = `Stylized realism, visible brushstrokes, NOT photorealistic, NOT 3D render, full art no borders no frame full bleed, Hearthstone card art style, vibrant saturated colors reflecting the scene's theme, dramatic lighting with strong rim light, high contrast, epic heroic mood, Blizzard Entertainment concept art, flat color zones in shadows, exaggerated heroic proportions, fantasy card game illustration, NO text in image.`;

// Deck 3: MAESTROS DE LA FORJA (Armas y Tempo) — 12 cards
const CARDS = [
  {
    id: "tajo_forjado",
    name: "Tajo Forjado",
    category: "Ataque",
    prompt: `A dwarf smith swinging a freshly-forged glowing orange greatsword in a horizontal slash, the blade still radiating forge-heat, sparks trailing behind the swing, the dwarf's leather apron and heavy gloves, anvil and quench barrel visible in background, orange and steel color palette,`,
  },
  {
    id: "plano_de_armadura",
    name: "Plano de Armadura",
    category: "Ítem",
    prompt: `A gnome engineer holding up a glowing blueprint scroll showing armor schematics, the blueprint is the visual focus — covered in intricate technical drawings of plate armor with glowing blue annotations, the gnome's magnifying goggles reflecting the blueprint's light, workbench background with scattered tools and metal parts, the blueprint larger and brighter than the character,`,
  },
  {
    id: "corte_templado",
    name: "Corte Templado",
    category: "Ataque",
    prompt: `First person view of a tempered steel blade with visible wavy hamon pattern (differential hardening line) cutting cleanly through a stone pillar, the blade glowing faintly blue from heat-treatment, the cut is perfectly smooth with dust exploding from the pillar, forge fire reflected on the blade's edge, dark smithy background,`,
  },
  {
    id: "golpe_forjador",
    name: "Golpe Forjador",
    category: "Ataque",
    prompt: `A massive orc blacksmith bringing down a forging hammer onto a glowing ingot on an anvil, the impact sending sparks cascading outward like a weapon strike, the orc's muscles rippling with force, the red-hot metal deforming under the blow, dark forge interior with molten metal glow, the strike feels like a weapon attack,`,
  },
  {
    id: "afilado_tactico",
    name: "Afilado Táctico",
    category: "Acción",
    prompt: `A blood elf weaponmaster carefully honing a katana's edge with a whetstone, the blade's edge glowing razor-sharp blue with each stroke, sparks of light flying off the edge, the weaponmaster's expression focused and precise, a wall of legendary weapons visible behind them, sunset light streaming through a window,`,
  },
  {
    id: "yunque_runificado",
    name: "Yunque Runificado",
    category: "Ítem",
    prompt: `A dark iron dwarf standing beside a massive runic anvil, the anvil is the visual focus — covered in glowing blue dwarven runes that pulse with energy, a hammer resting on its face, sparks of arcane light rising from the runes, underground forge-city background with lava channels, the anvil larger and more detailed than the character,`,
  },
  {
    id: "estocada_maestra",
    name: "Estocada Maestra",
    category: "Ataque",
    prompt: `A night elf blademaster executing a perfect lunging thrust with a slender rapier, the blade extended fully in a textbook lunge, blue moonlight glinting off the steel, the elf's posture impeccable and elegant, motion lines emphasizing the forward thrust, moonlit forest clearing background,`,
  },
  {
    id: "sobrecarga_termica",
    name: "Sobrecarga Térmica",
    category: "Acción",
    prompt: `A goblin tinkerer channeling raw thermal energy through a gauntlet, the gauntlet glowing red-hot and crackling with overloading energy, steam and sparks erupting from the seams, the goblin's hair standing on end from the power surge, warning valves venting steam, explosive engine room background, red and orange energy,`,
  },
  {
    id: "martillazo_de_guerra",
    name: "Martillazo de Guerra",
    category: "Ataque",
    prompt: `A tauren warrior swinging a massive two-handed war-hammer in a devastating overhead arc, the hammer's head glowing with molten runes, the impact crater cracking the ground, debris flying upward, the tauren's horns silhouetted against a fiery sky, battlefield background with weapon fragments,`,
  },
  {
    id: "coraza_de_mitril",
    name: "Coraza de Mitril",
    category: "Ítem",
    prompt: `A dwarf warrior wearing a gleaming mithril breastplate, the breastplate is the visual focus — polished to mirror finish, blue-silver with engraved protective runes, radiating a faint blue aura, the dwarf standing proudly with arms crossed, the breastplate catching light dramatically, vault background with treasure,`,
  },
  {
    id: "filo_legendario",
    name: "Filo Legendario",
    category: "Ítem",
    prompt: `An ancient legendary sword displayed upright, the sword is the visual focus — blade glowing with golden runes, intricate hilt with dragon motifs, golden light radiating from the blade in rays, a small orc champion kneeling before it in reverence, ancient vault background with pillars, the sword dominating the composition,`,
  },
  {
    id: "embate_del_titan",
    name: "Embate del Titán",
    category: "Ataque",
    prompt: `A colossal titan-forged giant in ancient armor delivering a massive shield-bash with a tower shield, the impact creating a shockwave that shatters the ground, enemies flying backward from the force, the giant's size towering over the battlefield, golden titan energy radiating from the shield, ancient ruins background, epic scale,`,
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
      // Save as actual PNG (convert from JPEG if needed)
      const buffer = Buffer.from(response.data[0].base64, 'base64');
      fs.writeFileSync(outPath, buffer);
      // Convert JPEG→PNG if the API returned JPEG
      const { execSync } = require('child_process');
      try {
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
