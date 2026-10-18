// ============================================================================
// perf — detección de capacidad del dispositivo para calidad adaptativa.
//
// Tier LOW  : móvil con pocos núcleos/RAM → FX reducidos (30fps, DPR 1.25,
//             menos partículas), sin layout-animations de framer-motion.
// Tier MED  : móvil capable → FX moderados (DPR 1.5).
// Tier HIGH : desktop → calidad completa (60fps, DPR 2).
//
// SSR-safe: en servidor devuelve tier HIGH neutro (el canvas solo corre en
// cliente y framer-motion props se evalúan en primer render de cliente).
// ============================================================================

export type PerfTier = "low" | "med" | "high";

interface DeviceProfile {
  tier: PerfTier;
  isMobile: boolean;
}

let cached: DeviceProfile | null = null;

function detect(): DeviceProfile {
  if (typeof navigator === "undefined") {
    return { tier: "high", isMobile: false };
  }

  const ua = navigator.userAgent || "";
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);

  // Safari iOS no expone hardwareConcurrency/deviceMemory: asumir móvil medio.
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const mem = nav.deviceMemory ?? 4; // GB aprox (Chromium)

  if (!isMobile) {
    // Desktop: LOW solo si es hardware realmente viejo.
    return { tier: cores <= 2 || mem <= 2 ? "low" : "high", isMobile: false };
  }

  if (cores <= 4 || mem <= 3) return { tier: "low", isMobile: true };
  return { tier: "med", isMobile: true };
}

export function deviceProfile(): DeviceProfile {
  if (!cached) cached = detect();
  return cached;
}

export function perfTier(): PerfTier {
  return deviceProfile().tier;
}

export function isMobileDevice(): boolean {
  return deviceProfile().isMobile;
}

export function isLowPowerDevice(): boolean {
  return deviceProfile().tier === "low";
}
