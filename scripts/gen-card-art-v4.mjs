// ============================================================================
// gen-card-art-v4.mjs — ronda de correcciones V3.2 del patrón de diseño
// (docs/design-pattern-cards.md §5-6): 11 artes = 7 regenerados + 4 renombrados.
//
// REGLAS NUEVAS DEL USUARIO (interpretadas y codificadas aquí):
//   ÍTEM    → el objeto es el ÚNICO protagonista: bodegón centrado, SIN
//             personajes/manos/brazos (anatomía imposible incluida).
//   ACCIÓN  → alguien VISIBLE EJECUTANDO la acción (nunca símbolo abstracto
//             ni escena "vacía") y escena legible de un vistazo.
//   ATAQUE  → el golpe EN PLENA EJECUCIÓN por el portador de la spec.
//   CLASE   → el sujeto pertenece a la imaginería de la clase (sin guerreros
//             en cartas de mago, sin nombres de paladín en el asesino).
//
// Arte = f(NOMBRE, CATEGORÍA, SPEC) — estilo dark-fantasy 864x1152 (3:4).
// Uso: bun scripts/gen-card-art-v4.mjs            (sobrescribe siempre)
// ============================================================================
import ZAI from "z-ai-web-dev-sdk";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "public/cards");

const STYLE =
  "dark fantasy trading card game art, painted digital illustration, dramatic cinematic lighting, " +
  "rich saturated colors, epic composition, highly detailed, no text, no letters, no borders, no frame, no watermark";

// Modificador OBLIGATORIO por categoría (reglas V3.2 del usuario):
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
  furia: "savage blood-red battlefield, embers and rage",
  fuego: "burning volcanic horizon, molten glow and floating sparks",
  hielo: "frozen glacier wasteland, crystalline frost and pale cyan light",
  veneno: "shadowy swamp thicket with sickly lime-green mist",
  combate: "grimy duel courtyard at blood-red dusk, cobblestones and ruins",
  sigilo: "moonless night, dark velvet stillness, indigo shadows and fog",
};

// [id, categoría, sujeto del arte (derivado del NOMBRE)]
const CARDS = [
  // ---- 7 regenerados (id y nombre se mantienen, el arte NO cumplía) ----
  ["toque_de_guerra", "Acción",
    "a scarred warrior herald standing on a fortified rampart BLOWING a great war horn with total effort, visible golden sound-wave ripples rolling out over the ranks of soldiers below raising their weapons in answer, the call-to-arms actively performed"],
  ["hacha_de_ejecucion", "Ítem",
    "a massive executioner's axe: notch-scarred double blade with dried blood, leather-wrapped haft planted upright on a black stone altar, embers drifting around the blade"],
  ["tormenta_de_brasas", "Acción",
    "a robed fire mage on a ridge conjuring a swirling cyclone of glowing embers and burning cinders that spirals down onto enemy lines below, raised hands channeling a bright spiraling column of sparks, the storm obviously created and controlled by the mage"],
  ["viento_cortante", "Acción",
    "an ice sorcerer conjuring a razor blizzard, his staff raised high with swirling shards of crystalline ice streaming from its tip across the battlefield, the freezing wind visibly cutting through enemy ranks hunched behind shields"],
  ["nube_toxica", "Acción",
    "a hooded assassin hurling a small clay vial that bursts mid-air into a billowing cloud of toxic green gas engulfing two enemy soldiers who stagger coughing, both the thrower and the spreading poison cloud clearly visible"],
  ["estoque_afilado", "Ítem",
    "a slender duelist's rapier with a gleaming polished blade and elegant swept hilt planted point-down between cobblestones of a duel courtyard, red dusk light glinting along the razor edge"],
  ["cuchilla_del_silencio", "Ítem",
    "a matte black assassin's dagger whose blade swallows the light, lying on dark velvet cloth, faint cold moonlight tracing only its sharpened edge, thin indigo mist curling around it"],

  // ---- 4 renombrados (nuevo id → arte nuevo derivado del nuevo nombre) ----
  ["farol_igneo", "Ítem",
    "an ornate arcane bronze lantern with a living magical flame burning inside its crystal glass, faint runes and floating embers orbiting the lantern, warm glow on an ancient stone plinth"],
  ["estallido_igneo", "Ataque",
    "a fire mage unleashing a sudden blast of molten fire from his outstretched palm, the explosion caught mid-detonation as it engulfs a small doomed enemy soldier, the mage clearly visible mid-cast with billowing robes"],
  ["vibora_ponzonosa", "Ataque",
    "a sleek dark-scaled viper coiled low on a mossy stone beam ready to strike, forked tongue flicking, lethal fangs dripping glowing lime-green venom, a poisoner's trained serpent lurking in the shadows"],
  ["ajuste_de_cuentas", "Acción",
    "a cloaked daggerman cornering a beaten debtor against a crumbling alley wall, his blade leveled at the man's throat as the debt is settled once and for all, grim tense moment, both figures clearly visible"],
];

async function main() {
  const zai = await ZAI.create();
  let ok = 0;
  for (const [id, category, subject] of CARDS) {
    const outPath = path.join(OUT_DIR, `${id}.png`);
    const specMap = {
      toque_de_guerra: "armas",
      hacha_de_ejecucion: "furia",
      tormenta_de_brasas: "fuego",
      viento_cortante: "hielo",
      nube_toxica: "veneno",
      estoque_afilado: "combate",
      cuchilla_del_silencio: "sigilo",
      farol_igneo: "fuego",
      estallido_igneo: "fuego",
      vibora_ponzonosa: "veneno",
      ajuste_de_cuentas: "combate",
    };
    const scene = SPEC_SCENE[specMap[id]];
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
  console.log(`\nGeneradas: ${ok}/${CARDS.length}`);
  if (ok < CARDS.length) process.exit(1);
}

main();
