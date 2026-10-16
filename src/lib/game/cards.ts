import type { CardDef } from "./types";

// ============================================================================
// GUERRERO TÁCTICO TCG - CATÁLOGO OFICIAL
// 7 mazos × 12 cartas = 84 cartas totales
// ============================================================================

// ---------------------------------------------------------------------------
// MAZO 1: FURIA DE SANGRE (Agresión y Sacrificio)
// ---------------------------------------------------------------------------
const FURIA_DE_SANGRE: CardDef[] = [
  {
    id: "tajo_frenetico",
    name: "Tajo Frenético",
    category: "Ataque",
    subtypes: ["furia"],
    cost: 1,
    power: 4,
    text: "Al Jugar: Ventaja 2 (Gana +2 mientras tu poder total en este carril sea menor al del rival.)",
    effectId: "ventaja",
    rarity: "common",
    keyword: "ventaja",
    keywordValue: 2,
  },
  {
    id: "llamado_de_sangre",
    name: "Llamado de Sangre",
    category: "Acción",
    subtypes: ["furia"],
    cost: 1,
    power: 2,
    text: "Al Jugar: Eco 3 (Otorga +3 de poder a las cartas en tu mano que compartan subtipo o categoría.)",
    effectId: "eco",
    rarity: "common",
    keyword: "eco",
    keywordValue: 3,
  },
  {
    id: "corte_desgarrador",
    name: "Corte Desgarrador",
    category: "Ataque",
    subtypes: ["armas", "furia"],
    cost: 2,
    power: 4,
    text: "Al Jugar: Sacrificio 5 (Destruye a tu aliado con menor coste o con Ofrenda. Ganas +5 de poder.)",
    effectId: "sacrificio_keyword",
    rarity: "rare",
    keyword: "sacrificio",
    keywordValue: 5,
  },
  {
    id: "grito_de_desafio",
    name: "Grito de Desafío",
    category: "Acción",
    subtypes: ["furia"],
    cost: 2,
    power: 7, // AUTO-BALANCED (era 4, Δ -2.81 → 0.19)
    text: "Pasivo: Ventaja 4 (Gana +4 mientras tu poder total en este carril sea menor al del rival.)",
    effectId: "ventaja",
    rarity: "rare",
    keyword: "ventaja",
    keywordValue: 4,
    trigger: "passive",
  },
  {
    id: "amuleto_de_frenesi",
    name: "Amuleto de Frenesí",
    category: "Ítem",
    subtypes: ["furia"],
    cost: 2,
    power: 3,
    text: "Inicio de Turno: Refuerzo 5 (Otorga +5 al aliado marcado en este carril, cada turno mientras esta carta esté en mesa.)",
    effectId: "none", // no on_play effect; Refuerzo fires from start_turn dispatcher via keyword check
    rarity: "rare",
    keyword: "refuerzo",
    keywordValue: 5,
    trigger: "start_turn",
  },
  {
    id: "rito_de_colera",
    name: "Rito de Cólera",
    category: "Acción",
    subtypes: ["furia", "proteccion"],
    cost: 3,
    power: 6,
    text: "Último Aliento: 8 (Al morir, transfiere +8 de poder a la aliada más débil de este carril.)",
    effectId: "ultimo_aliento",
    rarity: "rare",
    keyword: "ultimo_aliento",
    keywordValue: 8,
    trigger: "on_death",
  },
  {
    id: "masacre_brutal",
    name: "Masacre Brutal",
    category: "Ataque",
    subtypes: ["armas", "furia"],
    cost: 3,
    power: 10, // AUTO-BALANCED (era 8, Δ -2.00 → 0.00)
    text: "Despertar 14: Remate 4 (Destruye a una carta enemiga en este carril si su poder es 4 o menor.)",
    effectId: "despertar",
    rarity: "legendary",
    keyword: "remate",
    keywordValue: 4,
    trigger: "despertar",
    umbralCondition: { powerThreshold: 14 },
  },
  {
    id: "pocion_de_colera",
    name: "Poción de Cólera",
    category: "Ítem",
    subtypes: ["furia"],
    cost: 3,
    power: 12, // AUTO-BALANCED (era 10, Δ -1.70 → 0.30)
    text: "Al Jugar: Celeridad 1 (Reduce en 1 el coste de una carta aleatoria en tu mano hasta que sea jugada.)",
    effectId: "celeridad",
    rarity: "rare",
    keyword: "celeridad",
  },
  {
    id: "carga_incontenible",
    name: "Carga Incontenible",
    category: "Ataque",
    subtypes: ["furia"],
    cost: 4,
    power: 12, // AUTO-BALANCED (era 10, Δ -1.50 → 0.50)
    text: "Al Jugar: Remate 5 (Destruye a una carta enemiga en este carril si su poder es 5 o menor.)",
    effectId: "remate_keyword",
    rarity: "epic",
    keyword: "remate",
    keywordValue: 5,
  },
  {
    id: "golpe_demoledor",
    name: "Golpe Demoledor",
    category: "Ataque",
    subtypes: ["armas", "furia"],
    cost: 4,
    power: 14, // AUTO-BALANCED (era 15, Δ 0.96 → -0.04) // AUTO-BALANCED (era 12, Δ -2.62 → 0.38)
    text: "Pasivo: Retorno 3 (Si el poder de esta carta baja a 3 o menos, o si es destruida/sacrificada, regresa a tu mano con coste 0.)",
    effectId: "retorno",
    rarity: "epic",
    keyword: "retorno",
    keywordValue: 3,
    trigger: "passive",
  },
  {
    id: "totem_sangriento",
    name: "Tótem Sangriento",
    category: "Ítem",
    subtypes: ["furia", "proteccion"],
    cost: 4,
    power: 16, // AUTO-BALANCED (era 8, Δ -7.77 → 0.23)
    text: "Despertar 16: Celeridad 1 (Reduce en 1 el coste de una carta aleatoria en tu mano hasta que sea jugada.)",
    effectId: "celeridad",
    rarity: "epic",
    keyword: "celeridad",
    keywordValue: 1,
    trigger: "despertar",
    umbralCondition: { powerThreshold: 16 },
  },
  {
    id: "decreto_de_masacre",
    name: "Decreto de Masacre",
    category: "Acción",
    subtypes: ["armas", "furia"],
    cost: 5,
    power: 12,
    text: "Al Jugar: Sacrificio 8 (Destruye a tu aliado con menor coste o con Ofrenda. Ganas +8 de poder.)",
    effectId: "sacrificio_keyword",
    rarity: "legendary",
    keyword: "sacrificio",
    keywordValue: 8,
  },
];

