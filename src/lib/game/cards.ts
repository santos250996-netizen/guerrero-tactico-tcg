import type { CardDef, GameClass } from "./types";
import { CLASS_META } from "./types";

// ============================================================================
// PACTO DE GUERRA TCG — MAZO DE PRUEBA V2 (12 cartas, spec aprobada 2026-10)
// ============================================================================
// 6 keywords neutrales + 6 keywords de Guerrero (2 por spec), todas las cartas
// llevan exactamente una keyword y los 4 triggers están cubiertos:
//
//   ARMAS (4):       Tajo Quebrantamuros      (Hender Armadura on_play)
//                    Duelista Errante         (Duelista start_turn)
//                    Amoladora de Campamento  (Fervor start_turn)
//                    Toque de Guerra          (Fortaleza end_turn)
//   PROTECCIÓN (4):  Adarga del Centinela     (Coraza on_play)
//                    Abanderado de la Cohorte (Amparo on_play)
//                    Oración del Bastión      (Purificación start_turn)
//                    Guardián Juramentado     (Insignia on_play)
//   FURIA (4):       Berserker Recluta        (Ímpetu on_play)
//                    Colmillo del Verdugo     (Crueldad end_turn)
//                    Hacha de Ejecución       (Remate on_play — Ítem: fuente de destrucción)
//                    Veterano Caído           (Legado on_death — Acción: su caída)
//
// PATRÓN DE DISEÑO (docs/design-pattern-cards.md): el NOMBRE evoca la categoría
// (Ataque = ser/golpe · Ítem = objeto · Acción = hecho/evento) y la spec
// (imaginería del carril). Cada spec = 2 Ataque + 1 Ítem + 1 Acción. El arte se
// deriva de nombre + tipo + spec (public/cards/{id}.webp).
//
// Curva de costes: 1×2, 2×3, 3×5, 4×1, 5×1 (energía = nº de turno, 6 turnos).
// Cadena de muerte testeable: Hacha de Ejecución remata (≤2) → si mata al
// Veterano Caído rival → su Legado dispara.
// ============================================================================

export const ALL_CARDS: CardDef[] = [
  // ------------------------- CARRIL ARMAS -------------------------
  {
    id: "tajo_quebrantamuros",
    name: "Tajo Quebrantamuros",
    category: "Ataque",
    subtypes: ["armas"],
    cost: 5,
    power: 17,
    text: "Al Jugar: reduce en 3 el poder del enemigo más fuerte de este carril. Los escudos no lo impiden.",
    effectId: "hender_armadura",
    keyword: "hender_armadura",
    keywordValue: 3,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "duelista_errante",
    name: "Duelista Errante",
    category: "Ataque",
    subtypes: ["armas"],
    cost: 3,
    power: 11,
    text: "Al Jugar: gana +1. Inicio de Turno: gana +1 más mientras sea tu única carta en este carril.",
    effectId: "duelista",
    keyword: "duelista",
    keywordValue: 1,
    rarity: "common",
    trigger: "start_turn",
  },
  {
    id: "amoladora_de_campamento",
    name: "Amoladora de Campamento",
    category: "Ítem",
    subtypes: ["armas"],
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
    id: "toque_de_guerra",
    name: "Toque de Guerra",
    category: "Acción",
    subtypes: ["armas"],
    cost: 3,
    power: 11,
    text: "Fin de Turno: todas tus cartas de este carril ganan +1.",
    effectId: "fortaleza",
    keyword: "fortaleza",
    keywordValue: 1,
    rarity: "common",
    trigger: "end_turn",
  },

  // ----------------------- CARRIL PROTECCIÓN -----------------------
  {
    id: "adarga_del_centinela",
    name: "Adarga del Centinela",
    category: "Ítem",
    subtypes: ["proteccion"],
    cost: 2,
    power: 6,
    text: "Al Jugar: gana un escudo que absorbe las próximas 3 reducciones de poder.",
    effectId: "coraza",
    keyword: "coraza",
    keywordValue: 3,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "abanderado_de_la_cohorte",
    name: "Abanderado de la Cohorte",
    category: "Ataque",
    subtypes: ["proteccion"],
    cost: 3,
    power: 12,
    text: "Al Jugar: tus demás cartas de este carril ganan un escudo de 2.",
    effectId: "amparo",
    keyword: "amparo",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "oracion_del_bastion",
    name: "Oración del Bastión",
    category: "Acción",
    subtypes: ["proteccion"],
    cost: 3,
    power: 12,
    text: "Inicio de Turno: elimina las reducciones de poder acumuladas de tus cartas en este carril. Si no había ninguna, el aliado más débil gana un escudo de 2.",
    effectId: "purificacion",
    keyword: "purificacion",
    rarity: "common",
    trigger: "start_turn",
  },
  {
    id: "guardian_juramentado",
    name: "Guardián Juramentado",
    category: "Ataque",
    subtypes: ["proteccion"],
    cost: 3,
    power: 10,
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
    power: 8,
    text: "Al Jugar: gana +1 por cada carta que hayas jugado este turno (incluida esta).",
    effectId: "impetu",
    keyword: "impetu",
    keywordValue: 1,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "colmillo_del_verdugo",
    name: "Colmillo del Verdugo",
    category: "Ataque",
    subtypes: ["furia"],
    cost: 4,
    power: 16,
    text: "Fin de Turno: reduce en 1 el poder del enemigo más débil CON PODER de este carril (a 0, la carta cae). Sin presa, esta carta se enfurece y gana +1.",
    effectId: "crueldad",
    keyword: "crueldad",
    keywordValue: 1,
    rarity: "common",
    trigger: "end_turn",
  },
  {
    id: "hacha_de_ejecucion",
    name: "Hacha de Ejecución",
    category: "Ítem",
    subtypes: ["furia"],
    cost: 1,
    power: 1,
    text: "Al Jugar: resta 2 de poder al enemigo más débil de este carril; si tiene 2 o menos, lo destruye.",
    effectId: "remate",
    keyword: "remate",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "veterano_caido",
    name: "Veterano Caído",
    category: "Acción",
    subtypes: ["furia"],
    cost: 2,
    power: 6,
    text: "Último Aliento: el aliado más débil de este carril gana +3 de poder permanente.",
    effectId: "legado",
    keyword: "legado",
    keywordValue: 3,
    rarity: "common",
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
    id: "conjurador_de_estrellas",
    name: "Conjurador de Estrellas",
    category: "Ataque",
    subtypes: ["arcana"],
    cost: 3,
    power: 11,
    text: "Al Jugar: gana +2 por cada carta tuya que ya esté en este carril.",
    effectId: "convergencia",
    keyword: "convergencia",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "aberracion_arcana",
    name: "Aberración Arcana",
    category: "Ataque",
    subtypes: ["arcana"],
    cost: 2,
    power: 8,
    text: "Al Jugar: gana +1 y reduce en 1 el poder del enemigo más fuerte de este carril. Los escudos absorben la reducción.",
    effectId: "drenar_poder",
    keyword: "drenar_poder",
    keywordValue: 1,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "grimorio_anotado",
    name: "Grimorio Anotado",
    category: "Ítem",
    subtypes: ["arcana"],
    cost: 1,
    power: 1,
    text: "Inicio de Turno: gana +2 de poder permanente (cada página leída crece).",
    effectId: "fervor",
    keyword: "fervor",
    keywordValue: 2,
    rarity: "common",
    trigger: "start_turn",
  },
  {
    id: "cantico_arcano",
    name: "Cántico Arcano",
    category: "Acción",
    subtypes: ["arcana"],
    cost: 3,
    power: 9,
    text: "Fin de Turno: todas tus cartas de este carril ganan +2.",
    effectId: "fortaleza",
    keyword: "fortaleza",
    keywordValue: 2,
    rarity: "common",
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
    rarity: "common",
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
    rarity: "common",
    trigger: "on_death",
  },
  {
    id: "farol_igneo",
    name: "Farol Ígneo",
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
    id: "estallido_igneo",
    name: "Estallido Ígneo",
    category: "Ataque",
    subtypes: ["fuego"],
    cost: 4,
    power: 14,
    text: "Al Jugar: gana +4. Fin de Turno: pierde 2 (la energía se disipa).",
    effectId: "sobrecarga",
    keyword: "sobrecarga",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_play",
  },

  // ------------------------- CARRIL HIELO -------------------------
  {
    id: "coloso_de_escarcha",
    name: "Coloso de Escarcha",
    category: "Ataque",
    subtypes: ["hielo"],
    cost: 1,
    power: 3,
    text: "Inicio de Turno: tu escudo se restaura hasta 2 puntos.",
    effectId: "escarcha",
    keyword: "escarcha",
    keywordValue: 2,
    rarity: "common",
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
    rarity: "common",
    trigger: "end_turn",
  },
  {
    id: "carapacho_glacial",
    name: "Carapacho Glacial",
    category: "Ítem",
    subtypes: ["hielo"],
    cost: 3,
    power: 11,
    text: "Al Jugar: gana un escudo que absorbe las próximas 2 reducciones de poder.",
    effectId: "coraza",
    keyword: "coraza",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "anciano_del_norte",
    name: "Anciano del Norte",
    category: "Ataque",
    subtypes: ["hielo"],
    cost: 5,
    power: 16,
    text: "Último Aliento: el aliado más débil de este carril gana +5 de poder permanente.",
    effectId: "legado",
    keyword: "legado",
    keywordValue: 5,
    rarity: "common",
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
    rarity: "common",
    trigger: "start_turn",
  },
  {
    id: "frasco_de_peste",
    name: "Frasco de Peste",
    category: "Ítem",
    subtypes: ["veneno"],
    cost: 2,
    power: 8,
    text: "Fin de Turno: reduce en 1 el poder de TODAS las cartas enemigas de este carril que tengan reducciones acumuladas.",
    effectId: "contagio",
    keyword: "contagio",
    keywordValue: 1,
    rarity: "common",
    trigger: "end_turn",
  },
  {
    id: "vibora_ponzonosa",
    name: "Víbora Ponzoñosa",
    category: "Ataque",
    subtypes: ["veneno"],
    cost: 1,
    power: 2,
    text: "Al Jugar: gana +1 de poder permanente (crece al devorar).",
    effectId: "fervor",
    keyword: "fervor",
    keywordValue: 1,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "nube_toxica",
    name: "Nube Tóxica",
    category: "Acción",
    subtypes: ["veneno"],
    cost: 3,
    power: 6,
    text: "Fin de Turno: todas tus cartas de este carril ganan +3.",
    effectId: "fortaleza",
    keyword: "fortaleza",
    keywordValue: 3,
    rarity: "common",
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
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "estoque_afilado",
    name: "Estoque Afilado",
    category: "Ítem",
    subtypes: ["combate"],
    cost: 3,
    power: 10,
    text: "Al Jugar: reduce en 3 el poder del enemigo más fuerte de este carril. Los escudos lo absorben.",
    effectId: "golpe_certero",
    keyword: "golpe_certero",
    keywordValue: 3,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "capitan_de_milicia",
    name: "Capitán de Milicia",
    category: "Ataque",
    subtypes: ["combate"],
    cost: 3,
    power: 11,
    text: "Al Jugar: otorga +2 de poder permanente al aliado más débil de este carril.",
    effectId: "insignia",
    keyword: "insignia",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "ajuste_de_cuentas",
    name: "Ajuste de Cuentas",
    category: "Acción",
    subtypes: ["combate"],
    cost: 4,
    power: 10,
    text: "Al Jugar: resta 3 de poder al enemigo más débil de este carril; si tiene 3 o menos, lo destruye.",
    effectId: "remate",
    keyword: "remate",
    keywordValue: 3,
    rarity: "common",
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
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "cuchilla_del_silencio",
    name: "Cuchilla del Silencio",
    category: "Ítem",
    subtypes: ["sigilo"],
    cost: 3,
    power: 7,
    text: "Al Jugar: destruye la carta enemiga más débil de este carril con poder 3 o menos. Si no hay ninguna, hiere en 3 a la más fuerte (los escudos no la detienen).",
    effectId: "purga",
    keyword: "purga",
    keywordValue: 3,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "fundirse_en_sombras",
    name: "Fundirse en Sombras",
    category: "Acción",
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
    power: 17,
    text: "Último Aliento: el aliado más débil de este carril gana +4 de poder permanente.",
    effectId: "legado",
    keyword: "legado",
    keywordValue: 4,
    rarity: "common",
    trigger: "on_death",
  },
];

