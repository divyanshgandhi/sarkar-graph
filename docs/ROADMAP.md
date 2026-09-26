# Sarkar Graph — Roadmap

_As of 2026-09-25. Direction and principles are in [`VISION.md`](VISION.md); the current dataset is described in [`DATA_COVERAGE.md`](DATA_COVERAGE.md); the itemised backlog is [`exports/gaps.csv`](../exports/gaps.csv)._

**How to read this.** Each milestone has a scope, the sources it draws on, the method (watchers propose, humans verify), measurable acceptance criteria, and the contributor tracks and good first issues that unlock it. Dates are targets that assume a growing contributor base; a milestone is "done" when its acceptance criteria are met and the numbers are published in `DATA_COVERAGE.md`. Names are Hindi words with a gloss, so releases are easy to talk about.

## Reference: verification tiers and freshness SLAs

| Tier | Meaning | `confidence` | Shown as |
|---|---|---|---|
| T0 | proposal from a watcher or LLM scaffold | — (lives in `data/proposals/`) | never rendered |
| T1 | one source, possibly secondary (Wikipedia, press) | `low` / `medium` | "not yet verified" badge |
| T2 | primary source dated within the current term, checked by a second person or an independent fetch | `high` | plain |
| T3 | T2 and sampled in a published accuracy audit | `high` + audit flag | plain, with audit link |

| Class of fact | Freshness SLA (event → live) | Measured how |
|---|---|---|
| Union apex, Council of Ministers, Cabinet Secretary, service chiefs, CJI/SC judges, CEC | ≤ 24 h | watcher log timestamp vs. build timestamp |
| State Governor/LG, CM, ministers, Chief Secretary, DGP, HC Chief Justices | ≤ 72 h | same |
| MPs, MLAs/MLCs (by-elections, resignations, disqualifications) | ≤ 7 days | ECI/Bulletin date vs. build |
| Secretaries, heads of bodies, CPSE boards, regulators' members | ≤ 7 days | Gazette/PIB/PESB date vs. build |
| District DM/SP/CEO ZP, municipal heads | ≤ 14 days | order date vs. build |
| Budgets, audits, statistics | ≤ 30 days from publication | publication date vs. build |
| News, power map | ≤ 1 h | ingest cron |

## Watcher catalogue (scheduled agents; all output is T0 until reviewed)

| Watcher | Source | Cadence | Produces | From |
|---|---|---|---|---|
| `pib` | PIB RSS (`RssMain.aspx?ModId=6&Lang=1&Regid=3`; fix the `Lang` redirect) | hourly | appointment/oath/cabinet-decision candidates tagged to positions | v0.2 |
| `egazette` | eGazette search (Part I s.1, Part II s.3(ii); Extraordinary) | daily | classified notifications → change-event proposals with PDF citation | v0.3 |
| `sansad-ls-members` | `sansad.in/api_ls/member?loksabha=18` | daily | diff of 543 seats (party, status, vacancy) | v0.2 |
| `wiki-tripwire` | Wikipedia/Wikidata recent changes on tracked office pages (P39) | hourly | "something changed here, go verify" — never a source | v0.2 |
| `rashtrapati` | presidentofindia.gov.in press releases | daily | Governors, judges' warrants, Presidential appointments | v0.3 |
| `doj-judges` | DoJ notifications + monthly vacancy statements; sci.gov.in collegium resolutions | daily/monthly | judge appointments, transfers, vacancies, pipeline stages | v0.3 / v0.8 |
| `pesb` | PESB vacancy circulars and selection results | weekly | CPSE board-level changes | v0.3 |
| `exchange-filings` | BSE/NSE corporate announcements for listed CPSEs and PSBs | daily | director appointments/cessations with dates | v0.3 |
| `state-gazette-<code>` | online State gazettes (≈10 States) | daily | State appointments, transfers | v0.4 |
| `state-gad-<code>` | GAD transfer/posting order PDFs | daily | IAS/IPS postings → Transfer Tracker | v0.5 |
| `eci` | ECI press notes, by-election schedules, `results.eci.gov.in` | daily; live on counting days | seat changes, election calendars | v0.4 |
| `sec-<code>` | State Election Commission results and schedules | weekly | ULB/panchayat election dates → Overdue Democracy | v0.5 |
| `district-whoswho` | NIC S3WaaS district sites (`/whos-who/`; present on 3 of 5 probed) | weekly | DM/SP/CEO ZP names | v0.5 |
| `sansad-activity` | `/api_ls/question`, `/api_ls/debate`, `/api_ls/committee`, LS/RS Bulletins | daily in session | questions, debates, sittings, membership | v0.6 |
| `budget` | indiabudget.gov.in statements, State budget PDFs/XLS, Open Budgets India | on publication | BE/RE/actuals per demand | v0.7 |
| `scheme-mis` | MGNREGA, PMAY-G, PM-KISAN, JJM, NHM dashboards | weekly | district-level series | v0.7 |
| `news` | 7 English feeds + regional-language feeds | every 15 min | archive, tags, power map | shipped / v0.4 |