// ---------------------------------------------------------------------------
// MAZO 2: FALANGE INEXPUGNABLE (Escudos y Control)
// ---------------------------------------------------------------------------
const FALANGE_INEXPUGNABLE: CardDef[] = [
  {
    id: "estocada_defensiva",
    name: "Estocada Defensiva",
    category: "Ataque",
    subtypes: ["proteccion"],
    cost: 1,
    power: 4,
    text: "Al Jugar: Ventaja 2 (Gana +2 mientras tu poder total en este carril sea menor al del rival.)",
    effectId: "provocar",
    rarity: "common",
    keyword: "ventaja",
    keywordValue: 2,
  },
  {
    id: "escudo_de_tilo",
    name: "Escudo de Tilo",
    category: "Ítem",
    subtypes: ["proteccion"],
    cost: 1,
    power: 2,
    text: "Al Jugar: Trampa 3 (La próxima carta enemiga jugada en este carril recibe -3 de poder.)",
    effectId: "trampa_eterea",
    rarity: "common",
    keyword: "trampa",
    keywordValue: 3,
  },
  {
    id: "orden_de_cohesion",
    name: "Orden de Cohesión",
    category: "Acción",
    subtypes: ["proteccion"],
    cost: 1,
    power: 2,
    text: "Pasivo: Vínculo 3 (Si hay otra carta de su misma categoría aquí, ambas ganan +3.)",
    effectId: "vinculo",
    rarity: "common",
    keyword: "vinculo",
    keywordValue: 3,
    trigger: "passive",
  },
  {
    id: "embestida_con_escudo",
    name: "Embestida con Escudo",
    category: "Ataque",
    subtypes: ["proteccion", "armas"],
    cost: 2,
    power: 6,
    text: "Pasivo: Muro (El rival debe jugar sus próximas cartas en este carril si no ha alcanzado el límite.)",
    effectId: "muro_keyword",
    rarity: "rare",
    keyword: "muro",
    trigger: "passive",
  },
  {
    id: "vendas_reforzadas",
    name: "Vendas Reforzadas",
    category: "Ítem",
    subtypes: ["proteccion"],
    cost: 2,
    power: 4,
    text: "Fin de Turno: Refuerzo 5 (Otorga +5 al aliado jugado inmediatamente antes en este carril.)",
    effectId: "refuerzo",
    rarity: "rare",
    keyword: "refuerzo",
    keywordValue: 5,
    trigger: "end_turn",
  },
  {
    id: "postura_inquebrantable",
    name: "Postura Inquebrantable",
    category: "Acción",
    subtypes: ["proteccion"],
    cost: 2,
    power: 5, // AUTO-BALANCED (era 4, Δ -0.89 → 0.11)
    text: "Pasivo: Baluarte (Tus demás aliados en este carril son inmunes a reducciones de poder enemigas.)",
    effectId: "baluarte",
    rarity: "rare",
    keyword: "baluarte",
    trigger: "passive",
  },
  {
    id: "baluarte_de_la_alianza",
    name: "Baluarte de la Alianza",
    category: "Ítem",
    subtypes: ["proteccion", "armas"],
    cost: 3,
    power: 7, // AUTO-BALANCED (era 6, Δ -0.59 → 0.41)
    text: "Pasivo: Refuerzo 6 (Otorga +6 al aliado jugado inmediatamente antes en este carril.)",
    effectId: "refuerzo",
    rarity: "rare",
    keyword: "refuerzo",
    keywordValue: 6,
    trigger: "passive",
  },
  {
    id: "contraataque_tactico",
    name: "Contraataque Táctico",
    category: "Ataque",
    subtypes: ["proteccion"],
    cost: 3,
    power: 9, // AUTO-BALANCED (era 8, Δ -0.60 → 0.40)
    text: "Al Jugar: Vanguardia 7 (Gana +7 si es la primera carta que juegas en tu turno.)",
    effectId: "vanguardia",
    rarity: "rare",
    keyword: "vanguardia",
    keywordValue: 7,
  },
  {
    id: "maniobra_de_falange",
    name: "Maniobra de Falange",
    category: "Acción",
    subtypes: ["proteccion"],
    cost: 3,
    power: 5, // AUTO-BALANCED (era 6, Δ 1.14 → 0.14)
    text: "Último Aliento: Trampa 9 (La próxima carta enemiga jugada en este carril recibe -9 de poder.)",
    effectId: "trampa_eterea",
    rarity: "rare",
    keyword: "trampa",
    keywordValue: 9,
    trigger: "on_death",
  },
  {
    id: "gran_escudo_del_bastion",
    name: "Gran Escudo del Bastión",
    category: "Ítem",
    subtypes: ["proteccion", "armas"],
    cost: 4,
    power: 8, // AUTO-BALANCED (era 10, Δ 2.10 → 0.10)
    text: "Al Jugar: Trampa 8 (La próxima carta enemiga jugada en este carril recibe -8 de poder.)",
    effectId: "bloqueo_escudo",
    rarity: "epic",
    keyword: "trampa",
    keywordValue: 8,
  },
  {
    id: "barrida_de_alabarda",
    name: "Barrida de Alabarda",
    category: "Ataque",
    subtypes: ["proteccion", "armas"],
    cost: 4,
    power: 9, // AUTO-BALANCED (era 10, Δ 0.90 → -0.10)
    text: "Al Jugar: Trampa 7 (La próxima carta enemiga jugada en este carril recibe -7 de poder.)",
    effectId: "filotormenta",
    rarity: "epic",
    keyword: "trampa",
    keywordValue: 7,
  },
  {
    id: "aegis_del_bastion",
    name: "Aegis del Bastión",
    category: "Acción",
    subtypes: ["proteccion", "armas"],
    cost: 5,
    power: 9, // AUTO-BALANCED (era 8, Δ -1.02 → -0.02)
    text: "Inicio de Turno: Refuerzo 10 (Otorga +10 al aliado marcado en este carril, cada turno mientras esta carta esté en mesa.)",
    effectId: "golpe_heroico",
    rarity: "legendary",
    keyword: "refuerzo",
    keywordValue: 10,
    trigger: "start_turn",
  },
];

