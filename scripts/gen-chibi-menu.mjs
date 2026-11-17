// gen-chibi-menu.mjs — recrea el arte de public/menu en chibi (skill guerrero-tactico-chibi-art):
// 18 fondos de carril (768x1344) + main-bg + profile-bg-raw (768x1344) + game-icon-1024 (1024x1024).
// Uso: bun scripts/gen-chibi-menu.mjs · FORCE=1 · ONLY=raiz,main-bg
// Escenas de carriles de clases nuevas adaptadas de gen-lane-bgs-western-v3.mjs.
// Checkpoint: salta PNG existente (relanzable). El webp lo hace convert-chibi-menu.py.
// Anti-texto/anti-marco espejo de skills/guerrero-tactico-chibi-art (mantener en sync).
import ZAI from "z-ai-web-dev-sdk";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const STAGE = path.join(ROOT, "assets-src/chibi-menu");
const PROGRESS = path.join(ROOT, "scripts/chibi-menu-progress.log");

const OPENER =
  "RAW FULL-BLEED ILLUSTRATION with NO card frame, NO border, NO gold trim, NO rounded corners, subject cropped by the canvas edges, no empty areas. " +
  "No plaques, no banners with writing, no scrolls with lines, no engraved runes, no numbered counters, no title areas, no labels, no captions, no letters, no numbers, no watermark, no signature, no UI, no logo. " +
  "Pure illustration, no written language of any kind.";

const ENV_STYLE =
  "Chibi cartoon game ENVIRONMENT art: thick uniform black outlines on EVERY element (props, architecture, terrain, foliage), same heavy line weight everywhere. " +
  "STRICT flat cel shading: only 2 tones per surface (one base color + one hard-edged flat shadow shape), absolutely no gradients, no soft ambient light, no painterly brushwork. " +
  "2D game sprite finish, bold saturated flat colors, clean simplified shapes, simple flat color-block background. " +
  "Pure environment art: NO characters, NO people, NO creatures, NO animals.";

const CLOSER =
  "Absolutely zero typography, zero letters, zero numbers, zero symbols that resemble writing, zero signs, zero labels, zero watermarks, zero signatures, zero UI elements, zero logos. No gradients, no soft shading, no photorealism, no 3D render.";

const ITEMS = [
  { id: "lane-armas", size: "768x1344", scene: "vertical environment art of a war ARMORY wall interior, racks of chunky cartoon swords, axes and maces on wooden pegs, faded crimson war banners hanging between the racks, warm amber torchlight pools on flat stone, weapons cropped by the canvas edges" },
  { id: "lane-proteccion", size: "768x1344", scene: "vertical environment art of a fortress WALL interior, stacked kite shields and tower shields leaning in neat rows, a burning iron brazier, stone battlements with arrow slits, flat blue-steel and crimson palette, shields cropped by the canvas edges" },
  { id: "lane-furia", size: "768x1344", scene: "vertical environment art of a savage WAR-CAMP ground at golden hour, splintered wooden spikes and crude totems, torn crimson banners flapping, scorched churned earth, flat dark reds and browns, brutal oversized props cropped by the canvas edges" },
  { id: "lane-arcana", size: "768x1344", scene: "vertical environment art of an ARCANE STUDY, floating violet rune-stones and glowing orbs, shelves packed with grimoires, one big levitating crystal casting flat violet glow pools, deep purple and magenta palette" },
  { id: "lane-fuego", size: "768x1344", scene: "vertical environment art of a burning FORGE-VOLCANO interior, flat lava channels between obsidian rocks, ember sparks drifting, tiny salamanders slithering over stones, a cracked iron lantern glowing ember-orange, flat orange-red palette" },
  { id: "lane-hielo", size: "768x1344", scene: "vertical environment art of a frozen GLACIER pass, towering flat-shaded ice walls, frost-covered banners frozen stiff on poles, chunks of drifting snow, pale blue and white palette, ice walls cropped by the canvas edges" },
  { id: "lane-veneno", size: "768x1344", scene: "vertical environment art of a murky alchemist DEN, shelves of bubbling green vials and flasks, a caged viper coiled on a shelf, dripping copper pipes, flat lime-green glow pools on murky brown stone" },
  { id: "lane-combate", size: "768x1344", scene: "vertical environment art of a cobblestone back-alley training yard, scattered wooden crates and barrels, hanging lanterns, crossed swords on a wall rack, flat warm browns and slate grays, props cropped by the canvas edges" },
  { id: "lane-sigilo", size: "768x1344", scene: "vertical environment art of moonlit ROOFTOP ridges at night, dark tiled roofs with chimney pots, hanging shadowed laundry lines, a sliver of moon in a flat navy sky, charcoal and navy palette" },
  { id: "lane-raiz", size: "768x1344", scene: "vertical environment art of a mossy OLD-GROWTH grove at golden morning, colossal gnarled tree ROOTS crossing the frame like cathedral arches, thick moss cushions and tiny mushrooms at their base, thin gold sunbeams raking between the trunks, deep moss green and warm bark brown" },
  { id: "lane-flor", size: "768x1344", scene: "vertical environment art of a PINK-AND-GOLD flower meadow at dawn, comically oversized blossoms towering in the foreground cropped by the canvas edges, rolling green hills behind, fat golden pollen motes drifting, rosy sky with flat cartoon clouds" },
  { id: "lane-esporas", size: "768x1344", scene: "vertical environment art of a dark FUNGAL hollow at dusk, giant mushroom clusters with flat lime-bioluminescent glow, thick glowing spore motes floating upward, wet mossy stones and gnarled roots, deep teal-green shadows with lime light pools" },
  { id: "lane-puente", size: "768x1344", scene: "vertical environment art of a tall wooden WAR SHIP deck at dawn seen from the middle of the deck, chunky wooden planks leading to a bowsprit, thick masts and rope rigging crossing the frame, a round wooden helm wheel, open cartoon sea horizon with flat waves and warm rose-gold sky" },
  { id: "lane-bodega", size: "768x1344", scene: "vertical environment art of a ship HOLD interior, stacked cargo crates and oak barrels in careful cartoon order, thick wooden support beams, a swinging rope lantern casting warm amber pools, rope coils and burlap sacks on the plank floor, cozy dark browns with gold lantern light" },
  { id: "lane-artilleria", size: "768x1344", scene: "vertical environment art of a war ship GUN deck, a row of chunky bronze CANNONS on rope tackle pointing through open portholes, thin powder-smoke haze, stacked cannonballs in a wooden grid, dim warm lantern light on worn timber, teal dusk visible through the portholes" },
  { id: "lane-taller", size: "768x1344", scene: "vertical environment art of a camp WORKSHOP under a canvas awning, a heavy wooden workbench covered with cartoon hand tools, hammers and wrenches of comically varied sizes, wooden gears and rolled blueprints in a basket, warm afternoon light through the awning gap, sap amber and bark brown palette" },
  { id: "lane-maquinaria", size: "768x1344", scene: "vertical environment art of a wall of interlocking BRASS gears and clockwork machinery, comically oversized cogwheels meshing with tiny ones, copper pipes and pressure gauges with round dials, soft steam puffs, warm amber metal with green oxidized patina accents" },
  { id: "lane-chispa", size: "768x1344", scene: "vertical environment art of a dark workshop corner with COPPER coils and static machines, bright blue-electric SPARKS arcing between two chunky electrodes, fuchsia and cyan glow pools on the metal bench, big round glass battery jars with bubbling liquid, dark teal shadows" },
  { id: "main-bg", size: "768x1344", scene: "vertical MENU background for a fantasy war card game: sweeping stylized vista over a war-torn valley at golden hour, a colossal dark stone TOWER on a crag under flat clouds, tiny distant war camps with crimson banners scattered below, warm parchment-toned sky, calm simple flat shapes with generous quiet sky in the upper third" },
  { id: "profile-bg-raw", size: "768x1344", scene: "vertical PROFILE backdrop: cozy war-camp commander tent interior at golden hour, draped crimson banner cloth and hanging tapestries, a wooden palisade and spear rack behind, warm brazier glow pools, calm flat shapes leaving quiet space in the middle" },
  { id: "game-icon-1024", size: "1024x1024", scene: "chibi GAME ICON emblem: a round dark crimson badge with a thick GOLD RING border, crossed cartoon sword and tower shield in the center with thick black outlines and flat cel shading, radial dark crimson-to-black background filling the whole square, perfectly centered symmetric emblem, no characters" },
];

