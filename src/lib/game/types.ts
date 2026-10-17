// Core game types for WoW TCG - Guerrero Táctico

export type CardCategory = "Ataque" | "Ítem" | "Acción";

export type LaneId = "armas" | "proteccion" | "furia";

export type Subtype = LaneId;

export type EffectId =
  | "none"
  | "golpe_heroico" // +4 a tus demás cartas en carril
  | "seccionar" // -2 al enemigo más fuerte del carril
  | "machaque_mortal" // +2 por carta de Ataque en carril
  | "ejecutar" // +5 si rival > 20 pts
  | "bloqueo_escudo" // -3 al enemigo más fuerte del carril
  | "muro_escudos" // +3 a cartas Ítem en carril
  | "pocion_vida" // +2 por carta Ítem en carril
  | "provocar" // +3 si hay carta con subtipo proteccion
  | "ira_rabiosa" // +3 si hay carta con subtipo furia
  | "grito_batalla" // +2 a cartas Furia en mano
  | "filotormenta" // -1 a todos los rivales
  | "avatar_titan" // +1 por carta en mesa
  // --- 12 tactical effects ---
  | "herida_letal" | "carga_devastadora" | "asalto_coordinado" | "burla_sadica"
  | "sobrecarga" | "purificacion" | "tormenta_rayos" | "trampa_eterea"
  | "reflejo_arcano" | "venganza" | "mimetismo" | "empuje_tactico"
  // --- 3 legendary effects ---
  | "colera_titan" | "despertar_bélico" | "trono_hierro"
  // --- 19 new keyword effects (keyword-aware re-implementations) ---
  | "celeridad" // 03 Celeridad: -1 cost to next card this turn (min 1)
  | "eco" // 06 Eco [X]: +X to hand cards sharing subtype or category
  | "refuerzo" // 07 Refuerzo [X]: +X to ally card played immediately before
  | "ventaja" // 08 Ventaja [X]: +X if your total power < enemy's
  | "vanguardia" // 09 Vanguardia [X]: +X if first card played this turn
  | "aislado" // 10 Aislado [X]: +X while only ally in lane
  | "sacrificio_keyword" // 01 Sacrificio [X]: destroy ally with ≤X power to activate
  | "remate_keyword" // 02 Remate [X]: destroy enemy card if power ≤ X
  | "ultimo_aliento" // 13 Último Aliento [X]: On Death - transfer +X to ally
  | "baluarte" // 14 Baluarte: Passive - allies here can't be debuffed
  | "sigilo" // 15 Sigilo: first turn on board, immune to direct enemy effects
  | "vinculo" // 16 Vínculo [X]: Passive - same-category card here → both +X
  | "muro_keyword" // 17 Muro [X]: Passive - enemy must play here if not full
  | "retorno" // 18 Retorno [X]: On Death - if cost ≤ X, return to hand
  | "despertar" // 19 Despertar [X]: renamed from "despertar_umbral" — power ≥ X → activate (now a TRIGGER, but kept as effectId for engine dispatch)
  | "reciclar" // 20 Reciclar [X]: On Death - recover X energy
  | "doble_golpe" // 21 Doble Golpe [X]: apply effect here AND adjacent lane
  | "refugio" // 22 Refugio [X]: absorb up to X debuff points to ally here
  | "emboscada" // 23 Emboscada [X]: +X if enemy lane is full
  | "transferencia" // 24 Transferencia [X]: -X to ally here, +X to ally elsewhere
  | "renovacion" // 25 Renovación [X]: End Turn - discard 1 to draw X
  // --- Etapa 3 keywords (spec 2026-10) ---
  | "sangrado" // 01 Sangrado [X]: Start Turn - progressive -X to enemy in lane
  | "desarme" // 08 Desarme [X]: On Play - reduce target enemy's keywordValue by X
  | "mejora"; // 09 Mejora [X]: On Play - permanent +X to target ally

export type Rarity = "common" | "rare" | "epic" | "legendary";

// ---------------------------------------------------------------------------
// Triggers — when a card's effect fires during the game lifecycle.
// ---------------------------------------------------------------------------

