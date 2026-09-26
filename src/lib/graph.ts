import type { GEdge, GNode, GovGraph, RelType, Sector } from "./types";

export const SECTOR_INK: Record<Sector, string> = {
  people: "var(--saffron)",
  executive: "var(--navy)",
  legislative: "var(--green)",
  judicial: "var(--ochre)",
  constitutional: "var(--slate)",
  federal: "var(--plum)",
  local: "var(--maroon)",
};
export const SECTOR_WASH: Record<Sector, string> = {
  people: "var(--saffron-wash)",
  executive: "var(--navy-wash)",
  legislative: "var(--green-wash)",
  judicial: "var(--ochre-wash)",
  constitutional: "var(--slate-wash)",
  federal: "var(--plum-wash)",
  local: "var(--maroon-wash)",
};
export const SECTOR_LABEL: Record<Sector, string> = {
  people: "The People",
  executive: "Executive",
  legislative: "Legislature",
  judicial: "Judiciary",
  constitutional: "Constitutional & independent",
  federal: "States & UTs",
  local: "Local government",
};

/** Lok Sabha green, Rajya Sabha red — the colours of the two chambers themselves. */
export function chamberInk(id: string): string {
  if (/rajya-sabha|legislative-council/.test(id)) return "var(--maroon)";
  return "var(--green)";
}

export const REL_VERB: Record<RelType, [string, string]> = {
  // [outgoing phrasing, incoming phrasing]
  elects: ["Elects", "Elected by"],
  indirectly_elects: ["Indirectly elects", "Elected by"],
  appoints: ["Appoints", "Appointed by"],
  advises_appointment: ["Advises appointment of", "Appointed on the advice of"],
  nominates: ["Nominates", "Nominated by"],
  removes: ["Can remove", "Removable by"],
  oversees: ["Oversees", "Overseen by"],
  administers: ["Administers", "Administered by"],
  reports_to: ["Receives reports from", "Reports to"],
  ex_officio: ["Sits ex officio on", "Ex officio member"],
  member_of: ["Member of", "Members"],
  advises: ["Advises", "Advised by"],
  accountable_to: ["Accountable to", "Holds to account"],
  audits: ["Audits", "Audited by"],
  heads: ["Heads", "Headed by"],
  has_jurisdiction_over: ["Has jurisdiction over", "Under the jurisdiction of"],
};

export interface Hop {
  from: string;
  to: string;
  type: RelType | "parent";
}

const UP_PRIORITY: (RelType | "parent")[] = [
  "elects",
  "indirectly_elects",
  "advises_appointment",
  "appoints",
  "nominates",
];

export function buildIndex(g: GovGraph) {
  const incoming = new Map<string, GEdge[]>();
  const outgoing = new Map<string, GEdge[]>();
  for (const e of g.edges) {
    (incoming.get(e.to) ?? incoming.set(e.to, []).get(e.to)!).push(e);
    (outgoing.get(e.from) ?? outgoing.set(e.from, []).get(e.from)!).push(e);
  }
  return { incoming, outgoing };
}
export type GraphIndex = ReturnType<typeof buildIndex>;

/** One step up the chain of authority from a node, towards the People. */
function upOf(g: GovGraph, ix: GraphIndex, id: string): Hop | null {
  const n = g.nodes[id];
  if (!n) return null;
  const inc = ix.incoming.get(id) ?? [];
  // The Prime Minister / a Chief Minister holds office because they command the lower house.
  if (n.rank === "head_of_government" || n.rank === "chief_minister") {
    const house = Object.values(g.nodes).find((x) => x.kind === "chamber" || x.kind === "state_chamber" ? /lok-sabha|assembly/.test(x.id) : false);
    if (house) return { from: house.id, to: id, type: "accountable_to" };
  }
  if (n.isPosition) {
    for (const t of UP_PRIORITY) {
      const e = inc.find((x) => x.type === t && g.nodes[x.from]);
      if (e) return { from: e.from, to: id, type: e.type };
    }
    if (n.parent && g.nodes[n.parent]) return { from: n.parent, to: id, type: "parent" };
    return null;
  }
  // bodies
  const el = inc.find((x) => (x.type === "elects" || x.type === "indirectly_elects") && g.nodes[x.from]);
  if (el) return { from: el.from, to: id, type: el.type };
  if (n.head && g.nodes[n.head]) return { from: n.head, to: id, type: "heads" };
  if (n.adminHead && g.nodes[n.adminHead]) return { from: n.adminHead, to: id, type: "heads" };
  for (const t of ["appoints", "nominates", "administers", "oversees"] as RelType[]) {
    const e = inc.find((x) => x.type === t && g.nodes[x.from]);
    if (e) return { from: e.from, to: id, type: e.type };
  }
  if (n.parent && g.nodes[n.parent]) return { from: n.parent, to: id, type: "parent" };
  return null;
}

