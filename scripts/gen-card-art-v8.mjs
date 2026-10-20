// ============================================================================
// gen-card-art-v8.mjs — TANDA 40: composición EXCLUSIVA por carta.
//
// Regla nueva del patrón (docs/design-pattern-cards.md §8): el jugador
// detectó plantilla — "misma postura, cambia la raza y el fondo" — así que
// cada regeneración de esta tanda fija PLANO, ÁNGULO y MOMENTO propios
// (primerísimo plano del impacto, contrapicudo, salto hacia cámara, plano
// general aéreo, nivel del suelo lateral…). Dos cartas de la misma spec
// NUNCA comparten silueta ni encuadre.
//
// Uso: bun scripts/gen-card-art-v8.mjs   ·  FORCE=1 · ONLY=id1,id2
// Pipeline: PNG 864x1152 → fix-card-art-resolution.py (432x576) → png-to-webp.py
// ============================================================================
import ZAI from "z-ai-web-dev-sdk";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "public/cards");

const STYLE =
  "RAW FULL-BLEED PAINTING with NO card frame, NO border, NO gold trim, NO rounded corners — the artwork is cropped by the canvas edges itself. " +
  "Stylized realism, visible brushstrokes, NOT photorealistic, NOT 3D render, " +
  "Hearthstone card art style, painted digital illustration, vibrant saturated colors, dramatic cinematic lighting with strong rim light, " +
  "flat color zones in shadows, exaggerated heroic proportions, Blizzard Entertainment concept art, " +
  "FULL BLEED artwork: the painting extends edge to edge to ALL FOUR borders of the canvas, " +
  "absolutely NO ornate frame, NO golden border, NO decorative card frame drawn inside the image, NO vignette frame, " +
  "no text, no letters, no watermark";

// [id, categoría, spec, composición exclusiva (plano+ángulo+momento), sujeto]
const CARDS = [
  // ── HACHA (Ítem · furia) — el marco dorado dibujado en el arte se va:
  //    bodegón a CONTRALUZ desde el suelo, la ejecución ya ocurrió.
  ["hacha_de_ejecucion", "Ítem", "furia",
    "extreme low-angle close-up backlit still life, camera at ground level",
    "a brutal double-bit executioner's axe embedded upright in a scarred chopping block streaked with old rust marks, crimson cloth fallen beside it, embers drifting through backlight, the axe silhouette filling the frame diagonally"],

  // ── COLMILLO DEL VERDUGO (Ataque · furia) — antes: verdugo posando sobre
  //    caído. Ahora: CONTRAPICADO extremo, el tajo CAE hacia la cámara.
  ["colmillo_del_verdugo", "Ataque", "furia",
    "extreme worm's-eye view from below the victim, looking straight up, motion blur on the descending strike",
    "a scarred orc executioner seen from below mid-swing, his jagged tusk-blade plunging DOWN toward the camera, the victim's shoulder and shield edge at the bottom corner, blood-red light exploding behind the blade"],

  // ── FIERA ENSANGRENTADA (Ataque · furia) — antes: humano en pose agachada.
  //    Ahora: FIERA real (worgen) saltando HACIA cámara, plano horizontal.
  ["fiera_ensangrentada", "Ataque", "furia",
    "ground-level horizontal tracking shot, the beast leaping directly at the camera, claws first, dust kicked up",
    "a blood-muzzled worgen war-beast (wolf-like, fangs bared, wounds streaked red) mid-leap pouncing straight at the viewer, foreclaws outstretched, its claws and tail CROPPED OFF by the canvas edges, subject partially out of frame, red battlefield floor blurred beneath, cinematic crop with no room for any border"],

  // ── TAJO QUEBRANTAMUROS (Ataque · armas) — antes: pose estática con
  //    mandoble en alto. Ahora: PRIMERÍSIMO plano del IMPACTO en la muralla.
  ["tajo_quebrantamuros", "Ataque", "armas",
    "ultra close-up on the impact point, stone debris exploding toward the camera, only the wielder's armored arms and shoulder visible at frame edge",
    "a massive jagged greatsword blade caught the instant it SPLITS a stone rampart block, masonry shards blasting outward, amber forge-dust and sparks in the crack, the orc warrior's gauntleted hands gripping the hilt at the right edge"],

  // ── JUSTICIA DE LA LEGIÓN (Acción · armas) — antes: héroe posando sobre
  //    vencidos. Ahora: PLANO GENERAL AÉREO — la legión ENTERA ejecuta.
  ["justicia_de_la_legion", "Acción", "armas",
    "high aerial wide shot from behind the legion, dozens of soldiers descending the slope in wedge formation, banners high, long dusk shadows",
    "a human legion commander on horseback at the crest pointing his sword forward, sentencing the enemy lines below, the entire legion charging down the hill behind him under storm-red dusk clouds"],

  // ── QUEBRANTADOR DE FILAS (Ataque · armas) — antes: gigante posando con
  //    martillo. Ahora: NIVEL DEL SUELO LATERAL — la fila se ROMPE de verdad.
  ["quebrantador_de_filas", "Ataque", "armas",
    "side view at shield-wall height, one wide lateral sweep, shields splintering mid-air across the frame",
    "a towering tauren hammer-wielder smashing THROUGH an enemy shield-wall, wooden shields cracking and flying apart, soldiers hurled sideways, the hammer head caught at full extension in the middle of the sweep"],
];

async function main() {
  const force = process.env.FORCE === "1";
  const only = process.env.ONLY ? process.env.ONLY.split(",") : null;
  const zai = await ZAI.create();
  let ok = 0, skipped = 0, failed = 0;
  for (const [id, category, spec, composition, subject] of CARDS) {
    if (only && !only.includes(id)) continue;
    const outPath = path.join(OUT_DIR, `${id}.png`);
    if (!force && fs.existsSync(outPath)) {
      skipped++;
      continue;
    }
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
