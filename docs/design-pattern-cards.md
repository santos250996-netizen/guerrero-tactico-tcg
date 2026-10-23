# Patrón de Diseño — Cartas (Nombre × Tipo × Spec)

> Regla de oro: **el nombre de la carta juega con su tipo (categoría) y su spec (subtipo),
> y el arte se deriva del nombre + tipo + spec.** Si algo no concuerda, se corrige la
> carta (nombre y/o categoría), nunca se "deja pasar".

## 1. Semántica de categorías

| Categoría | Qué representa | Cómo se nombra | Ejemplos |
|-----------|----------------|----------------|----------|
| **Ataque** | Seres en combate y golpes dirigidos al rival | Criatura/unidad en actitud de combate (`Berserker Recluta`, `Acechador Nocturno`) o un acto de golpe (`Tajo Quebrantamuros`, `Estallido Ígneo`) | Salamandra Anciana, Colmillo del Verdugo, Víbora Ponzoñosa |
| **Ítem** | Objetos físicos: armas, armaduras, herramientas, cristales, pociones, libros | Sustantivo-objeto, a menudo `X de Y` (`Adarga del Centinela`, `Frasco de Peste`) | Hacha de Ejecución, Estoque Afilado, Farol Ígneo, Carapacho Glacial |
| **Acción** | Hechos, eventos, rituales, tácticas — algo que OCURRE, no un objeto | Nombre verbal/eventual (`Oración del Bastión`, `Tormenta de Brasas`, `Ajuste de Cuentas`) | Veterano Caído (el homenaje a su caída), Toque de Guerra (la llamada del cuerno), Fundirse en Sombras, Nube Tóxica |

**Litmus test:** si puedes *sostenerlo* → Ítem. Si es *alguien luchando o golpeando* → Ataque.
Si es *algo que sucede* (rezo, tormenta, liquidación, homenaje, fusión) → Acción.

## 2. Regla de distribución por spec

**Cada spec/carril tiene exactamente 4 cartas: 2 Ataque + 1 Ítem + 1 Acción.**

Por qué: los bonos de carril incluyen `Ataque +3` / `Ítem +3` / `Acción +3`. Con la
distribución 2/1/1 ningún bono de categoría es "muerto" en ninguna spec de ninguna clase,
y el editor de mazos siempre tiene opciones de los 3 tipos por carril.

## 3. Identidad visual por spec (imaginería)

| Spec | Clase | Imaginería obligatoria del nombre y del arte |
|------|-------|----------------------------------------------|
| ARMAS | Guerrero | Armas, forja, duelos, golpes que rompen armaduras |
| PROTECCIÓN | Guerrero | Escudos, murallas, guardias, estandartes, resguardos |
| FURIA | Guerrero | Salvajismo, rabia, sangre, ejecución brutal |
| ARCANA | Mago | Energía arcana violeta, conjuros, aberraciones, grimorios |
| FUEGO | Mago | Llamas, brasas, salamandras, ascuas, faroles arcanos |
| HIELO | Mago | Escarcha, glaciares, viento cortante, colosos de hielo |
| VENENO | Asesino | Toxinas, ponzoña, víboras, frascos, contagio |
| COMBATE | Asesino | Duelo callejero, milicia, bandidismo, estoques, ajustes de cuentas |
| SIGILO | Asesino | Sombras, noche, cuchillas silenciosas, emboscadas |

## 4. Regla de arte

El arte de la carta **se deriva del nombre + categoría + spec**:

1. El sujeto del arte ES el nombre (la persona/objeto/evento que lo dice).
2. El ambiente/escena pertenece a la spec (imaginería de la tabla §3).
3. **Composición obligatoria por categoría** (reglas V3.2, §6):
   - **Ítem** → el objeto es el ÚNICO protagonista: bodegón heroico centrado,
     **sin personajes, sin manos, sin brazos, sin personas**. Un ítem nunca
     comparte el foco con quien lo porta.
   - **Acción** → se ve a **alguien ejecutando la acción** (el heraldo soplando
     el cuerno, el asesino lanzando la vasija, el mago canalizando la tormenta).
     NUNCA un símbolo abstracto ni una escena "vacía" sin agente, y la escena
     debe leerse de un vistazo (si al verla dices "¿qué es esto?", se regenera).
   - **Ataque** → el golpe **en plena ejecución** por el portador de la spec
     (el mago lanzando el estallido, la bestia a punto de morder).
