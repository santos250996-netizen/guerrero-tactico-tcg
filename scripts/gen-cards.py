#!/usr/bin/env python3
"""
Generate src/lib/game/cards.ts from the official 84-card catalog.
Each card has: id, name, category, subtypes, cost, power, text, effectId, rarity, keyword?, keywordValue?, trigger?, umbralCondition?
"""

# Catalog: 7 decks × 12 cards = 84 cards
# Format: (name, category, subtypes_str, cost, power, trigger_desc, text, keyword, keyword_value, effectId, trigger, umbral_threshold)
# trigger_desc is just for grouping, not used in the card

CATALOG = [
    # ===== DECK 1: FURIA DE SANGRE =====
    ("Tajo Frenético", "Ataque", "furia", 1, 4.0,
     "On Play: Ventaja +2 (Gana +2 de poder si el rival supera tu poder en este carril).",
     "ventaja", 2, "ventaja", "on_play", None),
    ("Llamado de Sangre", "Acción", "furia", 1, 2.5,
     "On Play: Eco 3 (Otorga +3 de poder a la próxima carta de Furia que juegues de tu mano).",
     "eco", 3, "eco", "on_play", None),
    ("Corte Desgarrador", "Ataque", "armas,furia", 2, 4.5,
     "On Play: Sacrificio (Destruye un aliado de menor coste). Gana +5 de poder a sí misma.",
     "sacrificio", 5, "sacrificio_keyword", "on_play", None),
    ("Grito de Desafío", "Acción", "furia", 2, 4.5,
     "Pasivo: Ventaja +4 (Gana +4 de poder mientras el rival tenga más cartas en mesa que tú).",
     "ventaja", 4, "ventaja", "passive", None),
    ("Amuleto de Frenesí", "Ítem", "furia", 2, 3.0,
     "Start Turn: Otorga +5 de poder repartido entre tus aliados con el subtipo Furia.",
     "refuerzo", 5, "golpe_heroico", "start_turn", None),
    ("Rito de Cólera", "Acción", "furia,proteccion", 3, 6.5,
     "Último Aliento: Otorga +8 de poder a la carta de mayor poder base que tengas en la mano.",
     "ultimo_aliento", 8, "ultimo_aliento", "on_death", None),
    ("Masacre Brutal", "Ataque", "armas,furia", 3, 7.5,
     "Despertar 14: Ejecuta Remate 4 (Inflige 4 de daño directo al héroe o carta enemiga más débil).",
     "despertar", 14, "despertar_umbral", "umbral", 14),
    ("Poción de Cólera", "Ítem", "furia", 3, 9.5,
     "On Play: Otorga Celeridad al aliado en este carril y Ventaja +3 si vas perdiendo el carril.",
     "celeridad", None, "celeridad", "on_play", None),
    ("Carga Incontenible", "Ataque", "furia", 4, 9.5,
     "On Play: Ejecuta Remate 5 contra la carta enemiga de menor poder en mesa.",
     "remate", 5, "remate_keyword", "on_play", None),
    ("Golpe Demoledor", "Ataque", "armas,furia", 4, 11.5,
     "Último Aliento: Retorno 3 (Regresa a tu mano reduciendo en 3 su coste de energía).",
     "retorno", 3, "retorno", "on_death", None),
    ("Tótem Sangriento", "Ítem", "furia,proteccion", 4, 7.5,
     "Pasivo: Reduce en 1 el coste de energía de tus cartas de categoría Ataque en mano.",
     "celeridad", None, "celeridad", "passive", None),
    ("Decreto de Masacre", "Acción", "armas,furia", 5, 11.5,
     "On Play: Sacrificio (Destruye tu aliado con menos poder). Otorga +8 de poder total a tus demás aliados.",
     "sacrificio", 8, "sacrificio_keyword", "on_play", None),

    # ===== DECK 2: FALANGE INEXPUGNABLE =====
    ("Estocada Defensiva", "Ataque", "proteccion", 1, 3.5,
     "On Play: Gana +2 de poder a sí misma si tienes al menos un aliado con el subtipo Protección.",
     "ventaja", 2, "provocar", "on_play", None),
    ("Escudo de Tilo", "Ítem", "proteccion", 1, 2.5,
     "On Play: Trampa 3 (Si el rival juega una carta en este carril, le resta -3 de poder).",
     "trampa", 3, "trampa_eterea", "on_play", None),
    ("Orden de Cohesión", "Acción", "proteccion", 1, 2.0,
     "Pasivo: Vínculo +3 (Gana +3 de poder por cada carta de Ítem en el carril).",
     "vinculo", 3, "vinculo", "passive", None),
    ("Embestida con Escudo", "Ataque", "proteccion,armas", 2, 5.5,
     "Pasivo: Muro (Obliga a los enemigos de este carril a atacarla antes que a tus otras cartas).",
     "muro", None, "muro_keyword", "passive", None),
    ("Vendas Reforzadas", "Ítem", "proteccion", 2, 4.0,
     "End Turn: Otorga +5 de poder al aliado con menor poder en el tablero.",
     "refuerzo", 5, "refuerzo", "end_turn", None),
    ("Postura Inquebrantable", "Acción", "proteccion", 2, 3.5,
     "Pasivo: Baluarte (Reduce en 2 todo el daño que reciban tus cartas en este carril).",
     "baluarte", None, "baluarte", "passive", None),
    ("Baluarte de la Alianza", "Ítem", "proteccion,armas", 3, 6.5,
     "Pasivo: Refuerzo 6 (Otorga +6 de poder al aliado adyacente que tenga menor poder).",
     "refuerzo", 6, "refuerzo", "passive", None),
    ("Contraataque Táctico", "Ataque", "proteccion", 3, 8.5,
     "On Play: Vanguardia +7 (Gana +7 de poder si es la primera carta que juegas en este turno).",
     "vanguardia", 7, "vanguardia", "on_play", None),
    ("Maniobra de Falange", "Acción", "proteccion", 3, 6.5,
     "Último Aliento: Trampa 9 (Aplica una trampa de -9 de poder al carril donde murió).",
     "trampa", 9, "trampa_eterea", "on_death", None),
    ("Gran Escudo del Bastión", "Ítem", "proteccion,armas", 4, 9.5,
     "On Play: Resta -8 de poder a la carta enemiga de mayor poder en la mesa.",
     "trampa", 8, "bloqueo_escudo", "on_play", None),
    ("Barrida de Alabarda", "Ataque", "proteccion,armas", 4, 10.5,
     "On Play: Resta -7 de poder repartido equitativamente entre todas las cartas enemigas en mesa.",
     "trampa", 7, "filotormenta", "on_play", None),
    ("Aegis del Bastión", "Acción", "proteccion,armas", 5, 8.5,
     "Start Turn: Otorga +10 de poder repartido entre tus aliados del subtipo Protección.",
     "refuerzo", 10, "golpe_heroico", "start_turn", None),

    # ===== DECK 3: MAESTROS DE LA FORJA =====
    ("Tajo Forjado", "Ataque", "armas", 1, 3.5,
     "On Play: Vanguardia +3 (Gana +3 de poder si la juegas en un carril vacío).",
     "vanguardia", 3, "vanguardia", "on_play", None),
    ("Plano de Armadura", "Ítem", "armas", 1, 3.5,
     "On Play: Otorga Celeridad a la carta objetivo en la mano (se puede jugar sin consumir turno).",
     "celeridad", None, "celeridad", "on_play", None),
    ("Corte Templado", "Ataque", "armas", 1, 3.5,
     "Último Aliento: Reciclar 1 (Devuelve a la mano 1 carta de Armas de tu cementerio).",
     "reciclar", 1, "reciclar", "on_death", None),
    ("Golpe Forjador", "Ataque", "armas,furia", 2, 4.5,
     "Pasivo: Aislado +8 (Gana +8 de poder si es la única carta en tu lado del carril).",
     "aislado", 8, "aislado", "passive", None),
    ("Afilado Táctico", "Acción", "armas", 2, 5.5,
     "On Play: Refuerzo 4 (Otorga +4 de poder a la carta de Armas adyacente).",
     "refuerzo", 4, "refuerzo", "on_play", None),
    ("Yunque Runificado", "Ítem", "armas,proteccion", 2, 3.5,
     "End Turn: Eco 5 (Otorga +5 de poder a la carta de Armas con menor poder en tu mano).",
     "eco", 5, "eco", "end_turn", None),
    ("Estocada Maestra", "Ataque", "armas", 3, 9.5,
     "Despertar 15: Otorga +6 de poder a su aliado adyacente cuando alcance 15 de poder total.",
     "despertar", 15, "despertar_umbral", "umbral", 15),
    ("Sobrecarga Térmica", "Acción", "armas", 3, 6.5,
     "On Play: Sobrecarga 5 (Otorga +5 de poder a esta carta, pero pierdes 1 de energía el próximo turno).",
     "sobrecarga", 5, "sobrecarga", "on_play", None),
    ("Martillazo de Guerra", "Ataque", "armas,furia", 3, 7.5,
     "On Play: Remate 4 (Inflige 4 de daño directo a la carta enemiga de este carril).",
     "remate", 4, "remate_keyword", "on_play", None),
    ("Coraza de Mitril", "Ítem", "armas,proteccion", 4, 10.5,
     "Pasivo: Vínculo +9 (Gana +9 de poder mientras esté equipada a una carta de categoría Ataque).",
     "vinculo", 9, "vinculo", "passive", None),
    ("Filo Legendario", "Ítem", "armas,furia", 4, 10.5,
     "Último Aliento: Otorga +9 de poder a la carta aliada más cercana al ser destruida.",
     "ultimo_aliento", 9, "ultimo_aliento", "on_death", None),
    ("Embate del Titán", "Ataque", "armas,furia", 5, 11.5,
     "On Play: Resta -4 de poder al enemigo de mayor poder y ejecuta Remate 5 contra él.",
     "remate", 5, "remate_keyword", "on_play", None),

    # ===== DECK 4: IMPULSO SANGRIENTE =====
    ("Grito Salvaje", "Acción", "furia", 1, 3.5,
     "On Play: Ventaja +3 (Gana +3 de poder si el total de poder del rival es superior al tuyo).",
     "ventaja", 3, "ventaja", "on_play", None),
    ("Poción de Vida", "Ítem", "proteccion,furia", 1, 3.5,
     "On Play: Refuerzo 2 (Restaura 2 de poder a tu aliado en este carril).",
     "refuerzo", 2, "refuerzo", "on_play", None),
    ("Seccionar", "Ataque", "armas", 1, 3.5,
     "On Play: Resta -2 de poder a la carta enemiga con mayor poder en su carril.",
     "trampa", 2, "seccionar", "on_play", None),
    ("Ira Rabiosa", "Acción", "furia,proteccion", 2, 4.5,
     "Pasivo: Vínculo +7 (Gana +7 de poder por cada aliado con el subtipo Furia en mesa).",
     "vinculo", 7, "vinculo", "passive", None),
    ("Burla Sádica", "Acción", "furia", 2, 4.5,
     "On Play: Ventaja +8 (Otorga +8 de poder al aliado objetivo si el carril enemigo está lleno).",
     "emboscada", 8, "emboscada", "on_play", None),
    ("Berserker", "Acción", "furia", 3, 6.0,
     "Despertar 16: Ejecuta Remate 7 a la carta enemiga de menor poder al alcanzar 16 de poder.",
     "despertar", 16, "despertar_umbral", "umbral", 16),
    ("Grito de Batalla", "Acción", "furia", 3, 7.5,
     "On Play: Eco 6 (Otorga +6 de poder repartido entre las cartas de subtipo Furia en tu mano).",
     "eco", 6, "eco", "on_play", None),
    ("Venganza", "Acción", "furia", 3, 7.5,
     "On Play: Ventaja +10 (Gana +10 de poder a sí misma si destruyeron un aliado en el turno anterior).",
     "ventaja", 10, "ventaja", "on_play", None),
    ("Filotormesta", "Ataque", "armas,furia", 4, 10.5,
     "On Play: Resta -7 de poder repartido entre todas las cartas enemigas del carril opuesto.",
     "trampa", 7, "filotormenta", "on_play", None),
    ("Carga Devastadora", "Ataque", "furia", 4, 15.5,
     "On Play: Sacrificio (Destruye un aliado de Coste 1 o 2). Otorga +5 de poder al aliado con menos poder.",
     "sacrificio", 5, "sacrificio_keyword", "on_play", None),
    ("Masacre Sangrienta", "Ataque", "armas,furia", 5, 12.0,
     "Pasivo: Aislado +13 (Gana +13 de poder si no tienes más aliados en esta fila).",
     "aislado", 13, "aislado", "passive", None),
    ("Avatar del Titán", "Acción", "armas,proteccion,furia", 5, 11.5,
     "On Play: Gana +10 de poder adicional repartido en proporción a las cartas presentes en mesa.",
     "refuerzo", 10, "avatar_titan", "on_play", None),

    # ===== DECK 5: BASTIÓN INQUEBRANTABLE =====
    ("Vendas de Guerra", "Ítem", "proteccion", 1, 2.5,
     "End Turn: Otorga +3 de poder al aliado con menor poder en el tablero.",
     "refuerzo", 3, "refuerzo", "end_turn", None),
    ("Provocar", "Acción", "proteccion", 1, 2.0,
     "Pasivo: Muro (Fuerza a todas las cartas enemigas del carril a enfocar sus efectos en ella).",
     "muro", None, "muro_keyword", "passive", None),
    ("Estandarte de Guerra", "Ítem", "proteccion", 1, 1.0,
     "Pasivo: Baluarte (Otorga inmunidad contra la primera reducción de poder del turno a sus aliados).",
     "baluarte", None, "baluarte", "passive", None),
    ("Bloqueo Escudo", "Ítem", "proteccion", 2, 4.5,
     "On Play: Resta -5 de poder a la carta enemiga que tenga más poder en la mesa.",
     "trampa", 5, "bloqueo_escudo", "on_play", None),
    ("Centinela", "Ítem", "proteccion,armas", 2, 5.5,
     "On Play: Vanguardia +6 (Gana +6 de poder si se juega para defender un carril amenazado).",
     "vanguardia", 6, "vanguardia", "on_play", None),
    ("Trampa Etérea", "Acción", "proteccion", 2, 4.5,
     "On Play: Trampa 5 (Coloca una marca en el carril; resta -5 a la próxima carta que juegue el rival ahí).",
     "trampa", 5, "trampa_eterea", "on_play", None),
    ("Empuje Táctico", "Ítem", "proteccion,furia", 2, 5.5,
     "On Play: Reagrupar (Mueve tu aliado con menos poder a un carril seguro y le otorga +2 de poder).",
     "reagrupar", None, "empuje_tactico", "on_play", None),
    ("Herida Letal", "Ataque", "armas", 3, 8.5,
     "On Play: Remate 3 (Aplica 3 de daño directo a la carta enemiga frente a ella).",
     "remate", 3, "remate_keyword", "on_play", None),
    ("Yunque de Guerra", "Ítem", "armas", 3, 6.5,
     "End Turn: Eco 6 (Otorga +6 de poder repartido entre las cartas de categoría Ítem en tu mano).",
     "eco", 6, "eco", "end_turn", None),
    ("Muro Escudos", "Ítem", "armas,proteccion", 4, 10.5,
     "Pasivo: Vínculo +9 (Gana +9 de poder si hay al menos otra carta con el subtipo Protección al lado).",
     "vinculo", 9, "vinculo", "passive", None),
    ("Bastión", "Ítem", "proteccion,armas", 4, 9.5,
     "Despertar 20: Otorga +8 de poder repartido entre todos tus aliados en mesa al sumar 20 de poder.",
     "despertar", 20, "despertar_umbral", "umbral", 20),
    ("Trono de Hierro", "Ítem", "proteccion,armas", 5, 11.5,
     "On Play: Otorga +10 de poder repartido equitativamente entre todas tus cartas en el tablero.",
     "refuerzo", 10, "trono_hierro", "on_play", None),

    # ===== DECK 6: LEGADO DE LA FORJA =====
    ("Tajo Veloz", "Ataque", "armas", 1, 3.5,
     "On Play: Vanguardia +3 (Gana +3 de poder si la juegas al inicio del turno).",
     "vanguardia", 3, "vanguardia", "on_play", None),
    ("Pergamino Táctico", "Ítem", "proteccion,armas", 2, 5.5,
     "On Play: Otorga Celeridad a tu próxima carta y Refuerzo 2 (+2 de poder al aliado adyacente).",
     "celeridad", None, "celeridad", "on_play", None),
    ("Embestida", "Ataque", "armas,proteccion", 2, 5.5,
     "On Play: Refuerzo 4 (Otorga +4 de poder al último aliado que hayas jugado este turno).",
     "refuerzo", 4, "refuerzo", "on_play", None),
    ("Cuerno de Batalla", "Ítem", "furia", 2, 3.5,
     "On Play: Eco 6 (Otorga +6 de poder repartido entre las cartas de categoría Ataque en tu mano).",
     "eco", 6, "eco", "on_play", None),
    ("Asalto Coordinado", "Ataque", "armas,furia", 3, 8.5,
     "On Play: Gana +5 de poder a sí misma si tienes al menos un aliado ocupando cada carril.",
     "ventaja", 5, "asalto_coordinado", "on_play", None),
    ("Machaque Mortal", "Ataque", "armas", 3, 6.5,
     "Pasivo: Vínculo +8 (Gana +8 de poder mientras tengas otra carta de categoría Ataque en tu mano).",
     "vinculo", 8, "vinculo", "passive", None),
    ("Sobrecarga", "Ítem", "armas", 3, 6.5,
     "On Play: Sobrecarga 5 (Otorga +5 de poder a esta carta; cuesta 1 menos de energía jugar cartas de Armas este turno).",
     "sobrecarga", 5, "sobrecarga", "on_play", None),
    ("Golpe Brutal", "Ataque", "armas", 3, 9.5,
     "Último Aliento: Reciclar 2 (Recupera hasta 2 cartas de categoría Armas desde tu cementerio a la mano).",
     "reciclar", 2, "reciclar", "on_death", None),
    ("Golpe Heroico", "Ataque", "armas,furia", 4, 10.5,
     "On Play: Otorga +7 de poder repartido entre todas tus demás cartas en mesa.",
     "refuerzo", 7, "golpe_heroico", "on_play", None),
    ("Coraza de Acero", "Ítem", "proteccion,armas", 4, 11.5,
     "Pasivo: Baluarte (Reduce en 3 todo el daño o reducción de poder dirigida a la carta equipada).",
     "baluarte", None, "baluarte", "passive", None),
    ("Cólera del Titán", "Ataque", "armas,furia", 5, 11.5,
     "On Play: Resta -4 de poder al enemigo con más poder y ejecuta Remate 5 contra él.",
     "remate", 5, "remate_keyword", "on_play", None),
    ("Campeón Revestido", "Ataque", "armas,furia", 4, 10.5,
     "Despertar 18: Retorno 2 (Regresa a tu mano si es destruida) y otorga +3 de poder a su adyacente.",
     "despertar", 18, "despertar_umbral", "umbral", 18),

    # ===== DECK 7: MALLA DE EMBOSCADA =====
    ("Fuego Cruzado", "Ataque", "armas,furia", 1, 3.5,
     "On Play: Ventaja +3 (Gana +3 de poder si el rival controla 2 o más cartas en ese carril).",
     "ventaja", 3, "ventaja", "on_play", None),
    ("Defensa Desesperada", "Acción", "proteccion", 1, 2.5,
     "On Play: Trampa 3 (Resta -3 de poder a la primera carta enemiga que entre en este carril).",
     "trampa", 3, "trampa_eterea", "on_play", None),
    ("Red Táctica", "Ítem", "proteccion,armas", 2, 5.5,
     "Pasivo: Muro (Evita que el rival ataque o afecte a tus cartas adyacentes con efectos directos).",
     "muro", None, "muro_keyword", "passive", None),
    ("Sombra Acechante", "Ataque", "armas", 1, 3.5,
     "On Play: Sigilo (Inmune a efectos y ataques enemigos durante el turno en que entra a mesa).",
     "sigilo", None, "sigilo", "on_play", None),
    ("Abrojos de Acero", "Ítem", "armas", 2, 4.5,
     "On Play: Trampa 5 (Resta -5 de poder al primer enemigo que jueguen en el carril opuesto).",
     "trampa", 5, "trampa_eterea", "on_play", None),
    ("Hostigamiento Táctico", "Acción", "furia", 2, 3.5,
     "On Play: Emboscada 10 (Inflige -10 de poder a un enemigo si entra en un carril no revelado).",
     "emboscada", 10, "emboscada", "on_play", None),
    ("Contraofensiva", "Acción", "armas,proteccion", 3, 9.5,
     "On Play: Transferencia 4 (Resta 4 de poder a un enemigo y se los suma a tu aliado adyacente).",
     "transferencia", 4, "transferencia", "on_play", None),
    ("Cota Reforzada", "Ítem", "proteccion", 3, 9.5,
     "Pasivo: Refugio 5 (Protege a la carta equipada absorbiendo hasta 5 puntos de daño o reducción).",
     "refugio", 5, "refugio", "passive", None),
    ("Táctico Ligero", "Ataque", "armas", 3, 9.5,
     "Último Aliento: Retorno 2 (Regresa a la mano reduciendo su coste en 2) y Reagrupar (Mueve un aliado).",
     "retorno", 2, "retorno", "on_death", None),
    ("Emboscada Mortal", "Ataque", "armas,furia", 4, 10.5,
     "On Play: Remate 5 contra la carta enemiga de menor poder en la mesa.",
     "remate", 5, "remate_keyword", "on_play", None),
    ("Estación de Reaprovisionamiento", "Ítem", "armas,proteccion", 4, 9.5,
     "End Turn: Renovación 6 (Restaura +6 de poder total repartido entre tus cartas dañadas en mesa).",
     "renovacion", 6, "renovacion", "end_turn", None),
    ("Comandante de Vanguardia", "Ataque", "armas,proteccion", 5, 11.5,
     "Despertar 20: Otorga +10 de poder repartido entre todas tus cartas en mesa al cruzar los 20 pts.",
     "despertar", 20, "despertar_umbral", "umbral", 20),
]


