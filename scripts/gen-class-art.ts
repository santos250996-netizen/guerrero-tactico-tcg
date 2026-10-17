import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Full spec in scripts/design-pattern.md
// FÓRMULA: [interpretación del efecto en escena] + [raza WoW + variedad por
// nombre/categoría/subtipo] + [composición del trigger] + BASE_PROMPT
// Pipeline: generate 864x1152 → sharp lanczos3 → 432x576 (2x retina)
const GEN_SIZE = '864x1152' as const;
const TARGET_W = 432;
const TARGET_H = 576;

const BASE_PROMPT = `Stylized realism, visible brushstrokes, NOT photorealistic, NOT 3D render, full art no borders no frame full bleed, Hearthstone card art style, vibrant saturated colors reflecting the scene's theme, dramatic lighting with strong rim light, high contrast, epic heroic mood, Blizzard Entertainment concept art, flat color zones in shadows, exaggerated heroic proportions, fantasy card game illustration, NO text in image.`;

// Mazos Espejo V3 — 12 Mago + 12 Asesino
const CARDS = [
  // ======================= MAGO — ARCANA =======================
  {
    id: "baston_de_estrellas",
    name: "Bastón de Estrellas (Convergencia on_play)",
    prompt: `An ornate mage staff held aloft by a blood elf sorceress, dozens of glowing star-motes and arcane streams CONVERGING from every direction into the staff's crystal head which blazes brighter with each stream that joins, violet energy spiraling inward like a whirlpool of starlight, an astronomage tower observatory at dawn behind her, the staff dominant and radiant as the true protagonist,`,
  },
  {
    id: "nucleo_inestable",
    name: "Núcleo Inestable (Sobrecarga on_play)",
    prompt: `A floating arcane orb core CRACKING with excess light, jagged fractures leaking pure violet radiance, arcs of arcane electricity ESCAPING in all directions like steam from an overfilled vessel, metal tongs holding the orb over an alchemical apparatus, unstable volatile mood, the item larger and more detailed than the goblin engineer behind it, dark laboratory with violet lightning,`,
  },
  {
    id: "grimorio_anotado",
    name: "Grimorio Anotado (Fervor start_turn)",
    prompt: `A massive open spellbook as the dominant centerpiece with new glowing golden annotations VISIBLY WRITING THEMSELVES onto its pages line by line, ink still wet and shimmering as the text grows with each passing moment, floating quill rising aside, first light of dawn through a wizard's study window, sense of knowledge accumulating stroke by stroke, the item larger and more detailed than the young elf student behind it,`,
  },
  {
    id: "cantico_arcano",
    name: "Cántico Arcano (Fortaleza end_turn)",
    prompt: `A night elf cantor singing with both arms raised at dusk, visible waves of violet arcane sound flowing from her throat over an ENTIRE formation of fellow mages, every caster in the line glowing with the same empowered aura simultaneously, floating runes rotating above their heads, the effect at its full apex as the day closes, moonlit tower terrace,`,
  },
  // ======================= MAGO — FUEGO =======================
  {
    id: "tormenta_de_brasas",
    name: "Tormenta de Brasas (Llamarada on_play)",
    prompt: `A battle-maged orc pyromancer unleashing a horizontal WAVE of flame from outstretched palms, the fire cone sweeping across an ENTIRE line of enemy soldiers at once, multiple armored figures recoiling under the ember storm together, burning ashes filling the air, heat distortion, saturated orange inferno lighting on a dusty battlefield,`,
  },
  {
    id: "salamandra_anciana",
    name: "Salamandra Anciana (Combustión on_death)",
    prompt: `An ancient giant salamander with cracked obsidian scales falling defeated as its body ERUPTS into a massive explosion of white-orange flames, the blast wave shooting toward the strongest enemy champion whose glowing blue energy barrier is pierced through like paper by the fire, the moment just after the fatal blow, post-death detonation, dramatic low angle, embers everywhere,`,
  },
  {
    id: "antorcha_guia",
    name: "Antorcha Guía (Insignia on_play)",
    prompt: `A tall draenei torchbearer lifting a massive blazing torch, its warm golden light flowing down onto the smallest most exhausted soldier in the line who straightens up with renewed fire in his eyes, stark contrast between the towering blazing giver and the frail receiver, night battlefield camp, floating embers connecting both figures,`,
  },
  {
    id: "espada_candente",
    name: "Espada Candente (Remate on_play)",
    prompt: `A glowing red-hot sword raised high for the killing blow over an already defeated weak enemy kneeling on scorched cracked ground, far too burned to resist, the blade's white-hot edge flashing with final-strike energy at the climax of the swing, embers swirling around the arc, the outcome already decided, dramatic top-down angle, firelight,`,
  },
  // ======================= MAGO — HIELO =======================
  {
    id: "cristal_glacial",
    name: "Cristal Glacial (Escarcha start_turn)",
    prompt: `A translucent ice barrier around a frost elf mage with visible CRACKS THAT ARE RE-FREEZING in real time, fresh frost crystallizing over the old fissures and sealing them with brand-new ice, the defense visibly rebuilding itself at first morning light, pale blue and white palette, frost particles suspended in the air, living defense, the item larger and more detailed than the mage behind it,`,
  },
  {
    id: "viento_cortante",
    name: "Viento Cortante (Ventisca end_turn)",
    prompt: `A blizzard wind slashing horizontally across an ENTIRE enemy line, cutting ice shards and white snow blasting multiple soldier figures who bend and stagger under the frozen gale together, everything rimed in thick frost, visible cutting gusts drawn as pale streaks, merciless cold grinding the whole lane down at dusk, pale blue-white palette,`,
  },
  {
    id: "carapacho_glacial",
    name: "Carapacho Glacial (Coraza on_play)",
    prompt: `A shell-like armor of interlocking ice plates materializing around a dwarf mountain-king, a fresh translucent frost barrier just formed around his body marked with exactly three glowing rune segments like a finite charge meter, enemy arrows frozen mid-air against it in showers of ice sparks, arctic night sky, cool moonlight on the crystal,`,
  },
  {
    id: "anciano_del_norte",
    name: "Anciano del Norte (Legado on_death)",
    prompt: `A mortally wounded elderly tauren shaman in thick crude furs lying in deep snow just after the fatal blow, his glowing frost totem and blue life essence flowing upward into the hands of the weakest young hunter kneeling beside him, death becoming a transfer of power, faint aurora light above, other hunters saluting with lowered heads, no polished armor,`,
  },
  // ======================= ASESINO — VENENO =======================
  {
    id: "colmillos_curvos",
    name: "Colmillos Curvos (Veneno start_turn)",
    prompt: `Curved fang-shaped daggers dripping viscous green venom, the poison visibly SEEPING THROUGH the joint gaps of the strongest enemy knight's ornate plate armor while his glowing blue shield barrier stays intact and completely useless above him, toxic drops sliding INSIDE the armor plates glowing through the metal seams, a patient troll assassin watching coldly from the shadows, dungeon green light,`,
  },
  {
    id: "frasco_de_peste",
    name: "Frasco de Peste (Contagio end_turn)",
    prompt: `A glass plague vial as the dominant centerpiece releasing dense green toxic mist that snakes deliberately toward the most plague-marked enemy warrior, whose armor is already covered in spreading luminous green stains and who staggers as the infection finally claims him, other untouched enemies standing obliviously nearby, night alley with green haze, the item larger and more detailed than the hooded plague doctor holding it,`,
  },
  {
    id: "cultivo_de_hongos",
    name: "Cultivo de Hongos (Fervor start_turn)",
    prompt: `A cluster of luminous green mushrooms growing visibly larger spore by spore inside a rotted wooden trough, brand-new fungal caps swelling up between the old ones, toxic spores rising like accumulating power, a delighted goblin alchemist taking notes beside the trough, dank cellar at first light, sickly green glow illuminating the scene, the item larger and more detailed than the alchemist,`,
  },
  {
    id: "nube_toxica",
    name: "Nube Tóxica (Fortaleza end_turn)",
    prompt: `A vast glowing green toxic cloud hovering low over the rogue warband's own line at dusk, every ally beneath it standing taller and wreathed in the same empowering luminous green mist simultaneously, the cloud pulsing as it strengthens the entire lane at once, plague-doctor silhouettes beneath it, effect at its full apex, green against purple dusk sky,`,
  },
  // ======================= ASESINO — COMBATE =======================
  {
    id: "bandido_de_la_ruta",
    name: "Bandido de la Ruta (Refriega on_play)",
    prompt: `A grinning scarred human outlaw fighting alone against FIVE encircling road agents, twin notched blades spinning with escalating ferocity, every surrounding enemy feeding his confidence, defiant outnumbered smile, dust and friction flying, functional scarred steel with zero ornament, absolutely no magic, dirt road at high noon, momentum of a hundred brawls,`,
  },
  {
    id: "estoque_afilado",
    name: "Estoque Afilado (Golpe Certero on_play)",
    prompt: `A wiry assassin's precise rapier thrust striking clean into the chest of the most imposing enemy champion, the enemy's blue energy barrier VISIBLY absorbing part of the blow with sparks scattering exactly where blade meets shield, honest direct technique without tricks, perfect fencing form, training-yard precision, functional polished steel, dramatic side angle at dawn,`,
  },
  {
    id: "capitan_de_milicia",
    name: "Capitán de Milicia (Insignia on_play)",
    prompt: `A scarred militia captain raising his plain sword, tapping its glowing steel onto the smallest most battered rookie militiaman in the line, the frail underdog straightening with fresh determination as power visibly flows into him, stark contrast between the battle-hardened giver and the weakest receiver, warm camp glow connecting both figures, wooden palisade background,`,
  },
  {
    id: "sentencia_rapida",
    name: "Sentencia Rápida (Remate on_play)",
    prompt: `A swift judicial blade stroke executing an already defeated weak criminal kneeling at the chopping block, the stroke at its very climax with white final-edge energy, one decisive clean motion, plain functional steel without any ornament, harsh midday daylight casting hard shadows, judgment delivered without mercy or hesitation, dust motes frozen in the light,`,
  },
  // ======================= ASESINO — SIGILO =======================
  {
    id: "acechador_nocturno",
    name: "Acechador Nocturno (Emboscada on_play)",
    prompt: `A worgen assassin ERUPTING from deep shadow with total surprise, thin moonlight slicing only across his glowing eyes and extended claw-blades, the unaware victim still not reacting, frozen at the exact instant of the first strike of the night when every advantage of ambush is his, hard shadow play, indigo night palette, tension just released,`,
  },
  {
    id: "cuchilla_del_silencio",
    name: "Cuchilla del Silencio (Purga on_play)",
    prompt: `A silent hooded undead assassin moving past the STRONGEST towering enemy knight without even glancing at him, his thin blade executing the weakest faltering foot soldier who crumples silently, surgical cleanup of the weakest link, the strong ignored the weak eliminated, cold moonlight, absolute quiet visualized in still air, the killer already turning toward his next shadow,`,
  },
  {
    id: "capa_de_sombras",
    name: "Capa de Sombras (Coraza on_play)",
    prompt: `A tattered shadow-weave cloak as the dominant centerpiece wrapped around a sinewy elf rogue on a moonlit rooftop, three shadowy layers of the cloak visibly absorbing incoming crossbow bolts which dissolve into black mist on contact, the fabric drinking the hits like liquid night, exactly three layers visible as a finite shield, indigo palette with silver moonlight, the item larger and more detailed than the rogue,`,
  },
  {
    id: "maestro_caido",
    name: "Maestro Caído (Legado on_death)",
    prompt: `A mortally wounded elderly undead master assassin in dark leathers lying on a rooftop just after the fatal blow, his twin glowing daggers and violet life essence flowing into the hands of the weakest young apprentice kneeling beside him, death becoming inheritance, other rogues saluting with crossed blades in the background, moonlit aftermath, no polished armor,`,
  },
];