4. **Coherencia de clase**: el arte nunca introduce personajes de otra clase
   (no hay guerreros acorazados en cartas de mago; no hay justicieros
   ceremoniales en cartas de asesino).
5. **Anatomía correcta**: manos correctas, número correcto de brazos/dedos;
   si el modelo de imagen falla la anatomía, se regenera (caso estoque con
   3 brazos).
6. Estilo (CORREGIDO 2026-10 tras deriva realista): **Stylized realism,
   Hearthstone-like** — pintura digital con brochetas visibles, colores
   saturados, zonas de color plano en sombras, proporciones heroicas
   exageradas. NUNCA fotorrealista, NUNCA render 3D. 864×1152 (3:4),
   sin texto, sin bordes ni marcos (el marco lo pone la UI).
7. **Catálogo de razas (§4.7)**: todo personaje humanoide del arte pertenece
   a UNA de las razas del catálogo — nada de "humanos genéricos realistas":

   | Clase | Razas del catálogo para sus personajes |
   |-------|----------------------------------------|
   | Guerrero | orco · tauren · enano · humano · worgen |
   | Mago | humano · elfo de sangre · elfo nocturno · draenei · gnomo |
   | Asesino | humano · goblin · no-muerto · elfo nocturno · worgen |

   Bestias/criaturas (salamandra, víbora, fénix, coloso de hielo…) no requieren
   raza. El prompt SIEMPRE nombra la raza con sus rasgos (piel, orejas, colmillos…).

Plantilla de prompt usada en `scripts/gen-card-art-v4.mjs` (codifica las reglas
por categoría en `CATEGORY_RULE`):

```
Subject: {NOMBRE en escena}. Scene: {imaginería de la spec}.
Mood: {Ítem: centered hero still-life, no characters/hands/arms |
       Acción: action actively performed by a clearly visible character, readable |
       Ataque: violent dynamic action caught mid-strike, wielder visible}.
Stylized realism, visible brushstrokes, NOT photorealistic, Hearthstone card
art style, vibrant saturated colors, dramatic cinematic lighting, flat color
zones in shadows, exaggerated heroic proportions, no text, no borders, no
watermark.
```

## 8. Composición EXCLUSIVA por carta (anti-plantilla — tanda 40)

> Feedback del jugador: "muchas cards tienen la misma postura en el arte y se
> siente repetitivo, es como si solo cambiaras la raza y el fondo". La regla
> nombre × tipo × spec dice QUÉ se pinta, no CÓMO se encuadra: eso es libre
> y DEBE variar carta a carta.

**Regla: cada imagen es una composición EXCLUSIVA.** Antes de generar una
carta se decide (y se escribe en el prompt) su tríada de encuadre:

1. **PLANO** — primerísimo plano del impacto · retrato · cuerpo entero ·
   plano general · paisaje con figura mínima.
2. **ÁNGULO** — contrapicado extremo · picado aéreo · nivel del suelo ·
   frontal · 3/4 · contraluz.
3. **MOMENTO** — preparación (arma en alto) · impacto (contacto/esquirlas) ·
   consecuencia (bloque roto, caído, polvo asentándose).

Dos cartas de la misma spec NUNCA comparten silueta ni encuadre: si la
nueva sale parecida a una existente, se regenera cambiando la tríada
(ej.: "Tajo Quebrantamuros" impacto en primerísimo plano vs
"Quebrantador de Filas" barrido lateral a nivel del suelo vs
"Justicia de la Legión" general aéreo desde atrás — los tres de ARMAS,
ninguno se parece a otro).

El arte debe reflejar la ACCIÓN/ATAQUE/ÍTEM del nombre — da igual si el
sujeto queda en primer plano, tercer plano o es paisaje: lo que se lee es
el momento que el nombre describe. Los sujetos pueden quedar RECORTADOS
por el borde del lienzo (garantiza full-bleed y mata los marcos dibujados).