// ---------------------------------------------------------------------------
// MAZO 3: MAESTROS DE LA FORJA (Armas y Tempo)
// ---------------------------------------------------------------------------
const MAESTROS_DE_LA_FORJA: CardDef[] = [
  {
    id: "tajo_forjado",
    name: "Tajo Forjado",
    category: "Ataque",
    subtypes: ["armas"],
    cost: 1,
    power: 3, // AUTO-BALANCED (era 4, Δ 0.60 → -0.40)
    text: "Al Jugar: Vanguardia 3 (Gana +3 si es la primera carta que juegas en tu turno.)",
    effectId: "vanguardia",
    rarity: "common",
    keyword: "vanguardia",
    keywordValue: 3,
  },
  {
    id: "plano_de_armadura",
    name: "Plano de Armadura",
    category: "Ítem",
    subtypes: ["armas"],
    cost: 1,
    power: 4,
    text: "Al Jugar: Celeridad 1 (Reduce en 1 el coste de una carta aleatoria en tu mano hasta que sea jugada.)",
    effectId: "celeridad",
    rarity: "common",
    keyword: "celeridad",
  },
  {
    id: "corte_templado",
    name: "Corte Templado",
    category: "Ataque",
    subtypes: ["armas"],
    cost: 1,
    power: 5, // AUTO-BALANCED (era 4, Δ -0.70 → 0.30)
    text: "Último Aliento: Reciclar 1 (Al ser destruida o sacrificada, recuperas 1 de energía.)",
    effectId: "reciclar",
    rarity: "common",
    keyword: "reciclar",
    keywordValue: 1,
    trigger: "on_death",
  },
  {
    id: "golpe_forjador",
    name: "Golpe Forjador",
    category: "Ataque",
    subtypes: ["armas", "furia"],
    cost: 2,
    power: 4,
    text: "Pasivo: Aislado 8 (Gana +8 mientras sea tu única aliada en este carril.)",
    effectId: "aislado",
    rarity: "rare",
    keyword: "aislado",
    keywordValue: 8,
    trigger: "passive",
  },
  {
    id: "afilado_tactico",
    name: "Afilado Táctico",
    category: "Acción",
    subtypes: ["armas"],
    cost: 2,
    power: 5, // AUTO-BALANCED (era 6, Δ 1.30 → 0.30)
    text: "Al Jugar: Refuerzo 4 (Otorga +4 al aliado jugado inmediatamente antes en este carril.)",
    effectId: "refuerzo",
    rarity: "rare",
    keyword: "refuerzo",
    keywordValue: 4,
  },
  {
    id: "yunque_runificado",
    name: "Yunque Runificado",
    category: "Ítem",
    subtypes: ["armas", "proteccion"],
    cost: 2,
    power: 4,
    text: "Fin de Turno: Eco 5 (Otorga +5 de poder a las cartas en tu mano que compartan subtipo o categoría.)",
    effectId: "eco",
    rarity: "rare",
    keyword: "eco",
    keywordValue: 5,
    trigger: "end_turn",
  },
  {
    id: "estocada_maestra",
    name: "Estocada Maestra",
    category: "Ataque",
    subtypes: ["armas"],
    cost: 3,
    power: 8, // AUTO-BALANCED (era 10, Δ 1.54 → -0.46)
    text: "Despertar 15: Refuerzo 6 (Otorga +6 al aliado jugado inmediatamente antes en este carril.)",
    effectId: "despertar",
    rarity: "legendary",
    keyword: "refuerzo",
    keywordValue: 6,
    trigger: "despertar",
    umbralCondition: { powerThreshold: 15 },
  },
  {
    id: "sobrecarga_termica",
    name: "Sobrecarga Térmica",
    category: "Acción",
    subtypes: ["armas"],
    cost: 3,
    power: 8, // AUTO-BALANCED (era 6, Δ -1.50 → 0.50)
    text: "Al Jugar: Sobrecarga 5 (Esta carta cuesta 5 menos de energía, pero pierdes 5 de energía el próximo turno.)",
    effectId: "sobrecarga",
    rarity: "rare",
    keyword: "sobrecarga",
    keywordValue: 5,
  },
  {
    id: "martillazo_de_guerra",
    name: "Martillazo de Guerra",
    category: "Ataque",
    subtypes: ["armas", "furia"],
    cost: 3,
    power: 9, // AUTO-BALANCED (era 8, Δ -0.70 → 0.30)
    text: "Al Jugar: Remate 4 (Destruye a una carta enemiga en este carril si su poder es 4 o menor.)",
    effectId: "remate_keyword",
    rarity: "rare",
    keyword: "remate",
    keywordValue: 4,
  },
  {
    id: "coraza_de_mitril",
    name: "Coraza de Mitril",
    category: "Ítem",
    subtypes: ["armas", "proteccion"],
    cost: 4,
    power: 7, // AUTO-BALANCED (era 10, Δ 2.87 → -0.13)
    text: "Pasivo: Vínculo 9 (Si hay otra carta de su misma categoría aquí, ambas ganan +9.)",
    effectId: "vinculo",
    rarity: "epic",
    keyword: "vinculo",
    keywordValue: 9,
    trigger: "passive",
  },
  {
    id: "filo_legendario",
    name: "Filo Legendario",
    category: "Ítem",
    subtypes: ["armas", "furia"],
    cost: 4,
    power: 9, // AUTO-BALANCED (era 10, Δ 1.14 → 0.14)
    text: "Último Aliento: 9 (Al morir, transfiere +9 de poder a la aliada más débil de este carril.)",
    effectId: "ultimo_aliento",
    rarity: "epic",
    keyword: "ultimo_aliento",
    keywordValue: 9,
    trigger: "on_death",
  },
  {
    id: "embate_del_titan",
    name: "Embate del Titán",
    category: "Ataque",
    subtypes: ["armas", "furia"],
    cost: 5,
    power: 16, // AUTO-BALANCED (era 12, Δ -3.50 → 0.50)
    text: "Al Jugar: Remate 5 (Destruye a una carta enemiga en este carril si su poder es 5 o menor.)",
    effectId: "remate_keyword",
    rarity: "legendary",
    keyword: "remate",
    keywordValue: 5,
  },
];

