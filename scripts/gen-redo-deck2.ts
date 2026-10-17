import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const BASE_PROMPT = `Stylized realism, visible brushstrokes, NOT photorealistic, NOT 3D render, full art no borders no frame full bleed, Hearthstone card art style, vibrant saturated colors reflecting the scene's theme, dramatic lighting with strong rim light, high contrast, epic heroic mood, Blizzard Entertainment concept art, flat color zones in shadows, exaggerated heroic proportions, fantasy card game illustration, NO text in image.`;

const CARDS = [
  {
    id: "gran_escudo_del_bastion",
    name: "Gran Escudo del Bastión",
    prompt: `A battered ancient tower shield made of thick layered oak planks reinforced with rusted iron bands and heavy rivets, the shield is the visual focus — covered in battle scars, dents, and old enemy weapon fragments embedded in its surface, moss growing in the cracks, a small hunched goblin tinkerer with greasy leather apron and goggles trying to repair it with a hammer, scraps and broken tools scattered at its base, dark underground workshop with lantern light, the shield dominating the entire composition, weathered and worn NOT shiny NOT polished,`,
  },
  {
    id: "contraataque_tactico",
    name: "Contraataque Táctico",
    prompt: `A scarred orc gladiator in worn leather armor with exposed muscles and tribal war paint doing a vicious counterattack, pivoting from a defensive crouch to drive a chipped notched short-sword upward into an enemy's exposed armpit gap, the enemy's shattered blade flying away from the parried attack, blood and dirt on the orc's skin, broken sandal straps, crude bone amulet swinging, dusty arena background with broken pillars and scattered sand, NO plate armor NO shiny steel, brutal and raw fighting style,`,
  },
];

async function main() {
  const zai = await ZAI.create();
  const outDir = path.join(process.cwd(), 'public', 'cards');
  for (const card of CARDS) {
    const outPath = path.join(outDir, `${card.id}.png`);
    console.log(`🎨 Generating: ${card.name}...`);
    try {
      const response = await zai.images.generations.create({ prompt: `${card.prompt} ${BASE_PROMPT}`, size: '864x1152' });
      const buffer = Buffer.from(response.data[0].base64, 'base64');
      fs.writeFileSync(outPath, buffer);
      try { require('child_process').execSync(`python3 -c "from PIL import Image; Image.open('${outPath}').save('${outPath}','PNG')"`, { timeout: 10000 }); } catch {}
      console.log(`✅ ${card.name} (${(fs.statSync(outPath).size / 1024).toFixed(0)} KB)`);
    } catch (err: any) { console.error(`❌ ${card.name} — ${err.message}`); }
    await new Promise(r => setTimeout(r, 1000));
  }
}
main().catch(console.error);