export const ROGUE_DECK: CardDef[] = ROGUE_CARDS;

// ============================================================================
// SEGUNDOS MAZOS (3ª tanda, 2026-10) — 12 cartas nuevas por clase.
//   Guerrero  → COHORTE DE HIERRO   (Orden de Batalla · Custodia · Desafío)
//   Mago      → CÓNCLAVE PRISMÁTICO (Drenar Poder · Detonación · Ruptura Glacial)
//   Asesino   → GREMIO DE LA DAGA   (Miasma · Caza Mayor · Conspiración)
//
// Cada spec estrena 1 keyword nueva; el resto son variantes de las keywords
// existentes con X/trigger/coste distintos. Misma receta que los espejos:
// curva 1×2 2×3 3×5 4×1 5×1 · por spec 2 Ataque + 1 Ítem + 1 Acción ·
// 12 keywords distintas por mazo · TODO calibrado al PTP objetivo (±0.5).
// Ver scripts/test-keywords-v4.ts (composición + PTP 72/72).
// ============================================================================

export const WARRIOR2_CARDS: CardDef[] = [
  // ------------------------- CARRIL ARMAS -------------------------
  {
    id: "legionario_de_vanguardia",
    name: "Legionario de Vanguardia",
    category: "Ataque",
    subtypes: ["armas"],
    cost: 3,
    power: 12,
    text: "Al Jugar: esta carta y tus demás cartas de este carril ganan +1 de poder permanente.",
    effectId: "orden_batalla",
    keyword: "orden_batalla",
    keywordValue: 1,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "quebrantador_de_filas",
    name: "Quebrantador de Filas",
    category: "Ataque",
    subtypes: ["armas"],
    cost: 2,
    power: 7,
    text: "Al Jugar: reduce en 2 el poder del enemigo más fuerte de este carril. Los escudos no lo impiden.",
    effectId: "hender_armadura",
    keyword: "hender_armadura",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "munonera_de_asedio",
    name: "Muñonera de Asedio",
    category: "Ítem",
    subtypes: ["armas"],
    cost: 1,
    power: 3,
    text: "Al Jugar: gana un escudo que absorbe las próximas 2 reducciones de poder.",
    effectId: "coraza",
    keyword: "coraza",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "justicia_de_la_legion",
    name: "Justicia de la Legión",
    category: "Acción",
    subtypes: ["armas"],
    cost: 4,
    power: 8,
    text: "Al Jugar: resta 4 de poder al enemigo más débil de este carril; si tiene 4 o menos, lo destruye.",
    effectId: "remate",
    keyword: "remate",
    keywordValue: 4,
    rarity: "common",
    trigger: "on_play",
  },

  // ----------------------- CARRIL PROTECCIÓN -----------------------
  {
    id: "baluarte_errante",
    name: "Baluarte Errante",
    category: "Ataque",
    subtypes: ["proteccion"],
    cost: 3,
    power: 11,
    text: "Inicio de Turno: el escudo MÁS DAÑADO de este carril (puede no tener) sube hasta 2 puntos.",
    effectId: "custodia",
    keyword: "custodia",
    keywordValue: 2,
    rarity: "common",
    trigger: "start_turn",
  },
  {
    id: "centinela_anclado",
    name: "Centinela Anclado",
    category: "Ataque",
    subtypes: ["proteccion"],
    cost: 2,
    power: 9,
    text: "Al Jugar: tus demás cartas de este carril ganan un escudo de 1.",
    effectId: "amparo",
    keyword: "amparo",
    keywordValue: 1,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "estandarte_de_la_cohorte",
    name: "Estandarte de la Cohorte",
    category: "Ítem",
    subtypes: ["proteccion"],
    cost: 3,
    power: 9,
    text: "Último Aliento: el aliado más débil de este carril gana +4 de poder permanente.",
    effectId: "legado",
    keyword: "legado",
    keywordValue: 4,
    rarity: "common",
    trigger: "on_death",
  },
  {
    id: "concentracion_de_batalla",
    name: "Concentración de Batalla",
    category: "Acción",
    subtypes: ["proteccion"],
    cost: 5,
    power: 17,
    text: "Fin de Turno: todas tus cartas de este carril ganan +2.",
    effectId: "fortaleza",
    keyword: "fortaleza",
    keywordValue: 2,
    rarity: "common",
    trigger: "end_turn",
  },

  // ------------------------- CARRIL FURIA -------------------------
  {
    id: "gladiador_enfrentado",
    name: "Gladiador Enfrentado",
    category: "Ataque",
    subtypes: ["furia"],
    cost: 3,
    power: 10,
    text: "Inicio de Turno: gana +2 mientras el poder total enemigo de este carril supere al tuyo.",
    effectId: "desafio",
    keyword: "desafio",
    keywordValue: 2,
    rarity: "common",
    trigger: "start_turn",
  },
  {
    id: "fiera_ensangrentada",
    name: "Fiera Ensangrentada",
    category: "Ataque",
    subtypes: ["furia"],
    cost: 2,
    power: 5,
    text: "Inicio de Turno: gana +2 de poder permanente.",
    effectId: "fervor",
    keyword: "fervor",
    keywordValue: 2,
    rarity: "common",
    trigger: "start_turn",
  },
  {
    id: "emblema_de_sangre",
    name: "Emblema de Sangre",
    category: "Ítem",
    subtypes: ["furia"],
    cost: 1,
    power: 2,
    text: "Al Jugar: gana +2 por cada carta que hayas jugado este turno (incluida esta).",
    effectId: "impetu",
    keyword: "impetu",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "furia_desatada",
    name: "Furia Desatada",
    category: "Acción",
    subtypes: ["furia"],
    cost: 3,
    power: 10,
    text: "Fin de Turno: reduce en 2 el poder del enemigo más débil CON PODER de este carril (a 0, la carta cae). Sin presa, esta carta se enfurece y gana +2.",
    effectId: "crueldad",
    keyword: "crueldad",
    keywordValue: 2,
    rarity: "common",
    trigger: "end_turn",
  },
];

