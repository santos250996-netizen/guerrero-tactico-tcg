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
    // Subject + mood
    'dark fantasy tactical card game menu background, vertical portrait',
    'grimdark medieval battlefield at dusk with crimson and amber sky',
    // Visual elements (no text!)
    'cracked blood-red battlefield ground with floating embers and ash',
    'tattered war banners and silhouetted crossed spears in the distance',
    'smoke and dust drifting through the air',
    'dramatic chiaroscuro lighting from below, dramatic war tableau',
    // Composition constraints
    'empty negative space in the upper third of the frame for title overlay',
    'deep rich blacks and warm gold accents, atmospheric depth',
    'vertical portrait composition with vignette',
    // STRICT no-text directives (repeat to reinforce)
    'absolutely no text anywhere in the image',
    'no letters, no words, no alphabet, no writing, no symbols, no glyphs',
    'no signage, no inscriptions, no labels, no captions',
    'clean empty negative space, no watermark',
    // Quality
    'highly detailed digital painting, cinematic, professional concept art',
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
