// ===========================================================================
// MODO HISTORIA — «EL PACTO DE GUERRA» (lógica PURA + guion, sin stores)
// ===========================================================================
// La historia real que la torre nunca fue: 7 CAPÍTULOS escritos con inicio,
// nudo y desenlace. Cada capítulo = intro con diálogo → 1-2 combates con una
// REGLA DE CAPÍTULO (bonos de carril forzados) → epílogo con diálogo.
//
// El arco: las facciones del mundo se desgarran en la torre… pero algo las
// corrompe desde el Umbral de Sombras. Venciendo a cada campeón lo RECLUTAS
// para el Pacto que enfrentará a la Sombra Primigenia y a su Heraldo.
//
// Reglas de diseño (acordadas con el jugador):
//  • El modo vive DENTRO del motor de historia (patrón Rush): el bot juega
//    como un player, los capítulos son datos, el combate es el de siempre.
//  • Cada capítulo forza BONOS DE CARRIL propios — cada pelea se siente
//    escrita, no sorteada (pvp.ts · setForcedPositionBonuses).
//  • 3 DECISIONES persistentes (flags en storyStore) que cambian diálogos y
//    variantes de rival en capítulos posteriores.
//  • Cada capítulo RECLUTA una clase al superarse (c2→Botánico · c3→Pirata ·
//    c4→Mago · c5→Tinker · c6→Asesino — STORY_CLASS_CHAPTER en campaign.ts):
//    la historia es el camino PRIMARIO de desbloqueo; la torre queda alterna.
//  • Recompensa a la altura del modo emblema: botín de capítulo JUGOSO (4→12)
//    + XP fija por victoria, visible en el mapa (+N cartas por capítulo).
// ===========================================================================

import type { GameClass, Rarity } from "./types";
import type { LaneBonusKind } from "./types";

// ── Tipos del guion ────────────────────────────────────────────────────────

/** Voz que dice una línea de diálogo (el retrato es un icono, no arte). */
export type StorySpeaker = "narrador" | "rival" | "aliado" | "heroe";

export interface StoryLine {
  who: string;
  speaker: StorySpeaker;
  text: string;
}

/** Variante de combate activada por una DECISIÓN (flag del storyStore). */
export interface StoryFightVariant {
  flag: string;
  rival?: string;
  rivalClass?: GameClass;
  deckIndex?: 0 | 1;
  tier?: Rarity;
  intro?: StoryLine[];
  win?: StoryLine[];
}

export interface StoryFight {
  rival: string;
  rivalClass: GameClass;
  /** Mazo oficial de la clase (0 o 1) — ignorado si bossDeck. */
  deckIndex?: 0 | 1;
  /** Usa BOSS_DECKS[rivalClass] (mazo temático de jefe). */
  bossDeck?: boolean;
  /** Tier de material del mazo rival. */
  tier: Rarity;
  /** MODO JEFE: jugada gratis en turnos pares + 3 carriles con bono. */
  bossMode?: boolean;
  /** REGLA DE CAPÍTULO: bonos de carril forzados por posición (0,1,2). */
  forcedBonuses?: (LaneBonusKind | null)[];
  /** Diálogo ANTES del combate (se juega en el mapa, tap a tap). */
  intro: StoryLine[];
  /** Línea de ARENA para el splash in-batalla (normalmente la última). */
  cry?: string;
  /** Epílogo del combate si VENCES. */
  win: StoryLine[];
  /** Línea corta de derrota (el combate se reintenta). */
  lose: string;
  /** Variantes por decisión (flags). */
  variants?: StoryFightVariant[];
}

export interface StoryChapter {
  /** "c1"…"c7" — estable, persistido en el storyStore. */
  id: string;
  num: number;
  title: string;
  place: string;
  /** Región de la torre que hereda tinte/acento (campaign.biomeById). */
  biomeId: string;
  fights: StoryFight[];
  /** Botín fijo al SUPERAR el capítulo (última pelea vencida). */
  rewardCards: number;
  /** Epílogo del capítulo (tras la última victoria). */
  epilogue: StoryLine[];
}

export interface StoryChoiceOption {
  flag: string;
  label: string;
  desc: string;
}

