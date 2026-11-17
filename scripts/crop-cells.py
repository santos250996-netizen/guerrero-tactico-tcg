#!/usr/bin/env python3
"""Recorta celdas de una hoja de contacto y las monta a tamaño legible.

Uso: python3 scripts/crop-cells.py <sheet_n> <idx1,idx2,...> <salida.png>
Los índices son la posición en el manifiesto (fila*8+col de la hoja).
Cada celda: miniatura 150x200 + franja de etiqueta, reescalada x2.
"""
import sys
from pathlib import Path

from PIL import Image

ROOT = Path("/home/z/my-project")
THUMB_W, THUMB_H, LABEL_H = 150, 200, 14


def main() -> None:
    sheet = int(sys.argv[1])
    idxs = [int(x) for x in sys.argv[2].split(",")]
    out = sys.argv[3]
    img = Image.open(ROOT / f"download/chibi-cartas/contact-sheet-{sheet}.png")
    zoom = 2
    cell_w, cell_h = THUMB_W + 2, THUMB_H + LABEL_H + 2
    cols = min(len(idxs), 4)
    rows = (len(idxs) + cols - 1) // cols
    canvas = Image.new("RGB", (cols * cell_w * zoom + 8, rows * cell_h * zoom + 8), "white")
    for i, idx in enumerate(idxs):
        r, c = divmod(idx, 8)
        box = (2 + c * cell_w, 2 + r * cell_h, 2 + c * cell_w + THUMB_W, 2 + r * cell_h + THUMB_H + LABEL_H)
        cell = img.crop(box).resize((cell_w * zoom, cell_h * zoom), Image.LANCZOS)
        x = 4 + (i % cols) * cell_w * zoom
        y = 4 + (i // cols) * cell_h * zoom
        canvas.paste(cell, (x, y))
    canvas.save(out)
    print(f"{len(idxs)} celdas → {out} ({canvas.size})")


if __name__ == "__main__":
    main()
