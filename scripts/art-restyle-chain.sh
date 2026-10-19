#!/bin/bash
# Cadena de arte tanda 29: v6 (12 nuevas) → v5 FORCE (36 mazo II) → v7 FORCE (36 espejo) → downscale
cd /home/z/my-project
echo "=== v6 (nuevas de jefe) ==="
FORCE=1 bun scripts/gen-card-art-v6.mjs
echo "=== v5 FORCE (mazo II reestilizado) ==="
FORCE=1 bun scripts/gen-card-art-v5.mjs
echo "=== v7 FORCE (mazos espejo reestilizados) ==="
FORCE=1 bun scripts/gen-card-art-v7.mjs
echo "=== downscale a 432x576 ==="
python3 scripts/fix-card-art-resolution.py
echo "=== ARTE COMPLETO ==="

echo "=== PNG → WebP (paso final: la APK solo lleva webp) ==="
python3 scripts/png-to-webp.py
