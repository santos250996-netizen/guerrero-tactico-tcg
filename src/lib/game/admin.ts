// ============================================================================
// MODO ADMIN — interruptor OCULTO del propietario (persistente y reversible).
// ============================================================================
// El dueño del juego puede desbloquearlo con un gesto secreto (7 toques en la
// versión del menú). ACTIVAR hace un BACKUP exacto de la colección real y
// entrega las 6 clases + TODAS las cartas en MÍTICO; DESACTIVAR restaura el
// backup al byte — lo ganado con el admin encendido se descarta, así el modo
// trampa jamás contamina el progreso legítimo.
//
// Este módulo es PROPÓSAMENTE puro (sin zustand): campaign.ts (lib) consulta
// isAdminOn() de forma sincrona para classUnlocked sin acoplar lib → stores.
// La cara reactiva vive en src/store/adminStore.ts.
// ============================================================================

import type { GameClass, Rarity } from "./types";

export const ADMIN_STORAGE_KEY = "pacto-de-guerra-admin";

/** Copias por carta (misma forma que Copies del collectionStore). */
export type AdminCopies = Record<string, Partial<Record<Rarity, number>>>;

/** Instantánea exacta de la colección real ANTES de activar el admin. */
export interface AdminBackup {
  copies: AdminCopies;
  grantedClasses: GameClass[];
  wins: number;
}

export interface AdminFile {
  on: boolean;
  backup: AdminBackup | null;
}

const EMPTY: AdminFile = { on: false, backup: null };

/** Lee el estado admin completo (tolerante a SSR/corruption). */
export function readAdminState(): AdminFile {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!raw) return EMPTY;
    const p = JSON.parse(raw) as Partial<AdminFile>;
    return { on: p.on === true, backup: p.backup ?? null };
  } catch {
    return EMPTY;
  }
}

/** Escribe el estado admin completo (flag + backup en el MISMO registro). */
export function writeAdminState(on: boolean, backup: AdminBackup | null): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify({ on, backup }));
  } catch {
    // almacenamiento lleno/bloqueado — el modo no persiste y listo
  }
}

/** Consulta sincrona y barata (la usa classUnlocked en cada render). */
export function isAdminOn(): boolean {
  return readAdminState().on;
}
