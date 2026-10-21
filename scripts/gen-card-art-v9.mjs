// ============================================================================
// gen-card-art-v9.mjs — V3.0 T-B: BOTÁNICO 🌿 (28 cartas).
// ============================================================================
// Mismo contrato que v8: cada carta fija PLANO + ÁNGULO + MOMENTO exclusivos
// (docs/design-pattern-cards.md §8 — dos cartas de la misma spec NUNCA
// comparten silueta ni encuadre). Imaginería (plan-expansion-v3 §2.1):
//   RAÍZ    — raíces antiguas, corteza, tierra que protege, micelio
//   FLOR    — flores que alimentan al enjambre, polinización, sol
//   ESPORAS — hongos, moho, esporas que devoran
// Razas: elfo nocturno, tauren, troll + criaturas vegetales.
// Uso: bun scripts/gen-card-art-v9.mjs · FORCE=1 · ONLY=id1,id2
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
  // ───────────────────────── CARRIL RAÍZ ─────────────────────────
  // Guardián de Corteza (Ataque · micelio): tauren guardián, frontal al suelo
  ["guardian_de_corteza", "Ataque", "raiz",
    "full frontal shot at ground level, the guardian rising from the earth facing the camera, roots erupting around him",
    "a massive tauren bark-skinned guardian with living tree bark armor and glowing green mycelium veins across his chest, roots bursting from the soil around his hooves, moss draping from his horns, dawn light behind"],

  // Anciano Raíz (Acción · estacion): plano cenital del árbol sabio
  ["anciano_raiz", "Acción", "raiz",
    "high aerial shot looking down on an ancient tree elder whose canopy spreads across the frame, seasons shifting across the canopy from winter to spring",
    "an ancient treant elder seen from above, his canopy half frozen and half blooming, roots gripping a cracked battlefield that greens wherever they touch, golden sap light pulsing in the trunk"],

  // Yema Protegida (Ítem · coraza): bodegón macro de la yema
  ["yema_protegida", "Ítem", "raiz",
    "macro still life at soil level, shallow depth of field, dew drops on the bud like glass shield plates",
    "a single glowing plant bud wrapped in translucent crystallized sap plates that refract light like armor, tiny roots curling around it, dark loam filling the bottom of the frame"],

  // Brote Fervoroso (Ataque · fervor): contrapicado del brote rompiendo la roca
  ["brote_fervoroso", "Ataque", "raiz",
    "extreme worm's-eye view from inside a crack in the rock, the sprout bursting upward toward the camera, soil raining down",
    "a defiant green sprout with serrated leaf-blades erupting from shattered stone, roots gripping the broken rock like knuckles, morning sun flaring right behind the bud, dirt clods frozen mid-air"],

  // Zarcillo Tenaz (Ataque · fervor): plano lateral en movimiento
  ["zarcillo_tenaz", "Ataque", "raiz",
    "horizontal side tracking shot, the vine whipping across the frame in a wide sweep, motion blur at the tip",
    "a tenacious thorned vine tendril lashing sideways across a ruined stone wall, strangling an old war banner in its coils, new green shoots splitting the stone joints, dust and petals kicked up"],

  // Estación Invernal (Acción · estacion): plano general, mitad invierno mitad primavera
  ["estacion_invernal", "Acción", "raiz",
    "wide establishing shot at eye level, a battlefield split vertically by the frame: left side snowbound, right side in full bloom",
    "an elven druidess of the night standing at the exact seam between winter and spring, snowflakes melting into petals mid-air around her outstretched hand, frost crystals turning to moss across the ground"],

  // Reserva de Savia (Ítem · coraza): bodegón al trasluz
  ["reserva_de_savia", "Ítem", "raiz",
    "backlit still life close-up, the vial glowing like a lantern against dark roots, camera slightly below the object",
    "a carved heartwood vial overflowing with luminous golden sap, light shining through it like stained glass, bark stopper cracked open, roots and moss cradling its base in shadow"],

  // Corteza de Hierro (Ataque · micelio): primerísimo plano del blindaje
  ["corteza_de_hierro", "Ataque", "raiz",
    "ultra close-up on the shoulder plate of a bark golem, camera pressed against the armor, iron spikes and mushroom growths at frame edge",
    "the riveted bark-and-iron pauldron of a plant golem fused with iron rivets and axe fragments, glowing fungi sprouting from the seams, sap oozing like molten metal over the plates"],

  // ───────────────────────── CARRIL FLOR ─────────────────────────
  // Polinizador Solar (Ataque · simbiosis): vuelo hacia cámara
  ["polinizador_solar", "Ataque", "flor",
    "mid-air frontal shot, the winged fey flying straight at the camera trailing pollen, wings cropped by the frame edges",
    "a night-elf fey pollinator with butterfly wings of stained-glass petals diving toward the viewer, arms scattering luminous pollen, sun flaring behind its head, petals whipping off the wing edges"],

  // Lecho de Pétalos (Acción · floracion): plano desde el suelo, caída
  ["lecho_de_petalos", "Acción", "flor",
    "ground-level shot from inside a bed of giant petals, a fallen flower-kin dissolving into rising motes of light that feed the blooms around her",
    "a dying flower-kin maiden sinking into a giant petal bed, her body unraveling into glowing motes that stream sideways into the neighboring blooms, petals floating upward instead of falling"],

  // Estandarte de Savia (Ítem · insignia): contrapicado del estandarte
  ["estandarte_de_savia", "Ítem", "flor",
    "extreme low-angle shot looking up a living banner pole, the sap-glow banner unfurling against a bright sky",
    "a war banner grown from living stems, its leaf-cloth banner dripping luminous sap that ignites green fire along the edges, smaller plants leaning toward it at the base like worshippers"],

  // Cepa Heredada (Ataque · legado): plano lateral íntimo de la cepa cortada
  ["cepa_heredada", "Ataque", "flor",
    "intimate side close-up at stump height, a freshly cut stump glowing as a single new shoot rises from its rings",
    "an ancient cut stump with visible age rings glowing gold, one bright new shoot climbing out of the cut toward a beam of light, sap beading like tears along the bark"],

  // Enjambre de Zumbidos (Ataque · simbiosis): abejas en espiral hacia cámara
  ["enjambre_de_zumbidos", "Ataque", "flor",
    "fisheye close-up of a spiral swarm flying straight into the camera lens, insects sharp at center, motion blur at edges",
    "a spiraling swarm of glowing pollen-wasps coiling around a giant blooming flower head, wings catching sunlight like shattered glass, the spiral funnel pointing straight at the viewer"],

  // Jardín Colgante (Acción · floracion): plano aéreo del jardín que cae
  ["jardin_colgante", "Acción", "flor",
    "high aerial top-down shot, a hanging garden collapsing downward in bloom, vines and petals falling toward the camera far below",
    "a tiered hanging garden breaking free from a stone cliff, entire flowering terraces tumbling through the air, vines trailing upward like unfurling ribbons, blooms igniting with light as they fall"],

  // Néctar Concentrado (Ítem · insignia): macro gota de néctar
  ["nectar_concentrado", "Ítem", "flor",
    "macro still life of a single oversized nectar drop falling from a flower, refracting the whole garden inside the drop",
    "a drop of concentrated glowing nectar sliding down a giant lily stamen, the entire blooming garden refracted upside-down inside the droplet, tiny winged fey hovering toward it"],

  // Raíz del Antiguo (Ataque · legado): contrapicado bajo la cepa muerta
  ["raiz_del_antiguo", "Ataque", "flor",
    "worm's-eye view from beneath a dead root system arching overhead, one young elf reaching up through the root lattice",
    "a young troll herbalist standing beneath the arching dead roots of a fallen elder tree, pressing her palm against a knot that pulses with new green light, spores and petals drifting down through the gaps"],

  // ───────────────────────── CARRIL ESPORAS ─────────────────────────
  // Vientrespora (Ataque · polen): macro de la nube que explota
  ["vientrespora", "Ataque", "esporas",
    "macro shot of a puffball exploding, spore cloud bursting directly at the camera filling the frame",
    "a giant puffball mushroom bursting under pressure, a dense luminous spore cloud billowing straight toward the viewer, backlit by sickly green swamp light, fine spores individually visible like drifting embers"],

  // Boca de Musgo (Ataque · carnivora): contrapicado de la boca abriéndose
  ["boca_de_musgo", "Ataque", "esporas",
    "extreme low-angle from inside the prey's shadow, a moss maw splitting open vertically with teeth of wood, saliva of sap",
    "a colossal moss-covered maw splitting open amid the undergrowth, rows of woody fang-teeth dripping amber sap, a half-swallowed helmet visible between the jaws, vines pulling the halves shut"],

  // Esporas Tóxicas (Ítem · remate): bodegón de la bolsa de esporas
  ["esporas_toxicas", "Ítem", "esporas",
    "still life at table height, a leather satchel of harvested spore pods leaking toxic dust, one pod caught mid-rupture",
    "a goblin-made satchel overflowing with bruised purple spore pods, toxic dust leaking in slow curls, one pod rupturing in a green flash, hazed swamp lanterns in the far background"],

  // Círculo de Hongos (Acción · fortaleza): plano cenital del anillo
  ["circulo_de_hongos", "Acción", "esporas",
    "top-down aerial shot of a perfect mushroom ring glowing in a dark clearing, tiny lights pulsing around the circle",
    "a fairy ring of giant luminescent mushrooms seen from directly above, each cap glowing a different shade of green and violet, spore light rising in a soft column at the circle's center, moss paths converging inward"],

  // Esporas Punzantes (Ataque · polen): salvo horizontal de espinas
  ["esporas_punzantes", "Ataque", "esporas",
    "horizontal action shot at cap height, a volley of needle-spores frozen mid-flight crossing the whole frame in parallel lines",
    "a cap-lined ridge firing volleys of needle-like spores in parallel streaks, each needle trailing a thin vapor tail, a wooden shield in the foreground riddled with punctures, backlit haze"],

  // Flor Devoradora (Ataque · carnivora): primer plano del bote a la presa
  ["flor_devoradora", "Ataque", "esporas",
    "extreme close-up of a carnivorous bloom lunging at the camera, petals and fangs filling the frame, its stem whipping behind",
    "a voracious pitcher-plant bloom lunging straight at the viewer, petal-fangs splayed wide, acid droplets flying off the rim, a tiny skull half-swallowed at the throat, jungle blur behind"],

  // Amanita Mortal (Ítem · remate): bodegón del hongo cortado
  ["amanita_mortal", "Ítem", "esporas",
    "low still life of a freshly severed amanita cap lying on a stone, its cut glistening, spores still drifting off the gills",
    "a severed crimson amanita cap with white warts lying on a flat stone, the cut stem glistening with milky sap, a ring knife embedded beside it, lethal beauty in the gill glow"],

  // Coro de Setas (Acción · fortaleza): plano general del coro
  ["coro_de_setas", "Acción", "esporas",
    "wide eye-level shot of a choir of mushroom-kin singing in a circle, spore notes visibly floating up from their caps in ribbons",
    "a circle of small mushroom-kin (troll-sized fungal humanoids) with trumpet caps singing together, visible ribbons of glowing spores rising and braiding above them, swamp fog rolling at their feet"],

  // Moho Penetrante (Ataque · polen): primer plano del moho avanzando
  ["moho_penetrante", "Ataque", "esporas",
    "macro tracking shot along an armor plate being consumed by advancing mold, the fuzzy frontier sharp against clean metal",
    "velvet green mold consuming a discarded iron breastplate, the advancing frontier of spores mid-bloom like a slow wave, tiny fruiting bodies erupting through the rivets, cold swamp light"],

  // Hongopardo Colosal (Ataque · carnivora): plano general aéreo del coloso
  ["hongopardo_colosal", "Ataque", "esporas",
    "high wide aerial shot of a colossal fungal bear-beast crossing a swamp, its cap-back bristling, spore trail behind it",
    "a colossal bear-shaped fungal colossus wading through a drowned forest, its back crowned with shelf-fungi like armor plates, every step blooming mushrooms in the water, birds scattering ahead of it"],

  // Tripa de Tronco (Ítem · fortaleza): bodegón del tronco hueco
  ["tripa_de_tronco", "Ítem", "esporas",
    "still life camera inside a hollow log looking out, glowing gut-roots and spore sacs lining the walls like an organ cavity",
    "the hollow interior of a massive log turned into a living larder, pulsing sap-sacs and glowing root-guts lining the wood walls, spore lanterns hanging from root hooks, exit framing a bright swamp"],

  // Boca de Yggra (Acción · carnivora): contrapicado extremo del jardín devorador
  ["boca_de_yggra", "Acción", "esporas",
    "extreme worm's-eye view from below a titanic plant maw opening in the earth, roots and petals radiating outward like a rising sun of teeth",
    "the titanic maw of Yggra the Devourer Garden splitting the battlefield open, concentric rings of petal-fangs radiating outward, whole trees tipping into the throat, spore-light blazing from the depths"],
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