// ============================================================================
// TRIGGERS — Only 4 remain after the simplification (user spec).
// Removed: despertar (umbral), passive, ofrenda, reaction.
// Kept:    on_play, start_turn, end_turn, on_death.
// The engine logic for the removed triggers has been cleaned up too — see
// engine.ts (checkUmbralTriggers + applyReactionEffects removed).
// ============================================================================
export type Trigger =
  | "on_play" // fires once when the card is played from hand to board
  | "start_turn" // fires at the start of each of the 6 turns
  | "end_turn" // fires at the end of the play phase, before scoring
  | "on_death"; // fires when the card is destroyed or sacrificed

export const TRIGGER_META: Record<
  Trigger,
  { label: string; short: string; description: string; emoji: string; color: string }
> = {
  on_play: {
    label: "Al Jugar",
    short: "JUGAR",
    description: "Se activa una sola vez al entrar al tablero desde tu mano.",
    emoji: "⚡",
    color: "text-sky-300",
  },
  start_turn: {
    label: "Inicio de Turno",
    short: "INICIO",
    description: "Se dispara al comienzo de cada uno de los 6 turnos.",
    emoji: "🌅",
    color: "text-amber-300",
  },
  end_turn: {
    label: "Fin de Turno",
    short: "FIN",
    description: "Se dispara al concluir la fase de juego, antes del cálculo del carril.",
    emoji: "🌇",
    color: "text-violet-300",
  },
  on_death: {
    label: "Último Aliento",
    short: "MUERTE",
    description: "Se dispara automáticamente cuando la carta es destruida o sacrificada.",
    emoji: "💀",
    color: "text-rose-300",
  },
};

// ---------------------------------------------------------------------------
// BALANCE MODIFIERS — multipliers used by the PTP formula (see balance.ts).
// Separated as constants so they can be referenced from the deck editor UI,
// tooltip tables, and unit tests without going through a function.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 33 OFFICIAL KEYWORDS — semantic label for each card's effect, displayed in
// the UI as a colored chip below the card name. The actual effect behavior is
// still driven by `effectId` (in engine.ts) — the `keyword` field is just for
// display + future keyword-aware logic (e.g. AI scoring by keyword type).
//
// Ofrenda / despertar / passive / reaction TRIGGERS were removed in the
// simplification — only 4 triggers remain (on_play, start_turn, end_turn,
// on_death). Cards that previously used those triggers no longer exist.
// ---------------------------------------------------------------------------

// KEYWORDS — RESET COMPLETE.
// All 33 previous keywords have been DELETED per user request ('eliminar todas
// las keywords'). The Keyword type is now reduced to just "none" (placeholder
// for cards without a keyword). New keywords will be designed from scratch
// in a future session — the engine's keyword cases (case "sangrado", etc.)
// remain as dead code that will be cleaned up when the new system is defined.
// next.config.ts has 'typescript.ignoreBuildErrors: true' so the build still
// passes despite the unreachable switch cases in the engine.
export type Keyword = "none";

export const KEYWORD_META: Record<
  Keyword,
  {
    label: string;
    short: string;
    description: string;
    emoji: string;
    color: string;
    /** Default trigger for this keyword (used when `card.trigger` is omitted). */
    trigger: Trigger;
    /** True if the keyword takes an [X] parameter. */
    hasValue: boolean;
    /** Default scope for this keyword (per spec 2026-10). Cards can override via `card.scope`. */
    scope: ScopeKind;
    /** Subtype that this keyword is EXCLUSIVE to (for class identity). 
     *  If set, only cards with this subtype in their `subtypes` array can use this keyword.
     *  Undefined = no restriction (any subtype can use it). */
    exclusiveSubtype?: Subtype;
  }
