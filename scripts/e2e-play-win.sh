#!/bin/bash
# Juega para GANAR: cada turno propio juega cartas vía preview ("Jugar en")
# hasta quedarse sin energía, luego pasa. Repite hasta el modal final.
set -u
cd /home/z/my-project

enabled_lanes () {
  # Botones "Jugar en X" HABILITADOS del preview actual
  agent-browser snapshot -i -c 2>/dev/null | grep -oE 'button "(ARMAS|PROTECCIÓN|FURIA)" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1
}

play_cards () {
  for k in 1 2 3; do
    # ¿Está PASAR habilitado (mi turno)? Si no, salgo
    passref=$(agent-browser snapshot -i -c 2>/dev/null | grep -oE 'button "PASAR" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
    [ -z "$passref" ] && return 0
    # Toca la última carta de la mano (más cara)
    handcard=$(agent-browser snapshot -i -c 2>/dev/null | grep -E '^- button "[^"]+ [0-9]+ [0-9]+ ' | grep -oE '@?e[0-9]+' | tail -1)
    [ -z "$handcard" ] && return 0
    agent-browser click "$handcard" >/dev/null 2>&1
    sleep 0.9
    lane=$(enabled_lanes)
    if [ -n "$lane" ]; then
      agent-browser click "$lane" >/dev/null 2>&1
      sleep 1.3
    else
      agent-browser press Escape >/dev/null 2>&1
      sleep 0.5
      return 0
    fi
  done
}

for turn in $(seq 1 14); do
  if agent-browser snapshot -c 2>/dev/null | grep -qE "Reintentar Escalón|Continuar Campaña|Siguiente Escalón|Nueva Campaña"; then
    echo "== MODAL FINAL (turno $turn)"; break
  fi
  play_cards
  if agent-browser snapshot -c 2>/dev/null | grep -qE "Reintentar Escalón|Continuar Campaña|Siguiente Escalón|Nueva Campaña"; then break; fi
  ref=$(agent-browser snapshot -i -c 2>/dev/null | grep -oE 'button "PASAR" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
  if [ -n "$ref" ]; then agent-browser click "$ref" >/dev/null 2>&1; sleep 2.3; else sleep 1.5; fi
done

agent-browser wait 2500 >/dev/null 2>&1
agent-browser screenshot scripts/e2e-modal-victory.png >/dev/null 2>&1
echo "== SNAPSHOT FINAL =="
agent-browser snapshot -i -c 2>/dev/null | tail -18
