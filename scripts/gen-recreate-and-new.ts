import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";

const DIR = "/home/z/my-project/public/cards";
const SIZE = "864x1152";

const STYLE = "Stylized painterly digital illustration, visible brushstrokes, NOT photorealistic, NOT 3D render, Hearthstone card art style, full art no borders no frame full bleed illustration, character as glowing light source with warm orange emissive glow, vibrant saturated complementary orange and steel-blue palette, heroic bright lighting with strong rim light, epic heroic mood, Blizzard Entertainment concept art, flat color zones in shadows, exaggerated heroic proportions, fantasy card game illustration.";

// 4 to RECREATE (delete + regen) + 10 NEW = 14 total
const CARDS = [
  // RECREATE
  { id: "soldado", prompt: `A heavy infantry soldier with round shield and spear, dark plate armor with red military cape, disciplined stance, military camp with banners. ${STYLE}` },
  { id: "caballero", prompt: `A master swordsman in full plate armor, holding a longsword with both hands in classic guard stance, cape flowing, tournament arena. ${STYLE}` },
  { id: "muro_hierro", prompt: `A massive mobile iron barricade with thick steel plates and rivets, defensive fortification on wheels, battlefield. ${STYLE}` },
  { id: "campeon", prompt: `A battle champion in ornate golden armor wielding a massive two-handed greatsword, triumphant stance, roaring fire blazing behind him, arena background, covered in battle marks. ${STYLE}` },
  // NEW (missing warrior cards)
  { id: "machaque_mortal", prompt: `A brutal tauren warrior crushing the ground with a massive two-handed weapon, dust and rock debris flying upward, epic impact. ${STYLE}` },
  { id: "ejecutar", prompt: `A battle-scarred warrior thrusting a glowing red-hot sword forward for a finishing blow, intense dramatic light. ${STYLE}` },
  { id: "bloqueo_escudo", prompt: `A heavily armored warrior holding a massive steel tower shield blocking incoming magical sparks, sturdy defense pose. ${STYLE}` },
  { id: "muro_escudos", prompt: `A line of dwarven shields glowing with blue defensive magic runic barriers, impenetrable wall formation. ${STYLE}` },
  { id: "pocion_vida", prompt: `A glowing red health potion flask on a stone table inside a warrior's armory, magical healing smoke rising. ${STYLE}` },
  { id: "provocar", prompt: `An angry warrior shouting fiercely, beating his chest armor, dark menacing battleground aura, taunting expression. ${STYLE}` },
  { id: "ira_rabiosa", prompt: `A warrior's eyes glowing with fierce crimson rage, veins pulsing with fiery red energy, berserker mood. ${STYLE}` },
  { id: "grito_batalla", prompt: `A mighty war leader roaring on a cliff, visible magical soundwaves spreading outward, inspiring allies. ${STYLE}` },
  { id: "filotormenta", prompt: `A warrior spinning rapidly in a deadly whirlwind of steel and sharp blades, metallic sparks flying in a circle. ${STYLE}` },
  { id: "avatar_titan", prompt: `A warrior glowing with divine titan energy, surrounded by floating spectral weapons and golden light, awe-inspiring legendary presence. ${STYLE}` },
];

async function main() {
  // Don't delete — just skip existing and generate missing ones
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
    } catch (e) {
      console.error(`✗ ${c.id}: ${(e as Error).message}`);
    }
  }
  console.log("=== Done ===");
}
main().catch(e => { console.error(e); process.exit(1); });
