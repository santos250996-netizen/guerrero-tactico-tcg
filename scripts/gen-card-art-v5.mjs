// ============================================================================
// gen-card-art-v5.mjs — 3ª tanda: 36 artes para los segundos mazos
// (Cohorte de Hierro · Cónclave Prismático · Gremio de la Daga).
//
// Reglas V3.2 del patrón (docs/design-pattern-cards.md §4-5):
//   ÍTEM    → bodegón centrado del objeto, SIN personajes/manos/brazos.
//   ACCIÓN  → alguien VISIBLE EJECUTANDO la acción, legible de un vistazo.
//   ATAQUE  → el golpe EN PLENA EJECUCIÓN por el portador de la spec.
//   CLASE   → imaginería de SU clase (sin mezclar guerreros en mago, etc.).
//
// Arte = f(NOMBRE, CATEGORÍA, SPEC) — dark fantasy 864x1152 (3:4).
// Uso: bun scripts/gen-card-art-v5.mjs            (salta las que ya existen)
//      FORCE=1 bun scripts/gen-card-art-v5.mjs    (regenera todas)
// ============================================================================
import ZAI from "z-ai-web-dev-sdk";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "public/cards");

const STYLE =
  "Stylized realism, visible brushstrokes, NOT photorealistic, NOT 3D render, Hearthstone card art style, painted digital illustration, " +
  "vibrant saturated colors, dramatic cinematic lighting with strong rim light, epic composition, flat color zones in shadows, " +
  "exaggerated heroic proportions, Blizzard Entertainment concept art, no text, no letters, no borders, no frame, no watermark";

const CATEGORY_RULE = {
  Ítem:
    "centered hero still-life of the object itself as the sole protagonist, " +
    "no characters, no hands, no arms, no figures, no people",
  Acción:
    "the action actively performed by a clearly visible character, " +
    "clean readable scene that tells the event at a glance",
  Ataque:
    "violent dynamic action caught mid-strike, the wielder clearly visible performing the blow",
};

const SPEC_SCENE = {
  armas: "fortified battlefield ramparts with forges and amber dust",
  proteccion: "sunlit fortress courtyard with sky-blue banners and golden halos",
  furia: "savage blood-red battlefield, embers and rage",
  arcana: "arcane tower interior with floating violet runes and starlight",
  fuego: "burning volcanic horizon, molten glow and floating sparks",
  hielo: "frozen glacier wasteland, crystalline frost and pale cyan light",
  veneno: "shadowy swamp thicket with sickly lime-green mist",
  combate: "grimy duel courtyard at blood-red dusk, cobblestones and ruins",
  sigilo: "moonless night, dark velvet stillness, indigo shadows and fog",
};

const SPEC_OF = {
  // Guerrero — Cohorte de Hierro
  legionario_de_vanguardia: "armas", quebrantador_de_filas: "armas",
  munonera_de_asedio: "armas", justicia_de_la_legion: "armas",
  baluarte_errante: "proteccion", centinela_anclado: "proteccion",
  estandarte_de_la_cohorte: "proteccion", concentracion_de_batalla: "proteccion",
  gladiador_enfrentado: "furia", fiera_ensangrentada: "furia",
  emblema_de_sangre: "furia", furia_desatada: "furia",
  // Mago — Cónclave Prismático
  tejedor_de_mana: "arcana", chispazo_incontrolado: "arcana",
  prisma_de_enfoque: "arcana", boveda_prismatica: "arcana",
  fenix_de_ascuas: "fuego", lengua_de_fuego: "fuego",
  yesca_ardiente: "fuego", bomba_de_fuego_inestable: "fuego",
  maza_glacial: "hielo", alma_del_glaciar: "hielo",
  aguja_glacial: "hielo", cupula_de_invierno: "hielo",
  // Asesino — Gremio de la Daga
  culebra_de_peste: "veneno", serpiente_del_cienago: "veneno",
  tonica_reconstituyente: "veneno", vaho_putrido: "veneno",
  cazador_de_titanes: "combate", mercenario_sin_bandera: "combate",
  daga_de_contrabando: "combate", grito_de_agonia: "combate",
  emisario_oculto: "sigilo", sombra_veloz: "sigilo",
  dardo_sombrio: "sigilo", pacto_de_las_sombras: "sigilo",
};