**Anti-marco**: el modelo tiende a dibujar marcos dorados/oscuros dentro de
la imagen. El prompt SIEMPRE abre con "RAW FULL-BLEED PAINTING with NO card
frame, NO border, NO gold trim, NO rounded corners" y la composición recorta
algo por el borde. Si a pesar de eso sale marco → regenerar (ocurrió en
Hacha de Ejecución y Fiera Ensangrentada).

## 9. Sonoridad de clase (vocabulario del nombre)

El nombre debe **sonar a su clase** — el jugador debe adivinar la clase por el
vocabulario antes de ver el sello. Ejemplos de correcciones por sonoridad:

| Clase | Vocabulario que SÍ suena | Vocabulario que NO suena (suena a otra clase) |
|-------|--------------------------|------------------------------------------------|
| **Mago** | arcano, conjuro, estallido, ígneo, escarcha, grimorio, coloso de hielo, salamandra | antorcha de campamento (guerrero), golpe fundidor (herrero/guerrero) |
| **Asesino** | ponzoña, víbora, cuchilla, sigilo, ajuste de cuentas, emboscada, la sombra | sentencia rápida (paladín/juez), espora viviente (druida/naturaleza) |
| **Guerrero** | tajo, cuerno de guerra, hacha, muralla, bandera, berserker | — |

Litmus de sonoridad: si el nombre se oyera en la mesa y alguien dijera "¿eso no
es de otra clase?", el nombre se revisa (ronda V3.2: `Antorcha Guía`,
`Golpe Fundidor`, `Sentencia Rápida`, `Espora Viviente`).

## 6. Correcciones aplicadas

### Ronda V3.1 — auditoría nombre × categoría

| Antes | Ahora | Motivo |
|-------|-------|--------|
| Mandoble Quebrantamuros (Ataque) | **Tajo Quebrantamuros** (Ataque) | un mandoble es un objeto; el golpe es el ataque |
| Espada del Duelista (Ataque) | **Duelista Errante** (Ataque) | la espada es objeto; el duelista es quien ataca |
| Cuerno de Guerra (Acción) | **Toque de Guerra** (Acción) | el cuerno es objeto; el toque (la llamada) es la acción |
| Martillo del Veterano (Ataque) | **Guardián Juramentado** (Ataque) | el martillo es objeto; el guardián es quien ataca |
| Estandarte de la Cohorte (Ítem) | **Abanderado de la Cohorte** (Ataque) | reequilibrio 2/1/1 en PROTECCIÓN: el abanderado es unidad |
| Hacha de Ejecución (Ataque) | Hacha de Ejecución (**Ítem**) | el hacha es un objeto |
| Veterano Caído (Ataque) | Veterano Caído (**Acción**) | su caída es un evento (Legado) |
| Bastón de Estrellas (Ítem) | **Conjurador de Estrellas** (Ataque) | reequilibrio 2/1/1 en ARCANA: unidad que conjura |
| Núcleo Inestable (Ítem) | **Aberración Arcana** (Ataque) | ser inestable que surge y decae (Sobrecarga) |
| Espada Candente (Ataque) | **Estallido Ígneo** (Ataque) | la espada es objeto; el estallido mágico es el ataque |
| Cristal Glacial (Ítem) | **Coloso de Escarcha** (Ataque) | reequilibrio 2/1/1 en HIELO: coloso que regenera escarcha |
| Cultivo de Hongos (Ítem) | **Víbora Ponzoñosa** (Ataque) | ser del arsenal del asesino (Fervor: crece al envenenar) |
| Estoque Afilado (Ataque) | Estoque Afilado (**Ítem**) | el estoque es un objeto |
| Cuchilla del Silencio (Ataque) | Cuchilla del Silencio (**Ítem**) | la cuchilla es un objeto |
| Capa de Sombras (Ítem) | **Fundirse en Sombras** (Acción) | reequilibrio 2/1/1 en SIGILO: el acto de fundirse |

### Ronda V3.2 — arte y sonoridad de clase

Correcciones reportadas por el usuario sobre la ronda V3.1:

