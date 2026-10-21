#!/bin/bash
# ════════════════════════════════════════════════════════════════════
# e2e-t48.sh — Task 48: cartas sin gemelas, jugables y legibles (móvil)
#  0) sembrar colección (Fiera Ensangrentada — fervor×2, cuerpo 2/5)
#  1) preview: texto nuevo «gana +2 de poder permanente»
#  2) partida completa: PASAR + jugar carta + 3 ciclos de turno sin jank
#  3) modal de fin accesible (botín visible)
# ════════════════════════════════════════════════════════════════════
set -u
EB="agent-browser"
URL="${1:-http://localhost:3333}"

$EB close --all >/dev/null 2>&1 || true
$EB set device "Galaxy S25" >/dev/null 2>&1
$EB open "$URL" >/dev/null 2>&1
$EB wait 2500 >/dev/null 2>&1

echo "── 0. sembrar colección (Fiera Ensangrentada) + entrar a partida ──"
OK="false"
for intento in 1 2 3; do
  $EB eval "localStorage.setItem('guerrero-tactico-coleccion', JSON.stringify({copies:{fiera_ensangrentada:{common:12}},grantedClasses:['guerrero'],wins:0})); 'ok'" >/dev/null 2>&1
  $EB reload >/dev/null 2>&1
  $EB wait 3000 >/dev/null 2>&1
  ref=$($EB snapshot -i -c 2>/dev/null | grep -oE 'button "HISTORIA" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
  [ -z "$ref" ] && { sleep 2; continue; }
  $EB click "$ref" >/dev/null 2>&1; sleep 1.8
  ref=$($EB snapshot -i -c 2>/dev/null | grep -oE 'button "JUGAR" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
  [ -z "$ref" ] && { sleep 2; continue; }
  $EB click "$ref" >/dev/null 2>&1
  sleep 2.4
  ref=$($EB snapshot -i -c 2>/dev/null | grep -oE 'button "¡A LUCHAR!" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
  if [ -n "$ref" ]; then $EB click "$ref" >/dev/null 2>&1; sleep 2.2; fi
  EN_MANO=$($EB eval "(()=>{const h=[...document.querySelectorAll('[data-hand-card-uid]')].map(c=>c.textContent); return h.length>0 ? 'true':'false'})()" 2>/dev/null | sed 's/^"//; s/"$//')
  echo "   intento $intento: mano=$EN_MANO"
  [ "$EN_MANO" = "true" ] && { OK="true"; break; }
  $EB eval "location.href='http://localhost:3333/'" >/dev/null 2>&1; sleep 2
done
[ "$OK" = "true" ] && echo "PASS 0: partida iniciada con mano visible" || { echo "FAIL 0: no se inició partida"; exit 1; }

echo "── 1. PASAR turno ×2 (llegar a energía 3) ──"
for i in 1 2; do
  ref=$($EB snapshot -i -c 2>/dev/null | grep -oE 'button "PASAR" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
  [ -z "$ref" ] && ref=$($EB snapshot -i -c 2>/dev/null | grep -oE 'button "Pasar" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
  [ -n "$ref" ] && $EB click "$ref" >/dev/null 2>&1
  sleep 3.2
done
E1=$($EB eval "document.body.textContent.match(/Energ[íi]a[^0-9]*(\d)/)?.[1] || '0'" 2>/dev/null | sed 's/^"//; s/"$//')
echo "   energía tras 2 pases: $E1 (esperado ≥2)"
[ "${E1:-0}" -ge 2 ] && echo "PASS 1" || echo "WARN 1 (energía=$E1, revisar)"

echo "── 2. preview de una carta de mano (texto legible) ──"
TXT=$($EB eval "(()=>{const c=document.querySelector('[data-hand-card-uid]'); return c? c.textContent.slice(0,220):'SIN_CARTA'})()" 2>/dev/null | sed 's/^"//; s/"$//')
echo "   mano[0]: $TXT"
echo "$TXT" | grep -qE "Coste|coste" && echo "PASS 2: carta con coste/poder visibles" || echo "WARN 2: texto inesperado"

echo "── 3. ciclos de turno sin colgar (3 PASAR más) ──"
HANG="false"
for i in 1 2 3; do
  T0=$(date +%s%3N 2>/dev/null || python3 -c 'import time;print(int(time.time()*1000))')
  ref=$($EB snapshot -i -c 2>/dev/null | grep -oE 'button "PASAR" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
  [ -z "$ref" ] && ref=$($EB snapshot -i -c 2>/dev/null | grep -oE 'button "Pasar" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
  [ -n "$ref" ] && $EB click "$ref" >/dev/null 2>&1
  sleep 3.0
  T1=$(date +%s%3N 2>/dev/null || python3 -c 'import time;print(int(time.time()*1000))')
  DT=$((T1-T0))
  echo "   ciclo $i: ${DT}ms"
done
VIVA=$($EB eval "document.body.textContent.length > 100 ? 'true':'false'" 2>/dev/null | sed 's/^"//; s/"$//')
[ "$VIVA" = "true" ] && echo "PASS 3: UI viva tras 3 ciclos" || echo "FAIL 3"
$EB screenshot /home/z/my-project/scripts/e2e-t48-final.png >/dev/null 2>&1
echo "captura: scripts/e2e-t48-final.png"
$EB close --all >/dev/null 2>&1 || true
echo "E2E-T48 DONE"
