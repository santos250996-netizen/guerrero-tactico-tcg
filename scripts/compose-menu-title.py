#!/usr/bin/env python3
"""
Composite the 'PACTO DE GUERRA' title + the SAME AI game icon used as Android
launcher directly onto the raw menu background.

Reads:   public/menu/main-bg-raw.png   (clean background, no title)
Writes:  public/menu/main-bg.png       (final composited image)

This keeps the menu emblem and the Android launcher icon visually IDENTICAL
so the brand mark is consistent across surfaces (no incoherence).
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

RAW_BG = "/home/z/my-project/public/menu/main-bg-raw.png"
OUT = "/home/z/my-project/public/menu/main-bg.png"
# Use the SAME AI-generated icon as the launcher so brand identity is consistent
EMBLEM_SRC = "/home/z/my-project/public/menu/game-icon-1024.png"

# Heavy serif font (Noto Serif SC Black — has Latin glyphs alongside CJK)
FONT_BLACK = "/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Black.ttf"
FONT_SANS_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

# Tactical grimdark palette
GOLD_TOP = (255, 215, 100)     # bright amber highlight
GOLD_BOT = (180, 110, 30)      # dark gold shadow
GLOW_RED = (180, 30, 30)       # outer glow crimson
SHADOW = (0, 0, 0)             # drop shadow


def make_gradient_text(text: str, font: ImageFont.FreeTypeFont, grad_top, grad_bot, size):
    """Render text in white, then composite it with a vertical gradient mask."""
    # Measure
    bbox = font.getbbox(text)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    if w <= 0 or h <= 0:
        w, h = 10, 10
    pad = 8
    canvas_w, canvas_h = w + pad * 2, h + pad * 2

    # 1) White text on transparent (alpha mask)
    mask = Image.new("L", (canvas_w, canvas_h), 0)
    md = ImageDraw.Draw(mask)
    md.text((pad - bbox[0], pad - bbox[1]), text, fill=255, font=font)

    # 2) Vertical gradient the same size, full RGBA
    grad = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    px = grad.load()
    for y in range(canvas_h):
        t = y / max(1, canvas_h - 1)
        # Use a smooth curve to bias toward the highlight near the top
        t2 = t ** 0.7
        r = int(grad_top[0] * (1 - t2) + grad_bot[0] * t2)
        g = int(grad_top[1] * (1 - t2) + grad_bot[1] * t2)
        b = int(grad_top[2] * (1 - t2) + grad_bot[2] * t2)
        for x in range(canvas_w):
            px[x, y] = (r, g, b, 255)

    # 3) Apply the text mask as the alpha of the gradient
    grad.putalpha(mask)
    return grad, canvas_w, canvas_h, pad, bbox


def stamp_glow_text(base: Image.Image, text: str, font, center_xy, grad_top, grad_bot,
                    glow_color, glow_radius=14, shadow_offset=(2, 3)):
    """Stamp text with: dark drop shadow + colored outer glow + gradient fill."""
    grad, cw, ch, pad, bbox = make_gradient_text(text, font, grad_top, grad_bot, base.size)
    cx, cy = center_xy

    # ── 1) Drop shadow: stamp gradient in pure black, offset, blurred
    shadow = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow)
    s_draw.rectangle((0, 0, cw, ch), fill=(0, 0, 0, 0))
    # Re-render text in black for shadow
    sfont_mask = Image.new("L", (cw, ch), 0)
    ImageDraw.Draw(sfont_mask).text((pad - bbox[0], pad - bbox[1]), text, fill=255, font=font)
    shadow.putalpha(sfont_mask)
    # Blur shadow
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=4))
    base.alpha_composite(shadow, (cx - cw // 2 + shadow_offset[0], cy - ch // 2 + shadow_offset[1]))

    # ── 2) Outer glow: render text in glow_color, blur, stamp underneath
    glow = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    # Render the text directly in glow_color on RGBA
    glow_draw.text((pad - bbox[0], pad - bbox[1]), text, fill=glow_color + (255,), font=font)
    glow = glow.filter(ImageFilter.GaussianBlur(radius=glow_radius))
    base.alpha_composite(glow, (cx - cw // 2, cy - ch // 2))

    # ── 3) Main text with gradient fill
    base.alpha_composite(grad, (cx - cw // 2, cy - ch // 2))

    # ── 4) Sharp highlight: stamp bright gold on top, 1-px offset upward (thin top edge highlight)
    highlight = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    hl_mask = Image.new("L", (cw, ch), 0)
    ImageDraw.Draw(hl_mask).text((pad - bbox[0], pad - bbox[1] - 1), text, fill=255, font=font)
    hl = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    hl_pix = hl.load()
    for y in range(ch):
        for x in range(cw):
            a = hl_mask.getpixel((x, y))
            if a > 0:
                # Soften: only show the very top edge
                hl_pix[x, y] = (255, 240, 200, a // 4)
    base.alpha_composite(hl, (cx - cw // 2, cy - ch // 2))

    return ch  # return height of stamped text (for stacking layout)


def draw_radial_glow(base: Image.Image, center_xy, radius, color, max_alpha=110):
    """Soft radial glow disk."""
    cx, cy = center_xy
    glow = Image.new("RGBA", (radius * 2, radius * 2), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    # Layered concentric circles, fading outwards
    steps = 24
    for i in range(steps, 0, -1):
        r = int(radius * i / steps)
        a = int(max_alpha * (1 - i / steps) ** 2)
        gd.ellipse((radius - r, radius - r, radius + r, radius + r),
                   fill=(color[0], color[1], color[2], a))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=radius // 4))
    base.alpha_composite(glow, (cx - radius, cy - radius))


def composite_game_emblem(base: Image.Image, center_xy, target_size=160):
    """Stamp the AI-generated game launcher icon as the menu emblem.

    Uses the SAME source PNG as scale-android-icons.py — keeps brand
    identity coherent between the launcher icon and the in-menu emblem.
    """
    cx, cy = center_xy
    if not os.path.exists(EMBLEM_SRC):
        print(f"  ! Emblem source not found, skipping: {EMBLEM_SRC}")
        return
    emblem = Image.open(EMBLEM_SRC).convert("RGBA")
    # Resize to target emblem size
    emblem = emblem.resize((target_size, target_size), Image.LANCZOS)
    # Subtle dark ring around the emblem for separation from the background
    ring = Image.new("RGBA", (target_size, target_size), (0, 0, 0, 0))
    ImageDraw.Draw(ring).ellipse(
        (0, 0, target_size - 1, target_size - 1),
        outline=(0, 0, 0, 140),
        width=2,
    )
    # Center stamp
    offset = (cx - target_size // 2, cy - target_size // 2)
    base.alpha_composite(emblem, offset)
    base.alpha_composite(ring, offset)


def draw_divider(base: Image.Image, center_xy, width=180, color=GOLD_TOP):
    """Horizontal divider with central diamond."""
    cx, cy = center_xy
    d = ImageDraw.Draw(base)
    half = width // 2
    # Fading line — use an RGBA line gradient by stamping many short lines
    line_h = 1
    segments = 60
    for i in range(segments):
        t = i / (segments - 1)
        # Alpha fades toward the edges (highest in the middle)
        dist_from_center = abs(t - 0.5) * 2  # 0 at center, 1 at edges
        a = int(180 * (1 - dist_from_center) ** 1.5)
        x0 = cx - half + int(t * width)
        x1 = x0 + max(1, width // segments + 1)
        d.line([(x0, cy), (x1, cy)], fill=color + (a,), width=line_h)
    # Central diamond
    dsize = 6
    d.polygon([(cx, cy - dsize), (cx + dsize, cy), (cx, cy + dsize), (cx - dsize, cy)],
              fill=color + (255,))


def main():
    if not os.path.exists(RAW_BG):
        raise SystemExit(f"Raw background not found: {RAW_BG}\nRun scripts/gen-menu-bg.ts first.")

    print(f"Loading raw background: {RAW_BG}")
    bg = Image.open(RAW_BG).convert("RGBA")
    W, H = bg.size
    print(f"Background size: {W}x{H}")

    # Title placement: upper-middle third (around y=240-380)
    cx = W // 2

    # ── Layer 1: Soft radial glow behind the whole title region
    draw_radial_glow(bg, (cx, 280), radius=260, color=GLOW_RED, max_alpha=85)
    draw_radial_glow(bg, (cx, 280), radius=140, color=(255, 200, 100), max_alpha=70)

    # ── Layer 2: AI game emblem (same PNG as the Android launcher icon)
    emblem_y = 170
    composite_game_emblem(bg, (cx, emblem_y), target_size=200)

    # ── Layer 3: 'PACTO' (heavy black serif, gold gradient)
    font_pacto = ImageFont.truetype(FONT_BLACK, 88)
    pacto_y = emblem_y + 130
    stamp_glow_text(bg, "PACTO", font_pacto, (cx, pacto_y),
                    grad_top=GOLD_TOP, grad_bot=GOLD_BOT,
                    glow_color=GLOW_RED, glow_radius=12)

    # ── Layer 4: Decorative divider
    divider_y = pacto_y + 56
    draw_divider(bg, (cx, divider_y), width=200)

    # ── Layer 5: 'DE GUERRA' (same font, slightly crimson-tinted gold)
    font_guerra = ImageFont.truetype(FONT_BLACK, 84)
    guerra_y = divider_y + 40
    # Slightly crimson gold gradient
    stamp_glow_text(bg, "DE GUERRA", font_guerra, (cx, guerra_y),
                    grad_top=(255, 200, 130), grad_bot=(180, 50, 40),
                    glow_color=(220, 40, 30), glow_radius=14)

    # ── Layer 6: Subtitle 'TCG Táctico de Carriles'
    font_sub = ImageFont.truetype(FONT_SANS_BOLD, 20)
    sub_y = guerra_y + 64
    sub_text = "TCG TÁCTICO DE CARRILES"
    # Measure for centering
    sb = font_sub.getbbox(sub_text)
    sw = sb[2] - sb[0]
    sh = sb[3] - sb[1]
    # Render with amber color + soft shadow
    sub_shadow = Image.new("RGBA", (sw + 20, sh + 20), (0, 0, 0, 0))
    ImageDraw.Draw(sub_shadow).text((10 - sb[0], 10 - sb[1]), sub_text,
                                    fill=(0, 0, 0, 200), font=font_sub)
    sub_shadow = sub_shadow.filter(ImageFilter.GaussianBlur(radius=2))
    bg.alpha_composite(sub_shadow, (cx - (sw + 20) // 2, sub_y - (sh + 20) // 2))
    # Main subtitle text
    sub_main = Image.new("RGBA", (sw + 20, sh + 20), (0, 0, 0, 0))
    ImageDraw.Draw(sub_main).text((10 - sb[0], 10 - sb[1]), sub_text,
                                  fill=(230, 190, 100, 240), font=font_sub)
    bg.alpha_composite(sub_main, (cx - (sw + 20) // 2, sub_y - (sh + 20) // 2))

    # Save
    bg.convert("RGB").save(OUT, "PNG", optimize=True)
    print(f"Saved: {OUT} ({os.path.getsize(OUT)} bytes)")


if __name__ == "__main__":
    main()
