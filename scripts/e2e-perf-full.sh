#!/bin/bash
# ════════════════════════════════════════════════════════════════════
# e2e-perf-full.sh — fluidez END-TO-END en móvil emulado (NO solo cambios
# de turno): idle en tablero, tap de preview, jugada por DRAG real,
# ciclos de pase con jugadas del rival.
# Instrumenta: longtasks · huecos rAF (>48ms) · event-timing de clicks
# (input→paint) · coste idle del canvas · stats globales rAF.
# Uso: e2e-perf-full.sh [url] [salida.json] [ciclos]
# ════════════════════════════════════════════════════════════════════
set -u
EB="agent-browser"
URL="${1:-http://localhost:3333}"
OUT="${2:-scripts/perf-full.json}"
CICLOS="${3:-3}"

# ── util: ventana de medición (diff del array de huecos + longtasks) ──
# agent-browser eval devuelve el valor entre comillas con escapes → limpiar
clean() { sed 's/^"//; s/"$//; s/\\\"/"/g'; }
snap() { $EB eval "JSON.stringify({g:window.__PERF.gaps.length,l:window.__PERF.lt.length,e:window.__PERF.ev.length})" 2>/dev/null | clean; }
delta() { # $1=snapAntes $2=snapDespues
  python3 - "$1" "$2" <<'EOF' 2>/dev/null || echo "(snap vacio)"
import json,sys
a,b=json.loads(sys.argv[1] or '{}'),json.loads(sys.argv[2] or '{}')
print(f"gaps+{b.get('g',0)-a.get('g',0)} lt+{b.get('l',0)-a.get('l',0)} ev+{b.get('e',0)-a.get('e',0)}")
EOF
}

$EB close --all >/dev/null 2>&1 || true
echo "── dispositivo móvil ──"
$EB set device "Galaxy S25" 2>&1 | tail -1
$EB open "$URL" >/dev/null 2>&1
$EB wait 3000 >/dev/null 2>&1
UA=$($EB eval "navigator.userAgent" 2>/dev/null | tail -1)
echo "UA: $UA"

echo "── monitores ──"
$EB eval "(() => {
  if (window.__PERF) return 'ya';
  window.__PERF = { lt: [], gaps: [], ev: [], marks: [] };
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__PERF.lt.push({s:Math.round(e.startTime),d:Math.round(e.duration)}); }).observe({entryTypes:['longtask'],buffered:true});
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__PERF.ev.push({n:e.name,s:Math.round(e.startTime),d:Math.round(e.duration),id:e.interactionId}); }).observe({type:'event',durationThreshold:40,buffered:true});
  } catch (err) {}
  let last = performance.now(), worst = 0, sum = 0, n = 0;
  const loop = (t) => { const d = t - last; last = t; if (d > worst) worst = d; sum += d; n++; if (d > 48) window.__PERF.gaps.push({s:Math.round(t),d:Math.round(d)}); window.__raf = {worst:Math.round(worst),avg:+(sum/n).toFixed(2),n}; requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  window.__mark = (label) => window.__PERF.marks.push({t:Math.round(performance.now()),label});
  return 'ok';
})()" 2>/dev/null | tail -1

