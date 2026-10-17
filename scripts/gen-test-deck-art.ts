import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

// Base prompt suffix for ALL card art (from design-pattern.md)
const BASE_PROMPT = `Stylized realism, visible brushstrokes, NOT photorealistic, NOT 3D render, full art no borders no frame full bleed, Hearthstone card art style, vibrant saturated colors reflecting the scene's theme, dramatic lighting with strong rim light, high contrast, epic heroic mood, Blizzard Entertainment concept art, flat color zones in shadows, exaggerated heroic proportions, fantasy card game illustration, NO text in image.`;

// Mazo de Prueba V2 — 12 cartas (keywords 2026-10)
const CARDS = [
  {
    id: "mandoble_quebrantamuros",
    name: "Mandoble Quebrantamuros",
    prompt: `A colossal two-handed greatsword smashing through an ornate enemy breastplate, armor plates exploding outward in metal shards, the blade edge glowing white-hot, a dwarf in heavy plate armor swinging with both hands, motion blur on the blade, shattered shield fragments flying toward the camera, dramatic close-up, dark fortress wall background,`,
  },
  {
    id: "espada_duelista",
    name: "Espada del Duelista",
    prompt: `A lone elf duelist standing in an empty stone arena, slender glowing longsword raised in challenge, solitary heroic stance, empty dueling circle with scattered sand around their feet, a single dramatic shaft of light illuminating the duelist, perfect one-versus-one composition, focused calm expression,`,
  },
  {
    id: "amoladora_campamento",
    name: "Amoladora de Campamento",
    prompt: `A battle-worn grinding wheel showering orange sparks onto a notched sword blade, strong armored hands holding the blade against the spinning stone, military camp at dusk in the background with tents and war banners, embers rising into the air, warm firelight glow, sense of relentless sharpening and growth,`,
  },
  {
    id: "cuerno_guerra",
    name: "Cuerno de Guerra",
    prompt: `A massive curved war horn made of dark bronze blowing visible golden sound-ring shockwaves into the air, armored warriors in the background standing taller and raising their weapons in response, banner poles and spears silhouetted against the sky, epic low angle composition, golden hour light,`,
  },
  {
    id: "adarga_centinela",
    name: "Adarga del Centinela",
    prompt: `A round leather-and-steel shield held by a vigilant sentinel, the shield surface glowing faint blue with protective runes, enemy arrows bouncing off it in a shower of sparks, the sentinel in half-plate armor braced behind it, watchtower and night sky background, cool moonlight on steel,`,
  },
  {
    id: "estandarte_cohorte",
    name: "Estandarte de la Cohorte",
    prompt: `A military standard bearer raising a tall war banner with a glowing azure sigil, waves of protective blue light flowing from the banner onto surrounding armored soldiers who raise their shields, radiant barrier energy arcing between shields, heroic triangular composition, battlefield at dawn,`,
  },
  {
    id: "oracion_bastion",
    name: "Oración del Bastión",
    prompt: `A paladin with both hands raised channeling cleansing golden-white light downward onto kneeling wounded soldiers, dark corruption smoke lifting off their armor and dissipating into the air, cathedral light beams breaking through storm clouds, serene powerful expression, floating holy energy particles,`,
  },
  {
    id: "martillo_veterano",
    name: "Martillo del Veterano",
    prompt: `A grizzled scarred veteran raising a heavy war hammer, tapping a young recruit's shoulder plate with glowing amber award-light, the young soldier standing straighter with renewed vigor and determination, warm amber light connecting both figures, campfire glow, mentor-and-recruit composition,`,
  },
  {
    id: "berserker_recluta",
    name: "Berserker Recluta",
    prompt: `A young orc recruit charging forward with escalating momentum, multiple motion after-images trailing behind, tusks bared in a wild battle grin, axe trailing red energy streaks, full accelerating sprint pose, red war paint streaks on the face, dust kicking up from the battlefield ground,`,
  },
  {
    id: "colmillo_verdugo",
    name: "Colmillo del Verdugo",
    prompt: `A hooded executioner wielding a curved fang-shaped dagger poised to strike a weakened kneeling enemy, cold calculating eyes glowing under the hood, the cruel blade dripping with crimson energy, dramatic hard shadow play, single dark dungeon light from above, merciless predatory mood,`,
  },
  {
    id: "hacha_ejecucion",
    name: "Hacha de Ejecución",
    prompt: `A massive executioner's axe raised high above a defeated enemy kneeling at the block, the axe blade gleaming with a final-edge white light, grim executioner in dark leathers, sparks of fate energy arcing around the axe head, dramatic top-down angle, storm clouds parting in a single beam of light,`,
  },
  {
    id: "veterano_caido",
    name: "Veterano Caído",
    prompt: `A fallen elderly warrior lying on a battlefield passing his glowing sword upward into a younger soldier's hand, warm golden light flowing from the dying veteran into the young successor, solemn heroic passing-the-torch moment, sunset battlefield background, other soldiers saluting with lowered heads,`,
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
        size: '864x1152',
      });

      if (!response.data || !response.data[0] || !response.data[0].base64) {
        throw new Error('No image data in response');
      }

      const buffer = Buffer.from(response.data[0].base64, 'base64');
      fs.writeFileSync(outPath, buffer);
      console.log(`✅ ${card.name} → ${outPath} (${(buffer.length / 1024).toFixed(0)} KB)`);
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
