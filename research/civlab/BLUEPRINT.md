# India Gov Graph — Build Blueprint

Synthesized from five reverse-engineering reports on `graph.civlab.org` (render-and-interaction.md,
data-model.md, sourcing-and-realtime.md, design-system.md, sf-and-product.md — all in this
directory). Target: Union + 36 States/UTs + local tiers, Next.js **App Router** + React 19 +
**Motion**. Every claim inherits its source report's VERIFIED/INFERRED/UNCONFIRMED tag; this doc
adds no new site facts, only synthesis, adaptation, and a §6 contradiction log.

**Update 2026-09-25 (live-verification.md)**: a later subagent with live browser access (not
curl-only) drove `graph.civlab.org/us` directly and closed most of this gap — hover states,
click→navigate behavior, the full Legend (entity-shape + relationship-line key), the search
overlay, the Power map, and live network traffic are now **[VERIFIED]** by direct interaction;
see `research/civlab/live-verification.md`. One correction surfaced: the theme default on the
graph route was observed as **light**, not dark, on a fresh session (contradicts the inferred
claim below). The screen recording itself (`Screen Recording 2026-09-25 at 2.33.06 PM.mov`)
remains **unreachable by every tool tried across both subagent sessions** (Bash `cp`/`ditto`/
`stat`/`cat`, AppleScript, ffmpeg, `Read`, and now browser `file://` navigation all fail on the
macOS `screencaptureui` TemporaryItems sandbox) — this is very likely only openable from the
orchestrating/desktop session itself (e.g. QuickLook/Finder), not from any sandboxed subagent.

**Original open risk (below), now largely superseded by live-verification.md**: the
design-system subagent could not open the screen recording (macOS `screencaptureui`
TemporaryItems sandbox — `cp`/`ditto`/AppleScript/ffmpeg all refused). This synthesis pass had
the same tool scope (reports + write access only, no video tool), so **hover/press
micro-interactions and any canvas-only UI copy remain unverified** — flagged again in §6,
recommend the orchestrating session watch it directly before final sign-off.

---

## 1. Feature inventory for parity

**Global chrome**
- Top bar (min-h 44px): logomark, gov-switcher dropdown (Radix `DropdownMenu`), breadcrumb trail
  (sector/kind → entity), search trigger.
- Search: `Cmd/Ctrl+K` overlay, Fuse.js-style fuzzy match (entities `threshold 0.4`, topics `0.2`),
  100% client-side against already-loaded data, `Escape`/outside-click to close, closes on route
  change. Empty state: "No results found" + suggested topic chips.
- Legend: collapsible, chevron rotates 180°, "N hidden" counter when collapsed; each kind is an
  **independent toggle** in a `Set<kind>` (multi-select filter, not radio).
- Theme toggle: 44×44 Sun/Moon button; default dark on the main graph route, light elsewhere,
  persisted to `localStorage`, applied pre-paint via inline head script (no FOUC), mirrored to React
  via `MutationObserver` + `useSyncExternalStore`.
- View tabs (segmented control): `Graph` always; `Power map` and/or `Budget` conditionally per
  government config. Inactive tabs carry the visual weight (gray block); active tab = plain
  background — no underline/pill indicator.
- Footer: attribution + Email/Twitter/Substack-equivalent links, plus an explicit
  "not affiliated with the government" disclaimer (worth keeping verbatim-equivalent for India).

**Graph view**
- Deterministic radial/sector layout (not force-directed, not pannable/zoomable in CivLab —
  see §5 for why India should add zoom/pan).
- Node shapes by type/subtype (circle/diamond/pentagon/octagon/rounded-square/double-rect — full
  mapping in §3).
- Click → highlight + dim everything else (opacity 0.12, `pointer-events:none` on dimmed);
  `data-node-id` per shape for hit-testing.
- Click → real (non-shallow) `router.push(path, undefined, {scroll:false})`; keeps graph panel
  scroll position stable across entity navigation.
- `ArrowLeft`/`ArrowRight` (no modifier) → prev/next within the current listing (e.g. department).
- Every node reflow animates along a **polar (angle+radius) tween**, 750ms — not a straight-line
  transform.

**Detail entity panel** (department/dept-head/elected/commission/advisory)
- Title, clamp-to-3-lines description with "Read more" (unclamped ≥768px), Legal Source /
  Official Website link row, seat/employee count sentence, current officeholder card.
