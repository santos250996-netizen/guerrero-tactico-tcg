// Find cards with keyword that takes [X] but no keywordValue set.
import { ALL_CARDS } from "../src/lib/game/cards";
import { KEYWORD_META } from "../src/lib/game/types";

console.log("Cartas con keyword que toma [X] pero sin keywordValue:\n");
let count = 0;
for (const card of ALL_CARDS) {
  if (!card.keyword || card.keyword === "none") continue;
  const meta = KEYWORD_META[card.keyword];
  if (meta.hasValue && card.keywordValue === undefined) {
    count++;
    console.log(`  ${card.name} (cost ${card.cost}, power ${card.power}) — keyword=${card.keyword}, keywordValue=undefined, trigger=${card.trigger}`);
  }
}
console.log(`\nTotal: ${count} cartas con el problema.`);
