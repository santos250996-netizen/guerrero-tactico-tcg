// gen-chibi-cards.mjs — recrea TODO el arte de cartas en chibi (skill guerrero-tactico-chibi-art).
// Lee scripts/chibi-manifest.json · genera 864x1152 → assets-src/chibi-cards/{id}.png
// El webp final (public/cards/{id}.webp) lo hace convert-chibi-cards.py.
// Uso: bun scripts/gen-chibi-cards.mjs · FORCE=1 · ONLY=id1,id2
// Checkpoint: salta cartas con PNG ya generado (relanzable).
// Constantes espejo del bloque de estilo reforzado de
// skills/guerrero-tactico-chibi-art/scripts/generate_card.py — mantener en sync.
import ZAI from "z-ai-web-dev-sdk";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const STAGE = path.join(ROOT, "assets-src/chibi-cards");
const PROMPTS_DIR = path.join(STAGE, "prompts");
const PROGRESS = path.join(ROOT, "scripts/chibi-art-progress.log");

const OPENER =
  "RAW FULL-BLEED ILLUSTRATION with NO card frame, NO border, NO gold trim, NO rounded corners, subject cropped by the canvas edges, no empty areas. " +
  "No plaques, no banners with writing, no scrolls with lines, no engraved runes, no numbered counters, no title areas, no labels, no captions, no letters, no numbers, no watermark, no signature, no UI, no logo. " +
  "Pure illustration, no written language of any kind.";

const STYLE =
  "Chibi cartoon style: big heads (~40-50% of the body), compact bodies, simplified expressive faces (big eyes, minimal mouth). " +
  "STRICTLY ANCIENT FANTASY WORLD from the age before gunpowder: hand-made medieval-fantasy materials only — NO modern objects, NO firearms or guns, NO paved roads or road markings, NO modern clothing, NO streetlights, NO vehicles. " +
  "Thick uniform black outlines on EVERY element (characters, creatures, props and environment), same heavy line weight everywhere. " +
  "STRICT flat cel shading: only 2 tones per surface (one base color + one hard-edged flat shadow shape), absolutely no gradients, no smooth metal reflections, no soft ambient light, no painterly brushwork. " +
  "2D game sprite finish, bold saturated flat colors, clean simplified shapes, clear readable silhouette. " +
  "The subject OVERFLOWS the canvas and is cropped by at least two canvas edges; background is simple flat color shapes that never compete with the subject.";

const CLOSER =
  "Absolutely zero typography, zero letters, zero numbers, zero symbols that resemble writing, zero signs, zero labels, zero watermarks, zero signatures, zero UI elements, zero logos. No gradients, no soft shading, no photorealism, no 3D render.";

const MOODS = {
  item: "centered chibi sticker still-life, the object is the ONLY protagonist, no characters, no hands, no arms, no bearers, no people",
  accion: "action actively performed by a clearly visible chibi character, readable at a glance, no abstract symbol, no empty scene without an agent",
  ataque: "violent dynamic chibi action caught mid-strike, wielder visible",
};

const TRIGGERS = {
  on_play: "on_play climax of the effect, moment of impact",
  start_turn: "start_turn dawn, first spark, awakening",
  end_turn: "end_turn dusk, zenith, culmination",
  on_death: "on_death post-fall, consequence, transfer",
};

function buildPrompt(c) {
  const race = c.race || "criatura del catálogo (bestia/criatura del juego, chibi, sin raza humana)";
  return [
    OPENER, "", STYLE, "",
    `Subject: ${c.hide_name ? c.subject : `${c.name} — ${c.subject}`}. Scene: ${c.scene}. ${c.luz}.`,
    `Mood: ${MOODS[c.categoria]}.`,
    `Trigger: ${TRIGGERS[c.trigger]}.`,
    `Framing: ${c.plano} · ${c.angulo} · ${c.momento}. Subject cropped by the canvas edges.`,
    `Race: ${race}.`,
    `Keyword visual: ${c.kw_visual}.`,
    ...(c.extra ? [`Extra: ${c.extra}.`] : []),
    "", CLOSER,
  ].join("\n");
}

function log(line) {
  fs.appendFileSync(PROGRESS, `${new Date().toISOString()} ${line}\n`);
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/chibi-manifest.json"), "utf8"));
  const only = process.env.ONLY ? new Set(process.env.ONLY.split(",")) : null;
  const force = process.env.FORCE === "1";
  fs.mkdirSync(STAGE, { recursive: true });
  fs.mkdirSync(PROMPTS_DIR, { recursive: true });

  const todo = manifest.filter((c) => {
    if (only && !only.has(c.id)) return false;
    const out = path.join(STAGE, `${c.id}.png`);
    return force || !fs.existsSync(out) || fs.statSync(out).size === 0;
  });
  console.log(`pendientes: ${todo.length}/${manifest.length}`);
  log(`start: ${todo.length}/${manifest.length} pendientes`);

  const zai = await ZAI.create();
  let ok = 0, fail = 0;
  const failedIds = [];
  for (const c of todo) {
    const outPath = path.join(STAGE, `${c.id}.png`);
    const prompt = buildPrompt(c);
    fs.writeFileSync(path.join(PROMPTS_DIR, `${c.id}.txt`), prompt, "utf8");
    let done = false;
    for (let attempt = 1; attempt <= 4 && !done; attempt++) {
      try {
        const res = await zai.images.generations.create({ prompt, size: "864x1152" });
        const b64 = res?.data?.[0]?.base64;
        if (!b64) throw new Error("respuesta sin base64");
        fs.writeFileSync(outPath, Buffer.from(b64, "base64"));
        console.log(`✓ ${c.id} (${c.categoria}·${c.spec}·${c.plano}/${c.angulo}/${c.momento})`);
        log(`ok ${c.id}`);
        ok += 1;
        done = true;
      } catch (e) {
        const msg = String(e?.message || e);
        console.error(`✗ ${c.id} (intento ${attempt}): ${msg.slice(0, 160)}`);
        log(`fail ${c.id} intento ${attempt}: ${msg.slice(0, 120)}`);
        const wait = /429|rate|too many|busy/i.test(msg) ? 15000 * attempt : 2000 * attempt;
        if (attempt < 4) await new Promise((r) => setTimeout(r, wait));
      }
    }
    if (!done) {
      fail += 1;
      failedIds.push(c.id);
    }
  }
  console.log(`\nGeneradas: ${ok} · fallidas: ${fail}${failedIds.length ? " → " + failedIds.join(",") : ""}`);
  log(`end: ok=${ok} fail=${fail}${failedIds.length ? " ids=" + failedIds.join(",") : ""}`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  log(`crash: ${String(e).slice(0, 200)}`);
  process.exit(1);
});