Watchers run on GitHub Actions cron by default; sources that block non-Indian or non-browser clients (DoPT, several `nic.in` hosts) need an India-hosted runner — an open infrastructure decision.

---

## v0.1 — "Pehla Naksha" (first map) — shipped 2026-09-25

**What exists.** Next.js 16 / React 19 app; Union wheel + 36 State/UT wheels; entity panel (holder, "how this seat is filled", connections, hemicycle, news, budget, provenance); Power map; States cartogram; search; dark mode; mobile; SSE live layer over 7 feeds and a ~26,000-article archive; `pnpm graph` compiler with corrections overlay; exports (`people.csv`, `sources.csv`, `gaps.csv`); `DATA_COVERAGE.md`, `SOURCING_POLICY.md`, `CONTRIBUTING.md`, issue and PR templates, ingest workflow draft.

**Numbers.** 6,268 nodes · 7,774 seats · 7,588 named holders · 6,403 people · 7,851 sources (6,005 encyclopedia, 1,467 official, 284 other, 95 press) · 3,404 gaps (1,078 `tenure_start_unknown`, 1,043 `missing_department_secretary`, 788 `missing_district_head`, 252 `missing_city_heads`, 121 `unverified_holder`, 90 `vacancy_to_confirm`, 32 `missing_legal_basis`) · integrity issues 0.

**Verified.** Union apex, Council of Ministers, 543 + 245 seats, SC/HC CJs, 39 constitutional bodies, all 36 State apex seats, Union Budget 2026-27 — each by an adversarial second pass. `tsc` and `pnpm build` clean.

**Not shipped.** Public repository, licence, deploy, an India-hosted runner, LLM key.

---

## v0.2 — "Pramaan" (proof) — provenance, open source, watchers · target 2026-10-31

**Scope.**
- Licence decided and `LICENSE` files added (`LICENSING.md`); repository public; `CODE_OF_CONDUCT.md` neutrality clause in force.
- CI: `tsc`, `next build`, `pnpm check:layout`, `pnpm export`, JSON-Schema validation of `data/raw/*.json` and `data/corrections/*.json`, a rule that fails the build if any public seat lacks a source or if any T0 proposal reaches `public/data/`.
- Provenance UI: source chips with domain and date, as-of date, tier badge, "report an error" that pre-fills a `data-correction` issue with the item id.
- Change-event schema (`kind`, `date`, `positionId`, `personIn`, `personOut`, `predecessor`, `entryMode`, `source`, `batch`) replacing the diff-derived change log; public changelog page with per-event source.
- Source snapshotting: SHA-256 of every cited page at citation time + Wayback save; stored in `exports/sources.csv`.
- Watcher framework (`scripts/watchers/`, one adapter interface: fetch → parse → propose T0 JSON into `data/proposals/<watcher>/<date>.json`), with the first four watchers (`pib`, `sansad-ls-members`, `wiki-tripwire`, `news` hardening) and a reviewer CLI to promote proposals into corrections.
- Weekly data release: versioned `exports/` + `public/data/graph/*.json` as a GitHub release with a changelog.
- Data-steward programme: one tracking issue per State/UT (36), steward charter (adopt a State, weekly one-hour check, monthly report, affiliation disclosure).
- First accuracy audit published (`research/india/ACCURACY_AUDIT.md`, stratified n ≥ 300).

