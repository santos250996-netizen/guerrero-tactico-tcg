#!/bin/bash
# Runner ROBUSTO: 1 proceso bun POR CARRIL (aislado — si bun muere/silencio,
# solo se pierde ese intento). Reintenta en rondas hasta completar los 9.
cd /home/z/my-project
LANES="raiz flor esporas puente bodega artilleria taller maquinaria chispa"
for round in $(seq 1 8); do
  pending=()
  for lane in $LANES; do
    [ -f "public/menu/lane-$lane.webp" ] || pending+=("$lane")
  done
  if [ ${#pending[@]} -eq 0 ]; then echo "✓ TODOS GENERADOS (ronda $round)"; exit 0; fi
  echo "═══ ronda $round · faltan: ${pending[*]} · $(date +%H:%M:%S)"
  for lane in "${pending[@]}"; do
    ONLY=$lane timeout 200 bun scripts/gen-lane-bgs-western-v3.mjs >> scripts/lane-bgs-indiv.log 2>&1
    if [ -f "public/menu/lane-$lane.webp" ]; then
      echo "  ✓ lane-$lane"
    else
      echo "  ✗ lane-$lane (ver scripts/lane-bgs-indiv.log)"
      sleep 8
    fi
    sleep 3
  done
done
echo "✗ agotadas 8 rondas"; exit 1
