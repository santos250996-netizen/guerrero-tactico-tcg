import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const BASE_PROMPT = `Stylized realism, visible brushstrokes, NOT photorealistic, NOT 3D render, full art no borders no frame full bleed, Hearthstone card art style, vibrant saturated colors reflecting the scene's theme, dramatic lighting with strong rim light, high contrast, epic heroic mood, Blizzard Entertainment concept art, flat color zones in shadows, exaggerated heroic proportions, fantasy card game illustration, NO text in image.`;

// Deck 2: FALANGE INEXPUGNABLE (Escudos y Control) — 12 cards
const CARDS = [
  {
    id: "estocada_defensiva",
    name: "Estocada Defensiva",
    category: "Ataque",
    prompt: `A draenei paladin in heavy silver plate armor thrusting a rapier forward from behind a tall kite shield, defensive stance, blue holy light radiating from the shield's crest, the thrust precise and controlled, battlefield background with allied soldiers in formation behind them, blue and silver color palette,`,
  },
  {
    id: "escudo_de_tilo",
    name: "Escudo de Tilo",
    category: "Ítem",
    prompt: `A dwarf warrior holding up a wooden round shield carved from tilo wood, the shield is the visual focus — intricately carved with protective runes glowing blue, reinforced with iron bands, the dwarf's thick arms gripping it, wooden hall background with weapon racks, the shield larger and more detailed than the character,`,
  },
  {
    id: "orden_de_cohesion",
    name: "Orden de Cohesión",
    category: "Acción",
    prompt: `A human commander raising a gleaming silver war-horn to their lips, blowing a rallying call, blue sound waves rippling outward, soldiers locking shields together in phalanx formation behind them, golden sunlight breaking through clouds, banners of the alliance flying,`,
  },
  {
    id: "embestida_con_escudo",
    name: "Embestida con Escudo",
    category: "Ataque",
    prompt: `A dark iron dwarf in heavy armor charging forward with a massive tower shield raised, the shield bash slamming into an enemy line, shockwave of blue energy on impact, the dwarf's feet digging trenches in the ground from the force, shield glowing with protective runes, stone corridor background,`,
  },
  {
    id: "vendas_reforzadas",
    name: "Vendas Reforzadas",
    category: "Ítem",
    prompt: `A night elf priestess unwinding glowing blue-white bandages from a spool, the bandages are the visual focus — woven with silver threads and protective sigils that shimmer with healing light, the priestess's hands detailed and gentle, moonlit temple garden background, the bandage spool larger and brighter than the character,`,
  },
  {
    id: "postura_inquebrantable",
    name: "Postura Inquebrantable",
    category: "Acción",
    prompt: `A tauren sunwalker standing in an immovable defensive stance, both feet planted wide, shield planted in the ground before them, blue barrier dome radiating from their body, enemies' attacks deflecting off the barrier harmlessly, calm unwavering expression, canyon pass background, golden hour lighting,`,
  },
  {
    id: "baluarte_de_la_aliananza",
    name: "Baluarte de la Alianza",
    category: "Ítem",
    prompt: `A human paladin kneeling before a massive silver-and-gold bulwark shield mounted on a stand, the shield is the visual focus — glowing with blue holy energy, carved with lion crests and protective runes, radiating a protective barrier dome, cathedral interior background with stained glass, the shield larger and more detailed than the character,`,
  },
  {
    id: "contraataque_tactico",
    name: "Contraataque Táctico",
    category: "Ataque",
    prompt: `A blood elf spellbreaker in silver armor executing a precise counter-thrust with a glowing runeblade, their shield deflecting an enemy spell in the background while the blade finds its mark, blue arcane energy crackling along the blade, motion blur on the thrust, elegant footwork, marble arena background,`,
  },
  {
    id: "maniobra_de_falange",
    name: "Maniobra de Falange",
    category: "Acción",
    prompt: `A column of dwarf warriors in heavy armor performing a synchronized shield-wall rotation, the front line stepping aside as the back line advances with shields locked, blue energy linking the shields together, tactical formation movement, underground forge-city background with molten metal glow,`,
  },
  {
    id: "gran_escudo_del_bastion",
    name: "Gran Escudo del Bastión",
    category: "Ítem",
    prompt: `A gnome tinkerer standing before an enormous tower shield twice their height, the shield is the visual focus — forged from mithril steel with a glowing blue gem at its center, protective runes etched across its surface, steam pipes along the edges, the gnome's tools scattered at its base, workshop background with blueprints, the shield dominating the composition,`,
  },
  {
    id: "barrida_de_alabarda",
    name: "Barrida de Alabarda",
    category: "Ataque",
    prompt: `A human halberdier sweeping a long poleaxe in a wide horizontal arc, the blade cutting through multiple enemy silhouettes simultaneously, blue energy trailing the swing arc, the halberdier's cape billowing from the rotation, three enemies caught mid-stagger, fortress wall background, dawn light,`,
  },
  {
    id: "aegis_del_bastion",
    name: "Aegis del Bastión",
    category: "Acción",
    prompt: `A draenei vindicator raising a crystal-infused aegis shield high overhead, a massive dome of blue holy light expanding outward from the shield covering allied soldiers below, the draenei's eyes glowing with holy power, crystals along the shield pulsing with energy, fortress courtyard background at dawn, divine radiance,`,
  },
];

async function main() {
  const zai = await ZAI.create();
  const outDir = path.join(process.cwd(), 'public', 'cards');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  let ok = 0, fail = 0;
  for (const card of CARDS) {
    const outPath = path.join(outDir, `${card.id}.png`);
    if (fs.existsSync(outPath)) { console.log(`⏭️  ${card.name} — already exists`); ok++; continue; }
    const fullPrompt = `${card.prompt} ${BASE_PROMPT}`;
    console.log(`🎨 Generating: ${card.name} (${card.id})...`);
    try {
      const response = await zai.images.generations.create({ prompt: fullPrompt, size: '864x1152' });
      if (!response.data?.[0]?.base64) throw new Error('No image data');
      const buffer = Buffer.from(response.data[0].base64, 'base64');
      fs.writeFileSync(outPath, buffer);
      console.log(`✅ ${card.name} → ${outPath} (${(buffer.length / 1024).toFixed(0)} KB)`);
      ok++;
    } catch (err: any) { console.error(`❌ ${card.name} — ${err.message}`); fail++; }
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log(`\n${ok}/${CARDS.length} generated, ${fail} failed`);
}

main().catch(console.error);
