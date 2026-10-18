// ============================================================================
// profile-storage — acceso seguro al perfil guardado en localStorage.
// Antes la clave y el parseo vivían solo en ProfileScreen; el botón PERFIL del
// menú principal ahora también necesita leer el avatar, así que se centraliza
// aquí para que ambos usen la MISMA fuente de verdad.
// ============================================================================

export const PROFILE_STORAGE_KEY = "pacto-de-guerra-profile";

export interface StoredProfileBrief {
  username: string | null;
  /** id de carta usada como avatar; null → sin avatar personalizado. */
  avatarCardId: string | null;
}

/** Lee el perfil de localStorage sin lanzar (SSR-safe, JSON corrupto-safe). */
export function loadStoredProfileBrief(): StoredProfileBrief | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { username?: unknown; avatarCardId?: unknown };
    return {
      username:
        typeof parsed.username === "string" && parsed.username.trim().length > 0
          ? parsed.username
          : null,
      avatarCardId:
        typeof parsed.avatarCardId === "string" && parsed.avatarCardId.length > 0
          ? parsed.avatarCardId
          : null,
    };
  } catch {
    return null;
  }
}