// ---------------------------------------------------------------------------
// MAZO 4: IMPULSO SANGRIENTO (Furia y Agresión Clásica)
// ---------------------------------------------------------------------------
const IMPULSO_SANGRIENTO: CardDef[] = [
  {
    id: "grito_salvaje",
    name: "Grito Salvaje",
    category: "Acción",
    subtypes: ["furia"],
    cost: 1,
    power: 3, // AUTO-BALANCED (era 4, Δ 0.60 → -0.40)
    text: "Al Jugar: Ventaja 3 (Gana +3 mientras tu poder total en este carril sea menor al del rival.)",
    effectId: "ventaja",
    rarity: "common",
    keyword: "ventaja",
    keywordValue: 3,
  },
  {
    id: "pocion_de_vida",
    name: "Poción de Vida",
    category: "Ítem",
    subtypes: ["proteccion", "furia"],
    cost: 1,
    power: 3, // AUTO-BALANCED (era 4, Δ 0.90 → -0.10)
    text: "Al Jugar: Refuerzo 2 (Otorga +2 al aliado jugado inmediatamente antes en este carril.)",
    effectId: "refuerzo",
    rarity: "common",
    keyword: "refuerzo",
    keywordValue: 2,
  },
  {
    id: "seccionar",
    name: "Seccionar",
    category: "Ataque",
    subtypes: ["armas"],
    cost: 1,
    power: 3, // AUTO-BALANCED (era 4, Δ 0.90 → -0.10)
    text: "Al Jugar: Trampa 2 (La próxima carta enemiga jugada en este carril recibe -2 de poder.)",
    effectId: "seccionar",
    rarity: "common",
    keyword: "trampa",
    keywordValue: 2,
  },
  {
    id: "ira_rabiosa",
    name: "Ira Rabiosa",
    category: "Acción",
    subtypes: ["furia", "proteccion"],
    cost: 2,
    power: 1, // AUTO-BALANCED (era 4, Δ 2.56 → -0.44)
    text: "Pasivo: Vínculo 7 (Si hay otra carta de su misma categoría aquí, ambas ganan +7.)",
    effectId: "vinculo",
    rarity: "rare",
    keyword: "vinculo",
    keywordValue: 7,
    trigger: "passive",
  },
  {
    id: "burla_sadica",
    name: "Burla Sádica",
    category: "Acción",
    subtypes: ["furia"],
    cost: 2,
    power: 6, // AUTO-BALANCED (era 4, Δ -1.50 → 0.50)
    text: "Al Jugar: Emboscada 8 (Gana +8 de poder si el rival ya tiene el carril lleno, 4 cartas.)",
    effectId: "emboscada",
    rarity: "rare",
    keyword: "emboscada",
    keywordValue: 8,
  },
  {
    id: "berserker",
    name: "Berserker",
    category: "Acción",
    subtypes: ["furia"],
    cost: 3,
    power: 8, // AUTO-BALANCED (era 10, Δ 2.38 → 0.38) // AUTO-BALANCED (era 6, Δ -4.00 → 0.00)
    text: "Despertar 16: Remate 7 (Destruye a una carta enemiga en este carril si su poder es 7 o menor.)",
    effectId: "despertar",
    rarity: "legendary",
    keyword: "remate",
    keywordValue: 7,
    trigger: "despertar",
    umbralCondition: { powerThreshold: 16 },
  },
  {
    id: "grito_de_batalla",
    name: "Grito de Batalla",
    category: "Acción",
    subtypes: ["furia"],
    cost: 3,
    power: 6, // AUTO-BALANCED (era 8, Δ 1.70 → -0.30)
    text: "Al Jugar: Eco 6 (Otorga +6 de poder a las cartas en tu mano que compartan subtipo o categoría.)",
    effectId: "eco",
    rarity: "rare",
    keyword: "eco",
    keywordValue: 6,
  },
  {
    id: "venganza",
    name: "Venganza",
    category: "Acción",
    subtypes: ["furia"],
    cost: 3,
    power: 7, // AUTO-BALANCED (era 8, Δ 1.50 → 0.50)
    text: "Al Jugar: Ventaja 10 (Gana +10 mientras tu poder total en este carril sea menor al del rival.)",
    effectId: "ventaja",
    rarity: "rare",
    keyword: "ventaja",
    keywordValue: 10,
  },
  {
    id: "filotormesta",
    name: "Filotormesta",
    category: "Ataque",
    subtypes: ["armas", "furia"],
    cost: 4,
    power: 9, // AUTO-BALANCED (era 10, Δ 0.90 → -0.10)
    text: "Al Jugar: Trampa 7 (La próxima carta enemiga jugada en este carril recibe -7 de poder.)",
    effectId: "filotormenta",
    rarity: "epic",
    keyword: "trampa",
    keywordValue: 7,
  },
  {
    id: "carga_devastadora",
    name: "Carga Devastadora",
    category: "Ataque",
    subtypes: ["furia"],
    cost: 4,
    power: 12, // AUTO-BALANCED (era 16, Δ 4.50 → 0.50)
    text: "Al Jugar: Sacrificio 5 (Destruye a tu aliado con menor coste o con Ofrenda. Ganas +5 de poder.)",
    effectId: "sacrificio_keyword",
    rarity: "epic",
    keyword: "sacrificio",
    keywordValue: 5,
  },
  {
    id: "masacre_sangrienta",
    name: "Masacre Sangrienta",
    category: "Ataque",
    subtypes: ["armas", "furia"],
    cost: 5,
    power: 13, // AUTO-BALANCED (era 12, Δ -0.76 → 0.24)
    text: "Pasivo: Aislado 13 (Gana +13 mientras sea tu única aliada en este carril.)",
    effectId: "aislado",
    rarity: "legendary",
    keyword: "aislado",
    keywordValue: 13,
    trigger: "passive",
  },
  {
    id: "avatar_del_titan",
    name: "Avatar del Titán",
    category: "Acción",
    subtypes: ["armas", "proteccion", "furia"],
    cost: 5,
    power: 10, // AUTO-BALANCED (era 12, Δ 2.50 → 0.50)
    text: "Al Jugar: Refuerzo 10 (Otorga +10 al aliado jugado inmediatamente antes en este carril.)",
    effectId: "avatar_titan",
    rarity: "legendary",
    keyword: "refuerzo",
    keywordValue: 10,
  },
];

