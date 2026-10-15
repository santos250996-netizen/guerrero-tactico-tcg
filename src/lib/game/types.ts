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
  | "despertar_umbral" // 19 Despertar [X]: Umbral - board power ≥ X → activate
  | "reciclar" // 20 Reciclar [X]: On Death - recover X energy
  | "doble_golpe" // 21 Doble Golpe [X]: apply effect here AND adjacent lane
  | "refugio" // 22 Refugio [X]: absorb up to X debuff points to ally here
  | "emboscada" // 23 Emboscada [X]: +X if enemy lane is full
  | "transferencia" // 24 Transferencia [X]: -X to ally here, +X to ally elsewhere
  | "renovacion"; // 25 Renovación [X]: End Turn - discard 1 to draw X

export type Rarity = "common" | "rare" | "epic" | "legendary";

// ---------------------------------------------------------------------------
// Triggers — when a card's effect fires during the game lifecycle.
// ---------------------------------------------------------------------------

export type Trigger =
  | "on_play" // fires once when the card is played from hand to board
  | "passive" // active continuously while the card is on the board
  | "start_turn" // fires at the start of each of the 6 turns
  | "end_turn" // fires at the end of the play phase, before scoring
  | "on_death" // fires when the card is destroyed or sacrificed
  | "umbral"; // fires once per game when its condition is met (e.g. power threshold)

// Optional condition for `umbral` triggers (currently just a power threshold,
// but kept as an object so it can be extended later with other condition types).
export interface UmbralCondition {
  /** Minimum currentPower required to fire the umbral trigger. */
  powerThreshold?: number;
}

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
  passive: {
    label: "Pasivo",
    short: "PASIVO",
    description:
      "Permanece activo mientras la carta esté en la mesa. Se pierde si la carta es destruida.",
    emoji: "♾️",
    color: "text-emerald-300",
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
  umbral: {
    label: "Despertar",
    short: "UMBRAL",
    description:
      "Se activa una sola vez por partida cuando se cumple una condición específica.",
    emoji: "🔥",
    color: "text-fuchsia-300",
  },
};

// ---------------------------------------------------------------------------
// 25 OFFICIAL KEYWORDS — semantic label for each card's effect, displayed in
// the UI as a colored chip below the card name. The actual effect behavior is
// still driven by `effectId` (in engine.ts) — the `keyword` field is just for
// display + future keyword-aware logic (e.g. AI scoring by keyword type).
// ---------------------------------------------------------------------------

export type Keyword =
  // 1. ACTIVACIÓN DIRECTA (ON PLAY)
  | "sacrificio" // 01: destroy ally with ≤X power to activate
  | "remate" // 02: destroy enemy if power ≤ X
  | "celeridad" // 03: -1 cost to next card this turn
  | "sobrecarga" // 04: -1 cost this card, -X energy next turn (re-uses existing sobrecarga effectId)
  | "mimetismo" // 05: copy strongest ally's effect
  // 2. SINERGIA DE MANO Y POSICIÓN
  | "eco" // 06: +X to hand cards sharing subtype/category
  | "refuerzo" // 07: +X to ally played immediately before
  | "ventaja" // 08: +X if your total < enemy's
  | "vanguardia" // 09: +X if first card this turn
  | "aislado" // 10: +X while only ally in lane
  // 3. TABLERO Y TRIGGERS ESPECIALES
  | "trampa" // 11: mark lane, next enemy card here gets -X
  | "reagrupar" // 12: move weakest ally from another lane to here
  | "ultimo_aliento" // 13: ON_DEATH — transfer +X to ally
  | "baluarte" // 14: PASSIVE — allies here can't be debuffed
  | "sigilo" // 15: first turn on board, immune to direct enemy effects
  | "vinculo" // 16: PASSIVE — same-category card here → both +X
  | "muro" // 17: PASSIVE — enemy must play here if not full
  | "retorno" // 18: ON_DEATH — if cost ≤ X, return to hand
  // 4. UMBRALES Y RECURSOS
  | "despertar" // 19: UMBRAL — board power ≥ X → activate
  | "reciclar" // 20: ON_DEATH — recover X energy
  // 5. NUEVAS KEYWORDS TÁCTICAS
  | "doble_golpe" // 21: apply effect here AND adjacent lane
  | "refugio" // 22: absorb up to X debuff points
  | "emboscada" // 23: +X if enemy lane is full (4 cards)
  | "transferencia" // 24: -X to ally here, +X to ally elsewhere
  | "renovacion" // 25: END_TURN — discard 1 to draw X
  | "none"; // for cards without an official keyword (basic cards)

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
  }