export const MAGE2_CARDS: CardDef[] = [
  // ------------------------- CARRIL ARCANA -------------------------
  {
    id: "tejedor_de_mana",
    name: "Tejedor de Maná",
    category: "Ataque",
    subtypes: ["arcana"],
    cost: 3,
    power: 10,
    text: "Al Jugar: gana +2 de poder y reduce en 2 el poder del enemigo más fuerte de este carril. Los escudos absorben la reducción.",
    effectId: "drenar_poder",
    keyword: "drenar_poder",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "chispazo_incontrolado",
    name: "Chispazo Incontrolado",
    category: "Ataque",
    subtypes: ["arcana"],
    cost: 2,
    power: 8,
    text: "Al Jugar: gana +2. Fin de Turno: pierde 1 (la energía se disipa).",
    effectId: "sobrecarga",
    keyword: "sobrecarga",
    keywordValue: 1,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "prisma_de_enfoque",
    name: "Prisma de Enfoque",
    category: "Ítem",
    subtypes: ["arcana"],
    cost: 1,
    power: 3,
    text: "Al Jugar: otorga +2 de poder permanente al aliado más débil de este carril.",
    effectId: "insignia",
    keyword: "insignia",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "boveda_prismatica",
    name: "Bóveda Prismática",
    category: "Acción",
    subtypes: ["arcana"],
    cost: 5,
    power: 17,
    text: "Al Jugar: gana un escudo que absorbe las próximas 4 reducciones de poder.",
    effectId: "coraza",
    keyword: "coraza",
    keywordValue: 4,
    rarity: "common",
    trigger: "on_play",
  },

  // ------------------------- CARRIL FUEGO -------------------------
  {
    id: "fenix_de_ascuas",
    name: "Fénix de Ascuas",
    category: "Ataque",
    subtypes: ["fuego"],
    cost: 4,
    power: 15,
    text: "Último Aliento: reduce en 2 el poder de TODAS las cartas enemigas de este carril.",
    effectId: "detonacion",
    keyword: "detonacion",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_death",
  },
  {
    id: "lengua_de_fuego",
    name: "Lengua de Fuego",
    category: "Ataque",
    subtypes: ["fuego"],
    cost: 2,
    power: 6,
    text: "Al Jugar: reduce en 2 el poder de TODAS las cartas enemigas de este carril.",
    effectId: "llamarada",
    keyword: "llamarada",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "yesca_ardiente",
    name: "Yesca Ardiente",
    category: "Ítem",
    subtypes: ["fuego"],
    cost: 1,
    power: 3,
    text: "Fin de Turno: todas tus cartas de este carril ganan +1 (las ascuas se extienden).",
    effectId: "fortaleza",
    keyword: "fortaleza",
    keywordValue: 1,
    rarity: "common",
    trigger: "end_turn",
  },
  {
    id: "bomba_de_fuego_inestable",
    name: "Bomba de Fuego Inestable",
    category: "Acción",
    subtypes: ["fuego"],
    cost: 3,
    power: 10,
    text: "Último Aliento: reduce en 6 el poder del enemigo más fuerte del carril. Los escudos no lo impiden.",
    effectId: "combustion",
    keyword: "combustion",
    keywordValue: 3,
    rarity: "common",
    trigger: "on_death",
  },

  // ------------------------- CARRIL HIELO -------------------------
  {
    id: "maza_glacial",
    name: "Maza Glacial",
    category: "Ataque",
    subtypes: ["hielo"],
    cost: 3,
    power: 10,
    text: "Al Jugar: reduce en 2 el poder del enemigo con más reducciones acumuladas de este carril (si ninguna tiene, golpea al más fuerte). Los escudos no lo impiden.",
    effectId: "ruptura_glacial",
    keyword: "ruptura_glacial",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "alma_del_glaciar",
    name: "Alma del Glaciar",
    category: "Ataque",
    subtypes: ["hielo"],
    cost: 3,
    power: 10,
    text: "Último Aliento: el aliado más débil de este carril gana +3 de poder permanente.",
    effectId: "legado",
    keyword: "legado",
    keywordValue: 3,
    rarity: "common",
    trigger: "on_death",
  },
  {
    id: "aguja_glacial",
    name: "Aguja Glacial",
    category: "Ítem",
    subtypes: ["hielo"],
    cost: 2,
    power: 5,
    text: "Al Jugar: resta 2 de poder al enemigo más débil de este carril; si tiene 2 o menos, lo destruye.",
    effectId: "remate",
    keyword: "remate",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "cupula_de_invierno",
    name: "Cúpula de Invierno",
    category: "Acción",
    subtypes: ["hielo"],
    cost: 3,
    power: 10,
    text: "Inicio de Turno: tu escudo se restaura hasta 3 puntos.",
    effectId: "escarcha",
    keyword: "escarcha",
    keywordValue: 3,
    rarity: "common",
    trigger: "start_turn",
  },
];

