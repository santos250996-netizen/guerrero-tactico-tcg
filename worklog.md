---
Task ID: 1
Agent: Z.ai main agent
Task: Clonar repo GitHub guerrero-tactico-tcg, instalarlo en entorno fullstack-dev y dar preview

Work Log:
- Inicializado entorno fullstack-dev (Next.js 16 + Turbopack, puerto 3000)
- Clonado https://github.com/santos250996-netizen/guerrero-tactico-tcg con token a /home/z/repo-tmp
- Identificado: juego "Pacto de Guerra" TCG táctico de carriles (Next.js 16, App Router, Prisma/SQLite, Zustand, Tailwind 4, shadcn/ui, Capacitor Android)
- Sincronizados con rsync: src/, public/ (113 cartas + 8 menú), prisma/, db/custom.db, configs (excluye .git, node_modules, .next; error chgrp en upload/ no afecta)
- bun install: añadidas @capacitor/core, cli, android 7.6.9 (76 paquetes)
- prisma generate + db push: esquema Match/CustomCard/Deck sincronizado con db/custom.db
- Verificación E2E con agent-browser:
  * Menú principal renderiza (Pacto de Guerra, V2.0, 94 cartas/33 keywords en footer)
  * JUGAR → selección de clase (Guerrero/Mago bloqueado/Asesino)
  * JUGAR PARTIDA → onboarding modal + tablero 3 carriles (ARMAS/PROTECCIÓN/FURIA) con bonus dinámicos
  * PASAR → turno 1/6→2/6, energía 1→2, IA ejecuta sin errores
  * OPCIONES → ajustes (audio/idioma ES-EN-PT/reglas) funcionan
  * Modal de reglas renderiza completo
  * 0 errores JavaScript en toda la sesión

Stage Summary:
- App corriendo y verificada en puerto 3000; estado = último commit del repo (88c459d reset: catálogo de cartas VACÍO intencionalmente, catálogo previo con 94 cartas existe en commit 4737cb6)
- 404 preexistentes del repo (no bloquean): GET /click.mp3 (sonido faltante), POST /api/matches (endpoint inexistente, historial de partidas no persiste)
- Token de GitHub usado solo para clonar; recomendado revocarlo
- Repo temporal /home/z/repo-tmp eliminado tras la copia

---
Task ID: 2
Agent: Z.ai main agent
Task: Instalar skills (impeccable.style + 4 TCG architects) y librerías (lucide, phaser 3, interact.js)

Work Log:
- Buscado en ClawHub: las 4 skills tcg-*-architect NO existen; impeccable sí (pbakaus, 314k installs)
- clawhub install de impeccable falló por hash del resolver → instalada desde GitHub pbakaus/impeccable a skills/impeccable/ (SKILL.md + reference/ + agents/ + scripts/)
- tcgarchitect.com verificado: web ajena (deckbuilder de Grand Archive/Gundam), no instalable como skill
- Creadas 4 skills personalizadas para "Pacto de Guerra":
  * tcg-game-architect: arquitectura global (store/engine/vistas/persistencia, modelo 4 triggers)
  * tcg-keyword-architect: sistema de keywords (contrato de 5 puntos, scopes, balance, scripts)
  * tcg-board-architect: tablero visual (lanes, drag&drop interact.js, Phaser como capa de efectos)
  * tcg-combat-architect: combate (PTP por carril, orden de resolución, IA rival, balance IA-vs-IA)
- Librerías instaladas: phaser@3.90.0 (fijada v3 a petición, la latest es 4.x), interactjs@1.10.28; lucide-react@0.525.0 ya estaba
- Verificación final: juego carga OK, sin errores JS, dev server compila limpio

Stage Summary:
- 5 skills nuevas disponibles en /home/z/my-project/skills/ (impeccable + 4 tcg-*-architect)
- Stack de juego listo: phaser 3.90 + interactjs 1.10 + lucide-react
- Pendiente detectado: POST /api/matches y click.mp3 siguen faltando (preexistente)

---
Task ID: 3
Agent: Z.ai main agent
Task: Directiva permanente (usar skills+stack siempre) + lote 1 de mejoras al proyecto

Work Log:
- REGISTRADA DIRECTIVA del usuario: usar siempre impeccable + 4 tcg-*-architect + lucide/phaser3/interact.js; reemplazar/mejorar todo lo posible con ese stack
- Creado POST+GET /api/matches (zod + Prisma Match): GameOverModal ya persiste e HistoryModal lee historial
- Descubierto y resuelto conflicto: next.config output:export rechazaba force-dynamic → output ahora condicional (STATIC_EXPORT=1 → export para APK; script build:static añadido)
- MainMenu: new Audio("/click.mp3") (404) reemplazado por sfx.click() unificado
- Migración completa emoji→lucide: LANE_META (Swords/Shield/Flame), TRIGGER_META (Zap/Sunrise/Sunset/Skull), KEYWORD_META (Minus), KIND_META CardPreviewModal (13 iconos), badges ⚡→Zap en LaneBonusFlash, StatCards perfil (Gamepad2/Trophy/Skull/Scale), ✎→Pencil, ⚔→Swords separadores, 🔥→Flame Umbral
- Fix bug: KIND_META[m.kind] parecía corrupto — era ilusión de ANSI en grep; archivo estaba bien
- Lint: 20 errores TODOS preexistentes (scripts del repo + patterns React 19); 0 nuevos de mis cambios
- E2E browser verificado: menú→perfil(iconos nuevos)→partida(6 turnos)→GameOver→POST 201→BD confirma DRAW 0-0 turnos:6; 0 errores JS; click.mp3 404s: 0 en requests recientes

Stage Summary:
- Persistencia de partidas funcional end-to-end (API 201 + BD)
- 0 emojis restantes en metadatos de juego (lanes/triggers/keywords/kinds/stats)
- Stack lucide adoptado como estándar visual del proyecto
- Roadmap próximo: DnD interact.js, capa efectos Phaser 3, KEYWORD_META nuevos al diseñar cartas, design pass impeccable

---
Task ID: 4
Agent: Z.ai main agent
Task: Sistema de keywords V2 — 6 neutrales + 6 de Guerrero + mazo espejo de 12 cartas (diseño aprobado por opciones)

Work Log:
- Diseño presentado en opciones antes de code (AskUserQuestion): usuario eligió A Fundamentos + pares recomendados + limpieza total + curva 1→5 + testing espejo + nombres WoW
- HALLAZGO DE DISEÑO: sin keywords de destrucción las on_death jamás disparan → Remate [X] incluido en neutrales como fuente de muerte
- types.ts reescrito: Keyword = 12 (fervor/coraza/insignia/remate/legado/fortaleza/hender_armadura/duelista/amparo/purificacion/impetu/crueldad), KEYWORD_META con exclusiveSubtype (6 de clase: armas×2, proteccion×2, furia×2), EffectId = Keyword, BoardCard con shieldRemaining + debuffTaken (sustituye cupula/isGuardian/perforacion/enrabia/refuerzo/sigilo/umbral)
- engine.ts REESCRITO de cero (~800 líneas vs 2861): solo 4 triggers, escudos por carta (solo applyDebuff los consulta → Hender perfora por diseño), applyPowerDelta acumula debuffTaken (Purificación restaura), playCard acepta playsThisTurn (Ímpetu), IA con heurísticas para end_turn keywords, borrados: umbral/reaction/passive/retorno/muro/trampa-eterea cases + MURO en planEnemyTurn
- cards.ts: 12 cartas de test (4 por carril, curva 1×2 2×3 3×5 4×1 5×1), WARRIOR_DECK = espejo, PRESET_DECKS "Mazo de Prueba — Espejo"
- gameStore.ts: import limpio (−6 símbolos muertos), playsThisTurn en estado+undo, bloque RENOVACIÓN/umbral/reaction/retorno eliminados, log "Escudo +X" para mutaciones de escudo (antes "Debuff 0")
- UI: BoardCardMini con badge de escudo (Shield+lucide, azul, title tooltip), LaneComponent/CardPreviewModal sin umbralCondition, KIND_META sin "despertar", ClassSelect union emerald, ProfileScreen RARITY_DOT_COLOR (3 errores TS preexistentes arreglados)
- balance.ts reescrito: PTP formula + KEYWORD_BASE_VALUES para las 12 + getBalanceInfo/getDeckBalanceSummary
- TypeScript src/: 71 errores → 0
- Arte: 12/12 imágenes generadas con pipeline z-ai (scripts/gen-test-deck-art.ts, estilo Hearthstone/WoW del repo)
- tests: scripts/test-keywords-v2.ts — 34/34 asserts (deltas exactos de las 12 keywords, escudo absorbe, Hender perfora, cadena Remate→Legado, exclusiveSubtype validado)
- Scripts legacy V1 (9) archivados en scripts/legacy/
- E2E navegador 2 partidas completas: Ímpetu en IA (Poder 5), Insignia en vivo (Hacha 3→6), Crueldad ×2 end_turn, Fervor multi-tick (rival 3→7 en 4 turnos), Coraza rival (escudo 3), Amparo (2 badges escudo en DOM), restricciones de bono (Solo coste 5/1 rechazan con mensaje), re-roll turno 4, game over + POST BD (LOSS 17-22 turnos:6), 0 errores JS
- Spec V2 documentada en download/keywords-con-efectos-v2.txt

Stage Summary:
- Sistema de keywords V2 COMPLETO: 6 neutrales + 6 Guerrero (2/spec), 12 cartas espejo, 34/34 tests, 0 errores TS en src/, arte generado, E2E verificado con persistencia
- Mechanism clave: escudos = pool finito por carta; Purificación restaura debuffTaken; Hender ignora escudos; Remate = única fuente de destrucción
- Pendiente futuro: keywords de Mago/Asesino (neutrales ya compartibles), scroll de IA para Remate condicional ya cubierto por sim de removedCards, design pass impeccable pendiente

---
Task ID: 5
Agent: Z.ai main agent
Task: Recordatorio del usuario — aplicar el design pattern de imágenes (scripts/design-pattern.md)

Work Log:
- Usuario recordó que existe design pattern para el arte: verificado en scripts/design-pattern.md (432x576 LANCZOS+optimize, full art, stylized realism Hearthstone/Blizzard, variedad visual obligatoria, razas WoW, prompt base como sufijo)
- Auditoría de las 12 cartas del Mazo de Prueba V2: TODAS incumplían resolución (864x1152, el script generador omitía el downscale); las 113 originales del repo sí cumplen
- Corregidas las 12 con scripts/fix-card-art-resolution.py (PIL LANCZOS + optimize=True): ahora 320-444KB, en línea con el promedio del repo
- scripts/gen-test-deck-art.ts actualizado: pipeline generation 864x1152 → sharp lanczos3 → 432x576 compressionLevel 9, para que futuras generaciones cumplan el patrón automáticamente
- Integridad PNG verificada (PIL verify) y script sin errores TS propios

Stage Summary:
- 125/125 imágenes de public/cards ahora cumplen el design pattern (432x576)
- Pipeline de arte documentado y auto-aplicado en el generador; fix-card-art-resolution.py queda como herramienta reutilizable

---
Task ID: 6
Agent: Z.ai main agent
Task: Ampliar design-pattern.md (keyword+trigger en la imagen) y regenerar las 12 cartas con interpretación del efecto

Work Log:
- Insight del usuario adoptado como PRINCIPIO CENTRAL: el texto del efecto ya resume trigger + keyword + objetivo + magnitud → la imagen debe interpretar el efecto, no solo el nombre
- design-pattern.md ampliado con: tabla TRIGGER→COMPOSICIÓN (on_play=clímax, start_turn=amanecer/primera chispa, end_turn=ocaso/apogeo, on_death=post-caída), KEYWORD→LENGUAJE VISUAL (las 12 keywords con su lectura visual del efecto), FÓRMULA DEL PROMPT (efecto + raza/variedad + trigger + base), SUGERENCIAS POR CARRIL (FURIA: prohibido acero pulido)
- 12 prompts de gen-test-deck-art.ts reescritos interpretando el texto de efecto completo (ej: Hender atraviesa la barrera, Duelista soledad total, Coraza 3 segmentos de runa, Ímpetu ecos por carta previa, Crueldad presa más débil al ocaso)
- Variedad aplicada: razas WoW (enano, elfa de sangre, tauren, elfa nocturna, humano, draenei, orco×3, troll, worgen), FURIA sin armadura de acero (pintura de guerra, huesos, cuero crudo, pieles)
- Fix: backticks duplicados del MultiEdit corregidos con replace_all; tsc --noEmit exit 0
- Regeneración: 12/12 PNG a 432x576 (476-596KB, sharp lanczos3 + compressionLevel 9), 0 fallos
- Verificación visual de 3 cartas clave: Mandoble (atraviesa barrera azul), Berserker (músculo/tatuajes/estelas, 0 acero), Veterano Caído (transferencia post-mortem al más débil)

Stage Summary:
- design-pattern.md es ahora la fuente completa: resolución + estilo + variedad + TRIGGER + KEYWORD + fórmula; toda keyword nueva debe registrar su interpretación visual ANTES de generar arte
- Las 12 cartas del Mazo Espejo ilustran su efecto completo; generador cumple patrón end-to-end (downscale automático)

---
Task ID: 7
Agent: Z.ai main agent
Task: Reglas de nombres de cartas — búsqueda, reconstrucción e integración al design pattern

