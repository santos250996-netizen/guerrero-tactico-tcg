import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Full spec in scripts/design-pattern.md
// Banners de carril V3: entorno atmosférico por spec (sin personajes, sin texto).
// Pipeline: generate 864x1152 → sharp cover-crop → 768x1344 (match lane-*.png existentes)
const GEN_SIZE = '864x1152' as const;
const TARGET_W = 768;
const TARGET_H = 1344;

const BASE_PROMPT = `Stylized realism, visible brushstrokes, NOT photorealistic, NOT 3D render, epic environment concept art, Hearthstone board art style, vibrant saturated colors, dramatic lighting with strong rim light, high contrast, epic heroic mood, Blizzard Entertainment concept art, vertical composition, no characters, no people, no creatures, NO text in image.`;

const BANNERS = [
  {
    id: "arcana",
    prompt: `A colossal arcane observatory interior with floating glowing runes and a giant violet crystal suspended mid-air, streams of purple mana spiraling upward like inverted rain, spiraling staircases leading into open starlight, constellations visible through a shattered dome, saturated violet and indigo palette, sense of overwhelming magical knowledge converging,`,
  },
  {
    id: "fuego",
    prompt: `A volcanic battlefield at the height of an eruption, rivers of molten lava flowing between scorched siege engines and broken war banners, an ember storm filling the entire sky, heat distortion rising from cracked obsidian ground, saturated orange and red palette with white-hot highlights, pure destructive power,`,
  },
  {
    id: "hielo",
    prompt: `A frozen citadel plateau under a relentless blizzard, giant translucent ice formations and a half-buried frozen fortress with icicles like swords, wind-sculpted snowdrifts, faint aurora glowing above, pale blue and white palette with cyan crystal translucency, merciless beautiful cold,`,
  },
  {
    id: "veneno",
    prompt: `A swamp war camp consumed by luminous toxic green mist, giant broken cauldrons leaking glowing venom into black stagnant water, corrupted vegetation pulsing with sickly light, bubbles rising through green sludge, lime green against deep rot browns and blacks, creeping contagion atmosphere,`,
  },
  {
    id: "combate",
    prompt: `A war-worn training arena at dawn, weapon racks with notched functional steel, scarred wooden barricades pockmarked by a thousand real fights, dust rising from endless drills, torn red banners and mud, warm neutral palette with deep red accents, earned skill and hard discipline, no magic anywhere,`,
  },
  {
    id: "sigilo",
    prompt: `Medieval city rooftops under a thin crescent moon, deep indigo shadows pooling between chimneys and bell towers, a single distant window glowing warm, low mist hugging the clay tiles, laundry lines and gargoyles silhouetted, everything suggesting hidden movement just out of sight, indigo and black palette with one accent of moonlight,`,
  },
];

async function main() {
  const zai = await ZAI.create();
  const outDir = path.join(process.cwd(), 'public', 'menu');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  let ok = 0, fail = 0;

  for (const banner of BANNERS) {
    const outPath = path.join(outDir, `lane-${banner.id}.png`);
    if (fs.existsSync(outPath)) {
      console.log(`⏭️  lane-${banner.id} — already exists, skipping`);
      ok++;
      continue;
    }

    const fullPrompt = `${banner.prompt} ${BASE_PROMPT}`;
    console.log(`🎨 Generating lane-${banner.id}...`);

    try {
      const response = await zai.images.generations.create({ prompt: fullPrompt, size: GEN_SIZE });
      if (!response.data?.[0]?.base64) throw new Error('No image data in response');

      const raw = Buffer.from(response.data[0].base64, 'base64');
      const buffer = await sharp(raw)
        .resize(TARGET_W, TARGET_H, { fit: 'cover', position: 'centre', kernel: 'lanczos3' })
        .png({ compressionLevel: 9 })
        .toBuffer();
      fs.writeFileSync(outPath, buffer);
      console.log(`✅ lane-${banner.id}.png ${TARGET_W}x${TARGET_H} (${(buffer.length / 1024).toFixed(0)} KB)`);
      ok++;
    } catch (err: any) {
      console.error(`❌ lane-${banner.id} — ${err.message}`);
      fail++;
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n${ok}/${BANNERS.length} banners, ${fail} failed`);
}

main().catch(console.error);
