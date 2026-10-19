import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';

/**
 * Generate the game launcher icon — 1024x1024 stylized realism crossed-swords emblem.
 * Anchor: design-pattern.md line 12-13, 61 (Stylized realism, Hearthstone/Blizzard style).
 * No text per design pattern.
 */
async function main() {
  const zai = await ZAI.create();

  const prompt = [
    // Style anchor — design-pattern.md
    'stylized realism digital painting, hand-painted, Hearthstone card art style,',
    'World of Warcraft TCG illustration, Blizzard Entertainment concept art,',
    'visible brush strokes, painterly, NOT photorealistic, NOT 3D render,',
    'dramatic high-contrast lighting, vibrant saturated colors, epic heroic mood,',
    // Subject — bold minimal emblem that scales well at small sizes
    'centered game logo emblem, two simple bold medieval broadswords crossed in an X shape,',
    'blades pointing downward, plain unadorned steel blades with no engravings,',
    'chunky gold crossguards and pommels, simple and bold silhouettes,',
    'high contrast between the bright steel and the gold accents,',
    'enclosed inside a thick chunky gold ring with NO engravings and NO runes,',
    'the ring is bold and simple with metallic gold highlights only,',
    // Background — solid dark so the emblem pops
    'background is a SOLID very dark crimson-to-near-black radial gradient,',
    'no flames, no clouds, no smoke, no decorative background elements,',
    'just a clean dark negative space that makes the gold emblem pop,',
    // Composition
    'perfectly centered, symmetrical, square format,',
    'the crossed-swords + ring emblem fills about 75% of the canvas,',
    'chunky bold shapes designed to remain readable at tiny sizes,',
    // STRICT no-text
    'absolutely no text, no letters, no words, no alphabet, no writing,',
    'no runes, no symbols, no glyphs, no inscriptions, no watermark',
    // Quality
    'professional logo design, crisp clean emblem, ArtStation featured quality',
  ].join(', ');

  console.log('Generating game launcher icon...');
  const response = await zai.images.generations.create({
    prompt,
    size: '1024x1024',
  });

  const imageBase64 = response.data[0].base64;
  const buffer = Buffer.from(imageBase64, 'base64');
  const outPath = '/home/z/my-project/assets-src/game-icon-1024.png';
  fs.writeFileSync(outPath, buffer);
  console.log(`Saved: ${outPath} (${buffer.length} bytes)`);
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
