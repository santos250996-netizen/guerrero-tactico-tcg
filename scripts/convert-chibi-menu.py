#!/usr/bin/env python3
"""Convierte assets-src/chibi-menu/*.png → public/menu/*.webp y verifica.

- lanes + main-bg + profile-bg-raw: 768x1344 webp q85
- game-icon-1024.png → public/menu/game-icon-1024.png (para make-icon-transparent.py)
- tras make-icon-transparent.py: game-icon-transparent.png → .webp
Idempotente. Salida: resumen + fallos.
"""
import subprocess
import sys
from pathlib import Path

from PIL import Image

ROOT = Path("/home/z/my-project")
STAGE = ROOT / "assets-src/chibi-menu"
OUT = ROOT / "public/menu"
LANE_SIZE = (768, 1344)
ICON_SIZE = (1024, 1024)

LANES = [
    "armas", "proteccion", "furia", "arcana", "fuego", "hielo", "veneno",
    "combate", "sigilo", "raiz", "flor", "esporas", "puente", "bodega",
    "artilleria", "taller", "maquinaria", "chispa",
]


def webp_encode(src: Path, dst: Path, size: tuple[int, int] | None) -> bool:
    if not src.exists() or src.stat().st_size == 0:
        return False
    im = Image.open(src).convert("RGB")
    if size and im.size != size:
        im = im.resize(size, Image.LANCZOS)
    im.save(dst, "WEBP", quality=85, method=6)
    return True


def nonblank(im: Image.Image) -> float:
    h = im.convert("L").histogram()
    return 1 - h[255] / sum(h)


def main() -> None:
    fails = []
    done = []

    # icono fuente PNG (para el script de transparencia existente)
    icon_png = STAGE / "game-icon-1024.png"
    if icon_png.exists():
        subprocess.run(["cp", str(icon_png), str(OUT / "game-icon-1024.png")], check=False)
        # máscara circular del pipeline previo (game-icon-1024 → transparent)
        subprocess.run(
            ["python3", str(ROOT / "scripts/make-icon-transparent.py")], check=False
        )
        trans_pub_png = OUT / "game-icon-transparent.png"
        if trans_pub_png.exists():
            Image.open(trans_pub_png).convert("RGBA").save(
                OUT / "game-icon-transparent.webp", "WEBP", quality=90, method=6
            )
            done.append("game-icon-transparent.webp")

    # lanes + bg
    for lane in LANES:
        src = STAGE / f"lane-{lane}.png"
        dst = OUT / f"lane-{lane}.webp"
        if webp_encode(src, dst, LANE_SIZE):
            done.append(f"lane-{lane}.webp")
    for bid in ("main-bg", "profile-bg-raw"):
        if webp_encode(STAGE / f"{bid}.png", OUT / f"{bid}.webp", LANE_SIZE):
            done.append(f"{bid}.webp")

    # verificación
    bad = []
    for lane in LANES:
        p = OUT / f"lane-{lane}.webp"
        if not p.exists():
            fails.append(f"lane-{lane}")
            continue
        im = Image.open(p)
        if im.size != LANE_SIZE or nonblank(im) < 0.05:
            bad.append(lane)
    for bid in ("main-bg", "profile-bg-raw"):
        p = OUT / f"{bid}.webp"
        if not p.exists() or nonblank(Image.open(p)) < 0.05:
            fails.append(bid)
    if not (OUT / "game-icon-transparent.webp").exists():
        fails.append("game-icon-transparent")

    print(f"convertidos ahora: {len(done)} → {', '.join(done[:8])}{'...' if len(done) > 8 else ''}")
    print(f"verificación: faltan={len(fails)} · corruptos={bad if bad else 0}")
    if fails:
        print("FALTAN:", ",".join(fails))
    if bad:
        print("CORRUPTOS:", ",".join(bad))
    sys.exit(1 if (fails or bad) else 0)


if __name__ == "__main__":
    main()
