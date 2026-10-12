import type { CardDef } from "./types";

// Warrior deck - 12 unique cards. The deck is duplicated and shuffled per game
// to give a stable 24-card draw pile.
export const WARRIOR_DECK: CardDef[] = [
  {
    id: "golpe_heroico",
    name: "Golpe Heroico",
    category: "Ataque",
    subtypes: ["armas", "furia"],
    cost: 4,
    power: 15,
    text: "+4 a tus demás cartas en este carril",
    effectId: "golpe_heroico",
  },
  {
    id: "seccionar",
    name: "Seccionar",
    category: "Ataque",
    subtypes: ["armas"],
    cost: 1,
    power: 5,
    text: "Resta -2 al enemigo más fuerte del carril",
    effectId: "seccionar",
  },
  {
    id: "machaque_mortal",
    name: "Machaque Mortal",
    category: "Ataque",
    subtypes: ["armas"],
    cost: 3,
    power: 10,
    text: "+2 por cada carta de Ataque en el carril",
    effectId: "machaque_mortal",
  },
  {
    id: "ejecutar",
    name: "Ejecutar",
    category: "Ataque",
    subtypes: ["armas", "furia"],
    cost: 5,
    power: 18,
    text: "+5 si el rival supera 20 pts en el carril",
    effectId: "ejecutar",
  },
  {
    id: "bloqueo_escudo",
    name: "Bloqueo Escudo",
    category: "Ítem",
    subtypes: ["proteccion"],
    cost: 2,
    power: 8,
    text: "Resta -3 al enemigo más fuerte del carril",
    effectId: "bloqueo_escudo",
  },
  {
    id: "muro_escudos",
    name: "Muro Escudos",
    category: "Ítem",
    subtypes: ["armas", "proteccion"],
    cost: 4,
    power: 14,
    text: "+3 a tus cartas de Ítem en el carril",
    effectId: "muro_escudos",
  },
  {
    id: "pocion_vida",
    name: "Poción de Vida",
    category: "Ítem",
    subtypes: ["proteccion", "furia"],
    cost: 1,
    power: 4,
    text: "+2 por cada carta de Ítem en el carril",
    effectId: "pocion_vida",
  },
  {
    id: "provocar",
    name: "Provocar",
    category: "Magia",
    subtypes: ["proteccion"],
    cost: 1,
    power: 4,
    text: "+3 si hay carta con subtipo Protección",
    effectId: "provocar",
  },
  {
    id: "ira_rabiosa",
    name: "Ira Rabiosa",
    category: "Magia",
    subtypes: ["furia", "proteccion"],
    cost: 2,
    power: 6,
    text: "+3 si hay carta con subtipo Furia",
    effectId: "ira_rabiosa",
  },
  {
    id: "grito_batalla",
    name: "Grito de Batalla",
    category: "Magia",
    subtypes: ["furia"],
    cost: 3,
    power: 8,
    text: "+2 a las cartas con subtipo Furia en tu mano",
    effectId: "grito_batalla",
  },
  {
    id: "filotormenta",
    name: "Filotormenta",
    category: "Ataque",
    subtypes: ["armas", "furia"],
    cost: 4,
    power: 12,
    text: "Resta -1 a todos los rivales en mesa",
    effectId: "filotormenta",
  },
  {
    id: "avatar_titan",
    name: "Avatar del Titán",
    category: "Magia",
    subtypes: ["armas", "proteccion", "furia"],
    cost: 5,
    power: 16,
    text: "+1 por cada carta en la mesa",
    effectId: "avatar_titan",
  },
];

export function buildDrawPile(): CardDef[] {
  // 12 unique cards, no duplicates — Fisher-Yates shuffle.
  const pile: CardDef[] = WARRIOR_DECK.map((c) => ({ ...c }));
  for (let i = pile.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pile[i], pile[j]] = [pile[j], pile[i]];
  }
  return pile;
}
