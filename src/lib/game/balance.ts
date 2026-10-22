// ===========================================================================
// GUERRERO TÁCTICO TCG — FÓRMULA DE BALANCE (V2, keywords 2026-10)
// ===========================================================================
// Poder_Base + Puntos_Efecto = PTP_Objetivo
//   • Poder_Base: Ataque directo de la carta (≥ 0).
//   • Puntos_Efecto: Valor numérico total de las keywords.
//   • PTP_Objetivo: Bolsa de puntos fija que otorga el coste de energía.
//
// PTP_Objetivo = (Coste_Energía * 4.0) + 1.5
// Puntos_Efecto = Valor_Keyword × Mod_Scope × Mod_Once
//
// Mod_Once: efectos por turno (start_turn/end_turn) × 0.8; one-shot × 1.0.
// ===========================================================================

import type { CardDef, Keyword, Trigger, ScopeKind, Rarity } from "./types";
import { KEYWORD_META, SCOPE_MODS, MOD_ONCE_PER_TURN, MOD_ONCE_SINGLE } from "./types";

// ----- Core formula constants -----
export const ENERGY_MULTIPLIER = 4.0;
export const BASE_ENTRY_POINTS = 1.5;
export const TOLERANCE = 0.5;

// ----- Rareza por FUSIÓN (rework 2026-10: escalado de KEYWORD desde legendaria) -----
// Todas las cartas nacen COMUNES; la rareza se GANA fusionando 3 copias
// idénticas del mismo tier. Bonos por tier (decisión del jugador):
//   Rara       → +2 poder
//   Épica      → +4 poder (acumulado)
//   Legendaria → +5 poder y +1 al valor de la keyword
//   Mítica     → +6 poder y +3 al valor de la keyword (acumulado)
// Así las copias máximas no solo golpean más: su EFECTO escala. El tier común
// devuelve la definición intacta.
export const RARITY_ORDER: readonly Rarity[] = ["common", "rare", "epic", "legendary", "mythic"] as const;
export const RARITY_TIER: Record<Rarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3, mythic: 4 };
export const RARITY_LABEL: Record<Rarity, string> = {
  common: "Común",
  rare: "Rara",
  epic: "Épica",
  legendary: "Legendaria",
  mythic: "Mítica",
};
/** Bonos ACUMULADOS por tier: [poder extra, keyword extra]. */
export const RARITY_BONUS: Record<Rarity, { power: number; keyword: number }> = {
  common: { power: 0, keyword: 0 },
  rare: { power: 2, keyword: 0 },
  epic: { power: 4, keyword: 0 },
  legendary: { power: 5, keyword: 1 },
  mythic: { power: 6, keyword: 3 },
};
export const RARITY_PTP_BONUS_PER_TIER = 2;
export const FUSION_COPIES = 3;
export const MAX_FUSION_RARITY: Rarity = "mythic";

export function nextRarity(rarity: Rarity): Rarity | null {
  const tier = RARITY_TIER[rarity];
  return tier >= RARITY_TIER[MAX_FUSION_RARITY] ? null : RARITY_ORDER[tier + 1];
}

/**
 * Bolsa de Puntos Totales (PTP) que otorga un coste de energía dado,
 * ajustada por la rareza de la copia (+2 por tier sobre la común).
 */
export function getTargetPTP(energyCost: number, rarity: Rarity = "common"): number {
  return energyCost * ENERGY_MULTIPLIER + BASE_ENTRY_POINTS + RARITY_TIER[rarity] * RARITY_PTP_BONUS_PER_TIER;
}

/** Rango legal de PTP para un coste y rareza dados (con tolerancia ±0.5). */
export function getPTPRange(energyCost: number, rarity: Rarity = "common"): { min: number; max: number; target: number } {
  const target = getTargetPTP(energyCost, rarity);
  return {
    target,
    min: target - TOLERANCE,
    max: target + TOLERANCE,
  };
}

