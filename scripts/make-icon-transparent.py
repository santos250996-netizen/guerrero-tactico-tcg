#!/usr/bin/env python3
"""
Create a transparent version of the AI game icon.

The original AI icon has a dark crimson-to-black radial background with solid
black corners. That's fine for an Android launcher (where the icon is the
full square), but it can't be composited over a menu background without a
visible dark square.

This script:
  1. Loads public/menu/game-icon-1024.png
  2. Applies a CIRCULAR alpha mask (slightly smaller than the gold ring's
     outer edge) so the corners become fully transparent
  3. Feather-edges the mask for smooth anti-aliasing
  4. Saves to public/menu/game-icon-transparent.png (RGBA, transparent corners)

The OUTPUT keeps the gold ring + crossed swords + dark inside visible —
only the corners outside the ring become transparent. When composited onto
a dark menu background, the dark inside blends in seamlessly with the
background, and only the gold ring + crossed swords stand out.
"""
import os
from PIL import Image, ImageDraw, ImageFilter

SRC = "/home/z/my-project/public/menu/game-icon-1024.png"
OUT = "/home/z/my-project/public/menu/game-icon-transparent.png"

# Circular mask covers ~92% of canvas — leaves a small margin so the gold
# ring's outer edge is included but the dark corners are cut off.
MASK_RATIO = 0.92
# Feather radius for smooth anti-aliased edges
FEATHER = 2


def main():
    if not os.path.exists(SRC):
        raise SystemExit(f"Source icon not found: {SRC}")

    print(f"Loading icon: {SRC}")
    img = Image.open(SRC).convert("RGBA")
    W, H = img.size
    print(f"Icon size: {W}x{H}")

    # Build a circular alpha mask (white = visible, black = transparent)
    mask = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(mask)
    radius = int(min(W, H) / 2 * MASK_RATIO)
    # Draw a filled white circle (anti-aliased by default in newer Pillow)
    d.ellipse(
        (W // 2 - radius, H // 2 - radius, W // 2 + radius, H // 2 + radius),
        fill=255,
    )

    # Feather the edge for smooth blending
    mask = mask.filter(ImageFilter.GaussianBlur(radius=FEATHER))

    # Apply the mask as the alpha channel of the icon
    img.putalpha(mask)

    # Save with optimization
    img.save(OUT, "PNG", optimize=True)
    print(f"Saved transparent icon: {OUT} ({os.path.getsize(OUT)} bytes)")


if __name__ == "__main__":
    main()
