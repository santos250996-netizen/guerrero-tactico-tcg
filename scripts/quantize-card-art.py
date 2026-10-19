#!/usr/bin/env python3
"""
Quantize card art PNGs to palette mode (256 colors, dithered) — cuts ~60-70%
of file size with no visible loss on painted art. APK weight + decode speed.
Run from project root: python3 scripts/quantize-card-art.py
"""
import os, glob
from PIL import Image

CARDS_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'cards')

def main():
    total_before = total_after = 0
    n = 0
    for f in sorted(glob.glob(os.path.join(CARDS_DIR, '*.png'))):
        before = os.path.getsize(f)
        total_before += before
        img = Image.open(f)
        if img.mode in ('RGBA', 'RGB'):
            # 256 colores con dithering — el arte pintado aguanta paleta perfectamente
            q = img.convert('RGB').quantize(colors=256, method=Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG)
            q.save(f, 'PNG', optimize=True)
        after = os.path.getsize(f)
        total_after += after
        n += 1
        if n % 40 == 0:
            print(f'  …{n} procesadas')
    print(f'{n} imágenes: {total_before/1e6:.1f}MB → {total_after/1e6:.1f}MB ({100-total_after*100/max(1,total_before):.0f}% menos)')

if __name__ == '__main__':
    main()
