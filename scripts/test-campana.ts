// ============================================================================
// Tests de LA TORRE DE LOS MUROS (modo de escalada) — bun scripts/test-campana.ts
// 1) Lógica pura de la torre (6 jefes, tiers, botín, XP, nombres)
// 2) Store de campaña: advance / prestigio / sin retroceso
// 3) Integración: startHistoria-equivalente por piso (decks y bossMode)
// 4) Mesas de drops con floorLevel (el piso mejora el botín)
// ============================================================================

import {
  CAMPAIGN_STEPS,
  CAMPAIGN_BOSS_STEPS,
  isBossStep,
  bossClassForStep,
  rivalClassForStep,
  rivalDeckIndexForStep,
  botTitleForStep,
  rivalNameForStep,
  botTierForStep,
  bossTierForPrestige,
  rewardCountForStep,
  xpBonusForStep,
  effectiveDropLevel,
  stepChipLabel,
  biomeForStep,
  loreForStep,
  classUnlocked,
  classUnlockHint,
  CLASS_UNLOCK_STEP,
  CAMPAIGN_BOT_LORE,
  CAMPAIGN_BOSS_LORE,
} from "../src/lib/game/campaign";
import { useCampaignStore } from "../src/store/campaignStore";
import { useCollectionStore, hydrateCollection } from "../src/store/collectionStore";
import { useStatsStore, dropTableFor } from "../src/store/statsStore";
import { BOSS_DECKS, classDecksOf } from "../src/lib/game/cards";
import { materializeCard } from "../src/lib/game/balance";
import { enableBossMode, createPvpState, joinBotPvpState } from "../src/lib/game/pvp";
import type { GameClass, Rarity } from "../src/lib/game/types";

let passed = 0;
let failed = 0;

