import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";

const DIR = "/home/z/my-project/public/cards";
const SIZE = "864x1152";
const STYLE = "Stylized realism, visible brushstrokes, NOT photorealistic, full art no borders no frame full bleed, Hearthstone card art style, vibrant saturated complementary orange and steel-blue palette, heroic bright lighting with strong rim light, epic heroic mood, Blizzard Entertainment concept art, flat color zones in shadows, exaggerated heroic proportions, fantasy card game illustration.";

const CARDS = [
  // BATCH 1 (4-6): Berserker (Troll), Espadachín (Elfo de Sangre), Caudillo (Orco)
  { id: "mago_joven", prompt: `A troll warrior (blue skin, long tusks, mohawk crest) in a berserker rage state, bloodshot eyes, foaming mouth, wielding two hand axes, tense muscles, torn clothing, pure fury aura, dark battlefield with debris. ${STYLE}` },
  { id: "caballero", prompt: `A blood elf warrior (pale skin, pointed ears, long blonde hair) in full plate armor, holding a longsword with both hands in classic guard stance, cape flowing, refined elegant warrior posture, tournament arena background with stone stands. ${STYLE}` },
  { id: "paladin", prompt: `An orc commander (green skin, tusks, war scars) on a rocky outcrop rallying troops, sword raised to the sky, ornate war armor, fierce determined expression, war banners fluttering behind. ${STYLE}` },

  // BATCH 2 (7-9): Bastión (objeto), Campeón Sanguinario (Tauren), Señor de la Guerra (Worgen)
  { id: "muro_hierro", prompt: `A massive mobile iron barricade with thick steel plates, spikes and rivets, defensive fortification on wheels, battlefield background with smoke. ${STYLE}` },
  { id: "campeon", prompt: `A tauren warrior (massive bull-like humanoid, horns, fur) in ornate golden armor wielding a massive two-handed greatsword, triumphant stance, roaring fire blazing behind him, arena background, covered in battle marks. ${STYLE}` },
  { id: "hechicero", prompt: `A worgen warrior (werewolf, muscular, fur, fangs, glowing eyes) with imposing presence in flowing dark armor, holding a massive weapon, stormy battlefield with war banners. ${STYLE}` },

  // BATCH 3 (10-12): Cadete (Humano), Vendas de Guerra (objeto), Centinela (Elfo Nocturno)
  { id: "recluta", prompt: `A young human warrior cadet in leather training armor, holding a basic iron sword, determined youthful expression, dusty training yard, warm golden light. ${STYLE}` },
  { id: "sanador", prompt: `Blood-stained war bandages rolled on a worn wooden table in a military camp, rusty iron helmet and notched dagger nearby, warm flickering candlelight. ${STYLE}` },
  { id: "guardia", prompt: `A night elf warrior (purple skin, long ears, glowing amber eyes) in full plate armor holding a halberd, stoic watchful expression, stone wall background with burning torches. ${STYLE}` },

  // BATCH 4 (13-15): Golpe Heroico (Orco), Seccionar (No-muerto), Machaque Mortal (Tauren)
  { id: "golpe_heroico", prompt: `A fierce orc warrior (green skin, tusks) delivering a powerful glowing orange overhead strike with a giant battleaxe, dynamic motion blur, fiery sparks, dark epic background. ${STYLE}` },
  { id: "seccionar", prompt: `An undead warrior (Forsaken, torn flesh, bone visible) slicing low with a sharp broadsword, swift silver blade trail, tattered armor, combat action scene. ${STYLE}` },
  { id: "machaque_mortal", prompt: `A tauren warrior (massive bull humanoid, horns) crushing the ground with a massive two-handed mace, dust and rock debris flying upward, epic impact. ${STYLE}` },

  // BATCH 5 (16-18): Ejecutar (Draenei), Bloqueo Escudo (Enano), Muro Escudos (Enanos)
  { id: "ejecutar", prompt: `A draenei warrior (blue skin, tendrils, hooves) thrusting a glowing red-hot sword forward for a finishing blow, intense dramatic light, crystal-infused armor. ${STYLE}` },
  { id: "bloqueo_escudo", prompt: `A dwarf warrior (short, thick braided beard) holding a massive steel tower shield blocking incoming magical sparks, sturdy defense pose, heavy plate armor. ${STYLE}` },
  { id: "muro_escudos", prompt: `A line of dwarven shields glowing with blue defensive magic runic barriers, impenetrable wall formation, epic composition. ${STYLE}` },

  // BATCH 6 (19-21): Poción de Vida (objeto), Provocar (Tauren), Ira Rabiosa (Worgen)
  { id: "pocion_vida", prompt: `A glowing red health potion flask on a stone table inside a warrior's armory, magical healing smoke rising, rusty weapons nearby. ${STYLE}` },
  { id: "provocar", prompt: `A tauren warrior (bull humanoid, massive horns) shouting fiercely, beating his chest armor, dark menacing battleground aura, taunting expression with glowing eyes. ${STYLE}` },
  { id: "ira_rabiosa", prompt: `A worgen warrior (werewolf, fur, fangs) with eyes glowing with fierce crimson rage, veins pulsing with fiery red energy through fur, berserker mood, dark background. ${STYLE}` },

  // BATCH 7 (22-24): Grito de Batalla (Humano), Filotormenta (Orco), Avatar del Titán (Titán)
  { id: "grito_batalla", prompt: `A human war leader on a cliff, roaring with visible magical soundwaves spreading outward, inspiring allies, ornate golden armor, army below. ${STYLE}` },
  { id: "filotormenta", prompt: `An orc warrior (green skin, tusks) spinning rapidly in a deadly whirlwind of steel and sharp blades, metallic sparks flying in a circle, epic action. ${STYLE}` },
  { id: "avatar_titan", prompt: `A titanic warrior glowing with divine golden energy, surrounded by floating spectral weapons and golden light, colossal scale, awe-inspiring legendary presence. ${STYLE}` },

  // BATCH 8 (25-27): Herida Letal (Elfo de Sangre), Carga Devastadora (Tauren), Asalto Coordinado (3 razas)
  { id: "herida_letal", prompt: `A blood elf warrior (pale skin, pointed ears) delivering a precise lethal stab with a glowing crimson dagger, blood drops frozen in mid-air, menacing dark red aura. ${STYLE}` },
  { id: "carga_devastadora", prompt: `A tauren warrior (bull humanoid, horns) charging forward with explosive energy burst, glowing yellow aura, dust trail, fierce expression, shield raised. ${STYLE}` },
  { id: "asalto_coordinado", prompt: `Three warriors of different races (an orc, a dwarf, and a night elf) coordinating an assault from multiple directions, synchronized weapons raised, dynamic battlefield. ${STYLE}` },

  // BATCH 9 (28-30): Burla Sádica (Goblin), Sobrecarga (objeto), Purificación (Draenei)
  { id: "burla_sadica", prompt: `A goblin warrior (small, green, big ears, big nose) laughing defiantly at a massive looming enemy shadow, arms spread in mocking challenge, dramatic backlight, cocky expression. ${STYLE}` },
  { id: "sobrecarga", prompt: `A glowing power crystal overflowing with unstable crackling blue-white energy, lightning arcs, dark stone pedestal, magical overload. ${STYLE}` },
  { id: "purificacion", prompt: `A draenei warrior (blue skin, hooves, tendrils) performing a holy purification ritual, golden light particles flowing from a fading ally, divine aura, sacred. ${STYLE}` },

  // BATCH 10 (31-33): Tormenta de Relámpagos (Troll), Trampa Etérea (objeto), Reflejo Arcano (Elfo Nocturno)
  { id: "tormenta_rayos", prompt: `A troll warrior (blue skin, tusks, mohawk) channeling a furious lightning storm, multiple blue-white thunderbolts striking down, electrified storm clouds, arms raised. ${STYLE}` },
  { id: "trampa_eterea", prompt: `An ethereal magical trap, glowing purple runes inscribed on a stone floor, swirling spectral mist, arcane circle pattern, ominous purple glow. ${STYLE}` },
  { id: "reflejo_arcano", prompt: `A night elf warrior (purple skin, amber eyes) holding a floating arcane mirror reflecting a powerful enemy silhouette, glowing violet energy edges, mystical. ${STYLE}` },

  // BATCH 11 (34-36): Venganza (No-muerto), Mimetismo (Gnomo), Empuje Táctico (Goblin)
  { id: "venganza", prompt: `An undead warrior (Forsaken, skeletal, glowing eyes) rising with vengeful fury, blood-stained tattered armor, clenched fist, dark crimson aura, rising from the ground. ${STYLE}` },
  { id: "mimetismo", prompt: `A gnome warrior (very small, pink skin) shimmering with multiple echoing ghostly silhouettes around him, iridescent shifting colors, arcane doppelganger illusion. ${STYLE}` },
  { id: "empuje_tactico", prompt: `A goblin commander (small, green, big ears) in ornate armor pointing at a glowing strategic map, magical movement arrows, blue tactical aura, command table. ${STYLE}` },

  // BATCH 12 (37-39): Cólera del Titán (Titán), Despertar Bélico (Orco), Trono de Hierro (No-muerto)
  { id: "colera_titan", prompt: `A colossal titan warrior unleashing a devastating shockwave of golden energy that disintegrates enemy ranks, divine wrath, glowing cracks in the ground, apocalyptic battlefield. ${STYLE}` },
  { id: "despertar_bélico", prompt: `An orc warrior (green skin, tusks) surrounded by an erupting aura of crimson battle energy, eyes glowing with fierce determination, spectral weapons floating around, war banners. ${STYLE}` },
  { id: "trono_hierro", prompt: `An undead warrior king (Forsaken, skeletal, crown) sitting on a massive iron throne with a two-handed sword, iron spikes and chains, dark stormy sky, imposing. ${STYLE}` },
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
