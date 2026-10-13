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

---
Task ID: mobile-frame-1
Agent: main (super-z)
Task: Convert battle interface from responsive web layout to fixed mobile-app format (phone-frame portrait on desktop, full-bleed on real phones).

Work Log:
- Added `.app-frame`, `.app-main`, `.no-scrollbar` utility classes to `src/app/globals.css`. The frame is a 480×900 max portrait container with notch + bezel styling on screens ≥ 640px, and full-bleed (`100vw × 100dvh`) on smaller screens.
- Refactored `src/app/page.tsx` to wrap the entire game (header + board + hand + overlays + modals) inside the `app-frame` container. Removed the bottom footer (instructions were redundant now that the hand bar already shows "Toca un carril para jugarla" cues). Loading screen also uses the frame.
- Rewrote `src/components/game/HeaderBar.tsx` to be a compact mobile header: 7×7 icon-only buttons, smaller brand, single-row layout with `min-w-0` truncation. Hardcoded `MAX_TURNS = 6` (the store only exposes the constant, not a state property).
- Shrunk `src/components/game/EnergyCrystals.tsx` crystals to `h-3 w-2.5` and reduced paddings/fonts.
- Rewrote `src/components/game/LaneComponent.tsx`: border-2 → border, p-1.5 → p-1, gap-1 → gap-0.5, rounded-xl → rounded-lg, all text sizes reduced ~30%, all slot grids compacted to `gap-0.5 p-0.5`. Fixed `selectedCard possibly undefined` by adding `?? null` and a non-null alias inside the IIFE.
- Shrunk `src/components/game/BoardCardMini.tsx` badges from `h-6 w-6 text-[11px]` → `h-4 w-4 text-[8px]` and adjusted border radius / paddings.
- Rewrote `src/components/game/HandBar.tsx` for mobile: smaller card gap, `no-scrollbar` utility added, action buttons shrunk to `text-[9px]`, "Abandonar" → "Salir" to save space.
- Shrunk `src/components/game/HandCardComponent.tsx` from `h-72 w-44` → `h-44 w-28` (~60% smaller), all interior fonts/paddings reduced proportionally. Removed the unused `onPreview` prop from the interface (was causing TS error in parent).
- Rewrote `src/components/game/DeckEditor.tsx` to fit inside the app-frame: 2-col stat grid (was 4-col), 3-col card grids (was 6-col on xl), all paddings/fonts reduced. Header uses 7×7 icon-only buttons.
- Fixed `src/components/game/FloatingNumbers.tsx` — removed dead `board.armas.length` reference (board shape changed to `{player, enemy}` sub-objects).

Stage Summary:
- The battle interface is now a fixed 480×900 (max) portrait phone frame, centered on desktop with device bezel + dynamic-island notch, and full-bleed on real phones.
- Lint passes clean. `tsc --noEmit` shows only pre-existing errors in unrelated `examples/` and `skills/` directories. `next build` compiles successfully (10.4s).
- Verified at runtime via agent-browser:
  - Desktop 1280×900: frame = 480×855, centered (left:400, right:400).
  - Mobile 390×844 (iPhone 14 Pro): frame = 390×844, fills viewport, no bezel.
  - Game view: all 5 header buttons icon-only, 3 lanes rendered, hand cards fit, action bar at bottom.
  - Editor view: same frame, internal scroll enabled, all sections visible.
- Artifacts: `scripts/mobile-frame-desktop.png`, `scripts/mobile-frame-game.png`, `scripts/mobile-frame-editor.png`, `scripts/mobile-frame-mobile.png`.

---
Task ID: full-art-hand-1
Agent: main (super-z)
Task: Redesign hand cards to be full-art (like board cards) with new bottom info panel layout, and make the card-preview modal appear at the top of the screen.

Work Log:
- Rewrote `src/components/game/HandCardComponent.tsx` as a full-bleed art card (matching BoardCardMini's art-first layout). New layout per user spec:
  - Top-left badge: cost (sky circle, text-[10px])
  - Top-right badge: power (rose circle, text-[10px], turns emerald when hand-bonus is active)
  - Hand-bonus chip below power badge when card is buffed
  - Bottom dark gradient overlay panel containing:
    - Top row of panel: card type chip (left, e.g. "ATAQUE"/"ÍTEM"/"ACCIÓN") + subtype icon (right, e.g. ⚔️/🛡️/🔥 — picks first subtype)
    - Middle: card name (amber, uppercase, drop-shadow)
    - Below name: subtle "Toca para ver efecto" link with `Info` icon — tappable to open preview modal (uses `stopPropagation` so the parent's select-to-play onClick doesn't fire)
    - Bottom row: rarity letter badge in bottom-right corner (C/R/E/L with rarity color background)
  - Border uses `rar.borderClass` (rarity color tint). When selected, switches to `border-amber-400 ring-2 ring-amber-400/70 z-10` with extra gold glow.
  - When unaffordable: `opacity-65 grayscale`.
- Updated `src/components/game/HandBar.tsx` to pass `onPreview={(c) => useGameStore.getState().setPreviewCard?.(c as any)}` to each HandCardComponent, restoring the wiring removed in the previous task.
- Updated `src/components/game/CardPreviewModal.tsx`:
  - DialogContent now uses `top-[6%] translate-y-0 max-w-[calc(100%-1rem)]` — `twMerge` overrides the default `top-[50%] translate-y-[-50%]`, so the modal slides in from the top of the viewport.
  - Motion variant: now `y: -20 → 0` initial animate, matching the top-positioned entrance.
  - Card art area in preview reduced from `h-72` → `h-60` to fit better in the top-aligned modal.
- Verified in browser: full-art hand cards render correctly, all 5 cards show full-bleed art with the new overlay layout, "Toca para ver efecto" link opens the top-positioned modal at top: 54px, tapping the card body still selects it (amber ring appears).

Stage Summary:
- Hand cards are now full-art like board cards.
- New bottom panel shows: type chip + subtype icon (top row), card name (middle), "Toca para ver efecto" subtle link (below name), rarity letter (bottom-right corner).
- Top corners: cost (left) + power (right) — same as board cards.
- Card preview modal now drops in from the top instead of center.
- Tap card body = select for play; tap "Toca para ver efecto" = open preview modal.
- Lint passes clean. `tsc --noEmit` shows only pre-existing errors in unrelated `examples/` and `skills/` dirs.
- Artifacts: `scripts/full-art-hand.png`, `scripts/full-art-preview.png`, `scripts/full-art-selected.png`.
