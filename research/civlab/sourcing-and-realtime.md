# CivLab Gov Graph — Sourcing & Realtime Pipeline (reverse-engineered)

Scope: `graph.civlab.org/us`, built by Michael Adams (@m_adams) / CivLab. All claims below are tagged **[VERIFIED]** (directly observed in downloaded assets/headers/responses saved under `research/civlab/raw/`) or **[INFERRED]** (reasoned from evidence but not directly confirmed).

---

## 1. Page delivery: SSG + long-lived ISR, not truly realtime on the page itself

**[VERIFIED]** Two `curl` requests to `https://graph.civlab.org/us` five seconds apart, desktop-Chrome UA:

```
age: 18642            →  age: 18647   (+5, matching the 5s gap — pure CDN age counter)
x-vercel-cache: HIT    →  x-vercel-cache: HIT
etag: "9unb8nqvvg18w85" (identical)
cache-control: public, max-age=0, must-revalidate
x-nextjs-prerender: 1
date: Fri, 25 Sep 2026 04:04:17 GMT   (frozen — origin generation time, not request time)
```
Body byte-identical (`md5` match). `age≈18,645s ≈ 5h11m` at request time, i.e. the page had **not been regenerated in over 5 hours** even though `cache-control: max-age=0, must-revalidate` (that header only governs browser/proxy revalidation of the *edge* copy — Next's ISR `revalidate` window is separate and server-side).

The embedded payload timestamps corroborate this:
- `data.powerMap.computedAt = "2026-09-25T04:04:10.934Z"` — matches the frozen `Date` header almost to the second → **this is the moment the page was last statically regenerated**, i.e. the moment `getStaticProps` last ran (either on a timed ISR revalidation or an on-demand revalidation webhook fired after the backend pipeline finished a run).
- `changes.generatedAt = "2026-09-25"` — date-only granularity, i.e. the personnel-changes feed is (re)computed on a coarser (daily) cadence than the powerMap news score.

**[INFERRED]** Given (a) a >5h gap with zero regeneration, (b) `computedAt` precise to the millisecond (looks like a pipeline job's `datetime.now()` stamp, not a cron-fixed schedule), and (c) `changes.generatedAt` truncated to a date, the most likely architecture is:
- A backend job (not the Next.js app) periodically ingests news/personnel data on its own schedule (news/powerMap: probably every few hours; personnel/legal edges: daily or on manual batch completion — see §4).
- After each pipeline run it calls Vercel's **on-demand ISR revalidation API** (`res.revalidate()` / `/api/revalidate`) for the affected `gov` pages, rather than relying on a fixed `revalidate: N` polling interval. That explains why the page can sit unrefreshed for 5+ hours with no fixed periodicity visible.
- This is *not* realtime in the "push to browser" sense — a visitor loaded the app at any point in that 5h window would see 5-hour-stale numbers. **The one part of the site that genuinely is live is the `/api/v1/articles` search endpoint (§2)** — everything else is SSG+ISR batch data.

## 2. There IS a live client-side API — `/api/v1/articles`

**[VERIFIED]** Grepping the downloaded bundles for `fetch(` / `/api/`:

```
_app-c257799aa32ed36c.js:  "/api/v1/articles"
request-755f09ad47795141.js: "/api/v1/graph-requests"
main-c84da297143498e2.js: "/api/"
```

Decompiled call site (`_app` chunk):
```js
let nx = { search: async e => nv.L({
    method: "GET",
    url: "/api/v1/articles",
    params: { limit: e.limit, offset: e.offset,
              query: "query" in e ? e.query : void 0,
              govEntityId: "govEntityId" in e ? e.govEntityId : void 0,
              topicId: "topicId" in e ? e.topicId : void 0 }
})};
```
Live request (`curl`, desktop UA):
```
GET https://graph.civlab.org/api/v1/articles?limit=3&offset=0&govEntityId=us-census-bureau
→ 200, server: Vercel, x-vercel-cache: MISS, x-matched-path: /api/v1/articles
→ body: {"articles":[{"id":603192348840291000,"url":"https://www.npr.org/...",
          "date":"2026-09-24","title":"Warren demands Trump officials...",
          "content":"<article class=\"story\">...<full scraped NPR HTML>..."}]}
```
This is a genuinely dynamic (`MISS`, no ISR headers) Vercel serverless/edge function backed by their own datastore of **full scraped article HTML** (not RSS excerpts — the response contains NPR's own markup, `storytext`, `slug-wrap` classes etc., meaning CivLab fetches and stores full article bodies server-side after ingestion, then serves them back on demand). `id` values are large integers (`603192348840291000`), consistent with a Postgres bigint/snowflake-style PK, not an RSS GUID.

A second endpoint, `/api/v1/graph-requests` (used on `/request`, the "request a government to be added" page), returns `{requests:[{id,count}]}` vote counts — unrelated to the graph data itself, just a feature-request tally.

**No WebSocket/SSE/GraphQL subscriptions, no Supabase/Firebase, no SWR/react-query.** The only `WebSocket`/`EventSource` string hits in the bundle are inside Sentry's browser SDK integration list (`td=["EventTarget","Window",...,"EventSource",...,"WebSocket",...]`, breadcrumb auto-instrumentation) — **[VERIFIED] false positive, not app functionality.**

## 3. News sourcing — 3 real RSS feeds, all still live today

**[VERIFIED]** `sources: ["NPR Politics", "Government Executive", "Federal News Network"]`, `articleCount: 1080` over a 90-day window (`windowDays: 90`, `since: "2026-06-28"`). Matching, currently-resolving RSS feeds (curl'd just now):

| Publication | RSS URL | HTTP | Feed `<title>` |
|---|---|---|---|
| NPR Politics | `https://feeds.npr.org/1014/rss.xml` | 200 | "NPR Topics: Politics" |
| Government Executive | `https://www.govexec.com/rss/all/` | 200 | "Government Executive - All Content" |
| Federal News Network | `https://federalnewsnetwork.com/feed/` | 200 | "Federal News Network" |

(NPR also 301-redirects `www.npr.org/rss/rss.php?id=1014` to the same feed; GovExec exposes topical variants like `/rss/management/`, `/rss/technology/` — CivLab's "All Content" choice (`/rss/all/`) is consistent with ingesting everything and filtering by entity tag downstream rather than subscribing per-topic.)

**[INFERRED]** Pipeline: RSS poll (probably hourly-ish, unverified) → dedupe/store → fetch full article HTML (confirmed happening, see §2's response body) → LLM entity-tagging pass (§3b) → powerMap aggregation (§4).

### 3b. `<gov_entities>` tagging — LLM-tagged, high confidence

**[VERIFIED]** Every news summary embeds inline tags like:
```
"Sen. Elizabeth Warren demands Commerce Secretary Howard Lutnick explain the removal of a ban on political interference in <gov_entities='us-census-bureau'>Census Bureau</gov_entities> data."
```
This is not a generic NER/NLP library output pattern (spaCy etc. wouldn't natively resolve free text to *your own graph's internal slug IDs* like `us-census-bureau`) — it requires a model with the graph's ~952-node ID space in context (via retrieval/tool-use or a fine-tuned/prompted classifier), producing both (a) the *summary text itself* (clearly abstractive, not extracted verbatim from the source article — compare to the NPR HTML fetched in §2, which is a full article, while the summary is a compressed 1-2 sentence gloss) and (b) precise entity-ID grounding inline. This combination — abstractive summarization *and* graph-ID-grounded entity linking in one pass — is the signature of an LLM prompted with (or fine-tuned/RAG'd against) the entity catalog, not a classic rule-based tagger. **[INFERRED — high confidence, not directly confirmed by CivLab.]**

The public record corroborates the general LLM-pipeline claim even if it doesn't confirm this exact mechanism: Michael Adams' SF Gov Graph v2 post states plainly: *"We're using LLMs and other software magic to automate the generation and maintenance of the graph"* and *"Using LLMs, our small team was able to aggregate and process an enormous amount of data."* (writing.civlab.org). The IBTimes UK coverage of the US launch adds: *"agents monitor official sources to track every appointment, departure, and structural change in the graph."*

## 4. `powerMap` heat/rank — formula fully reverse-engineered **[VERIFIED — exact fit]**

Each of the 20 `people` entries carries `total` (90-day mention count), `recent` (mentions in the most recent weekly bucket = `weeks[-1]`), a 12-element `weeks[]` array (`sum(weeks) == total` for every person, confirmed), and `heat`.

Fitting across all 20 people:

```
heat = (recent / total) × (windowDays / 7)      # windowDays = 90 → constant = 90/7 = 12.857142857142858
```

Verification (exact float match, not approximate):
- Trump: recent=13, total=241 → 13/241×90/7 = **0.6935388263189093** ✓ (matches payload exactly)
- Mike Johnson: recent=12, total=77 → 12/77×90/7 = **2.0037105751391464** ✓
- Walkinshaw: recent=13, total=20 → 13/20×90/7 = **8.357142857142858** ✓
- Every `recent=0` person has `heat=0` exactly (Blanche, Collins, Tillis, Stevens, RFK Jr., Paul, Cassidy, Bondi). ✓

**Interpretation**: `heat` is a *trending ratio* — this week's mention rate divided by the person's own 90-day average weekly mention rate. `heat=1` means "as hot as their own baseline," `heat>1` means trending up, `0` means silent this week regardless of historical volume. `rank` is a separate field (simple descending sort by `total`, not by `heat` — Trump=rank 1/total 241, but Walkinshaw with heat 8.36 is rank 12/total 20, so **rank ≠ heat-sorted**, rank is raw-volume sorted).

## 5. Personnel `changes` feed — batch-ID sourcing, mixed verification tiers

**[VERIFIED]** `changes.items[].sourceUrl` is **not always a URL**. Sampling all 69 items' `sourceUrl`-equivalent field (found instead in `node_type_samples.json`'s edge-metadata `source` field, and directly in the `changes.items` batch IDs like `20260916_uscirf_399`, `20260916_acting_sweep_396`) shows two families:

1. **Internal batch IDs**: `{YYYYMMDD}_{topic-slug}_{running-counter}`, e.g. `20260916_uscirf_399`, `20260916_acting_sweep_396`, `20260909_confirmee_starts_386`, `20260909_ls2_seat_tenures`, `20260908_phase_d3_seats`. The trailing counters (`386`, `396`, `399`, `404`) increment across batches run on nearby dates — **[INFERRED]** this is an internal research/ticket sequence number (possibly a monotonic ID across all edits ever made to the graph, not scoped per-batch), consistent with a pipeline that logs every change as a numbered unit of work.
2. **Real external citations**, seen directly as `sourceUrl`/edge `metadata.source`/`metadata.url` values: `congress.gov/nomination/119th-congress/{id}` (Senate PN confirmations), agency press releases (`nist.gov`, `dol.gov`, `usda.gov`, `tsa.gov`, `amtrak.com`), Wikipedia, law-firm/trade-press writeups (`natlawreview.com`, `news.bloomberglaw.com`, `eenews.net`), a Wayback Machine capture (`rd.usda.gov leadership (wayback 2026-07-24, verified)`), and manually-annotated tiers like `"House Natural Resources testimony 2026-07-14 (verified)"`, `"cdfifund.gov announcement 2026-08-25 (verified)"`. The `(verified)` / `(verified live 2026-08-26)` suffixes are a **[VERIFIED]** human/LLM-QA annotation convention baked into the data — confirming a verification pass separate from initial sourcing.

`changes.stats = {vacantSeats: 6, actingOfficials: 86, lastChangeDate: "2026-09-16"}` — simple rollups over the `items` array (`vacantSeats` = count of currently-vacant `positionId`s inferable from tenure-end items with no successor; `actingOfficials` = count of currently-serving `entryMode: "acting"` people; both **[INFERRED]** computed, not separately sourced).

## 6. Legal/authority sourcing (`legalSourceUrl`) and "complete-government scaffold" — the big find

**[VERIFIED]** Every graph *node* (department/commission/elected body) can carry `legalSourceUrl`, e.g.:
- `us-electorate` → `https://constitution.congress.gov/`
- `us-congress` → `https://constitution.congress.gov/constitution/article-1/`
- `us-judicial-conference-of-the-united-states` → `https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title28-section331`
- `us-children-s-bureau` → `https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title42-section191...`
- `us-council-of-economic-advisers` → `https://fraser.stlouisfed.org/title/employment-act-1946-1099` (FRASER — St. Louis Fed's historical-document archive, used for citing the original 1946 Employment Act)

More importantly, every graph **edge** (`appoints`/`confirms`/`elects`/`ex_officio`/etc.) carries a `metadata` object whose contents amount to a shipped LLM research/audit trail:

```json
{
  "id": "2bb6d5ed", "type": "appoints",
  "fromId": "us-president-of-the-united-states",
  "toId": "us-administrator-of-the-office-of-juvenile-justice-and-delinquency-prevention",
  "metadata": {
    "url": "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title34-section11111&num=0&edition=prelim",
    "cite": "34 U.S.C. 11111(b)",
    "note": "Scaffold said Attorney General; the statute says the President alone (Pub. L. 112-166 struck advice and consent, effective 60 days after Aug. 10, 2012, per the effective-date note on the same page). ...",
    "basis": "statute", "issue": "243", "quote": "The Office shall be headed by an Administrator ... appointed by the President ...",
    "source": "20260909_wave_appointer_cites",
    "repointed_from": "us-attorney-general",
    "repointed_reason": "complete-government scaffold proposed this appointer; the cited clause names another"
  }
}
```

Observed `metadata.source` values across the 1,433 edges (counted): `null` (872, unsourced/implicit), `"complete-government scaffold"` (172), `"20260908_phase_d3_seats"` (143), `"20260909_wave_appointer_cites"` (81), `"phase-d1 2026-09-06"` (79), `"20260909_seat_coverage_264"` (29), `"phase-d2 2026-09-07"` (20), `"20260909_joint_chiefs"` (10), `"decision-26"` (4), plus one-off direct citation URLs and raw U.S. Code section numbers used as the source value itself.

**This is direct, verified evidence of the build process**, not inference:
1. A first pass — **"complete-government scaffold"** — generated a *plausible but unverified* skeleton of the entire government (who-appoints-whom), almost certainly LLM-drafted from general knowledge.
2. Dated **"phase"/"wave" batches** (`phase-d1 2026-09-06`, `phase-d2 2026-09-07`, `phase-d3_seats` 2026-09-08, `wave_appointer_cites` 2026-09-09, `joint_chiefs`, `seat_coverage_264`) then went back through the scaffold **verifying each edge against primary legal text** (U.S. Code via `uscode.house.gov`, Constitution via `constitution.congress.gov`, agency press releases, `govinfo.gov`), attaching literal `quote`s and a `basis` classification (`statute` / `announcement` / inferred).
3. Where the scaffold's guess was **wrong**, the correcting batch left a first-person research note admitting the error and explaining the fix — e.g. *"Scaffold's Secretary of Agriculture is wrong. The task hint's 6971(c) is the wrong subsection (c is the Chief Scientist); NIFA is subsection (f)..."* — and recorded `repointed_from` / `repointed_reason`. The phrase **"The task hint's ... is the wrong subsection"** is an LLM agent narrating its own correction of a prior prompt/tool hint — about as direct a fingerprint of an autonomous LLM research/QA loop as you'll find in a public payload.
4. `issue` numbers (`243`, `264`, `322`, `404`) look like a ticket/tracking system spanning multiple correction batches, i.e. specific edges were flagged as open issues and resolved in later dated batches.
5. Edge cases got explicit shape annotations: `"shape": "no fixed number of judges; no seat rows"`, `"shape": "group"` (self-electing bodies like the FEC electing its own chair), `"self_selection": true` (House electing its own Speaker), `"via": "Capitol Police Board (...)"` (indirect appointer chains), `"simplified": true` (deliberately collapsed a multi-body appointer into one node "for rendering").

**Bottom line**: CivLab's pipeline is verifiably a scaffold-then-verify LLM research workflow with statute-level citation checking and a self-correcting audit trail, run in dated batches over roughly a week (Sept 4–17, 2026) before the Sept 16 public launch — and remnants of the agent's own reasoning notes shipped in the public JSON.

## 7. Image sourcing

**[VERIFIED]**, three tiers observed in `node_type_samples.json` / `us_next_data.json`:
- **Official portraits (Wikimedia)**: `upload.wikimedia.org/wikipedia/commons/...` (Trump's official portrait, Marine Commandant, etc.)
- **Congressional headshots**: `unitedstates.github.io/images/congress/225x275/{bioguideID}.jpg` — the open-source `unitedstates/images` project keyed by Congressional Bioguide ID (e.g. `T000250.jpg` = Thune).
- **Agency-hosted headshots**: pulled straight from `.gov` sites, e.g. `acf.gov/sites/default/files/styles/bio/public/images/main/Alex-Adams-headshot.jpg`.
- **CivLab's own static assets** for group/department photos: `/gov_group_pictures/{node-id}.jpg` (e.g. `/gov_group_pictures/us-congress.jpg`) — self-hosted, likely curated once per entity rather than scraped live.

## 8. Public story corroboration (WebSearch/WebFetch)

- **Launch**: Michael Adams announced US Gov Graph on X, Sept 16, 2026, calling it *"a complete map of the people and positions of power in the federal government"* and *"Palantir for The People."* Scope at launch: 482 federal organizations (343 executive, 103 independent, 19 legislative, 17 judicial). — [IBTimes UK](https://www.ibtimes.co.uk/civlab-ai-map-us-federal-government-1820471)
- **SF Gov Graph v2** (predecessor, Dec 2024 per the writing.civlab.org post): *"We're using LLMs and other software magic to automate the generation and maintenance of the graph."* / *"Using LLMs, our small team was able to aggregate and process an enormous amount of data."* Data scope there: entities, budgets by department, meetings, news. — [writing.civlab.org/p/sf-government-graph-v2-is-live](https://www.writing.civlab.org/p/sf-government-graph-v2-is-live)
- **CivLab** self-describes as a nonprofit whose mission is *"using AI to model and monitor every government in America."* — [IBTimes UK](https://www.ibtimes.co.uk/civlab-ai-map-us-federal-government-1820471), [writing.civlab.org](https://www.writing.civlab.org/)
- Michael Adams' essay history (`writing.civlab.org`) traces the project from a manually-drawn SF org chart (July 2023) → hand-compiled entity list (June 2024) → LLM-automated v2 (Dec 2024) → federal-scale US Gov Graph (Sept 2026), i.e. a multi-year progression from manual to LLM-agentic, which matches the batch/phase/issue evidence in §6 (a mature, tooled internal pipeline by the time of the US launch).
- No public technical writeup discloses the specific model, exact RSS list, or `/api/v1/articles` architecture — everything in §1–7 beyond the public essays was reverse-engineered from the live site, not disclosed by CivLab.

Sources: [IBTimes UK](https://www.ibtimes.co.uk/civlab-ai-map-us-federal-government-1820471) · [writing.civlab.org (Substack)](https://www.writing.civlab.org/) · [SF Government Graph v2 is Live](https://www.writing.civlab.org/p/sf-government-graph-v2-is-live) · [Introducing a New Type of Civic Tech](https://www.writing.civlab.org/p/introducing-a-new-type-of-civic-tech)

---

## 9. Recommended equivalent pipeline for an India Gov Graph

Mirroring CivLab's architecture (SSG+ISR shell, live search API, RSS-fed LLM tagging, scaffold-then-verify legal sourcing, dated batch/issue tracking) mapped to Indian sources. RSS/endpoint availability **checked live with curl just now** (2026-09-25):

### A. Structural/legal scaffold (equivalent to `legalSourceUrl` + scaffold-then-verify)
- **Constitution of India** text/articles: `constitution.congress.gov`-equivalent is `https://www.indiacode.nic.in/` (Ministry of Law & Justice, has the Constitution + Bare Acts) — use for `legalSourceUrl` on constitutional bodies (Parliament, ECI, judiciary).
- **eGazette** (`https://egazette.gov.in/`) — **[VERIFIED live, 200 after redirect to session-ID URL]** — for notifications creating/amending ministries, departments, statutory bodies, and gazetting appointments (Secretary-level IAS postings, Governor/tribunal appointments). This is India's closest analogue to the Federal Register citations CivLab uses.
- **PRS Legislative Research** (`https://prsindia.org/`) — **[VERIFIED live, 200]** — best source for bill-tracking, committee composition, and plain-English statute summaries; no discoverable public RSS on the current site (`/rss.xml`, `/feed` both 404 — would need to check for an API or scrape bill-tracker pages directly).

### B. Elected/appointed office holders (equivalent to `elected`/`dept_head`/`commission` nodes)
- **Lok Sabha** (`https://sansad.in/ls`) and **Rajya Sabha** (`https://sansad.in/rs`) — **[VERIFIED live, 200]** — member rosters, committee memberships (`sansad.in` is the unified 2023+ parliament portal replacing `loksabha.nic.in`/`rajyasabha.nic.in`, which are now unreliable — `loksabha.nic.in/rss.aspx` timed out/failed to resolve in this test).
- **Election Commission of India** (`https://www.eci.gov.in/`) — **[VERIFIED live, 200 after redirect to www]** — for election results feeding the `elected` node type (MPs/MLAs) and constituency data; RSS discovery page (`/rss`) resolves but its actual feed links need a follow-up crawl (didn't find a bare `.xml` link in the page HTML on first pass).
- **DoPT / Cabinet Secretariat** press releases for IAS/IPS postings and Secretary-rank appointments (civil-service equivalent of CivLab's `dept_head` appointment tracking) — via PIB (below), since DoPT itself doesn't publish RSS.

### C. News ingestion for `powerMap`-equivalent trending + entity tagging
All three checked live just now:

| Source | RSS URL | Status |
|---|---|---|
| Press Information Bureau (PIB) | `https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3` | **200 (resolves, but server 302-redirects `Lang=1`→`Lang=2` server-side — needs a session-cookie/param investigation to force English output reliably; content returned was Hindi in this test)** |
| The Hindu (National) | `https://www.thehindu.com/news/national/feeder/default.rss` | **200, confirmed "India Latest News" feed** |
| Indian Express (Political Pulse) | `https://indianexpress.com/section/political-pulse/feed/` | **200, confirmed "Political Pulse" feed, live headlines** |

This gives a direct 3-source parallel to CivLab's {NPR Politics, GovExec, FedNewsNetwork} mix: one official-government wire (PIB, ≈ Federal News Network's beat-reporter role) + two national politics desks (The Hindu National, Indian Express Political Pulse, ≈ NPR Politics). For entity tagging, replicate §3b's approach: prompt an LLM with the full node-ID catalog (department/politician slugs) per article and ask for inline `<gov_entities>`-style spans plus an abstractive 1-2 sentence summary — same architecture, swap the entity catalog.

### D. Personnel-change feed (equivalent to `changes`)
- **PRS + PIB + eGazette** triangulation for the "who got appointed/removed" feed, since India has no single Senate-PN-confirmation-style tracker; **Rajya Sabha nomination lists** (for Governor-nominated seats), **Cabinet Committee on Appointments (ACC) orders** (published via PIB/gazette, not a dedicated feed), and **Supreme Court/High Court Collegium recommendations** (`https://main.sci.gov.in/` — **DNS/connect failed in this test, likely IP-geofenced or blocking non-browser UAs; will need a browser-driven fetch or different endpoint, e.g. `https://www.sci.gov.in/` which returned 200**) round out the judiciary equivalent of CivLab's `confirms`/`appoints` edges.
- Keep CivLab's batch-ID + `(verified)`-tag convention (§5/§6) — it's a cheap, effective audit trail for an LLM-assisted pipeline and should be replicated directly: `{YYYYMMDD}_{topic}_{counter}` source IDs, `basis: statute|announcement|inferred`, `repointed_from/reason` when a scaffold guess is corrected.

### E. Realtime posture recommendation
Copy CivLab's actual (not marketed) model, since it works and is cheap:
1. **SSG+ISR page shell** (Next.js or equivalent) regenerated via **on-demand revalidation** triggered by the ingestion pipeline's completion (not a blind timer) — avoids paying for a rebuild when nothing changed, and avoids the multi-hour staleness CivLab currently has by making revalidation event-driven rather than interval-based if true "realtime-ish" freshness matters to the India use case.
2. **One live serverless search/read endpoint** (`/api/v1/articles`-equivalent) for anything that needs to feel live in the UI (search-as-you-type, per-entity news), backed by your own Postgres/whatever store of ingested full-text articles — this is the one part of CivLab's stack that's genuinely dynamic, and it's a small, cheap surface to build.
3. Explicit **provenance metadata on every edge/fact** (source batch ID, citation URL/quote, verification tier) from day one — CivLab's biggest defensible asset is that every "X appoints Y" claim can be traced to a statute quote, and that data model choice is what let them catch and fix their own LLM scaffold's mistakes in public.

---

**Raw evidence** (all under `research/civlab/raw/`):
- `us_next_data.json`, `node_type_samples.json` — full embedded dataset + representative nodes per type.
- `js/_app-c257799aa32ed36c.js`, `js/request-755f09ad47795141.js`, `js/main-c84da297143498e2.js`, `js/546-dc4533b299746cb7.js` — downloaded bundles referenced above (`/api/v1/articles`, `/api/v1/graph-requests`, Sentry WebSocket/EventSource false-positive, revalidate strings).
- `js/_buildManifest.js` — route-to-chunk map confirming shared chunk `546-...js` backs every `[gov]` route.