| Carta | Problema | Corrección |
|-------|----------|------------|
| Toque de Guerra | la acción no la ejecutaba nadie (cuerno "soplado por pulmones invisibles") | **Arte regenerado**: heraldo visible soplando el cuerno con las filas respondiendo (§4.3) |
| Hacha de Ejecución | el arte no estaba centrado en el ítem (el hacha) | **Arte regenerado**: bodegón del hacha sobre altar, sin personajes (§4.3) |
| Tormenta de Brasas | arte confuso, no se leía el evento | **Arte regenerado**: mago canalizando el ciclón de brasas sobre las líneas enemigas (§4.3) |
| Antorcha Guía | nombre de guerrero, no de mago; aparecía un guerrero en el arte | **Renombrada → Farol Ígneo** (Ítem de fuego de mago) + arte nuevo: farol arcano solo sobre plinto (§5) |
| Golpe Fundidor | nombre de guerrero/herrero, no de mago; el arte era "un volcán sin más" | **Renombrada → Estallido Ígneo** (Ataque de fuego de mago) + arte nuevo: el mago lanzando el estallido en pleno impacto (§5) |
| Viento Cortante | no se veía a nadie ejecutando la acción | **Arte regenerado**: hechicero de hielo conjurando la ventisca con su báculo (§4.3) |
| Espora Viviente | una espora no es "algo" de un asesino (suena a druida) | **Renombrada → Víbora Ponzoñosa** (Ataque de veneno de asesino) + arte nuevo (§5) |
| Nube Tóxica | no se veía a nadie ejecutando la acción ni la acción como tal | **Arte regenerado**: asesino arrojando la vasija que estalla en la nube verde (§4.3) |
| Estoque Afilado | el arte tenía 3 brazos (anatomía imposible) y no centraba el ítem | **Arte regenerado**: estoque plantado en el patio de duelos, objeto único (§4.5) |
| Sentencia Rápida | suena a paladín/juez, no a asesino | **Renombrada → Ajuste de Cuentas** (Acción de combate de asesino) + arte nuevo: el daggerman liquidando al deudor (§5) |
| Cuchilla del Silencio | el ítem no era el centro del arte | **Arte regenerado**: daga negra sobre terciopelo, bodegón único (§4.3) |

Regla derivada: **cuando se renombra una carta se regenera su arte** (nuevo id →
`public/cards/{nuevo-id}.png`); el arte del nombre antiguo queda huérfano y no
se borra (seguridad con CustomCards del editor).

### Ronda V3.3 — tanda 40: composición exclusiva + anti-marco

Reporte del usuario: posturas repetidas ("solo cambias raza y fondo") y un
marco dibujado DENTRO del arte del Hacha de Ejecución. Regeneradas con la
tríada exclusiva de §8 (script `gen-card-art-v8.mjs`):

| Carta | Problema | Corrección (nueva tríada) |
|-------|----------|---------------------------|
| Hacha de Ejecución | marco dorado dibujado dentro del arte | Regenerado: bodegón contrapicado a contraluz, full-bleed real (§8 anti-marco) |
| Colmillo del Verdugo | pose "posando sobre el caído" (gemela con Fiera) | Regenerado: contrapicado extremo, el tajo CAE hacia cámara |
| Fiera Ensangrentada | humano en pose agachada (y sin ser fiera) | Regenerado: worgen saltando HACIA cámara, garras recortadas por el borde |
| Tajo Quebrantamuros | pose estática con mandoble en alto | Regenerado: primerísimo plano del IMPACTO, mampostería hacia cámara |
| Justicia de la Legión | héroe posando sobre vencidos (marco oscuro en 1er intento) | Regenerado: general aéreo desde atrás, la legión entera baja la ladera |
| Quebrantador de Filas | gigante posando con martillo | Regenerado: nivel del suelo lateral, la fila se rompe en pleno barrido |

## 10. Checklist para cartas nuevas

