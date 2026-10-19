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

## 5. Sonoridad de clase (vocabulario del nombre)

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

## 7. Checklist para cartas nuevas

- [ ] ¿El nombre evoca la categoría correcta? (litmus test §1)
- [ ] ¿El nombre usa la imaginería de su spec? (§3)
- [ ] ¿El nombre SUENA a la clase? (vocabulario §5)
- [ ] ¿La spec queda en 2 Ataque + 1 Ítem + 1 Acción? (§2)
- [ ] Ítem: ¿el arte es un bodegón del objeto solo, sin manos ni brazos? (§4.3)
- [ ] Acción: ¿se ve a alguien ejecutando la acción y la escena se lee de un vistazo? (§4.3)
- [ ] Ataque: ¿el golpe está en plena ejecución por el portador de la spec? (§4.3)
- [ ] ¿El arte no mezcla clases (sin guerreros en cartas de mago, etc.)? (§4.4)
- [ ] ¿Anatomía correcta (brazos, manos)? (§4.5)
- [ ] ¿El id es el slug del nombre (`snake_case`, sin acentos) y existe `public/cards/{id}.png`?
