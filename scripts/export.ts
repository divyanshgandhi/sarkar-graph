// Exports for contributors and local reference, generated from the compiled data (never hand-edited):
//   exports/people.csv   — one row per seat: every person holding (or seat lacking) an office in the dataset
//   exports/sources.csv  — every public source cited anywhere, with what it supports
//   exports/gaps.csv     — every known gap, typed and prioritised, so contributors can pick one up
//   docs/DATA_COVERAGE.md — what we have fully, partly, and not at all
//   node --experimental-strip-types scripts/export.ts
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { GNode, GovGraph, Holder, Member } from "../src/lib/types.ts";
import { FEEDS } from "../src/lib/server/feeds.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const GRAPHS = join(ROOT, "public/data/graph");
const RAW = join(ROOT, "data/raw");
const OUT = join(ROOT, "exports");
mkdirSync(OUT, { recursive: true });
mkdirSync(join(ROOT, "docs"), { recursive: true });

const csv = (rows: (string | number | boolean | null | undefined)[][]) =>
  rows
    .map((r) =>
      r
        .map((v) => {
          const s = v == null ? "" : String(v);
          return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n") + "\n";

const graphs: GovGraph[] = readdirSync(GRAPHS)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(join(GRAPHS, f), "utf8")));
graphs.sort((a, b) => (a.gov === "in" ? -1 : b.gov === "in" ? 1 : a.name.localeCompare(b.name)));
const asOf = graphs[0]?.asOf ?? "";
const govName = (g: GovGraph) => (g.gov === "in" ? "Government of India" : g.name);
const personKey = (name: string) =>
  name
    .replace(/^(Dr|Shri|Smt|Justice|Prof)\.?\s+/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// ── people.csv ─────────────────────────────────────────────────────────────────────────────
const people: (string | number | boolean | null | undefined)[][] = [
  ["person_key", "person_name", "position_title", "seat", "rank", "body", "body_id", "position_id", "government", "gov_code", "sector", "party", "since", "acting_or_additional_charge", "house", "constituency", "vacant", "wikipedia", "photo", "confidence", "sources", "as_of"],
];
type Seat = { id: string; title: string; seat?: string; rank?: string; holder?: Holder | null; vacant?: boolean; sources?: string[]; confidence?: string; body: GNode };
const seatsOf = (g: GovGraph): Seat[] => {
  const out: Seat[] = [];
  for (const n of Object.values(g.nodes)) {
    if (n.isPosition) out.push({ id: n.id, title: n.title ?? n.name, rank: n.rank, holder: n.holder, vacant: n.vacant, sources: n.sources, confidence: n.confidence, body: n.parent && g.nodes[n.parent] ? g.nodes[n.parent] : n });
    for (const m of n.members ?? []) out.push({ id: m.id, title: m.title, seat: m.seat, rank: m.rank, holder: m.holder, vacant: m.vacant, sources: m.sources, confidence: m.confidence, body: n });
  }
  return out;
};
let seatCount = 0,
  heldCount = 0;
const uniquePeople = new Set<string>();
for (const g of graphs) {
  for (const s of seatsOf(g)) {
    seatCount++;
    const h = s.holder;
    if (h?.name) {
      heldCount++;
      uniquePeople.add(personKey(h.name));
    }
    people.push([
      h?.name ? personKey(h.name) : "",
      h?.name ?? "",
      s.title,
      s.seat ?? "",
      s.rank ?? "",
      s.body.name,
      s.body.id,
      s.id,
      govName(g),
      g.gov,
      s.body.sector,
      h?.party ?? "",
      h?.since ?? "",
      h?.acting ? "yes" : "",
      h?.house ?? "",
      h?.constituency ?? "",
      s.vacant || !h ? "yes" : "",
      h?.wikipedia ?? "",
      h?.image ?? "",
      s.confidence ?? "",
      (s.sources ?? []).join(" | "),
      asOf,
    ]);
  }
}
writeFileSync(join(OUT, "people.csv"), csv(people));

// ── sources.csv ────────────────────────────────────────────────────────────────────────────
type Src = { url: string; uses: Set<string>; facts: number; segments: Set<string> };
const sources = new Map<string, Src>();
const addSrc = (raw: unknown, use: string, seg: string) => {
  if (typeof raw !== "string") return;
  const m = raw.match(/https?:\/\/[^\s"'<>|;]+/g);
  for (let url of m ?? []) {
    url = url.replace(/[.,;]+$/, "");
    while (url.endsWith(")") && (url.match(/\)/g) ?? []).length > (url.match(/\(/g) ?? []).length) url = url.slice(0, -1);
    const s = sources.get(url) ?? sources.set(url, { url, uses: new Set(), facts: 0, segments: new Set() }).get(url)!;
    s.uses.add(use);
    s.facts++;
    s.segments.add(seg);
  }
};
for (const f of readdirSync(RAW).filter((x) => x.endsWith(".json"))) {
  let d: any;
  try {
    d = JSON.parse(readFileSync(join(RAW, f), "utf8"));
  } catch {
    continue;
  }
  const seg = d.segment ?? f.replace(/\.json$/, "");
  for (const e of d.entities ?? []) {
    for (const s of e.sources ?? []) addSrc(s, "entity facts", seg);
    addSrc(e.legalSourceUrl, "legal basis", seg);
    addSrc(e.officialUrl, "official website", seg);
    addSrc(e.budget?.source, "budget", seg);
  }
  for (const p of d.positions ?? []) {
    for (const s of p.sources ?? []) addSrc(s, "office-holder", seg);
    addSrc(p.holder?.wikipedia, "office-holder reference", seg);
  }
  for (const r of d.relations ?? []) addSrc(r.source, "relationship", seg);
  for (const s of d.sources ?? []) addSrc(s, "segment source", seg);
}
const CORRECTIONS = join(ROOT, "data/corrections");
for (const f of readdirSync(CORRECTIONS).filter((x) => x.endsWith(".json") && !x.startsWith("_"))) {
  const d = JSON.parse(readFileSync(join(CORRECTIONS, f), "utf8"));
  for (const c of Array.isArray(d) ? d : d.corrections ?? []) addSrc(c.source, "correction", f);
}
for (const f of FEEDS) addSrc(f.url, "live news feed", "live");
addSrc("https://news.google.com/rss/search", "news archive (90-day backfill)", "live");
addSrc("https://en.wikipedia.org/w/api.php", "portraits (Wikipedia page images)", "images");
const kindOf = (u: string) => {
  const h = (() => {
    try {
      return new URL(u).hostname.replace(/^www\./, "");
    } catch {
      return u;
    }
  })();
  if (/\.gov\.in$|\.nic\.in$|^sansad\.in$|^eci\.gov\.in$|\.gov$|^indiacode|^egazette|^pib\.|^sci\.gov|^rbi\.org\.in$|^sebi\.gov\.in$/.test(h)) return ["official", h];
  if (/wikipedia\.org$|wikimedia\.org$/.test(h)) return ["encyclopedia", h];
  if (/thehindu|indianexpress|hindustantimes|ndtv|economictimes|timesofindia|livemint|business-standard|barandbench|livelaw|scroll|theprint|thewire|news18|indiatoday|deccanherald|telegraphindia|tribuneindia|news\.google|aljazeera|reuters|bbc|prsindia|scconline|newindianexpress/.test(h)) return ["press / analysis", h];
  return ["other", h];
};
const srcRows: (string | number)[][] = [["url", "domain", "source_type", "used_for", "facts_citing", "segments"]];
for (const s of [...sources.values()].sort((a, b) => b.facts - a.facts || a.url.localeCompare(b.url))) {
  const [type, host] = kindOf(s.url);
  srcRows.push([s.url, host, type, [...s.uses].join(" | "), s.facts, [...s.segments].join(" | ")]);
}
writeFileSync(join(OUT, "sources.csv"), csv(srcRows));

// ── gaps.csv ───────────────────────────────────────────────────────────────────────────────
const TOP = new Set(["head_of_state", "vice_head_of_state", "head_of_government", "cabinet_minister", "mos_independent_charge", "chief_minister", "deputy_chief_minister", "governor", "lieutenant_governor", "administrator", "chief_justice", "presiding_officer", "leader_of_opposition", "secretary", "head_of_agency", "chief_of_staff"]);
const gaps: (string | number)[][] = [["gap_id", "priority", "gap_type", "government", "gov_code", "item_id", "item_name", "detail", "how_to_help"]];
let gid = 0;
const gap = (priority: string, type: string, g: GovGraph, id: string, name: string, detail: string, help: string) =>
  gaps.push([`G${String(++gid).padStart(5, "0")}`, priority, type, govName(g), g.gov, id, name, detail, help]);
const countBy = new Map<string, number>();
for (const g of graphs) {
  const ns = Object.values(g.nodes);
  for (const s of seatsOf(g)) {
    const top = TOP.has(s.rank ?? "");
    if (!s.holder && !s.vacant) gap(top ? "high" : "medium", "holder_unknown", g, s.id, `${s.title}${s.seat ? ` (${s.seat})` : ""}`, `No holder recorded for this seat in ${s.body.name}; not confirmed vacant either.`, "Find the current holder with an official source (gazette/PIB/official site) and a date.");
    else if (s.vacant && top) gap("medium", "vacancy_to_confirm", g, s.id, s.title, `Recorded as vacant (${s.body.name}).`, "Confirm the vacancy is current, or add the new appointee with a source.");
    if (s.holder && s.confidence === "low") gap(top ? "high" : "medium", "unverified_holder", g, s.id, `${s.title}: ${s.holder.name}`, "Holder recorded with low confidence.", "Confirm or correct against a 2025–26 official source.");
    if (s.holder && !(s.sources ?? []).length && !s.holder.wikipedia) gap("low", "holder_unsourced", g, s.id, `${s.title}: ${s.holder.name}`, "No source URL attached to this seat.", "Attach an official or reputable source URL.");
    if (s.holder && !s.holder.since) gap("low", "tenure_start_unknown", g, s.id, `${s.title}: ${s.holder.name}`, "Date the holder took this seat is missing.", "Add the date of appointment/oath with a source.");
  }
  for (const n of ns) {
    if (n.isPosition || n.sector === "people") continue;
    if (!n.description) gap("low", "missing_description", g, n.id, n.name, "No plain-language description.", "Write 1–3 factual sentences on what it does for citizens, with a source.");
    if (!n.legalBasis && ["ministry", "department", "statutory_body", "regulator", "constitutional_body", "commission", "tribunal", "court"].includes(n.kind))
      gap("low", "missing_legal_basis", g, n.id, n.name, "No Article / Act / Rule recorded as its legal basis.", "Cite the Article or Act (India Code link) that creates it.");
    if (n.kind === "state_department" && !n.adminHead) gap("medium", "missing_department_secretary", g, n.id, n.name, "Administrative secretary not recorded.", "Add the ACS/Principal Secretary/Secretary from the latest state posting order.");
    if (n.kind === "district") gap("medium", "missing_district_head", g, n.id, n.name, "District Magistrate / Collector not yet mapped (districts have no seats yet).", "Add the current DM/Collector and SP with the district's official site as source.");
    if (n.kind === "municipal_corporation" && !n.head) gap("medium", "missing_city_heads", g, n.id, n.name, "Mayor and Municipal Commissioner not mapped.", "Add the current Mayor (or administrator) and Commissioner with a source.");
  }
  if (g.gov !== "in") {
    if (!ns.some((n) => n.kind === "state_department")) gap("high", "missing_departments", g, `st-${g.gov}`, g.name, "No state departments mapped.", "List every department from the state's Business Rules / official portal.");
    const asm = ns.find((n) => /-assembly$/.test(n.id));
    if (asm && asm.seats && (asm.members?.length ?? 0) < asm.seats) gap("high", "missing_mlas", g, asm.id, asm.name, `${asm.members?.length ?? 0} of ${asm.seats} seats listed.`, "Add the remaining MLAs from the assembly website / ECI results.");
  }
}
for (const r of gaps.slice(1)) countBy.set(String(r[2]), (countBy.get(String(r[2])) ?? 0) + 1);
writeFileSync(join(OUT, "gaps.csv"), csv(gaps));

// ── docs/DATA_COVERAGE.md ──────────────────────────────────────────────────────────────────
const mix = new Map<string, number>();
for (const r of srcRows.slice(1)) mix.set(String(r[2]), (mix.get(String(r[2])) ?? 0) + 1);
const srcMix = [...mix.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `${v.toLocaleString("en-IN")} ${k}`)
  .join(" · ");
const union = graphs.find((g) => g.gov === "in")!;
const un = Object.values(union.nodes);
const count = (f: (n: GNode) => boolean) => un.filter(f).length;
const stateRows = graphs
  .filter((g) => g.gov !== "in")
  .map((g) => {
    const ns = Object.values(g.nodes);
    const cm = ns.find((n) => n.rank === "chief_minister")?.holder?.name ?? "—";
    const gv = ns.find((n) => ["governor", "lieutenant_governor", "administrator"].includes(n.rank ?? ""))?.holder?.name ?? "—";
    const ministers = ns.filter((n) => ["cabinet_minister", "state_minister", "minister_of_state", "mos_independent_charge", "deputy_chief_minister"].includes(n.rank ?? "")).length;
    const asm = ns.find((n) => /-assembly$/.test(n.id));
    const depts = ns.filter((n) => n.kind === "state_department");
    const secs = depts.filter((n) => n.adminHead).length;
    const dists = ns.filter((n) => n.kind === "district").length;
    return `| ${g.name} | ${gv} | ${cm} | ${ministers} | ${asm?.members?.length ?? 0}/${asm?.seats ?? "—"} | ${depts.length} (${secs} with secretary) | ${dists} (0 with DM) |`;
  });
const md = `# Data coverage — what we have, and what we don't

Generated by \`scripts/export.ts\` from the compiled graph on ${asOf}. Do not edit by hand; run \`pnpm export\`.
Machine-readable companions: [\`exports/people.csv\`](../exports/people.csv) (one row per seat), [\`exports/sources.csv\`](../exports/sources.csv) (every cited source), [\`exports/gaps.csv\`](../exports/gaps.csv) (every known gap, prioritised, with how to help).

**${seatCount.toLocaleString("en-IN")}** seats mapped · **${heldCount.toLocaleString("en-IN")}** with a named holder · **${uniquePeople.size.toLocaleString("en-IN")}** distinct name slugs (not identity-verified people) · **${sources.size.toLocaleString("en-IN")}** distinct extracted source URLs · **${(gaps.length - 1).toLocaleString("en-IN")}** generated gaps.

**Source mix:** ${srcMix}. Wikipedia seeded much of the roster; replacing it with primary sources (Gazette, official portals, ECI, sansad.in, assembly sites) is the single biggest accuracy task — see \`docs/SOURCING_POLICY.md\`.
The generated gaps include low-confidence holders but do not cover missing photos or every citation-quality failure; run \`python3 scripts/audit-exports.py\` for a seat-level audit.

## Broadly mapped seat lists (coverage only; current holders and sources still need verification)
- Union apex: President, Vice-President, Prime Minister, PMO, Cabinet Secretariat, NSCS, NITI Aayog, law officers.
- Union Council of Ministers: every Cabinet Minister, MoS (IC) and MoS with portfolios (${count((n) => ["cabinet_minister", "mos_independent_charge"].includes(n.rank ?? ""))} ministerial seats drawn; MoS listed inside ministries).
- Parliament: all 543 Lok Sabha seats and 245 Rajya Sabha seats with party and constituency; presiding officers; ${count((n) => n.kind === "parliamentary_committee")} parliamentary committees.
- Judiciary (apex): Supreme Court (CJI + judges), all 25 High Courts with Chief Justices, ${count((n) => n.kind === "tribunal")} tribunals.
- Constitutional bodies & regulators: ECI, CAG, UPSC, Finance Commission, NCSC/NCST/NCBC, GST Council, RBI, SEBI, IRDAI, TRAI, CCI, CVC, CIC, Lokpal and more (${count((n) => n.sector === "constitutional" && !n.isPosition)} bodies).
- All 36 States/UTs: Governor/LG/Administrator, Chief Minister, council of ministers, Speaker, Leader of Opposition, Chief Secretary, DGP.
- Union Budget 2026–27: totals, every ministry's demand, top schemes, state tax devolution.

## Mapped partly
- Union ministries & bodies: ${count((n) => n.kind === "ministry")} ministries, ${count((n) => n.kind === "department" || n.kind === "independent_department")} departments, ${count((n) => /attached|subordinate|autonomous|statutory|mission|secretariat/.test(n.kind))} attached/subordinate/autonomous bodies, ${count((n) => n.kind === "cpse" || n.kind === "public_sector_bank")} PSUs/banks — many heads recorded, some not.
- State MLAs and MLCs: see table (some houses still incomplete or awaiting a second check).
- State departments: listed for most States; administrative secretaries only where official directories were reachable.
- Districts: every district exists as a place, but no District Magistrate / SP is mapped yet.
- Municipal corporations: listed; Mayors/Commissioners mostly missing.

## Not mapped yet (help wanted)
- Panchayati Raj: ~2.5 lakh Gram Panchayats, Panchayat Samitis, Zila Parishads — heads and members.
- Urban local bodies below corporations: municipal councils, nagar panchayats, councillors.
- District administration: DM/Collector, SP, CEO Zila Parishad, district judges.
- Subordinate judiciary and individual High Court judges.
- Police beyond the DGP: commissionerates, ranges, districts.
- PSU boards and independent directors; state PSUs.
- Money beyond the Union Budget: state budgets, actual spending (PFMS), procurement (GeM/CPPP), scheme outcomes.
- Legislation and oversight: bills, questions, debates, committee reports, CAG audit findings.
- Candidates' affidavits (assets, cases), attendance, promises vs delivery.

## By State / UT
| State / UT | Governor / LG / Administrator | Chief Minister | Ministers | MLAs listed / seats | Departments | Districts |
|---|---|---|---|---|---|---|
${stateRows.join("\n")}

## Open gaps by type
| Gap type | Count |
|---|---|
${[...countBy.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `| \`${k}\` | ${v.toLocaleString("en-IN")} |`).join("\n")}
`;
writeFileSync(join(ROOT, "docs/DATA_COVERAGE.md"), md);
console.log(`people.csv: ${people.length - 1} seats (${uniquePeople.size} name slugs) · sources.csv: ${sources.size} · gaps.csv: ${gaps.length - 1} → docs/DATA_COVERAGE.md`);
