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
  | "colera_titan" | "despertar_bélico" | "trono_hierro";

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
