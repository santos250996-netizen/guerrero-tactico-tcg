#!/bin/bash
# Fase de juego para la medición post-fix: juega carta 0 vía preview (JS) o pasa turno.
EB="agent-browser"
case "$1" in
  play)
    $EB eval "window.__mark('play-tap')" > /dev/null
    $EB eval "(() => { const c=[...document.querySelectorAll('[data-hand-card-uid]')][0]; (c.querySelector('button')||c).click(); return 'preview'; })()" > /dev/null
    sleep 0.8
    $EB eval "(() => { const btn=[...document.querySelectorAll('button')].find(b => /^JUGAR EN /.test(b.innerText) && !b.disabled); if (!btn) return 'sin-jugable'; window.__mark('play-click'); btn.click(); return 'jugada:'+btn.innerText; })()" 2>&1 | tail -1
    sleep 0.6
    $EB eval "window.__mark('play-done')" > /dev/null
    ;;
  pass)
    $EB eval "window.__mark('pass-tap')" > /dev/null
    $EB eval "(() => { const b=[...document.querySelectorAll('button')].find(x => /^Pasar$/i.test(x.innerText.trim())); b?.click(); return b ? 'pulsado' : 'NO-BOTON'; })()" 2>&1 | tail -1
    ;;
esac