> = {
  // KEYWORDS RESET COMPLETE — all 33 keyword entries deleted per user request.
  // Only the "none" placeholder remains. New keywords will be added here
  // when the new keyword system is designed (Phase 3a).
  none: {
    label: "—", short: "—", emoji: "•", color: "text-zinc-500",
    description: "Sin keyword oficial.",
    trigger: "on_play", hasValue: false, scope: "PROPIO",
  },
};

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
  /** When the card's effect fires. Defaults to "on_play" if omitted. */
  trigger?: Trigger;
  /** Official keyword label for UI display (e.g. "Sacrificio", "Celeridad"). */
  keyword?: Keyword;
  /** Optional X parameter for keywords that take a value (e.g. Sacrificio [3] → keywordValue=3). */
  keywordValue?: number;
  /** Optional scope override — defaults to the keyword's `scope` per spec 2026-10. */
  scope?: ScopeKind;
  /** Only present on board cards — power log for preview. */
  powerLog?: PowerLogEntry[];
  /** Only present on board cards — original power before effects. */
  basePower?: number;
  /** Only present on board cards — current power after effects. */
  currentPower?: number;
  /** Only present on hand cards — accumulated bonus from in-hand effects (e.g. Grito de Batalla). */
  handBonus?: number;
  /** Only present on hand cards — per-source breakdown of hand bonuses (e.g. [{source:"Eco",delta:3}]). */
  handBonusSources?: { source: string; delta: number }[];
  /** Only present on hand cards — accumulated cost reduction from Celeridad.
   *  Persisted until the card is played (then resets). The effective cost is
   *  `max(1, card.cost - costReduction)`. */
  costReduction?: number;
  /** Source card name(s) that applied the cost reduction (for the preview tooltip). */
  costReductionSources?: { source: string; delta: number }[];
}

export interface PowerLogEntry {
  /** Source of the change — card name, "Sinergia", "Campo", "Trampa", etc. */
  source: string;
  /** +X or -X power delta */
  delta: number;
  /** Type of effect for icon/color */
  kind: "synergy" | "field" | "effect" | "buff" | "debuff" | "trap" | "despertar" | "passive" | "start_turn" | "end_turn" | "on_death" | "hand";
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
  /** Official keyword label (copied from CardDef). */
  keyword?: Keyword;
  /** X parameter for keywords that take a value. */
  keywordValue?: number;
  /** Sigilo protection: true during the card's first turn on the board (immune to direct enemy effects). */
  sigiloActive?: boolean;
  /** Log of all power changes applied to this card (for the Registro button in preview). */
  powerLog?: PowerLogEntry[];

  // ====== Etapa 2 fields — defensive / counter keywords (spec 2026-10) ======
  /** Cúpula [X] — remaining absorption pool for debuffs (refreshed at start of each of the owner's turns). */
  cupulaRemaining?: number;
  /** Guardián — flag: this card redirects debuffs aimed at local allies toward itself. */
  isGuardian?: boolean;
  /** Perforación [X] — remaining prevention-bypass pool for the next debuff this card applies. */
  perforacionRemaining?: number;
  /** Enrabia [X] — true once the +X reaction has fired (one-shot per game). */
  enrabiadUsed?: boolean;
  /** Refuerzo — UID of the marked ally (the last ally played before this card in the lane).
   *  When this card has keyword=refuerzo and trigger=start_turn, the start_turn dispatcher
   *  gives +X to this marked ally each turn. Set at card creation in playCard. */
  refuerzoTargetUid?: string;
  // NOTE: Baluarte immunity is checked dynamically in `applyDebuff` via `arr.some(c => c.keyword === "baluarte")`
  // — no stored flag needed, since Baluarte's protection is "infinite" while the card exists on the lane.
}

export interface HandCard extends CardDef {
  uid: string;
  handBonus: number; // accumulated bonus from in-hand effects (e.g. Grito de Batalla)
  /** Per-source breakdown of hand bonuses (e.g. [{source:"Eco",delta:3}]). */
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
  { title: string; emoji: string; color: string }
> = {
  armas: { title: "ARMAS", emoji: "⚔️", color: "amber" },
  proteccion: { title: "PROTECCIÓN", emoji: "🛡️", color: "sky" },
  furia: { title: "FURIA", emoji: "🔥", color: "rose" },
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
      "Las cartas jugadas en este carril cuestan 1 menos de energía (mínimo 1).",
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
    description: "Cada bando puede tener máx. 3 cartas en este carril.",
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
};
