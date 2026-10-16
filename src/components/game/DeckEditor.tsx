"use client";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Save, RotateCcw, Lock, Unlock, Trash2, Library, Info, Sparkles, ChevronDown, Check, Play, MoreVertical, Plus, Eye } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { Button } from "@/components/ui/button";
import { CATEGORY_META, RARITY_META, TRIGGER_META, KEYWORD_META, LANE_META } from "@/lib/game/types";
import type { CardDef, CardCategory, LaneId, Rarity, Trigger, Keyword } from "@/lib/game/types";
import { cn } from "@/lib/utils";
import { CardPreviewModal } from "./CardPreviewModal";
import { PRESET_DECKS } from "@/lib/game/cards";
import { sfx } from "@/lib/sound";

const COST_BUCKETS = [1, 2, 3, 4, 5] as const;

export function DeckEditor() {
  const cardPool = useGameStore((s) => s.cardPool);
  const deckCardIds = useGameStore((s) => s.deckCardIds);
  const deckDirty = useGameStore((s) => s.deckDirty);
  const deckSaveStatus = useGameStore((s) => s.deckSaveStatus);
  const setView = useGameStore((s) => s.setView);
  const deckEditorReturn = useGameStore((s) => s.deckEditorReturn);
  const initGame = useGameStore((s) => s.initGame);
  const saveDeck = useGameStore((s) => s.saveDeck);
  const resetDeck = useGameStore((s) => s.resetDeck);
  const swapCardInDeck = useGameStore((s) => s.swapCardInDeck);
  const setPreviewCard = useGameStore((s) => s.setPreviewCard);
  const previewCard = useGameStore((s) => s.previewCard);
  const [rarityFilter, setRarityFilter] = useState<Rarity | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<CardCategory | "all">("all");
  const [triggerFilter, setTriggerFilter] = useState<Trigger | "all">("all");
  const [keywordFilter, setKeywordFilter] = useState<Keyword | "all">("all");
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [deckLocked, setDeckLocked] = useState(false);
  const [deckDropdownOpen, setDeckDropdownOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // Returns to wherever the user came from (in-game header → game; class-select flow → class-select; default → main-menu)
  const handleBack = () => setView(deckEditorReturn);

  // Starts a fresh game with the current deck (used when entering from ClassSelect flow)
  const handleStartBattle = () => {
    initGame();
    setView("game");
  };

  // Whether the "Empezar Batalla" button should be shown (only in the JUGAR → Clase → Mazo flow)
  const showStartBattle = deckEditorReturn === "class-select";

  // Load a preset deck — replaces all 12 slots with the preset's card IDs
  const loadPresetDeck = (deckId: string) => {
    const preset = PRESET_DECKS.find((d) => d.id === deckId);
    if (!preset) return;
    const ids = preset.cards.map((c) => c.id);
    useGameStore.setState({
      deckCardIds: ids,
      deckDirty: true,
      deckSaveStatus: "idle",
    });
    setSelectedSlot(null);
    sfx.click();
  };

  // Deduplicate cardPool by id (safety — API should already deduplicate, but
  // this prevents React "duplicate key" errors if any duplicates slip through)
  const uniqueCardPool = useMemo(() => {
    const seen = new Set<string>();
    return cardPool.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [cardPool]);

  const deckCards = useMemo(() => deckCardIds.map((id) => uniqueCardPool.find((c) => c.id === id)).filter((c): c is CardDef => Boolean(c)), [deckCardIds, uniqueCardPool]);
  const availableCards = useMemo(() => uniqueCardPool.filter((c) => {
    if (deckCardIds.includes(c.id)) return false;
    if (rarityFilter !== "all" && c.rarity !== rarityFilter) return false;
    if (categoryFilter !== "all" && c.category !== categoryFilter) return false;
    if (triggerFilter !== "all" && (c.trigger ?? "on_play") !== triggerFilter) return false;
    if (keywordFilter !== "all" && c.keyword !== keywordFilter) return false;
    return true;
  }), [uniqueCardPool, deckCardIds, rarityFilter, categoryFilter, triggerFilter, keywordFilter]);
  const costCurve = useMemo(() => { const c: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }; for (const d of deckCards) if (c[d.cost] !== undefined) c[d.cost]++; return c; }, [deckCards]);
  // Defensive NaN guard: Number(c.cost) || 0 ensures a card with undefined/string cost
  // doesn't turn the whole reduce into NaN (which would then show 'NaN' in the stats bar).
  const totalCost = useMemo(() => deckCards.reduce((a, c) => a + (Number(c.cost) || 0), 0), [deckCards]);
  const totalPower = useMemo(() => deckCards.reduce((a, c) => a + (Number(c.power) || 0), 0), [deckCards]);
  const avgCost = deckCards.length > 0 ? (totalCost / deckCards.length).toFixed(1) : "0";
  const avgPower = deckCards.length > 0 ? (totalPower / deckCards.length).toFixed(1) : "0";
  const maxCurveVal = Math.max(1, ...Object.values(costCurve));

  const handlePoolCardClick = (cardId: string) => {
    if (selectedSlot === null || deckLocked) { const card = cardPool.find((c) => c.id === cardId); if (card) setPreviewCard(card); return; }
    swapCardInDeck(selectedSlot, cardId); setSelectedSlot(null);
  };

  return (
    <div className="app-frame relative overflow-hidden text-zinc-100">
      {/* ── Background: armory (same as profile — deck building fits the 'armory' theme) ── */}
      <div
        className="absolute inset-0 z-0 scale-105 bg-cover bg-center blur-[2px]"
        style={{ backgroundImage: 'url(/menu/profile-bg-raw.png)' }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/85 via-black/65 to-black/85" />

      {/* ── Top bar: back button (left) + Cinzel title (center) + save status (right) ── */}
      <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-2 px-3 pt-3 pb-2">
        <button
          onClick={handleBack}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-500/40 bg-zinc-950/70 backdrop-blur-sm text-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.25)] transition-colors hover:bg-zinc-900/80 hover:border-amber-400/70"
          title="Volver"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.2} />
        </button>

        <div className="flex flex-col items-center leading-tight">
          <h2
            className="text-sm font-black uppercase tracking-[0.35em] text-amber-400"
            style={{
              fontFamily: 'var(--font-cinzel), serif',
              textShadow: '0 0 10px rgba(251,191,36,0.5), 0 1px 2px rgba(0,0,0,0.9)',
            }}
          >
            Tu Mazo
          </h2>
          <p className="text-[9px] uppercase tracking-[0.25em] text-zinc-500">
            Editor
          </p>
        </div>

        {/* Save status indicator (right) */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center">
          {deckSaveStatus === "saving" && (
            <span className="text-[10px] font-bold text-amber-400 animate-pulse">…</span>
          )}
          {deckSaveStatus === "ok" && (
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-emerald-500/50 bg-emerald-950/40 text-emerald-300">
              <Check className="h-3.5 w-3.5" />
            </span>
          )}
          {deckSaveStatus === "err" && (
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-rose-500/50 bg-rose-950/40 text-rose-300">!</span>
          )}
          {deckSaveStatus === "idle" && (
            <span className="h-2 w-2 rounded-full bg-zinc-700" title="Sin cambios" />
          )}
        </div>
      </header>

      {/* ── Action toolbar — only Save + Start Battle as primary; utilities hidden under "Más" ── */}
      <div className="absolute inset-x-0 top-[60px] z-30 flex items-center justify-between gap-1.5 px-3 pb-1">
        {/* Left: "Más" dropdown (Reset / Trash / Lock) */}
        <div className="relative">
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 border-zinc-700/60 bg-zinc-950/60 p-0 text-zinc-300 backdrop-blur-sm hover:bg-zinc-800 hover:text-zinc-100"
            onClick={() => setMoreMenuOpen(!moreMenuOpen)}
            title="Más opciones"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
          {moreMenuOpen && (
            <>
              {/* Backdrop to close on outside tap */}
              <div className="fixed inset-0 z-40" onClick={() => setMoreMenuOpen(false)} />
              <div className="absolute left-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-lg border border-zinc-700/60 bg-zinc-950/95 shadow-2xl backdrop-blur-md">
                <button
                  onClick={() => { resetDeck(); setMoreMenuOpen(false); }}
                  className="flex w-full items-center gap-2.5 border-b border-zinc-800/60 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-300 transition-colors hover:bg-zinc-900/60"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-zinc-400" />
                  Resetear mazo
                </button>
                <button
                  onClick={() => {
                    if (confirm("¿Vaciar el mazo? Tendrás que elegir 12 cartas de nuevo.")) {
                      useGameStore.setState({ deckCardIds: [], deckDirty: true, deckSaveStatus: "idle" });
                      setSelectedSlot(null);
                    }
                    setMoreMenuOpen(false);
                  }}
                  disabled={deckLocked}
                  className="flex w-full items-center gap-2.5 border-b border-zinc-800/60 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-rose-300 transition-colors hover:bg-rose-950/40 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Vaciar mazo
                </button>
                <button
                  onClick={() => { setDeckLocked(!deckLocked); setSelectedSlot(null); setMoreMenuOpen(false); }}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider transition-colors hover:bg-zinc-900/60",
                    deckLocked ? "text-amber-300" : "text-zinc-300",
                  )}
                >
                  {deckLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                  {deckLocked ? "Desbloquear mazo" : "Bloquear mazo"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right: Save + Start Battle (primary actions) */}
        <div className="flex items-center gap-1.5">
          {showStartBattle && (
            <Button
              size="sm"
              className="h-8 rounded-lg border border-emerald-400/50 bg-gradient-to-r from-emerald-700 to-amber-600 px-3 text-white shadow-md hover:from-emerald-600 hover:to-amber-500"
              onClick={handleStartBattle}
              title="Empezar batalla con este mazo"
            >
              <Play className="h-3 w-3" fill="currentColor" />
              <span className="text-[10px] font-black uppercase tracking-wider" style={{ fontFamily: 'var(--font-cinzel), serif' }}>Batalla</span>
            </Button>
          )}
          <Button
            size="sm"
            className={cn(
              "h-8 rounded-lg border border-amber-400/50 bg-gradient-to-r from-amber-700 via-amber-600 to-rose-700 px-3 text-white shadow-md transition-all hover:from-amber-600 hover:via-amber-500 hover:to-rose-600",
              (!deckDirty || deckLocked) && "opacity-50",
            )}
            disabled={!deckDirty || deckLocked}
            onClick={() => saveDeck()}
          >
            <Save className="h-3 w-3" />
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ fontFamily: 'var(--font-cinzel), serif' }}>Guardar</span>
          </Button>
        </div>
      </div>

      <main className="app-main relative z-10 mx-auto mt-[100px] flex w-full flex-1 flex-col gap-2 px-2 pb-4">
        {/* Preset deck selector — translucent card.
            When the dropdown is open, raise z-30 so the dropdown escapes the
            backdrop-filter stacking context of sibling sections below. */}
        <section className={cn("relative rounded-lg border border-amber-700/40 bg-zinc-950/40 p-2 backdrop-blur-[1px]", deckDropdownOpen && "z-30")}>
          <button
            onClick={() => setDeckDropdownOpen(!deckDropdownOpen)}
            className="flex w-full items-center justify-between gap-2 rounded-md border border-amber-600/40 bg-zinc-900/60 px-3 py-2 text-left transition-colors hover:bg-zinc-800/60"
          >
            <div className="flex items-center gap-2">
              <Library className="h-3.5 w-3.5 text-amber-400" />
              <span
                className="text-[10px] font-bold uppercase tracking-wider text-amber-300"
                style={{ fontFamily: 'var(--font-cinzel), serif' }}
              >
                {(() => {
                  const active = PRESET_DECKS.find(d => deckCardIds.join(",") === d.cards.map(c => c.id).join(","));
                  return active ? `${active.emoji} ${active.name}` : "Mazos Predeterminados";
                })()}
              </span>
            </div>
            <ChevronDown className={cn("h-3.5 w-3.5 text-zinc-400 transition-transform", deckDropdownOpen && "rotate-180")} />
          </button>

          {/* Dropdown list */}
          {deckDropdownOpen && (
            <>
              {/* Backdrop to close on outside tap */}
              <div className="fixed inset-0 z-40" onClick={() => setDeckDropdownOpen(false)} />
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[60vh] overflow-y-auto rounded-md border border-amber-600/40 bg-zinc-950/95 shadow-2xl backdrop-blur-md">
                {PRESET_DECKS.map((deck) => {
                  const isActive = deckCardIds.join(",") === deck.cards.map(c => c.id).join(",");
                  return (
                    <button
                      key={deck.id}
                      onClick={() => { loadPresetDeck(deck.id); setDeckDropdownOpen(false); }}
                      className={cn(
                        "flex w-full items-center gap-2.5 border-b border-zinc-800/60 px-3 py-2.5 text-left transition-colors last:border-0",
                        isActive ? "bg-amber-900/40" : "hover:bg-zinc-900/60"
                      )}
                    >
                      <span className="text-lg">{deck.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div
                          className={cn("text-[10px] font-bold uppercase tracking-wider", isActive ? "text-amber-300" : "text-zinc-200")}
                          style={{ fontFamily: 'var(--font-cinzel), serif' }}
                        >
                          {deck.name}
                        </div>
                        <div className="truncate text-[8px] text-zinc-500">{deck.description}</div>
                      </div>
                      {isActive && <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {/* Compact inline stats — single row instead of 2x2 grid (less cognitive load) */}
        <section className="flex items-center justify-between rounded-lg border border-zinc-700/60 bg-zinc-950/40 px-3 py-2 backdrop-blur-[1px]">
          <CompactStat label="Cartas" value={`${deckCards.length}/12`} accent="amber" />
          <DividerDot />
          <CompactStat label="Coste medio" value={avgCost} accent="sky" />
          <DividerDot />
          <CompactStat label="Poder medio" value={avgPower} accent="rose" />
        </section>

        {/* Tu Mazo — translucent amber-tinted card.
            Always renders 12 slots. Filled slots show FullArtCardMini.
            Empty slots show a clickable EmptySlot placeholder so the user can
            select an empty slot AND swap a card from the available pool in. */}
        <section className="rounded-lg border border-amber-700/40 bg-amber-950/20 p-2 backdrop-blur-[1px]">
          <div className="mb-2 flex items-center justify-between"><div>
            <h2
              className="text-[11px] font-black uppercase tracking-wider text-amber-300"
              style={{ fontFamily: 'var(--font-cinzel), serif' }}
            >
              Tu Mazo · {deckCards.length}/12
            </h2>
            <p className="text-[8px] text-zinc-400">{deckLocked ? "Bloqueado — clic para ver" : selectedSlot === null ? "Toca una carta para cambiarla, o tap el ojo (👁) para previsualizar." : `Slot ${selectedSlot + 1} seleccionado — elige una carta disponible`}</p>
          </div>{selectedSlot !== null && !deckLocked && <Button size="sm" variant="ghost" className="h-6 text-[9px] text-zinc-400" onClick={() => setSelectedSlot(null)}>Cancelar</Button>}</div>
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: 12 }).map((_, idx) => {
              const card = deckCards[idx];
              if (card) {
                return (
                  <FullArtCardMini
                    key={`${card.id}-${idx}`}
                    card={card}
                    onClick={() => { if (deckLocked) { setPreviewCard(card); return; } setSelectedSlot(selectedSlot === idx ? null : idx); }}
                    onPreview={() => setPreviewCard(card)}
                    selected={selectedSlot === idx && !deckLocked}
                    showSlotNumber={idx}
                  />
                );
              }
              // Empty slot — clickable to select for adding a card from the pool
              return (
                <EmptySlot
                  key={`empty-${idx}`}
                  slotIdx={idx}
                  selected={selectedSlot === idx && !deckLocked}
                  disabled={deckLocked}
                  onClick={() => { if (deckLocked) return; setSelectedSlot(selectedSlot === idx ? null : idx); }}
                />
              );
            })}
          </div>
        </section>

        {/* Disponibles — translucent card */}
        <section className="rounded-lg border border-zinc-700/60 bg-zinc-950/40 p-2 backdrop-blur-[1px]">
          <div className="mb-2 flex items-center justify-between">
            <h2
              className="text-[11px] font-black uppercase tracking-wider text-zinc-300"
              style={{ fontFamily: 'var(--font-cinzel), serif' }}
            >
              Disponibles · {availableCards.length}
            </h2>
          </div>
          <div className="mb-2 flex flex-wrap gap-1">
            {/* Rarity filter */}
            {(["all","common","rare","epic","legendary"] as const).map((r) => <button key={r} onClick={() => setRarityFilter(r)} className={cn("rounded border px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider", rarityFilter === r ? "border-amber-400 bg-amber-900/40 text-amber-300" : "border-zinc-700 bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800")}>{r === "all" ? "Todas" : RARITY_META[r as Rarity]?.label || r}</button>)}
            {/* Category filter */}
            {(["all","Ataque","Ítem","Acción"] as const).map((c) => <button key={c} onClick={() => setCategoryFilter(c)} className={cn("rounded border px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider", categoryFilter === c ? "border-amber-400 bg-amber-900/40 text-amber-300" : "border-zinc-700 bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800")}>{c === "all" ? "Todas" : c}</button>)}
          </div>
          {/* Trigger filter row — chips for each of the 8 triggers */}
          <div className="mb-2 flex flex-wrap gap-1">
            <span className="self-center text-[7px] font-bold uppercase tracking-widest text-zinc-500">Trigger:</span>
            {(["all", ...Object.keys(TRIGGER_META) as Trigger[]] as const).map((t) => {
              const meta = t === "all" ? null : TRIGGER_META[t as Trigger];
              return (
                <button
                  key={t}
                  onClick={() => setTriggerFilter(t)}
                  className={cn(
                    "flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider",
                    triggerFilter === t ? "border-amber-400 bg-amber-900/40 text-amber-300" : "border-zinc-700 bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800",
                  )}
                >
                  {meta && <span>{meta.emoji}</span>}
                  {t === "all" ? "Todos" : meta?.short ?? t}
                </button>
              );
            })}
          </div>
          {/* Keyword filter row — chips for each keyword present in the pool */}
          <div className="mb-2 flex flex-wrap gap-1">
            <span className="self-center text-[7px] font-bold uppercase tracking-widest text-zinc-500">Keyword:</span>
            <button
              onClick={() => setKeywordFilter("all")}
              className={cn("rounded border px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider", keywordFilter === "all" ? "border-amber-400 bg-amber-900/40 text-amber-300" : "border-zinc-700 bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800")}
            >
              Todas
            </button>
            {/* Only render keywords that actually appear in the available card pool (cuts the 33 list down) */}
            {Array.from(new Set(uniqueCardPool.map((c) => c.keyword).filter(Boolean) as Keyword[])).sort().map((kw) => {
              const meta = KEYWORD_META[kw as Keyword];
              if (!meta) return null;
              return (
                <button
                  key={kw}
                  onClick={() => setKeywordFilter(kw as Keyword)}
                  className={cn(
                    "flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider",
                    keywordFilter === kw ? "border-amber-400 bg-amber-900/40 text-amber-300" : "border-zinc-700 bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800",
                  )}
                >
                  {meta.emoji && <span>{meta.emoji}</span>}
                  {meta.short ?? kw}
                </button>
              );
            })}
          </div>
          {availableCards.length === 0 ? <div className="rounded border border-dashed border-zinc-800 bg-zinc-900/40 p-4 text-center text-[10px] text-zinc-500">No hay cartas con este filtro.</div> :
          <div className="grid grid-cols-3 gap-1.5">
            {availableCards.map((card) => (
              <FullArtCardMini
                key={card.id}
                card={card}
                onClick={() => handlePoolCardClick(card.id)}
              />
            ))}
          </div>}
        </section>
      </main>
      <CardPreviewModal card={previewCard} open={previewCard !== null} onOpenChange={(o) => { if (!o) setPreviewCard(null); }} />
    </div>
  );
}

// Rarity letters — all uppercase (C / R / E / L)
const RARITY_LETTER: Record<string, string> = { common: "C", rare: "R", epic: "E", legendary: "L" };
const RARITY_SOLID_BG: Record<string, string> = {
  common: "bg-gradient-to-b from-zinc-400 to-zinc-700 text-zinc-950",
  rare: "bg-gradient-to-b from-sky-400 to-sky-700 text-white",
  epic: "bg-gradient-to-b from-violet-400 to-violet-700 text-white",
  legendary: "bg-gradient-to-b from-amber-300 to-amber-600 text-zinc-950",
};

// Full-art card for the deck editor — same visual design as the hand cards
// but rendered at mini scale (3-col grid on mobile).
function FullArtCardMini({ card, onClick, onPreview, selected, showSlotNumber, dimmed }: {
  card: CardDef;
  onClick: () => void;
  // Optional: opens the preview modal (eye icon) without affecting slot selection
  onPreview?: () => void;
  selected?: boolean;
  showSlotNumber?: number;
  dimmed?: boolean;
}) {
  const cat = CATEGORY_META[card.category];
  const rar = RARITY_META[card.rarity];
  const trigger = card.trigger ?? "on_play";
  const triggerMeta = TRIGGER_META[trigger];
  const keyword = card.keyword ?? "none";
  const keywordMeta = KEYWORD_META[keyword];
  const subtypeMetas = card.subtypes.map((s) => LANE_META[s]).filter(Boolean);

  return (
    <motion.button
      layout
      whileHover={{ y: -2, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={cn(
        "relative flex aspect-[3/4] flex-col overflow-hidden rounded-lg border-2 text-left",
        "bg-zinc-950",
        selected ? "border-yellow-400 ring-2 ring-yellow-400/60" : rar.borderClass,
        dimmed && "opacity-60"
      )}
      style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), 0 3px 8px rgba(0,0,0,0.6)" }}
    >
      {/* Full-bleed art */}
      <img
        src={`/cards/${card.id}.png`}
        alt={card.name}
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
        draggable={false}
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />

      {/* Dark gradient at the bottom */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />

      {/* Slot number badge (top-left, deck cards only) */}
      {showSlotNumber !== undefined && (
        <div className="absolute left-0.5 top-0.5 z-30 flex h-4 w-4 items-center justify-center rounded bg-black/70 text-[7px] font-bold text-zinc-300">{showSlotNumber + 1}</div>
      )}

      {/* Cost badge (top-left or top-right depending on slot) */}
      <div
        className={cn("absolute z-30 flex h-5 w-5 items-center justify-center rounded-full border border-white/90 bg-gradient-to-b from-sky-400 to-sky-700 text-[8px] font-black text-white shadow-md", showSlotNumber !== undefined ? "right-1 top-1" : "left-1 top-1")}
        style={{ boxShadow: "0 0 4px rgba(56,189,248,0.55)" }}
      >
        {card.cost}
      </div>

      {/* Power badge (bottom-right) */}
      <div
        className={cn(
          "absolute right-1 top-1 z-30 flex h-5 w-5 items-center justify-center rounded-full border border-white/90 text-[8px] font-black text-white shadow-md",
          showSlotNumber !== undefined && "left-1 top-1 opacity-0"
        )}
        style={{ boxShadow: "0 0 4px rgba(244,63,94,0.55)" }}
      >
        <span className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full border border-white/90 text-[8px] font-black text-white shadow-md bg-gradient-to-b from-rose-500 to-rose-800"
        )}>
          {card.power}
        </span>
      </div>

      {/* Preview (eye) button — only when onPreview is provided.
          Sits at the bottom-right corner, overlays the bottom info panel with
          a higher z-index. stopPropagation prevents the parent onClick from firing
          (which would select the slot instead). */}
      {onPreview && (
        <button
          onClick={(e) => { e.stopPropagation(); onPreview(); }}
          className="absolute bottom-0.5 right-0.5 z-40 flex h-5 w-5 items-center justify-center rounded-full border border-amber-400/60 bg-black/80 text-amber-300 shadow-md transition-colors hover:bg-amber-900/60 hover:text-amber-100"
          title="Ver detalle"
          aria-label="Ver detalle"
        >
          <Eye className="h-3 w-3" />
        </button>
      )}

      {/* Bottom info panel */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-0.5 px-1 py-1">
        {/* Type + subtypes row */}
        <div className="flex items-center justify-between gap-0.5">
          <span className={cn("rounded border px-1 py-0 text-[6px] font-bold uppercase tracking-wider backdrop-blur-sm", cat.bgClass, cat.textClass, cat.borderClass)}>
            {cat.label}
          </span>
          <div className="flex items-center gap-0.5">
            {subtypeMetas.map((lm) => (
              <span key={lm.title} title={lm.title} className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white/40 bg-black/60 text-[7px] leading-none backdrop-blur-sm">
                {lm.emoji}
              </span>
            ))}
          </div>
        </div>

        {/* Card name */}
        <div className="text-center text-[7px] font-black uppercase tracking-wider text-amber-300 [text-shadow:1px_1px_0_#000,0_0_3px_rgba(0,0,0,0.8)] leading-tight">
          {card.name}
        </div>

        {/* Trigger + keyword chips parallel to rarity letter (same row) */}
        <div className="flex items-end justify-between gap-0.5">
          <div className="flex gap-0.5">
            <span title={triggerMeta.description} className={cn("inline-flex items-center gap-0.5 rounded border border-white/20 bg-black/70 px-0.5 py-0 text-[5px] font-bold uppercase tracking-wider backdrop-blur-sm", triggerMeta.color)}>
              <span>{triggerMeta.emoji}</span>{triggerMeta.short}
            </span>
            {keyword !== "none" && (
              <span title={keywordMeta.description} className={cn("inline-flex items-center gap-0.5 rounded border border-white/20 bg-black/70 px-0.5 py-0 text-[5px] font-bold uppercase tracking-wider backdrop-blur-sm", keywordMeta.color)}>
                <span>{keywordMeta.emoji}</span>{keywordMeta.short}{keywordMeta.hasValue && card.keywordValue ? `[${card.keywordValue}]` : ""}
              </span>
            )}
          </div>
          <span title={rar.label} className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-white/80 text-[6px] font-black shadow-md", RARITY_SOLID_BG[card.rarity])}>
            {RARITY_LETTER[card.rarity]}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return <div className="rounded-md border border-zinc-800 bg-zinc-950/60 px-2 py-1.5"><div className="flex items-center gap-1 text-[8px] uppercase tracking-wider text-zinc-400">{icon}{label}</div><div className="mt-0.5 text-sm font-bold tabular-nums text-white">{value}</div><div className="text-[8px] text-zinc-500">{sub}</div></div>;
}

// ──────────────────────────────────────────────────────────────
// Compact inline stat (used in the simplified single-row stats bar)
// ──────────────────────────────────────────────────────────────
function CompactStat({ label, value, accent }: { label: string; value: string; accent: "amber" | "sky" | "rose" }) {
  const accents: Record<string, string> = {
    amber: "text-amber-300",
    sky: "text-sky-300",
    rose: "text-rose-300",
  };
  return (
    <div className="flex flex-1 flex-col items-center leading-tight">
      <span className="text-[8px] font-bold uppercase tracking-[0.15em] text-zinc-500">{label}</span>
      <span
        className={`text-base font-black tabular-nums ${accents[accent]}`}
        style={{ fontFamily: 'var(--font-cinzel), serif' }}
      >
        {value}
      </span>
    </div>
  );
}

function DividerDot() {
  return <span className="h-1 w-1 shrink-0 rounded-full bg-zinc-700/60" aria-hidden />;
}

// ──────────────────────────────────────────────────────────────
// EmptySlot — placeholder for empty deck slots (when deck has fewer than 12
// cards). Clickable to select the slot so the user can swap a card from the
// available pool IN. Previously the empty slots weren't rendered at all,
// making it impossible to add new cards to the deck.
// ──────────────────────────────────────────────────────────────
function EmptySlot({ slotIdx, selected, disabled, onClick }: {
  slotIdx: number;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.03 } : undefined}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed transition-all",
        selected ? "border-amber-400 bg-amber-950/40 shadow-[0_0_12px_rgba(251,191,36,0.3)]" : "border-zinc-700/60 bg-zinc-900/40 hover:border-zinc-500 hover:bg-zinc-800/40",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      <div className="absolute left-0.5 top-0.5 z-30 flex h-4 w-4 items-center justify-center rounded bg-black/70 text-[7px] font-bold text-zinc-300">
        {slotIdx + 1}
      </div>
      <Plus className="h-5 w-5 text-zinc-500" strokeWidth={2.4} />
      <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-500">
        Vacío
      </span>
      {selected && (
        <span className="text-[7px] font-black uppercase tracking-wider text-amber-400">
          + Carta
        </span>
      )}
    </motion.button>
  );
}