export const ROGUE2_CARDS: CardDef[] = [
  // ------------------------- CARRIL VENENO -------------------------
  {
    id: "culebra_de_peste",
    name: "Culebra de Peste",
    category: "Ataque",
    subtypes: ["veneno"],
    cost: 3,
    power: 9,
    text: "Al Jugar: reduce en 2 el poder de TODAS las cartas enemigas de este carril. El gas ignora los escudos.",
    effectId: "miasma",
    keyword: "miasma",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "serpiente_del_cienago",
    name: "Serpiente del Ciénago",
    category: "Ataque",
    subtypes: ["veneno"],
    cost: 4,
    power: 14,
    text: "Inicio de Turno: reduce en 2 el poder del enemigo más fuerte. El veneno ignora los escudos.",
    effectId: "veneno",
    keyword: "veneno",
    keywordValue: 2,
    rarity: "common",
    trigger: "start_turn",
  },
  {
    id: "tonica_reconstituyente",
    name: "Tónica Reconstituyente",
    category: "Ítem",
    subtypes: ["veneno"],
    cost: 1,
    power: 2,
    text: "Al Jugar: otorga +3 de poder permanente al aliado más débil de este carril.",
    effectId: "insignia",
    keyword: "insignia",
    keywordValue: 3,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "vaho_putrido",
    name: "Vaho Pútrido",
    category: "Acción",
    subtypes: ["veneno"],
    cost: 3,
    power: 11,
    text: "Fin de Turno: reduce en 2 el poder de TODAS las cartas enemigas de este carril que tengan reducciones acumuladas.",
    effectId: "contagio",
    keyword: "contagio",
    keywordValue: 2,
    rarity: "common",
    trigger: "end_turn",
  },

  // ------------------------- CARRIL COMBATE -------------------------
  {
    id: "cazador_de_titanes",
    name: "Cazador de Titanes",
    category: "Ataque",
    subtypes: ["combate"],
    cost: 3,
    power: 11,
    text: "Al Jugar: gana +4 si la carta enemiga más fuerte de este carril supera el poder base de esta carta; si no, gana +2.",
    effectId: "caza_mayor",
    keyword: "caza_mayor",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "mercenario_sin_bandera",
    name: "Mercenario Sin Bandera",
    category: "Ataque",
    subtypes: ["combate"],
    cost: 2,
    power: 7,
    text: "Al Jugar: resta 1 de poder al enemigo más débil de este carril; si tiene 1 o menos, lo destruye.",
    effectId: "remate",
    keyword: "remate",
    keywordValue: 1,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "daga_de_contrabando",
    name: "Daga de Contrabando",
    category: "Ítem",
    subtypes: ["combate"],
    cost: 2,
    power: 7,
    text: "Al Jugar: reduce en 2 el poder del enemigo más fuerte de este carril. Los escudos lo absorben.",
    effectId: "golpe_certero",
    keyword: "golpe_certero",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "grito_de_agonia",
    name: "Grito de Agonía",
    category: "Acción",
    subtypes: ["combate"],
    cost: 1,
    power: 4,
    text: "Último Aliento: el aliado más débil de este carril gana +1 de poder permanente.",
    effectId: "legado",
    keyword: "legado",
    keywordValue: 1,
    rarity: "common",
    trigger: "on_death",
  },

  // ------------------------- CARRIL SIGILO -------------------------
  {
    id: "emisario_oculto",
    name: "Emisario Oculto",
    category: "Ataque",
    subtypes: ["sigilo"],
    cost: 3,
    power: 12,
    text: "Al Jugar: el resto de cartas de tu mano gana +2 de poder permanente.",
    effectId: "conspiracion",
    keyword: "conspiracion",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "sombra_veloz",
    name: "Sombra Veloz",
    category: "Ataque",
    subtypes: ["sigilo"],
    cost: 3,
    power: 9,
    text: "Al Jugar: gana +6 si es tu primera carta del turno; si no, gana +3.",
    effectId: "emboscada",
    keyword: "emboscada",
    keywordValue: 3,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "dardo_sombrio",
    name: "Dardo Sombrío",
    category: "Ítem",
    subtypes: ["sigilo"],
    cost: 2,
    power: 5,
    text: "Al Jugar: destruye la carta enemiga más débil de este carril con poder 2 o menos. Si no hay ninguna, hiere en 2 a la más fuerte (los escudos no la detienen).",
    effectId: "purga",
    keyword: "purga",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "pacto_de_las_sombras",
    name: "Pacto de las Sombras",
    category: "Acción",
    subtypes: ["sigilo"],
    cost: 5,
    power: 16,
    text: "Al Jugar: gana un escudo que absorbe las próximas 5 reducciones de poder.",
    effectId: "coraza",
    keyword: "coraza",
    keywordValue: 5,
    rarity: "common",
    trigger: "on_play",
  },
];

// ============================================================================
// V3.0 · BOTÁNICO 🌿 (T-B, plan-expansion-v3 §2.1) — «Crecimiento · Enjambre ·
// Esporas». 28 cartas: RAÍZ 8 · FLOR 8 · ESPORAS 12 (carril del jefe Yggra).
// Keywords propias: micelio, estacion (RAÍZ) · simbiosis, floracion (FLOR) ·
// polen, carnivora (ESPORAS) + las 6 neutrales. Escaleras por familia
// (X≠coste≠) para las Reglas A/B de test-no-gemelas.
// Razas para el arte: elfo nocturno, tauren, troll + criaturas vegetales.
// ============================================================================

/** Mazo I del Botánico — «Círculo de la Raíz Viva» (espejo del arranque). */
export const BOTANICO_CARDS: CardDef[] = [
  // ------------------------- CARRIL RAÍZ -------------------------
  {
    id: "guardian_de_corteza",
    name: "Guardián de Corteza",
    category: "Ataque",
    subtypes: ["raiz"],
    cost: 3,
    power: 11,
    text: "Al Jugar: esta carta y el aliado más débil de este carril ganan un escudo de 2 puntos. La red fúngica protege a los suyos.",
    effectId: "micelio",
    keyword: "micelio",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "anciano_raiz",
    name: "Anciano Raíz",
    category: "Acción",
    subtypes: ["raiz"],
    cost: 4,
    power: 13,
    text: "Inicio de Turno: gana +2 de poder permanente. A partir del turno 4 la temporada madura y gana +4.",
    effectId: "estacion",
    keyword: "estacion",
    keywordValue: 2,
    rarity: "common",
    trigger: "start_turn",
  },
  {
    id: "yema_protegida",
    name: "Yema Protegida",
    category: "Ítem",
    subtypes: ["raiz"],
    cost: 2,
    power: 5,
    text: "Al Jugar: gana un escudo que absorbe las próximas 4 reducciones de poder que reciba (se agota).",
    effectId: "coraza",
    keyword: "coraza",
    keywordValue: 4,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "brote_fervoroso",
    name: "Brote Fervoroso",
    category: "Ataque",
    subtypes: ["raiz"],
    cost: 2,
    power: 2,
    text: "Inicio de Turno: gana +3 de poder permanente (crece cada amanecer).",
    effectId: "fervor",
    keyword: "fervor",
    keywordValue: 3,
    rarity: "common",
    trigger: "start_turn",
  },

  // ------------------------- CARRIL FLOR -------------------------
  {
    id: "polinizador_solar",
    name: "Polinizador Solar",
    category: "Ataque",
    subtypes: ["flor"],
    cost: 3,
    power: 11,
    text: "Al Jugar: gana +2 por cada carta tuya de este carril que tenga MENOS poder que esta.",
    effectId: "simbiosis",
    keyword: "simbiosis",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "lecho_de_petalos",
    name: "Lecho de Pétalos",
    category: "Acción",
    subtypes: ["flor"],
    cost: 3,
    power: 11,
    text: "Último Aliento: al morir, TODAS tus cartas de este carril ganan +2 de poder permanente. La muerte alimenta el enjambre.",
    effectId: "floracion",
    keyword: "floracion",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_death",
  },
  {
    id: "estandarte_de_savia",
    name: "Estandarte de Savia",
    category: "Ítem",
    subtypes: ["flor"],
    cost: 2,
    power: 7,
    text: "Al Jugar: otorga +2 de poder permanente al aliado más débil de este carril.",
    effectId: "insignia",
    keyword: "insignia",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "cepa_heredada",
    name: "Cepa Heredada",
    category: "Ataque",
    subtypes: ["flor"],
    cost: 1,
    power: 2,
    text: "Último Aliento: al morir, el aliado más débil de este carril gana +3 de poder permanente.",
    effectId: "legado",
    keyword: "legado",
    keywordValue: 3,
    rarity: "common",
    trigger: "on_death",
  },

  // ------------------------- CARRIL ESPORAS -------------------------
  {
    id: "vientrespora",
    name: "Vientrespora",
    category: "Ataque",
    subtypes: ["esporas"],
    cost: 3,
    power: 10,
    text: "Al Jugar: reduce en 2 el poder del enemigo con MENOS reducciones acumuladas (empate: el más débil). Los escudos lo absorben.",
    effectId: "polen",
    keyword: "polen",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "boca_de_musgo",
    name: "Boca de Musgo",
    category: "Ataque",
    subtypes: ["esporas"],
    cost: 3,
    power: 7,
    text: "Al Jugar: devora la carta enemiga más débil con poder 3 o menos y gana +2 de poder. Sin presa, mastica tierra y gana +1.",
    effectId: "carnivora",
    keyword: "carnivora",
    keywordValue: 3,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "esporas_toxicas",
    name: "Esporas Tóxicas",
    category: "Ítem",
    subtypes: ["esporas"],
    cost: 5,
    power: 17,
    text: "Al Jugar: resta 2 de poder al enemigo más débil de este carril; si tiene 2 o menos, lo destruye.",
    effectId: "remate",
    keyword: "remate",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "circulo_de_hongos",
    name: "Círculo de Hongos",
    category: "Acción",
    subtypes: ["esporas"],
    cost: 1,
    power: 1,
    text: "Fin de Turno: todas tus cartas de este carril ganan +2.",
    effectId: "fortaleza",
    keyword: "fortaleza",
    keywordValue: 2,
    rarity: "common",
    trigger: "end_turn",
  },
];

