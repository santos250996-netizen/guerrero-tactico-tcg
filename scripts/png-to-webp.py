#!/usr/bin/env python3
"""PNG → WebP para todos los assets del juego (APK mucho más ligera).

Qué hace (idempotente, re-ejecutable):
1. public/cards/ — SOLO el arte de las cartas vivas del catálogo (IDs extraídos
   de src/lib/game/**.ts). Todo PNG huérfano (cartas renombradas/borradas en
   auditorías anti-duplicados) se ELIMINA: era peso muerto en la APK.
   Conversión: q=80, method=6 (432×576 paleta ≈ 150KB → ~30KB).
2. public/menu/ — fondos a WebP con calidad por tipo:
   lane-* q78 · main-bg q82 · profile-bg-raw q80 · game-icon-transparent q88 (alfa).
   El PNG original se borra tras verificar que el WebP existe y pesa > 0.
3. Los SOURCES de herramientas (game-icon-1024, game-icon-transparent,
   main-bg-raw) se copian a assets-src/ en PNG: alimentan a los generadores
   (scale-android-icons.py, gen-*) pero NO deben viajar dentro de la APK.

Uso: python3 scripts/png-to-webp.py
Es el PASO FINAL de la cadena de arte (art-restyle-chain.sh lo llama al final).
"""
import glob
import os
import re
import shutil
import sys

from PIL import Image

ROOT = "/home/z/my-project"
CARDS = os.path.join(ROOT, "public", "cards")
MENU = os.path.join(ROOT, "public", "menu")
ASSETS_SRC = os.path.join(ROOT, "assets-src")

# Sources de herramientas que se preservan en PNG fuera de public/
TOOL_SOURCES = ("game-icon-1024.png", "game-icon-transparent.png", "main-bg-raw.png")


def live_card_ids() -> set[str]:
    """IDs de cartas vivas. Los preset_* son DECK_PRESETS (mazos), no cartas."""
    live: set[str] = set()
    for f in glob.glob(f"{ROOT}/src/lib/game/**/*.ts", recursive=True):
        with open(f, encoding="utf-8") as fh:
            live |= set(re.findall(r'id:\s*"([\w\-]+)"', fh.read()))
    return {i for i in live if not i.startswith("preset_")}


def menu_quality(name: str) -> int:
    for prefix, q in (("lane-", 78), ("main-bg.", 82), ("profile-bg-raw.", 80),
                      ("game-icon-transparent.", 88)):
        if name.startswith(prefix):
            return q
    return 80


def convert(path: str, quality: int) -> tuple[int, int]:
    """PNG → WebP. Devuelve (bytes_antes, bytes_despues). Borra el PNG."""
    out = path[:-4] + ".webp"
    im = Image.open(path)
    if im.mode == "P":
        im = im.convert("RGBA" if im.info.get("transparency") is not None else "RGB")
    elif im.mode in ("RGBA", "LA"):
        im = im.convert("RGBA")
    else:
        im = im.convert("RGB")
    im.save(out, "WEBP", quality=quality, method=6)
    if not os.path.exists(out) or os.path.getsize(out) == 0:
        raise RuntimeError(f"WebP vacío/no generado: {out}")
    before, after = os.path.getsize(path), os.path.getsize(out)
    os.remove(path)
    return before, after


def main() -> int:
    live = live_card_ids()
    if not live:
        print("ERROR: no se extrajeron IDs del catálogo — aborto sin tocar nada")
        return 1

    # ── 1. Sources de herramientas → assets-src/ (fuera de la APK) ──
    os.makedirs(ASSETS_SRC, exist_ok=True)
    for name in TOOL_SOURCES:
        src = os.path.join(MENU, name)
        dst = os.path.join(ASSETS_SRC, name)
        if os.path.exists(src) and not os.path.exists(dst):
            shutil.copy2(src, dst)
            print(f"  source preservado: assets-src/{name}")

    total_before = total_after = 0
    orphan_bytes = 0

    # ── 2. Cartas: borrar huérfanos + convertir vivas ──
    for png in sorted(glob.glob(f"{CARDS}/*.png")):
        stem = os.path.splitext(os.path.basename(png))[0]
        if stem not in live:
            orphan_bytes += os.path.getsize(png)
            os.remove(png)
            continue
        b, a = convert(png, quality=80)
        total_before += b
        total_after += a

    # ── 3. Menú: convertir lo restante; los sources de herramientas SOLO viven
    #        en assets-src/ (si quedara alguno aquí, se borra tras el copy) ──
    for png in sorted(glob.glob(f"{MENU}/*.png")):
        if os.path.basename(png) in TOOL_SOURCES:
            os.remove(png)  # ya preservado en assets-src/ — no viaja en la APK
            continue
        b, a = convert(png, quality=menu_quality(os.path.basename(png)))
        total_before += b
        total_after += a

    # ── Reporte ──
    mb = lambda n: f"{n / 1024 / 1024:.1f} MB"
    print(f"\nHuérfanos eliminados (no estaban en el catálogo de 84): {mb(orphan_bytes)}")
    print(f"Arte convertido: {mb(total_before)} → {mb(total_after)} "
          f"({100 - 100 * total_after // max(total_before, 1)}% menos)")
    rest_png = glob.glob(f"{ROOT}/public/**/*.png", recursive=True)
    print(f"PNGs restantes en public/: {len(rest_png)} {'OK' if not rest_png else rest_png}")
    print(f"public/ total: {mb(sum(os.path.getsize(p) for p in glob.glob(f'{ROOT}/public/**/*', recursive=True) if os.path.isfile(p)))}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
