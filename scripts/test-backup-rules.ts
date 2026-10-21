// ═════════════════════════════════════════════════════════════════════
// test-backup-rules.ts — Guardián del respaldo nativo del APK.
//
// Reproduce la regla FATAL de Android Lint (FullBackupContent /
// DataExtractionRules) que rompió el CI en Task 50: con <include>s
// explícitos, TODO <exclude> debe vivir DENTRO de un <include> del
// mismo dominio (prefijo con frontera de '/'). Además garantiza que
// app_webview (el localStorage del juego) siga INCLUIDO en las tres
// secciones — el motivo de existir de estas reglas.
//
// Se ejecuta contra los XML reales del proyecto: si alguien toca las
// reglas de backup y reintroduce un exclude huérfano, esto falla ANTES
// de que el CI queme un runner en lintVitalRelease.
// ═════════════════════════════════════════════════════════════════════
import { readFileSync } from "node:fs";
import { join } from "node:path";

let pass = 0, fail = 0;
function check(name: string, cond: boolean) {
  if (cond) { pass++; }
  else { fail++; console.error(`  ✗ ${name}`); }
}

interface Rule { domain: string; path: string; }

function parseRules(xml: string, block: string): { includes: Rule[]; excludes: Rule[] } {
  // Extrae la sección <block>…</block> (o el documento entero si block="*")
  const section = block === "*" ? xml : (xml.match(new RegExp(`<${block}>[\\s\\S]*?</${block}>`)) ?? [""])[0];
  const includes: Rule[] = [];
  const excludes: Rule[] = [];
  for (const m of section.matchAll(/<(include|exclude)\s+domain="([^"]+)"\s+path="([^"]+)"\s*\/>/g)) {
    (m[1] === "include" ? includes : excludes).push({ domain: m[2], path: m[3] });
  }
  return { includes, excludes };
}

/** La regla de Lint: exclude (domain,path) válido ⟺ existe include del mismo
 *  dominio cuyo path es prefijo del exclude con frontera de segmento ('/'). */
function excludeInsideInclude(ex: Rule, includes: Rule[]): boolean {
  return includes.some((inc) =>
    inc.domain === ex.domain &&
    (inc.path === "." || ex.path === inc.path || ex.path.startsWith(inc.path + "/")),
  );
}

const BASE = "android/app/src/main/res/xml";
const backupXml = readFileSync(join(BASE, "backup_rules.xml"), "utf8");
const extractXml = readFileSync(join(BASE, "data_extraction_rules.xml"), "utf8");

// ── 1. Los XML parsean (bien formados) ──
check("backup_rules.xml bien formado", backupXml.includes("<full-backup-content>") && backupXml.includes("</full-backup-content>"));
check("data_extraction_rules.xml bien formado", extractXml.includes("<cloud-backup>") && extractXml.includes("<device-transfer>"));

// ── 2. Regla LINT: todo exclude dentro de un include (mismo dominio) ──
const backupRules = parseRules(backupXml, "*");
check("fullBackupContent: exclude file/cache dentro de file/. (lint-safe)", backupRules.excludes.every((e) => excludeInsideInclude(e, backupRules.includes)));
for (const block of ["cloud-backup", "device-transfer"] as const) {
  const rules = parseRules(extractXml, block);
  check(`dataExtractionRules[${block}]: excludes dentro de includes (lint-safe)`, rules.excludes.every((e) => excludeInsideInclude(e, rules.includes)));
}

// ── 3. EL MOTIVO DE EXISTIR: app_webview incluido en las 3 secciones ──
check("fullBackupContent incluye root/app_webview", backupRules.includes.some((i) => i.domain === "root" && i.path === "app_webview"));
for (const block of ["cloud-backup", "device-transfer"] as const) {
  const rules = parseRules(extractXml, block);
  check(`dataExtractionRules[${block}] incluye root/app_webview`, rules.includes.some((i) => i.domain === "root" && i.path === "app_webview"));
}

// ── 4. Sin excludes huérfanos de dominio root (el bug exacto del CI) ──
const allRules = [backupRules, parseRules(extractXml, "cloud-backup"), parseRules(extractXml, "device-transfer")];
check("NINGÚN exclude de dominio root en ninguna sección", allRules.every((r) => !r.excludes.some((e) => e.domain === "root")));

// ── 5. Dominios válidos (lint también valida esto) ──
const VALID = new Set(["root", "file", "database", "sharedpref", "external", "device_root", "no_backup"]);
check("todos los dominios son válidos", allRules.every((r) => [...r.includes, ...r.excludes].every((e) => VALID.has(e.domain))));

// ═══ RESULTADO ═══
console.log("════════════════════════════════════════");
console.log(`  RESULTADO: ${pass} pasan · ${fail} fallan`);
console.log("════════════════════════════════════════");
process.exit(fail > 0 ? 1 : 0);