echo "── navegación: HISTORIA → JUGAR → ¡A LUCHAR! ──"
ref=$($EB snapshot -i -c 2>/dev/null | grep -oE 'button "HISTORIA" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
$EB click "$ref" >/dev/null 2>&1; sleep 1.8
ref=$($EB snapshot -i -c 2>/dev/null | grep -oE 'button "JUGAR" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
$EB click "$ref" >/dev/null 2>&1; sleep 2.2
ref=$($EB snapshot -i -c 2>/dev/null | grep -oE 'button "¡A LUCHAR!" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
$EB click "$ref" >/dev/null 2>&1; sleep 2.5
$EB eval "window.__mark('en-tablero')" >/dev/null 2>&1

echo "── [F1] IDLE 4s en tablero (coste continuo: ambient + foil) ──"
S=$(snap)
$EB eval "(() => { const i = window.__PERF.gaps.length; window.__idleStart = performance.now(); return 'idle-on'; })()" >/dev/null 2>&1
sleep 4
E=$(snap)
echo "   F1: $(delta "$S" "$E")  raf=$($EB eval "JSON.stringify(window.__raf)" 2>/dev/null | clean)"

echo "── [F2] TAP preview (abrir + cerrar) ×2 ──"
for i in 1 2; do
  S=$(snap)
  $EB eval "window.__mark('preview-abre-$i')" >/dev/null 2>&1
  $EB eval "(() => { const c=[...document.querySelectorAll('[data-hand-card-uid]')][0]; if(!c) return 'sin'; const r=c.getBoundingClientRect(); window.__tapAt={x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}; return JSON.stringify(window.__tapAt); })()" >/dev/null 2>&1
  X=$($EB eval "window.__tapAt.x" 2>/dev/null | tail -1); Y=$($EB eval "window.__tapAt.y" 2>/dev/null | tail -1)
  $EB mouse move "$X" "$Y" >/dev/null 2>&1; $EB mouse down >/dev/null 2>&1; $EB mouse up >/dev/null 2>&1
  sleep 0.9
  $EB eval "window.__mark('preview-abierto-$i')" >/dev/null 2>&1
  $EB mouse move 8 60 >/dev/null 2>&1; $EB mouse down >/dev/null 2>&1; $EB mouse up >/dev/null 2>&1   # cerrar (overlay)
  sleep 0.7
  $EB eval "window.__mark('preview-cerrado-$i')" >/dev/null 2>&1
  E=$(snap)
  echo "   F2.$i: $(delta "$S" "$E")"
done

echo "── [F3] DRAG real: jugar carta 0 a carril propio ×2 ──"
for i in 1 2; do
  S=$(snap)
  $EB eval "window.__mark('drag-$i')" >/dev/null 2>&1
  CO=$($EB eval "(() => { const cs=[...document.querySelectorAll('[data-hand-card-uid]')]; const c=cs[0]; if(!c) return 'null'; const r=c.getBoundingClientRect(); const ls=[...document.querySelectorAll('[data-lane-id]')]; const l=ls[Math.min($i,ls.length-1)]||ls[0]; const lr=l.getBoundingClientRect(); return JSON.stringify({sx:Math.round(r.x+r.width/2), sy:Math.round(r.y+40), ex:Math.round(lr.x+lr.width/2), ey:Math.round(lr.y+lr.height/2)}); })()" 2>/dev/null | grep -o '{.*}')
  [ "$CO" = "null" ] && { echo "   F3.$i: sin cartas jugables"; continue; }
  read SX SY EX EY <<<$(echo "$CO" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['sx'],d['sy'],d['ex'],d['ey'])")
  $EB mouse move "$SX" "$SY" >/dev/null 2>&1
  $EB mouse down >/dev/null 2>&1
  $EB mouse move "$SX" "$((SY - 30))" >/dev/null 2>&1
  $EB mouse move "$(( (SX + EX) / 2 ))" "$(( (SY + EY) / 2 ))" >/dev/null 2>&1
  $EB mouse move "$EX" "$EY" >/dev/null 2>&1
  $EB eval "window.__mark('drag-suelta-$i')" >/dev/null 2>&1
  $EB mouse up >/dev/null 2>&1
  sleep 1.8
  $EB eval "window.__mark('drag-fin-$i')" >/dev/null 2>&1
  E=$(snap)
  echo "   F3.$i: $(delta "$S" "$E")"
done

echo "── [F4] $CICLOS ciclos de PASAR (jugadas del rival incluidas) ──"
for i in $(seq 1 "$CICLOS"); do
  S=$(snap)
  $EB eval "window.__mark('pase-$i')" >/dev/null 2>&1
  ref=$($EB snapshot -i -c 2>/dev/null | grep -oE 'button "PASAR" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
  if [ -n "$ref" ]; then $EB click "$ref" >/dev/null 2>&1; else
    # quizá hay carta jugable gratis: arrastra la 0 y espera
    CO=$($EB eval "(() => { const c=[...document.querySelectorAll('[data-hand-card-uid]')][0]; if(!c) return 'null'; const r=c.getBoundingClientRect(); const l=[...document.querySelectorAll('[data-lane-id]')][0]; const lr=l.getBoundingClientRect(); return JSON.stringify({sx:Math.round(r.x+r.width/2), sy:Math.round(r.y+40), ex:Math.round(lr.x+lr.width/2), ey:Math.round(lr.y+lr.height/2)}); })()" 2>/dev/null | grep -o '{.*}')
    if [ "$CO" != "null" ] && [ -n "$CO" ]; then
      read SX SY EX EY <<<$(echo "$CO" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['sx'],d['sy'],d['ex'],d['ey'])")
      $EB mouse move "$SX" "$SY" >/dev/null 2>&1; $EB mouse down >/dev/null 2>&1
      $EB mouse move "$SX" "$((SY - 30))" >/dev/null 2>&1
      $EB mouse move "$EX" "$EY" >/dev/null 2>&1; $EB mouse up >/dev/null 2>&1
      sleep 1.6
    fi
    ref=$($EB snapshot -i -c 2>/dev/null | grep -oE 'button "PASAR" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
    [ -n "$ref" ] && $EB click "$ref" >/dev/null 2>&1
  fi
  sleep 3.2
  $EB eval "window.__mark('rival-fin-$i')" >/dev/null 2>&1
  E=$(snap)
  echo "   F4.$i: $(delta "$S" "$E")"
done

echo "── reporte ──"
$EB eval "(() => { const P = window.__PERF; const gaps=P.gaps.map(g=>g.d); return JSON.stringify({longtasks:P.lt, gaps:P.gaps, eventos:P.ev, marcas:P.marks, raf:window.__raf, resumen:{totalLT:P.lt.length, totalGaps:P.gaps.length, msLT:P.lt.reduce((a,b)=>a+b.d,0), peorGap:gaps.length?Math.max(...gaps):0}}); })()" 2>/dev/null | clean > "$OUT"
python3 - "$OUT" <<'EOF'
import json,sys
d=json.load(open(sys.argv[1]))
r=d["resumen"]
print(f"longtasks: {r['totalLT']} ({r['msLT']}ms acumulados) · huecos rAF: {r['totalGaps']} (peor {r['peorGap']}ms) · frames: {d['raf']['n']} avg {d['raf']['avg']}ms peor {d['raf']['worst']}ms")
print("longtasks:", [(x['s'],x['d']) for x in d['longtasks']][:12])
print("gaps:", [(x['s'],x['d']) for x in d['gaps']][:12])
print("eventos>40ms:", [(x['n'],x['d']) for x in d['eventos']][:12])
EOF
echo "guardado: $OUT"