/** Modificador por repetición: start_turn/end_turn son efectos peri-turno. */
export function getOnceModifier(trigger: Trigger | undefined): number {
  if (trigger === "start_turn" || trigger === "end_turn") return MOD_ONCE_PER_TURN;
  return MOD_ONCE_SINGLE;
}

/**
 * Valor base de cada keyword V2 para X = 1 (multiplicar por keywordValue).
 * Purificación no lleva [X] — valor fijo 2 (utilidad constante).
 */
export const KEYWORD_BASE_VALUES: Record<Keyword, number> = {
  none: 0,
  // --- Neutrales ---
  fervor: 3.0, // +X/turno acumulativo: ~3-5 turnos de vida media
  coraza: 1.0, // absorbe X puntos one-shot
  insignia: 1.0, // +X permanente one-shot a un aliado
  remate: 2.0, // destrucción condicional (vale ~2× el poder rematado)
  legado: 1.0, // +X permanente condicional al morir
  fortaleza: 2.5, // +X/turno a TODO el carril (escala con nº de cartas)
  // --- Guerrero ---
  hender_armadura: 1.2, // como debuff one-shot + prima por perforar escudos
  duelista: 2.5, // +X/turno condicional (única en carril)
  amparo: 0.8, // escudo X por aliado (depende de tablero propio)
  purificacion: 2.0, // utilidad fija (restaura debuffs)
  impetu: 1.5, // +X por carta jugada ese turno (1-3 típico)
  crueldad: 2.0, // −X/turno al más débil (presión constante)
  // --- Mago V3 (Burst) ---
  convergencia: 1.0, // +X por aliado propio ya en carril (0-3 típico)
  sobrecarga: 1.5, // neto +X pero frontloaded +2X (prima burst)
  llamarada: 1.5, // −X AoE one-shot (media ~1.8 objetivos)
  combustion: 1.0, // −2X al morir perforando (condicional on_death)
  escarcha: 1.5, // escudo renovable hasta X cada turno
  ventisca: 1.5, // −X AoE cada fin de turno (desgaste)
  // --- Asesino V3 (Precisión) ---
  veneno: 2.0, // −X/turno perforante al más fuerte (anti-tanque)
  contagio: 1.5, // −X/turno condicional al más envenenado
  refriega: 1.0, // +X por enemigo en carril (anti-numbers)
  golpe_certero: 1.0, // −X one-shot honesto (escudos absorben)
  emboscada: 1.5, // media entre +2X (1ª carta) y +X
  purga: 1.8, // destrucción del más débil ≤X (algo más fácil que Remate)
  // --- 3ª tanda (mazos segundos, 1 por spec) ---
  orden_batalla: 1.2, // +X AoE one-shot al carril (media ~2-3 aliados + sí misma)
  custodia: 1.4, // escudo renovable hasta X al aliado más débil (espejo de Escarcha)
  desafio: 2.0, // +X/turno condicional mientras pierdes el carril (remontada)
  drenar_poder: 1.5, // swing emparejado: +X propio Y −X al más fuerte (escudos absorben)
  detonacion: 1.2, // −X AoE one-shot al morir (condicional; Llamarada al jugar vale 1.5)
  ruptura_glacial: 1.6, // −X one-shot perforante al más debuffeado (condicional)
  miasma: 1.8, // −X AoE one-shot PERFORANTE (prima de perforación sobre Llamarada)
  caza_mayor: 1.4, // media entre +2X (si el más fuerte te supera) y +X
  conspiracion: 0.8, // +X a toda la mano (media ~4-5 cartas futuras, muy valioso)
  // --- V3.0 Botánico (plan-expansion-v3 §2.1) ---
  micelio: 0.9, // doble escudo one-shot (yo + el más débil): Coraza 1.0 solo a sí misma
  estacion: 2.6, // +X/turno como Fervor (3.0) pero madura a +2X desde el turno 4
  simbiosis: 1.1, // +X por aliado MENOR en poder (Convergencia 1.0, condicionado al ranking)
  floracion: 1.2, // AoE de buff one-shot al morir (espejo de Detonación 1.2)
  polen: 1.4, // −X one-shot honesto al MENOS debuffeado (Ruptura 1.6 es perforante)
  carnivora: 1.9, // destrucción del más débil ≤X (Purga 1.8) + se alimenta (+2/+1)
  // --- V3.0 Pirata ---
  saqueo: 1.6, // robo perforante + botín por kill (Drenar 1.5, sin bonus por destrucción)
  tripulacion: 2.0, // +X/turno escalando con propias (Fortaleza 2.5 buffa TODO el carril)
  motin: 5.0, // SWAP fijo sin [X]: intercambio con el más fuerte (valor esperado del swing)
  contrabando: 0.35, // +X a UNA carta aleatoria de la mano (Conspiración 0.8 a TODA la mano)
  canonazo: 1.7, // −X AoE honesto carril+adyacente (scope 1.4 compensa; Miasma 1.8 perforante)
  andanada: 1.3, // −X AoE al morir carril+adyacente (Detonación 1.2 de un solo carril)
  // --- V3.0 Tinker ---
  remache: 0.85, // escudo X al carril COMPLETO incluida ella (Amparo 0.8 sin self)
  chatarra: 1.3, // legado mejorado: +X y escudo X (Legado 1.0 solo poder)
  engranaje: 2.2, // +X/turno condicional a Ítem en carril (Duelista 2.5 condicional a soledad)
  sobrecalentar: 1.4, // media +2X/+X condicionada a otro Ítem (Emboscada 1.5)
  torreta: 1.8, // −X/turno al MÁS FUERTE honesto (Crueldad 2.0 pica al más débil)
  descarga: 1.5, // −X one-shot a los 2 más débiles (Llamarada 1.5 AoE completo)
  // --- V3.0 · Tanda 30 — ampliación clases base (auditados vs las 51) ---
  estandarte: 1.2, // +X AoE al carril ADYACENTE (Orden 1.2 incluye a sí misma; scope 1.4 compensa)
  muralla: 0.6, // escudo X a TODOS tus carriles al morir (Amparo 0.8 por aliado, aquí cuenta toda la guarnición)
  atropello: 1.4, // neto +X con doble filo propio (+2X a sí, −X al aliado débil; Sobrecarga 1.5 sin víctima)
  eco: 0.9, // +X por carta en mano al jugar (Convergencia 1.0 por carta EN carril, más fiable)
  ceniza: 1.2, // −X al morir a los 2 más débiles (Detonación 1.2 AoE completo)
  esquirla: 1.0, // +X por punto de reducción enemiga (condicional: sin debuffs no cosecha)
  corrosion: 1.3, // funde escudos o perfora al más fuerte (Hender 1.2; utilidad anti-escudo extra)
  finta: 1.3, // neto +X diferido (−X ahora, +2X el próximo turno; Sobrecarga 1.5 es inmediato)
  octava: 0.9, // +X por propia en los OTROS carriles (Convergencia 1.0 por propia en SU carril)
};