export interface StoryChoiceDef {
  id: string;
  /** Índice 0-based del capítulo tras el que aparece la decisión. */
  afterChapter: number;
  question: string;
  options: [StoryChoiceOption, StoryChoiceOption];
}

// ── EL GUION — 7 capítulos ─────────────────────────────────────────────────

export const STORY_CHAPTERS: StoryChapter[] = [
  // ═══ CAPÍTULO 1 — LA CHISPA ═══════════════════════════════════════════
  {
    id: "c1",
    num: 1,
    title: "La Chispa",
    place: "Vado de las Tierras Bajas",
    biomeId: "tierras",
    rewardCards: 4,
    fights: [
      {
        rival: "Bram, la Espada Rebelde",
        rivalClass: "guerrero",
        deckIndex: 0,
        tier: "common",
        forcedBonuses: [null, "cat_ataque", null],
        cry: "«El vado es mío antes del alba.»",
        intro: [
          { who: "Narrador", speaker: "narrador", text: "Las Tierras Bajas arden desde que la Torre de los Muros cambió de dueño. Los caminos están cortados y las facciones, en guerra." },
          { who: "Bram", speaker: "rival", text: "Otro capataz con una bandera prestada. El vado pasa por mi espada — y mi espada cobra peaje." },
          { who: "Tú", speaker: "heroe", text: "No vengo por el vado. Vengo por algo que vi en la torre: la sombra que mueve los hilos de esta guerra." },
          { who: "Bram", speaker: "rival", text: "Cuentas bonitas. Primero el sudor, luego la gloria: demuéstralo en el vado." },
        ],
        win: [
          { who: "Bram", speaker: "rival", text: "Bien… el sudor primero, como dije. Si la sombra que dices existe, la he sentido yo también: mis reclutas despiertan con miedo que no es suyo." },
          { who: "Bram", speaker: "aliado", text: "Toma mi estandarte. Donde dos escudos se apoyan, la línea entera empuja más fuerte — cuenta con la mía." },
        ],
        lose: "Bram te deja el vado y una advertencia: «vuelve cuando tu línea aguante más de una carga».",
      },
    ],
    epilogue: [
      { who: "Narrador", speaker: "narrador", text: "Bram se une al Pacto. Es la primera chispa — pero la Arboleda Devorada ya crece a tres jornadas del vado." },
    ],
  },

  // ═══ CAPÍTULO 2 — LA ARBOLEDA DEVORADA ════════════════════════════════
  {
    id: "c2",
    num: 2,
    title: "La Arboleda Devorada",
    place: "Sendero de Raíces",
    biomeId: "jardin",
    rewardCards: 5,
    fights: [
      {
        rival: "Nim, el Jardinero de Guerra",
        rivalClass: "botanico",
        deckIndex: 0,
        tier: "common",
        forcedBonuses: ["cost_neg", null, null],
        cry: "«Las malas hierbas también se podan.»",
        intro: [
          { who: "Narrador", speaker: "narrador", text: "El sendero al anillo segundo se cierra con raíces gordas como torres. La Arboleda creció de golpe — y no fue sola." },
          { who: "Nim", speaker: "rival", text: "El jardín no espera a nadie. Con riego y con guerra, todo crece: mira lo que hice esta semana." },
          { who: "Tú", speaker: "heroe", text: "Bram dice que la sombra siembra miedo. Aquí siembra raíces. Ayúdame a podarla, Nim." },
          { who: "Nim", speaker: "rival", text: "Si sobrevives a mi jardín, hablamos de podas. Si no… la arboleda te abona." },
        ],
        win: [
          { who: "Nim", speaker: "rival", text: "Sobreviviste al riego completo. Nota para el almanaque: el miedo que lleva tu ejército NO es natural — algo lo plantó." },
        ],
        lose: "Nim recoge sus esporas: «el jardín no perdona, pero reabre mañana».",
      },
      {
        rival: "Yggra, el Jardín Devorador",
        rivalClass: "botanico",
        bossDeck: true,
        tier: "epic",
        bossMode: true,
        forcedBonuses: ["limit_1", "cat_accion", "cost_pos"],
        cry: "«Todo lo que pisas ya es mío: las raíces llegaron primero.»",
        intro: [
          { who: "Narrador", speaker: "narrador", text: "Al fondo del sendero, las raíces forman una catedral viva. En su centro late algo con hambre." },
          { who: "Yggra", speaker: "rival", text: "Cinco anillos de torre, cinco jardines. Yo devoré los otros cuatro. Tú serás el abono del quinto." },
          { who: "Bram", speaker: "aliado", text: "Una carga limpia la puerta. Elige bien dónde empujar: aquí solo cabe UNA por carril." },
        ],
        win: [
          { who: "Yggra", speaker: "rival", text: "Las raíces… se apartan. Por primera vez en cien inviernos, el jardín RETROCEDE. La sombra no paga mi riego — la pago yo. El Pacto tiene mi arboleda." },
        ],
        lose: "El jardín te escupe al borde del anillo. Yggra susurra: «vuelve, la tierra siempre espera».",
      },
    ],
    epilogue: [
      { who: "Narrador", speaker: "narrador", text: "La Arboleda Devorada se une al Pacto. Dos facciones, dos anillos… y un puerto que cobra peaje al horizonte." },
    ],
  },

  // ═══ CAPÍTULO 3 — LA BAHÍA DE LA BOCA DE HIERRO ═══════════════════════
  {
    id: "c3",
    num: 3,
    title: "La Bahía de la Boca de Hierro",
    place: "Muelle de las Tres Grúas",
    biomeId: "puerto",
    rewardCards: 6,
    fights: [
      {
        rival: "Roka, la Capitana de Grumetes",
        rivalClass: "pirata",
        deckIndex: 0,
        tier: "rare",
        forcedBonuses: ["cost_neg", null, "cat_item"],
        cry: "«Pago peaje o lo tomo — tú eliges.»",
        intro: [
          { who: "Narrador", speaker: "narrador", text: "El muelle huele a brea y a dinero. Las grúas del puerto suben cajas que nadie firma." },
          { who: "Roka", speaker: "rival", text: "Kaela quiere tu carga Y tu bandera. Yo solo quiero probarte: si me ganas, subes a ver a la Boca de Hierro." },
          { who: "Tú", speaker: "heroe", text: "Y si ganas tú?" },
          { who: "Roka", speaker: "rival", text: "Si gano, tu bandera ondea en mi tabla de botín. Sube anclas." },
        ],
        win: [
          { who: "Roka", speaker: "aliado", text: "Trato hecho: te presento a la capitana. Una cosa más — lleva contando barcos que no existen. Barcos de niebla que solo ella ve." },
        ],
        lose: "Roka guarda tu bandera en la tabla: «la rescatas cuando sepas abordar».",
      },
      {
        rival: "Kaela, la Boca de Hierro",
        rivalClass: "pirata",
        bossDeck: true,
        tier: "epic",
        bossMode: true,
        forcedBonuses: ["limit_3", "cat_ataque", null],
        cry: "«Este paso paga peaje: todo tu botín o toda tu sangre.»",
        intro: [
          { who: "Narrador", speaker: "narrador", text: "La nave-capital ocupa toda la bahía. Sus cañones apuntan a tres carriles y su capitana sonríe como quien ya cobró." },
          { who: "Kaela", speaker: "rival", text: "El Pacto, el Pacto… yo también tuve un pacto. Con algo que vive bajo la torre. Mirad cómo acabó: hablo sola." },
          { who: "Nim", speaker: "aliado", text: "Sus cañones repiten salvas de tres. Si cubres los carriles en oleadas, el viento de popa será tuyo." },
        ],
        win: [
          { who: "Kaela", speaker: "rival", text: "Cobrado… a mí misma. El pacto que hice con la Sombra me cobró TODOS mis barcos. Toma mi flota, guerrero — que el mar devuelva lo que prestó." },
        ],
        lose: "Kaela te lanza de vuelta al muelle con una moneda: «para el peaje de la próxima vez».",
      },
    ],
    epilogue: [
      { who: "Narrador", speaker: "narrador", text: "La bahía se une al Pacto. Tres facciones… y en el cielo del norte, el Paso de Ceniza empieza a nevar." },
    ],
  },

  // ═══ CAPÍTULO 4 — EL TRONO DE ESCARCHA ════════════════════════════════
  {
    id: "c4",
    num: 4,
    title: "El Trono de Escarcha",
    place: "Salón de los Anillos Helados",
    biomeId: "escarcha",
    rewardCards: 7,
    fights: [
      {
        rival: "Iria, la Hechicera de la Corte",
        rivalClass: "mago",
        deckIndex: 0,
        tier: "rare",
        cry: "«Veamos tu maná.»",
        intro: [
          { who: "Narrador", speaker: "narrador", text: "El salón respira frío. Los anillos de escarcha giran solos alrededor de una hechicera que no ha dormido en semanas." },
          { who: "Iria", speaker: "rival", text: "Escucho a tu Pacto desde aquí. Promesas, promesas… La magia no cree en promesas: cree en resonancia. Muéstrame la tuya." },
        ],
        variants: [
          {
            flag: "perdon_bram",
            intro: [
              { who: "Narrador", speaker: "narrador", text: "El salón respira frío. Los anillos de escarcha giran solos alrededor de una hechicera que no ha dormido en semanas." },
              { who: "Iria", speaker: "rival", text: "Perdonaste a Bram. La corte lo sabe — el perdón es un conjuro raro por aquí. Demuestra que no fue torpeza." },
            ],
          },
          {
            flag: "toma_hierro",
            intro: [
              { who: "Narrador", speaker: "narrador", text: "El salón respira frío. Los anillos de escarcha giran solos alrededor de una hechicera que no ha dormido en semanas." },
              { who: "Iria", speaker: "rival", text: "Tomaste el vado con hierro. Entiendo ese idioma… pero ten cuidado: el hierro que obliga también se oxida." },
            ],
          },
        ],
        win: [
          { who: "Iria", speaker: "rival", text: "Resonancia limpia… y ese frío en tu espalda no es mío: hay un conjuro colgando de tu sombra desde el día que pisaste la torre. Subamos juntos a ver de qué escuela es." },
        ],
        lose: "Iria descongela la puerta: «el invierno espera. Los conjuros también».",
      },
      {
        rival: "Nyx, Reina de Escarcha",
        rivalClass: "mago",
        bossDeck: true,
        tier: "epic",
        bossMode: true,
        forcedBonuses: ["cost_pos", "cat_accion", null],
        cry: "«Inclínate: el invierno también corona.»",
        intro: [
          { who: "Narrador", speaker: "narrador", text: "El trono es un glaciar. La reina encima, quieta como una estatua que alguien encendió por error." },
          { who: "Nyx", speaker: "rival", text: "La Sombra prometió un trono eterno. Yo prometo lo mismo a quien me venza: que su nombre no se derrita nunca." },
          { who: "Roka", speaker: "aliado", text: "Todo cuesta aquí, incluso respirar. Juega con el agua al cuello y las Acciones al hombro." },
        ],
        win: [
          { who: "Nyx", speaker: "rival", text: "Se derrite… mi corona se DERRITE. Cuatro inviernos congelando lo que sentía y la Sombra ni una vez me dio calor. El Pacto tiene mi invierno." },
        ],
        lose: "El invierno te devuelve al paso: «corona a quien aguante, no a quien corra».",
      },
    ],
    epilogue: [
      { who: "Narrador", speaker: "narrador", text: "El Trono de Escarcha se une al Pacto. Cuatro facciones. Abajo, en la forja del quinto anillo, alguien martilla sin descanso." },
    ],
  },

  // ═══ CAPÍTULO 5 — LA FORJA ETERNA ═════════════════════════════════════
  {
    id: "c5",
    num: 5,
    title: "La Forja Eterna",
    place: "Taller de la Cadena Infinita",
    biomeId: "forja",
    rewardCards: 8,
    fights: [
      {
        rival: "Fenn, el Aprendiz de Engranajes",
        rivalClass: "tinker",
        deckIndex: 0,
        tier: "rare",
        forcedBonuses: ["cat_item", null, null],
        cry: "«Todo se destornilla, hasta tu suerte.»",
        intro: [
          { who: "Narrador", speaker: "narrador", text: "La forja del quinto anillo no duerme: cadenas, autómatas y un aprendiz que ajusta tu suerte con una llave inglesa." },
          { who: "Fenn", speaker: "rival", text: "El maestro dice que llegas con un Pacto. Yo digo que todo pacto se puede mejorar con UN remache más. Demuéstrame el tuyo." },
        ],
        win: [
          { who: "Fenn", speaker: "rival", text: "Buen remache. Escucha: el maestro ya no duerme. Dice que la máquina le dicta órdenes… y las máquinas del maestro nunca dictan. Dictan las de ALGO más." },
        ],
        lose: "Fenn te apunta en su cuaderno: «piezas pendientes: tú».",
      },
      {
        rival: "Dorvik, Maestro de Engranajes",
        rivalClass: "tinker",
        bossDeck: true,
        tier: "epic",
        bossMode: true,
        forcedBonuses: ["cat_item", "cat_item", "cat_accion"],
        cry: "«Mi taller, mis reglas. Tú eres la siguiente pieza.»",
        intro: [
          { who: "Narrador", speaker: "narrador", text: "La cadena infinita rodea la forja como un cinturón. Dorvik la ajusta con dos llaves y un solo ojo — el otro lo cambió por un visor que mira hacia el Umbral." },
          { who: "Dorvik", speaker: "rival", text: "La Sombra me enseñó la cadena perfecta: cada eslabón un esclavo. Tu Pacto tiene eslabones VIVOS. Eso es una falla de diseño." },
          { who: "Iria", speaker: "aliado", text: "Toda la forja bendice al metal. Lo tuyo también: los Ítems crecen aquí más que en ningún sitio." },
        ],
        win: [
          { who: "Dorvik", speaker: "rival", text: "Falló… la cadena falló y yo RESPIRO. El visor se apaga y el taller, por fin, calla. Quédate con la forja del Pacto — y con una advertencia: lo que dictaba la cadena habla desde el sexto anillo." },
        ],
        lose: "Dorvik te cuelga de la cadena: «las piezas rotas vuelven a la forja».",
      },
    ],
    epilogue: [
      { who: "Narrador", speaker: "narrador", text: "La Forja Eterna se une al Pacto. Cinco facciones. Queda el sexto anillo: el Umbral de Sombras, donde nadie habla y todo escucha." },
    ],
  },

  // ═══ CAPÍTULO 6 — EL UMBRAL DE SOMBRAS ════════════════════════════════
  {
    id: "c6",
    num: 6,
    title: "El Umbral de Sombras",
    place: "Corredor sin Faroles",
    biomeId: "sombra",
    rewardCards: 10,
    fights: [
      {
        rival: "Kess, el Cobrador del Gremio",
        rivalClass: "asesino",
        deckIndex: 1,
        tier: "epic",
        cry: "«Ni el estruendo de la guerra lo delata: ya está detrás de ti.»",
        intro: [
          { who: "Narrador", speaker: "narrador", text: "El corredor no tiene faroles porque los faroles se apagan solos. El Gremio manda a su mejor cobrador a cobrar el precio de tu cabeza." },
          { who: "Kess", speaker: "rival", text: "El Gremio contrató a alguien para matarte. Luego se descubrió que el contratante no era el Gremio… sino tu sombra. Igual cobro." },
        ],
        win: [
          { who: "Kess", speaker: "aliado", text: "Cobro completado: la sombra que te contrataba acaba de perder su contrato. El Gremio no manda más asesinos tras el Pacto — manda facturas." },
        ],
        variants: [
          {
            flag: "motin",
            win: [
              { who: "Kess", speaker: "aliado", text: "Me negué a cobrarte y me pagaron con silencio. Ese silencio vino del sexto anillo. Rompe tratos como rompiste el de Kaela: rompe el de la Sombra." },
            ],
          },
          {
            flag: "peaje_pagado",
            win: [
              { who: "Kess", speaker: "aliado", text: "Pagaste el peaje de la bahía como un honorable… y la Sombra AÚN te envió a mí. Los honrados no tenemos escapatoria: acaba con esto." },
            ],
          },
        ],
        lose: "Kess te deja vivo con un recibo: «la deuda sigue abierta».",
      },
      {
        rival: "Vharos, la Sombra Primigenia",
        rivalClass: "asesino",
        bossDeck: true,
        tier: "legendary",
        bossMode: true,
        forcedBonuses: ["cat_ataque", "cat_accion", "cost_neg"],
        cry: "«La última sombra no necesita luz para vencer.»",
        intro: [
          { who: "Narrador", speaker: "narrador", text: "El sexto anillo entero es una sola sombra. En su centro, algo con tu silueta espera desde antes de que nacieras." },
          { who: "Vharos", speaker: "rival", text: "Yo moví el vado de Bram. Yo regué la Arboleda. Yo susurré a Kaela y encendí la forja. Tu Pacto lo construí YO — para que llegaras aquí completo." },
          { who: "Tú", speaker: "heroe", text: "Completo y entero. Eso es lo que no entendiste: los eslabones vivos eligen." },
          { who: "Vharos", speaker: "rival", text: "Entonces ELIGE morir, como todos los que antes fueron Pacto." },
        ],
        win: [
          { who: "Vharos", speaker: "rival", text: "No… me derrito… en tus cinco mundos… Imposible. La sombra no muere: la sombra ENVÍA. Escucha… mi Heraldo ya camina… y trae mi última oferta." },
        ],
        lose: "La sombra te escupe fuera del Umbral: «el Pacto vuelve a intentarlo. Siempre vuelve».",
      },
    ],
    epilogue: [
      { who: "Narrador", speaker: "narrador", text: "Vharos cae… pero su voz sigue en las paredes. El Umbral tiembla: algo CRUZA el umbral desde el otro lado." },
    ],
  },

  // ═══ CAPÍTULO 7 — EL HERALDO ══════════════════════════════════════════
  {
    id: "c7",
    num: 7,
    title: "El Heraldo del Umbral",
    place: "La Puerta del Otro Lado",
    biomeId: "sombra",
    rewardCards: 12,
    fights: [
      {
        rival: "El Heraldo del Umbral",
        rivalClass: "asesino",
        bossDeck: true,
        tier: "legendary",
        bossMode: true,
        forcedBonuses: ["cost_pos", "cost_pos", "cat_ataque"],
        cry: "«Vengo a cobrar el Pacto COMPLETO.»",
        intro: [
          { who: "Narrador", speaker: "narrador", text: "La puerta del sexto anillo se abre hacia dentro. Del otro lado camina tu silueta exacta, con la corona de todos los reyes que la Sombra ya gastó." },
          { who: "Heraldo", speaker: "rival", text: "Soy la oferta final: un Pacto sin fin, sin muerte, sin ELECCIÓN. Todo lo que Vharos prometió y no pudo tomar. Ríndelo todo." },
          { who: "Bram", speaker: "aliado", text: "Cinco facciones a tu espalda, guerrero. Que la línea entera empuje." },
          { who: "Tú", speaker: "heroe", text: "El Pacto es de los que eligen. Y hoy elegimos: NO." },
        ],
        win: [
          { who: "Heraldo", speaker: "rival", text: "Un… pacto… de elegidos… La puerta se cierra desde TU lado. Qué diseño… tan imperfecto… y tan bueno." },
          { who: "Narrador", speaker: "narrador", text: "El Heraldo se disuelve en luz de amanecer. El Umbral, por primera vez en un siglo, tiene faroles." },
        ],
        lose: "El Heraldo te devuelve con un susurro frío: «la oferta no caduca. Los pactos tampoco».",
      },
    ],
    epilogue: [
      { who: "Narrador", speaker: "narrador", text: "El Pacto de Guerra queda firmado por seis facciones libres. La Torre de los Muros sigue en pie — ahora como prueba, no como prisión. Y lejos, muy lejos, algo anota tu nombre en una lista muy vieja…" },
    ],
  },
];