/** Mazo II del Botánico — «Invernadero de Guerra» (las 12 familias, X altos). */
export const BOTANICO2_CARDS: CardDef[] = [
  // ------------------------- CARRIL RAÍZ -------------------------
  {
    id: "zarcillo_tenaz",
    name: "Zarcillo Tenaz",
    category: "Ataque",
    subtypes: ["raiz"],
    cost: 3,
    power: 4,
    text: "Inicio de Turno: gana +4 de poder permanente (se enreda y crece).",
    effectId: "fervor",
    keyword: "fervor",
    keywordValue: 4,
    rarity: "common",
    trigger: "start_turn",
  },
  {
    id: "estacion_invernal",
    name: "Estación Invernal",
    category: "Acción",
    subtypes: ["raiz"],
    cost: 3,
    power: 11,
    text: "Inicio de Turno: gana +1 de poder permanente. A partir del turno 4 la temporada madura y gana +2.",
    effectId: "estacion",
    keyword: "estacion",
    keywordValue: 1,
    rarity: "common",
    trigger: "start_turn",
  },
  {
    id: "reserva_de_savia",
    name: "Reserva de Savia",
    category: "Ítem",
    subtypes: ["raiz"],
    cost: 3,
    power: 13,
    text: "Al Jugar: gana un escudo que absorbe la próxima reducción de poder que reciba (escudo de 1, se agota).",
    effectId: "coraza",
    keyword: "coraza",
    keywordValue: 1,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "corteza_de_hierro",
    name: "Corteza de Hierro",
    category: "Ataque",
    subtypes: ["raiz"],
    cost: 1,
    power: 2,
    text: "Al Jugar: esta carta y el aliado más débil de este carril ganan un escudo de 3 puntos.",
    effectId: "micelio",
    keyword: "micelio",
    keywordValue: 3,
    rarity: "common",
    trigger: "on_play",
  },

  // ------------------------- CARRIL FLOR -------------------------
  {
    id: "enjambre_de_zumbidos",
    name: "Enjambre de Zumbidos",
    category: "Ataque",
    subtypes: ["flor"],
    cost: 2,
    power: 8,
    text: "Al Jugar: gana +1 por cada carta tuya de este carril que tenga MENOS poder que esta.",
    effectId: "simbiosis",
    keyword: "simbiosis",
    keywordValue: 1,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "jardin_colgante",
    name: "Jardín Colgante",
    category: "Acción",
    subtypes: ["flor"],
    cost: 2,
    power: 8,
    text: "Último Aliento: al morir, TODAS tus cartas de este carril ganan +1 de poder permanente.",
    effectId: "floracion",
    keyword: "floracion",
    keywordValue: 1,
    rarity: "common",
    trigger: "on_death",
  },
  {
    id: "nectar_concentrado",
    name: "Néctar Concentrado",
    category: "Ítem",
    subtypes: ["flor"],
    cost: 3,
    power: 12,
    text: "Al Jugar: otorga +1 de poder permanente al aliado más débil de este carril.",
    effectId: "insignia",
    keyword: "insignia",
    keywordValue: 1,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "raiz_del_antiguo",
    name: "Raíz del Antiguo",
    category: "Ataque",
    subtypes: ["flor"],
    cost: 2,
    power: 7,
    text: "Último Aliento: al morir, el aliado más débil de este carril gana +2 de poder permanente.",
    effectId: "legado",
    keyword: "legado",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_death",
  },

  // ------------------------- CARRIL ESPORAS -------------------------
  {
    id: "esporas_punzantes",
    name: "Esporas Punzantes",
    category: "Ataque",
    subtypes: ["esporas"],
    cost: 5,
    power: 16,
    text: "Al Jugar: reduce en 3 el poder del enemigo con MENOS reducciones acumuladas (empate: el más débil). Los escudos lo absorben.",
    effectId: "polen",
    keyword: "polen",
    keywordValue: 3,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "flor_devoradora",
    name: "Flor Devoradora",
    category: "Ataque",
    subtypes: ["esporas"],
    cost: 1,
    power: 1,
    text: "Al Jugar: devora la carta enemiga más débil con poder 2 o menos y gana +2 de poder. Sin presa, mastica tierra y gana +1.",
    effectId: "carnivora",
    keyword: "carnivora",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "amanita_mortal",
    name: "Amanita Mortal",
    category: "Ítem",
    subtypes: ["esporas"],
    cost: 3,
    power: 6,
    text: "Al Jugar: resta 3 de poder al enemigo más débil de este carril; si tiene 3 o menos, lo destruye.",
    effectId: "remate",
    keyword: "remate",
    keywordValue: 3,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "coro_de_setas",
    name: "Coro de Setas",
    category: "Acción",
    subtypes: ["esporas"],
    cost: 4,
    power: 8,
    text: "Fin de Turno: todas tus cartas de este carril ganan +4.",
    effectId: "fortaleza",
    keyword: "fortaleza",
    keywordValue: 4,
    rarity: "common",
    trigger: "end_turn",
  },
];

// ============================================================================
// V3.0 · JEFE BOTÁNICO — «Yggra, el Jardín Devorador» (tema ESPORAS).
// 4 cartas extra que completan su mazo de 12; el jugador también puede
// conseguirlas (entran al pool de la clase).
// ============================================================================
export const BOTANICO_BOSS_CARDS: CardDef[] = [
  {
    id: "moho_penetrante",
    name: "Moho Penetrante",
    category: "Ataque",
    subtypes: ["esporas"],
    cost: 1,
    power: 4,
    text: "Al Jugar: reduce en 1 el poder del enemigo con MENOS reducciones acumuladas (empate: el más débil). Los escudos lo absorben.",
    effectId: "polen",
    keyword: "polen",
    keywordValue: 1,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "hongopardo_colosal",
    name: "Hongopardo Colosal",
    category: "Ataque",
    subtypes: ["esporas"],
    cost: 2,
    power: 7,
    text: "Al Jugar: devora la carta enemiga más débil con poder 1 o menos y gana +2 de poder. Sin presa, mastica tierra y gana +1.",
    effectId: "carnivora",
    keyword: "carnivora",
    keywordValue: 1,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "tripa_de_tronco",
    name: "Tripa de Tronco",
    category: "Ítem",
    subtypes: ["esporas"],
    cost: 2,
    power: 7,
    text: "Fin de Turno: todas tus cartas de este carril ganan +1.",
    effectId: "fortaleza",
    keyword: "fortaleza",
    keywordValue: 1,
    rarity: "common",
    trigger: "end_turn",
  },
  {
    id: "boca_de_yggra",
    name: "Boca de Yggra",
    category: "Acción",
    subtypes: ["esporas"],
    cost: 5,
    power: 12,
    text: "Al Jugar: devora la carta enemiga más débil con poder 4 o menos y gana +2 de poder. Sin presa, mastica tierra y gana +1.",
    effectId: "carnivora",
    keyword: "carnivora",
    keywordValue: 4,
    rarity: "common",
    trigger: "on_play",
  },
];

// ============================================================================
// V3.0 · PIRATA 🏴‍☠️ (T-C, plan-expansion-v3 §2.2) — «Saqueo · Abordaje ·
// Pólvora». 28 cartas: PUENTE 8 · BODEGA 8 · ARTILLERÍA 12 (carril de Kaela).
// Keywords propias: saqueo, tripulacion (PUENTE) · motin, contrabando
// (BODEGA) · canonazo, andanada (ARTILLERÍA) + las 6 neutrales.
// NOTA: Motín es hasValue=false (sin X) → único en el pool; el mazo II
// repite CORAZA con otra X (11 familias — excepción documentada).
// Razas: humano, goblin, enano, no-muerto + kraken, cañones vivientes, loros.
// ============================================================================

