#!/bin/bash
# ════════════════════════════════════════════════════════════════════
# e2e-t47.sh — Task 47: keywords rediseñadas VISIBLES en móvil emulado
#  0) colección sembrada (12× duelista_errante) + reload
#  1) preview de mano: chip = INTERPRETACIÓN nueva + texto «Al Jugar: gana +1»
#  2) PASAR ×2 (energía T1=1; Duelista cuesta 3 → jugable en T3)
#  3) drag Duelista → ARMAS («SOLO COSTE 3» lo permite)
#  4) float verde «+1» sobre la carta RECÍEN jugada (antes se descartaba:
#     PvpFloat resolvía el ancla ANTES del commit → carta nueva = null)
#  5) poder en tablero 14 (11 base + 2 sinergia + 1 Duelista)
#  6) Registro del preview lista «Duelista +1»
# ════════════════════════════════════════════════════════════════════
set -u
EB="agent-browser"
URL="${1:-http://localhost:3333}"

$EB close --all >/dev/null 2>&1 || true
$EB set device "Galaxy S25" >/dev/null 2>&1
$EB open "$URL" >/dev/null 2>&1
$EB wait 2500 >/dev/null 2>&1

echo "── 0. sembrar colección + reload (con reintento) ──"
EN_MANO="false"
for intento in 1 2 3; do
  $EB eval "localStorage.setItem('guerrero-tactico-coleccion', JSON.stringify({copies:{duelista_errante:{common:12}},grantedClasses:['guerrero'],wins:0})); 'ok'" >/dev/null 2>&1
  $EB reload >/dev/null 2>&1
  $EB wait 3000 >/dev/null 2>&1
  SEED=$($EB eval "(() => { try { const c=JSON.parse(localStorage.getItem('guerrero-tactico-coleccion')); return c.copies && c.copies.duelista_errante ? 'viva' : 'muerta'; } catch { return 'muerta'; } })()" 2>/dev/null | sed 's/^"//; s/"$//')
  ref=$($EB snapshot -i -c 2>/dev/null | grep -oE 'button "HISTORIA" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
  [ -z "$ref" ] && { sleep 2; continue; }
  $EB click "$ref" >/dev/null 2>&1; sleep 1.8
  ref=$($EB snapshot -i -c 2>/dev/null | grep -oE 'button "JUGAR" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
  [ -z "$ref" ] && { sleep 2; continue; }
  $EB click "$ref" >/dev/null 2>&1
  sleep 2.4
  ref=$($EB snapshot -i -c 2>/dev/null | grep -oE 'button "¡A LUCHAR!" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
  if [ -n "$ref" ]; then $EB click "$ref" >/dev/null 2>&1; sleep 2.2; fi
  EN_MANO=$($EB eval "[...document.querySelectorAll('[data-hand-card-uid]')].some(c=>c.textContent.includes('Duelista Errante'))" 2>/dev/null | sed 's/^"//; s/"$//')
  echo "   intento $intento: semilla=$SEED enMano=$EN_MANO"
  [ "$EN_MANO" = "true" ] && break
  # volver al menú para reintentar limpio
  ref=$($EB snapshot -i -c 2>/dev/null | grep -oE 'button "(MENÚ|Volver)" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
  [ -n "$ref" ] && $EB click "$ref" >/dev/null 2>&1 && sleep 1.5
done
echo "   Duelista en mano: $EN_MANO $([ "$EN_MANO" = "true" ] && echo OK || echo FALLO)"

echo "── 2. preview: chip con interpretación nueva + texto nuevo ──"
$EB eval "(() => { const c=[...document.querySelectorAll('[data-hand-card-uid]')].find(x=>x.textContent.includes('Duelista Errante')); if(!c) return; c.scrollIntoView({inline:'center', block:'nearest', behavior:'instant'}); })()" >/dev/null 2>&1
sleep 0.5
$EB eval "(() => { const c=[...document.querySelectorAll('[data-hand-card-uid]')].find(x=>x.textContent.includes('Duelista Errante')); const r=c.getBoundingClientRect(); window.__tap={x:Math.round(r.x+r.width/2),y:Math.round(r.y+40)}; return 'ok'; })()" >/dev/null 2>&1
X=$($EB eval "window.__tap.x" 2>/dev/null | sed 's/"//g'); Y=$($EB eval "window.__tap.y" 2>/dev/null | sed 's/"//g')
$EB mouse move "$X" "$Y" >/dev/null 2>&1; $EB mouse down >/dev/null 2>&1; $EB mouse up >/dev/null 2>&1
sleep 1.0
TOOLTIP=$($EB eval "(() => { const s=document.querySelector('span[title*=\"Al Jugar: gana +X garantizado\"]'); return s ? 'NUEVA' : (document.querySelector('[role=dialog]') ? 'VIEJA' : 'sin-dialog'); })()" 2>/dev/null | sed 's/^"//; s/"$//')
echo "   interpretación del chip: $TOOLTIP $([ "$TOOLTIP" = "NUEVA" ] && echo OK || echo FALLO)"
TEXTO=$($EB eval "(() => { const d=document.querySelector('[role=dialog]'); const t=d ? d.textContent : ''; return t.includes('Al Jugar: gana +1') && t.includes('+1 más') ? 'texto-ok' : 'texto-viejo'; })()" 2>/dev/null | sed 's/^"//; s/"$//')
echo "   texto de efecto: $TEXTO $([ "$TEXTO" = "texto-ok" ] && echo OK || echo FALLO)"
$EB screenshot scripts/e2e-t47-preview.png >/dev/null 2>&1
$EB mouse move "$X" "$Y" >/dev/null 2>&1; $EB mouse down >/dev/null 2>&1; $EB mouse up >/dev/null 2>&1
sleep 0.8
CERRADO=$($EB eval "!document.querySelector('[role=dialog]')" 2>/dev/null | sed 's/^"//; s/"$//')
echo "   preview cerrado: $CERRADO $([ "$CERRADO" = "true" ] && echo OK || echo FALLO)"

echo "── 3. PASAR ×2 (energía T1=1 → T3=3) ──"
for i in 1 2; do
  ref=$($EB snapshot -i -c 2>/dev/null | grep -oE 'button "PASAR" \[ref=[^]]+\]' | grep -oE '@?e[0-9]+' | head -1)
  if [ -n "$ref" ]; then
    $EB click "$ref" >/dev/null 2>&1
    sleep 4.2
    TURNO=$($EB eval "(() => { const m=document.body.textContent.match(/Turno\s+(\d+)/i); return m ? m[1] : '?'; })()" 2>/dev/null | sed 's/^"//; s/"$//')
    echo "   ciclo $i → turno $TURNO"
  else
    echo "   ciclo $i: sin PASAR visible"
    sleep 2
  fi
done

echo "── 4. drag Duelista → ARMAS (solo cuando ME TOCA) ──"
MI_TURNO="false"
for i in $(seq 1 12); do
  MT=$($EB eval "(() => { const t=document.body.textContent; return /te toca/i.test(t) || !!([...document.querySelectorAll('button')].find(b=>/pasar/i.test(b.textContent))); })()" 2>/dev/null | sed 's/^"//; s/"$//')
  if [ "$MT" = "true" ]; then MI_TURNO="true"; break; fi
  sleep 1
done
echo "   mi turno: $MI_TURNO"
# energías: esperar a tener ≥3
for i in $(seq 1 10); do
  EOK=$($EB eval "(() => { const el=[...document.querySelectorAll('div,span')].find(e=>e.textContent.trim()==='3' && e.querySelector('svg')===null && e.offsetParent && e.getBoundingClientRect().width<80); return el ? 'e3' : 'no'; })()" 2>/dev/null | sed 's/^"//; s/"$//')
  [ "$EOK" = "e3" ] && break
  sleep 1
done
$EB eval "(() => { const c=[...document.querySelectorAll('[data-hand-card-uid]')].find(x=>x.textContent.includes('Duelista Errante')); if(!c) return 'sin-carta'; c.scrollIntoView({inline:'center', block:'nearest', behavior:'instant'}); return 'ok'; })()" >/dev/null 2>&1
sleep 0.5
# elegir carril: descartar los que exigen SOLO COSTE N con N≠3 (bonos aleatorios por partida)
LANE=$($EB eval "(() => { const c=[...document.querySelectorAll('[data-hand-card-uid]')].find(x=>x.textContent.includes('Duelista Errante')); if(!c) return 'sin-carta'; for (const id of ['armas','proteccion','furia']) { const l=document.querySelector('[data-lane-id=\"'+id+'\"]'); if(!l) continue; const chip=l.textContent.match(/SOLO COSTE (\d+)/); if (chip && chip[1] !== '3') continue; return id; } return 'armas'; })()" 2>/dev/null | sed 's/^"//; s/"$//')
echo "   carril elegido: $LANE"
CO=$($EB eval "(() => { const c=[...document.querySelectorAll('[data-hand-card-uid]')].find(x=>x.textContent.includes('Duelista Errante')); if(!c) return 'null'; const r=c.getBoundingClientRect(); const l=document.querySelector('[data-lane-id=\"'+window.__lane+'\"]') || document.querySelector('[data-lane-id]'); const lr=l.getBoundingClientRect(); return JSON.stringify({sx:Math.round(r.x+r.width/2), sy:Math.round(r.y+40), ex:Math.round(lr.x+lr.width/2), ey:Math.round(lr.y+lr.height/2)}); })()" 2>/dev/null | sed 's/^"//; s/"$//; s/\\"/"/g')
# pasar el carril elegido vía __lane
$EB eval "window.__lane='$LANE'; 'ok'" >/dev/null 2>&1
CO=$($EB eval "(() => { const c=[...document.querySelectorAll('[data-hand-card-uid]')].find(x=>x.textContent.includes('Duelista Errante')); if(!c) return 'null'; const r=c.getBoundingClientRect(); const l=document.querySelector('[data-lane-id=\"'+(window.__lane||'armas')+'\"]') || document.querySelector('[data-lane-id]'); const lr=l.getBoundingClientRect(); return JSON.stringify({sx:Math.round(r.x+r.width/2), sy:Math.round(r.y+40), ex:Math.round(lr.x+lr.width/2), ey:Math.round(lr.y+lr.height/2)}); })()" 2>/dev/null | sed 's/^"//; s/"$//; s/\\"/"/g')
read SX SY EX EY <<<$(echo "$CO" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['sx'],d['sy'],d['ex'],d['ey'])")
echo "   drag ($SX,$SY) → ($EX,$EY)"
$EB mouse move "$SX" "$SY" >/dev/null 2>&1
$EB mouse down >/dev/null 2>&1
sleep 0.15
$EB mouse move "$SX" "$((SY - 30))" >/dev/null 2>&1
$EB mouse move $(( (SX + EX) / 2 )) $(( (SY + EY) / 2 )) >/dev/null 2>&1
$EB mouse move "$EX" "$EY" >/dev/null 2>&1
sleep 0.35
$EB mouse up >/dev/null 2>&1
sleep 0.8
TOAST=$($EB eval "(() => { const x=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='✕'); if(!x) return 'sin-toast'; let p=x.parentElement; for(let i=0;i<5&&p;i++){ if(p.textContent.length>25) break; p=p.parentElement; } return (p?p.textContent:x.textContent).slice(0,90); })()" 2>/dev/null | sed 's/^"//; s/"$//')
echo "   toast tras drag: $TOAST"

echo "── 5. float verde «+1» sobre la carta RECÍEN jugada (poll 3s) ──"
FLOAT="sin-float"
for i in $(seq 1 15); do
  FLOAT=$($EB eval "(() => { const f=[...document.querySelectorAll('div')].find(d=>d.className.includes('rounded-full') && d.className.includes('translate-x-1/2') && d.textContent.trim()==='+1'); return f ? 'float+1-VISIBLE' : 'sin-float'; })()" 2>/dev/null | sed 's/^"//; s/"$//')
  [ "$FLOAT" = "float+1-VISIBLE" ] && break
  sleep 0.2
done
echo "   $FLOAT $([ "$FLOAT" = "float+1-VISIBLE" ] && echo OK || echo FALLO)"
$EB screenshot scripts/e2e-t47-float.png >/dev/null 2>&1

echo "── 6. poder en tablero: la mini muestra 14 (11 base + 2 sinergia + 1 Duelista) ──"
sleep 0.8
PWR=$($EB eval "(() => { const mini=document.querySelector('[data-pvp-lane^=\"me-\"] [data-card-uid]'); if(!mini) return 'sin-carta'; return [...mini.querySelectorAll('div,span')].some(e=>e.textContent.trim()==='14') ? 'P14-VISIBLE' : 'sin-14'; })()" 2>/dev/null | sed 's/^"//; s/"$//')
echo "   $PWR $([ "$PWR" = "P14-VISIBLE" ] && echo OK || echo FALLO)"

echo "── 7. Registro del preview lista «Duelista +1» (click sintético en la mini) ──"
REG=$($EB eval "(() => { const m=document.querySelector('[data-pvp-lane^=\"me-\"] [data-card-uid]'); if(!m) return 'sin-carta'; const r=m.getBoundingClientRect(); const opts=(x,y)=>({bubbles:true,cancelable:true,composed:true,pointerId:31,isPrimary:true,pointerType:'mouse',clientX:x,clientY:y,button:0}); const x=r.x+r.width/2, y=r.y+r.height/2; m.dispatchEvent(new PointerEvent('pointerdown',opts(x,y))); m.dispatchEvent(new PointerEvent('pointerup',opts(x,y))); m.dispatchEvent(new MouseEvent('click',opts(x,y))); return 'enviado'; })()" 2>/dev/null | sed 's/^"//; s/"$//')
sleep 1.2
REGD=$($EB eval "(() => { const d=document.querySelector('[role=dialog]'); if(!d) return 'sin-dialog'; const t=d.textContent; return (t.includes('Duelista') && t.includes('+1') && t.includes('11\u219214')) || (t.includes('Duelista') && t.includes('+1')) ? 'registro-ok' : 'sin-entrada'; })()" 2>/dev/null | sed 's/^"//; s/"$//')
echo "   $REGD $([ "$REGD" = "registro-ok" ] && echo OK || echo FALLO)"
$EB screenshot scripts/e2e-t47-registro.png >/dev/null 2>&1

echo "═══ FIN E2E Task 47 ═══"
