// ============================================================================
// REGENERAR TEXTOS DE CARTAS — actualiza el campo `text` de cada carta
// basándose en su keyword + trigger + keywordValue actuales.
// ============================================================================
// Corre con: bun /home/z/my-project/scripts/update-card-texts.ts
// Idempotente: si lo corrés de nuevo, actualiza a lo mismo.
// ============================================================================

import { readFile, writeFile } from "fs/promises";
import { ALL_CARDS } from "../src/lib/game/cards";
import type { CardDef } from "../src/lib/game/types";
import { TRIGGER_META, KEYWORD_META } from "../src/lib/game/types";

const CARDS_PATH = "/home/z/my-project/src/lib/game/cards.ts";

function generateText(card: CardDef): string {
  const kw = card.keyword ?? "none";
  const trigger = card.trigger ?? "on_play";
  const X = card.keywordValue;
  // For keywords with [X] but no keywordValue set, default to 1 (minimum sensible value).
  const xVal = X !== undefined ? X : (KEYWORD_META[kw]?.hasValue ? 1 : 0);
  const xStr = xVal > 0 ? ` ${xVal}` : "";
  const threshold = card.umbralCondition?.powerThreshold;

  // Trigger prefix in Spanish (aligned with TRIGGER_META labels)
  const triggerLabel = TRIGGER_META[trigger].label;
  const kwLabel = KEYWORD_META[kw]?.label ?? kw;

  // Build the text based on keyword + trigger
  let text = "";

  // For despertar-triggered cards, prefix with "Despertar [threshold]:"
  if (trigger === "despertar" && threshold !== undefined) {
    text = `Despertar ${threshold}: `;
  } else if (trigger === "ofrenda") {
    text = "Al ser sacrificada: ";
  } else {
    text = `${triggerLabel}: `;
  }

  // If keyword label == trigger label (e.g. "Último Aliento: Último Aliento"), don't repeat.
  const skipKwPrefix = triggerLabel === kwLabel;

  switch (kw) {
    case "sacrificio":
      text += `Sacrificio${xStr} (Destruye a tu aliado con menor coste o con Ofrenda. Ganas +${xVal} de poder.)`;
      break;
    case "remate":
      text += `Remate${xStr} (Destruye a una carta enemiga en este carril si su poder es ${xVal} o menor.)`;
      break;
    case "celeridad":
      text += `Celeridad${xStr} (Reduce en ${xVal} el coste de una carta aleatoria en tu mano hasta que sea jugada.)`;
      break;
    case "sobrecarga":
      text += `Sobrecarga${xStr} (Esta carta cuesta ${xVal} menos de energía, pero pierdes ${xVal} de energía el próximo turno.)`;
      break;
    case "mimetismo":
      text += `Mimetismo (Copia la keyword y su valor del aliado con mayor poder en el tablero.)`;
      break;
    case "eco":
      text += `Eco${xStr} (Otorga +${xVal} de poder a las cartas en tu mano que compartan subtipo o categoría.)`;
      break;
    case "refuerzo":
      if (trigger === "start_turn") {
        text += `Refuerzo${xStr} (Otorga +${xVal} al aliado marcado en este carril, cada turno mientras esta carta esté en mesa.)`;
      } else {
        text += `Refuerzo${xStr} (Otorga +${xVal} al aliado jugado inmediatamente antes en este carril.)`;
      }
      break;
    case "ventaja":
      text += `Ventaja${xStr} (Gana +${xVal} mientras tu poder total en este carril sea menor al del rival.)`;
      break;
    case "vanguardia":
      text += `Vanguardia${xStr} (Gana +${xVal} si es la primera carta que juegas en tu turno.)`;
      break;
    case "aislado":
      text += `Aislado${xStr} (Gana +${xVal} mientras sea tu única aliada en este carril.)`;
      break;
    case "trampa":
      text += `Trampa${xStr} (La próxima carta enemiga jugada en este carril recibe -${xVal} de poder.)`;
      break;
    case "reagrupar":
      text += `Reagrupar (Mueve a tu aliado de menor poder de otro carril a este, si hay espacio.)`;
      break;
    case "ultimo_aliento":
      text += `${skipKwPrefix ? "" : "Último Aliento "}${xStr.trim()} (Al morir, transfiere +${xVal} de poder a la aliada más débil de este carril.)`;
      break;
    case "baluarte":
      text += `Baluarte (Tus demás aliados en este carril son inmunes a reducciones de poder enemigas.)`;
      break;
    case "sigilo":
      text += `Sigilo (Durante su primer turno en mesa, no puede ser objetivo de efectos directos enemigos.)`;
      break;
    case "vinculo":
      text += `Vínculo${xStr} (Si hay otra carta de su misma categoría aquí, ambas ganan +${xVal}.)`;
      break;
    case "muro":
      text += `Muro (El rival debe jugar sus próximas cartas en este carril si no ha alcanzado el límite.)`;
      break;
    case "retorno":
      text += `Retorno${xStr} (Si el poder de esta carta baja a ${xVal} o menos, o si es destruida/sacrificada, regresa a tu mano con coste 0.)`;
      break;
    case "reciclar":
      text += `Reciclar${xStr} (Al ser destruida o sacrificada, recuperas ${xVal} de energía.)`;
      break;
    case "doble_golpe":
      text += `Doble Golpe${xStr} (Aplica su efecto o debuff de valor ${xVal} en este carril y en un carril adyacente.)`;
      break;
    case "refugio":
      text += `Refugio${xStr} (Absorbe hasta ${xVal} puntos de reducción de poder que vaya a sufrir un aliado en este carril.)`;
      break;
    case "emboscada":
      text += `Emboscada${xStr} (Gana +${xVal} de poder si el rival ya tiene el carril lleno, 4 cartas.)`;
      break;
    case "transferencia":
      text += `Transferencia${xStr} (Resta ${xVal} de poder a un aliado en este carril y se lo otorga a un aliado en otro carril.)`;
      break;
    case "renovacion":
      text += `Renovación${xStr} (Descarta 1 carta de tu mano para robar ${xVal} cartas del mazo.)`;
      break;
    case "sangrado":
      text += `Sangrado${xStr} (Aplica -${xVal} de poder al enemigo más fuerte del carril, cada turno.)`;
      break;
    case "frenesi":
      text += `Frenesí${xStr} (Gana +${xVal} de poder acumulativo cada vez que se dispara su trigger.)`;
      break;
    case "enrabia":
      text += `Enrabia${xStr} (Gana +${xVal} la primera vez que sufre una reducción de poder enemiga.)`;
      break;
    case "espinas":
      text += `Espinas${xStr} (Aplica -${xVal} a la carta enemiga que le aplique una reducción a esta carta.)`;
      break;
    case "cupula":
      text += `Cúpula${xStr} (Cancela hasta ${xVal} puntos de reducciones enemigas dirigidas a este carril. Pool renovado cada turno.)`;
      break;
    case "guardian":
      text += `Guardián (Redirige hacia esta carta las reducciones de poder enemigas dirigidas a sus aliados locales.)`;
      break;
    case "perforacion":
      text += `Perforación${xStr} (Ignora hasta ${xVal} puntos de Prevención (Cúpula/Baluarte) del objetivo al reducir su poder.)`;
      break;
    case "desarme":
      text += `Desarme${xStr} (Reduce en ${xVal} el valor de las keywords del enemigo más fuerte del carril.)`;
      break;
    case "mejora":
      text += `Mejora${xStr} (Otorga +${xVal} de poder permanente al aliado más débil del carril.)`;
      break;
    case "none":
    default:
      // No keyword — just describe the card's basic stats
      text = `${card.name}. Coste ${card.cost}, Poder ${card.power}.`;
      break;
  }

  return text;
}

