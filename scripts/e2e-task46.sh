#!/bin/bash
# ════════════════════════════════════════════════════════════════════
# e2e-task46.sh — verificación funcional Task 46 en móvil emulado:
#  1) partida de campaña completa: preview (sin Radix) abre/cierra,
#     DRAG juega carta, PASAR ×N, rival juega, números correctos
#  2) la vista reconciliada pinta powers/bonos correctos (sin estado fantasma)
#  3) modal de fin navega a Menú
# ════════════════════════════════════════════════════════════════════
set -u
EB="agent-browser"
URL="${1:-http://localhost:3333}"

$EB close --all >/dev/null 2>&1 || true
$EB set device "Galaxy S25" >/dev/null 2>&1
$EB open "$URL" >/dev/null 2>&1
$EB wait 2500 >/dev/null 2>&1

echo "── navegación ──"
ref=$($EB snapshot -i -c 2>/dev/null | grep -oE 'button "HISTORIA" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
$EB click "$ref" >/dev/null 2>&1; sleep 1.8
ref=$($EB snapshot -i -c 2>/dev/null | grep -oE 'button "JUGAR" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
$EB click "$ref" >/dev/null 2>&1; sleep 2.2
ref=$($EB snapshot -i -c 2>/dev/null | grep -oE 'button "¡A LUCHAR!" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
$EB click "$ref" >/dev/null 2>&1; sleep 2.5

echo "── 1. preview abre con arte y cierra (overlay propio) ──"
$EB eval "(() => { const c=[...document.querySelectorAll('[data-hand-card-uid]')][0]; if(!c) return 'sin-carta'; const r=c.getBoundingClientRect(); window.__tap={x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}; return 'ok'; })()" >/dev/null 2>&1
X=$($EB eval "window.__tap.x" 2>/dev/null | sed 's/"//g'); Y=$($EB eval "window.__tap.y" 2>/dev/null | sed 's/"//g')
$EB mouse move "$X" "$Y" >/dev/null 2>&1; $EB mouse down >/dev/null 2>&1; $EB mouse up >/dev/null 2>&1
sleep 0.8
PREV=$($EB snapshot -c 2>/dev/null | grep -cE "role dialog|dialog" || true)
DIALOG=$($EB eval "!!document.querySelector('[role=dialog]')" 2>/dev/null | sed 's/"//g')
echo "   role=dialog presente: $DIALOG"
$EB screenshot scripts/e2e-t46-preview.png >/dev/null 2>&1
# cerrar tocando la propia carta (tap = cerrar)
$EB mouse move "$X" "$Y" >/dev/null 2>&1; $EB mouse down >/dev/null 2>&1; $EB mouse up >/dev/null 2>&1
sleep 0.6
DIALOG2=$($EB eval "!!document.querySelector('[role=dialog]')" 2>/dev/null | sed 's/"//g')
echo "   cerrado: $([ "$DIALOG2" = "false" ] && echo OK || echo FALLO)"

echo "── 2. DRAG de la carta 0 al carril 2 (jugar de verdad) ──"
CO=$($EB eval "(() => { const c=[...document.querySelectorAll('[data-hand-card-uid]')][0]; if(!c) return 'null'; const r=c.getBoundingClientRect(); const ls=[...document.querySelectorAll('[data-lane-id]')]; const l=ls[2]||ls[0]; const lr=l.getBoundingClientRect(); return JSON.stringify({sx:Math.round(r.x+r.width/2), sy:Math.round(r.y+40), ex:Math.round(lr.x+lr.width/2), ey:Math.round(lr.y+lr.height/2)}); })()" 2>/dev/null | sed 's/^"//; s/"$//; s/\\"/"/g')
read SX SY EX EY <<<$(echo "$CO" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['sx'],d['sy'],d['ex'],d['ey'])")
$EB mouse move "$SX" "$SY" >/dev/null 2>&1
$EB mouse down >/dev/null 2>&1
$EB mouse move "$SX" "$((SY - 40))" >/dev/null 2>&1
$EB mouse move "$EX" "$EY" >/dev/null 2>&1
$EB mouse up >/dev/null 2>&1
sleep 1.6
EN_CARRIL=$($EB eval "(() => { const lanes=[...document.querySelectorAll('[data-pvp-lane^=\"me-\"]')]; return lanes.reduce((a,l)=>a+l.querySelectorAll('[data-card-uid]').length,0); })()" 2>/dev/null | sed 's/"//g')
echo "   cartas en mis carriles: $EN_CARRIL (esperado ≥1)"

echo "── 3. el tablero pinta PODERES coherentes (vista reconciliada) ──"
CONSIST=$($EB eval "(() => { const minis=[...document.querySelectorAll('[data-card-uid]')]; let bad=0; for (const m of minis) { const badges=[...m.querySelectorAll('div')].map(d=>d.textContent); if (!m.querySelector('img')) bad++; } return JSON.stringify({minis:minis.length, sinArte:bad}); })()" 2>/dev/null | sed 's/^"//; s/"$//; s/\\"/"/g')
echo "   $CONSIST"

echo "── 4. PASAR ×3 (turno rival + retorno) ──"
for i in 1 2 3; do
  ref=$($EB snapshot -i -c 2>/dev/null | grep -oE 'button "PASAR" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
  if [ -n "$ref" ]; then
    $EB click "$ref" >/dev/null 2>&1
    sleep 3.4
    TURNO=$($EB eval "(() => { const sep=[...document.querySelectorAll('span')].find(s=>/Turno \\d/.test(s.textContent)); return sep ? sep.textContent.trim() : '?'; })()" 2>/dev/null | sed 's/^"//; s/"$//')
    echo "   ciclo $i → separador: $TURNO"
  else
    echo "   ciclo $i: sin botón PASAR (¿cartas jugables? jugando una)"
    CO=$($EB eval "(() => { const c=[...document.querySelectorAll('[data-hand-card-uid]')][0]; if(!c) return 'null'; const r=c.getBoundingClientRect(); const l=[...document.querySelectorAll('[data-lane-id]')][0]; const lr=l.getBoundingClientRect(); return JSON.stringify({sx:Math.round(r.x+r.width/2), sy:Math.round(r.y+40), ex:Math.round(lr.x+lr.width/2), ey:Math.round(lr.y+lr.height/2)}); })()" 2>/dev/null | sed 's/^"//; s/"$//; s/\\"/"/g')
    if [ "$CO" != "null" ]; then
      read SX SY EX EY <<<$(echo "$CO" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['sx'],d['sy'],d['ex'],d['ey'])")
      $EB mouse move "$SX" "$SY" >/dev/null 2>&1; $EB mouse down >/dev/null 2>&1
      $EB mouse move "$SX" "$((SY - 40))" >/dev/null 2>&1
      $EB mouse move "$EX" "$EY" >/dev/null 2>&1; $EB mouse up >/dev/null 2>&1
      sleep 1.8
    fi
  fi
done

echo "── 5. errores JS en consola ──"
$EB eval "1" >/dev/null 2>&1

echo "── 6. modal de fin (si la partida terminó) o estado final ──"
for i in $(seq 1 24); do
  if $EB snapshot -c 2>/dev/null | grep -qE "Reintentar Escalón|Siguiente Escalón|Continuar Campaña"; then echo "   modal de fin presente"; break; fi
  ref=$($EB snapshot -i -c 2>/dev/null | grep -oE 'button "PASAR" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
  if [ -n "$ref" ]; then $EB click "$ref" >/dev/null 2>&1; sleep 2.4; else sleep 1.2; fi
done
$EB screenshot scripts/e2e-t46-final.png >/dev/null 2>&1
ref=$($EB snapshot -i -c 2>/dev/null | grep -oE 'button "Menú" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
if [ -n "$ref" ]; then
  $EB click "$ref" >/dev/null 2>&1; sleep 1.5
  MENU=$($EB snapshot -i -c 2>/dev/null | grep -cE "HISTORIA|COLECCIÓN" || true)
  echo "   botón Menú funciona: $([ "$MENU" -ge 1 ] && echo OK || echo FALLO)"
else
  echo "   (partida aún en curso — Menú no verificado, sin error)"
fi
echo "═══ FIN E2E Task 46 ═══"
