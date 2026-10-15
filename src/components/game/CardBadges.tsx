"use client";
import { cn } from "@/lib/utils";

// =====================================================================
// CostBadge — cristal de energía hexagonal
// =====================================================================
export function CostBadge({ cost, size = "md" }: { cost: number; size?: "sm" | "md" | "lg" }) {
  const dims = size === "sm" ? "h-6 w-6" : size === "lg" ? "h-10 w-10" : "h-8 w-8";
  const fontSize = size === "sm" ? "text-[10px]" : size === "lg" ? "text-base" : "text-xs";
  return (
    <div className={cn("relative", dims)} style={{ filter: "drop-shadow(0 0 4px rgba(56,189,248,0.6))" }}>
      {/* Hexagonal crystal shape */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="cost-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#075985" />
          </linearGradient>
          <linearGradient id="cost-shine" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        {/* Hexagon crystal */}
        <polygon
          points="50,5 90,27 90,73 50,95 10,73 10,27"
          fill="url(#cost-grad)"
          stroke="rgba(255,255,255,0.9)"
          strokeWidth="3"
        />
        {/* Inner facet shine */}
        <polygon
          points="50,15 80,32 80,68 50,85 20,68 20,32"
          fill="url(#cost-shine)"
        />
        {/* Top facet line */}
        <line x1="50" y1="5" x2="50" y2="15" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
      </svg>
      {/* Number */}
      <div className={cn("absolute inset-0 flex items-center justify-center font-black text-white", fontSize)}>
        {cost}
      </div>
    </div>
  );
}

// =====================================================================
// PowerBadge — escudo de batalla
// =====================================================================
export function PowerBadge({ power, size = "md" }: { power: number; size?: "sm" | "md" | "lg" }) {
  const dims = size === "sm" ? "h-6 w-6" : size === "lg" ? "h-10 w-10" : "h-8 w-8";
  const fontSize = size === "sm" ? "text-[10px]" : size === "lg" ? "text-base" : "text-xs";
  return (
    <div className={cn("relative", dims)} style={{ filter: "drop-shadow(0 0 4px rgba(244,63,94,0.6))" }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="power-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="50%" stopColor="#e11d48" />
            <stop offset="100%" stopColor="#9f1239" />
          </linearGradient>
          <linearGradient id="power-shine" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        {/* Shield shape */}
        <path
          d="M50,5 L88,18 L88,50 Q88,78 50,95 Q12,78 12,50 L12,18 Z"
          fill="url(#power-grad)"
          stroke="rgba(255,255,255,0.9)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* Inner shield shine */}
        <path
          d="M50,15 L78,25 L78,48 Q78,70 50,85 Q22,70 22,48 L22,25 Z"
          fill="url(#power-shine)"
        />
        {/* Center vertical ridge line */}
        <line x1="50" y1="15" x2="50" y2="85" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
      </svg>
      {/* Number */}
      <div className={cn("absolute inset-0 flex items-center justify-center font-black text-white", fontSize)}>
        {power}
      </div>
    </div>
  );
}
