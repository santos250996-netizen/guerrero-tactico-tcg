"use client";

// ============================================================================
// CardFrame — sistema de MARCOS TCG para todas las cartas del juego.
//
//   ▸ CardShell   : bisel metálico + filigranas de esquina por rareza +
//                   name plate integrado + foil holográfico (épica/legendaria)
//                   + grano de pergamino. Sustituye al antiguo "border-2 plano".
//   ▸ CornerOrnaments : filigranas reutilizables a escala de página (tablero).
//
// Sin assets nuevos: todo es SVG/CSS, nítido a cualquier tamaño y compatible
// con el pipeline existente (arte full-bleed en /cards/{id}.png).
// ============================================================================

import type { ReactNode } from "react";
import type { Rarity } from "@/lib/game/types";
import { cn } from "@/lib/utils";
import { isLowPowerDevice } from "@/lib/game/perf";

// ---------------------------------------------------------------------------
// Metadatos por rareza: metal del bisel, acento de filigranas, glow y foil
// ---------------------------------------------------------------------------

export interface FrameMeta {
  /** Gradiente del bisel exterior (marco metálico). */
  metal: string;
  /** Gradiente del name plate. */
  plate: string;
  /** Color de filigranas y filete interior. */
  accent: string;
  /** Color del texto del name plate. */
  nameText: string;
  /** Glow exterior del marco. */
  glow: string;
  /** Nivel de foil holográfico. */
  foil: "none" | "soft" | "full";
}

export const FRAME_META: Record<Rarity, FrameMeta> = {
  common: {
    metal: "linear-gradient(160deg, #3f4541 0%, #23282a 30%, #1a1e20 60%, #2b3130 100%)",
    plate: "linear-gradient(180deg, rgba(16,20,19,0.96) 0%, rgba(26,31,29,0.96) 100%)",
    accent: "#34d399",
    nameText: "#a7f3d0",
    glow: "0 0 10px rgba(52,211,153,0.22), 0 6px 16px rgba(0,0,0,0.75)",
    foil: "none",
  },
  rare: {
    metal: "linear-gradient(160deg, #46586b 0%, #26313d 30%, #1b232c 60%, #31404f 100%)",
    plate: "linear-gradient(180deg, rgba(13,20,27,0.96) 0%, rgba(22,31,40,0.96) 100%)",
    accent: "#38bdf8",
    nameText: "#bae6fd",
    glow: "0 0 12px rgba(56,189,248,0.3), 0 6px 16px rgba(0,0,0,0.75)",
    foil: "none",
  },
  epic: {
    metal: "linear-gradient(160deg, #52416e 0%, #2f2547 30%, #221a35 60%, #3b2d59 100%)",
    plate: "linear-gradient(180deg, rgba(20,14,31,0.96) 0%, rgba(31,23,48,0.96) 100%)",
    accent: "#a78bfa",
    nameText: "#ddd6fe",
    glow: "0 0 14px rgba(167,139,250,0.4), 0 6px 16px rgba(0,0,0,0.75)",
    foil: "soft",
  },
  legendary: {
    metal: "linear-gradient(160deg, #6b5320 0%, #463413 30%, #33260e 60%, #54401a 100%)",
    plate: "linear-gradient(180deg, rgba(30,21,7,0.97) 0%, rgba(44,32,12,0.97) 100%)",
    accent: "#fbbf24",
    nameText: "#fde68a",
    glow: "0 0 18px rgba(251,191,36,0.5), 0 6px 16px rgba(0,0,0,0.75)",
    foil: "full",
  },
  mythic: {
    metal: "linear-gradient(160deg, #7a1f33 0%, #4a1220 30%, #360c17 60%, #5c1628 100%)",
    plate: "linear-gradient(180deg, rgba(36,8,15,0.97) 0%, rgba(54,12,23,0.97) 100%)",
    accent: "#fb7185",
    nameText: "#fecdd3",
    glow: "0 0 20px rgba(244,63,94,0.6), 0 6px 18px rgba(0,0,0,0.8)",
    foil: "full",
  },
};

// ---------------------------------------------------------------------------
// Filigrana de esquina (SVG 24×24) — curl + hoja + gema. Se rota por esquina.
// ---------------------------------------------------------------------------

