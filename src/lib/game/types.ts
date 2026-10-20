// Core game types for WoW TCG - Guerrero Táctico

import {
  Swords, Shield, Flame, Zap, Sunrise, Sunset, Skull, Minus,
  TrendingUp, Award, Axe, Sprout, Castle, ShieldOff, ShieldPlus,
  Sparkles, ChevronsUp, Target,
  Wand2, FlameKindling, Snowflake, FlaskConical, EyeOff, Sword,
  Wind, Bug, Crosshair,
  Flag, ShieldCheck, Droplets, Bomb, Hammer, CloudFog, Telescope, Handshake,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type CardCategory = "Ataque" | "Ítem" | "Acción";

/**
 * Los 9 carriles del juego (3 por clase). Cada partida usa SOLO los 3 de la
 * clase elegida — ver CLASS_META más abajo.
 */
export type LaneId =
  | "armas" | "proteccion" | "furia" // Guerrero
  | "arcana" | "fuego" | "hielo" // Mago
  | "veneno" | "combate" | "sigilo"; // Asesino

export type Subtype = LaneId;

export type GameClass = "guerrero" | "mago" | "asesino";

/** Definición de clase: carriles activos + identidad. */
export const CLASS_META: Record<
  GameClass,
  { label: string; tagline: string; lanes: LaneId[]; icon: LucideIcon; color: string }
> = {
  guerrero: {
    label: "Guerrero",
    tagline: "Fuerza · Disciplina · Sangre",
    lanes: ["armas", "proteccion", "furia"],
    icon: Swords,
    color: "amber",
  },
  mago: {
    label: "Mago",
    tagline: "Maná · Elementos · Burst",
    lanes: ["arcana", "fuego", "hielo"],
    icon: Wand2,
    color: "violet",
  },
  asesino: {
    label: "Asesino",
    tagline: "Sigilo · Veneno · Precisión",
    lanes: ["veneno", "combate", "sigilo"],
    icon: EyeOff,
    color: "emerald",
  },
};

// ============================================================================
// TRIGGERS — Only 4 remain after the simplification (user spec).
// Removed: despertar (umbral), passive, ofrenda, reaction.
// Kept:    on_play, start_turn, end_turn, on_death.
// ============================================================================
export type Trigger =
  | "on_play" // fires once when the card is played from hand to board
  | "start_turn" // fires at the start of each of the owner's turns
  | "end_turn" // fires at the end of the owner's play phase, before scoring
  | "on_death"; // fires when the card is destroyed or sacrificed

export const TRIGGER_META: Record<
  Trigger,
  { label: string; short: string; description: string; icon: LucideIcon; color: string }
> = {
  on_play: {
    label: "Al Jugar",
    short: "JUGAR",
    description: "Se activa una sola vez al entrar al tablero desde tu mano.",
    icon: Zap,
    color: "text-sky-300",
  },
  start_turn: {
    label: "Inicio de Turno",
    short: "INICIO",
    description: "Se dispara al comienzo de cada uno de tus turnos.",
    icon: Sunrise,
    color: "text-amber-300",
  },
  end_turn: {
    label: "Fin de Turno",
    short: "FIN",
    description: "Se dispara al concluir tu fase de juego, antes del cálculo del carril.",
    icon: Sunset,
    color: "text-violet-300",
  },
  on_death: {
    label: "Último Aliento",
    short: "MUERTE",
    description: "Se dispara automáticamente cuando la carta es destruida o sacrificada.",
    icon: Skull,
    color: "text-rose-300",
  },
};

/** Multiplier applied to a keyword's Valor_Keyword based on WHEN it fires. */
export const TRIGGER_MODS: Record<Trigger, number> = {
  on_play: 1.0, // Efecto único instantáneo — valor pleno
  start_turn: 1.0, // Se dispara cada inicio de turno
  end_turn: 1.0, // Se dispara cada fin de turno
  on_death: 1.0, // Condicional al morir
};

/** Multiplier applied to a keyword's Valor_Keyword based on WHERE it hits. */
export const SCOPE_MODS = {
  PROPIO: 1.0, // Afecta solo a la propia carta
  CARRIL_LOCAL: 1.2, // Afecta a cartas en su mismo carril
  CARRIL_LOCAL_ADYACENTE: 1.4, // Afecta a su carril y al carril vecino
  MANO: 1.2, // Afecta a cartas que aún están en la mano
  GLOBAL: 1.5, // Afecta a cualquier carril o zona del tablero
} as const;

export type ScopeKind = keyof typeof SCOPE_MODS;

/** Multiplier for keywords that repeat indefinitely (per turn) vs once. */
export const MOD_ONCE_SINGLE = 1.0; // Efecto único (Mod_Once = 1.0)
export const MOD_ONCE_PER_TURN = 0.8; // Efecto que se repite indefinidamente (Mod_Once = 0.8 por turno)

// ============================================================================
// KEYWORD SYSTEM V3 (2026-10) — 24 keywords, diseño aprobado por el usuario.
//
//   6 NEUTRALES (cualquier clase, cualquier carril):
//     Fervor [X] · Coraza [X] · Insignia [X] · Remate [X] · Legado [X] · Fortaleza [X]
//
//   6+1 DE GUERRERO (exclusivas por spec/subtype):
//     ARMAS:        Hender Armadura [X] · Duelista [X] · Orden de Batalla [X]
//     PROTECCIÓN:   Amparo [X] · Purificación · Custodia [X]
//     FURIA:        Ímpetu [X] · Crueldad [X] · Desafío [X]
//
//   6+1 DE MAGO (spec V3 — Burst: poder alto y frágil):
//     ARCANA:  Convergencia [X] · Sobrecarga [X] · Drenar Poder [X]
//     FUEGO:   Llamarada [X] · Combustión [X] · Detonación [X]
//     HIELO:   Escarcha [X] · Ventisca [X] · Ruptura Glacial [X]
//
//   6+1 DE ASESINO (spec V3 — Precisión condicional):
//     VENENO:  Veneno [X] · Contagio [X] · Miasma [X]
//     COMBATE: Refriega [X] · Golpe Certero [X] · Caza Mayor [X]
//     SIGILO:  Emboscada [X] · Purga [X] · Conspiración [X]
//
// TERCERA TANDA (2026-10): 9 keywords nuevas (1 por spec) para los
// segundos mazos de cada clase. Conspiración es la PRIMERA keyword de
// MANO (buffa cartas que aún no han entrado al tablero).
// ============================================================================
export type Keyword =
  | "none"
  // --- 6 neutrales ---
  | "fervor" // Inicio de Turno: +X permanente a sí misma (acumulativo)
  | "coraza" // Al Jugar: escudo propio que absorbe X reducciones (pool finito)
  | "insignia" // Al Jugar: +X permanente al aliado más débil del carril
  | "remate" // Al Jugar: resta X al enemigo más débil del carril; si tiene X o menos, lo destruye
  | "legado" // Último Aliento: +X permanente al aliado más débil del carril
  | "fortaleza" // Fin de Turno: +X a todas tus cartas de este carril
  // --- 6 de Guerrero ---
  | "hender_armadura" // Al Jugar: −X al enemigo más fuerte, IGNORANDO escudos (armas)
  | "duelista" // Inicio de Turno: +X si es tu única carta en el carril (armas)
  | "amparo" // Al Jugar: escudo X a tus demás cartas del carril (protección)
  | "purificacion" // Inicio de Turno: limpia las reducciones acumuladas del carril (protección)
  | "impetu" // Al Jugar: +X por cada carta jugada este turno (furia)
  | "crueldad" // Fin de Turno: −X al enemigo más débil del carril (furia)
  // --- 6 de Mago ---
  | "convergencia" // Al Jugar: +X por cada carta propia ya en el carril (arcana)
  | "sobrecarga" // Al Jugar: +2X; Fin de Turno: −X (powerDecay) (arcana)
  | "llamarada" // Al Jugar: −X a TODOS los enemigos del carril (fuego)
  | "combustion" // Último Aliento: −2X al enemigo más fuerte, IGNORA escudos (fuego)
  | "escarcha" // Inicio de Turno: escudo propio restaurado hasta X (hielo)
  | "ventisca" // Fin de Turno: −X a TODOS los enemigos del carril (hielo)
  // --- 6 de Asesino ---
  | "veneno" // Inicio de Turno: −X al enemigo más fuerte, IGNORA escudos (veneno)
  | "contagio" // Fin de Turno: −X al enemigo con más reducciones acumuladas (veneno)
  | "refriega" // Al Jugar: +X por cada carta ENEMIGA ya en el carril (combate)
  | "golpe_certero" // Al Jugar: −X al enemigo más fuerte (escudos SÍ absorben) (combate)
  | "emboscada" // Al Jugar: +2X si es tu 1ª carta del turno, si no +X (sigilo)
  | "purga" // Al Jugar: destruye la carta enemiga MÁS DÉBIL con poder ≤ X (sigilo)
  // --- 3ª tanda: 1 keyword nueva por spec (mazos 2) ---
  | "orden_batalla" // Al Jugar: +X a esta carta y a tus demás cartas del carril (armas)
  | "custodia" // Inicio de Turno: escudo del aliado más débil restaurado hasta X (protección)
  | "desafio" // Inicio de Turno: +X mientras el carril enemigo supere al tuyo (furia)
  | "drenar_poder" // Al Jugar: gana +X y reduce X al enemigo más fuerte (arcana)
  | "detonacion" // Último Aliento: −X a TODOS los enemigos del carril (fuego)
  | "ruptura_glacial" // Al Jugar: −X al enemigo con más reducciones, IGNORA escudos (hielo)
  | "miasma" // Al Jugar: −X a TODOS los enemigos del carril, IGNORA escudos (veneno)
  | "caza_mayor" // Al Jugar: +2X si el enemigo más fuerte del carril te supera; si no +X (combate)
  | "conspiracion"; // Al Jugar: el resto de tu mano gana +X permanente (sigilo)

/**
 * El effectId de una carta coincide con su keyword (mismo string) — el engine
 * resuelve TODO por keyword. "none" = carta básica sin efecto.
 */
export type EffectId = Keyword;

export const KEYWORD_META: Record<
  Keyword,
  {
    label: string;
    short: string;
    description: string;
    icon: LucideIcon;
    color: string;
    /** Default trigger for this keyword (used when `card.trigger` is omitted). */
    trigger: Trigger;
    /** True if the keyword takes an [X] parameter. */
    hasValue: boolean;
    /** Default scope for this keyword. Cards can override via `card.scope`. */
    scope: ScopeKind;
    /** Subtype exclusivo (identidad de clase/spec). Undefined = neutral. */
    exclusiveSubtype?: Subtype;
  }
> = {
  none: {
    label: "—", short: "—", icon: Minus, color: "text-zinc-500",
    description: "Sin keyword oficial.",
    trigger: "on_play", hasValue: false, scope: "PROPIO",
  },

  // ------------------------------------------------------------------
  // NEUTRALES (cualquier clase) — set A "Fundamentos"
  // ------------------------------------------------------------------
  fervor: {
    label: "Fervor", short: "FERV", icon: TrendingUp, color: "text-zinc-300",
    description: "Al inicio de cada uno de tus turnos, gana +X de poder permanente.",
    trigger: "start_turn", hasValue: true, scope: "PROPIO",
  },
  coraza: {
    label: "Coraza", short: "CORA", icon: Shield, color: "text-zinc-300",
    description: "Al Jugar: gana un escudo que absorbe las próximas X reducciones de poder que reciba (se agota).",
    trigger: "on_play", hasValue: true, scope: "PROPIO",
  },
  insignia: {
    label: "Insignia", short: "INSI", icon: Award, color: "text-zinc-300",
    description: "Al Jugar: otorga +X de poder permanente al aliado más débil de este carril.",
    trigger: "on_play", hasValue: true, scope: "CARRIL_LOCAL",
  },
  remate: {
    label: "Remate", short: "REMA", icon: Axe, color: "text-zinc-300",
    description: "Al Jugar: resta X de poder al enemigo más débil de este carril; si tiene X o menos, lo destruye.",
    trigger: "on_play", hasValue: true, scope: "CARRIL_LOCAL",
  },
  legado: {
    label: "Legado", short: "LEGA", icon: Sprout, color: "text-zinc-300",
    description: "Último Aliento: al morir, el aliado más débil de este carril gana +X de poder permanente.",
    trigger: "on_death", hasValue: true, scope: "CARRIL_LOCAL",
  },
  fortaleza: {
    label: "Fortaleza", short: "FORT", icon: Castle, color: "text-zinc-300",
    description: "Fin de Turno: todas tus cartas de este carril ganan +X.",
    trigger: "end_turn", hasValue: true, scope: "CARRIL_LOCAL",
  },

  // ------------------------------------------------------------------
  // DE CLASE GUERRERO — exclusivas por spec
  // ------------------------------------------------------------------
  hender_armadura: {
    label: "Hender Armadura", short: "HEND", icon: ShieldOff, color: "text-amber-300",
    description: "Al Jugar: reduce en X el poder del enemigo más fuerte de este carril. Los escudos no lo impiden.",
    trigger: "on_play", hasValue: true, scope: "CARRIL_LOCAL",
    exclusiveSubtype: "armas",
  },
  duelista: {
    label: "Duelista", short: "DUEL", icon: Swords, color: "text-amber-300",
    description: "Inicio de Turno: gana +X mientras sea tu única carta en este carril.",
    trigger: "start_turn", hasValue: true, scope: "PROPIO",
    exclusiveSubtype: "armas",
  },
  amparo: {
    label: "Amparo", short: "AMPA", icon: ShieldPlus, color: "text-sky-300",
    description: "Al Jugar: tus demás cartas de este carril ganan un escudo de X puntos (se agota).",
    trigger: "on_play", hasValue: true, scope: "CARRIL_LOCAL",
    exclusiveSubtype: "proteccion",
  },
  purificacion: {
    label: "Purificación", short: "PURI", icon: Sparkles, color: "text-sky-300",
    description: "Inicio de Turno: elimina las reducciones de poder acumuladas de tus cartas en este carril.",
    trigger: "start_turn", hasValue: false, scope: "CARRIL_LOCAL",
    exclusiveSubtype: "proteccion",
  },
  impetu: {
    label: "Ímpetu", short: "ÍMPE", icon: ChevronsUp, color: "text-rose-300",
    description: "Al Jugar: gana +X por cada carta que hayas jugado este turno (incluida esta).",
    trigger: "on_play", hasValue: true, scope: "PROPIO",
    exclusiveSubtype: "furia",
  },
  crueldad: {
    label: "Crueldad", short: "CRUE", icon: Target, color: "text-rose-300",
    description: "Fin de Turno: reduce en X el poder del enemigo más débil de este carril.",
    trigger: "end_turn", hasValue: true, scope: "CARRIL_LOCAL",
    exclusiveSubtype: "furia",
  },

  // ------------------------------------------------------------------
  // DE CLASE MAGO — exclusivas por spec (V3, Burst)
  // ------------------------------------------------------------------
  convergencia: {
    label: "Convergencia", short: "CONV", icon: Sparkles, color: "text-violet-300",
    description: "Al Jugar: gana +X por cada carta tuya que ya esté en este carril.",
    trigger: "on_play", hasValue: true, scope: "PROPIO",
    exclusiveSubtype: "arcana",
  },
  sobrecarga: {
    label: "Sobrecarga", short: "SOBR", icon: Zap, color: "text-violet-300",
    description: "Al Jugar: gana +2X de poder. Fin de Turno: pierde X (la energía se disipa).",
    trigger: "on_play", hasValue: true, scope: "PROPIO",
    exclusiveSubtype: "arcana",
  },
  llamarada: {
    label: "Llamarada", short: "LLAM", icon: FlameKindling, color: "text-orange-300",
    description: "Al Jugar: reduce en X el poder de TODAS las cartas enemigas de este carril.",
    trigger: "on_play", hasValue: true, scope: "CARRIL_LOCAL",
    exclusiveSubtype: "fuego",
  },
  combustion: {
    label: "Combustión", short: "COMB", icon: Flame, color: "text-orange-300",
    description: "Último Aliento: reduce en 2X el poder del enemigo más fuerte del carril. Los escudos no lo impiden.",
    trigger: "on_death", hasValue: true, scope: "CARRIL_LOCAL",
    exclusiveSubtype: "fuego",
  },
  escarcha: {
    label: "Escarcha", short: "ESCA", icon: Snowflake, color: "text-cyan-300",
    description: "Inicio de Turno: tu escudo se restaura hasta X puntos (renovable, a diferencia de Coraza).",
    trigger: "start_turn", hasValue: true, scope: "PROPIO",
    exclusiveSubtype: "hielo",
  },
  ventisca: {
    label: "Ventisca", short: "VENT", icon: Wind, color: "text-cyan-300",
    description: "Fin de Turno: reduce en X el poder de TODAS las cartas enemigas de este carril.",
    trigger: "end_turn", hasValue: true, scope: "CARRIL_LOCAL",
    exclusiveSubtype: "hielo",
  },

  // ------------------------------------------------------------------
  // DE CLASE ASESINO — exclusivas por spec (V3, Precisión condicional)
  // ------------------------------------------------------------------
  veneno: {
    label: "Veneno", short: "VENE", icon: FlaskConical, color: "text-lime-300",
    description: "Inicio de Turno: reduce en X el poder del enemigo más fuerte. El veneno ignora los escudos.",
    trigger: "start_turn", hasValue: true, scope: "CARRIL_LOCAL",
    exclusiveSubtype: "veneno",
  },
  contagio: {
    label: "Contagio", short: "CONT", icon: Bug, color: "text-lime-300",
    description: "Fin de Turno: reduce en X el poder del enemigo con más reducciones acumuladas (si ninguna tiene, no hace nada).",
    trigger: "end_turn", hasValue: true, scope: "CARRIL_LOCAL",
    exclusiveSubtype: "veneno",
  },
  refriega: {
    label: "Refriega", short: "REFR", icon: Sword, color: "text-red-300",
    description: "Al Jugar: gana +X por cada carta enemiga que ya esté en este carril.",
    trigger: "on_play", hasValue: true, scope: "PROPIO",
    exclusiveSubtype: "combate",
  },
  golpe_certero: {
    label: "Golpe Certero", short: "CERT", icon: Crosshair, color: "text-red-300",
    description: "Al Jugar: reduce en X el poder del enemigo más fuerte de este carril. Los escudos lo absorben (golpe honesto).",
    trigger: "on_play", hasValue: true, scope: "CARRIL_LOCAL",
    exclusiveSubtype: "combate",
  },
  emboscada: {
    label: "Emboscada", short: "EMBO", icon: EyeOff, color: "text-indigo-300",
    description: "Al Jugar: gana +2X si es tu primera carta del turno; si no, gana +X.",
    trigger: "on_play", hasValue: true, scope: "PROPIO",
    exclusiveSubtype: "sigilo",
  },
  purga: {
    label: "Purga", short: "PURG", icon: Skull, color: "text-indigo-300",
    description: "Al Jugar: destruye la carta enemiga más débil de este carril con poder ≤ X.",
    trigger: "on_play", hasValue: true, scope: "CARRIL_LOCAL",
    exclusiveSubtype: "sigilo",
  },

  // ------------------------------------------------------------------
  // 3ª TANDA — 1 keyword nueva por spec (mazos segundos)
  // ------------------------------------------------------------------
  orden_batalla: {
    label: "Orden de Batalla", short: "ORDE", icon: Flag, color: "text-amber-300",
    description: "Al Jugar: esta carta y tus demás cartas de este carril ganan +X de poder permanente.",
    trigger: "on_play", hasValue: true, scope: "CARRIL_LOCAL",
    exclusiveSubtype: "armas",
  },
  custodia: {
    label: "Custodia", short: "CUST", icon: ShieldCheck, color: "text-sky-300",
    description: "Inicio de Turno: el escudo del aliado más débil de este carril (puede ser ella misma) se restaura hasta X puntos.",
    trigger: "start_turn", hasValue: true, scope: "CARRIL_LOCAL",
    exclusiveSubtype: "proteccion",
  },
  desafio: {
    label: "Desafío", short: "DESA", icon: Flame, color: "text-rose-300",
    description: "Inicio de Turno: gana +X mientras el poder total enemigo de este carril supere al tuyo.",
    trigger: "start_turn", hasValue: true, scope: "PROPIO",
    exclusiveSubtype: "furia",
  },
  drenar_poder: {
    label: "Drenar Poder", short: "DREN", icon: Droplets, color: "text-violet-300",
    description: "Al Jugar: gana +X de poder y reduce en X el poder del enemigo más fuerte de este carril. Los escudos absorben la reducción.",
    trigger: "on_play", hasValue: true, scope: "CARRIL_LOCAL",
    exclusiveSubtype: "arcana",
  },
  detonacion: {
    label: "Detonación", short: "DETO", icon: Bomb, color: "text-orange-300",
    description: "Último Aliento: reduce en X el poder de TODAS las cartas enemigas de este carril.",
    trigger: "on_death", hasValue: true, scope: "CARRIL_LOCAL",
    exclusiveSubtype: "fuego",
  },
  ruptura_glacial: {
    label: "Ruptura Glacial", short: "RUPT", icon: Hammer, color: "text-cyan-300",
    description: "Al Jugar: reduce en X el poder del enemigo con MÁS reducciones acumuladas de este carril. Los escudos no lo impiden.",
    trigger: "on_play", hasValue: true, scope: "CARRIL_LOCAL",
    exclusiveSubtype: "hielo",
  },
  miasma: {
    label: "Miasma", short: "MIAS", icon: CloudFog, color: "text-lime-300",
    description: "Al Jugar: reduce en X el poder de TODAS las cartas enemigas de este carril. El gas ignora los escudos.",
    trigger: "on_play", hasValue: true, scope: "CARRIL_LOCAL",
    exclusiveSubtype: "veneno",
  },
  caza_mayor: {
    label: "Caza Mayor", short: "CAZA", icon: Telescope, color: "text-red-300",
    description: "Al Jugar: gana +2X si la carta enemiga más fuerte de este carril supera el poder base de esta carta; si no, gana +X.",
    trigger: "on_play", hasValue: true, scope: "PROPIO",
    exclusiveSubtype: "combate",
  },
  conspiracion: {
    label: "Conspiración", short: "CONS", icon: Handshake, color: "text-indigo-300",
    description: "Al Jugar: el resto de cartas de tu mano gana +X de poder permanente.",
    trigger: "on_play", hasValue: true, scope: "MANO",
    exclusiveSubtype: "sigilo",
  },
};

export type Rarity = "common" | "rare" | "epic" | "legendary" | "mythic";

export interface CardDef {
  id: string;
  name: string;
  category: CardCategory;
  subtypes: Subtype[];
  cost: number;
  power: number;
  text: string;
  effectId: EffectId;
  rarity: Rarity;
  /** When the card's effect fires. Defaults to the keyword's default trigger if omitted. */
  trigger?: Trigger;
  /** Official keyword (drives the engine + UI badge). */
  keyword?: Keyword;
  /** Optional X parameter for keywords that take a value (e.g. Remate [2] → keywordValue=2). */
  keywordValue?: number;
  /** Optional scope override — defaults to the keyword's `scope`. */
  scope?: ScopeKind;
  /** Only present on board cards — original power before effects. */
  basePower?: number;
  /** Only present on board cards — current power after effects. */
  currentPower?: number;
  /** Only present on board cards — power log for preview. */
  powerLog?: PowerLogEntry[];
  /** Only present on hand cards — accumulated bonus from in-hand effects. */
  handBonus?: number;
  /** Only present on hand cards — per-source breakdown of hand bonuses. */
  handBonusSources?: { source: string; delta: number }[];
  /** Only present on hand cards — accumulated cost reduction (future keywords). */
  costReduction?: number;
  /** Source card name(s) that applied the cost reduction. */
  costReductionSources?: { source: string; delta: number }[];
}

export interface PowerLogEntry {
  /** Source of the change — card name, "Sinergia", "Campo", etc. */
  source: string;
  /** +X or -X power delta */
  delta: number;
  /** Type of effect for icon/color */
  kind: "synergy" | "field" | "effect" | "buff" | "debuff" | "trap" | "passive" | "start_turn" | "end_turn" | "on_death" | "hand";
}

export interface BoardCard {
  uid: string;
  defId: string;
  name: string;
  category: CardCategory;
  subtypes: Subtype[];
  cost: number;
  basePower: number;
  currentPower: number;
  text: string;
  effectId: EffectId;
  rarity: Rarity;
  /** When the card's effect fires (copied from the CardDef when the card was played). */
  trigger?: Trigger;
  /** Official keyword (copied from CardDef). */
  keyword?: Keyword;
  /** X parameter for keywords that take a value. */
  keywordValue?: number;
  /** Coraza / Amparo [X] — remaining shield pool (absorbs enemy debuff points; one-shot, no refresh). */
  shieldRemaining?: number;
  /** Sobrecarga [X] — pending one-shot decay applied at end of the owner's turn. */
  powerDecay?: number;
  /** FORMACIÓN DE COMBATE (Guerrero) — bonus acumulado por esta regla sistémica (tope 3). */
  formation?: number;
  /** Running total of debuff points taken from the enemy — Purificación restores exactly this. */
  debuffTaken?: number;
  /** Log of all power changes applied to this card (for the Registro button in preview). */
  powerLog?: PowerLogEntry[];
}

export interface HandCard extends CardDef {
  uid: string;
  handBonus: number;
  /** Per-source breakdown of hand bonuses. */
  handBonusSources?: { source: string; delta: number }[];
}

export interface LaneState {
  player: BoardCard[];
  enemy: BoardCard[];
}

export type GamePhase = "playing" | "enemy" | "ended";

export type GameResult = "WIN" | "LOSS" | "DRAW" | null;

export interface LaneOutcome {
  lane: LaneId;
  playerScore: number;
  enemyScore: number;
  winner: "player" | "enemy" | "draw";
}

export interface FinalResult {
  result: GameResult;
  playerWins: number;
  enemyWins: number;
  draws: number;
  laneOutcomes: LaneOutcome[];
  totalPlayer: number;
  totalEnemy: number;
}

export const LANE_META: Record<
  LaneId,
  { title: string; icon: LucideIcon; color: string }
> = {
  // Guerrero
  armas: { title: "ARMAS", icon: Swords, color: "amber" },
  proteccion: { title: "PROTECCIÓN", icon: Shield, color: "sky" },
  furia: { title: "FURIA", icon: Flame, color: "rose" },
  // Mago
  arcana: { title: "ARCANA", icon: Wand2, color: "violet" },
  fuego: { title: "FUEGO", icon: FlameKindling, color: "orange" },
  hielo: { title: "HIELO", icon: Snowflake, color: "cyan" },
  // Asesino
  veneno: { title: "VENENO", icon: FlaskConical, color: "lime" },
  combate: { title: "COMBATE", icon: Sword, color: "red" },
  sigilo: { title: "SIGILO", icon: EyeOff, color: "indigo" },
};

// ---------------------------------------------------------------------------
// Per-game lane bonuses
// ---------------------------------------------------------------------------

export type LaneBonusKind =
  | "cost_neg" // coste -1 (descuento de energía)
  | "cost_pos" // coste +1 (penalización de energía)
  | "cat_item" // Ítem +3
  | "cat_accion" // Acción +3
  | "cat_ataque" // Ataque +3
  | "limit_1" // Solo 1 por lado (max 1 carta por bando)
  | "cost_only_3" // Solo coste 3 (solo cartas con coste exacto 3)
  | "cost_only_5" // Solo coste 5
  | "cost_only_1" // Solo coste 1
  | "limit_3"; // Solo 3 por lado (max 3 cartas por bando)

export type BonusFlavor = "positive" | "penalty" | "restrictive";

export interface LaneBonus {
  kind: LaneBonusKind;
  label: string; // short label for UI chip (e.g. "Ataque +3")
  description: string; // longer description for tooltip
  flavor: BonusFlavor; // visual style hint
}

export const LANE_BONUS_POOL: LaneBonus[] = [
  {
    kind: "cost_neg",
    label: "Coste -1",
    description:
      "Las cartas jugadas en este carril cuestan 1 menos de energía (las de coste 1 cuestan 0).",
    flavor: "positive",
  },
  {
    kind: "cost_pos",
    label: "Coste +1",
    description: "Las cartas jugadas en este carril cuestan 1 más de energía.",
    flavor: "penalty",
  },
  {
    kind: "cat_item",
    label: "Ítem +3",
    description: "+3 de poder a las cartas de Ítem jugadas en este carril.",
    flavor: "positive",
  },
  {
    kind: "cat_accion",
    label: "Acción +3",
    description: "+3 de poder a las cartas de Acción jugadas en este carril.",
    flavor: "positive",
  },
  {
    kind: "cat_ataque",
    label: "Ataque +3",
    description: "+3 de poder a las cartas de Ataque jugadas en este carril.",
    flavor: "positive",
  },
  {
    kind: "limit_1",
    label: "Solo 1 por lado",
    description: "Cada bando puede tener máx. 1 carta en este carril.",
    flavor: "restrictive",
  },
  {
    kind: "cost_only_3",
    label: "Solo coste 3",
    description: "Solo se pueden jugar cartas con coste exacto 3 en este carril.",
    flavor: "restrictive",
  },
  {
    kind: "cost_only_5",
    label: "Solo coste 5",
    description: "Solo se pueden jugar cartas con coste exacto 5 en este carril.",
    flavor: "restrictive",
  },
  {
    kind: "cost_only_1",
    label: "Solo coste 1",
    description: "Solo se pueden jugar cartas con coste exacto 1 en este carril.",
    flavor: "restrictive",
  },
  {
    kind: "limit_3",
    label: "Solo 3 por lado",
    description: "Cada bando puede tener máx. 3 cartas por bando en este carril.",
    flavor: "restrictive",
  },
];

export type LaneBonuses = Record<LaneId, LaneBonus | null>;

export const CATEGORY_META: Record<
  CardCategory,
  {
    color: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    label: string;
    /** Class for the metallic category button at the bottom of the card */
    buttonClass: string;
    /** Class for the art frame metallic border */
    frameBorder: string;
    /** Tailwind gradient stops for the button face */
    buttonFace: string;
  }
> = {
  Ataque: {
    color: "rose",
    bgClass: "bg-rose-500/15",
    textClass: "text-rose-300",
    borderClass: "border-rose-500/40",
    label: "ATAQUE",
    buttonClass: "border-rose-300/60",
    frameBorder: "border-rose-700/60",
    buttonFace: "from-rose-950 to-rose-900",
  },
  Ítem: {
    color: "sky",
    bgClass: "bg-sky-500/15",
    textClass: "text-sky-300",
    borderClass: "border-sky-500/40",
    label: "ÍTEM",
    buttonClass: "border-sky-300/60",
    frameBorder: "border-sky-700/60",
    buttonFace: "from-sky-950 to-sky-900",
  },
  Acción: {
    color: "violet",
    bgClass: "bg-violet-500/15",
    textClass: "text-violet-300",
    borderClass: "border-violet-500/40",
    label: "ACCIÓN",
    buttonClass: "border-violet-300/60",
    frameBorder: "border-violet-700/60",
    buttonFace: "from-violet-950 to-violet-900",
  },
};

export const RARITY_META: Record<Rarity, {
  label: string; borderClass: string; textClass: string; gemClass: string; glowClass: string; order: number;
}> = {
  common: { label: "Común", borderClass: "border-emerald-500/60", textClass: "text-emerald-300", gemClass: "bg-emerald-400", glowClass: "", order: 0 },
  rare: { label: "Rara", borderClass: "border-sky-500/70", textClass: "text-sky-300", gemClass: "bg-sky-400", glowClass: "shadow-[0_0_10px_rgba(56,189,248,0.25)]", order: 1 },
  epic: { label: "Épica", borderClass: "border-violet-500/70", textClass: "text-violet-300", gemClass: "bg-violet-400", glowClass: "shadow-[0_0_12px_rgba(168,85,247,0.35)]", order: 2 },
  legendary: { label: "Legendaria", borderClass: "border-amber-400/80", textClass: "text-amber-300", gemClass: "bg-amber-400", glowClass: "shadow-[0_0_18px_rgba(251,191,36,0.45)]", order: 3 },
  mythic: { label: "Mítica", borderClass: "border-rose-500/80", textClass: "text-rose-200", gemClass: "bg-rose-400", glowClass: "shadow-[0_0_20px_rgba(244,63,94,0.55)]", order: 4 },
};
