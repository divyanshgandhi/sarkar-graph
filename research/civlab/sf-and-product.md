# CivLab Gov Graph — SF product surface, IA, and external context

Scope: this doc covers the `/sf` product surface (beyond the `/us` graph already
dissected elsewhere in `raw/`), the SF budget/contracts data model and its likely
sources, the full route/IA catalogue, UI copy, gov-slug availability, and outside
coverage (press, the UK "Machinery of Government" clone, and the international-copies
claim). Everything is tagged **[VERIFIED]** (I fetched/observed it directly),
**[INFERRED]** (strong circumstantial evidence, not directly confirmed), or
**[UNCONFIRMED]** (claim exists in the wild or in the brief, but I could not find
supporting evidence).

Raw assets saved under `research/civlab/raw/`:
- `sf.html`, `sf_next_data.json`, `sf_next_data_route.json` (`/_next/data/.../sf.json`), `sf_headers.txt`
- `depts/sf_mta.html` + `sf_mta_next_data.json`, `depts/sf_planning.html`, `depts/sf_ethics.html`, `depts/sf_mayor.html`, `depts/sf_commission.html` (404 — see IA notes)
- `topics/sf_housing.html`, `topics/us_housing.html` (404 — US has no topics)
- `request.html` / `request2.html`

---

## 1. Information architecture (SF), verified by direct fetch

| Route | HTTP | pageProps keys | Notes |
|---|---|---|---|
| `/sf` | 200 | `gov, data, overview, news, changes, breadcrumb` | `changes` is **`null`** for SF (personnel-feed feature is US-only right now) [VERIFIED] |
| `/sf/departments/ccsf-municipal-transportation-agency` | 200 | `gov, data, meetings, department, selection, breadcrumb, articles` | `meetings: []` empty for this dept; `articles` is a full-text news list |
| `/sf/departments/ccsf-planning-department` | 200 | same shape | |
| `/sf/departments/ccsf-ethics-commission-2` | 200 | `data, breadcrumb` only (no `gov`/`department`?) — a thinner variant | node id has a `-2` suffix, i.e. SF has two "ethics commission" entities (the commission itself, `ccsf-ethics-commission`, lives under the `commissions` list; `ccsf-ethics-commission-2` is filed as a `department`-typed node — de-dup/typing artifact worth knowing if you replicate their entity model) |
| `/sf/elected/ccsf-mayor` | 200 | `gov, data, elected, members, selection, breadcrumb, articles, meetings` | elected-official page has a distinct shape (`elected`, `members`) vs department page |
| `/sf/topics/housing` | 200 | topic detail page renders | |
| `/sf/commissions/ccsf-ethics-commission-2` | **404** | — | confirms this node is NOT routable under `/commissions/`, only `/departments/` — the commission subtype routing is stricter than the "Known facts" route list implies |
| `/us/topics` , `/us/topics/housing` | **404** | — | **US gov has an empty `topics: {}` object** in its dataset, so the topics routes 404 for `/us` even though they exist in the Next.js route manifest. Topics is a per-gov opt-in feature, not universal. |
| `/request` | 200 | `pageProps: {}` (fully static) | plain lead-gen form, no data |

**Full SF-page route inventory found in rendered `href`s** (`grep href sf.html`):
`/sf`, `/sf/departments/<id>` (×2 seen), `/sf/elected/<id>` (×4: mayor, city-attorney,
board-of-supervisors, sfusd-board-of-education), `/sf/topics`, `/sf/topics/education`,
`/sf/topics/homelessness`, `/sf/topics/housing`, `/sf/topics/public_safety`,
`/sf/topics/transit`. No `/sf/commissions/*`, `/sf/advisories/*`, `/sf/dept-heads/*`, or
`/sf/budget` links appear in the rendered homepage HTML — those routes exist in the
Next.js build manifest (per the "Known facts") but are reached via the graph UI/search,
not via homepage `<a>` tags.

