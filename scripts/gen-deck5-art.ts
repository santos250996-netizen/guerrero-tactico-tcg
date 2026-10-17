import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const BASE_PROMPT = `Stylized realism, visible brushstrokes, NOT photorealistic, NOT 3D render, full art no borders no frame full bleed, Hearthstone card art style, vibrant saturated colors reflecting the scene's theme, dramatic lighting with strong rim light, high contrast, epic heroic mood, Blizzard Entertainment concept art, flat color zones in shadows, exaggerated heroic proportions, fantasy card game illustration, NO text in image.`;

// Deck 5: BASTIÓN INQUEBRANTABLE — 12 cards (IDs match cards.ts exactly)
const CARDS = [
  { id: "vendas_de_guerra", name: "Vendas de Guerra", cat: "Ítem",
    prompt: `A night elf priestess wrapping glowing white-blue healing bandages around a wounded soldier, the bandages are the visual focus — woven with silver restoration sigils, moonlit temple garden background, the bandage spool larger and brighter than the characters,` },
  { id: "provocar", name: "Provocar", cat: "Acción",
    prompt: `A tauren warrior slamming a massive shield into the ground, taunting enemies defiantly, red taunt aura forcing enemy attention, shield glowing with protective energy, canyon pass background, heroic defiant pose,` },
  { id: "estandarte_de_guerra", name: "Estandarte de Guerra", cat: "Ítem",
    prompt: `A golden alliance banner planted firmly in the ground, the banner is the visual focus — glowing with a protective blue dome, golden lion crest radiating holy light, a human soldier kneeling beside it, battlefield background, the banner larger than the character,` },
  { id: "bloqueo_escudo", name: "Bloqueo Escudo", cat: "Ítem",
    prompt: `A dwarf warrior raising a massive iron shield to block, the shield is the visual focus — engraved with defensive runes, enemy attack visible as blue energy absorbing into it, weapon shattering against it, stone corridor background, the shield dominating the composition,` },
  { id: "centinela", name: "Centinela", cat: "Ítem",
    prompt: `A human guard in heavy plate armor standing vigil atop a battlement, shield and spear ready, the shield glowing with vanguard blue aura, watchful eyes scanning horizon, dawn light over fortress walls, alert and ready,` },
  { id: "trampa_eterea", name: "Trampa Etérea", cat: "Acción",
    prompt: `A blood elf mage conjuring a glowing purple-cyan magical trap glyph on the ground, the glyph pulsing with arcane energy, magical chains ready to spring, dark corridor background with enemies approaching, the glyph is the visual focus,` },
  { id: "empuje_tactico", name: "Empuje Táctico", cat: "Ítem",
    prompt: `A draenei commander pushing a wounded allied soldier to safety behind a barricade, one hand shielding them the other pointing to safety, blue protective energy flowing, battlefield background with incoming arrows, tactical repositioning,` },
  { id: "herida_letal", name: "Herida Letal", cat: "Ataque",
    prompt: `First person view of a jagged dagger thrust at an enemy weak point between armor plates, blade glowing with lethal red energy, wound opening visibly, armor cracking at the seam, dark close-quarters combat, critical strike,` },
  { id: "yunque_de_guerra", name: "Yunque de Guerra", cat: "Ítem",
    prompt: `A massive dwarven war-anvil, the anvil is the visual focus — dark iron with glowing blue runes of endurance, war-hammer resting on its face, blue energy empowering nearby items, underground forge-shrine background, the anvil larger than the character,` },
  { id: "muro_escudos", name: "Muro Escudos", cat: "Ítem",
    prompt: `Two dwarf warriors side by side with massive tower shields overlapping into a wall, shields glowing with blue energy linking between them, matching protective runes, bracing together, tunnel background, the shield wall dominating the composition,` },
  { id: "bastion", name: "Bastión", cat: "Ítem",
    prompt: `A massive fortress-bastion structure as a glowing defensive beacon, the bastion is the visual focus — ancient stone walls radiating golden energy, allied soldiers within glowing with renewed strength, a draenei vindicator channeling at its base, fortress courtyard at dusk, structure dominating composition,` },
  { id: "trono_de_hierro", name: "Trono de Hierro", cat: "Ítem",
    prompt: `An imposing iron throne on a battlefield platform, the throne is the visual focus — black iron with glowing blue energy veins, a dark iron dwarf warlord seated commanding, blue power radiating outward empowering all troops, battlefield background with armies, the throne larger than the character,` },
];

async function main() {
  const zai = await ZAI.create();
  const outDir = path.join(process.cwd(), 'public', 'cards');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  let ok = 0, fail = 0;
  for (const card of CARDS) {
    const outPath = path.join(outDir, `${card.id}.png`);
    if (fs.existsSync(outPath)) { console.log(`⏭️  ${card.name} — already exists`); ok++; continue; }
    console.log(`🎨 Generating: ${card.name} (${card.id})...`);
    try {
      const response = await zai.images.generations.create({ prompt: `${card.prompt} ${BASE_PROMPT}`, size: '864x1152' });
      if (!response.data?.[0]?.base64) throw new Error('No image data');
      const buffer = Buffer.from(response.data[0].base64, 'base64');
      fs.writeFileSync(outPath, buffer);
      try { require('child_process').execSync(`python3 -c "from PIL import Image; Image.open('${outPath}').save('${outPath}','PNG')"`, { timeout: 10000 }); } catch {}
      console.log(`✅ ${card.name} (${(fs.statSync(outPath).size / 1024).toFixed(0)} KB)`);
      ok++;
    } catch (err: any) { console.error(`❌ ${card.name} — ${err.message}`); fail++; }
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log(`\n${ok}/${CARDS.length} generated, ${fail} failed`);
}
main().catch(console.error);