// Read cards.ts
let content = await readFile(CARDS_PATH, "utf-8");

let updated = 0;
let skipped = 0;

for (const card of ALL_CARDS) {
  const newText = generateText(card);

  // Find the card's text field by matching the card's id
  const idPattern = `id: "${card.id}",`;
  const idIdx = content.indexOf(idPattern);
  if (idIdx < 0) {
    console.warn(`  ! No se encontró el cardId "${card.id}" — saltando`);
    skipped++;
    continue;
  }

  // Find the text field within the card block
  const blockEnd = content.indexOf("\n  },", idIdx);
  if (blockEnd < 0) {
    console.warn(`  ! No se pudo delimitar el bloque de "${card.id}" — saltando`);
    skipped++;
    continue;
  }

  const blockStart = idIdx;
  const block = content.slice(blockStart, blockEnd);

  // Replace the text field
  const textRegex = /^( +)text: ".*",$/m;
  const newBlock = block.replace(textRegex, (match, indent) => `${indent}text: "${newText.replace(/"/g, '\\"')}",`);

  if (newBlock === block) {
    // Text didn't change or regex didn't match
    skipped++;
    continue;
  }

  content = content.slice(0, blockStart) + newBlock + content.slice(blockEnd);
  updated++;
  console.log(`✓ ${card.name.padEnd(30)} → "${newText.slice(0, 60)}..."`);
}

await writeFile(CARDS_PATH, content, "utf-8");
console.log(`\n✓ ${updated} textos actualizados, ${skipped} saltados.`);