- [ ] ¿El nombre evoca la categoría correcta? (litmus test §1)
- [ ] ¿El nombre usa la imaginería de su spec? (§3)
- [ ] ¿El nombre SUENA a la clase? (vocabulario §5)
- [ ] ¿La spec queda en 2 Ataque + 1 Ítem + 1 Acción? (§2)
- [ ] Ítem: ¿el arte es un bodegón del objeto solo, sin manos ni brazos? (§4.3)
- [ ] Acción: ¿se ve a alguien ejecutando la acción y la escena se lee de un vistazo? (§4.3)
- [ ] Ataque: ¿el golpe está en plena ejecución por el portador de la spec? (§4.3)
- [ ] ¿El arte no mezcla clases (sin guerreros en cartas de mago, etc.)? (§4.4)
- [ ] ¿Anatomía correcta (brazos, manos)? (§4.5)
- [ ] ¿Composición EXCLUSIVA: plano+ángulo+momento distintos de las demás cartas de su spec? (§8)
- [ ] ¿SIN marco dibujado dentro del arte (full-bleed real, algo recortado por el borde)? (§8)
- [ ] ¿El id es el slug del nombre (`snake_case`, sin acentos) y existe `public/cards/{id}.png`?

## 11. Arquitectura del motor: keywords como canon + escape hatch CardScript

### 11.1 Decisión de diseño (por qué NO scripts individuales para todo)

La propuesta «EdoPro» (un script por carta con `onPlay/onEvent/canPlay` + registro
central) es el patrón correcto para juegos con efectos caóticos únicos, pero como
BASE degradaría el activo más valioso del proyecto: el motor data-driven de
KEYWORDS. Con keywords declarativas en `cards.ts` es posible auditar balance en
masa (`audit-balance.ts`), medir cobertura (`keyword-stats.ts`) y correr suites de
regresión que simulan partidas enteras (`test-keywords-v3/v4`). Migrar 108 cartas
a scripts sueltos rompería esa cadena de herramientas para siempre.

El resto de la propuesta ya estaba cubierto con otros nombres:

| Concepto propuesto | Equivalente en el proyecto |
|--------------------|---------------------------|
| `core/entities+enums+types` | `src/lib/game/types.ts` (Card, GameState, LaneId, trampas) |
| `core/systems` | `engine.ts` (pipeline keywords + reglas clase V3), `pvp.ts`, `rush.ts` |
| Instancia vs dato estático (UUID) | `cards.ts` define; el motor instancia con `uid` |
| EventBus pub/sub | Zustand (estado→UI) + `fx.ts` `emitFx/subscribeFx` (canal de VFX) |
| Serialización JSON | los 6 stores persisten JSON; estado = objeto plano |
| `CardRegistry` | `CARD_SCRIPTS` (ver 11.2) — antes: el `switch` de keywords |

### 11.2 Escape hatch: `card-scripts.ts` (estilo EdoPro, quirúrgico)

Para el día en que una carta NECESITE un efecto que ninguna keyword expresa,
existe `src/lib/game/card-scripts.ts`: interfaz `CardScript` con 3 hooks
opcionales y registro central `CARD_SCRIPTS: Record<defId, CardScript>`.

- `canPlay(ctx)` — validación EXTRA; corre en `playCard` ANTES de la Marca de
  Ejecución (denegar no consume PC ni Resonancia).
- `onPlay(ctx)` — corre en `playCard` DESPUÉS de todo el pipeline de keywords.
  VFX visible = patrón Duelista (push en `mutations` + `powerLog`).
- `onEvent(ctx)` — despachado al FINAL de `applyStartTurnEffects`
  (`start_turn`), `applyEndTurnEffects` (`end_turn`) y `applyOnDeathEffects`
  (`on_death`, cualquier muerte, con `deadCard` como `extraSelf`).

Reglas de oro del contrato: los ctx entregan copias frescas (mutar en lugar es
seguro); NUNCA re-aplicar poder que una keyword ya aplica; nada de azar en
`onEvent` (determinismo de replays PvP); el registro VACÍO es el estado canónico
— lookup O(1) fallido, coste cero, las 108 cartas intactas.

Estrenar un script = 1 entrada en `CARD_SCRIPTS` + su carta apuntando al efecto
único. Smoke test end-to-end: `bun scripts/smoke-card-scripts.ts`.
