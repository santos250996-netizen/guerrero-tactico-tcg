# ARQUETIPOS DE CLASE — Test de Identidad de Keywords (2026-10)

> Origen: petición del jugador — «haz un test de las keywords para que cada clase
> se sienta única; no hay un estilo de juego definido tipo arquetipo; al final solo
> se tiran cartas con inicio/fin de turno porque son las más fuertes».
>
> Herramienta permanente: `scripts/audit-arquetipos.ts` (bun scripts/audit-arquetipos.ts [N espejo] [N A2/A3/A4])

---

## 1. Qué mide el test

| Capa | Método | Qué responde |
|------|--------|--------------|
| **A — Estática** | Pool jugable de cada clase (`classCardsOf`): mix de triggers + **VED** (Valor Entregado Esperado = poder + X × procs × alcance sobre 6 turnos) | ¿El mazo óptimo sobre el papel degenera en INICIO+FIN? |
| **B — Dinámica** | Simulación espejo IA-vs-IA (mitad mazo I, mitad II) con estadísticas por keyword (`keyword-stats`) | ¿Qué keywords mueven poder REAL y cuáles están dormidas (noop%)? |
| **A2** | Mazo óptimo VED vs mazos oficiales | ¿El deckbuilding "óptimo" gana al oficial? |
| **A3** | Top-12 SOLO inicio/fin vs top-12 SOLO one-shot | Test directo del hipótesis del jugador |
| **A4** | All-in stack vs campo real (oficiales I+II) | ¿El stack es un arquetipo sano o degenerado? |

## 2. Hallazgos del audit (pre-parche)

1. **MUERTE (Último Aliento) era decorativa**: 0 procs en todos los espejos —
   la mortalidad del juego es mínima y 31 cartas pagaban presupuesto completo
   por un efecto que no ocurre. Fuego ("explota al morir") era identidad de papel.
2. **Las neutrales llevaban la identidad**: Coraza era la keyword #1 real de
   Guerrero, Mago, Botánico, Pirata y Tinker; Fortaleza la #1 de FIN en 4 clases.
   Las firmas de clase quedaban por debajo.
3. **Firmas dormidas con datos**: veneno 1.3% del poder del Asesino, torreta
   noop 35% (los escudos la bloqueaban — y Coraza estaba en TODOS los mazos),
   simbiosis noop 51%, insignia noop 25-48%.
4. **El jugador tenía razón a medias**: el stack de inicio/fin NO ganaba en la
   sim con mazos oficiales (80-92% del poder real era JUGAR), PERO el test A3
   (stack puro vs one-shot puro) le dio la razón estructural: 60-95% en 5 de 6
   clases. El descuento `MOD_ONCE_PER_TURN=0.8` + la acumulación de Fortalezas
   lane-wide eran el subsidio degenerativo.
5. **El stack ganador medible**: Botánico apilando 3 Fortalezas (Coro de Setas
   X4 + Círculo X2 + Tripa X1 = +7/turno por carril) ganaba 68-73% de los espejos.

## 3. Parche aplicado (Arquetipos v1)

### Sistémico
| Cambio | Archivo | Justificación |
|--------|---------|---------------|
| `MOD_ONCE_ON_DEATH = 0.5` (nuevo) | `types.ts`, `balance.ts` | MUERTE paga mitad de presupuesto; el sobrante vuelve como PODER (31 cartas recalibradas, PTP 192/192 ✓) |
| `MOD_ONCE_PER_TURN 0.8 → 1.0` | `types.ts` | Los `KEYWORD_BASE_VALUES` YA codificaban los procs de vida media; el 0.8 era un segundo subsidio (A3: stack 60-95%) |
| **Fortaleza NO se acumula**: solo la de mayor X dispara por carril (empate: primera colocada) | `engine.ts` + 12 textos | El patrón degenerativo exacto que reportó el jugador (+7/turno con 3 Fortalezas apiladas) |
| Recorte ~20-27% de `KEYWORD_BASE_VALUES` en los 12 motores de crecimiento/recurrencia (fervor, fortaleza, estación, tripulación, duelista, desafío, engranaje, escarcha, crueldad, ventisca, contagio, torreta) | `balance.ts` | Reequilibrar el valor de vida completa; poderes recalibrados por script |

