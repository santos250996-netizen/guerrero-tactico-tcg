// Colores por carril compartidos entre PvpLane (PvP/historia).
// Extraído de LaneComponent (solitario, eliminado) en la auditoría de código muerto.
export const LANE_COLOR_CLASSES: Record<
  string,
  {
    bg: string;
    border: string;
    text: string;
    ring: string;
    glow: string;
    headerBg: string;
    dividerLine: string;
  }
> = {
  amber: {
    bg: "bg-gradient-to-b from-amber-950/60 via-zinc-950/80 to-black",
    border: "border-amber-700/50",
    text: "text-amber-300",
    ring: "ring-amber-400/60",
    glow: "shadow-[0_0_20px_-2px_rgba(251,191,36,0.2)]",
    headerBg: "bg-gradient-to-r from-amber-950/80 to-zinc-950/80",
    dividerLine: "from-amber-600/40",
  },
  sky: {
    bg: "bg-gradient-to-b from-sky-950/60 via-zinc-950/80 to-black",
    border: "border-sky-700/50",
    text: "text-sky-300",
    ring: "ring-sky-400/60",
    glow: "shadow-[0_0_20px_-2px_rgba(56,189,248,0.2)]",
    headerBg: "bg-gradient-to-r from-sky-950/80 to-zinc-950/80",
    dividerLine: "from-sky-600/40",
  },
  rose: {
    bg: "bg-gradient-to-b from-rose-950/60 via-zinc-950/80 to-black",
    border: "border-rose-700/50",
    text: "text-rose-300",
    ring: "ring-rose-400/60",
    glow: "shadow-[0_0_20px_-2px_rgba(244,63,94,0.2)]",
    headerBg: "bg-gradient-to-r from-rose-950/80 to-zinc-950/80",
    dividerLine: "from-rose-600/40",
  },
  // ── Mago (V3) ──
  violet: {
    bg: "bg-gradient-to-b from-violet-950/60 via-zinc-950/80 to-black",
    border: "border-violet-700/50",
    text: "text-violet-300",
    ring: "ring-violet-400/60",
    glow: "shadow-[0_0_20px_-2px_rgba(139,92,246,0.2)]",
    headerBg: "bg-gradient-to-r from-violet-950/80 to-zinc-950/80",
    dividerLine: "from-violet-600/40",
  },
  orange: {
    bg: "bg-gradient-to-b from-orange-950/60 via-zinc-950/80 to-black",
    border: "border-orange-700/50",
    text: "text-orange-300",
    ring: "ring-orange-400/60",
    glow: "shadow-[0_0_20px_-2px_rgba(249,115,22,0.2)]",
    headerBg: "bg-gradient-to-r from-orange-950/80 to-zinc-950/80",
    dividerLine: "from-orange-600/40",
  },
  cyan: {
    bg: "bg-gradient-to-b from-cyan-950/60 via-zinc-950/80 to-black",
    border: "border-cyan-700/50",
    text: "text-cyan-300",
    ring: "ring-cyan-400/60",
    glow: "shadow-[0_0_20px_-2px_rgba(34,211,238,0.2)]",
    headerBg: "bg-gradient-to-r from-cyan-950/80 to-zinc-950/80",
    dividerLine: "from-cyan-600/40",
  },
  // ── Asesino (V3) ──
  lime: {
    bg: "bg-gradient-to-b from-lime-950/60 via-zinc-950/80 to-black",
    border: "border-lime-700/50",
    text: "text-lime-300",
    ring: "ring-lime-400/60",
    glow: "shadow-[0_0_20px_-2px_rgba(132,204,22,0.2)]",
    headerBg: "bg-gradient-to-r from-lime-950/80 to-zinc-950/80",
    dividerLine: "from-lime-600/40",
  },
  red: {
    bg: "bg-gradient-to-b from-red-950/60 via-zinc-950/80 to-black",
    border: "border-red-700/50",
    text: "text-red-300",
    ring: "ring-red-400/60",
    glow: "shadow-[0_0_20px_-2px_rgba(239,68,68,0.2)]",
    headerBg: "bg-gradient-to-r from-red-950/80 to-zinc-950/80",
    dividerLine: "from-red-600/40",
  },
  indigo: {
    bg: "bg-gradient-to-b from-indigo-950/60 via-zinc-950/80 to-black",
    border: "border-indigo-700/50",
    text: "text-indigo-300",
    ring: "ring-indigo-400/60",
    glow: "shadow-[0_0_20px_-2px_rgba(99,102,241,0.2)]",
    headerBg: "bg-gradient-to-r from-indigo-950/80 to-zinc-950/80",
    dividerLine: "from-indigo-600/40",
  },
};
