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
    text: "Inicio de Turno: gana +1 mientras sea tu única carta en este carril.",
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
    text: "Inicio de Turno: elimina las reducciones de poder acumuladas de tus cartas en este carril.",
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
    text: "Fin de Turno: reduce en 1 el poder del enemigo más débil CON PODER de este carril. A 0, la carta cae.",
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
    power: 7,
    text: "Al Jugar: gana +4. Fin de Turno: pierde 2 (la energía se disipa).",
    effectId: "sobrecarga",
    keyword: "sobrecarga",
    keywordValue: 2,
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
    power: 13,
    text: "Al Jugar: resta 2 de poder al enemigo más débil de este carril; si tiene 2 o menos, lo destruye.",
    effectId: "remate",
    keyword: "remate",
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
    text: "Fin de Turno: reduce en 1 el poder del enemigo con más reducciones acumuladas (si ninguna tiene, no hace nada).",
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
    power: 9,
    text: "Al Jugar: destruye la carta enemiga más débil de este carril con poder 2 o menos.",
    effectId: "purga",
    keyword: "purga",
    keywordValue: 2,
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
    text: "Inicio de Turno: el escudo del aliado más débil de este carril (puede ser ella misma) se restaura hasta 2 puntos.",
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
    power: 8,
    text: "Al Jugar: tus demás cartas de este carril ganan un escudo de 2.",
    effectId: "amparo",
    keyword: "amparo",
    keywordValue: 2,
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
    text: "Al Jugar: otorga +4 de poder permanente al aliado más débil de este carril.",
    effectId: "insignia",
    keyword: "insignia",
    keywordValue: 4,
    rarity: "common",
    trigger: "on_play",
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
    power: 7,
    text: "Inicio de Turno: gana +1 de poder permanente.",
    effectId: "fervor",
    keyword: "fervor",
    keywordValue: 1,
    rarity: "common",
    trigger: "start_turn",
  },
  {
    id: "emblema_de_sangre",
    name: "Emblema de Sangre",
    category: "Ítem",
    subtypes: ["furia"],
    cost: 1,
    power: 4,
    text: "Al Jugar: gana +1 por cada carta que hayas jugado este turno (incluida esta).",
    effectId: "impetu",
    keyword: "impetu",
    keywordValue: 1,
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
    text: "Fin de Turno: reduce en 2 el poder del enemigo más débil CON PODER de este carril. A 0, la carta cae.",
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
    power: 8,
    text: "Al Jugar: reduce en 1 el poder de TODAS las cartas enemigas de este carril.",
    effectId: "llamarada",
    keyword: "llamarada",
    keywordValue: 1,
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
    text: "Al Jugar: reduce en 2 el poder del enemigo con más reducciones acumuladas de este carril. Los escudos no lo impiden.",
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
    text: "Fin de Turno: reduce en 2 el poder del enemigo con más reducciones acumuladas (si ninguna tiene, no hace nada).",
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
    power: 10,
    text: "Al Jugar: gana +4 si es tu primera carta del turno; si no, gana +2.",
    effectId: "emboscada",
    keyword: "emboscada",
    keywordValue: 2,
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
    text: "Al Jugar: destruye la carta enemiga más débil de este carril con poder 2 o menos.",
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
    text: "Fin de Turno: reduce en 1 el poder de TODAS las cartas enemigas de este carril.",
    effectId: "ventisca",
    keyword: "ventisca",
    keywordValue: 1,
    rarity: "common",
    trigger: "end_turn",
  },
  {
    id: "estatua_viviente",
    name: "Estatua Viviente",
    category: "Ataque",
    subtypes: ["hielo"],
    cost: 3,
    power: 9,
    text: "Inicio de Turno: gana +2 de poder permanente (el hielo crece).",
    effectId: "fervor",
    keyword: "fervor",
    keywordValue: 2,
    rarity: "common",
    trigger: "start_turn",
  },
  {
    id: "cetro_de_escarcha",
    name: "Cetro de Escarcha",
    category: "Ítem",
    subtypes: ["hielo"],
    cost: 2,
    power: 7,
    text: "Inicio de Turno: tu escudo se restaura hasta 2 puntos.",
    effectId: "escarcha",
    keyword: "escarcha",
    keywordValue: 2,
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
    text: "Inicio de Turno: el escudo del aliado más débil de este carril (puede ser ella misma) se restaura hasta 1 punto.",
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
    power: 13,
    text: "Inicio de Turno: gana +2 de poder permanente (la torre sigue en pie).",
    effectId: "fervor",
    keyword: "fervor",
    keywordValue: 2,
    rarity: "common",
    trigger: "start_turn",
  },
  {
    id: "paves_de_la_muralla",
    name: "Pavés de la Muralla",
    category: "Ítem",
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
    id: "juramento_de_acero",
    name: "Juramento de Acero",
    category: "Acción",
    subtypes: ["proteccion"],
    cost: 2,
    power: 7,
    text: "Fin de Turno: todas tus cartas de este carril ganan +1.",
    effectId: "fortaleza",
    keyword: "fortaleza",
    keywordValue: 1,
    rarity: "common",
    trigger: "end_turn",
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
];

/** Mazo espejo por clase (jugador e IA usan el mismo). */
export const CLASS_DECKS: Record<GameClass, CardDef[]> = {
  guerrero: WARRIOR_DECK,
  mago: MAGE_DECK,
  asesino: ROGUE_DECK,
};

/**
 * Segundo mazo predeterminado por clase (3ª tanda). Los bots del modo
 * historia pueden llevar CUALQUIERA de los dos mazos de su clase.
 */
export const CLASS_DECKS_SECOND: Record<GameClass, CardDef[]> = {
  guerrero: WARRIOR2_CARDS,
  mago: MAGE2_CARDS,
  asesino: ROGUE2_CARDS,
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
