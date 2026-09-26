// Compile data/raw/*.json (research segments) into per-government graph files the app loads.
//   node --experimental-strip-types scripts/build-graph.ts
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Budget, GEdge, GNode, GovGraph, GovSummary, Holder, Member, RelType, SearchEntry, Sector } from "../src/lib/types.ts";
import { HIDDEN, NODE_RANKS_STATE, NODE_RANKS_UNION, STATES, govOf, normParty, normSector, shapeOf } from "./lib/taxonomy.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const RAW = join(ROOT, "data/raw");
const OUT_GRAPH = join(ROOT, "public/data/graph");
const OUT_SRC = join(ROOT, "src/data");
const AS_OF = "2026-09-25";

type Raw = Record<string, any>;
const warn: string[] = [];

// ── load ───────────────────────────────────────────────────────────────
const files = existsSync(RAW) ? readdirSync(RAW).filter((f) => f.endsWith(".json")) : [];
const entities = new Map<string, Raw & { _seg: string }>();
const positions = new Map<string, Raw & { _seg: string }>();
const relations: (Raw & { _seg: string })[] = [];
let budgetRaw: Raw | null = null;

const OWNER_HINTS: [RegExp, string][] = [
  [/^in-pos-(minister|mos)-/, "council-of-ministers"],
  [/^in-pos-mp-ls-/, "parliament-lok-sabha"],
  [/^in-pos-mp-rs-/, "parliament-rajya-sabha"],
  [/^in-hc-|^in-pos-cj-hc-/, "judiciary-high-courts"],
  [/^st-[a-z]{2}-dist-/, "local-lgd"],
];

function richness(r: Raw) {
  return Object.values(r).filter((v) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && !v.length)).length;
}

function mergeInto(map: Map<string, Raw & { _seg: string }>, rec: Raw, seg: string) {
  if (!rec || typeof rec.id !== "string") return;
  const id = rec.id.trim();
  rec.id = id;
  const prev = map.get(id);
  if (!prev) {
    map.set(id, { ...rec, _seg: seg });
    return;
  }
  const owner = OWNER_HINTS.find(([re]) => re.test(id))?.[1];
  const prevOwns = owner ? prev._seg === owner : false;
  const curOwns = owner ? seg === owner : false;
  let base = prev,
    extra: Raw = rec;
  if (curOwns && !prevOwns) {
    base = { ...rec, _seg: seg } as any;
    extra = prev;
  } else if (!prevOwns && !curOwns && richness(rec) > richness(prev) + 2) {
    base = { ...rec, _seg: seg } as any;
    extra = prev;
  }
  const merged: Raw = { ...base };
  for (const [k, v] of Object.entries(extra)) {
    if (k === "_seg") continue;
    if (k === "holder" && owner && base.holder === null) continue;
    if (merged[k] === undefined || merged[k] === null || merged[k] === "") merged[k] = v;
    else if ((k === "aliases" || k === "sources") && Array.isArray(v)) merged[k] = [...new Set([...(merged[k] || []), ...v])];
  }
  map.set(id, merged as any);
}

for (const f of files) {
  let d: Raw;
  try {
    d = JSON.parse(readFileSync(join(RAW, f), "utf8"));
  } catch (e) {
    warn.push(`skip ${f}: ${(e as Error).message}`);
    continue;
  }
  const seg = d.segment || f.replace(/\.json$/, "");
  if (seg === "union-budget") {
    budgetRaw = d;
    continue;
  }
  for (const e of d.entities || []) mergeInto(entities, e, seg);
  for (const p of d.positions || []) mergeInto(positions, p, seg);
  for (const r of d.relations || []) if (r && r.from && r.to) relations.push({ ...r, _seg: seg });
}

// ── corrections overlay (data/corrections/*.json): sourced, dated fixes applied on top ──
// of the research segments, so every change stays auditable and the raw research untouched.
const CORR = join(ROOT, "data/corrections");
let correctionsApplied = 0;
if (existsSync(CORR)) {
  for (const f of readdirSync(CORR).filter((x) => x.endsWith(".json") && !x.startsWith("_"))) {
    let list: Raw[];
    try {
      const d = JSON.parse(readFileSync(join(CORR, f), "utf8"));
      list = Array.isArray(d) ? d : Array.isArray(d.corrections) ? d.corrections : [];
    } catch (e) {
      warn.push(`corrections ${f}: ${(e as Error).message}`);
      continue;
    }
    for (const c of list) {
      if (!c?.id || !c.set || !c.source) {
        warn.push(`corrections ${f}: entry without id/set/source skipped`);
        continue;
      }
      const target = positions.get(c.id) ?? entities.get(c.id);
      if (!target) {
        warn.push(`corrections ${f}: ${c.id} not found`);
        continue;
      }
      for (const [path, value] of Object.entries(c.set as Record<string, unknown>)) {
        const keys = path.split(".");
        let o: Raw = target;
        for (const k of keys.slice(0, -1)) o = o[k] ??= {};
        o[keys[keys.length - 1]] = value;
      }
      if (c.set.vacant === true && !("holder" in c.set)) target.holder = null;
      target.sources = [...new Set([...(target.sources ?? []), c.source])];
      const note = `Corrected ${c.date ?? ""}: ${c.reason ?? "updated"} (${c.source})`.trim();
      if (target.holder) target.holder.notes = target.holder.notes ? `${target.holder.notes} ${note}` : note;
      else target.notes = target.notes ? `${target.notes} ${note}` : note;
      correctionsApplied++;
    }
  }
}

