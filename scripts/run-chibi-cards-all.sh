#!/bin/bash
# Lote completo de arte chibi de cartas: relanza el runner en rondas hasta
# completar los 192 PNG (el runner salta lo ya generado).
cd /home/z/my-project
for round in $(seq 1 12); do
  echo "═══ ronda $round · $(date +%H:%M:%S)"
  bun scripts/gen-chibi-cards.mjs >> scripts/chibi-art-batch.log 2>&1
  left=$(ls assets-src/chibi-cards/*.png 2>/dev/null | wc -l)
  echo "fin ronda $round · pngs=$left/192"
  if [ "$left" -ge 192 ]; then echo "✓ COMPLETO"; exit 0; fi
  sleep 15
done
echo "✗ agotadas 12 rondas con pngs=$left/192"
exit 1
