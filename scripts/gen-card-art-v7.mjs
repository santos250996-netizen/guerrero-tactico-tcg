// ============================================================================
// gen-card-art-v7.mjs — REESTILO de los 3 mazos espejo (36 cartas V2/V3).
// Aplica el §4.6 corregido (Stylized realism, Hearthstone-like, NO
// fotorrealista) + §4.7 catálogo de razas. Los sujetos respetan la regla
// nombre × categoría × spec del patrón.
// Uso: bun scripts/gen-card-art-v7.mjs   (salta existentes)
//      FORCE=1 … regenera · ONLY=id1,id2 … solo esas
// ============================================================================
import ZAI from "z-ai-web-dev-sdk";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "public/cards");

const STYLE =
  "Stylized realism, visible brushstrokes, NOT photorealistic, NOT 3D render, full art no borders no frame full bleed, " +
  "Hearthstone card art style, painted digital illustration, vibrant saturated colors, dramatic cinematic lighting with strong rim light, " +
  "epic composition, flat color zones in shadows, exaggerated heroic proportions, Blizzard Entertainment concept art, " +
  "no text, no letters, no borders, no frame, no watermark";

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

// [id, categoría, spec, sujeto]
const CARDS = [
  // ── GUERRERO — Armas ──
  ["tajo_quebrantamuros", "Ataque", "armas",
    "an orc warrior mid-swing with a massive jagged greatsword shattering a stone rampart barrier, masonry exploding from the impact, amber forge-dust in the air"],
  ["duelista_errante", "Ataque", "armas",
    "a wandering human duelist in a traveling coat lunging in perfect form against a tauren opponent on the ramparts, rapier extended, dust at his heels"],
  ["amoladora_de_campamento", "Ítem", "armas",
    "a camp grinding wheel with a blade half-sharpened clamped in its vise, orange sparks frozen mid-shower, leather strop and whetstone beside it, absolutely no people and no figures anywhere in the scene"],
  ["toque_de_guerra", "Acción", "armas",
    "a burly orc herald blowing a long bronze war horn from the rampart tower, the call rippling visibly through the air as soldier ranks answer below"],

  // ── GUERRERO — Protección ──
  ["adarga_del_centinela", "Ítem", "proteccion",
    "a heart-shaped leather-and-steel adarga shield displayed on a wooden rack, sun glinting across its painted sky-blue face, absolutely no people and no figures anywhere in the scene"],
  ["abanderado_de_la_cohorte", "Ataque", "proteccion",
    "an orc standard-bearer mid-charge planting his sky-blue banner as allied shields snap into formation around him, golden light on the flag"],
  ["oracion_del_bastion", "Acción", "proteccion",
    "a dwarven priestess raising her hammer in prayer over the shield wall, golden light washing away the dents and scratches from their shields"],
  ["guardian_juramentado", "Ataque", "proteccion",
    "a sworn tauren guardian slamming his fist against his own chest-plate before raising his shield to defend a wounded human soldier behind him"],

  // ── GUERRERO — Furia ──
  ["berserker_recluta", "Ataque", "furia",
    "a young worgen berserker (wolf-like, fangs bared) sprinting into the fray swinging two hand axes, red dust and embers trailing behind"],
  ["colmillo_del_verdugo", "Ataque", "furia",
    "a scarred orc executioner beast looming over a cowering foe, jagged tusk-blade raised for a cruel downward strike, blood-red light behind"],
  ["hacha_de_ejecucion", "Ítem", "furia",
    "a brutal executioner's axe resting on a chopping block, dark steel blade scored with old notches, crimson cloth draped nearby, absolutely no people and no figures anywhere in the scene"],
  ["veterano_caido", "Acción", "furia",
    "a mortally wounded orc veteran slumped against a broken shield, pressing his axe into the hands of a young recruit as his eyes fade, embers drifting"],

  // ── MAGO — Arcana ──
  ["conjurador_de_estrellas", "Ataque", "arcana",
    "a draenei mage (blue skin, tendrils, hooves) conjuring a spiraling constellation of violet stars above her palms, starlight reflecting on the tower stones"],
  ["aberracion_arcana", "Ataque", "arcana",
    "a writhing creature of pure violet arcane energy flickering unstable in mid-air, its edges dissolving into sparks, runes swirling in its core"],
  ["grimorio_anotado", "Ítem", "arcana",
    "an ancient open tome with glowing marginalia crawling across its pages like living ink, resting on a scholar's lectern, absolutely no people and no figures anywhere in the scene"],
  ["cantico_arcano", "Acción", "arcana",
    "a night elf chanter (purple skin, long ears) singing a sustained arcane note, violet soundwaves weaving a luminous aura around her allied golems"],

  // ── MAGO — Fuego ──
  ["tormenta_de_brasas", "Acción", "fuego",
    "a human fire mage channeling a cyclone of glowing embers over the enemy lines, ash spiraling around his outstretched arms, molten horizon behind"],
  ["salamandra_anciana", "Ataque", "fuego",
    "an ancient salamander the size of a wagon, cracked obsidian scales glowing magma-orange from within, exhaling its final burst of searing breath"],
  ["farol_igneo", "Ítem", "fuego",
    "a bronze arcane lantern with a molten core glowing through its filigree, resting alone on a basalt plinth, absolutely no people and no figures anywhere in the scene"],
  ["estallido_igneo", "Ataque", "fuego",
    "a blood elf pyromancer (pale skin, pointed ears) hurling a bursting sphere of white-orange fire that detonates mid-air over enemy ranks"],

  // ── MAGO — Hielo ──
  ["coloso_de_escarcha", "Ataque", "hielo",
    "a hulking colossus of living glacier ice grinding forward, frost mist pouring off its shoulders, pale cyan light glowing in its chest"],
  ["viento_cortante", "Acción", "hielo",
    "an elf ice sorceress (pale skin, long ears) sweeping her staff in a wide arc, a blade-like gale of razor snow flaying the enemy front line"],
  ["carapacho_glacial", "Ítem", "hielo",
    "a massive curled carapace of translucent ice plates, frozen fern-like crystals branching across its surface, absolutely no people and no figures anywhere in the scene"],
  ["anciano_del_norte", "Ataque", "hielo",
    "a dying frost giant elder kneeling as his icy body collapses, his spirit streaming as pale cyan light into the young warrior kneeling beside him"],

  // ── ASESINO — Veneno ──
  ["colmillos_curvos", "Ataque", "veneno",
    "a curved-fang swamp viper striking mid-bite, lime-green venom dripping from its fangs in slow threads, sickly mist curling below"],
  ["frasco_de_peste", "Ítem", "veneno",
    "a corked glass flask of bubbling green plague broth, condensation and virulent residue crusting the glass, absolutely no people and no figures anywhere in the scene"],
  ["vibora_ponzonosa", "Ataque", "veneno",
    "a small ponzoños viper coiling to strike, scales glinting lime-green, already visibly swelling as it devours raw meat caught in its coils"],
  ["nube_toxica", "Acción", "veneno",
    "a hooded human assassin hurling a clay vessel that bursts into a rolling dome of green toxic gas, enemies staggering back behind their shields"],

  // ── ASESINO — Combate ──
  ["bandido_de_la_ruta", "Ataque", "combate",
    "a masked goblin highwayman leaping from a cart at passing travelers, twin blades out, red dusk light across the cobbled road"],
  ["estoque_afilado", "Ítem", "combate",
    "a slender dueling estoque planted upright in a dueling-court paving stone, its swept hilt catching the red dusk light, absolutely no people and no figures anywhere in the scene"],
  ["capitan_de_milicia", "Ataque", "combate",
    "a weathered human militia captain hauling a stumbling recruit up by the collar and pointing him back into formation, steel and grit in his eyes"],
  ["ajuste_de_cuentas", "Acción", "combate",
    "a human daggerman cornering a debtor against a courtyard wall, closing in with a low grounded stance, the ledger-debt about to be settled"],

  // ── ASESINO — Sigilo ──
  ["acechador_nocturno", "Ataque", "sigilo",
    "a worgen stalker (wolf-like, hooded) flowing between shadows with twin daggers reversed, indigo fog parting around its low prowl"],
  ["cuchilla_del_silencio", "Ítem", "sigilo",
    "a black silenced cuchilla laid diagonally across dark velvet, its edge drinking the light, absolutely no people and no figures anywhere in the scene"],
  ["fundirse_en_sombras", "Acción", "sigilo",
    "a human assassin mid-fade, half his body dissolving into indigo smoke as he presses against a moonlit wall, daggers still in hand"],
  ["maestro_caido", "Ataque", "sigilo",
    "a slain grandmaster assassin dissolving into shadow, his silhouette breaking apart into wisps while a hidden blade clatters from his open hand"],
];

