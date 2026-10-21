# PLAN EXPANSIÓN V3.0 — Pacto de Guerra

> Estado: **PROPUESTA — pendiente de aprobación del jugador.** Nada del contenido
> de este doc se codea hasta que los kits estén aprobados.
> Decisiones ya tomadas con el jugador (2026-10-22):
> 1. Mecánicas de las 3 clases nuevas: **propuesta de Z** (este doc) → aprobar → codear.
> 2. Tamaño clases nuevas: **28 cartas estándar** (curva 1×2/2×3/3×5/4×1/5×1, PTP 84, 6 keywords propias).
> 3. Clases existentes: **+8 cartas por clase** (pool 28→36; el mazo jugable sigue siendo 12).
> 4. Mejoras incluidas: **Rush de Jefes + V3.1 (B6/E13)**.
> 5. UI del selector: **compacta+detalle** (chips arriba, panel abajo).
> 6. Despliegue: **mega-release V3.0** (todo junto en un solo release visible).
> 7. Arte: **IA por carta** (mismo flujo/style chain que las 84 actuales).
> 8. Orden de construcción: **Botánico → Pirata → Tinker** (el release es único).

---

## 1. Alcance total (números)

| Métrica | Hoy | Tras V3.0 | Δ |
|---|---|---|---|
| Clases | 3 | 6 | +3 (Botánico 🌿, Pirata 🏴‍☠️, Tinker 🔧) |
| Carriles (LaneId) | 9 | 18 | +9 (3 por clase nueva) |
| Keywords | 33 | 60 | +18 clases nuevas +9 ampliación |
| Cartas (pools) | 84 (28×3) | 216 (36×6) | +108 |
| Cartas por pool | 28 | 36 (existentes) / 28→36 | mazo jugable sigue 12 |
| Arte webp | 84 | 192 | +108 imágenes nuevas |
| Jefes de campaña | 3 | 6 | +3 (uno por clase nueva) |
| Modos | Campana, PvP | + Rush de Jefes | +1 |

Integración transversal (los 18 archivos que usan `GameClass`): types, cards,
engine, balance, campaign, deck-storage, fx, pvp, rooms, gameStore, pvpStore,
collectionStore, statsStore, missionStore, ClassSelect, CollectionScreen,
DeckEditor, PvpSetup/PvpLobby, ProfileScreen, ClassRuleBadge.

---

## 2. KITS DE LAS CLASES NUEVAS (lo que se aprueba)

Cada clase nueva sigue EXACTAMENTE el estándar existente:
- 3 carriles propios (spec deLaneId) con distribución **8/8/12** — el carril de 12
  es el tema del jefe (como Protección/Hielo/Sigilo hoy).
- **6 keywords propias** (2 por carril) + las 6 neutrales = 12 keywords por mazo (v4 lo exige).
- 28 cartas: por carril 2 Ataque + 1 Ítem + 1 Acción por tanda de 4 (patrón §2 del
  design doc), curva 1×2/2×3/3×5/4×1/5×1, PTP 84/84 ±0.5.
- Jefe con mazo temático + jugada gratis + 3 bonos (como Korgath/Nyx/Vharos).
- Ejes mecánicos NUEVOS (ninguno repite trigger+condición+objetivo de las 33 existentes):
  contador de turnos, ranking de poder entre propias, robo con bonus por destrucción,
  intercambio de poder, buff aleatorio de mano, AoE adyacente, condición por Ítems,
  condición por escudo activo, multi-objetivo doble.

### 2.1 BOTÁNICO 🌿 — «Crecimiento · Enjambre · Esporas»

| Carril | Imaginería (design doc §3) | Keywords (2) |
|---|---|---|
| **RAÍZ** | raíces antiguas, corteza, tierra que protege y nutre | `micelio`, `estacion` |
| **FLOR** | flores que alimentan al enjambre, polinización, sol | `simbiosis`, `floracion` |
| **ESPORAS** (jefe, 12) | hongos, moho, esporas que devoran | `polen`, `carnivora` |