// ---------------------------------------------------------------------------
// MAZO 5: BASTIÓN INQUEBRANTABLE (Control y Muro Clásico)
// ---------------------------------------------------------------------------
const BASTION_INQUEBRANTABLE: CardDef[] = [
  {
    id: "vendas_de_guerra",
    name: "Vendas de Guerra",
    category: "Ítem",
    subtypes: ["proteccion"],
    cost: 1,
    power: 2,
    text: "Fin de Turno: Refuerzo 3 (Otorga +3 al aliado jugado inmediatamente antes en este carril.)",
    effectId: "refuerzo",
    rarity: "common",
    keyword: "refuerzo",
    keywordValue: 3,
    trigger: "end_turn",
  },
  {
    id: "provocar",
    name: "Provocar",
    category: "Acción",
    subtypes: ["proteccion"],
    cost: 1,
    power: 2,
    text: "Pasivo: Muro (El rival debe jugar sus próximas cartas en este carril si no ha alcanzado el límite.)",
    effectId: "muro_keyword",
    rarity: "common",
    keyword: "muro",
    trigger: "passive",
  },
  {
    id: "estandarte_de_guerra",
    name: "Estandarte de Guerra",
    category: "Ítem",
    subtypes: ["proteccion"],
    cost: 1,
    power: 1,
    text: "Pasivo: Baluarte (Tus demás aliados en este carril son inmunes a reducciones de poder enemigas.)",
    effectId: "baluarte",
    rarity: "common",
    keyword: "baluarte",
    trigger: "passive",
  },
  {
    id: "bloqueo_escudo",
    name: "Bloqueo Escudo",
    category: "Ítem",
    subtypes: ["proteccion"],
    cost: 2,
    power: 4,
    text: "Al Jugar: Trampa 5 (La próxima carta enemiga jugada en este carril recibe -5 de poder.)",
    effectId: "bloqueo_escudo",
    rarity: "rare",
    keyword: "trampa",
    keywordValue: 5,
  },
  {
    id: "centinela",
    name: "Centinela",
    category: "Ítem",
    subtypes: ["proteccion", "armas"],
    cost: 2,
    power: 5, // AUTO-BALANCED (era 6, Δ 0.70 → -0.30)
    text: "Al Jugar: Vanguardia 6 (Gana +6 si es la primera carta que juegas en tu turno.)",
    effectId: "vanguardia",
    rarity: "rare",
    keyword: "vanguardia",
    keywordValue: 6,
  },
  {
    id: "trampa_eterea",
    name: "Trampa Etérea",
    category: "Acción",
    subtypes: ["proteccion"],
    cost: 2,
    power: 4,
    text: "Al Jugar: Trampa 5 (La próxima carta enemiga jugada en este carril recibe -5 de poder.)",
    effectId: "trampa_eterea",
    rarity: "rare",
    keyword: "trampa",
    keywordValue: 5,
  },
  {
    id: "empuje_tactico",
    name: "Empuje Táctico",
    category: "Ítem",
    subtypes: ["proteccion", "furia"],
    cost: 2,
    power: 5, // AUTO-BALANCED (era 6, Δ 1.00 → 0.00)
    text: "Al Jugar: Reagrupar (Mueve a tu aliado de menor poder de otro carril a este, si hay espacio.)",
    effectId: "empuje_tactico",
    rarity: "rare",
    keyword: "reagrupar",
  },
  {
    id: "herida_letal",
    name: "Herida Letal",
    category: "Ataque",
    subtypes: ["armas"],
    cost: 3,
    power: 10, // AUTO-BALANCED (era 8, Δ -1.90 → 0.10)
    text: "Al Jugar: Remate 3 (Destruye a una carta enemiga en este carril si su poder es 3 o menor.)",
    effectId: "remate_keyword",
    rarity: "rare",
    keyword: "remate",
    keywordValue: 3,
  },
  {
    id: "yunque_de_guerra",
    name: "Yunque de Guerra",
    category: "Ítem",
    subtypes: ["armas", "furia"], // AUTO-BALANCED (era 6, Δ -0.59 → 0.41)
    text: "Fin de Turno: Eco 6 (Otorga +6 de poder a las cartas en tu mano que compartan subtipo o categoría.)",
    effectId: "eco",
    rarity: "rare",
    keyword: "eco",
    keywordValue: 6,
    trigger: "end_turn",
  },
  {
    id: "muro_escudos",
    name: "Muro Escudos",
    category: "Ítem",
    subtypes: ["armas", "proteccion"],
    cost: 4,
    power: 7, // AUTO-BALANCED (era 10, Δ 2.87 → -0.13)
    text: "Pasivo: Vínculo 9 (Si hay otra carta de su misma categoría aquí, ambas ganan +9.)",
    effectId: "vinculo",
    rarity: "epic",
    keyword: "vinculo",
    keywordValue: 9,
    trigger: "passive",
  },
  {
    id: "bastion",
    name: "Bastión",
    category: "Ítem",
    subtypes: ["proteccion", "armas"],
    cost: 4,
    power: 11, // AUTO-BALANCED (era 14, Δ 3.22 → 0.22) // AUTO-BALANCED (era 10, Δ -4.00 → 0.00)
    text: "Despertar 20: Mejora 8 (Otorga +8 de poder permanente al aliado más débil del carril.)",
    effectId: "despertar",
    rarity: "legendary",
    keyword: "mejora",
    keywordValue: 8,
    trigger: "despertar",
    umbralCondition: { powerThreshold: 20 },
  },
  {
    id: "trono_de_hierro",
    name: "Trono de Hierro",
    category: "Ítem",
    subtypes: ["proteccion", "armas"],
    cost: 5,
    power: 10, // AUTO-BALANCED (era 12, Δ 2.50 → 0.50)
    text: "Al Jugar: Refuerzo 10 (Otorga +10 al aliado jugado inmediatamente antes en este carril.)",
    effectId: "trono_hierro",
    rarity: "legendary",
    keyword: "refuerzo",
    keywordValue: 10,
  },
];

