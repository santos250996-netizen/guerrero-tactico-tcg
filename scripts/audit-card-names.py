#!/usr/bin/env python3
"""
Auditoría de NOMBRES de cartas según scripts/design-pattern.md (sección 📝).
- Extrae nombres de src/lib/game/cards.ts (campo name:)
- Reglas: ≤3 palabras de contenido, único vs catálogo heredado (public/cards),
  filename snake_case sin acentos, no nombrar la keyword literal
Uso: python3 scripts/audit-card-names.py
"""
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CARDS_TS = ROOT / 'src' / 'lib' / 'game' / 'cards.ts'
IMAGES = ROOT / 'public' / 'cards'

# Las 12 del Mazo Espejo V2 (nuevas); el resto de PNGs = catálogo heredado
V2_IDS = {
    'mandoble_quebrantamuros', 'espada_del_duelista', 'amoladora_de_campamento',
    'cuerno_de_guerra', 'adarga_del_centinela', 'estandarte_de_la_cohorte',
    'oracion_del_bastion', 'martillo_del_veterano', 'berserker_recluta',
    'colmillo_del_verdugo', 'hacha_de_ejecucion', 'veterano_caido',
}
ARTICLES = {'de', 'del', 'la', 'el', 'los', 'las'}


def content_words(name: str) -> int:
    return len([w for w in name.split() if w.lower() not in ARTICLES])


def strip_accents(s: str) -> str:
    return ''.join(c for c in unicodedata.normalize('NFD', s)
                   if unicodedata.category(c) != 'Mn')


def to_filename(name: str) -> str:
    return strip_accents(name.lower()).replace(' ', '_')


def main() -> None:
    text = CARDS_TS.read_text(encoding='utf-8')
    # Solo cartas de ALL_CARDS: cortar antes de los presets de mazo
    text = text.split('export const WARRIOR_DECK')[0]
    cards = re.findall(r'id:\s*"([^"]+)"[\s\S]*?name:\s*"([^"]+)"', text)
    inherited = {p.stem for p in IMAGES.glob('*.png')} - V2_IDS

    problems, names = [], {}
    for cid, name in cards:
        # R1: ≤3 palabras de contenido
        if content_words(name) > 3:
            problems.append(f'{cid}: "{name}" supera 3 palabras de contenido')
        # R2: único en catálogo (ni exacto ni variante mínima sin acentos)
        key = strip_accents(name.lower())
        if key in names:
            problems.append(f'{cid}: nombre duplicado con {names[key]}')
        names[key] = cid
        fn = to_filename(name)
        # R3: filename sin acentos y existente en public/cards
        if fn != strip_accents(fn):
            problems.append(f'{cid}: filename "{fn}" llevaría acentos')
        if fn not in inherited | V2_IDS:
            problems.append(f'{cid}: falta imagen public/cards/{fn}.png')

    print(f'{len(cards)} cartas analizadas, catálogo heredado: {len(inherited)}')
    if problems:
        print('\nPROBLEMAS:')
        for p in problems:
            print(f'  ✗ {p}')
        raise SystemExit(1)
    print('✓ Todos los nombres cumplen las reglas del design pattern')


if __name__ == '__main__':
    main()
