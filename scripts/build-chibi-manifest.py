#!/usr/bin/env python3
"""Construye el manifiesto chibi para recrear las 192 cartas del juego.

Fusiona:
- datos autoritativos de scripts/chibi-cards-data.json (dump de ALL_CARDS_V3)
- descripciones curadas por carta de scripts/gen-card-art-v5..v12.mjs

y asigna, según la skill guerrero-tactico-chibi-art:
- tríada PLANO/ÁNGULO/MOMENTO exclusiva dentro de cada spec (anti-plantilla)
- raza del catálogo detectada del texto curado (si es humanoide)
- lectura visual de TODAS las keywords (definida antes de generar)
- iluminación plana por defecto; ocaso/post-caída solo si el trigger lo exige

Salida: scripts/chibi-manifest.json
"""
import itertools
import json
import random
import re
from collections import Counter
from pathlib import Path

ROOT = Path("/home/z/my-project")

# ── spec (carril) → imaginería (skill, a nivel de carril) ────────────────────
LANE_IMG = {
    "armas": "armas, forja, duelos, golpes que rompen armadura",
    "proteccion": "escudos, murallas, guardias, estandartes",
    "furia": "salvajismo, rabia, sangre, ejecución brutal (nada de acero pulido)",
    "arcana": "energía arcana violeta, conjuros, aberraciones, grimorios",
    "fuego": "llamas, brasas, salamandras, faroles arcanos",
    "hielo": "escarcha, glaciares, viento cortante, colosos de hielo",
    "veneno": "toxinas, ponzoña, víboras, frascos, contagio",
    "combate": "duelo callejero, milicia, bandidismo, estoques, ajustes de cuentas",
    "sigilo": "sombras, noche, cuchillas silenciosas, emboscadas",
    "raiz": "raíces ancestrales gruesas, tierra viva, brotes vigorosos",
    "flor": "flores gigantes, pétalos afilados, polen dorado",
    "esporas": "hongos, nubes de esporas, micelio brillante",
    "puente": "puente de barco, cuerdas y velas, abordaje",
    "bodega": "bodega del barco, barriles de ron, cofres, contrabando",
    "artilleria": "cañones, pólvora, andanadas, artillería de barco",
    "taller": "taller del inventor, herramientas, engranajes sobre mesas",
    "maquinaria": "autómatas, máquinas, engranajes grandes, vapor",
    "chispa": "electricidad, bobinas, rayos de chispa, energía estática",
}

# ── keyword → lectura visual (skill + definiciones nuevas V3) ────────────────
KW_VISUAL = {
    "hender_armadura": "el arma atraviesa la barrera; el escudo se agrieta y salta en esquirlas",
    "duelista": "soledad total, única carta del carril, sin aliados alrededor",
    "coraza": "escudo por segmentos de runa",
    "amparo": "escudo por segmentos de runa",
    "remache": "escudo por segmentos de runa",
    "impetu": "ecos y estelas por cada carta previa jugada, fuerza que se acumula",
    "crueldad": "la presa más débil cazada al ocaso",
    "fervor": "crecimiento acumulado, fuerza que sube",
    "insignia": "transferencia de la insignia al aliado más débil",
    "legado": "transferencia del poder al aliado más débil en la caída",
    "fortaleza": "el carril entero se refuerza, muralla compacta",
    "remate": "destrucción de la carta más débil",
    "purga": "destrucción de la carta más débil",
    "sobrecarga": "núcleo inestable que decae y se apaga",
    "llamarada": "explosión en área sobre todo el carril",
    "ventisca": "tormenta de hielo en área sobre todo el carril",
    "miasma": "niebla tóxica en área sobre todo el carril",
    "detonacion": "explosión en área sobre todo el carril",
    "combustion": "último aliento que estalla",
    "andanada": "último aliento que estalla en andanada de cañones",
    "floracion": "último aliento que estalla en flor",
    "escarcha": "escudo renovable de hielo",
    "veneno": "corrosión verde que ignora escudos",
    "contagio": "corrosión verde que se propaga e ignora escudos",
    "emboscada": "primera carta del turno, golpe lanzado desde las sombras",
    "refriega": "melé callejero, más fuerte cuantos más enemigos rodean",
    "caza_mayor": "cazador acosando a la presa más grande",
    "sobrecalentar": "sinergia con el Ítem aliado, máquina sobrecalentada",
    "engranaje": "sinergia con el Ítem aliado, engranajes encajando",
    "torreta": "rayos de chispa que saltan los escudos",
    "descarga": "rayos de chispa que saltan los escudos",
    "purificacion": "luz limpia que disuelve la corrupción",
    "atropello": "carga arrolladora que arrolla la línea enemiga, tierra levantada",
    "canonazo": "bola de cañón cruzando el aire con estela de pólvora",
    "carnivora": "planta carnívora devorando a su presa",
    "ceniza": "nube de ceniza ardiente que cae sobre el carril",
    "chatarra": "máquina despiezada en chatarra reutilizable",
    "conspiracion": "figuras encapuchadas cuchicheando en la sombra",
    "contrabando": "mercancía oculta en cajas y barriles de contrabando",
    "convergencia": "varias líneas de energía que confluyen en un punto",
    "corrosion": "óxido y ácido royendo el metal",
    "custodia": "guardia protegiendo algo valioso tras de sí",
    "desafio": "señal de duelo, provocación frontal al rival más fuerte",
    "drenar_poder": "energía absorbida de la víctima hacia el canalizador",
    "eco": "réplicas translúcidas del mismo sujeto",
    "esquirla": "estallido de fragmentos cortantes",
    "estacion": "estructura fija que despliega su efecto desde el suelo",
    "estandarte": "estandarte de guerra izado que insufla ánimo",
    "finta": "engaño de esgrima, golpe que se retira y ataca por otro ángulo",
    "golpe_certero": "golpe que da justo en el punto débil marcado con diana",
    "micelio": "red de micelio que se extiende bajo la tierra",
    "motin": "tripulación amotinada, caos en cubierta",
    "muralla": "muro defensivo que se alza de golpe",
    "octava": "onda sonora octava que irradia en anillos",
    "orden_batalla": "señal de mando que ordena la formación",
    "polen": "nube dorada de polen flotando",
    "ruptura_glacial": "hielo que se rompe con fuerza liberada",
    "saqueo": "botín saqueado, cofres y monedas tomados",
    "simbiosis": "dos organismos creciendo unidos",
    "tripulacion": "tripulación trabajando junta en cubierta",
}