// ---------------------------------------------------------------------------
// MAZO 6: LEGADO DE LA FORJA (Armas y Tempo Clásico)
// ---------------------------------------------------------------------------
const LEGADO_DE_LA_FORJA: CardDef[] = [
  {
    id: "tajo_veloz",
    name: "Tajo Veloz",
    category: "Ataque",
    subtypes: ["armas"],
    cost: 1,
    power: 3, // AUTO-BALANCED (era 4, Δ 0.60 → -0.40)
    text: "Al Jugar: Vanguardia 3 (Gana +3 si es la primera carta que juegas en tu turno.)",
    effectId: "vanguardia",
    rarity: "common",
    keyword: "vanguardia",
    keywordValue: 3,
  },
  {
    id: "pergamino_tactico",
    name: "Pergamino Táctico",
    category: "Ítem",
    subtypes: ["proteccion", "armas"],
    cost: 2,
    power: 8, // AUTO-BALANCED (era 6, Δ -1.70 → 0.30)
    text: "Al Jugar: Celeridad 1 (Reduce en 1 el coste de una carta aleatoria en tu mano hasta que sea jugada.)",
    effectId: "celeridad",
    rarity: "rare",
    keyword: "celeridad",
  },
  {
    id: "embestida",
    name: "Embestida",
    category: "Ataque",
    subtypes: ["armas", "proteccion"],
    cost: 2,
    power: 5, // AUTO-BALANCED (era 6, Δ 1.30 → 0.30)
    text: "Al Jugar: Refuerzo 4 (Otorga +4 al aliado jugado inmediatamente antes en este carril.)",
    effectId: "refuerzo",
    rarity: "rare",
    keyword: "refuerzo",
    keywordValue: 4,
  },
  {
    id: "cuerno_de_batalla",
    name: "Cuerno de Batalla",
    category: "Ítem",
    subtypes: ["furia"],
    cost: 2,
    power: 2, // AUTO-BALANCED (era 4, Δ 1.70 → -0.30)
    text: "Al Jugar: Eco 6 (Otorga +6 de poder a las cartas en tu mano que compartan subtipo o categoría.)",
    effectId: "eco",
    rarity: "rare",
    keyword: "eco",
    keywordValue: 6,
  },
  {
    id: "asalto_coordinado",
    name: "Asalto Coordinado",
    category: "Ataque",
    subtypes: ["armas", "furia"],
    cost: 3,
    power: 10, // AUTO-BALANCED (era 8, Δ -2.00 → 0.00)
    text: "Al Jugar: Ventaja 5 (Gana +5 mientras tu poder total en este carril sea menor al del rival.)",
    effectId: "asalto_coordinado",
    rarity: "rare",
    keyword: "ventaja",
    keywordValue: 5,
  },
  {
    id: "machaque_mortal",
    name: "Machaque Mortal",
    category: "Ataque",
    subtypes: ["armas"],
    cost: 3,
    power: 4, // AUTO-BALANCED (era 6, Δ 1.72 → -0.28)
    text: "Pasivo: Vínculo 8 (Si hay otra carta de su misma categoría aquí, ambas ganan +8.)",
    effectId: "vinculo",
    rarity: "rare",
    keyword: "vinculo",
    keywordValue: 8,
    trigger: "passive",
  },
  {
    id: "sobrecarga",
    name: "Sobrecarga",
    category: "Ítem",
    subtypes: ["armas"],
    cost: 3,
    power: 8, // AUTO-BALANCED (era 6, Δ -1.50 → 0.50)
    text: "Al Jugar: Sobrecarga 5 (Esta carta cuesta 5 menos de energía, pero pierdes 5 de energía el próximo turno.)",
    effectId: "sobrecarga",
    rarity: "rare",
    keyword: "sobrecarga",
    keywordValue: 5,
  },
  {
    id: "golpe_brutal",
    name: "Golpe Brutal",
    category: "Ataque",
    subtypes: ["armas"],
    cost: 3,
    power: 12, // AUTO-BALANCED (era 10, Δ -1.90 → 0.10)
    text: "Último Aliento: Reciclar 2 (Al ser destruida o sacrificada, recuperas 2 de energía.)",
    effectId: "reciclar",
    rarity: "rare",
    keyword: "reciclar",
    keywordValue: 2,
    trigger: "on_death",
  },
  {
    id: "golpe_heroico",
    name: "Golpe Heroico",
    category: "Ataque",
    subtypes: ["armas", "furia"],
    cost: 4,
    power: 9, // AUTO-BALANCED (era 10, Δ 0.90 → -0.10)
    text: "Al Jugar: Refuerzo 7 (Otorga +7 al aliado jugado inmediatamente antes en este carril.)",
    effectId: "golpe_heroico",
    rarity: "epic",
    keyword: "refuerzo",
    keywordValue: 7,
  },
  {
    id: "coraza_de_acero",
    name: "Coraza de Acero",
    category: "Ítem",
    subtypes: ["proteccion", "armas"],
    cost: 4,
    power: 13, // AUTO-BALANCED (era 12, Δ -0.89 → 0.11)
    text: "Pasivo: Baluarte (Tus demás aliados en este carril son inmunes a reducciones de poder enemigas.)",
    effectId: "baluarte",
    rarity: "epic",
    keyword: "baluarte",
    trigger: "passive",
  },
  {
    id: "colera_del_titan",
    name: "Cólera del Titán",
    category: "Ataque",
    subtypes: ["armas", "furia"],
    cost: 5,
    power: 16, // AUTO-BALANCED (era 12, Δ -3.50 → 0.50)
    text: "Al Jugar: Remate 5 (Destruye a una carta enemiga en este carril si su poder es 5 o menor.)",
    effectId: "remate_keyword",
    rarity: "legendary",
    keyword: "remate",
    keywordValue: 5,
  },
  {
    id: "campeon_revestido",
    name: "Campeón Revestido",
    category: "Ataque",
    subtypes: ["armas", "furia"],
    cost: 4,
    power: 16, // AUTO-BALANCED (era 14, Δ -1.82 → 0.18) // AUTO-BALANCED (era 10, Δ -4.00 → 0.00)
    text: "Despertar 18: Retorno 2 (Si el poder de esta carta baja a 2 o menos, o si es destruida/sacrificada, regresa a tu mano con coste 0.)",
    effectId: "despertar",
    rarity: "legendary",
    keyword: "retorno",
    keywordValue: 2,
    trigger: "despertar",
    umbralCondition: { powerThreshold: 18 },
  },
];

// ---------------------------------------------------------------------------
// MAZO 7: MALLA DE EMBOSCADA (Control y Trampas)
// ---------------------------------------------------------------------------
const MALLA_DE_EMBOSCADA: CardDef[] = [
  {
    id: "fuego_cruzado",
    name: "Fuego Cruzado",
    category: "Ataque",
    subtypes: ["armas", "furia"],
    cost: 1,
    power: 3, // AUTO-BALANCED (era 4, Δ 0.60 → -0.40)
    text: "Al Jugar: Ventaja 3 (Gana +3 mientras tu poder total en este carril sea menor al del rival.)",
    effectId: "ventaja",
    rarity: "common",
    keyword: "ventaja",
    keywordValue: 3,
  },
  {
    id: "defensa_desesperada",
    name: "Defensa Desesperada",
    category: "Acción",
    subtypes: ["proteccion"],
    cost: 1,
    power: 2,
    text: "Al Jugar: Trampa 3 (La próxima carta enemiga jugada en este carril recibe -3 de poder.)",
    effectId: "trampa_eterea",
    rarity: "common",
    keyword: "trampa",
    keywordValue: 3,
  },
  {
    id: "red_tactica",
    name: "Red Táctica",
    category: "Ítem",
    subtypes: ["proteccion", "armas"],
    cost: 2,
    power: 6,
    text: "Pasivo: Muro (El rival debe jugar sus próximas cartas en este carril si no ha alcanzado el límite.)",
    effectId: "muro_keyword",
    rarity: "rare",
    keyword: "muro",
    trigger: "passive",
  },
  {
    id: "sombra_acechante",
    name: "Sombra Acechante",
    category: "Ataque",
    subtypes: ["armas"],
    cost: 1,
    power: 3, // AUTO-BALANCED (era 4, Δ 1.50 → 0.50)
    text: "Al Jugar: Sigilo (Durante su primer turno en mesa, no puede ser objetivo de efectos directos enemigos.)",
    effectId: "sigilo",
    rarity: "common",
    keyword: "sigilo",
  },
  {
    id: "abrojos_de_acero",
    name: "Abrojos de Acero",
    category: "Ítem",
    subtypes: ["armas"],
    cost: 2,
    power: 4,
    text: "Al Jugar: Trampa 5 (La próxima carta enemiga jugada en este carril recibe -5 de poder.)",
    effectId: "trampa_eterea",
    rarity: "rare",
    keyword: "trampa",
    keywordValue: 5,
  },
  {
    id: "hostigamiento_tactico",
    name: "Hostigamiento Táctico",
    category: "Acción",
    subtypes: ["furia", "armas"],
    text: "Al Jugar: Emboscada 10 (Gana +10 de poder si el rival ya tiene el carril lleno, 4 cartas.)",
    effectId: "emboscada",
    rarity: "rare",
    keyword: "emboscada",
    keywordValue: 10,
  },
  {
    id: "contraofensiva",
    name: "Contraofensiva",
    category: "Acción",
    subtypes: ["armas", "proteccion"],
    cost: 3,
    power: 8, // AUTO-BALANCED (era 10, Δ 2.50 → 0.50)
    text: "Al Jugar: Transferencia 4 (Resta 4 de poder a un aliado en este carril y se lo otorga a un aliado en otro carril.)",
    effectId: "transferencia",
    rarity: "rare",
    keyword: "transferencia",
    keywordValue: 4,
  },
  {
    id: "cota_reforzada",
    name: "Cota Reforzada",
    category: "Ítem",
    subtypes: ["proteccion"],
    cost: 3,
    power: 8, // AUTO-BALANCED (era 10, Δ 2.26 → 0.26)
    text: "Pasivo: Refugio 5 (Absorbe hasta 5 puntos de reducción de poder que vaya a sufrir un aliado en este carril.)",
    effectId: "refugio",
    rarity: "rare",
    keyword: "refugio",
    keywordValue: 5,
    trigger: "passive",
  },
  {
    id: "tactico_ligero",
    name: "Táctico Ligero",
    category: "Ataque",
    subtypes: ["armas"],
    cost: 3,
    power: 12, // AUTO-BALANCED (era 10, Δ -1.58 → 0.42)
    text: "Último Aliento: Retorno 2 (Si el poder de esta carta baja a 2 o menos, o si es destruida/sacrificada, regresa a tu mano con coste 0.)",
    effectId: "retorno",
    rarity: "rare",
    keyword: "retorno",
    keywordValue: 2,
    trigger: "on_death",
  },
  {
    id: "emboscada_mortal",
    name: "Emboscada Mortal",
    category: "Ataque",
    subtypes: ["armas", "furia"],
    cost: 4,
    power: 12, // AUTO-BALANCED (era 10, Δ -1.50 → 0.50)
    text: "Al Jugar: Remate 5 (Destruye a una carta enemiga en este carril si su poder es 5 o menor.)",
    effectId: "remate_keyword",
    rarity: "epic",
    keyword: "remate",
    keywordValue: 5,
  },
  {
    id: "estacion_de_reaprovisionamiento",
    name: "Estación de Reaprovisionamiento",
    category: "Ítem",
    subtypes: ["armas", "proteccion"],
    cost: 4,
    power: 12, // AUTO-BALANCED (era 10, Δ -1.74 → 0.26)
    text: "Fin de Turno: Renovación 6 (Descarta 1 carta de tu mano para robar 6 cartas del mazo.)",
    effectId: "renovacion",
    rarity: "epic",
    keyword: "renovacion",
    keywordValue: 6,
    trigger: "end_turn",
  },
  {
    id: "comandante_de_vanguardia",
    name: "Comandante de Vanguardia",
    category: "Ataque",
    subtypes: ["armas", "proteccion"],
    cost: 5,
    power: 13, // AUTO-BALANCED (era 18, Δ 4.90 → -0.10) // AUTO-BALANCED (era 12, Δ -6.00 → 0.00)
    text: "Despertar 20: Mejora 10 (Otorga +10 de poder permanente al aliado más débil del carril.)",
    effectId: "despertar",
    rarity: "legendary",
    keyword: "mejora",
    keywordValue: 10,
    trigger: "despertar",
    umbralCondition: { powerThreshold: 20 },
  },
];

