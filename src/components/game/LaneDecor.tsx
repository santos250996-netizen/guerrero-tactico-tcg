"use client";

// ============================================================================
// LaneDecor — ornamentos heráldicos del tablero (compartido solitario/PvP).
//
//   ▸ LaneBanner : cabecera-estandarte del carril (metal + remates + Cinzel).
//   ▸ EmptySlot  : slot vacío con runa circular + silueta del tipo de carta;
//                  pulsa en ámbar cuando puedes soltar ahí.
//   ▸ LaneEmblem : escudo con espadas cruzadas para el divisor central.
//   ▸ LANE_HEX   : hex del acento por color de carril (para SVG inline).
// ============================================================================

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Hex por clave de color de LANE_COLOR_CLASSES (paleta compartida). */
export const LANE_HEX: Record<string, string> = {
  amber: "#fbbf24",
  sky: "#38bdf8",
  rose: "#fb7185",
  violet: "#a78bfa",
  orange: "#fb923c",
  cyan: "#22d3ee",
  lime: "#a3e635",
  red: "#f87171",
  indigo: "#818cf8",
};

// ---------------------------------------------------------------------------
// LaneBanner — estandarte del carril
// ---------------------------------------------------------------------------

export function LaneBanner({
  title,
  icon: Icon,
  hex,
  right,
}: {
  title: string;
  icon: LucideIcon;
  hex: string;
  /** Contenido extra a la derecha (chip de bono en PvP). */
  right?: React.ReactNode;
}) {
  return (
    <div
      className="relative z-10 flex h-[17px] items-center justify-center gap-1 overflow-hidden rounded-[3px] px-1.5"
      style={{
        background: `linear-gradient(180deg, ${hex}2e 0%, rgba(0,0,0,0.72) 55%, rgba(0,0,0,0.85) 100%)`,
        border: `1px solid ${hex}59`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 3px rgba(0,0,0,0.6)`,
      }}
    >
      {/* remates metálicos laterales (rodamientos del estandarte) */}
      <span
        className="absolute left-0 top-1/2 h-2.5 w-1 -translate-y-1/2 rounded-[1px]"
        style={{ background: `linear-gradient(180deg, ${hex}, ${hex}66)`, boxShadow: `0 0 4px ${hex}88` }}
      />
      <span
        className="absolute right-0 top-1/2 h-2.5 w-1 -translate-y-1/2 rounded-[1px]"
        style={{ background: `linear-gradient(180deg, ${hex}, ${hex}66)`, boxShadow: `0 0 4px ${hex}88` }}
      />
      {/* punta de rombo central inferior */}
      <span
        className="absolute bottom-0 left-1/2 h-1 w-1 -translate-x-1/2 translate-y-1/2 rotate-45"
        style={{ background: hex, opacity: 0.85 }}
      />
      <Icon className="h-2.5 w-2.5 shrink-0" style={{ color: hex, filter: `drop-shadow(0 0 3px ${hex}aa)` }} />
      <span
        className="min-w-0 flex-1 truncate text-[8.5px] font-black uppercase leading-none tracking-[0.14em]"
        style={{
          fontFamily: "var(--font-cinzel), serif",
          color: hex,
          textShadow: "0 1px 2px rgba(0,0,0,0.9)",
        }}
      >
        {title}
      </span>
      {right && <div className="flex h-full shrink-0 items-center leading-none">{right}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmptySlot — hueco de carta con runa heráldica
// ---------------------------------------------------------------------------

export function EmptySlot({
  hex,
  icon: Icon,
  active,
  enemy,
}: {
  hex: string;
  icon: LucideIcon;
  /** Puede soltarse aquí → runa pulsante en ámbar. */
  active?: boolean;
  /** Fila rival → más tenue. */
  enemy?: boolean;
}) {
  const color = active ? "#fbbf24" : hex;
  return (
    <div
      className={cn(
        "relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-[5px]",
        active ? "border border-amber-400/60 bg-amber-400/[0.07]" : enemy ? "border border-white/[0.06] bg-black/25" : "border border-white/10 bg-black/20"
      )}
      style={
        active
          ? { boxShadow: "0 0 10px rgba(251,191,36,0.25), inset 0 0 8px rgba(251,191,36,0.12)" }
          : undefined
      }
    >
      {/* runa circular */}
      <svg
        viewBox="0 0 48 48"
        className={cn("absolute h-[78%] w-[78%]", active && "slot-pulse")}
        style={{ color }}
        aria-hidden
      >
        <circle cx="24" cy="24" r="17" stroke="currentColor" strokeOpacity={active ? 0.55 : 0.28} strokeWidth="1.2" strokeDasharray="3.5 3.5" fill="none" />
        <circle cx="24" cy="24" r="10.5" stroke="currentColor" strokeOpacity={active ? 0.4 : 0.18} strokeWidth="1" fill="none" />
        <path
          d="M24 4.5 v6 M24 37.5 v6 M4.5 24 h6 M37.5 24 h6"
          stroke="currentColor"
          strokeOpacity={active ? 0.6 : 0.3}
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M24 16.5 L31.5 24 L24 31.5 L16.5 24 Z"
          stroke="currentColor"
          strokeOpacity={active ? 0.5 : 0.22}
          strokeWidth="1.1"
          fill="none"
        />
      </svg>
      {/* silueta del tipo de carta que va aquí */}
      <Icon
        className={cn("relative h-4 w-4", active ? "text-amber-300" : "text-white/[0.14]")}
        style={active ? { filter: "drop-shadow(0 0 4px rgba(251,191,36,0.7))" } : undefined}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// LaneEmblem — escudo con espadas cruzadas (divisor central "VS")
// ---------------------------------------------------------------------------

export function LaneEmblem({ hex, size = 16 }: { hex?: string; size?: number }) {
  const accent = hex ?? "#fbbf24";
  return (
    <svg
      viewBox="0 0 24 24"
      style={{ width: size, height: size }}
      className="shrink-0 drop-shadow"
      aria-hidden
    >
      {/* escudo */}
      <path
        d="M12 2.5 L20 5.5 V11.5 Q20 17.5 12 21.5 Q4 17.5 4 11.5 V5.5 Z"
        fill="rgba(255,255,255,0.07)"
        stroke={accent}
        strokeOpacity="0.75"
        strokeWidth="1.3"
      />
      {/* espadas cruzadas */}
      <path
        d="M8.2 8 L15.8 15.6 M15.8 8 L8.2 15.6"
        stroke={accent}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* brillo */}
      <path d="M12 2.5 L20 5.5 V8 L12 5 Z" fill="#ffffff" opacity="0.14" />
    </svg>
  );
}
