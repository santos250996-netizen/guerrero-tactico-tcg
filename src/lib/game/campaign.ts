// ===========================================================================
// LA TORRE DE LOS MUROS — el modo de escalada del juego (lógica PURA, sin
// stores). Renombrado desde "LA CAMPAÑA" cuando nació el MODO HISTORIA real
// (story.ts · El Pacto de Guerra): la escalera SIEMPRE fue una torre —
// «mil escalones, mil huesos» — y ahora tiene su nombre.
// ===========================================================================
// Un solo camino de 18 PISOS con 6 JEFES como guardianes de muro (3, 6, 9,
// 12, 15 y 18): UNO POR CLASE — las 6 clases del juego tienen su jefe con
// mazo temático propio en la torre.
//
// Reglas de diseño (acordadas con el jugador):
//  • GLOBAL: una sola torre compartida por las clases (la colección es
//    global; la clase solo elige tu héroe).
//  • El rival de cada piso es DETERMINÍSTICO (clase + mazo fijos por piso):
//    reintentar el piso 7 siempre es el mismo rival con nueva barajada —
//    la torre se siente escrita, no aleatoria.
//  • Dificultad: el tier de material del mazo rival escala con el piso
//    (común → raro → épico) y sube otro peldaño en cada PRESTIGIO (tope
//    legendaria). Los jefes juegan su mazo temático épico (legendaria en
//    prestigio).
//  • Botín y XP escalan: más cartas y más XP cuanto más alto el piso; la
//    mesa de drops usa max(nivel, piso+2) para que avanzar se SIENTA.
//  • Al perder NO retrocedes: repites el mismo piso.
//  • Piso 18 vencido → TORRE COMPLETADA ★ Prestigio+1 y la torre
//    recomienza con rivales reforzados (bucle infinito).
// ===========================================================================

import type { GameClass, Rarity } from "./types";
import { CLASS_META } from "./types";
import { nextRarity } from "./balance";
import { isAdminOn } from "./admin";
import { STORY_TOTAL } from "./story";

/** Altura de la torre (pisos por vuelta de campaña). */
export const CAMPAIGN_STEPS = 18;

/** Pisos donde el JEFE guardian bloquea el paso — UNO POR CLASE. */
export const CAMPAIGN_BOSS_STEPS: readonly number[] = [3, 6, 9, 12, 15, 18];

/** Jefe de cada piso-jefe (índice paralelo a CAMPAIGN_BOSS_STEPS).
 *  Orden de escalada narrativo: Korgath guarda la puerta, el jardín de Yggra
 *  devora el segundo anillo, la bahía de Kaela el tercero, el trono de Nyx el
 *  cuarto, la forja de Dorvik el quinto… y la ÚLTIMA SOMBRA corona la torre. */
const CAMPAIGN_BOSS_ORDER: readonly GameClass[] = [
  "guerrero",
  "botanico",
  "pirata",
  "mago",
  "tinker",
  "asesino",
];

/** Nombre corto de cada bot de la escalera (el título depende del escalón). */
export const CAMPAIGN_BOT_NAMES: Record<GameClass, string> = {
  guerrero: "Bram",
  mago: "Iria",
  asesino: "Kess",
  // V3.0
  botanico: "Nim",
  pirata: "Roka",
  tinker: "Fenn",
};

/** Jefes de la campaña (mazo temático propio + jugada gratis + 3 bonos). */
export const CAMPAIGN_BOSS_NAMES: Record<GameClass, string> = {
  guerrero: "Korgath, Coloso de Hierro",
  mago: "Nyx, Reina de Escarcha",
  asesino: "Vharos, Sombra Primigenia",
  // V3.0 (plan-expansion-v3 §2 — jefes de los carriles de 12)
  botanico: "Yggra, el Jardín Devorador",
  pirata: "Kaela, la Boca de Hierro",
  tinker: "Dorvik, Maestro de Engranajes",
};