def to_id(name: str) -> str:
    """Convert Spanish name to snake_case id."""
    # Remove accents
    import unicodedata
    s = unicodedata.normalize("NFKD", name)
    s = "".join(c for c in s if not unicodedata.combining(c))
    # Replace spaces and special chars with underscore
    s = s.lower().replace(" ", "_").replace(",", "_").replace("'", "_")
    # Remove duplicates
    import re
    s = re.sub(r"_+", "_", s)
    return s


def get_rarity(cost: int, keyword: str) -> str:
    """Determine rarity based on cost and keyword."""
    if keyword == "despertar" or cost >= 5:
        return "legendary"
    if cost >= 4:
        return "epic"
    if cost >= 2:
        return "rare"
    return "common"


def gen_card(card_tuple):
    name, category, subtypes_str, cost, power, text, keyword, kw_value, effect_id, trigger, umbral_threshold = card_tuple
    card_id = to_id(name)
    subtypes = [s.strip() for s in subtypes_str.split(",")]
    rarity = get_rarity(cost, keyword)
    lines = []
    lines.append(f"  {{")
    lines.append(f"    id: \"{card_id}\",")
    lines.append(f"    name: \"{name}\",")
    lines.append(f"    category: \"{category}\",")
    lines.append(f"    subtypes: [{', '.join(f'\"{s}\"' for s in subtypes)}],")
    lines.append(f"    cost: {cost},")
    # Format power (strip trailing .0 for ints)
    # Round power to integer (TCG power values are always whole numbers)
    pwr_int = round(power)
    lines.append(f"    power: {pwr_int},")
    # Escape text quotes
    escaped_text = text.replace('"', '\\"')
    lines.append(f"    text: \"{escaped_text}\",")
    lines.append(f"    effectId: \"{effect_id}\",")
    lines.append(f"    rarity: \"{rarity}\",")
    if keyword and keyword != "none":
        lines.append(f"    keyword: \"{keyword}\",")
    if kw_value is not None:
        lines.append(f"    keywordValue: {kw_value},")
    if trigger and trigger != "on_play":
        lines.append(f"    trigger: \"{trigger}\",")
    if umbral_threshold is not None:
        lines.append(f"    umbralCondition: {{ powerThreshold: {umbral_threshold} }},")
    lines.append(f"  }},")
    return "\n".join(lines)