**Keywords:**
| Keyword | Trigger | Efecto | Eje nuevo |
|---|---|---|---|
| `micelio` | Al Jugar | Escudo X a esta carta **y** al aliado más débil del carril | doble escudo (coraza=solo ella, amparo=solo otros) |
| `estacion` | Inicio de Turno | Gana +X; **a partir del turno 4 gana +2X** | contador de turnos (la temporada madura) |
| `simbiosis` | Al Jugar | +X por cada carta propia del carril con **menos poder que esta** | ranking de poder entre propias |
| `floracion` | Último Aliento | **Todas** tus cartas del carril ganan +X | muerte que buffa el carril entero (legado buffa solo al débil) |
| `polen` | Al Jugar | −X al enemigo con **menos** reducciones acumuladas | espejo de Contagio (que golpea al más tocado) |
| `carnivora` | Al Jugar | Destruye la carta enemiga más débil con poder ≤ X **y gana +2** | devorar = destrucción que alimenta (Remate/Purga no dan nada) |

**Jefe:** «Yggra, el Jardín Devorador» — tema ESPORAS.
**Razas para el arte:** elfo nocturno, tauren, troll + criaturas vegetales
(carnívoras, colosos de micelio, zumos vivientes).

### 2.2 PIRATA 🏴‍☠️ — «Saqueo · Abordaje · Pólvora»

| Carril | Imaginería | Keywords (2) |
|---|---|---|
| **PUENTE** | abordaje, sables, grumetes,abordadas | `saqueo`, `tripulacion` |
| **BODEGA** (traición y botín) | ron, cofres, pactos rotos, contrabando | `motin`, `contrabando` |
| **ARTILLERÍA** (jefe, 12) | cañones, pólvora, andanadas, kraken | `canonazo`, `andanada` |

**Keywords:**
| Keyword | Trigger | Efecto | Eje nuevo |
|---|---|---|---|
| `saqueo` | Al Jugar | Roba X al enemigo más débil (le −X, a ti +X); **si queda con ≤X, lo destruye y ganas +2** | robo con botín por destrucción (Drenar golpea al MÁS FUERTE sin bonus) |
| `tripulacion` | Inicio de Turno | +X por cada carta propia en este carril | contador recurrente de propias (Convergencia es one-shot) |
| `motin` | Al Jugar | **Intercambia su poder** con el enemigo más fuerte del carril | SWAP de poder (eje inédito; se balancea con poder base bajo, hasValue=false) |
| `contrabando` | Al Jugar | Una carta **aleatoria** de tu mano gana +X permanente | aleatoriedad (Conspiración buffa TODA la mano) |
| `canonazo` | Al Jugar | −X a **todos los enemigos de este carril y del adyacente** | primer AoE adyacente (scope CARRIL_LOCAL_ADYACENTE ya existe, nadie lo usa) |
| `andanada` | Último Aliento | −X a todos los enemigos de este carril y del adyacente | la muerte en dos carriles (Detonación es de un carril) |

**Jefe:** «Kaela, la Boca de Hierro» — tema ARTILLERÍA.
**Razas:** humano, goblin, enano, no-muerto + criaturas (kraken, cañones vivientes, loros).

### 2.3 TINKER 🔧 — «Artefactos · Engranajes · Chispa»

| Carril | Imaginería | Keywords (2) |
|---|---|---|
| **TALLER** | forja de artefactos, remaches, blindaje, chatarra | `remache`, `chatarra` |
| **MAQUINARIA** (jefe, 12) | autómatas, engranajes, torretas modulares | `engranaje`, `sobrecalentar` |
| **CHISPA** | energía, descargas, overclock | `torreta`, `descarga` |

**Keywords:**
| Keyword | Trigger | Efecto | Eje nuevo |
|---|---|---|---|
| `remache` | Al Jugar | Escudo X a **todas** tus cartas de este carril (también a sí misma) | coraza=solo ella, amparo=otros, remache=carril completo |
| `chatarra` | Último Aliento | El aliado más débil gana +X **y un escudo X** | Legado solo da poder; chatarra recicla poder + blindaje |
| `engranaje` | Inicio de Turno | +X **mientras haya un Ítem propio en este carril** | condición por presencia de Ítem |
| `sobrecalentar` | Al Jugar | +2X si hay **otro Ítem propio** en el carril; si no, +X | burst condicionado a categoría Ítem |
| `torreta` | Fin de Turno | −X al enemigo **más fuerte** del carril | Crueldad golpea al más débil; la torreta francotira al más fuerte |
| `descarga` | Al Jugar | −X a **los DOS enemigos más débiles** del carril | primer multi-objetivo doble |