/** Tema del mazo del jefe de cada clase (coincide con BOSS_DECKS en cards.ts). */
export const CAMPAIGN_BOSS_THEMES: Record<GameClass, string> = {
  guerrero: "Protección",
  mago: "Hielo",
  asesino: "Sigilo",
  // V3.0
  botanico: "Esporas",
  pirata: "Artillería",
  tinker: "Maquinaria",
};

const RIVAL_ROTATION: readonly GameClass[] = ["guerrero", "mago", "asesino"];

// ── Estructura de la escalera ──────────────────────────────────────────────

/** ¿Es este piso un muro de JEFE? */
export function isBossStep(step: number): boolean {
  return CAMPAIGN_BOSS_STEPS.includes(step);
}

/** Clase del JEFE que bloquea un piso-jefe (null si el piso es normal). */
export function bossClassForStep(step: number): GameClass | null {
  const idx = CAMPAIGN_BOSS_STEPS.indexOf(step);
  return idx >= 0 ? CAMPAIGN_BOSS_ORDER[idx] : null;
}

/** Clase del rival normal de un piso (rotación fija — determinista). */
export function rivalClassForStep(step: number): GameClass {
  return RIVAL_ROTATION[(step - 1) % RIVAL_ROTATION.length];
}

/** Mazo del rival normal (de los 2 oficiales de su clase) — determinista. */
export function rivalDeckIndexForStep(step: number): 0 | 1 {
  return (Math.floor(step / 2) % 2) as 0 | 1;
}

/** Título del bot según el tramo de la torre: la escalada se SIENTE. */
export function botTitleForStep(step: number): string {
  if (step >= 13) return "Campeón";
  if (step >= 7) return "Veterano";
  return "Aprendiz";
}

/** Nombre completo para mostrar del rival de un piso (normal o jefe). */
export function rivalNameForStep(step: number): string {
  const boss = bossClassForStep(step);
  if (boss) return CAMPAIGN_BOSS_NAMES[boss];
  const cls = rivalClassForStep(step);
  return `${CAMPAIGN_BOT_NAMES[cls]}, ${botTitleForStep(step)} de ${CLASS_META[cls].label}`;
}

// ── Dificultad: material del mazo rival ────────────────────────────────────

/** Tier BASE del mazo rival según el tramo: 1-6 común · 7-12 raro · 13-17 épico. */
function baseTierForStep(step: number): Rarity {
  if (step >= 13) return "epic";
  if (step >= 7) return "rare";
  return "common";
}

/**
 * Tier de material del mazo rival: base por tramo + 1 peldaño por prestigio
 * (tope LEGENDARIA — la mítica queda reservada al jugador por fusión).
 */
export function botTierForStep(step: number, prestige: number): Rarity {
  let tier: Rarity = baseTierForStep(step);
  for (let i = 0; i < Math.max(0, prestige); i++) {
    const next = nextRarity(tier);
    if (!next || next === "mythic") break;
    tier = next;
  }
  return tier;
}

/** Tier del mazo del JEFE: épico en la 1ª vuelta, legendaria desde el prestigio 1. */
export function bossTierForPrestige(prestige: number): Rarity {
  return prestige >= 1 ? "legendary" : "epic";
}

// ── Recompensas y XP escalables ────────────────────────────────────────────

/** Cartas por VICTORIA normal: 2 → 3 → 4 → 5 según el piso (jefe paga aparte). */
export function rewardCountForStep(step: number): number {
  return 2 + Math.floor(step / 5);
}

/** XP EXTRA de escalón por victoria (encima de la base 6): 6+escalón; ×1.5 en prestigio. */
export function xpBonusForStep(step: number, prestige: number): number {
  return Math.round(step * (prestige > 0 ? 1.5 : 1));
}

/** Mesa de drops: el nivel EFECTIVO nunca baja de escalón+2 — avanzar mejora drops. */
export function effectiveDropLevel(level: number, step: number): number {
  return Math.max(level, step + 2);
}

