#!/usr/bin/env python3
"""Convierte los PNG 864x1152 de assets-src/chibi-cards → public/cards/{id}.webp
(432x576, LANCZOS) y verifica TODAS las cartas del manifiesto: existencia,
dimensiones y ratio de no-blancos. Idempotente: solo convierte lo nuevo.

Salida: resumen + lista de fallos (para regenerar con ONLY=ids).
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path("/home/z/my-project")
STAGE = ROOT / "assets-src/chibi-cards"
OUT = ROOT / "public/cards"
TARGET = (432, 576)


def nonblank_ratio(im: Image.Image) -> float:
    h = im.convert("L").histogram()
    return 1 - h[255] / sum(h)


def main() -> None:
    manifest = json.loads((ROOT / "scripts/chibi-manifest.json").read_text())
    ids = [c["id"] for c in manifest]

    converted = 0
    for cid in ids:
        png = STAGE / f"{cid}.png"
        webp = OUT / f"{cid}.webp"
        if not png.exists() or png.stat().st_size == 0:
            continue
        if webp.exists() and webp.stat().st_mtime >= png.stat().st_mtime:
            continue
        im = Image.open(png).convert("RGB")
        im = ImageOps.fit(im, TARGET, method=Image.LANCZOS)
        im.save(webp, "WEBP", quality=85, method=6)
        converted += 1

    # verificación completa
    missing, bad_size, blank, ok = [], [], [], 0
    for cid in ids:
        webp = OUT / f"{cid}.webp"
        if not webp.exists() or webp.stat().st_size == 0:
            missing.append(cid)
            continue
        im = Image.open(webp)
        if im.size != TARGET:
            bad_size.append((cid, im.size))
            continue
        if nonblank_ratio(im) < 0.05:
            blank.append(cid)
            continue
        ok += 1

    print(f"convertidas ahora: {converted}")
    print(f"verificación: ok={ok}/{len(ids)} · faltan={len(missing)} · tamaño mal={len(bad_size)} · en blanco={len(blank)}")
    if missing:
        print("FALTAN:", ",".join(missing))
    if bad_size:
        print("TAMAÑO:", bad_size[:10])
    if blank:
        print("BLANCO:", ",".join(blank))
    sys.exit(1 if (missing or bad_size or blank) else 0)


if __name__ == "__main__":
    main()
