#!/bin/bash
# ════════════════════════════════════════════════════════════════════
# e2e-t49.sh — Task 49: APK overwrite — diagnóstico en el dispositivo
#  1) menú → botón «Opciones» (engranaje, bottom-right)
#  2) modal Ajustes: sección Progreso intacta (Exportar/Importar)
#  3) fila «Versión instalada» visible → en web muestra «navegador»
#     (en el APK mostrará v2.6 · build <run_number> vía @capacitor/app)
# ════════════════════════════════════════════════════════════════════
set -u
EB="agent-browser"
URL="${1:-http://localhost:3333}"

$EB close --all >/dev/null 2>&1 || true
$EB set device "Galaxy S25" >/dev/null 2>&1
$EB open "$URL" >/dev/null 2>&1
$EB wait 2500 >/dev/null 2>&1

echo "── 1. abrir Ajustes (engranaje «Opciones») ──"
REF=$($EB snapshot -i -c 2>/dev/null | grep -oE 'button "Opciones" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
if [ -z "$REF" ]; then
  $EB reload >/dev/null 2>&1; sleep 3
  REF=$($EB snapshot -i -c 2>/dev/null | grep -oE 'button "Opciones" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
fi
[ -n "$REF" ] && $EB click "$REF" >/dev/null 2>&1
sleep 1.5
BODY=$($EB eval "document.body.textContent" 2>/dev/null | sed 's/^"//; s/"$//')
echo "$BODY" | grep -q "Ajustes" && echo "PASS 1: modal Ajustes abierto" || { echo "FAIL 1: modal no abierto"; $EB screenshot /home/z/my-project/scripts/e2e-t49-fail.png >/dev/null 2>&1; exit 1; }

echo "── 2. sección Progreso intacta ──"
P="0"
echo "$BODY" | grep -q "Exportar progreso" && P=$((P+1))
echo "$BODY" | grep -q "Importar progreso" && P=$((P+1))
[ "$P" = "2" ] && echo "PASS 2: Exportar/Importar presentes" || echo "FAIL 2: ($P/2)"

echo "── 3. fila Versión instalada ──"
VER=$($EB eval "(()=>{const t=document.body.textContent; const m=t.match(/Versión instalada\s*([^\n·]*·[^\n]*|navegador|…)/); return m? m[1].trim():'NO_MATCH'})()" 2>/dev/null | sed 's/^"//; s/"$//')
echo "   leído: «$VER»"
if [ "$VER" = "navegador" ]; then
  echo "PASS 3: fallback web correcto (en APK será v2.6 · build N)"
elif echo "$VER" | grep -qE "v[0-9]+(\.[0-9]+)* · build [0-9]+"; then
  echo "PASS 3: versión nativa legible: $VER"
else
  echo "FAIL 3: fila de versión no encontrada"; $EB screenshot /home/z/my-project/scripts/e2e-t49-fail.png >/dev/null 2>&1; exit 1
fi

$EB screenshot /home/z/my-project/scripts/e2e-t49-version.png >/dev/null 2>&1
echo "captura: scripts/e2e-t49-version.png"
$EB close --all >/dev/null 2>&1 || true
echo "E2E-T49 DONE"