def main():
    output = []
    output.append("import type { CardDef } from \"./types\";")
    output.append("")
    output.append("// ============================================================================")
    output.append("// GUERRERO TÁCTICO TCG - CATÁLOGO OFICIAL")
    output.append("// 7 mazos × 12 cartas = 84 cartas totales")
    output.append("// ============================================================================")
    output.append("")
    deck_names = [
        "FURIA DE SANGRE (Agresión y Sacrificio)",
        "FALANGE INEXPUGNABLE (Escudos y Control)",
        "MAESTROS DE LA FORJA (Armas y Tempo)",
        "IMPULSO SANGRIENTO (Furia y Agresión Clásica)",
        "BASTIÓN INQUEBRANTABLE (Control y Muro Clásico)",
        "LEGADO DE LA FORJA (Armas y Tempo Clásico)",
        "MALLA DE EMBOSCADA (Control y Trampas)",
    ]
    deck_const_names = [
        "FURIA_DE_SANGRE",
        "FALANGE_INEXPUGNABLE",
        "MAESTROS_DE_LA_FORJA",
        "IMPULSO_SANGRIENTO",
        "BASTION_INQUEBRANTABLE",
        "LEGADO_DE_LA_FORJA",
        "MALLA_DE_EMBOSCADA",
    ]

    for deck_idx, (deck_name, deck_const) in enumerate(zip(deck_names, deck_const_names)):
        deck_cards = CATALOG[deck_idx * 12 : (deck_idx + 1) * 12]
        output.append("// ---------------------------------------------------------------------------")
        output.append(f"// MAZO {deck_idx + 1}: {deck_name}")
        output.append("// ---------------------------------------------------------------------------")
        output.append(f"const {deck_const}: CardDef[] = [")
        for card in deck_cards:
            output.append(gen_card(card))
        output.append("];")
        output.append("")

    output.append("// ============================================================================")
    output.append("// ALL_CARDS — todas las 84 cartas concatenadas")
    output.append("// ============================================================================")
    output.append("export const ALL_CARDS: CardDef[] = [")
    for deck_const in deck_const_names:
        output.append(f"  ...{deck_const},")
    output.append("];")
    output.append("")
    output.append("// ============================================================================")
    output.append("// Default deck for new games — use the first deck (Furia de Sangre)")
    output.append("// ============================================================================")
    output.append("export const WARRIOR_DECK: CardDef[] = FURIA_DE_SANGRE;")
    output.append("")
    # PRESET_DECKS metadata for the DeckEditor selector
    output.append("// ============================================================================")
    output.append("// PRESET_DECKS — 7 mazos predeterminados para el selector del DeckEditor")
    output.append("// ============================================================================")
    output.append("export interface PresetDeck {")
    output.append("  id: string;")
    output.append("  name: string;")
    output.append("  emoji: string;")
    output.append("  description: string;")
    output.append("  cards: CardDef[];")
    output.append("}")
    output.append("")
    preset_data = [
        ("furia_de_sangre", "Furia de Sangre", "🩸", "Agresión y Sacrificio"),
        ("falange_inexpugnable", "Falange Inexpugnable", "🛡️", "Escudos y Control"),
        ("maestros_de_la_forja", "Maestros de la Forja", "🔨", "Armas y Tempo"),
        ("impulso_sangriento", "Impulso Sangriento", "⚔️", "Furia y Agresión Clásica"),
        ("bastion_inquebrantable", "Bastión Inquebrantable", "🏰", "Control y Muro Clásico"),
        ("legado_de_la_forja", "Legado de la Forja", "⚒️", "Armas y Tempo Clásico"),
        ("malla_de_emboscada", "Malla de Emboscada", "🎯", "Control y Trampas"),
    ]
    output.append("export const PRESET_DECKS: PresetDeck[] = [")
    for i, (pid, pname, pemoji, pdesc) in enumerate(preset_data):
        output.append("  {")
        output.append(f"    id: \"{pid}\",")
        output.append(f"    name: \"{pname}\",")
        output.append(f"    emoji: \"{pemoji}\",")
        output.append(f"    description: \"{pdesc}\",")
        output.append(f"    cards: {deck_const_names[i]},")
        output.append("  },")
    output.append("];")
    output.append("")
    output.append("// ============================================================================")
    output.append("// Card pools for the deck editor")
    output.append("// ============================================================================")
    output.append("export const BASIC_CARDS: CardDef[] = ALL_CARDS.filter((c) => c.rarity === \"common\");")
    output.append("export const TACTICAL_CARDS: CardDef[] = ALL_CARDS.filter((c) => c.rarity !== \"common\");")
    output.append("")
    output.append("// ============================================================================")
    output.append("// Draw pile builders")
    output.append("// ============================================================================")
    output.append("export function buildDrawPileFrom(deck: CardDef[]): CardDef[] {")
    output.append("  const pile: CardDef[] = deck.map((c) => ({ ...c }));")
    output.append("  for (let i = pile.length - 1; i > 0; i--) {")
    output.append("    const j = Math.floor(Math.random() * (i + 1));")
    output.append("    [pile[i], pile[j]] = [pile[j], pile[i]];")
    output.append("  }")
    output.append("  return pile;")
    output.append("}")
    output.append("")
    output.append("export function buildDrawPile(): CardDef[] {")
    output.append("  return buildDrawPileFrom(WARRIOR_DECK);")
    output.append("}")
    output.append("")

    with open("src/lib/game/cards.ts", "w") as f:
        f.write("\n".join(output))
    print(f"Generated {len(CATALOG)} cards across {len(deck_names)} decks")


if __name__ == "__main__":
    main()
