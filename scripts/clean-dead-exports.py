#!/usr/bin/env python3
# ============================================================================
# clean-dead-exports.py — limpia los exports huérfanos que reporta
# audit-dead-exports.mjs con DOS niveles de seguridad:
#   · UNEXPORT: el símbolo SÍ se usa dentro de su propio archivo → solo se
#     quita la palabra clave `export` (se vuelve privado). Cero riesgo.
#   · DELETE: el símbolo NO se usa ni siquiera internamente → se borra el
#     bloque completo (const/interface/type/function/enum) por balance de
#     llaves/paréntesis + su comentario JSDoc adyacente.
# EXENCIÓN: src/lib/game/card-scripts.ts es API pública documentada
# (docs/design-pattern-cards.md §11) — sus exports son el contrato para
# autores de scripts futuros aunque el registro esté vacío hoy.
# Uso: python3 scripts/clean-dead-exports.py [--dry]
# ============================================================================
import re
import subprocess
import sys

ROOT = "/home/z/my-project"
EXEMPT_FILES = {"src/lib/game/card-scripts.ts"}

DECL_RE = re.compile(
    r"^(\s*)export\s+(async\s+)?(function|const|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)",
    re.M,
)


def audit_list():
    out = subprocess.run(
        ["bun", "scripts/audit-dead-exports.mjs"],
        capture_output=True, text=True, cwd=ROOT,
    ).stdout
    pairs = []
    for line in out.splitlines():
        m = re.match(r"^(src/\S+?)\s+→\s+(\w+)$", line.strip())
        if m:
            pairs.append((m.group(1), m.group(2)))
    return pairs


def block_end(lines, start_idx):
    """Índice de la ÚLTIMA línea del bloque que empieza en start_idx
    (balance de {} () [] contemplando strings simples)."""
    bal = 0
    opened = False
    for i in range(start_idx, len(lines)):
        line = lines[i]
        # strip string literals roughly (evita llaves dentro de strings)
        clean = re.sub(r"`[^`]*`", "``", line)
        clean = re.sub(r"'[^']*'", "''", clean)
        clean = re.sub(r'"[^"]*"', '""', clean)
        clean = re.sub(r"//[^\n]*", "", clean)
        for ch in clean:
            if ch in "{([":
                bal += 1
                opened = True
            elif ch in "})]":
                bal -= 1
        if opened and bal == 0:
            return i
        if not opened and clean.rstrip().endswith(";"):
            return i
    return len(lines) - 1


def strip_jsdoc(lines, decl_idx):
    """Quita comentario /** */ o // adyacente inmediatamente arriba."""
    j = decl_idx - 1
    if j < 0:
        return decl_idx
    stripped = lines[j].strip()
    if stripped.endswith("*/"):
        while j >= 0:
            if lines[j].strip().startswith("/**") or lines[j].strip().startswith("/*"):
                return j
            j -= 1
        return decl_idx
    if stripped.startswith("///") or (stripped.startswith("//") and not stripped.startswith("/**")):
        while j >= 0 and lines[j].strip().startswith("//"):
            j -= 1
        return j + 1
    return decl_idx


def main():
    dry = "--dry" in sys.argv
    pairs = audit_list()
    if not pairs:
        print("SIN EXPORTS HUÉRFANOS — nada que hacer")
        return

    by_file = {}
    for f, name in pairs:
        if f in EXEMPT_FILES:
            continue
        by_file.setdefault(f, set()).add(name)

    total_unexp, total_del = 0, 0
    for rel, names in sorted(by_file.items()):
        path = f"{ROOT}/{rel}"
        text = open(path).read()
        lines = text.split("\n")
        # marcar líneas a borrar / export a quitar
        delete_rows, unexport_rows = set(), {}
        for idx, line in enumerate(lines):
            m = DECL_RE.match(line)
            if not m or m.group(4) not in names:
                continue
            name = m.group(4)
            decl_line_idx = idx
            # usos internos: apariciones del nombre fuera de SU línea de decl
            others = [l for k, l in enumerate(lines) if k != decl_line_idx]
            joined = "\n".join(others)
            internal_uses = len(re.findall(rf"\b{name}\b", joined))
            if internal_uses > 0:
                unexport_rows[decl_line_idx] = line
            else:
                end = block_end(lines, decl_line_idx)
                start = strip_jsdoc(lines, decl_line_idx)
                for r in range(start, end + 1):
                    delete_rows.add(r)
        if not delete_rows and not unexport_rows:
            continue
        new_lines = []
        for idx, line in enumerate(lines):
            if idx in delete_rows:
                continue
            if idx in unexport_rows:
                line = re.sub(r"^(\s*)export\s+", r"\1", line, count=1)
            new_lines.append(line)
        # colapsar 3+ líneas vacías que puedan quedar
        out = "\n".join(new_lines)
        out = re.sub(r"\n{3,}", "\n\n", out)
        if not dry:
            open(path, "w").write(out)
        total_unexp += len(unexport_rows)
        total_del += len(delete_rows)
        print(
            f"{rel}: unexport {len(unexport_rows)} · delete líneas {len(delete_rows)} "
            f"({', '.join(sorted(names))})"
        )
    print(f"\nTOTAL: {total_unexp} unexport · {total_del} líneas borradas {'(DRY)' if dry else ''}")


if __name__ == "__main__":
    main()
