import type { CardDef, GameClass } from "./types";
import { CLASS_META } from "./types";

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

// ============================================================================
// MAZO ESPEJO MAGO V3 (12 cartas — Arcana · Fuego · Hielo, curva 1×2 2×3 3×5 4×1 5×1)
// 6 keywords de Mago + las 6 neutrales compartidas. Ver download/keywords-con-efectos-v3.txt
// ============================================================================
export const MAGE_CARDS: CardDef[] = [
  // ------------------------- CARRIL ARCANA -------------------------
  {
    id: "baston_de_estrellas",
    name: "Bastón de Estrellas",
    category: "Ítem",
    subtypes: ["arcana"],
    cost: 3,
    power: 11,
    text: "Al Jugar: gana +2 por cada carta tuya que ya esté en este carril.",
    effectId: "convergencia",
    keyword: "convergencia",
    keywordValue: 2,
    rarity: "rare",
    trigger: "on_play",
  },
  {
    id: "nucleo_inestable",
    name: "Núcleo Inestable",
    category: "Ítem",
    subtypes: ["arcana"],
    cost: 2,
    power: 7,
    text: "Al Jugar: gana +4. Fin de Turno: pierde 2 (la energía se disipa).",
    effectId: "sobrecarga",
    keyword: "sobrecarga",
    keywordValue: 2,
    rarity: "epic",
    trigger: "on_play",
  },
  {
    id: "grimorio_anotado",
    name: "Grimorio Anotado",
    category: "Ítem",
    subtypes: ["arcana"],
    cost: 1,
    power: 3,
    text: "Inicio de Turno: gana +1 de poder permanente.",
    effectId: "fervor",
    keyword: "fervor",
    keywordValue: 1,
    rarity: "common",
    trigger: "start_turn",
  },
  {
    id: "cantico_arcano",
    name: "Cántico Arcano",
    category: "Acción",
    subtypes: ["arcana"],
    cost: 3,
    power: 11,
    text: "Fin de Turno: todas tus cartas de este carril ganan +1.",
    effectId: "fortaleza",
    keyword: "fortaleza",
    keywordValue: 1,
    rarity: "legendary",
    trigger: "end_turn",
  },

  // ------------------------- CARRIL FUEGO -------------------------
  {
    id: "tormenta_de_brasas",
    name: "Tormenta de Brasas",
    category: "Acción",
    subtypes: ["fuego"],
    cost: 3,
    power: 12,
    text: "Al Jugar: reduce en 1 el poder de TODAS las cartas enemigas de este carril.",
    effectId: "llamarada",
    keyword: "llamarada",
    keywordValue: 1,
    rarity: "rare",
    trigger: "on_play",
  },
  {
    id: "salamandra_anciana",
    name: "Salamandra Anciana",
    category: "Ataque",
    subtypes: ["fuego"],
    cost: 2,
    power: 7,
    text: "Último Aliento: reduce en 4 el poder del enemigo más fuerte del carril. Los escudos no lo impiden.",
    effectId: "combustion",
    keyword: "combustion",
    keywordValue: 2,
    rarity: "epic",
    trigger: "on_death",
  },
  {
    id: "antorcha_guia",
    name: "Antorcha Guía",
    category: "Ítem",
    subtypes: ["fuego"],
    cost: 2,
    power: 6,
    text: "Al Jugar: otorga +3 de poder permanente al aliado más débil de este carril.",
    effectId: "insignia",
    keyword: "insignia",
    keywordValue: 3,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "espada_candente",
    name: "Espada Candente",
    category: "Ataque",
    subtypes: ["fuego"],
    cost: 4,
    power: 13,
    text: "Al Jugar: destruye una carta enemiga de este carril con poder 2 o menos.",
    effectId: "remate",
    keyword: "remate",
    keywordValue: 2,
    rarity: "rare",
    trigger: "on_play",
  },

  // ------------------------- CARRIL HIELO -------------------------
  {
    id: "cristal_glacial",
    name: "Cristal Glacial",
    category: "Ítem",
    subtypes: ["hielo"],
    cost: 1,
    power: 3,
    text: "Inicio de Turno: tu escudo se restaura hasta 2 puntos.",
    effectId: "escarcha",
    keyword: "escarcha",
    keywordValue: 2,
    rarity: "epic",
    trigger: "start_turn",
  },
  {
    id: "viento_cortante",
    name: "Viento Cortante",
    category: "Acción",
    subtypes: ["hielo"],
    cost: 3,
    power: 12,
    text: "Fin de Turno: reduce en 1 el poder de TODAS las cartas enemigas de este carril.",
    effectId: "ventisca",
    keyword: "ventisca",
    keywordValue: 1,
    rarity: "rare",
    trigger: "end_turn",
  },
  {
    id: "carapacho_glacial",
    name: "Carapacho Glacial",
    category: "Ítem",
    subtypes: ["hielo"],
    cost: 3,
    power: 10,
    text: "Al Jugar: gana un escudo que absorbe las próximas 3 reducciones de poder.",
    effectId: "coraza",
    keyword: "coraza",
    keywordValue: 3,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "anciano_del_norte",
    name: "Anciano del Norte",
    category: "Ataque",
    subtypes: ["hielo"],
    cost: 5,
    power: 18,
    text: "Último Aliento: el aliado más débil de este carril gana +3 de poder permanente.",
    effectId: "legado",
    keyword: "legado",
    keywordValue: 3,
    rarity: "epic",
    trigger: "on_death",
  },
];

