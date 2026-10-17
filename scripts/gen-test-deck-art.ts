import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Full spec in scripts/design-pattern.md
// Pipeline: generate 864x1152 -> downscale LANCZOS to 432x576 (cards display at max 224px)
const GEN_SIZE = '864x1152' as const;
const TARGET_W = 432;
const TARGET_H = 576;

// Base prompt suffix for ALL card art (from design-pattern.md)
const BASE_PROMPT = `Stylized realism, visible brushstrokes, NOT photorealistic, NOT 3D render, full art no borders no frame full bleed, Hearthstone card art style, vibrant saturated colors reflecting the scene's theme, dramatic lighting with strong rim light, high contrast, epic heroic mood, Blizzard Entertainment concept art, flat color zones in shadows, exaggerated heroic proportions, fantasy card game illustration, NO text in image.`;

// Mazo de Prueba V2 — 12 cartas (keywords 2026-10)
const CARDS = [
  {
    id: "mandoble_quebrantamuros",
    name: "Mandoble Quebrantamuros",
    prompt: `A battle-scarred dwarf in dented plate armor swinging a colossal two-handed greatsword at the very climax of impact, the blade piercing straight through a glowing blue enemy barrier as if it did not exist, the strongest most imposing enemy champion having his ornate breastplate split open with plates exploding outward, metal shards flying toward the camera, motion blur on the blade, dark fortress wall background,`,
  },
  {
    id: "espada_duelista",
    name: "Espada del Duelista",
    prompt: `A single blood elf duelist utterly alone in a vast empty stone arena at dawn, absolutely no one else in view, her slender longsword just beginning to glow with the first surge of morning power, the first ray of sunrise crossing the blade edge, heroic solitary stance in an empty sand dueling circle, the vast emptiness of the arena emphasizing that she is the only card on the field,`,
  },
  {
    id: "amoladora_campamento",
    name: "Amoladora de Campamento",
    prompt: `A massive grinding wheel dominating the frame as the true protagonist, showering golden sparks onto a notched sword blade held by strong armored hands, every spark making the edge visibly brighter than the last pass, embers accumulating and rising like power being added stroke by stroke, first light of dawn over a military camp with tents and war banners in the background, the item larger and more detailed than the figures,`,
  },
  {
    id: "cuerno_guerra",
    name: "Cuerno de Guerra",
    prompt: `A tauren warrior blowing a massive curved dark bronze war horn at dusk, one expanding golden sound-wave washing simultaneously over an entire formation of armored warriors, every single soldier in the line empowered by the same wave at once, all standing taller with weapons raised, banner poles and spears silhouetted against a sunset sky, the effect at its full apex as the day closes,`,
  },
  {
    id: "adarga_centinela",
    name: "Adarga del Centinela",
    prompt: `A vigilant night elf sentinel braced behind a round leather-and-steel shield, a fresh translucent blue barrier just materializing around her body, the barrier marked with exactly three glowing rune segments like a finite charge meter waiting to be spent, enemy arrows frozen mid-air against it in showers of sparks, watchtower and moonlit night sky background, cool moonlight on steel,`,
  },
  {
    id: "estandarte_cohorte",
    name: "Estandarte de la Cohorte",
    prompt: `A tall war banner with a glowing azure sigil as the dominant centerpiece held high by a human standard bearer, waves of protective blue light flowing outward to several surrounding allies who each receive their own newly formed translucent shield, the bearer himself standing exposed without a shield of his own, protected by the cohort he serves, heroic triangular composition, battlefield at dawn,`,
  },
  {
    id: "oracion_bastion",
    name: "Oración del Bastión",
    prompt: `A draenei priestess with both hands raised at first light, ribbons of dark corruption smoke being visibly pulled out of kneeling wounded soldiers and dissolving into the morning air, clean golden dawn light flowing in to replace everything the smoke carries away, accumulated debuffs lifting off the armor with the smoke, serene powerful expression, cathedral light rays breaking through storm clouds,`,
  },
  {
    id: "martillo_veterano",
    name: "Martillo del Veterano",
    prompt: `A towering scarred orc veteran in battered plate armor tapping the glowing amber head of his war hammer onto the smallest most battered young recruit in the line, the frail underdog straightening up as fresh power visibly flows into him, stark contrast between the mighty giver and the weakest receiver, warm amber light connecting both figures at the moment of transfer, campfire glow,`,
  },
  {
    id: "berserker_recluta",
    name: "Berserker Recluta",
    prompt: `A young orc berserker in red war paint, bare tattooed muscles and crude leather straps with bone trophies, charging at full sprint with multiple trailing motion after-images behind him, each ghostly echo representing another card played before this one, red energy streaks growing with every step of accumulated momentum, dust exploding from the ground, no metal armor at all, raw escalating fury,`,
  },
  {
    id: "colmillo_verdugo",
    name: "Colmillo del Verdugo",
    prompt: `A gaunt troll executioner adorned with bone trophies and crude leather wraps crouching at dusk, cold calculating eyes locked on the weakest wounded enemy already slumped and faltering before him, his curved fang-shaped dagger dripping crimson energy, the patient predator closing the day by claiming the easiest prey, hard shadow play, single dying light from above, merciless mood, no metal armor,`,
  },
  {
    id: "hacha_ejecucion",
    name: "Hacha de Ejecución",
    prompt: `A hulking worgen executioner in raw furs and old scars raising a crude massive axe at the very climax of the final swing, an already defeated weak enemy kneeling powerless at the block, far too feeble to resist the killing blow, the axe edge flashing with white final-strike energy, dust and fate sparks arcing around the blade, dramatic top-down angle, storm clouds parting in a single beam of light, no polished armor,`,
  },
  {
    id: "veterano_caido",
    name: "Veterano Caído",
    prompt: `A mortally wounded elderly orc warrior in crude furs and bone ornaments lying defeated on the battlefield just after the fatal blow, his glowing sword and golden life essence flowing upward into the hands of the weakest young survivor kneeling beside him, death becoming a transfer of power, warm sunset light, other warriors saluting with lowered heads around the fallen, no polished armor,`,
  },
];

async function main() {
  const zai = await ZAI.create();
  const outDir = path.join(process.cwd(), 'public', 'cards');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  let ok = 0;
  let fail = 0;

  for (const card of CARDS) {
    const outPath = path.join(outDir, `${card.id}.png`);

    if (fs.existsSync(outPath)) {
      console.log(`⏭️  ${card.name} — already exists, skipping`);
      ok++;
      continue;
    }

    const fullPrompt = `${card.prompt} ${BASE_PROMPT}`;
    console.log(`🎨 Generating: ${card.name} (${card.id})...`);

    try {
      const response = await zai.images.generations.create({
        prompt: fullPrompt,
        size: GEN_SIZE,
      });

      if (!response.data || !response.data[0] || !response.data[0].base64) {
        throw new Error('No image data in response');
      }

      const raw = Buffer.from(response.data[0].base64, 'base64');
      // design-pattern.md: downscale to 432x576 with LANCZOS3 before saving
      const buffer = await sharp(raw)
        .resize(TARGET_W, TARGET_H, { kernel: 'lanczos3' })
        .png({ compressionLevel: 9 })
        .toBuffer();
      fs.writeFileSync(outPath, buffer);
      console.log(`✅ ${card.name} → ${outPath} 432x576 (${(buffer.length / 1024).toFixed(0)} KB)`);
      ok++;
    } catch (err: any) {
      console.error(`❌ ${card.name} — ${err.message}`);
      fail++;
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n${ok}/${CARDS.length} generated, ${fail} failed`);
}

main().catch(console.error);
