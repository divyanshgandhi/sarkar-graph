// Shared graph schema — produced by scripts/build-graph.ts, consumed by the app.

export type Sector =
  | "people"
  | "executive"
  | "legislative"
  | "judicial"
  | "constitutional"
  | "federal"
  | "local";

export type Shape =
  | "seal" // the People
  | "office" // an elected / constitutional office (President, CM, Governor)
  | "head" // a seat that heads a body (minister, secretary, chair)
  | "body" // ministry, department, agency
  | "commission" // regulators, constitutional & statutory commissions
  | "advisory" // advisory bodies, councils
  | "court" // courts and tribunals
  | "corporation" // CPSEs, banks, statutory corporations
  | "force" // armed forces, CAPFs, police
  | "chamber" // a house of a legislature
  | "committee" // parliamentary / cabinet committees
  | "state" // a State or UT (drills into its own wheel)
  | "district"
  | "tier"; // an aggregate tier of local government

export type RelType =
  | "elects"
  | "indirectly_elects"
  | "appoints"
  | "advises_appointment"
  | "nominates"
  | "removes"
  | "oversees"
  | "administers"
  | "reports_to"
  | "ex_officio"
  | "member_of"
  | "advises"
  | "accountable_to"
  | "audits"
  | "heads"
  | "has_jurisdiction_over";

export interface Holder {
  name: string;
  since?: string;
  party?: string;
  house?: string;
  constituency?: string;
  wikipedia?: string;
  image?: string;
  acting?: boolean;
  notes?: string;
}

/** A seat that is listed inside a body (MPs, MoS, judges, members) rather than drawn on the wheel. */
export interface Member {
  id: string;
  title: string;
  rank?: string;
  seat?: string;
  holder?: Holder | null;
  vacant?: boolean;
  appointmentMode?: string;
  sources?: string[];
  confidence?: Confidence;
}

export type Confidence = "high" | "medium" | "low";

export interface Budget {
  fy: string;
  be?: number; // ₹ crore, budget estimate
  re?: number; // revised estimate, previous FY
  reFy?: string;
  actual?: number;
  actualFy?: string;
  capital?: number;
  share?: number; // of total union expenditure
  rank?: number;
  of?: number;
  source?: string;
}

export interface GNode {
  id: string;
  kind: string;
  shape: Shape;
  sector: Sector;
  ring: number;
  name: string;
  short?: string; // label-friendly short name
  nameHi?: string;
  abbr?: string;
  aliases?: string[];
  parent?: string;
  children?: string[];
  description?: string;
  legalBasis?: string;
  legalSourceUrl?: string;
  officialUrl?: string;
  established?: string;
  hq?: string;
  head?: string; // id of the position node heading this body
  adminHead?: string;
  headOf?: string; // for positions
  seats?: number;
  stats?: Record<string, string | number>;
  budget?: Budget;
  // position fields
  isPosition?: boolean;
  title?: string;
  rank?: string;
  holder?: Holder | null;
  vacant?: boolean;
  appointmentMode?: string;
  members?: Member[];
  // provenance
  sources?: string[];
  confidence?: Confidence;
  notes?: string;
  // federal drill-in
  link?: string; // gov code for State nodes on the Union wheel
  linkId?: string; // node to open inside that gov
  cluster?: boolean; // drawn as a small mark in a cluster until its parent is selected
}

export interface GEdge {
  id: string;
  from: string;
  to: string;
  type: RelType;
  basis?: string;
  source?: string;
}

export interface SectorDef {
  id: Sector;
  label: string;
  labelHi?: string;
  weight?: number;
}

export interface GovGraph {
  gov: string; // "in" or a state code
  name: string;
  nameHi?: string;
  kind: "union" | "state" | "ut";
  asOf: string;
  root: string;
  sectors: SectorDef[];
  rings: { ring: number; label?: string }[];
  nodes: Record<string, GNode>;
  edges: GEdge[];
  stats: Record<string, number | string>;
}

export interface GovSummary {
  gov: string;
  name: string;
  nameHi?: string;
  kind: "union" | "state" | "ut";
  capital?: string;
  cm?: { name: string; party?: string; image?: string } | null;
  head?: { title: string; name: string } | null;
  alliance?: string;
  party?: string;
  seats?: number;
  nodes: number;
  tile?: [number, number];
}

export interface SearchEntry {
  id: string;
  gov: string;
  name: string;
  sub?: string; // holder name or parent name
  nameHi?: string;
  abbr?: string;
  sector: Sector;
  shape: Shape;
  terms: string; // lowercased haystack
  person?: boolean;
}

export interface NewsItem {
  id: string;
  title: string;
  summary?: string;
  url: string;
  source: string;
  publishedAt: string; // ISO
  entities: string[]; // node ids ("gov:id" for state nodes)
  people: string[]; // person keys
  image?: string;
}

export interface PowerPerson {
  key: string;
  name: string;
  job: string;
  party?: string;
  nodeId?: string;
  gov?: string;
  image?: string;
  rank: number;
  total: number;
  recent: number;
  weeks: number[];
  heat: number;
  latest?: { title: string; url: string; source: string; at: string };
}

export interface ChangeItem {
  id: string;
  date: string;
  kind: "appointed" | "elected" | "departed" | "acting" | "structure";
  gov: string;
  nodeId?: string;
  positionTitle: string;
  bodyName?: string;
  personIn?: string;
  personOut?: string;
  sector: Sector;
  source?: string;
}