**Sources.** No new domains; this milestone is about the pipeline.

**Method.** Watchers propose; stewards/verifiers promote; CI enforces; releases publish.

**Acceptance.**
- 100% of public seats carry ≥ 1 source and an as-of date; 100% carry a tier badge.
- Time from merged correction to live site ≤ 24 h (measured over ≥ 10 merges).
- All four watchers run green for 14 consecutive days; every proposal they emit is reviewable in the CLI.
- Accuracy audit published with method and error rate.
- ≥ 12 State tracking issues have a named steward.

**Contributor tracks.** Engineers (CI, watcher framework, provenance UI), designers (badges, changelog page), reviewers (audit sample), first stewards.

**Good first issues.**
1. Add JSON-Schema for `research/india/SCHEMA.md` and wire it into CI.
2. Fix the PIB RSS `Lang=1 → 2` redirect and add the feed to `scripts/ingest-news.ts`.
3. Implement `wiki-tripwire`: poll Wikidata P39 changes for the 7,774 seats' Wikidata ids (map via `holder.wikipedia`).
4. Add source-domain chips to the provenance section of the side panel.
5. Write the "report an error" deep link (issue template pre-fill from item id).
6. Add `predecessor` support to `scripts/build-graph.ts` change events.
7. Draft the steward charter (`docs/STEWARDS.md`) and the 36 tracking issues from `gaps.csv` counts.

---

## v0.3 — "Rajpatra" (gazette) — primary-source Union · target 2026-11-30