**Architecture finding [VERIFIED], not previously flagged:** every SF sub-page
(department/elected/commission) re-embeds the **entire SF dataset** in
`__NEXT_DATA__.props.pageProps.data` — same `nodes`(~370), `edges`, `budget`, `topics`
object as the `/sf` homepage — not just the selected entity. `depts/sf_mta_next_data.json`
is 1.47 MB despite being "just" one department's page; `pp['data']['budget'].totalSpendingBudget`
on the MTA page is bit-identical to the value on `/sf` itself. This is a real cost/perf
tradeoff worth noting for an India build: they trade payload size (whole-graph SSR
payload on every page, ~800KB–1.4MB gzipped HTML+JSON) for a fully client-side-navigable
graph (the D3 graph component never needs another fetch once one page has loaded).

---

## 2. SF overview page (`/sf`) — data model

`pageProps.data` top-level keys for `sf`: `nodes, edges, constituency, elected,
commissions, advisories, departments, deptHeads, topics, budget`. Compare to `/us`,
which additionally has `satellites, layout:'us-sectors', powerMap` — **SF has no
`powerMap` (no 90-day news-based influence ranking) and no `layout` field** [VERIFIED].
So the "power map" / weekly-heat feature the "Known facts" describe is **US-only**,
not a general product feature yet.

`overview.overviewStats` (the four hero tiles + "This Year" budget card) [VERIFIED]:

```json
{
  "total_advisories": 55, "total_commissions": 51, "total_departments": 54,
  "total_elected": 10,
  "total_actual_employees": 6349.2, "total_budgeted_employees": 34150.76,
  "total_spending_actual": 1919560155.9, "total_spending_budget": 16851826113,
  "budget_diff_vs_last_year": 5.384110434592651,
  "total_residents": 842027, "voter_turnout_percentage": 78.93,
  "current_fiscal_year": 2027
}
```

**`metadata` block — the actual data-source citations, this is the money finding
[VERIFIED]:**

```json
"metadata": {
  "residents": {
    "data_year": 2025,
    "source_url": "https://dof.ca.gov/forecasting/demographics/estimates/e-4-population-estimates-for-cities-counties-and-the-state-2021-2025-with-2020-census-benchmark/"
  },
  "voter_turnout": {
    "data_year": 2024,
    "source_url": "https://sfelections.org/results/20241105w/index.html"
  },
  "spending_actual":  { "fiscal_year": 2027, "source_table": "money.mv_spending_revenue_rollup" },
  "spending_budget":  { "fiscal_year": 2027, "source_table": "money.mv_budget_rollup" },
  "actual_employee_count":   { "fiscal_year": 2027, "source_table": "money.mv_spending_employee_counts" },
  "budgeted_employee_count": { "fiscal_year": 2027, "source_table": "money.mv_budget_employee_counts" },
  "fiscal_year_info": { "fiscal_year_end": "June 30", "fiscal_year_start": "July 1", "current_fiscal_year": 2027 }
}
```

This confirms CivLab runs its **own warehouse with a `money` schema of materialized
views** (`mv_spending_revenue_rollup`, `mv_budget_rollup`, `mv_spending_employee_counts`,
`mv_budget_employee_counts`) — i.e. they ETL upstream city data into Postgres
materialized views and the app reads only from those, not live from the city's API on
each request. For residents/turnout they cite California DOF and SF Elections directly
(no rollup table — these are low-frequency, hand-refreshed figures).

**"This Year" budget card copy** (rendered text, [VERIFIED]): `This Year` /
`2026`–`2027` / `Total Budget $16.85B ↑5.38% from last year` / `Total Revenue $16.85B
↑5.38% from last year` / `City Employees 34,151 ↓3.44% from last year` / `Explore
budget` / `How the budget is made` (the latter links out to
`https://www.writing.civlab.org/p/how-the-sf-budget-is-made?utm_source=govgraph`, a
Substack explainer — **not** a data-methodology post, see §5).

## 3. SF per-department budget object — the donut/rank/contracts data

