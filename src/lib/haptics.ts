"use client";
import { useSettings } from "@/lib/settings";

// ══ Háptica de Pacto de Guerra ══
// Vibración en los momentos de la partida (jugada, choque, trampa, fin).
// - En la APK: @capacitor/haptics (el CI hace `cap sync` → módulo nativo).
// - En web/WebView: navigator.vibrate (Android WebView vibra con permiso
//   VIBRATE; en escritorio es no-op inofensivo).
// - Un fallo de vibración JAMÁS rompe el flujo del juego (todo blindado).

type HapticLevel = "light" | "medium" | "heavy" | "success";

// Patrones navigator.vibrate: [vibrar, pausa, vibrar, …] en ms.
const VIBRATE_PATTERNS: Record<HapticLevel, number | number[]> = {
  light: 12,
  medium: 30,
  heavy: [45, 50, 90],
  success: [25, 60, 25, 60, 75],
};

async function capacitorHaptic(level: HapticLevel): Promise<void> {
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import("@capacitor/haptics");
    if (level === "success") {
      await Haptics.notification({ type: NotificationType.Success });
    } else if (level === "light") {
      await Haptics.impact({ style: ImpactStyle.Light });
    } else if (level === "medium") {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } else {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    }
  } catch {
    // plugin ausente (web sin soporte) o puente no registrado — silencio
  }
}

/** Dispara la vibración del nivel pedido. Respeta settings.hapticsOn.
 *  Fire-and-forget: nunca bloquea ni lanza. */
export function haptic(level: HapticLevel): void {
  try {
    if (!useSettings.getState().hapticsOn) return;
    if (typeof window === "undefined") return;
    // Prioridad: puente nativo de Capacitor (háptica de plataforma) →
    // fallback web (navigator.vibrate, ya cubre la WebView de la APK).
    const cap = (window as any).Capacitor;
    if (cap?.isNativePlatform?.()) {
      void capacitorHaptic(level);
      return;
    }
    const nav = typeof navigator !== "undefined" ? (navigator as Navigator & { vibrate?: (p: number | number[]) => boolean }) : null;
    if (nav && typeof nav.vibrate === "function") {
      nav.vibrate(VIBRATE_PATTERNS[level]);
      return;
    }
    // Sin API nativa ni vibrate: no hay háptica — no-op
    void capacitorHaptic(level);
  } catch {
    // noop — la vibración es un extra, jamás un requisito
  }
}
