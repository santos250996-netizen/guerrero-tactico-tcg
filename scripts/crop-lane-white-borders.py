#!/usr/bin/env python3
"""
Auto-crop white borders from lane background images.

Some AI-generated lane bgs have white/light pixels at the edges (the AI
added a thin white border around the actual art). This script removes that
border by detecting the bounding box of non-white content and cropping.

Operates on all 3 lane images (armas, proteccion, furia) — applies a
white-tolerance threshold so pixels close to white (e.g., light mist)
don't get cropped.
"""
import os
from PIL import Image, ImageOps

LANE_IMAGES = [
    "/home/z/workspace/guerrero-tactico-tcg/public/menu/lane-armas.png",
    "/home/z/workspace/guerrero-tactico-tcg/public/menu/lane-proteccion.png",
    "/home/z/workspace/guerrero-tactico-tcg/public/menu/lane-furia.png",
]

# White-tolerance: any pixel where R, G, AND B are >= 245 is treated as 'white
# border' for the bbox computation. Pixels with any color component < 245 are
# considered 'real content' and kept.
WHITE_THRESHOLD = 245


def is_white_pixel(rgba):
    r, g, b, a = rgba
    # Also treat fully-transparent pixels as 'border' so they get cropped
    if a < 10:
        return True
    return r >= WHITE_THRESHOLD and g >= WHITE_THRESHOLD and b >= WHITE_THRESHOLD


def get_non_white_bbox(img):
    """Return the bounding box of non-white, non-transparent pixels."""
    width, height = img.size
    pixels = img.load()
    left = width
    top = height
    right = 0
    bottom = 0
    for y in range(height):
        for x in range(width):
            if not is_white_pixel(pixels[x, y]):
                if x < left: left = x
                if x > right: right = x
                if y < top: top = y
                if y > bottom: bottom = y
    if left >= right or top >= bottom:
        return None  # all-white image
    return (left, top, right + 1, bottom + 1)


def main():
    for path in LANE_IMAGES:
        if not os.path.exists(path):
            print(f"  ! Skipping (not found): {path}")
            continue
        img = Image.open(path).convert("RGBA")
        original_size = img.size
        bbox = get_non_white_bbox(img)
        if not bbox:
            print(f"  ! {os.path.basename(path)}: all-white, skipping")
            continue
        cropped = img.crop(bbox)
        # Save back (convert to RGB for smaller PNG since no transparency)
        cropped.convert("RGB").save(path, "PNG", optimize=True)
        print(f"  ✓ {os.path.basename(path)}: cropped from {original_size} to {cropped.size} (border removed)")


if __name__ == "__main__":
    main()