async function main() {
  const force = process.env.FORCE === "1";
  const only = process.env.ONLY ? process.env.ONLY.split(",") : null;
  const zai = await ZAI.create();
  let ok = 0, skipped = 0, failed = 0;
  for (const [id, category, spec, subject] of CARDS) {
    if (only && !only.includes(id)) continue;
    const outPath = path.join(OUT_DIR, `${id}.png`);
    if (!force && fs.existsSync(outPath)) {
      skipped++;
      continue;
    }
    const scene = SPEC_SCENE[spec];
    const rule = CATEGORY_RULE[category];
    const prompt = `Subject: ${subject}. Scene: ${scene}. Mood: ${rule}. ${STYLE}`;
    let done = false;
    for (let attempt = 1; attempt <= 3 && !done; attempt++) {
      try {
        const res = await zai.images.generations.create({ prompt, size: "864x1152" });
        const b64 = res?.data?.[0]?.base64;
        if (!b64) throw new Error("respuesta sin base64");
        fs.writeFileSync(outPath, Buffer.from(b64, "base64"));
        console.log(`✓ ${id}.png (${category} · ${spec})`);
        ok += 1;
        done = true;
      } catch (e) {
        console.error(`✗ ${id} (intento ${attempt}): ${e.message}`);
        if (attempt < 3) await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
    if (!done) failed++;
  }
  console.log(`\nGeneradas: ${ok}/${CARDS.length} (saltadas ${skipped}, fallidas ${failed})`);
  if (failed > 0) process.exit(1);
}

main();
