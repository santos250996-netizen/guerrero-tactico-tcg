---
Task ID: 30
Agent: Z.ai main agent
Task: "detecta y corrige errores haz auditoria, borra codigo muerto y archivos inservibles" — auditoría integral del repositorio

Work Log:
- AUDITORÍA: tsc sin filtros (5 errores reales en tests), eslint (limpio), grafo de imports completo de src/ (2 herramientas nuevas re-ejecutables: scripts/audit-dead-code.mjs a nivel archivo y audit-dead-exports.mjs a nivel símbolo)
- TESTS CORREGIDOS: test-local-pvp 2 checks VACÍOS (viewAfterPass.you.isActive no existe en PvpClientView; el check era `=== false || true` = siempre true) → ahora yourTurn===false && activeSide distinto + logs reales; test-pvp-engine accedía action.uid/lane sin narrow del union (plan.actions puede incluir pass) → `if (action.type !== "play") continue`; test-tanda29 themes sin tipo LaneId y playCard recibía emptyLaneTraps() (LaneTraps) donde va TrapState|null → null
- UI SOLITARIO MUERTA (view "game" inalcanzable desde task 26): page.tsx reescrito (162→33 líneas, sin rama fallback); borrados HandBar, GameOverModal, HistoryModal, RulesModal, OnboardingModal, TurnTransitionBanner, FloatingNumbers, BattleLogList, HeaderBar, ProfileModal, EnergyCrystals, LaneComponent; LANE_COLOR_CLASSES extraído a laneColors.ts (única cosa viva de LaneComponent, la usa PvpLane)
- gameStore 1142→155 líneas: quedan SOLO view/deckEditorReturn (sin "game"), gameClass, editor de mazo (pool/deckCardIds/save/reset con storageKeyFor deduplicado) y previewCard; initGame/endTurn/board/hand/energy/etc eliminados — la partida vive 100% en pvpStore
- 42 componentes shadcn/ui sin uso borrados (quedan button, dialog, toast, toaster, scroll-area); hooks/use-mobile huérfano (vivía de la sidebar borrada)
- lib/profile.ts borrado (solo lo importaba ProfileModal); api/matches borrado (clientes eran HistoryModal/GameOverModal, ambos muertos); prisma: modelos Match/CustomCard/Deck sin ningún uso → fuera + generate
- settings.ts: onboardingSeen/markOnboardingSeen fuera (solo vivían en la rama muerta); SettingsModal: prop onOpenRules + sección Ayuda fuera (nadie la pasaba ya)
- recordMatchResult (ProfileScreen) volvía a estar huérfano (pvpStore llama registerMatch directo) → borrado junto a MATCHES_PER_LEVEL; LaneEmblem (LaneDecor) sin usos → borrado
- LEAK DE SALAS PvP: rooms.ts tenía ROOM_TTL_MS pero NUNCA borraba filas de BD y deleteRoom sin llamar nunca → purgeExpiredRooms() (memoria + deleteMany por createdAt < now−12h) cableado fire-and-forget en createRoom
- SCRIPTS: borrados scripts/legacy (12 rotos), examples/ (socket.io inexistente), tests/*.sh scaffold, 80+ generadores one-off (gen-style-batch*, gen-deck*-art, generate-*, v3/v4…) sustituidos por la cadena v5/v6/v7, 67 PNGs de E2E (scripts/*.png + shots/), update-keywords-txt.py (superseded por .ts), add-img-decoding.py (codemod ya ejecutado que referenciaba ProfileModal); conservados: 11 suites de test, cadena de arte v5/v6/v7+downscale+quantize, utilidades Python, audit-*, generadores de assets vivos (menu-bg, lane-bgs, banners, profile-bg, game-icon), fast-forward-pvp, sample-bots
- tsconfig: exclude skills/android/public/download/upload/agent-ctx → tsc REPO-LIMPIO sin filtros por primera vez
- Verificación: tsc 0 errores (todo el repo) · eslint OK · 11 suites verdes (pvp-engine 62 · turn-flow 27 · kw-v2 35 · kw-v3 30 · kw-v4 71 · colección 69 · fx 51 · tanda28 35 · tanda29 76 · local-pvp 32 · stress 300/300) · build estático RC=0 · E2E agent-browser: menú → HISTORIA → guerrero → drag&drop real (Muñonera a FURIA, 3+3) → 6 turnos → DERROTA con "NIVEL 1 · 3/10 XP · BOTÍN · 1 CARTA" → salir al menú, 0 errores de consola
- Commit ac41ce5 push a main (CI genera APK). Balance: 207 archivos, +329/−13,910 líneas

Stage Summary:
- Repo sin código muerto: cero archivos huérfanos, cero errores tsc en todo el árbol (incluidos scripts), tests con asserts ahora REALES (los 2 checks vacíos de local-pvp vigilarán de verdad el pase de turno)
- gameStore reducido 7x a lo global (navegación/editor/preview); la UI solitario fantasma fuera de page.tsx
- Salas PvP web ya no se acumulan para siempre (purga TTL al crear sala)
- Herramientas de auditoría re-ejecutables quedan en scripts/ para futuras tandas
- Nota: el hint de Radix "Missing Description for DialogContent" en CardPreviewModal persiste (a11y menor, preexistente)