export function getKeywordBaseValue(keyword: Keyword, magnitude?: number): number {
  const base = KEYWORD_BASE_VALUES[keyword] ?? 0;
  const hasValue = keyword !== "none" ? KEYWORD_META[keyword].hasValue : false;
  if (!hasValue) return base;
  return base * (magnitude ?? 1);
}

/**
 * Puntos de efecto de una carta según su keyword, valor X, trigger y scope.
 */
export function calculateEffectPoints(card: CardDef): number {
  const keyword: Keyword = card.keyword ?? "none";
  if (keyword === "none") return 0;
  const meta = KEYWORD_META[keyword];
  const trigger: Trigger = card.trigger ?? meta.trigger;
  const scope: ScopeKind = card.scope ?? meta.scope;
  const scopeMod = SCOPE_MODS[scope] ?? 1.0;
  const onceMod = getOnceModifier(trigger);
  return getKeywordBaseValue(keyword, card.keywordValue) * scopeMod * onceMod;
}

/**
 * Materializa una copia jugable de la carta al tier de rareza indicado:
 *   rara/épica → +2/+4 PODER · legendaria → +5 poder y +1 KEYWORD ·
 *   mítica → +6 poder y +3 KEYWORD.
 * El bono de keyword solo aplica a keywords CON valor numérico (hasValue) —
 * Purificación (fija) y cartas sin keyword solo ganan poder. Determinista:
 * el servidor puede reconstruir la copia desde id+tier (PvP online).
 */