`data.budget.departments` is a dict of 49 entries keyed by department code (e.g.
`"MTA"`, `"TTX"`). Full schema, verified on MTA (`ccsf-municipal-transportation-agency`)
and TTX (Treasurer & Tax Collector) [VERIFIED]:

```json
{
  "code": "MTA", "name": "...", "nodeId": "ccsf-...",
  "currentBudget":  {"fiscalYear":2027,"totalSpending":1600388355,"totalRevenue":923860093,"net":-676528262,"nonprofitSpending":null},
  "currentActual":  {"fiscalYear":2027,"totalSpending":166622891.22,"totalRevenue":124971097.17,"net":-41651794.05,"nonprofitSpending":0},
  "previousBudget": {...}, "previousActual": {...},
  "budgets": [ /* fiscalYear 2019..2028, one row per year */ ],
  "actuals":  [ /* fiscalYear 2019..2027, one row per year */ ],
  "currentBudgetBreakdown": {
    "fiscalYear": 2027,
    "breakdown": [
      {"category":"Salaries","amount":24732695,"type":"spending"},
      {"category":"Services Of Other Depts","amount":7765632,"type":"spending"},
      {"category":"Mandatory Fringe Benefits","amount":9709679,"type":"spending"},
      {"category":"Non-Personnel Services","amount":6807513,"type":"spending"},
      {"category":"Programmatic Projects","amount":2810000,"type":"spending"},
      {"category":"Materials & Supplies","amount":75049,"type":"spending"}
    ],
    "totalBudget": 51900568
  },
  "contractStats": {
    "activeContracts": 33, "totalContractValue": 151229224.31,
    "totalSuppliers": 32, "nonprofitContracts": 6, "nonprofitSuppliers": 6,
    "nonprofitSpending": 12650000, "medianDurationYears": 5.9958932238193
  },
  "citywideRevenueRanking": {"rank":27,"total":54},
  "citywideSpendingRanking": {"rank":30,"total":54},
  "citywideContractsRanking": {"rank":26,"total":54},
  "citywideNonprofitSpendingRanking": {"rank":19,"total":54},
  "nonprofitFiscalYear": 2026, "nonprofitSpendingAmount": 15266775
}
```

This is exactly the "budget donut + This Year spend/revenue + rank of 54 + yoy% +
active contracts + nonprofit spending + departmental breakdown" surface described in
the brief — `total: 54` is literally `overviewStats.total_departments`, so "rank of
54" = citywide rank among all 54 SF departments, computed independently per metric
(revenue/spending/contracts/nonprofit).

`budget.groups` gives the 7-group rollup used for the SF budget's top-level breakdown
(the "General City Responsibilities / General Administration & Finance / Culture &
Recreation / Community Health / Human Welfare & Neighborhood Development / Public
Works, Transportation & Commerce / Public Protection" codes 01–07, each listing member
department codes) — this is SF's own budget-book grouping (matches the City's Annual
Appropriation Ordinance structure), not a CivLab invention [INFERRED].

**Likely upstream sources for the `money.*` warehouse [INFERRED, not directly
confirmed by CivLab]:**
- `data.sf.gov` (DataSF, Socrata/SODA platform) — specifically the **"San Francisco
  Budget"** dataset (`6pm8-ckfn`) for `mv_budget_rollup`, and the **"Supplier
  Contracts"** dataset (`cqi5-hm2d`) for `contractStats`. Both are real, currently
  published Socrata datasets on `data.sf.gov` under "City Management and Ethics."
- The **SF Controller's Office "OpenBook" / Supplier Payments** dataset for
  `mv_spending_revenue_rollup` (actuals) — the Controller's Office is explicitly the
  publisher of nonprofit-contract and payment data per SF.gov's own documentation, and
  their SODA/OData API is the standard programmatic path.
- Employee counts almost certainly come from DataSF's **"Employee Compensation"** or
  budgeted-positions datasets (not independently confirmed by name).
