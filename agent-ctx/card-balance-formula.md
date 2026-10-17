# Fórmula de Balance de Cartas (PTP) — Documentación para Programadores

> Esta es una herramienta **interna** para los programadores del TCG Guerrero Táctico.
> NO es una UI visible para el jugador. Se usa al crear o modificar cartas en
> `src/lib/game/cards.ts` para validar que cumplen la fórmula de balance.

## Fórmula matemática

```
PTP_Total = Poder_Base + Σ (Valor_Keyword × Mod_Trigger × Mod_Scope × Mod_Once)
```

```
PTP_Objetivo = (Coste_Energía × 4.0) + 1.5     [Tolerancia: ±0.5]
```

### Implementación

La fórmula vive en [`src/lib/game/balance.ts`](../src/lib/game/balance.ts):

| Función | Qué hace |
|---|---|
| `getTargetPTP(cost)` | Devuelve `cost × 4.0 + 1.5` |
| `getPTPRange(cost)` | Devuelve `{ min, target, max }` con tolerancia ±0.5 |
| `getTriggerModifier(trigger)` | Devuelve el multiplicador del trigger (ver tabla abajo) |
| `getKeywordBaseValue(keyword, X)` | Devuelve el Valor_Keyword base para esa keyword con magnitud X |
| `calculateEffectPoints(card)` | `Valor_Keyword × Mod_Trigger` (Puntos_Efecto de la carta) |
| `getCurrentPTP(card)` | `card.power + calculateEffectPoints(card)` (PTP actual) |
| `getBalanceInfo(card)` | Devuelve `{ target, current, delta, status, range, ... }` |
| `isCardBalanced(card)` | Booleano: `|delta| ≤ 0.5` |

Constantes exportadas desde [`src/lib/game/types.ts`](../src/lib/game/types.ts):
- `TRIGGER_MODS: Record<Trigger, number>` — multiplicadores por trigger
- `SCOPE_MODS = { PROPIO: 1.0, CARRIL_LOCAL: 1.2, CARRIL_LOCAL_ADYACENTE: 1.4, MANO: 1.2, GLOBAL: 1.5 }`
- `MOD_ONCE_SINGLE = 1.0` (efecto único)
- `MOD_ONCE_PER_TURN = 0.8` (efecto que se repite indefinidamente)

## Tabla de Modificadores

### Mod_Trigger (cuándo se dispara el efecto)

| Trigger | Mod | Nota |
|---|---|---|
| `on_play` | ×1.0 | Efecto único instantáneo — valor pleno |
| `passive` | ×1.2 | Permanente en mesa — bonus por duración |
| `start_turn` | ×1.3 | Continuo, suele dispararse 6 veces — máximo |
| `end_turn` | ×1.2 | Continuo turno a turno |
| `on_death` | ×0.8 | Solo al morir — condicional, menos valioso |
| `umbral` | ×0.7 | Requiere condición previa — menos confiable |
| `reaction` | ×1.2 | Condicional a acción del rival — bonus por reactividad |

> **Nota**: Estos mods reflejan el estado ACTUAL del motor (legacy). En la spec
> 2026-10 los valores canónicos son: on_play=1.0, passive=1.1, start_turn=1.0,
> end_turn=1.0, on_death=1.0, umbral=1.1, reaction=1.2 (ver `TRIGGER_MODS` en
> `types.ts`). Migrar `getTriggerModifier` a esos valores canónicos re-auditaría
> todas las 94 cartas y muchas probablemente marcarían como desbalanceadas.

### Mod_Scope (dónde impacta el efecto)

| Scope | Mod | Ejemplo de keyword |
|---|---|---|
| `PROPIO` | ×1.0 | Ventaja, Vanguardia, Aislado, Frenesí |
| `CARRIL_LOCAL` | ×1.2 | Sacrificio, Remate, Trampa, Vínculo, Cúpula, Guardián |
| `CARRIL_LOCAL + ADYACENTE` | ×1.4 | Doble Golpe |
| `MANO` | ×1.2 | Celeridad, Sobrecarga, Eco, Renovación |
| `GLOBAL` | ×1.5 | Mimetismo, Reagrupar, Transferencia |

### Mod_Once (duración del efecto)

| Mod | Cuándo aplica |
|---|---|
| `1.0` | Efecto único (one-shot) — la mayoría de keywords |
| `0.8` por turno | Efecto que se repite indefinidamente (passive, start_turn, etc.) |

## Tabla PTP objetivo por coste

| Coste | PTP objetivo | Rango permitido (±0.5) |
|---|---|---|
| 1 | 5.5 | 5.0 - 6.0 |
| 2 | 9.5 | 9.0 - 10.0 |
| 3 | 13.5 | 13.0 - 14.0 |
| 4 | 17.5 | 17.0 - 18.0 |
| 5 | 21.5 | 21.0 - 22.0 |

## Valor_Keyword (tabla de referencia)

Valor base numérico de cada keyword si se activara una vez en condiciones medias.
Para keywords con `[X]`, el valor escala con X.

### Keywords con [X] (valor escala con X)

