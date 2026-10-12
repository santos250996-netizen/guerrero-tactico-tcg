// Core game types for WoW TCG - Guerrero Táctico

export type CardCategory = "Ataque" | "Ítem" | "Magia";

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
  | "avatar_titan"; // +1 por carta en mesa

export interface CardDef {
  id: string;
  name: string;
  category: CardCategory;
  subtypes: Subtype[];
  cost: number;
  power: number;
  text: string;
  effectId: EffectId;
}

export interface BoardCard {
  uid: string; // unique instance id on the board
  defId: string;
  name: string;
  category: CardCategory;
  subtypes: Subtype[];
  cost: number;
  basePower: number;
  currentPower: number;
  text: string;
  effectId: EffectId;
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
  {
    title: string;
    emoji: string;
    color: string;
    bonusCategory: CardCategory;
    bonusValue: number;
    bonusLabel: string;
  }
> = {
  armas: {
    title: "ARMAS",
    emoji: "⚔️",
    color: "amber",
    bonusCategory: "Ataque",
    bonusValue: 3,
    bonusLabel: "Ataque +3",
  },
  proteccion: {
    title: "PROTECCIÓN",
    emoji: "🛡️",
    color: "sky",
    bonusCategory: "Ítem",
    bonusValue: 3,
    bonusLabel: "Ítem +3",
  },
  furia: {
    title: "FURIA",
    emoji: "🔥",
    color: "rose",
    bonusCategory: "Magia",
    bonusValue: 3,
    bonusLabel: "Magia +3",
  },
};

export const CATEGORY_META: Record<
  CardCategory,
  {
    color: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    label: string;
  }
> = {
  Ataque: {
    color: "rose",
    bgClass: "bg-rose-500/15",
    textClass: "text-rose-300",
    borderClass: "border-rose-500/40",
    label: "ATAQUE",
  },
  Ítem: {
    color: "sky",
    bgClass: "bg-sky-500/15",
    textClass: "text-sky-300",
    borderClass: "border-sky-500/40",
    label: "ÍTEM",
  },
  Magia: {
    color: "violet",
    bgClass: "bg-violet-500/15",
    textClass: "text-violet-300",
    borderClass: "border-violet-500/40",
    label: "MAGIA",
  },
};