// ── Desbloqueo de clases por la TORRE (camino ALTERNO) ─────────────────────
// Cada jefe vencido recluta a la siguiente clase — Korgath→Mago ·
// Yggra→Botánico · Kaela→Pirata · Nyx→Asesino · Dorvik→Tinker. La cuenta
// usada es stepsCleared del campaignStore (total histórico — nunca retrocede
// ni se reinicia con el prestigio). EL CAMINO PRIMARIO es la HISTORIA:
// ver STORY_CLASS_CHAPTER más abajo.

/** Pisos superados necesarios para jugar cada clase (0 = libre).
 *  TORRE DE 6 JEFES: cada jefe vencido RECLUTA a la siguiente clase —
 *  Korgath→Mago · Yggra→Botánico · Kaela→Pirata · Nyx→Asesino · Dorvik→Tinker. */
export const CLASS_UNLOCK_STEP: Record<GameClass, number> = {
  guerrero: 0,
  mago: 3,
  // V3.0 — visibles solo con V3_CLASSES_UNLOCKED (lib/game/v3.ts); una vez
  // encendida, se desbloquean progresando la torre como las demás.
  botanico: 6,
  pirata: 9,
  asesino: 12,
  tinker: 15,
};

// ── Desbloqueo de clases POR LA HISTORIA (El Pacto) ────────────────────────
// El Pacto es el PRIMER modo: sin esta vía, un jugador en fase historia solo
// tendría al Guerrero. Cada capítulo se pelea EN el territorio de una clase y
// al SUPERARLO esa clase se une al Pacto (como Bram en el cap. 1):
//   c2 La Arboleda → BOTÁNICO · c3 La Bahía → PIRATA · c4 Escarcha → MAGO ·
//   c5 La Forja → TINKER · c6 El Umbral → ASESINO.
// La TORRE queda como camino ALTERNATIVO (CLASS_UNLOCK_STEP) para quien
// quiera reclutar escalando; el desbloqueo es O-O: cualquiera de las dos vías.
export const STORY_CLASS_CHAPTER: Record<GameClass, number> = {
  guerrero: 0, // héroe inicial — libre desde el arranque
  botanico: 2,
  pirata: 3,
  mago: 4,
  tinker: 5,
  asesino: 6,
};

/** Capítulos superados (0..7): la clase se recluta al CERRAR su capítulo. */
export function chaptersCompletedOf(chapter: number, completed: boolean): number {
  return completed ? STORY_TOTAL : Math.max(0, chapter);
}

/** ¿Está jugable esta clase con X escalones superados? */
export function classUnlocked(cls: GameClass, stepsCleared: number, chaptersDone = 0): boolean {
  // MODO ADMIN (oculto, del propietario): todas las clases jugables al instante.
  if (isAdminOn()) return true;
  // Historia: superar el capítulo de la clase la recluta (camino primario).
  if (chaptersDone >= STORY_CLASS_CHAPTER[cls]) return true;
  // Torre: vencer al jefe reclutador sigue abriendo la clase (camino alterno).
  return stepsCleared >= CLASS_UNLOCK_STEP[cls];
}

/** Pista de desbloqueo ("Supera el Capítulo 2 · El Pacto") o null si libre.
 *  La HISTORIA es el único camino alcanzable para una clase bloqueada: la
 *  torre permanece cerrada hasta completar el Pacto (y al cerrarlo todas
 *  las clases quedan reclutadas) — la pista de jefe de torre quedó obsoleta. */
export function classUnlockHint(cls: GameClass, chaptersDone = 0): string | null {
  const storyNeed = STORY_CLASS_CHAPTER[cls];
  if (chaptersDone >= storyNeed) return null;
  return `Supera el Capítulo ${storyNeed} · El Pacto`;
}

/** La clase que RECLUTA el capítulo idx (0-based) al superarse, o null.
 *  La usa el mapa (chip «RECLUTA») y la celebración de fin de capítulo. */
