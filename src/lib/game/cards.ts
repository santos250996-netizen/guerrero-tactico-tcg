import type { CardDef } from "./types";

// ============================================================================
// PACTO DE GUERRA TCG — MAZO DE PRUEBA V2 (12 cartas, spec aprobada 2026-10)
// ============================================================================
// 6 keywords neutrales + 6 keywords de Guerrero (2 por spec), todas las cartas
// llevan exactamente una keyword y los 4 triggers están cubiertos:
//
//   ARMAS (4):       Mandoble Quebrantamuros (Hender Armadura on_play)
//                    Espada del Duelista      (Duelista start_turn)
//                    Amoladora de Campamento  (Fervor start_turn)
//                    Cuerno de Guerra         (Fortaleza end_turn)
//   PROTECCIÓN (4):  Adarga del Centinela     (Coraza on_play)
//                    Estandarte de la Cohorte (Amparo on_play)
//                    Oración del Bastión      (Purificación start_turn)
//                    Martillo del Veterano    (Insignia on_play)
//   FURIA (4):       Berserker Recluta        (Ímpetu on_play)
//                    Colmillo del Verdugo     (Crueldad end_turn)
//                    Hacha de Ejecución       (Remate on_play — fuente de destrucción)
//                    Veterano Caído           (Legado on_death)
//
// Curva de costes: 1×2, 2×3, 3×5, 4×1, 5×1 (energía = nº de turno, 6 turnos).
// Cadena de muerte testeable: Hacha de Ejecución remata (≤2) → si mata al
// Veterano Caído rival → su Legado dispara.
// ============================================================================

