// Coverage + integrity report over the compiled graphs.
//   node --experimental-strip-types scripts/coverage.ts  → prints a table and writes research/india/COVERAGE.md
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { GovGraph } from "../src/lib/types.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const DIR = join(ROOT, "public/data/graph");
const rows: string[] = [];
const issues: string[] = [];
// One photo must depict one person: flag a portrait worn by holders whose names share nothing.
const faces = new Map<string, Map<string, string>>();
const nameTokens = (s: string) => s.toLowerCase().replace(/\(.*?\)|\b(dr|shri|smt|justice|prof|adv)\b\.?/g, "").split(/[^a-z]+/).filter((w) => w.length > 2);
let totNodes = 0,
  totSeats = 0,
  totHeld = 0,
  totLow = 0;

const union: GovGraph = JSON.parse(readFileSync(join(DIR, "in.json"), "utf8"));
const u = Object.values(union.nodes);
const count = (f: (n: (typeof u)[number]) => boolean) => u.filter(f).length;
const lines = [
  ["Union ministries", count((n) => n.kind === "ministry")],
  ["Union departments (incl. independent)", count((n) => n.kind === "department" || n.kind === "independent_department")],
  ["Attached / subordinate / autonomous / statutory bodies", count((n) => /attached|subordinate|autonomous|statutory|mission|secretariat/.test(n.kind))],
  ["Public sector companies & banks", count((n) => n.kind === "cpse" || n.kind === "public_sector_bank")],
  ["Armed forces, CAPFs, agencies", count((n) => /armed_force|capf|agency/.test(n.kind))],
  ["Constitutional bodies & regulators", count((n) => n.sector === "constitutional" && !n.isPosition)],
  ["Courts & tribunals", count((n) => n.sector === "judicial" && !n.isPosition)],
  ["Parliamentary committees", count((n) => n.kind === "parliamentary_committee")],
  ["Lok Sabha seats listed", union.nodes["in-lok-sabha"]?.members?.length ?? 0],
  ["Rajya Sabha seats listed", union.nodes["in-rajya-sabha"]?.members?.length ?? 0],
  ["Union seats drawn as offices", count((n) => !!n.isPosition)],
] as const;

for (const f of readdirSync(DIR).filter((x) => x.endsWith(".json"))) {
  const g: GovGraph = JSON.parse(readFileSync(join(DIR, f), "utf8"));
  const ns = Object.values(g.nodes);
  totNodes += ns.length;
  let seats = 0,
    held = 0,
    low = 0;
  for (const n of ns) {
    if (n.isPosition) {
      seats++;
      if (n.holder) held++;
      if (n.confidence === "low") low++;
    }
    for (const m of n.members ?? []) {
      seats++;
      if (m.holder) held++;
      if (m.confidence === "low") low++;
    }
  }
  totSeats += seats;
  totHeld += held;
  totLow += low;
  if (g.gov !== "in") {
    const cm = ns.find((n) => n.rank === "chief_minister");
    const gv = ns.find((n) => ["governor", "lieutenant_governor", "administrator"].includes(n.rank ?? ""));
    const asm = ns.find((n) => /-assembly$/.test(n.id));
    const mlas = asm?.members?.length ?? 0;
    const depts = ns.filter((n) => n.kind === "state_department").length;
    const dists = ns.filter((n) => n.kind === "district").length;
    const ministers = ns.filter((n) => ["state_minister", "deputy_chief_minister", "cabinet_minister", "minister_of_state", "mos_independent_charge"].includes(n.rank ?? "")).length;
    rows.push(`| ${g.name} | ${gv?.holder?.name ?? "—"} | ${cm?.holder?.name ?? "—"} | ${ministers} | ${asm?.seats ?? "—"} / ${mlas} | ${depts} | ${dists} | ${ns.length} |`);
    if (!gv) issues.push(`${g.name}: no Governor/LG/Administrator`);
    if (!cm && g.kind === "state") issues.push(`${g.name}: no Chief Minister (President's rule?)`);
    if (asm?.seats && mlas && mlas !== asm.seats) issues.push(`${g.name}: ${mlas} MLAs listed for ${asm.seats} seats`);
  }
  // integrity
  for (const n of ns) {
    if (n.parent && !g.nodes[n.parent]) issues.push(`${g.gov}: ${n.id} → missing parent ${n.parent}`);
    if (n.head && !g.nodes[n.head]) issues.push(`${g.gov}: ${n.id} → missing head ${n.head}`);
  }
  for (const e of g.edges) if (!g.nodes[e.from] || !g.nodes[e.to]) issues.push(`${g.gov}: dangling edge ${e.from} → ${e.to}`);
  // A person sits in one seat of a house: two seats of the same chamber linking one Wikipedia page is a
  // mismatched link (two MP MLAs once both pointed at a deceased ICJ judge who shared their name).
  for (const n of ns) {
    const byLink = new Map<string, string[]>();
    for (const m of n.members ?? []) if (m.holder?.wikipedia && !m.holder.acting) (byLink.get(m.holder.wikipedia) ?? byLink.set(m.holder.wikipedia, []).get(m.holder.wikipedia)!).push(m.id);
    for (const [link, ids] of byLink) if (ids.length > 1) issues.push(`${g.gov}: ${ids.join(", ")} all link ${decodeURIComponent(link.split("/wiki/")[1] ?? link)}`);
  }
  for (const n of ns)
    for (const s of [n, ...(n.members ?? [])])
      if (s.holder?.image) (faces.get(s.holder.image) ?? faces.set(s.holder.image, new Map()).get(s.holder.image)!).set(s.holder.name, s.id);
}
for (const [img, who] of faces) {
  const names = [...who.keys()];
  const overlaps = (a: string, b: string) => nameTokens(a).some((w) => nameTokens(b).join("").includes(w));
  const shareNothing = names.some((a) => names.some((b) => a !== b && !overlaps(a, b) && !overlaps(b, a)));
  if (shareNothing) issues.push(`one portrait, different people: ${[...who].map(([n, id]) => `${n} (${id})`).join(" · ")} — ${decodeURIComponent(img.split("/").pop()!.split("?")[0])}`);
}

const md = `# Coverage — Sarkar Graph (${union.asOf})

**${totNodes.toLocaleString("en-IN")}** nodes across 37 governments · **${totSeats.toLocaleString("en-IN")}** seats, **${totHeld.toLocaleString("en-IN")}** with a named holder · ${totLow} marked not-yet-verified.

## Union
| | |
|---|---|
${lines.map(([k, v]) => `| ${k} | ${v} |`).join("\n")}

## States & Union Territories
| State / UT | Governor / LG / Administrator | Chief Minister | Ministers | Assembly seats / MLAs listed | Departments | Districts | Nodes |
|---|---|---|---|---|---|---|---|
${rows.sort().join("\n")}

## Integrity issues (${issues.length})
${issues.slice(0, 200).map((i) => `- ${i}`).join("\n") || "none"}
`;
writeFileSync(join(ROOT, "research/india/COVERAGE.md"), md);
console.log(md.split("\n").slice(0, 20).join("\n"));
console.log(`… ${issues.length} integrity issues; full report research/india/COVERAGE.md`);
