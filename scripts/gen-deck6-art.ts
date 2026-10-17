import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const BASE_PROMPT = `Stylized realism, visible brushstrokes, NOT photorealistic, NOT 3D render, full art no borders no frame full bleed, Hearthstone card art style, vibrant saturated colors reflecting the scene's theme, dramatic lighting with strong rim light, high contrast, epic heroic mood, Blizzard Entertainment concept art, flat color zones in shadows, exaggerated heroic proportions, fantasy card game illustration, NO text in image.`;

// Deck 6: LEGADO DE LA FORJA — 12 cards (varied visual styles!)
const CARDS = [
  { id: "tajo_veloz", name: "Tajo Veloz",
    prompt: `A wiry troll rogue with a rusted machete doing a blindingly fast slash across an enemy's torso, the troll wears tattered leather and bone amulets, tribal tattoos glowing, barefoot with toe-grips on stone, the machete's edge visibly chipped but lethal, jungle temple ruins background, green and amber palette,` },
  { id: "pergamino_tactico", name: "Pergamino Táctico",
    prompt: `A human scout with dirt-smudged face and worn leather armor unfurling a yellowed battle map scroll, the scroll is the visual focus — marked with tactical positions in red ink, a compass drawn in the corner, the scout's hands dirty and scarred, campfire background with tents, the scroll larger and more detailed than the character,` },
  { id: "embestida", name: "Embestida",
    prompt: `A bull tauren in a broken leather harness and one cracked shoulder plate charging with horns lowered, dust cloud erupting from the charge, the tauren's fur matted with old battle grime, a crude rope belt, broken enemy weapons scattered from previous charges, canyon dust trail, raw primal charge, NO shiny armor,` },
  { id: "cuerno_de_batalla", name: "Cuerno de Batalla",
    prompt: `An ogre with a massive carved bone war-horn (made from a beast's skull), blowing into it with puffed cheeks, the ogre wears a scrap-metal and bone-studded leather vest, tribal war paint in red across their face, the horn is the visual focus — ornately carved with battle scenes, vibrating with sound waves, wasteland background,` },
  { id: "asalto_coordinado", name: "Asalto Coordinado",
    prompt: `Three goblin raiders attacking in perfect coordination from three sides — one with a jagged hooked blade low, one with a chain overhead, one throwing a crude molotov, the goblins wearing oil-stained rags and makeshift goggles, coordinated movement like a dance of violence, industrial scrapyard background with smoke,` },
  { id: "machaque_mortal", name: "Machaque Mortal",
    prompt: `A massive dark iron dwarf with a rusted, notched war-pick bringing it down on a cracked enemy helmet, the impact deforming the helmet visibly, the dwarf's thick braided beard covered in soot, bare muscular arms with burn scars, leather apron and heavy gloves, the pick is old and brutal NOT elegant, underground mine background,` },
  { id: "sobrecarga", name: "Sobrecarga",
    prompt: `A goblin tinkerer's invention overloading — a gauntlet made of welded scrap metal and copper coils erupting with red energy, steam and sparks shooting from every seam, warning valves popping, the goblin's hair singed and standing up, panic and excitement mixed on their face, cluttered workshop background with blueprints, red energy overload,` },
  { id: "golpe_brutal", name: "Golpe Brutal",
    prompt: `A worgen (werewolf) berserker with a massive cracked wooden club (not a sword — a club), mid-swing downward, the club wrapped in barbed wire and dripping with blood, the worgen's fur matted and wild, no armor just fur and muscle, fangs bared, forest background at night with broken trees from previous swings,` },
  { id: "golpe_heroico", name: "Golpe Heroico",
    prompt: `A human soldier in battered chainmail (NOT plate) doing a heroic overhead sword swing, the chainmail torn at the shoulder exposing a bandaged wound, the sword is a standard issue longsword with nicks in the edge, the soldier's face determined despite exhaustion, mud on their boots, rain and battlefield background, heroic but gritty NOT glamorous,` },
  { id: "coraza_de_acero", name: "Coraza de Acero",
    prompt: `A weathered iron breastplate on a stand, the breastplate is the visual focus — pitted and scarred from countless battles, rust along the rivets, a crude repair patch welded over a crack, it still radiates a faint blue protective aura, a dwarf resting a hand on it with pride, armory background with weapon racks, the breastplate worn and battle-tested NOT shiny,` },
  { id: "colera_del_titan", name: "Cólera del Titán",
    prompt: `An ancient stone titan awakening in destructive fury, the titan's body is cracked and moss-covered ancient stone, not metal, glowing orange energy erupting from the cracks, one massive fist slamming down destroying an enemy formation, ancient temple ruins crumbling around the titan, orange and stone color palette, primordial wrath,` },
  { id: "campeon_revestido", name: "Campeón Revestido",
    prompt: `An orc champion wearing a dragon-scale mantle over crude leather armor, the scales are the visual focus — iridescent green dragon scales lashed to leather with sinew, glowing with faint power, the orc's face painted with dragon blood in tribal patterns, tusk amulet necklace, mountain peak background, the scales larger and brighter than the character,` },
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
      // Convert JPEG→PNG + compress to 432x576
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