- Tabs: `News` (SSR'd article list + "Load more"), `Who's connected?` (`@container`-responsive
  entity-card grid, 1–2 cols), `Budget` (state/local tier only), `Media`, `Meetings` (local-body
  tier only, SF-style — see below).
- "Who's connected?" card: seat-body variant shows `"{appointed} of {total} seats"` instead of a
  description.

**Power-map / "who's in the news"** (people, not institutions)
- Shelf/bin-packed row layout, NOT the sector fan (§6 corrects a brief mislabel). Radius per
  person ∝ √(total mentions). Row-local permutation search minimizes
  `Σ|x(person)−x(linked person, adjacent row)| + 0.05·|x(person)−rank home x|`, plus one 30%
  relaxation pass toward linked-neighbor average x (not iterative physics).
- Heat-glow halo (`stroke` blurred 6px, opacity 0.16 + 0.5×heat), staggered fade-in `18ms×rank
  + 200ms`.
- Click person → inline news feed OR jump to Graph view focused on that person.
- 160ms-debounced hover-out grace period for connection highlighting.
- All motion gated behind `prefers-reduced-motion`.

**Budget module** (state/local tier, à la SF — not meaningful at pure-Union scale unless scoped to
ministry-level allocations)
- Hero stat tiles (residents*, elected, commissions, advisory, departments) with footnoted sources.
- "This Year" card: total budget/revenue/employees with YoY delta (magnitude-weighted color/weight).
- Per-department: current/previous budget+actual, 10-year time series, category breakdown
  (**rendered as a stacked horizontal-bar list in CivLab's actual code, not a donut/pie** — §6),
  contract stats, 4 citywide-style rankings (`rank of total-departments`).

**Personnel changes / provenance**
- Change-feed cards: category pill colored by branch + 12%-alpha background, start/end-of-tenure
  entries, predecessor name, source citation.
- Stats: vacant seats, acting officials, last-change date.
- Every node's `legalSourceUrl` and every edge's `metadata` (citation URL, literal statute quote,
  `basis`, batch/issue id, `repointed_from/reason` when a first-pass scaffold guess was corrected)
  — this provenance trail is CivLab's most valuable, most replicable idea (§5).

**News**
- Index-level: 3–4 headline cards with inline `<gov_entities='id'>text</gov_entities>` tags.
- Entity-level: full scraped-article store via a live API (`articles`, §4).

**Topics** — opt-in per government (populated on SF, empty/404 on US). India should ship this at
both Union and State tiers from day one (a gap CivLab itself hasn't closed).

**Meetings** — populated only where a public meeting-calendar source exists (SF commissions);
India equivalent = state/local statutory-body meeting calendars, municipal council agendas.

**Request/lead-gen page** — static router into existing instances + "map my government" CTA.

**Accessibility/motion** — full graph/power-map motion collapses to instant 160ms opacity fades
under `prefers-reduced-motion`, stagger removed entirely.

---

## 2. Data model adapted to India

CivLab's schema generalizes cleanly; the one structural gap is **tier** (Union/State/Local), which
the US-only, SF-only flat model never needed (each `gov` slug is a single flat government).

```ts
type Tier = "union" | "state" | "local";
type Sector = "executive" | "legislative" | "judicial" | "independent";
type NodeType = "constituency" | "elected" | "department" | "dept_head" | "commission" | "advisory";

// India subtype vocabulary, mapped from CivLab's US taxonomy:
type DepartmentSubtype =
  | "ministry"            // ~ CivLab "department" (Union) — e.g. Ministry of Home Affairs
  | "attached_office"      // ~ "department" sub-bureau
  | "psu"                  // ~ "government_corporation" — PSUs/statutory corporations (LIC, ONGC)
  | "court"                // Supreme Court / High Courts / tribunals
  | "quasi_official"       // statutory/regulatory bodies structured as departments (e.g. CBDT)
  | "armed_service";       // ~ "military_service" — Army/Navy/Air Force/CAPFs

type CommissionSubtype =
  | "regulatory_body"      // SEBI, TRAI, RBI, CCI
  | "adjudicative_body"    // NCLT, CAT, NGT
  | "constitutional_body"; // ECI, CAG, UPSC, Finance Commission — India-specific, no direct
                            // CivLab analog (US commissions are all statutory/independent-agency
                            // level; India's Art. 148/324/280 bodies deserve their own subtype)

interface Node {
  tier: Tier;                          // NEW — Union/State/Local
  jurisdictionCode?: string;           // NEW — state/UT code when tier != "union", e.g. "MH","DL"
  type: NodeType;
  subtype?: DepartmentSubtype | CommissionSubtype | "chamber" | "legislature" | "series";
  id: string;                          // slug, gov-prefixed: "in-ministry-of-home-affairs",
                                        // "in-mh-department-of-revenue" (state-prefixed)
  name: string; description: string;
  people: { type: "people"; people: Person[] } | { type: "count"; count: number };
  edges: string[];
  connectedNodes: string[];            // MUST NOT silently truncate to "...N more" like CivLab —
                                        // paginate/lazy-load instead (see §5)
  headOf: string | null; head: string | null;
  legalSourceUrl: string | null;       // indiacode.nic.in / egazette.gov.in / constitution article
  officialUrl: string | null;
  aliases: string[];
  seatsCount: number;
  sector?: Sector;
  parent?: string; level?: 1 | 2 | 3; children?: string[];
  topicsWithRelevance: { id: string; relevance_score: number }[];
}

interface Person {
  id: string; name: string; positionId: string; positionName: string;
  type: "appointed" | "elected" | "nominated";   // NEW value: "nominated" — Rajya Sabha/Vidhan
                                                    // Parishad nominated members, Governor-nominated
                                                    // Anglo-Indian-style seats historically, etc.
  startedAt: string | null; imageUrl: string | null;
  party: string | null;
  acting?: true;
  oathPending?: true;                 // NEW — India-specific gap between appointment/election and
                                        // oath-of-office (constitutionally meaningful; CivLab's US
                                        // model has no oath-vs-appointment distinction worth keeping)
}
```

**Edge type vocabulary** — extend CivLab's 8 (`appoints, dept_head, confirms, ex_officio, elects,
oversees, advises, office, administers`) with the mechanisms India's Constitution actually uses
that the US set can't express cleanly:

| type | US analog | India usage |
|---|---|---|
| `appoints` | same | President appoints PM/Governors/judges (on advice); Governor appoints CM |
| `elects` | same | Lok Sabha elects Speaker; Rajya Sabha elects Deputy Chairman; electoral college elects President |
| `nominates` | **new** | President nominates 12 RS members / Governor nominates MLC/MLA seats; Collegium *nominates* (recommends) judges — distinct from `appoints` because a separate confirming actor acts on the nomination |
| `confirms` / `oath` | `confirms` | Parliamentary confirmation has no US-style Senate-PN analog in India for most posts — repurpose `confirms` narrowly (e.g. RS confirms certain statutory appointments) and add `oath` for the constitutionally distinct oath-administration step (CJI administers oath to President; President/Governor administers oath to PM/CM/ministers) |
| `advises` | same | PM/Council of Ministers *advises* President (Art. 74) — structurally central in India, only a minor edge type in the US graph |
| `oversees` | same | CAG oversees public accounts; parliamentary standing committees oversee ministries |
| `ex_officio` | same | VP is ex officio RS Chairman; Union Home Secretary ex officio on various bodies |
| `administers` | same | Ministries administer attached/subordinate offices |
| `reports_to` | **new** | Attached/subordinate offices and PSUs report to their administrative ministry — distinct from `parent`/`children` hierarchy because a PSU under Ministry A can *report to* a different oversight ministry for a specific function |

**Sector** stays 4-way (executive/legislative/judicial/independent — `independent` covers
constitutional/statutory bodies: ECI, CAG, UPSC, CVC, Finance Commission, RBI, regulators).
**Sector allocation math (§3) needs a 3rd axis (tier) that CivLab never needed** — see below.

**Budget/provenance blocks**: reuse CivLab's pattern verbatim — `metadata.{source_url,
source_table, data_year/fiscal_year}` on every rollup stat, and edge-level `{cite, quote, basis,
issue, source}` citing India Code / Gazette notification / PIB release, exactly like CivLab's
"scaffold-then-verify" `metadata` object (data-model.md §2b/§11, sourcing-and-realtime.md §6).

---

## 3. Layout & rendering approach, with the exact math

**Keep**: SVG (not Canvas/WebGL — CivLab's choice is right for this node count and for
accessibility/DOM-based hit-testing); hand-rolled d3-selection/d3-transition imperative render
inside a React `useEffect` against a ref'd `<svg>` ("React owns the container, D3 owns the
children"); polar-coordinate `attrTween` motion; node-shape language.

**Reuse CivLab's exact sector-angle allocation algorithm** (render-and-interaction.md §2,
verified from source):

```js
function allocateSectorAngles(sectors, weightById, gapDeg = 5) {
  const gap = gapDeg * Math.PI / 180;
  const budget = 2 * Math.PI - gap * sectors.length;
  const totalWeight = sectors.reduce((s, x) => s + (weightById[x.id] ?? 0), 0) || 1;
  let angles = sectors.map(x =>
    Math.max(x.minAngleDeg * Math.PI / 180, budget * (weightById[x.id] ?? 0) / totalWeight));
  const sum = angles.reduce((a, b) => a + b, 0);
  angles = angles.map(a => a * budget / sum);
  const out = []; let cursor = -Math.PI / 2 - angles[0] / 2;
  sectors.forEach((x, i) => {
    out.push({ id: x.id, label: x.label, startAngle: cursor, endAngle: cursor + angles[i] });
    cursor += angles[i] + gap;
  });
  return out;
}
```

Proportional-to-weight, min-angle clamped, renormalized, centered at 12 o'clock — directly reusable
for India's 4 sectors (e.g. `executive minAngle 130°, legislative 40°, judicial 45°, independent
30°` as a starting guess, tuned to actual node-count skew like CivLab's 38/120/56).

**Extend for tier**: CivLab never needed a 3rd axis because `us`/`sf` are each a single flat
government. India's Union graph alone can mirror `us-sectors` unchanged. But a *combined*
Union+State+Local view needs a **second allocation pass**: treat each sector wedge from the
algorithm above as its own sub-circle budget, then run the same function again *inside* each
sector wedge with `tier` as the grouping key (Union ring innermost, State ring middle, Local ring
outermost) — i.e. nest the exact same proportional-clamp-renormalize math one level deeper rather
than inventing new layout math. This keeps the "no physics, fully deterministic, 750ms polar tween"
character CivLab has, at the cost of one more recursive layer.

**Node shapes** (reuse directly, remap subtypes):

| shape | CivLab meaning | India mapping |
|---|---|---|
| circle | `elected` | elected office (President, PM, MP, MLA, Mayor) |
| diamond (rect rotate 45°) | `commission` | regulatory/adjudicative bodies (SEBI, NCLT) |
| pentagon (apex up) | `court`/`adjudicative_body` | Supreme Court, High Courts, tribunals |
| octagon | `quasi_official` | constitutional bodies (ECI, UPSC, CAG) |
| double-rect | `government_corporation` | PSUs/statutory corporations |
| rounded-square → circle as it shrinks | plain `department` | ministries/attached offices, corner radius scales with size exactly as CivLab does |

**Add what CivLab explicitly lacks**: real pan/zoom. Grep evidence (render-and-interaction.md §1)
confirms **zero** d3-zoom/d3-force anywhere in CivLab's bundle — their graph is fixed-size and only
works because ~950 nodes fit one screen at a sensible minimum size. India's Union+36-states+local
graph will be an order of magnitude larger; ship `d3-zoom` (or a light custom wheel/pinch handler)
from day one, and default to a **drill-down UX** (Union sector view → click a state wedge → that
state's own sector view) rather than trying to render every tier simultaneously in one SVG.

**Edge rendering**: reuse the quadratic-Bézier marker placement, dash-pattern-by-type
(`dept_head "4 2"`, `office`/`ex_officio "1.5 3"`, else solid), and the endpoint-glyph vocabulary
(solid/hollow/double triangle, open/double-open chevron) — map India's added `nominates`/`oath`/
`reports_to` types onto the existing glyph slots (e.g. `nominates` → double triangle like `elects`;
`oath` → hollow triangle like `confirms`; `reports_to` → same dash style as `office`).

---

## 4. Realtime pipeline for India

**CivLab's actual (not marketed) model, confirmed empirically**: SSG+ISR on Vercel, revalidated
on-demand by the ingest pipeline finishing a run (not a fixed timer — a 5+ hour unregenerated page
was observed live), plus exactly **one** genuinely dynamic endpoint (`/api/v1/articles`, `MISS`,
serverless, backed by their own article datastore) for search-as-you-type and per-entity news. No
WebSocket/SSE/polling anywhere (the only WS/SSE strings in the bundle are Sentry's SDK, a false
positive). This is good, cheap, and worth copying wholesale as the **base layer**.

**But the task explicitly says "we need it to be realtime" — CivLab does not clear that bar.**
Recommended architecture, layered on top of the same SSG shell:

1. **Ingest workers** (per source, independently scheduled):
   - `indiacode.nic.in` / `egazette.gov.in` — structural/legal scaffold, gazette notifications
     (ministry creation/renaming, appointments requiring gazetting).
   - `sansad.in/ls`, `sansad.in/rs` — MP rosters, committee membership.
   - `eci.gov.in` — election results feeding `elected` nodes/constituencies.
   - `prsindia.org` — bill tracking, committee composition (no public RSS found; needs a
     page-scrape or API-discovery follow-up — sourcing-and-realtime.md §9B).
   - `sci.gov.in` (note: `main.sci.gov.in` failed to resolve in testing; use `www.sci.gov.in`) —
     Collegium recommendations.
   - News/entity-tagging: PIB RSS (**fix the `Lang=1→2` server redirect** that returned Hindi
     content in testing — needs session-cookie/param investigation), The Hindu National RSS
     (confirmed live), Indian Express Political Pulse RSS (confirmed live) — direct 3-source
     parallel to CivLab's {NPR Politics, GovExec, FedNewsNetwork}.
2. **Queue → LLM entity-tagging & scaffold-then-verify legal pipeline**, copying CivLab's proven
   pattern exactly (sourcing-and-realtime.md §6): first-pass LLM scaffold → dated verification
   batches that check each claim against primary legal text and leave a first-person correction
   note when the scaffold was wrong (`repointed_from`/`repointed_reason`), tagged with a
   `{YYYYMMDD}_{topic}_{counter}` batch ID and a `(verified)` tier marker. This audit trail is
   CivLab's single best idea and costs almost nothing to replicate.
3. **Postgres store** with the same provenance-metadata-per-fact discipline CivLab uses
   (`source_url`/`source_table`/`data_year` on every stat, `cite`/`quote`/`basis`/`issue` on every
   edge).
4. **Dual delivery**:
   - Static/ISR shell (Next.js App Router `generateStaticParams` + on-demand `revalidateTag`/
     `revalidatePath` fired by step 2/3 finishing) for the graph/detail pages — cheap, matches
     CivLab's proven cost/perf profile.
   - **New layer CivLab doesn't have**: an SSE or lightweight WebSocket channel (or 15–30s
     short-poll as a fallback) pushing `changes`-feed events (new appointment, vacancy filled,
     personnel departure) to already-open clients, so a visitor watching, e.g., a cabinet
     reshuffle sees it land without a hard refresh. Scope this to the `changes` feed and
     `powerMap`-equivalent trending only — the full graph/layout stays SSG+ISR underneath; only the
     "what's new right now" surfaces need the push layer.
5. **One live read API** (`/api/v1/articles`-equivalent) for per-entity news and search — same
   scope CivLab already validated as worth making dynamic.

---

## 5. Where CivLab is weak — and where India can do better

- **No pan/zoom, fixed deterministic layout.** Works at ~950 nodes; will not work at India's
  multi-tier scale. → Ship zoom/pan + drill-down from day one (§3).
- **Every page re-ships the entire graph** (2.0–2.25MB JSON per detail page on `/us`, confirmed
  identical across department/dept-head/elected/commission pages — data-model.md §7/§10,
  sf-and-product.md §1/§8). A payload-vs-simplicity tradeoff that already looks expensive at 952
  nodes and will not survive a national+36-state+local graph. → Per-entity/per-tier API routes or
  code-split graph data, not one monolithic `pageProps.data`.
- **`connectedNodes`/`children` silently truncate** to a literal `"...N more"` sentinel baked into
  the JSON itself, forcing consumers to reconstruct full adjacency from the raw edge list
  (data-model.md §2f). → Don't truncate in the payload; paginate/lazy-load instead.
- **Not actually realtime** — SSG+ISR with event-driven revalidation, observed 5+ hours stale, no
  push channel at all (render-and-interaction.md §7, sourcing-and-realtime.md §1, sf-and-product.md
  §6, all three independently converging on the same finding). This directly fails the "we need it
  to be realtime" requirement as stated. → §4's push layer.
- **Federal personnel/edge curation looks like dated manual/LLM-assisted batches**, not a scheduled
  automated pipeline with an SLA (contrast with SF's meetings feed, which clearly is automated —
  sourcing-and-realtime.md §5/§6, data-model.md §5). → Formalize as a scheduled agent run with
  defined cadence + alerting, not ad hoc batches, if freshness is a product promise.
- **India-specific structural gap CivLab never had to solve**: a genuine Union/State/Local
  three-tier government model. CivLab's `gov` slug is always one flat government (`us` OR `sf`,
  never nested). → This is the single biggest net-new design problem, addressed in §2 (tier field)
  and §3 (nested sector-angle allocation) — not something to copy, something to build.
- **Marketing (Sanctuary Computer case study) claims "real-time API" + Supabase**, contradicted by
  every empirical header check — treat vendor copy as aspirational, not architectural truth
  (sf-and-product.md §7).
- **Budget "donut" is actually a stacked bar list in the shipped code** (design-system.md §6/§7) —
  if a real donut/sunburst is wanted, that's a genuine opportunity to ship a *better* visualization
  than CivLab, not just parity.
- **No confirmed live-browser verification of hover/press states or any canvas-only UI** (design
  report couldn't open the screen recording; this synthesis pass had the same limitation) — before
  committing to final interaction specs, have someone watch the actual recording.

---

## 6. Contradictions / corrections flagged across the five reports

1. **"Sector-wedge fan" mislabeling.** The computed task brief implied the dark semicircle/wedge
   fan was the "Power map." render-and-interaction.md verifies it is in fact the **main Graph
   view's `us-sectors` layout**; Power Map is a separate, non-radial "river" bubble-packing diagram
   for people-in-the-news. All other reports (data-model, sourcing, design) reference "power map"
   consistently with the corrected meaning — no cross-report disagreement, but a direct
   brief-vs-evidence correction worth carrying forward loudly.
2. **Budget "donut."** sf-and-product.md, following the brief's own language, calls it "the
   budget-donut view referenced in the brief" without independently re-verifying the shape.
   design-system.md explicitly checked the rendering code and found **no arc/pie/conic-gradient
   anywhere** — it's a stacked horizontal-bar list (`#29D8CB`/`#127B74` mini-palette). Treat
   design-system.md as authoritative (it inspected the actual render function); sf-and-product.md's
   phrasing is an unverified carry-over from the brief, not independent confirmation of a donut.
3. **UK-style node-type taxonomy** ("Ministerial Dept," "Executive NDPB," etc.) named in the brief
   does not exist anywhere in CivLab's code, strings, or captured `__NEXT_DATA__`
   (design-system.md §3) — confirmed absent, not a cross-report conflict, but a brief error worth
   not propagating into the India schema (§2 uses US/India-appropriate taxonomy instead).
4. **International clones** (Brazil/Argentina/Italy/Germany/South Africa) named in the brief —
   sf-and-product.md's targeted searches found **zero corroborating evidence**; only the UK
   "Machinery of Government" fan clone (a different author, different domain, not a CivLab
   property) is confirmed. Do not cite the five-country claim without direct verification on
   x.com/m_adams.
5. **`actingOfficials`/`vacantSeats` reconciliation** — data-model.md (§3b/§3c) and
   sourcing-and-realtime.md (§5) each independently mark the gap between raw per-node counts (165
   `acting:true` people; naive `seatsCount − len(people)` gaps) and the curated `changes.stats`
   figures (86; 6) as **INFERRED, not confirmed** by either workstream. Not a disagreement between
   them — both hit the same wall — but flagged because it means **no report actually has the
   reconciliation logic**; if the India build needs this number to be trustworthy, that logic has
   to be designed from scratch, not copied.
6. **Video evidence gap.** The original ask was to "go through this movie carefully." The
   design-system subagent could not open the screen recording (sandboxed macOS temp path); this
   synthesis pass, scoped to the five text reports only, could not attempt it either. Every claim
   in this blueprint about hover states, in-motion easing not present in static CSS, and any
   possible canvas-drawn toolbar copy (the unresolved "Help"/"Focus" controls named in the brief,
   never found in any string search — render-and-interaction.md §6, design-system.md §9) is
   therefore **inferred from static assets, not observed**. Recommend a live-browser or
   recording-review pass before finalizing pixel-level interaction specs.