// ============================================================================
// ETAPA 2 — Test cards for the 5 defensive / counter keywords (spec 2026-10).
// These are designed for playtesting the new defensive pipeline in the deck
// editor + sandbox matches. NOT part of the default WARRIOR_DECK.
// ============================================================================
const DEFENSIVA_TEST: CardDef[] = [
  // 05. Cúpula [3] — passive, PROPIO+CARRIL_LOCAL — absorption pool refreshed each turn
  {
    id: "escudo_cupula",
    name: "Escudo Cúpula",
    category: "Ítem",
    subtypes: ["proteccion", "armas"],
    text: "Pasivo: Cúpula 3 (Cancela hasta 3 puntos de reducciones enemigas dirigidas a este carril. Pool renovado cada turno.)",
    effectId: "muro_escudos", // re-uses existing passive effectId; cupulaRemaining is set at card creation based on keyword
    rarity: "rare",
    keyword: "cupula",
    keywordValue: 3,
    trigger: "passive",
  },
  // 06. Guardián — passive, CARRIL_LOCAL — redirects debuffs from local allies to self
  {
    id: "guardian_del_carril",
    name: "Guardián del Carril",
    category: "Ataque",
    subtypes: ["proteccion"],
    cost: 3,
    power: 9,
    text: "Pasivo: Guardián (Redirige hacia esta carta las reducciones de poder enemigas dirigidas a sus aliados locales.)",
    effectId: "muro_escudos", // passive placeholder; isGuardian flag set at card creation based on keyword
    rarity: "rare",
    keyword: "guardian",
    trigger: "passive",
  },
  // 07. Perforación [2] — on_play, PROPIO — bypass up to 2 prevention points on next debuff
  {
    id: "lanza_perforante",
    name: "Lanza Perforante",
    category: "Ataque",
    subtypes: ["armas"],
    cost: 3,
    power: 12, // AUTO-BALANCED (era 9, Δ -2.50 → 0.50)
    text: "Al Jugar: Perforación 2 (Ignora hasta 2 puntos de Prevención (Cúpula/Baluarte) del objetivo al reducir su poder.)",
    effectId: "seccionar", // re-uses seccionar (-3 to strongest enemy) which now goes through applyDebuff
    rarity: "rare",
    keyword: "perforacion",
    keywordValue: 2,
    trigger: "on_play",
  },
  // 04. Espinas [2] — reaction, CARRIL_LOCAL — counter-attacks the attacker with -2
  {
    id: "armadura_espinada",
    name: "Armadura Espinada",
    category: "Ítem",
    subtypes: ["proteccion"],
    cost: 2,
    power: 7, // AUTO-BALANCED (era 6, Δ -0.62 → 0.38)
    text: "Reacción: Espinas 2 (Aplica -2 a la carta enemiga que le aplique una reducción a esta carta.)",
    effectId: "muro_escudos", // passive placeholder; espinas reaction fires inline from applyDebuff
    rarity: "rare",
    keyword: "espinas",
    keywordValue: 2,
    trigger: "reaction",
  },
  // 03. Enrabia [4] — reaction, PROPIO — one-shot +4 the first time it's debuffed
  {
    id: "berseker_enrabia",
    name: "Berseker Enrabia",
    category: "Ataque",
    subtypes: ["furia"],
    cost: 2,
    power: 5,
    text: "Reacción: Enrabia 4 (Gana +4 la primera vez que sufre una reducción de poder enemiga.)",
    effectId: "muro_escudos", // passive placeholder; enrabia reaction fires inline from applyDebuff
    rarity: "rare",
    keyword: "enrabia",
    keywordValue: 4,
    trigger: "reaction",
  },
];

