# Project Work Log

## Task: recreate-core — Core Game Files Update
**Agent**: core-update-agent
**Status**: ✅ Complete
**Files modified**:
- `src/lib/game/cards.ts` (rewritten)
- `src/lib/game/engine.ts` (updated)
- `src/store/gameStore.ts` (updated)

### Summary
Updated the three core game files for the WoW TCG card game (Guerrero Táctico) to support the new rarity system, BASIC_CARDS, TACTICAL_CARDS (15 epic + legendary cards with powerful effects), traps, energy penalties, floating numbers, game stats, deck editor state, sound effects, and AI turn banner.

### Detailed work
See `/agent-ctx/recreate-core-core-update-agent.md` for the full record.

### Lint status
`bun run lint` passes with no errors. `tsc --noEmit` shows no errors in the three updated files (pre-existing errors in other files like the API routes and FloatingNumbers.tsx remain untouched).

### Known pre-existing issues (NOT touched by this task)
- `prisma/schema.prisma` only defines the `Match` model — `db.customCard` / `db.deck` referenced in `/api/cards` and `/api/deck` are undefined. The schema needs to be extended by another agent.
- `src/components/game/FloatingNumbers.tsx` line 20 uses `board.armas.length` (should be `board.armas.player.length` etc.).
- `src/components/game/HeaderBar.tsx` line 15 uses `s.maxTurns` (store only exposes `MAX_TURNS` constant; should be hardcoded `6` or imported).
- `src/components/game/LaneComponent.tsx` has a couple of `selectedCard` possibly-undefined errors that pre-date this task.
- `page.tsx` does not yet wire `view === "editor"` to render `DeckEditor`; that is a separate UI-integration task.
- `page.tsx` does not yet render `LegendaryBurst` or `FloatingNumbersLayer`; `data-card-uid` attribute is not yet set on `BoardCardMini`.
