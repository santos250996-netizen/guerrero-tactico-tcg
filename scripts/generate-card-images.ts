import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

interface CardImageSpec {
  id: string;
  prompt: string;
}

const CARD_IMAGES: CardImageSpec[] = [
  {
    id: 'golpe_heroico',
    prompt:
      'An epic fantasy TCG card art of a fierce Orc warrior delivering a powerful, glowing orange overhead strike with a giant battleaxe, dynamic motion blur, fiery sparks, dark epic background.',
  },
  {
    id: 'seccionar',
    prompt:
      'World of Warcraft style TCG card illustration of a nimble warrior slicing low with a sharp broadsword, swift silver blade trail, detailed armor, combat action scene.',
  },
  {
    id: 'machaque_mortal',
    prompt:
      'High fantasy TCG card art depicting a brutal Tauren warrior crushing the ground with a massive two-handed weapon, dust and rock debris flying, epic cinematic lighting.',
  },
  {
    id: 'ejecutar',
    prompt:
      'Epic TCG illustration of a battle-scarred warrior thrusting a glowing red-hot sword forward for a finishing blow, intense dark atmosphere, dramatic shadows.',
  },
  {
    id: 'bloqueo_escudo',
    prompt:
      'World of Warcraft style TCG art showing a heavily armored warrior holding a massive steel tower shield that blocks incoming magical sparks, sturdy defense pose.',
  },
  {
    id: 'muro_escudos',
    prompt:
      'Fantasy card game artwork featuring a line of dwarven shields glowing with blue defensive magic runic barriers, impenetrable wall, epic composition.',
  },
  {
    id: 'pocion_vida',
    prompt:
      "Detailed TCG item card illustration of a glowing red health potion flask resting on a stone table inside a warrior's armory, magical healing smoke.",
  },
  {
    id: 'provocar',
    prompt:
      'Intense TCG card art of an angry warrior shouting fiercely, beating his chest armor, surrounded by dark menacing battleground aura, taunting expression.',
  },
  {
    id: 'ira_rabiosa',
    prompt:
      "Fantasy TCG illustration of a warrior's eyes glowing with fierce crimson rage, veins pulsing with fiery red energy, berserker mood, dark background.",
  },
  {
    id: 'grito_batalla',
    prompt:
      'World of Warcraft style card art showing a mighty war leader roaring on a cliff, visible magical soundwaves spreading outward, inspiring allies.',
  },
  {
    id: 'filotormenta',
    prompt:
      'Dynamic TCG card illustration of a warrior spinning rapidly in a deadly whirlwind of steel and sharp blades, metallic sparks flying in a circle, epic action.',
  },
  {
    id: 'avatar_titan',
    prompt:
      'Masterpiece legendary TCG card art of a warrior glowing with divine titan energy, surrounded by floating spectral weapons and golden light, awe-inspiring presence.',
  },
];

async function main() {
  const outputDir = '/home/z/my-project/public/cards';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`Generating ${CARD_IMAGES.length} card images into ${outputDir}...`);
  const zai = await ZAI.create();

  const results: { id: string; status: 'ok' | 'skip' | 'err'; error?: string }[] = [];

  for (const spec of CARD_IMAGES) {
    const outPath = path.join(outputDir, `${spec.id}.png`);
    // Skip if already exists (idempotent re-runs)
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1024) {
      console.log(`[skip] ${spec.id} (already exists)`);
      results.push({ id: spec.id, status: 'skip' });
      continue;
    }

    try {
      console.log(`[gen ] ${spec.id} ...`);
      const response = await zai.images.generations.create({
        prompt: spec.prompt,
        size: '1024x1024',
      });
      const b64 = response?.data?.[0]?.base64;
      if (!b64) {
        throw new Error('No base64 in response');
      }
      const buffer = Buffer.from(b64, 'base64');
      fs.writeFileSync(outPath, buffer);
      const sizeKb = Math.round(buffer.length / 1024);
      console.log(`[ok  ] ${spec.id} -> ${outPath} (${sizeKb}KB)`);
      results.push({ id: spec.id, status: 'ok' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[err ] ${spec.id}: ${msg}`);
      results.push({ id: spec.id, status: 'err', error: msg });
    }
  }

  const ok = results.filter((r) => r.status === 'ok').length;
  const skip = results.filter((r) => r.status === 'skip').length;
  const err = results.filter((r) => r.status === 'err').length;
  console.log(`\nDone. Generated: ${ok}, Skipped: ${skip}, Errors: ${err}`);
  if (err > 0) {
    console.log('Errors:');
    for (const r of results.filter((r) => r.status === 'err')) {
      console.log(`  ${r.id}: ${r.error}`);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