> = {
  // 1. ACTIVACIÓN DIRECTA
  sacrificio: {
    label: "Sacrificio", short: "SACR", emoji: "🗡️", color: "text-rose-300",
    description: "Destruye a tu aliado con X o menos de poder para activar un efecto adicional.",
    trigger: "on_play", hasValue: true,
  },
  remate: {
    label: "Remate", short: "REMAT", emoji: "💀", color: "text-rose-300",
    description: "Destruye a una carta enemiga si su poder actual es X o menor.",
    trigger: "on_play", hasValue: true,
  },
  celeridad: {
    label: "Celeridad", short: "CELER", emoji: "💨", color: "text-sky-300",
    description: "Reduce en 1 el coste de energía de la próxima carta que juegues durante este turno (mín. 1).",
    trigger: "on_play", hasValue: false,
  },
  sobrecarga: {
    label: "Sobrecarga", short: "SOBR", emoji: "⚡", color: "text-amber-300",
    description: "Reduce el coste de esta carta en 1, pero resta X de energía en tu próximo turno.",
    trigger: "on_play", hasValue: true,
  },
  mimetismo: {
    label: "Mimetismo", short: "MIMET", emoji: "🪞", color: "text-violet-300",
    description: "Copia el efecto activo de la carta aliada con mayor poder.",
    trigger: "on_play", hasValue: false,
  },
  // 2. SINERGIA DE MANO Y POSICIÓN
  eco: {
    label: "Eco", short: "ECO", emoji: "🔁", color: "text-emerald-300",
    description: "Otorga +X de poder a todas las cartas en tu mano que compartan subtipo o categoría.",
    trigger: "on_play", hasValue: true,
  },
  refuerzo: {
    label: "Refuerzo", short: "REFUER", emoji: "🛡️", color: "text-emerald-300",
    description: "Otorga +X de poder a la carta aliada jugada inmediatamente antes.",
    trigger: "on_play", hasValue: true,
  },
  ventaja: {
    label: "Ventaja", short: "VENT", emoji: "⚖️", color: "text-amber-300",
    description: "Se activa solo si tu poder total es menor al del rival. Gana +X de poder.",
    trigger: "on_play", hasValue: true,
  },
  vanguardia: {
    label: "Vanguardia", short: "VANG", emoji: "🚩", color: "text-sky-300",
    description: "Se activa solo si es la primera carta que juegas en tu turno. Gana +X de poder.",
    trigger: "on_play", hasValue: true,
  },
  aislado: {
    label: "Aislado", short: "AISL", emoji: "🪨", color: "text-zinc-300",
    description: "Gana +X de poder mientras sea tu única carta aliada en el carril.",
    trigger: "on_play", hasValue: true,
  },
  // 3. TABLERO Y TRIGGERS ESPECIALES
  trampa: {
    label: "Trampa", short: "TRAMP", emoji: "🪤", color: "text-amber-300",
    description: "Deja una marca. La próxima carta enemiga jugada en este carril recibe -X de poder.",
    trigger: "on_play", hasValue: true,
  },
  reagrupar: {
    label: "Reagrupar", short: "REAGR", emoji: "↪️", color: "text-emerald-300",
    description: "Mueve a tu aliado con menor poder de otro carril a este carril (solo si hay espacio).",
    trigger: "on_play", hasValue: false,
  },
  ultimo_aliento: {
    label: "Último Aliento", short: "ALIENT", emoji: " exhale", color: "text-rose-300",
    description: "(On Death) Se activa cuando esta carta es destruida o sacrificada. Transfiere +X de poder.",
    trigger: "on_death", hasValue: true,
  },
  baluarte: {
    label: "Baluarte", short: "BALU", emoji: "🏰", color: "text-emerald-300",
    description: "(Pasivo) Tus demás aliados en este carril no pueden sufrir reducciones de poder enemigas.",
    trigger: "passive", hasValue: false,
  },
  sigilo: {
    label: "Sigilo", short: "SIGIL", emoji: "👁️", color: "text-zinc-300",
    description: "Durante su primer turno en mesa, no puede ser objetivo de efectos directos enemigos.",
    trigger: "passive", hasValue: false,
  },
  vinculo: {
    label: "Vínculo", short: "VIN", emoji: "🔗", color: "text-emerald-300",
    description: "(Pasivo) Si hay otra carta de su misma categoría en este carril, ambas ganan +X de poder.",
    trigger: "passive", hasValue: true,
  },
  muro: {
    label: "Muro", short: "MURO", emoji: "🧱", color: "text-amber-300",
    description: "(Pasivo) El rival debe jugar sus cartas en este carril si no ha alcanzado el límite.",
    trigger: "passive", hasValue: false,
  },
  retorno: {
    label: "Retorno", short: "RETN", emoji: "🔄", color: "text-emerald-300",
    description: "(On Death) Al ser destruida o sacrificada, si su coste es X o menor, regresa a tu mano.",
    trigger: "on_death", hasValue: true,
  },
  // 4. UMBRALES Y RECURSOS
  despertar: {
    label: "Despertar", short: "DESP", emoji: "🔥", color: "text-fuchsia-300",
    description: "Al alcanzar o superar X puntos de poder en el tablero, activa su efecto especial.",
    trigger: "umbral", hasValue: true,
  },
  reciclar: {
    label: "Reciclar", short: "RECIC", emoji: "♻️", color: "text-emerald-300",
    description: "(On Death) Al ser destruida o sacrificada, recuperas X de energía.",
    trigger: "on_death", hasValue: true,
  },
  // 5. NUEVAS KEYWORDS TÁCTICAS
  doble_golpe: {
    label: "Doble Golpe", short: "DOBLE", emoji: "⚔️", color: "text-rose-300",
    description: "Aplica su efecto o debuff de valor X en este carril y en un carril adyacente.",
    trigger: "on_play", hasValue: true,
  },
  refugio: {
    label: "Refugio", short: "REFUG", emoji: "⛺", color: "text-emerald-300",
    description: "Absorbe hasta X puntos de debuff o reducción de poder que vaya a sufrir un aliado en este carril.",
    trigger: "passive", hasValue: true,
  },
  emboscada: {
    label: "Emboscada", short: "EMBOS", emoji: "🎯", color: "text-amber-300",
    description: "Gana +X de poder si el rival ya tiene el carril lleno (4 cartas).",
    trigger: "on_play", hasValue: true,
  },
  transferencia: {
    label: "Transferencia", short: "TRANS", emoji: "➡️", color: "text-sky-300",
    description: "Reduce X de poder a un aliado en este carril y se lo otorga a un aliado en otro carril.",
    trigger: "on_play", hasValue: true,
  },
  renovacion: {
    label: "Renovación", short: "RENOV", emoji: "🌙", color: "text-violet-300",
    description: "(End Turn) Si no jugaste ciertas categorías, descarta 1 carta para robar X.",
    trigger: "end_turn", hasValue: true,
  },
  none: {
    label: "—", short: "—", emoji: "•", color: "text-zinc-500",
    description: "Sin keyword oficial.",
    trigger: "on_play", hasValue: false,
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
  /** Optional condition for `umbral` triggers. Ignored for other triggers. */
  umbralCondition?: UmbralCondition;
  /** Official keyword label for UI display (e.g. "Sacrificio", "Celeridad"). */
  keyword?: Keyword;
  /** Optional X parameter for keywords that take a value (e.g. Sacrificio [3] → keywordValue=3). */
  keywordValue?: number;
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
  /** Optional condition for `umbral` triggers. */
  umbralCondition?: UmbralCondition;
  /** True once an umbral trigger has fired for this board card (prevents re-firing). */
  umbralTriggered?: boolean;
  /** Official keyword label (copied from CardDef). */
  keyword?: Keyword;
  /** X parameter for keywords that take a value. */
  keywordValue?: number;
  /** Sigilo protection: true during the card's first turn on the board (immune to direct enemy effects). */
  sigiloActive?: boolean;
}

export interface HandCard extends CardDef {
  uid: string;
  handBonus: number; // accumulated bonus from in-hand effects (e.g. Grito de Batalla)
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
  common: { label: "Común", borderClass: "border-zinc-500/60", textClass: "text-zinc-300", gemClass: "bg-zinc-400", glowClass: "", order: 0 },
  rare: { label: "Rara", borderClass: "border-sky-500/70", textClass: "text-sky-300", gemClass: "bg-sky-400", glowClass: "shadow-[0_0_10px_rgba(56,189,248,0.25)]", order: 1 },
  epic: { label: "Épica", borderClass: "border-violet-500/70", textClass: "text-violet-300", gemClass: "bg-violet-400", glowClass: "shadow-[0_0_12px_rgba(168,85,247,0.35)]", order: 2 },
  legendary: { label: "Legendaria", borderClass: "border-amber-400/80", textClass: "text-amber-300", gemClass: "bg-amber-400", glowClass: "shadow-[0_0_18px_rgba(251,191,36,0.45)]", order: 3 },
};
