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
    'Dark fantasy tactical card game main menu background',
    'grimdark medieval war banners and crossed swords',
    'cracked blood-red battlefield ground with embers floating',
    'ancient warhorn and tattered war flag silhouettes',
    'ominous crimson and amber glow at the horizon',
    'smoke and ash particles drifting through the air',
    'dramatic chiaroscuro lighting from below',
    'highly detailed digital painting',
    'no text, no letters, no words, no typography',
    'empty negative space in the upper third for title overlay',
    'vertical portrait composition, atmospheric depth',
    'cinematic war tableau, deep blacks and gold accents',
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
