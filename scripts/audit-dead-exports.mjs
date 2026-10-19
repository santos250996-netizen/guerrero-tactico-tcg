// Escaneo de exports públicos sin referencias en src/ (nivel símbolo).
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
const texts = new Map(files.map((f) => [f, readFileSync(f, "utf8")]));

const declRe = /export\s+(?:async\s+)?(?:function|const|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g;

// Nombres reservados/entry: exports usados por Next o por frameworks
const NEXT_OK = new Set(["metadata", "dynamic", "revalidate", "GET", "POST", "PUT", "DELETE", "PATCH", "generateStaticParams", "runtime"]);

const results = [];
for (const f of files) {
  const text = texts.get(f);
  const others = files.filter((g) => g !== f).map((g) => texts.get(g)).join("\n");
  const scriptsTexts = [];
  try {
    const sdir = join(ROOT, "scripts");
    for (const s of walk(sdir)) scriptsTexts.push(readFileSync(s, "utf8"));
  } catch { /* sin scripts */ }
  const allOthers = others + "\n" + scriptsTexts.join("\n");

  for (const m of text.matchAll(declRe)) {
    const name = m[1];
    if (NEXT_OK.has(name)) continue;
    if (name.startsWith("__")) continue;
    // cuenta usos fuera del archivo que lo define (excluye la propia declaración y comentarios de doc)
    const useRe = new RegExp(`\\b${name}\\b`, "g");
    const usesOutside = (allOthers.match(useRe) ?? []).length;
    if (usesOutside === 0) {
      results.push(`${relative(ROOT, f)}  →  ${name}`);
    }
  }
}
console.log(results.join("\n") || "SIN EXPORTS HUÉRFANOS");
console.log(`\nTotal: ${results.length}`);
