"use client";

import { useEffect, useState } from "react";
import { useGameStore, flashLaneBonuses } from "@/store/gameStore";
import { useSettings } from "@/lib/settings";
import { HandBar } from "@/components/game/HandBar";
import { LaneComponent } from "@/components/game/LaneComponent";
import { GameOverModal } from "@/components/game/GameOverModal";
import { RulesModal } from "@/components/game/RulesModal";
import { HistoryModal } from "@/components/game/HistoryModal";
import { DeckEditor } from "@/components/game/DeckEditor";
import { MainMenu } from "@/components/game/MainMenu";
import { ClassSelect } from "@/components/game/ClassSelect";
import { ProfileScreen } from "@/components/game/ProfileScreen";
import { PvpRoot } from "@/components/game/pvp/PvpRoot";
import { OnboardingModal } from "@/components/game/OnboardingModal";
import { SettingsModal } from "@/components/game/SettingsModal";
import { CardPreviewModal } from "@/components/game/CardPreviewModal";
import { TurnTransitionBanner } from "@/components/game/TurnTransitionBanner";
import { FloatingNumbersLayer } from "@/components/game/FloatingNumbers";
import { FxLayer } from "@/components/game/FxLayer";
import { CardJuiceLayer } from "@/components/game/CardJuiceLayer";
import { CornerOrnaments } from "@/components/game/CardFrame";
import { Confetti } from "@/components/game/Confetti";
import { LegendaryBurst } from "@/components/game/LegendaryBurst";
import type { LaneId } from "@/lib/game/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Activity, Loader2 } from "lucide-react";
import { BattleLogList } from "@/components/game/BattleLogList";

export default function Home() {
  const initGame = useGameStore((s) => s.initGame);
  const loadDeckAndPool = useGameStore((s) => s.loadDeckAndPool);
  const deckLoading = useGameStore((s) => s.deckLoading);
  const phase = useGameStore((s) => s.phase);
  const view = useGameStore((s) => s.view);
  const aiTurnPhase = useGameStore((s) => s.aiTurnPhase);
  const previewCard = useGameStore((s) => s.previewCard);
  const setPreviewCard = useGameStore((s) => s.setPreviewCard);
  const finalResult = useGameStore((s) => s.finalResult);
  const activeLanes = useGameStore((s) => s.activeLanes);
  const legendaryBurst = useGameStore((s) => s.legendaryBurst);
  const onboardingSeen = useSettings((s) => s.onboardingSeen);

  const [rulesOpen, setRulesOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
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

  if (view === "main-menu") return <MainMenu />;
  if (view === "class-select") return <ClassSelect />;
  if (view === "profile") return <ProfileScreen />;
  if (view === "editor") return <DeckEditor />;
  if (view === "pvp") return <PvpRoot />;
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
      {/* Top of the screen is intentionally empty — header bar was removed so
          the lanes get maximum vertical space. Turn + Energy + DrawPile are
           now in the HandBar (above the hand cards). Opciones button is also
           in the HandBar action bar (where Salir used to be). */}

      <main className="app-main mx-auto flex w-full flex-1 flex-col px-2 py-2">
        {/* h-full + grid-rows-1 + min-h-0 makes the grid fill the available
            vertical space, stretching the lane sections to cover the gap
            between the (removed) header and the hand bar.
            data-board-root: ancla de la sacudida global del tablero (juice). */}
        <div
          data-board-root
          className="relative grid h-full grid-cols-3 grid-rows-1 gap-1.5 min-h-0 rounded-lg"
        >
          {/* Filigranas heráldicas en las esquinas del tablero completo */}
          <CornerOrnaments size={30} className="-inset-x-1 -inset-y-1 z-20" />
          {activeLanes.map((lane: LaneId) => (
            <LaneComponent key={lane} laneId={lane} />
          ))}
        </div>
      </main>

      <HandBar
        onOpenRegistro={() => setRegistroOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Overlays */}
      <TurnTransitionBanner visible={aiTurnPhase === "banner"} phase="transition" />
      <TurnTransitionBanner visible={aiTurnPhase === "thinking"} phase="thinking" />
      <FloatingNumbersLayer />
      <FxLayer />
      <CardJuiceLayer />
      <Confetti trigger={phase === "ended" && finalResult?.result === "WIN"} />
      <LegendaryBurst trigger={legendaryBurst} onDone={() => useGameStore.setState({ legendaryBurst: false })} />

      {/* Modals */}
      <GameOverModal open={phase === "ended"} />
      <RulesModal open={rulesOpen} onOpenChange={setRulesOpen} />
      <HistoryModal open={historyOpen} onOpenChange={setHistoryOpen} />
      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        showExitToMenu
        onOpenRules={() => { setSettingsOpen(false); setRulesOpen(true); }}
      />
      <OnboardingModal
        open={showOnboarding}
        onClose={() => {
          setShowOnboarding(false);
          // Re-trigger the lane bonus flash so the user sees the effects
          // AFTER the onboarding modal closes (the initial flash triggered
          // in initGame would have auto-cleared during the onboarding).
          flashLaneBonuses(useGameStore.getState().laneBonuses);
        }}
      />
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
            <BattleLogList />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