async function main() {
  const zai = await ZAI.create();
  const outDir = path.join(process.cwd(), 'public', 'cards');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  let ok = 0, fail = 0;

  for (const card of CARDS) {
    const outPath = path.join(outDir, `${card.id}.png`);
    if (fs.existsSync(outPath)) {
      console.log(`⏭️  ${card.id} — already exists, skipping`);
      ok++;
      continue;
    }

    const fullPrompt = `${card.prompt} ${BASE_PROMPT}`;
    console.log(`🎨 Generating: ${card.id}...`);

    try {
      const response = await zai.images.generations.create({ prompt: fullPrompt, size: GEN_SIZE });
      if (!response.data?.[0]?.base64) throw new Error('No image data in response');

      const raw = Buffer.from(response.data[0].base64, 'base64');
      const buffer = await sharp(raw)
        .resize(TARGET_W, TARGET_H, { kernel: 'lanczos3' })
        .png({ compressionLevel: 9 })
        .toBuffer();
      fs.writeFileSync(outPath, buffer);
      console.log(`✅ ${card.id}.png 432x576 (${(buffer.length / 1024).toFixed(0)} KB)`);
      ok++;
    } catch (err: any) {
      console.error(`❌ ${card.id} — ${err.message}`);
      fail++;
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n${ok}/${CARDS.length} generated, ${fail} failed`);
}

main().catch(console.error);