- I could **not** verify these dataset IDs by name from any CivLab-authored source
  (their own Substack post title "How the SF Budget is Made" is a *civics/process*
  explainer — legislative timeline, Board/Mayor steps, Charter citations — and
  explicitly contains **zero** data-source citations; see §5). The `money.mv_*` table
  names are CivLab's own internal naming, not DataSF's.

## 4. UI copy / IA catalogue (from rendered SSR HTML, text-stripped)

**`/sf` homepage**, in document order [VERIFIED]:
`CivLab · SF Gov Graph` (title) → `CivLab / SF Gov` (breadcrumb) → `Latest News` (4
headline cards, numbered 1–4, each entity-tagged) → `Trending Topics` (`Public Safety,
Housing, Transit, Education` + `View All`) → `People in Focus` (Mayor / Board of
Supervisors / Board of Education, each with a 1–2 sentence blurb + `View profile →`)
→ `Overview` (`Top level metrics for the City and County of San Francisco government,
tracking total entity counts and fiscal data.`) → stat tiles: `Residents* 842,027`,
`Elected 10`, `Commissions 51`, `Advisory 55`, `Departments 54` (the `*` on Residents
is a footnote marker to the DOF source) → `This Year 2026-2027` budget card (see §2)
→ `About` (`We cannot govern systems we don't understand, so we built the first
complete data model of the San Francisco government. Use it to find entities,
spending data, news articles, legal sources, and more!`) → disclaimer `CivLab is not
affiliated with the City and County of San Francisco.` → footer `Built by CivLab for
you` / `Email` / `Twitter` / `Substack`.

**Empty state** (search, appears twice in DOM — likely two breakpoints/components):
`No results found` / `Try simplifying your query or explore popular topics: Homelessness,
Transit, Public Safety, Education, Housing`.

**View-mode tabs** on both the overview and entity pages: `Graph` / `Budget` — this
is the toggle between the D3 relationship graph and the budget-donut view referenced
in the brief. It's a client-side tab (no distinct URL) — same page, same
`__NEXT_DATA__`, view state only.

**Department detail page** (`/sf/departments/ccsf-municipal-transportation-agency`),
tabs: `News` / `Who's connected?` / `Budget` / `Media`. Header shows `5658 Budgeted
Employees`, the department description, `Legal Source` / `Official Website` links, and
the current officeholder card (`Julie Kirschbaum`, `Appointed 2025`). `News` tab is
SSR'd with a full article list (title, date, ~2-sentence dek, source publication, e.g.
`SF Standard`) and a `Load more` pagination CTA. `Budget` and `Who's connected?` tab
bodies are not present in the SSR'd DOM text (client-rendered from the already-embedded
`data.budget` / graph data — see §1 architecture note).

**`/request` page** (fully static, `pageProps: {}`) [VERIFIED], full copy:
`CivLab / Request a Graph` → `SF graph` / `US graph` (links to the two live instances)
→ `Where should we map next? Search your government — or find it on the map.` → footer
`Built by CivLab for you` / `Email` / `Twitter` / `Substack`. This is a lightweight
lead-capture/waitlist page, not a functional request form with fields — it's really a
router into the two existing graphs plus a soft CTA.

## 5. Gov-slug probe — what's actually live

Tested via `curl -o /dev/null -w '%{http_code}'`, desktop Chrome UA [VERIFIED]:

| slug | result |
|---|---|
| `us` | 200 (known) |
| `sf` | 200 (known) |
| `ca`, `nyc`, `uk`, `la`, `tx`, `il`, `ny`, `fl`, `wa`, `chicago`, `nyc-city`, `sfgov`, `federal` | **all 404** |

So **only `us` and `sf` are live today (2026-09-25)**, despite the Next.js
`[gov]`-parameterized route existing for arbitrary slugs and despite public reporting
(see §6) that an NYC graph is "in development" with a collaborator named Golliher — it
is not yet deployed at `graph.civlab.org/nyc` or any guessable slug.

## 6. Caching / "how real-time is this, really" [VERIFIED — directly answers the brief's realtime question]

Response headers on `GET /sf`:

