"use client";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Save, RotateCcw, Layers, Coins, Swords, Flame, Lock, Unlock, Trash2, Scale } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { Button } from "@/components/ui/button";
import { CATEGORY_META, RARITY_META } from "@/lib/game/types";
import type { CardDef, CardCategory, LaneId, Rarity } from "@/lib/game/types";
import { cn } from "@/lib/utils";
import { CardPreviewModal } from "./CardPreviewModal";
import { getBalanceInfo, getDeckBalanceSummary } from "@/lib/game/balance";

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

  // Balance summary — how many deck cards are balanced/marginal/unbalanced
  const balanceSummary = useMemo(() => getDeckBalanceSummary(deckCards), [deckCards]);

  const handlePoolCardClick = (cardId: string) => {
    if (selectedSlot === null || deckLocked) { const card = cardPool.find((c) => c.id === cardId); if (card) setPreviewCard(card); return; }
    swapCardInDeck(selectedSlot, cardId); setSelectedSlot(null);
  };

  return (
    <div className="app-frame text-zinc-100">
      <header className="flex items-center justify-between gap-1.5 border-b border-zinc-800 bg-zinc-950/90 px-2.5 pt-3 pb-2 backdrop-blur">
        <div className="flex items-center gap-1.5 min-w-0">
          <Button size="sm" variant="outline" className="h-7 border-zinc-700 bg-zinc-900 px-2 text-zinc-200 hover:bg-zinc-800" onClick={() => setView("game")}><ArrowLeft className="h-3.5 w-3.5" /><span className="text-[10px]">Volver</span></Button>
          <div className="leading-tight min-w-0"><div className="text-[9px] uppercase tracking-widest text-amber-400">Editor</div><div className="text-[11px] font-bold text-white">Tu Mazo</div></div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {deckSaveStatus === "saving" && <span className="text-[8px] text-zinc-400">…</span>}
          {deckSaveStatus === "ok" && <span className="text-[8px] text-emerald-400">✓</span>}
          {deckSaveStatus === "err" && <span className="text-[8px] text-rose-400">!</span>}
          <Button size="sm" variant="outline" className="h-7 w-7 border-zinc-700 bg-zinc-900 p-0 text-zinc-200 hover:bg-zinc-800" onClick={() => resetDeck()} title="Resetear"><RotateCcw className="h-3 w-3" /></Button>
          <Button size="sm" variant="outline" className="h-7 w-7 border-rose-800/50 bg-rose-950/40 p-0 text-rose-300 hover:bg-rose-900/40" onClick={() => { if (confirm("¿Vaciar el mazo? Tendrás que elegir 12 cartas de nuevo.")) { useGameStore.setState({ deckCardIds: [], deckDirty: true, deckSaveStatus: "idle" }); setSelectedSlot(null); } }} title="Vaciar todo el mazo" disabled={deckLocked}>
            <Trash2 className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="outline" className={cn("h-7 w-7 p-0", deckLocked ? "bg-amber-900/40 border-amber-600/50 text-amber-300" : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800")} onClick={() => { setDeckLocked(!deckLocked); setSelectedSlot(null); }} title={deckLocked ? "Mazo bloqueado" : "Bloquear mazo"}>
            {deckLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
          </Button>
          <Button size="sm" className={cn("h-7 bg-gradient-to-r from-amber-600 to-rose-600 px-2 text-white hover:from-amber-500 hover:to-rose-500", (!deckDirty || deckLocked) && "opacity-60")} disabled={!deckDirty || deckLocked} onClick={() => saveDeck()}><Save className="h-3 w-3" /><span className="text-[10px]">Guardar</span></Button>
        </div>
      </header>
      <main className="app-main mx-auto flex w-full flex-1 flex-col gap-2 px-2 py-2">
        {/* Stats grid */}
        <section className="grid grid-cols-2 gap-1.5">
          <StatCard icon={<Layers className="h-3 w-3 text-zinc-400" />} label="Cartas" value={`${deckCards.length} / 12`} sub={`${availableCards.length} disp.`} />
          <StatCard icon={<Coins className="h-3 w-3 text-sky-400" />} label="Coste" value={avgCost} sub={`${totalCost} tot.`} />
          <StatCard icon={<Swords className="h-3 w-3 text-rose-400" />} label="Poder" value={avgPower} sub={`${totalPower} tot.`} />
          <StatCard icon={<Flame className="h-3 w-3 text-amber-400" />} label="Rarezas" value={`${deckCards.filter(c=>c.rarity==="common").length}/${deckCards.filter(c=>c.rarity==="rare").length}/${deckCards.filter(c=>c.rarity==="epic").length}/${deckCards.filter(c=>c.rarity==="legendary").length}`} sub="C/R/E/L" />
        </section>

        {/* Balance summary — fórmula matemática PTP = cost*4 + 1.5 ± 0.5 */}
        <section className="rounded-md border border-zinc-800 bg-zinc-950/60 p-2">
          <div className="mb-1 flex items-center justify-between">
            <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
              <Scale className="h-3 w-3" />
              Balance PTP
            </div>
            <div className="text-[7px] text-zinc-500">
              {balanceSummary.balanced}/{balanceSummary.total} OK · Δmed={balanceSummary.avgDelta >= 0 ? "+" : ""}{balanceSummary.avgDelta.toFixed(2)}
            </div>
          </div>
          {/* Stacked bar showing balanced / marginal / unbalanced proportions */}
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-black/60">
            <div className="bg-emerald-500 transition-all duration-300" style={{ width: `${(balanceSummary.balanced / Math.max(1, balanceSummary.total)) * 100}%` }} />
            <div className="bg-amber-500 transition-all duration-300" style={{ width: `${(balanceSummary.marginal / Math.max(1, balanceSummary.total)) * 100}%` }} />
            <div className="bg-rose-500 transition-all duration-300" style={{ width: `${(balanceSummary.unbalanced / Math.max(1, balanceSummary.total)) * 100}%` }} />
          </div>
          <div className="mt-1 flex items-center justify-between text-[7px] font-bold uppercase tracking-wider">
            <span className="text-emerald-400">✓ {balanceSummary.balanced}</span>
            <span className="text-amber-400">~ {balanceSummary.marginal}</span>
            <span className="text-rose-400">✗ {balanceSummary.unbalanced}</span>
          </div>
        </section>

        {/* Cost curve */}
        <section className="rounded-md border border-zinc-800 bg-zinc-950/60 p-2">
          <div className="mb-1 text-[9px] font-bold uppercase tracking-wider text-zinc-400">Curva de coste</div>
          <div className="flex items-end justify-between gap-1" style={{ height: "40px" }}>
            {COST_BUCKETS.map((c) => { const count = costCurve[c] ?? 0; const hpct = (count / maxCurveVal) * 100; return (
              <div key={c} className="flex flex-1 flex-col items-center gap-0.5"><div className="text-[8px] font-bold tabular-nums text-zinc-300">{count}</div><div className="flex w-full flex-1 items-end justify-center" style={{ minHeight: "20px" }}><div className="w-full max-w-[16px] rounded-t bg-gradient-to-t from-sky-700 to-sky-400 transition-all duration-300" style={{ height: `${Math.max(2, hpct)}%` }} /></div><div className="text-[8px] font-bold text-sky-400">⚡{c}</div></div>
            ); })}
          </div>
        </section>

        {/* Tu Mazo */}
        <section className="rounded-md border border-amber-800/40 bg-amber-950/20 p-2">
          <div className="mb-2 flex items-center justify-between"><div><h2 className="text-[11px] font-bold uppercase tracking-wider text-amber-300">Tu Mazo · 12</h2><p className="text-[8px] text-zinc-400">{deckLocked ? "Bloqueado — clic para ver" : selectedSlot === null ? "Toca una carta del mazo para seleccionarla." : `Slot ${selectedSlot + 1} — elige disponible`}</p></div>{selectedSlot !== null && !deckLocked && <Button size="sm" variant="ghost" className="h-6 text-[9px] text-zinc-400" onClick={() => setSelectedSlot(null)}>Cancelar</Button>}</div>
          <div className="grid grid-cols-3 gap-1.5">
            {deckCards.map((card, idx) => {
              const cat = CATEGORY_META[card.category]; const rar = RARITY_META[card.rarity];
              const bal = getBalanceInfo(card);
              const balColor = bal.status === "balanced" ? "bg-emerald-600" : bal.status === "marginal" ? "bg-amber-600" : "bg-rose-600";
              const balSign = bal.delta > 0 ? "+" : "";
              return (
              <motion.button key={`${card.id}-${idx}`} layout whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={() => { if (deckLocked) { setPreviewCard(card); return; } setSelectedSlot(selectedSlot === idx ? null : idx); }} className={cn("relative flex flex-col overflow-hidden rounded border-2 bg-zinc-900 text-left", deckLocked ? "cursor-pointer" : selectedSlot === idx ? "border-yellow-400 ring-2 ring-yellow-400/50" : rar.borderClass)}>
                <div className="absolute left-0.5 top-0.5 z-10 flex h-4 w-4 items-center justify-center rounded bg-black/70 text-[7px] font-bold text-zinc-300">{idx + 1}</div>
                <div className="relative h-16 w-full overflow-hidden bg-zinc-950"><img src={`/cards/${card.id}.png`} alt={card.name} className="h-full w-full object-cover" loading="lazy" draggable={false} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} /><div className="absolute right-0.5 top-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full border border-white/80 bg-sky-600 text-[7px] font-bold text-white">{card.cost}</div><div className="absolute bottom-0.5 right-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full border border-white/80 bg-rose-600 text-[7px] font-bold text-white">{card.power}</div></div>
                <div className="px-1 py-0.5">
                  <div className={cn("truncate text-[8px] font-bold", cat.textClass)}>{card.name}</div>
                  <div className="flex items-center justify-between">
                    <div className="truncate text-[7px] uppercase text-zinc-500">{cat.label}</div>
                    {/* Balance badge — color-coded per status with delta value */}
                    <div title={`PTP objetivo: ${bal.target.toFixed(1)} · actual: ${bal.current.toFixed(1)} · Δ=${bal.delta >= 0 ? "+" : ""}${bal.delta.toFixed(1)}`} className={cn("flex h-3 items-center rounded px-0.5 text-[6px] font-bold text-white", balColor)}>
                      {balSign}{bal.delta.toFixed(1)}
                    </div>
                  </div>
                </div>
              </motion.button>
              );
            })}
          </div>
        </section>

        {/* Disponibles */}
        <section className="rounded-md border border-zinc-800 bg-zinc-950/60 p-2">
          <div className="mb-2 flex items-center justify-between"><h2 className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">Disponibles · {availableCards.length}</h2></div>
          <div className="mb-2 flex flex-wrap gap-1">
            {(["all","common","rare","epic","legendary"] as const).map((r) => <button key={r} onClick={() => setRarityFilter(r)} className={cn("rounded border px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider", rarityFilter === r ? "border-amber-400 bg-amber-900/40 text-amber-300" : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800")}>{r === "all" ? "Todas" : RARITY_META[r as Rarity]?.label || r}</button>)}
            {(["all","Ataque","Ítem","Acción"] as const).map((c) => <button key={c} onClick={() => setCategoryFilter(c)} className={cn("rounded border px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider", categoryFilter === c ? "border-amber-400 bg-amber-900/40 text-amber-300" : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800")}>{c === "all" ? "Todas" : c}</button>)}
          </div>
          {availableCards.length === 0 ? <div className="rounded border border-dashed border-zinc-800 bg-zinc-900/40 p-4 text-center text-[10px] text-zinc-500">No hay cartas con este filtro.</div> :
          <div className="grid grid-cols-3 gap-1.5">
            {availableCards.map((card) => {
              const cat = CATEGORY_META[card.category]; const rar = RARITY_META[card.rarity];
              const bal = getBalanceInfo(card);
              const balColor = bal.status === "balanced" ? "bg-emerald-600" : bal.status === "marginal" ? "bg-amber-600" : "bg-rose-600";
              const balSign = bal.delta > 0 ? "+" : "";
              return (
              <motion.button key={card.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -3, scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => handlePoolCardClick(card.id)} className={cn("relative flex flex-col overflow-hidden rounded border-2 bg-zinc-900 text-left", selectedSlot === null ? "border-zinc-800 opacity-70" : cn(rar.borderClass, "cursor-pointer"))}>
                <div className="relative h-16 w-full overflow-hidden bg-zinc-950"><img src={`/cards/${card.id}.png`} alt={card.name} className="h-full w-full object-cover" loading="lazy" draggable={false} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} /><div className="absolute right-0.5 top-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full border border-white/80 bg-sky-600 text-[7px] font-bold text-white">{card.cost}</div><div className="absolute bottom-0.5 right-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full border border-white/80 bg-rose-600 text-[7px] font-bold text-white">{card.power}</div></div>
                <div className="px-1 py-0.5">
                  <div className={cn("truncate text-[8px] font-bold", cat.textClass)}>{card.name}</div>
                  <div className="flex items-center justify-between">
                    <div className="truncate text-[7px] uppercase text-zinc-500">{cat.label}</div>
                    {/* Balance badge */}
                    <div title={`PTP objetivo: ${bal.target.toFixed(1)} · actual: ${bal.current.toFixed(1)} · Δ=${bal.delta >= 0 ? "+" : ""}${bal.delta.toFixed(1)}`} className={cn("flex h-3 items-center rounded px-0.5 text-[6px] font-bold text-white", balColor)}>
                      {balSign}{bal.delta.toFixed(1)}
                    </div>
                  </div>
                </div>
              </motion.button>
              );
            })}
          </div>}
        </section>
      </main>
      <CardPreviewModal card={previewCard} open={previewCard !== null} onOpenChange={(o) => { if (!o) setPreviewCard(null); }} />
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return <div className="rounded-md border border-zinc-800 bg-zinc-950/60 px-2 py-1.5"><div className="flex items-center gap-1 text-[8px] uppercase tracking-wider text-zinc-400">{icon}{label}</div><div className="mt-0.5 text-sm font-bold tabular-nums text-white">{value}</div><div className="text-[8px] text-zinc-500">{sub}</div></div>;
}
