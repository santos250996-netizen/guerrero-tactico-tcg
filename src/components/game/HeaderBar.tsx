"use client";

import { BookOpen, History, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderBarProps {
  onOpenRules: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
}

export function HeaderBar({ onOpenRules, onOpenHistory, onOpenSettings }: HeaderBarProps) {
  return (
    <header className="relative flex items-center justify-end gap-0.5 bg-zinc-950 px-2 pt-2 pb-1.5">
      {/* Slim header — only essential action buttons on the right.
          Brand, deck editor, profile, turn/energy were moved out to keep
          the top clean (user can still access deck/profile via main menu,
          and turn/energy now floats above the hand). */}
      <Button size="sm" variant="outline" className="h-7 w-7 border-zinc-700 bg-zinc-900 p-0 text-zinc-200 hover:bg-zinc-800" onClick={onOpenRules} title="Reglas">
        <BookOpen className="h-3.5 w-3.5" />
      </Button>
      <Button size="sm" variant="outline" className="h-7 w-7 border-zinc-700 bg-zinc-900 p-0 text-zinc-200 hover:bg-zinc-800" onClick={onOpenHistory} title="Historial">
        <History className="h-3.5 w-3.5" />
      </Button>
      <Button size="sm" variant="outline" className="h-7 w-7 border-amber-600/40 bg-amber-950/30 p-0 text-amber-300 hover:bg-amber-900/40" onClick={onOpenSettings} title="Ajustes / Salir">
        <Settings className="h-3.5 w-3.5" />
      </Button>
    </header>
  );
}