```
cache-control: public, max-age=0, must-revalidate
age: 12240
etag: "15wdf52i73ui1dz"
x-vercel-cache: HIT
x-nextjs-prerender: 1
```

`age: 12240` (≈3.4 hours) on a `HIT` means the page was served from Vercel's edge
cache, built roughly 3.4 hours before my fetch — this is classic **stale-while-
revalidate ISR**, not a live/streaming page. The `changes.generatedAt` field (US gov)
reads `"2026-09-25"` and `data.powerMap.computedAt` reads `"2026-09-25T04:04:10.934Z"`
— a single timestamp, i.e. a **batch job that runs once and stamps the whole payload**,
most likely a nightly/early-morning cron (04:04 UTC) that (a) re-scrapes/re-tags news
and personnel changes, then (b) triggers an ISR revalidation or a redeploy.

**Bottom line for the "we need it to be realtime as well" requirement: CivLab's Gov
Graph is explicitly NOT real-time.** It's SSG+ISR on Vercel with a ~daily batch
pipeline (LLM-tagged news entity extraction, a personnel "changes" feed, and budget
rollups refreshed on some longer cadence tied to fiscal-year data releases, which by
nature update quarterly/annually not daily). The Sanctuary Computer case-study copy
(§7) claims a "real-time API," but that describes their internal Postgres/Supabase
backend serving the *build* pipeline — the public site itself, empirically, serves
hours-old cached HTML. If the India equivalent genuinely needs to be real-time (e.g.
live vote counts, live session status), that is a meaningfully different and harder
architecture than what CivLab shipped — CivLab's "freshness" story is "rebuilt daily
with a visible `changes` feed and dated news," not literal live data.

## 7. Outside coverage & the CivLab team/stack (press + vendor case study)