### Identidad (firmas dormidas → vivas)
| Keyword | Clase | Cambio |
|---------|-------|--------|
| **Veneno** | Asesino | Colmillos Curvos X1→2, Serpiente X2→3 (anti-tanque de verdad) |
| **Torreta** | Tinker | Ahora PERFORA escudos («el rayo salta los escudos») — noop 35%→0 frente al meta de Coraza |
| **Crueldad** | Guerrero | Colmillo X1→2, Furia Desatada X2→3 (presión de Furia real) |
| **Ventisca** | Mago | Viento Cortante X1→2 (control de Hielo real) |
| **Simbiosis** | Botánico | Cuenta EMPATES (≤): noop 51%→0 |

### Anti-stack Botánico
- Coro de Setas X4→3 (con recalibración de poder), regla anti-Fortaleza sistémica.
- Resultado A2 del stack botánico: 68-73% → 48-57% (dentro de la compuerta).

## 4. Arquetipos definidos (spec de diseño)

| Clase | Arquetipo | Motor del arquetipo |
|-------|-----------|---------------------|
| **Guerrero** | LÍNEA DE BATALLA — el muro que avanza | Escudos (Amparo/Custodia) + rompe-armaduras (Hender) + presión FIN (Crueldad X2) |
| **Mago** | RÁFAGA — golpes enormes y puntuales | Burst arcano (Sobrecarga/Convergencia) + AoE (Llamarada/Ventisca X2) + Último Aliento de fuego ya honesto |
| **Asesino** | CAZA SELECTIVA — eliminar la pieza clave | Veneno X2-3 perforante, Purga/Remate, escalada de mano (Emboscada/Conspiración) |
| **Botánico** | ENJAMBRE TARDÍO — crecer para ganar el final | Estación (madura T4), Micelio (escudos de red), Floración/Simbiosis de multitud |
| **Pirata** | SAQUEO — tu poder es mío | Saqueo/Motín (robo), Contrabando (economía), pólvora multi-carril (Canonazo/Andanada) |
| **Tinker** | MAQUINARIA — el engranaje que todo lo compone | Remache (escudo en masa), sinergia de Ítems (Sobrecalentar/Engranaje), Chispa anti-élite (Torreta perforante) |

## 5. Veredicto post-parche (números)

- **PTP**: 192/192 cartas en rango ±0.5 (`scripts/audit-balance.ts`).
- **A2** (mazo óptimo VED vs oficial): todas las clases ≤57% (antes Botánico 72.7%).
- **A4** (all-in stack vs campo real): Guerrero 53.3% · Mago 55.2% · Tinker 53.4% —
  arquetipo fuerte pero ganable; en Asesino/Botánico/Pirata ni se puede construir.
- **A3** (extremo artificial stack puro vs one-shot puro): sigue alto en 3 clases —
  es la cota superior teórica, no un estado alcanzable del juego real (los pools
  limitan el stack y las curvas de coste difieren). Queda documentado como
  semáforo de diseño para futuras tandas.
- **Hallazgo preexistente (fuera de alcance de este parche)**: el sim entre
  clases (`scripts/sim-clases-v3.ts`) ya estaba fuera de la compuerta 45-55%
  ANTES del parche (Botánico↔Mago 29.4%, Pirata↔Tinker 67.6%). Requiere afinar
  las reglas sistémicas V3_* del engine en una tanda propia.

## 6. Cómo re-ejecutar

```bash
bun scripts/audit-arquetipos.ts 20 30   # audit completo (espejo + A2/A3/A4)
bun scripts/audit-balance.ts            # PTP del catálogo completo
bun scripts/sim-clases-v3.ts 40         # winrates entre clases
bun scripts/sim-keywords.ts 40          # poder/noop por keyword
```
