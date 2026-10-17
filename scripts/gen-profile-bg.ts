import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';

/**
 * Generate the PROFILE screen background — distinct from the menu background
 * but visually coherent with the same stylized-realism brand.
 *
 * Theme: an armory / trophy hall — dark walls with crossed weapons, glowing
 * display cases with relics, torch fire casting warm amber light. Matches
 * the crossed-swords emblem of the game + reinforces the "commander reviewing
 * achievements" vibe of a profile screen.
 *
 * Design pattern compliance (scripts/design-pattern.md):
 * - Stylized realism, Hearthstone / WoW TCG / Blizzard concept art style
 * - Visible brush strokes, NOT photorealistic, NOT anime
 * - Vibrant saturated colors with dramatic rim light
 * - NO text anywhere in the image
 */
async function main() {
  const zai = await ZAI.create();

  const prompt = [
    // Style anchor — design-pattern.md
    'stylized realism digital painting, hand-painted, Hearthstone card art style,',
    'World of Warcraft TCG illustration, Blizzard Entertainment concept art,',
    'realistic proportions and lighting but with painterly brushwork visible,',
    'dramatic high-contrast lighting with strong rim light, vibrant saturated colors,',
    'NOT photorealistic, NOT anime, NOT 3D render',
    // Subject + mood
    'tactical card game PROFILE screen background, vertical portrait',
    'epic war armory / trophy hall interior at dusk',
    // Foreground elements (painterly, stylized-realism)
    'dark stone walls lined with crossed swords, ornate shields, and tattered war banners hanging from above',
    'glowing display cases along the walls containing ancient relics and captured war trophies',
    'wrought-iron wall torches casting warm amber rim light that flickers across the stone',
    'a heavy oak strategy table in the foreground silhouetted against the torchlight',
    'smoke drifting near the ceiling, dust particles floating in the warm light shafts',
    // Composition constraints
    'empty negative space in the upper third for title overlay',
    'rich deep blacks at the edges, warm amber and crimson glow concentrated in the midground',
    'vertical portrait composition with strong vignette',
    // STRICT no-text directives
    'absolutely no text anywhere in the image',
    'no letters, no words, no alphabet, no writing, no symbols, no glyphs',
    'no signage, no inscriptions, no labels, no captions, no runes',
    'clean empty negative space, no watermark',
    // Quality
    'professional concept art, ArtStation featured quality, cinematic depth of field',
  ].join(', ');

  console.log('Generating PROFILE background (armory / trophy hall)...');
  const response = await zai.images.generations.create({
    prompt,
    size: '768x1344',
  });

  const imageBase64 = response.data[0].base64;
  const buffer = Buffer.from(imageBase64, 'base64');
  const outPath = '/home/z/my-project/public/menu/profile-bg-raw.png';
  fs.writeFileSync(outPath, buffer);
  console.log(`Saved raw profile background: ${outPath} (${buffer.length} bytes)`);
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
