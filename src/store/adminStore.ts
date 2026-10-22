"use client";

// ============================================================================
// adminStore — cara reactiva del MODO ADMIN (interruptor oculto del dueño).
// ============================================================================
// ACTIVAR  → backup EXACTO de la colección real + las 6 clases jugables +
//            TODAS las cartas (192) entregadas en MÍTICO (1 copia cada una).
// DESACTIVAR → restaura el backup al byte: colección, clases y wins vuelven
//            a como estaban ANTES de activar. Lo ganado con el admin encendido
//            se descarta — el modo trampa no contamina el progreso legítimo.
//
// El flag vive en lib/game/admin.ts (localStorage "pacto-de-guerra-admin");
// este store es la API que consumen los componentes y el que dispara los
// cambios sobre collectionStore. Tras togglear la UI hace location.reload()
// para que TODAS las vistas relean el estado limpio.
// ============================================================================

import { create } from "zustand";
import { ALL_CARDS_V3 } from "@/lib/game/cards";
import { visibleClasses } from "@/lib/game/v3";
import type { GameClass } from "@/lib/game/types";
import { readAdminState, writeAdminState, type AdminBackup } from "@/lib/game/admin";
import { useCollectionStore } from "./collectionStore";

interface AdminState {
  /** ¿Modo admin encendido? (hidratar desde localStorage al montar la UI). */
  on: boolean;
  /** Relee el flag persistido (llamar 1ª vez al abrir la UI). */
  hydrate: () => void;
  /** ACTIVAR: backup → 192 cartas MÍTICO + 6 clases. Idempotente. */
  enable: () => void;
  /** DESACTIVAR: restaura el backup exacto. Idempotente. */
  disable: () => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  on: false,

  hydrate: () => {
    set({ on: readAdminState().on });
  },

  enable: () => {
    if (get().on) return;
    const col = useCollectionStore.getState();
    // 1. BACKUP del progreso real (colección + clases + wins) — se guarda en
    //    el MISMO registro del flag y solo se borra al desactivar.
    const backup: AdminBackup = {
      copies: col.copies,
      grantedClasses: col.grantedClasses,
      wins: col.wins,
    };
    // 2. TODAS las cartas en MÍTICO (1 copia — el tier máximo ya jugable:
    //    materializeCard les da el poder y keywords del tier mítico).
    const mythic: Record<string, { mythic: number }> = {};
    for (const c of ALL_CARDS_V3) mythic[c.id] = { mythic: 1 };
    // 3. Las 6 clases desbloqueadas (classUnlocked además las bypasea).
    col.replaceAll(mythic, [...visibleClasses()] as GameClass[], col.wins);
    writeAdminState(true, backup);
    set({ on: true });
  },

  disable: () => {
    if (!get().on) return;
    const saved = readAdminState().backup;
    if (saved) {
      useCollectionStore.getState().replaceAll(saved.copies, saved.grantedClasses, saved.wins);
    }
    writeAdminState(false, null);
    set({ on: false });
  },
}));
