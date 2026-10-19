// ============================================================================
// gen-card-art-v6.mjs — cartas de JEFE (4ª tanda, 12 artes) + REESTILO global.
//
// El patrón de diseño (docs/design-pattern-cards.md §4.6-4.7) exige:
//   ESTILO: "Stylized realism, Hearthstone-like" — NUNCA fotorrealista.
//   RAZAS:  los humanoides SIEMPRE pertenecen al catálogo de razas.
// Esta tanda corrige la deriva realista de las tandas previas: todos los
// prompts llevan el STYLE corregido y una raza del catálogo cuando hay
// personajes.
// Uso: bun scripts/gen-card-art-v6.mjs            (solo las que faltan)
//      FORCE=1 bun scripts/gen-card-art-v6.mjs    (regenera)
//      ONLY=id1,id2  … genera solo esas
// ============================================================================
import ZAI from "z-ai-web-dev-sdk";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "public/cards");

// §4.6 — ESTILO (corregido: stylized realism, NO fotorrealismo)
const STYLE =
  "Stylized realism, visible brushstrokes, NOT photorealistic, NOT 3D render, full art no borders no frame full bleed, " +
  "Hearthstone card art style, painted digital illustration, vibrant saturated colors, dramatic cinematic lighting with strong rim light, " +
  "epic composition, flat color zones in shadows, exaggerated heroic proportions, Blizzard Entertainment concept art, " +
  "no text, no letters, no borders, no frame, no watermark";

// §4.3 — composición por categoría
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

// §4.7 — CATÁLOGO DE RAZAS (los humanoides SIEMPRE son una de estas)
// Guerrero: orco · tauren · enano · humano · worgen
// Mago:     humano · elfo de sangre · elfo nocturno · draenei · gnomo
// Asesino:  humano · goblin · no-muerto · elfo nocturno · worgen

const SPEC_SCENE = {
  sigilo: "moonless night, dark velvet stillness, indigo shadows and fog",
  hielo: "frozen glacier wasteland, crystalline frost and pale cyan light",
  proteccion: "sunlit fortress courtyard with sky-blue banners and golden halos",
};

// [id, categoría, spec, sujeto del arte (raza del catálogo cuando hay personaje)]
const CARDS = [
  // ───────────── SIGILO — Vharos, Sombra Primigenia ─────────────
  ["punialada_traicionera", "Ataque", "sigilo",
    "a hooded goblin rogue driving a jagged dagger into the back of a distracted human guard, the blade catching cold indigo moonlight, betrayal caught at the instant of impact"],
  ["cuchilla_susurrante", "Ataque",
    "sigilo",
    "an undead assassin (skeletal face, tattered hood) whose blackened blade whispers glowing indigo runes toward nearby hooded allies, feeding their resolve"],
  ["velo_nocturno", "Ítem", "sigilo",
    "a flowing dark velvet veil draped over a stone pedestal, woven with indigo shadow threads that swallow the light around it, absolutely no people and no figures anywhere in the scene"],
  ["cobro_por_encargo", "Acción", "sigilo",
    "a mortally wounded goblin hitman pressing a heavy coin purse into the hands of a younger worgen comrade as pale light leaves his chest, the contract finally paid"],

  // ───────────── HIELO — Nyx, Reina de Escarcha ─────────────
  ["aliento_gelido", "Ataque", "hielo",
    "a skeletal frost wyrm breathing a sweeping cone of freezing breath over enemy ranks, frost crystallizing instantly on shields and banners"],
  ["estatua_viviente", "Ataque", "hielo",
    "a towering ice statue slowly coming alive, glowing cyan cracks spreading across its frozen body as it takes a grinding step forward, snow bursting from its joints"],
  ["cetro_de_escarcha", "Ítem", "hielo",
    "an ornate staff topped with a crystallized frost orb resting upright on an icy plinth, rime creeping along its silver shaft, absolutely no people and no figures anywhere in the scene"],
  ["granizo_defensivo", "Acción", "hielo",
    "an elf sorceress (pale skin, long ears, cyan robes) summoning a roaring hailstorm that hammers into a floating dome of ice shielding the defenders below"],

  // ───────────── PROTECCIÓN — Korgath, Coloso de Hierro ─────────────
  ["escudero_diligente", "Ataque", "proteccion",
    "a young dwarf squire hurrying along a shield wall, tightening the leather straps of a wounded orc knight's dented tower shield, dust and golden light around them"],
  ["torre_de_asedio_viviente", "Ataque", "proteccion",
    "a colossal living siege tower of timber and iron striding on giant wooden legs, planks groaning as the construct grows taller with every step, banners fluttering from its crown"],
  ["paves_de_la_muralla", "Ítem", "proteccion",
    "a towering pavise shield standing upright like a segment of wall, riveted steel rim and sky-blue heraldic paint glinting in the sun, absolutely no people and no figures anywhere in the scene"],
  ["juramento_de_acero", "Acción", "proteccion",
    "three warriors — an orc, a tauren and a dwarf — pounding their shields in unison with fists and axe hafts, steel ringing as one, oath-fire burning in their eyes"],
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
      console.log(`↷ ${id}.png ya existe`);
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
