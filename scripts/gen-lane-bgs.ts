import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';

/**
 * Generate lane background images for the GUERRERO class.
 * Each lane has its own subtype (armas / proteccion / furia) and gets a
 * thematically matching background.
 *
 * For other classes (Mago, Asesino, etc.) we'd generate different images
 * here — keyed by `(classId, subtype)` — but right now only Guerrero is
 * playable.
 *
 * Design pattern compliant (scripts/design-pattern.md):
 * - Stylized realism, Hearthstone/WoW TCG/Blizzard concept art
 * - Visible brush strokes, NOT photorealistic
 * - NO text anywhere
 */

const LANE_BGS: { id: string; outPath: string; prompt: string }[] = [
  {
    id: 'armas',
    outPath: '/home/z/my-project/public/menu/lane-armas.png',
    prompt: [
      // Style anchor
      'stylized realism digital painting, hand-painted, Hearthstone card art style,',
      'World of Warcraft TCG illustration, Blizzard Entertainment concept art,',
      'realistic proportions and lighting but with painterly brushwork visible,',
      'dramatic high-contrast lighting, vibrant saturated colors,',
      'NOT photorealistic, NOT anime, NOT 3D render',
      // Subject: weapons armory lane background
      'tactical card game LANE background, vertical portrait composition',
      'interior of a medieval war armory wall, racks of polished swords, axes, maces,',
      'glinting steel blades catching warm amber torchlight,',
      'wrought iron weapon holders and leather straps holding the arsenal,',
      'a few ornate war banners hanging faded between the racks,',
      'warm crimson and amber palette with deep black shadows,',
      'mist and dust particles drifting in the torchlight shafts',
      // Composition
      'vertical portrait composition, atmospheric depth,',
      'empty negative space in the middle for card placement,',
      'rich deep blacks at the edges, warm amber glow concentrated in the midground,',
      // STRICT no-text
      'absolutely no text anywhere in the image',
      'no letters, no words, no alphabet, no writing, no symbols, no glyphs',
      'no signage, no inscriptions, no labels, no captions, no watermark',
      // Quality
      'professional concept art, ArtStation featured quality, cinematic depth of field',
    ].join(', '),
  },
  {
    id: 'proteccion',
    outPath: '/home/z/my-project/public/menu/lane-proteccion.png',
    prompt: [
      // Style anchor
      'stylized realism digital painting, hand-painted, Hearthstone card art style,',
      'World of Warcraft TCG illustration, Blizzard Entertainment concept art,',
      'realistic proportions and lighting but with painterly brushwork visible,',
      'dramatic high-contrast lighting, vibrant saturated colors,',
      'NOT photorealistic, NOT anime, NOT 3D render',
      // Subject: shields/armor protection lane
      'tactical card game LANE background, vertical portrait composition',
      'interior of a medieval armory wall lined with heavy iron shields and breastplates,',
      'rows of tower shields bearing faded heraldic crests,',
      'chainmail and plate armor hanging on hooks catching warm torchlight,',
      'a few dented and battle-worn helms stacked below,',
      'cool steel-blue tones mixed with warm amber torchlight rim,',
      'deep black shadows in the corners',
      // Composition
      'vertical portrait composition, atmospheric depth,',
      'empty negative space in the middle for card placement,',
      'rich deep blacks at the edges, cool steel highlights in the midground,',
      // STRICT no-text
      'absolutely no text anywhere in the image',
      'no letters, no words, no alphabet, no writing, no symbols, no glyphs',
      'no signage, no inscriptions, no labels, no captions, no watermark',
      // Quality
      'professional concept art, ArtStation featured quality, cinematic depth of field',
    ].join(', '),
  },
  {
    id: 'furia',
    outPath: '/home/z/my-project/public/menu/lane-furia.png',
    prompt: [
      // Style anchor
      'stylized realism digital painting, hand-painted, Hearthstone card art style,',
      'World of Warcraft TCG illustration, Blizzard Entertainment concept art,',
      'realistic proportions and lighting but with painterly brushwork visible,',
      'dramatic high-contrast lighting, vibrant saturated colors,',
      'NOT photorealistic, NOT anime, NOT 3D render',
      // Subject: berserker fury lane
      'tactical card game LANE background, vertical portrait composition',
      'abstract berserker rage battlefield scene, swirling crimson smoke and embers,',
      'silhouette of a muscular berserker warrior screaming in fury in the deep background,',
      'glowing cracks of magma and pools of blood on a scorched earth floor,',
      'swirling storm of ash and red sparks rising upward,',
      'intense crimson and orange palette with deep black voids,',
      'visceral motion and aggressive energy in the composition',
      // Composition
      'vertical portrait composition, atmospheric depth,',
      'empty negative space in the middle for card placement,',
      'rich deep blacks at the edges, intense crimson glow concentrated in the midground,',
      // STRICT no-text
      'absolutely no text anywhere in the image',
      'no letters, no words, no alphabet, no writing, no symbols, no glyphs',
      'no signage, no inscriptions, no labels, no captions, no watermark',
      // Quality
      'professional concept art, ArtStation featured quality, cinematic depth of field',
    ].join(', '),
  },
];

async function main() {
  const zai = await ZAI.create();
  for (const lane of LANE_BGS) {
    console.log(`Generating lane bg: ${lane.id}...`);
    const response = await zai.images.generations.create({
      prompt: lane.prompt,
      size: '768x1344',
    });
    const imageBase64 = response.data[0].base64;
    const buffer = Buffer.from(imageBase64, 'base64');
    fs.writeFileSync(lane.outPath, buffer);
    console.log(`  ✓ ${lane.id} (${buffer.length} bytes) → ${lane.outPath}`);
  }
  console.log('\nAll 3 lane backgrounds generated.');
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