// ── LAS 3 DECISIONES ───────────────────────────────────────────────────────

export const STORY_CHOICES: StoryChoiceDef[] = [
  {
    id: "d1",
    afterChapter: 0,
    question: "Bram entrega su espada al vado. ¿Qué haces con el rebelde?",
    options: [
      {
        flag: "perdon_bram",
        label: "Perdonarlo",
        desc: "El Pacto nace del respeto — la corte de la escarcha lo escuchará.",
      },
      {
        flag: "toma_hierro",
        label: "Filiarlo con hierro",
        desc: "La torre se toma con disciplina — el miedo también obedece.",
      },
    ],
  },
  {
    id: "d2",
    afterChapter: 2,
    question: "Kaela exige peaje por dejar pasar al Pacto por la bahía.",
    options: [
      {
        flag: "peaje_pagado",
        label: "Pagar el peaje",
        desc: "Un trato limpio, firmado en oro — los honrados tienen aliados.",
      },
      {
        flag: "motin",
        label: "Romper el trato",
        desc: "El botín no se reparte — el mar respeta a quien teme.",
      },
    ],
  },
  {
    id: "d3",
    afterChapter: 4,
    question: "Dorvik ofrece a los autómatas de la cadena al Pacto.",
    options: [
      {
        flag: "maquina_viva",
        label: "Aceptar las máquinas",
        desc: "Poder para el Pacto — los engranajes no descansan nunca.",
      },
      {
        flag: "maquina_rota",
        label: "Fundir la cadena",
        desc: "Nada de esclavos de metal — el alma no se remacha.",
      },
    ],
  },
];

