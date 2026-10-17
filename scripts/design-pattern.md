# DESIGN PATTERN — Arte de Cartas TCG

## ESPECIFICACIONES TÉCNICAS
- Resolución: 432×576 px (mitad de 864×1152, sigue siendo 2x retina)
- Formato: PNG optimizado (~400KB por imagen)
- Compresión: PIL Image.LANCZOS + PNG optimize=True
- Cache-Control: public, max-age=31536000, immutable (1 año)
- NO generar a 864×1152 — desperdicia espacio, las cartas se muestran a máx 224px

## REGLAS GLOBALES (todas las cartas)
- **Full art**, sin bordes, sin marco, full bleed
- **Stylized realism**: pinceladas visibles, NO fotorrealista, NO 3D render
- Estilo Hearthstone / Blizzard concept art
- Colores vibrantes y saturados que reflejen el tema de la escena
- Iluminación dramática con rim light, contraste alto
- Proporciones heroicas exageradas
- Mood épico heroico
- Razas WoW: orco, no-muerto, tauren, elfo nocturno, elfo de sangre, enano, draenei, worgen (hombrelobo), goblin, gnomo, troll, ogro, demonio, humano
- Sin texto en la imagen
- La ilustración refleja el nombre de la carta mediante la acción/escena

## ⚠️ VARIEDAD VISUAL — REGLA OBLIGATORIA
CADA carta debe verse ÚNICA. El estilo visual debe tener sentido con:
- **Nombre** de la carta
- **Disparador** (on_play, passive, start_turn, end_turn, on_death, umbral)
- **Tipo** de carta (Ataque, Ítem, Acción)
- **Subtipo(s)** (armas, proteccion, furia)
- **Keyword** asignada

NO todo debe ser armadura de acero pulido estilo cruzado. La variedad es
LIBRE siempre y cuando tenga coherencia con los 5 elementos de arriba.
Ejemplos de variación (NO exhaustivos, solo inspiración):
- Armaduras desgastadas/sucias con abolladuras, óxido, barro
- Ropa vikinga/bárbara: cuero, pieles, trenzados, tatuajes tribales
- Escudos de MADERA con bandas de hierro
- Equipo improvisado: huesos, cuerdas, cuero crudo
- Músculos expuestos, pintura de guerra (estilo furia)
- Túnicas de nigromante, calaveras, energías oscuras
- Chatarra, engranajes, vapor (estilo goblin/ingeniero)
- Sedas, runas, energía arcana (estilo místico/elfo)
- Pieles rotas, armas melladas, armaduras destruidas
- Plumas, máscaras, huesos tribales (estilo jungla)
Lo importante es que la elección visual REFUERCE lo que la carta HACE,
no que se vea genérica.

## CARTAS DE ATAQUE (3 enfoques posibles)
- 1ª persona: Solo el arma ejecutando el ataque contra algo/alguien
- 3ª persona: Una raza ejecutando el ataque contra otra criatura u objeto
- Pos-ataque: El efecto que dejó el ataque (consecuencia visible)

## CARTAS DE ACCIÓN
- Siempre una raza realizando la acción que dice el nombre
- Cualquier perspectiva (1ª/2ª/3ª persona)
- La acción debe ser visualmente clara

## CARTAS DE ÍTEM
- Una raza usando o sosteniendo el ítem
- El ÍTEM es el protagonista visual (más grande/brillante/detallado que el personaje)

## PROMPT BASE (sufijo para TODAS las generaciones)
Stylized realism, visible brushstrokes, NOT photorealistic, NOT 3D render, full art no borders no frame full bleed, Hearthstone card art style, vibrant saturated colors reflecting the scene's theme, dramatic lighting with strong rim light, high contrast, epic heroic mood, Blizzard Entertainment concept art, flat color zones in shadows, exaggerated heroic proportions, fantasy card game illustration, NO text in image.
