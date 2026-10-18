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
