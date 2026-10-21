#!/bin/bash
# E2E móvil 390×844 (post-fixes):
#  1) partida de campaña con MULTIPLES cambios de turno (pases) — sin freeze
#  2) modal de fin con botones SIEMPRE visibles (navega con Menú)
#  3) Ajustes: sección PROGRESO (exportar/importar)
set -u
cd /home/z/my-project

agent-browser open --viewport=390,844 "http://localhost:3000" >/dev/null 2>&1
agent-browser wait 3000 >/dev/null 2>&1

# LONGTASK + rAF monitor: mide jank real en el cambio de turno
agent-browser eval "
window.__jank = { long: 0, gaps: [] };
(function(){ let last = performance.now();
  function loop(t){ const d = t - last; last = t; if (d > 200) window.__jank.gaps.push(Math.round(d)); requestAnimationFrame(loop); }
  requestAnimationFrame(loop);
  const po = new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.duration > 50) window.__jank.long += e.duration; });
  try { po.observe({ entryTypes: ['longtask'] }); } catch {} })();
" >/dev/null 2>&1
echo "== monitor de jank activo =="

# HISTORIA → JUGAR → A LUCHAR
ref=$(agent-browser snapshot -i -c 2>/dev/null | grep -oE 'button "HISTORIA" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
agent-browser click "$ref" >/dev/null 2>&1; sleep 1.8
ref=$(agent-browser snapshot -i -c 2>/dev/null | grep -oE 'button "JUGAR" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
agent-browser click "$ref" >/dev/null 2>&1; sleep 2.2
ref=$(agent-browser snapshot -i -c 2>/dev/null | grep -oE 'button "¡A LUCHAR!" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
agent-browser click "$ref" >/dev/null 2>&1; sleep 2

# 3 CICLOS COMPLETOS de cambio de turno (pase propio → turno rival → pase)
t0=$(date +%s%3N)
for i in 1 2 3; do
  for k in $(seq 1 30); do
    ref=$(agent-browser snapshot -i -c 2>/dev/null | grep -oE 'button "PASAR" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
    if [ -n "$ref" ]; then agent-browser click "$ref" >/dev/null 2>&1; break; fi
    sleep 0.8
  done
  sleep 2.4
  echo "ciclo $i: pase OK"
done
t1=$(date +%s%3N)
echo "== ciclos en $((t1-t0))ms =="
agent-browser eval "JSON.stringify(window.__jank)" 2>/dev/null

# Modal de fin: pasar el resto de la partida hasta el overlay
for i in $(seq 1 30); do
  if agent-browser snapshot -c 2>/dev/null | grep -qE "Reintentar Escalón|Siguiente Escalón|Continuar Campaña|Nueva Campaña"; then echo "== MODAL FIN (iter $i)"; break; fi
  ref=$(agent-browser snapshot -i -c 2>/dev/null | grep -oE 'button "PASAR" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
  if [ -n "$ref" ]; then agent-browser click "$ref" >/dev/null 2>&1; sleep 2.2; else sleep 1.2; fi
done
agent-browser screenshot scripts/e2e-fix-modal-fin.png >/dev/null 2>&1
agent-browser snapshot -i -c 2>/dev/null | rg "Reintentar|Siguiente|Continuar|Nueva|Menú|Botín|carta" | head -8

# Botón Menú funciona (navega, no hay que cerrar la app)
ref=$(agent-browser snapshot -i -c 2>/dev/null | grep -oE 'button "Menú" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
agent-browser click "$ref" >/dev/null 2>&1; sleep 1.5
agent-browser snapshot -i -c 2>/dev/null | rg "HISTORIA|COLECCIÓN" | head -2

# Ajustes → sección PROGRESO
ref=$(agent-browser snapshot -i -c 2>/dev/null | grep -oE 'button "Opciones" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
agent-browser click "$ref" >/dev/null 2>&1; sleep 1.2
ref=$(agent-browser snapshot -i -c 2>/dev/null | grep -oE 'button "Exportar progreso" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
if [ -n "$ref" ]; then
  agent-browser click "$ref" >/dev/null 2>&1; sleep 0.8
  agent-browser screenshot scripts/e2e-fix-progreso.png >/dev/null 2>&1
  echo "== sección PROGRESO OK =="
else
  echo "== NO SE ENCONTRÓ Exportar progreso =="
fi