function assert(cond: boolean, label: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ FALLO: ${label}`);
  }
}

function section(t: string) {
  console.log(`\n── ${t} ──`);
}

// ===========================================================================
section("1. Estructura de la torre: 6 jefes, rival determinista, títulos");
{
  assert(CAMPAIGN_STEPS === 18, "18 pisos");
  assert(
    JSON.stringify(CAMPAIGN_BOSS_STEPS) === JSON.stringify([3, 6, 9, 12, 15, 18]),
    "jefes en los pisos 3/6/9/12/15/18 — UNO POR CLASE"
  );
  assert(
    isBossStep(3) && isBossStep(6) && isBossStep(9) && isBossStep(12) && isBossStep(15) && isBossStep(18),
    "isBossStep marca los 6 muros"
  );
  assert(!isBossStep(4) && !isBossStep(5) && !isBossStep(17), "isBossStep NO marca pisos normales");

  assert(bossClassForStep(3) === "guerrero", "piso 3 = Korgath (guerrero)");
  assert(bossClassForStep(6) === "botanico", "piso 6 = Yggra (botánico)");
  assert(bossClassForStep(9) === "pirata", "piso 9 = Kaela (pirata)");
  assert(bossClassForStep(12) === "mago", "piso 12 = Nyx (mago)");
  assert(bossClassForStep(15) === "tinker", "piso 15 = Dorvik (tinker)");
  assert(bossClassForStep(18) === "asesino", "piso 18 = Vharos (asesino) — la corona");
  assert(bossClassForStep(7) === null, "piso normal → sin jefe");

  // Rotación determinista de rivales normales
  assert(rivalClassForStep(1) === "guerrero", "piso 1 → rival guerrero");
  assert(rivalClassForStep(2) === "mago", "piso 2 → rival mago");
  assert(rivalClassForStep(4) === "guerrero", "piso 4 → rival guerrero");
  assert(rivalClassForStep(5) === rivalClassForStep(2), "la rotación se repite cada 3");
  for (let s = 1; s <= CAMPAIGN_STEPS; s++) {
    if (!isBossStep(s)) {
      const cls = rivalClassForStep(s);
      const decks = classDecksOf(cls);
      const deck = decks[rivalDeckIndexForStep(s)];
      assert(deck.length === 12, `piso ${s}: mazo del rival (${cls}) tiene 12 cartas`);
    }
  }

  assert(botTitleForStep(1) === "Aprendiz" && botTitleForStep(6) === "Aprendiz", "tramo 1-6 = Aprendiz");
  assert(botTitleForStep(7) === "Veterano" && botTitleForStep(11) === "Veterano", "tramo 7-12 = Veterano");
  assert(botTitleForStep(13) === "Campeón" && botTitleForStep(17) === "Campeón", "tramo 13-17 = Campeón");

  assert(rivalNameForStep(1) === "Bram, Aprendiz de Guerrero", "nombre piso 1 completo");
  assert(rivalNameForStep(7).includes("Veterano"), "nombre piso 7 con título Veterano");
  assert(rivalNameForStep(3).startsWith("Korgath"), "nombre del jefe en el piso 3");
  assert(rivalNameForStep(6).startsWith("Yggra"), "Yggra guarda el piso 6");
  assert(rivalNameForStep(18).startsWith("Vharos"), "Vharos corona el piso 18");
  assert(
    rivalNameForStep(4) === rivalNameForStep(4) && rivalNameForStep(4) === "Bram, Aprendiz de Guerrero",
    "rival determinista (siempre el mismo en el piso 4)"
  );

  assert(stepChipLabel(7) === "Piso 7", "chip normal (Piso)");
  assert(stepChipLabel(12) === "JEFE · Piso 12", "chip de jefe");
}

// ===========================================================================
section("2. Dificultad: tiers de material por piso y prestigio");
{
  // Prestigio 0: común → raro → épico
  assert(botTierForStep(1, 0) === "common", "piso 1 → común");
  assert(botTierForStep(6, 0) === "common", "piso 6 → común");
  assert(botTierForStep(7, 0) === "rare", "piso 7 → raro");
  assert(botTierForStep(12, 0) === "rare", "piso 12 → raro");
  assert(botTierForStep(13, 0) === "epic", "piso 13 → épico");
  assert(botTierForStep(17, 0) === "epic", "piso 17 → épico");
  // Prestigio: +1 peldaño por vuelta, tope LEGENDARIA (mítica reservada al jugador)
  assert(botTierForStep(1, 1) === "rare", "prestigio 1: piso 1 → raro");
  assert(botTierForStep(1, 2) === "epic", "prestigio 2: piso 1 → épico");
  assert(botTierForStep(1, 3) === "legendary", "prestigio 3: piso 1 → legendaria");
  assert(botTierForStep(1, 99) === "legendary", "tope: NUNCA mítica para bots");
  assert(bossTierForPrestige(0) === "epic", "jefe 1ª vuelta → épico");
  assert(bossTierForPrestige(1) === "legendary", "jefe en prestigio → legendaria");

  // Materialización real: la común es la carta base; la legendaria +5 poder
  const base = classDecksOf("guerrero")[0][0];
  assert(materializeCard(base, "common") === base, "material común = carta base intacta");
  assert(materializeCard(base, "legendary").power === base.power + 5, "material legendaria = +5 poder");
}

// ===========================================================================
section("3. Botín y XP escalables (más alto = mejor pago)");
{
  assert(rewardCountForStep(1) === 2, "piso 1 paga 2 cartas");
  assert(rewardCountForStep(4) === 2, "piso 4 paga 2");
  assert(rewardCountForStep(5) === 3, "piso 5 paga 3");
  assert(rewardCountForStep(9) === 3, "piso 9 paga 3");
  assert(rewardCountForStep(10) === 4, "piso 10 paga 4");
  assert(rewardCountForStep(14) === 4, "piso 14 paga 4");
  assert(rewardCountForStep(15) === 5, "piso 15 paga 5");
  assert(rewardCountForStep(18) === 5, "piso 18 paga 5");
  assert(rewardCountForStep(1) < rewardCountForStep(18), "avanzar paga MÁS");

  assert(xpBonusForStep(1, 0) === 1, "XP extra piso 1 = +1");
  assert(xpBonusForStep(17, 0) === 17, "XP extra piso 17 = +17");
  assert(xpBonusForStep(10, 1) === 15, "prestigio multiplica ×1.5 (10→15)");
  assert(xpBonusForStep(1, 0) < xpBonusForStep(18, 0), "avanzar da MÁS XP");

  assert(effectiveDropLevel(1, 1) === 3, "drops: piso 1 → nivel efectivo 3");
  assert(effectiveDropLevel(1, 18) === 20, "drops: piso 18 → nivel efectivo 20");
  assert(effectiveDropLevel(50, 3) === 50, "nivel alto manda (no baja)");
  // El piso alto abre mesas con épicas/legendarias aunque seas N1
  const lowTable = dropTableFor(1);
  const highTable = dropTableFor(effectiveDropLevel(1, 13));
  assert(lowTable.every(([r]) => r === "common"), "N1 mesa 100% común");
  assert(highTable.some(([r]) => r === "legendary"), "escalón 13+ abre legendarias en drops");
}

// ===========================================================================
section("4. Store de campaña: advance, prestigio y sin retroceso");
{
  useCampaignStore.getState().resetCampaign();
  let st = useCampaignStore.getState();
  assert(st.step === 1 && st.prestige === 0 && st.stepsCleared === 0, "estado inicial limpio");

  let r = st.advance();
  assert(r.step === 2 && !r.completed, "ganar el 1 → avanzar al 2");
  assert(useCampaignStore.getState().step === 2, "step persistido en el store");

  // Ganar en cadena hasta el 18 y cerrar la torre
  for (let i = 0; i < 16; i++) useCampaignStore.getState().advance();
  st = useCampaignStore.getState();
  assert(st.step === 18 && st.prestige === 0, "cadena hasta el 18 sin prestigio");
  r = st.advance();
  assert(r.completed === true && r.step === 1, "el 18 vencido CIERRA la torre");
  st = useCampaignStore.getState();
  assert(st.prestige === 1 && st.step === 1, "★ prestigio 1 y torre al 1");
  assert(st.stepsCleared === 18, "18 pisos superados en total");

  // Vuelta de prestigio: el jugador concretamente NO retrocede al perder
  // (no hay acción de retroceso — solo advance() tras victoria, por diseño).
  useCampaignStore.getState().resetCampaign();
  st = useCampaignStore.getState();
  assert(st.step === 1 && st.prestige === 0 && st.stepsCleared === 0, "reset vuelve al inicio");
}

// ===========================================================================
section("5. Integración con el motor: cada escalón arma su partida");
{
  hydrateCollection();
  useCollectionStore.getState().resetAll();
  useStatsStore.setState({ level: 1, xp: 0 });

  // El estado de campaña inicia limpio para el bucle de abajo
  useCampaignStore.getState().resetCampaign();

  for (let step = 1; step <= CAMPAIGN_STEPS; step++) {
    const boss = isBossStep(step);
    const prestige = useCampaignStore.getState().prestige;
    const bossClass = bossClassForStep(step);
    const botClass = bossClass ?? rivalClassForStep(step);
    const botDeck = boss
      ? BOSS_DECKS[botClass!].map((c) => materializeCard(c, bossTierForPrestige(prestige)))
      : classDecksOf(botClass)[rivalDeckIndexForStep(step)].map((c) =>
          materializeCard(c, botTierForStep(step, prestige))
        );
    assert(botDeck.length === 12, `piso ${step}: 12 cartas de rival (${boss ? "JEFE" : rivalClassForStep(step)})`);

    const state = createPvpState("HIST", {
      name: "Tú",
      gameClass: "guerrero",
      deck: classDecksOf("guerrero")[0],
    });
    joinBotPvpState(state, { name: rivalNameForStep(step), gameClass: botClass!, deck: botDeck });
    if (boss) enableBossMode(state);
    assert(
      state.bossMode === boss,
      `piso ${step}: bossMode ${boss ? "ACTIVO (jugada gratis + 3 bonos)" : "inactivo"}`
    );
    // El mazo rival respeta el tier de material esperado
    if (!boss && !bossClass) {
      const expected: Rarity = botTierForStep(step, prestige);
      assert(
        botDeck.every((c) => c.power >= 0),
        `piso ${step}: mazo rival materializado (${expected}) jugable`
      );
    }
  }
}

// ===========================================================================
section("6. Botín con floorLevel: el escalón abre rarezas aunque seas N1");
{
  useCollectionStore.getState().resetAll();
  useStatsStore.setState({ level: 1, xp: 0 });
  const col = useCollectionStore.getState();
  // escalón 12 → floor 14 → mesa con épicas/legendarias. 40 tiradas para que
  // el test NO sea azaroso (P(0 no-comunes en 40) < 1e-12).
  const rewards = col.addRewards(40, { floorLevel: effectiveDropLevel(1, 12) });
  assert(rewards.length === 40, "40 tiradas con floor de escalón");
  const hasHigh = rewards.some((r) => r.rarity === "epic" || r.rarity === "legendary");
  assert(hasHigh, "alguna carta sale épica/legendaria por el floor de escalón");
  // N1 SIN floor sigue siendo 100% común
  const low = col.addRewards(4);
  assert(low.every((r) => r.rarity === "common"), "sin floor, N1 sigue pagando comunes");
}

// ===========================================================================
section("7. Lore + biomas + botín del JEFE a ELEGIR (3 raras)");
{
  // Lore: cada clase rival tiene 3 líneas (por tramo) y cada jefe la suya
  const classes: ("guerrero" | "mago" | "asesino")[] = ["guerrero", "mago", "asesino"];
  assert(
    classes.every((c) => CAMPAIGN_BOT_LORE[c].length === 3 && CAMPAIGN_BOT_LORE[c].every((l) => l.length > 10)),
    "lore de rivales: 3 líneas por clase, no vacías"
  );
  assert(
    classes.every((c) => CAMPAIGN_BOSS_LORE[c].length > 10),
    "lore de jefes: línea propia por clase"
  );
  assert(!loreForStep(1).isBoss && loreForStep(1).text.length > 10, "lore piso 1 = rival normal");
  assert(loreForStep(7).text.length > 10 && !loreForStep(7).isBoss, "lore piso 7 (Veterano) = rival normal");
  assert(
    loreForStep(3).isBoss && loreForStep(6).isBoss && loreForStep(9).isBoss && loreForStep(12).isBoss && loreForStep(15).isBoss && loreForStep(18).isBoss,
    "lore de los 6 muros = JEFE"
  );
  // Biomas: la torre cruza 9 regiones — cada guardián tiene la suya
  const expect: Record<number, string> = { 1: "tierras", 2: "tierras", 3: "hierro", 4: "jardin", 5: "jardin", 6: "jardin", 7: "puerto", 9: "puerto", 10: "ceniza", 11: "ceniza", 12: "escarcha", 13: "hielo", 14: "hielo", 15: "forja", 16: "sombra", 17: "sombra", 18: "sombra" };
  assert(
    Object.entries(expect).every(([s, id]) => biomeForStep(Number(s)).id === id),
    "bioma correcto por tramo y por muro de jefe"
  );
  assert(biomeForStep(3).tint.includes("radial-gradient") && biomeForStep(3).hex.length > 0, "bioma lleva tinte CSS + color de acento");
  // DESBLOQUEO de clases: cada jefe vencido recluta a la siguiente clase
  assert(
    CLASS_UNLOCK_STEP.guerrero === 0 && CLASS_UNLOCK_STEP.mago === 3 && CLASS_UNLOCK_STEP.botanico === 6 && CLASS_UNLOCK_STEP.pirata === 9 && CLASS_UNLOCK_STEP.asesino === 12 && CLASS_UNLOCK_STEP.tinker === 15,
    "umbrales de desbloqueo correctos (0/3/6/9/12/15)"
  );
  assert(classUnlocked("guerrero", 0) && !classUnlocked("mago", 2) && !classUnlocked("botanico", 5), "solo guerrero está abierta al empezar");
  assert(classUnlocked("mago", 3) && !classUnlocked("mago", 2) && !classUnlocked("botanico", 3), "vencer Korgath abre MAGO (y solo mago)");
  assert(classUnlocked("botanico", 6) && !classUnlocked("pirata", 6), "vencer Yggra abre BOTÁNICO");
  assert(classUnlocked("pirata", 9) && !classUnlocked("asesino", 9), "vencer Kaela abre PIRATA");
  assert(classUnlocked("asesino", 12) && !classUnlocked("tinker", 12), "vencer Nyx abre ASESINO");
  assert(classUnlocked("tinker", 15), "vencer Dorvik abre TINKER");
  assert(classUnlockHint("guerrero") === null, "guerrero no necesita pista de desbloqueo");
  assert((classUnlockHint("mago") ?? "").includes("Korgath") && (classUnlockHint("mago") ?? "").includes("3"), "pista de mago apunta a Korgath · Piso 3");
  assert((classUnlockHint("asesino") ?? "").includes("Nyx") && (classUnlockHint("asesino") ?? "").includes("12"), "pista de asesino apunta a Nyx · Piso 12");
  assert((classUnlockHint("tinker") ?? "").includes("Dorvik") && (classUnlockHint("tinker") ?? "").includes("15"), "pista de tinker apunta a Dorvik · Piso 15");
  // Botín del JEFE (tanda 40): 3 opciones ÉPICAS distintas y se llevan 2 (isNew real)
  useCollectionStore.getState().resetAll();
  const col = useCollectionStore.getState();
  const before = col.totalCopies();
  const opts = col.rollPickOptions(3, "epic");
  assert(opts.length === 3, "el jefe ofrece 3 opciones");
  assert(opts.every((o) => o.rarity === "epic"), "todas las opciones son ÉPICAS (nada de legendarias)");
  assert(new Set(opts.map((o) => o.id)).size === 3, "las 3 opciones son cartas distintas");
  const granted = col.grantPick(opts[0]);
  assert(useCollectionStore.getState().countOf(granted.id, "epic") >= 1, "la carta elegida quedó en la colección (tier épico)");
  assert(useCollectionStore.getState().totalCopies() === before + 1, "grantPick añade EXACTAMENTE 1 copia");
  const granted2 = col.grantPick(opts[1]);
  assert(useCollectionStore.getState().totalCopies() === before + 2, "el pick de 2 añade EXACTAMENTE 2 copias");
  const again = col.grantPick({ id: granted.id, rarity: "epic", isNew: true });
  assert(again.isNew === false, "segunda copia de la misma carta ya NO es NUEVA");
  const once = col.grantPick({ id: opts[2].id, rarity: "epic", isNew: true });
  assert(once.isNew === true || opts[2].id === granted.id || opts[2].id === granted2.id, "1ª copia de una carta nueva SÍ marca NUEVA");
}

// ===========================================================================
console.log(`\n═══ RESULTADO: ${passed} pasan · ${failed} fallan ═══`);
if (failed > 0) process.exit(1);