/** Mazo I del Pirata — «Jolly Roger» (espejo del arranque). */
export const PIRATA_CARDS: CardDef[] = [
  // ------------------------- CARRIL PUENTE -------------------------
  {
    id: "abordaje_al_amanecer",
    name: "Abordaje al Amanecer",
    category: "Ataque",
    subtypes: ["puente"],
    cost: 3,
    power: 10,
    text: "Al Jugar: roba 2 de poder al enemigo más débil (los escudos no lo impiden). Si el robo lo deja a 0, cae y ganas +2 de botín.",
    effectId: "saqueo",
    keyword: "saqueo",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "grumete_ruidoso",
    name: "Grumete Ruidoso",
    category: "Ataque",
    subtypes: ["puente"],
    cost: 1,
    power: 4,
    text: "Inicio de Turno: gana +1 por cada carta tuya en este carril (esta incluida).",
    effectId: "tripulacion",
    keyword: "tripulacion",
    keywordValue: 1,
    rarity: "common",
    trigger: "start_turn",
  },
  {
    id: "cofres_de_remo",
    name: "Cofres de Remo",
    category: "Ítem",
    subtypes: ["puente"],
    cost: 2,
    power: 7,
    text: "Al Jugar: gana un escudo que absorbe las próximas 3 reducciones de poder que reciba (se agota).",
    effectId: "coraza",
    keyword: "coraza",
    keywordValue: 3,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "viento_favorable",
    name: "Viento Favorable",
    category: "Acción",
    subtypes: ["puente"],
    cost: 2,
    power: 7,
    text: "Inicio de Turno: gana +1 de poder permanente (la brisa empuja las velas).",
    effectId: "fervor",
    keyword: "fervor",
    keywordValue: 1,
    rarity: "common",
    trigger: "start_turn",
  },

  // ------------------------- CARRIL BODEGA -------------------------
  {
    id: "amotinado_del_ron",
    name: "Amotinado del Ron",
    category: "Ataque",
    subtypes: ["bodega"],
    cost: 3,
    power: 9,
    text: "Al Jugar: INTERCAMBIA su poder con el del enemigo más fuerte de este carril. El amotinado toma el mando… y su poder.",
    effectId: "motin",
    keyword: "motin",
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "pacto_de_contrabando",
    name: "Pacto de Contrabando",
    category: "Ítem",
    subtypes: ["bodega"],
    cost: 3,
    power: 13,
    text: "Al Jugar: UNA carta aleatoria de tu mano gana +2 de poder permanente.",
    effectId: "contrabando",
    keyword: "contrabando",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "cofre_del_ahogado",
    name: "Cofre del Ahogado",
    category: "Ataque",
    subtypes: ["bodega"],
    cost: 1,
    power: 1,
    text: "Último Aliento: al morir, el aliado más débil de este carril gana +4 de poder permanente.",
    effectId: "legado",
    keyword: "legado",
    keywordValue: 4,
    rarity: "common",
    trigger: "on_death",
  },
  {
    id: "noche_de_velas",
    name: "Noche de Velas",
    category: "Acción",
    subtypes: ["bodega"],
    cost: 2,
    power: 8,
    text: "Al Jugar: otorga +1 de poder permanente al aliado más débil de este carril.",
    effectId: "insignia",
    keyword: "insignia",
    keywordValue: 1,
    rarity: "common",
    trigger: "on_play",
  },

  // ------------------------- CARRIL ARTILLERÍA -------------------------
  {
    id: "saludo_de_canones",
    name: "Saludo de Cañones",
    category: "Ataque",
    subtypes: ["artilleria"],
    cost: 3,
    power: 11,
    text: "Al Jugar: reduce en 1 el poder de TODOS los enemigos de este carril y de los adyacentes. La pólvora no respeta fronteras.",
    effectId: "canonazo",
    keyword: "canonazo",
    keywordValue: 1,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "polvorin_viejo",
    name: "Polvorín Viejo",
    category: "Ataque",
    subtypes: ["artilleria"],
    cost: 3,
    power: 10,
    text: "Último Aliento: reduce en 2 el poder de TODOS los enemigos de este carril y de los adyacentes.",
    effectId: "andanada",
    keyword: "andanada",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_death",
  },
  {
    id: "mecha_cortada",
    name: "Mecha Cortada",
    category: "Ítem",
    subtypes: ["artilleria"],
    cost: 5,
    power: 12,
    text: "Al Jugar: resta 4 de poder al enemigo más débil de este carril; si tiene 4 o menos, lo destruye.",
    effectId: "remate",
    keyword: "remate",
    keywordValue: 4,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "humo_de_polvora",
    name: "Humo de Pólvora",
    category: "Acción",
    subtypes: ["artilleria"],
    cost: 4,
    power: 13,
    text: "Fin de Turno: todas tus cartas de este carril ganan +2.",
    effectId: "fortaleza",
    keyword: "fortaleza",
    keywordValue: 2,
    rarity: "common",
    trigger: "end_turn",
  },
];

/** Mazo II del Pirata — «Baluarte de Hierro» (11 familias: Motín es único). */
export const PIRATA2_CARDS: CardDef[] = [
  // ------------------------- CARRIL PUENTE -------------------------
  {
    id: "saqueo_del_baron",
    name: "Saqueo del Barón",
    category: "Ataque",
    subtypes: ["puente"],
    cost: 2,
    power: 4,
    text: "Al Jugar: roba 3 de poder al enemigo más débil (los escudos no lo impiden). Si el robo lo deja a 0, cae y ganas +2 de botín.",
    effectId: "saqueo",
    keyword: "saqueo",
    keywordValue: 3,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "marinero_de_aguas_negras",
    name: "Marinero de Aguas Negras",
    category: "Ataque",
    subtypes: ["puente"],
    cost: 3,
    power: 10,
    text: "Inicio de Turno: gana +2 por cada carta tuya en este carril (esta incluida).",
    effectId: "tripulacion",
    keyword: "tripulacion",
    keywordValue: 2,
    rarity: "common",
    trigger: "start_turn",
  },
  {
    id: "coraza_de_roble",
    name: "Coraza de Roble",
    category: "Ítem",
    subtypes: ["puente"],
    cost: 3,
    power: 12,
    text: "Al Jugar: gana un escudo que absorbe las próximas 2 reducciones de poder que reciba (se agota).",
    effectId: "coraza",
    keyword: "coraza",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "grito_de_abordaje",
    name: "Grito de Abordaje",
    category: "Acción",
    subtypes: ["puente"],
    cost: 3,
    power: 9,
    text: "Inicio de Turno: gana +2 de poder permanente (el miedo se contagia).",
    effectId: "fervor",
    keyword: "fervor",
    keywordValue: 2,
    rarity: "common",
    trigger: "start_turn",
  },

  // ------------------------- CARRIL BODEGA -------------------------
  {
    id: "contrabando_de_polvora",
    name: "Contrabando de Pólvora",
    category: "Ítem",
    subtypes: ["bodega"],
    cost: 1,
    power: 4,
    text: "Al Jugar: UNA carta aleatoria de tu mano gana +3 de poder permanente.",
    effectId: "contrabando",
    keyword: "contrabando",
    keywordValue: 3,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "lobo_del_mar",
    name: "Lobo del Mar",
    category: "Ataque",
    subtypes: ["bodega"],
    cost: 2,
    power: 8,
    text: "Último Aliento: al morir, el aliado más débil de este carril gana +1 de poder permanente.",
    effectId: "legado",
    keyword: "legado",
    keywordValue: 1,
    rarity: "common",
    trigger: "on_death",
  },
  {
    id: "bandera_negra",
    name: "Bandera Negra",
    category: "Acción",
    subtypes: ["bodega"],
    cost: 3,
    power: 9,
    text: "Al Jugar: otorga +4 de poder permanente al aliado más débil de este carril.",
    effectId: "insignia",
    keyword: "insignia",
    keywordValue: 4,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "cuchillo_de_sable",
    name: "Cuchillo de Sable",
    category: "Ataque",
    subtypes: ["bodega"],
    cost: 3,
    power: 9,
    text: "Al Jugar: resta 2 de poder al enemigo más débil de este carril; si tiene 2 o menos, lo destruye.",
    effectId: "remate",
    keyword: "remate",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_play",
  },

  // ------------------------- CARRIL ARTILLERÍA -------------------------
  {
    id: "canon_de_cubierta",
    name: "Cañón de Cubierta",
    category: "Ataque",
    subtypes: ["artilleria"],
    cost: 1,
    power: 1,
    text: "Al Jugar: reduce en 2 el poder de TODOS los enemigos de este carril y de los adyacentes. La pólvora no respeta fronteras.",
    effectId: "canonazo",
    keyword: "canonazo",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "salva_de_despedida",
    name: "Salva de Despedida",
    category: "Ataque",
    subtypes: ["artilleria"],
    cost: 2,
    power: 4,
    text: "Último Aliento: reduce en 3 el poder de TODOS los enemigos de este carril y de los adyacentes.",
    effectId: "andanada",
    keyword: "andanada",
    keywordValue: 3,
    rarity: "common",
    trigger: "on_death",
  },
  {
    id: "placas_del_casco",
    name: "Placas del Casco",
    category: "Ítem",
    subtypes: ["artilleria"],
    cost: 4,
    power: 13,
    text: "Al Jugar: gana un escudo que absorbe las próximas 4 reducciones de poder que reciba (se agota).",
    effectId: "coraza",
    keyword: "coraza",
    keywordValue: 4,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "bateria_de_cubierta",
    name: "Batería de Cubierta",
    category: "Acción",
    subtypes: ["artilleria"],
    cost: 5,
    power: 14,
    text: "Fin de Turno: todas tus cartas de este carril ganan +3.",
    effectId: "fortaleza",
    keyword: "fortaleza",
    keywordValue: 3,
    rarity: "common",
    trigger: "end_turn",
  },
];

