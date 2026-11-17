#!/usr/bin/env python3
"""Reasigna una tríada DIFERENTE a las cartas que salieron con texto dentro.

Lee scripts/chibi-qa-text-violations.txt, para cada id elige un combo
(plano, ángulo, momento) sin usar dentro de su spec y actualiza
scripts/chibi-manifest.json. Luego se regeneran con:
  ONLY=id1,id2 FORCE=1 bun scripts/gen-chibi-cards.mjs
"""
import itertools
import json
import random
from pathlib import Path

ROOT = Path("/home/z/my-project")
PLANO = ["primerísimo plano", "retrato chibi", "cuerpo entero", "plano general", "paisaje con figura mínima"]
ANGULO = ["contrapicado extremo", "picado aéreo", "nivel del suelo", "frontal", "3/4", "contraluz"]
MOMENTO = ["preparación", "impacto", "consecuencia"]


def main() -> None:
    ids = [l.strip() for l in (ROOT / "scripts/chibi-qa-text-violations.txt").read_text().splitlines() if l.strip()]
    manifest = json.loads((ROOT / "scripts/chibi-manifest.json").read_text())
    by_id = {c["id"]: c for c in manifest}
    all_combos = {(p, a, m) for p in PLANO for a in ANGULO for m in MOMENTO}

    used: dict[str, set] = {}
    for c in manifest:
        used.setdefault(c["spec"], set()).add((c["plano"], c["angulo"], c["momento"]))

    changed = 0
    for cid in ids:
        c = by_id.get(cid)
        if not c:
            print(f"{cid}: NO EXISTE en el manifiesto — revisar id")
            continue
        old = (c["plano"], c["angulo"], c["momento"])
        free = sorted(all_combos - used[c["spec"]] - {old})
        if not free:
            print(f"{cid}: sin combos libres (imposible)")
            continue
        new = random.Random(f"fix-{cid}").choice(free)
        c["plano"], c["angulo"], c["momento"] = new
        used[c["spec"]].add(new)
        changed += 1
        print(f"{cid}: {'·'.join(old)} → {'·'.join(new)}")

    (ROOT / "scripts/chibi-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"actualizadas: {changed}/{len(ids)}")


if __name__ == "__main__":
    main()
