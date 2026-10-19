// Auditoría de código muerto: encuentra archivos de src/ nunca importados
// y exports públicos sin referencias. Solo lectura (no borra nada).
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname, resolve } from "node:path";

const ROOT = "/home/z/my-project";
const SRC = join(ROOT, "src");

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx)$/.test(name)) acc.push(p);
  }
  return acc;
}

const files = walk(SRC);
const rel = (p) => relative(ROOT, p);

// 1) Recolecta todos los import specifiers de TODO el repo (src + scripts)
const allTs = [...files, ...walk(join(ROOT, "scripts"))];
const importEdges = new Map(); // file -> [resolved targets]
const specifierRe = /(?:import|export)\s+(?:[\s\S]*?from\s+)?["']([^"']+)["']/g;
const dynamicRe = /import\(\s*["']([^"']+)["']\s*\)/g;

function resolveSpec(fromFile, spec) {
  let base = null;
  if (spec.startsWith("@/")) base = join(SRC, spec.slice(2));
  else if (spec.startsWith("./") || spec.startsWith("../")) base = resolve(dirname(fromFile), spec);
  else return null; // paquete npm
  for (const cand of [base, base + ".ts", base + ".tsx", join(base, "index.ts"), join(base, "index.tsx")]) {
    try { if (statSync(cand).isFile()) return cand; } catch { /* no existe */ }
  }
  return null;
}

const referenced = new Set(); // archivos importados por alguien
const importers = new Map(); // archivo -> quién lo importa

for (const f of allTs) {
  const text = readFileSync(f, "utf8");
  const specs = new Set();
  for (const m of text.matchAll(specifierRe)) specs.add(m[1]);
  for (const m of text.matchAll(dynamicRe)) specs.add(m[1]);
  for (const spec of specs) {
    const target = resolveSpec(f, spec);
    if (target && target !== f && target.startsWith(SRC)) {
      referenced.add(target);
      if (!importers.has(target)) importers.set(target, []);
      importers.get(target).push(rel(f));
    }
  }
}

// 2) Archivos src nunca importados (excluye entradas legítimas)
const ENTRIES = new Set([
  join(SRC, "app", "layout.tsx"),
  join(SRC, "app", "page.tsx"),
  ...["route"].flatMap(() => walk(join(SRC, "app", "api"))), // routes: montados por Next
  join(SRC, "components", "native", "BackButtonBridge.tsx"),
]);
const orphans = files.filter((f) => !referenced.has(f) && !ENTRIES.has(f));

console.log("== ARCHIVOS src/ NUNCA IMPORTADOS ==");
for (const o of orphans) {
  const isRoute = o.includes(`${join("app", "api")}`);
  console.log(`${isRoute ? "[route-Next]" : "[HUÉRFANO]"} ${rel(o)}  ← importado por: ${JSON.stringify(importers.get(o) ?? [])}`);
}

// 3) ui/ components: quién usa cuál
console.log("\n== USO DE components/ui/ ==");
const uiDir = join(SRC, "components", "ui");
for (const f of walk(uiDir)) {
  const users = importers.get(f) ?? [];
  const externalUsers = users.filter((u) => !u.startsWith("src/components/ui/"));
  console.log(`${externalUsers.length === 0 ? "SIN USO EXTERNO" : "usado      "} ${rel(f)} (${users.length} imports, ${externalUsers.length} externos)`);
}

// 4) lib/ y store/: refs
console.log("\n== USO DE lib/ y store/ ==");
for (const dir of ["lib", "store", "hooks"]) {
  for (const f of walk(join(SRC, dir))) {
    const users = importers.get(f) ?? [];
    if (users.length === 0) console.log(`SIN USO  ${rel(f)}`);
  }
}
console.log("\n(ok = usado; solo archivos SIN USO listados para lib/store/hooks)");