- **Press**: [IBTimes UK](https://www.ibtimes.co.uk/civlab-ai-map-us-federal-government-1820471)
  and its syndication on [Inkl](https://www.inkl.com/news/civlabs-new-ai-powered-us-gov-graph-tracks-every-position-of-power-across-the-us-federal-government)
  cover the US Gov Graph launch (Sept 16 2026 per the article). Quotable framing from
  Michael Adams: he calls the project **"Palantir for The People."** Per the article,
  **"agents monitor official sources to track every appointment, departure, and
  structural change"** — confirms an agentic/LLM-driven monitoring pipeline feeding the
  `changes` feed (US: 482 orgs — 343 executive, 103 independent, 19 legislative, 17
  judicial — plus 339 sub-agencies, 6 vacant seats, 86 acting officials at time of that
  article; these numbers drift day to day per the `changes.stats` object).
- **CivLab's own Substack** (`writing.civlab.org`, run by Michael Adams):
  - ["Introducing the SF Government Graph"](https://www.writing.civlab.org/p/introducing-the-sf-government-graph) — v1 launch.
  - ["SF Government Graph v2 is Live"](https://www.writing.civlab.org/p/sf-government-graph-v2-is-live) — v2 changelog. Only technical line in the whole post: **"We're using LLMs and other software magic to automate the generation and maintenance of the graph."** V2 additions per the post: richer entity descriptions, employee counts, legal-source links, official-website links, search now covers "entity names, descriptions, service areas, and alternate names like 'SFPD'" (matches the `aliases` field I found on the MTA node: `["MTA","Muni","SFMTA"]`), and "we completely rebuilt the v2 data model so we can track legislative activity, budgets/spending, and more."
  - ["How the SF Budget is Made"](https://www.writing.civlab.org/p/how-the-sf-budget-is-made) — **civics explainer, not a data-methodology post.** Covers the Dec–Aug budget calendar, Charter/Admin Code citations, Board & Legislative Analyst role. Explicitly flagged by the post itself as "part one of a two-part series," with part two promised to cover "where the money goes" (likely the actual sourcing answer — **worth a follow-up fetch once/if published**).
- **["Your Government, Live and in Living Color"](https://www.maximumnewyork.com/p/your-government-live-and-in-living)** (Maximum New York, third-party): confirms an **NYC version is in development**, collaborator named "Golliher," not yet public. Commenter speculates about tracking NYS public-authority bond issuance — a feature request, not shipped.
- **["Mapping San Francisco's Government"](https://garden3d.substack.com/p/mapping-san-franciscos-government)** (garden3d, design studio) — turned up in search but not fetched in depth; garden3d and **Sanctuary Computer** are both named as build partners.
- **Sanctuary Computer case study** (`sanctuary.computer/work/civlab`) — vendor marketing copy, treat as [UNCONFIRMED]/self-reported, but concrete and directly useful as an architecture hypothesis: **Next.js + D3 + Tailwind** frontend; **Postgres** backend with an **"authenticated API"**; deployed on **Vercel**; uses **Supabase**; "AI-powered tagging pipeline identifies departmental responsibility across topics"; graph component built as "a portable package that can be embedded into any JavaScript application" (private npm package, not public). Team credits: **XXIX, Parker Kaufmann, Conor Davidson** (plus Michael Adams as founder). This matches everything independently observed (Next.js pages router, Vercel headers, D3-shaped graph JSON, topic-tagging on news).

### The UK "Machinery of Government" clone
[VERIFIED existence, separate project — not a CivLab property]. Built by **Harry
Rushworth** (`@hrushworth`, site `machineryofgovernment.uk`), explicitly **inspired
by** CivLab's SF graph per his own launch tweet ("Such is [the UK government's]
complexity that there isn't an org chart for it... Introducing ⚙️Machinery of
Government⚙️"). It is a fan-built clone of the *concept*, not a CivLab product, and not
running on the same `graph.civlab.org/[gov]` infrastructure (own domain). I could not
retrieve the page's actual content (fetch returned only the title, likely a
client-heavy/blocked SSR), so I can't compare its data model or visual format directly
— flag for a follow-up direct browser check if that detail matters.

### Brazil / Argentina / Italy / Germany / South Africa copies
**[UNCONFIRMED — could not find any evidence].** Multiple targeted searches (direct
name search, "civlab inspired clone," combined with each country name) surfaced **no
sources** describing gov-graph copies for these five countries. This detail was in the
computed task brief as something "mentioned by Michael Adams," but nothing in his
Substack posts, the press coverage, or general web search corroborates it. Treat this
as either (a) a private/DM mention not publicly indexed, (b) a stale/incorrect premise
in the brief, or (c) something that would require directly reading Michael Adams's
X/Twitter timeline (not fetched — X content is generally unreachable to WebFetch/
WebSearch tooling) to confirm. **Recommend verifying directly on x.com/m_adams before
citing this in any internal deck.**

## 8. What to borrow / what to do differently for an India build

- **Do borrow:** the `money.<domain>.mv_*` rollup-table pattern (decouple slow-changing
  upstream open-data ingestion from fast page-serving reads); the `metadata` block
  pattern that cites `source_url`/`source_table` + `data_year`/`fiscal_year` per stat
  (cheap trust-signal, easy to replicate); per-entity `aliases` for search (`MTA, Muni,
  SFMTA`); the `topicsWithRelevance` tagging so one department can surface under
  multiple citizen-facing topics; the explicit "CivLab is not affiliated with the
  City and County of San Francisco" disclaimer as a legal-safety pattern for an
  unofficial civic-data project.
- **Do differently:** don't copy the "ship the entire graph JSON on every subpage"
  pattern if the Indian dataset is bigger than SF's ~370 nodes (952 nodes for /us
  already makes `us_next_data.json` 2.1MB — a state/national Indian graph would be
  larger; consider per-entity API routes or code-split graph data instead of one
  monolithic `pageProps.data`). Also don't oversell "real-time" — CivLab's own
  product is honestly a **daily-batch ISR site with a visible changelog**, not a
  live feed; if "realtime" is a hard requirement for the India product, budget for a
  genuinely different architecture (websocket/polling layer over the same rollup
  tables) rather than assuming CivLab already solved that problem.
