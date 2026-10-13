"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { useSettings } from "@/lib/settings";
import { HeaderBar } from "@/components/game/HeaderBar";
import { HandBar } from "@/components/game/HandBar";
import { LaneComponent } from "@/components/game/LaneComponent";
import { GameOverModal } from "@/components/game/GameOverModal";
import { RulesModal } from "@/components/game/RulesModal";
import { HistoryModal } from "@/components/game/HistoryModal";
import { DeckEditor } from "@/components/game/DeckEditor";
import { OnboardingModal } from "@/components/game/OnboardingModal";
import { SettingsModal } from "@/components/game/SettingsModal";
import { CardPreviewModal } from "@/components/game/CardPreviewModal";
import { TurnTransitionBanner } from "@/components/game/TurnTransitionBanner";
import { FloatingNumbersLayer } from "@/components/game/FloatingNumbers";
import { Confetti } from "@/components/game/Confetti";
import { LegendaryBurst } from "@/components/game/LegendaryBurst";
import { ProfileModal } from "@/components/game/ProfileModal";
import { LANE_IDS } from "@/lib/game/engine";
import type { LaneId } from "@/lib/game/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Activity, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const initGame = useGameStore((s) => s.initGame);
  const loadDeckAndPool = useGameStore((s) => s.loadDeckAndPool);
  const deckLoading = useGameStore((s) => s.deckLoading);
  const phase = useGameStore((s) => s.phase);
  const view = useGameStore((s) => s.view);
  const log = useGameStore((s) => s.log);
  const aiTurnPhase = useGameStore((s) => s.aiTurnPhase);
  const previewCard = useGameStore((s) => s.previewCard);
  const setPreviewCard = useGameStore((s) => s.setPreviewCard);
  const finalResult = useGameStore((s) => s.finalResult);
  const legendaryBurst = useGameStore((s) => s.legendaryBurst);
  const onboardingSeen = useSettings((s) => s.onboardingSeen);

  const [rulesOpen, setRulesOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [registroOpen, setRegistroOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    (async () => {
      await loadDeckAndPool();
      initGame();
    })();
  }, [loadDeckAndPool, initGame]);

  useEffect(() => {
    if (!onboardingSeen && !deckLoading) {
      let cancelled = false;
      Promise.resolve().then(() => {
        if (!cancelled) setShowOnboarding(true);
      });
      return () => { cancelled = true; };
    }
  }, [onboardingSeen, deckLoading]);

  if (view === "editor") return <DeckEditor />;

  if (deckLoading) {
    return (
      <div className="app-frame items-center justify-center text-zinc-100">
        <Loader2 className="h-10 w-10 animate-spin text-amber-400" />
        <div className="mt-3 text-sm font-bold uppercase tracking-widest text-amber-400">Cargando batalla…</div>
      </div>
    );
  }

  return (
    <div className="app-frame text-zinc-100">
      <HeaderBar
        onOpenRules={() => setRulesOpen(true)}
        onOpenHistory={() => setHistoryOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenProfile={() => setProfileOpen(true)}
      />

      <main className="app-main mx-auto flex w-full flex-1 flex-col gap-2 px-2 py-2">
        <div className="grid grid-cols-3 gap-1.5">
          {LANE_IDS.map((lane: LaneId) => (
            <LaneComponent key={lane} laneId={lane} />
          ))}
        </div>
      </main>

      <HandBar onOpenRegistro={() => setRegistroOpen(true)} />

      {/* Overlays */}
      <TurnTransitionBanner visible={aiTurnPhase === "banner"} phase="transition" />
      <TurnTransitionBanner visible={aiTurnPhase === "thinking"} phase="thinking" />
      <FloatingNumbersLayer />
      <Confetti trigger={phase === "ended" && finalResult?.result === "WIN"} />
      <LegendaryBurst trigger={legendaryBurst} onDone={() => useGameStore.setState({ legendaryBurst: false })} />

      {/* Modals */}
      <GameOverModal open={phase === "ended"} />
      <RulesModal open={rulesOpen} onOpenChange={setRulesOpen} />
      <HistoryModal open={historyOpen} onOpenChange={setHistoryOpen} />
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
      <OnboardingModal open={showOnboarding} onClose={() => setShowOnboarding(false)} />
      <CardPreviewModal card={previewCard} open={previewCard !== null} onOpenChange={(o) => { if (!o) setPreviewCard(null); }} />

      {/* Registro de batalla modal */}
      <Dialog open={registroOpen} onOpenChange={setRegistroOpen}>
        <DialogContent className="max-h-[80vh] overflow-hidden border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <Activity className="h-4 w-4" />
              Registro de Batalla
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] overflow-y-auto">
            <div className="space-y-1 p-1">
              <AnimatePresence initial={false}>
                {log.length === 0 ? (
                  <div className="py-3 text-center text-[11px] text-zinc-600">Sin actividad todavía.</div>
                ) : (
                  log.map((entry) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`rounded border px-2 py-1 text-[10px] leading-tight ${
                        entry.side === "player"
                          ? "border-emerald-800/40 bg-emerald-950/30 text-emerald-200"
                          : entry.side === "enemy"
                            ? "border-rose-800/40 bg-rose-950/30 text-rose-200"
                            : "border-zinc-800 bg-zinc-900/40 text-zinc-300"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[9px] uppercase opacity-70">
                        <span>{entry.side === "player" ? "Tú" : entry.side === "enemy" ? "Rival" : "Sistema"}</span>
                        <span>T{entry.turn}</span>
                      </div>
                      <div>{entry.text}</div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
