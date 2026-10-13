# Task recreate-core — Work Record

**Task ID**: recreate-core
**Agent name**: core-update-agent
**Date**: 2025-01-01
**Status**: ✅ Complete

## Objective
Update 3 core game files for a WoW TCG card game (Guerrero Táctico) built with Next.js 16 + TypeScript + Zustand:
1. `src/lib/game/cards.ts` — rewrite to add rarity + 12 BASIC_CARDS + 15 TACTICAL_CARDS + `buildDrawPileFrom` helper
2. `src/lib/game/engine.ts` — extract `applyEffectLogic` helper, add 15 new effect cases, `TrapState`/`LaneTraps` types, `activeTrap` parameter on `playCard`, update `scoreAIPlay`/`planEnemyTurn`, add `lowestPowerCard`, update `getEffectLabel`
3. `src/store/gameStore.ts` — import `sfx`/`useSettings`, add new state (`laneTraps`, `nextTurnEnergyPenalty`, `floatingNumbers`, `aiTurnPhase`, `previewCard`, `gameStats`, `undoSnapshot`, `legendaryBurst`, `view`, `cardPool`, `deckCardIds`, `deckDirty`, `deckSaveStatus`, `deckLoading`), add actions (`setView`, `loadDeckAndPool`, `swapCardInDeck`, `saveDeck`, `resetDeck`, `setPreviewCard`, `undoLastPlay`), wire sounds + stats + floating numbers + traps + energy penalty in `playSelectedCardIntoLane` and `endTurn`

