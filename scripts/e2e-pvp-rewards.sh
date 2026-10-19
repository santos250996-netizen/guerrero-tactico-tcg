#!/bin/bash
# E2E: juega una partida PvP completa (solo pases) entre las 2 pestañas
# abiertas (t1 = anfitrión, t2 = invitado) hasta que aparezca el game-over.
set -u
cd /home/z/my-project

pass_if_available () {
  local tab="$1"
  agent-browser tab "$tab" >/dev/null 2>&1
  local btn
  btn=$(agent-browser snapshot -i -c 2>/dev/null | grep -oE 'button "PASAR" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
  if [ -n "$btn" ]; then
    agent-browser click "$btn" >/dev/null 2>&1 && echo "  [$tab] pase OK"
    sleep 2.6
  fi
}

ended () {
  agent-browser snapshot -c 2>/dev/null | grep -qiE "Carriles ganados" && return 0
  return 1
}

for i in $(seq 1 30); do
  if ended; then echo "== PARTIDA TERMINADA (iteración $i)"; break; fi
  echo "iter $i"
  pass_if_available t1
  pass_if_available t2
done

# Estado final en t1
agent-browser tab t1 >/dev/null 2>&1
agent-browser wait 1800 >/dev/null 2>&1
echo "== SNAPSHOT FINAL t1 =="
agent-browser snapshot -c 2>/dev/null | grep -iE "Victoria|Derrota|Empate|Botín|carta|XP|Revancha" | head -12
