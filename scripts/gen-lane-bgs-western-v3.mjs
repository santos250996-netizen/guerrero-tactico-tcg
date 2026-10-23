// ============================================================================
// gen-lane-bgs-western-v3.mjs — FONDOS DE CARRIL de las clases nuevas V3
// (botánico · pirata · tinker) en el estilo ÚNICO aprobado:
// «Western Stylized Cartoon Proportions» (§4.6 del design pattern).
// Reemplaza al gen-lane-bgs.ts (deprecated, estilo viejo) y al fantasma
// gen-lane-bgs-western-v3.mjs que el worklog citaba y nunca existió.
//
// Pipeline: generate 864x1152 → sharp cover-crop → 768x1344 (dim de los
// lane-*.webp existentes en public/menu/) → webp.
// Escenas alineadas a las paletas APROBADAS de las cartas de cada clase
// (design-pattern §4: arboleda verde musgo + oro de alba · pradera rosada
// y dorada · hondonada fúngica con lima bioluminiscente).
// Uso: bun scripts/gen-lane-bgs-western-v3.mjs · FORCE=1 · ONLY=raiz,flor,...
// ============================================================================
import ZAI from "z-ai-web-dev-sdk";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const TARGET_W = 768;
const TARGET_H = 1344;
const OUT_DIR = path.join(process.cwd(), "public/menu");

const STYLE =
  "RAW FULL-BLEED ILLUSTRATION with NO frame, NO border, NO rounded corners — the artwork is cropped by the canvas edges itself. " +
  "FLAT CEL-SHADED CARTOON BACKGROUND ART for an animated TV series: bold clean dark-brown ink outlines with confident thick-to-thin linework, flat color blocks with simple two-tone shading, hard crisp shadow edges, " +
  "gentle but wild storybook energy, exaggerated cartoon shapes in the environment (comically oversized plants, chunky wooden beams, round haystack curves), " +
  "mossy old-growth palette: deep moss green, sap amber, wet bark brown, dawn gold, " +
  "hard light with crisp geometric shadow shapes, drifting pollen and glowing motes, " +
  "STRICTLY ANCIENT FANTASY WORLD from the age before gunpowder, " +
  "NO characters, NO people, NO creatures, NO animals — pure environment art, " +
  "NOT photorealistic, NOT 3D render, NOT painterly realism, NOT soft airbrush shading, NOT a photograph, " +
  "flat cartoon animation series look with sharp clean edges, " +
  "FULL BLEED artwork extending edge to edge to ALL FOUR borders of the canvas, " +
  "absolutely NO ornate frame, NO golden border, NO vignette frame, " +
  "no text, no letters, no watermark";

const BG_LIST = [
  {
    id: "raiz",
    prompt:
      "vertical environment art of a mossy OLD-GROWTH GROVE at golden morning, colossal gnarled tree ROOTS crossing the frame like cathedral arches, thick moss cushions and tiny mushrooms at their base, thin gold sunbeams raking between the trunks, deep moss green and warm bark brown with dawn gold highlights",
  },
  {
    id: "flor",
    prompt:
      "vertical environment art of a PINK-AND-GOLD FLOWER MEADOW at dawn, comically oversized blossoms towering in the foreground, rolling green hills behind, fat golden pollen motes drifting in the warm light, pink petals floating on a soft breeze, rosy sky with flat cartoon clouds",
  },
  {
    id: "esporas",
    prompt:
      "vertical environment art of a dark FUNGAL HOLLOW at night, giant mushroom clusters in flat lime-bioluminescent glow, thick glowing spore motes floating upward like underwater snow, wet mossy stones and gnarled roots, deep teal-green shadows with sickly lime light pools",
  },
  {
    id: "puente",
    prompt:
      "vertical environment art of a tall wooden WAR SHIP DECK at dawn seen from the middle of the deck, chunky wooden planks leading to a bowsprit, thick masts and rope rigging crossing the frame, a round wooden helm wheel, open cartoon sea horizon with flat waves and a warm rose-gold sky",
  },
  {
    id: "bodega",
    prompt:
      "vertical environment art of a ship HOLD interior, stacked cargo CRATES and oak barrels in careful cartoon order, thick wooden support beams, a swinging rope lantern casting warm amber pools, rope coils and burlap sacks on the plank floor, cozy dark browns with gold lantern light",
  },
  {
    id: "artilleria",
    prompt:
      "vertical environment art of a war ship GUN DECK, a row of chunky bronze CANNONS on rope-tackle pointing through open portholes, thin powder smoke haze drifting, stacked cannonballs in a wooden grid, dim warm lantern light on worn timber, dramatic teal dusk visible through the portholes",
  },
  {
    id: "taller",
    prompt:
      "vertical environment art of a camp WORKSHOP under a canvas awning, a heavy wooden workbench covered with cartoon hand tools, hammers and wrenches of comically varied sizes, wooden gears and blueprints rolled in a basket, warm afternoon light through the awning gap, sap amber and wet bark brown palette",
  },
  {
    id: "maquinaria",
    prompt:
      "vertical environment art of a wall of interlocking BRASS GEARS and clockwork machinery, comically oversized cogwheels meshing with tiny ones, copper pipes and pressure gauges with round dials, soft steam puffs, warm amber metal tones with green oxidized patina accents, cozy workshop gloom",
  },
  {
    id: "chispa",
    prompt:
      "vertical environment art of a dark workshop corner with COPPER COILS and static machines, bright blue-electric SPARKS arcing between two chunky electrodes, fuchsia and cyan glow pools on the metal bench, big round glass battery jars with bubbling liquid, dramatic dark teal shadows",
  },
];

async function genOne(zai, item) {
  const out = path.join(OUT_DIR, `lane-${item.id}.webp`);
  if (!process.env.FORCE && fs.existsSync(out)) {
    console.log(`↷ lane-${item.id} ya existe (FORCE para regenerar)`);
    return true;
  }
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await zai.images.generations.create({
        prompt: `${item.prompt}. ${STYLE}`,
        size: "864x1152",
      });
      const b64 = r?.images?.[0]?.base64;
      if (!b64) throw new Error("respuesta sin base64");
      const png = Buffer.from(b64, "base64");
      await sharp(png)
        .resize(TARGET_W, TARGET_H, { fit: "cover", position: "centre" })
        .webp({ quality: 80 })
        .toFile(out);
      console.log(`✓ lane-${item.id}.webp (${TARGET_W}x${TARGET_H})`);
      return true;
    } catch (e) {
      const is429 = /429|Too many/i.test(e.message);
      console.error(`✗ lane-${item.id} (intento ${attempt}): ${e.message}`);
      if (is429 && attempt < 3) {
        await new Promise((r) => setTimeout(r, 15000 * attempt));
      } else if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 4000));
      }
    }
  }
  return false;
}

const only = process.env.ONLY ? new Set(process.env.ONLY.split(",")) : null;
const list = BG_LIST.filter((b) => !only || only.has(b.id));

const zai = await ZAI.create();
let ok = 0;
for (const item of list) {
  if (await genOne(zai, item)) ok++;
  await new Promise((r) => setTimeout(r, 3000)); // pausa anti-429 entre fondos
}
console.log(`\nGenerados: ${ok}/${list.length}`);
if (ok < list.length) process.exitCode = 1;