// [id, categoría, sujeto del arte (derivado del NOMBRE)]
const CARDS = [
  // ───────────── GUERRERO — COHORTE DE HIERRO ─────────────
  ["legionario_de_vanguardia", "Ataque",
    "a battle-scarred legionary in heavy amber-trimmed plate armor leading a charge with his sword raised high, shouting the battle order as soldiers surge forward around him across the ramparts"],
  ["quebrantador_de_filas", "Ataque",
    "a massive armored warrior mid-swing with a huge iron maul smashing into an enemy shield wall, wooden shields splintering and enemy soldiers scattering from the crushing blow"],
  ["munonera_de_asedio", "Ítem",
    "a brutal siege mace lying diagonally on a stone parapet: thick leather-wrapped grip ending in a heavy studded steel ball, torchlight from one side, empty rampart, absolutely no people and no figures anywhere in the scene"],
  ["justicia_de_la_legion", "Acción",
    "a stern legion officer passing sentence on the battlefield: his sword sweeping down in a bright disciplined arc over a kneeling defeated enemy warrior, judgment made visible"],
  ["baluarte_errante", "Ataque",
    "a wandering guardian knight in layered sky-blue plate mid-stride planting his tall shield into the ground to shelter a smaller comrade, dust rising around his boots"],
  ["centinela_anclado", "Ataque",
    "an immovable sentry in polished plate armor standing his ground with boots planted wide as an arrow volley shatters against his raised shield"],
  ["estandarte_de_la_cohorte", "Ítem",
    "a proud cohort war standard standing completely alone: tall bronze pole bearing a sky-blue banner with golden trim and a polished legion crest, planted upright in its stone socket on a rampart, empty courtyard behind, absolutely no people and no figures anywhere in the scene"],
  ["concentracion_de_batalla", "Acción",
    "a veteran shieldbearer kneeling in deep concentration, golden light streaming from his raised hands into the shields and spears of the soldier line standing around him"],
  ["gladiador_enfrentado", "Ataque",
    "a furious gladiator mid-lunge against a much larger armored opponent in a blood-red arena, roaring defiance, crimson dust kicking up around the clash"],
  ["fiera_ensangrentada", "Ataque",
    "a bloodied wild berserker springing forward on all fours, jagged blade clenched in one fist, wounds streaming and pure rage burning in his eyes"],
  ["emblema_de_sangre", "Ítem",
    "a savage war emblem: a round bronze medallion stamped with a snarling beast and stained with dried blood, hanging from a leather cord on a trophy rack"],
  ["furia_desatada", "Acción",
    "a screaming berserker unleashing an explosive whirlwind attack, his axe carving a bright red arc as training shields and armor pieces fly apart around him"],

  // ───────────── MAGO — CÓNCLAVE PRISMÁTICO ─────────────
  ["tejedor_de_mana", "Ataque",
    "an arcane weaver mage mid-cast pulling glowing violet threads of raw mana out of an enemy sorcerer, the stolen energy streaming into his own radiating hands"],
  ["chispazo_incontrolado", "Ataque",
    "a young mage overwhelmed by his own spell: wild violet sparks erupting uncontrollably from his outstretched hands, singed robes, startled face lit by crackling arcs"],
  ["prisma_de_enfoque", "Ítem",
    "a faceted crystal prism on a small bronze stand refracting a beam of violet light into focused rays, resting on an arcane lectern strewn with stardust"],
  ["boveda_prismatica", "Acción",
    "an archmage raising both arms projecting a dome of interlocking translucent violet crystal panes around allied soldiers, the barrier gleaming with starlight"],
  ["fenix_de_ascuas", "Ataque",
    "a phoenix exploding reborn from a mound of embers, molten feathers scattering in a ring of fire as the burning shockwave expands across scorched ground"],
  ["lengua_de_fuego", "Ataque",
    "a fire mage whipping a long serpent-like tongue of flame from his staff, the fiery lash snapping across enemy ranks and setting banners alight"],
  ["yesca_ardiente", "Ítem",
    "a small bronze tinderbox spilling glowing red-orange ember flakes and burning tinder onto dark volcanic stone, thin smoke curling upward"],
  ["bomba_de_fuego_inestable", "Acción",
    "a fire mage hurling a crackling sphere of unstable molten fire toward enemy lines, the sphere visibly fracturing mid-air moments before detonation"],
  ["maza_glacial", "Ataque",
    "a frost warrior swinging a massive hammer head of solid glacier ice down onto an enemy mage, shards of frozen crust exploding from the impact"],
  ["alma_del_glaciar", "Ataque",
    "the dying spirit of an ice guardian rising from its collapsing frozen body, a translucent cyan soul drifting toward a wounded ally to lend its strength"],
  ["aguja_glacial", "Ítem",
    "a slender needle of flawless ice with a carved crystal handle resting on a frost-covered stone plinth, pale cyan light glinting along its razor edge"],
  ["cupula_de_invierno", "Acción",
    "an ice sorcerer conjuring a sweeping dome of wind and snow around allied defenders, frost crystallizing across the curved barrier as blizzard swirls"],

  // ───────────── ASESINO — GREMIO DE LA DAGA ─────────────
  ["culebra_de_peste", "Ataque",
    "a hooded plague rogue releasing a coiling serpent-shaped cloud of lime-green toxic gas that pours over enemies choking behind their shields"],
  ["serpiente_del_cienago", "Ataque",
    "a giant swamp serpent striking mid-bite at an armored victim in murky water, dripping fangs trailing strands of sickly glowing green venom"],
  ["tonica_reconstituyente", "Ítem",
    "a small glass tonic bottle of luminous green liquid with cork and wax seal, arranged on an alchemist's tray with dried herbs and a mortar"],
  ["vaho_putrido", "Acción",
    "a plague alchemist pouring a flask of glowing green vapor into a bronze brazier, the putrid mist rolling low across the ground toward hunched enemies"],
  ["cazador_de_titanes", "Ataque",
    "a lone bounty hunter with matched blades leaping mid-air at a towering armored giant, the small hunter daring overwhelming size, blood-red dusk behind"],
  ["mercenario_sin_bandera", "Ataque",
    "a scarred sellsword in mismatched patchwork armor cutting down a rival mid-swing in a courtyard brawl, pragmatic violence with no banner in sight"],
  ["daga_de_contrabando", "Ítem",
    "a smuggled dagger with a dark folded-steel blade and bone grip half-unwrapped from oiled leather on a wooden crate, red dusk light on the edge"],
  ["grito_de_agonia", "Acción",
    "a mortally wounded duelist crying out with his final breath as pale light leaves his chest and flows into a comrade still fighting beside him"],
  ["emisario_oculto", "Ataque",
    "a shadowy envoy in dark robes sealing a conspiracy, pressing a wax-sealed document into an ally's gloved hand while hooded figures whisper in the indigo darkness behind"],
  ["sombra_veloz", "Ataque",
    "an assassin blurring through the moonless night, after-images trailing his silhouette as twin daggers strike a startled guard from behind"],
  ["dardo_sombrio", "Ítem",
    "a single shadow-steel throwing dart with a dark tassel laid across black silk, indigo night fog curling around its needle point"],
  ["pacto_de_las_sombras", "Acción",
    "hooded conspirators joining hands above a candle-lit table in a dark vault, an inky shadow-seal glowing beneath their joined palms"],
];

