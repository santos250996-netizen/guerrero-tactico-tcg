#!/bin/bash
# Drag nativo (mouse real de Playwright) de una carta de la mano a un carril.
# Uso: e2e-drag.sh <indiceCarta> <indiceCarril 0-2>
set -e
CI=${1:-1}
LI=${2:-2}

CO=$(agent-browser eval "(() => { const c=[...document.querySelectorAll('[data-hand-card-uid]')][$CI].getBoundingClientRect(); const l=[...document.querySelectorAll('[data-lane-id]')][$LI].getBoundingClientRect(); return JSON.stringify({sx:Math.round(c.x+c.width/2), sy:Math.round(c.y+40), ex:Math.round(l.x+l.width/2), ey:Math.round(l.y+l.height/2)}); })()" 2>/dev/null | grep -o '{.*}' | sed 's/\\"/"/g')
echo "coords: $CO"
SX=$(echo "$CO" | python3 -c "import json,sys; print(json.load(sys.stdin)['sx'])")
SY=$(echo "$CO" | python3 -c "import json,sys; print(json.load(sys.stdin)['sy'])")
EX=$(echo "$CO" | python3 -c "import json,sys; print(json.load(sys.stdin)['ex'])")
EY=$(echo "$CO" | python3 -c "import json,sys; print(json.load(sys.stdin)['ey'])")

agent-browser mouse move "$SX" "$SY"
agent-browser mouse down
agent-browser mouse move "$SX" "$((SY - 20))"
agent-browser mouse move "$(( (SX + EX) / 2 ))" "$(( (SY + EY) / 2 ))"
agent-browser mouse move "$EX" "$EY"
agent-browser mouse up
sleep 1.6
agent-browser eval "(() => JSON.stringify({enCarril: [...document.querySelectorAll('[data-pvp-lane^=\"me-\"] [data-card-uid]')].length}))()"