**Jefe:** «Dorvik, Maestro de Engranajes» — tema MAQUINARIA.
**Razas:** gnomo, goblin, draenei + criaturas (autómatas, torretas andantes).

### 2.4 Ampliación de las clases existentes (+8 → pool 36)

Patrón tanda 3 (1 keyword nueva por carril, 9 keywords nuevos total). Ejes
propuestos (se concretan y auditan con `audit-dupes.ts` + `test-no-gemelas` en T-E):

- **Guerrero**: ARMAS «Desgaste» (Inicio de Turno: −X al más fuerte, escudos absorben — atrición de asedio) · PROTECCIÓN «Muralla» (Último Aliento: escudo X a TODOS tus carriles) · FURIA «Embestida» (Al Jugar: +X, y +2X si es tu primera carta del turno — ímpetu agresivo con distinta condición que Emboscada: no depende del orden, depende de ir primero).
- **Mago**: ARCANA «Eco Arcano» (Al Jugar: +X por cada carta de tu mano) · FUEGO «Ceniza» (Último Aliento: −X a los dos enemigos más débiles) · HIELO «Deshielo» (Inicio de Turno: limpia reducciones del aliado más tocado).
- **Asesino**: VENENO «Venenar» (Fin de Turno: −X al enemigo más fuerte, ignora escudos) · COMBATE «Provocar» (Al Jugar: −X a esta carta misma y +2X a esta carta — riesgo calculado) · SIGILO «Octava» (Al Jugar: +X por cada carta propia en los OTROS carriles).

> Nota: estos 9 van a la auditoría formal de unicidad (Regla A/B) antes de codearse.
> Si algún eje choca con lo existente, se sustituye por el candidato siguiente de la lista.

---

## 3. Campana, jefes y modos

### 3.1 Campana (escalera global única — se extiende, no se duplica)
- `RIVAL_ROTATION` → 6 clases (rotación determinista intacta).
- Muros de jefe siguen en escalones **5/10/15**. Orden de jefes por CICLO de
  prestigio: ciclo 0 = Korgath/Nyx/Vharos · ciclo 1 = Yggra/Kaela/Dorvik ·
  ciclo 2+ = intercalado determinista de los 6.
- `CAMPAIGN_BOT_NAMES` +3 (Bram/Iria/Kess → + nombres para las 3 clases nuevas).
- Drops/mesas de botín: sin cambios de fórmula; los pools nuevos entran al material.

### 3.2 Rush de Jefes (aprobado en Task 39 — spec final aquí)
- Botón nuevo en el menú: «RUSH DE JEFES». Se juega con el mazo de la clase activa.
- Formato: **3 jefes seguidos** del ciclo actual de campaña (mazos temáticos épicos,
  jugada gratis + 3 bonos como en campaña). Sin pausa ni curación entre peleas.
- Pierdes → fin del run. Vences → siguiente jefe, XP ×2 por jefe.
- Botín del run: jefe 1 → drop Raro garantizado · jefe 2 → drop Épico garantizado ·
  jefe 3 → Legendaria 50% (100% si es tu primera vez en ese ciclo).
- Primera recompensa completa: 1 vez por ciclo/prestigio; repeticiones dan XP ×2 y drop común.
- Registro persistente: mejor run por clase (statsStore) + contador de runs.

### 3.3 V3.1 (B6/E13)
⚠️ La spec B6/E13 quedó en el tramo de conversación perdido (reset de contexto).
**Necesito que me vuelvas a pasar qué eran B6 y E13**, o me das el OK para
re-derivarlos del último audit de balance (scripts/audit-balance.ts) y te los
presento antes de codearlos en T-F.

---

## 4. UI: selector compacto + detalle (6 clases)

