import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';

/**
 * Generate the main menu background for "Pacto de Guerra" TCG.
 * Dark grimdark tactical aesthetic with embossed title.
 * Portrait orientation (720x1440) to fit phone frame.
 */
async function main() {
  const zai = await ZAI.create();

  const prompt = [
    // Style anchor: stylized realism (Hearthstone / WoW TCG / Diablo IV splash art)
    'stylized realism digital painting, hand-painted cinematic splash art',
    'like Hearthstone card art, World of Warcraft TCG illustration, Diablo IV key art',
    'realistic proportions and lighting but with painterly brushwork visible',
    'dramatic high-contrast lighting with saturated warm color palette',
    'digital painting with visible brush strokes, not photorealistic, not anime',
    // Subject + mood
    'tactical card game main menu background, vertical portrait',
    'epic medieval battlefield at dusk under a crimson and gold sky',
    // Foreground elements (painterly, stylized-realism)
    'stylized realistic crossed battle banners and ornate spears silhouetted in the distance',
    'cracked earth battlefield with glowing ember particles floating upward',
    'drifting smoke and dust clouds catching warm rim light',
    // Composition constraints
    'empty negative space in the upper third of the frame for title overlay',
    'rich deep blacks at the edges, warm amber and crimson glow at the center',
    'vertical portrait composition with strong vignette',
    // STRICT no-text directives
    'absolutely no text anywhere in the image',
    'no letters, no words, no alphabet, no writing, no symbols, no glyphs',
    'no signage, no inscriptions, no labels, no captions',
    'clean empty negative space, no watermark',
    // Quality
    'professional concept art, ArtStation featured quality, cinematic depth of field',
  ].join(', ');

  console.log('Generating main menu background...');
  const response = await zai.images.generations.create({
    prompt,
    size: '768x1344',
  });

  const imageBase64 = response.data[0].base64;
  const buffer = Buffer.from(imageBase64, 'base64');
  const outPath = '/home/z/my-project/public/menu/main-bg.png';
  fs.writeFileSync(outPath, buffer);
  console.log(`Saved: ${outPath} (${buffer.length} bytes)`);
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