// ── Epílogos por clase (cierre de la historia con cada héroe) ──────────────

export const STORY_ENDINGS: Record<GameClass, string> = {
  guerrero:
    "El Guerrero firmó primero y firmó último. La línea de las Tierras Bajas ya no defiende un vado: defiende un mundo — y cada escudo del Pacto se apoya en el suyo.",
  mago:
    "La Hechicera convirtió el Pacto en resonancia: seis voces, una escuela. El invierno de Nyx ya no congela pueblos — riega los campos del otro lado del Umbral.",
  asesino:
    "El Asesino borró de la lista una sola deuda: la suya. Hoy el Gremio cobra en otro mercado… y el cobrador de Kess nunca vuelve del lado oscuro del Umbral.",
  botanico:
    "El Botánico replantó el Umbral: donde hubo sombra, ahora hay arboleda. La Arboleda Devoradora da manzanas — amargas, pero da.",
  pirata:
    "La flota de la Boca de Hierro descubrió el mar del otro lado de la puerta. Kaela bautizó el primer puerto libre: cobra peaje a las sombras, nunca a los vivos.",
  tinker:
    "El Tinker dejó de construir cadenas y empezó a construir campanas. Una por facción, afinadas al amanecer: el taller del Pacto dicta música, no órdenes.",
};

