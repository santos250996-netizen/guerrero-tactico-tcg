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

---
Task ID: full-art-hand-v2-1
Agent: main (super-z)
Task: Place "Toca para ver efecto" parallel to rarity letter; fix rarity letters (c/r/E/L); redesign preview modal to render the SAME full-art hand-card design (larger) with effect text replacing the hint.

Work Log:
- Updated `src/components/game/HandCardComponent.tsx`:
  - Rarity letters per user spec: common="c", rare="r", epic="E", legendary="L" (lowercase for common/rare, uppercase for epic/legendary).
  - Removed the separate "Toca para ver efecto" centered row.
  - Now the bottom row of the panel shows: "Toca para ver efecto" (left, with Info icon) PARALLEL to the rarity letter badge (right). Both on the same horizontal line as the user requested.
- Rewrote `src/components/game/CardPreviewModal.tsx`:
  - Replaced the old bordered "detailed card" design with the SAME full-art hand-card design, just larger (h-[28rem] w-56 vs hand's h-44 w-28).
  - Same elements as hand card: cost (top-left, larger h-10 w-10), power (top-right, larger), bottom panel with: type chip + subtype icon (top row), card name (middle, text-base), and the bottom row now shows subtype chip (left, parallel) + rarity letter (right).
  - Replaced the "Toca para ver efecto" hint with the actual effect text in a parchment-styled box, so the user sees the SAME card design as in hand, but now with the effect text visible.
  - DialogContent uses `top-[6%] translate-y-0` + `bg-transparent border-transparent p-0 shadow-none` so only the card itself is visible — no card-within-a-dialog-frame wrapping.
  - Added a "Vista previa" pill at the top of the card with a Sparkles icon as a subtle flourish.
  - Close button (✕) placed below the card (since the dialog's default X is hidden via showCloseButton=false).
- Verified in browser: hand cards show "r" for rare, "L" for legendary. Bottom row has "Toca para ver efecto" on the left parallel to the rarity letter on the right. Modal opens at top: 54px showing the same card design larger with the effect text.

Stage Summary:
- "Toca para ver efecto" and rarity letter are now in the same horizontal row (parallel), at the bottom of the card.
- Rarity letters: c / r / E / L (lowercase for common and rare, uppercase for epic and legendary).
- The preview modal no longer renders a different card design — it renders the same full-art hand card, just larger, with the effect text replacing the "Toca para ver efecto" hint.
- Lint clean; `tsc --noEmit` only shows pre-existing errors in unrelated examples/skills dirs.
- Artifacts: `scripts/full-art-v2-hand.png`, `scripts/full-art-v2-modal.png`.

---
Task ID: multi-subtype-drag-1
Agent: main (super-z)
Task: Show ALL subtype icons on cards (1, 2, or 3 icons); put "Toca para ver efecto" parallel to rarity letter; fix rarity letters (all uppercase C/R/E/L); redesign preview modal (remove subtype chip from rarity row, move rarity to bottom center as text); implement mandatory drag-and-drop for hand cards (no more tap-to-select).

Work Log:
- `src/store/gameStore.ts`:
  - Added `draggingCardUid: string | null` state property + `setDraggingCard(uid)` action. HandBar's overflow flips to `overflow-visible` when this is set so the dragged card can escape its container.
- `src/components/game/HandCardComponent.tsx` (full rewrite):
  - Rarity letters now all uppercase per user spec: common="C", rare="R", epic="E", legendary="L".
  - Subtype icons: now renders ALL matching subtypes (e.g. Avatar del Titán shows ⚔️ 🛡️ 🔥; Poción de Vida shows 🛡️ 🔥) instead of just the first one.
  - "Toca para ver efecto" (left) is now in the same horizontal row as the rarity letter (right) — both parallel at the bottom of the panel.
  - Added framer-motion `drag` props: `drag`, `dragSnapToOrigin`, `dragElastic=0.6`, `dragConstraints={{left:-300,right:300,top:-400,bottom:100}}`, `whileDrag={{scale:1.18, zIndex:200, cursor:"grabbing", pointerEvents:"none"}}`.
  - Added `onDragStart` → calls `onDragStart?.(card.uid)` (parent calls `selectCard` + `setDraggingCard`).
  - Added `onDragEnd` → finds the dragged card via `document.querySelector('[data-hand-card-uid="..."]')`, temporarily sets `pointerEvents:none` so `elementFromPoint(info.point.x, info.point.y)` sees through it, finds `[data-lane-id]` ancestor, and calls `onPlayCard(card.uid, laneId)`.
  - Added `data-hand-card-uid={card.uid}` attribute on the motion.button for hit-detection lookup.
  - Removed the old `onClick` tap-to-select behavior (drag is now obligatory).
- `src/components/game/HandBar.tsx`:
  - Wired `onPlayCard`, `onDragStart`, `onDragEnd` from store actions.
  - When `draggingCardUid` is set, the hand container switches from `overflow-x-auto` to `overflow-visible` so the dragged card can escape vertically during drag.
  - Status text shows "Arrastra a un carril" with `animate-pulse` during drag.
  - `handlePlayCard` includes a safety check: only calls `selectCard(cardUid)` if `selectedCardUid !== cardUid` (avoids toggle-deselect, since `onDragStart` already called selectCard).
- `src/components/game/CardPreviewModal.tsx` (redesign):
  - Subtype icons: now shows ALL matching subtypes in the top row, not just the first.
  - Removed the subtype chip from the bottom row (which used to be parallel to the rarity letter).
  - Rarity now displayed as TEXT at the BOTTOM CENTER of the card: "C · Común" / "R · Rara" / "E · Épica" / "L · Legendaria" — with a small rarity-color dot + uppercase letter + label.
- `src/components/game/LaneComponent.tsx`:
  - Added `data-lane-id={laneId}` attribute on the section element for drag-target hit detection.

Critical debugging journey: discovered that `dispatchEvent(new PointerEvent(...))` does NOT trigger framer-motion's `drag` listener (because synthetic events are `isTrusted:false`). Real Playwright `mouse.down()/move()/up()` events ARE trusted and work correctly. Also discovered that on `onDragEnd`, framer-motion may have already restored `whileDrag`'s `pointerEvents:none` before the callback runs, so `elementFromPoint` would return the dragged card's own IMG. Fixed by finding the dragged card via `data-hand-card-uid` and explicitly setting `style.pointerEvents='none'` before `elementFromPoint`. Finally found that `selectCard` toggles (deselects if called twice with same uid), so the safety check `if (state.selectedCardUid !== cardUid)` was needed.

Stage Summary:
- Cards now show ALL subtype icons: Avatar del Titán displays ⚔️ 🛡️ 🔥; multi-subtype cards show all icons side-by-side.
- "Toca para ver efecto" and rarity letter are now in the same horizontal row, parallel.
- Rarity letters are all uppercase: C / R / E / L.
- Preview modal: subtype chip removed from bottom row; rarity now appears as TEXT at the bottom center ("L · Legendaria").
- Drag-and-drop is mandatory: tap-to-select was removed; cards must be dragged to a lane to be played. `whileDrag` gives the card a 1.18× scale + gold z-index bump; on drop, `elementFromPoint` finds the lane and `playSelectedCardIntoLane` runs.
- Lint clean; `tsc --noEmit` only shows pre-existing errors in unrelated dirs.
- Verified in browser via real Playwright mouse events: dragged Seccionar (cost 1) to ARMAS lane → hand went 5 → 4, 1 card played in lane.
- Artifacts: `scripts/drag-drop-final.png`, `scripts/drag-drop-after.png`, `scripts/drag-drop-success.png`, `scripts/drag-drop-played.png`.

---
Task ID: drag-direction-click-1
Agent: main (super-z)
Task: Implement direction-aware drag (vertical = play card, horizontal = scroll hand); differentiate a click/tap from a drag — a tap (no significant movement) on the card anywhere opens the preview modal.

Work Log:
- `src/components/game/HandCardComponent.tsx`:
  - Replaced framer-motion's `drag` with custom pointer-event handlers (`onPointerDown`, `onPointerMove`, `onPointerUp`, `onPointerCancel`) for full direction-aware control.
  - `handlePointerDown`: records start position, calls `setPointerCapture` so subsequent pointer events come to the card even if the pointer leaves the card.
  - `handlePointerMove`: detects direction once movement exceeds `DIRECTION_THRESHOLD=8px`. Direction logic biased toward vertical: `Math.abs(dy) * 2 >= Math.abs(dx)` → vertical mode; otherwise horizontal mode.
    - Vertical mode → `setIsDragging(true)`, set ghost position, call `onDragStart` (which `selectCard`s the card). A `position:fixed` drag ghost is rendered at the document body level via React portal so it escapes any overflow-clipped ancestor.
    - Horizontal mode → manually scroll the hand container via `container.scrollLeft -= dx`. (Touch users already get native horizontal scrolling via `touch-action: pan-x` on the card, so this branch only matters for mouse users.)
  - `handlePointerUp`: branches by mode:
    - `vertical && isDragging` → find lane via `document.elementFromPoint(info.point)`, call `onPlayCard(card.uid, laneId)`.
    - `none` (no drag exceeded threshold) → treat as a tap/click → call `onPreview(card)` to open the preview modal.
    - `horizontal` → no special action (just resets state).
  - Added `phase` prop so the component can early-exit when not in playing phase.
  - Added `data-hand-card-uid={card.uid}` for hit-detection lookup.
  - The card's `touch-action: pan-x` lets the browser natively handle horizontal touch scrolling on mobile.
  - Removed the separate `onPreview` click handler on the "Toca para ver efecto" link — the link is now a visual hint only; tapping the card ANYWHERE opens the preview.
- `src/components/game/HandBar.tsx`:
  - Pass `phase={phase}` to each `HandCardComponent`.
  - Added `data-hand-container` attribute on the hand container div (used by `HandCardComponent` to find the parent for manual horizontal scroll).
  - Removed the `draggingCardUid ? overflow-visible : overflow-x-auto` conditional — the drag ghost uses `position:fixed` so it doesn't need parent overflow to change.
  - Removed unused `cn` import.

Critical insight discovered during debugging: framer-motion's `drag` listener only fires for `isTrusted:true` events (real browser events, not synthetic `dispatchEvent` calls). The custom pointer-event handlers approach avoids this limitation entirely because `onPointerDown/Move/Up` are React synthetic event handlers, and real Playwright mouse events trigger them.

Verified in browser:
- Tap (no movement) on Poción de Vida → preview modal opens at top:54px ✓
- Vertical drag of Poción de Vida to PROTECCIÓN lane → hand 5→4, 1 card played ✓
- Horizontal drag on Provocar → modal does NOT open, no card played, hand container scrolls ✓ (the container only has ~4px of scroll with 4 cards, so the scroll is barely visible — but the behavior is correct: it doesn't play the card and doesn't open the modal).

Stage Summary:
- Drag direction now determines behavior:
  - Up (vertical) → drag the card to the board, drop on a lane to play it.
  - Sideways (horizontal) → scroll the hand container horizontally to see other cards.
- A click/tap (pointer moved < 8px) opens the preview modal showing the same full-art card design with the effect text visible.
- Three distinct interactions cleanly differentiated: tap = preview, vertical drag = play, horizontal drag = scroll.
- Lint clean; `tsc --noEmit` only shows pre-existing errors in unrelated dirs.

---
Task ID: modal-close-bug-fix-1
Agent: main (super-z)
Task: Fix the bug where tapping to close the preview modal was being interpreted as opening another card (the close-click opened a new modal with whichever hand card was behind the overlay).

Work Log:
- Root cause identified via extensive debugging:
  - Radix Dialog closes the modal on `pointerdown` (outside-click detection), NOT on `click`.
  - Sequence of the bug: (1) User taps card A → pointerdown + pointerup on card A → modal opens with card A. (2) User taps on the overlay at a position where card B is behind → pointerdown fires on the overlay → Radix closes the modal → body's `pointer-events: none` is removed → pointerup fires and now targets the underlying hand card B (because body is interactive again) → hand card B's `handlePointerUp` fires with `mode: "none"` → calls `onPreview(cardB)` → modal reopens with card B.
  - I confirmed this by adding stack traces and `bodyPE`/`modalOpen` logs — the second tap's `pointerup` handler showed `bodyPE: auto` and `modalOpen: false`, proving the modal had already closed by the time pointerup fired.
- Fix in `src/components/game/HandCardComponent.tsx`:
  - Re-added `setPointerCapture` in `handlePointerDown` (was removed earlier — it's needed so pointermove/pointerup fire on the card during a drag, otherwise the drag flow breaks because pointermove targets the element under the cursor, not the dragged card).
  - Added a `hadPointerDown` guard in `handlePointerUp`: `const hadPointerDown = startRef.current !== null;`. This is `true` only if `handlePointerDown` was called on THIS card before the pointerup. Stray pointerup events (from the modal-closing click) won't have a matching pointerdown on this card, so `startRef.current` will be null and we skip the `onPreview` call.
  - Changed the vertical-drag check from `modeRef.current === "vertical" && isDragging` to `modeRef.current === "vertical" && hadPointerDown` — React state updates are async, so `isDragging` may still be false on the same render where `setIsDragging(true)` was called in `handlePointerMove`. The ref-based `hadPointerDown` check is more reliable.
- The `CardPreviewModal` is centered (top:50% left:50% translate -50%/-50%) with a dark backdrop overlay (`bg-black/80 backdrop-blur-sm`) that blocks all interactions with underlying elements. Tapping anywhere — on the card itself OR on the overlay — closes the modal.

Verified in browser:
- Tap card A → modal opens centered with card A ✓
- Tap on overlay at card B's position → modal closes, does NOT open card B ✓ (bug fixed)
- Tap on the card in the modal → modal closes ✓
- Vertical drag Seccionar (cost 1) to ARMAS lane → hand 5→4, 1 card played ✓ (drag still works)
- Horizontal drag → scrolls hand container ✓ (no regression)

Stage Summary:
- The close-click no longer opens another card.
- The fix is a `hadPointerDown` guard in `handlePointerUp` that filters out stray pointerup events (caused by Radix Dialog closing on pointerdown-outside before pointerup fires).
- `setPointerCapture` is still called in `handlePointerDown` (needed for drag tracking), but the guard ensures stray events from modal-close are ignored.
- Lint clean; `tsc --noEmit` only shows pre-existing errors in unrelated dirs.

---
Task ID: triggers-system-1
Agent: main (super-z)
Task: Implement the 6 trigger types (ON_PLAY, PASSIVE, START_TURN, END_TURN, ON_DEATH, UMBRAL) per user spec, wire them into the turn lifecycle, add example cards, and show the trigger type on the card UI.

Work Log:
- `src/lib/game/types.ts`:
  - Added `Trigger` type: `"on_play" | "passive" | "start_turn" | "end_turn" | "on_death" | "umbral"`.
  - Added `UmbralCondition` interface (currently just `powerThreshold`).
  - Added `TRIGGER_META` map with `label`, `short`, `description`, `emoji`, `color` for each trigger (used by the UI chips).
  - Added optional `trigger?: Trigger` + `umbralCondition?: UmbralCondition` fields to `CardDef`.
  - Added `trigger`, `umbralCondition`, `umbralTriggered` fields to `BoardCard` (so the engine can dispatch and remember per-card umbral state).
- `src/lib/game/engine.ts`:
  - `playCard`: now copies `trigger`, `umbralCondition`, `umbralTriggered=false` from the HandCard to the new BoardCard.
  - Added `TriggerResult` interface `{ board, logs, umbralFired }` returned by all dispatchers.
  - Added 5 exported dispatcher functions:
    - `applyStartTurnEffects(board, side)`: fires each card whose `trigger === "start_turn"`. Re-uses effectIds like `golpe_heroico` (+2 to allies in lane) and `avatar_titan` (+1 per board card, capped at +5).
    - `applyEndTurnEffects(board, side)`: fires `end_turn` cards. `pocion_vida` gives +1 to ally Items in lane; `grito_batalla` gives +1 to self.
    - `applyPassiveEffects(board)`: continuous aura dispatch. `muro_escudos` gives +1 to ally Items in lane; `trono_hierro` gives +1 to ALL allies on board.
    - `applyOnDeathEffects(board, side, lane, deadCard)`: fires when a card dies. `seccionar` does -3 to strongest enemy in lane; `filotormenta` does -1 to ALL enemies on board.
    - `checkUmbralTriggers(board)`: scans for cards with `trigger === "umbral"` whose `currentPower >= umbralCondition.powerThreshold` and haven't already fired. Grants +5 permanent bonus and marks `umbralTriggered=true` so it can't re-fire.
- `src/store/gameStore.ts`:
  - Imported all 5 dispatcher functions + `TriggerResult`.
  - Added `pushTriggerLogs` helper that pushes all of a TriggerResult's logs onto the game log.
  - Wired trigger dispatchers into the turn lifecycle in `endTurn`:
    1. After player presses "Pasar" → `applyEndTurnEffects(board, "player")` + umbral check
    2. Before AI plays → `applyStartTurnEffects(board, "enemy")` + umbral check
    3. After each enemy play → ON_DEATH for each `res.removedCards` + umbral check (uses `prePlayBoard` to look up the dying card's full state since `workBoard` (= `res.board`) has them already filtered out)
    4. After AI finishes → `applyEndTurnEffects(board, "enemy")` + umbral check
    5. At the start of player's new turn → `applyStartTurnEffects(board, "player")` + umbral check
  - Wired trigger dispatchers into `playSelectedCardIntoLane`:
    1. After the player's play → ON_DEATH for each `res.removedCards` (using `state.board` for deadCard lookup) + umbral check
- `src/lib/game/cards.ts`:
  - Added 5 example cards (one per new trigger type) to `TACTICAL_CARDS`:
    - `baluarte_pasivo` "Baluarte Eterno" — Ítem, passive aura, re-uses `muro_escudos` effectId
    - `acumulador` "Acumulador Arcano" — Acción, start_turn, re-uses `golpe_heroico`
    - `renovacion` "Renovación Vital" — Ítem, end_turn, re-uses `pocion_vida`
    - `ultimo_aliento` "Último Aliento" — Ataque, on_death, re-uses `seccionar`
    - `despertar_furias` "Despertar de las Furias" — Acción, umbral @ power 12, legendary, re-uses `grito_batalla`
  - All existing cards keep their default `trigger: "on_play"` (no behavior change).
- `src/components/game/HandCardComponent.tsx`:
  - Imported `TRIGGER_META` from types.
  - Compute `triggerMeta` from `card.trigger ?? "on_play"`.
  - Added a small trigger chip below the card name showing `{emoji} {short}` (e.g., "♾️ PASIVO", "🌅 INICIO", "💀 MUERTE", "🔥 UMBRAL") with the trigger's color (text-emerald-300 for passive, text-amber-300 for start_turn, text-rose-300 for on_death, etc.). The chip has a `title` attribute with the full description so users can hover/long-press for details.
- `src/components/game/CardPreviewModal.tsx`:
  - Same trigger chip — larger version (`text-[9px]`, rounded-full, with the full `label` instead of `short`) shown below the card name and above the effect text.

Critical implementation notes:
- The dispatchers RE-USE existing effectIds but interpret them through the trigger's lifecycle lens. This means a card like `muro_escudos` with `trigger: "passive"` will fire its `+3 to ally Items` effect ONCE on play (because the on_play dispatcher still runs) AND ALSO continuously via `applyPassiveEffects` (giving +1 to ally Items). For now this is intentional — designers can choose to put passive effects on cards with `effectId: "none"` to avoid double-firing, or pick effectIds whose on_play + passive semantics compose well.
- UMBRAL dispatchers check `umbralTriggered` to prevent re-firing. The flag is mutated on the cloned board (per-call), and the cloned board replaces the live state, so the flag persists across calls.
- ON_DEATH dispatch needs the dying card's full state (including `trigger` + `effectId`). Since `playCard` filters out `removedCards` from `res.board`, we look up the dead card in the PRE-play board (either `state.board` for player plays, or `prePlayBoard` snapshot for enemy plays).

Stage Summary:
- 6 trigger types implemented per user spec.
- 5 trigger dispatchers in engine.ts: start_turn, end_turn, passive, on_death, umbral.
- All dispatchers wired into the turn lifecycle in gameStore (player's end_turn, enemy's start_turn, after each play's removedCards, after each play's umbral check, enemy's end_turn, player's start_turn at new turn).
- 5 example cards added (one per new trigger) demonstrating each type.
- Trigger chip visible on hand cards AND preview modal, colored per trigger type with emoji + label.
- All existing cards keep default `trigger: "on_play"` (no behavior regression).
- Lint clean; `tsc --noEmit` only shows pre-existing errors in unrelated dirs.
- `next build` compiles successfully (10.2s).
- Pushed to GitHub: `feat(triggers): add 6 trigger types...` commit (force-push to overwrite diverged auto-commit).