Work Log:
- Búsqueda exhaustiva: las reglas de nombres NO estaban documentadas (design-pattern.md, 4 skills tcg-*, download/*.txt, agent-ctx/, historial git sin docs borrados). Solo sobrevivió la decisión "nombres WoW" del diseño V2 + la convención implícita en los 113 nombres heredados de public/cards
- Reglas reconstruidas empíricamente y formalizadas en design-pattern.md sección "📝 NOMBRES DE CARTA": fórmulas por categoría (Ataque: [Acción]+[modificador] / [Arma]+[epíteto agentivo]; Ítem: [Objeto]+de/del+[evocador]; Acción: [Acto]+[complemento]; Unidad: [Rol]+[epíteto]) + 6 reglas duras (español fantasy, ≤3 palabras de contenido sin contar artículos, evocar sin nombrar la keyword, unicidad — anti-duplicados heredados como cuerno_batalla/cuerno_de_batalla, 1 palabra solo para verbos icónicos/tokens, filename snake_case sin acentos) + verificación de tríada NOMBRE→EFECTO→IMAGEN
- Creado scripts/audit-card-names.py (reutilizable): valida las reglas contra cards.ts vs los 113 PNGs heredados
- El auditor destapó inconsistencia real: los ids/filenames de las 12 V2 dropeaban artículos (espada_duelista vs "Espada del Duelista"); el catálogo heredado canónico SÍ los conserva (aegis_del_bastion; las variantes sin artículo eran las duplicadas-bug)
- Renombrados 9 PNGs + sus ids en 4 archivos (cards.ts, gen-test-deck-art.ts, test-keywords-v2.ts, audit-card-names.py): espada_del_duelista, amoladora_de_campamento, cuerno_de_guerra, adarga_del_centinela, estandarte_de_la_cohorte, oracion_del_bastion, martillo_del_veterano, colmillo_del_verdugo, hacha_de_ejecucion (3 ya cumplían)
- Fix falso positivo del auditor: cortar parseo antes de PRESET_DECKS (los presets de mazo no son cartas)
- Verificación: auditoría 12/12 ✓, tests engine 34/34 ✓, tsc src/ 0 errores (solo preexistentes en examples/ y scripts/legacy/), BD con 1 deck que solo referencia ids heredados (sin migración necesaria)

Stage Summary:
- design-pattern.md cerrado como fuente única de creación de cartas: estilo + variedad + trigger + keyword + nombres + fórmula de prompt + resolución
- Convención oficial de ids/filenames: snake_case del nombre COMPLETO (con artículos) sin acentos
- audit-card-names.py queda como gate de calidad para toda carta nueva

---
Task ID: 8
Agent: Z.ai main agent
Task: Paquete completo Mago + Asesino — 3 specs por clase, 12 keywords V3, mazos espejo, arte (banners + 24 cartas), clases jugables (diseño aprobado por opciones)

Work Log:
- Diseño por AskUserQuestion: usuario eligió paquete completo + Arcana·Fuego·Hielo + Veneno·Combate·Sigilo + 2 keywords/spec + Burst vs Precisión + neutrales compartidas + banners y cartas + clases jugables
- Spec V3 documentada en download/keywords-con-efectos-v3.txt (12 keywords con contrato de 5 puntos, nichos distintos de las V2, mazos espejo, plumbing)
- types.ts: LaneId = unión de 9 carriles, GameClass + CLASS_META (lanes por clase), Keyword 12→24, KEYWORD_META con 12 entradas nuevas (exclusiveSubtype por spec), LANE_META ×9 (Wand2/FlameKindling/Snowflake/FlaskConical/Sword/EyeOff), BoardCard.powerDecay
- engine.ts: applyEffectLogic con convergencia/sobrecarga/llamarada/refriega/golpe_certero/emboscada/purga; BoardMutation.viaDebuff (Golpe Certero absorbe escudos vía applyDebuff — Hender sigue perforando); applyStartTurnEffects con escarcha (escudo renovable capped) y veneno (bypassShield); applyEndTurnEffects con ventisca (AoE) + contagio (targeting por debuffTaken, condicional) + barrido powerDecay (Sobrecarga); applyOnDeathEffects con combustion (−2X perforante); parámetro opcional lanes en rollLaneBonuses/dispatchers/computeFinalResult/planEnemyTurn (default Guerrero, retrocompatible); cloneBoard/playCard genéricos; heurísticas IA para las keywords peri-turno
- cards.ts: MAGE_CARDS + ROGUE_CARDS (12 c/u, curva 1×2·2×3·3×5·4×1·5×1, nombres según patrón, todos PTP-balanceados al coste×4+1.5), ALL_CARDS_V3, CLASS_DECKS, cardPoolForClass, PRESET_DECKS ×3; typo tormenta_de_bransas→brasas
- balance.ts: KEYWORD_BASE_VALUES para las 12 nuevas; auditoría: Mago 12/12 y Asesino 12/12 balanceadas
- gameStore: gameClass + activeLanes + selectClass; emptyBoard/nullBonuses genéricos; resolveDeck por clase (mago/asesino = mazo espejo, guerrero = custom localStorage); loadDeckAndPool/saveDeck/resetDeck con clave localStorage por clase y pool filtrado por clase; todos los dispatchers pasan activeLanes
- UI: page.tsx renderiza activeLanes; LaneComponent con 6 paletas nuevas (violet/orange/cyan/lime/red/indigo); ClassSelect desbloqueado ×3 con keywords reales y selectClass en quickPlay/openDeckEditor; GameOverModal guarda gameClass + carriles posicionales; HistoryModal etiqueta carriles según CLASS_META de la partida
- Prisma: Match.gameClass String? (db push OK); API matches valida gameClass enum opcional
- design-pattern.md: interpretación visual de las 12 keywords nuevas + SUGERENCIAS POR CARRIL para arcana/fuego/hielo/veneno/combate/sigilo (ANTES de generar arte, como exige el patrón)
- Arte: 6 banners de carril 768×1344 (gen-lane-banners.ts, sharp cover) + 24 cartas 432×576 (gen-class-art.ts, prompts con fórmula efecto+raza+trigger; 2 ejecuciones por timeout, el script resume con skip)
- Tests: scripts/test-keywords-v3.ts 30/30 (deltas exactos de las 12 keywords, escarcha capped, veneno/combustión perforan, contagio condicional, golpe certero absorbido, emboscada 1ª carta, purga al más débil, plumbing de clases); test-keywords-v2.ts 34/34 regresión; audit-card-names.py ampliado (36/36 nombres OK, corte por PRESET_DECKS + dedup por id); scripts/update-card-texts.ts (V1 olvidado) archivado en legacy
- TypeScript src/: 0 errores
- E2E navegador: partida MAGO completa (carriles arcana/fuego/hielo con banners, Escarcha "escudo restaurado a 2" en vivo, IA con mazo Mago, validación "Sin energía" correcta, game over → BD con gameClass=mago) y partida ASESINO completa (carriles veneno/combate/sigilo, IA jugó Acechador con Emboscada +4 = Poder 13 y Colmillos Curvos 14, game over → BD gameClass=asesino); fix 500 en POST: dev server tenía Prisma Client viejo → reinicio; 0 errores JS en toda la sesión
- Persistencia: carriles guardados posicionalmente en columnas históricas + gameClass para etiquetar

Stage Summary:
- 3 clases jugables: Guerrero V2 + Mago V3 (Burst) + Asesino V3 (Precisión), 24 keywords totales, 36 cartas con arte, 6 banners de spec
- Mecánicas nuevas del motor: escudo renovable (Escarcha), debuff on_play absorbible (viaDebuff), decay one-shot (powerDecay), targeting por estado del rival (Contagio), condición de orden de juego (Emboscada)
- Pendiente: custom decks por clase en BD (localStorage actual es global al proceso de clase), equilibrado fino con datos de partidas reales, design pass impeccable

---
Task ID: 9
Agent: Z.ai main agent
Task: Modo PvP local (hotspot/WiFi) — servidor autoritativo, tablero espejo de 6 carriles, franja rival compacta, primer jugador aleatorio

Work Log:
- Arquitectura elegida: HTTP polling (~1.2 s) con motor autoritativo en el servidor (reutiliza engine V3 sin modificarlo). Un solo proceso Next.js = ideal para hotspot (el anfitrión corre el juego y ambos entran por IP LAN). La mano del rival NUNCA viaja por HTTP (solo cantidades).
- src/lib/game/pvp.ts (nuevo, puro, sin Prisma/DOM): ADAPTADOR ESPEJO — tablero canónico POSICIONAL (3 posiciones, cartas lado A vs lado B). Al llamar al engine se construye tablero temporal con las claves del jugador en turno (sinergia +2, bonos y keywords idénticos a solitario) y se reescribe por posición. Turno N: juega primer lado → pasa → juega el otro → pasa → N+1; primer lado SORTEADO AL AZAR en T1 y alterno en T2+; energía/robo/penalización (Sobrecarga) por jugador; bonos por PAREJA compartidos; re-roll en T4; revancha re-inicia con nuevo sorteo; logs neutrales con nombres.
- prisma/schema.prisma: +PvpRoom (estado JSON por sala, sobrevive reinicios) y +PvpMatch (historial PvP: clases, nombres, marcadores, ganador). db push OK.
- src/lib/pvp/rooms.ts: registro de salas globalThis (HMR-safe) + persistencia SQLite + tokens uuid por lado + archivo del resultado una sola vez (endedSaved). Códigos de 4 chars sin ambiguos.
- API: POST /api/pvp/rooms (crear, lado A), POST .../[code]/join (lado B, auto-arranca), GET .../[code]/state (polling + heartbeat; vista saneada por lado), POST .../[code]/action (play/pass validado por servidor, errores 409 con mensaje), POST .../[code]/rematch, GET /api/pvp/lan-info (IPs LAN + puerto para compartir). auth por header x-pvp-token.
- scripts/test-pvp-engine.ts: 51/51 — lobby→playing, sorteo aleatorio (34/26 en 60), emparejamiento posicional entre clases, vistas espejo A/B (la vista rival NO incluye hand), acciones ilegales, alternancia T1→T2, 2 partidas completas aleatorias (mago vs guerrero, guerrero vs asesino) con espejo de resultados, revancha, bonos por posición.
- src/store/pvpStore.ts: pantalla setup/lobby/game, polling 1.2 s + reanudación por sessionStorage (clave por pestaña → DOS PESTAÑAS = dos jugadores para probar), applyView con números flotantes por seq, banners TU TURNO/TURNO DEL RIVAL, ráfaga legendaria, guard anti doble-disparo (drop del drag + click del carril), token en header.
- UI (src/components/game/pvp/): PvpRoot (resume + cleanup), PvpSetup (nombre + 3 clases + crear/unir), PvpLobby (código gigante, URLs LAN del anfitrión con ayuda hotspot, estado jugadores), PvpGame (FRANJA RIVAL compacta en la esquina superior: clase+nombre+conexión · mano=SOLAMENTE cantidad · energía · mazo · T/6; FILA RIVAL con SUS 3 specs y SUS fondos; FILA PROPIA con los míos; separador; marcador por pareja), PvpLane (side me/rival, resuelve por POSICIÓN — el board viaja con claves propias), PvpHandBar (PASAR solo en tu turno, Registro con lados Tú/Rival), GameOver espejo con detalle por parejas + revancha (aceptación mutua).
- Reutilizado: BoardCardMini, HandCardComponent (drag&drop sobre data-lane-id), CardPreviewModal, Confetti, LegendaryBurst, SettingsModal, LANE_COLOR_CLASSES (exportada desde LaneComponent).
- Cableado: gameStore.view + "pvp", page.tsx renderiza PvpRoot, MainMenu añade botón secundario "PVP LOCAL" (teal, Wifi icon).
- Fix durante E2E: createRoom/tryResume no movían a lobby (screen quedaba en setup); acciones enviaban token en body pero la ruta lo lee del header x-pvp-token (403) → unificado en header; guard anti-doble-POST; dev server reiniciado para recargar Prisma Client (modelos nuevos) — relanzado con setsid.
- E2E navegador 2 pestañas (Aldara Mago vs Borak Guerrero): sala 6WW9, lobby con URL LAN http://21.0.14.148:3000, sorteo aleatorio (empezó el INVITADO), drag&drop real (Hacha en ARMAS, Cristal Glacial en ARCANA), Escarcha disparó (escudo 2 renovado en T2), Insignia +3 al aliado, turnos alternos (T1=B → T2=A), banners correctos, marcadores pareados consistentes en ambas vistas, fast-forward por API → fin 2-0: host "¡VICTORIA!" / invitado "DERROTA" (espejo), detalle por carriles, revancha mutua → nueva partida T1, BD: PvpRoom 17 KB persistida + PvpMatch archivado (Aldara mago 2-0 Borak guerrero, ganador a, 6 turnos), 0 errores JS, 6 fondos verificados por CSS (lane-arcana/fuego/hielo arriba + lane-armas/proteccion/furia abajo). Solitario regresión OK (drag jugó, tablero 3 carriles intacto).
- scripts/fast-forward-pvp.ts (nueva utilidad dev): termina partidas PvP por API para pruebas.
- Validación final: test-pvp-engine 51/51, keywords-v2 34/34, keywords-v3 30/30, tsc src/ 0 errores, lint sin errores nuevos (20 preexistentes).

Stage Summary:
- PVP LOCAL jugable de punta a punta: hotspot/WiFi → anfitrión crea sala y comparte código/URL, rival se une, sorteo aleatorio del primer jugador, tablero espejo de 6 carriles (6 specs + 6 fondos de clase), franja rival compacta (mano/energía), revancha, persistencia completa.
- Motor server-authoritative sin tocar engine.ts: el patrón adaptador posicional permite cruces de clases distintos (Mago vs Guerrero) con TODAS las keywords existentes funcionando.
- Pendiente futuro: historial PvP en el perfil (PvpMatch ya archiva), sonido de acciones del rival más fino, indicador de "rival escribiendo"/emotes, custom decks de Mago/Asesino en BD (hoy PvP usa espejo oficial; Guerrero sí admite su mazo custom de localStorage).

---
Task ID: 10 (parcial — pausado por el usuario)
Agent: Z.ai main agent
Task: Efectos ambientales + VFX de keywords (PAUSADO — "dejamos eso para después") + commit del estado

Work Log:
- Investigación completa realizada (sin código): leídos engine.ts, gameStore.ts, pvp.ts, pvpStore.ts, LaneComponent, PvpLane, page.tsx, settings.ts, tcg-board-architect SKILL.md
- Diseño validado listo para implementar cuando se retome:
  * src/lib/game/fx.ts (nuevo): FxEvent { kind: keyword|destroy|shieldBlock|play|trap, keyword, lane, side, sourceUid, targetUids, value, delayMs } + fxBus pub/sub + setAmbient + eventsFromPlayResult(res, lane, actorSide)
  * engine.ts: TriggerResult.fx: FxEvent[] — push en los 12 casos periódicos (fervor/duelista/purificacion/escarcha/veneno/fortaleza/crueldad/ventisca/contagio/sobrecarga-decay/legado/combustion) + shieldBlock cuando applyDebuff absorbe
  * FxLayer.tsx: capa Phaser 3 única transparente (dynamic import, singleton, z-[45], pointer-events-none), texturas canvas (dot/glow/spark/flake), primitivas burst/ring/slash/wisps/sweep/column/converge/glowPulse/shake, receta por keyword
  * Ambient: 9 recetas continuas por LaneId (armas=motas ámbar, furia=brasas, hielo=nieve cayendo, veneno=burbujas, sigilo=bruma índigo…), ancladas a rects DOM con resync
  * Anclajes: data-card-uid universal; solitario data-lane-id (split mitad superior/inferior por bando); PvP necesita data-pvp-lane="me-X"/"rival-X" (PvpLane hoy solo ancla side="me")
  * gameStore: emitir ANTES de set() (los rects de cartas destruidas aún están en DOM); sleep entre jugadas IA cuando animationsOn
  * PvP: PvpLastAction.fx con lanePos (posición 0-2, NO laneId — el carril viaja con claves propias); cliente resuelve view.you.lanes[lanePos] y mapea side a/b → player/enemy
  * Toggle: reuse settings.animationsOn + prefers-reduced-motion
- Commit 7d242be: limpieza repo (tool-results des-trackeados + .gitignore) y db/custom.db sincronizada tras E2E PvP; árbol limpio

Stage Summary:
- PENDIENTE PARA PRÓXIMA SESIÓN: implementar el sistema FX según el diseño de arriba (todo el análisis ya está hecho, empezar escribiendo src/lib/game/fx.ts)
- El estado commiteado = PvP local completo y funcionando (Task 9)
---
Task ID: 11
Agent: Z.ai main agent
Task: Efectos ambientales + VFX de las 24 keywords (Task 10 retomado y completado)

Work Log:
- src/lib/game/fx.ts (nuevo, puro sin DOM): FxEvent { kind: keyword|play|destroy|shieldBlock|trap, keyword, lane (solitario) | lanePos (PvP 0-2), side = bando dueño de las cartas afectadas, sourceUid, targetUids, value, delayMs } · fxBus pub/sub (emitFx/subscribeFx) · KEYWORD_FX (24 recetas) · LANE_AMBIENT (9 recetas) · eventsFromPlayResult(res, lane, actor) que agrupa mutaciones por bando, mapea destrucciones (Remate/Purga → target = carta muerta, NO la nueva), shieldBlocks y trampa
- DECISIÓN: Canvas 2D propio en vez de Phaser 3 (misma arquitectura de capa única + recetas, ~1.2MB menos en el APK Capacitor, sin WebGL extra sobre el DOM)
- engine.ts: TriggerResult.fx: FxEvent[] (helper triggerResult) — pushes en las 12 keywords periódicas: fervor/duelista/purificacion/escarcha/veneno (start), fortaleza/crueldad/ventisca/contagio/sobrecarga-decay (end), legado/combustion (death); Crueldad/Contagio bloqueadas → shieldBlock sin keyword fx; PlayResult.shieldAbsorbed[] (vía viaDebuff: Golpe Certero/Llamarada) → evento shieldBlock
- gameStore: fireFx() (gated por settings.animationsOn) + fxPause(); eventos emitidos ANTES del set() en jugada del jugador y muertes encadenadas (rects precisos); SECUENCIA CINEMATOGRÁFICA en endTurn: fx fin-turno jugador → fx inicio-turno rival → cada jugada IA con reveal progresivo (set intermedio del board) + fx + pausa 720ms → fx fin-turno rival → fx inicio-turno jugador; con animaciones OFF todo es instantáneo
- FxLayer.tsx (nuevo): canvas único fixed z-[45] pointer-events-none mixBlendMode screen, singleton por token de módulo, DPR≤2, rAF con dt, presupuesto 460 partículas; AMBIENTE: emitters anclados a [data-pvp-lane] (PvP) o [data-lane-id] (solitario) con re-sync 0.7s + data-lane-recipe para la receta; partículas continuas por carril (motas ámbar, brasas, nieve, burbujas, arcanos, bruma, chispas rojas, halos); VFX: primitivas burst/ring/slash/column/converge/flake/bubble/star/hex/text + 29 recetas (24 keywords + shield_flash/trap_burst/play_dust/shatter); anclaje [data-card-uid] → carril → fallback; etiqueta flotante con KEYWORD_META.short por trigger; shake CSS (.fx-shake en globals.css) en destrucciones/explosiones; respeta animationsOn + prefers-reduced-motion
- PvP: PvpLastActionFx { kind, keyword, lanePos, side a/b ABSOLUTO, ... } · fxRelToAbs() traduce el fx relativo del engine (side player/enemy del actor) → lanePos + lado absoluto; adjuntado a lastAction en handlePlay (buildPlayFx), handlePass (end del que pasa + start del otro) y advanceTurn/startPvpMatch (start del primero); fireStartTurn/fireEndTurn devuelven FxEvent[]
- pvpStore.applyView: mapea la.fx → FxEvent local (side a/b → player/enemy propio, lanePos → view.you.lanes[pos]) y emitFx DESPUÉS del set() (carriles en DOM), delay mínimo 120ms para el re-render
- Anclajes: PvpLane añade data-pvp-lane="me-X|rival-X" + data-lane-recipe (data-lane-id SOLO en side me para no romper el drag); page.tsx y PvpGame montan <FxLayer/>
- Tests: scripts/test-fx.ts 51/51 (tabla de recetas completa, fx de los 4 triggers, condicionales Escarcha-llena/Duelista-acompañada/Contagio-limpio/Crueldad-bloqueada, shieldAbsorbed, self-scaling con delay 220, Remate→destroy del uid muerto, trampa); regresión V2 34/34 · V3 30/30 · PVP 51/51 · tsc src/ 0 errores · eslint touched files limpio
- E2E navegador: solitario MAGO — 3 carriles + canvas a pantalla completa, ambiente visible (violeta arcano + nieve HIELO, muestreo de píxeles alpha 93→173 al jugar), Escarcha disparó en T2 ("escudo restaurado a 2"), reveal progresivo de la carta rival en t+3s (antes solo al final del turno), rechazo correcto en carril con bono; PvP 2 clientes (sala TJKW: HostFX mago vs RivalFX guerrero) — el servidor adjunta fx al lastAction (play + keyword remate con lanePos), el rival lo ve en su vista con burst; Hacha rechazada por bono COSTE +1 con mensaje exacto; toggle animationsOn=false → canvas 0 píxeles encendidos y turnos instantáneos; 0 errores JS en toda la sesión

Stage Summary:
- SISTEMA FX COMPLETO: ambiente continuo por carril (9 recetas temáticas) + VFX por keyword (24 recetas + genéricos destrucción/escudo/trampa/colocación), integrado en solitario y PvP con el mismo bus
- Arquitectura: engine describe (FxEvent) → store emite → FxLayer pinta; el servidor PvP viaja ligero (solo lanePos + uids, nunca DOM)
- El pacing del turno rival ahora es cinemático con animaciones activas (reveal carta a carta) y sigue instantáneo con animaciones off
- Pendiente (de la lista global): historial PvP en perfil, custom decks Mago/Asesino en BD, equilibrado fino con datos reales, design pass impeccable

---
Task ID: 12
Agent: Z.ai main agent
Task: Commit para GitHub

Work Log:
- Diagnóstico: 375 archivos "modified" eran solo cambios de permisos (100644→100755, chmod espurio del contenedor, 0 contenido); verificado con git diff --numstat
- Fix: git config core.filemode false → árbol limpio (gradlew y .zscripts conservan 755 en el índice)
- Auditado .env trackeado: solo DATABASE_URL=file: (ruta SQLite local, sin secretos) — OK para repo privado
- Commit 5821168: db/custom.db sincronizada tras testing FX
- HEAD: 5821168 (chore db) sobre 1fc565d (feat FX completo); working tree 0 cambios
- Pendiente de credenciales del usuario: no existe remote, ni gh CLI, ni token en el entorno → push a GitHub requiere URL del repo + PAT

Stage Summary:
- Repo 100% commiteado y limpio, listo para push en cuanto el usuario aporte remote + credenciales

---
Task ID: 13
Agent: Z.ai main agent
Task: Push a GitHub (repo santos250996-netizen/guerrero-tactico-tcg)

Work Log:
- Token validado vía API (scope repo, usuario santos250996-netizen); repo del proyecto identificado: guerrero-tactico-tcg (154 commits, último push ayer, HEAD 5b3ed8c = clean slate keywords)
- Historias locales (14 snapshots desde bootstrap) y remota (154 commits dev) NO relacionadas (sin merge-base); verificado por contenido: local ES superconjunto del remoto (flashLaneBonuses/deckSlots/com.pacto.guerra presentes + fx.ts, pvp, 24 keywords, 3 clases nuevos)
- Push sin pérdida: historia legacy preservada en rama legacy-pre-reset (5b3ed8c, 154 commits); main forzada con --force-with-lease a 4c5b8da (HEAD local, incluye FX completo + db sync)
- Remoto origin configurado en .git/config con token embebido (no viaja en el tree)
- Verificado ls-remote: main=4c5b8da, legacy-pre-reset=5b3ed8c

Stage Summary:
- https://github.com/santos250996-netizen/guerrero-tactico-tcg — main = estado actual del juego (FX + PvP + 3 clases), legacy-pre-reset = historia anterior completa

---
Task ID: 14
Agent: Z.ai main agent
Task: Arreglar CI Build APK (Prisma + export estático)

Work Log:
- Fallo 1: next build en CI sin Prisma Client generado ("Cannot find module '.prisma/client/default'" en /api/pvp/rooms/[code]/action). Fix: postinstall=prisma generate en package.json + paso explícito "Generate Prisma Client" en build-apk.yml → commit 022165e. Verificado en CI: build web pasó
- Fallo 2 (revelado al arreglar el 1): Sync Capacitor fallaba — "Could not find the web assets directory: ./out". Causa: el step usaba bun run build (servidor) pero capacitor.config.ts webDir='out' exige STATIC_EXPORT=1 (build:static)
- Fallo 3 (latente): STATIC_EXPORT=1 explota en las 7 rutas API force-dynamic ("cannot be used with output: export") — nunca se había probado desde que existe PvP. El propio comentario de matches/route.ts documenta el diseño: en el build estático las rutas API se omiten y el cliente gestiona los fallos de fetch
- Fix 2+3: step de build ahora mueve src/app/api fuera del árbol durante el export (mv → build:static → mv back, RC preservado) → commit 25eefbe
- Test local previo: build estático OK (/, /_not-found), out/index.html generado, api restaurada
- CI run 39129950583: TODOS los pasos en verde, APK guerrero-tactico-apk 88.3 MB subido (expira 2027-01-16)

Stage Summary:
- Pipeline APK 100% funcional: push a main → APK debug con FX + PvP + 3 clases descargable en Actions
- El APK sirve el juego completo cliente-side; las APIs (matches/pvp) solo existen en despliegues con servidor (runtime preview)

---
Task ID: 15
Agent: Z.ai main agent
Task: Optimización de rendimiento en móvil ("q no corra lento en móvil")

Work Log:
- Auditoría de hot paths: FxLayer (mix-blend-mode:screen a pantalla completa + rAF 60fps sin pausa + DPR 2 + 460 partículas fijos), ~50 backdrop-blur simultáneos (badges de 12 cartas de mano, cabeceras de 9 carriles, header, overlay de bono), framer-motion layout (FLIP) en mano y tablero, cero React.memo, BattleLog suscrito desde page.tsx (cada entrada re-renderizaba el tablero), 9 <img> sin decoding async
- Nuevo src/lib/game/perf.ts: detección SSR-safe de tier (low/med/high) por hardwareConcurrency/deviceMemory/UA móvil
- FxLayer: mix-blend CSS → globalCompositeOperation="lighter" dentro del canvas; CFG por tier (190/320/460 partículas, DPR 1.25/1.5/2, tope 30/60fps, ambientMul 0.55/0.8/1, textGlow solo desktop); pausa total con visibilitychange; dt inalterado para partículas
- CSS: backdrop-blur eliminado en HandCardComponent (badges), LaneComponent + PvpLane (cabeceras → bg-black/30, overlay bono → bg-black/85), HeaderBar (bg opaco)
- React: BattleLogList.tsx nuevo (log aislado del tablero); BoardCardMini envuelto en memo (cards inmutables verificado en store/engine); layout-anim FLIP desactivada solo en tier low (mano + tablero)
- Imágenes: decoding="async" en las 9 <img> (script scripts/add-img-decoding.py persistido)
- Verificación: tsc src/ limpio, eslint touched limpio, FX 51/51, V3 30/30, V2 34/34, PvP 51/51, build estático OK, build servidor OK
- Commit f613259 → CI run 39132219972 TODO VERDE, APK optimizado subido

Stage Summary:
- APK con renders más ligeros: sin blend CSS global, FX escalados al dispositivo, pausa en background, menos re-renders de React y decodificación de imágenes asíncrona
- Siguiente calibración posible tras prueba real: ajustar umbrales de perf.ts o rate de partículas si algún móvil sigue throttling

---
Task ID: 16
Agent: Z.ai main agent
Task: PvP offline por hotspot — servidor dentro de la APK ("no me deja crear la sala")

Work Log:
- Root cause: la APK es export estático sin servidor Node; /api/pvp/* no existe en el dispositivo → "¿el servidor está activo?"
- Solución: @cantoo/capacitor-http-server (NanoHTTPD, foreground service, Cap 6/7/8) — el anfitrión sirve el API /api/pvp/* desde su propia app en el puerto 8787; invitado entra por IP+codigo desde el WiFi del hotspot; sin internet
- Nuevo src/lib/pvp/local-server.ts: salas EN MEMORIA (sin Prisma) + router 1:1 con las rutas Next (status/mensajes idénticos) + listeners request/server-error + CORS + OPTIONS + lan-info/health
- pvpStore: apiJson unificado (hostingLocal → in-process / remoteBase invitado / mismo origen web); createRoom nativo = start servidor + sala local; joinRoom nativo = probe 3.5s + error claro; resume restaura remoteBase (sessionStorage pvp-remote-base); exitToMenu/openSetup paran el servidor
- UI: PvpSetup input IP anfitrión (prefill 192.168.43.1) + copy sin-internet; PvpLobby ayuda offline si hostingLocal
- Config: server.androidScheme http + allowMixedContent (http://localhost es contexto seguro; localStorage se resetea UNA vez al instalar) + AndroidManifest usesCleartextTraffic; cap sync registró el plugin en gradle
- INCIDENCIA CI 1: build falló "Module not found @/lib/pvp/local-server" — la regla local-* de .gitignore tragaba el archivo (92bb557: negación + subir módulo)
- TESTS: scripts/test-local-pvp.ts 32/32 · pvp-engine 51/51 · fx 51/51 · v3 30/30 · v2 34/34 · tsc limpio · builds OK
- CI run 39134828198 TODO VERDE — APK con servidor PvP offline subida (artefacto guerrero-tactico-apk)

Stage Summary:
- PvP offline completo: hotspot del anfitrión → IP+codigo en el invitado → partida igual que online (mismo bus de FX, banner, revancha)
- Limitación v1: salas solo en memoria del anfitrión (si cierra la app, muere la sala) — mismo comportamiento que el backend preview salvo persistencia de historial
- Web/preview conserva el flujo por rutas Next sin cambios

---
Task ID: 16
Agent: Z.ai main agent
Task: 5 fixes reportados del APK/PvP — bono carril duplicado, botones sistema superpuestos, escudo tapando coste/poder, avatar en menú, botón atrás cierra app

Work Log:
- Diagnosticado overlap de botones del sistema: targetSdk=36 → Android 15+ fuerza edge-to-edge y el WebView pinta bajo las barras. Fix nativo: capacitor.config.ts android.adjustMarginsForEdgeToEdge="force" (Capacitor 7.6.9 lo soporta; aplica márgenes al WebView = insets). Complemento web: export const viewport con viewportFit=cover + userScalable=false en layout.tsx, y @media <640px padding env(safe-area-inset-*) en .app-frame
- Botón atrás Android: instalado @capacitor/app@7.1.2 (v7 para compatibilidad con core 7); nuevo src/components/native/BackButtonBridge.tsx montado en layout.tsx. Lógica: dialog abierto→Escape sintético (Radix), pvp game/lobby→exitToMenu(), pvp setup y resto de vistas→setView("main-menu"), main-menu→doble pulsación <2.2s→exitApp con toast. No-op en navegador (isNativePlatform)
- Bono carril PvP duplicado: PvpLane pintaba el chip en AMBAS filas del emparejamiento (positionBonuses[p] es compartido, verificado en pvp.ts:350). Fix: chip solo en side==="me"
- Escudo: BoardCardMini movía el chip a top-center entre coste (top-left) y poder (top-right) tapándolos. Nuevo sitio: apilado bajo el coste (left-0.5 top-[21px]), misma píldora sky con icono Shield
- Avatar en menú: nuevo src/lib/profile-storage.ts (PROFILE_STORAGE_KEY + loadStoredProfileBrief SSR-safe); MainMenu lee avatarCardId y muestra /cards/{id}.png en el botón Perfil (fallback User icon + onError); ProfileScreen refactor a la clave compartida
- Verificación: lint (0 errores propios; MainMenu setState-en-effect corregido con microtask diferida como page.tsx), tsc src/ limpio, tests PvP 51/51 + FX 51/51, build estático OK (RC=0, paridad CI)
- E2E agent-browser 2 pestañas: sala creada (UMAD) + rival unido; board muestra chips de bono SOLO en fila propia (rival-0/1/2: 0 chips, me-1/me-2: 1 chip), avatar visible en menú (screenshot), 0 errores de consola

Stage Summary:
- Commit 0ee56fd push a main; CI generando APK nuevo
- Pendiente usuario: probar APK en móvil real (botones sistema, atrás) — safe-area de Android lo resuelve nativo, iOS/PWA vía env()
- Alternativas escudo disponibles a 1 línea: banda inferior / chip centrado sobre arte / bottom-center
- Nota: cierra modales con atrás funciona vía Escape sintético (Radix DismissableLayer)

---
Task ID: 17
Agent: Z.ai main agent
Task: Patrón de diseño de cartas — nombre juega con tipo y spec; revisar y recrear lo incoherente

Work Log:
- Auditoría de las 36 cartas (nombre ↔ categoría ↔ spec). Reglas definidas: Ataque=ser/golpe, Ítem=objeto, Acción=hecho; imaginería por spec; distribución 2 Ataque + 1 Ítem + 1 Acción por spec (evita bonos de categoría muertos)
- Documentado en docs/design-pattern-cards.md (semántica, litmus test, tabla de specs, regla de arte con plantilla de prompt, tabla de correcciones, checklist)
- 15 correcciones en src/lib/game/cards.ts: 4 recategorizaciones con id mantenido (Hacha de Ejecución→Ítem, Veterano Caído→Acción, Estoque Afilado→Ítem, Cuchilla del Silencio→Ítem) + 11 renombres con nuevo id (Tajo Quebrantamuros, Duelista Errante, Toque de Guerra, Abanderado de la Cohorte, Guardián Juramentado, Conjurador de Estrellas, Aberración Arcana, Golpe Fundidor, Coloso de Escarcha, Espora Viviente, Fundirse en Sombras) con recategorización donde correspondía
- 11 artes nuevos generados con z-ai-web-dev-sdk (scripts/gen-card-art-v3.mjs, 864x1152 3:4, estilo dark fantasy consistente; prompts derivados de nombre+tipo+spec)
- scripts/audit-card-pattern.ts (auditor automático: 2/1/1 por spec, id=slug(nombre), arte presente) — 36/36 OK
- Tests actualizados a nuevos ids (v2: 10 refs, v3: 4 refs, fx: 4 nombres cosméticos). Resultados: V2 34/34, V3 30/30, FX 51/51, PvP engine 51/51
- Decks guardados en localStorage con ids viejos: resolveDeck ya cae al mazo espejo si algún id no existe (sin crash)
- Verificación: lint OK en archivos tocados, build estático RC=0, E2E agent-browser: partida Guerrero muestra Veterano Caído=ACCIÓN y Hacha de Ejecución=ÍTEM, Asesino muestra Fundirse en Sombras; 0 imágenes rotas; las 11 artes nuevas sirven con HTTP 200

Stage Summary:
- Commit a36c53c push a main; CI generando APK
- El patrón queda documentado para futuras cartas (checklist §6 del doc)
- Arte viejo de cartas renombradas queda huérfano en public/cards (no se borra por seguridad con CustomCards del editor)

---
Task ID: 18
Agent: Z.ai main agent
Task: Correcciones de 2ª ronda del patrón de cartas — 11 cartas (4 renombres por sonoridad de clase + 7 artes regenerados) y reglas añadidas al design pattern

Work Log:
- Interpretadas las 11 correcciones del usuario y codificadas como reglas V3.2 en docs/design-pattern-cards.md: Ítem=único protagonista sin manos/brazos/personajes; Acción=alguien VISIBLE ejecutándola y legible de un vistazo; Ataque=golpe en plena ejecución por el portador de la spec; nombre con vocabulario de SU clase (§5 sonoridad: mago vs guerrero vs asesino); anatomía correcta; sin mezcla de clases en el arte
- 4 renombres en src/lib/game/cards.ts (stats/keywords intactos): Antorcha Guía→Farol Ígneo (farol_igneo), Golpe Fundidor→Estallido Ígneo (estallido_igneo), Espora Viviente→Víbora Ponzoñosa (vibora_ponzonosa), Sentencia Rápida→Ajuste de Cuentas (ajuste_de_cuentas)
- 11 artes regenerados con scripts/gen-card-art-v4.mjs (z-ai-web-dev-sdk, 864x1152): el script codifica CATEGORY_RULE (los modificadores obligatorios por categoría) — 7 sobrescritos (toque_de_guerra, hacha_de_ejecucion, tormenta_de_brasas, viento_cortante, nube_toxica, estoque_afilado, cuchilla_del_silencio) + 4 nuevos para los renombres; verificación visual de los 11 (heraldo sopla el cuerno, mago canaliza tormenta/ventisca/estallido, asesino lanza la vasija, ítems en bodegón puro, víbora con ponzoña, liquidación en callejón)
- Refs sincronizadas: scripts/test-keywords-v3.ts (12 ids), download/keywords-con-efectos-v3.txt (bloque MAZOS ESPEJO regenerado desde el catálogo actual con scripts/update-keywords-txt.py — también llevaba nombres pre-V3.1)
- scripts/gen-class-art.ts y gen-card-art-v3.mjs se dejan como históricos (no afectan al build)
- Verificación: auditoría de patrón 36/36 (2/1/1 por spec, slug=nombre, arte presente); tsc src/ limpio; tests V2 34/34, V3 30/30, FX 51/51, PvP 51/51; build estático RC=0; 11 artes HTTP 200; E2E agent-browser: mazos Mago y Asesino muestran los 4 renombres con categoría correcta, 0 imágenes rotas, 0 errores de consola

Stage Summary:
- El patrón queda ampliado para creaciones futuras: §4 reglas de composición por categoría, §5 sonoridad de clase, §6 tabla V3.2 con el problema→corrección de cada carta, §7 checklist ampliado
- Decks guardados en localStorage con ids viejos: resiliencia ya existente (resolveDeck cae al mazo espejo)

---
Task ID: 19
Agent: Z.ai main agent
Task: Bug PvP — "dar pasar turno no siempre pasa, no paso de 2º turno"

Work Log:
- Diagnóstico exhaustivo: motor PvP auditado línea a línea (handlePass/advanceTurn/fireStartTurn/fireEndTurn/applyStart-EndTurnEffects — todos los triggers con guard de objetivo null); stress test nuevo scripts/test-pvp-stress-pass.mjs (300 partidas aleatorias seed 42 → 0 atascos; re-run 400 seed 77 tras cambios → 0)
- E2E 2 pestañas (XJTJ): partida completa T1→T6→ended con jugadas reales vía API + pases por UI (Colmillo del Verdugo/Crueldad con carril rival vacío incluido) — sin atascos; revancha + resume tras recarga verificados
- CAUSAS IDENTIFICADAS que producen el síntoma en el APK: (1) un throw inesperado en un efecto start/end_turn (p.ej. carta custom del editor en el mazo del guerrero) dejaba applyPvpAction a medias y la partida CLAVADA en ese turno para siempre (el cliente solo veía 409 silencioso); (2) sendPass/sendPlay tragaban los errores 409 sin feedback y la UI podía quedarse mostrando "TU TURNO" fantasma hasta el próximo poll (1.2 s)
- FIX SERVER (src/lib/game/pvp.ts): fireStartTurn/fireEndTurn con try/catch — un efecto que falle se registra en el log ("⚠️ Un efecto de fin de turno falló y fue descartado") y EL TURNO SIEMPRE AVANZA
- FIX CLIENTE (src/store/pvpStore.ts): polling refactor a pollOnce() reutilizable; sendPass/sendPlay al ser rechazados ahora muestran invalidPlayMsg con el motivo del server Y disparan re-sincronización inmediata (mata el ghost); nuevo flag passing para feedback
- FIX UI (PvpHandBar.tsx): botón muestra "Pasando…" con spinner mientras la acción viaja y se deshabilita (anti doble-tap)
- Verificación: lint OK, tsc src/ limpio, tests PvP 51/51 · V2 34/34 · V3 30/30 · FX 51/51, stress 400/400, build estático RC=0; E2E post-fix: revancha + pases alternados OK (nota: el atasco intermedio de t1 en "Esperando revancha" era artefacto HMR de dev, no aplica en producción)

Stage Summary:
- El pase de turno es ahora infalible: server avanza aunque un efecto crashee; cliente muestra por qué fue rechazado y re-sincroniza al instante; feedback táctil del botón
- Nota de diseño para el usuario: quien CIERRA una ronda abre la siguiente (alternante) — puede percibirse como "no pasó" cuando le vuelve a tocar; el Registro de Batalla muestra "X pasa el turno." + "Turno N"

---
Task ID: 20
Agent: Z.ai main agent
Task: Paquete visual V2 — "el juego está pobre en gráficos" (ideas 1+2+3: marcos TCG, tablero heráldico, juice de combate)

Work Log:
- Diagnóstico previo (Explore): el juego es 100% DOM (phaser/interactjs instalados pero sin uso); cartas = imagen full-bleed + badges + border-2 plano; tablero con gradientes negros al 35-80% enterrando el arte; textos de 5-7px; sin animaciones de combate; grids de cartas SIN AnimatePresence (muertes = corte seco)
- FASE 1 (marcos): nuevo src/components/game/CardFrame.tsx — FRAME_META por rareza (metal/acento/glow/foil), CardShell (bisel metálico + FrameCorners SVG con filigranas + name plate Cinzel integrado + foil-holo-soft épica / foil-holo-full animada legendaria + card-grain feTurbulence), CornerOrnaments reutilizable; integrado en HandCardComponent (y ghost del drag), BoardCardMini (mini, corners 9px) y CardPreviewModal (nameSize lg); CSS en globals.css (foil-sweep, card-grain, slot-pulse, fx-shake-board + prefers-reduced-motion)
- FASE 2 (tablero heráldico): nuevo src/components/game/LaneDecor.tsx — LaneBanner (estandarte con remates metálicos + rombo central, texto Cinzel 8.5px), EmptySlot (runa circular SVG + silueta lucide del tipo; pulsa ámbar con canDrop), LaneEmblem (escudo con espadas cruzadas reemplaza el "VS" de 6px), LANE_HEX; aplicado a LaneComponent y PvpLane; gradientes de fondo aligerados (from-black/35→/15) + tinte de color de carril; CornerOrnaments en page.tsx y PvpGame con data-board-root; tipografía: 5px→7px labels, 10px→12px scores, energía ⚡→icono Zap
- FASE 3 (juice): fx.ts añade kind "mutation" y eventsFromPlayResult emite hits/buffs agrupados por bando (viaja solo por PvP vía fxRelToAbs); BoardCardMini: entrada con embestida desde la mano (y±78 + rotate) + data-spec + exit de muerte; AnimatePresence en los 4 grids; nuevo src/components/game/CardJuiceLayer.tsx (WAAPI imperativo, sin re-renders): pulso de buff, hit-flash + knockback direccional desde sourceUid, clon de muerte por spec (fuego/hielo/veneno/sigilo/default) capturando rect+src sincrónicamente, shake global con 2+ bajas; FxLayer: helper orb (proyectil con estela de 5 partículas) para Golpe Certero/Combustión/Crueldad cuando hay sourceUid, detonación retardada al aterrizar, shakeBoard en explosiones
- Fix intermedio: chip de bono del banner PvP apilaba 2 líneas (23px en banner de 17px) → shrink-0 + leading-[11px] + title flex-1 min-w-0
- Verificación: tsc limpio; lint idéntico al estado previo (20 errores preexistentes); tests FX 51/51, V3 30/30, PvP 51/51, V2 34/34; build estático RC=0; E2E agent-browser 480×900: menú→clase→partida, preview con marco+pergamino, jugadas reales (Hacha→PROTECCIÓN con ÍTEM+3, Berserker→ARMAS con pulso de buff e ÍMPETU flotante), feedback de bonos coste exacto en FURIA/PROTECCIÓN/HIELO, PvP 2-tab (UJY6: Thralgrim vs Selene) con 6 fondos + banners + marcador de pareja consistente (DOM: "Selene 3 ↔ Tú 1"); 0 errores consola (5 [error] transitorios = HMR durante ediciones, no reproducibles), 0 imágenes rotas
- Nota: dev server muere entre comandos bash → relanzar con `setsid nohup bash .zscripts/dev.sh`

Stage Summary:
- Commit 5839c9d en main: 3 componentes nuevos (CardFrame, LaneDecor, CardJuiceLayer), 11 editados, +1203/−244
- El juego pasa de "prototipo" a look TCG: arte de carril protagonista, marcos con rareza legible de un vistazo, foil en épicas/legendarias, y feedback físico por cada mutación/muerte
- Pendiente visual restante (backlog): menús vivos (parallax/transiciones), iconos de fantasía propios, WebP de las 164 cartas, confetti temático

---
Task ID: 21
Agent: Z.ai main agent
Task: Pregunta del usuario "¿el balance está basado en PTP y está actualizado?" → auditoría + opción A (re-escalar Guerrero al objetivo PTP)

Work Log:
- Auditoría PTP con script nuevo scripts/audit-balance.ts: fórmula coste*4+1.5 correcta y actual (24 keywords), pero el catálogo NO estaba calibrado — mago 12/12 OK (delta -0.01), asesino 12/12 (+0.09), guerrero 1/12 (11 cartas BAJO, delta medio -6.97; peores Tajo -12.2, Colmillo -11.6). El guerrero era el mazo prototipo V2 y nunca se re-escaló al aterrizar la fórmula ×4 con V3 (~⅓ del poder a igual coste)
- Usuario eligió opción A: re-escalar Guerrero al objetivo PTP
- scripts/rebalance-warrior-suggest.ts calcula el power entero más cercano al target dentro del rango ±0.5; varios quedan forzados al único entero válido
- cards.ts: solo `power` cambia (coste/keywords/keywordValue/arte intactos): Tajo 5→17, Duelista 3→11, Amoladora 1→3, Toque 2→11, Adarga 1→6, Abanderado 2→12, Oración 2→12, Guardián 3→10, Berserker 2→8, Colmillo 4→16, Veterano 3→6
- Re-auditoría: 36/36 en rango (guerrero delta medio +0.03)
- test-keywords-v2.ts: aserciones actualizadas a los nuevos stats (sinergia de carril +2 incluida en los cálculos). Hallazgo: Purificación restaura currentPower+debuffTaken (lo acumulado), NO hasta basePower — el motor estaba bien; con los stats viejos ambas lecturas daban 3 y el test confundía una con otra. Aserción corregida y documentada
- keywords-con-efectos-v3.txt y docs/design-pattern-cards.md no referencian stats del guerrero (nada que sincronizar)
- Verificación: V2 34/34 · V3 30/30 · FX 51/51 · PvP 51/51 · stress PvP 300/300 sin atascos · tsc limpio · lint OK en tocados · build estático RC=0
- Commit b45495b push a main (CI genera APK)

Stage Summary:
- Los 3 mazos quedan calibrados al PTP objetivo: 36/36 en rango; el guerrero compite a la misma escala que mago/asesino (p.ej. coste 3 ahora p10-12 en los 3 mazos)
- balance.ts sigue sin consumidor en runtime (regla documental); scripts/audit-balance.ts queda como auditor reproducible para futuras cartas
- Aprendizaje registrado: Purificación restaura lo acumulado, no la base — relevante para futuros tests/stats

---
Task ID: 22
Agent: Z.ai main agent
Task: Paquete del usuario — rareza por fusión en PTP, modo historia vs bots, tablero cruzado estilo PvP, fix bug PvP turno 2 en dispositivos reales (las 36 cartas + 9 keywords quedan para la siguiente tanda)

Work Log:
- FIX PvP "turno mareado": la alternancia de abridor hacía que quien cerraba el turno (último en pasar) abriera el siguiente — el pase "rebotaba". Nueva regla: abridor fijo = firstSide del sorteo; invariante testado: tras cualquier pase, le toca al OTRO. Log 'Turno N — abre X' + indicador 'Turno N · Te toca/Rival' en el separador. test-pvp-turn-flow.ts nuevo (27 checks)
- Rareza en PTP: balance.ts con getTargetPTP(coste, rareza)=coste*4+1.5+tier*2 y materializeCard (+2 PODER por tier; keywords intactos). cards.ts: 36 cartas → common (la rareza se GANA, no se fabrica). Sin doble conteo: materializada auditada como común = mismo PTP
- collectionStore (localStorage): copias por tier, grant inicial 12 comunes por clase (1 vez), recompensas de victoria (2 random de cualquier clase; rareza 70% común/25% rara/5% épica; legendaria SOLO por fusión), fuse(3 iguales→tier+1), bestTier
- Modo historia: partida LOCAL sobre el motor PvP (joinBotPvpState; PvpPlayerInput.deck para mazos materializados) — carriles cruzados reales (guerrero vs mago = 6 specs), bot predeterminado (Thralgrim/Selene/Umbris) conducido por planBotTurn (reusa planEnemyTurn con board invertido) con pausas ~1s, sin red. UI: HistoriaSelect, CollectionScreen (pips por tier + stats efectivos + botón Fusionar), overlay de botín con flip de 2 cartas + NUEVA, revancha local; HISTORIA = botón principal del menú, PRÁCTICA conserva el solitario viejo
- Fix UX: confirm de salida distinto en historia ('¿Abandonar la partida?')
- Verificación: turn-flow 27/27 · PvP 51/51 · V2 34/34 · V3 30/30 · FX 51/51 · stress 300/300 · test-collection-historia 47/47 (6 partidas vs bot completas) · tsc limpio · lint OK · build RC=0 · E2E: batalla cruzada con drag, error de energía correcto, bot juega solo, fusión en UI 'ahora Rara (+2 poder)', 0 imágenes rotas, 0 errores consola
- Commit c6b3f26 (push a main, CI genera APK)

Stage Summary:
- El juego tiene loop de progresión: jugar Historia → ganar 2 cartas → fusionar 3 iguales (+2 poder por tier, dentro del PTP) → tu mazo se materializa con tus mejores copias
- El bug de PvP en dispositivos reales tenía causa matemática (alternancia del abridor), no de red: corregido y blindado con test de invariante
- PENDIENTE (aprobado por usuario, siguiente tanda): 12 cartas nuevas por clase (36) con 3 keywords nuevas por clase (1 por spec = 9) + sus artes; al entrar, cardPoolForClass/CLASS_DECKS/premios las recogen solas

---
Task ID: 23
Agent: Z.ai main agent
Task: 3ª tanda aprobada por el usuario — 12 cartas nuevas por clase (36) + 9 keywords nuevas (3 por clase, 1 por spec) + artes

Work Log:
- Diseño fijado ANTES de código (fuentes: types.ts/balance.ts/engine.ts/cards.ts leídos completos): 9 keywords mecánicamente distintas a las 24 existentes y montadas SOLO con primitivas ya verificadas del motor
- LAS 9 KEYWORDS: ARMAS=Orden de Batalla[X] (AoE buff one-shot, +X a sí y aliados del carril) · PROTECCIÓN=Custodia[X] (start_turn: escudo del aliado más débil restaurado hasta X, espejo de Escarcha) · FURIA=Desafío[X] (start_turn: +X mientras el carril enemigo supere al tuyo) · ARCANA=Drenar Poder[X] (on_play: +X propio Y −X honesto al más fuerte — único swing emparejado) · FUEGO=Detonación[X] (on_death: −X AoE vía applyDebuff, escudos absorben) · HIELO=Ruptura Glacial[X] (on_play: −X PERFORANTE al más debuffeado, empate→más fuerte) · VENENO=Miasma[X] (on_play: −X AoE perforante) · COMBATE=Caza Mayor[X] (on_play: +2X si el más fuerte enemigo supera el poder base, si no +X) · SIGILO=Conspiración[X] (PRIMERA keyword de MANO: playCard buffa newHand con handBonus+handBonusSources)
- engine.ts: 5 cases en applyEffectLogic, 2 en applyStartTurnEffects (custodia/desafio), 1 en applyOnDeathEffects (detonacion), bloque conspiración en playCard, 5 estimaciones nuevas en scoreAIPlay (custodia/desafio/detonacion/conspiracion/ruptura)
- fx.ts: KEYWORD_FX +9 reutilizando recetas existentes (0 trabajo nuevo en FxLayer)
- balance.ts: valores base 1.2/1.4/2.0/1.5/1.2/1.6/1.8/1.4/0.8 — TODAS las cartas nuevas al target PTP exacto (72/72 en ±0.5)
- cards.ts: WARRIOR2_CARDS "Cohorte de Hierro", MAGE2_CARDS "Cónclave Prismático", ROGUE2_CARDS "Gremio de la Daga" (12 c/u, curva 1×2 2×3 3×5 4×1 5×1, 2A+1I+1A por spec, 12 keywords distintas por mazo, cada spec estrena SU keyword nueva) + CLASS_DECKS_SECOND + classDecksOf() + PRESET_DECKS +3 + ALL_CARDS_V3 = 72
- FIX BUG detectado en E2E: gameStore.loadDeckAndPool usaba ALL_CARDS (alias V2 de 12 cartas) como pool del GUERRERO → el preset "Cohorte de Hierro" se resolvía 0/12 en el editor. Ahora cardPoolForClass(cls) para las 3 clases (ALL_CARDS quitado del import)
- pvpStore.startHistoria: el bot lleva aleatorio 50/50 entre CLASS_DECKS y CLASS_DECKS_SECOND; HistoriaSelect y CollectionScreen: contadores "/36" → ALL_CARDS_V3.length dinámico
- 36 artes con scripts/gen-card-art-v5.mjs (nuevo; ONLY= para regenerar selectivas, FORCE=1): 3 regeneraciones por violar la regla de ÍTEM (estandarte con 6 personajes, muñonera dibujaba espada) — subjects blindados con "absolutely no people and no figures anywhere"; verificación visual de 5 (Fénix/Estandarte/Muñonera/Dardo/Emblema en partida)
- scripts/test-keywords-v4.ts NUEVO (71 checks): deltas exactos de las 9 keywords (incluye escudo absorbiendo drenaje, perforación de ruptura/miasma, empates, sin grietas, caza sí/no, materialización del handBonus al jugar la carta buffeada) + composición de los 3 mazos + PTP 72/72
- audit-card-pattern.ts reescrito: audita por MAZO (6) y no global (con 2 mazos por clase cada spec tiene 4A+2I+2A en el catálogo); detecta ids duplicados; 18/18 specs OK
- update-keywords-txt.py (catálogo duplicado a mano) → scripts/update-keywords-txt.ts: genera download/keywords-con-efectos-v4.txt heredando la doc V2/V3 + sección 3ª tanda + bloque de 6 mazos desde cards.ts real
- Verificación: V4 71/71 · V2 34/34 · V3 30/30 · FX 51/51 · PvP-engine 51/51 · turn-flow 27/27 · collection-historia 47/47 · stress 300/300 · tsc limpio · lint OK en tocados · build estático RC=0 · E2E agent-browser: preset II carga 12/12, partida práctica completa con el mazo II (Emblema c1 en FURIA "SOLO COSTE 1" p7 con Ímpetu flotante; Gladiador rechazado correctamente por bono de coste; bot jugando Quebrantador/Baluarte del mazo II; registro mostrando "🔥 Gladiador (Desafío): +2 (el carril es desafiable)" y Fervor; bonos de carril en banners; artes nuevas en mano y tablero) · 0 errores consola · 0 imágenes rotas (15/15)
- Commit d25fee0 push a main (CI genera APK)

Stage Summary:
- El catálogo pasa de 36 a 72 cartas (6 mazos predeterminados, 2 por clase) y de 24 a 33 keywords; las 9 nuevas son 1 por spec y todas viven dentro de la fórmula PTP
- Conspiración estrena la mecánica de MANO (handBonus), previamente tipada pero sin productor
- FIX de deckEditor/gameStore: el pool del guerrero ve ahora los 2 mazos (antes el preset II se vaciaba)
- El doc de keywords pasa a v4 (generado desde el catálogo real, no duplicado a mano)
- Pendiente heredado sin cambios: PvP offline por hotspot, calibración perf.ts, playtest/equilibrado de los mazos II en partidas reales, pulido Impeccable, puntos gráficos 4/5/6

---
Task ID: 24
Agent: Z.ai main agent
Task: Ajuste del usuario — el bot del modo historia es ALEATORIO (cualquier clase con cualquiera de sus 2 mazos); fuera la selección de rival

Work Log:
- pvpStore.startHistoria: firma reducida a { playerClass, playerName? }; el bot se sortea DENTRO del store — clase uniforme entre guerrero/mago/asesino y mazo 50/50 entre CLASS_DECKS y CLASS_DECKS_SECOND de esa clase (6 rivales posibles, espejos incluidos). botClass sigue guardándose en state (consumidores internos intactos)
- HistoriaSelect: eliminada la sección "Tu rival" (3 botones + Crown + HISTORIA_BOTS import); nuevo chip rosa con Dices: "Rival aleatorio · cualquier clase, cualquiera de sus 2 mazos". Flujo final: HISTORIA → eliges tu héroe → BATALLAR
- Depuración E2E: un primer bucle dio "8/8 Selene" — falso: el bucle nunca salía de la partida (refs obsoletos tras navegación) y leía el MISMO tablero. Escrito scripts/sample-bots.sh (refs frescos por paso + verificación de salida + confirm aceptado): 12 sorteos reales = 5 Thralgrim / 4 Umbris / 3 Selene → sorteo uniforme confirmado
- Varianza de mazo (I vs II) ya cubierta por test V4 71/71 y E2E tanda 23 (bot jugando cartas del mazo II); el pick usa el mismo patrón Math.random verificado
- Verificación: tsc limpio · lint OK en tocados · turn-flow 27/27 · pvp-engine 51/51 · colección-historia 47/47 · build estático RC=0 · E2E visual: pantalla solo con "Tu héroe" + chip + BATALLAR
- Commit f311f8e push a main (CI genera APK)

Stage Summary:
- El rival del modo historia es sorpresa total: no se elige ni clase ni mazo; el chip lo anuncia y el nombre real (Thralgrim/Selene/Umbris) se revela en la partida
- sample-bots.sh queda como sondeo reproducible del sorteo
- Sin cambios en motor, colección ni recompensas

---
Task ID: 25
Agent: Z.ai main agent
Task: Explicar la fusión + progresión (mazo inicial neutral, desbloqueo jugando) + fix botón Opciones + nombre PvP del perfil

Work Log:
- cards.ts: starterDeckFor(cls) — todas las neutrales de la clase (guerrero 11, mago 11, asesino 9) + exclusivas más baratas hasta 12 únicas; battleDeckFromOwned(cls, tierRankOf) — las 12 mejores propias (rareza desc, empate por catálogo); NEUTRAL_KEYWORD_IDS + classCardsOf exportados
- collectionStore: grantStarterDeck usa el starter neutral; añade tierRankOf (−1 sin copias, 0..3) y owns()
- startHistoria: mazo del jugador = battleDeckFromOwned materializado (antes preset fijo)
- HistoriaSelect: grant de los 3 starters al entrar + chip "Mazo: tus 12 mejores de X · N/24 desbloqueadas"; FIX de re-render (distinctCards/owns como selectores-función no re-renderizaban → suscripción a copies)
- CollectionScreen: 24 cartas por clase (antes solo mazo I), bloqueadas "🔒 gana partidas", explainer del bucle en 3 pasos
- MainMenu FIX: elementFromPoint sobre el engranaje daba el DIV "Práctica PvP Local" (filas absolute full-width en z-20 pintadas después del botón) → pointer-events-none en las 3 filas + pointer-events-auto en sus botones; versión v2.2
- PvpSetup: nombre = perfil (chip fijo "de tu Perfil", sembrado en el store al montar; input solo si el perfil no tiene nombre)
- SettingsModal: "Reiniciar colección" con confirm en 2 pasos; reset por evento al cerrar (no effect) por react-hooks/set-state-in-effect
- test-collection-historia.ts: +sección 4 (18 checks) → 65/65
- Verificación: tsc limpio · lint OK · turn-flow 27/27 · engine 51/51 · V2 34/34 · V3 30/30 · V4 71/71 · FX 51/51 · stress 300/300 · build RC=0 · E2E: Opciones clicable, reset colección, grant 36 copias, chip 12/24, Colección 24 filas/12 bloqueadas, PvP chip "Santos · de tu Perfil", partida historia con starter (mano 100% neutrales)
- Commit e981902 push a main (CI genera APK)

Stage Summary:
- El juego tiene progresión real: entras con las neutrales de tu clase, cada victoria te da 2 cartas, 3 iguales se fusionan (+2 poder), y en batalla juegas SIEMPRE tus 12 mejores propias
- "Reiniciar colección" en Ajustes para volver a empezar
- El botón Opciones del menú vuelve a ser tocable (era un problema de capas pointer-events)

---
Task ID: 26
Agent: Z.ai main agent
Task: Tanda de 9 fixes del usuario — mano aleatoria, energía visible, marcador simple, coste -1 en UI, fuera selección de clase de Historia, colección global (también PvP), botín por derrota, freeze del anfitrión PvP, auditoría IA

Work Log:
- MANO ALEATORIA: buildDrawPileFrom NO barajaba (orden de catálogo) y drawStartingHand robaba con pop() → misma mano SIEMPRE. Fix: shuffle Fisher-Yates en buildPlayer (pvp.ts) y en initGame (gameStore); test sección 10 (5 repartos → 5 manos distintas)
- ENERGÍA VISIBLE: PvpHandBar mostraba el pill "Tu turno" (duplicado del separador central) en lugar del círculo de energía → restaurado el GRAN CÍRCULO dorado estilo solitario (turno izq / energía centro / mazo der); pill eliminado
- MARCADOR SIMPLE: el box de puntuación de la pareja se pintaba en las DOS filas (propia y rival) → ahora SOLO en la fila propia (PvpLane)
- COSTE -1: el servidor YA descontaba (getFinalCost) pero la UI no lo reflejaba: affordability comparaba coste base → ahora es consciente del bono (una carta se ve jugable si ALGÚN carril la acepta con su coste efectivo, PvpHandBar + HandBar solitario); chip "⚡ N (tachado coste base)" en el banner del carril al seleccionar carta; test sección 11a (coste 3 en carril negativo con energía 2 → gasta 2)
- FUERA SELECCIÓN DE CLASE: MainMenu HISTORIA → class-select directamente (como antes); ClassSelect es la entrada del modo historia (grant de los 3 starters al montar, contador N/24 por clase, línea "Rival aleatorio · ganar 2 / perder 1") y "Jugar Partida" → startHistoria vs bot aleatorio SIN pantalla intermedia; HistoriaSelect BORRADO (vista "historia-select" eliminada del gameStore y page.tsx); DeckEditor "Batalla" → startHistoria (guardando antes si hay cambios)
- COLECCIÓN GLOBAL (no solo historia): collectionStore.battleDeckFor(cls) — mazo editado (localStorage, deck-storage.ts) si es 100% propio, si no las 12 mejores propias, MATERIALIZADO (+2/tier); lo usan startHistoria Y createRoom/joinRoom (PvP online): la colección viaja {id, rarity} y el servidor la reconstruye canónica con sanitizeClientDeck (zod schema + rooms.ts + parseInput del local-server); DeckEditor con pool gateado (🔒 Bloqueada en cartas sin copias, solo preview), slots y pool MATERIALIZADOS (lo que ves es lo que juegas), aviso si el mazo guarda cartas ya no propias, presets filtran a propias + relleno; loadDeckAndPool default = battleDeckFromOwned (antes el espejo completo)
- BOTÍN POR DERROTA: checkHistoriaEnd → derrota/empate paga 1 carta (victoria 2, registerWin solo al ganar); HistoriaEndOverlay muestra el botín también en derrota ("igual te llevas 1 carta")
- FREEZE DEL ANFITRIÓN: causa probable encontrada — un throw en applyView (sfx con AudioContext interrumpido al salir a activar el hotspot) moría ANTES del set({view}) y CADA poll re-fallaba para siempre: UI clavada mientras el invitado seguía jugando. Fixes: applyView blindado (set({view}) SIEMPRE; sfx/banner/FX/floats en try-catch separados), tone() de sound.ts try-catch (AudioContext closed), pollOnce con sync mínimo de respaldo, resync en visibilitychange (al volver del fondo), botón resync en el store, PvpErrorBoundary nuevo alrededor de PvpRoot (Reintentar/Salir al menú ante crash de render)
- AUDITORÍA IA (sección 12): 40 partidas completas bot(planBotTurn) vs jugador scriptado → 0 violaciones de energía (gasto ≤ energía por medio-turno, 0≤energía≤maxEnergy), 40/40 sin atascos. La IA NO hacía trampa: la confusión venía de no ver la energía propia (círculo restaurado) + el chip del rival solo refrescaba por poll
- Verificación: tsc limpio · lint OK en tocados · pvp-engine 62/62 (10 nuevas: shuffle, cost_neg real, sanitizeClientDeck ±, auditoría) · turn-flow 27/27 · colección-historia 65/65 · FX 51/51 · V2 34/34 · V3 30/30 · V4 71/71 · stress 300/300 · local-pvp 32/32 · build estático RC=0 · E2E agent-browser: HISTORIA→héroe→JUGAR sin pantallas extra, círculo de energía visible (1), pill "Tu turno" fuera, marcador solo en fila propia, drag&drop REAL jugó carta coste 1 en Protección (energía 1→0), rechazo correcto en "SOLO COSTE 3" con mensaje, energías 6/6 al turno 6 sin freeze, editor con 12 bloqueadas + rara materializada (+2 poder, marco sky), 0 errores consola
- Commit + push a main (CI genera APK)

Stage Summary:
- La mano inicial es aleatoria de verdad; la energía propia vuelve a verse en su círculo sobre la mano; el marcador de carriles aparece una sola vez; el bono "Coste -1" ahora se VE al jugar (chip ⚡ + affordability por carril) aunque el descuento del servidor ya era correcto
- El flujo vuelve a ser: JUGAR → héroe (con Mazo editable) → partida vs bot aleatorio directo; sin HistoriaSelect
- La colección es GLOBAL: lo ganado por farming (fusiones raro/épico/legendaria) se ve raro/épico en el editor y se juega igual en historia y en PvP online (el servidor reconstruye el mazo canónico desde id+tier)
- Perder paga 1 carta (ganar 2): el farming nunca se corta en seco
- Anti-freeze del anfitrión en 4 capas (applyView a prueba de throws + audio blindado + resync al volver del fondo + ErrorBoundary); la IA quedó AUDITADA sin violaciones de energía
- Pendiente heredado: calibración perf.ts en real device, playtest de equilibrado, gráficos 1+2+3 aprobados sin empezar, puntos gráficos 4/5/6

---
Task ID: 27
Agent: Z.ai main agent
Task: "el turno de la ia no se visualiza, solo es el cartel de turno rival" — hacer VISIBLE el turno del bot

Work Log:
- Diagnóstico: el bot SÍ jugaba (runBotTurn, 850ms entre jugadas) pero (1) empezaba a los 1000ms, DETRÁS del cartel "TURNO DEL RIVAL" (vive 1600ms, overlay bg-black/60+blur) → su primera jugada se perdía; (2) las cartas entraban a la fila rival con solo el fly-in sutil de BoardCardMini y el FX de polvo — sin anuncio de QUÉ había jugado (mano rival oculta, no hay forma de saberlo)
- pvpStore: estado nuevo rivalPlay (RivalPlayAnnounce: name/defId/rarity/cost/power/laneTitle) + highlightUid; applyView detecta la.type==="play" && la.side!==mine → busca la carta por playedUid en board[lanes].enemy y arma el anuncio (fallback a cardName de lastAction si murió al entrar); auto-limpieza 1900ms/1500ms con guard por id (mismo patrón blindado que el banner); resets en openSetup/exitToMenu/startHistoria
- Timing: scheduleBotIfNeeded 1000→1900ms (el cartel vive 1600ms — el bot ya no juega detrás de él); pausa entre jugadas 850→1100ms (cadencia legible con el anuncio de 1.9s)
- PvpGame: RivalPlayAnnouncer nuevo — tarjeta compacta top-center (z-40, pointer-events-none) con ARTE de la carta + "THRALGRIM jugó · PROTECCIÓN" + nombre + ⚡coste + ⚔poder, spring desde arriba, data-testid=rival-play-announce; separador central ahora late (animate-pulse text-rose-300) y dice "<nombre rival> juega…" mientras no es tu turno
- BoardCardMini: prop justPlayed → anillo ámbar pulsante (-inset-3px, keyframes opacity 1.4s) FUERA del CardShell (el negativo se recortaría); PvpLane pasa justPlayed={card.uid===highlightUid} — funciona igual en PvP online (mismo applyView)
- Verificación: tsc limpio en src/ (solo ruido legacy de scripts/) · lint OK · pvp-engine 62/62 · turn-flow 27/27 · build estático RC=0 · E2E agent-browser con sampler DOM cada 180ms durante el turno del bot: t=180-1800ms cartel+separador latiendo → t=1994ms toast "Thralgrim jugó · PROTECCIÓN Oración del B…" + ring=1 → t=3076ms "Te toca", limpieza correcta; drag&drop real jugó Guardián (regresión OK); partida COMPLETA hasta el final: DERROTA con botín de 1 carta; 0 errores de consola
- Commit 6b7e062 push a main (CI genera APK)

Stage Summary:
- El turno del bot ahora se VE: cartel → anuncio con el arte/nombre/coste/poder de CADA carta que juega + anillo ámbar sobre la carta en el carril + separador "<rival> juega…" latiendo; el bot ya no actúa detrás del cartel
- Vale también para PvP online (el anuncio sale con las jugadas del rival humano)
- Pendiente heredado: calibración perf.ts en real device, playtest de equilibrado, gráficos 1+2+3 aprobados sin empezar, puntos gráficos 4/5/6

---
Task ID: 28
Agent: Z.ai main agent
Task: Tanda GRANDE de 6 mejoras elegidas por el usuario: misiones diarias, gráficos 1-3, rangos PvP, jefes de historia, choque de carriles, stats de perfil

Work Log:
- statsStore (nuevo): perClass (partidas/victorias por clase), racha actual (±N) y mejor racha, LIGA PvP Bronce 0/Plata 100/Oro 250/Leyenda 450 con +25/+5/−10 SOLO por online; persistencia pacto-de-guerra-stats; resetStats
- Descubrimiento crítico: recordMatchResult (Perfil) existía pero NADIE lo llamaba — las stats del perfil nunca se actualizaban. Ahora pvpStore contabiliza TODO: checkHistoriaEnd (historia/boss) y applyView fin online (guard onlineEndNoted por sala, reset en create/join/setup/exit)
- missionStore (nuevo): 3 misiones/día DETERMINISTAS por fecha (mulberry32 semillado con YYYY-MM-DD, Fisher-Yates del pool de 7 tipos); progreso por hooks: play-cards (applyLocalAction + sendPlay online), win-games/win-class/win-lanes/beat-boss (fin de partida, carriles desde laneOutcomes), play-online, fuse (CollectionScreen.tryFuse); recompensa +1 carta auto (addRewards(1)); toast global MissionToast (menú + partidas); BUG encontrado en E2E: loadState generaba misiones sin persistir y ensureToday early-returnaba → progreso del día se perdía al reiniciar; fix: persistir en la generación fresca
- Panel de misiones: pill "MISIONES n/3" en el menú + modal con 3 filas (título, barra, +1 carta al completar)
- JEFES: pvp.ts bossMode + enableBossMode (LOS 3 carriles con bono vs 2 normal) + applyPvpAction opts.free (jugada sin coste; energía prestada = coste EFECTIVO exacto para no dar propina si el bono resta; restricciones de carril SIGUEN aplicando); ClassSelect botón "Desafiar al Jefe" por clase; startHistoria(boss): mazo del bot materializado a ÉPICO (+6/carta) + nombres Korgath/Nyx/Vharos; bot juega 1ª carta gratis en sus turnos pares (runBotTurn); victoria → addBossRewards (LEGENDARIA garantizada + 1 rollo); overlay "¡JEFE DERROTADO!" + skull en franja rival
- CHOQUE DE CARRILES: clashSeq en store al llegar pass nuevo → PvpGame suscribe (patrón subscribe-callback por react-hooks/set-state-in-effect) → filas rivales se embisten ±7px (spring) + fx-clash-board (sacudida vertical CSS) + 3 clash-spark en el separador (chispas radiales); respeta animationsOn y prefers-reduced-motion
- Stats de Perfil: secciones nuevas — Rendimiento por Clase (3 barras winrate + racha actual/mejor), Liga PvP (LeagueCard: liga, puntos, progreso a la siguiente, tabla de puntos), Colección N/72 (distinctOwned); LeagueChip también en PvpSetup (junto a "Tu nombre", visible con o sin perfil)
- Gráficos 1-3: G1 pips de TIER de fusión en CardShell (◆rara/◆◆épica/◆◆◆legendaria, centro-superior, activado en BoardCardMini + CardPreviewModal — lo ganado fusionando se VE); G3 badge de poder con anillo por rareza (rara cielo/épica magenta/legendaria ámbar); G2 resplandores ambientales en el menú + versión v2.4
- test-tanda28.ts (nuevo): 35 checks — bonos jefe (3 vs 2), jugada gratis (energía intacta, carta al tablero — OJO: el engine asigna uid NUEVO en tablero), bono restrictivo respeta free, matemática de ligas/puntos/racha, misiones determinismo/progreso/recompensa/no-doble-pago, addBossRewards legendaria
- Verificación: tsc limpio · lint OK en tocados · tanda28 35/35 · pvp-engine 62/62 · turn-flow 27/27 · colección-historia 65/65 · FX 51/51 · V2 34/34 · V3 30/30 · V4 71/71 · local-pvp 32/32 · build estático RC=0 · E2E agent-browser: pill MISIONES 0/3 + panel con las 3 del día, persistencia desde 1ª carga, botón JEFE ×3, partida jefe con skull+nombre+3 bonos, sampler 8s = 10 muestras de chispas + 10 shake + 11 toasts del jefe y 0 errores, partida completa → DERROTA con botín 1 carta (ÉPICA nueva), stats persistidas (guerrero 1/0, racha −1), Perfil completo (clase/racha/liga BRONCE/colección 37/72), chip BRONCE 0 en PvP setup
- Commit 755bf38 push a main (CI genera APK)

Stage Summary:
- El farming ahora tiene rumbo: 3 misiones diarias que pagan +1 carta, jefes difíciles con legendaria garantizada, y una liga PvP que solo sube jugando online
- El perfil por fin cuenta lo que haces (winrate por clase, rachas, liga, colección N/72) — recordMatchResult estaba huérfano
- Cada cierre de turno choca las filas con chispas; las cartas fusionadas lucen pips de su tier en tablero y preview
- Pendiente heredado: calibración perf.ts en real device, playtest de equilibrado, puntos gráficos 4/5/6, tienda de polvo (duplicados >3), +24 cartas nuevas

---
Task ID: 29
Agent: Z.ai main agent
Task: Tanda de 13 reportes del usuario — duplicados, coste -1 a 0, Remate nuevo, rareza MÍTICA, animaciones de carriles, mensajes del bot corridos, renames de bots, arte stylized + catálogo de razas, sistema de niveles, PvP online roto, menú desorganizado, mazos de jefe temáticos, optimización

Work Log:
- DUPLICADOS: auditoría anti-gemelos (coste|poder|keyword|X|trigger) en TODO el catálogo — encontró 10 pares espejo idénticos además de Bandido≡Mercenario. Mercenario Sin Bandera → Remate[1] c2 p7 (efecto y stats nuevos); grimorio→fervor2 c1p1; víbora→Fervor on_play c1p2 (nuevo caso en computeEffect); yesca→Fortaleza end_turn; cántico Fortaleza[2] p9; nube Fortaleza[3] p6; capitán Insignia[2] p11; tónica Insignia[3] p2; ajuste Remate[3] p10; maestro Legado[4] p17; pacto Coraza[5] p16. 84/84 únicas y en rango PTP (test-tanda29 lo auditó por siempre)
- COSTE -1: getEffectiveCost Math.max(1,…)→Math.max(0,…) — las cartas de coste 1 ahora cuestan 0 en carril cost_neg (motor + UI ya compartían getEffectiveCost); test: jugada real con 0 energía OK
- REMATE nuevo: resta X al enemigo MÁS DÉBIL del carril; si tiene ≤X lo destruye (antes: destruía al más FUERTE con poder ≤X). Reducción vía viaDebuff (escudos absorben), destrucción directa. Textos de las 5 cartas remate actualizados + tests v2/v4 reescritos a la nueva semántica
- MÍTICA: 5º tier de rareza (roja). Bonos por tier REWORK: rara +2p · épica +4p · legendaria +5p y +1 KEYWORD · mítica +6p y +3 KEYWORD (materializeCard sube keywordValue solo si hasValue; determinista para el online id+tier). Fusión 3 legendarias → 1 mítica. Radiado por toda la UI: RARITY_META, marco (metal rojo), pips ◆×4, badge de poder con anillo, dots de colección/perfil, filtros del editor, zod + LEGAL_RARITIES online, textos de fusión
- NIVELES: statsStore level/xp (XP: victoria 6, derrota 3, empate 4, jefe +10, misión 4; curva 10+6·(n−1)); MESAS DE DROP por nivel: N1-2 100% comunes → N3 raras → N5 épicas y +1 carta por victoria → N7 legendarias → N10 mesa generosa y +2 cartas. rollRarity lee la mesa; addRewards(bonusForLevel). Perfil: Nivel real + barra XP + "próximo desbloqueo de drops"; overlay de fin: "¡NIVEL N! Mejoran tus drops" + Nivel · XP. BUG cazado: rollRarity viejo nunca se reemplazó (str.replace silencioso) — drops mezclaban la mesa antigua; fix + imports relativos entre stores (bun: alias @/ ≠ relativo = doble instancia)
- PVP ONLINE (la raíz del "los 2 dicen turno del rival"): el servidor local de la APK leía SOLO query.token en GET /state y el listener de Capacitor ni siquiera pasaba headers → CADA poll del invitado moría 403, stopPolling, y su UI se quedaba clavada en "TURNO DEL RIVAL" para siempre. FIX triple: handleLocalPvpApi acepta headers (5º parámetro, token = query ?? header x-pvp-token ?? body), el listener pasa req.headers, y el cliente además manda ?token= en los GET. Tests: GET state y action con token SOLO en header → 200
- MENSAJES DEL BOT: el anunciador llevaba style x:"-50%" + absolute dentro de un flex justify-center → desplazado media carta fuera de pantalla. Ahora hijo normal del flex: centrado medido en E2E (640/1280 exacto). Mismo fix en MissionToast
- MENÚ: jerarquía limpia — HISTORIA (grande) → COLECCIÓN + PvP Local (fila) → Misiones (pill fino) → versión abajo; botón "Práctica" duplicado eliminado (hacía lo mismo que HISTORIA); glows ambientales ESTÁTICOS (animate-pulse+blur costaba GPU)
- JEFE TEMÁTICO: +12 cartas nuevas (4 Sigilo/4 Hielo/4 Protección, 2A+1I+1A cada una, keywords EXISTENTES, combos únicos, PTP ±0.5) + BOSS_DECKS por clase = 12 cartas de UNA spec (Vharos→Sigilo, Nyx→Hielo, Korgath→Protección). Las nuevas entran al pool de su clase (obtenibles por el jugador, nada exclusivo de bots). Botón del jefe muestra "Desafiar al Korgath · mazo Protección". Nota: los carriles siguen siendo los 3 de la clase (Board usa claves únicas por carril — 3 carriles iguales romperían el motor); la temática la lleva el mazo 100%
- BOTS: Thralgrim/Selene/Umbris → Bram, Aprendiz de Guerrero · Iria, Aprendiz de Mago · Kess, Aprendiz de Asesino (novatos con mazos comunes, el nombre ya no promete de más)
- ARTE (patrón §4.6-4.7): doc actualizada — estilo CORREGIDO a "Stylized realism, Hearthstone-like, NUNCA fotorrealista" + CATÁLOGO DE RAZAS por clase (guerrero: orco/tauren/enano/humano/worgen · mago: humano/elfo sangre/elfo nocturno/draenei/gnomo · asesino: humano/goblin/no-muerto/elfo nocturno/worgen). scripts gen-card-art-v6 (12 nuevas) y v7 (36 espejo) + v5 parcheado; cadena completa regeneró las 84 artes al estilo corregido (verificada visualmente: goblin, orco, worgen…)
- PERF: (1) poll sin cambios → SKIP de applyView (antes re-renderizaba TODO el tablero cada 1.2s aunque no pasara nada); (2) 86 PNGs 864×1152 → 432×576 (fix-card-art-resolution) + cuantización 256 colores nueva (quantize-card-art.py): arte 90MB → 33MB (63% menos); (3) glows del menú sin pulso. Cadena de arte en scripts/art-restyle-chain.sh
- test-tanda29.ts nuevo (76 checks): coste 0 real, remate nuevo (débil sobre X sobrevive con −X; débil ≤X muere; apunta al más débil), materialize por tier (+keyword solo hasValue), cadena legendary→mythic, niveles/XP/mesas/bonus, mazos de jefe 12 únicas 1 spec sin combos repetidos y calibrados, cartas nuevas obtenibles por clase, token por header (el fix online), sanitizeClientDeck con mítica, bots Aprendiz, 84 cartas sin gemelos
- Verificación: tsc limpio · lint OK · 10 suites verdes (tanda29 76/76 · pvp-engine 62 · keywords v2 35/v3 30/v4 71 · collection-historia 69 · turn-flow 27 · tanda28 35 · local-pvp 32 · fx 51) · build estático RC=0 · E2E: menú reorganizado (screenshot), jefe Nyx con mazo hielo anunciado, anunciador centrado 640/1280, choque 10 chispas+10 shake, partida completa vs "Bram, Aprendiz de Guerrero" → DERROTA +3 XP + botín COMÚN (mesa N1), Perfil NIVEL 1 0/10 XP + drops hint, Colección 0/84 con las 12 nuevas listadas por clase, arte nuevo cargando
- Commit + push a main (CI genera APK)

Stage Summary:
- Catálogo limpio: 84 cartas únicas (auditadas anti-gemelos por test), coste 1 puede costar 0, Remate pega al más débil
- MÍTICA con keyword escalada desde legendaria — fusionar ya no solo suma poder
- Nivel del jugador gobierna los drops: de solo comunes a legendarias — el progreso se siente
- PvP online: el token del invitado viaja por header/query/body — el poll ya no muere con 403 (fin del doble "turno del rival")
- Arte 100% stylized-realism con razas del catálogo y 63% más ligero
- Nota: carriles del jefe siguen siendo los 3 de su clase (limitación del motor de claves por carril); la temática la lleva el mazo completo

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

---
Task ID: 31
Agent: Z.ai main agent
Task: "optimizar más el juego para móvil (imágenes a WebP etc.)" + fix error de hidratación reportado

Work Log:
- CAZA DEL USUARIO: el catálogo quedó en 84 cartas pero public/cards tenía 211 PNGs → diff IDs vivos (src/lib/game/**.ts, excluidos preset_* que son DECK_PRESETS, no cartas) vs archivos → 127 HUÉRFANOS (19.1MB de peso muerto viajando en la APK)
- scripts/png-to-webp.py (re-ejecutable, idempotente): borra huérfanos, convierte 84 cartas q80/method6 (30.7→4.9MB, −85%) y menú por tipo (lane q78 · main-bg q82 · profile-bg-raw q80 · game-icon-transparent q88 alfa); bora el PNG tras verificar el WebP
- Sources de generadores (game-icon-1024, game-icon-transparent, main-bg-raw) → assets-src/ en PNG (fuera de la APK); scale-android-icons.py, gen-game-icon.ts y gen-menu-bg.ts repuntados; art-restyle-chain.sh llama a png-to-webp.py como PASO FINAL (regenerar arte ya produce WebP directo)
- 13 referencias .png→.webp en src/ (0 residuales); seguía habiendo lazy loading de la tanda anterior (BoardCardMini/DeckEditor/ProfileScreen/HandCard); <link rel=preload> del main-bg.webp en layout (LCP, React 19 lo iza al head)
- FIX HIDRATACIÓN (MainMenu pill "MISIONES 3/3" vs "0/3"): missionStore persist con localStorage se rehidrata SÍNCRONO antes del mount → el HTML prerenderizado del export estático discrepa del primer render cliente. Contador gated tras microtask del effect existente (setReady) → servidor y cliente pintan "Misiones" a secas en hidratación, el contador aparece después. Mismo patrón que page.tsx
- eslint.config.mjs: ignora android/** (chunks minificados del build Capacitor provocaban 12 errores falsos de no-this-alias), public/** y assets-src/**
- Verificación: tsc 0 errores · lint 0 errores · 11 suites verdes (pvp-engine 62 · turn-flow · kw-v2/v3/v4 · colección 69 · fx 51 · tanda28 35 · tanda29 76 · local-pvp 32 · stress 300/300) · build estático RC=0 · E2E agent-browser 390×844: menú sin errores de página/consola, preload OK, bg=main-bg.webp, HISTORIA→guerrero→partida→carta jugada al tablero todo .webp (grito_de_agonia.webp), pill MISIONES 0/3 sin mismatch
- Commits: 1e96c7d (migración + fix) y follow-up chore (el conversor ya no deja WebP de sources en public/) → push a main, CI genera APK

Stage Summary:
- public/ 51MB → 4.7MB (−91%); export estático out/ ~55MB → 6.9MB — la APK baja proporcional (CI la regenera)
- 0 PNG en la app: catálogo 84 WebP vivos + menú WebP; arte huérfano imposible de vuelta (el conversor limpia en cada regeneración)
- Hidratación limpia verificada en navegador: fin del warning "server rendered text didn't match" del pill de misiones
- Descubrimiento clave del usuario: el conteo "211 PNGs" destapó 127 artes muertas — la auditoría de catálogo de la tanda 29 no borró sus imágenes

---
Task ID: 32
Agent: Z.ai main agent
Task: "organiza la ui del menu esta todo montado uno arriba de lo otro, al igual q en la ui de combate... las card en los carriles... queda montado"

Work Log:
- REPRODUCCIÓN PRIMERO: screenshots reales a 390×844 y 360×640 antes de tocar nada
- MENÚ (causa): los 3 bloques inferiores usaban offsets absolutos mágicos bottom-24/70/9 anclados POR SEPARADO → con labels que envolvían (PVP LOCAL partía en 2 líneas a 360px) los bloques se pisaban. FIX: un solo stack flex-col items-center gap-1.5 bottom-7 + whitespace-nowrap en los 3 pills + Historia reducido a 21px/tracking 0.32em/px-8 (entra en 360px) + PVP/Misiones a 9px tracking menor
- TABLERO (causa): BoardCardMini era aspect-[3/4] w-full DENTRO del grid 2×2 del carril — los slots vacíos llenan su celda y no delatan el problema, pero la CARTA deriva su altura del ancho: a 360×640 medido cardH=64 vs rowH=59 (+5px de desborde; en móviles del usuario con insets edge-to-edge forzados el desborde es mayor) → fila 1 montada sobre fila 2. FIX: max-h-full + self-start — la carta se clampa a la altura real de su fila (38≤39 verificado), solapamiento imposible en cualquier viewport. Los slots vacíos ya eran cell-fill → todo consistente
- BUG DE E2E CAZADO (no del juego): los PointerEvent sintéticos NO disparan los handlers de la mano (onPointerDown/Up con setPointerCapture) → scripts/e2e-drag.sh nuevo con mouse NATIVO de Playwright (drag mano→carril reutilizable). Además: el banner "TE TOCA" es uppercase por CSS (textContent = "Te toca") y los bonos restrictivos de carril ("Solo coste exacto N") rechazan jugadas con toast — la cadena drag→sendPlay→validación del motor funciona de verdad (se vio el toast "Sin energía suficiente" y "el bono exige coste exacto")
- Descartadas por evidencia: 100dvh sin fallback y aspect-[3/4] vienen del commit inicial (git log -S) — no eran regresiones recientes
- Verificación: tsc 0 · lint 0 · 11 suites verdes · build estático RC=0 (out/ 6.7MB) · E2E: menú 360×640 limpio (fila única, gaps uniformes), partida real vs bot con drags nativos, carta 38px en fila 39px, tablero con slots alineados y cero solapes
- Commit 706ae0a push a main (CI genera APK)

Stage Summary:
- Menú: bloques inferiores en stack con gap real — nada se pisa en ninguna resolución ni con labels largos
- Tablero: cartas clamped a su fila del grid 2×2 — el "montado" de carriles es geométricamente imposible ahora
- scripts/e2e-drag.sh queda para futuras tandas (drag nativo de mano a carril)
- Lección: reproducir con screenshots ANTES de tocar código ahorró un fix a ciegas equivocado

---
Task ID: 33
Agent: Z.ai main agent
Task: "que podemos mejorar de la apk visualmente, audio jugabilidad?" → tanda elegida: AUDIO FULL (música procedural + boom en choques + SFX huérfanos cableados + vibración háptica)

Work Log:
- AUDITORÍA PREVIA: sound.ts era 100% beeps de oscilador, sin música; trapTrigger/draw/remove definidos pero SIN llamadas (trampas mudas); choque de carriles con chispas+shake pero sonido cero; sin háptica en toda la APK
- src/lib/music.ts NUEVO — motor de música PROCEDURAL (0 KB de assets, coherente con la Optimización tanda 31): dos intensidades (menu 72 BPM latido de campamento / battle 96 BPM marcha de guerra con tomadas + cuerno frigio cada 8 compases), bombo/tom sintetizados con caídas de frecuencia, shaker con buffer de ruido, drone A1 con sierras desafinadas + lowpass con LFO; scheduler con lookahead (120ms) → loops sin costuras; autoplay bloqueado → difiere al primer pointerdown; visibilitychange suspende/reanuda (lección APK en segundo plano); suscripción a settings para apagar/encender al vuelo
- src/lib/sound.ts: getAudioCtx() exportado (UNA sola instancia compartida sfx+música), helper noise() con buffer sintetizado una vez, sfx.clash() NUEVO (boom grave 150→38 Hz + estallido bandpass 1100 + highpass 4200)
- CABLES en pvpStore.applyView: pass→clashSeq dispara sfx.clash + haptic("heavy"); bloque de sonidos de jugada extendido a jugadas PROPIAS (antes mudas, solo rival sonaba) con haptic("light"); fx kind "trap" → sfx.trapTrigger + haptic("medium") y kind "destroy" → sfx.remove() (independiente de animationsOn)
- src/lib/haptics.ts NUEVO: puente @capacitor/haptics (Capacitor.isNativePlatform → import dinámico) con fallback navigator.vibrate (patrones light 12ms / medium 30ms / heavy [45,50,90] / success [25,60,25,60,75]); todo fire-and-forget blindado — la vibración jamás rompe el flujo
- PvpGame: music.setMode("battle") al montar / ("menu") al desmontar; sfx.draw en el reparto inicial (único draw real del juego, antes sin sonido); victoria → haptic("success"), derrota → haptic("heavy")
- MainMenu: music.start("menu") en el effect existente (idempotente, difiere si autoplay bloquea)
- settings.ts: musicOn + hapticsOn (default true, persistidos); SettingsModal: toggles MÚSICA (nota "Tambores de guerra") y VIBRACIÓN (prueba táctil al encender) en sección Audio
- android: AndroidManifest con <uses-permission VIBRATE />; @capacitor/haptics@8.0.2 instalado — el CI hace `cap sync` → módulo nativo auto-registrado en la APK
- Verificación: tsc 0 · lint 0 · 11 suites verdes (pvp-engine 62 · turn-flow · kw-v2/v3/v4 · colección 69 · fx 51 · tanda28 35 · tanda29 76 · local-pvp 32 · stress 300/300) · build estático RC=0 (out/ 6.7MB) · E2E 390×844: menú → ajustes (3 toggles persisten en localStorage) → HISTORIA → guerrero → drag nativo carta al carril (sonido+haptic sin crash) → PASAR → choque de carriles con boom → 0 errores de página/consola; screenshot: modal con Música/Vibración + tablero intacto (fixes tanda 32 vigentes)
- Commit + push a main (CI genera APK)

Stage Summary:
- El juego DEJA DE ESTAR MUDO: latido de campamento en el menú, marcha de guerra en partidas — todo sintetizado en vivo, 0 KB añadidos a la APK
- El choque de carriles ahora golpea (boom + vibración fuerte); jugar cartas suena en ambos lados; trampas y destrucciones ya no son silenciosas
- Háptica nativa en jugada/choque/trampa/victoria/derrota con fallback web — se puede desactivar en Ajustes
- Música y vibración como toggles separados (persisten); "Sonido" sigue siendo el maestro
- Pendiente visual/jugabilidad sugerido para próximas tandas: splash nativa + transiciones, carriles FX ambientales, misiones diarias rotativas, stats locales, bot Veterano, tutorial

---
Task ID: 34
Agent: Z.ai main agent
Task: "al poner una carta o en el cambio de turno el juego se pone lento... el juego tiene q estar fluido siempre" — caza de jank en la partida

Work Log:
- PERFIL: el cambio de turno disparaba ~8 re-renders del árbol completo en ~2s (banner set/clear + choque set/clear + anuncio set/clear + floats set/clear + highlight clear) y encima de ese vendaval, el banner "TU TURNO / TURNO DEL RIVAL" cubría TODA la pantalla con backdrop-blur-sm durante 1.6s — en WebView Android backdrop-filter re-blurea el viewport CADA FRAME mientras debajo se animan choque+floats+anuncio. El blur compositivo no se ve en longtasks (es GPU del teléfono): exacto al síntoma "en el cambio de turno se pone lento"
- FIX 1 (el gordo): banner de turno SIN backdrop-blur → bg-black/70 plano (el dim sin filtro es capa GPU-gratis); también el modal de game-over (bg-black/90, sin blur) — PvpGame queda con 0 backdrop-filter
- FIX 2: memo(PvpLane) — props {position,side} estables → los re-renders de overlays NO re-pintan los 6 carriles con sus cartas; las suscripciones internas (view/selección/highlight) siguen funcionando (memo no bloquea suscripciones)
- FIX 3: PvpFloat memoizado por float con rect capturado UNA vez (useState initializer) — antes querySelector+getBoundingClientRect DURANTE el render de PvpFloatingNumbersLayer en cada re-render del padre = layout thrash justo cuando más anima
- FIX 4: memo en PvpTurnBanner, RivalPlayAnnouncer y PvpFloatingNumbersLayer (props estables)
- MEDICIÓN A/B (headless 390×844, PerformanceObserver longtask + muestreo rAF, mismo flujo drag→pasar): jugar carta 1×70ms → 0 longtasks; ventana del cambio de turno 18/395 frames >24ms → 6/357 (−67%). En el teléfono la mejora es mayor: el blur eliminado era trabajo de GPU por frame, invisible en desktop
- Banner verificado en screenshot: idéntico peso visual con dim plano (tablero nítido detrás)
- Verificación: tsc 0 · lint 0 · 11 suites verdes · build estático RC=0 (out/ 6.7MB) · E2E sin errores de página/consola
- Commit + push a main (CI genera APK)

Stage Summary:
- El cambio de turno ya no congela: sin blur full-screen + carriles blindados contra re-renders ajenos + floats sin layout thrash
- El juego juega fluido: jugar carta = 0 tareas largas en main thread
- Regla del proyecto: NUNCA backdrop-blur sobre algo que se anima — la partida queda con 0 backdrop-filter; los blur restantes viven solo en modales/estáticos de menús (ClassSelect, DeckEditor, etc.)

---
Task ID: 35
Agent: Z.ai main agent
Task: "ya tenemos bots normales y bots q son jefes... se puede hacer como una carrera al darle jugar partida como si fuera modo supervivencia segun se gane/se avance se da mas xp o mejores recompensas y en cierto punto sale el boss, no hay q tener un boton para desafiar boss" — LA CAMPAÑA (escalera de guerra)

Work Log:
- Ideas presentadas (A escalera / B cadena roguelite / C mapa) → usuario eligió Opción A con votos: global, derrota repite escalón, prestigio infinito, nombres que escalan
- NUEVO src/lib/game/campaign.ts (lógica pura): CAMPAIGN_STEPS=15, jefes en 5/10/15 (Korgath/Nyx/Vharos, paralelo a BOSS_DECKS), rival DETERMINISTA por escalón (rotación guerrero→mago→asesino, mazo par/impar de los 2 oficiales — reintentar = mismo rival, nueva barajada), títulos por tramo (Aprendiz 1-4 → Veterano 6-9 → Campeón 11-14), botTierForStep (común 1-4 → raro 5-9 → épico 10-14, +1 por prestigio, TOPE legendaria — mítica reservada al jugador), bossTierForPrestige (épico→legendaria), rewardCountForStep = 2+floor(step/4) (2→5 cartas), xpBonusForStep = step (×1.5 prestigio), effectiveDropLevel = max(nivel, escalón+2), stepChipLabel
- NUEVO src/store/campaignStore.ts: zustand + localStorage "pacto-de-guerra-campana" {step, prestige, stepsCleared}; advance() SOLO tras victoria (el 15 vencido → prestigio+1 y step=1); resetCampaign para perfil; sin acción de retroceso (derrota nunca retrocede por diseño)
- pvpStore rewired: HISTORIA_BOTS/BOSSES/BOSS_THEME migrados a campaign.ts (eliminados del store); startHistoria({step}) sustituye a boss:boolean — rival y tier salen del escalón, enableBossMode solo en 5/10/15; NUEVO estado campaignStep (null en online) + campaignCompleted; checkHistoriaEnd: victoria paga rewardCountForStep con floorLevel de escalón + advance() + addXp(xpBonus) tras registerMatch (XP win = 6+escalón; jefe mantiene +10), derrota/empate siguen pagando 1 carta SIN avanzar; requestRematch (historia) = startHistoria en el escalón ACTUAL del campaignStore → tras ganar ENCADENA el siguiente, tras perder repite; exitToMenu limpia campaignStep/campaignCompleted
- collectionStore.addRewards: opts.floorLevel — rollRarity usa max(nivel, floor): la mesa de drops del escalón abre raras/épicas/legendarias aunque seas N1 (sin floor, N1 sigue 100% común — misiones intactas)
- ClassSelect rediseñado: CampaignLadder arriba (15 segmentos ámbar/rose, cráneos sobre los muros 5/10/15, escalón actual latiendo, chip "Escalón X/15" o "JEFE", ★ Prestigio, línea "Siguiente rival: …" / "KORGATH BLOQUEA EL PASO · BOTÍN: LEGENDARIA"); ELIMINADO el botón "Desafiar al Jefe" — UN SOLO botón por clase: "INICIAR CAMPAÑA" / "CONTINUAR · Escalón X" / "ENFRENTAR · JEFE · Escalón X" (se tiñe rosa cuando el próximo es jefe); subtítulo acortado tras detectar solape con el botón volver en 390px
- PvpGame HistoriaEndOverlay: chip del escalón jugado "+★ prestigio", título "¡Campaña completada!" con Star cuando cierra la escalera, "+N XP de escalón" junto al nivel, botones de encadenamiento: SIGUIENTE ESCALÓN (ámbar) / REINTENTAR ESCALÓN (rosa) / NUEVA CAMPAÑA ★, con "Siguiente: <rival>" o "★ Prestigio N — rivales reforzados"; DeckEditor (Empezar Batalla) también arranca el escalón pendiente
- NUEVO scripts/test-campana.ts (116 asserts, 6 secciones): estructura/jefes/rotación, tiers+prestigio (tope legendaria), botín/XP escalables, advance+prestigio+reset del store, integración motor por los 15 escalones (12 cartas + bossMode), floorLevel de drops; fix de flakiness: 40 tiradas para el assert de rarezas (P<1e-12) — 3 ejecuciones seguidas 116/116; test-tanda29 actualizado a las constantes de campaign.ts
- Verificación: tsc 0 · lint 0 · 12 suites verdes (campana 116 · colección 69 · fx 51 · kw-v2 35 · kw-v3 30 · kw-v4 71 · local-pvp 32 · pvp-engine 62 · turn-flow 27 · tanda28 33 · tanda29 77 · stress 300/300) · build estático RC=0 · E2E 390×844: barra fresca ("INICIAR CAMPAÑA", rival Bram) → partida vs "BRAM, APRENDIZ DE GUERRERO" (drag+pasar) → derrota: overlay "DERROTA · ESCALÓN 1/15 · 3/10 XP · botín 1 carta · Reintentar Escalón" y localStorage SIN avance (correcto) → reintentar arranca vs Bram de nuevo → storage step=5: barra con 4 ámbar + cráneo latiendo, "KORGATH BLOQUEA EL PASO · BOTÍN: LEGENDARIA", botón rosa "ENFRENTAR · JEFE · ESCALÓN 5" → duelo vs "KORGATH, COLOSO DE HIERRO" arranca → salida con confirm → 0 errores de página; screenshots en scripts/e2e-campana-*.png
- Commit + push a main (CI genera APK)

Stage Summary:
- El modo historia ES ahora LA CAMPAÑA: una carrera persistente de 15 escalones donde el botón "Desafiar al Jefe" YA NO EXISTE — Korgath/Nyx/Vharos emergen como muros en 5/10/15
- Avanzar paga: 2→5 cartas por victoria, XP 6+escalón (×1.5 prestigio), drops con piso escalón+2; rivales deterministas con tier creciente (común→raro→épico, legendario en prestigio); perder repite el escalón (nunca retrocede); el 15 vencido abre el PRESTIGIO infinito
- Endgame rejugable: mismo motor PvP, cero assets nuevos, misiones/stats/rachas intactos

---
Task ID: 36
Agent: Z.ai main agent
Task: "en la ui de seleccion de clase hay q actualizarla ya hemos añadido cosas a las clases" — tarjetas de clase con el catálogo real

Work Log:
- Auditoría del pool real por clase (classCardsOf): 28 cartas (12 mazo I + 12 mazo II + 4 exclusivas del JEFE) y 15 keywords en uso (9 exclusivas: 6 originales + 3 de la 3ª tanda — guerrero: Orden de Batalla/Custodia/Desafío · mago: Drenar Poder/Detonación/Ruptura Glacial · asesino: Miasma/Caza Mayor/Conspiración)
- ClassSelect: keywords de CLASSES pasan a IDS de Keyword (una sola fuente de verdad) y los chips renderizan KEYWORD_META[kw].label — ya no pueden desincronizarse del catálogo; las 6 neutrales (Fervor·Coraza·Insignia·Remate·Legado·Fortaleza) se derivan de NEUTRAL_KEYWORD_IDS y se muestran como línea discreta "+ neutrales: …"
- Badge de colección dinámico: ownedDistinct/classCardsOf(cls).length ("12/28 cartas", antes "…/24" hardcodeado)
- NUEVA fila MAZOS por clase: "Mazo I · 12" (color de clase) + "Mazo II · 12" + chip rosa "Jefe {tema} · +4 exclusivas" (CAMPAIGN_BOSS_THEMES/NAMES del campaign lib, tooltip con el nombre del jefe; count calculado contra mazos I/II)
- Limpieza: eliminado script temporal de auditoría; comentario de cabecera actualizado (28)
- Verificación: tsc 0 · lint 0 · suites clave verdes (campana 116 · colección 69) · build estático RC=0 · E2E 390×844: tarjeta guerrero muestra 12/28 cartas, 9 exclusivas + neutrales + 3 chips de mazos, 0 errores de página; screenshot scripts/e2e-clases-v2.png
- Commit + push a main (CI genera APK)

Stage Summary:
- La selección de clase ya refleja el catálogo COMPLETO: 28 cartas por clase, 9 keywords exclusivas (+6 neutrales), y los 3 mazos (I, II y el del JEFE temático) visibles de un vistazo
- Los datos salen de KEYWORD_META/classCardsOf/BOSS_DECKS — futuras tandas de cartas actualizan la UI solas

---
Task ID: 37
Agent: Z.ai main agent
Task: "eso se ve demasiado desorganizado, mucho texto para simplemente elegir clase" — ClassSelect minimalista

Work Log:
- Diagnóstico: el Task 36 llenó cada tarjeta con catálogo (descripción, 9 chips de keywords, línea "+ neutrales", subtipos, 3 chips de mazos I/II/Jefe, badge N/28) + escalera en caja con cabecera/rival/reglas al pie = 3 pantallas de texto para lo que es un picker
- Rediseño MINIMALISTA (154 líneas nuevas vs 365 borradas, −211 netas):
  * NUEVA CampaignStrip: UNA línea delgada (rounded-full) — 15 segmentos finos (superados ámbar, actual latiendo blanco), jefes 5/10/15 como CRÁNEOS en línea (hecho rosa, actual latiendo, futuro apagado), ★ prestigio solo si >0, chip "ESC N/15" que se tiñe rosa con cráneo cuando el próximo es JEFE. Cero texto explicativo
  * Tarjetas compactas: icono (48px) + nombre + lema de una línea + fila [MAZO | JUGAR]. FUERA: descripción, subtipos, keywords, neutrales, chips de mazos, badge de colección, overlay de bloqueo (código muerto), divider ⚔, subtítulo del título, línea "Siguiente rival", reglas al pie — ese detalle ya vive en DeckEditor/colección
  * Botón unificado "JUGAR ▶" en las 3 clases (el escalón lo muestra la tira); rosa + cráneo cuando el próximo escalón es jefe; MAZO secundario intacto
- Layout: main ahora flex justify-center — 3 tarjetas + tira centradas en 844px sin scroll
- Verificación: tsc 0 · lint 0 · 11 suites verdes (campana 116 · colección 69 · fx 51 · kw-v2 35 · kw-v3 30 · kw-v4 71 · local-pvp 32 · pvp-engine 62 · turn-flow 27 · tanda28 33 · tanda29 77) · build estático RC=0 · E2E 390×844: estado fresco (ESC 1/15, botones ámbar) → JUGAR guerrero arranca vs "BRAM, APRENDIZ DE GUERRERO" (escalón 1 correcto) → storage step=5: 4 ámbar + cráneo latiendo, chip rosa "☠ ESC 5/15", 3 JUGAR rosas con cráneo → 0 errores de página; screenshots scripts/e2e-clases-minimal*.png
- Commit + push a main (CI genera APK)

Stage Summary:
- Elegir clase vuelve a ser ELEGIR CLASE: una tira visual + 3 tarjetas de dos líneas — toda la info de campaña es la propia escalera dibujada, no texto
- La campaña (Task 35) queda intacta: mismo startHistoria por escalón, jefes emergen solos, botín/XP escalables
- Regla de diseño: el detalle de catálogo/colección NO se repite en pantallas de elección — vive donde se gestiona

---
Task ID: 38
Agent: Z.ai main agent
Task: "para que el pvp dé recompensas también" — el PvP paga botín como la campaña

Work Log:
- Contexto: el usuario aclaró que Historia y PvP comparten motor (cambia el rival: bots vs personas) y pidió que el PvP también pague recompensas — hasta hoy el fin online solo contabilizaba stats/liga/misiones (XP base 6/3/4 de registerMatch) sin cartas
- pvpStore (bloque fin online en applyView):
  * PAGO: victoria = addRewards(2, bonusForLevel + floorLevel=nivel) — 2 cartas (+1 en N5/N10) con mesa de drops del nivel del jugador; derrota/empate = addRewards(1) — misma regla de consuelo que la campaña ("nunca manos vacías"); set({pendingRewards}) para que lo muestre el overlay
  * FIX latente: el guard onlineEndNoted no se rearmaba tras aceptar una REVANCHA → la 2ª partida no pagaría ni contabilizaría stats/misiones. Ahora applyView detecta phase≠ended tras un fin y rearma el guard + limpia pendingRewards
- PvpGameOverModal: nueva prop rewards + sección "Botín · N cartas para tu colección" (tiles 64px con borde por rareza — helper rarityBorderColor compartido, flip 3D escalonado, tag NUEVA) + línea "+N XP · 3 iguales del tier → fusión" (XP_WIN/LOSS/DRAW importados de statsStore); PvpGame le pasa pendingRewards
- Verificación: tsc 0 · lint 0 · 11 suites verdes · build estático RC=0 · E2E REAL 2 pestañas 390×844: anfitrión crea sala DEFM, invitado se une, partida completa solo-pases hasta el fin (scripts/e2e-pvp-rewards.sh) → EMPATE muestra "BOTÍN · 1 CARTA" (Salamandra Anciana, NUEVA) +4 XP en ambos clientes (rolls independientes: invitado Tónica R…) → REVANCHA aceptada en ambas → 2ª partida vuelve a pagar (Justicia de…) = rearme verificado → 0 errores de página en las 2 pestañas; screenshots scripts/e2e-pvp-botin*.png
- Commit + push a main (CI genera APK)

Stage Summary:
- El PvP ya es simétrico con la campaña en economía: ganar paga 2 cartas (con bonus de nivel y drops del nivel), perder/empatar paga 1 — misma filosofía de farming, sin tocar la escalera
- La revancha online vuelve a pagar y contabilizar (bug latente de onlineEndNoted arreglado de paso)
- Un solo motor, dos modos, la misma recompensa: bots o personas, jugar siempre suma

---
Task ID: 39
Agent: Z.ai main agent
Task: "mejorar el modo historia" — veredicto del usuario sobre 6 ideas + fix del preview bloqueado

Work Log:
- Ideas votadas por el usuario: 1 lore ✅ · 2 trucos de jefe ❌ ("peleas reales, nada de efectos independientes, el bot juega como un player") · 3 pick de botín ✅ pero de RARAS ("legendaria avanzaría demasiado rápido") · 4 biomas ✅ · 5 modificadores ❌ ("gameplay parejo para bot y player, nada de energía extra") · 6 rush de jefes ✅ para late game (pendiente para otro empujón)
- LORE (campaign.ts): CAMPAIGN_BOT_LORE (3 líneas por clase rival — una por tramo Aprendiz/Veterano/Campeón), CAMPAIGN_BOSS_LORE (frase propia por jefe), loreForStep(); NUEVO BattleIntroSplash en PvpGame: overlay z-50 con bioma, icono (espada o cráneo rosa si jefe), nombre Cinzel, cita del rival, chip de escalón y botón «¡A LUCHAR!» — tap en cualquier lugar entra; solo historia; el bot no actúa durante el splash (turno 1 del jugador)
- BIOMAS (campaign.ts): biomeForStep() → 6 paisajes con tinte radial estático (sin blur, cero coste): 1-4 Tierras Bajas (esmeralda), 5 Muralla de Hierro, 6-9 Paso de Ceniza, 10 Trono de Escarcha, 11-14 Corona de Hielo, 15 Umbral de Sombras; capa fija en PvpGame solo en historia
- BOTÍN DEL JEFE = ELECCIÓN: collectionStore pierde addBossRewards (legendaria garantizada FUERA) → rollPickOptions(3,"rare") (cartas distintas) + grantPick (isNew real al confirmar); pvpStore: estado bossPickOptions + pickBossReward(i) → pasa la elegida a pendingRewards; checkHistoriaEnd solo paga pick si bossActive, con guard contra doble-disparo (pendingRewards || bossPickOptions); HistoriaEndOverlay muestra "Elige tu botín · 3 raras, 1 tuya" con 3 tiles clicables (flip 3D, borde por rareza) y OCULTA los botones de encadenar hasta elegir; tras elegir aparece "Botín del JEFE · tu elección"
- FIX PREVIEW (HandCardComponent): handlePointerDown hacia `phase !== "playing"` return → en turno rival startRef nunca se fijaba y el tap moría sin abrir preview. Ahora el tap→preview funciona SIEMPRE (turno propio, rival y fin de partida); el drag vertical hacia el tablero sigue gateado por phase==="playing" (en turno rival el gesto se registra pero no arrastra ni selecciona, y al soltar NO abre preview)
- Tests: test-campana sección 7 nueva (lore íntegro, biomas por tramo/muro, 3 raras distintas, grantPick 1 copia, isNew real) → 130 asserts; test-tanda28 sección 4 reescrita al nuevo pick (addBossRewards ya no existe)
- Verificación: tsc 0 · lint 0 · 11 suites verdes · build estático RC=0 · E2E 390×844: splash Bram/Tierras Bajas (esmeralda) + entrada al duelo, storage step=5 → splash Korgath/Muralla de Hierro (cráneo rosa, "JEFE · ESCALÓN 5/15") + 0 errores; PvP 2 pestañas (sala YY9C): en turno del rival el que espera ABRE el preview de su mano (JUSTICIA DE LA LEGIÓN completa) y en turno propio también (AMOLADORA DE CAMPAMENTO — el grep fallaba por nombre truncado, screenshot lo confirma); screenshots scripts/e2e-splash-lore|jefe|preview-*.png
- Commit + push a main (CI genera APK)

Stage Summary:
- La campaña ahora se SIENTE una historia: rival que se presenta con su frase, paisajes que cambian por tramo, y jefes que dejan ELEGIR su trofeo (3 raras, decisión > azar)
- La mecánica de duelo queda INTACTA e igual para bot y jugador (sin trucos ni modificadores) — lo pedido
- El preview de cartas ya no se bloquea en el turno del rival (PvP e historia)
- Pendiente aprobado: Rush de Jefes para late game (próximo empujón)

---
Task ID: 40
Agent: Z.ai main agent
Task: Tanda de 10 reportes del usuario — keywords a 4 letras, drag&drop roto, carteles del cambio de turno, burst ¡Legendaria! clavado, auditoría móvil, arte repetitivo + marco en Hacha, bloqueo de clases, APK actualizable, botín del jefe rico (épicas 2-de-3)

Work Log:
- KEYWORDS EN CARTA: los 33 `short` de KEYWORD_META ahora son códigos de 4 letras (FERV/CORA/INSI/REMA/LEGA/FORT/HEND/DUEL/AMPA/PURI/ÍMPE/CRUE/CONV/SOBR/LLAM/COMB/ESCA/VENT/VENE/CONT/REFR/CERT/EMBO/PURG/ORDE/CUST/DESA/DREN/DETO/RUPT/MIAS/CAZA/CONS) y el chip de mano/editor pinta el VALOR en blanco aparte (FERV 1) — el nombre completo y la explicación siguen SOLO en el preview (regla del usuario)
- DRAG&DROP CAUSA RAÍZ: la Task 39 al gatear por fase borró el `setIsDragging(true)` → el fantasma nunca montaba, la carta no seguía al dedo y el drag "no hacía nada" (reproducido y confirmado). Además: `touch-none` en la carta (el JS posee el gesto completo — pan-x dejaba al navegador matar arrastres diagonales con pointercancel), fantasma movido por transform directo en ref (0 re-renders por pointermove a 60-120 Hz) y RUTA ALTERNATIVA: el preview de carta de mano en TU turno muestra botones "JUGAR EN <carril>" (espejo exacto de la validación del server: spec+coste+energía+hueco) — tap = juega, a prueba de dedos torpes
- CARTELES: eliminado el banner full-screen de turno (PvpTurnBanner + estado turnBanner + timer 1600ms en el store — dim 1.6s + spring + rotación infinita tapando el tablero eran el jank del cambio de turno); quedan los sonidos de pase y el separador "Turno N · Te toca / Rival juega…". Anuncio "RIVAL JUGÓ" con tween 150ms (antes spring)
- ¡LEGENDARIA! CLAVADO: LegendaryBurst eliminado de raíz (componente + usos en page/PvpGame + estado legendaryBurst + timeout). Causa: el `onDone` inline cambiaba de identidad en cada poll → el effect re-armaba el show y el cleanup mataba el único timeout que lo ocultaba → overlay z-90 fijo para siempre tras jugar una legendaria
- AUDITORÍA MÓVIL: foil legendario/mítico SIN animación en pantallas táctiles (@media pointer:coarse mata foil-sweep — un gradiente en bucle por cada legendaria era GPU constante); preview sin backdrop-blur (overlay bg-black/85 y chips sólidos); todo lo animado restante en rutas calientes revisado
- BLOQUEO DE CLASES: campaign.ts nuevo CLASS_UNLOCK_STEP (guerrero 0 · mago 5 · asesino 10) + classUnlocked/classUnlockHint ("Vence a Korgath · JEFE · Escalón 5"); ClassSelect pinta candado y deshabilita MAZO+JUGAR de las bloqueadas; PvpSetup replica el gate (y si la clase recordada quedó bloqueada, cae a guerrero); la cuenta es stepsCleared (histórico, nunca retrocede)
- BOTÍN DEL JEFE RICO (se sentía pobre): victoria de jefe = botín COMPLETO del escalón (addRewards rewardCountForStep con floor drops) + ELIGE 2 DE 3 ÉPICAS (antes 1 de 3 raras): store con bossPickSelected/toggleBossPick/confirmBossPick, overlay multi-selección (anillo fucsia ✓, contador 2/2, botón Confirmar) y el loot final agrupa escalón+épicas. Sin legendarias (regla del usuario intacta)
- APK ACTUALIZABLE (no perder progreso al actualizar): CAUSA = CI firmaba con el debug.keystore que cada runner regenera → firma distinta por build → Android exigía DESINSTALAR → progreso perdido. Fix: keystore estable COMMITTEADO (android/app/pacto-guerra.keystore, !gitignore), signingConfig "pacto" para release Y debug, versionCode = github.run_number (monótono) + versionName 2.5, CI ahora construye assembleRelease firmado y sube app-release.apk. NOTA: la transición desde la APK vieja requiere UNA última desinstalación; desde esta build TODAS las siguientes actualizan encima conservando datos
- ARTE (patrón §8 anti-plantilla): docs/design-pattern-cards.md gana "Composición EXCLUSIVA por carta" — tríada PLANO+ÁNGULO+MOMENTO obligatoria por prompt, nada de misma postura con raza/fondo cambiados, anti-marco full-bleed con sujeto recortado por el borde + checklist ampliada; scripts/gen-card-art-v8.mjs regenera las 6 señaladas con encuadres únicos: Hacha (bodegón contraluz SIN marco), Colmillo (contrapicado, tajo hacia cámara), Fiera (worgen saltando a cámara, garras recortadas), Tajo (primerísimo plano del impacto), Justicia (general aéreo desde atrás), Quebrantador (barrido lateral rompiendo la fila) — pipeline 864→432x576→WebP (0 PNG residuales, 2.4MB→0.3MB)
- Tests: test-campana +8 asserts de desbloqueo (umbrales 0/5/10, pistas Korgath/Nyx) y pick del jefe reescrito a épicas 2 copias (139/139); test-tanda28 sección 4 a épicas/2 (37/37)
- Verificación: tsc 0 errores en todo el repo · lint limpio · 11 suites verdes (campana 139 · colección 69 · fx 51 · kw-v2 35 · kw-v3 30 · kw-v4 71 · local-pvp 32 · pvp-engine 62 · turn-flow 27 · tanda28 37 · tanda29 77) · build estático RC=0 (out/ 6.8MB) · E2E 390×844: locks correctos con stepsCleared 0 y 5 (mago abre, asesino sigue cerrada), chips 4-letras en mano (INICI+FERV, MUERT), drag nativo de mano a PROTECCIÓN con selección+fantasma+aterrizaje verificados a mitad de gesto, JUGAR EN FURIA desde el preview jugó el Hacha real (mano 5→4), partida completa 6 turnos sin banner full-screen ni burst, DERROTA con botín 1 carta y encadenado, 0 errores de consola

---
Task ID: 41
Agent: Z.ai main agent
Task: "verifica coherencia sin romper nada" — auditoría integral de la tanda 40 sin cambios funcionales

Work Log:
- tsc --noEmit: 0 errores en todo el repo · eslint: limpio (0)
- 11 suites de tests: 630 asserts, 0 fallos (campana 139 · collection-historia 69 · fx 51 · kw-v2 35 · kw-v3 30 · kw-v4 71 · local-pvp 32 · pvp-engine 62 · pvp-turn-flow 27 · tanda28 37 · tanda29 77)
- Referencias residuales de lo eliminado: 0 (addBossRewards / LegendaryBurst / legendaryBurst / turnBanner / PvpTurnBanner — nada queda en src/)
- Keywords 4 letras: los 33 shorts de KEYWORD_META verificados uno a uno (FERV…CONS) + valor pintado aparte; el nombre completo y explicación SOLO en el preview (confirmado en vivo: "Coraza [2] — Al Jugar: gana un escudo…")
- Bloqueo de clases: CLASS_UNLOCK_STEP 0/5/10 intacto; ClassSelect sin botones MAZO/JUGAR en bloqueadas; PvpSetup replica gate; screenshot scripts/e2e-verify-locks.png
- Botín del jefe: rollPickOptions(3,"epic") + toggleBossPick/confirmBossPick con Confirmar deshabilitado salvo exactamente 2 — sin legendarias en el pick (regla intacta)
- LÍNEA ROJA BOT=PLAYER: engine.ts simétrico — planEnemyTurn juega por el MISMO playCard con la MISMA validación de energía (effectiveCost > energy → -Infinity); 0 rutas exclusivas de IA (sin energía extra ni trucos)
- APK actualizable: pacto-guerra.keystore committeado · signingConfig "pacto" en release Y debug · versionCode = github.run_number (monótono) + versionName 2.5 · CI sube app-release.apk
- Arte: 84/84 assets en public/cards a 432×576 exactos (0 fuera de patrón); hacha_de_ejecucion.webp regenerada sin marco (34KB WebP); design-pattern-cards.md §8 "Composición EXCLUSIVA por carta" presente con checklist ampliada
- Build estático STATIC_EXPORT=1: RC=0 (api stash/restore sin incidentes)
- E2E 390×844 en vivo: splash de lore Bram/Tierras Bajas → ¡A LUCHAR! → mano con chips REMA 4 / CORA 2 / INSI 3 / FORT 1 → preview botón "JUGAR EN ARMAS" jugó Muñonera de Asedio (escudo 0/2 en carril) → PASAR → ESPERA… rival jugó → separador compacto "TURNO 2 · BRAM… JUEGA…" (SIN banner full-screen, SIN burst) → ciclo de vuelta a PASAR; 0 errores de página, 0 errores de consola — screenshots scripts/e2e-verify-{locks,splash,turn}.png

Stage Summary:
- La tanda 40 queda COHERENTE end-to-end: código, tests, build, arte, CI/APK y experiencia real alineados con las 10 peticiones del usuario
- Ningún cambio funcional hecho: working tree solo suma este registro y 3 screenshots de verificación
- Regla de oro intacta: el bot juega exactamente como un player (mismo engine, misma energía, mismos triggers)
- Pendiente vigente: Rush de Jefes (late game, aprobado en Task 39)

---
Task ID: 42
Agent: Z.ai main agent
Task: MECÁNICAS SISTÉMICAS DE CLASE (V3) — Formación/Resonancia/Marca con balance por sim IA-vs-IA

Work Log:
- DISEÑO del usuario implementado 1-regla-por-clase ligada a CARRILES: ⚔ Guerrero FORMACIÓN (+1 permanente al cerrar turno a TODAS tus cartas de cada carril con 2+ propias, tope +1/carta tras calibrar) · 🔮 Mago RESONANCIA (misma spec consecutiva EN TU TURNO: la 2ª entra +2 y cuesta −1, suelo 0, cadenas permitidas, expira al cerrar turno) · 🗡 Asesino MARCA DE EJECUCIÓN (cada reducción REAL de poder enemigo = 1 PC, tope 5, persisten; jugar en carril con debilitado —debuffTaken>0— consume TODOS los PC: +4 c/u tras calibrar; debuff absorbido por escudo NO da PC)
- LÍNEA ROJA PRESERVADA: mismo motor para ambos lados — sin rules declaradas las reglas están INACTIVAS (630 asserts legacy intactos); el bot NUNCA recibe nada que el player no tenga
- ENGINE: ClassRulesState {classes, comboPoints, lastSpec} + emptyClassRules + constantes V3_* (únicos números de balance); playCard gana parámetro opcional rules (rulesOut funcional en PlayResult + resonancia/comboConsumed/comboGained); applyStartTurnEffects/applyEndTurnEffects/applyOnDeathEffects ganan rules opcional y rulesOut; Veneno/Crueldad/Ventisca/Contagio/Combustión/Detonación dan PC a su lado; Formación usa BoardCard.formation (nuevo campo types.ts) para el tope; planEnemyTurn/scoreAIPlay con rules (el bot Mago paga costes resonantes y el sim ve los bonus)
- ADAPTADOR pvp.ts (único camino de TODAS las partidas): PvpState.combo/lastSpec (opcional, normalizado para salas viejas), rulesFor/writeRules a↔relativo, threading en handlePlay/fireStartTurn/fireEndTurn/cadena on_death, reset en startPvpMatch, logs V3 compactos, buildClientView expone you.comboPoints/you.lastSpec/rival.rivalComboPoints
- FIX CRÍTICO encontrado por la auditoría del test 12 (9/40 partidas atascadas): el PRE-CHECK de energía de handlePlay no aplicaba el −1 de Resonancia y rechazaba jugadas que playCard SÍ aceptaba → pre-check replicado; el test auditó y ahora mira el descuento
- IA (pvp-ai.ts): planBotTurn planifica con las reglas del estado (bot=enemy) — bot juega SU regla igual que un player
- UI compacta (sin banners ni animaciones nuevas): chip PC fucsia junto a la energía (Asesino), chip PC del rival en su franja cuando >0, chips de cabecera de carril RES +2 (violeta) y FORM +1 (ámbar) SOLO fila propia, descuento resonante aplicado en canDrop/selectedEffCost/cardPlayableAnywhere/handPlayOptions (espejo exacto del server)
- BALANCE POR SIMULACIÓN (scripts/sim-clases-v3.ts, planner idéntico para ambos lados, mazos oficiales CLASS_DECKS): ronda 1 (cap+3/PC2) → asesino 24-39% ⚠️; ajustes COMBO_POWER 4 + FORMACION_CAP 1 → ronda 80: 51.9/48.7/49.4 ✅; veredicto final 200 partidas/pareja (400 por emparejamiento, ~180 decididas): guerrero↔mago 45.6% · asesino↔guerrero 45.7% · asesino↔mago 51.4% ✅ BALANCEADO (±1.3σ del 50%)
- TESTS: scripts/test-clases-v3.ts NUEVO — 46 asserts (inactividad sin rules, deltas exactos, tope Formación, suelo 0, cadenas, expiración, persistencia PC, cap 5, escudo no da PC, start/end/on_death sources, SIMETRÍA enemy-side, convivencia de 2 clases) → 12 suites verdes en total (676 asserts)
- Verificación: tsc 0 · lint 0 · 12 suites (campana 139 · collection-historia 69 · fx 51 · kw-v2 35 · kw-v3 30 · kw-v4 71 · clases-v3 46 · local-pvp · pvp-engine 62 · pvp-turn-flow 27 · tanda28 37 · tanda29 77) · build estático RC=0
- E2E 390×844 con las 3 clases reales: Asesino (stepsCleared 10) chip "0 PC" fucsia + rival IRIA CAMPEÓN DE MAGO con specs arcana/fuego/hielo; Mago (stepsCleared 5) vs JEFE KORGATH — jugada en ARCANA pinta chip "RES +2" en la cabecera del carril; Guerrero (fresco) 2 cartas en ARMAS pinta "FORM +1"; locks correctos (asesino cerrada con stepsCleared 5); bot rival juega su propia clase; 0 errores de consola — screenshots scripts/e2e-v3-{asesino-board,asesino-t2,mago-1,form-chip,locks-asesino}.png
- Commit + push a main (CI genera APK)

Stage Summary:
- Las 3 clases ahora se JUEGAN distinto (formación estable vs ráfaga arcana vs desgaste-execución) bajo UN solo motor simétrico — bot y player bajo las mismas reglas
- Balance VERIFICADO por simulación masiva: ninguna clase supera el 52% ni cae bajo 45% en 400 partidas por emparejamiento
- Pendiente vigente: Rush de Jefes (late game, aprobado en Task 39)

---
Task ID: 43
Agent: Z.ai main agent
Task: GRUPO A — rituales de clase V3 (VFX/SFX/contadores) + tooltip lore+consejo + momento firma de victoria (elección del usuario sobre el menú de opciones)

Work Log:
- RITUAL FX (canal nuevo en el pipeline fx): fx.ts gana FxKind "class" + ClassFxRecipe (formation_banner/resonance_runes/combo_blades) + FxEvent.recipe; el motor emite el de FORMACIÓN en applyEndTurnEffects (FIX incluido: los uids iban desalineados con own[i] cuando una carta ya estaba al tope del cap — ahora upliftedUids en paralelo); pvp.ts añade resonance_runes y combo_blades en buildPlayFx desde res.resonancia/comboConsumed (delayMs 260, anclados a playedUid), PvpLastActionFx.recipe y copia en fxRelToAbs
- FIX DE PIPELINE (descubierto montando los tests): advanceTurn MACHACABA lastAction con solo los fx de inicio → el fx de fin del SEGUNDO pasador (Formación del Guerrero, Fortaleza, Ventisca… TODOS los end_turn) nunca llegaba al cliente; ahora handlePass propaga endFx+side a advanceTurn y viajan con el último lastAction del turno
- SFX DE RITUAL (sound.ts): sfx.formation (tambor+anvil), sfx.resonance (shimmer arcano ascendente), sfx.combo (shing de cuchillas); disparados en pvpStore.applyView por recipe (independientes de animationsOn, igual que trampa/destrucción) + háptica
- FxLayer pinta los 3 rituales (classRitualAt): FORMACIÓN = estandarte que barre el carril + columna/anillo por carta elevada + etiqueta; RESONANCIA = hex arcano creciente + maná convergente + etiqueta; MARCA = 3 tajes cruzados + estallido fucsia + etiqueta "EJECUCIÓN ×N"; paleta propia por clase (ámbar/violeta/fucsia)
- CONTADORES TEMÁTICOS (PvpHandBar): chip PC del Asesino ahora con 5 PIPS de cuchilla (llenos=PC) y title corregido a +4/PC; chip "RESONA · <carril>" violeta para el Mago cuando lastSpec está vivo y es tu turno (aviso de cadena lista)
- A2 LORE+CONSEJO: campaign.ts gana CLASS_RULE_META (rule/sigil/lore/tip por clase, números V3 reales); componente NUEVO ClassRuleBadge (chip de una línea → tap expande lore en cursiva + consejo táctico, AnimatePresence, click sfx) montado en ClassSelect bajo el lema — la pantalla se queda minimalista (el texto vive tras el tap, como las keywords en mano)
- A3 MOMENTO FIRMA: componente NUEVO ClassVictoryFlourish — guerrero: 3 estandartes ámbar se izan tras el trofeo; mago: anillo de 6 runas violetas gira y se disipa; asesino: 2 cuchillas fucsia barren la tarjeta; DOM puro + framer-motion, una vez por partida, respeta animationsOn, acento sonoro con el sfx de la clase a 620ms; montado en HistoriaEndOverlay Y PvpGameOverModal SOLO en victoria (gate verificado en vivo: 2 derrotas sin flourish)
- TESTS: test-clases-v3 sección 6 NUEVA (20 asserts → 66): 6a engine (formation_banner con uids correctos y carta al tope excluida), 6b/6c adaptador (resonance_runes/combo_blades con lado absoluto, playedUid, lanePos, value=PC consumidos, logs V3), 6d fx de Formación viaja al pasar (cubre el fix de advanceTurn), 6e sin rules → sin rituales
- Verificación: tsc 0 · lint 0 · 12 suites (campana 139 · collection-historia 69 · fx 51 · kw-v2 35 · kw-v3 30 · kw-v4 71 · clases-v3 66 · local-pvp 32 · pvp-engine 62 · turn-flow 27 · tanda28 35-37* · tanda29 77) · build estático RC=0 (*tanda28 es flaky por diseño: sorteo del mazo del jefe, verificado con 6 corridas y contra árbol limpio)
- E2E 390×844 con las 3 clases reales: badge de regla expande lore+consejo (árbol a11y confirma texto exacto); Guerrero: FORMACIÓN pintado en vivo (etiqueta+estandarte+columnas capturados en screenshot, chip FORM +1, +1s aplicados); Mago: RESONANCIA pintado (etiqueta+runa capturados), Cántico entró +2 (9→11) y pagó −1 (energía verificada), chips RES +2 y "RESONA · ARCANA/HIELO"; Asesino: chip 5 pips "0 PC"; PvP local 2 pestañas (self-play): VICTORIA 3-0 con flourish de estandartes capturado a mitad de animación + video 30fps de la revancha completa; 0 errores de consola en ambas pestañas — screenshots scripts/e2e-a1-ritual-0.png, e2e-a1-resonancia-450.png, e2e-a3-flourish-vivo.png, e2e-a1-pips-asesino.png, e2e-a2-lore-expandido.png, video scripts/e2e-ritual-final.webm
- Commit + push a main (CI genera APK)

Stage Summary:
- Las reglas V3 ahora se SIENTEN: cada activación tiene su ritual (sonido+partículas+etiqueta), cada clase tiene su firma de victoria y su lore+consejo a un tap — sin tocar UN número de balance
- Bonus: arreglado el hueco por el que TODOS los fx de fin de turno del segundo pasador se perdían (pre-existente desde keywords V2)
- Pendiente vigente: Rush de Jefes (late game, aprobado en Task 39)

---
Task ID: 44
Agent: Z.ai main agent
Task: "espero ya no se pegue al cambiar turno ni nada de eso en movil" — auditoría de rendimiento del cambio de turno en móvil + endurecimiento (sin cambios de reglas)

Work Log:
- AUDITORÍA ESTÁTICA de toda la ruta del cambio de turno: pvpStore (applyView/poll/sendPass), pvp.ts (adaptador), PvpGame/PvpLane/BoardCardMini/PvpHandBar, FxLayer (canvas), CardJuiceLayer, Confetti, CSS de clash/sparks/shake, sound.ts y planBotTurn. Conclusión: la tanda 40 ya eliminó los grandes focos (banner 1.6s, burst clavado, foil en táctil, blur); memo en carriles/minis; FxLayer con calidad adaptativa y tope de FPS; sonidos procedurales (0 decode); planEnemyTurn trivial (3 iter × mano × carriles); poll salta applyView si version no cambió; CSS 100% transform/opacity
- MEDICIÓN EN VIVO (build de producción estática servida + Galaxy S25 emulado 360×800, UA Android → tier LOW del juego): PerformanceObserver de longtask + monitor de huecos rAF >48ms + marcas alrededor de cada acción (scripts/e2e-perf-turn.sh + e2e-perf-phases.sh)
- RESULTADO PRE-FIX: 3 cambios de turno completos (tap PASAR → choque → turno del bot con jugadas cada 1100ms) con CERO longtasks y CERO huecos de frame en sus ventanas
- FIX 1 (pvpStore.applyView): los floating numbers viajan ahora EN el set principal (una notificación zustand → un render por acción; antes dos sets = render doble por jugada)
- FIX 2 (pvpStore.applyView): auto-limpieza de floats a los 1600ms CON GUARD — si sus ids ya no están NO se hace set (antes re-renderizaba el tablero completo sin motivo en cada fin de ventana de floats)
- FIX 3 (PvpGame.RivalPlayAnnouncer): decoding="async" en el arte del anuncio (el WebP 432×576 ya no compite con el raster del anuncio en la primera jugada del rival)
- RESULTADO POST-FIX: 5 cambios de turno más (con carta propia en tablero, anuncios del rival, floats de Fervor acumulándose +1/turno, rituales y choques) → CERO longtasks y CERO huecos en TODAS las ventanas de cambio de turno
- ÚNICOS longtasks de toda la sesión: arranque de página (76ms) y montaje del modal preview (56ms, one-shot al abrir) — ninguno es cambio de turno
- Partida completa jugada hasta TURNO 6/6 en vivo: rival BRAM con 5 cartas y buffs acumulados, floats de Fervor correctos cada turno (+4 al cierre), PASAR sensible, 0 errores de consola (solo warning pre-existente de aria-describedby en DialogContent) — scripts/e2e-perf-{tablero,final}.png
- Verificación: tsc 0 · lint 0 · 12 suites (campana 139 · clases-v3 66 · collection-historia 69 · fx 51 · kw-v2 35 · kw-v3 30 · kw-v4 71 · local-pvp 32 · pvp-engine 62 · turn-flow 27 · tanda28 37 · tanda29 77) = 696 asserts · 0 fallos · build estático RC=0
- Commit + push a main (CI genera APK)

Stage Summary:
- El cambio de turno está MEDIDO y limpio en emulación de móvil low-end: ni un solo longtask ni hueco de frame en 5 ciclos completos pre/post fix
- 3 endurecimientos quirúrgicos sin tocar una regla: render único por acción, limpieza de floats sin render fantasma, decode asíncrono del anuncio
- La causa histórica ("se pegaba") ya estaba eliminada en la tanda 40; ahora además está verificado con instrumentación y sobrado de margen
- Pendiente vigente: Rush de Jefes (late game, aprobado en Task 39)

---
Task ID: 45
Agent: Z.ai main agent
Task: lote de 9 reportes del jugador — modal de victoria atrapado, recompensas no visibles, fuera «Jugar en X», fuera FX invisibles (choque de carriles / choques entre cartas), APK actualizable + progreso a prueba de reinstalación, Crueldad contra poder 0, Último Aliento imposible, textos desincronizados con la rareza

Work Log:
- MODAL DE VICTORIA (reporte: «no muestra nada, no deja continuar, hay que cerrar la app»): reproducido en E2E — la causa era el flujo del botín del JEFE que OCULTABA los botones de navegación mientras el pick «2 de 3 épicas» estuviera sin confirmar. FIX definitivo: los botones (Siguiente/Reintentar + Menú) NUNCA se ocultan y el botín del escalón se ve SIEMPRE (el pick de épicas convive arriba, es extra y opcional) — el modal ya no puede atrapar bajo ningún estado. Además revertido el «momento firma» (ClassVictoryFlourish eliminado del modal de campaña y del online, archivo borrado — «déjalo como estaba antes»)
- FX INVISIBLES / JANK (reporte: «la pegadera viene de efectos que ni se ven, el choque de carriles estoy casi seguro»): ELIMINADO COMPLETO el choque de carriles — suscripción clashSeq + setClash true/false (2 renders de tablero completo por pase), springs de framer-motion en las dos filas, sacudida CSS, chispas del separador, boom sfx.clash() + haptic heavy en cada pase; eliminados además: knockback entre cartas (CardJuiceLayer), sacudidas de carril/tablero en FxLayer (explosión/destroy), shake por multi-baja, ambient «clash» del carril combate y todo el CSS fx-shake/fx-clash/clash-spark
- MEDICIÓN POST-FIX (390×844, 3 ciclos completos de cambio de turno): longtasks acumulados 108ms (≈36ms/ciclo, bajo el umbral de 50), CERO huecos rAF — el cambio de turno queda por debajo del umbral de jank
- PREVIEW (reporte: «el jugador decidirá dónde jugar»): eliminada la sugerencia «Jugar en X» del CardPreviewModal + el helper handPlayOptions + sus props — el preview queda solo lectura; el drag es la única ruta de jugada
- REGLA DEL CAMPO «PODER A CERO = CAE» (reporte: Último Aliento imposible de disparar — solo Remate destruía y con condiciones): una carta dejada a 0 por debuffs (debuffTaken>0) muere al cierre del latido y su on_death se dispara — barrido en playCard (on_play: Llamarada/Golpe Certero/Hender/Miasma…), en applyEndTurnEffects (Crueldad/Ventisca/Contagio + decay) y en applyStartTurnEffects (Veneno perforante); escudos protegen (si absorben, el poder no bajó); la carta recién jugada y la trampa conservan su semántica; logs «cae — su poder llegó a cero» + FX destroy
- CRUELDAD (reporte: «no puede apuntar a un enemigo con poder 0 — no cumple función»): ahora elige al enemigo más débil CON PODER del carril (cuerpos a 0 ignorados; con la regla del campo además ya caen solos); si no hay nada vivo con poder, log claro «sin objetivo»; descripción KEYWORD_META + textos de Colmillo del Verdugo y Furia Desatada actualizados
- RAREZA ↔ TEXTO (reporte: «Colmillos Curvos legendaria con keyword 2 pero el efecto dice aumenta/reduce 1»): materializeCard ahora SINCRONIZA el texto al cambiar el X por rareza — reemplazo determinista de números sueltos (regex con fronteras) para X y para 2X (fórmulas dobles: Sobrecarga +2X/pierde X, Emboscada +2X/+X, Combustión −2X); auditado el pool completo con scripts/audit-text-x.ts (0 falsos positivos: todas las ocurrencias derivan de X)
- APK / PROGRESO (reporte: «no deja instalar la nueva sobre la vieja — el jugador perdería todo»): la firma estable (keystore commiteado, tanda 40) + versionCode monótono garantizan que las nuevas APK se instalen ENCIMA; la vieja instalación previa a tanda 40 tenía firma efímera → esa salto puntual exige desinstalar UNA vez; para blindar el futuro: (1) Auto Backup nativo activado (backup_rules.xml + data_extraction_rules.xml en el manifest — el localStorage del WebView viaja al respaldo en nube del jugador, Android 11 y 12+), (2) NUEVA sección PROGRESO en Ajustes: «Exportar progreso» (todas las claves de localStorage en un código JSON → portapapeles + visible para copiar) e «Importar progreso» (pegar código → restaurar → recarga) — reinstalar o mudar de móvil ya no puede costar la partida; versionName 2.5 → 2.6
- Suites actualizadas/ampliadas: kw-v2 (+4: caída a 0, retarget de Crueldad, Último Aliento vía Legado), kw-v3 (+1: Ventisca deja el débil a 0 y CAE), tanda29 (+7: texto por rareza en Colmillos/Salamandra/Hacha con X y 2X, común intacta)
- Verificación: tsc 0 · lint 0 · 12 suites (campana 139 · clases-v3 66 · collection-historia 69 · fx 51 · kw-v2 39 · kw-v3 31 · kw-v4 71 · local-pvp 32 · pvp-engine 62 · turn-flow 27 · tanda28 37 · tanda29 84) = 708 asserts · 0 fallos · build estático RC=0 · E2E móvil 390×844: 3 cambios de turno sin jank (0 huecos rAF), modal de fin con botones navegando a menú, preview sin «Jugar en», export de progreso visible (scripts/e2e-fix-{modal-fin,progreso,preview}.png)
- Commit + push a main (CI genera APK 2.6)

Stage Summary:
- Los 9 reportes cerrados: modal imposible de atrapar + recompensas siempre visibles, cero FX invisibles (y el cambio de turno medido sin jank), preview de solo lectura, Crueldad con función real, Último Aliento jugable (regla del campo), textos fieles a la rareza, APK actualizable + doble red de seguridad para el progreso (nube + código manual)
- Balance intacto salvo lo pedido: ninguna carta cambió números; la regla «a 0 cae» es sistémica y SIMÉTRICA (mismo motor para bot y jugador — bot=player intacto)
- Pendiente vigente: Rush de Jefes (Task 39) y menú de mejoras a elección

---
Task ID: 46
Agent: Z.ai main agent
Task: «aun esta pegandose en movil… tiene q quedar todo fluido · hay keywords inservibles · dejar todo pulido antes de avanzar» — medición end-to-end + reconciliación estructural + canvas event-driven + auditoría de keywords con datos

Work Log:
- MEDICIÓN NUEVA (scripts/e2e-perf-full.sh, Galaxy S25 emulado, build de producción): por primera vez se miden TODAS las interacciones, no solo cambios de turno — tap de preview, drag real, pase, idle. BASELINE: preview 56-88ms input→paint (con tormenta de 16 pointerleave de Radix), PASAR 40-48ms, 1 tap de 136-144ms, ambient canvas a 30fps SIEMPRE.
- RECONCILIACIÓN ESTRUCTURAL (pvp.ts: reconcileView + pvpStore.applyView): buildClientView creaba objetos frescos por acción → la identidad de TODO el árbol cambiaba y el memo() de React no servía. Ahora las referencias de carriles/cartas/mano/strips que no cambiaron POR VALOR se reutilizan (huellas por carta) — el re-render por acción toca solo lo que cambió. Puro, sin tocar el engine ni la línea roja bot=player.
- SUSCRIPCIONES ESTRECHAS: PvpLane (snapshot por carril con useShallow), PvpHandBar, franja rival EXTRAÍDA a PvpRivalStrip (memo + snapshot) — antes toda la barra de mano (8 cartas) se re-pintaba en cada acción.
- CANVAS EVENT-DRIVEN (FxLayer): el rAF se DETIENE cuando no hay partículas y lo reencienden los fx/resize/visibilidad. Ambiente (decoración continua casi invisible) apagado en tier LOW y reducido a 0.45 en MED — el reporte del jugador de «efectos que ni se ven» aplicado a lo que quedaba. Resync de rects SOLO si el ambiente vive (cero querySelectorAll en low).
- PREVIEW SIN RADIX (CardPreviewModal): portal propio + tap-para-cerrar + Escape, misma estética y spring — Radix (portal + focus-trap + lock de scroll) costaba 56-88ms por tap.
- LOW-POWER: foil y grano SIN mix-blend-mode (hasta 24 capas blend GPU en mesa → 0), slot-pulse infinito estático, whileHover solo puntero fino (en táctil disparaba un spring por tap).
- RESULTADO POST-FIX: preview LIMPIO (0 eventos >40ms), idle LIMPIO (canvas durmiendo, 0 huecos rAF en 4s), PASAR ~40ms (commit real del cambio de turno), drag fluido (0 huecos). Los picos restantes son transiciones de pantalla one-shot (menú/JUGAR).
- AUDITORÍA KEYWORDS (keyword-stats.ts + sim-keywords.ts, 420 partidas IA-vs-IA con mazos oficiales + jefes, planner idéntico ambos lados): tabla triggers/noops/poder por keyword. INSERVIBLES confirmadas con datos: purga 97% noop · duelista 66% · ruptura_glacial 79% · purificacion 68% · custodia 50% · crueldad 44% · contagio impacto 0.3/juego.
- REDISEÑO MÍNIMO (mismo nombre/trigger, sin tocar las sanas): PURGA destruye débil ≤X o si no hay, hiere X al más fuerte (perfora) · DUELISTA +X garantizado al jugar + crecimiento solo-en-carril · RUPTURA sin grietas golpea al más fuerte (perfora) · CUSTODIA sube hasta X el escudo MÁS DAÑADO (los demás primero, sola solo si está sola) · PURIFICACIÓN sin nada que limpiar da escudo 2 al más débil · CONTAGIO −X a TODOS los infectados del carril (la plaga se extiende) · CRUELDAD sin presa se enfurece +X.
- RESULTADO POST-REDESIGN: purga 22%/7.0 (+50 bajas), duelista 12%/3.1, ruptura 18%/1.2, purificacion 0%/1.9, custodia 34%/0.29, contagio 0.41 multi, crueldad 38% (resto = escudos bloqueando: contrajuego). Balance re-verificado con sim-clases-v3 80/emparejamiento: 47.3/48.7/47.3 ✅ banda 45-55.
- Textos de cartas + KEYWORD_META sincronizados; escalado por rareza verificado (purga escala sus DOS X, duelista sus DOS +X); spec nueva download/keywords-con-efectos-v5.txt.
- Suites actualizadas: kw-v3 (+1 contagio multi, 31), kw-v4 (custodia por escudo-dañado + ruptura fallback, 71).
- Verificación: tsc 0 · lint 0 · 12 suites = 708 asserts 0 fallos · build estático RC=0 · E2E funcional 390×844 (preview abre/cierra, drag juega, 3 ciclos de turno, modal de fin con botín visible, Menú navega) — scripts/e2e-t46-{preview,final}.png
- Commit + push a main (CI genera APK)

Stage Summary:
- La fluidez dejó de ser una promesa y pasó a ser MEDIDA: cada interacción con datos antes/después; el canvas ya no corre cuando no hay nada que pintar y el tablero solo re-renderiza lo que cambia
- Ninguna keyword muerta queda: las 7 inservibles rediseñadas con datos de 420 partidas y balance de clases intacto
- Bot=player intacto: reconcileView y las suscripciones son client-side y simétricas; los rediseños de keywords viven en el engine compartido por ambos lados
- Pendiente vigente: Rush de Jefes (Task 39) y menú de mejoras a elección

---
Task ID: 47
Agent: Z (principal)
Task: «arreglaste las keyword? y actualizaste su interpretacion? es q veo q duelista sigue haciendo lo mismo» — diagnóstico y cierre del hueco de visibilidad del rediseño Task 46

Work Log:
- DIAGNÓSTICO: el rediseño Task 46 SÍ estaba en el engine (todas las ramas nuevas verificadas: purga fallback, ruptura fallback, crueldad enfurece con cuerpos a 0, purificación escudo de consuelo, custodia escudo más dañado, contagio multi, duelista +X al jugar). El problema era de PERCEPCIÓN: (1) el +X de «Al Jugar» de Duelista viaja dentro de finalPower SIN mutación → sin float, sin log, sin fx, sin powerLog → el jugador no distinguía nada nuevo; (2) 5 descripciones de KEYWORD_META (tooltips = «la interpretación») seguían con el texto VIEJO: duelista, purga, custodia, contagio, ruptura_glacial.
- FIX 1 (types.ts): las 5 META descriptions ahora describen el comportamiento nuevo (duelista «Al Jugar: gana +X garantizado…», purga «…o hiere en X a la más fuerte», custodia «escudo MÁS DAÑADO», contagio «TODAS las infectadas», ruptura «si ninguna la tiene, golpea al más fuerte»).
- FIX 2 (engine.ts playCard): mutación COSMÉTICA + powerLog para el +X de Duelista al entrar (source «Duelista», kind buff). NUNCA re-aplica poder (nace DESPUÉS del bucle de mutaciones; writeBack usa solo res.board; IA ignora buffs propios en su scoring). Con esto: float verde, sonido de buff, log «Buff +1 en ARMAS», y eventsFromPlayResult agrupa la mutación en el evento sword_glint.
- FIX 3 (PvpGame.tsx PvpFloat): el ancla se resolvía en el initializer de useState — ANTES del commit de React → una carta RECÍEN jugada no estaba en el DOM → su float se descartaba en silencio (pos=null → return null). Ahora useLayoutEffect resuelve tras el commit + reintento rAF (8 frames, ventana ≪ 1600ms de vida del float). Afecta a TODO float sobre carta recién entrada, no solo Duelista.
- SUITE NUEVA scripts/test-keywords-t47.ts (39 asserts): las 7 keywords rediseñadas rama por rama + Duelista visible (mutación presente, powerLog, NO doble-cuenta, legendaria +2 con texto sincronizado) + guardas de interpretación (las 7 META describen el rediseño + 6 textos de carta).
- E2E scripts/e2e-t47.sh (Galaxy S25 emulado, build producción): colección sembrada 12× duelista_errante → preview muestra chip con interpretación NUEVA y texto nuevo → PASAR ×2 → drag a carril válido (elige carril saltando bonos «SOLO COSTE N≠3») → FLOAT «+1» VISIBLE sobre la carta recién jugada → mini 14 poder (11 base + 2 sinergia + 1 Duelista) → Registro del preview lista «Duelista +1  11→14». Hallazgos del camino: los floats solo anclan a [data-card-uid], el texto de las minis del tablero NO incluye el nombre (solo coste/poder/badge), close --all del navegador borra localStorage y el persist del memory-state pisa semillas si no se reabre la página.
- Verificación: tsc 0 · lint 0 · 13 suites = 717 asserts 0 fallos · build estático RC=0 · E2E 7/7 OK (scripts/e2e-t47-{preview,float,registro}.png)

Stage Summary:
- «Duelista sigue haciendo lo mismo» era real: el rediseño funcionaba pero era INVISIBLE. Ahora el +X al jugar se ve (float + sonido + log + Registro), la interpretación de los 7 tooltips coincide con el comportamiento y una carta legendaria Duelista dice +2 en todos los sitios
- PvpFloat ya no descarta floats de cartas recién jugadas — bug de pipeline preexistente que afectaba a cualquier buff de entrada
- 717 asserts verdes; línea roja bot=player intacta (la mutación cosmética es client-neutral: el server reconstruye la misma jugada determinista)
- Pendiente vigente: Rush de Jefes (Task 39), menú de mejoras a elección, APK overwrite (investigación pendiente del lote de pulido)

---
Task ID: 48
Agent: Z (principal)
Task: «hay cartas q practicamente tienen mismo efecto y poder en un juego donde cada clase aun tiene 28 cartas no se puede permitir eso» — auditoría y eliminación de cartas gemelas por clase

Work Log:
- AUDITORÍA SISTEMÁTICA (scripts/audit-dupes.ts, queda como herramienta): Regla A = mismo keyword+X+trigger dentro de la clase (texto idéntico, solo cambia el cuerpo) · Regla B = mismo keyword+trigger+coste (misma ranura de curva). RESULTADO INICIAL: 13 pares A + 3 pares B — el jugador tenía razón y con datos.
- GEMELAS ELIMINADAS (17 cartas retocadas, cada familia ahora es una escalera X distinta + coste distinto):
  · GUERRERO: Fiera Ensangrentada fervor×1→×2 (2/5) · Emblema de Sangre ímpetu×1→×2 (1/2) · Centinela Anclado amparo×2→×1 (2/9) · Estandarte de la Cohorte insignia×4→LEGADO×4 al morir (3/9) · Torre de Asedio Viviente fervor×2→×3 (4/10) · Pavés de la Muralla amparo×1→CORAZA×4 (3/9) · Juramento de Acero fortaleza×1→LEGADO×2 Último Aliento (1/3)
  · MAGO: Aberración Arcana sobrecarga×2→DRENAR×1 (2/8, ya no gemela de Chispazo) · Lengua de Fuego llamarada×1→×2 (2/6) · Estallido Ígneo remate×2→SOBRECARGA×2 (4/14, ya no choca con Ajuste de Cuentas) · Carapacho Glacial coraza×3→×2 (3/11) · Anciano del Norte legado×3→×5 (5/16) · Cetro de Escarcha escarcha×2→×1 (2/8) · Estatua Viviente fervor×2→×3 (3/6) · Aliento Gélido ventisca×1→DETONACIÓN×1 al morir (2/8, ya no gemela de Viento Cortante)
  · ASESINO: Cuchilla del Silencio purga×2→×3 (3/7) · Sombra Veloz emboscada×2→×3 (3/9)
- RESULTADO POST: Regla A = 0 · Regla B = 0 · 47 pares de tiering legítimo (X y coste distintos siempre). Cada keyword famélica quedó como escalera: impetu ×1/×2, coraza ×2/×3/×4, escarcha ×1/×2/×3, fervor ×1/×2/×3, legado ×2/×3/×4/×5, llamarada ×1/×2, etc.
- INVARIANTES RESPETADAS: PTP 84/84 en ±0.5 (SCOPE_MODS CARRIL_LOCAL 1.2 aplicado en la calibración) · curva 1×2/2×3/3×5/4×1/5×1 por mazo II intacta · 12 keywords distintas por mazo II (v4 lo exige) · combos (coste|poder|keyword|X|trigger) únicos en las 84 (tanda29) · 28 cartas por clase.
- SUITE NUEVA scripts/test-no-gemelas.ts (37 asserts): Regla A/B = 0 por clase + escaleras presentes + 28 ids únicos + PTP 84/84 + coherencia texto↔X de las 17 retocadas + keywords/triggers válidos. Permanente para que las gemelas no vuelvan.
- TESTS ACTUALIZADOS: v3 (Aberración ahora Drenar con escudo absorbiendo + Sobrecarga vía Chispazo + purga X=3) · t47 (cuchilla 17→14, debuffTaken 3, texto «hiere en 3») · v4 (comentario Sombra p9+3+2+2=16).
- BALANCE CON DATOS: baseline original a N=150 = 46.0/50.4/46.8; tras el rediseño inicial 41.5/48.9/43.2 (el mago se encendió: Ventisca ×2 recurrente era el culpable). Ajuste: Viento Cortante revierto a ×1 (12), Estallido 15→14, Carapacho 12→11 y Aliento pasa a Detonación. FINAL a N=250 (500 juegos/emparejamiento): 50.0/45.6/52.0 ✅ banda 45-55. El 43.5 intermedio era ruido (SE ±4%).
- Verificación: tsc 0 · lint 0 · 14 suites 0 fallos (719+37 = ~756 asserts) · build estático RC=0 · E2E móvil 390×844 (partida inicia, PASAR avanza Turno 1→4, preview abre con chip Remate[2]+texto, 5 ciclos sin colgar) — scripts/e2e-t48-{preview,final}.png
- Commit + push a main (CI genera APK)

Stage Summary:
- Las 28 cartas de cada clase ya no tienen ni una gemela: 16 pares muertos eliminados y cada familia es una escalera legible (mismo nombre de keyword, X y coste distintos = roles distintos)
- Balance de clases verificado con sims a N=250 dentro de banda; bot=player intacto (solo cambió el catálogo, no el engine)
- scripts/test-no-gemelas.ts es ahora guardián permanente: Regla A/B en 0, PTP 84/84 y textos fieles a la rareza
- Pendiente vigente: Rush de Jefes (Task 39), menú de mejoras a elección, APK overwrite (investigación pendiente del lote de pulido)

---
Task ID: 49
Agent: Z (principal)
Task: cerrar la investigación pendiente del lote de pulido — APK que no se instala encima de la anterior (overwrite), con diagnóstico visible en el dispositivo

Work Log:
- AUDITORÍA DE LA CADENA DE ACTUALIZACIÓN (los 4 eslabones, verificados uno a uno): (1) applicationId ESTABLE com.guerrero.tactico en build.gradle; (2) keystore COMMITTEADO android/app/pacto-guerra.keystore (SHA-256 CD:A1:85:F6…, válido PKCS12, existe desde tanda 40 — commit 1172c39) y usado por release Y debug; (3) CI build-apk.yml compila assembleRelease con -PversionCode=github.run_number → SIEMPRE creciente; (4) backup rules full-backup-content + data_extraction_rules cubren app_webview (localStorage) + Exportar/Importar en Ajustes como red de seguridad. Cadena CORRECTA desde tanda 40.
- CAUSA RAÍZ IDENTIFICADA: cualquier APK instalada ANTES de tanda 40 (pre-keystore-estable) tiene firma efímera del runner → Android rechaza la nueva con «App no instalada» y exige desinstalar UNA vez (la firma NO se puede cruzar, es seguridad del SO, no un bug). Segundo escenario posible: instalar un artefacto con run_number MAYOR y luego intentar uno menor → INSTALL_FAILED_VERSION_DOWNGRADE. Tercero: Play Protect bloqueando sideload → «Instalar de todos modos».
- FIX DE VISIBILIDAD (el jugador no podía distinguir estos casos desde el móvil): fila «VERSIÓN INSTALADA» en Ajustes → sección Progreso, lee la versión REAL vía @capacitor/app App.getInfo() (v{versionName} · build {versionCode}); en web/PWA hace fallback a «navegador» (getInfo lanza unimplemented). Debajo, guía de 1 línea: exportar → desinstalar → instalar → importar (solo hace falta UNA vez). El build N queda visible para comparar con el artefacto nuevo y detectar downgrades sin adb.
- Sincronizado el pie del menú: v2.5 → v2.6 (coincide con versionName de build.gradle).
- NOTA: appId de capacitor.config (com.pacto.guerra) ≠ applicationId nativo (com.guerrero.tactico) — no se toca: el nativo manda en la instalación y cambiarlo AHORA instalaría como app nueva perdiendo progreso. El plugin lee el packageName real.
- scripts/e2e-t49.sh NUEVO (Galaxy S25): menú → engranaje Opciones → modal Ajustes → Exportar/Importar intactos → fila «Versión instalada» = «navegador» (fallback web correcto; en APK será v2.6 · build N).
- Verificación: tsc 0 · lint 0 · 14 suites = 786 asserts 0 fallos · build estático RC=0 · E2E 3/3 OK (scripts/e2e-t49-version.png)
- Commit + push a main (CI genera APK v2.6 · build run_number)

Stage Summary:
- La cadena de actualización está verificada extremo a extremo: desde tanda 40 todas las APK comparten firma y versionCode monótono → se instalan encima conservando progreso
- El caso «no se instala» ya es diagnosticable desde el propio juego: Ajustes muestra la versión/build instalada y el procedimiento de rescate (exportar → desinstalar → importar), sin adb ni suposiciones
- Pendiente vigente: Rush de Jefes, menú de mejoras a elección

---
Task ID: 50
Agent: Z (principal)
Task: «eso está feo para el usuario, ¿no hay forma de hacerlo sin que él tenga que intervenir?» — eliminar TODA la fricción posible de la migración del APK (lo único innegociable del SO: una desinstalación única)

Work Log:
- RESPUESTA TÉCNICA HONESTA: la desinstalación de los APK previos a tanda 40 NO es evitable (Android bloquea cruces de firma a nivel de PackageInstaller — ni Google puede instalar una firma distinta sobre otra). Pero era el ÚNICO paso que exigía intervención; todo lo demás se automatiza y eso es lo que se hizo.
- FIX CRÍTICO DE BACKUP NATIVO: backup_rules.xml y data_extraction_rules.xml incluían domain="file" — files/ — pero el localStorage del WebView vive en app_webview/, un HERMANO de files/. El comentario prometía cobertura que NO existía: el progreso nunca viajó a Google Auto Backup. Ahora domain="root" path="app_webview" (+ excludes de cache/code_cache) hace REAL el respaldo en la nube: con Auto-restaurar activo, reinstalar recupera el progreso SOLO, sin importar nada.
- RESTAURACIÓN DE UN TOQUE (src/lib/progress-backup.ts NUEVO): PROGRESS_KEYS + collectProgress + parseProgressCode (valida SIN escribir, 4 mensajes de error distintos según la causa) + applyProgressCode + isFreshInstall (perfil+campana+coleccion ausentes) + readClipboardText (@capacitor/clipboard nativo → fallback navigator.clipboard). Storage inyectable para tests sin DOM.
- BANNER DE RESCATE en MainMenu: instalación fresca → «¿Vienes de otra instalación?» con botón PEGAR Y RESTAURAR que lee el portapapeles y restaura TODO (progreso + mazos) con UN toque → reload. Con progreso NO aparece (nunca molesta), se cierra con X (sessionStorage, una vez por sesión), errores amables sin crash. La migración queda en: copiar código (app vieja) → reinstalar → 1 toque.
- SettingsModal refactorizado a la lib compartida (doImport usa applyProgressCode; guía actualizada: «toca Pegar y restaurar — aparece solo en el menú»).
- @capacitor/clipboard@7.0.4 instalado (auto-registro nativo vía cap sync en CI).
- LECCIÓN FRAMER: transition={{delay:0.9}} también retrasa la SALIDA de AnimatePresence → el banner seguía en DOM 0.9s tras cerrarlo (E2E lo cazó). Delay movido al animate → exit inmediato.
- versionName 2.6 → 2.7 (build.gradle) + pie de menú sincronizado.
- SUITE NUEVA scripts/test-progress-backup.ts (31 asserts): fresh-install ×5, collect ×9, parse sin escribir ×8 (incluye spy de setItem), apply/round-trip ×6, export vacío válido.
- scripts/e2e-t50.sh NUEVO (Galaxy S25): fresca → banner+botón · click sin código → mensaje amable · X → cierra y no vuelve en la sesión · con progreso → oculto. Hallazgo: el accessible name hereda el uppercase CSS → grep case-insensitive en snapshots.
- Verificación: tsc 0 · lint 0 · 15 suites = 815 asserts 0 fallos · build estático RC=0 · E2E 7/7 OK (scripts/e2e-t50-banner.png, e2e-t50-final.png)
- Commit + push a main (CI genera APK v2.7 · build run_number)

Stage Summary:
- La migración pasó de «copiar, desinstalar, instalar y pegar un código a mano» a «copiar → reinstalar → UN toque», y en dispositivos con Auto-restaurar ni siquiera el toque: Google devuelve el localStorage solo
- El backup nativo ahora cubre lo que su comentario llevaba meses prometiendo (app_webview en domain root) — bug real cazado en la auditoría
- La desinstalación única sigue siendo inevitable para los APK pre-tanda 40 (firma = seguridad del SO), pero después NUNCA más: firma estable + versionCode monótono verificados en Task 49
- Pendiente vigente: Rush de Jefes, menú de mejoras a elección

---
Task ID: 51
Agent: Z (principal)
Task: hotfix CI — lintVitalRelease FATAL en las backup rules de Task 50 («cache/code_cache is not in an included path»)

Work Log:
- CAUSA RAÍZ (confirmada por el log del CI del jugador): Task 50 añadió <exclude domain="root" path="cache|code_cache"/> — con includes EXPLÍCITOS, la regla FullBackupContent de Android Lint exige que todo exclude esté DENTRO de un include del mismo dominio; root/ entero no está incluido (solo root/app_webview) → 4 excludes huérfanos (backup_rules.xml:22, data_extraction_rules.xml:18,19,28,29) → lintVitalRelease FATAL → BUILD FAILED antes de empaquetar.
- FIX MÍNIMO: los excludes de root eran además INÚTILES (lo no incluido jamás entra al backup — cache/code_cache solo son relevantes si se incluye root/. entero). Eliminados los 4; queda <exclude domain="file" path="cache"/> (dentro de file/. → válido, y ya existía antes de Task 50 sin romper nada). La cobertura real de Task 50 (root/app_webview en las 3 secciones) queda INTACTA.
- GUARDIÁN PERMANENTE scripts/test-backup-rules.ts (10 asserts): parsea los XML reales y replica la regla exacta de Lint (exclude ⟹ include del mismo dominio con prefijo de frontera '/') + app_webview incluido en las 3 secciones + cero excludes de dominio root + dominios válidos. Si alguien reintroduce un exclude huérfano, falla AQUÍ antes de quemar un runner del CI.
- xmllint no existe en el entorno → validación de buen formato con ElementTree (2/2 OK); sin SDK local → el lint real corre en CI (run de este push = validación definitiva).
- Verificación: guardian 10/10 · XMLs bien formados · grep: solo quedan los 3 includes root/app_webview
- Commit + push a main (CI regenera APK v2.7)

Stage Summary:
- El CI vuelve a verde con la cobertura REAL del localStorage intacta: root/app_webview incluido en fullBackupContent, cloud-backup y device-transfer
- La regla de Lint que nos cazó vive ahora como suite permanente: excludes huérfanos imposibles en el repo

---
Task ID: 52
Agent: Z (principal)
Task: CI roto en «Setup Android SDK» — el runner descargó un archivo que NO era un ZIP ("Archive is not a ZIP archive" → unzip exit 1 antes de llegar al build)

Work Log:
- DIAGNÓSTICO: fallo de infraestructura transitorio en la descarga de commandlinetools-linux-9477386_latest.zip (archivo truncado o página de error servida con 200). Nada que ver con el código — el build ni arrancó.
- HARDENING DEL STEP (3 capas de defensa): (1) CADENA DE VERSIONES 15859902 → 13114758 → 9477386 — si la CDN sirve corrupto un build number exacto, cae al siguiente (15859902 confirmado como vigente en developer.android.com/studio, 13114758 conocido-bueno de 164MB); (2) firma ZIP (magic bytes PK) ANTES de confiar en el archivo; (3) unzip -tq valida la integridad COMPLETA; 2 reintentos por versión con backoff. Ninguna versión válida tras todo el recorrido → exit 1 con mensaje claro.
- REINTENTO DE GRACIA en sdkmanager (también es red): si la instalación de platform-tools/platforms;android-36/build-tools;36.0.0 falla, reintenta una vez a los 10s.
- VALIDACIÓN LOCAL: YAML parseado (12 pasos), bash -n del step OK, y la lógica de firma probada contra un HTML falso (rechazado) y un ZIP real (aceptado).
- Commit ae03572 push a main → el CI se relanza solo con el step blindado (validación definitiva en el runner).

Stage Summary:
- El pipeline del APK es autoreparable ante fallos transitorios de descarga: no vuelve a morir por un ZIP corrupto puntual
- Cadena de versiones = también immune a que Google retire un build number concreto del repo

---
Task ID: 53
Agent: Z (principal)
Task: PLANIFICACIÓN EXPANSIÓN V3.0 — «lo siguiente va a ser una expansión: corregir/mejorar lo pendiente + 3 clases nuevas (Pirata, Tinker, Botánico) + ampliar las cartas de las clases hechas; antes de codear cualquier cosa me preguntas»

Work Log:
- ESTADO PREVIO VERIFICADO: el fix del CI SDK ya estaba hecho y pusheado (Task 52, commit ae03572 — descarga blindada 3 capas). Sin bloqueos técnicos.
- ALCANCE NEGOCIADO CON EL JUGADOR (AskUserQuestion, 8 preguntas): mecánicas = propuesta de Z aprobable · 28 cartas estándar por clase nueva · +8 cartas por clase existente (pool 28→36, mazo jugable sigue 12) · mejoras = Rush de Jefes + V3.1 (B6/E13) · UI selector = compacta+detalle · mega-release V3.0 · arte IA por carta · orden Botánico→Pirata→Tinker.
- ARQUITECTURA MAPEADA: GameClass en 18 archivos · el board usa LaneId POR CLASE (9 hoy, cada clase juega en sus 3 carriles propios) · distribución por carril 8/8/12 con el carril del jefe en 12 (Protección/Hielo/Sigilo = CAMPAIGN_BOSS_THEMES) · campana = UNA escalera global de 15 con jefes en 5/10/15 · balance PTP=coste×4+1.5, Mod_Once 0.8 recurrentes, SCOPE_MODS hasta 1.5 (CARRIL_LOCAL_ADYACENTE existe y NADIE lo usa — oportunidad de diseño) · mazo jugable = 12 ids del pool (deck-storage).
- KITS DISEÑADOS (docs/plan-expansion-v3.md §2): 18 keywords nuevos (6 por clase) con ejes mecánicos INÉDITOS vs las 33 existentes — contador de turnos (estacion), ranking de poder entre propias (simbiosis), robo con botín por destrucción (saqueo), SWAP de poder (motin), buff aleatorio de mano (contrabando), AoE adyacente on_play/on_death (canonazo/andanada), doble escudo (micelio), devorar que alimenta (carnivora), espejo de Contagio (polen), muerte que buffa carril entero (floracion), escudo al carril completo (remache), reciclaje con escudo (chatarra), condición por Ítem (engranaje/sobrecalentar), francotirar al más fuerte recurrente (torreta), multi-objetivo doble (descarga).
- CLASES NUEVAS: Botánico 🌿 (RAÍZ/FLOR/ESPORAS, jefe Yggra) · Pirata 🏴‍☠️ (PUENTE/BODEGA/ARTILLERÍA, jefe Kaela) · Tinker 🔧 (TALLER/MAQUINARIA/CHISPA, jefe Dorvik). Ampliación existentes: 9 keywords nuevos más (1 por carril, patrón tanda 3) con ejes propuestos sujetos a auditoría Regla A/B.
- ESPEC DE RUSH DE JEFES escrita (§3.2): gauntlet 3 jefes del ciclo con XP×2 y botín escalonado (raro→épico→legendaria 50%), primera recompensa completa por ciclo/prestigio, mejor run por clase en statsStore.
- V3.1 B6/E13: la spec NO está en el repo (se perdió con el reset de contexto) — marcado como dato a re-pedir al jugador o re-derivar del audit de balance (§3.3, riesgo 6).
- DESPLIEGUE: mega-release con constant V3_CLASSES_UNLOCKED — tandas T-A…T-F se commitean en main (CI verde, suites crecen) SIN exponer las clases nuevas en UI; T-G enciende todo + versionName 3.0 (§5).
- DOC COMPLETO en docs/plan-expansion-v3.md (alcance numérico, kits, campana, UI, tandas, arte, riesgos). CERO código nuevo — el plan espera aprobación.

Stage Summary:
- La expansión V3.0 queda cuantificada: +3 clases, +108 cartas, +27 keywords, +108 arte, +3 jefes, Rush de Jefes, V3.1 — en 7 tandas verificadas (T-A a T-G)
- Lo que espera aprobación del jugador: los 3 kits de keywords (§2 del doc), los ejes de la ampliación (§2.4), la rotación de jefes por prestigio (§3.1) y la spec de Rush de Jefes (§3.2)
- Bloqueante de datos: re-pedir B6/E13 (solo afecta T-F)

---
Task ID: 53-b (plan fix) + 53-c (T-A)
Agent: Z.ai main agent
Task: Descartar B6/E13 del plan V3.0 y construir T-A (cimientos de las 3 clases nuevas)

Work Log:
- Jugador: «no sé qué es B6/E13, olvida eso» → fuera de alcance. Mejoras V3.0 = solo Rush de Jefes.
- Plan actualizado (estado APROBADO — en construcción; §3.3 DESCARTADO; T-F sin B6/E13; riesgo 6 eliminado) → commit d1eebf1.
- T-A commiteado y pusheado (be57bf9): 21 archivos, +1607 líneas.
- types.ts: GameClass ×6, LaneId ×9, CLASS_META +3 (Botánico green/Sprout, Pirata blue/Ship, Tinker yellow/Wrench), LANE_ADJACENT (cadenas 1-2-1 por clase), Keyword +18, KEYWORD_META +18 (labels/descripciones/triggers/scopes/subtypes), LANE_META +9.
- engine.ts: 10 casos on_play (Micelio doble escudo via init placement, Simbiosis con réplica de poder de entrada, Polen al MENOS debuffeado honesto, Carnívora devora+alimenta [+2/+1 anti-noop], Saqueo robo perforante+botín, Motín SWAP por bonusPower+mutación directa, Canonazo AoE adyacente, Remache, Sobrecalentar, Descarga); 3 start_turn (Estación con turnNumber param, Tripulación, Engranaje) + regla Viento de Popa; end_turn Torreta + regla Ecosistema; on_death Floración/Andanada/Chatarra; playCard: escudo propio coraza/remache/micelio, Contrabando (random hand buff), Taller de Campamento (+1 Ítems, patrón Duelista visible); scoreAIPlay estimaciones V3.0; emptyBoard() exportado; ALL_LANE_IDS ×18.
- balance.ts KEYWORD_BASE_VALUES +18 (motin=5.0 fijo hasValue=false, contrabando=0.35, canonazo=1.7 con scope 1.4...). fx.ts KEYWORD_FX +18 y LANE_AMBIENT +9 con recetas existentes (dedicadas en T-F).
- pvp.ts: fireStartTurn pasa state.turn (Estación).
- v3.ts NUEVO: V3_CLASSES_UNLOCKED=false, visibleClasses(), isNewClass() — un solo interruptor para el mega-release.
- UI plumbing: ClassSelect/CollectionScreen/ProfileScreen/PvpSetup/ClassRuleBadge consumen flag; paletas laneColors+LaneHex green/blue/yellow; campaign.ts: bots Nim/Roka/Fenn, jefes Yggra/Kaela/Dorvik, temas Esporas/Artillería/Maquinaria, CLASS_UNLOCK_STEP 3/8/13, CLASS_RULE_META +3, lore +3; cards.ts decks vacíos (T-B/C/D) + BOSS_DECKS por carril.
- Tests: scripts/test-v3-fundamentos.ts NUEVO (58 aserciones, 18 keywords + 3 reglas + adyacencia + flag + simetría bot). Fixes en tests legacy: emptyBoard() centralizada en engine (test-clases-v3, test-keywords-v2, test-keywords-t47, test-tanda29 ×3 literales).
- Verificación completa: tsc 0 errores · eslint limpio · next build OK · 16/16 suites verdes (~932 aserciones, 0 regresiones).

Stage Summary:
- T-A COMPLETE: el motor entiende las 3 clases nuevas (6 GameClass / 18 LaneId / 51 keywords / 6 reglas de clase) pero la UI sigue mostrando solo las 3 base.
- Decisiones de diseño nuevas documentadas en código (aprobables por el jugador antes de T-G): reglas sistémicas de las 3 clases nuevas (Ecosistema/Viento de Popa/Taller de Campamento) — el plan §2 no las definía y los Records las exigían; Carnívora con fallback +1 (anti-noop Task 46); Saqueo perforante con botín +2 al hundir; Motín sin [X], pierde poder si el enemigo es más débil.
- CI: push a main dispara build APK (sin cambios de config; flag apagada = release invisible).
- Próximo: T-B Botánico (28 cartas: patrón 8/8/12, curva 1×2/2×3/3×5/4×1/5×1, PTP 84, decks I/II, jefe Yggra, sims N=250, 28 webp).

---
Task ID: 53-d (T-B Botánico)
Agent: Z.ai main agent
Task: T-B — 28 cartas Botánico + decks I/II + jefe Yggra + 28 artes webp

Work Log:
- Commit 7ff774e. Estudio de guardianes reales: pools 28 (8/8/12), PTP ±0.5 por carta, decks 12 con curva exacta 1×2/2×3/3×5/4×1/5×1 + 12 keywords distintas + patrón 2A/1I/1A por carril, id=slug(nombre), Reglas A/B por pool y unicidad GLOBAL de combo (coste|poder|keyword|X|trigger) en tanda29.
- 28 cartas diseñadas a mano con escaleras por familia; 7 colisiones de combo global detectadas por tanda29 → 2ª iteración con mini-solver de restricciones (scripts/solver-botanico.ts: curva por mazo + Reglas A/B + unicidad global + PTP) que confirmó el atasco y guió el ajuste final (Brote→fervor×3 c2, Círculo→fortaleza×2 c1, Lecho→c3, Coro→fortaleza×4, Amanita→c3, Jardín→c2).
- Suites parametrizadas: test-no-gemelas y test-keywords-v4 ahora validan las clases con pool existente y catálogo creciente (112 ids únicos); NUEVO scripts/test-v3-clase.ts <clase> (33 aserciones por clase, reutilizable en T-C/T-D).
- sim-clases-v3.ts ampliado a clases con mazo completo: botanico 43.7–48.9% winrate (spread preexistente del sim: guerrero domina 57% vs asesino; ~55% empates por diseño del entorno). Documentado; ajuste fino de V3_* si T-G lo pide.
- Arte: scripts/gen-card-art-v9.mjs — 28 composiciones exclusivas (plano/ángulo/momento §8); 2 tandas de generación por timeout (16+12), downscale 432×576 + webp → catálogo visual 112 webp (+1.4MB). Verificados visualmente 3 (full-bleed, sin marcos).
- Verificación: tsc ✓, build ✓, suites verdes (v3-clase 33, tanda29 84, no-gemelas 42, v4 71, resto intactas).

Stage Summary:
- T-B COMPLETE: Botánico jugable a nivel de datos/engine (decks I/II, jefe Yggra con mazo de 12 ESPORAS, 28 artes). Sigue OCULTO (flag V3 off).
- Aprendizaje clave para T-C/T-D: diseñar combos contra la UNICIDAD GLOBAL desde el inicio (el solver de restricciones es la herramienta; reutilizarlo con las familias pirata/tinker).
- Próximo: T-C Pirata (28 cartas saqueo/tripulacion/motin/contrabando/canonazo/andanada, jefe Kaela ARTILLERÍA, 28 webp).

---
Task ID: 53-e (T-C Pirata)
Agent: Z.ai main agent
Task: T-C — 28 cartas Pirata + decks I/II + jefe Kaela + 28 artes webp

Work Log:
- Commit a8bcea9. Diseño con slots verificados por script (PTP exacto + unicidad global + Reglas A/B + curvas) ANTES de escribir cards.ts — sin whack-a-mole.
- DECISIÓN DE DISEÑO: Motín (hasValue=false) no puede escalar → aparece UNA sola vez en el pool (mazo I); el mazo II repite CORAZA con otra X (11 familias). Excepción documentada en test-v3-clase (pirata mazo II espera 11 distintas).
- Corrección de cálculo: legado es on_death → factor 1.0 (no 0.8) — Lobo del Mar recalibrado a X1 c2 p8. Las suites PTP lo confirmaron.
- 5 colisiones de combos resueltas variando X/coste dentro del diseño (cofre X4 c1, grito X2 c3, bandera X4 c3, cuchillo X2 c3, canon c1, salva c2, lobo X1).
- Arte: gen-card-art-v10.mjs (28 composiciones §8), 3 tandas por timeouts (17+10), downscale + webp → catálogo visual 140 (+1.3MB). Boca de Kaela verificada visualmente.
- Verificación: tsc ✓ lint ✓ build ✓ · v3-clase pirata 33✓ botanico 33✓ · no-gemelas 47 · tanda29 84 · resto de suites intactas.

Stage Summary:
- T-C COMPLETE: Pirata jugable a nivel de datos (decks Jolly Roger/Baluarte, jefe Kaela con 12 ARTILLERÍA). OCULTO (flag V3 off).
- Pendiente T-D: Tinker (remache/chatarra/engranaje/sobrecalentar/torreta/descarga, jefe Dorvik MAQUINARIA). OJO: chatarra es on_death (factor 1.0 en PTP).
- Próximo: T-D Tinker + 28 webp, luego T-E (ampliación +8×3 + 9 keywords), T-F (Rush de Jefes + UI 6 clases), T-G (release).

---
Task ID: 53-f (T-D cierre + bandera) + 53-g (selector UI)
Agent: Z.ai main agent
Task: Cerrar T-D Tinker (artes faltantes), ENCENDER V3_CLASSES_UNLOCKED (petición del jugador) y rediseñar el selector de clases (compacta+detalle)

Work Log:
- Rescatado el trabajo T-D huérfano del corte de sesión: cards.ts ya tenía las 28 Tinker (33/33 asserts en test-v3-clase tinker), faltaban 5 artes (temblor, heredero, motor, guillotina, marcha) → generadas con gen-card-art-v11 ONLY=…, pipeline fix-card-art-resolution.py + png-to-webp.py → catálogo 168 webp, 0 PNG sueltos. Verificación visual: motor_de_campana / fauces_de_dorvik / guillotina_portatil full-bleed sin marco, regla Ítem respetada (objeto único).
- BANDERA ENCENDIDA: el jugador pidió ver las 6 clases («solo me salen las clases antiguas… arreglalo para q me salgan todas») → V3_CLASSES_UNLOCKED=true en lib/game/v3.ts (documentado: lo restante T-F/T-G llega sin re-apagar). test-v3-fundamentos actualizado (6 visibles). Contenido en commit ab45661 (auto-commit del gateway).
- SELECTOR COMPACTA+DETALLE (spec aprobada del plan §4, «esa seleccion de clase hay q mejorarla»): ClassSelect reescrito — 6 CHIPS en cuadrícula 2×3 (todo visible sin scroll; seleccionado = borde 2 + glow de color; bloqueados = candado + opacidad; V3 = pill «V3» esquina), UN panel de detalle con AnimatePresence (icono animado, nombre Cinzel, lema, chips de los 3 CARRILES propios vía CLASS_META/LANE_META, ClassRuleBadge, MAZO/JUGAR o candado+hint). Selección recuerda la última clase (localStorage pacto:cls-select:last). Iconos ahora son componentes LucideIcon.
- BUG arreglado de paso: classUnlockHint devolvía null en pasos sin jefe (3/8/13) → candado sin texto. Fallback «Alcanza el Escalón N».
- E2E con agent-browser (390×844): 6 chips visibles, tap cambia panel (Guerrero ámbar → Botánico verde con RAÍZ/FLOR/ESPORAS), hints de bloqueo correctos, 0 errores JS.
- Verificación: tsc ✓ · eslint ✓ · next build ✓ · test-campana 139✓ · v3-clase botanico/pirata/tinker 33✓×3 · no-gemelas 52 · keywords-v4 71 · fundamentos 58 · tanda29 84 · pvp-engine 62.
- Commit 876c1b6 push a main.

Stage Summary:
- T-D COMPLETE (Tinker jugable, 168 artes) y las 6 clases VISIBLES en UI con selector compacta+detalle.
- Pendiente del plan V3.0: T-E (ampliación +8 cartas ×3 clases base + 9 keywords), T-F restante (Rush de Jefes), T-G (versionName 3.0 + banner + APK).

---
Task ID: 53-h (T-G release: v3.0 + APK)
Agent: Z.ai main agent
Task: Cerrar el release V3.0 SIN Rush de Jefes ni T-E (pospuestos a petición del jugador: «termina, deja el rush de jefes para después» / «comitea y después continúa para yo ir probando la APK»)

Work Log:
- Verificación previa al push: npx tsc --noEmit ✓ (0 errores) · 20 suites en verde: campana 139✓ · clases-v3 66✓ · collection-historia 69✓ · fx 51✓ · keywords-t47 39✓ · v2 39✓ · v3 33✓ · v4 71✓ · local-pvp 32✓ · no-gemelas 52✓ · pvp-engine 62✓ · pvp-turn-flow 27✓ · tanda28 37✓ · tanda29 84✓ · tanda30 82✓ · v3-fundamentos 59✓ · v3-clase botanico/pirata/tinker 34✓×3.
- Rescate de trabajo tanda30 huérfano del corte de sesión: 2 commits UUID del gateway (bd2230b código: cards.ts +384, engine.ts +208, types.ts +71, fx/balance + test-tanda30/slots-tanda30/dump-keywords; 605304e artes PNG de las 11 cartas de la tanda + gen-card-art-v12) — verificados verdes y incluidos en el push.
- RELEASE V3.0: android/app/build.gradle versionName «2.7»→«3.0»; footer del menú actualizado a «v3.0 · 6 clases · 168 cartas · 61 keywords» (cifras reales contadas por script sobre classCardsOf×6 clases: 168 únicas; KEYWORD_META: 61). El banner de release queda materializado en el footer del menú; Rush de Jefes NO incluido (queda como hito V3.1).
- Commit 801812c + push ca53147..801812c → CI run 39699550618 (Build APK) disparado y monitoreado hasta artefacto guerrero-tactico-apk.

Stage Summary:
- V3.0 RELEASED: 6 clases jugables y visibles (incl. pirata/tinker/botánico), 168 cartas, 61 keywords, selector compacta+detalle, APK generada por CI para prueba del jugador.
- Pospuesto explícitamente por el jugador: T-F Rush de Jefes (3 jefes en cadena, XP×2, best run) y T-E (+8 cartas por clase base + 9 keywords) → apuntados como V3.1.

---
Task ID: 53-i (V3.1: T-E completo + Rush de Jefes)
Agent: Z.ai main agent
Task: Terminar lo pendiente del plan V3.0 con petición explícita del jugador («termina lo pendiente, arte y demás»): T-E (cableado de las 24 cartas + 24 artes) y T-F restante (Rush de Jefes §3.2)

Work Log:
- RECON: docs/plan-expansion-v3.md recuperado — las 24 cartas tanda30 (+8×3 clases base, keywords muralla/estandarte/orden_batalla/atropello/eco/ceniza/octava) ya estaban en cards.ts/engine/types (commits gateway bd2230b+605304e) pero SIN cablear a los pools (classCardsOf seguía en 28) y con 0/24 webp (11 PNG intermedios).
- T-E CABLEADO: EXTRA_CLASS_CARDS en cards.ts → classCardsOf base 28→36 (mazos I/II y BOSS_DECKS intactos: slice(0,12) ya protegía). Verificado por script: pools 36/36/36+28/28/28, ids únicos, starter 12, boss 12 sin cartas nuevas.
- GEMELAS REGLA A/B (test-no-gemelas las cazó al crecer el pool): 5 rellenos retocados con resolvedor propio (scripts/fix-tanda30-gemelas.ts) manteniendo sabor+PTP±0.5 — rompefilas_orco orden_batalla X2 p7 · maza_berserker impetu X3 c3 p9 · aprendiz_inquieto coraza X1 c1 p5 · mantis_verde contagio X3 c1 p1 · navaja_de_taberna refriega X1 c1 p5. Textos actualizados citando su X (guardián de coherencia ampliado con los 5).
- GUARDIANES PARAMÉTRICOS: no-gemelas (36 base/28 V3) y tanda29 (36/36/36 + 28 V3). slots-tanda30.ts actualizado a valores finales y auto-excluyente (seguible post-integración).
- ARTE: gen-card-art-v12 completó las 13 faltantes (0 fallos) → fix-card-art-resolution (24→432×576) → png-to-webp → 192 webp total, 0 PNG sueltos, 9.0MB. Verificación visual de 4 (navaja/mantis/colosal/rompefilas): full-bleed, Ítem sin gente, acción legible.
- RUSH DE JEFES (§3.2 + principios Task 39: el bot juega como player, botín con decisión): src/lib/game/rush.ts NUEVO (rushBossesForCycle: ciclo 0 clásicos, 1 V3, 2+ intercalado determinista · rushXpForBoss = ×2 bono escalón 10/20/30 · rushPickTierForBoss: rara→épica→legendaria 50%/100% 1ª vez del ciclo) · rushBiomeForIndex en campaign.ts (Hierro→Escarcha→Sombras).
- STORES: statsStore +rushBest/rushRuns/rushCyclesDone + registerRush (persistidos); pvpStore +rushActive/rushIndex/rushCycle/rushFirstCycle/rushBeaten/rushBossClass/bossPickMax + startRush/advanceRush/startRushFight (motor historia, enableBossMode, BOSS_DECKS al tier del ciclo) + rama rush en checkHistoriaEnd (botín 2+pick 1 de 3, XP ×2, registerMatch boss:true, NO avanza campaña, derrota paga 1) + requestRematch rush-aware (Siguiente Jefe / Nueva Run / Reintentar Run) + resets en openSetup/exitToMenu.
- UI: BattleIntroSplash con prop rush (chip «RUSH DE JEFES · JEFE n/3», lore y bioma del jefe) · HistoriaEndOverlay rush-aware (títulos ¡Jefe n/3!/¡Run completada!/Run terminada, chip RUSH n/3 · ciclo ★, XP ×2, pick «Elige 1 de 3 {tier}», botón Siguiente Jefe con nombre del próximo, Mejor run n/3) · MainMenu: pill «Rush · mejor n/3» (Skull, rosa) junto a PvP Local, arranca con la clase activa.
- TESTS: scripts/test-rush.ts NUEVO 44✓ (ciclos deterministas, XP exacta, tiers con roll inyectado, registerRush/best run/ciclos sin duplicados, toggle tope 1, startRush/advanceRush montan Korgath→Nyx). Barrido completo: tsc ✓ · eslint ✓ · next build ✓ · 21 suites verdes (no-gemelas 56, tanda29 85, tanda30 82, fundamentos, v3-clase×3, rush 44...).
- RELEASE 3.1: versionName 3.0→3.1 · footer «v3.1 · 6 clases · 192 cartas · rush de jefes» (cifras reales: catálogo 192, base 36×3, V3 28×3). Commits 465d480 (T-E) + cf9149a (Rush+release) push a main → CI runs 39699550618-heredados OK, 39703964206 SUCCESS en ~4 min → artefacto guerrero-tactico-apk 14.1 MB (expira 2027-01-20).

Stage Summary:
- V3.1 RELEASED: plan-expansion-v3 COMPLETO al 100% — 6 clases (base 36 cartas, V3 28), 192 cartas, 61 keywords, Rush de Jefes jugable con botín por escalón y best run persistente, APK v3.1 generada por CI para prueba.
- El formato Rush respeta las decisiones del jugador: bot como player real, pick 1 de 3 (decisión > azar), legendaria 100% la 1ª vez de cada ciclo y 50% después.
- Sin deudas pendientes del plan V3: T-A..T-G todos cerrados. Siguientes hitos posibles (no comprometidos): rotación de jefes V3 en los MUROS de campaña (hoy solo rush/rotación de rush los usan), stats del Rush en ProfileScreen.

---
Task ID: 60
Agent: Z.ai (principal)
Task: «haz lo q si crees q esta bien» — evaluar propuesta de arquitectura TCG (estilo EdoPro) y ejecutar lo que aporte de verdad

Work Log:
- VEREDICTO: el proyecto ya cubre ~85% de la propuesta (types/engine/pvp = core; cards.ts = data+sets; components/game = ui; Zustand = pub/sub; 6 stores JSON = serialización; uid por instancia). Se descartaron: renombrar directorios (churn) y migrar 108 cartas a scripts individuales (rompería audit-balance/keyword-stats/test-keywords).
- ADOPTADO (lo único que faltaba): escape hatch híbrido — NUEVO src/lib/game/card-scripts.ts con CardScript {canPlay, onPlay, onEvent} + registro central CARD_SCRIPTS (VACÍO = estado canónico, coste O(1) fallido). Imports type-only desde engine → sin ciclo runtime.
- INTEGRACIÓN engine.ts (7 costuras): (1) import; (2) canPlay en playCard tras validación de carril, ANTES de la Marca de Ejecución (denegar no consume PC/Resonancia); (3) onPlay al final de playCard, DESPUÉS del pipeline de keywords, con copias frescas mutables (patrón Duelista para VFX); (4) helper dispatchCardScriptEvents tras triggerResult(); (5-7) despacho onEvent al final de applyStartTurnEffects (start_turn con turnNumber), applyEndTurnEffects (end_turn) y applyOnDeathEffects (on_death para CUALQUIER muerte, deadCard como extraSelf).
- REGRESIÓN: tsc --noEmit limpio · test-keywords-v3 33/33 · test-keywords-v4 71/71 · audit-balance ok (botanico/pirata/tinker 12/12 ok) · SMOKE end-to-end NUEVO scripts/smoke-card-scripts.ts: canPlay deniega con throw, onPlay muta (+5 visible con patrón Duelista), onEvent start_turn escribe log+fx, registro vuelve a vacío. Los 3 hooks disparan de verdad.
- NOTA del smoke: fixture sin handBonus → NaN (8+undefined). NO es bug del motor: el juego real instancia HandCard con handBonus numérico; el smoke ahora lo setea (handBonus: 0).
- DOCS: docs/design-pattern-cards.md nueva §11 (decisión de diseño, tabla equivalencias propuesta↔proyecto, contrato del escape hatch, reglas de oro, cómo estrenar un script).
- COMMIT LOCAL sin push (regla del jugador: CI/APK solo bajo orden expresa).

Stage Summary:
- Motor híbrido completo: keywords = canon para las 108 cartas; CardScript = válvula de escape para efectos únicos futuros, con registro vacío y prueba end-to-end de los 3 hooks. Documentado en §11 del design pattern.
- Arte (Task 59) sigue en pausa por 429 del API — 9 cartas pendientes, comando de reanudación en el worklog de Task 59.
Task ID: 54 (V3.2: Modo Admin oculto + Regla Mítico-Completada)
Agent: Z.ai main agent
Task: Petición del jugador — «Crea un modo admin q yo pueda activar y desactivar, algo oculto, que me desbloquee todas las clases y cards en su mítico» + regla de diseño: una carta que llega a MÍTICO ya no recibe recompensa de NINGUNA rareza (duplicados inservibles fuera del pool)

Work Log:
- RECON: mapa completo del sistema — colección (collectionStore: copies por rareza, fuse 3→1, MAX_FUSION_RARITY=mythic), desbloqueo de clases (campaign.classUnlocked vs stepsCleared + CLASS_UNLOCK_STEP), botín (addRewards/rollPickOptions/grantPick consumidos por pvpStore-historia/rush/online y missionStore), starter decks (grantStarterDeck en ClassSelect).
- ADMIN FLAG (src/lib/game/admin.ts NUEVO): módulo PURO sin zustand (lib no debe depender de stores) — localStorage "pacto-de-guerra-admin" guarda {on, backup} en un registro; isAdminOn() síncrono y barato para classUnlocked; tolerante a SSR/corruption.
- classUnlocked BYPASS: campaign.ts consulta isAdminOn() → con admin ON las 6 clases jugables a 0 escalones (tinker incluida, hint de jefes nunca mostrado). Único punto de verdad, sin tocar cada llamada de ClassSelect.
- REGLA MÍTICO-COMPLETADA (collectionStore): pool de addRewards y rollPickOptions FILTRA cartas con copia mythic>0 (duplicado = inservible, mítico ya es el tope de fusión); pool vacío → botín/picks = [] sin tocar estado; grantPick blinda si la carta se completó entre roll y confirmación; grantStarterDeck salta completadas; +8 poder/materialize ya existía. Métodos nuevos: isCompleted(id), allCompleted() (192 mítico), replaceAll() (solo admin).
- adminStore (src/store/adminStore.ts NUEVO): enable() = backup EXACTO (copies+grantedClasses+wins al registro admin) → 192 cartas {mythic:1} + 6 clases visibles otorgadas, wins preservado; disable() = restaura backup al byte y limpia. Idempotentes. Tras togglear la UI hace location.reload() para que todas las vistas relean.
- ACTIVACIÓN OCULTA: 7 toques en la versión del menú (convención Android dev-options) — contador con ventana 1.6s, sin feedback visible (solo haptic light), AdminSecretModal NUEVO (KeyRound/rose, estado Activo/Inactivo, toggle con CONFIRMACIÓN EN 2 TOQUES de 3s, texto de qué hace cada acción + recordatorio de la regla mítico, nota del acceso). Footer: «modo admin» en rojo cuando ON / «rush de jefes» ámbar cuando OFF (pintado tras hydrate, patrón anti-mismatch existente).
- UI BOTÍN VACÍO: HistoriaEndOverlay y PvpGameOverModal — loot.length===0 ahora distingue «Colección COMPLETADA: todas las cartas ya son MÍTICAS — no hay botín que dar» (allCompleted) del «Sin botín esta vez…» genérico; el pick del jefe desaparece solo (rollPickOptions=[] → picking=false).
- COLECCIÓN: badge «COMPLETADA» (Crown, rose) junto al nombre de toda carta mítico (title tooltip con la regla) + regla añadida al panel «Cómo funciona» (★ Completada: no vuelve a aparecer en botín de NINGUNA rareza).
- TESTS: scripts/test-admin-mythic.ts NUEVO 37✓ — polyfill localStorage+window para bun (los guards SSR lo necesitan), flag persistente, bypass de clases, enable exacto (192×mythic, 6 clases, wins preservado, sin contaminación de tiers), botín/picks=[] con colección completa, grantPick blindado, disable restaura al byte (copies/granted/wins), regla en jugador normal (60 drops nunca caen en 3 completadas, picks ídem, starter salta completada pero otorga el resto), idempotencia (disable no-op, doble enable no re-backup, enable→disable restaura igual). REGRESIÓN: tsc 0 errores · campana 139✓ · rush 44✓ · clases-v3 66✓ · v3-fundamentos 58✓0✗ · collection-historia 69✓ · progress-backup 31✓ · no-gemelas 57✓.
- E2E NAVEGADOR (dev server): 7 toques → panel · ACTIVAR (confirmación) → reload con footer rojo «modo admin» · localStorage {admin:true, copies:192, granted:6 clases, backup wins:0} · ClassSelect 6 clases SIN candado, TINKER seleccionable y JUGAR → partida arranca con splash del escalón 1 y mano MÍTICA materializada (Yunque 12, Autómata 10, Temblor 11, Centinela 18) · Colección 192/192 con badges COMPLETADA · 7 toques de nuevo → «Estado Activo» → DESACTIVAR (confirmación) → restore exacto (0 copias, footer normal).
- RELEASE 3.2: versionName 3.1→3.2 + footer «v3.2 · 6 clases · 192 cartas». Commit+push a main → CI APK nueva.

Stage Summary:
- V3.2: MODO ADMIN OCULTO completo y reversible (activar = 6 clases + 192 cartas MÍTICO con backup; desactivar = progreso real restaurado, lo ganado en admin se descarta) + REGLA MÍTICO-COMPLETADA aplicada en TODO el pipeline de botín (drops, picks de jefe, starter, misiones vía addRewards) — la intuición del jugador era correcta: con mítico como tope de fusión, todo duplicado posterior es inservible y ya no se dropea.
- Acceso del dueño: 7 toques en la versión del menú → panel secreto → activar/desactivar con confirmación. Indicador discreto en footer cuando está activo.
- Suites: 37 asserts nuevos + ~464 de regresión, todo verde; E2E del ciclo activar→jugar→coleccionar→desactivar verificado en navegador.

---
Task ID: 61
Agent: Z.ai (principal)
Task: «hay incoherencia: auditoría y verifica, borra código muerto, arregla lo roto; el panel de admin no me abre; faltan fondos de carriles de las clases nuevas y un color por carril» (+ token GH pegado en chat → avisado de revocación, NUNCA almacenado ni usado)

Work Log:
- AUDITORÍA DE DIVERGENCIA (la incoherencia raíz): local edf24e3 ≠ origin/main 55851ae — el remoto tenía 2 commits que local NO: 8a6c051 «feat(v3.2): MODO ADMIN OCULTO» (por eso el panel no abría: la copia de trabajo no lo tenía) + 55851ae (test de arte western en 3 cartas). Local tenía 2 propios sin push (CardScript Task 60 + efdb6e4). MERGE origin/main → conflicto solo en worklog.md (append/append, resuelto conservando ambas secciones) → commit c3a7e24.
- PANEL ADMIN VERIFICADO tras merge: admin.ts + adminStore.ts + AdminSecretModal presentes; gesto = 7 toques en el texto de versión del menú → panel secreto → activar/desactivar con confirmación en 2 toques. Suite test-admin-mythic 37✓. NOTA: no existe ruta /admin — el panel es el modal oculto por gesto.
- CÓDIGO MUERTO (95 huérfanos → 0): NUEVO scripts/clean-dead-exports.py (unexport si el símbolo se usa internamente; DELETE por balance de llaves + JSDoc si no se usa en ninguna parte; exención para card-scripts.ts = API pública documentada §11). Resultado: 82 unexport + 54 líneas borradas en 24 archivos (engine, types, stores, pvp, balance, perf...). balance.ts sigue vivo (3 consumidores) — solo se podó su superficie. audit-dead-exports.mjs ahora conoce la exención (Total: 0 estable).
- COLORES DE CARRIL (18 carriles / 18 familias únicas): laneColors.ts +6 familias (emerald, pink, stone, zinc, slate, fuchsia con el template completo bg/border/text/ring/glow/headerBg/divider); LaneDecor.tsx LANE_HEX +6 hex; LANE_META reasignado — botánico: raíz=esmeralda flor=rosa esporas=verde · pirata: puente=azul bodega=piedra artillería=amarillo · tinker: taller=zinc maquinaria=pizarra chispa=fucsia. Cero colisiones entre clases (PvP muestra carriles de ambos bandos).
- FONDOS DE CARRIL: los lane-*.webp de las clases nuevas NO existían en public/menu/ (404 silencioso en PvpLane backgroundImage). NUEVO scripts/gen-lane-bgs-western-v3.mjs (el generador que el worklog T58 citaba y nunca existió): estilo western aprobado, escenas alineadas a las paletas de cartas de cada clase, 864x1152 → sharp cover-crop 768x1344 → webp, FORCE/ONLY + backoff anti-429. PENDIENTE generar 9 fondos (raiz, flor, esporas, puente, bodega, artilleria, taller, maquinaria, chispa): el API de imágenes sigue en 429 duro (sondeos + canario fallidos). Reanudar: FORCE=1 bun scripts/gen-lane-bgs-western-v3.mjs.
- REGRESIÓN POST-LIMPIEZA: tsc 0 errores · campana 139 · clases-v3 66 · colección-historia 69 · admin-mítico 37 · keywords-v3 33 · keywords-v4 71 — TODO verde (~415 asserts).
- COMMIT LOCAL sin push (regla del jugador: CI/APK solo bajo orden expresa). REMOTO: origin/main queda DETRÁS de local (falta push cuando el jugador ordene).

Stage Summary:
- Incoherencia resuelta (merge con el Modo Admin v3.2 del remoto + trabajo local), código muerto 95→0 con suites verdes, colores únicos por carril de las 6 clases, y generador de fondos de carril listo esperando API. El panel de admin abre con 7 toques en el texto de versión del menú (gesto oculto, no hay botón).

---
Task ID: 62
Agent: Z.ai (principal)
Task: «revierte tajo/colmillo/hacha al arte antiguo + fondos de carril de las clases nuevas y sus colores» → luego «arregla el modo historia: no se siente historia — 1) reconvierte el actual a TORRE 2) historia real por capítulos + más bosses (6 clases) · commit CON push»

Work Log:
- REVERT ARTE: los 3 webp (tajo_quebrantamuros, colmillo_del_verdugo, hacha_de_ejecucion) restaurados desde 55851ae^ — hashes md5 idénticos al arte antiguo, verificación byte a byte. Commit 0d208b1.
- FONDOS DE CARRIL (9, clases nuevas): API de imágenes en 429 DURO toda la sesión (sondeos + canarios + runner paciente con setsid — el entorno mata procesos en background). Parked por el jugador («vamos a dejarlo para después»). El generador gen-lane-bgs-western-v3.mjs queda listo (reanudar: FORCE=1 bun scripts/gen-lane-bgs-western-v3.mjs). COLORES de carril verificados al 100% (Task 61 intacto: 18 familias laneColors + LANE_HEX + LANE_META).
- MODO HISTORIA — RECON: la campaña era una escalera de 15 combates con splash de 1 línea; sin arco, sin personajes reactivos, sin decisiones, sin final. Diagnóstico del jugador correcto: ya era una torre.
- TORRE DE LOS MUROS (rebrand + expansión): CAMPAIGN_STEPS 15→18 · CAMPAIGN_BOSS_STEPS [5,10,15]→[3,6,9,12,15,18] con UN JEFE POR CLASE en orden narrativo (Korgath→Yggra→Kaela→Nyx→Dorvik→Vharos, «la última sombra corona») · bands tier base 1-6 común/7-12 raro/13-17 épico · títulos Aprendiz 1-6/Veterano 7-12/Campeón 13+ · rewardCount 2+floor(step/5) · stepChipLabel «Piso n»/«JEFE · Piso n» · DESBLOQUEOS narrativos por jefe vencido: mago 3, botánico 6, pirata 9, asesino 12, tinker 15 · BIOMAS +3 nuevos (jardin/puerto/forja) y mapeo por tramos con muro propio por guardián · ClassSelect rebrandada (LA TORRE, tira de 18, PISO chips).
- RUSH SIN NERF: rushXpForBoss y floorLevel del pick usaban CAMPAIGN_BOSS_STEPS (ahora 3/6/9 — habría nerfeado el modo) → NUEVO RUSH_EQUIV_STEPS [5,10,15] exportado en rush.ts (escalera propia del rush, desacoplada) — balance del rush intacto (44✓).
- EL PACTO DE GUERRA (historia real): NUEVO src/lib/game/story.ts — 7 capítulos escritos (La Chispa/Tierra · Arboleda Devorada/Jardín · Bahía Boca de Hierro/Puerto · Trono de Escarcha · Forja Eterna · Umbral de Sombras · El Heraldo), 12 peleas, diálogos intro/win/lose por pelea, ARENGA por splash, REGLA DE CAPÍTULO = bonos de carril forzados por posición, 3 DECISIONES persistentes (perdon_bram/toma_hierro · peaje_pagado/motin · maquina_viva/maquina_rota) con VARIANTES de diálogo/win en capítulos posteriores, jefe final «El Heraldo del Umbral» (bossDeck asesino, legendaria, bossMode, coste +1 en 2 carriles) y STORY_ENDINGS: epílogo distinto por las 6 clases.
- MOTOR: pvp.ts NUEVO setForcedPositionBonuses (la regla de capítulo sobreescribe los bonos tras joinBotPvpState/enableBossMode) · types.ts exporta LaneBonusKind.
- STORES: storyStore NUEVO (persistencia "pacto-de-guerra-historia": chapter/fight/flags/completed; advance pelea→capítulo→fin; choose = la primera decisión manda por punto, con test) · pvpStore: storyActive/storyChapter/storyFight/storyChapterClosed/storyCompletedFlag + startStoryFight (patrón rush: vive DENTRO de modo historia, bot como player, BOSS_DECKS/mazos oficiales materializados al tier del guion) + rama story en checkHistoriaEnd (victoria: botín chico 2 + XP 8+4×cap; última pelea: botín del capítulo 3-6 + cierre; derrota: paga 1, no retrocede) + requestRematch story-aware (siguiente pelea / reintentar / volver al mapa) + exitToStoryMap.
- UI: NUEVO StoryMap.tsx (mapa de 7 nodos con línea de camino, progreso de peleas, diálogos tap-a-tap con SpeakerAvatar por voz, chip REGLA con labels de los bonos forzados, decisiones de 2 opciones, panel final con epílogo por clase + reinicio con confirmación; lazy-init resume-seguro de epílogo/decisión pendiente) · BattleIntroSplash rama story (chip HISTORIA·capítulo, rival resuelto, arenga, bioma del capítulo, Cap n/7 · Pelea x/y) · HistoriaEndOverlay rama story (títulos ¡Capítulo superado!/¡Historia completada!, chip EL PACTO DE GUERRA, lose-line del guion en derrota, botones Siguiente Pelea/Reintentar/Volver al Mapa/Fin) · MainMenu: botón grande «LA TORRE» + píldora violeta «EL PACTO» (fila flex-wrap — 4 píldoras envuelven en pantallas estrechas) · gameStore view "story" + page.tsx.
- TESTS: test-story.ts NUEVO 142✓ (integridad del guion, variantes por decisión, store con relectura — snapshots zustand NO mutan, regla de capítulo aplicada, 12 peleas montables, epílogos únicos ×6) · test-campana reescrito a la torre 155✓ · REGRESIÓN COMPLETA: rush 44 · v3-clase 33×3 · fundamentos 58 · no-gemelas 57 · keywords v3 33 + v4 71 · admin-mítico 37 (umbral mago actualizado) · colección-historia 69 · progress-backup 31 · smoke CardScript ✓ · tsc 0 · eslint 0 · next build ✓.
- E2E NAVEGADOR: menú con LA TORRE + EL PACTO envueltos bien → mapa del Pacto (7 nodos, GUERRERO chip, JUGAR) → diálogo intro con REGLA: ATAQUE +3 y 4 líneas tap-a-tap → ¡A LUCHAR! → splash HISTORIA·LA CHISPA con Bram y arenga sobre el tablero. Flujo completo funcional.
- COMMIT + PUSH a main (orden expresa del jugador: «el commit si es con push») → CI generará APK.

Stage Summary:
- La petición del jugador cerrada en dos frentes: (1) arte de tajo/colmillo/hacha revertido al antiguo byte a byte, fondos de carril parked por 429 (generador listo, colores ya hechos), (2) el modo historia reinventado: LA TORRE DE LOS MUROS (18 pisos, 6 jefes — uno por clase, desbloqueos narrativos) + EL PACTO DE GUERRA (7 capítulos con guion, reglas de capítulo, 3 decisiones persistentes con variantes, Heraldo final y epílogo por clase). Rush sin nerf con escalera propia. 12 suites verdes + build + E2E visual.

---
Task ID: ui-menu-hub
Agent: Z.ai main agent
Task: Rediseñar el menú principal (el usuario: «acomoda todo eso q esta en la ui menu... es un caos total demasiado reguero» — autorizada una UI nueva si hace falta)

Work Log:
- RECON: MainMenu con 6 píldoras sueltas (4 envolvían a 2 líneas en pantallas estrechas), CollectionMenuButton, stores de progreso (campaignStore step/prestige, storyStore chapter/completed, statsStore.rushBest, collectionStore.copies)
- Skills: fullstack-dev + impeccable (context + layout.md + craft-floor.md); sin PRODUCT.md → vía SCOPED_EXISTING_ALLOWED (refinamiento acotado, identidad visual intacta)
- Nuevo MainMenu como PANEL-HUB piramidal: 1 primaria (LA TORRE, chip «Piso N/18 · ★n») + 2 medianas (EL PACTO «Capítulo N/7», RUSH «Mejor N/3»/«XP ×2») + 2 compactas (COLECCIÓN «N/192 cartas», PVP LOCAL) — cero envolturas, subtítulos con progreso real pintado SOLO tras hidratar (anti-mismatch SSR)
- Cromo superior: perfil (izq) + misiones con badge done/total + ajustes (der), targets 44px
- Gesto admin (7 toques) movido al pie del panel; footer actualizado a v3.3 con conteo dinámico ALL_CARDS_V3.length
- Tipografía responsive base compacta + min-[360px] (Cinzel es ancha: «COLECCIÓN» truncaba a 9.5px)
- Fix lint preexistente AdminSecretModal (set-state-in-effect → ajuste de estado durante render)
- Verificación: tsc 0, eslint 0, impeccable detect [] (cero hallazgos), agent-browser en 390×844 y 320×568 (cero truncamientos), flujos TORRE→héroe / PACTO→mapa cap. 3/7 / MISIONES abre-cierra, 0 errores de consola

Stage Summary:
- Menú legible y jerárquico: el orden es lo nuevo, los colores/iconos se heredan de los botones anteriores (ámbar/violeta/rosa/púrpura/teal)
- Commit con PUSH (orden explícita del usuario en esta sesión)
- Pendiente menor detectado: el mapa de historia trunca títulos de capítulo a 320px (fuera de alcance aquí; posible pulido futuro)