function log(line) {
  fs.appendFileSync(PROGRESS, `${new Date().toISOString()} ${line}\n`);
}

function buildPrompt(item) {
  return [OPENER, "", ENV_STYLE, "", `Scene: ${item.scene}.`, "", CLOSER].join("\n");
}

async function main() {
  const only = process.env.ONLY ? new Set(process.env.ONLY.split(",")) : null;
  const force = process.env.FORCE === "1";
  fs.mkdirSync(STAGE, { recursive: true });
  const todo = ITEMS.filter((it) => {
    if (only && !only.has(it.id)) return false;
    const out = path.join(STAGE, `${it.id}.png`);
    return force || !fs.existsSync(out) || fs.statSync(out).size === 0;
  });
  console.log(`pendientes: ${todo.length}/${ITEMS.length}`);
  log(`start: ${todo.length}/${ITEMS.length}`);
  const zai = await ZAI.create();
  let ok = 0, fail = 0;
  const failedIds = [];
  for (const it of todo) {
    const outPath = path.join(STAGE, `${it.id}.png`);
    const prompt = buildPrompt(it);
    let done = false;
    for (let attempt = 1; attempt <= 4 && !done; attempt++) {
      try {
        const res = await zai.images.generations.create({ prompt, size: it.size });
        const b64 = res?.data?.[0]?.base64;
        if (!b64) throw new Error("respuesta sin base64");
        fs.writeFileSync(outPath, Buffer.from(b64, "base64"));
        console.log(`✓ ${it.id}`);
        log(`ok ${it.id}`);
        ok += 1;
        done = true;
      } catch (e) {
        const msg = String(e?.message || e);
        console.error(`✗ ${it.id} (intento ${attempt}): ${msg.slice(0, 160)}`);
        log(`fail ${it.id} intento ${attempt}: ${msg.slice(0, 120)}`);
        const wait = /429|rate|too many|busy/i.test(msg) ? 15000 * attempt : 2000 * attempt;
        if (attempt < 4) await new Promise((r) => setTimeout(r, wait));
      }
    }
    if (!done) { fail += 1; failedIds.push(it.id); }
  }
  console.log(`\nGenerados: ${ok} · fallidos: ${fail}${failedIds.length ? " → " + failedIds.join(",") : ""}`);
  log(`end: ok=${ok} fail=${fail}${failedIds.length ? " ids=" + failedIds.join(",") : ""}`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => { console.error(e); log(`crash: ${String(e).slice(0, 200)}`); process.exit(1); });