# ── razas del catálogo (chibi, con rasgos) ───────────────────────────────────
RACE_DESC = {
    "orco": "orco chibi (piel verde, colmillos pequeños, orejas puntiagudas, cuerpo compacto y musculoso)",
    "tauren": "tauren chibi (minotauro con hocico bovino, cuernos curvos, pelaje marrón)",
    "enano": "enano chibi (barba enorme trenzada, complexión baja y ancha, rubicundo)",
    "humano": "humano chibi (rasgos heroicos simplificados, proporciones chibi)",
    "worgen": "worgen chibi (hombre lobo con hocico lupino, orejas de lobo, pelaje gris, colmillos)",
    "elfo_sangre": "elfo de sangre chibi (orejas largas puntiagudas, pelo rubio rojizo, ojos verdes brillantes)",
    "elfo_nocturno": "elfo nocturno chibi (orejas largas puntiagudas, piel violeta clara, marcas faciales)",
    "draenei": "draenei chibi (piel azul, cuernos curvos, cola con punta de flecha, pezuñas)",
    "gnomo": "gnomo chibi (muy pequeño, orejas grandes, goggles, pelo salvaje)",
    "goblin": "goblin chibi (piel verde lima, orejas enormes, dientes grandes, nariz prominente)",
    "nomuerto": "no-muerto chibi (piel gris azulada cadavérica, ojos huecos brillantes, remiendos)",
}

