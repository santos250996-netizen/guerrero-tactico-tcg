#!/usr/bin/env python3
"""
Composite the TRANSPARENT AI game icon onto the menu background, covering
the old Pillow-drawn emblem visually.

Reads:   public/menu/main-bg.png           (current version — restored from
                                           commit 2b5b1b9, has Pillow emblem
                                           + title baked in)
         public/menu/game-icon-transparent.png  (transparent AI icon)
Writes:  public/menu/main-bg.png           (same background + title, but the
                                           emblem is now the AI icon design)

The transparent icon covers the Pillow emblem area completely (since it's
bigger), so the simple Pillow-drawn crossed swords + ring is hidden behind
the AI icon's more detailed version. Only the AI icon's gold ring + crossed
swords are visible — corners are transparent so the menu background shows
through naturally, no dark square visible.
"""
import os
from PIL import Image

MENU_BG = "/home/z/my-project/public/menu/main-bg.png"
TRANSPARENT_ICON = "/home/z/my-project/public/menu/game-icon-transparent.png"

# The Pillow emblem was drawn at (W/2, 150) with size 78x78 in a 768x1344 image.
# We composite the transparent AI icon at the SAME center, sized to fully cover
# the Pillow emblem (~130px covers everything including the 4 corner dots).
EMBLEM_CENTER_X = 768 // 2  # 384
EMBLEM_CENTER_Y = 150
EMBLEM_SIZE = 130


def main():
    if not os.path.exists(MENU_BG):
        raise SystemExit(f"Menu background not found: {MENU_BG}")
    if not os.path.exists(TRANSPARENT_ICON):
        raise SystemExit(f"Transparent icon not found: {TRANSPARENT_ICON}")

    print(f"Loading menu background: {MENU_BG}")
    bg = Image.open(MENU_BG).convert("RGBA")
    W, H = bg.size
    print(f"Background size: {W}x{H}")

    print(f"Loading transparent icon: {TRANSPARENT_ICON}")
    icon = Image.open(TRANSPARENT_ICON).convert("RGBA")
    print(f"Icon size: {icon.size}")

    # Resize the transparent icon to cover the Pillow emblem area
    icon_resized = icon.resize((EMBLEM_SIZE, EMBLEM_SIZE), Image.LANCZOS)

    # Centered composite
    offset_x = EMBLEM_CENTER_X - EMBLEM_SIZE // 2
    offset_y = EMBLEM_CENTER_Y - EMBLEM_SIZE // 2
    print(f"Compositing at offset ({offset_x}, {offset_y}) — center ({EMBLEM_CENTER_X}, {EMBLEM_CENTER_Y})")

    bg.alpha_composite(icon_resized, (offset_x, offset_y))

    # Save back (convert to RGB for smaller PNG since the menu bg is opaque anyway)
    bg.convert("RGB").save(MENU_BG, "PNG", optimize=True)
    print(f"Saved: {MENU_BG} ({os.path.getsize(MENU_BG)} bytes)")


if __name__ == "__main__":
    main()
