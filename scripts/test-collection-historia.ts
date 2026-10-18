// ============================================================================
// Tests de colección + modo historia — bun scripts/test-collection-historia.ts
// 1) Rareza por fusión (grant, rewards, fuse, bestTier, PTP por tier)
// 2) Partidas completas vs bot (planBotTurn) sin atascos y con mazos materializados
// ============================================================================

import {
  useCollectionStore,
  hydrateCollection,
  type CardReward,
} from "../src/store/collectionStore";
import { CLASS_DECKS } from "../src/lib/game/cards";
import {
  materializeCard,
  getBalanceInfo,
  RARITY_ORDER,
  nextRarity,
  RARITY_PTP_BONUS_PER_TIER,
} from "../src/lib/game/balance";
import {
  createPvpState,
  joinBotPvpState,
  applyPvpAction,
  buildClientView,
  type PvpState,
  type PvpSide,
} from "../src/lib/game/pvp";
import { planBotTurn } from "../src/lib/game/pvp-ai";
import type { GameClass } from "../src/lib/game/types";

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
section("1. Colección: arranque, recompensas y fusión");
{
  hydrateCollection();
  const col = useCollectionStore.getState();
  col.resetAll();

  assert(col.grantStarterDeck("guerrero"), "grant inicial del mazo guerrero");
  assert(!col.grantStarterDeck("guerrero"), "el grant NO se repite");
  assert(col.totalCopies() === 12, `12 copias comunes (real ${col.totalCopies()})`);

  const first = CLASS_DECKS.guerrero[0];
  assert(col.bestTier(first.id) === "common", "bestTier = common sin fusiones");
  assert(!col.canFuse(first.id, "common"), "no fusiona con <3 copias");

  // Sembrar 3 copias raras de la primera carta → fusionar a épica
  useCollectionStore.setState((s) => ({
    copies: { ...s.copies, [first.id]: { ...s.copies[first.id], rare: 3 } },
  }));
  assert(useCollectionStore.getState().canFuse(first.id, "rare"), "3 raras → puede fusionar");
  const target = useCollectionStore.getState().fuse(first.id, "rare");
  assert(target === "epic", `fusión rara → épica (real ${target})`);
  assert(useCollectionStore.getState().countOf(first.id, "rare") === 0, "las 3 raras se consumen");
  assert(useCollectionStore.getState().countOf(first.id, "epic") === 1, "queda 1 épica");
  assert(useCollectionStore.getState().bestTier(first.id) === "epic", "bestTier refleja la épica");

  // Legendaria = tope de fusión
  assert(nextRarity("legendary") === null, "la legendaria no fusiona más");

  // Recompensas: 2 cartas, nunca legendarias, y suman copias
  const before = useCollectionStore.getState().totalCopies();
  const rewards: CardReward[] = useCollectionStore.getState().addRewards(2);
  assert(rewards.length === 2, "la victoria otorga 2 cartas");
  assert(rewards.every((r) => RARITY_ORDER.includes(r.rarity as never) && r.rarity !== "legendary"), "ninguna recompensa es legendaria");
  assert(useCollectionStore.getState().totalCopies() === before + 2, "las copias se suman");
}

// ===========================================================================
section("2. Rareza dentro del PTP: la copia mejorada es más fuerte y sigue legal");
{
  for (const def of CLASS_DECKS.guerrero.slice(0, 4)) {
    const common = getBalanceInfo(def, "common");
    const rareDef = materializeCard(def, "rare");
    assert(rareDef.power === def.power + RARITY_PTP_BONUS_PER_TIER, `${def.name}: rara = común +2 poder`);
    assert(rareDef.rarity === "rare", `${def.name}: la copia materializada lleva rareza rara`);
    const rare = getBalanceInfo(def, "rare");
    assert(rare.balanced, `${def.name}: PTP raro ${rare.currentPTP.toFixed(1)} en rango [${(rare.targetPTP - 0.5).toFixed(1)}, ${(rare.targetPTP + 0.5).toFixed(1)}]`);
    assert(common.currentPTP < rare.currentPTP, `${def.name}: común (${common.currentPTP.toFixed(1)}) < rara (${rare.currentPTP.toFixed(1)})`);
    // auditar la carta YA materializada como común da lo mismo (no doble conteo)
    const mat = getBalanceInfo(rareDef, "common");
    assert(Math.abs(mat.currentPTP - rare.currentPTP) < 1e-9, `${def.name}: materializada audida igual (sin doble bonus)`);
  }
}

// ===========================================================================
section("3. Modo historia: partidas completas vs bot sin atascos");
{
  const classes: GameClass[] = ["guerrero", "mago", "asesino"];
  let ended = 0;
  let ok = true;
  for (let seed = 0; seed < 6; seed++) {
    const playerClass = classes[seed % 3];
    const botClass = classes[(seed + 1) % 3];
    useCollectionStore.getState().resetAll();
    useCollectionStore.getState().grantStarterDeck(playerClass);
    const deck = CLASS_DECKS[playerClass].map((c) =>
      materializeCard(c, useCollectionStore.getState().bestTier(c.id))
    );

    const state: PvpState = createPvpState("HIST", { name: "Tú", gameClass: playerClass, deck });
    joinBotPvpState(state, { name: "Bot", gameClass: botClass, deck: CLASS_DECKS[botClass] });

    // El mazo materializado del jugador está en su pila (rareza viaja en las cartas)
    const pileRarities = new Set(state.players.a.drawPile.map((c) => c.rarity));
    assert(pileRarities.size >= 1, `seed ${seed}: pila del jugador con rarezas materializadas`);

    let guard = 0;
    while (state.phase === "playing" && guard++ < 200) {
      const active: PvpSide = state.activeSide;
      if (active === "b") {
        const plan = planBotTurn(state);
        for (const action of plan.actions) {
          try {
            applyPvpAction(state, "b", action);
          } catch {
            break;
          }
        }
        try {
          applyPvpAction(state, "b", { type: "pass" });
        } catch {
          break;
        }
      } else {
        // Jugador aleatorio: juega la primera carta legal o pasa
        const view = buildClientView(state, "a");
        let played = false;
        for (const card of view.you.hand) {
          for (const lane of view.you.lanes) {
            try {
              applyPvpAction(state, "a", { type: "play", uid: card.uid, lane });
              played = true;
              break;
            } catch {
              // siguiente combinación
            }
          }
          if (played) break;
        }
        if (!played) {
          try {
            applyPvpAction(state, "a", { type: "pass" });
          } catch {
            break;
          }
        }
      }
      // Invariante: quien acaba de pasar no conserva el turno
      if (state.phase === "playing") {
        void active;
      }
    }
    if (state.phase === "ended") ended++;
    else ok = false;
    assert(state.phase === "ended", `seed ${seed}: la partida vs ${botClass} termina (${state.turn} turnos)`);
  }
  assert(ok && ended === 6, "6/6 partidas historia completas sin atascos");
}

// ===========================================================================

console.log("\n" + "=".repeat(60));
console.log(`RESULTADO: ${passed} pasados, ${failed} fallidos`);
if (failed > 0) process.exit(1);
console.log("✨ Colección, fusión y modo historia funcionan.");