// ── Lógica pura ────────────────────────────────────────────────────────────

/** Total de capítulos (7). */
export const STORY_TOTAL = STORY_CHAPTERS.length;

/** Capítulo por índice (0-based, seguro). */
export function chapterAt(index: number): StoryChapter {
  return STORY_CHAPTERS[Math.min(Math.max(0, index), STORY_TOTAL - 1)];
}

/** Decisión pendiente tras un capítulo (null si ninguna). */
export function choiceAfterChapter(index: number): StoryChoiceDef | null {
  return STORY_CHOICES.find((c) => c.afterChapter === index) ?? null;
}

/** Resuelve las variantes de un combate según las decisiones tomadas. */
export function resolveFight(
  fight: StoryFight,
  flags: Record<string, boolean>
): StoryFight {
  const variant = fight.variants?.find((v) => flags[v.flag]);
  if (!variant) return fight;
  return {
    ...fight,
    rival: variant.rival ?? fight.rival,
    rivalClass: variant.rivalClass ?? fight.rivalClass,
    deckIndex: variant.deckIndex ?? fight.deckIndex,
    tier: variant.tier ?? fight.tier,
    intro: variant.intro ?? fight.intro,
    win: variant.win ?? fight.win,
  };
}

/** Línea de ARENA: la última del intro (o la cry explícita). */
export function fightCry(fight: StoryFight): string {
  if (fight.cry) return fight.cry;
  return fight.intro[fight.intro.length - 1]?.text ?? "";
}

/** ¿Índice de pelea es el ÚLTIMO del capítulo? */
export function isLastFight(chapter: StoryChapter, fightIdx: number): boolean {
  return fightIdx >= chapter.fights.length - 1;
}

/** XP fija por victoria de pelea (la torre paga por escalón — la historia por capítulo). */
export function storyXpForFight(chapterIdx: number): number {
  return 8 + chapterIdx * 4;
}
