// ============================================================================
// gen-card-art-v10.mjs — V3.0 T-C: PIRATA 🏴‍☠️ (28 cartas).
// Contrato v8/v9: PLANO + ÁNGULO + MOMENTO exclusivos por carta (patrón §8).
// Imaginería (plan-expansion-v3 §2.2): PUENTE abordaje/sables/grumetes ·
// BODEGA ron/cofres/pactos rotos/contrabando · ARTILLERÍA cañones/pólvora/kraken.
// Razas: humano, goblin, enano, no-muerto + kraken, cañones vivientes, loros.
// Uso: bun scripts/gen-card-art-v10.mjs · FORCE=1 · ONLY=id1,id2
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

const CARDS = [
  // ───────────────────────── CARRIL PUENTE ─────────────────────────
  ["abordaje_al_amanecer", "Ataque", "puente",
    "dawn side-on wide shot, two ships colliding mid-boarding, grappling hooks frozen mid-flight between the decks",
    "a scarred human pirate captain leaping across the gap between two colliding ships at sunrise, cutlass first, grappling ropes taut between the hulls, spray exploding off the collision point"],

  ["grumete_ruidoso", "Ataque", "puente",
    "low deck-level shot, a goblin cabin-boy yelling and pointing forward, the whole crew charging past him in motion blur",
    "a tiny goblin deckhand standing on an upturned bucket mid-shout, tiny cutlass raised, the charging pirate crew blurring past on both sides, sails and rigging booming overhead"],

  ["cofres_de_remo", "Ítem", "puente",
    "still life at bench height, oars and closed chests lashed together as a floating barricade, water reflections below",
    "a raft of sea chests and ship oars lashed with salt-stiff rope, a brass-bound chest at the center catching the light, gulls perched on the oarlocks, calm green sea below"],

  ["viento_favorable", "Acción", "puente",
    "aerial shot from behind the mainsail as it bellows full of wind, the ship surging forward, foam splitting at the prow",
    "a pirate brig heeling hard into the wind seen from above the aft deck, the mainsail swollen like a drum, wind streaks visible in the air, spray fanning off the cutting bow"],

  ["saqueo_del_baron", "Ataque", "puente",
    "close over-the-shoulder shot of a nobleman's cabin being ransacked, gloved hands scooping jewels mid-flight",
    "a pirate baron's gloved hand grabbing a fistful of pearls and coins off an overturned writing desk, a jeweled rapier clattering away, the cabin door broken off its hinges behind"],

  ["marinero_de_aguas_negras", "Ataque", "puente",
    "waist-up shot in glowing black water, an undead sailor wading toward the camera, lantern light from below",
    "a drowned undead sailor with kelp beard and glowing green eyes wading through luminous black water toward the viewer, barnacled cutlass dripping, cold lantern glow rising from beneath the surface"],

  ["coraza_de_roble", "Ítem", "puente",
    "still life of a battered oak breastplate strapped over a barrel, torchlight raking across the grain",
    "a heavy oak-and-iron ship breastplate strapped upright against a powder barrel, torch flames from the left carving deep shadows in the scarred wood grain, iron rivets glinting"],

  ["grito_de_abordaje", "Acción", "puente",
    "extreme close-up profile of a dwarf pirate bellowing the boarding cry, spit and breath visible, crew silhouettes echoing behind",
    "a bearded dwarf pirate in profile mid-roar, breath fogging in cold air, axe raised, a line of crew silhouettes behind him roaring the same cry under a blood-red flag"],

  // ───────────────────────── CARRIL BODEGA ─────────────────────────
  ["amotinado_del_ron", "Ataque", "puente",
    "dutch-angle shot below decks, a mutineer kicking open the captain's door, lantern swinging, crew faces in shadow",
    "a mutinous pirate boot kicking the captain's door splintered open, a swung lantern freezing the mutineers' shadows on the curved hull walls, spilled rum bottle rolling across the boards"],

  ["pacto_de_contrabando", "Ítem", "bodega",
    "candlelit table still life, two hands shaking over an open crate of contraband, smoke curling through the light",
    "two shadowy hands clasped in a deal over a half-open smuggler's crate of wrapped powder kegs, a candle stub between them, knife and coin resting on the manifest, smoke curling"],

  ["cofre_del_ahogado", "Ataque", "bodega",
    "underwater shot rising from the deep, a drowned chest bursting open with treasure drifting upward toward the surface light",
    "a barnacled chest on the seabed bursting open, gold chains and coins floating upward in a column toward a distant bright surface, pale light shafts cutting the deep blue"],

  ["noche_de_velas", "Acción", "bodega",
    "night deck shot under a full moon, a gentle hand raising a lantern over a wounded crewmate, sails dim behind",
    "a pirate kneeling on a moonlit deck raising a small lantern over a wounded crewmate, warm light meeting cold moonlight, the fleet's sails dim and quiet in the background"],

  ["contrabando_de_polvora", "Ítem", "bodega",
    "secret cargo hold still life, powder kegs wrapped in sacking under a lifted trapdoor, single lantern glow",
    "smuggled powder kegs wrapped in sacking stacked under a raised floor trapdoor, one lantern casting hard shadows into the hold's darkness, a rope noose and tally stick hanging"],

  ["lobo_del_mar", "Ataque", "bodega",
    "storm-tossed deck shot, a sea-scarred veteran falling but pointing forward, rain horizontal",
    "a grizzled old pirate captain in soaked oilskins falling to one knee on a storm-slanted deck, still pointing his saber forward through horizontal rain, lightning splitting the sails behind"],

  ["bandera_negra", "Acción", "bodega",
    "worm's-eye shot up the mainmast as the black flag snaps open against the sun, crew silhouettes crowding the rails",
    "the black pirate flag unfurling at the top of the mainmast seen from directly below, sun blazing behind the cloth, pirates crowding both rails hammering cutlasses on shields"],

  ["cuchillo_de_sable", "Ataque", "bodega",
    "macro close-up of a saber point resting on a map, dice and a bruised knuckle at frame edge, candle flicker",
    "a curved saber point pinning a treasure map to a tavern table, scattered dice and a spilled mug around it, a scarred hand gripping the hilt at the frame edge, low candlelight"],

  // ───────────────────────── CARRIL ARTILLERÍA ─────────────────────────
  ["saludo_de_canones", "Ataque", "artilleria",
    "wide broadside shot along the gun deck, ALL cannon muzzles firing at once, fire and smoke sweeping the frame",
    "a full broadside erupting from a gun deck, six cannon muzzles firing in unison, orange muzzle blasts merging into a wall of fire and rolling smoke, gunners crouched between the guns"],

  ["polvorin_viejo", "Ataque", "artilleria",
    "low shot inside an old powder magazine, a cracked keg leaking black powder dust, ember falling toward it mid-air",
    "a cracked antique powder keg in a dark magazine, black powder dust streaming from its seams, a single ember drifting down toward it, other kegs stacked in the gloom"],

  ["mecha_cortada", "Ítem", "artilleria",
    "still life of a freshly cut slow-match lying on a cannon's breech, its smoking end curling, snuffer beside",
    "a cut length of slow-match lying across an iron cannon breech, its severed end glowing and curling smoke, a brass snuffer and powder horn beside it, gun deck shadows"],

  ["humo_de_polvora", "Acción", "artilleria",
    "post-battle wide shot, the gun deck swallowed in drifting white smoke, silhouettes reloading through the haze",
    "a gun deck drowned in drifting white smoke after the broadside, pirate silhouettes ramming charges into hot cannons, orange light bleeding through the smoke layers"],

  ["canon_de_cubierta", "Ataque", "artilleria",
    "extreme close-up muzzle shot, a small deck cannon firing straight at the camera, shockwave rings in the air",
    "a compact iron deck cannon firing directly into the camera, muzzle blast ring distorting the air, sparks and unburnt powder scattering, the gunner's boots braced behind it"],

  ["salva_de_despedida", "Ataque", "artilleria",
    "vertical shot from the waterline as a sinking ship fires its final broadside, muzzles below the waterline, water boiling",
    "a sinking ship firing its last volley, cannon muzzles flashing at the waterline, sea boiling around the shots, the hull tilted and taking water, sails collapsing into the spray"],

  ["placas_del_casco", "Ítem", "artilleria",
    "still life of overlapping iron hull plates riveted over oak, a musket ball embedded mid-plate, harbor light",
    "overlapping iron armor plates riveted onto a ship's oak hull, a musket ball frozen mid-impact with a dent bloom, tarred rope fenders hanging, cold harbor morning light"],

  ["bateria_de_cubierta", "Acción", "artilleria",
    "eye-level raking shot down a battery line, cannons recoiling in sequence, deck crews leaping with rammers",
    "a battery line of cannons recoiling one after another down the deck, crews leaping aside with ramrods and sponges, deck planks flexing, smoke rolling off each muzzle in sequence"],

  ["canon_volador", "Ataque", "artilleria",
    "aerial shot of a cannon ripping free of its mounts and tumbling through the air over the deck, chains whipping",
    "a heavy iron cannon torn loose from its carriage, tumbling through the air above the deck, broken chains and bolts flying, sailors diving away, the flight path spraying splinters"],

  ["kraken_de_polvora", "Ataque", "artilleria",
    "deep-sea shot of a kraken tentacle wrapped around a burning powder keg, dragging it down, fuse still glowing",
    "a massive kraken tentacle coiled around a smoking powder keg, dragging it into black water, the fuse still glowing orange underwater, smaller tentacles rising around it"],

  ["paquete_sospechoso", "Ítem", "artilleria",
    "still life of a suspicious oilcloth parcel on a barrel, fuse stub peeking from the wrappings, lantern glow and shadows",
    "an oilcloth-wrapped parcel tied with tarred twine on a barrel, a short fuse stub peeking from the knot, a lantern thrown hard against the hold wall, question of danger in every shadow"],

  ["boca_de_kaela", "Acción", "artilleria",
    "extreme worm's-eye from the water directly in front of a titanic iron-clad jaw-shaped cannon battery opening fire, the whole frame swallowed by muzzle fire",
    "Kaela's iron-jaw flagship battery firing straight down at the camera from the water's view, rows of muzzle blasts merging into one titanic fire-breathing jaw, rope and iron teeth framing the blast"],
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
