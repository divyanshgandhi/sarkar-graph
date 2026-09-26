// Layout regression check: lays out every government and reports marks that overlap.
//   node --experimental-strip-types scripts/check-layout.ts
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { layoutWheel } from "../src/lib/layout.ts";
import type { GovGraph } from "../src/lib/types.ts";

const DIR = new URL("../public/data/graph", import.meta.url).pathname;
let worst = 0;
const rows: string[] = [];
for (const f of readdirSync(DIR).filter((x) => x.endsWith(".json")).sort()) {
  const g: GovGraph = JSON.parse(readFileSync(join(DIR, f), "utf8"));
  const t0 = performance.now();
  const L = layoutWheel(g);
  const ms = performance.now() - t0;
  const marks = [...L.nodes.values()].filter((p) => p.kind !== "seal" && p.kind !== "chamber");
  // spatial hash
  const cell = 24;
  const grid = new Map<string, typeof marks>();
  for (const p of marks) {
    const k = `${Math.floor(p.x / cell)},${Math.floor(p.y / cell)}`;
    (grid.get(k) ?? grid.set(k, []).get(k)!).push(p);
  }
  let overlaps = 0;
  const examples: string[] = [];
  for (const p of marks) {
    const cx = Math.floor(p.x / cell),
      cy = Math.floor(p.y / cell);
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (const q of grid.get(`${cx + dx},${cy + dy}`) ?? []) {
          if (q.id <= p.id) continue;
          const need = (p.s + q.s) / 2 - 0.5;
          const d = Math.hypot(p.x - q.x, p.y - q.y);
          if (d < need) {
            overlaps++;
            if (examples.length < 3) examples.push(`${p.id} × ${q.id} (${d.toFixed(1)} < ${need.toFixed(1)})`);
          }
        }
  }
  // marks inside the seal
  const inSeal = marks.filter((p) => p.r - p.s / 2 < L.seal + 20).length;
  worst = Math.max(worst, overlaps + inSeal);
  rows.push(`${g.gov.padEnd(3)} ${String(marks.length).padStart(5)} marks  extent ${L.extent.toFixed(0).padStart(4)}  ${ms.toFixed(0).padStart(3)}ms  overlaps ${overlaps}${inSeal ? `  in-seal ${inSeal}` : ""}${examples.length ? "  e.g. " + examples.join("; ") : ""}`);
}
console.log(rows.join("\n"));
console.log(worst ? `\nFAIL: overlaps found` : `\nOK: no overlapping marks in any government`);
process.exitCode = worst ? 1 : 0;
