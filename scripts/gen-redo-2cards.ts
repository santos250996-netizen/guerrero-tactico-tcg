import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const BASE_PROMPT = `Stylized realism, visible brushstrokes, NOT photorealistic, NOT 3D render, full art no borders no frame full bleed, Hearthstone card art style, vibrant saturated colors reflecting the scene's theme, dramatic lighting with strong rim light, high contrast, epic heroic mood, Blizzard Entertainment concept art, flat color zones in shadows, exaggerated heroic proportions, fantasy card game illustration, NO text in image.`;

const CARDS = [
  {
    id: "baluarte_de_la_aliananza",
    name: "Baluarte de la Alianza",
    category: "Ítem",
    prompt: `A dwarf smith-forged massive iron-and-gold bulwark shield planted firmly in the ground, the shield is the visual focus — towering, reinforced with golden rivets and protective blue runes glowing along its rim, a small dwarf warrior standing behind it resting both hands on the rim, sparks of blue energy radiating from the shield forming a protective barrier, mountain forge background with anvil glow, the shield dominating the entire composition,`,
  },
  {
    id: "contraataque_tactico",
    name: "Contraataque Táctico",
    category: "Ataque",
    prompt: `A draenei vindicator in silver plate armor executing a devastating counter-thrust with a glowing crystal-tipped spear, their body twisted in a dynamic reversal from defensive to offensive, a shattered enemy blade flying away from the deflected parry, blue holy energy crackling along the spear shaft, the thrust aimed at an unseen enemy's exposed flank, marble battlement background at golden hour, motion blur on the spear tip,`,
  },
];

async function main() {
  const zai = await ZAI.create();
  const outDir = path.join(process.cwd(), 'public', 'cards');
  
  for (const card of CARDS) {
    const outPath = path.join(outDir, `${card.id}.png`);
    const fullPrompt = `${card.prompt} ${BASE_PROMPT}`;
    console.log(`🎨 Generating: ${card.name}...`);
    try {
      const response = await zai.images.generations.create({ prompt: fullPrompt, size: '864x1152' });
      const buffer = Buffer.from(response.data[0].base64, 'base64');
      fs.writeFileSync(outPath, buffer);
      console.log(`✅ ${card.name} → ${outPath} (${(buffer.length / 1024).toFixed(0)} KB)`);
    } catch (err: any) { console.error(`❌ ${card.name} — ${err.message}`); }
    await new Promise(r => setTimeout(r, 1000));
  }
}

main().catch(console.error);
