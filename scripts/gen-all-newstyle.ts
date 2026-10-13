import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";

const DIR = "/home/z/my-project/public/cards";
const SIZE = "864x1152";

const STYLE = "Stylized painterly digital illustration, visible brushstrokes, NOT photorealistic, NOT 3D render, Hearthstone card art style, character as glowing light source with warm orange emissive glow, vibrant saturated complementary orange and steel-blue palette, heroic bright lighting with strong rim light, oval circular composition, epic heroic mood, Blizzard Entertainment concept art, flat color zones in shadows, exaggerated heroic proportions, fantasy card game illustration.";

// All 24 cards to regenerate (12 basic + 12 warrior)
const ALL_CARDS = [
  // BASIC (common)
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
  { id: "campeon", prompt: `A battle champion in ornate golden armor wielding a massive two-handed greatsword, triumphant stance, arena background. ${STYLE}` },
  { id: "hechicero", prompt: `A warlord with imposing presence in flowing dark armor, glowing fierce eyes, holding a massive weapon, stormy battlefield with war banners. ${STYLE}` },
  // WARRIOR (rare/legendary)
  { id: "golpe_heroico", prompt: `A fierce orc warrior delivering a powerful glowing orange overhead strike with a giant battleaxe, dynamic motion blur, fiery sparks. ${STYLE}` },
  { id: "seccionar", prompt: `A nimble warrior slicing low with a sharp broadsword, swift silver blade trail, detailed armor, combat action. ${STYLE}` },
  { id: "machaque_mortal", prompt: `A brutal tauren warrior crushing the ground with a massive two-handed weapon, dust and rock debris flying. ${STYLE}` },
  { id: "ejecutar", prompt: `A battle-scarred warrior thrusting a glowing red-hot sword forward for a finishing blow, intense dramatic shadows. ${STYLE}` },
  { id: "bloqueo_escudo", prompt: `A heavily armored warrior holding a massive steel tower shield blocking incoming magical sparks, sturdy defense pose. ${STYLE}` },
  { id: "muro_escudos", prompt: `A line of dwarven shields glowing with blue defensive magic runic barriers, impenetrable wall. ${STYLE}` },
  { id: "pocion_vida", prompt: `A glowing red health potion flask on a stone table inside a warrior's armory, magical healing smoke. ${STYLE}` },
  { id: "provocar", prompt: `An angry warrior shouting fiercely, beating his chest armor, dark menacing battleground aura, taunting expression. ${STYLE}` },
  { id: "ira_rabiosa", prompt: `A warrior's eyes glowing with fierce crimson rage, veins pulsing with fiery red energy, berserker mood. ${STYLE}` },
  { id: "grito_batalla", prompt: `A mighty war leader roaring on a cliff, visible magical soundwaves spreading outward, inspiring allies. ${STYLE}` },
  { id: "filotormenta", prompt: `A warrior spinning rapidly in a deadly whirlwind of steel and sharp blades, metallic sparks flying in a circle. ${STYLE}` },
  { id: "avatar_titan", prompt: `A warrior glowing with divine titan energy, surrounded by floating spectral weapons and golden light, awe-inspiring presence. ${STYLE}` },
];

async function main() {
  // Do NOT delete existing images — skip them and continue where we left off
  const remaining = ALL_CARDS.filter(c => !fs.existsSync(`${DIR}/${c.id}.png`));
  console.log(`${ALL_CARDS.length - remaining.length}/24 already exist. Generating ${remaining.length} remaining...`);

  const zai = await ZAI.create();
  let done = ALL_CARDS.length - remaining.length;
  for (const c of remaining) {
    const outPath = `${DIR}/${c.id}.png`;
    if (fs.existsSync(outPath)) {
      console.log(`✓ ${c.id} — already exists, skipping`);
      done++;
      continue;
    }
    console.log(`→ [${done+1}/24] ${c.id}...`);
    try {
      const r = await zai.images.generations.create({ prompt: c.prompt, size: SIZE });
      const b = Buffer.from(r.data[0].base64, "base64");
      fs.writeFileSync(outPath, b);
      console.log(`✓ ${c.id} — ${(b.length/1024).toFixed(1)} KB`);
      done++;
    } catch (e) {
      console.error(`✗ ${c.id}: ${(e as Error).message}`);
    }
  }
  console.log(`=== ${done}/24 completadas ===`);
}
main().catch(e => { console.error(e); process.exit(1); });
