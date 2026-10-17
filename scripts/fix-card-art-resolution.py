#!/usr/bin/env python3
"""
Fix card art resolution to comply with scripts/design-pattern.md
- Target: 432x576 (2x retina of 216x288 display size, cards shown at max 224px)
- Method: PIL Image.LANCZOS + PNG optimize=True
Run from project root: python3 scripts/fix-card-art-resolution.py
"""
import os
import sys
import glob
from PIL import Image

TARGET = (432, 576)
CARDS_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'cards')


def main() -> None:
    files = sorted(glob.glob(os.path.join(CARDS_DIR, '*.png')))
    fixed, skipped = 0, 0
    for f in files:
        img = Image.open(f)
        if img.size == TARGET:
            skipped += 1
            continue
        # LANCZOS downscale + optimized PNG save (design-pattern.md spec)
        resized = img.resize(TARGET, Image.LANCZOS)
        resized.save(f, 'PNG', optimize=True)
        kb = os.path.getsize(f) / 1024
        print(f'✔ {os.path.basename(f)} {img.size[0]}x{img.size[1]} -> 432x576 ({kb:.0f}KB)')
        fixed += 1
    print(f'\n{fixed} corregidas, {skipped} ya cumplían (total {len(files)})')


if __name__ == '__main__':
    sys.exit(main())