## Pre-flight reading
- `src/lib/game/types.ts` — already updated with `Rarity`, expanded `EffectId`, `RARITY_META`. Confirmed spelling `mimetismo` (the task spec's `mimetimo` is a typo).
- `src/lib/sound.ts` — exports `sfx` with all needed cues (`click`, `select`, `cardPlay`, `buff`, `debuff`, `remove`, `turnPass`, `enemyTurn`, `trapTrigger`, `victory`, `defeat`, `draw`).
- `src/lib/settings.ts` — exports `useSettings` store with `soundOn` / `animationsOn` flags.
- `src/app/api/cards/route.ts` and `src/app/api/deck/route.ts` — already import `BASIC_CARDS, TACTICAL_CARDS, WARRIOR_DECK` so my updated cards.ts stays compatible.
- `src/components/game/DeckEditor.tsx` — already references `cardPool`, `deckCardIds`, `deckDirty`, `deckSaveStatus`, `setView`, `saveDeck`, `resetDeck`, `swapCardInDeck`, `setPreviewCard`, `previewCard`. My store API matches these expectations exactly.
- `src/components/game/FloatingNumbers.tsx`, `LegendaryBurst.tsx`, `TurnTransitionBanner.tsx` — visual consumers of the new state. Confirmed `FloatingNumber` shape `{ id, uid, value }` and `LegendaryBurst` trigger signature.

## Files written

### `src/lib/game/cards.ts` (full rewrite)
- **WARRIOR_DECK** (12 cards): kept all 12 existing card definitions; added `rarity: "rare"` to each (and `"legendary"` for `avatar_titan`).
- **BASIC_CARDS** (12 cards): all `rarity: "common"`, `effectId: "none"`, with descriptive `text: "Sin efecto. ..."` lines.
  - `recluta/Cadete` (Ataque, armas, 1/7), `aprendiz/Grito Salvaje` (Magia, furia, 1/6), `sanador/Vendas de Guerra` (Ítem, proteccion, 1/6), `soldado/Legionario` (Ataque, armas+proteccion, 2/10), `guardia/Centinela` (Ítem, proteccion+armas, 2/9), `veterano/Sargento` (Ataque, armas, 3/13), `mago_joven/Berserker` (Magia, furia, 3/12), `caballero/Espadachín` (Ataque, armas, 4/18), `paladin/Caudillo` (Magia, proteccion+furia, 4/17), `muro_hierro/Bastión` (Ítem, proteccion+armas, 4/17), `campeon/Campeón Sanguinario` (Ataque, armas+furia, 5/22), `hechicero/Señor de la Guerra` (Magia, furia+proteccion, 5/21).
- **TACTICAL_CARDS** (15 cards):
  - 12 **epic**: `herida_letal`, `carga_devastadora`, `asalto_coordinado`, `burla_sadica`, `sobrecarga`, `purificacion`, `tormenta_rayos`, `trampa_eterea`, `reflejo_arcano`, `venganza`, `mimetismo`, `empuje_tactico` — each with the exact `text` from the spec.
  - 3 **legendary**: `colera_titan`, `despertar_bélico`, `trono_hierro`.
- **`buildDrawPileFrom(deck: CardDef[]): CardDef[]`** — Fisher-Yates shuffle over a shallow-cloned deck. Each card is `{ ...c }` so the returned pile is safe to mutate.
- **`buildDrawPile()`** — returns `buildDrawPileFrom(WARRIOR_DECK)` for backward compatibility.

### `src/lib/game/engine.ts` (updated)
- `STARTING_HAND_SIZE` 4 → **5**; `MAX_HAND_SIZE` 5 → **7**.
- New exported interfaces/types:
  - `TrapState { owner: "player" | "enemy"; value: number }`
  - `LaneTraps = Record<LaneId, TrapState | null>`
  - `emptyLaneTraps()` returns `{ armas: null, proteccion: null, furia: null }`.
- `EffectResult` extended with: `removedCards: RemovedCard[]`, `movedCards: MovedCard[]`, `newTrap?: TrapState`, `energyNextTurnDelta?: number`. Internal interfaces `RemovedCard`, `MovedCard`, `EffectAccumulator` added.
- New helper **`applyEffectLogic(effectId, ctx, allyLane, enemyLane, enemySide, accum)`** extracted from `computeEffect`. The original 12 base effects were moved here verbatim, plus the 15 new effects:
  1. `herida_letal` — `-3` to strongest enemy; if reaches `0`, push to `removedCards`.
  2. `carga_devastadora` — mutation `+= currentPower` on weakest ally (doubles it).
  3. `asalto_coordinado` — `bonusPower += allies in OTHER lanes`.
  4. `burla_sadica` — `+4` if enemy power > ally power in lane.
  5. `sobrecarga` — `energyNextTurnDelta = -1` (cost reduction handled separately by `getFinalCost`).
  6. `purificacion` — remove weakest ally; `bonusPower += its currentPower + 3`.
  7. `tormenta_rayos` — `-2` to up to 4 enemy cards across the whole board.
  8. `trampa_eterea` — `newTrap = { owner: side, value: 3 }`.
  9. `reflejo_arcano` — `bonusPower += strongest enemy's currentPower`.
  10. `venganza` — `+6` if `enemyPower - allyPower > 5`.
  11. `mimetismo` — find strongest ally; if its `effectId` is not `"mimetismo"` or `"none"`, **recursively** call `applyEffectLogic` with that `effectId` on the SAME accumulator.
  12. `empuje_tactico` — find weakest ally in OTHER lanes; push `MovedCard` (only if target lane has room — checked via `getLaneMaxCards(ctx.laneBonus)`).
  13. `colera_titan` — push ALL enemy cards in this lane to `removedCards`.
  14. `despertar_bélico` — `+3` to ALL cards in hand (`handMutations`).
  15. `trono_hierro` — `+3` to ALL ally cards on board (every lane).
- `computeEffect` now creates an `EffectAccumulator`, calls `applyEffectLogic(card.effectId, ...)`, then adds `accum.bonusPower` to `finalPower`. The return shape is built from the accumulator.
- New helper **`lowestPowerCard(cards)`** — symmetric to `highestPowerCard`.
- New helper **`getFinalCost(baseCost, bonus, effectId)`** — combines `getEffectiveCost` with the Sobrecarga `-1` (min 1) discount. Used in `playCard`, `scoreAIPlay`, `planEnemyTurn`, and the store's `canPlaySelected`/`playSelectedCardIntoLane`.
- `playCard` signature gained **`activeTrap: TrapState | null`** as the 8th parameter. Behavior:
  - Cost validation uses `getFinalCost` (so Sobrecarga is correctly priced).
  - After `computeEffect`, if `activeTrap` exists and `owner !== side`, reduce `finalPower` by `trap.value` (clamped at 0) and set `trapTriggered = true`.
  - After applying mutations, apply `removedCards` (filter from board) and `movedCards` (move between lanes, skipping if target lane is full).
  - `BoardCard` now carries `rarity: handCard.rarity`.
  - `PlayResult` extended with: `removedCards`, `movedCards`, `trapTriggered`, `newTrap?`, `energyNextTurnDelta?`.
- `scoreAIPlay` signature gained **`activeTrap: TrapState | null`** as the 7th parameter. Uses `getFinalCost` for cost, passes `activeTrap` to `playCard` for the simulation, and adds small score nudges for `tormenta_rayos`, `colera_titan`, `trono_hierro`, `despertar_bélico`, removed player cards, and trap-kill avoidance.
- `planEnemyTurn` signature gained **`laneTraps: LaneTraps`** as the 5th parameter. Maintains its own `workTraps` copy, passes per-lane traps to `scoreAIPlay`/`playCard`, and consumes/installs traps as plays execute (clear on `trapTriggered`, set on `newTrap`).
- `getEffectLabel` extended with labels for all 15 new effect IDs.

### `src/store/gameStore.ts` (updated)
- New imports: `sfx` from `@/lib/sound`, `useSettings` from `@/lib/settings`, `buildDrawPileFrom` + `WARRIOR_DECK` from cards, `emptyLaneTraps` + `type LaneTraps` + `type TrapState` + `getFinalCost` from engine, `CardDef` type.
- New auxiliary types: `FloatingNumber { id, uid, value }`, `GameStats { cardsPlayedByPlayer, cardsPlayedByEnemy, buffsApplied, debuffsToEnemy, enemyCardsDestroyed, laneTurnarounds, totalEnergyUsed }`, `UndoSnapshot { board, hand, energy, laneTraps, nextTurnEnergyPenalty, gameStats }`.
- New state fields initialized:
  - `laneTraps: emptyLaneTraps()`, `nextTurnEnergyPenalty: 0`, `floatingNumbers: []`, `aiTurnPhase: "idle"`, `previewCard: null`, `gameStats: emptyGameStats()`, `undoSnapshot: null`, `legendaryBurst: false`, `view: "game"`, `cardPool: []`, `deckCardIds: []`, `deckDirty: false`, `deckSaveStatus: "idle"`, `deckLoading: false`.
- `freshHandFromPile` now applies the **ensureCost1** guarantee: if the starting hand has no cost-1 card and the pile has one, swap in the cost-1 card (push back the highest-cost card to keep pile size).
- `resolveDeck(state)` helper: builds the deck from `state.cardPool` + `state.deckCardIds`, falling back to `WARRIOR_DECK` if pool is empty or any id is missing.
- `initGame` — uses `resolveDeck(get())` + `buildDrawPileFrom(resolved)`, and initializes all the new state fields.
- `selectCard` — plays `sfx.select()` if sound is on.
- `canPlaySelected` — uses `getFinalCost(card.cost, laneBonus, card.effectId)` instead of `getEffectiveCost`, so Sobrecarga is correctly priced.
- `playSelectedCardIntoLane`:
  - Pre-flight cost check uses `getFinalCost`.
  - Reads `activeTrap = state.laneTraps[lane]` and passes it to `playCard`.
  - Saves an `UndoSnapshot` before the play (single-level undo).
  - Plays sounds via `sfx.cardPlay/buff/debuff/remove/trapTrigger` (gated by `useSettings.getState().soundOn`).
  - Pushes one `FloatingNumber` per mutation (cleared after 1.5s via `setTimeout` → `clearFloatingNumbers`).
  - Updates `gameStats`: `cardsPlayedByPlayer++`, `buffsApplied`, `debuffsToEnemy`, `enemyCardsDestroyed`, `totalEnergyUsed += effCost`, and `laneTurnarounds++` when the player went from `<= enemyPower` to `> enemyPower` in that lane.
  - Updates `laneTraps`: clears on `trapTriggered`, sets on `newTrap`.
  - Updates `nextTurnEnergyPenalty` by adding `res.energyNextTurnDelta` (Sobrecarga).
  - Sets `legendaryBurst: card.rarity === "legendary"` (auto-clears after 1.9s).
  - Pushes log entries for buffs/debuffs, removed cards (with reason), moved cards, trap trigger, new trap.
- `endTurn` is now **async**:
  - Plays `sfx.click()` immediately (the "Pasar" button click).
  - Sets `aiTurnPhase: "banner"` + `phase: "enemy"`, plays `sfx.turnPass()`, `await sleep(1500)`.
  - Sets `aiTurnPhase: "thinking"`, plays `sfx.enemyTurn()`, `await sleep(450)`.
  - Re-reads fresh state (after awaits) — uses `resolveDeck` to build the enemy's draw pool from the same customized deck as the player (or `WARRIOR_DECK` fallback).
  - Calls `planEnemyTurn(board, enemyHand, energy, laneBonuses, laneTraps)` — passes the new `laneTraps` parameter.
  - Re-executes each AIPlay on the real board (passing `workTraps[play.lane]` as `activeTrap`), updating `workTraps` on each `trapTriggered` / `newTrap`.
  - Plays `sfx.cardPlay`/`buff`/`debuff`/`remove`/`trapTrigger` for each enemy play.
  - Tracks enemy-side stats: `cardsPlayedByEnemy++`, `buffsApplied`.
  - On game end: computes `finalResult`, plays `sfx.victory()` or `sfx.defeat()`, sets `phase: "ended"`.
  - On next turn: `newEnergy = Math.max(0, newMaxEnergy + state.nextTurnEnergyPenalty)`, resets `nextTurnEnergyPenalty` to 0, draws a card up to `MAX_HAND_SIZE`, logs the energy line (with penalty mention if any).
- New actions:
  - `clearFloatingNumbers()` — sets `floatingNumbers: []`.
  - `undoLastPlay()` — restores `undoSnapshot` and clears the snapshot + UI flags.
  - `setView(view)` — switches between `"game"` and `"editor"`.
  - `setPreviewCard(c)` — sets/clears `previewCard` for the deck editor.
  - `loadDeckAndPool()` — async fetch of `/api/cards` + `/api/deck`, sets `cardPool` + `deckCardIds` + `deckLoading` + `deckSaveStatus`. Gracefully handles API failures (falls back to empty arrays).
  - `swapCardInDeck(index, cardId)` — replaces the card at `index`, prevents duplicates, marks `deckDirty: true`.
  - `saveDeck()` — POSTs `cardIds` to `/api/deck`, manages `deckSaveStatus` (`saving` → `ok`/`err`), auto-clears the `ok` flag after 2s.
  - `resetDeck()` — DELETEs the current deck, then reloads the pool/deck.

## Verification
- ✅ `bun run lint` — passes with no errors.
- ✅ `bunx tsc --noEmit` — no errors in the 3 updated files (errors in `examples/`, `skills/`, API routes, and `FloatingNumbers.tsx`/`HeaderBar.tsx`/`LaneComponent.tsx` are pre-existing and outside this task's scope).
- ✅ `GET /` still returns 200 — page renders.

## Known pre-existing issues (NOT touched, mentioned for awareness)
- `prisma/schema.prisma` only defines the `Match` model. The API routes `/api/cards` and `/api/deck` reference `db.customCard` and `db.deck` which are `undefined`. The store's `loadDeckAndPool` handles the 500 gracefully (falls back to empty `cardPool`/`deckCardIds`, and `initGame` then falls back to `WARRIOR_DECK`). The schema must be extended by another agent for the deck editor to actually persist.
- `src/components/game/FloatingNumbers.tsx` line 20 — `board.armas.length` (should be `board.armas.player.length` or similar). My store produces `FloatingNumber` entries as expected; the visual layer needs a small fix from the UI agent.
- `src/components/game/HeaderBar.tsx` line 15 — uses `s.maxTurns` but the store exposes `MAX_TURNS` as a constant only.
- `src/components/game/LaneComponent.tsx` — uses `getEffectiveCost` for the canDrop hint; with Sobrecarga this won't account for the `-1` discount, so the highlight may be wrong by 1 energy. Suggest the UI agent switch to `getFinalCost`.
- `src/app/page.tsx` does not yet render `LegendaryBurst`, `FloatingNumbersLayer`, `TurnTransitionBanner`, or wire `view === "editor"` → `DeckEditor`. Those integrations belong to a UI-wiring task.
- `BoardCardMini` lacks the `data-card-uid` attribute that `FloatingNumbers.tsx` queries for; again a UI-wiring concern.
