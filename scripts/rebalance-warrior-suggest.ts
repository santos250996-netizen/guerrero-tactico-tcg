// Sugiere el power exacto para llevar cada carta guerrero al objetivo PTP.
// Regla aprobada (opción A): SOLO cambia `power` — coste, keywords, keywordValue y arte intactos.
import { ALL_CARDS } from "../src/lib/game/cards";
import { getBalanceInfo, calculateEffectPoints, getPTPRange } from "../src/lib/game/balance";

const fixes: { id: string; name: string; oldPower: number; newPower: number; oldPtp: number; newPtp: number }[] = [];

for (const card of ALL_CARDS) {
  const info = getBalanceInfo(card);
  if (info.balanced) continue;
  const effect = calculateEffectPoints(card);
  const range = getPTPRange(card.cost);
  const ideal = range.target - effect;
  // candidatos enteros alrededor del ideal, elegir el más cercano al target dentro del rango
  const candidates = [Math.floor(ideal), Math.ceil(ideal), Math.floor(ideal) + 1, Math.floor(ideal) - 1];
  let best: number | null = null;
  let bestDist = Infinity;
  for (const p of candidates) {
    if (p < 0) continue;
    const ptp = p + effect;
    if (ptp < range.min || ptp > range.max) continue;
    const dist = Math.abs(ptp - range.target);
    if (dist < bestDist) {
      bestDist = dist;
      best = p;
    }
  }
  if (best === null) {
    console.log(`!! ${card.name}: sin candidato entero en rango (efecto ${effect.toFixed(2)}, target ${range.target})`);
    continue;
  }
  fixes.push({
    id: card.id,
    name: card.name,
    oldPower: card.power,
    newPower: best,
    oldPtp: info.currentPTP,
    newPtp: best + effect,
  });
}

console.log("id | nombre | power viejo → nuevo | PTP viejo → nuevo | target");
for (const f of fixes) {
  const card = ALL_CARDS.find((c) => c.id === f.id);
  const target = card ? getPTPRange(card.cost).target : NaN;
  console.log(`${f.id} | ${f.name} | ${f.oldPower} → ${f.newPower} | ${f.oldPtp.toFixed(1)} → ${f.newPtp.toFixed(1)} | ${target}`);
}
console.log(`\nTotal a corregir: ${fixes.length}`);