export function materializeCard(card: CardDef, rarity: Rarity): CardDef {
  const tier = RARITY_TIER[rarity] ?? 0;
  if (tier === 0) return card;
  const bonus = RARITY_BONUS[rarity] ?? { power: tier * 2, keyword: 0 };
  const out: CardDef = { ...card, power: card.power + bonus.power, rarity };
  const kw = card.keyword;
  if (bonus.keyword > 0 && kw && kw !== "none" && KEYWORD_META[kw]?.hasValue && card.keywordValue !== undefined) {
    const oldX = card.keywordValue;
    const newX = oldX + bonus.keyword;
    out.keywordValue = newX;
    // SINCRONIZA EL TEXTO CON LA RAREZA: los números del efecto derivan de X
    // (y de 2X en fórmulas dobles: Sobrecarga +2X, Emboscada +2X/+X,
    // Combustión −2X). Sin esto, una «Colmillos Curvos» legendaria (X=2)
    // seguía diciendo «reduce en 1» — reporte del jugador. Determinista:
    // el servidor reconstruye el mismo texto desde id+tier.
    if (newX !== oldX) {
      out.text = out.text
        .replace(new RegExp(`(?<![0-9])${2 * oldX}(?![0-9])`, "g"), String(2 * newX))
        .replace(new RegExp(`(?<![0-9])${oldX}(?![0-9])`, "g"), String(newX));
    }
  }
  return out;
}

/** PTP actual de una carta (base + efectos). */
export function getCurrentPTP(card: CardDef): number {
  return card.power + calculateEffectPoints(card);
}

export interface BalanceInfo {
  cost: number;
  targetPTP: number;
  currentPTP: number;
  delta: number;
  balanced: boolean;
  status: "ok" | "over" | "under";
}

export function getBalanceInfo(card: CardDef, rarity: Rarity = "common"): BalanceInfo {
  const range = getPTPRange(card.cost, rarity);
  const current = getCurrentPTP(card) + RARITY_TIER[rarity] * RARITY_PTP_BONUS_PER_TIER;
  const delta = current - range.target;
  const balanced = current >= range.min && current <= range.max;
  return {
    cost: card.cost,
    targetPTP: range.target,
    currentPTP: current,
    delta,
    balanced,
    status: balanced ? "ok" : delta > 0 ? "over" : "under",
  };
}

export function isCardBalanced(card: CardDef): boolean {
  return getBalanceInfo(card).balanced;
}

export function getBalanceStatusLabel(card: CardDef): string {
  const info = getBalanceInfo(card);
  if (info.status === "ok") return "Balanceada";
  if (info.status === "over") return `Sobre-balanceada (+${info.delta.toFixed(1)})`;
  return `Sub-balanceada (${info.delta.toFixed(1)})`;
}

/** Resumen de balance de un mazo completo. */
export function getDeckBalanceSummary(cards: CardDef[]): {
  balanced: number;
  over: number;
  under: number;
  details: { name: string; status: string }[];
} {
  let balanced = 0;
  let over = 0;
  let under = 0;
  const details: { name: string; status: string }[] = [];
  for (const card of cards) {
    const info = getBalanceInfo(card);
    if (info.status === "ok") balanced++;
    else if (info.status === "over") over++;
    else under++;
    details.push({ name: card.name, status: getBalanceStatusLabel(card) });
  }
  return { balanced, over, under, details };
}
