#!/usr/bin/env python3
"""Monta hojas de contacto del arte chibi para verificación visual masiva.

Uso: python3 scripts/chibi-contact-sheet.py [n_col=8] [thumb_w=150]
Lee public/cards/*.webp del manifiesto y escribe hojas en download/chibi-cartas/
con etiqueta {id} {spec} por miniatura: permite auditar 192 cartas con 2 lecturas.
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path("/home/z/my-project")
OUT = ROOT / "download/chibi-cartas"


def main() -> None:
    n_col = int(sys.argv[1]) if len(sys.argv) > 1 else 8
    thumb_w = int(sys.argv[2]) if len(sys.argv) > 2 else 150
    manifest = json.loads((ROOT / "scripts/chibi-manifest.json").read_text())
    cards = [c for c in manifest if (ROOT / f"public/cards/{c['id']}.webp").exists()]
    thumb_h = int(thumb_w * 576 / 432)
    label_h = 14
    per_sheet = n_col * 8
    OUT.mkdir(parents=True, exist_ok=True)
    n_sheets = 0
    for start in range(0, len(cards), per_sheet):
        chunk = cards[start:start + per_sheet]
        rows = (len(chunk) + n_col - 1) // n_col
        sheet = Image.new("RGB", (n_col * (thumb_w + 2) + 2, rows * (thumb_h + label_h + 2) + 2), "white")
        d = ImageDraw.Draw(sheet)
        for i, c in enumerate(chunk):
            x = 2 + (i % n_col) * (thumb_w + 2)
            y = 2 + (i // n_col) * (thumb_h + label_h + 2)
            im = Image.open(ROOT / f"public/cards/{c['id']}.webp").resize((thumb_w, thumb_h), Image.LANCZOS)
            sheet.paste(im, (x, y))
            d.text((x + 1, y + thumb_h + 1), f"{c['id'][:24]} {c['spec'][:4]}", fill="black")
        n_sheets += 1
        sheet.save(OUT / f"contact-sheet-{n_sheets}.png")
        print(f"hoja {n_sheets}: {len(chunk)} cartas → {OUT / f'contact-sheet-{n_sheets}.png'}")
    print(f"total: {len(cards)} cartas en {n_sheets} hojas")


if __name__ == "__main__":
    main()
