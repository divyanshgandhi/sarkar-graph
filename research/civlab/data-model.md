# CivLab Gov Graph — Complete Data Model (VERIFIED)

Source: `graph.civlab.org`, build `We2ikbxxKTtakj9tS4BvH`. All facts below are
**VERIFIED** against downloaded JSON unless marked **INFERRED**. Raw evidence
lives in `research/civlab/raw/` (`us_next_data.json` = full `/us` page,
`node_type_samples.json` = one sample per (type,subtype), `next_data/*.json`
= `_next/data/<build>/...` fetches for detail pages and `/sf`).

---

## 1. Page-prop shapes

### 1a. Index page (`/[gov]` → `__NEXT_DATA__.props.pageProps` or `_next/data/<build>/[gov].json`)

```
pageProps = {
  gov: string,               // "us" | "sf"
  data: GraphData,           // §2
  overview: null,            // VERIFIED null on /us — unused/legacy field
  news: NewsItem[],          // §6
  changes: ChangesFeed,      // §5
  breadcrumb: null,          // VERIFIED null on index; string on detail pages (see §4)
}
```

### 1b. Detail pages (`/[gov]/departments|dept-heads|elected|commissions|advisories/[slug]`)

```
pageProps = {
  gov: string,
  data: GraphData,                          // full graph, same shape as index (entire 952/237-node graph is re-shipped on every page — see §7)
  department|deptHead|elected|commission|advisory: Node,   // the single focal node, keyed by route (§2b)
  selection: { type: "entity", entityId: string },
  breadcrumb: "executive"|"legislative"|"judicial"|"independent",  // = node.sector
  articles: Article[],                      // §4 — powers the "News" tab
  meetings: Meeting[],                      // §4 — powers a "Meetings" tab (SF only has content; always [] on /us)
}
```
Confirmed identical shape across department/dept-head/elected/commission/advisory
routes; only the prop key holding the focal node changes (`department`,
`deptHead`, `elected`, `commission`, `advisory`).

