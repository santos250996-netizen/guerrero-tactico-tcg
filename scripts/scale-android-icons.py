#!/usr/bin/env python3
"""
Downscale the 1024x1024 game icon to ALL required Android launcher densities.

Outputs (in the workspace git repo's android/app/src/main/res/):
  mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/
      ic_launcher.png            (legacy square icon, with dark battlefield bg)
      ic_launcher_round.png      (legacy round icon, circular crop)
      ic_launcher_foreground.png (adaptive foreground — content within safe zone)

Also rewrites:
  drawable/ic_launcher_background.xml  → solid dark color (no grid)
"""
import os
from PIL import Image, ImageDraw, ImageFilter

SRC = "/home/z/my-project/public/menu/game-icon-1024.png"
# Transparent variant (no dark corners) — used for the adaptive foreground so
# the system's background layer (#0A0507 dark) shows through cleanly.
SRC_TRANSPARENT = "/home/z/my-project/public/menu/game-icon-transparent.png"
ANDROID_RES = "/home/z/my-project/workspace/guerrero-tactico-tcg/android/app/src/main/res"

# Android density sizes
# Legacy launcher icons (square): 48/72/96/144/192 px
LEGACY_DENSITIES = [
    ("mipmap-mdpi",    48),
    ("mipmap-hdpi",    72),
    ("mipmap-xhdpi",   96),
    ("mipmap-xxhdpi",  144),
    ("mipmap-xxxhdpi", 192),
]
# Adaptive foreground (full 108dp canvas): 108/162/216/324/432 px
# The actual visible content is the inner 66% (center 72dp on a 108dp canvas).
# We composite the icon inside a transparent canvas at 66% size, centered.
FOREGROUND_DENSITIES = [
    ("mipmap-mdpi",    108),
    ("mipmap-hdpi",    162),
    ("mipmap-xhdpi",   216),
    ("mipmap-xxhdpi",  324),
    ("mipmap-xxxhdpi", 432),
]


def make_round_mask(size: int) -> Image.Image:
    """Circle mask for round icon."""
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse((0, 0, size - 1, size - 1), fill=255)
    # Slightly feather the edge for anti-aliasing
    return mask.filter(ImageFilter.GaussianBlur(radius=0.5))


def process_legacy_square(icon_full: Image.Image, size: int) -> Image.Image:
    """Legacy square icon: just resize the full 1024 icon (which has dark bg)."""
    return icon_full.resize((size, size), Image.LANCZOS)


def process_legacy_round(icon_full: Image.Image, size: int) -> Image.Image:
    """Legacy round icon: circular crop with a thin dark border for visibility."""
    img = icon_full.resize((size, size), Image.LANCZOS).convert("RGBA")
    mask = make_round_mask(size)
    # Apply mask
    round_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    round_img.paste(img, (0, 0), mask)
    # Add a subtle dark ring around the edge (so it doesn't blend into white backgrounds)
    ring = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    rd = ImageDraw.Draw(ring)
    rd.ellipse((0, 0, size - 1, size - 1), outline=(0, 0, 0, 90), width=max(1, size // 80))
    ring = ring.filter(ImageFilter.GaussianBlur(radius=0.4))
    round_img.alpha_composite(ring)
    return round_img


def process_foreground(icon_full: Image.Image, size: int) -> Image.Image:
    """Adaptive foreground: icon at 66% size, centered on transparent canvas."""
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    # Inner icon occupies ~80% of the 66% visible area (≈ 53% of canvas)
    inner_size = int(size * 0.62)
    icon_small = icon_full.resize((inner_size, inner_size), Image.LANCZOS)
    # Center it
    offset = (size - inner_size) // 2
    canvas.alpha_composite(icon_small, (offset, offset))
    return canvas


def write_background_xml() -> str:
    """Solid dark crimson background (matches menu) instead of teal grid."""
    return """<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportHeight="108"
    android:viewportWidth="108">
    <path
        android:fillColor="#0A0507"
        android:pathData="M0,0h108v108h-108z" />
</vector>
"""


def main():
    if not os.path.exists(SRC):
        raise SystemExit(f"Source icon not found: {SRC}")
    if not os.path.exists(SRC_TRANSPARENT):
        raise SystemExit(f"Transparent icon not found: {SRC_TRANSPARENT}")
    if not os.path.isdir(ANDROID_RES):
        raise SystemExit(f"Android res dir not found: {ANDROID_RES}")

    print(f"Loading source icon (with bg): {SRC}")
    icon = Image.open(SRC).convert("RGBA")
    print(f"Source size: {icon.size}")

    print(f"Loading transparent icon (no bg): {SRC_TRANSPARENT}")
    icon_transparent = Image.open(SRC_TRANSPARENT).convert("RGBA")
    print(f"Transparent source size: {icon_transparent.size}")

    # ── Legacy launcher icons (square + round) ──
    for density, size in LEGACY_DENSITIES:
        out_dir = os.path.join(ANDROID_RES, density)
        os.makedirs(out_dir, exist_ok=True)

        # Square
        sq_path = os.path.join(out_dir, "ic_launcher.png")
        process_legacy_square(icon, size).save(sq_path, "PNG", optimize=True)
        # Round
        rd_path = os.path.join(out_dir, "ic_launcher_round.png")
        process_legacy_round(icon, size).save(rd_path, "PNG", optimize=True)
        print(f"  ✓ {density}/ic_launcher.png + ic_launcher_round.png  ({size}x{size})")

    # ── Adaptive foreground icons (use the TRANSPARENT icon so the dark system
    # background layer shows through the icon's corners — cleaner adaptive icon) ──
    for density, size in FOREGROUND_DENSITIES:
        out_dir = os.path.join(ANDROID_RES, density)
        os.makedirs(out_dir, exist_ok=True)

        fg_path = os.path.join(out_dir, "ic_launcher_foreground.png")
        process_foreground(icon_transparent, size).save(fg_path, "PNG", optimize=True)
        print(f"  ✓ {density}/ic_launcher_foreground.png  ({size}x{size}, transparent variant)")

    # ── Replace background vector with solid dark color ──
    bg_path = os.path.join(ANDROID_RES, "drawable", "ic_launcher_background.xml")
    os.makedirs(os.path.dirname(bg_path), exist_ok=True)
    with open(bg_path, "w", encoding="utf-8") as f:
        f.write(write_background_xml())
    print(f"  ✓ drawable/ic_launcher_background.xml  (dark #0A0507, no grid)")

    # Also replace the v24 vector foreground XML with a tiny placeholder that
    # references the PNG so the build doesn't fall back to the old Android robot.
    v24_path = os.path.join(ANDROID_RES, "drawable-v24", "ic_launcher_foreground.xml")
    os.makedirs(os.path.dirname(v24_path), exist_ok=True)
    v24_content = """<?xml version="1.0" encoding="utf-8"?>
<!-- The actual foreground art lives in mipmap-*/ic_launcher_foreground.png.
     This empty vector is kept only for compatibility with older build tools. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportHeight="108"
    android:viewportWidth="108">
    <path
        android:fillColor="#00000000"
        android:pathData="M0,0h108v108h-108z" />
</vector>
"""
    with open(v24_path, "w", encoding="utf-8") as f:
        f.write(v24_content)
    print(f"  ✓ drawable-v24/ic_launcher_foreground.xml  (cleared to empty vector)")

    print()
    print("All Android launcher icons regenerated.")


if __name__ == "__main__":
    main()