| Keyword | Valor(X=2) | Nota |
|---|---|---|
| `sacrificio` | 2.00 | bonus = X (aliado perdido compensa) |
| `remate` | 2.00 | daño/destrucción = X |
| `celeridad` | 1.50 | ahorro de 1 energía, valor ~1.5 (fijo) |
| `sobrecarga` | 2.00 | bonus = X |
| `eco` | 2.00 | bonus = X (asume 1 carta compartida en mano) |
| `refuerzo` | 2.00 | bonus = X |
| `ventaja` | 1.40 | condicional 50%, ×0.7 |
| `vanguardia` | 1.40 | condicional 50%, ×0.7 |
| `aislado` | 1.40 | condicional 50%, ×0.7 |
| `trampa` | 2.00 | debuff = X |
| `ultimo_aliento` | 2.00 | on_death transfer = X |
| `vinculo` | 2.00 | bonus self = X |
| `retorno` | 2.00 | recursión = X |
| `doble_golpe` | 4.00 | dos carriles, 2×X |
| `refugio` | 2.00 | absorbe X debuff |
| `emboscada` | 1.00 | condicional 30%, ×0.5 |
| `transferencia` | 2.00 | neto 0, valor posicional = X |
| `renovacion` | 1.00 | X-1 (descarta 1 carta) |
| `sangrado` (Etapa 3) | 2.00 | debuff progresivo por turno |
| `frenesi` (Etapa 3) | 2.00 | bonus acumulativo por disparo |
| `enrabia` (Etapa 2) | 2.00 | one-shot +X la primera vez |
| `espinas` (Etapa 2) | 2.00 | counter-debuff al atacante |
| `cupula` (Etapa 2) | 2.00 | absorbe X puntos de debuff |
| `perforacion` (Etapa 2) | 2.00 | bypass X de prevención |
| `desarme` (Etapa 3) | 2.00 | reduce X del keywordValue enemiga |
| `mejora` (Etapa 3) | 2.00 | +X permanente a aliada |

### Keywords sin [X] (valor fijo)

| Keyword | Valor | Nota |
|---|---|---|
| `mimetismo` | 4.00 | copia efecto del aliado más fuerte (promedio) |
| `reagrupar` | 3.00 | valor posicional |
| `baluarte` | 4.00 | aura valiosa (inmunidad a debuffs) |
| `sigilo` | 3.00 | inmunidad primer turno |
| `muro` | 3.00 | control posicional |
| `guardian` (Etapa 2) | 4.00 | redirección (similar a baluarte) |
| `ofrenda` (Etapa 3) | 0.00 | flag para sinergia con Sacrificio |
| `none` | 0.00 | sin keyword |

## Cómo usar el script de auditoría

### Listar todas las cartas

```bash
bun run scripts/audit-card-balance.ts
```

Lista las 94 cartas de `ALL_CARDS` con: nombre, coste, poder, puntos de efecto,
PTP actual, PTP objetivo, delta y status (BALANCED/MARGINAL/SOBREPUESTO/FALTANTE).

### Solo las desbalanceadas

```bash
bun run scripts/audit-card-balance.ts --unbalanced
```

Filtra y muestra solo las que tienen `|delta| > 0.5`, con sugerencias de ajuste:
- Si mantenés el coste X: ajustá poder Y → Z
- Si mantenés el poder Y: ajustá coste X → Z

### Solo el resumen

```bash
bun run scripts/audit-card-balance.ts --summary
```

Muestra solo los contadores finales: cuántas balanceadas / marginales / desbalanceadas.

### Estado actual (snapshot 2026-10-16)

Corrimiento la auditoría sobre las 94 cartas existentes:

```
✓ Balanceadas (|Δ| ≤ 0.5):    43/94 (45.7%)
~ Marginales  (|Δ| ≤ 1.0):    9/94  (9.6%)
✗ Desbalanceadas (|Δ| > 1.0): 42/94 (44.7%)
Δ absoluto promedio: 1.41 puntos
```

La mayoría de las desbalanceadas están **FALTANTES** (PTP actual < PTP objetivo),
lo que significa que las cartas existentes tienden a ser más débiles de lo que
la fórmula sugiere. Esto puede ser intencional (el juego se siente más rápido
con cartas de bajo poder) o puede requerir un rebalanceo.

## Cuándo correr la auditoría

- **Al añadir una carta nueva** a `cards.ts` o a un pool de test: corré
  `bun run scripts/audit-card-balance.ts --unbalanced` para ver si la nueva
  carta aparece en la lista (significa que no cumple la fórmula).
- **Al cambiar el poder/coste/keyword de una carta existente**: el script te
  mostrará si el cambio la sacó del rango balanced.
- **Al añadir un keyword nuevo**: la función `getKeywordBaseValue` debe incluir
  un case para el nuevo keyword, sino su valor defaultea a 0 y las cartas con
  esa keyword parecerán "FALTANTE" en la auditoría.

## Limitaciones conocidas

1. **Una keyword por carta**: la fórmula asume que cada carta tiene una sola
   keyword. Si en el futuro se soportan múltiples keywords por carta, hay que
   iterar y sumar.
2. **Scope no se multiplica**: actualmente la fórmula solo multiplica por
   `Mod_Trigger`, no por `Mod_Scope`. Si querés ser más estricto, modificá
   `calculateEffectPoints` en `balance.ts` para que también multiplique por
   el scope declarado en la carta (requeriría añadir un campo `scope` a
   `CardDef` o derivarlo del keyword).
3. **Mod_Once no se aplica**: `MOD_ONCE_PER_TURN = 0.8` para keywords que
   se repiten (passive, start_turn, end_turn) está definido pero no se aplica
   en `calculateEffectPoints`. Se podría añadir un check.
4. **Trigger mods legacy**: los valores en `getTriggerModifier` son legacy
   (passive=1.2, start_turn=1.3, etc.) y NO coinciden con los valores
   canónicos de `TRIGGER_MODS` en `types.ts`. Migrar requiere re-auditar todas
   las cartas.