`/[gov]/topics` and `/[gov]/topics/[slug]` are **SF-only in practice**: `/us/topics`
404s (US's `data.topics` is `{}`); `/sf/topics` returns 200 with populated topics (§8).

---

## 2. Graph model (`data: GraphData`)

```ts
interface GraphData {
  nodes: Record<string, Node>;      // keyed by node id, NOT an array
  edges: Record<string, Edge>;      // keyed by edge id (8-char hex string), NOT an array
  constituency: string;             // single id, e.g. "us-electorate"
  elected: string[];                // ids — top-level index for listing page
  commissions: string[];            // ids
  advisories: string[];             // ids
  departments: string[];            // ids
  deptHeads: string[];              // ids
  topics: Record<string, Topic>;    // {} on /us, populated on /sf (§8)
  budget: Budget;                   // empty/null on /us, populated on /sf (§9)
  satellites: string[];             // ids, /us only — see §2d
  layout: string;                   // "us-sectors" on /us; ABSENT (undefined) on /sf
  powerMap: PowerMap;               // /us only — absent key on /sf (§10)
}
```

Counts (VERIFIED, `us`): `nodes`=952, `edges`=1433, `elected`=5,
`commissions`=31, `advisories`=5, `departments`=104, `deptHeads`=460,
`satellites`=346. (`elected`/`commissions`/etc. lists are shorter than the
type counts in `nodes` because they list only *top-level* entries — e.g.
`elected` array has 5 ids but 5 nodes have `type:"elected"` too... actually
verified: the 5 `data.elected` array entries are `us-congress`,
`us-the-house-of-representatives`, `us-the-senate`,
`us-president-of-the-united-states`, `us-vice-president-of-the-united-states`
— i.e. exactly the `nodes` with `type:"elected"`.)

Counts (VERIFIED, `sf`): `nodes`=237. Type breakdown: `dept_head`=59,
`advisory`=56, `department`=56, `commission`=54, `elected`=11,
`constituency`=1. **SF nodes have `subtype: null` on all 237** — the
subtype taxonomy (regulatory_body, court, military_service, etc.) is
US-only.

### 2a. Node type/subtype/sector matrix (VERIFIED, `us`)

| type | subtype | count | sector(s) |
|---|---|---|---|
| dept_head | (none) | 460 | mostly executive |
| department | department | 329 | executive |
| department | quasi_official | 45 | executive/independent |
| commission | regulatory_body | 25 | independent |
| commission | adjudicative_body | 20 | executive/independent |
| department | court | 19 | judicial |
| department | government_corporation | 18 | executive/independent |
| advisory | advisory_body | 14 | executive |
| department | series | 9 | mixed (see §2e) |
| department | military_service | 6 | executive |
| elected | chamber | 2 | legislative |
| elected | legislature | 1 | legislative |
| commission | governing_board | 1 | judicial |
| (constituency, elected-president/VP) | none | 5 | — |

Sector totals: executive=680, independent=206, legislative=37, judicial=28
(sums to 951 of 952 — `us-electorate` constituency node has no `sector` key).

Edge type totals (VERIFIED): appoints=565, dept_head=457, confirms=260,
ex_officio=99, elects=20, oversees=12, advises=11, office=5, administers=4.

### 2b. Node schema

```ts
interface Node {
  type: "constituency" | "elected" | "department" | "dept_head" | "commission" | "advisory";
  id: string;                    // slug, e.g. "us-census-bureau" — always prefixed with gov code
  name: string;
  description: string;           // 0–1175 chars, avg 331 (us); NOT truncated server-side; 8/952 empty
  people: PeopleField;           // union type — §3
  edges: string[];                // edge ids touching this node (99% non-empty; 942/952 non-empty)
  connectedNodes: string[];       // *display-truncated* — arrays >5 items are cut to 4 + "...N more" (VERIFIED: this truncation is baked into the JSON itself, i.e. server pre-truncates connectedNodes for payload size; the untruncated neighbor list must be reconstructed by scanning `edges`/`nodes` — see §2f)
  employeeCount: { budget: {fiscalYear,count} | null, actual: {fiscalYear,count} | null };
                                   // ALWAYS null/null on every one of 952 `us` nodes (0% populated).
                                   // On `sf`: budget set on 48/237 (20%), actual set on 50/237 (21%) — SF-only feature, tied to city budget FTE data.
  departmentCode: string | null;  // ALWAYS null on `us` (0/952). On `sf`: set on 50/237 (21%) — 3-letter SF controller code (e.g. "DPH", "TTX") that joins to `budget.departments[code]` (§9).
  headOf: string | null;          // set on 462/952 (49%) — for dept_head nodes, id of the department/body they head
  head: string | null;            // set on 462/952 (49%) — for department/commission/etc nodes, id of the dept_head node leading them (inverse of headOf)
  topicsWithRelevance: {id: string, relevance_score: number}[];  // [] on ALL 952 `us` nodes; populated on `sf` (§8), score in [0,1], e.g. {id:"housing",relevance_score:1}
  legalSourceUrl: string | null;  // set on 415/952 (44%) — citation (constitution/statute/USC) establishing the entity
  officialUrl: string | null;     // set on 439/952 (46%) — the entity's .gov site
  aliases: string[];              // set (non-empty) on 342/952 (36%)
  seatsCount: number;              // 0 when N/A; >0 on 570/952 (60%) — total appointed/elected seats
  featuredPersonImageUrl: string | null;  // set on 610/952 (64%) — local asset path `/gov_group_pictures/<id>.jpg` (NOT the person's photo; a group/seal image)
  subtype?: string;                // present on 489/952 (51%) — see §2a; ABSENT (not just null) on the other 49%
  sector?: "executive"|"legislative"|"judicial"|"independent";  // present on 951/952
  parent?: string;                 // present on 349/952 (37%) — id of enclosing node
  level?: 1 | 2 | 3;                // present on 349/952 (37%); distribution: level1=3, level2=219, level3=127
  children?: string[];             // present (non-empty) on 67/952 (7%) — only on multi-level hub nodes (Congress, EOP, Smithsonian, cabinet departments, "series" nodes)
}
```

Key nullability note: **`subtype`, `sector`, `parent`, `level`, `children`
are keys that are entirely ABSENT from the JSON object when not applicable**
(not present-with-null) — `"subtype" in node` is false, not `node.subtype
=== null`. All other fields are always-present keys whose value may be
`null`/`[]`/`{}`.

### 2c. Hierarchy representation

Tree is encoded via `parent` (child→parent pointer, id string) +
mirrored `children` (parent→children array, only stored on nodes that
have ≥1 child — i.e. redundant/denormalized, not derived client-side from
scanning for matching `parent` values, since `children` arrays sometimes
contain a `"...N more"` truncation marker themselves just like
`connectedNodes` does).

`level` is depth from sector root: level 1 = the 3 chamber/CBO-under-Congress
nodes; level 2 = 219 nodes (e.g. `us-census-bureau` under
`us-department-of-commerce`); level 3 = 127 nodes (e.g. bureaus nested two
deep, such as Census Bureau program offices). Nodes with **no** `parent`/`level`
(603/952, 63%) are sector-root entities — cabinet departments, independent
agencies, elected offices, top commissions — that sit directly in the
sector view with no ancestor.

`head` / `headOf` is a **separate, orthogonal pointer pair** from
parent/child: it links an *entity* node to its *leadership position*
node (`type:"dept_head"`), not to a sub-entity. Example: `us-census-bureau`
(department) has `head: "us-director-of-the-census-bureau"`
(dept_head), which has `headOf: "us-census-bureau"` back. The `dept_head`
node's own `people.people[]` holds the incumbent.

### 2d. `satellites` (VERIFIED semantics)

`data.satellites` = **every node that has a `parent` field, EXCEPT the 3
level-1 nodes directly under Congress** (House, Senate, CBO). I.e.
satellites = the 346 of 349 parent-having nodes that sit at level 2 or 3 —
sub-bureaus/sub-offices that the front-end renders as small satellite
nodes orbiting their parent department, as distinct from the ~600
sector-root "planet" nodes and the 3 legislative-chamber nodes that get
primary-node rendering despite technically nesting under Congress. Purely
a **rendering hint list**, not a data-model distinction (satellite nodes
have the identical schema and average edge-degree — 5.20 vs 5.22 — as
non-satellites; only 15/346 are graph-theoretically peripheral,
≤2 edges).

### 2e. "series" nodes (aggregation pattern)

9 `department/series` nodes exist (e.g. `us-series-smithsonian-bureaus`,
"Smithsonian Museums and Centers (8)") that collapse a set of parallel
sibling organizations into one graph entry to control node count. Each has
`children: [...]` pointing at the real individual nodes, `description`
listing all subsumed org names, and typically 0 `edges`/empty `people`
(the aggregation is display-only; the real relationships live on the child
nodes).

### 2f. `connectedNodes` display truncation (VERIFIED — matters for scraping)

Both `connectedNodes` and `children` arrays are capped: once they exceed
~4-5 entries the JSON itself contains a literal string element
`"...N more"` in place of the remaining ids (e.g.
`["...5 more"]`/`"...335 more"` seen on `us-president-of-the-united-states`,
which genuinely has 339 connections). **This means `connectedNodes` /
`children` cannot be used as a complete adjacency list for high-degree
nodes** — the complete neighbor set must be reconstructed from `data.edges`
by filtering `fromId`/`toId` against the node id (edges are NOT
truncated — `node.edges` on the President is the full un-truncated list of
edge ids, only the pre-joined `connectedNodes` convenience array is capped).

---

## 3. People / positions / seats / vacancies / acting officials

### 3a. `PeopleField` union type

```ts
type PeopleField =
  | { type: "people"; people: Person[] }   // 936/952 (98%) of us nodes
  | { type: "count"; count: number }       // 16/952 (2%) — large elected bodies (Congress, House, Senate, etc.) where listing every member is redundant/omitted at this payload; count reflects true membership (Congress:535, House:435, Senate presumably 100)
```

### 3b. `Person`

```ts
interface Person {
  id: string;                 // person-level id, e.g. "us-donald-j-trump"
  name: string;
  positionId: string;         // FK to the position/dept_head node id this person occupies
  positionName: string;       // denormalized copy of that node's `name`
  type: "appointed" | "elected";  // VERIFIED only these 2 values appear (1007 appointed, 15 elected across all `us` nodes)
  startedAt: string | null;   // ISO date "YYYY-MM-DD"
  imageUrl: string | null;    // external URL (Wikimedia, agency site) — set on ~28% of person entries; NEVER a local path (unlike featuredPersonImageUrl on nodes)
  party: string | null;       // VERIFIED almost always null (1019/1022 non-position entries) — party is populated only for a handful of top elected officials in the base graph; real party data lives densely in `powerMap.people[].party` instead (§10)
  acting?: boolean;           // present-and-true on 165 people (~16% of all appointed people); key is simply ABSENT (not `false`) when not acting
}
```
Acting officials are a per-person boolean flag, not a separate node/edge
type. `changes.stats.actingOfficials` (VERIFIED = 86 as of 2026-09-25) is a
smaller, different number than the raw 165 `acting:true` people count in
the full node graph — the *changes* feed's number is likely a
freshness-filtered subset (e.g. active government-wide, excluding
seat-holder acting roles on small boards) — **INFERRED**, exact
reconciliation logic not confirmed.

### 3c. Seat modeling

Named seats appear only inside `Person.name`/`positionName` as a suffix,
e.g. `"Member of the Provider Reimbursement Review Board (Seat 1)"` — there
is no separate `seatNumber` field; seat identity is baked into the
`positionId` slug itself (`...-seat-1`, `...-seat-2`, ...). `seatsCount`
on the parent node gives the total intended seats; **vacancies are
implicit**: `seatsCount − len(people.people)` where `people.type ===
"people"`. VERIFIED example: `us-federal-deposit-insurance-corporation`
has `seatsCount:5`, only 3 people listed → 2 vacant seats. `changes.stats.vacantSeats`
(VERIFIED = 6 as of 2026-09-25) is a curated/deduplicated count, not simply
the sum of these gaps across all 952 nodes (many nodes show 1-of-N because
only the currently-relevant seat is tracked, not because N−1 are actually
vacant) — **INFERRED**: raw seatsCount-vs-people gaps are NOT a reliable
proxy for true vacancies; the curated `changes.stats.vacantSeats` is the
authoritative number.

`Edge.seatsAppointed` (int, on `appoints`/`confirms`/`elects` edges)
separately encodes how many seats a given appointer/confirmer relationship
controls (e.g. Speaker of the House appoints 2 of N seats on a board) —
distribution: 1 seat (673 edges), 0 (588, non-appointment edge types),
up to 9.

---

## 4. Detail-page tab data (`articles`, `meetings`)

### 4a. `Article` (powers the "News" tab on entity pages)

```ts
interface Article {
  id: number;
  url: string;
  date: string;            // "YYYY-MM-DD"
  slug: string;
  tags: string[];
  title: string;
  author: string;
  content: string;         // FULL scraped article HTML (verified: complete NPR story markup, not just a summary) — same underlying corpus as powerMap's 1080 articles
}
```
VERIFIED on `/us/departments/us-census-bureau`: 6 articles returned,
full HTML body embedded server-side (raw scrape, not just the `<gov_entities>`-tagged
summary format used in `data.news`, §6). This is a **separate, richer article
store** than the `news`/`powerMap` summaries.

### 4b. `Meeting` (powers a meetings surface — populated only on `sf`)

```ts
interface Meeting {
  id: string;                    // "<entity-id>-<date>[-<time>]"
  gov_entity_id: string;
  name: string;
  meeting_datetime: string;      // ISO w/ timezone, UTC
  end_datetime: string | null;
  meeting_format: "hybrid" | ...;
  location: string;
  virtual_meeting_url: string | null;
  is_cancelled: boolean;
  cancellation_reason: string | null;
  meeting_details_url: string;
  description: string | null;
  metadata: {
    source: "sfgov_calendar" | "sfgovtv_rss";
    external_ids: Record<string,string>;
    dial_in?: { phone: string; access_code: string };
  };
  created_at: string;             // ISO — row insert time
  updated_at: string;             // ISO — row last-sync time
  meeting_materials: { id: number; url: string; title: string; material_type: "agenda"|... }[];
}
```
VERIFIED live/future data: `ccsf-health-commission` meetings list includes
an **October 19, 2026** meeting (future relative to the 2026-09-25 fetch
date), sourced from `sfgov_calendar` and `sfgovtv_rss`, with distinct
`created_at`/`updated_at` timestamps proving an ongoing ETL sync
(`updated_at: 2026-09-23`, 2 days before fetch) — hard evidence the SF
side runs a **recurring scraper against sf.gov's public meeting calendar
and SFGovTV's RSS feed**, not a one-time seed. `/us` `meetings` is always
`[]` — this feature does not exist federally (no equivalent federal
meeting-calendar source).

---

## 5. `changes` — personnel feed

```ts
interface ChangesFeed {
  generatedAt: string;    // "YYYY-MM-DD" — VERIFIED equals fetch date (2026-09-25), i.e. regenerated same-day
  stats: {
    vacantSeats: number;        // 6
    actingOfficials: number;    // 86
    lastChangeDate: string;     // "2026-09-16" — most recent entry's date, lags generatedAt by up to ~9 days
  };
  items: PersonnelChange[];
}
interface PersonnelChange {
  kind: "personnel";              // only value seen — union may support other kinds not populated here
  id: string;                     // "tenure-start-<n>" | "tenure-end-<n>"
  date: string;
  personName: string;
  positionId: string;
  positionName: string;
  groupId: string;                // parent entity id
  entryMode: "appointed" | "acting" | "elected" | ...;
  departure: boolean;             // false = start-of-tenure event, true = end-of-tenure event
  predecessorName: string | null;
  sourceUrl: string;               // often NOT a URL but an internal batch-job tag, e.g. "20260916_uscirf_399", "20260916_acting_sweep_396" — exposes the ingestion pipeline's job-naming convention (date + topic/desk + sequence number)
}
```
`sourceUrl` values are the single best evidence of CivLab's ingest
pipeline: batch tags like `20260908_phase_d3_seats`,
`20260909_wave_appointer_cites`, `phase-d1 2026-09-06`,
`20260917_uscirf_branch_edges_404`, `20260916_acting_sweep_396` appear
identically as `edges[*].metadata.source` values too (§2, `561` edges
carry a `source` tag; `395` carry a `cite`; `379` a `note`; `377` a
`basis`). **INFERRED**: this reads as an LLM/analyst-assisted batch
curation workflow run in dated "waves"/"phases" (D1/D2/D3) with
periodic "acting sweep" passes and per-domain citation passes
(`wave_appointer_cites`), rather than a fully automated live scraper for
the federal graph itself — contrast with SF's meetings, which clearly
are automated (§4b). The **federal personnel/edge data looks
manually-curated in batches**; the **SF meetings and federal news/powerMap
layers look automated/scheduled**.

---

## 6. `news` (index-page news list, distinct from `Article`)

```ts
interface NewsItem {
  id: string;              // md5-like hex hash
  summary: string;         // 1-2 sentences, HTML-ish with inline entity tags:
                            //   <gov_entities='us-census-bureau'>Census Bureau</gov_entities>
  url: string;
  publication: "NPR Politics" | "Government Executive" | "Federal News Network";
}
```
The `<gov_entities='<id>'>text</gov_entities>` inline tag format is the
mechanism for auto-linking news mentions to graph node ids — confirms an
NER/entity-linking step maps free-text mentions to canonical node ids
before storage, since tags can repeat the same entity id twice in one
summary (verified in the FBI example: `us-federal-bureau-of-investigation`
tagged twice).

---

## 7. `powerMap` (90-day influence/attention model, `/us` only)

```ts
interface PowerMap {
  windowDays: number;        // 90
  since: string;              // "YYYY-MM-DD", = fetch date − 90 days
  computedAt: string;         // full ISO timestamp, UTC — VERIFIED = "2026-09-25T04:04:10.934Z" on a fetch made 2026-09-25 ~14:41 local (PT) → this is a scheduled recompute, most likely a **daily cron around 04:00 UTC** (~9pm PT / early morning ET) — INFERRED cadence, single data point observed, but consistent with "realtime-ish daily refresh" framing.
  articleCount: number;       // 1080
  sources: string[];          // ["NPR Politics","Government Executive","Federal News Network"]
  people: PowerPerson[];
  links: PowerLink[];
}
interface PowerPerson {
  id: string; name: string; job: string;
  positionId: string;
  party: string | null;         // POPULATED here (unlike base Person.party) — e.g. "Republican" for Trump, Thune
  nodeId: string | null;        // null for individual legislators (they map to a seat, not a distinct node)
  bodyNodeId: string;           // the institution node, e.g. "us-the-senate"
  imageUrl: string | null;
  rank: number;                 // 1 = most mentioned in window
  total: number;                 // total mentions across window
  recent: number;                // mentions in most recent week
  weeks: number[];                // per-week mention counts, oldest→newest (12 entries for a 90-day/~13-week window, first bucket observed with 12 values)
  heat: number;                   // 0-1 normalized score, e.g. 0.694 (Trump), 0.232 (Thune) — INFERRED formula (looks like a recency-weighted/decayed total, not simply total/max)
  latest: { at: string; date: string; headline: string; source: string; url: string };
}
interface PowerLink {
  id: string; type: "appoints" | ...;  // same edge-type vocabulary as graph edges
  fromPersonId: string; toPersonId: string;
  fromNodeId: string; toNodeId: string;
}
```
`powerMap.links` is a **person-level projection of the institutional edge
graph** (§2) — same relationship types, but connecting the individuals
currently holding the two positions rather than the position nodes
themselves, i.e. it's derived by joining `edges` with each position's
current `people[0]`.

---

## 8. `topics` (SF only)

```ts
interface Topic {
  id: string;             // e.g. "homelessness", "transit", "public_safety"
  name: string;
  description: string;
  nodes: string[];         // node ids tagged with this topic
}
```
`data.topics` is `{}` on `/us` (feature unused federally) and a populated
`Record<topicId, Topic>` on `/sf` (VERIFIED: homelessness, transit,
public_safety, + others seen truncated). Each SF node additionally carries
`topicsWithRelevance: {id, relevance_score}[]` (relevance_score observed
0.25–1) — the per-node/topic edge with weight, inverse of `Topic.nodes`.

---

## 9. SF budget model (`data.budget`, only populated on `/sf`)

```ts
interface Budget {
  totalSpendingBudget: number;     // city-wide total, VERIFIED = 16,851,826,113 (~$16.85B)
  groups: BudgetGroup[];            // 7 groups = SF's official budget "service area" categories
  departments: Record<string, DeptBudget>;   // keyed by 3-letter controller code, 49 departments
}
interface BudgetGroup {
  code: string;       // "01".."07"
  name: string;        // "Public Protection", "Public Works, Transportation & Commerce",
                        // "Community Health", "Human Welfare & Neighborhood Development",
                        // "Culture & Recreation", "General Administration & Finance",
                        // "General City Responsibilities"
  departments: string[];  // dept codes in this group (group "07" observed empty — catch-all/citywide items with no single dept)
}
interface BudgetPeriod {
  fiscalYear: number;
  totalSpending: number;
  totalRevenue: number;
  net: number;                  // = totalRevenue - totalSpending (verified sign: negative when spending > revenue)
  nonprofitSpending: number | null;   // null in *Budget rows, populated (incl. 0) in *Actual/actuals rows
}
interface DeptBudget {
  code: string; name: string; nodeId: string;
  currentBudget: BudgetPeriod;       // FY2027 appropriated/budgeted
  currentActual: BudgetPeriod;       // FY2027 actuals-to-date (partial year at fetch time)
  previousBudget: BudgetPeriod;      // FY2026 budgeted
  previousActual: BudgetPeriod;      // FY2026 actuals
  budgets: BudgetPeriod[];           // FY2019-FY2028 budgeted time series (10 pts, includes 1 forward-looking year)
  actuals: BudgetPeriod[];           // FY2019-current actuals time series, WITH nonprofitSpending populated per-year
  currentBudgetBreakdown: {
    fiscalYear: number;
    breakdown: { category: string; amount: number; type: "spending"|"revenue" }[];
      // spending categories observed: Services Of Other Depts, Salaries,
      // Programmatic Projects, Transfers Out, Non-Personnel Services,
      // Materials & Supplies, Mandatory Fringe Benefits, (+ more/revenue rows truncated in sample)
  };
  contractStats: {
    activeContracts: number; totalContractValue: number; totalSuppliers: number;
    nonprofitContracts: number; nonprofitSuppliers: number; nonprofitSpending: number;
    medianDurationYears: number;
  };
  nonprofitFiscalYear: number;         // the FY the nonprofit figures below apply to (e.g. 2026, one year behind currentBudget's 2027)
  nonprofitSpendingAmount: number;     // headline nonprofit $ figure for that dept
  citywideSpendingRanking: { rank: number; total: number };     // e.g. DPH rank 1 of 54
  citywideRevenueRanking: { rank: number; total: number };
  citywideContractsRanking: { rank: number; total: number };
  citywideNonprofitSpendingRanking: { rank: number; total: number };
}
```
VERIFIED example (`DPH`, FY2027 budgeted): totalSpending
$3,575,749,426; totalRevenue $2,710,425,797; net −$865,323,629; ranked
#1 of 54 SF departments by citywide spending, revenue, AND nonprofit
spending; `contractStats`: 682 active contracts worth $8.12B total,
371 suppliers (114 nonprofit), median contract duration 4.997 years.
Node↔budget join key is `Node.departmentCode` (§2b) — set on 50/237 SF
nodes, matching the 49 `budget.departments` entries + presumably 1
non-department dept_head/commission sharing a code. The "Budget" detail
tab is therefore a **client-side lookup**: `budget.departments[node.departmentCode]`,
not a field embedded on the node itself.

---

## 10. Detail-page routing / build

Confirmed route → prop-key mapping (all under `_next/data/<buildId>/<gov>/...`):

| route | focal prop key | example fetched |
|---|---|---|
| `/[gov]/departments/[slug]` | `department` | `us-census-bureau`, `ccsf-department-of-public-health` |
| `/[gov]/dept-heads/[slug]` | `deptHead` | `us-assistant-secretary-for-children-and-families` |
| `/[gov]/elected/[slug]` | `elected` | `us-the-senate` |
| `/[gov]/commissions/[slug]` | `commission` | `us-commodity-futures-trading-commission`, `ccsf-health-commission` |
| `/[gov]/advisories/[slug]` | `advisory` | `us-council-of-economic-advisers` |
| `/[gov]/topics` | (SF only) | `sf` returns `{data.topics}`; `us` 404s |
| `/[gov]/topics/[slug]` | not fetched this pass | — |

Every detail-page JSON re-ships the **entire graph** (`data.nodes`/`data.edges`
for all 952/237 nodes, ~2MB), not just the focal node — confirmed by file
sizes (each detail fetch ≈2.0-2.25MB on `/us`, matching the 2.12MB base
`/us` payload) — i.e. **no incremental/partial data fetching**; the client
gets the full graph on first paint and detail pages are effectively the
same payload with a different `selection`/focal prop. This is consistent
with SSG (`gsp:true`) baking the whole graph into every static page rather
than fetching per-entity from a live API. **INFERRED as the likely reason
"realtime" freshness is bounded by rebuild/ISR cadence, not per-request
API calls** — the per-page payload only changes when Vercel regenerates
that page.

---

## 11. Consolidated TypeScript interfaces

```ts
type Sector = "executive" | "legislative" | "judicial" | "independent";
type NodeType = "constituency" | "elected" | "department" | "dept_head" | "commission" | "advisory";
type EdgeType = "appoints" | "dept_head" | "confirms" | "ex_officio" | "elects" | "oversees" | "advises" | "office" | "administers";

interface Person {
  id: string;
  name: string;
  positionId: string;
  positionName: string;
  type: "appointed" | "elected";
  startedAt: string | null;
  imageUrl: string | null;
  party: string | null;
  acting?: true;
}

type PeopleField =
  | { type: "people"; people: Person[] }
  | { type: "count"; count: number };

interface GraphNode {
  type: NodeType;
  id: string;
  name: string;
  description: string;
  people: PeopleField;
  edges: string[];
  connectedNodes: string[];          // may contain a truncation sentinel "...N more"
  employeeCount: { budget: { fiscalYear: number; count: number } | null;
                    actual: { fiscalYear: number; count: number } | null };
  departmentCode: string | null;     // FK into Budget.departments (SF)
  headOf: string | null;             // dept_head -> entity it leads
  head: string | null;               // entity -> its dept_head
  topicsWithRelevance: { id: string; relevance_score: number }[];
  legalSourceUrl: string | null;
  officialUrl: string | null;
  aliases: string[];
  seatsCount: number;
  featuredPersonImageUrl: string | null;
  subtype?: string;
  sector?: Sector;
  parent?: string;
  level?: 1 | 2 | 3;
  children?: string[];               // may contain "...N more"
}

interface GraphEdge {
  id: string;
  type: EdgeType;
  fromId: string;
  toId: string;
  seatsAppointed: number;
  metadata: {
    source?: string; cite?: string; note?: string; basis?: string;
    issue?: string; url?: string; quote?: string; self_selection?: string;
    repointed_from?: string; repointed_reason?: string; shape?: string;
    simplified?: string; via?: string; cite_url?: string; researched?: string;
  } | null;
}

interface GraphData {
  nodes: Record<string, GraphNode>;
  edges: Record<string, GraphEdge>;
  constituency: string;
  elected: string[];
  commissions: string[];
  advisories: string[];
  departments: string[];
  deptHeads: string[];
  topics: Record<string, { id: string; name: string; description: string; nodes: string[] }>;
  budget: {
    totalSpendingBudget: number | null;
    groups: { code: string; name: string; departments: string[] }[];
    departments: Record<string, DeptBudget>;   // {} on /us
  };
  satellites?: string[];    // /us only
  layout?: string;          // /us only, "us-sectors"
  powerMap?: PowerMap;      // /us only
}
```

---

## 12. Verified vs. inferred summary

**VERIFIED** (direct field inspection of downloaded JSON): full node/edge
schema and counts; all field-presence/nullability percentages in §2b;
satellites = parent-having nodes minus the 3 level-1 legislative-chamber
nodes; person schema incl. `acting` boolean; seat-in-name convention;
budget schema and SF DPH numbers; meetings schema with a real
future-dated (2026-10-19) SF meeting proving live sync; topics is
SF-only (`/us/topics` 404s, `data.topics={}` on `/us`); powerMap schema
and one `computedAt` timestamp.

**INFERRED** (pattern-matched, single or partial evidence): powerMap's
daily-ish recompute cadence (one timestamp observed); `heat` score
formula; reconciliation between raw seat/acting counts and the curated
`changes.stats` numbers; that federal edge/personnel data is
batch/analyst-curated in dated "waves" while SF meetings/news are
automated — based on the `sourceUrl`/`metadata.source` naming patterns,
not on direct pipeline access; that "realtime" is bounded by SSG/ISR
rebuild cadence rather than live API calls (consistent with `gsp:true`
seen by another workstream, not re-verified here).

## 13. Files produced this pass

- `research/civlab/raw/next_data/us_dept_census-bureau.json`
- `research/civlab/raw/next_data/us_depthead_asst-sec-children-families.json`
- `research/civlab/raw/next_data/us_elected_senate.json`
- `research/civlab/raw/next_data/us_commission_cftc.json`
- `research/civlab/raw/next_data/us_advisory_cea.json`
- `research/civlab/raw/next_data/sf_index.json`
- `research/civlab/raw/next_data/sf_topics.json`
- `research/civlab/raw/next_data/sf_dept_dph.json`
- `research/civlab/raw/next_data/sf_commission_health.json`
- `research/civlab/raw/next_data/us_topics_page.html` (404 artifact, confirms topics is SF-only)
