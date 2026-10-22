// ============================================================================
// gen-card-art-v12.mjs — V3.0 T-E: TANDA 30, ampliación clases base (24 cartas).
// Contrato v8-v11: PLANO + ÁNGULO + MOMENTO exclusivos por carta (§8).
// Razas del catálogo: guerrero (orco/tauren/enano/humano/worgen) ·
// mago (humano/elfo de sangre/elfo nocturno/draenei/gnomo) ·
// asesino (humano/goblin/no-muerto/elfo nocturno/worgen).
// Uso: bun scripts/gen-card-art-v12.mjs · FORCE=1 · ONLY=id1,id2
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
  // ───────────────────────── GUERRERO ─────────────────────────
  ["alguacil_de_guerra", "Ataque", "armas",
    "side shot of a human bailiff slamming a banner pole into the ground with one hand while thrusting a halberd forward with the other",
    "a human bailiff in half-plate slamming a war banner pole into the earth while thrusting a gleaming halberd toward the enemy line, wind whipping his tabard, the banner cloth snapping above"],

  ["estandarte_de_avance", "Ítem", "armas",
    "low-angle still life of a war banner planted on a hill crest, pole, cloth and base only, no people",
    "a war banner of crimson cloth on a scarred wooden pole planted at a hill crest at dawn, pennant snapping in the wind, arrows embedded in the ground around its base, absolutely no people"],

  ["rompefilas_orco", "Ataque", "armas",
    "action shot of an orc warrior bashing through a spear line with a tower shield, splinters flying",
    "a green-skinned orc warrior with tusks bashing through a hedge of enemy spears with a battered tower shield, splinters and spear shafts exploding outward, dust at his boots"],

  ["arrollo_de_acero", "Ataque", "furia",
    "wide action shot of a tauren juggernaut charging through his own formation, allies diving aside",
    "a massive tauren juggernaut in spiked plate charging forward in a full sprint, two allied soldiers diving out of his path, churned earth and dust trailing behind him"],

  ["coloso_berserker", "Ataque", "furia",
    "low-angle shot of a worgen berserker towering overhead, double hammer at the apex of a swing",
    "a towering worgen berserker with bristling fangs raising a two-handed spiked hammer at the apex of a swing, veins and fur rimmed in red light, debris circling in the shockwave"],

  ["maza_berserker", "Ítem", "furia",
    "still life of a spiked mace embedded in a cracked stone block, fresh impact fissures, no people",
    "a brutal spiked mace embedded head-deep in a cracked stone block, fissures radiating from the impact, drops of molten metal hissing on the head, absolutely no people"],

  ["defensor_jurado", "Ataque", "proteccion",
    "frontal shot of a dwarf defender kneeling behind a kite shield mid-block, oath sigil burning above",
    "a bearded dwarf defender kneeling behind a towering kite shield braced against a blow, sparks where the strike lands, a burning oath sigil hanging in the air above his helm"],

  ["campana_de_refugio", "Ítem", "proteccion",
    "still life of a great bronze refuge bell on a fortress wall at dusk, rope and beam, no people",
    "a great bronze refuge bell hanging from a scorched beam on a fortress battlement at dusk, its rope swinging, warm light pooling on the stone below, banners drooping behind, absolutely no people"],

  // ───────────────────────── MAGO ─────────────────────────
  ["cronista_arcano", "Ataque", "arcana",
    "action shot of a blood elf scribe striking with a quill of condensed arcane light, ink-and-magic spray",
    "a blood elf scribe in violet robes striking forward with an oversized quill of condensed arcane light, splashes of glowing ink and arcane sparks spraying off the tip, floating scrolls behind"],

  ["tomo_de_ecos", "Ítem", "arcana",
    "still life of an open grimoire with ring-shaped echoes of light rising off its pages, no people",
    "an open grimoire on a stone lectern, translucent ring-shaped echoes of violet light rising off its pages in widening circles, loose rune-chips suspended above, absolutely no people"],

  ["aprendiz_inquieto", "Ataque", "arcana",
    "dynamic shot of a young gnome apprentice firing a siphoning bolt that drains a floating crystal",
    "a young gnome apprentice with oversized goggles firing a crackling siphoning bolt from both palms, a floating crystal draining into violet ribbons toward his hands, papers whirling"],

  ["brasas_funebres", "Ataque", "fuego",
    "wide shot of a funeral ember wraith lashing two gravestones with twin whips of fire",
    "a funeral ember wraith of smoke and glowing coals lashing out with twin whips of fire at two gravestones, embers scattering in arcs, cold blue graveyard fog below"],

  ["colosal_de_magma", "Ataque", "fuego",
    "ground-level shot of a magma colossus slamming both fists down at once, shockwave of cinders",
    "a titanic magma colossus with a molten core slamming both fists into scorched ground at once, a ring shockwave of cinders and lava splatter radiating outward"],

  ["farol_consumido", "Ítem", "fuego",
    "still life of a burnt-out iron lantern glowing from inside its cracked glass, no people",
    "a scorched iron lantern with peeling paint on wet cobblestones, its cracked glass still glowing ember-orange from within, wisps of smoke leaking through the seams, absolutely no people"],

  ["cazador_de_grietas", "Ataque", "hielo",
    "close action shot of a night elf hunter striking the frozen ground with an ice pick, shards erupting",
    "a night elf hunter in furs striking a frost-cracked battlefield with a hooked ice pick, glowing blue shards erupting from the impact fissure, breath fogging the air"],

  ["prisma_glacial", "Ítem", "hielo",
    "still life of a cut ice prism refracting a single light beam into a lattice of shards, no people",
    "a colossal cut ice prism on a frozen pedestal refracting one beam of pale light into a lattice of razor shards, snow drifting through the refractions, absolutely no people"],

  // ───────────────────────── ASESINO ─────────────────────────
  ["vibora_corrosiva", "Ataque", "veneno",
    "macro shot of a viper spitting sizzling acid at a rusted shield, metal bubbling on impact",
    "an emerald viper rearing back mid-spit, sizzling acid streaming onto a rusted iron shield, the metal bubbling and steaming on impact, acid pools eating into the stone below"],

  ["frasco_de_sales", "Ítem", "veneno",
    "still life of a cracked glass flask leaking acid that eats furrows into a stone table, no people",
    "a cracked glass flask of glowing green salt-acid leaking onto a stone alchemist table, the liquid eating smoking furrows into the rock, corroded coin and buckle half-dissolved beside it, absolutely no people"],

  ["mantis_verde", "Ataque", "veneno",
    "close-up of a green mantis striking with both scythes at a throbbing boils-covered target",
    "a leaf-green mantis the size of a hound striking with both foreleg scythes at a bloated blistered target, venom droplets flicking off the blade-arms, jungle rot leaves around"],

  ["espadachin_burlon", "Ataque", "combate",
    "action shot of a grinning fencer lunging with an exposed guard, ribbons torn from his doublet",
    "a grinning human fencer mid-lunge with his guard wide open, ribbons torn from his doublet by a near miss, rapier extension perfectly straight, tavern backdrop blurred"],

  ["maestra_de_esgrima", "Ataque", "combate",
    "low-angle shot of a duelist schoolmistress switching her rapier behind her back, coat flaring",
    "a scarred duelist schoolmistress swinging her rapier behind her back in a baiting feint, long coat flaring, chalk dueling circle and scattered training blades under her boots"],

  ["navaja_de_taberna", "Ítem", "combate",
    "still life of a worn tavern razor on a whiskey barrel, notches along the blade, no people",
    "a worn tavern razor lying open on a whiskey barrel, notches chipped along the blade, spilled whiskey catching the lantern light, sawdust and playing cards scattered around, absolutely no people"],

  ["ojo_de_la_red", "Ataque", "sigilo",
    "high shot of a hooded watcher crouched on a rooftop ridge, signal threads running to other rooftops",
    "a hooded night elf watcher crouched on a rooftop ridge at night, taut signal threads of silver wire running from her fingers to distant rooftops, moonlit tile below"],

  ["puerta_trampa", "Ítem", "sigilo",
    "still life of a folding trap-door slightly ajar in a wooden floor, darkness and wire glinting below, no people",
    "a folding trapdoor slightly ajar in worn wooden floorboards, absolute darkness below with a single taut wire glinting across the gap, dust motes in the moonlight shaft, absolutely no people"],
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