export function storyClassForChapter(idx: number): GameClass | null {
  const found = (Object.keys(STORY_CLASS_CHAPTER) as GameClass[]).find(
    (c) => STORY_CLASS_CHAPTER[c] === idx + 1,
  );
  return found ?? null;
}

// ── Etiquetas de UI ────────────────────────────────────────────────────────

/** Texto corto del piso para chips/botones ("Piso 7", "JEFE · Piso 5"). */
export function stepChipLabel(step: number): string {
  return isBossStep(step) ? `JEFE · Piso ${step}` : `Piso ${step}`;
}

// ── REGLA SISTÉMICA POR CLASE (V3 — grupo A): lore + consejo ───────────────
// Una regla por clase, ligada a los CARRILES. El tooltip vive OCULTO tras un
// tap (la selección de clases se queda minimalista: sin texto de más).

export const CLASS_RULE_META: Record<
  GameClass,
  { rule: string; sigil: string; lore: string; tip: string }
> = {
  guerrero: {
    rule: "Formación de Combate",
    sigil: "⚔️",
    lore: "Las legiones de las Tierras Bajas no ganan con héroes: ganan con filas. Donde dos escudos se apoyan, la línea entera empuja más fuerte.",
    tip: "Apila 2+ cartas propias en un carril: al cerrar tu turno, TODAS tus cartas de ese carril ganan +1 permanente (hasta +1 extra por carta).",
  },
  mago: {
    rule: "Resonancia de Escuela",
    sigil: "🔮",
    lore: "Un conjuro abre el camino; el segundo encuentra la huella y cabalga en su estela. Las escuelas arcanas llaman a esto resonancia.",
    tip: "Juega 2 cartas de la MISMA spec en un mismo turno: la segunda entra con +2 de poder y cuesta −1 de energía (suelo 0).",
  },
  asesino: {
    rule: "Marca de Ejecución",
    sigil: "🗡️",
    lore: "Cada tajo que no mata deja una marca. El asesino cuenta sus marcas en silencio… y cuando cobra, cobra todo de una vez.",
    tip: "Debilitar enemigos te da 1 PC (tope 5, persisten entre turnos). Juega en un carril con un debilitado y consume TODOS tus PC: +4 de poder por PC.",
  },
  // ── V3.0 (plan-expansion-v3 §2 — reglas sin estado, para AMBOS lados) ──
  botanico: {
    rule: "Ecosistema",
    sigil: "🌿",
    lore: "El jardín del botánico no es un ejército: es una comunidad. Donde el depredador convive con la flor y la espora, todo crece más fuerte.",
    tip: "Al cerrar tu turno, cada carril tuyo con cartas de 2+ categorías distintas (Ataque/Ítem/Acción) da +1 permanente a TODAS tus cartas de ese carril.",
  },
  pirata: {
    rule: "Viento de Popa",
    sigil: "🏴‍☠️",
    lore: "Un buque sobrevivido siempre zarpa con menos grumetes. Los capitanes de Kaela dicen que el mar premia al que sigue de pie.",
    tip: "Al iniciar tu turno, si tienes MENOS cartas en tablero que el rival, TODAS tus cartas ganan +1 permanente mientras dure la desventaja.",
  },
  tinker: {
    rule: "Taller de Campamento",
    sigil: "🔧",
    lore: "Dorvik no viaja sin su forja portátil. Cada artefacto sale de sus manos con un remache más que el diseño pide — y eso marca la diferencia.",
    tip: "Tus cartas de ÍTEM entran al tablero con +1 de poder permanente (artesanía de campaña, siempre activa).",
  },
};

// ── Lore: splash pre-batalla (la torre se SIENTE escrita) ───────────────