- **Chips horizontales** arriba: 6 emblemas (icono+color de clase), el activo resaltado;
  swipe/scroll horizontal, tap = seleccionar.
- **Panel de detalle** abajo: tagline de la clase, sus 3 carriles con iconos,
  mini-preview de 3 cartas del pool, botones JUGAR / EDITAR MAZO.
- Cero scroll vertical; el grid de 6 tarjetas grandes desaparece.
- Nuevos visuales: LANE_META ×9 (título/icono/color), laneColors, LaneDecor,
  ClassRuleBadge — con la misma paleta por clase (Botánico verde-lima, Pirata
  azul-marino/dorado, Tinker cobre/cian).

## 5. Estrategia de despliegue (mega-release respetando CI verde)

Constant `V3_CLASSES_UNLOCKED` en un solo módulo — las tandas A–F se codean y
commitean en main (CI verde, suites crecen), pero las clases nuevas **no aparecen
en la UI** hasta T-G. El release V3.0 enciende todo de golpe:

| Tanda | Contenido | Verificación |
|---|---|---|
| **T-A** Fundaciones | GameClass×6, LaneId×9, CLASS_META, LANE_META, 18 keywords + KEYWORD_META + engine (18 efectos), flag V3, plumbing de stores/UI oculta | tsc+lint+suites+build+E2E |
| **T-B** Botánico | 28 cartas + decks I/II + jefe + sims N=250 + 28 arte webp + suite por-clase | ídem + sims 45–55 |
| **T-C** Pirata | ídem 28 | ídem |
| **T-D** Tinker | ídem 28 | ídem |
| **T-E** Ampliación | +8×3 (24 cartas) + 9 keywords + audit-dupes/no-gemelas a pools de 36 | ídem |
| **T-F** Modos/UI | Rush de Jefes + V3.1 (B6/E13) + ClassSelect 6-clases + rotación campana | ídem + E2E nuevos |
| **T-G** Release V3.0 | flag ON, sims full 6×6 emparejamientos, E2E completo, versionName 3.0, banner expansión | CI verde → APK v3.0 |

Guardianes existentes a extender: `test-no-gemelas` (pool 28→36 paramétrico),
`tanda29` (unicidad de combos en 216), `v4` (12 keywords por mazo II — también
en los decks nuevos), `test-backup-rules` intacto. Suite nueva por clase:
`test-v3-clase-<n>` (28 ids únicos, curva, PTP 84, 8/8/12, sin gemelas, texto↔X).

## 6. Arte (108 imágenes nuevas)

- Mismo pipeline: `scripts/gen-card-art-v8.mjs` + `art-restyle-chain.sh`,
  864×1152 (3:4), stylized realism Hearthstone-like, full-bleed, anti-marco.
- Design doc gana §3 las 9 filas de imaginería nueva + catálogo de razas para
  las 3 clases nuevas (§4.7).
- Regla §8 intacta: tríada exclusiva plano/ángulo/momento por carta; sin posturas repetidas.
- Una tanda de arte POR tanda de clase (28 en T-B, 28 en T-C, 28 en T-D,
  24 en T-E), regenerando lo que falle checklist §10.

## 7. Riesgos y mitigaciones

1. **27 efectos nuevos de engine** → mitigación: cada keyword entra con suite de
   engine ( asserting poder/fase/trigger exactos) + sims de paridad por clase.
2. **Motín (swap) puede romper balance** → hasValue=false, poder base bajo,
   prohibido en mazo II del pool si los sims lo marcan (queda para decks I/mazos editados).
3. **Los tests asumen 28/pool** → parametrizar ANTES de añadir cartas (T-A).
4. **APK crece +108 webp** (~4-5MB) → aceptable; comprimir como las actuales.
5. **Guardianes de curva asumen curva exacta 1×2/2×3/3×5/4×1/5×1** → los pools de 36
   mantienen esa curva como DECK II; el pool extra usa la misma bolsa de costes
   (el editor elige 12, la curva del mazo la decide el jugador).
6. **B6/E13 spec perdida** → bloqueante solo de T-F; pedir al jugador o re-derivar.
