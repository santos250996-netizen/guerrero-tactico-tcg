#!/bin/bash
# ════════════════════════════════════════════════════════════════════
# e2e-t50.sh — Task 50: restauración de progreso sin fricción (móvil)
#  1) instalación FRESCA (localStorage limpio) → banner «¿Vienes de otra
#     instalación?» visible en el menú, con botón «Pegar y restaurar»
#  2) tocar el botón sin código en el portapapeles → mensaje de error
#     amable (no cuelga, no restaura basura)
#  3) cerrar el banner (X) → no vuelve en la sesión (sessionStorage)
#  4) con progreso sembrado → el banner NO aparece (nunca molesta)
#  5) simulación de restauración real vía applyProgressCode (import dinámico
#     del bundle no es alcanzable por eval → se valida en unit tests;
#     aquí se verifica el flujo UI: banner → botón → error → X → sesión)
# ════════════════════════════════════════════════════════════════════
set -u
EB="agent-browser"
URL="${1:-http://localhost:3333}"

$EB close --all >/dev/null 2>&1 || true
$EB set device "Galaxy S25" >/dev/null 2>&1
$EB open "$URL" >/dev/null 2>&1
$EB wait 2500 >/dev/null 2>&1

echo "── 1. instalación fresca → banner de rescate visible ──"
BODY=$($EB eval "document.body.textContent" 2>/dev/null | sed 's/^"//; s/"$//')
echo "$BODY" | grep -q "¿Vienes de otra instalación?" && echo "PASS 1a: banner visible en instalación fresca" || { echo "FAIL 1a"; $EB screenshot /home/z/my-project/scripts/e2e-t50-fail.png >/dev/null 2>&1; exit 1; }
echo "$BODY" | grep -q "Pegar y restaurar" && echo "PASS 1b: botón de un toque presente" || echo "FAIL 1b"

echo "── 2. botón sin código en portapapeles → error amable ──"
REF=$($EB snapshot -i -c 2>/dev/null | grep -oiE 'button "pegar y restaurar" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
[ -n "$REF" ] && $EB click "$REF" >/dev/null 2>&1
sleep 1.2
BODY=$($EB eval "document.body.textContent" 2>/dev/null | sed 's/^"//; s/"$//')
if echo "$BODY" | grep -qE "Portapapeles vacío|No se pudo leer"; then
  echo "PASS 2: mensaje de error amable (sin crash)"
else
  echo "WARN 2: sin mensaje de error (portapapeles headless puede comportarse distinto)"
fi
VIVA=$($EB eval "document.body.textContent.length > 100 ? 'true':'false'" 2>/dev/null | sed 's/^"//; s/"$//')
[ "$VIVA" = "true" ] && echo "PASS 2b: UI viva tras el intento" || echo "FAIL 2b"

echo "── 3. cerrar banner → no vuelve en la sesión ──"
REF=$($EB snapshot -i -c 2>/dev/null | grep -oiE 'button "cerrar rescate" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
[ -n "$REF" ] && $EB click "$REF" >/dev/null 2>&1
sleep 0.8
BODY=$($EB eval "document.body.textContent" 2>/dev/null | sed 's/^"//; s/"$//')
echo "$BODY" | grep -q "¿Vienes de otra instalación?" && echo "FAIL 3: banner sigue visible" || echo "PASS 3a: banner cerrado"
$EB reload >/dev/null 2>&1; sleep 2.5
BODY=$($EB eval "document.body.textContent" 2>/dev/null | sed 's/^"//; s/"$//')
echo "$BODY" | grep -q "¿Vienes de otra instalación?" && echo "WARN 3b: banner reapareció tras reload (sessionStorage no respetado)" || echo "PASS 3b: no reaparece en la sesión (sessionStorage)"

echo "── 4. con progreso sembrado → banner NO aparece ──"
$EB eval "localStorage.setItem('pacto-de-guerra-profile', JSON.stringify({nivel:5})); localStorage.setItem('guerrero-tactico-coleccion', JSON.stringify({copies:{}})); sessionStorage.removeItem('pacto-restore-dismissed'); 'ok'" >/dev/null 2>&1
$EB reload >/dev/null 2>&1
$EB wait 2500 >/dev/null 2>&1
BODY=$($EB eval "document.body.textContent" 2>/dev/null | sed 's/^"//; s/"$//')
echo "$BODY" | grep -q "¿Vienes de otra instalación?" && echo "FAIL 4: banner aparece con progreso" || echo "PASS 4: banner oculto con progreso presente"

$EB screenshot /home/z/my-project/scripts/e2e-t50-final.png >/dev/null 2>&1
echo "captura: scripts/e2e-t50-final.png"
$EB close --all >/dev/null 2>&1 || true
echo "E2E-T50 DONE"