/** Línea de ambiente de cada rival normal — una por tramo de título. */
export const CAMPAIGN_BOT_LORE: Record<GameClass, [string, string, string]> = {
  guerrero: [
    "Un recluta más en el camino. Bram afila su espada y te señala el vado: «primero el sudor, luego la gloria».",
    "Bram ya conoce tu nombre. Los veteranos hablan de ti — y él vino a callarlos.",
    "El maestro de armas ajusta su escudo: «hoy veremos de qué estás hecho, campeón».",
  ],
  mago: [
    "Iria ajusta sus anillos de escarcha. El aire se enfría al cruzarla de camino.",
    "Sus grimorios ya susurran tu nombre. «Veamos tu maná», sonríe Iria.",
    "La hechicera de la corte despliega el arcano completo: este duelo será de sangre fría.",
  ],
  asesino: [
    "Una sombra se mueve entre las carpas. Kess prueba tu guardia con cuchillas lentas.",
    "El gremio puso precio a tu cabeza. Kess siempre cobra.",
    "Ni el estruendo de la guerra lo delata: Kess ya está detrás de ti.",
  ],
  // V3.0
  botanico: [
    "El sendero se cierra con raíces. Nim riega sus esporas sin mirarte: «las malas hierbas también se podan».",
    "El enjambre susurra tu nombre. Nim sonríe: la primavera llegó a tu camino.",
    "El jardinero mayor despliega el jardín completo: hoy florece la guerra.",
  ],
  pirata: [
    "Roka sube a cubierta lancando el ancla. «Pago peaje o lo tomo — tú eliges».",
    "Tu bandera ya ondea en su tabla de botín. Roka afila el sable.",
    "La capitana de la Boca de Hierro despliega toda la artillería: la marea sube.",
  ],
  tinker: [
    "Fenn ajusta un autómata mientras te estudia. «Todo se destornilla, hasta tu suerte».",
    "Sus torretas ya conocen tu peso. Fenn marca el precio del blindaje.",
    "El maestro de engranajes arranca la producción completa: hoy la máquina no se detiene.",
  ],
};

/** Línea de ambiente de cada JEFE (claves por clase del jefe). */
export const CAMPAIGN_BOSS_LORE: Record<GameClass, string> = {
  guerrero: "«Mil escalones, mil huesos. El muro soy yo.» — Korgath bloquea el paso con su muralla de hierro.",
  mago: "«Inclínate: el invierno también corona.» — Nyx congela el sendero bajo tus pies.",
  asesino: "«La última sombra no necesita luz para vencer.» — Vharos se derrite desde las propias sombras.",
  // V3.0
  botanico: "«Todo lo que pisas ya es mío: las raíces llegaron primero.» — Yggra despierta bajo tus pies.",
  pirata: "«Este paso paga peaje: todo tu botín o toda tu sangre.» — Kaela apunta con la boca de hierro.",
  tinker: "«Mi taller, mis reglas. Tú eres la siguiente pieza.» — Dorvik arranca la cadena de producción.",
};

/** Lore del escalón para el splash pre-batalla (jefe o rival por tramo). */
export function loreForStep(step: number): { text: string; isBoss: boolean } {
  const boss = bossClassForStep(step);
  if (boss) return { text: CAMPAIGN_BOSS_LORE[boss], isBoss: true };
  const cls = rivalClassForStep(step);
  const title = botTitleForStep(step);
  const tier = title === "Campeón" ? 2 : title === "Veterano" ? 1 : 0;
  return { text: CAMPAIGN_BOT_LORE[cls][tier], isBoss: false };
}

// ── Biomas: la escalera cambia de paisaje ───────────────────────────────────

interface Biome {
  id: string;
  name: string;
  /** Tinte ambiental del duelo (radial-gradient CSS — capa fija y estática). */
  tint: string;
  /** Color de acento del splash (componentes rgb "r,g,b"). */
  hex: string;
}

