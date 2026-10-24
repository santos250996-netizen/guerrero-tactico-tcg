#!/bin/bash
# Runner paciente para los 9 fondos de carril (API de imágenes con ventana 429 larga).
# El generador salta los webp que YA existen → cada ronda solo reintenta los faltantes.
# Se detiene en cuanto una ronda completa sale OK (todas las 9 generadas).
cd /home/z/my-project
for i in $(seq 1 20); do
  echo "═══ RONDA $i · $(date +%H:%M:%S) ═══"
  bun scripts/gen-lane-bgs-western-v3.mjs && { echo "✓ TODOS GENERADOS en ronda $i"; exit 0; }
  echo "…ronda $i incompleta, esperando 4 min antes de reintentar"
  sleep 20
done
echo "✗ agotadas 20 rondas sin completar los 9 fondos"
exit 1