function CornerFiligree({ accent, className }: { accent: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("pointer-events-none", className)} aria-hidden>
      {/* diagonal principal */}
      <path
        d="M22 3 C13 3 6 7 3 15"
        fill="none"
        stroke={accent}
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.9"
      />
      {/* rizo inferior */}
      <path
        d="M3 15 C5.5 13.5 8.5 14.5 9 17 C9.4 19 7.6 20.4 6.2 19.6 C5.2 19 5.4 17.6 6.4 17.4"
        fill="none"
        stroke={accent}
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.75"
      />
      {/* hoja superior */}
      <path
        d="M22 3 C18 4.5 15.5 7 14.5 10 C17 9.5 20 7.5 22 3 Z"
        fill={accent}
        opacity="0.5"
      />
      {/* gema en el vértice */}
      <rect
        x="19.2"
        y="0.2"
        width="3.6"
        height="3.6"
        rx="0.7"
        transform="rotate(45 21 2)"
        fill={accent}
        opacity="0.95"
      />
    </svg>
  );
}

/** Las 4 filigranas de esquina posicionadas sobre el marco (rotadas por CSS). */
export function FrameCorners({ accent, size = 16 }: { accent: string; size?: number }) {
  const base: React.CSSProperties = { position: "absolute", width: size, height: size, zIndex: 35 };
  return (
    <div className="pointer-events-none absolute inset-0 z-[35]">
      <div style={{ ...base, left: 1, top: 1 }}><CornerFiligree accent={accent} className="h-full w-full" /></div>
      <div style={{ ...base, right: 1, top: 1, transform: "scaleX(-1)" }}><CornerFiligree accent={accent} className="h-full w-full" /></div>
      <div style={{ ...base, left: 1, bottom: 1, transform: "scaleY(-1)" }}><CornerFiligree accent={accent} className="h-full w-full" /></div>
      <div style={{ ...base, right: 1, bottom: 1, transform: "scale(-1)" }}><CornerFiligree accent={accent} className="h-full w-full" /></div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CardShell — el marco completo
// ---------------------------------------------------------------------------

interface CardShellProps {
  rarity: Rarity;
  /** Contenido interior (arte + badges + chips). Ocupa el 100% del hueco. */
  children: ReactNode;
  /** Nombre para el name plate integrado (opcional — en minis no va). */
  name?: string;
  /** Tamaño del texto del name plate. */
  nameSize?: "sm" | "md" | "lg";
  /** Fuerza del foil (por defecto lo decide la rareza; low-power lo apaga). */
  foil?: "none" | "soft" | "full" | "auto";
  /** Filigranas de esquina (default true). */
  corners?: boolean;
  /** Tamaño de las filigranas. */
  cornerSize?: number;
  /** Pips de TIER DE FUSIÓN (G1): ◆ rara · ◆◆ épica · ◆◆◆ legendaria.
   *  Las cartas materializadas muestran así su tier ganado fusionando. */
  tierPips?: boolean;
  className?: string;
  innerClassName?: string;
  style?: React.CSSProperties;
}

/**
 * Marco TCG completo. Estructura:
 *   <bisel metálico (padding 2-3px)>
 *     <interior overflow-hidden (arte, gradientes, badges…)>
 *       + foil + grano
 *     <filigranas + filete interior + name plate>
 */
export function CardShell({
  rarity,
  children,
  name,
  nameSize = "sm",
  foil = "auto",
  corners = true,
  cornerSize,
  tierPips = false,
  className,
  innerClassName,
  style,
}: CardShellProps) {
  const meta = FRAME_META[rarity];
  const lowPower = isLowPowerDevice();

  let foilLevel = foil === "auto" ? meta.foil : foil;
  if (lowPower && foilLevel !== "none") foilLevel = "soft"; // sin animación en low-power

  const cs = cornerSize ?? (nameSize === "lg" ? 22 : nameSize === "md" ? 18 : 13);

  return (
    <div
      className={cn("relative rounded-[10px]", className)}
      style={{
        background: meta.metal,
        padding: nameSize === "lg" ? 3 : 2.5,
        boxShadow: meta.glow,
        ...style,
      }}
    >
      {/* Interior: el caller pinta arte/badges aquí dentro */}
      <div
        className={cn(
          "relative h-full w-full overflow-hidden rounded-[7px] bg-zinc-950",
          innerClassName
        )}
      >
        {children}

        {/* Foil holográfico (bajo el grano, sobre el arte) */}
        {foilLevel !== "none" && (
          <div
            className={cn(
              "pointer-events-none absolute inset-0 z-10",
              foilLevel === "full" ? "foil-holo-full" : "foil-holo-soft",
              lowPower && foilLevel === "soft" && "opacity-60"
            )}
          />
        )}

        {/* Grano de pergamino: textura que unifica el arte AI */}
        <div className="card-grain pointer-events-none absolute inset-0 z-[11] opacity-[0.09]" />

        {/* Vineta interior sutil (profundidad) */}
        <div
          className="pointer-events-none absolute inset-0 z-[12] rounded-[inherit]"
          style={{ boxShadow: "inset 0 0 18px rgba(0,0,0,0.55)" }}
        />
      </div>

      {/* Filete interior dorado/color de rareza */}
      <div
        className="pointer-events-none absolute inset-[2px] z-30 rounded-[8px]"
        style={{ border: `1px solid ${meta.accent}44`, boxShadow: `inset 0 0 0 0.5px rgba(255,255,255,0.06)` }}
      />

      {/* Pips de tier de fusión (centro-superior): cuantos más ◆, más tier
          ganado por fusiones (rara 1 · épica 2 · legendaria 3 · MÍTICA 4).
          Color = acento de rareza. */}
      {tierPips && rarity !== "common" && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex justify-center gap-[1px]">
          {Array.from({
            length: rarity === "rare" ? 1 : rarity === "epic" ? 2 : rarity === "legendary" ? 3 : 4,
          }).map((_, i) => (
            <span
              key={i}
              className="block h-1 w-1 -translate-y-[1px] rotate-45"
              style={{ background: meta.accent, boxShadow: `0 0 3px ${meta.accent}` }}
            />
          ))}
        </div>
      )}

      {/* Brillo especular superior del bisel */}
      <div className="pointer-events-none absolute inset-x-2 top-0 z-30 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />

      {corners && <FrameCorners accent={meta.accent} size={cs} />}

      {/* Name plate integrado */}
      {name !== undefined && (
        <NamePlate name={name} meta={meta} size={nameSize} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Name plate — placa metálica con el nombre en Cinzel
// ---------------------------------------------------------------------------

function NamePlate({
  name,
  meta,
  size,
}: {
  name: string;
  meta: FrameMeta;
  size: "sm" | "md" | "lg";
}) {
  const fontSize = size === "lg" ? "13px" : size === "md" ? "10px" : "8.5px";
  const padding = size === "lg" ? "3px 6px" : size === "md" ? "2px 4px" : "1.5px 3px";
  return (
    <div
      className="pointer-events-none absolute inset-x-1 bottom-1 z-40 overflow-hidden rounded-[4px] text-center"
      style={{
        background: meta.plate,
        border: `1px solid ${meta.accent}55`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 2px 4px rgba(0,0,0,0.7)",
        padding,
      }}
    >
      {/* remates laterales de la placa */}
      <div
        className="absolute inset-y-0 left-0 w-1.5"
        style={{ background: `linear-gradient(90deg, ${meta.accent}55, transparent)` }}
      />
      <div
        className="absolute inset-y-0 right-0 w-1.5"
        style={{ background: `linear-gradient(-90deg, ${meta.accent}55, transparent)` }}
      />
      <span
        className="relative block truncate font-black uppercase leading-tight tracking-wider"
        style={{
          fontFamily: "var(--font-cinzel), serif",
          color: meta.nameText,
          fontSize,
          textShadow: "0 1px 2px rgba(0,0,0,0.95)",
        }}
      >
        {name}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CornerOrnaments — filigranas a escala de PÁGINA (marco del tablero).
// Posicionar dentro de un contenedor relative; cada esquina sobresale -2px.
// ---------------------------------------------------------------------------

export function CornerOrnaments({
  accent = "#fbbf24",
  size = 34,
  className,
}: {
  accent?: string;
  size?: number;
  className?: string;
}) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 z-30", className)} aria-hidden>
      <div className="absolute left-0 top-0" style={{ width: size, height: size }}>
        <CornerFiligree accent={accent} className="h-full w-full" />
      </div>
      <div className="absolute right-0 top-0" style={{ width: size, height: size, transform: "scaleX(-1)" }}>
        <CornerFiligree accent={accent} className="h-full w-full" />
      </div>
      <div className="absolute bottom-0 left-0" style={{ width: size, height: size, transform: "scaleY(-1)" }}>
        <CornerFiligree accent={accent} className="h-full w-full" />
      </div>
      <div className="absolute bottom-0 right-0" style={{ width: size, height: size, transform: "scale(-1)" }}>
        <CornerFiligree accent={accent} className="h-full w-full" />
      </div>
    </div>
  );
}
