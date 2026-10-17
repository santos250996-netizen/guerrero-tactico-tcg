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

## 🎯 PRINCIPIO CENTRAL — LA IMAGEN INTERPRETA EL EFECTO (obligatorio)
El TEXTO DEL EFECTO de la carta YA resume todo: trigger + keyword + objetivo
+ magnitud. La ilustración es la interpretación visual LITERAL de ese texto,
no del nombre solamente.
Antes de escribir el prompt, responder SIEMPRE:
1. ¿Qué dice el texto del efecto? (interpretación narrativa de la escena)
2. ¿Qué trigger lo dispara? (define el MOMENTO de la escena → sección TRIGGER)
3. ¿Qué keyword lo ejecuta? (define el LENGUAJE VISUAL → sección KEYWORD)
4. ¿A quién afecta? (el más fuerte / el más débil / todos / uno mismo / los demás)

## TRIGGER → COMPOSICIÓN (el momento narrativo ES el trigger)
| Trigger | Texto en carta | Momento de la escena |
|---------|----------------|----------------------|
| on_play | "Al Jugar:" | La acción en su CLÍMAX, sucediendo AHORA (mid-action) |
| start_turn | "Inicio de Turno:" | Amanecer/inicio: la energía EMPIEZA a fluir (primera chispa, primer rayo) |
| end_turn | "Fin de Turno:" | Ocaso/cierre: el efecto consumado en su APOGEO (onda máxima, día cerrándose) |
| on_death | "Último Aliento:" | Consecuencia POST-caída: la escena DESPUÉS del golpe fatal |

## KEYWORD → LENGUAJE VISUAL (el efecto debe ser reconocible)
Interpretación visual de cada keyword, tomada de su texto de efecto:
- **Fervor** ("gana +1 permanente"): crecimiento ACUMULATIVO — el poder está
  SUMÁNDOSE en escena (brasas que suben, filo que brilla más con cada pasada,
  aura en progreso). Nunca estático: siempre en proceso de crecer.
- **Coraza** ("escudo que absorbe las próximas X reducciones"): barrera FINITA
  sobre UNA entidad, con segmentos/runas visibles que sugieren cargas limitadas
  (un medidor que se puede agotar).
- **Insignia** ("+X al aliado más débil"): CONTRASTE — la figura más pequeña,
  agotada o maltrecha de la escena es la que RECIBE el poder de una fuente mayor.
- **Remate** ("destruye una carta con poder X o menos"): golpe de gracia sobre
  un enemigo YA VENCIDO — rodilla en el suelo, rendido, demasiado débil para
  resistir. El desenlace ya está decidido.
- **Legado** ("Último Aliento: el aliado más débil gana +X"): TRANSFERENCIA tras
  la muerte — el caído pasa su esencia/arma al superviviente más débil; la escena
  ocurre DESPUÉS del golpe fatal.
- **Fortaleza** ("todas tus cartas de este carril ganan +X"): TODOS los aliados
  en escena fortalecidos SIMULTÁNEAMENTE por una misma onda/fuente compartida.
- **Hender Armadura** ("reduce en X al más fuerte. Los escudos no lo impiden"):
  el impacto ATRAVIESA la barrera/escudo como si no existiera — la mejor
  protección del enemigo es irrelevante ante este golpe.
- **Duelista** ("gana +X mientras sea tu única carta"): SOLEDAD compositiva —
  UN solo campeón en toda la escena, nadie más; el espacio vacío refuerza la
  condición de unicidad.
- **Amparo** ("tus demás cartas ganan un escudo de X"): uno OTORGA escudos a
  los DEMÁS — fuente central + varios receptores con barreras recién formadas.
- **Purificación** ("elimina las reducciones acumuladas"): la corrupción SE ESTÁ
  EXTRAENDO — humo oscuro saliendo de los cuerpos, luz limpia entrando en su lugar.
- **Ímpetu** ("gana +X por cada carta jugada este turno"): MOMENTUM acumulado —
  estelas/ecos de movimiento múltiples, cada eco representa una acción previa
  que sumó poder.
- **Crueldad** ("reduce en X al enemigo más débil"): DEPREDADOR que elige a la
  presa más débil — mirada fría fijada en el enemigo herido/tambaleante,
  misericordia cero.

Al diseñar una keyword NUEVA: añadir aquí su interpretación visual ANTES de
generar su arte.

## SUGERENCIAS POR CARRIL (variedad, no camisa de fuerza)
- **ARMAS**: metal forjado con historia (mellado, grabado, oxidado), técnica y
  precisión de duelo, armas protagonista del impacto.
- **PROTECCIÓN**: barreras translúcidas, formaciones, luz defensiva dorada/azulada,
  geometría de escudos.
- **FURIA**: PROHIBIDO el acero pulido — pintura de guerra, músculo y tatuajes
  expuestos, cuero crudo, huesos, pieles, brutalidad depredadora.

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

## FÓRMULA DEL PROMPT (orden obligatorio)
PROMPT = [interpretación del efecto en escena] + [raza WoW + variedad según
nombre/categoría/subtipo] + [composición del trigger] + BASE_PROMPT

## PROMPT BASE (sufijo para TODAS las generaciones)
Stylized realism, visible brushstrokes, NOT photorealistic, NOT 3D render, full art no borders no frame full bleed, Hearthstone card art style, vibrant saturated colors reflecting the scene's theme, dramatic lighting with strong rim light, high contrast, epic heroic mood, Blizzard Entertainment concept art, flat color zones in shadows, exaggerated heroic proportions, fantasy card game illustration, NO text in image.