const BIOMES: Record<string, Biome> = {
  tierras: {
    id: "tierras",
    name: "Tierras Bajas",
    tint: "radial-gradient(ellipse at 50% 115%, rgba(16,185,129,0.13), transparent 62%)",
    hex: "16,185,129",
  },
  hierro: {
    id: "hierro",
    name: "Muralla de Hierro",
    tint: "radial-gradient(ellipse at 50% 115%, rgba(161,161,170,0.15), transparent 62%)",
    hex: "161,161,170",
  },
  jardin: {
    id: "jardin",
    name: "Arboleda Devorada",
    tint: "radial-gradient(ellipse at 50% 115%, rgba(132,204,22,0.13), transparent 62%)",
    hex: "132,204,22",
  },
  puerto: {
    id: "puerto",
    name: "Bahía de la Boca de Hierro",
    tint: "radial-gradient(ellipse at 50% 115%, rgba(96,165,250,0.13), transparent 62%)",
    hex: "96,165,250",
  },
  ceniza: {
    id: "ceniza",
    name: "Paso de Ceniza",
    tint: "radial-gradient(ellipse at 50% 115%, rgba(244,63,94,0.12), transparent 62%)",
    hex: "244,63,94",
  },
  escarcha: {
    id: "escarcha",
    name: "Trono de Escarcha",
    tint: "radial-gradient(ellipse at 50% 115%, rgba(56,189,248,0.13), transparent 62%)",
    hex: "56,189,248",
  },
  hielo: {
    id: "hielo",
    name: "Corona de Hielo",
    tint: "radial-gradient(ellipse at 50% 115%, rgba(103,232,249,0.11), transparent 62%)",
    hex: "103,232,249",
  },
  forja: {
    id: "forja",
    name: "La Forja Eterna",
    tint: "radial-gradient(ellipse at 50% 115%, rgba(249,115,22,0.13), transparent 62%)",
    hex: "249,115,22",
  },
  sombra: {
    id: "sombra",
    name: "Umbral de Sombras",
    tint: "radial-gradient(ellipse at 50% 115%, rgba(168,85,247,0.13), transparent 62%)",
    hex: "168,85,247",
  },
};

/** Bioma por ID (para el MODO HISTORIA: los capítulos citan su región). */
export function biomeById(id: string): Biome {
  return BIOMES[id] ?? BIOMES.tierras;
}

/** Bioma del piso: la torre cruza paisajes — cada guardián tiene el suyo
 *  (los pisos previos al muro anuncian la región que se acerca). */
export function biomeForStep(step: number): Biome {
  if (step === CAMPAIGN_BOSS_STEPS[5]) return BIOMES.sombra; // 18 · Vharos
  if (step >= 16) return BIOMES.sombra; // umbral de sombras
  if (step === CAMPAIGN_BOSS_STEPS[4]) return BIOMES.forja; // 15 · Dorvik
  if (step >= 13) return BIOMES.hielo; // corona de hielo
  if (step === CAMPAIGN_BOSS_STEPS[3]) return BIOMES.escarcha; // 12 · Nyx
  if (step >= 10) return BIOMES.ceniza; // paso de ceniza (del puerto al trono)
  if (step === CAMPAIGN_BOSS_STEPS[2]) return BIOMES.puerto; // 9 · Kaela
  if (step >= 7) return BIOMES.puerto; // bahía
  if (step === CAMPAIGN_BOSS_STEPS[1]) return BIOMES.jardin; // 6 · Yggra
  if (step >= 4) return BIOMES.jardin; // arboleda
  if (step === CAMPAIGN_BOSS_STEPS[0]) return BIOMES.hierro; // 3 · Korgath
  return BIOMES.tierras;
}

/**
 * Bioma del Rush de Jefes: cada jefe de la run hereda el paisaje de su muro
 * equivalente (jefe 1 → Muralla de Hierro, 2 → Trono de Escarcha, 3 → Umbral
 * de Sombras) — la escalada de la run se SIENTE en el splash.
 */
export function rushBiomeForIndex(index: number): Biome {
  if (index <= 0) return BIOMES.hierro;
  if (index === 1) return BIOMES.escarcha;
  return BIOMES.sombra;
}