// ponytail: downgrade only obvious Wikipedia-only seats; normalize source metadata before enforcing every confidence tier.
for (const p of positions.values())
  if (p.confidence === "high" && p.sources?.length && p.sources.every((s: string) => /^https?:\/\/(?:[^/]+\.)?(?:wikipedia|wikimedia)\.org\//.test(s))) p.confidence = "low";

// ── images (optional, produced by scripts/fetch-images.ts) ─────────────
const imagesPath = join(ROOT, "data/images.json");
const images: Record<string, string> = existsSync(imagesPath) ? JSON.parse(readFileSync(imagesPath, "utf8")) : {};
const wikiKey = (u?: string) => (u ? decodeURIComponent(u.split("/wiki/")[1] || "").split("#")[0].replace(/_/g, " ").trim() : "");
// A holder without a Wikipedia link borrows a portrait only from the same person's other seat in the same
// government (a minister who is also an MLA). Matching a bare name across the whole dataset put the
// Union Home Minister's face on the Ellisbridge MLA and the Mandsaur MP's on a UP MLC.
const linkedByName = new Map<string, Set<string>>();
for (const p of positions.values()) {
  const h = p.holder;
  if (!h?.name || !h.wikipedia) continue;
  const k = `${govOf(p.id)}|${String(h.name).replace(/\s+/g, " ").trim()}`;
  (linkedByName.get(k) ?? linkedByName.set(k, new Set()).get(k)!).add(wikiKey(h.wikipedia));
}
const NOT_A_PHOTO = /\.svg|emblem|logo|flag[_ ]of|seal[_ ]of|coat[_ ]of[_ ]arms/i;
function portraitOf(p: Raw, h: Raw, name: string): string | undefined {
  if (Object.hasOwn(h, "image")) return h.image ?? undefined;
  let img: string | undefined = h.imageUrl || (h.wikipedia ? images[wikiKey(h.wikipedia)] : undefined);
  if (!img && !h.wikipedia) {
    const same = linkedByName.get(`${govOf(p.id)}|${name}`);
    if (same?.size === 1) img = images[[...same][0]];
  }
  return img && !NOT_A_PHOTO.test(decodeURIComponent(img)) ? img : undefined;
}

function holderOf(p: Raw): Holder | null {
  const h = p.holder;
  if (!h || !h.name || /^vacant$/i.test(h.name)) return null;
  const out: Holder = { name: String(h.name).replace(/\s+/g, " ").trim() };
  if (h.since) out.since = String(h.since);
  const party = normParty(h.party);
  if (party) out.party = party;
  if (h.house) out.house = h.house;
  if (h.constituency) out.constituency = h.constituency;
  if (h.wikipedia) out.wikipedia = h.wikipedia;
  const img = portraitOf(p, h, out.name);
  if (img) out.image = img;
  if (h.acting || h.additionalCharge) out.acting = true;
  if (h.notes) out.notes = h.notes;
  return out;
}

// ── ring assignment ─────────────────────────────────────────────────────
function ringFor(n: GNode, gov: string): number {
  const k = n.kind;
  const r = n.rank || "";
  if (n.sector === "people") return 0;
  const union = gov === "in";
  if (n.isPosition) {
    if (["head_of_state", "vice_head_of_state", "governor", "lieutenant_governor", "administrator"].includes(r)) return 1;
    if (["head_of_government", "chief_minister"].includes(r)) return 2;
    if (["deputy_chief_minister", "law_officer", "leader_of_opposition"].includes(r)) return 3;
    if (["cabinet_minister", "mos_independent_charge", "state_minister"].includes(r)) return 4;
    return 5;
  }
  switch (n.sector) {
    case "executive":
      if (k === "head_of_state_office") return 1;
      if (["council_of_ministers", "state_council_of_ministers", "cabinet"].includes(k)) return 3;
      if (["cabinet_committee", "secretariat", "advisory_body", "intelligence_agency"].includes(k) && union) return 3;
      if (["ministry", "independent_department", "state_department"].includes(k)) return 5;
      if (k === "department") return 6;
      return union ? 7 : 6;
    case "legislative":
      if (["legislature", "chamber", "state_legislature", "state_chamber"].includes(k)) return 1;
      if (k === "secretariat") return 3;
      return 4;
    case "judicial":
      if (n.id === "in-supreme-court") return 1;
      if (k === "court" && /^in-hc-/.test(n.id)) return union ? 3 : 1;
      if (k === "tribunal") return 5;
      return union ? 4 : 3;
    case "constitutional":
      if (k === "constitutional_body") return 2;
      if (["regulator", "statutory_body", "commission", "state_commission"].includes(k)) return union ? 4 : 3;
      return 5;
    case "federal":
      if (k === "state" || k === "union_territory") return 4;
      return 5;
    case "local":
      if (k === "local_government_tier" || k === "autonomous_body") return 3;
      if (k === "division") return 4;
      if (k === "municipal_corporation") return 5;
      if (k === "district") return 6;
      return 6;
  }
  return 6;
}

// ── build per-gov node sets ─────────────────────────────────────────────
const byGov = new Map<string, Map<string, GNode>>();
const govNodes = (g: string) => {
  if (!byGov.has(g)) byGov.set(g, new Map());
  return byGov.get(g)!;
};

function baseNode(e: Raw, gov: string): GNode {
  const kind = String(e.kind || "body");
  const sector = normSector(e.sector, e.id, kind);
  const n: GNode = {
    id: e.id,
    kind,
    shape: shapeOf(kind),
    sector,
    ring: 0,
    name: String(e.name || e.id).trim(),
  };
  if (e.nameHi) n.nameHi = e.nameHi;
  if (e.abbr) n.abbr = e.abbr;
  if (Array.isArray(e.aliases) && e.aliases.length) n.aliases = [...new Set(e.aliases.filter(Boolean).map(String))];
  if (e.parentId) n.parent = e.parentId;
  if (e.description) n.description = String(e.description).trim();
  if (e.legalBasis) n.legalBasis = e.legalBasis;
  if (e.legalSourceUrl) n.legalSourceUrl = e.legalSourceUrl;
  if (e.officialUrl) n.officialUrl = e.officialUrl;
  if (e.established) n.established = String(e.established);
  if (e.hq) n.hq = e.hq;
  if (e.headPositionId) n.head = e.headPositionId;
  if (e.adminHeadPositionId) n.adminHead = e.adminHeadPositionId;
  if (typeof e.seats === "number") n.seats = e.seats;
  if (e.stats && typeof e.stats === "object") n.stats = e.stats;
  if (Array.isArray(e.sources) && e.sources.length) n.sources = e.sources;
  if (e.confidence) n.confidence = e.confidence;
  if (e.notes) n.notes = e.notes;
  void gov;
  return n;
}

for (const e of entities.values()) {
  const gov = govOf(e.id);
  const n = baseNode(e, gov);
  if (gov === "in" && (n.kind === "state" || n.kind === "union_territory")) continue; // states are defined in their own files as st-xx
  govNodes(gov).set(n.id, n);
}

// State root entities (st-xx) live in the state's own graph; the Union graph gets a summary node for each.
for (const [code, meta] of Object.entries(STATES)) {
  const g = govNodes(code);
  const sid = `st-${code}`;
  const raw = entities.get(sid);
  const people: GNode = {
    id: `st-${code}-electorate`,
    kind: "constituency",
    shape: "seal",
    sector: "people",
    ring: 0,
    name: `People of ${meta.name}`,
    nameHi: `${meta.nameHi} की जनता`,
    description:
      meta.kind === "state"
        ? `The voters of ${meta.name}. They elect the Legislative Assembly, whose majority forms the state government, and send members to the Lok Sabha.`
        : `The residents and voters of ${meta.name}, a Union Territory administered by the Union government${raw?.description ? "." : "."}`,
  };
  g.set(people.id, people);
  if (g.has(sid)) {
    const s = g.get(sid)!;
    s.sector = "executive";
    s.kind = "state_government_root";
    g.delete(sid);
    // keep the state entity's facts for the Union summary node
    (people as any)._state = s;
  }
}

// Positions → nodes or members
const memberOf = new Map<string, Member[]>();
for (const p of positions.values()) {
  const gov = govOf(p.id);
  const g = govNodes(gov);
  const rank = String(p.rank || "other");
  const nodeRanks = gov === "in" ? NODE_RANKS_UNION : NODE_RANKS_STATE;
  const holder = holderOf(p);
  const org = p.orgId ? String(p.orgId) : undefined;
  const isHeadOfOrg = !!org && (entities.get(org)?.headPositionId === p.id || entities.get(org)?.adminHeadPositionId === p.id);
  // offices inside a house (Deputy Speaker, Leader of the House) are roles, not seats: draw them, don't count them
  // NB: match "-pos-(mp|mla|mlc)-" (the actual seat-id convention), not bare "-(mp|mla|mlc)-" — the latter
  // false-positives on Madhya Pradesh's "mp" state-code prefix (e.g. "st-mp-pos-deputy-speaker" contains
  // "-mp-" too), which was wrongly counting MP's Deputy Speaker as an extra MLA seat (231 members for 230 seats).
  const houseOffice = !!org && /(lok-sabha|rajya-sabha|assembly|legislative-council)$/.test(org) && !/-pos-(mp|mla|mlc)-/.test(p.id);
  const asNode = nodeRanks.has(rank) || isHeadOfOrg || houseOffice;
  if (!asNode) {
    const m: Member = { id: p.id, title: p.title || p.id, rank, holder, vacant: !!p.vacant || !holder };
    if (p.seat) m.seat = String(p.seat);
    if (p.appointmentMode) m.appointmentMode = p.appointmentMode;
    if (p.sources?.length) m.sources = p.sources;
    if (p.confidence) m.confidence = p.confidence;
    const key = org || "__orphans";
    if (!memberOf.has(key)) memberOf.set(key, []);
    memberOf.get(key)!.push(m);
    continue;
  }
  const orgNode = org ? (govNodes(govOf(org)).get(org) as GNode | undefined) : undefined;
  const n: GNode = {
    id: p.id,
    kind: "position",
    shape: shapeOf("position", rank, true),
    sector: orgNode?.sector || normSector(p.sector, p.id, "position"),
    ring: 0,
    name: p.title || p.id,
    title: p.title,
    isPosition: true,
    rank,
    holder,
    vacant: !!p.vacant || !holder,
  };
  if (p.titleHi) n.nameHi = p.titleHi;
  if (org) n.parent = org;
  if (p.appointmentMode) n.appointmentMode = p.appointmentMode;
  if (p.sources?.length) n.sources = p.sources;
  if (p.confidence) n.confidence = p.confidence;
  if (p.holder?.notes) n.notes = p.holder.notes;
  (n as any)._appointedBy = p.appointedBy;
  (n as any)._onAdviceOf = p.onAdviceOf;
  if (org && (isHeadOfOrg || ["secretary", "head_of_agency", "chief_justice", "presiding_officer", "chief_of_staff"].includes(rank))) {
    if (orgNode && !orgNode.head && !isHeadOfOrg && rank !== "secretary") orgNode.head = p.id;
    if (orgNode && rank === "secretary" && !orgNode.adminHead) orgNode.adminHead = p.id;
    if (orgNode && (orgNode.head === p.id || orgNode.adminHead === p.id)) n.headOf = org;
  }
  if (["cabinet_minister", "mos_independent_charge"].includes(rank) && org && orgNode) {
    // a minister heads the ministry they hold
    if (!orgNode.head || orgNode.head === p.id) {
      orgNode.head = p.id;
      n.headOf = org;
    }
  }
  if (rank === "state_minister" || rank === "deputy_chief_minister") n.sector = "executive";
  g.set(n.id, n);
}

// Attach members, dedupe
for (const [org, list] of memberOf) {
  const g = govNodes(govOf(org));
  const n = g.get(org);
  if (!n) {
    if (org !== "__orphans") warn.push(`members for missing org ${org} (${list.length})`);
    continue;
  }
  const seen = new Set<string>();
  n.members = list.filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
}

// ── budget ──────────────────────────────────────────────────────────────
// Union Territories are funded through Union demands for grants; those land on their State tile.
const utBudget = new Map<string, Budget>();
if (budgetRaw) {
  const fy = budgetRaw.fy || "2026-27";
  const lines: Raw[] = [...(budgetRaw.lines || []), ...(budgetRaw.departments || [])];
  const total = Number(budgetRaw.totals?.totalExpenditureBE) || lines.reduce((s, l) => s + (Number(l.be) || 0), 0);
  // rank ministries (and independent departments) only — debt repayment, interest and transfers are not ministries
  const ministryLines = (budgetRaw.lines || []).filter((l: Raw) => /^in-(min|dept)-/.test(l.entityId ?? "") && Number(l.be) > 0);
  const ranked = [...ministryLines].sort((a, b) => Number(b.be) - Number(a.be));
  const union = govNodes("in");
  // a compact budget overview for the home rail
  const T = budgetRaw.totals ?? {};
  const overview = {
    fy,
    prior: budgetRaw.prior ?? null,
    totals: T,
    receipts: (budgetRaw.receipts ?? []).slice(0, 12),
    top: ranked.slice(0, 12).map((l: Raw) => ({ id: l.entityId, name: String(l.name).replace(/\s*\(.*\)$/, ""), be: Number(l.be), re: l.re != null ? Number(l.re) : null })),
    interest: Number(T.interestPayments) || null,
    schemes: (budgetRaw.schemes ?? []).slice(0, 12).map((s: Raw) => ({ name: s.name, id: s.entityId, be: Number(s.be) })),
    states: (budgetRaw.stateTransfers ?? []).map((s: Raw) => ({ id: s.stateId, name: s.stateName, devolution: s.taxDevolution, total: s.totalTransfers })),
    sources: (budgetRaw.sources ?? []).slice(0, 4),
    verified: !!budgetRaw.verification,
  };
  writeFileSync(join(ROOT, "public/data/budget.json"), JSON.stringify(overview));
  for (const l of lines) {
    if (!l.entityId) continue;
    const ut = /^st-([a-z]{2})-government$/.exec(l.entityId);
    const n = ut ? ({ id: l.entityId } as GNode) : union.get(l.entityId);
    if (!n) {
      warn.push(`budget line for missing ${l.entityId}`);
      continue;
    }
    const b: Budget = { fy, source: (budgetRaw.sources || [])[0] };
    if (ut) utBudget.set(ut[1], b);
    if (l.be != null) b.be = Number(l.be);
    if (l.re != null) {
      b.re = Number(l.re);
      b.reFy = budgetRaw.prior?.fy || "2025-26";
    }
    if (l.actual != null) {
      b.actual = Number(l.actual);
      b.actualFy = "2024-25";
    }
    if (l.capital != null) b.capital = Number(l.capital);
    if (b.be && total) b.share = b.be / total;
    const idx = ranked.findIndex((r) => r.entityId === l.entityId);
    if (idx >= 0) {
      b.rank = idx + 1;
      b.of = ranked.length;
    }
    n.budget = b;
  }
}

// ── relations → edges ───────────────────────────────────────────────────
const REL_ALIASES: Record<string, RelType> = {
  confirms: "appoints",
  jurisdiction: "has_jurisdiction_over",
  has_jurisdiction_over: "has_jurisdiction_over",
};
const REL_OK = new Set<RelType>([
  "elects",
  "indirectly_elects",
  "appoints",
  "advises_appointment",
  "nominates",
  "removes",
  "oversees",
  "administers",
  "reports_to",
  "ex_officio",
  "member_of",
  "advises",
  "accountable_to",
  "audits",
  "heads",
  "has_jurisdiction_over",
]);

const external: { gov: string; edge: GEdge }[] = [];
const edgesByGov = new Map<string, GEdge[]>();
const edgeKey = new Set<string>();
let eid = 0;
function addEdge(from: string, to: string, type: RelType, basis?: string, source?: string) {
  if (from === to) return;
  const gf = govOf(from),
    gt = govOf(to);
  const key = `${from}|${to}|${type}`;
  if (edgeKey.has(key)) return;
  edgeKey.add(key);
  const e: GEdge = { id: `e${(eid++).toString(36)}`, from, to, type };
  if (basis) e.basis = basis;
  if (source) e.source = source;
  if (gf === gt) {
    if (!edgesByGov.has(gf)) edgesByGov.set(gf, []);
    edgesByGov.get(gf)!.push(e);
  } else {
    external.push({ gov: gf, edge: e }, { gov: gt, edge: e });
  }
}
for (const r of relations) {
  let t = String(r.type || "").toLowerCase() as RelType;
  t = (REL_ALIASES[t] || t) as RelType;
  if (!REL_OK.has(t)) {
    warn.push(`unknown relation type ${r.type} (${r._seg})`);
    continue;
  }
  // the President is elected, never appointed or nominated into office
  if (String(r.to) === "in-pos-president" && ["appoints", "nominates"].includes(t)) {
    warn.push(`dropped ${r.from} ${t} in-pos-president (${r._seg})`);
    continue;
  }
  addEdge(String(r.from), String(r.to), t, r.basis, r.source);
}
// constitutional backbone — guaranteed regardless of how a segment phrased it (Arts. 54, 66, 75, 80, 81, 155, 164, 170)
function backbone() {
  addEdge("in-electorate", "in-lok-sabha", "elects", "Article 81");
  addEdge("in-electorate", "in-rajya-sabha", "indirectly_elects", "Article 80: elected by State and UT legislators");
  addEdge("in-electorate", "in-pos-president", "indirectly_elects", "Articles 54–55: electoral college of elected MPs and MLAs");
  addEdge("in-parliament", "in-pos-vice-president", "indirectly_elects", "Article 66");
  addEdge("in-pos-president", "in-pos-prime-minister", "appoints", "Article 75(1)");
  for (const code of Object.keys(STATES)) {
    addEdge(`st-${code}-electorate`, `st-${code}-assembly`, "elects", "Article 170");
    addEdge(`st-${code}-pos-governor`, `st-${code}-pos-chief-minister`, "appoints", "Article 164(1)");
    addEdge(`st-${code}-pos-lieutenant-governor`, `st-${code}-pos-chief-minister`, "appoints", "Article 239AA / UT Act");
    addEdge("in-pos-president", `st-${code}-pos-governor`, "appoints", "Article 155");
    addEdge("in-pos-president", `st-${code}-pos-lieutenant-governor`, "appoints", "Article 239");
    addEdge("in-pos-president", `st-${code}-pos-administrator`, "appoints", "Article 239");
  }
}
backbone();

// implicit edges from positions
for (const g of byGov.values())
  for (const n of g.values()) {
    if (!n.isPosition) continue;
    const ab = (n as any)._appointedBy as string | undefined;
    const oa = (n as any)._onAdviceOf as string | undefined;
    if (ab && ab !== n.id) addEdge(ab, n.id, ab.endsWith("electorate") ? "elects" : "appoints");
    if (oa && oa !== n.id) addEdge(oa, n.id, "advises_appointment");
    if (n.headOf) addEdge(n.id, n.headOf, "heads");
  }

// ── per-gov assembly ────────────────────────────────────────────────────
const SECTORS_UNION = [
  { id: "legislative", label: "Parliament", labelHi: "संसद", weight: 1 },
  { id: "executive", label: "Executive", labelHi: "कार्यपालिका", weight: 1 },
  { id: "federal", label: "States & UTs", labelHi: "राज्य", weight: 1 },
  { id: "constitutional", label: "Independent bodies", labelHi: "संवैधानिक निकाय", weight: 1 },
  { id: "judicial", label: "Judiciary", labelHi: "न्यायपालिका", weight: 1 },
] as const;
const SECTORS_STATE = [
  { id: "legislative", label: "Legislature", labelHi: "विधानमंडल", weight: 1 },
  { id: "executive", label: "Executive", labelHi: "कार्यपालिका", weight: 1 },
  { id: "local", label: "Districts & cities", labelHi: "ज़िले व स्थानीय निकाय", weight: 1 },
  { id: "constitutional", label: "Commissions", labelHi: "आयोग", weight: 1 },
  { id: "judicial", label: "Judiciary", labelHi: "न्यायपालिका", weight: 1 },
] as const;

mkdirSync(OUT_GRAPH, { recursive: true });
mkdirSync(OUT_SRC, { recursive: true });

const summaries: GovSummary[] = [];
const search: SearchEntry[] = [];
const people: Record<string, { key: string; name: string; aliases: string[]; job: string; party?: string; nodeId: string; gov: string; image?: string; wikipedia?: string; rank?: string }> = {};
const aliasIndex: { id: string; gov: string; terms: string[] }[] = [];

const unionGraph = govNodes("in");

function hidden(n: GNode) {
  return HIDDEN.has(n.id) || n.kind === "state_government_root" || n.kind === "state_government";
}

// Inside a State's own wheel, "federal" means nothing: place each body in its real branch.
const EXEC_RANKS = new Set([
  "governor",
  "lieutenant_governor",
  "administrator",
  "chief_minister",
  "deputy_chief_minister",
  "state_minister",
  "cabinet_minister",
  "mos_independent_charge",
  "minister_of_state",
  "secretary",
  "head_of_agency",
  "chief_of_staff",
  "law_officer",
]);
const LEG_RANKS = new Set(["presiding_officer", "deputy_presiding_officer", "leader_of_opposition", "member_of_legislature"]);
function stateSector(n: GNode): Sector {
  const k = n.kind;
  if (n.sector === "people") return "people";
  if (n.isPosition) {
    if (EXEC_RANKS.has(n.rank ?? "")) return "executive";
    if (LEG_RANKS.has(n.rank ?? "")) return "legislative";
    if (n.rank === "chief_justice" || n.rank === "judge") return "judicial";
    return "constitutional";
  }
  if (/legislature|chamber|assembly|legislative_council/.test(k) || /-assembly$|-legislative-council$/.test(n.id)) return "legislative";
  if (/municipal|district|division|local_government|panchayat|autonomous_body/.test(k)) return "local";
  if (/court|tribunal/.test(k)) return "judicial";
  if (/commission|lokayukta|statutory|regulator/.test(k)) return "constitutional";
  return "executive";
}

function finalize(gov: string, nodes: Map<string, GNode>): GovGraph {
  const isUnion = gov === "in";
  const root = isUnion ? "in-electorate" : `st-${gov}-electorate`;
  if (isUnion && nodes.has(root)) {
    const r = nodes.get(root)!;
    r.name = "People of India";
    r.nameHi = "भारत की जनता";
    r.shape = "seal";
  }
  if (!nodes.has(root)) {
    nodes.set(root, {
      id: root,
      kind: "constituency",
      shape: "seal",
      sector: "people",
      ring: 0,
      name: "People of India",
      nameHi: "भारत की जनता",
    });
  }
  // federal summaries on the Union wheel
  if (isUnion) {
    for (const [code, meta] of Object.entries(STATES)) {
      const sg = govNodes(code);
      const st = (sg.get(`st-${code}-electorate`) as any)?._state as GNode | undefined;
      const cm = [...sg.values()].find((x) => x.rank === "chief_minister");
      const gv = [...sg.values()].find((x) => ["governor", "lieutenant_governor", "administrator"].includes(x.rank || ""));
      const n: GNode = {
        id: `st-${code}`,
        kind: meta.kind === "state" ? "state" : "union_territory",
        shape: "state",
        sector: "federal",
        ring: 4,
        name: meta.name,
        nameHi: meta.nameHi,
        description: st?.description,
        officialUrl: st?.officialUrl,
        stats: st?.stats,
        hq: meta.capital,
        link: code,
        sources: st?.sources,
      };
      if (cm) (n as any).cm = { name: cm.holder?.name, party: cm.holder?.party, image: cm.holder?.image, since: cm.holder?.since };
      if (gv) (n as any).governor = { title: gv.title, name: gv.holder?.name };
      if (utBudget.has(code)) n.budget = utBudget.get(code);
      nodes.set(n.id, n);
    }
  }

  if (!isUnion) {
    for (const n of nodes.values()) {
      n.sector = stateSector(n);
      // each house is a lobe of the bean: the Assembly, and the Council where one exists
      if (/-(assembly|legislative-council)$/.test(n.id) && /legislature|chamber|council/.test(n.kind)) n.kind = "state_chamber";
    }
    // position sectors follow their body where the rank did not decide it
    for (const n of nodes.values()) {
      if (n.isPosition && n.parent && nodes.has(n.parent) && n.sector === "constitutional") n.sector = nodes.get(n.parent)!.sector;
    }
    // the High Court that hears this State's cases, as a link back to the Union map
    const hcEdge = external.find((x) => x.edge.type === "has_jurisdiction_over" && govOf(x.edge.to) === gov && /^in-hc-/.test(x.edge.from));
    const hcId = hcEdge?.edge.from ?? [...govNodes("in").values()].find((h) => /^in-hc-/.test(h.id) && new RegExp(`\\b${STATES[gov].name}\\b`, "i").test(`${h.description ?? ""} ${h.notes ?? ""}`))?.id;
    const hc = hcId ? govNodes("in").get(hcId) : undefined;
    if (hc && !nodes.has(hc.id)) {
      const cj = hc.head ? govNodes("in").get(hc.head) : undefined;
      nodes.set(hc.id, { ...hc, sector: "judicial", ring: 1, parent: undefined, children: undefined, head: undefined, adminHead: undefined, link: "in", linkId: hc.id, members: undefined, holder: cj?.holder } as GNode);
    }
  }

  // resolve parents; drop dangling
  for (const n of nodes.values()) {
    if (n.parent && !nodes.has(n.parent)) {
      const pg = govOf(n.parent);
      if (pg !== gov) (n as any).parentExternal = n.parent;
      delete n.parent;
    }
    if (n.head && !nodes.has(n.head)) delete n.head;
    if (n.adminHead && !nodes.has(n.adminHead)) delete n.adminHead;
  }
  // ring + shape refinement
  for (const n of nodes.values()) {
    n.ring = ringFor(n, gov);
    if (n.kind === "state_government_root") continue;
  }
  // bodies deeper than departments inherit ring = parent ring + 1 (clusters)
  const byId = nodes;
  const depthCache = new Map<string, number>();
  const ringOf = (n: GNode, seen = new Set<string>()): number => {
    if (depthCache.has(n.id)) return depthCache.get(n.id)!;
    let r = n.ring;
    if (!n.isPosition && n.sector === "executive" && isUnion && r >= 7 && n.parent && byId.has(n.parent) && !seen.has(n.id)) {
      seen.add(n.id);
      const p = byId.get(n.parent)!;
      if (!hidden(p)) r = Math.max(7, ringOf(p, seen) + 1);
    }
    depthCache.set(n.id, r);
    return r;
  };
  for (const n of nodes.values()) n.ring = Math.min(ringOf(n), 8);
  for (const n of nodes.values()) if (!n.isPosition && isUnion && n.sector === "executive" && n.ring >= 7) n.cluster = true;

  // children lists (visible)
  for (const n of nodes.values()) delete n.children;
  for (const n of nodes.values()) {
    if (!n.parent) continue;
    const p = nodes.get(n.parent)!;
    (p.children ||= []).push(n.id);
  }

  // drop hidden umbrellas but keep their children attached to the sector root
  for (const id of [...nodes.keys()]) {
    const n = nodes.get(id)!;
    if (!hidden(n)) continue;
    for (const c of n.children || []) {
      const cn = nodes.get(c);
      if (cn) delete cn.parent;
    }
    nodes.delete(id);
  }

  const edges = (edgesByGov.get(gov) || []).filter((e) => nodes.has(e.from) && nodes.has(e.to));
  const ext = external.filter((x) => x.gov === gov).map((x) => x.edge);

  const g: GovGraph = {
    gov,
    name: isUnion ? "India" : STATES[gov].name,
    nameHi: isUnion ? "भारत" : STATES[gov].nameHi,
    kind: isUnion ? "union" : STATES[gov].kind,
    asOf: AS_OF,
    root,
    sectors: (isUnion ? SECTORS_UNION : SECTORS_STATE).map((s) => ({ ...s })) as any,
    rings: isUnion
      ? [
          { ring: 1, label: "Highest offices" },
          { ring: 3, label: "Council" },
          { ring: 4, label: "Cabinet" },
          { ring: 5, label: "Ministries" },
          { ring: 6, label: "Departments" },
        ]
      : [
          { ring: 1, label: "Highest offices" },
          { ring: 4, label: "Council of Ministers" },
        ],
    nodes: Object.fromEntries([...nodes.values()].map((n) => [n.id, clean(n)])),
    edges,
    stats: {},
  };
  (g as any).external = ext;

  // stats
  const pos = [...nodes.values()].filter((n) => n.isPosition);
  const mem = [...nodes.values()].flatMap((n) => n.members || []);
  g.stats = {
    bodies: [...nodes.values()].filter((n) => !n.isPosition && n.sector !== "people").length,
    seats: pos.length + mem.length,
    vacant: pos.filter((n) => n.vacant).length + mem.filter((m) => m.vacant).length,
    acting: pos.filter((n) => n.holder?.acting).length + mem.filter((m) => m.holder?.acting).length,
    edges: edges.length,
  };
  return g;
}

const ID_RE = /\b(?:in|st)-[a-z0-9-]{3,}\b/g;
function nameFor(id: string): string {
  const g = govNodes(govOf(id));
  const n = g.get(id);
  if (n) return n.name;
  const e = entities.get(id) ?? positions.get(id);
  return e ? String(e.name ?? e.title ?? id) : id;
}
function clean(n: GNode): GNode {
  if (n.notes) n.notes = n.notes.replace(ID_RE, nameFor);
  if (n.holder?.notes) n.holder.notes = n.holder.notes.replace(ID_RE, nameFor);
  for (const m of n.members ?? []) if (m.holder?.notes) m.holder.notes = m.holder.notes.replace(ID_RE, nameFor);
  const o: any = {};
  for (const [k, v] of Object.entries(n)) {
    if (k.startsWith("_")) continue;
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && !v.length) continue;
    o[k] = v;
  }
  return o;
}

const SENIORITY = [
  "head_of_state",
  "vice_head_of_state",
  "head_of_government",
  "chief_justice",
  "cabinet_minister",
  "chief_minister",
  "governor",
  "lieutenant_governor",
  "presiding_officer",
  "leader_of_opposition",
  "mos_independent_charge",
  "deputy_chief_minister",
  "minister_of_state",
  "state_minister",
  "administrator",
  "law_officer",
  "chief_of_staff",
  "secretary",
  "head_of_agency",
  "judge",
  "commission_member",
  "deputy_presiding_officer",
  "member_of_parliament",
  "member_of_legislature",
];
function seniority(rank?: string) {
  const i = SENIORITY.indexOf(rank ?? "");
  return i < 0 ? 99 : i;
}

const govs = ["in", ...Object.keys(STATES)];
const alliancePath = join(ROOT, "data/alliances.json");
const alliances: Record<string, string> = existsSync(alliancePath) ? JSON.parse(readFileSync(alliancePath, "utf8")) : {};

for (const gov of govs) {
  const nodes = govNodes(gov);
  const g = finalize(gov, nodes);
  writeFileSync(join(OUT_GRAPH, `${gov}.json`), JSON.stringify(g));
  const all = Object.values(g.nodes);
  const cm = all.find((n) => n.rank === "chief_minister");
  const head = all.find((n) => ["governor", "lieutenant_governor", "administrator"].includes(n.rank || ""));
  summaries.push({
    gov,
    name: g.name,
    nameHi: g.nameHi,
    kind: g.kind,
    capital: gov === "in" ? "New Delhi" : STATES[gov].capital,
    cm: cm?.holder ? { name: cm.holder.name, party: cm.holder.party, image: cm.holder.image } : null,
    head: head?.holder ? { title: head.title || "Governor", name: head.holder.name } : null,
    party: cm?.holder?.party,
    alliance: cm?.holder?.party ? alliances[cm.holder.party] : undefined,
    seats: Number(all.find((n) => /assembly/.test(n.id))?.seats) || undefined,
    nodes: all.length,
  });
  for (const n of all) {
    if (n.sector === "people" && gov !== "in") continue;
    const terms = [n.name, n.abbr, n.nameHi, ...(n.aliases || []), n.holder?.name].filter(Boolean).join(" · ");
    search.push({
      id: n.id,
      gov,
      name: n.name,
      sub: n.holder?.name || (n.parent ? g.nodes[n.parent]?.name : undefined),
      nameHi: n.nameHi,
      abbr: n.abbr,
      sector: n.sector,
      shape: n.shape,
      terms: terms.toLowerCase(),
    });
    aliasIndex.push({ id: n.id, gov, terms: [n.name, n.abbr, ...(n.aliases || [])].filter(Boolean) as string[] });
    const addPerson = (h: Holder | null | undefined, job: string, nodeId: string, rank?: string) => {
      if (!h?.name) return;
      const key = h.name
        .replace(/^(Dr|Shri|Smt|Justice|Prof)\.?\s+/i, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const prev = people[key];
      // a person with several seats is known by the most senior one
      if (prev && seniority(prev.rank) <= seniority(rank)) {
        prev.image ||= h.image;
        prev.wikipedia ||= h.wikipedia;
        prev.party ||= h.party;
        return;
      }
      people[key] = {
        key,
        name: h.name,
        aliases: [],
        job,
        party: h.party ?? prev?.party,
        nodeId,
        gov,
        image: h.image ?? prev?.image,
        wikipedia: h.wikipedia ?? prev?.wikipedia,
        rank,
      };
    };
    if (n.isPosition) addPerson(n.holder, n.title || n.name, n.id, n.rank);
    for (const m of n.members || []) {
      addPerson(m.holder, m.seat ? `${m.title}, ${m.seat}` : m.title, n.id, m.rank);
      if (m.holder?.name)
        search.push({
          id: n.id,
          gov,
          name: m.holder.name,
          sub: m.seat ? `${m.title} · ${m.seat}` : m.title,
          sector: n.sector,
          shape: "head",
          terms: `${m.holder.name} ${m.title} ${m.seat || ""}`.toLowerCase(),
          person: true,
        });
    }
  }
}

// ── change log: tenures that began recently, plus vacancy / acting roll-ups ─────
{
  const CUT = new Date(new Date(AS_OF).getTime() - 180 * 864e5).toISOString().slice(0, 10);
  const items: import("../src/lib/types.ts").ChangeItem[] = [];
  let vacant = 0,
    acting = 0,
    seats = 0;
  for (const gov of govs) {
    const g: GovGraph = JSON.parse(readFileSync(join(OUT_GRAPH, `${gov}.json`), "utf8"));
    for (const n of Object.values(g.nodes)) {
      const seatsHere: { id: string; title: string; holder?: Holder | null; vacant?: boolean; mode?: string; body: GNode }[] = [];
      if (n.isPosition) {
        const t = n.title ?? n.name;
        const org = n.parent ? g.nodes[n.parent] : undefined;
        const orgName = org?.abbr && org.name.length > 34 ? org.abbr : org?.name;
        const tl = t.toLowerCase();
        const core = (s?: string) => (s ?? "").toLowerCase().replace(/^(the |ministry of |department of )/, "").slice(0, 14);
        const generic = !!orgName && !tl.includes(core(org!.name)) && !(org!.abbr && tl.includes(org!.abbr.toLowerCase()));
        seatsHere.push({ id: n.id, title: generic ? `${t}, ${orgName}` : t, holder: n.holder, vacant: n.vacant, mode: n.appointmentMode, body: n });
      }
      for (const m of n.members ?? []) seatsHere.push({ id: m.id, title: m.seat ? `${m.title} (${m.seat})` : m.title, holder: m.holder, vacant: m.vacant, mode: m.appointmentMode, body: n });
      for (const s of seatsHere) {
        seats++;
        if (s.vacant || !s.holder) vacant++;
        if (s.holder?.acting) acting++;
        const since = s.holder?.since;
        if (!since || since.length < 10 || since < CUT || since > AS_OF) continue;
        items.push({
          id: `${s.id}:${since}`,
          date: since,
          kind: s.holder?.acting ? "acting" : /elect/.test(s.mode ?? "") ? "elected" : "appointed",
          gov,
          nodeId: s.body.id,
          positionTitle: s.title,
          bodyName: s.body.isPosition ? (s.body.parent ? g.nodes[s.body.parent]?.name : undefined) : s.body.name,
          personIn: s.holder?.name,
          sector: s.body.sector,
        });
      }
    }
  }
  items.sort((a, b) => b.date.localeCompare(a.date) || a.positionTitle.localeCompare(b.positionTitle));
  const changes = { stats: { vacant, acting, seats, lastChange: items[0]?.date }, items: items.slice(0, 400) };
  writeFileSync(join(ROOT, "data/changes.json"), JSON.stringify(changes));
}

writeFileSync(join(OUT_SRC, "govs.json"), JSON.stringify(summaries, null, 1));
writeFileSync(join(ROOT, "public/data/search.json"), JSON.stringify(search));
writeFileSync(join(ROOT, "data/people.json"), JSON.stringify(people));
writeFileSync(join(ROOT, "data/alias-index.json"), JSON.stringify(aliasIndex));
const meta = {
  asOf: AS_OF,
  builtAt: new Date().toISOString(),
  segments: files.length,
  nodes: summaries.reduce((s, x) => s + x.nodes, 0),
  people: Object.keys(people).length,
  corrections: correctionsApplied,
  warnings: warn.length,
};
writeFileSync(join(OUT_SRC, "meta.json"), JSON.stringify(meta, null, 1));
writeFileSync(join(ROOT, "data/build-warnings.txt"), warn.join("\n"));
console.log(JSON.stringify(meta));
if (warn.length) console.log(`${warn.length} warnings → data/build-warnings.txt`);