// ============================================================================
// ETAPA 3 — Test cards for the remaining 5 keywords (spec 2026-10).
// Sangrado / Frenesí / Desarme / Mejora / Ofrenda.
// ============================================================================
const ETAPA3_TEST: CardDef[] = [
  // 01. Sangrado [2] — start_turn, CARRIL_LOCAL — progressive -X to strongest enemy in lane
  {
    id: "daga_sangrante",
    name: "Daga Sangrante",
    category: "Ataque",
    subtypes: ["armas", "furia"],
    cost: 3,
    power: 11, // AUTO-BALANCED (era 7, Δ -4.00 → -0.00)
    text: "Inicio de Turno: Sangrado 2 (Aplica -2 de poder al enemigo más fuerte del carril, cada turno.)",
    effectId: "sangrado",
    rarity: "rare",
    keyword: "sangrado",
    keywordValue: 2,
    trigger: "start_turn",
  },
  // 02. Frenesí [3] — start_turn, PROPIO — +3 cumulative each turn start
  {
    id: "berseker_frenetico",
    name: "Berseker Frenético",
    category: "Ataque",
    subtypes: ["furia"],
    cost: 3,
    power: 10, // AUTO-BALANCED (era 7, Δ -3.38 → -0.38)
    text: "Inicio de Turno: Frenesí 3 (Gana +3 de poder acumulativo cada vez que se dispara su trigger.)",
    effectId: "grito_batalla", // re-uses end_turn +1 to self; frenesí adds +3 via helper at start_turn
    rarity: "epic",
    keyword: "frenesi",
    keywordValue: 3,
    trigger: "start_turn",
  },
  // 08. Desarme [2] — on_play, CARRIL_LOCAL — reduce strongest enemy's keywordValue
  {
    id: "red_de_desarme",
    name: "Red de Desarme",
    category: "Acción",
    subtypes: ["proteccion", "armas"],
    cost: 2,
    power: 7, // AUTO-BALANCED (era 6, Δ -1.10 → -0.10)
    text: "Al Jugar: Desarme 2 (Reduce en 2 el valor de las keywords del enemigo más fuerte del carril.)",
    effectId: "desarme",
    rarity: "rare",
    keyword: "desarme",
    keywordValue: 2,
    trigger: "on_play",
  },
  // 09. Mejora [3] — on_play, CARRIL_LOCAL — permanent +X to weakest ally
  {
    id: "ritual_de_mejora",
    name: "Ritual de Mejora",
    category: "Acción",
    subtypes: ["furia", "armas"],
    cost: 2,
    power: 6, // AUTO-BALANCED (era 4, Δ -1.90 → 0.10)
    text: "Al Jugar: Mejora 3 (Otorga +3 de poder permanente al aliado más débil del carril.)",
    effectId: "mejora",
    rarity: "rare",
    keyword: "mejora",
    keywordValue: 3,
    trigger: "on_play",
  },
  // 34. Ofrenda — TRIGGER (moved from keyword per spec 2026-10 amendment) — marks self as priority Sacrificio target
  {
    id: "cabra_ofrenda",
    name: "Cabra de Ofrenda",
    category: "Ítem",
    subtypes: ["armas", "proteccion"],
    cost: 1,
    power: 6, // AUTO-BALANCED (era 3, Δ -2.50 → 0.50)
    text: "Cabra de Ofrenda. Coste 1, Poder 6.",
    effectId: "muro_escudos", // passive placeholder; isOfrenda flag set at card creation based on trigger
    rarity: "common",
    trigger: "ofrenda",
  },
];

// ============================================================================
// ALL_CARDS — todas las cartas concatenadas (incluye DEFENSIVA_TEST + ETAPA3_TEST)
// ============================================================================
export const ALL_CARDS: CardDef[] = [
  ...FURIA_DE_SANGRE,
  ...FALANGE_INEXPUGNABLE,
  ...MAESTROS_DE_LA_FORJA,
  ...IMPULSO_SANGRIENTO,
  ...BASTION_INQUEBRANTABLE,
  ...LEGADO_DE_LA_FORJA,
  ...MALLA_DE_EMBOSCADA,
  ...DEFENSIVA_TEST,
  ...ETAPA3_TEST,
];

// ============================================================================
// Default deck for new games — use the first deck (Furia de Sangre)
// ============================================================================
export const WARRIOR_DECK: CardDef[] = FURIA_DE_SANGRE;

// ============================================================================
// PRESET_DECKS — 7 mazos predeterminados para el selector del DeckEditor
// ============================================================================
export interface PresetDeck {
  id: string;
  name: string;
  emoji: string;
  description: string;
  cards: CardDef[];
}

export const PRESET_DECKS: PresetDeck[] = [
  {
    id: "furia_de_sangre",
    name: "Furia de Sangre",
    emoji: "🩸",
    description: "Agresión y Sacrificio",
    cards: FURIA_DE_SANGRE,
  },
  {
    id: "falange_inexpugnable",
    name: "Falange Inexpugnable",
    emoji: "🛡️",
    description: "Escudos y Control",
    cards: FALANGE_INEXPUGNABLE,
  },
  {
    id: "maestros_de_la_forja",
    name: "Maestros de la Forja",
    emoji: "🔨",
    description: "Armas y Tempo",
    cards: MAESTROS_DE_LA_FORJA,
  },
  {
    id: "impulso_sangriento",
    name: "Impulso Sangriento",
    emoji: "⚔️",
    description: "Furia y Agresión Clásica",
    cards: IMPULSO_SANGRIENTO,
  },
  {
    id: "bastion_inquebrantable",
    name: "Bastión Inquebrantable",
    emoji: "🏰",
    description: "Control y Muro Clásico",
    cards: BASTION_INQUEBRANTABLE,
  },
  {
    id: "legado_de_la_forja",
    name: "Legado de la Forja",
    emoji: "⚒️",
    description: "Armas y Tempo Clásico",
    cards: LEGADO_DE_LA_FORJA,
  },
  {
    id: "malla_de_emboscada",
    name: "Malla de Emboscada",
    emoji: "🎯",
    description: "Control y Trampas",
    cards: MALLA_DE_EMBOSCADA,
  },
];

// ============================================================================
// Card pools for the deck editor
// ============================================================================
export const BASIC_CARDS: CardDef[] = ALL_CARDS.filter((c) => c.rarity === "common");
export const TACTICAL_CARDS: CardDef[] = ALL_CARDS.filter((c) => c.rarity !== "common");

// ============================================================================
// Draw pile builders
// ============================================================================
export function buildDrawPileFrom(deck: CardDef[]): CardDef[] {
  const pile: CardDef[] = deck.map((c) => ({ ...c }));
  for (let i = pile.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pile[i], pile[j]] = [pile[j], pile[i]];
  }
  return pile;
}

export function buildDrawPile(): CardDef[] {
  return buildDrawPileFrom(WARRIOR_DECK);
}
