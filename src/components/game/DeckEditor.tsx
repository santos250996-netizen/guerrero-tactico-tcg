"use client";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Save, RotateCcw, Layers, Coins, Swords, Flame, Lock, Unlock, Trash2 } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { Button } from "@/components/ui/button";
import { CATEGORY_META, RARITY_META } from "@/lib/game/types";
import type { CardDef, CardCategory, LaneId, Rarity } from "@/lib/game/types";
import { cn } from "@/lib/utils";
import { CardPreviewModal } from "./CardPreviewModal";

const COST_BUCKETS = [1, 2, 3, 4, 5] as const;

export function DeckEditor() {
  const cardPool = useGameStore((s) => s.cardPool);
  const deckCardIds = useGameStore((s) => s.deckCardIds);
  const deckDirty = useGameStore((s) => s.deckDirty);
  const deckSaveStatus = useGameStore((s) => s.deckSaveStatus);
  const setView = useGameStore((s) => s.setView);
  const saveDeck = useGameStore((s) => s.saveDeck);
  const resetDeck = useGameStore((s) => s.resetDeck);
  const swapCardInDeck = useGameStore((s) => s.swapCardInDeck);
  const setPreviewCard = useGameStore((s) => s.setPreviewCard);
  const previewCard = useGameStore((s) => s.previewCard);
  const [rarityFilter, setRarityFilter] = useState<Rarity | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<CardCategory | "all">("all");
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [deckLocked, setDeckLocked] = useState(false);

  const deckCards = useMemo(() => deckCardIds.map((id) => cardPool.find((c) => c.id === id)).filter((c): c is CardDef => Boolean(c)), [deckCardIds, cardPool]);
  const availableCards = useMemo(() => cardPool.filter((c) => { if (deckCardIds.includes(c.id)) return false; if (rarityFilter !== "all" && c.rarity !== rarityFilter) return false; if (categoryFilter !== "all" && c.category !== categoryFilter) return false; return true; }), [cardPool, deckCardIds, rarityFilter, categoryFilter]);
  const costCurve = useMemo(() => { const c: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }; for (const d of deckCards) if (c[d.cost] !== undefined) c[d.cost]++; return c; }, [deckCards]);
  const totalCost = useMemo(() => deckCards.reduce((a, c) => a + c.cost, 0), [deckCards]);
  const totalPower = useMemo(() => deckCards.reduce((a, c) => a + c.power, 0), [deckCards]);
  const avgCost = deckCards.length > 0 ? (totalCost / deckCards.length).toFixed(1) : "0";
  const avgPower = deckCards.length > 0 ? (totalPower / deckCards.length).toFixed(1) : "0";
  const maxCurveVal = Math.max(1, ...Object.values(costCurve));

  const handlePoolCardClick = (cardId: string) => {
    if (selectedSlot === null || deckLocked) { const card = cardPool.find((c) => c.id === cardId); if (card) setPreviewCard(card); return; }
    swapCardInDeck(selectedSlot, cardId); setSelectedSlot(null);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-zinc-950 to-black text-zinc-100">
      <header className="flex items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-950/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <Button size="sm" variant="outline" className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800" onClick={() => setView("game")}><ArrowLeft className="h-4 w-4" /><span className="hidden sm:inline">Volver al juego</span><span className="sm:hidden">Volver</span></Button>
          <div className="leading-tight"><div className="text-[10px] uppercase tracking-widest text-amber-400">Editor</div><div className="text-sm font-bold text-white">Tu Mazo</div></div>
        </div>
        <div className="flex items-center gap-2">
          {deckSaveStatus === "saving" && <span className="text-[10px] text-zinc-400">Guardando…</span>}
          {deckSaveStatus === "ok" && <span className="text-[10px] text-emerald-400">¡Guardado!</span>}
          {deckSaveStatus === "err" && <span className="text-[10px] text-rose-400">Error</span>}
          <Button size="sm" variant="outline" className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800" onClick={() => resetDeck()}><RotateCcw className="h-3.5 w-3.5" /><span className="hidden sm:inline">Resetear</span></Button>
          <Button size="sm" variant="outline" className="border-rose-800/50 bg-rose-950/40 text-rose-300 hover:bg-rose-900/40" onClick={() => { if (confirm("¿Vaciar el mazo? Tendrás que elegir 12 cartas de nuevo.")) { useGameStore.setState({ deckCardIds: [], deckDirty: true, deckSaveStatus: "idle" }); setSelectedSlot(null); } }} title="Vaciar todo el mazo" disabled={deckLocked}>
            <Trash2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">Vaciar</span>
          </Button>
          <Button size="sm" variant="outline" className={cn("border-zinc-700 text-zinc-200 hover:bg-zinc-800", deckLocked ? "bg-amber-900/40 border-amber-600/50 text-amber-300" : "bg-zinc-900")} onClick={() => { setDeckLocked(!deckLocked); setSelectedSlot(null); }} title={deckLocked ? "Mazo bloqueado: clic en cualquier carta para ver detalles" : "Mazo desbloqueado: puedes intercambiar cartas"}>
            {deckLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{deckLocked ? "Bloqueado" : "Bloquear"}</span>
          </Button>
          <Button size="sm" className={cn("bg-gradient-to-r from-amber-600 to-rose-600 text-white hover:from-amber-500 hover:to-rose-500", (!deckDirty || deckLocked) && "opacity-60")} disabled={!deckDirty || deckLocked} onClick={() => saveDeck()}><Save className="h-3.5 w-3.5" />Guardar</Button>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-4">
        <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <StatCard icon={<Layers className="h-4 w-4 text-zinc-400" />} label="Cartas" value={`${deckCards.length} / 12`} sub={`${availableCards.length} disponibles`} />
          <StatCard icon={<Coins className="h-4 w-4 text-sky-400" />} label="Coste medio" value={avgCost} sub={`${totalCost} total`} />
          <StatCard icon={<Swords className="h-4 w-4 text-rose-400" />} label="Poder medio" value={avgPower} sub={`${totalPower} total`} />
          <StatCard icon={<Flame className="h-4 w-4 text-amber-400" />} label="Rarezas" value={`${deckCards.filter(c=>c.rarity==="common").length}/${deckCards.filter(c=>c.rarity==="rare").length}/${deckCards.filter(c=>c.rarity==="epic").length}/${deckCards.filter(c=>c.rarity==="legendary").length}`} sub="C/R/E/L" />
        </section>
        <section className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Curva de coste</div>
          <div className="flex items-end justify-between gap-2" style={{ height: "60px" }}>
            {COST_BUCKETS.map((c) => { const count = costCurve[c] ?? 0; const hpct = (count / maxCurveVal) * 100; return (
              <div key={c} className="flex flex-1 flex-col items-center gap-1"><div className="text-[9px] font-bold tabular-nums text-zinc-300">{count}</div><div className="flex w-full flex-1 items-end justify-center" style={{ minHeight: "30px" }}><div className="w-full max-w-[24px] rounded-t bg-gradient-to-t from-sky-700 to-sky-400 transition-all duration-300" style={{ height: `${Math.max(2, hpct)}%` }} /></div><div className="text-[9px] font-bold text-sky-400">⚡{c}</div></div>
            ); })}
          </div>
        </section>
        <section className="rounded-lg border border-amber-800/40 bg-amber-950/20 p-3">
          <div className="mb-3 flex items-center justify-between"><div><h2 className="text-sm font-bold uppercase tracking-wider text-amber-300">Tu Mazo · 12 cartas</h2><p className="text-[10px] text-zinc-400">{deckLocked ? "Mazo bloqueado — clic en cualquier carta para ver detalles" : selectedSlot === null ? "Toca una carta del mazo para seleccionarla." : `Slot ${selectedSlot + 1} seleccionado — elige una disponible`}</p></div>{selectedSlot !== null && !deckLocked && <Button size="sm" variant="ghost" className="text-zinc-400" onClick={() => setSelectedSlot(null)}>Cancelar</Button>}</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {deckCards.map((card, idx) => { const cat = CATEGORY_META[card.category]; const rar = RARITY_META[card.rarity]; return (
              <motion.button key={`${card.id}-${idx}`} layout whileHover={{ y: -4 }} whileTap={{ scale: 0.97 }} onClick={() => { if (deckLocked) { setPreviewCard(card); return; } setSelectedSlot(selectedSlot === idx ? null : idx); }} className={cn("relative flex flex-col overflow-hidden rounded-lg border-2 bg-zinc-900 text-left", deckLocked ? "cursor-pointer" : selectedSlot === idx ? "border-yellow-400 ring-2 ring-yellow-400/50" : rar.borderClass)}>
                <div className="absolute left-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded bg-black/70 text-[9px] font-bold text-zinc-300">{idx + 1}</div>
                <div className="relative h-20 w-full overflow-hidden bg-zinc-950"><img src={`/cards/${card.id}.png`} alt={card.name} className="h-full w-full object-cover" loading="lazy" draggable={false} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} /><div className="absolute right-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-white/80 bg-sky-600 text-[9px] font-bold text-white">{card.cost}</div><div className="absolute bottom-1 right-1 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-white/80 bg-rose-600 text-[9px] font-bold text-white">{card.power}</div></div>
                <div className="p-1.5"><div className={cn("text-[10px] font-bold", cat.textClass)}>{card.name}</div><div className="text-[8px] uppercase text-zinc-500">{cat.label} · {card.subtypes.join("/")}</div></div>
              </motion.button>
            ); })}
          </div>
        </section>
        <section className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Cartas Disponibles · {availableCards.length}</h2></div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            <span className="text-[9px] font-bold uppercase text-zinc-500 self-center mr-1">Rareza:</span>
            {(["all","common","rare","epic","legendary"] as const).map((r) => <button key={r} onClick={() => setRarityFilter(r)} className={cn("rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider", rarityFilter === r ? "border-amber-400 bg-amber-900/40 text-amber-300" : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800")}>{r === "all" ? "Todas" : RARITY_META[r as Rarity]?.label || r}</button>)}
            <span className="text-[9px] font-bold uppercase text-zinc-500 self-center ml-2 mr-1">Cat:</span>
            {(["all","Ataque","Ítem","Acción"] as const).map((c) => <button key={c} onClick={() => setCategoryFilter(c)} className={cn("rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider", categoryFilter === c ? "border-amber-400 bg-amber-900/40 text-amber-300" : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800")}>{c === "all" ? "Todas" : c}</button>)}
          </div>
          {availableCards.length === 0 ? <div className="rounded border border-dashed border-zinc-800 bg-zinc-900/40 p-6 text-center text-xs text-zinc-500">No hay cartas con este filtro.</div> :
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {availableCards.map((card) => { const cat = CATEGORY_META[card.category]; const rar = RARITY_META[card.rarity]; return (
              <motion.button key={card.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4, scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => handlePoolCardClick(card.id)} className={cn("relative flex flex-col overflow-hidden rounded-lg border-2 bg-zinc-900 text-left", selectedSlot === null ? "border-zinc-800 opacity-70" : cn(rar.borderClass, "cursor-pointer"))}>
                <div className="relative h-20 w-full overflow-hidden bg-zinc-950"><img src={`/cards/${card.id}.png`} alt={card.name} className="h-full w-full object-cover" loading="lazy" draggable={false} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} /><div className="absolute right-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-white/80 bg-sky-600 text-[9px] font-bold text-white">{card.cost}</div><div className="absolute bottom-1 right-1 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-white/80 bg-rose-600 text-[9px] font-bold text-white">{card.power}</div></div>
                <div className="p-1.5"><div className={cn("text-[10px] font-bold", cat.textClass)}>{card.name}</div><div className="text-[8px] uppercase text-zinc-500">{cat.label} · {card.subtypes.join("/")}</div></div>
              </motion.button>
            ); })}
          </div>}
        </section>
      </main>
      <CardPreviewModal card={previewCard} open={previewCard !== null} onOpenChange={(o) => { if (!o) setPreviewCard(null); }} />
      <footer className="mt-auto border-t border-zinc-800 bg-zinc-950 px-4 py-1.5 text-center text-[10px] text-zinc-500">Mazo fijo de 12 cartas únicas · Sin duplicados · Persiste en SQLite · Clic en cualquier carta para previsualizar</footer>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2"><div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-400">{icon}{label}</div><div className="mt-1 text-xl font-bold tabular-nums text-white">{value}</div><div className="text-[10px] text-zinc-500">{sub}</div></div>;
}