# detección: orden de especificidad
RACE_PATTERNS = [
    ("elfo_sangre", r"blood\s+elf"),
    ("elfo_nocturno", r"night\s+elf"),
    ("draenei", r"draenei"),
    ("gnomo", r"\bgnome\b"),
    ("goblin", r"\bgoblin\b"),
    ("nomuerto", r"\bundead\b|skeletal|\bzombie\b|\blich\b|\bcorpse\b|flesh"),
    ("worgen", r"\bworgen\b|werewolf"),
    ("tauren", r"\btauren\b|minotaur"),
    ("enano", r"\bdwarf\b|bearded\s+(?:man|woman|warrior|defender)"),
    ("orco", r"\borc(?:ish|s)?\b"),
    ("humano", r"\bhumans?\b"),
]
RACE_SPANISH = [
    ("elfo_sangre", r"elfo de sangre"),
    ("elfo_nocturno", r"elfo nocturno"),
    ("draenei", r"draenei"),
    ("gnomo", r"\bgnomo\b"),
    ("goblin", r"\bgoblin\b"),
    ("nomuerto", r"no[- ]muerto|esqueleto|zombi|cadaver|lich"),
    ("worgen", r"\bworgen\b|hombre lobo"),
    ("tauren", r"\btauren\b"),
    ("enano", r"\benan[oa]s?\b"),
    ("orco", r"\borcos?\b"),
    ("humano", r"\bhumanos?\b"),
]
CREATURE_WORDS = re.compile(
    r"víbora|vibora|serpiente|mantis|salamandra|fénix|fenix|coloso|colosal|colossus|coloss"
    r"|abeja|avispa|enjambre|hongo|espora|planta|carnívora|carnivora|autómata|automata|automa|robot|golem"
    r"|espíritu|espiritu|wraith|espectro|sombra viviente|viper|mantid|mantis|beast|feline|toad|sapo"
    r"|rata|rat\b|murciélago|murcielago|cuervo|raven|cangrejo|crab|calamar|squid|pulpo|octopus|kraken"
    r"|cañón|canon\b|torreta|turret|trampa|trap\b|t[oó]tem|totem|wisp|elemental|aberración|aberration"
    r"|wisp|slime|larva|oruga|mariposa|raíz viviente|anciano|ent\b|treant",
    re.I,
)
# specs → clase → razas de catálogo por defecto (rotación) para humanoides sin raza detectada
CLASS_OF_SPEC = {
    "armas": "guerrero", "proteccion": "guerrero", "furia": "guerrero",
    "arcana": "mago", "fuego": "mago", "hielo": "mago",
    "veneno": "asesino", "combate": "asesino", "sigilo": "asesino",
    "raiz": "botanico", "flor": "botanico", "esporas": "botanico",
    "puente": "pirata", "bodega": "pirata", "artilleria": "pirata",
    "taller": "tinker", "maquinaria": "tinker", "chispa": "tinker",
}
DEFAULT_RACES = {
    "guerrero": ["orco", "tauren", "enano", "humano", "worgen"],
    "mago": ["elfo_sangre", "elfo_nocturno", "humano", "draenei", "gnomo"],
    "asesino": ["humano", "goblin", "nomuerto", "elfo_nocturno", "worgen"],
    "pirata": ["humano", "goblin", "nomuerto"],
    "tinker": ["gnomo", "humano", "goblin"],
}
# palabras que delatan gente (tripulación, milicia, aprendices…) aunque la spec
# sea de las clases nuevas sin catálogo de razas en la skill
PERSON_WORDS = re.compile(
    r"tripulaci|marinero|pirata|bandido|miliciano|mercenario|soldado|legionario|vanguardia"
    r"|aprendiz|maestro|heraldo|abanderado|centinela|alguacil|gladiador|duelista|espadachin"
    r"|espadachín|maestra|emisario|espía|espio|asesino|verdugo|berserker|gladiadora|capitán"
    r"|capitan|contramaestre|artillero|ingeniero|armero|herrero|cazador|rastreador|escolta"
    r"|guardia|campeón|campeon|grumete|boss|jefe\b|crew|pirate|soldier|mercenary|duelist"
    r"|bailiff|sentry|apprentice|herald|gladiator|brawler|executioner|hunter|scout|captain",
    re.I,
)

LUZ_DEFAULT = [
    "iluminación de mediodía con bloques de color plano",
    "hora dorada con luz cálida plana",
    "día soleado con sombras sólidas",
    "amanecer con luz rosada plana",
]
LUZ_END_TURN = "ocaso con luz naranja plana y sombras largas"
LUZ_ON_DEATH = "atmósfera apagada de post-caída, luz gris plana"

PLANO_FIG = ["primerísimo plano", "retrato chibi", "cuerpo entero", "plano general", "paisaje con figura mínima"]
PLANO_ITEM = ["primerísimo plano", "plano general"]
ANGULO = ["contrapicado extremo", "picado aéreo", "nivel del suelo", "frontal", "3/4", "contraluz"]
MOMENTO = ["preparación", "impacto", "consecuencia"]


def detect_race(text: str, spec: str, idx: int, is_item: bool) -> str:
    if is_item:
        return ""
    for key, pat in RACE_PATTERNS:
        if re.search(pat, text, re.I):
            return RACE_DESC[key]
    for key, pat in RACE_SPANISH:
        if re.search(pat, text, re.I):
            return RACE_DESC[key]
    if CREATURE_WORDS.search(text) and not PERSON_WORDS.search(text):
        return ""
    cls = CLASS_OF_SPEC[spec]
    if cls not in DEFAULT_RACES:
        return ""
    pool = DEFAULT_RACES[cls]
    return RACE_DESC[pool[idx % len(pool)]]


