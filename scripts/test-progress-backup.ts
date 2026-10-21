// ═════════════════════════════════════════════════════════════════════
// test-progress-backup.ts — Task 50: restauración sin fricción
//  · collectProgress serializa claves fijas + mazos (prefijo deck)
//  · parseProgressCode valida SIN escribir (5 errores distintos)
//  · applyProgressCode escribe y cuenta; round-trip A → B idéntico
//  · isFreshInstall detecta instalación sin progreso (3 claves grandes)
// ═════════════════════════════════════════════════════════════════════
import {
  collectProgress, parseProgressCode, applyProgressCode, isFreshInstall,
  PROGRESS_KEYS, DECK_KEY_PREFIX,
} from "../src/lib/progress-backup";

let pass = 0, fail = 0;
function check(name: string, cond: boolean) {
  if (cond) { pass++; }
  else { fail++; console.error(`  ✗ ${name}`); }
}

// Storage en memoria (Bun no tiene localStorage de DOM en todos los contextos)
function memStorage(seed: Record<string, string> = {}) {
  const m = new Map<string, string>(Object.entries(seed));
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v); },
    key: (i: number) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
  };
}

// ── 1. isFreshInstall ──
check("fresca: sin ninguna clave → true", isFreshInstall(memStorage()) === true);
check("fresca: solo settings → true (settings no cuenta como progreso)", isFreshInstall(memStorage({ "guerrero-tactico-settings": "{}" })) === true);
check("fresca: perfil presente → false", isFreshInstall(memStorage({ "pacto-de-guerra-profile": '{"x":1}' })) === false);
check("fresca: campaña presente → false", isFreshInstall(memStorage({ "pacto-de-guerra-campana": '{"x":1}' })) === false);
check("fresca: colección presente → false", isFreshInstall(memStorage({ "guerrero-tactico-coleccion": '{"x":1}' })) === false);

// ── 2. collectProgress ──
const src = memStorage({
  "pacto-de-guerra-profile": '{"nivel":7}',
  "guerrero-tactico-coleccion": '{"copies":{}}',
  "guerrero-tactico-settings": '{"soundOn":true}',
  [`${DECK_KEY_PREFIX}`]: '[1,2,3]',
  [`${DECK_KEY_PREFIX}-mago`]: '[4,5,6]',
  "otra-clave-ajena": 'no-viaja',
});
const code = collectProgress(src);
const parsed = JSON.parse(code);
check("collect: etiqueta game correcta", parsed.game === "pacto-de-guerra");
check("collect: versión 1", parsed.version === 1);
check("collect: incluye perfil", parsed.keys["pacto-de-guerra-profile"] === '{"nivel":7}');
check("collect: incluye colección", parsed.keys["guerrero-tactico-coleccion"] === '{"copies":{}}');
check("collect: incluye settings", parsed.keys["guerrero-tactico-settings"] === '{"soundOn":true}');
check("collect: incluye mazo base", parsed.keys[DECK_KEY_PREFIX] === "[1,2,3]");
check("collect: incluye mazo-mago", parsed.keys[`${DECK_KEY_PREFIX}-mago`] === "[4,5,6]");
check("collect: NO incluye claves ajenas", parsed.keys["otra-clave-ajena"] === undefined);
const missingKeys = PROGRESS_KEYS.filter((k) => !(k in parsed.keys));
check("collect: las claves ausentes no viajan (stats/misiones vacías)", missingKeys.includes("pacto-de-guerra-stats") && missingKeys.includes("pacto-de-guerra-misiones"));

// ── 3. parseProgressCode: errores sin escribir ──
const spy = memStorage();
const setSpy = { calls: 0 };
const origSet = spy.setItem;
spy.setItem = (k: string, v: string) => { setSpy.calls++; origSet(k, v); };
check("parse: vacío → error", parseProgressCode("").ok === false);
check("parse: vacío → mensaje de portapapeles", parseProgressCode("").ok === false && (parseProgressCode("") as { error: string }).error.includes("Portapapeles vacío"));
check("parse: basura → error", parseProgressCode("!!no-es-json!!").ok === false);
check("parse: JSON sin game → error", parseProgressCode('{"keys":{}}').ok === false);
check("parse: game equivocado → error", parseProgressCode('{"game":"otro","keys":{"a":"b"}}').ok === false);
check("parse: keys vacías → error", parseProgressCode('{"game":"pacto-de-guerra","keys":{}}').ok === false);
check("parse: keys con valores no-string se filtran", (() => {
  const r = parseProgressCode('{"game":"pacto-de-guerra","keys":{"a":"ok","b":5,"c":null}}');
  return r.ok && Object.keys((r as { keys: Record<string, string> }).keys).length === 1;
})());
check("parse: NUNCA escribe durante la validación", setSpy.calls === 0);

// ── 4. applyProgressCode + round-trip ──
const dst = memStorage();
const applied = applyProgressCode(code, dst);
check("apply: ok", applied.ok === true);
check("apply: escribe 5 claves", applied.ok && (applied as { written: number }).written === 5);
check("apply: valor fiel perfil", dst.getItem("pacto-de-guerra-profile") === '{"nivel":7}');
check("apply: valor fiel mazo-mago", dst.getItem(`${DECK_KEY_PREFIX}-mago`) === "[4,5,6]");
check("round-trip: collect(dst) === collect(src)", collectProgress(dst) === collectProgress(src));

// apply sobrescribe lo previo (mudanza real: la app nueva ya escribió settings)
const dst2 = memStorage({ "guerrero-tactico-settings": '{"soundOn":false,"volume":30}' });
applyProgressCode(code, dst2);
check("apply: sobrescribe settings previos", dst2.getItem("guerrero-tactico-settings") === '{"soundOn":true}');

// apply con código inválido → error, sin tocar el destino
const dst3 = memStorage({ "pacto-de-guerra-profile": "original" });
const bad = applyProgressCode("basura", dst3);
check("apply: inválido → error", bad.ok === false);
check("apply: inválido NO toca el storage", dst3.getItem("pacto-de-guerra-profile") === "original");

// ── 5. código exportado vacío (app nueva sin progreso) ──
const emptyCode = collectProgress(memStorage({ "guerrero-tactico-settings": "{}" }));
check("collect: export sin progreso sigue siendo código válido", parseProgressCode(emptyCode).ok === true);

// ═══ RESULTADO ═══
console.log("════════════════════════════════════════");
console.log(`  RESULTADO: ${pass} pasan · ${fail} fallan`);
console.log("════════════════════════════════════════");
process.exit(fail > 0 ? 1 : 0);
