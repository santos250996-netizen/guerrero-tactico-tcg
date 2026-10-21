// ============================================================================
// gen-card-art-v11.mjs — V3.0 T-D: TINKER 🔧 (28 cartas).
// Contrato v8/v9/v10: PLANO + ÁNGULO + MOMENTO exclusivos por carta (§8).
// Imaginería (plan-expansion-v3 §2.3): TALLER forja/remaches/blindaje/chatarra
// · MAQUINARIA autómatas/engranajes/torretas · CHISPA energía/descargas/overclock.
// Razas: gnomo, goblin, draenei + autómatas, torretas andantes.
// Uso: bun scripts/gen-card-art-v11.mjs · FORCE=1 · ONLY=id1,id2
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
  // ───────────────────────── CARRIL TALLER ─────────────────────────
  ["hojalatero_errante", "Ataque", "taller",
    "full-body frontal shot of a gnome tinker walking toward the camera under a plated shield dome, hammer mid-swing on a rivet",
    "a wandering gnome hojalatero walking under a riveted metal shield-dome frame worn like a backpack, rivet gun sparking in one hand, scrap plates clanking on his back, copper light"],

  ["martillo_nivelador", "Ataque", "taller",
    "extreme close-up of a leveling hammer strike hitting two gears at once, shockwave and sparks at the impact point",
    "a double-faced leveling hammer smashing TWO brass gears simultaneously on an anvil, sparks flying in mirrored arcs, the shockwave rippling the air, gnome goggles reflecting the flash"],

  ["yunque_portatil", "Ítem", "taller",
    "still life of a folding portable anvil on a leather mat, tools fanned around it, warm forge light",
    "a folding portable anvil with brass hinges half-open on a worn leather mat, miniature hammers and tongs fanned around it, ember glow reflecting off the polished horn"],

  ["chispa_de_genio", "Acción", "taller",
    "overhead shot of a goblin inventor's hands snapping their fingers over a workbench, one bright spark leaping between fingers",
    "a goblin inventor snapping their fingers over a chaotic workbench, a single brilliant spark arcing between finger and gadget, blueprints and gears pushed aside, eyes wide with an idea"],

  ["remachadora_de_asalto", "Ataque", "taller",
    "action shot of a dwarf firing a shoulder-mounted rivet gun while charging, rivets streaking forward like tracer fire",
    "a charging dwarf in plated apron firing a shoulder-mounted rivet gun, glowing rivets streaking forward like tracers, spent casings bouncing off her pauldrons, dust kicked up"],

  ["descargador_de_batalla", "Ataque", "taller",
    "wide shot of a battlefield capacitor discharging twin arcs at the two nearest targets, grass scorched in twin lines",
    "a battlefield capacitor tower discharging TWO parallel lightning arcs at once, the grass scorched in twin burning lines, a draenei engineer cranking the lever at its base"],

  ["engranaje_maestro", "Ítem", "taller",
    "still life of one master gear floating above a disassembled mechanism, every smaller gear aligned toward it",
    "a single master gear of polished brass floating above a disassembled clockwork, dozens of smaller gears orbit-aligned toward it, faint blue light on its teeth, dark workshop backdrop"],

  ["fragua_de_bolsillo", "Acción", "taller",
    "close-up of a tiny pocket forge glowing red-hot in open palms, heat distortion bending the air above it",
    "a pocket-sized forge glowing cherry-red in a gnome's open palms, heat distortion bending the air above, tiny tongs resting on the lid, the glow lighting the face from below"],

  // ───────────────────────── CARRIL MAQUINARIA ─────────────────────────
  ["automata_cargador", "Ataque", "maquinaria",
    "side shot of a loading automaton winding up a punch, its chest winch cranking tight, dust at its feet",
    "a bronze loading automaton winding up a heavy punch, the winch on its chest cranking tight with visible tension, dust ring at its feet, target dummy splintering at frame edge"],

  ["muneco_de_chatarras", "Ataque", "maquinaria",
    "low shot of a scrap puppet collapsing into parts, one arm already detached and reaching toward a smaller puppet",
    "a scrap-wood-and-iron puppet collapsing mid-gesture, its detached arm still reaching toward a small wind-up toy, parts and bolts scattering, one green eye still lit"],

  ["nucleo_de_reserva", "Ítem", "maquinaria",
    "still life of a glowing reserve core in a padded vault case, emergency light pulsing, backup gauges around it",
    "a spherical reserve power core pulsing amber in a padded vault case, tiny backup gauges and valves around the lid, hard shadows in an engine room, steam wisps crossing the light"],

  ["carro_de_herramientas", "Acción", "maquinaria",
    "dynamic shot of a tool cart ramming open a jammed gear-gate, wrenches and mallets bouncing out mid-air",
    "a wheeled tool cart smashing through a jammed gear-gate, wrenches and mallets bouncing out mid-air, the gate gears shearing apart, a draenei engineer diving clear"],

  ["torreta_de_asedio", "Ataque", "maquinaria",
    "low frontal shot of a siege turret locking onto the camera, barrel centering in its gimbal, targeting light on",
    "a siege turret's barrel centering directly at the viewer inside its heavy gimbal, targeting lens glowing red, hydraulic legs digging into rubble, heat shimmer at the muzzle"],

  ["golem_de_desguace", "Ataque", "maquinaria",
    "wide shot of a scrap golem pulling itself apart to hand its own arm-plate to a broken machine",
    "a scrap golem pulling its own arm-plate free with a ratchet groan, offering it to a broken machine lying in the mud, gears and bolts falling from the open socket"],

  ["caldera_de_presion", "Ítem", "maquinaria",
    "still life of a riveted pressure boiler with safety valve hissing steam, gauge needle in the red",
    "a riveted bronze pressure boiler hissing steam from its safety valve, the gauge needle buried in the red zone, chains and hooks around it, orange furnace glow from below"],

  ["decreto_de_la_forja", "Acción", "maquinaria",
    "ceremonial shot of a forge-priest stamping a glowing decree seal onto a machine chest, sparks like confetti",
    "a robed forge-priest stamping a glowing seal onto the chest of a kneeling machine, sparks bursting from the stamp like embers, banners of the forge hanging behind"],

  ["tren_de_asedio", "Ataque", "maquinaria",
    "aerial shot of an armored siege train rolling through a broken wall, its ram-turret elevated and charging",
    "an armored siege train crashing through a shattered fortress wall, its ram-turret elevated and crackling with charge, dust and masonry raining, defenders scattering below"],

  ["enjambre_de_tornillos", "Ataque", "maquinaria",
    "macro shot of a swarm of self-drilling screws swarming toward the camera, each with tiny wings, screws sharp at center",
    "a swarm of self-drilling screws with tiny brass wings swirling toward the viewer, threads glinting, wood shavings trailing behind them, one screw larger at the swarm's head"],

  ["llave_maestra", "Ítem", "maquinaria",
    "still life of an oversized master key of interlocked gears on a velvet cushion, lock pins floating above it",
    "an oversized master key built from interlocked miniature gears resting on a velvet cushion, translucent lock pins floating above its teeth, soft spotlight in a dark vault"],

  ["fauces_de_dorvik", "Acción", "maquinaria",
    "extreme worm's-eye from below a titanic mechanical jaw-maw opening, pistons for teeth, the engineer silhouetted inside the throat light",
    "Dorvik's titanic mechanical jaw-maw splitting open overhead seen from below, hydraulic pistons for teeth, a dwarf engineer silhouetted on a platform inside the blazing throat"],

  // ───────────────────────── CARRIL CHISPA ─────────────────────────
  ["centinela_chispeante", "Ataque", "chispa",
    "sentry shot of a sparking clockwork sentinel standing vigil in rain, every joint arcing small lightning",
    "a clockwork sentinel standing vigil in driving rain, lightning arcing between its joints with every step, its lantern eye the only warm light, ruined wall behind"],

  ["bobina_cargada", "Ítem", "chispa",
    "still life of a tesla coil at full charge, lightning dancing between its rings, floor plugged with thick cables",
    "a tesla coil at full charge, white-blue lightning dancing between its copper rings, thick cables taped to a concrete floor, dust motes frozen in the electric glow"],

  ["remachadora_pesada", "Ataque", "chispa",
    "impact close-up of a heavy nail-gun punching through armor plate, the nail caught mid-penetration, metal petals bending",
    "a heavy industrial nail-gun punching a rivet through thick armor plate, the nail caught mid-penetration, metal petals bending outward, sparks bouncing off the plate"],

  ["temblor_de_maquinas", "Acción", "chispa",
    "ground-level shot of machines stamping in unison, the floor cracking in a spreading wave, dust jumping off surfaces",
    "a line of war machines stamping in perfect unison, cracks spreading across the stone floor in a wave, bolts and dust jumping off every surface, banners trembling"],

  ["heredero_del_taller", "Ataque", "chispa",
    "portrait shot of a young gnome holding their master's first hammer, forge light across both their faces",
    "a young gnome apprentice holding up their late master's first hammer with both hands, forge light painting their face and the hammer head, tools of the old workshop dim behind"],

  ["motor_de_campana", "Ataque", "chispa",
    "tracking shot alongside a war-engine marching across a plain, pistons pumping, small trees snapping at its path",
    "a marching war-engine crossing a plain at full stride, pistons pumping fire, its treads snapping small trees, smoke trailing behind, birds scattering from its path"],

  ["guillotina_portatil", "Ítem", "chispa",
    "still life of a folding guillotine blade half-deployed on a tripod, blade edge gleaming, chalk target circle on the ground",
    "a folding portable guillotine blade half-deployed on a brass tripod, the edge gleaming with a cold blue sheen, a chalk target circle on the floorboards beneath it"],

  ["marcha_de_maquinas", "Acción", "chispa",
    "low wide shot of a machine column marching in step over a hill at dusk, one synchronized leg rising at frame center",
    "a column of war machines cresting a hill in perfect step at dusk, one giant synchronized leg rising at frame center, exhaust stacks flaming, banners wired to their hulls"],
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
