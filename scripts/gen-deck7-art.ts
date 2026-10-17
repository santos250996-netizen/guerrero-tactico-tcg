import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const BASE_PROMPT = `Stylized realism, visible brushstrokes, NOT photorealistic, NOT 3D render, full art no borders no frame full bleed, Hearthstone card art style, vibrant saturated colors reflecting the scene's theme, dramatic lighting with strong rim light, high contrast, epic heroic mood, Blizzard Entertainment concept art, flat color zones in shadows, exaggerated heroic proportions, fantasy card game illustration, NO text in image.`;

// Deck 7: MALLA DE EMBOSCADA (Control y Trampas) — 12 cards
// Theme: ambush, traps, stealth, tactical warfare, shadows, deception.
// Visual variety: rogues in dark leather, traps of bone and wire,
// scouts in camouflage, shadow-cloaked figures, improvised weaponry.
const CARDS = [
  { id: "fuego_cruzado", name: "Fuego Cruzado",
    prompt: `Two rogue archers hidden in foliage on opposite sides of a narrow pass, both firing crossbow bolts simultaneously at an enemy caught in the middle of the kill-zone, the bolts crossing in mid-air with motion lines, the archers wearing dark hooded leather and camouflage cloaks with leaves, the enemy frozen in realization, forest canyon pass, dark green and shadow palette, ambush moment,` },
  { id: "defensa_desesperada", name: "Defensa Desesperada",
    prompt: `A night elf sentinel in torn leather armor planting a crude spike trap made of sharpened bone and rusted metal in a doorway, hands shaking with desperation, the trap is the visual focus — a tension-loaded mechanism with barbed spikes ready to spring, blood already on the bone tips, ruined temple doorway background, amber and shadow palette, last-stand desperation,` },
  { id: "red_tactica", name: "Red Táctica",
    prompt: `A crude fishing-net-like trap made of thick rope and barbed wire strung between two stone pillars, the net is the visual focus — covered in rusted hooks and small bone chimes that would rattle when triggered, a small goblin trapper hiding behind the pillar with a trip-rope in hand, dark corridor background, the net dominating the composition, tactical trap NOT magical,` },
  { id: "sombra_acechante", name: "Sombra Acechante",
    prompt: `A forsaken (undead) assassin dissolving into purple-black shadow smoke, only their glowing eyes and a glinting dagger visible in the wisps, the shadow form is fluid and serpentine, no armor visible just dark mist, the dagger is crude and serrated NOT elegant, dark alley background with crates, the shadow figure barely visible against the darkness, stealth and death,` },
  { id: "abrojos_de_acero", name: "Abrojos de Acero",
    prompt: `A scatter of jagged iron caltrops (4-pointed spikes) on a dark stone floor, the caltrops are the visual focus — crude hand-forged, rusted, asymmetric, clearly made by a blacksmith not a machine, a goblin trapper's hand visible dropping more from a leather pouch, torchlight flickering on the metal points, dungeon corridor background, the caltrops scattered across the foreground,` },
  { id: "hostigamiento_tactico", name: "Hostigamiento Táctico",
    prompt: `A troll headhunter throwing a crude javelin from cover at an unsuspecting enemy patrol, the troll is half-hidden behind a rock with war paint and bone earrings, the javelin is a sharpened stick with bone tip NOT metal, the enemy patrol visible in the distance unaware, throwing motion blurred, rocky wasteland background at dusk, ambush from cover,` },
  { id: "contraofensiva", name: "Contraofensiva",
    prompt: `A scarred human gladiator in a torn leather vest pivoting from defense to offense, catching an enemy's sword strike on a battered wooden buckler and simultaneously driving a broken dagger into the enemy's exposed wrist, the broken dagger is clearly a snapped blade repurposed, blood on both fighters, dust and sweat, arena pit background with sand and broken weapons, desperate reversal,` },
  { id: "cota_reforzada", name: "Cota Reforzada",
    prompt: `A close-up of a dwarf's chainmail vest that has been patched with crude iron plates riveted over the chain links, the reinforced chainmail is the visual focus — clearly a field repair with mismatched metal, dented plates, and leather straps holding it together, a dwarf's scarred hand resting on the patched section, smithy background with tools, the armor worn and battle-repaired NOT new,` },
  { id: "tactico_ligero", name: "Táctico Ligero",
    prompt: `A blood elf scout in light leather armor (NO metal) crouched on a rooftop, rope in one hand and a grappling hook in the other, the scout's face painted with dark streaks for camouflage, wearing soft-soled boots, a short bow slung on their back, moonlit city rooftop background with chimney smoke, the scout ready to descend, agile and light-equipped,` },
  { id: "emboscada_mortal", name: "Emboscada Mortal",
    prompt: `A worgen (werewolf) berserker erupting from a camouflaged pit-trap beneath an enemy patrol, dirt and leaves exploding upward, the worgen's claws and fangs mid-lunge at the unsuspecting enemy's throat, the pit-trap's cover (branches and leaves) still falling, the enemy's expression of shock, forest ambush site background, sudden brutal violence from below,` },
  { id: "estacion_de_reaprovisionamiento", name: "Estación de Reaprovisionamiento",
    prompt: `A hidden supply cache dug into a hillside covered by a wooden hatch disguised with grass and rocks, the open hatch reveals crates of crude weapons, bandages, and water skins, a goblin quartermaster with a soot-stained face organizing supplies inside, the cache is the visual focus — makeshift shelves of salvaged goods, lantern light inside, hillside battlefield background at dusk, clandestine logistics,` },
  { id: "comandante_de_vanguardia", name: "Comandante de Vanguardia",
    prompt: `An orc warchief standing atop a ridge, wearing a wolf-pelt mantle over studded leather armor with a bone-hilted falchion, the warchief's body covered in ritual scars and tribal paint, one hand pointing forward commanding an unseen army in the valley below, war-banners planted in the ridge, the warchief's expression fierce and calculating, dawn light breaking over the valley, strategic commander NOT foot soldier,` },
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
      try {
        require('child_process').execSync(`python3 -c "from PIL import Image; img=Image.open('${outPath}'); img=img.resize((432,576),Image.LANCZOS); img.save('${outPath}','PNG',optimize=True)"`, { timeout: 10000 });
      } catch {}
      console.log(`✅ ${card.name} (${(fs.statSync(outPath).size / 1024).toFixed(0)} KB)`);
      ok++;
    } catch (err: any) { console.error(`❌ ${card.name} — ${err.message}`); fail++; }
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log(`\n${ok}/${CARDS.length} generated, ${fail} failed`);
}
main().catch(console.error);
