// ═════════════════════════════════════════════════════════════════════
// PROGRESS-BACKUP — lógica compartida de respaldo de progreso.
//
// PETICIÓN DEL JUGADOR (Task 50): «no hay forma de hacerlo sin que el
// usuario tenga que intervenir». La desinstalación única de los APK
// previos a tanda 40 es inevitable (Android bloquea cruces de firma a
// nivel de SO), pero TODO lo demás se automatiza:
//   1. Google Auto Backup ahora SÍ cubre el localStorage real (backup
//      rules con domain=root path=app_webview — antes apuntaban a files/
//      que NO es donde vive app_webview).
//   2. Restauración con UN toque: el menú detecta instalación fresca
//      (sin perfil ni colección ni campaña) y ofrece «Pegar y restaurar»
//      leyendo el portapapeles — el jugador solo copia el código en la
//      app vieja (Ajustes → Exportar) y lo pega con un botón.
//   3. Desde tanda 40, todas las actualizaciones futuras se instalan
//      ENCIMA sin intervention alguna (firma + versionCode estables).
//
// Las funciones aceptan un Storage inyectable para ser testeables en
// Bun (sin DOM). Por defecto usan localStorage del navegador.
// ═════════════════════════════════════════════════════════════════════

export const PROGRESS_KEYS = [
  "pacto-de-guerra-profile",
  "pacto-de-guerra-campana",
  "pacto-de-guerra-stats",
  "pacto-de-guerra-misiones",
  "guerrero-tactico-coleccion",
  "guerrero-tactico-settings",
] as const;

export const DECK_KEY_PREFIX = "guerrero-tactico-deck";

/** Las 3 claves grandes que definen «hay progreso». Si TODAS faltan → instalación fresca. */
export const CORE_PROGRESS_KEYS = [
  "pacto-de-guerra-profile",
  "pacto-de-guerra-campana",
  "guerrero-tactico-coleccion",
] as const;

type MinimalStorage = {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  key(i: number): string | null;
  readonly length: number;
};

function defaultStorage(): MinimalStorage {
  const g = globalThis as { localStorage?: MinimalStorage };
  if (!g.localStorage) throw new Error("localStorage no disponible");
  return g.localStorage;
}

/** ¿Instalación fresca? true si NINGUNA de las claves grandes de progreso existe. */
export function isFreshInstall(storage: MinimalStorage = defaultStorage()): boolean {
  return CORE_PROGRESS_KEYS.every((k) => storage.getItem(k) === null);
}

/** Serializa TODO el progreso (claves fijas + mazos por clase) en un bloque de texto. */
export function collectProgress(storage: MinimalStorage = defaultStorage()): string {
  const keys: Record<string, string> = {};
  for (const k of PROGRESS_KEYS) {
    const v = storage.getItem(k);
    if (v !== null) keys[k] = v;
  }
  // Mazos editados por clase (prefijo): deck + deck-mago + deck-asesino…
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k && k.startsWith(DECK_KEY_PREFIX)) {
      const v = storage.getItem(k);
      if (v !== null) keys[k] = v;
    }
  }
  return JSON.stringify({ game: "pacto-de-guerra", version: 1, keys });
}

export type ParseResult =
  | { ok: true; keys: Record<string, string> }
  | { ok: false; error: string };

/** Valida un código de respaldo SIN escribir nada (mensajes listos para la UI). */
export function parseProgressCode(text: string): ParseResult {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return { ok: false, error: "Portapapeles vacío — copia antes el código (Ajustes → Exportar)." };
  try {
    const parsed = JSON.parse(trimmed) as { game?: string; version?: number; keys?: Record<string, unknown> };
    if (parsed.game !== "pacto-de-guerra" || !parsed.keys || typeof parsed.keys !== "object") {
      return { ok: false, error: "Código no válido — revisa que sea el bloque completo." };
    }
    const keys: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed.keys)) {
      if (typeof v === "string") keys[k] = v;
    }
    if (Object.keys(keys).length === 0) {
      return { ok: false, error: "El código no contiene datos." };
    }
    return { ok: true, keys };
  } catch {
    return { ok: false, error: "No se pudo leer el código — cópialo completo." };
  }
}

export type ApplyResult = { ok: true; written: number } | { ok: false; error: string };

/** Valida y escribe el respaldo en el storage (sobrescribe las claves que trae). */
export function applyProgressCode(text: string, storage: MinimalStorage = defaultStorage()): ApplyResult {
  const parsed = parseProgressCode(text);
  if (!parsed.ok) return parsed;
  let written = 0;
  for (const [k, v] of Object.entries(parsed.keys)) {
    storage.setItem(k, v);
    written++;
  }
  return { ok: true, written };
}

/** Lee el portapapeles: plugin nativo en el APK, Web API como fallback. */
export async function readClipboardText(): Promise<string | null> {
  try {
    const { Clipboard } = await import("@capacitor/clipboard");
    const { value } = await Clipboard.read();
    if (value && value.trim().length > 0) return value;
  } catch {
    // sin plugin nativo (web/preview) → Web API
  }
  try {
    const nav = globalThis as { navigator?: { clipboard?: { readText(): Promise<string> } } };
    const text = await nav.navigator?.clipboard?.readText();
    return typeof text === "string" ? text : null;
  } catch {
    return null;
  }
}
