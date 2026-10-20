#!/bin/bash
# ════════════════════════════════════════════════════════════════════
# e2e-perf-turn.sh — mide jank del CAMBIO DE TURNO en móvil emulado
# (Galaxy S25 @ 360×800, UA Android → tier LOW del juego).
# Instrumenta: longtasks (>50ms) + huecos rAF (>48ms) + marcas alrededor
# de cada acción (pasar turno, jugada del bot).
# ════════════════════════════════════════════════════════════════════
set -e
EB="agent-browser"

echo "── 1. monitores de rendimiento ──"
$EB eval "(() => {
  if (window.__PERF) return 'ya';
  window.__PERF = { lt: [], gaps: [], marks: [] };
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__PERF.lt.push({s: Math.round(e.startTime), d: Math.round(e.duration)});
    }).observe({entryTypes: ['longtask'], buffered: true});
  } catch (e) {}
  let last = performance.now();
  const loop = () => {
    const now = performance.now();
    if (now - last > 48) window.__PERF.gaps.push({s: Math.round(last), d: Math.round(now - last)});
    last = now;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  window.__mark = (label) => window.__PERF.marks.push({t: Math.round(performance.now()), label});
  return 'ok';
})()"

echo "── 2. entrar a HISTORIA → escalón 1 ──"
# (navegación hecha fuera; este script asume partida en vivo con splash fuera)