/** Chain from the People to `id`, as hops ordered root → node. */
export function authorityChain(g: GovGraph, ix: GraphIndex, id: string): Hop[] {
  const hops: Hop[] = [];
  const seen = new Set<string>([id]);
  let cur = id;
  for (let i = 0; i < 14; i++) {
    const h = upOf(g, ix, cur);
    if (!h || seen.has(h.from)) break;
    hops.push(h);
    seen.add(h.from);
    cur = h.from;
    if (cur === g.root) break;
  }
  if (cur !== g.root && hops.length) {
    const top = g.nodes[cur];
    if (top && (top.kind === "chamber" || top.kind === "state_chamber" || top.kind === "legislature" || top.rank === "head_of_state"))
      hops.push({ from: g.root, to: cur, type: top.rank === "head_of_state" ? "indirectly_elects" : "elects" });
  }
  return hops.reverse();
}

export function connections(g: GovGraph, ix: GraphIndex, id: string) {
  const out = (ix.outgoing.get(id) ?? []).filter((e) => g.nodes[e.to] && e.type !== "heads");
  const inc = (ix.incoming.get(id) ?? []).filter((e) => g.nodes[e.from] && e.type !== "heads");
  return { out, inc };
}

export function breadcrumb(g: GovGraph, id: string): GNode[] {
  const out: GNode[] = [];
  let n = g.nodes[id];
  const seen = new Set<string>();
  while (n && n.parent && !seen.has(n.parent)) {
    seen.add(n.parent);
    const p = g.nodes[n.parent];
    if (!p) break;
    out.unshift(p);
    n = p;
  }
  return out;
}

export function displayName(n: GNode): string {
  return n.short || n.name;
}

export function shortLabel(n: GNode): string {
  if (n.abbr && n.name.length > 30) return n.abbr;
  return n.name.replace(/^Ministry of /, "").replace(/^Department of /, "Dept. of ");
}

export function formatCrore(v?: number): string {
  if (v == null || Number.isNaN(v)) return "—";
  if (v >= 100000) return `₹${(v / 100000).toLocaleString("en-IN", { maximumFractionDigits: 2 })} lakh cr`;
  if (v >= 1000) return `₹${Math.round(v).toLocaleString("en-IN")} cr`;
  return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 1 })} cr`;
}

export function sinceLabel(d?: string, acting?: boolean): string | undefined {
  if (!d) return acting ? "Acting" : undefined;
  const y = d.slice(0, 4);
  const m = d.length >= 7 ? Number(d.slice(5, 7)) : 0;
  const month = m ? new Date(2000, m - 1, 1).toLocaleString("en-IN", { month: "short" }) : "";
  return `${acting ? "Acting since" : "Since"} ${month ? month + " " : ""}${y}`;
}

export const PARTY_INK: Record<string, string> = {
  BJP: "#f28a1d",
  INC: "#1f9ad6",
  AAP: "#1c5f9e",
  AITC: "#1f9d55",
  DMK: "#c62d2d",
  AIADMK: "#1b7a3a",
  SP: "#d6262f",
  TDP: "#e4c21a",
  "JD(U)": "#1f5a8c",
  "CPI(M)": "#b3202a",
  CPI: "#c83a3a",
  JMM: "#1d6a3a",
  JKNC: "#b8262b",
  RJD: "#1e8f4e",
  SHS: "#e8792b",
  "SS(UBT)": "#e8792b",
  NCP: "#1f6fb5",
  "NCP(SP)": "#1f6fb5",
  BJD: "#2e8b3d",
  YSRCP: "#1e5aa6",
  BRS: "#e05aa0",
  ZPM: "#7c4ea3",
  MNF: "#3263a8",
  NDPP: "#b12b36",
  NPP: "#d4702a",
  SKM: "#c43e3e",
  "LJP(RV)": "#3f6fb0",
  IUML: "#1b7a3a",
  "KC(M)": "#d36d2a",
  AGP: "#3f8f5a",
  UPPL: "#c8911e",
  TVK: "#9e2a2b",
  AINRC: "#3c8d3f",
  NPF: "#8b3a8f",
  "JD(S)": "#2f7d32",
  HAM: "#a0522d",
  "AJSU": "#c05a1a",
  RLD: "#2e7d4f",
  "AD(S)": "#5b3f91",
  NC: "#b8262b",
  "KC": "#d36d2a",
  RSP: "#c0392b",
  "JKPDP": "#1f7a44",
  SAD: "#1a3f8f",
  INLD: "#236b35",
  "BSP": "#2446a8",
  "AIMIM": "#1f6f3a",
  "VCK": "#2b4ea0",
  "PMK": "#d2a019",
  "MDMK": "#c1272d",
  IND: "#8a8378",
  Independent: "#8a8378",
  Nominated: "#8a8378",
};
export function partyInk(p?: string): string {
  if (!p) return "var(--ink-4)";
  return PARTY_INK[p] ?? "var(--ink-4)";
}