**Scope.**
- Replace Wikipedia as the sole source for every Union seat: apex, 61 ministerial seats, secretaries of every ministry/department (Cabinet Secretariat's list of Secretaries to the Government of India; DoPT ACC orders), heads of the ~530 attached/autonomous/statutory bodies, CPSE and bank boards (PESB, exchange filings, annual reports), regulators and constitutional bodies, SC judges (sci.gov.in), 25 HC Chief Justices (DoJ notifications), tribunal chairs.
- Statute quotes: for the constitutional backbone (Arts. 52–78, 79–122, 124–147, 148–151, 153–167, 168–212, 214–231, 243–243ZG, 315–329 and the AoB Rules) attach `cite` + verbatim `quote` + India Code URL to every relation, CivLab-style; extend to the parent Act of every statutory body (32 `missing_legal_basis` gaps closed).
- Watchers: `egazette`, `rashtrapati`, `doj-judges`, `pesb`, `exchange-filings`.
- **Vacancy Watch** page: every vacant seat with days vacant and the legal deadline where one exists; every acting/additional-charge arrangement; totals by ministry.
- **Term Clock**: retirement and term-expiry dates for SC/HC judges, CEC/ECs, CAG, UPSC, RBI Governor and Deputy Governors, service chiefs, Governors (5-year), Rajya Sabha seats (biennial), regulators' chairs — shown as an "upcoming appointments" calendar.
- Official portraits from ministry/assembly/court sites where licensing allows, replacing Wikipedia where possible.

**Sources.** eGazette, PIB, cabsec.gov.in, dopt.gov.in (browser-class client from an Indian runner), presidentofindia.gov.in, doj.gov.in, sci.gov.in, pesb.gov.in, BSE/NSE announcements, India Code.

**Method.** Watchers propose changes; each Union seat is re-checked by a verifier against the primary source; quotes are pasted verbatim with page/para reference.

**Acceptance.**
- ≥ 95% of Union seats at T2; Wikipedia-only Union seats = 0.
- `tenure_start_unknown` for Union ≤ 5% of Union seats.
- 100% of constitutional-backbone relations carry cite + quote; `missing_legal_basis` = 0.
- Union appointment events reflected within 24 h for ≥ 10 observed events.
- Audited Union error rate ≤ 1%.

**Contributor tracks.** Verifiers (Union), engineers (gazette PDF parsing, calendar), legal researchers (statute quotes), designers (Vacancy Watch, Term Clock).

**Good first issues.**
1. Parse the Cabinet Secretariat "Secretaries to the Government of India" list into `in-pos-secretary-*` proposals.
2. Attach India Code URLs and quotes to Arts. 74–75, 124, 148, 155–164, 324.
3. Build the `pesb` watcher (vacancy circulars + selection results).
4. Compute retirement dates for SC/HC judges from official DOBs (65/62) and add to Term Clock.
5. Close the 90 `vacancy_to_confirm` gaps with a dated source each.

---

## v0.4 — "Rajya" (State) — all 36 States/UTs fully wired · target 2026-12-31

**Scope.**
- Every State/UT: council of ministers and portfolios verified against Raj Bhavan/CMO/assembly sites; MLAs/MLCs verified against assembly rolls and ECI; all six Legislative Councils complete; Advocate General; State commissions (SEC, PSC, SHRC, SIC, Lokayukta, Women's, SC/ST/OBC, Minorities) with holders and terms.
- Administrative secretaries for every State department (1,043 gaps) from "who's who"/secretariat lists, with the department's portfolio minister linked.
- Watchers: `state-gazette-<code>` for the ≈10 States with online gazettes; `eci`.
- Regional-language news: ≥ 1 feed each for Hindi, Bengali, Marathi, Tamil, Telugu, Kannada, Malayalam, Gujarati, Odia, Punjabi, Assamese, with script-aware alias tables in `data/raw` so the tagger and the Power map see non-English coverage.
- Names: `nameHi` on 100% of State entities; the State's official-language name where the body publishes one.

**Sources.** State portals (browser-class fetch for JS-only ones: Assam, MP, Chhattisgarh, Rajasthan, Mizoram), assembly sites, CEO/ECI, State gazettes, GAD orders, publisher RSS.

**Method.** State stewards own their State's verification; verifiers pair across States for contentious items; per-State coverage tables regenerated by `pnpm export`.

**Acceptance (per State, published in the coverage table).**
- Ministers 100% T2; MLAs/MLCs ≥ 99% with a 2025–26 source; integrity issues 0.
- Secretaries ≥ 80% for the 15 largest States, ≥ 60% overall.
- Reshuffles and swearing-ins reflected within 72 h (≥ 5 observed events).
- 36/36 States have a steward or a published "unadopted" flag on the coverage page.
- Non-English feeds contribute ≥ 20% of tagged articles.

**Contributor tracks.** Stewards (36), translators (Hindi + 10 languages), verifiers, engineers (JS-portal adapters), designers (State pages).

**Good first issues.**
1. Adopt a State: file the steward issue and close its `priority=high` gaps.
2. Add a regional-language feed and 200 aliases in that script for your State's bodies.
3. Fill secretaries for one State from its official who's-who page (see `state-depts-tn-kl-py.json` for the pattern).
4. Add the six Legislative Councils' vacancies with SEC/ECI sources.
5. Verify a State's Lokayukta/SIC/SEC holders (many are vacant — record the vacancy with a dated source).

---

## v0.5 — "Zila" (district) — districts and cities · target 2027-02-28

**Scope.**
- 784 districts: DM/Collector, SP or Commissioner of Police, CEO Zila Parishad, Principal District Judge; LGD code on every place as the canonical key.
- 273 municipal corporations: Mayor, Commissioner, council size, last election date, next due; 2,006 municipalities and 2,420 town panchayats: chairperson where the SEC publishes.
- **Overdue Democracy tracker**: bodies whose five-year term has expired without election (Arts. 243E/243U), States with a vacant State Election Commissioner, Lokayukta or SIC — each with a citation.
- **Transfer Tracker v1**: DM/SP tenure lengths per district; per-State median tenure against the two-year benchmark, method page published.
- Pincode and village → AC/PC/district/ULB/GP resolution layer (India Post directory + LGD + constituency boundaries) — the substrate for Kaun Zimmedar.

**Sources.** LGD (directory download, NAPIX), NIC S3WaaS district sites (`/whos-who/`), State GAD orders, SEC sites, HC district-judiciary pages, cityfinance.in, data.gov.in pincode directory, published AC/PC boundaries.

**Method.** One template adapter for S3WaaS covers most district sites; stewards resolve exceptions; `state-gad-<code>` and `sec-<code>` watchers.

**Acceptance.**
- DM and SP named for ≥ 90% of districts with a source ≤ 12 months old; CEO ZP ≥ 70%.
- Mayor and Commissioner for ≥ 90% of corporations.
- Overdue-election list with an SEC citation for every entry; refreshed monthly.
- LGD code on 100% of places; pincode resolution ≥ 95% of pincodes, ambiguity flagged.
- Transfer Tracker method page live; numbers reproducible from `exports/`.

**Contributor tracks.** Source adapters (S3WaaS, SEC PDFs), stewards (district lists), GIS volunteers (boundaries), designers (district pages).

**Good first issues.**
1. Write the S3WaaS `/whos-who/` parser and run it on one State's districts.
2. Import LGD district/ULB/GP codes into `data/raw/local-lgd.json`.
3. Add mayors for the corporations in your State from SEC results.
4. Build the pincode → post office → constituency point-in-polygon step.
5. Compile the last ULB election date for one State and flag overdue bodies.

---

## v0.6 — "Sansad" (parliament) — Parliament and Assemblies in motion · target 2027-03-31

**Scope.**
- Bills: introduced/passed/assented per session with PRS and sansad.in links; questions (starred/unstarred) searchable by MP, ministry and subject; debates participation; committee membership and report index; attendance per session; MPLADS where reachable.
- **Representative Record** page per MP: documented metrics only (attendance, questions, debates, private member bills), each with method link — no composite score.
- Citation-first search: "What has the Government said about X?" returns quoted answers with the Q&A PDF.
- Cabinet decisions timeline (PIB), session calendar, committee sittings.
- Topics: ministries, bodies and schemes tagged to ~40 citizen subjects (housing, water, health, police, schools, farming…).
- State assemblies pilot for five States that publish questions digitally.

**Sources.** sansad.in APIs (undocumented — adapters must tolerate change), Q&A PDFs, PRS MP Track downloads (attribution per their terms), LS/RS Bulletins, PIB, assembly sites.

**Method.** `sansad-activity` watcher; PDF extraction to T0; verifier spot-checks 5% of records per session.

**Acceptance.**
- ≥ 95% of the current session's questions indexed within 7 days of answer; every bill of the session with status and source.
- Attendance for ≥ 95% of MPs per session.
- Representative Record shows only metrics with a method page; a lint rule blocks editorial adjectives in descriptions.
- Topic tags on 100% of Union ministries and ≥ 80% of bodies.

**Contributor tracks.** Engineers (API adapters, search), verifiers (session spot-checks), subject editors (topics), designers (record page).

**Good first issues.**
1. Document the `sansad.in/api_ls/*` endpoints and their pagination in `docs/SOURCES.md`.
2. Ingest one session's starred questions into a searchable index.
3. Add the 63 committees' current membership from sansad.in.
4. Build the Cabinet-decisions timeline from PIB releases tagged "Cabinet".
5. Propose the 40-subject topic list with definitions.

---

## v0.7 — "Kosh" (treasury) — money · target 2027-04-30

**Scope.**
- Union Budget time series (BE/RE/Actuals, FY2019-20 → FY2027-28) per demand and major scheme; outcome-budget targets vs. achievements.
- State budgets for all 36 (at least totals and top 10 departments); PFMS aggregate releases to States and schemes.
- **Money Trail to My District**: MGNREGA, PMAY-G, PM-KISAN, JJM, NHM series per district.
- CAG audit reports (2020 →) indexed and tagged to entities; PAC/COPU references.
- CPGRAMS receipts/disposal per ministry and State (DARPG monthly).
- Employee counts: Union (Pay Research Unit census of Central Government employees), States (establishment figures in budgets).

**Sources.** indiabudget.gov.in, State finance departments, Open Budgets India, pfms.nic.in, scheme MIS portals, cag.gov.in, darpg.gov.in.

**Method.** `budget` and `scheme-mis` watchers; every figure carries fiscal year, source table/page and fetch snapshot (CivLab's `metadata.source_table` pattern).

**Acceptance.**
- Every Union ministry: 10-year series with a source per cell.
- ≥ 30 States with FY2026-27 BE totals and top-10 departments.
- ≥ 5 schemes with district-level series for ≥ 95% of districts.
- ≥ 90% of CAG reports since 2020 linked to the audited entity.
- Budget-vs-outcome view for ≥ 20 schemes.

**Contributor tracks.** Data engineers (XLS/PDF extraction), public-finance volunteers (mapping demands to entities), designers (budget module — a real donut/sunburst, better than CivLab's bar list), reviewers.

**Good first issues.**
1. Extract "Statement of Budget Estimates" XLS into `data/raw/union-budget-series.json`.
2. Map every CAG report title since 2020 to an entity id.
3. Add one State's budget totals with the finance-department source.
4. Ingest MGNREGA district-wise expenditure for one year.
5. Parse one DARPG monthly CPGRAMS report.

---

## v0.8 — "Nyaya" (justice) — judiciary and police · target 2027-05-31

**Scope.**
- Every sitting HC judge (name, appointment date, parent HC, retirement date); SC and HC retirement calendar; collegium pipeline (recommended → GoI → notified, days at each stage) from sci.gov.in resolutions and DoJ notifications; DoJ monthly vacancy statements ingested; NJDG pendency per HC and district (public dashboards); Principal District Judges; tribunal members.
- Police: Commissioners, Range IGs/DIGs, district SPs for all States; DGP and SP tenure lengths; sanctioned vs. actual strength per State (BPRD/NCRB).

**Sources.** sci.gov.in, HC sites, doj.gov.in, njdg.ecourts.gov.in, State police sites, bprd.nic.in (India-hosted runner), ncrb.gov.in / data.gov.in.

**Method.** `doj-judges` watcher; HC-site adapters (25); police-site adapters (36); verifiers reconcile with DoJ statements.

**Acceptance.**
- 100% of HC judges with a DoJ or HC-site source; vacancy counts reconcile with the latest DoJ statement within ±1 per HC.
- Collegium pipeline items sourced to a resolution URL, 100%.
- District SPs ≥ 90%; Range/Commissionerate heads 100%.
- Pendency figures with NJDG snapshot date on every number.

**Contributor tracks.** Legal researchers, source adapters (HC and police sites), designers (Court Watch), verifiers.

**Good first issues.**
1. Parse one High Court's judges page into positions with appointment dates.
2. Ingest the latest DoJ vacancy statement PDF into per-HC numbers.
3. Build the collegium-resolution parser (recommendation date, names, HC).
4. Add district SPs for one State from its police site.

---

## v0.9 — "Janta" (the people) — citizen layer · target 2027-06-30

**Scope.**
- **Kaun Zimmedar?** router: pincode or village → ward/GP → ULB/block → district → AC/PC → State → Union, with the official grievance route per subject (CPGRAMS category, State portal, helpline).
- Multilingual interface: Hindi complete; Bengali, Marathi, Tamil, Telugu, Kannada, Malayalam, Gujarati, Odia, Punjabi via Bhashini or IndicTrans2 with human review of the ~2,000 core strings and all entity names.
- **Ask Sarkar Graph**: web chat + Telegram (WhatsApp if approved) answering only from graph facts with citations; retrieval-only; "I don't know" by default; voice input pilot in Hindi (Bhashini ASR).
- Alerts: subscribe to a seat, body, State or district (email/RSS; digest by default).
- Offline-first PWA, first load < 300 KB, low-data mode; embeddable widgets for newsrooms.
- "Explain this office" cards for every office kind, in 9 languages.

**Sources.** Our data; India Post directory; LGD; Bhashini/IndicTrans2; CPGRAMS category list; State grievance portals.

**Method.** Translation memory in-repo; a fixed evaluation set (≥ 200 questions with gold answers) run in CI against the chat; router accuracy tested on a labelled pincode sample.

**Acceptance.**
- Pincode router resolves ≥ 95% of pincodes to AC/PC with ambiguity flagged; grievance route present for ≥ 30 subjects.
- Chat: 100% of answers carry a citation (automated check); ≤ 1% unsupported claims on the evaluation set.
- 9 languages at ≥ 95% of strings; entity names reviewed by a native speaker.
- Alert latency ≤ 1 h after a build; Lighthouse mobile ≥ 90; PWA works offline for the last graph.

**Contributor tracks.** Translators (9 languages), engineers (router, chat, PWA, bot), designers (voice and low-literacy UX), community testers.

**Good first issues.**
1. Translate the 300 most-used interface strings into your language.
2. Map CPGRAMS categories to ministries and State departments.
3. Build the Telegram bot skeleton that answers "who is the MLA of <constituency>" with a citation.
4. Add service-worker caching for the compiled graph.
5. Write "Explain this office" for Collector, SP, Sarpanch, MLA, MP, Governor.

---

## v1.0 — "Sarkar Graph 1.0: Live and Trusted" · target 2027-08-15

**Scope.** Consolidation: documented, versioned public API (same licence as the data; rate-limited); weekly releases; SLA dashboard public; quarterly accuracy audit; governance charter (maintainers, RFC process, steward council); security review; ISR + SSE with "last updated" on every page; press kit; CivLab-compatible interchange export.

**Acceptance.**
- ≥ 98% of Union and State seats at T2; audited error rate ≤ 0.5%.
- Freshness SLAs met for ≥ 95% of observed events per class over the preceding quarter.
- Zero unsourced public facts (CI-enforced since v0.2).
- 36/36 States with an active steward (activity in the last 30 days).
- API p95 < 300 ms; uptime ≥ 99.9% over 90 days.
- ≥ 100 merged pull requests from ≥ 30 external contributors.

---

## Beyond 1.0

| Release | Name | Scope | Acceptance headline |
|---|---|---|---|
| v1.1 | "Panchayat" | 255,392 GPs, 6,769 block and 675 district panchayats from LGD; sarpanch/pradhan and members from eGramSwaraj ER reports and SEC results; PRIASoft finances | ≥ 80% of GPs with a named head and a source ≤ 24 months old; election-due date on 100% |
| v1.2 | "Nigam" | councillors of all 5,051 ULBs; ward maps | ≥ 70% of wards with a named councillor |
| v1.3 | "Time Machine" | tenure history back to 2014, then 1950; predecessor/successor chains; date slider | ≥ 95% of Union and State apex tenures since 2014 T2 |
| v1.4 | "Tender network" | GeM/CPPP awards → suppliers → departments; repeat-winner and single-bid metrics with a published method; legal review before launch | 100% of metrics reproducible from released data |
| v1.5 | "Chunav" | election mode: candidates per constituency with ECI/ADR affidavit summaries, live results, by-election calendar; s.126/126A posture enforced in code | 100% of affidavit fields limited to the ECI summary format |
| v2.0 | "Vaada" | promise tracker for the Union and every State's ruling manifesto: commitments → evidence → status; symmetrical coverage; two reviewers of different affiliations; right of reply; no headline percentage | method page, reviewer log and evidence for 100% of statuses; pilot on the Union + 2 States first |
| v2.x | — | Wikidata two-way sync; institution → officer chains (UDISE, HMIS); PSU and State-PSU boards; FCRA/NGO grants network; federation with other countries' graphs | — |

---

## Cross-cutting programmes

**Verification and audit.** Every quarter, a stratified sample (n ≥ 300: Union 100, States 150, districts/local 50) is re-verified by people who did not enter the facts; the error rate, the errors and the fixes are published in `research/india/ACCURACY_AUDIT.md`. Anything named in an audit as wrong is fixed through `data/corrections/` with the audit id as `reason`.

**Steward programme.** One steward per State/UT (two for the five largest), with a deputy; weekly one-hour check of that State's watcher proposals and `priority=high` gaps; monthly note in the tracking issue; affiliations disclosed in `docs/STEWARDS.md`; contentious items reviewed by a steward from another State.

**Metrics (published weekly).** Seats mapped; % at T2/T3; open gaps by type; freshness SLA hits/misses per class; watcher health; audit error rate; contributors and merged PRs; languages complete.

**Infrastructure.** Static + ISR shell (as CivLab, cheaper than dynamic pages) with SSE for the live layer; watchers on GitHub Actions plus one India-hosted runner; Postgres only when the article and event stores outgrow JSON (expected around v0.6); no LLM key required for any acceptance criterion through v0.5 — LLM extraction is optional acceleration, never a dependency for correctness.

**Governance.** Maintainer group (≥ 3); RFC process for schema and method changes; Code of Conduct with the political-neutrality clause; a public method page for every number attached to a person; licence and attribution rules for reusers; an annual transparency note on funding.

**Risks and mitigations.**
- Source drift (portals change, APIs vanish): adapters with contract tests; snapshots; two sources for every apex seat.
- Geo-blocking of NIC hosts: India-hosted runner; browser-class fetch where needed.
- Volunteer attrition: small, closable gaps; credit in every release; steward deputies.
- Legal pressure on contentious layers (affidavits, tenders, promises): legal review before each of v1.4, v1.5, v2.0; facts quoted from the record only; right of reply; takedown process.
- Scale of payload: per-government graphs (already) and per-tier lazy loading before districts ship (v0.5).

## Good first issues — master list by track

**Verifiers.** Close 10 `unverified_holder` rows for your State · confirm the 90 `vacancy_to_confirm` seats · re-check one State's council of ministers against the CMO site · spot-check 20 Lok Sabha seats against `sansad.in/api_ls/member`.

**Stewards.** Adopt a State (36 issues) · fill `tenure_start_unknown` for your State's ministers from oath-taking reports · add your State's commissions.

**Source adapters.** S3WaaS district `/whos-who/` parser · PESB watcher · eGazette daily search · one State gazette · one High Court judges page · one State police "senior officers" page · one SEC results PDF.

**Engineers.** JSON-Schema + CI · change-event schema · provenance chips · watcher framework · Wikidata tripwire · service worker · Telegram bot skeleton · Term Clock.

**Translators.** `nameHi` for one State's departments · 300 interface strings in one language · alias tables in one script for the news tagger.

**Designers.** Vacancy Watch · Term Clock · Representative Record (facts-only layout) · budget sunburst · low-literacy voice flow · print/share cards.

**Legal and policy researchers.** Statute quotes for the constitutional backbone · parent Act of each statutory body · CPGRAMS subject → ministry map · affidavit summary field list against ECI's format.