export const MAGE_DECK: CardDef[] = MAGE_CARDS;

// ============================================================================
// MAZO ESPEJO ASESINO V3 (12 cartas — Veneno · Combate · Sigilo, misma curva)
// 6 keywords de Asesino + las 6 neutrales compartidas.
// ============================================================================
export const ROGUE_CARDS: CardDef[] = [
  // ------------------------- CARRIL VENENO -------------------------
  {
    id: "colmillos_curvos",
    name: "Colmillos Curvos",
    category: "Ataque",
    subtypes: ["veneno"],
    cost: 3,
    power: 12,
    text: "Inicio de Turno: reduce en 1 el poder del enemigo más fuerte. El veneno ignora los escudos.",
    effectId: "veneno",
    keyword: "veneno",
    keywordValue: 1,
    rarity: "epic",
    trigger: "start_turn",
  },
  {
    id: "frasco_de_peste",
    name: "Frasco de Peste",
    category: "Ítem",
    subtypes: ["veneno"],
    cost: 2,
    power: 8,
    text: "Fin de Turno: reduce en 1 el poder del enemigo con más reducciones acumuladas (si ninguna tiene, no hace nada).",
    effectId: "contagio",
    keyword: "contagio",
    keywordValue: 1,
    rarity: "rare",
    trigger: "end_turn",
  },
  {
    id: "cultivo_de_hongos",
    name: "Cultivo de Hongos",
    category: "Ítem",
    subtypes: ["veneno"],
    cost: 1,
    power: 3,
    text: "Inicio de Turno: gana +1 de poder permanente.",
    effectId: "fervor",
    keyword: "fervor",
    keywordValue: 1,
    rarity: "common",
    trigger: "start_turn",
  },
  {
    id: "nube_toxica",
    name: "Nube Tóxica",
    category: "Acción",
    subtypes: ["veneno"],
    cost: 3,
    power: 11,
    text: "Fin de Turno: todas tus cartas de este carril ganan +1.",
    effectId: "fortaleza",
    keyword: "fortaleza",
    keywordValue: 1,
    rarity: "legendary",
    trigger: "end_turn",
  },

  // ------------------------- CARRIL COMBATE -------------------------
  {
    id: "bandido_de_la_ruta",
    name: "Bandido de la Ruta",
    category: "Ataque",
    subtypes: ["combate"],
    cost: 2,
    power: 8,
    text: "Al Jugar: gana +2 por cada carta enemiga que ya esté en este carril.",
    effectId: "refriega",
    keyword: "refriega",
    keywordValue: 2,
    rarity: "rare",
    trigger: "on_play",
  },
  {
    id: "estoque_afilado",
    name: "Estoque Afilado",
    category: "Ataque",
    subtypes: ["combate"],
    cost: 3,
    power: 10,
    text: "Al Jugar: reduce en 3 el poder del enemigo más fuerte de este carril. Los escudos lo absorben.",
    effectId: "golpe_certero",
    keyword: "golpe_certero",
    keywordValue: 3,
    rarity: "rare",
    trigger: "on_play",
  },
  {
    id: "capitan_de_milicia",
    name: "Capitán de Milicia",
    category: "Ataque",
    subtypes: ["combate"],
    cost: 3,
    power: 10,
    text: "Al Jugar: otorga +3 de poder permanente al aliado más débil de este carril.",
    effectId: "insignia",
    keyword: "insignia",
    keywordValue: 3,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "sentencia_rapida",
    name: "Sentencia Rápida",
    category: "Acción",
    subtypes: ["combate"],
    cost: 4,
    power: 13,
    text: "Al Jugar: destruye una carta enemiga de este carril con poder 2 o menos.",
    effectId: "remate",
    keyword: "remate",
    keywordValue: 2,
    rarity: "epic",
    trigger: "on_play",
  },

  // ------------------------- CARRIL SIGILO -------------------------
  {
    id: "acechador_nocturno",
    name: "Acechador Nocturno",
    category: "Ataque",
    subtypes: ["sigilo"],
    cost: 2,
    power: 7,
    text: "Al Jugar: gana +4 si es tu primera carta del turno; si no, gana +2.",
    effectId: "emboscada",
    keyword: "emboscada",
    keywordValue: 2,
    rarity: "rare",
    trigger: "on_play",
  },
  {
    id: "cuchilla_del_silencio",
    name: "Cuchilla del Silencio",
    category: "Ataque",
    subtypes: ["sigilo"],
    cost: 3,
    power: 9,
    text: "Al Jugar: destruye la carta enemiga más débil de este carril con poder 2 o menos.",
    effectId: "purga",
    keyword: "purga",
    keywordValue: 2,
    rarity: "epic",
    trigger: "on_play",
  },
  {
    id: "capa_de_sombras",
    name: "Capa de Sombras",
    category: "Ítem",
    subtypes: ["sigilo"],
    cost: 1,
    power: 2,
    text: "Al Jugar: gana un escudo que absorbe las próximas 3 reducciones de poder.",
    effectId: "coraza",
    keyword: "coraza",
    keywordValue: 3,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "maestro_caido",
    name: "Maestro Caído",
    category: "Ataque",
    subtypes: ["sigilo"],
    cost: 5,
    power: 18,
    text: "Último Aliento: el aliado más débil de este carril gana +3 de poder permanente.",
    effectId: "legado",
    keyword: "legado",
    keywordValue: 3,
    rarity: "epic",
    trigger: "on_death",
  },
];