def extract_curated() -> dict[str, list[str]]:
    """id → fragmentos de descripción de la versión más reciente (+ acervo para raza)."""
    latest: dict[str, list[str]] = {}
    corpus: dict[str, str] = {}
    for ver in range(5, 13):
        f = ROOT / "scripts" / f"gen-card-art-v{ver}.mjs"
        if not f.exists():
            continue
        text = f.read_text(encoding="utf-8")
        # entradas: bloques que empiezan por `  ["` y terminan en `],`
        for m in re.finditer(r'\n  \[(.*?)\],?\n', text, re.S):
            body = m.group(1)
            strs = re.findall(r'"((?:[^"\\]|\\.)*)"', body)
            if len(strs) < 4:
                continue
            cid = strs[0]
            latest[cid] = strs[3:]  # campos tras id/cat/spec
            corpus[cid] = corpus.get(cid, "") + " " + " ".join(strs[3:])
    return latest, corpus


def main() -> None:
    data = json.loads((ROOT / "scripts" / "chibi-cards-data.json").read_text())
    cards = data["cards"]
    latest, corpus = extract_curated()

    # tríadas exclusivas por spec (semilla fija por spec): un único pool sin
    # repeticiones; los Ítems eligen primero entre sus planos de bodegón
    triada: dict[str, dict[str, list[tuple[str, str, str]]]] = {}
    for spec in sorted({c["spec"] for c in cards}):
        combos = [(p, a, m) for p, a, m in itertools.product(PLANO_FIG, ANGULO, MOMENTO)]
        random.Random(f"chibi-{spec}").shuffle(combos)
        n_items = sum(1 for c in cards if c["spec"] == spec and c["cat"] == "Ítem")
        pool_item = [t for t in combos if t[0] in PLANO_ITEM][:n_items]
        used = set(pool_item)
        pool_fig = [t for t in combos if t not in used]
        triada[spec] = {"fig": pool_fig, "item": pool_item}

    counters: dict[str, Counter] = {}
    manifest = []
    missing_curated = []
    CAT_MAP = {"Ataque": "ataque", "Ítem": "item", "Acción": "accion"}
    for c in cards:
        spec, cat = c["spec"], c["cat"]
        k = counters.setdefault(spec, Counter())
        bucket = "item" if cat == "Ítem" else "fig"
        i = k[bucket]
        k[bucket] += 1
        plano, angulo, momento = triada[spec][bucket][i]

        frags = latest.get(c["id"], [])
        if not frags:
            missing_curated.append(c["id"])
            # derivación de nombre + efecto (patrón: el NOMBRE evoca la carta)
            frags = [c["name"], f"efecto: {c['text']}"]
        subject = frags[0]
        scene = " ".join(frags[1:]) if len(frags) > 1 else LANE_IMG[spec]
        race_text = f"{c['name']} {c['text']} {corpus.get(c['id'], '')}"
        race = detect_race(race_text, spec, i, cat == "Ítem")

        if c["trig"] == "end_turn":
            luz = LUZ_END_TURN
        elif c["trig"] == "on_death":
            luz = LUZ_ON_DEATH
        else:
            luz = LUZ_DEFAULT[i % len(LUZ_DEFAULT)]

        kw_vis = KW_VISUAL.get(c["kw"], "")
        manifest.append({
            "id": c["id"], "name": c["name"], "categoria": CAT_MAP[cat],
            "spec": spec, "trigger": c["trig"],
            "subject": subject, "scene": f"{scene} — imaginería del carril: {LANE_IMG[spec]}",
            "race": race, "kw": c["kw"], "kw_visual": kw_vis,
            "plano": plano, "angulo": angulo, "momento": momento, "luz": luz,
        })

    # validaciones
    n = len(manifest)
    dupes = []
    for spec, d in triada.items():
        seen = [t for t in d["fig"]] + [t for t in d["item"]]
        if len(seen) != len(set(seen)):
            dupes.append(spec)
    no_kw = [m["id"] for m in manifest if not m["kw_visual"]]
    creatures = [m["id"] for m in manifest if not m["race"] and m["categoria"] != "item"]
    out = ROOT / "scripts" / "chibi-manifest.json"
    out.write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"manifiesto: {n} cartas → {out}")
    print("tríadas duplicadas por spec:", dupes or "ninguna")
    print("sin lectura visual de keyword:", no_kw or "ninguna")
    print("sin descripción curada:", len(missing_curated), "→", missing_curated[:8], "...")
    print("personajes/criaturas sin raza:", len(creatures), "→", creatures[:12], "...")
    from collections import Counter as C2
    print("categorías:", dict(C2(m["categoria"] for m in manifest)))
    print("razas:", dict(C2(m["race"].split(" ")[0] if m["race"] else "(criatura)" for m in manifest)))


if __name__ == "__main__":
    main()
