import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

// Base prompt suffix for ALL card art (from design-pattern.md)
const BASE_PROMPT = `Stylized realism, visible brushstrokes, NOT photorealistic, NOT 3D render, full art no borders no frame full bleed, Hearthstone card art style, vibrant saturated colors reflecting the scene's theme, dramatic lighting with strong rim light, high contrast, epic heroic mood, Blizzard Entertainment concept art, flat color zones in shadows, exaggerated heroic proportions, fantasy card game illustration, NO text in image.`;

// Deck 1: FURIA DE SANGRE — 12 cards
const CARDS = [
  {
    id: "tajo_frenetico",
    name: "Tajo Frenético",
    category: "Ataque",
    subtypes: ["furia"],
    prompt: `A blood-crazed orc warrior swinging a massive jagged cleaver in a frenzied overhead slash, motion blur on the blade, blood splatter arcing through the air, the orc's eyes glowing red with battle rage, muscles tensed, dynamic low-angle action shot, dark battlefield background with embers flying,`,
  },
  {
    id: "llamado_de_sangre",
    name: "Llamado de Sangre",
    category: "Acción",
    subtypes: ["furia"],
    prompt: `A blood elf paladin raising a glowing crimson banner high into the air, shouting a battle cry, red energy swirling around them, veins of red light pulsing through their armor, dramatic upward camera angle, battlefield horizon behind, other soldiers rallying in the background,`,
  },
  {
    id: "corte_desgarrador",
    name: "Corte Desgarrador",
    category: "Ataque",
    subtypes: ["armas", "furia"],
    prompt: `First person view of a massive serrated greatsword cleaving downward through an enemy shield, the blade covered in glowing red runes, shards of the shield exploding outward, a fallen comrade's silhouette visible at the edge of the frame suggesting sacrifice, dark stone arena background, sparks flying,`,
  },
  {
    id: "grito_de_desafio",
    name: "Grito de Desafío",
    category: "Acción",
    subtypes: ["furia"],
    prompt: `A tauren berserker standing defiantly on a hill, arms wide open roaring a challenge to the sky, red shockwave rippling outward from their mouth, enemies visible in the distant valley below outnumbering them, storm clouds gathering, lightning crackling around the tauren's horns, defiant heroic stance,`,
  },
  {
    id: "amuleto_de_frenesi",
    name: "Amuleto de Frenesí",
    category: "Ítem",
    subtypes: ["furia"],
    prompt: `A goblin shaman holding up a pulsating blood-red amulet pendant, the amulet is the visual focus — a jagged crimson crystal radiating red energy veins, the goblin's face illuminated by its glow, tribal fur-markings on the pendant's chain, dark ritual cave background, the amulet larger and more detailed than the character,`,
  },
  {
    id: "rito_de_colera",
    name: "Rito de Cólera",
    category: "Acción",
    subtypes: ["furia", "proteccion"],
    prompt: `An undead death knight performing a dark blood ritual, kneeling before a crimson altar, drawing a glowing red rune in the air with a skeletal hand, a shield bearing broken on the ground beside them, ghostly red spirits swirling upward, dark cathedral ruins background, red mist,`,
  },
  {
    id: "masacre_brutal",
    name: "Masacre Brutal",
    category: "Ataque",
    subtypes: ["armas", "furia"],
    prompt: `A worgen (werewolf) warrior in mid-leap with dual bloody axes, one axe buried in an enemy's shield while the other swings for the kill, fangs bared in a savage snarl, blood trails in the air, the worgen's fur matted with blood, chaotic battlefield background with bodies,`,
  },
  {
    id: "pocion_de_colera",
    name: "Poción de Cólera",
    category: "Ítem",
    subtypes: ["furia"],
    prompt: `A troll witch doctor holding a bubbling flask of glowing red-orange potion, the potion is the visual focus — swirling liquid with visible energy sparks inside, smoke rising from the neck, the troll's hand detailed with tribal markings, dark jungle altar background, the potion flask larger and brighter than the character,`,
  },
  {
    id: "carga_incontenible",
    name: "Carga Incontenible",
    category: "Ataque",
    subtypes: ["furia"],
    prompt: `A massive tauren charger barreling forward with a war-staff, dust and debris flying from the charge impact, enemies being thrown aside, the tauren's eyes blazing with unstoppable fury, motion lines suggesting incredible speed, canyon battlefield background, red dust cloud,`,
  },
  {
    id: "golpe_demoledor",
    name: "Golpe Demoledor",
    category: "Ataque",
    subtypes: ["armas", "furia"],
    prompt: `An orc warrior bringing down a massive war-hammer in a devastating overhead smash, the impact creating a shockwave crater in the ground, debris and dust exploding outward, the orc's muscles bulging with primal rage, the hammer glowing with red crackling energy, dark fortress wall background,`,
  },
  {
    id: "totem_sangriento",
    name: "Tótem Sangriento",
    category: "Ítem",
    subtypes: ["furia", "proteccion"],
    prompt: `A towering blood-red totem pole carved with tribal fur-markings and protective runes, the totem is the visual focus — covered in dripping crimson energy, a small orc shaman kneeling at its base in prayer, the totem radiating a protective red barrier dome, dark forest clearing background,`,
  },
  {
    id: "decreto_de_masacre",
    name: "Decreto de Masacre",
    category: "Acción",
    subtypes: ["armas", "furia"],
    prompt: `A darkfallen blood elf warlord standing atop a pile of weapons and fallen enemies, unrolling a blood-stained decree scroll, red energy erupting from the scroll's runes, the warlord's eyes glowing crimson, dark throne room background with banners, the scroll radiating lethal intent,`,
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
    
    // Skip if image already exists
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

    // Small delay between generations
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n${ok}/${CARDS.length} generated, ${fail} failed`);
}

main().catch(console.error);
