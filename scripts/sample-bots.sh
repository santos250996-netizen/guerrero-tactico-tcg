#!/bin/bash
# Muestreo del sorteo de bot en modo historia: N partidas, leyendo el nombre
# del rival en cada una. Refs frescos en cada paso y verificación de salida.
AB="agent-browser"
N=${1:-10}
for i in $(seq 1 "$N"); do
  # 1) entrar a HISTORIA desde el menú principal
  ref=$($AB snapshot -c 2>/dev/null | rg -o 'button "HISTORIA" \[ref=(e[0-9]+)\]' -r '$1' | head -1)
  [ -z "$ref" ] && { echo "tirada $i: ERROR no HISTORIA"; $AB dialog accept >/dev/null 2>&1; sleep 1; continue; }
  $AB click "$ref" >/dev/null 2>&1; sleep 1
  # 2) BATALLAR
  ref=$($AB snapshot -c 2>/dev/null | rg -o 'button "BATALLAR" \[ref=(e[0-9]+)\]' -r '$1' | head -1)
  [ -z "$ref" ] && { echo "tirada $i: ERROR no BATALLAR"; continue; }
  $AB click "$ref" >/dev/null 2>&1; sleep 1.6
  # 3) leer rival
  name=$($AB snapshot -c 2>/dev/null | rg -io 'thralgrim, [a-z áéíóúñ]*|selene, [a-z áéíóúñ]*|umbris, [a-z áéíóúñ]*' | head -1)
  # 4) salir
  ref=$($AB snapshot -c 2>/dev/null | rg -o 'button "Salir al menú" \[ref=(e[0-9]+)\]' -r '$1' | head -1)
  if [ -n "$ref" ]; then
    $AB click "$ref" >/dev/null 2>&1; sleep 0.8
    $AB dialog accept >/dev/null 2>&1; sleep 1
  fi
  echo "tirada $i: ${name:-ERROR sin nombre}"
done
