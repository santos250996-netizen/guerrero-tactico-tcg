// ============================================================================
// gen-card-art-western-test.mjs — TEST DE ESTILO (petición del jugador):
// 3 cartas de GUERRERO re-estilizadas a "Western Stylized Cartoon
// Proportions" — contornos de tinta gruesos, cel-shading plano, proporciones
// cartoon exageradas (cabeza grande, torso compacto, manos enormes, armas
// descomunales), paleta western (arena, terracota, naranja atardecer, cuero).
// Sujetos y regla de categoría fieles al contrato v8 (ítem = sin gente,
// full-bleed sin marco). Cartas: tajo_quebrantamuros · colmillo_del_verdugo ·
// hacha_de_ejecucion.
// Uso: bun scripts/gen-card-art-western-test.mjs · FORCE=1 · ONLY=id1,id2
// Pipeline: PNG 864x1152 → fix-card-art-resolution.py (432x576) → png-to-webp.py
// ============================================================================
import ZAI from "z-ai-web-dev-sdk";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "public/cards");

const STYLE =
  "RAW FULL-BLEED ILLUSTRATION with NO card frame, NO border, NO gold trim, NO rounded corners — the artwork is cropped by the canvas edges itself. " +
  "WESTERN STYLIZED CARTOON PROPORTIONS style: bold clean dark-brown ink outlines with confident thick-to-thin linework, flat cel-shaded color blocks with simple two-tone shading, hard crisp shadow edges, " +
  "exaggerated cartoon proportions — oversized head about one third of body height, huge hands, big boots, chunky compact torso, short sturdy legs, comically oversized weapon, " +
  "big expressive face with wide exaggerated grin and gritted teeth, playful menacing energy, " +
  "spaghetti-western poster palette: sun-baked sand beige, dusty terracotta, burnt sunset orange, worn leather brown, faded turquoise accent, " +
  "hard desert sunlight with crisp geometric shadow shapes, drifting dust clouds, rough sun-bleached wooden props, frontier outpost backdrop, " +
  "NOT photorealistic, NOT 3D render, NOT painterly realism, NOT soft airbrush shading, NOT Hearthstone painted style, " +
  "flat cartoon illustration with sharp clean edges, modern western animation series look, " +
  "FULL BLEED artwork: the illustration extends edge to edge to ALL FOUR borders of the canvas, " +
  "absolutely NO ornate frame, NO golden border, NO decorative card frame drawn inside the image, NO vignette frame, " +
  "no text, no letters, no watermark";

// [id, categoría, spec, composición (plano+ángulo+momento), sujeto]
const CARDS = [
  // ── TAJO QUEBRANTAMUROS (Ataque · armas) — figura COMPLETA para lucir las
  //    proporciones cartoon: cabeza enorme, cuerpo achaparrado, espadón gigante.
  ["tajo_quebrantamuros", "Ataque", "armas",
    "full-body side shot at wall height, one wide diagonal swing caught mid-impact, stone debris blasting in a fan behind the blade, dust kicked at his boots",
    "a chunky cartoon orc warrior with an oversized head, huge tusks and tiny furious eyes, swinging a comically oversized jagged greatsword that SPLITS a sun-baked stone rampart block, masonry shards flying outward, his compact body leaning all its weight into the blow"],

  // ── COLMILLO DEL VERDUGO (Ataque · furia) — contrapicado suave, el tajo CAE
  //    hacia cámara; víctima fuera de cuadro (sugerida por el borde rojo).
  ["colmillo_del_verdugo", "Ataque", "furia",
    "low-angle full-body shot looking slightly up from the victim's point of view, the strike plunging DOWN toward the camera, dust ring at his boots, red sunset exploding behind",
    "a cartoon orc executioner with a huge grinning head, scarred brow and bandana whipping in the wind, swinging down a jagged tusk-blade comically oversized for his chunky compact body, both huge hands stacked on the grip"],

  // ── HACHA DE EJECUCIÓN (Ítem · furia) — bodegón puro, SIN gente (regla ítem),
  //    tratamiento cartoon: contornos gruesos, formas simples, sombra dura.
  ["hacha_de_ejecucion", "Ítem", "furia",
    "low-angle close-up still life, camera at ground level, the axe filling the frame diagonally, hard desert backlight rimming the silhouette",
    "a brutal double-bit executioner's axe with bold cartoon outlines embedded upright in a scarred wooden chopping block, crimson cloth fallen beside it, embers drifting through the backlight, absolutely no people, no hands, no figures"],
];

async function main() {
  const force = process.env.FORCE === "1";
  const only = process.env.ONLY ? process.env.ONLY.split(",") : null;
  const zai = await ZAI.create();
  let ok = 0, skipped = 0, failed = 0;
  for (const [id, category, spec, composition, subject] of CARDS) {
    if (only && !only.includes(id)) continue;
    const outPath = path.join(OUT_DIR, `${id}.png`);
    if (!force && fs.existsSync(outPath)) { skipped++; continue; }
    const prompt =
      `Subject: ${subject}. Composition: ${composition}. Category rule: ${category === "Ítem"
        ? "the object is the SOLE protagonist, no characters, no hands, no arms, no figures"
        : category === "Acción"
          ? "the action actively performed by a clearly visible character, readable at a glance"
          : "violent dynamic action caught mid-strike"}. ${STYLE}`;
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