async function main() {
  const force = process.env.FORCE === "1";
  const only = process.env.ONLY ? process.env.ONLY.split(",") : null;
  const zai = await ZAI.create();
  let ok = 0, skipped = 0;
  for (const [id, category, subject] of CARDS) {
    if (only && !only.includes(id)) continue;
    const outPath = path.join(OUT_DIR, `${id}.png`);
    if (!force && fs.existsSync(outPath)) {
      skipped++;
      console.log(`↷ ${id}.png ya existe`);
      continue;
    }
    const scene = SPEC_SCENE[SPEC_OF[id]];
    const rule = CATEGORY_RULE[category];
    const prompt = `Subject: ${subject}. Scene: ${scene}. Mood: ${rule}. ${STYLE}`;

    let done = false;
    for (let attempt = 1; attempt <= 3 && !done; attempt++) {
      try {
        const res = await zai.images.generations.create({ prompt, size: "864x1152" });
        const b64 = res?.data?.[0]?.base64;
        if (!b64) throw new Error("respuesta sin base64");
        fs.writeFileSync(outPath, Buffer.from(b64, "base64"));
        console.log(`✓ ${id}.png (${category})`);
        ok += 1;
        done = true;
      } catch (e) {
        console.error(`✗ ${id} (intento ${attempt}): ${e.message}`);
        if (attempt < 3) await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
  }
  console.log(`\nGeneradas: ${ok}/${CARDS.length} (saltadas ${skipped})`);
  if (ok + skipped < CARDS.length) process.exit(1);
}

main();