export const ROGUE_DECK: CardDef[] = ROGUE_CARDS;

/** Pool completo V3 (las 36 cartas de las 3 clases) — para auditorías. */
export const ALL_CARDS_V3: CardDef[] = [...ALL_CARDS, ...MAGE_CARDS, ...ROGUE_CARDS];

/** Mazo espejo por clase (jugador e IA usan el mismo). */
export const CLASS_DECKS: Record<GameClass, CardDef[]> = {
  guerrero: WARRIOR_DECK,
  mago: MAGE_DECK,
  asesino: ROGUE_DECK,
};

/**
 * Pool de construcción filtrado por clase: cartas neutrales + las exclusivas
 * de los carriles de esa clase (evita mezclar keywords de clase ajena).
 */
export function cardPoolForClass(cls: GameClass): CardDef[] {
  const lanes = new Set(CLASS_META[cls].lanes);
  return ALL_CARDS_V3.filter(
    (c) => !c.keyword || !c.subtypes.length || c.subtypes.some((s) => lanes.has(s))
  );
}

/** Preset decks shown in the DeckEditor dropdown. */
export const PRESET_DECKS: { id: string; name: string; emoji: string; description: string; cards: CardDef[] }[] = [
  {
    id: "preset_test_mirror",
    name: "Mazo de Prueba — Espejo",
    emoji: "⚔️",
    description: "12 cartas con las 12 keywords V2 y los 4 triggers. Ideal para testear el engine.",
    cards: ALL_CARDS,
  },
  {
    id: "preset_mage_mirror",
    name: "Espejo Mago — Arcana·Fuego·Hielo",
    emoji: "🪄",
    description: "12 cartas con las 6 keywords de Mago V3 + neutrales. Burst puro.",
    cards: MAGE_CARDS,
  },
  {
    id: "preset_rogue_mirror",
    name: "Espejo Asesino — Veneno·Combate·Sigilo",
    emoji: "🗡️",
    description: "12 cartas con las 6 keywords de Asesino V3 + neutrales. Precisión condicional.",
    cards: ROGUE_CARDS,
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