export const ALL_CARDS: CardDef[] = [
  // ------------------------- CARRIL ARMAS -------------------------
  {
    id: "mandoble_quebrantamuros",
    name: "Mandoble Quebrantamuros",
    category: "Ataque",
    subtypes: ["armas"],
    cost: 5,
    power: 5,
    text: "Al Jugar: reduce en 3 el poder del enemigo más fuerte de este carril. Los escudos no lo impiden.",
    effectId: "hender_armadura",
    keyword: "hender_armadura",
    keywordValue: 3,
    rarity: "rare",
    trigger: "on_play",
  },
  {
    id: "espada_del_duelista",
    name: "Espada del Duelista",
    category: "Ataque",
    subtypes: ["armas"],
    cost: 3,
    power: 3,
    text: "Inicio de Turno: gana +1 mientras sea tu única carta en este carril.",
    effectId: "duelista",
    keyword: "duelista",
    keywordValue: 1,
    rarity: "epic",
    trigger: "start_turn",
  },
  {
    id: "amoladora_de_campamento",
    name: "Amoladora de Campamento",
    category: "Ítem",
    subtypes: ["armas"],
    cost: 1,
    power: 1,
    text: "Inicio de Turno: gana +1 de poder permanente.",
    effectId: "fervor",
    keyword: "fervor",
    keywordValue: 1,
    rarity: "rare",
    trigger: "start_turn",
  },
  {
    id: "cuerno_de_guerra",
    name: "Cuerno de Guerra",
    category: "Acción",
    subtypes: ["armas"],
    cost: 3,
    power: 2,
    text: "Fin de Turno: todas tus cartas de este carril ganan +1.",
    effectId: "fortaleza",
    keyword: "fortaleza",
    keywordValue: 1,
    rarity: "legendary",
    trigger: "end_turn",
  },

  // ----------------------- CARRIL PROTECCIÓN -----------------------
  {
    id: "adarga_del_centinela",
    name: "Adarga del Centinela",
    category: "Ítem",
    subtypes: ["proteccion"],
    cost: 2,
    power: 1,
    text: "Al Jugar: gana un escudo que absorbe las próximas 3 reducciones de poder.",
    effectId: "coraza",
    keyword: "coraza",
    keywordValue: 3,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "estandarte_de_la_cohorte",
    name: "Estandarte de la Cohorte",
    category: "Ítem",
    subtypes: ["proteccion"],
    cost: 3,
    power: 2,
    text: "Al Jugar: tus demás cartas de este carril ganan un escudo de 2.",
    effectId: "amparo",
    keyword: "amparo",
    keywordValue: 2,
    rarity: "epic",
    trigger: "on_play",
  },
  {
    id: "oracion_del_bastion",
    name: "Oración del Bastión",
    category: "Acción",
    subtypes: ["proteccion"],
    cost: 3,
    power: 2,
    text: "Inicio de Turno: elimina las reducciones de poder acumuladas de tus cartas en este carril.",
    effectId: "purificacion",
    keyword: "purificacion",
    rarity: "epic",
    trigger: "start_turn",
  },
  {
    id: "martillo_del_veterano",
    name: "Martillo del Veterano",
    category: "Ataque",
    subtypes: ["proteccion"],
    cost: 3,
    power: 3,
    text: "Al Jugar: otorga +3 de poder permanente al aliado más débil de este carril.",
    effectId: "insignia",
    keyword: "insignia",
    keywordValue: 3,
    rarity: "common",
    trigger: "on_play",
  },

  // ------------------------- CARRIL FURIA -------------------------
  {
    id: "berserker_recluta",
    name: "Berserker Recluta",
    category: "Ataque",
    subtypes: ["furia"],
    cost: 2,
    power: 2,
    text: "Al Jugar: gana +1 por cada carta que hayas jugado este turno (incluida esta).",
    effectId: "impetu",
    keyword: "impetu",
    keywordValue: 1,
    rarity: "rare",
    trigger: "on_play",
  },
  {
    id: "colmillo_del_verdugo",
    name: "Colmillo del Verdugo",
    category: "Ataque",
    subtypes: ["furia"],
    cost: 4,
    power: 4,
    text: "Fin de Turno: reduce en 1 el poder del enemigo más débil de este carril.",
    effectId: "crueldad",
    keyword: "crueldad",
    keywordValue: 1,
    rarity: "epic",
    trigger: "end_turn",
  },
  {
    id: "hacha_de_ejecucion",
    name: "Hacha de Ejecución",
    category: "Ataque",
    subtypes: ["furia"],
    cost: 1,
    power: 1,
    text: "Al Jugar: destruye una carta enemiga de este carril con poder 2 o menos.",
    effectId: "remate",
    keyword: "remate",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "veterano_caido",
    name: "Veterano Caído",
    category: "Ataque",
    subtypes: ["furia"],
    cost: 2,
    power: 3,
    text: "Último Aliento: el aliado más débil de este carril gana +3 de poder permanente.",
    effectId: "legado",
    keyword: "legado",
    keywordValue: 3,
    rarity: "epic",
    trigger: "on_death",
  },
];

/** Default deck for new games = mazo espejo de prueba (IA y jugador usan el mismo). */
export const WARRIOR_DECK: CardDef[] = ALL_CARDS;

/** Preset decks shown in the DeckEditor dropdown. */
export const PRESET_DECKS: { id: string; name: string; emoji: string; description: string; cards: CardDef[] }[] = [
  {
    id: "preset_test_mirror",
    name: "Mazo de Prueba — Espejo",
    emoji: "⚔️",
    description: "12 cartas con las 12 keywords V2 y los 4 triggers. Ideal para testear el engine.",
    cards: ALL_CARDS,
  },
];

/** Legacy rarity filters. */
export const BASIC_CARDS: CardDef[] = ALL_CARDS.filter((c) => c.cost <= 2);
export const TACTICAL_CARDS: CardDef[] = ALL_CARDS.filter((c) => c.cost >= 3);

/**
 * Build a draw pile from a deck (clones each card with fresh uid + handBonus).
 */
export function buildDrawPileFrom(deck: CardDef[]): CardDef[] {
  return deck.map((c) => ({ ...c }));
}
