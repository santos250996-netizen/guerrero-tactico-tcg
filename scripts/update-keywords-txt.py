# -*- coding: utf-8 -*-
"""Regenera el bloque MAZOS ESPEJO (MAGO + ASESINO) de keywords-con-efectos-v3.txt
con el catálogo ACTUAL de src/lib/game/cards.ts (tras las rondas V3.1 y V3.2)."""

from pathlib import Path

TXT = Path("/home/z/my-project/download/keywords-con-efectos-v3.txt")

# (spec, nombre, categoria, cost, power, kw, kwval, legendary) — orden = cards.ts
MAZE = {
    "MAGO (MAGE_DECK):": [
        ("ARCANA",   "Conjurador de Estrellas", "Ataque", 3, 11, "Convergencia", 2, False),
        ("ARCANA",   "Aberración Arcana",       "Ataque", 2, 7,  "Sobrecarga",   2, False),
        ("ARCANA",   "Grimorio Anotado",        "Ítem",   1, 3,  "Fervor",       1, False),
        ("ARCANA",   "Cántico Arcano",          "Acción", 3, 11, "Fortaleza",    1, True),
        ("FUEGO",    "Tormenta de Brasas",      "Acción", 3, 12, "Llamarada",    1, False),
        ("FUEGO",    "Salamandra Anciana",      "Ataque", 2, 7,  "Combustión",   2, False),
        ("FUEGO",    "Farol Ígneo",             "Ítem",   2, 6,  "Insignia",     3, False),
        ("FUEGO",    "Estallido Ígneo",         "Ataque", 4, 13, "Remate",       2, False),
        ("HIELO",    "Coloso de Escarcha",      "Ataque", 1, 3,  "Escarcha",     2, False),
        ("HIELO",    "Viento Cortante",         "Acción", 3, 12, "Ventisca",     1, False),
        ("HIELO",    "Carapacho Glacial",       "Ítem",   3, 10, "Coraza",       3, False),
        ("HIELO",    "Anciano del Norte",       "Ataque", 5, 18, "Legado",       3, False),
    ],
    "ASESINO (ROGUE_DECK):": [
        ("VENENO",   "Colmillos Curvos",        "Ataque", 3, 12, "Veneno",       1, False),
        ("VENENO",   "Frasco de Peste",         "Ítem",   2, 8,  "Contagio",     1, False),
        ("VENENO",   "Víbora Ponzoñosa",        "Ataque", 1, 3,  "Fervor",       1, False),
        ("VENENO",   "Nube Tóxica",             "Acción", 3, 11, "Fortaleza",    1, True),
        ("COMBATE",  "Bandido de la Ruta",      "Ataque", 2, 8,  "Refriega",     2, False),
        ("COMBATE",  "Estoque Afilado",         "Ítem",   3, 10, "Golpe Certero", 3, False),
        ("COMBATE",  "Capitán de Milicia",      "Ataque", 3, 10, "Insignia",     3, False),
        ("COMBATE",  "Ajuste de Cuentas",       "Acción", 4, 13, "Remate",       2, False),
        ("SIGILO",   "Acechador Nocturno",      "Ataque", 2, 7,  "Emboscada",    2, False),
        ("SIGILO",   "Cuchilla del Silencio",   "Ítem",   3, 9,  "Purga",        2, False),
        ("SIGILO",   "Fundirse en Sombras",     "Acción", 1, 2,  "Coraza",       3, False),
        ("SIGILO",   "Maestro Caído",           "Ataque", 5, 18, "Legado",       3, False),
    ],
}

def block():
    out = []
    for header, cards in MAZE.items():
        out.append(header)
        last_spec = None
        for spec, name, cat, c, p, kw, v, leg in cards:
            if spec != last_spec:
                out.append(f"  {spec:<10}{name:<24}{cat:<8}c{c} p{p:<3}{kw}[{v}]" + (" (LEGENDARIA)" if leg else ""))
                last_spec = spec
            else:
                out.append(f"           {name:<24}{cat:<8}c{c} p{p:<3}{kw}[{v}]" + (" (LEGENDARIA)" if leg else ""))
        out.append("")
    return "\n".join(out).rstrip() + "\n"

content = TXT.read_text(encoding="utf-8")
head, sep, tail = content.partition("Cobertura de triggers")
assert sep, "marcador Cobertura no encontrado"
# head termina en "MAZOS ESPEJO ===...===\n\n" — conservamos hasta ahí y regeneramos el cuerpo
head = head[: head.rfind("MAGO (MAGE_DECK):")]
TXT.write_text(head + block() + "\n" + sep + tail, encoding="utf-8")
print("Bloque MAZOS ESPEJO regenerado con el catálogo actual.")