// ============================================================================
// V3.0 · JEFE PIRATA — «Kaela, la Boca de Hierro» (tema ARTILLERÍA).
// 4 cartas extra que completan su mazo de 12; el jugador también puede
// conseguirlas (entran al pool de la clase).
// ============================================================================
export const PIRATA_BOSS_CARDS: CardDef[] = [
  {
    id: "canon_volador",
    name: "Cañón Volador",
    category: "Ataque",
    subtypes: ["artilleria"],
    cost: 4,
    power: 10,
    text: "Al Jugar: reduce en 3 el poder de TODOS los enemigos de este carril y de los adyacentes. La pólvora no respeta fronteras.",
    effectId: "canonazo",
    keyword: "canonazo",
    keywordValue: 3,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "kraken_de_polvora",
    name: "Kraken de Pólvora",
    category: "Ataque",
    subtypes: ["artilleria"],
    cost: 1,
    power: 4,
    text: "Último Aliento: reduce en 1 el poder de TODOS los enemigos de este carril y de los adyacentes.",
    effectId: "andanada",
    keyword: "andanada",
    keywordValue: 1,
    rarity: "common",
    trigger: "on_death",
  },
  {
    id: "paquete_sospechoso",
    name: "Paquete Sospechoso",
    category: "Ítem",
    subtypes: ["artilleria"],
    cost: 2,
    power: 9,
    text: "Al Jugar: UNA carta aleatoria de tu mano gana +1 de poder permanente.",
    effectId: "contrabando",
    keyword: "contrabando",
    keywordValue: 1,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "boca_de_kaela",
    name: "Boca de Kaela",
    category: "Acción",
    subtypes: ["artilleria"],
    cost: 5,
    power: 12,
    text: "Al Jugar: reduce en 4 el poder de TODOS los enemigos de este carril y de los adyacentes. La pólvora no respeta fronteras.",
    effectId: "canonazo",
    keyword: "canonazo",
    keywordValue: 4,
    rarity: "common",
    trigger: "on_play",
  },
];

// ============================================================================
// CARTAS DE JEFE (4ª tanda, 2026-10) — 4 cartas nuevas por spec temática
// (Sigilo · Hielo · Protección), todas con keywords EXISTENTES y combos
// (coste, poder, keyword, X, trigger) que NO se repiten en el catálogo.
// El jugador TAMBIÉN puede conseguirlas: entran al pool de su clase
// (ALL_CARDS_V3) — nada exclusivo de los bots.
// ============================================================================

export const SIGILO_BOSS_CARDS: CardDef[] = [
  // ------------------------- CARRIL SIGILO +4 -------------------------
  {
    id: "punialada_traicionera",
    name: "Puñalada Traicionera",
    category: "Ataque",
    subtypes: ["sigilo"],
    cost: 1,
    power: 4,
    text: "Al Jugar: reduce en 1 el poder del enemigo más fuerte de este carril. Los escudos lo absorben.",
    effectId: "golpe_certero",
    keyword: "golpe_certero",
    keywordValue: 1,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "cuchilla_susurrante",
    name: "Cuchilla Susurrante",
    category: "Ataque",
    subtypes: ["sigilo"],
    cost: 2,
    power: 9,
    text: "Al Jugar: el resto de cartas de tu mano gana +1 de poder permanente.",
    effectId: "conspiracion",
    keyword: "conspiracion",
    keywordValue: 1,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "velo_nocturno",
    name: "Velo Nocturno",
    category: "Ítem",
    subtypes: ["sigilo"],
    cost: 2,
    power: 7,
    text: "Al Jugar: gana un escudo que absorbe las próximas 2 reducciones de poder.",
    effectId: "coraza",
    keyword: "coraza",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "cobro_por_encargo",
    name: "Cobro por Encargo",
    category: "Acción",
    subtypes: ["sigilo"],
    cost: 3,
    power: 11,
    text: "Último Aliento: el aliado más débil de este carril gana +2 de poder permanente.",
    effectId: "legado",
    keyword: "legado",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_death",
  },
];

export const HIELO_BOSS_CARDS: CardDef[] = [
  // ------------------------- CARRIL HIELO +4 -------------------------
  {
    id: "aliento_gelido",
    name: "Aliento Gélido",
    category: "Ataque",
    subtypes: ["hielo"],
    cost: 2,
    power: 8,
    text: "Último Aliento: reduce en 1 el poder de TODAS las cartas enemigas de este carril.",
    effectId: "detonacion",
    keyword: "detonacion",
    keywordValue: 1,
    rarity: "common",
    trigger: "on_death",
  },
  {
    id: "estatua_viviente",
    name: "Estatua Viviente",
    category: "Ataque",
    subtypes: ["hielo"],
    cost: 3,
    power: 6,
    text: "Inicio de Turno: gana +3 de poder permanente (el hielo crece).",
    effectId: "fervor",
    keyword: "fervor",
    keywordValue: 3,
    rarity: "common",
    trigger: "start_turn",
  },
  {
    id: "cetro_de_escarcha",
    name: "Cetro de Escarcha",
    category: "Ítem",
    subtypes: ["hielo"],
    cost: 2,
    power: 8,
    text: "Inicio de Turno: tu escudo se restaura hasta 1 punto.",
    effectId: "escarcha",
    keyword: "escarcha",
    keywordValue: 1,
    rarity: "common",
    trigger: "start_turn",
  },
  {
    id: "granizo_defensivo",
    name: "Granizo Defensivo",
    category: "Acción",
    subtypes: ["hielo"],
    cost: 4,
    power: 14,
    text: "Al Jugar: gana un escudo que absorbe las próximas 3 reducciones de poder.",
    effectId: "coraza",
    keyword: "coraza",
    keywordValue: 3,
    rarity: "common",
    trigger: "on_play",
  },
];

export const PROTECCION_BOSS_CARDS: CardDef[] = [
  // ----------------------- CARRIL PROTECCIÓN +4 -----------------------
  {
    id: "escudero_diligente",
    name: "Escudero Diligente",
    category: "Ataque",
    subtypes: ["proteccion"],
    cost: 2,
    power: 8,
    text: "Inicio de Turno: el escudo MÁS DAÑADO de este carril (puede no tener) sube hasta 1 punto.",
    effectId: "custodia",
    keyword: "custodia",
    keywordValue: 1,
    rarity: "common",
    trigger: "start_turn",
  },
  {
    id: "torre_de_asedio_viviente",
    name: "Torre de Asedio Viviente",
    category: "Ataque",
    subtypes: ["proteccion"],
    cost: 4,
    power: 10,
    text: "Inicio de Turno: gana +3 de poder permanente (la torre sigue en pie).",
    effectId: "fervor",
    keyword: "fervor",
    keywordValue: 3,
    rarity: "common",
    trigger: "start_turn",
  },
  {
    id: "paves_de_la_muralla",
    name: "Pavés de la Muralla",
    category: "Ítem",
    subtypes: ["proteccion"],
    cost: 3,
    power: 9,
    text: "Al Jugar: gana un escudo que absorbe las próximas 4 reducciones de poder.",
    effectId: "coraza",
    keyword: "coraza",
    keywordValue: 4,
    rarity: "common",
    trigger: "on_play",
  },
  {
    id: "juramento_de_acero",
    name: "Juramento de Acero",
    category: "Acción",
    subtypes: ["proteccion"],
    cost: 1,
    power: 3,
    text: "Último Aliento: el aliado más débil de este carril gana +2 de poder permanente.",
    effectId: "legado",
    keyword: "legado",
    keywordValue: 2,
    rarity: "common",
    trigger: "on_death",
  },
];

export const ALL_CARDS_V3: CardDef[] = [
  ...ALL_CARDS,
  ...MAGE_CARDS,
  ...ROGUE_CARDS,
  ...WARRIOR2_CARDS,
  ...MAGE2_CARDS,
  ...ROGUE2_CARDS,
  ...PROTECCION_BOSS_CARDS,
  ...HIELO_BOSS_CARDS,
  ...SIGILO_BOSS_CARDS,
  // V3.0 — Botánico (T-B) · Pirata (T-C); Tinker entra en T-D
  ...BOTANICO_CARDS,
  ...BOTANICO2_CARDS,
  ...BOTANICO_BOSS_CARDS,
  ...PIRATA_CARDS,
  ...PIRATA2_CARDS,
  ...PIRATA_BOSS_CARDS,
];

