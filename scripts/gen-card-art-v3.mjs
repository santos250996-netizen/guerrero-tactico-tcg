// ============================================================================
// gen-card-art-v3.mjs — genera el arte de las 11 cartas renombradas/recategorizadas
// en la auditoría V3.1 del patrón de diseño (docs/design-pattern-cards.md §4-5).
//
// Arte = f(NOMBRE, CATEGORÍA, SPEC):
//   · sujeto = el nombre literal
//   · escena = imaginería de la spec (armas/proteccion/furia/arcana/fuego/…)
//   · pose/luz = categoría (Ataque acción violenta · Ítem objeto · Acción evento)
//   · estilo = pintura dark-fantasy, 3:4 (864x1152), sin texto ni marcos
//
// Uso: bun scripts/gen-card-art-v3.mjs
// ============================================================================
import ZAI from "z-ai-web-dev-sdk";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "public/cards");

const STYLE =
  "dark fantasy trading card game art, painted digital illustration, dramatic cinematic lighting, " +
  "rich saturated colors, epic composition, highly detailed, no text, no letters, no borders, no frame, no watermark";

const SPEC_SCENE = {
  armas: "battlefield with forges, broken weapons and amber dust in the air",
  proteccion: "stone fortress ramparts and shield wall, cold sky-blue light",
  furia: "savage blood-red battlefield, embers and rage",
  arcana: "violet arcane energy vortex, floating runic debris",
  fuego: "burning volcanic landscape, molten glow and floating sparks",
  hielo: "frozen glacier wasteland, crystalline frost and pale cyan light",
  veneno: "toxic fungus swamp, sickly lime-green mist",
  combate: "urban battlefield ruins, blood-red dusk of duels",
  sigilo: "moonless night rooftops, indigo shadows and fog",
};

// [id, sujeto (nombre literal), categoría → mood]
const CARDS = [
  ["tajo_quebrantamuros", "a colossal sword SWING mid-impact shattering a stone wall into flying debris, blade trail of amber light, armor-splitting blow", "violent dynamic action"],
  ["duelista_errante", "a lone wandering duelist fencer in a battered cloak stepping forward with blade drawn, determined lone fighter", "violent dynamic action"],
  ["toque_de_guerra", "a war horn being BLOWN by unseen lungs, visible sound shockwave rippling outward through warrior ranks, the rallying call unfolding", "unfolding event"],
  ["abanderado_de_la_cohorte", "a warrior standard-bearer charging forward planting a tall cohort banner, cape and banner whipping in the wind, inspiring frontline fighter", "violent dynamic action"],
  ["guardian_juramentado", "a sworn guardian knight in oath-inscribed armor raising a gauntlet to rally the weakest ally, resolute protector mid-charge", "violent dynamic action"],
  ["conjurador_de_estrellas", "an arcane star conjurer mage summoning a swirling vortex of violet stars between raised hands, gathering power from nearby allies", "violent dynamic action"],
  ["aberracion_arcana", "an unstable arcane aberration — a floating creature of wild violet energy and displaced matter, surging with excess power about to dissipate", "violent dynamic action"],
  ["golpe_fundidor", "a molten overhead strike smashing down like liquid metal poured from a crucible, lava splash and sparks on impact", "violent dynamic action"],
  ["coloso_de_escarcha", "a towering frost colossus of living ice, crystalline armor regrowing over its shoulders, glacier giant striding forward", "violent dynamic action"],
  ["espora_viviente", "a living fungal spore creature — pulsating mushroom being sprouting new caps as it grows, drifting toxic spores", "violent dynamic action"],
  ["fundirse_en_sombras", "a hooded figure melding and dissolving into swirling shadows, body half-gone into darkness, only faint glowing eyes remain — the act of vanishing", "unfolding event"],
];

async function main() {
  const zai = await ZAI.create();
  let ok = 0;
  for (const [id, subject, mood] of CARDS) {
    const outPath = path.join(OUT_DIR, `${id}.png`);
    if (fs.existsSync(outPath)) {
      console.log(`↷ ya existe, se omite: ${id}`);
      ok += 1;
      continue;
    }
    const spec = id.split("_").find((w) => SPEC_SCENE[w]) ?? "";
    // La spec se determina del catálogo, no del slug — mapa explícito:
    const specMap = {
      tajo_quebrantamuros: "armas",
      duelista_errante: "armas",
      toque_de_guerra: "armas",
      abanderado_de_la_cohorte: "proteccion",
      guardian_juramentado: "proteccion",
      conjurador_de_estrellas: "arcana",
      aberracion_arcana: "arcana",
      golpe_fundidor: "fuego",
      coloso_de_escarcha: "hielo",
      espora_viviente: "veneno",
      fundirse_en_sombras: "sigilo",
    };
    const scene = SPEC_SCENE[specMap[id]];

    const prompt = `Subject: ${subject}. Scene: ${scene}. Mood: ${mood}. ${STYLE}`;
    let done = false;
    for (let attempt = 1; attempt <= 3 && !done; attempt++) {
      try {
        const res = await zai.images.generations.create({ prompt, size: "864x1152" });
        const b64 = res?.data?.[0]?.base64;
        if (!b64) throw new Error("respuesta sin base64");
        fs.writeFileSync(outPath, Buffer.from(b64, "base64"));
        console.log(`✓ ${id}.png`);
        ok += 1;
        done = true;
      } catch (e) {
        console.error(`✗ ${id} (intento ${attempt}): ${e.message}`);
        if (attempt < 3) await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
  }
  console.log(`\nGeneradas: ${ok}/${CARDS.length}`);
  if (ok < CARDS.length) process.exit(1);
}

main();
