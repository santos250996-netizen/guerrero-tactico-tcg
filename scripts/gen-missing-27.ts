import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";

const DIR = "/home/z/my-project/public/cards";
const SIZE = "864x1152";
const STYLE = "Stylized painterly digital illustration, visible brushstrokes, NOT photorealistic, NOT 3D render, full art no borders no frame full bleed, Hearthstone card art style, character as glowing light source with warm orange emissive glow, vibrant saturated complementary orange and steel-blue palette, heroic bright lighting with strong rim light, epic heroic mood, Blizzard Entertainment concept art, flat color zones in shadows, exaggerated heroic proportions, fantasy card game illustration.";

const CARDS = [
  // 12 BASIC (common)
  { id: "recluta", prompt: `A young human warrior cadet in leather training armor, holding a basic iron sword, determined youthful expression, dusty training yard, warm golden light. ${STYLE}` },
  { id: "aprendiz", prompt: `A battle-scarred warrior mid-roar, mouth wide open in a fierce war cry, veins bulging, dust and debris exploding outward, dark stormy battlefield. ${STYLE}` },
  { id: "sanador", prompt: `Blood-stained war bandages on a worn wooden table in a military camp, rusty iron helmet and notched dagger nearby, warm candlelight. ${STYLE}` },
  { id: "soldado", prompt: `A heavy infantry soldier with round shield and spear, dark plate armor with red military cape, disciplined stance, military camp with banners. ${STYLE}` },
  { id: "guardia", prompt: `A city guard in full plate armor holding a halberd, helmet with crest, stoic watchful expression, stone wall with burning torches. ${STYLE}` },
  { id: "veterano", prompt: `A battle-hardened sergeant with graying beard and facial scars, holding a notched war axe, weathered armor with dents, calm confident expression. ${STYLE}` },
  { id: "mago_joven", prompt: `A berserker warrior in a rage state, bloodshot eyes, foaming mouth, wielding two hand axes, tense muscles, torn clothing, pure fury aura. ${STYLE}` },
  { id: "caballero", prompt: `A master swordsman in full plate armor, holding a longsword with both hands in classic guard stance, cape flowing, tournament arena. ${STYLE}` },
  { id: "paladin", prompt: `A battle commander on a rocky outcrop rallying troops, sword raised to the sky, ornate war armor, fierce expression, war banners. ${STYLE}` },
  { id: "muro_hierro", prompt: `A massive mobile iron barricade with thick steel plates and rivets, defensive fortification on wheels, battlefield. ${STYLE}` },
  { id: "campeon", prompt: `A battle champion in ornate golden armor wielding a massive two-handed greatsword, triumphant stance, roaring fire blazing behind him, arena background. ${STYLE}` },
  { id: "hechicero", prompt: `A warlord with imposing presence in flowing dark armor, glowing fierce eyes, holding a massive weapon, stormy battlefield with war banners. ${STYLE}` },
  // 12 TACTICAL (epic)
  { id: "herida_letal", prompt: `A warrior delivering a precise lethal stab with a glowing crimson dagger, blood drops frozen in mid-air, menacing dark red aura. ${STYLE}` },
  { id: "carga_devastadora", prompt: `A warrior charging forward with explosive energy burst, glowing yellow aura doubling in intensity, dust trail, fierce expression. ${STYLE}` },
  { id: "asalto_coordinado", prompt: `Three warriors coordinating an assault from multiple directions, synchronized weapons raised, dynamic battlefield composition. ${STYLE}` },
  { id: "burla_sadica", prompt: `A battle-scarred warrior laughing defiantly at a massive looming enemy shadow, arms spread in mocking challenge, dramatic backlight. ${STYLE}` },
  { id: "sobrecarga", prompt: `A glowing power crystal overflowing with unstable crackling blue-white energy, lightning arcs, dark stone pedestal. ${STYLE}` },
  { id: "purificacion", prompt: `A holy purification ritual, a fading warrior dissolving into golden light particles flowing toward a stronger warrior, divine aura. ${STYLE}` },
  { id: "tormenta_rayos", prompt: `A furious lightning storm, multiple blue-white thunderbolts striking down on enemy ranks, electrified storm clouds. ${STYLE}` },
  { id: "trampa_eterea", prompt: `An ethereal magical trap, glowing purple runes on a stone floor, swirling spectral mist, arcane circle pattern. ${STYLE}` },
  { id: "reflejo_arcano", prompt: `A floating arcane mirror reflecting a powerful enemy warrior silhouette, glowing violet energy edges, mystical reflection. ${STYLE}` },
  { id: "venganza", prompt: `A wounded warrior rising with vengeful fury, glowing red eyes, blood-stained armor, clenched fist, dark crimson aura. ${STYLE}` },
  { id: "mimetismo", prompt: `A shimmering shapeshifting warrior with multiple echoing ghostly silhouettes, iridescent shifting colors, arcane doppelganger. ${STYLE}` },
  { id: "empuje_tactico", prompt: `A tactical commander in ornate armor pointing at a glowing strategic map, magical movement arrows, blue tactical aura. ${STYLE}` },
  // 3 LEGENDARY
  { id: "colera_titan", prompt: `A colossal titan warrior unleashing a devastating shockwave of golden energy that disintegrates enemy ranks, divine wrath, apocalyptic battlefield. ${STYLE}` },
  { id: "despertar_bélico", prompt: `A warrior surrounded by an erupting aura of crimson battle energy, eyes glowing with fierce determination, spectral weapons floating, war banners. ${STYLE}` },
  { id: "trono_hierro", prompt: `A massive iron throne on a battlefield, a battle-hardened warrior king sitting with a massive two-handed sword, iron spikes and chains, dark stormy sky. ${STYLE}` },
];

async function main() {
  const toGen = CARDS.filter(c => !fs.existsSync(`${DIR}/${c.id}.png`));
  console.log(`Generating ${toGen.length} images...`);
  const zai = await ZAI.create();
  for (const c of toGen) {
    console.log(`→ ${c.id}...`);
    try {
      const r = await zai.images.generations.create({ prompt: c.prompt, size: SIZE });
      const b = Buffer.from(r.data[0].base64, "base64");
      fs.writeFileSync(`${DIR}/${c.id}.png`, b);
      console.log(`✓ ${c.id} — ${(b.length/1024).toFixed(1)} KB`);
    } catch (e) { console.error(`✗ ${c.id}: ${(e as Error).message}`); }
  }
  console.log("=== Done ===");
}
main().catch(e => { console.error(e); process.exit(1); });