/**
 * Mazo espejo por clase (jugador e IA usan el mismo).
 *
 * V3.0 (plan-expansion-v3 §5): las clases nuevas se commitean con mazos
 * VACÍOS — sus 28 cartas llegan en T-B (Botánico), T-C (Pirata) y T-D
 * (Tinker). Mientras V3_CLASSES_UNLOCKED esté apagada, la UI jamás ofrece
 * estas clases y ningún flujo puede iniciar una partida con ellas; los
 * Records de tipo exigen la entrada desde T-A.
 */
export const CLASS_DECKS: Record<GameClass, CardDef[]> = {
  guerrero: WARRIOR_DECK,
  mago: MAGE_DECK,
  asesino: ROGUE_DECK,
  botanico: BOTANICO_CARDS, // T-B ✓
  pirata: PIRATA_CARDS, // T-C ✓
  tinker: [], // T-D
};

/**
 * Segundo mazo predeterminado por clase (3ª tanda). Los bots del modo
 * historia pueden llevar CUALQUIERA de los dos mazos de su clase.
 */
export const CLASS_DECKS_SECOND: Record<GameClass, CardDef[]> = {
  guerrero: WARRIOR2_CARDS,
  mago: MAGE2_CARDS,
  asesino: ROGUE2_CARDS,
  botanico: BOTANICO2_CARDS, // T-B ✓
  pirata: PIRATA2_CARDS, // T-C ✓
  tinker: [], // T-D
};

/** Los DOS mazos predeterminados de una clase (para el sorteo del bot). */
export function classDecksOf(cls: GameClass): CardDef[][] {
  return [CLASS_DECKS[cls], CLASS_DECKS_SECOND[cls]];
}

// ============================================================================
// MAZOS DE JEFE — un mazo PROPIO por jefe, 100% temático (una sola spec).
//   Vharos, Sombra Primigenia (asesino) → SIGILO
//   Nyx, Reina de Escarcha (mago)       → HIELO
//   Korgath, Coloso de Hierro (guerrero)→ PROTECCIÓN
// Reutiliza las cartas existentes de la spec + las 4 nuevas; SIN keywords
// nuevas y SIN duplicar combos (coste+poder+efecto) del catálogo.
// ============================================================================
export const BOSS_DECKS: Record<GameClass, CardDef[]> = {
  guerrero: ALL_CARDS_V3.filter((c) => c.subtypes.includes("proteccion")),
  mago: ALL_CARDS_V3.filter((c) => c.subtypes.includes("hielo")),
  asesino: ALL_CARDS_V3.filter((c) => c.subtypes.includes("sigilo")),
  // V3.0 — los pools nuevos entran en T-B/C/D; el filtro por carril ya está.
  botanico: ALL_CARDS_V3.filter((c) => c.subtypes.includes("esporas")), // Yggra
  pirata: ALL_CARDS_V3.filter((c) => c.subtypes.includes("artilleria")), // Kaela
  tinker: ALL_CARDS_V3.filter((c) => c.subtypes.includes("maquinaria")), // Dorvik
};

// ============================================================================
// PROGRESIÓN — el jugador NO empieza con las 24 cartas de su clase.
// Mazo inicial = las cartas NEUTRALES de la clase (keywords compartidas o
// sin keyword) rellenadas hasta 12 con las exclusivas más baratas. El resto
// se desbloquea JUGANDO: cada victoria suelta 2 cartas aleatorias que entran
// a la colección, y el mazo de batalla siempre son tus 12 mejores propias.
// ============================================================================

/** Keywords neutrales (cualquier clase) — las mismas de KEYWORDS "NEUTRALES". */
export const NEUTRAL_KEYWORD_IDS: ReadonlySet<string> = new Set([
  "fervor", "coraza", "insignia", "remate", "legado", "fortaleza",
]);

/** Las 28 cartas de una clase (mazo I + mazo II + las 4 de su JEFE). */
export function classCardsOf(cls: GameClass): CardDef[] {
  return [
    ...CLASS_DECKS[cls],
    ...CLASS_DECKS_SECOND[cls],
    ...BOSS_DECKS[cls].filter(
      (c) => !CLASS_DECKS[cls].some((d) => d.id === c.id) && !CLASS_DECKS_SECOND[cls].some((d) => d.id === c.id)
    ),
  ];
}

/**
 * Mazo INICIAL de la clase: todas sus cartas neutrales (orden de catálogo)
 * + las exclusivas más baratas hasta completar 12 únicas. Garantiza al menos
 * una carta de coste 1 para la garantía de mano inicial del motor.
 */
export function starterDeckFor(cls: GameClass): CardDef[] {
  const all24 = classCardsOf(cls);
  const neutral = all24.filter((c) => !c.keyword || NEUTRAL_KEYWORD_IDS.has(c.keyword)).slice(0, 12);
  const exclusives = all24
    .filter((c) => c.keyword && !NEUTRAL_KEYWORD_IDS.has(c.keyword))
    .sort((a, b) => a.cost - b.cost);
  const deck = [...neutral];
  for (const c of exclusives) {
    if (deck.length >= 12) break;
    deck.push(c);
  }
  return deck;
}

/**
 * Mazo de BATALLA del jugador en historia: sus 12 mejores cartas propias de
 * la clase (mejor rareza primero; empate → orden de catálogo). Si por cualquier
 * estado corrupto tuviera menos de 12 propias, rellena con el mazo inicial.
 * `tierRankOf(id)` = −1 si no tiene copias; si no 0 common…3 legendary.
 */
export function battleDeckFromOwned(
  cls: GameClass,
  tierRankOf: (id: string) => number,
): CardDef[] {
  const owned = classCardsOf(cls).filter((c) => tierRankOf(c.id) >= 0);
  const sorted = [...owned].sort((a, b) => tierRankOf(b.id) - tierRankOf(a.id));
  const deck = sorted.slice(0, 12);
  if (deck.length < 12) {
    for (const c of starterDeckFor(cls)) {
      if (deck.length >= 12) break;
      if (!deck.some((d) => d.id === c.id)) deck.push(c);
    }
  }
  return deck;
}

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

/** Busca una carta por id en todo el catálogo (V2 + V3). */
export function cardById(id: string): CardDef | undefined {
  return ALL_CARDS_V3.find((c) => c.id === id);
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
  {
    id: "preset_warrior2_hierro",
    name: "Cohorte de Hierro — Guerrero II",
    emoji: "🛡️",
    description: "2º mazo Guerrero: Orden de Batalla, Custodia y Desafío estrenan spec.",
    cards: WARRIOR2_CARDS,
  },
  {
    id: "preset_mage2_prismatico",
    name: "Cónclave Prismático — Mago II",
    emoji: "🔮",
    description: "2º mazo Mago: Drenar Poder, Detonación y Ruptura Glacial estrenan spec.",
    cards: MAGE2_CARDS,
  },
  {
    id: "preset_rogue2_daga",
    name: "Gremio de la Daga — Asesino II",
    emoji: "🤝",
    description: "2º mazo Asesino: Miasma, Caza Mayor y Conspiración estrenan spec.",
    cards: ROGUE2_CARDS,
  },
  {
    id: "preset_botanico_raiz",
    name: "Círculo de la Raíz Viva — Botánico I",
    emoji: "🌿",
    description: "Mazo I Botánico: Micelio, Estación, Simbiosis y Carnívora estrenan spec.",
    cards: BOTANICO_CARDS,
  },
  {
    id: "preset_botanico_invernadero",
    name: "Invernadero de Guerra — Botánico II",
    emoji: "🍄",
    description: "2º mazo Botánico: las 12 familias en escaleras altas de X.",
    cards: BOTANICO2_CARDS,
  },
  {
    id: "preset_pirata_jolly",
    name: "Jolly Roger — Pirata I",
    emoji: "🏴‍☠️",
    description: "Mazo I Pirata: Saqueo, Tripulación, Motín y Canonazo estrenan spec.",
    cards: PIRATA_CARDS,
  },
  {
    id: "preset_pirata_baluarte",
    name: "Baluarte de Hierro — Pirata II",
    emoji: "⚓",
    description: "2º mazo Pirata: 11 familias (Motín es único en el pool).",
    cards: PIRATA2_CARDS,
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
