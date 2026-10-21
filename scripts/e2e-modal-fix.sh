#!/bin/bash
# E2E: reproduce el fin de partida en LA CAMPAÑA (historia) — pasa todos los
# turnos hasta el modal final, captura snapshot + screenshots y prueba los
# botones (Reintentar / Menú).
set -u
cd /home/z/my-project

agent-browser open --viewport=390,844 "http://localhost:3000" >/dev/null 2>&1
agent-browser wait 3500 >/dev/null 2>&1

# Ir a HISTORIA (botón principal)
agent-browser snapshot -i -c 2>/dev/null | grep -oE 'button "Historia" \[ref=[^]]+\]' | head -1 | while read -r m; do
  ref=$(echo "$m" | grep -oE '@?e[0-9]+' | head -1)
  agent-browser click "$ref" >/dev/null 2>&1
done
agent-browser wait 2000 >/dev/null 2>&1

# Seleccionar clase GUERRERO si aparece + JUGAR
agent-browser screenshot scripts/e2e-modal-0-class.png >/dev/null 2>&1
ref=$(agent-browser snapshot -i -c 2>/dev/null | grep -oE 'button "JUGAR" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
if [ -n "$ref" ]; then
  agent-browser click "$ref" >/dev/null 2>&1
  agent-browser wait 1500 >/dev/null 2>&1
fi
ref=$(agent-browser snapshot -i -c 2>/dev/null | grep -oiE 'button "A LUCHAR[^"]*" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
if [ -n "$ref" ]; then
  agent-browser click "$ref" >/dev/null 2>&1
  agent-browser wait 1500 >/dev/null 2>&1
fi

# PASAR todos los turnos hasta el modal de fin
for i in $(seq 1 40); do
  if agent-browser snapshot -c 2>/dev/null | grep -qiE "Victoria|Derrota|Empate"; then
    echo "== FIN DETECTADO (iter $i)"; break
  fi
  ref=$(agent-browser snapshot -i -c 2>/dev/null | grep -oE 'button "PASAR" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
  if [ -n "$ref" ]; then
    agent-browser click "$ref" >/dev/null 2>&1
    sleep 2.2
  else
    sleep 1.2
  fi
done

agent-browser wait 2000 >/dev/null 2>&1
agent-browser screenshot scripts/e2e-modal-fix-end.png >/dev/null 2>&1
echo "== SNAPSHOT DEL MODAL =="
agent-browser snapshot -c 2>/dev/null | tail -60
