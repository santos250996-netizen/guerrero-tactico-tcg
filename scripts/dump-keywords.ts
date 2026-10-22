import { KEYWORD_META } from "../src/lib/game/types";
const rows = Object.entries(KEYWORD_META).map(([id, m]) => ({
  id, trigger: m.trigger, label: m.label, scope: m.scope,
  sub: m.exclusiveSubtype ?? "-", hasValue: m.hasValue,
  desc: m.description.length > 88 ? m.description.slice(0, 85) + "..." : m.description,
}));
for (const r of rows) console.log(r.id.padEnd(15), r.trigger.padEnd(11), r.sub.padEnd(12), r.desc);
console.log("TOTAL:", rows.length);
