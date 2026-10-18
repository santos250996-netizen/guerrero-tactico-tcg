#!/usr/bin/env python3
"""Añade decoding="async" a todos los <img> JSX de los componentes del juego
que aún no lo tengan — evita decodificación de imágenes bloqueante en el
hilo principal (jank en móvil)."""
import re
import pathlib

FILES = [
    "src/components/game/HandCardComponent.tsx",
    "src/components/game/CardPreviewModal.tsx",
    "src/components/game/RulesModal.tsx",
    "src/components/game/SettingsModal.tsx",
    "src/components/game/DeckEditor.tsx",
    "src/components/game/ProfileScreen.tsx",
    "src/components/game/ProfileModal.tsx",
    "src/components/game/BoardCardMini.tsx",
]

PAT = re.compile(r"(<img\b[^>]*?)(\s*/>)", re.S)

for f in FILES:
    p = pathlib.Path(f)
    if not p.exists():
        print(f"SKIP (no existe): {f}")
        continue
    s = p.read_text()
    changed = 0

    def repl(m: re.Match) -> str:
        global changed
        body, tail = m.group(1), m.group(2)
        if "decoding=" in body:
            return m.group(0)
        changed += 1
        return body + '\n        decoding="async"' + tail

    new = PAT.sub(repl, s)
    if changed:
        p.write_text(new)
    print(f"{f}: {changed} img actualizadas")
