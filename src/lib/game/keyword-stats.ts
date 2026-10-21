// ============================================================================
// keyword-stats — contadores de impacto por keyword (SOLO para simulación y
// auditoría de "keywords inservibles", Task 46).
//
// El engine llama a recordKeyword() en cada aplicación de keyword con el delta
// de poder real aplicado y las bajas causadas. Es SIDE-AGNÓSTICO (cuenta ambos
// lados por igual — bot=player intacto) y cuesta un Map.set por evento: cero
// impacto en gameplay. La UI nunca lee esto; solo scripts/sim-keywords.ts.
// ============================================================================

interface KwStat {
  triggers: number;
  /** Suma de deltas aplicados (buffs positivos, debuffs negativos, en valor ABSOLUTO afectado). */
  power: number;
  /** Bajas destruidas directamente (Remate/Purga) o provocadas (caída a 0). */
  kills: number;
  /** Veces que la keyword tuvo la oportunidad de hacer algo y NO hizo nada (sin objetivo, sin escudo que restaurar, etc.). */
  noops: number;
}

const stats = new Map<string, KwStat>();

export function resetKeywordStats(): void {
  stats.clear();
}

export function recordKeyword(kw: string, power = 0, kills = 0): void {
  if (kw === "none") return;
  const s = stats.get(kw) ?? { triggers: 0, power: 0, kills: 0, noops: 0 };
  s.triggers++;
  s.power += power;
  s.kills += kills;
  stats.set(kw, s);
}

export function recordKeywordNoop(kw: string): void {
  if (kw === "none") return;
  const s = stats.get(kw) ?? { triggers: 0, power: 0, kills: 0, noops: 0 };
  s.noops++;
  stats.set(kw, s);
}

export function keywordStatsSnapshot(): Record<string, KwStat> {
  const out: Record<string, KwStat> = {};
  for (const [k, v] of stats) out[k] = { ...v };
  return out;
}
