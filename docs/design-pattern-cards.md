# Patrón de Diseño — Cartas (Nombre × Tipo × Spec)

> Regla de oro: **el nombre de la carta juega con su tipo (categoría) y su spec (subtipo),
> y el arte se deriva del nombre + tipo + spec.** Si algo no concuerda, se corrige la
> carta (nombre y/o categoría), nunca se "deja pasar".

## 1. Semántica de categorías

| Categoría | Qué representa | Cómo se nombra | Ejemplos |
|-----------|----------------|----------------|----------|
| **Ataque** | Seres en combate y golpes dirigidos al rival | Criatura/unidad en actitud de combate (`Berserker Recluta`, `Acechador Nocturno`) o un acto de golpe (`Tajo Quebrantamuros`, `Golpe Fundidor`) | Salamandra Anciana, Colmillo del Verdugo, Aberración Arcana |
| **Ítem** | Objetos físicos: armas, armaduras, herramientas, cristales, pociones, libros | Sustantivo-objeto, a menudo `X de Y` (`Adarga del Centinela`, `Frasco de Peste`) | Hacha de Ejecución, Estoque Afilado, Carapacho Glacial, Grimorio Anotado |
| **Acción** | Hechos, eventos, rituales, tácticas — algo que OCURRE, no un objeto | Nombre verbal/eventual (`Oración del Bastión`, `Tormenta de Brasas`, `Sentencia Rápida`) | Veterano Caído (el homenaje a su caída), Toque de Guerra (la llamada del cuerno), Fundirse en Sombras, Nube Tóxica |

**Litmus test:** si puedes *sostenerlo* → Ítem. Si es *alguien luchando o golpeando* → Ataque.
Si es *algo que sucede* (rezo, tormenta, juicio, homenaje, fusión) → Acción.

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
| FUEGO | Mago | Llamas, brasas, salamandras, fundición |
| HIELO | Mago | Escarcha, glaciares, viento cortante, colosos de hielo |
| VENENO | Asesino | Toxinas, plagueas, hongos, frascos, contagio |
| COMBATE | Asesino | Duelo callejero, milicia, bandidismo, estoques |
| SIGILO | Asesino | Sombras, noche, cuchillas silenciosas, emboscadas |

## 4. Regla de arte

El arte de la carta **se deriva del nombre + categoría + spec**:

1. El sujeto del arte ES el nombre (la persona/objeto/evento que lo dice).
2. El ambiente/escena pertenece a la spec (imaginería de la tabla §3).
3. La pose/luz comunica la categoría: Ataque = acción violenta dinámica,
   Ítem = objeto protagonista (bodegón heroico), Acción = fenómeno/ritual en curso.
4. Estilo: pintura digital dark-fantasy, 432×576 (3:4), dramática, sin texto,
   sin bordes ni marcos (el marco lo pone la UI).

Plantilla de prompt usada en `scripts/gen-card-art-v3.mjs`:

```
Dark fantasy TCG card art, painted digital illustration, dramatic lighting,
square composition. Subject: {NOMBRE}. Scene: {imaginería de la spec}.
Mood: {según categoría: violent action / heroic object portrait / unfolding event}.
No text, no borders, no watermark, no UI elements.
```

## 5. Correcciones aplicadas (auditoría V3.1)

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
| Espada Candente (Ataque) | **Golpe Fundidor** (Ataque) | la espada es objeto; el golpe fundido es el ataque |
| Cristal Glacial (Ítem) | **Coloso de Escarcha** (Ataque) | reequilibrio 2/1/1 en HIELO: coloso que regenera escarcha |
| Cultivo de Hongos (Ítem) | **Espora Viviente** (Ataque) | ser vivo que crece cada turno (Fervor) |
| Estoque Afilado (Ataque) | Estoque Afilado (**Ítem**) | el estoque es un objeto |
| Cuchilla del Silencio (Ataque) | Cuchilla del Silencio (**Ítem**) | la cuchilla es un objeto |
| Capa de Sombras (Ítem) | **Fundirse en Sombras** (Acción) | reequilibrio 2/1/1 en SIGILO: el acto de fundirse |

## 6. Checklist para cartas nuevas

- [ ] ¿El nombre evoca la categoría correcta? (litmus test §1)
- [ ] ¿El nombre usa la imaginería de su spec? (§3)
- [ ] ¿La spec queda en 2 Ataque + 1 Ítem + 1 Acción? (§2)
- [ ] ¿El arte muestra el sujeto del nombre en la escena de la spec con la pose de la categoría? (§4)
- [ ] ¿El id es el slug del nombre (`snake_case`, sin acentos) y existe `public/cards/{id}.png`?
