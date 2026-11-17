#!/usr/bin/env python3
"""Fija el campo extra (anti-texto / anclaje de mundo) para las cartas problemáticas
y actualiza scripts/chibi-manifest.json. Ídem para tríadas nuevas vía swap-triada-violations.py.
"""
import json
from pathlib import Path

ROOT = Path("/home/z/my-project")
EXTRA = {
    "estandarte_de_la_cohorte": "the banner cloth is PLAIN solid crimson with plain wooden pole, absolutely NO writing, NO emblem text, NO inscriptions on the banner",
    "cantico_arcano": "ancient fantasy temple interior with floating violet runes, NO modern city, NO paved road, NO modern clothing, the singer wears fantasy robes",
    "ajuste_de_cuentas": "ancient fantasy back-alley duel at knife-point, NO modern soldiers, NO firearms, NO guns, NO military helmets, fantasy thieves guild setting",
    "yesca_ardiente": "no caption, no title, no name written anywhere in the image, the fire-newt is a wild creature not a poster",
    "bomba_de_fuego_inestable": "no headline, no glyphs, no characters of any writing system in the image, the explosion is the only event",
}


def main() -> None:
    manifest = json.loads((ROOT / "scripts/chibi-manifest.json").read_text())
    n = 0
    for c in manifest:
        if c["id"] in EXTRA:
            c["extra"] = EXTRA[c["id"]]
            n += 1
    (ROOT / "scripts/chibi-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"extras fijados: {n}/{len(EXTRA)}")


if __name__ == "__main__":
    main()
