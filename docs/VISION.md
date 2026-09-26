# Sarkar Graph — Vision

_As of 2026-09-25. Companion to [`ROADMAP.md`](ROADMAP.md). Rules that bind every contribution are in [`SOURCING_POLICY.md`](SOURCING_POLICY.md); what is mapped today is in [`DATA_COVERAGE.md`](DATA_COVERAGE.md)._

Every claim about CivLab below is tagged **[V]** (verified by direct fetch on 2026-09-25 — raw evidence in `research/civlab/`) or **[I]** (inferred from evidence, not confirmed by CivLab). Claims about Indian sources were checked live the same day; access modes are what we observed, not what the portals promise.

## 0. In one screen

- **What we are building.** An open-source, live, provenance-first map of every seat of power in India — the Union, Parliament, the courts, the constitutional bodies and regulators, all 36 States/UTs, and, tier by tier, the 784 districts, 5,051 urban local bodies and 255,392 gram panchayats (counts from the [Local Government Directory](https://lgdirectory.gov.in/), 2026-09-25) — together with the money, laws, appointments and decisions that flow through those seats.
- **What CivLab proved.** A three-person team with LLM tooling mapped an entire national executive (952 nodes, 1,433 edges for the US federal government) in about two weeks, with statute-level citations on the appointing edges and a shipped audit trail of its own mistakes. That is the bar for *method*. It is not the bar for *scope*: CivLab has no tenure history, no legislation, no elections, no courts data, no sub-national tiers under one government, no languages, no open data, and its "realtime" is a 6-hourly rebuild.
- **Where we already are.** 6,268 nodes and 7,774 seats across 37 governments, 7,588 with a named holder, 6,403 distinct people — six times CivLab's node count on day one. The debt is equally clear: 6,005 of 7,851 cited sources are Wikipedia (77%), 239 seats are flagged "not yet verified", and `exports/gaps.csv` lists 3,404 typed gaps.
- **The bet.** Accuracy is the product. Every fact carries a source, an as-of date and a verification tier; nothing about a person is ranked or scored without a published, reproducible method; India's scale is met by open contribution — State data stewards, source adapters, scheduled watchers, second-reviewer verification — rather than by a bigger team.

## 1. How deep CivLab actually goes

### 1.1 Timeline (all 23 posts on writing.civlab.org read via the Substack API; live sites re-fetched)

| Date | Milestone | What it tells us |
|---|---|---|
| Jul 2023 | Hand-drawn SF org chart (recounted in the Aug 2024 post) | Started as one person's research, not a data project. |
| 2024-06-06 | ["A Complete List of SF Government Entities"](https://www.writing.civlab.org/p/complete-list-of-sf-government-entities) — published to [github.com/m-atoms/sf-gov-entities](https://github.com/m-atoms/sf-gov-entities), confirmed with the City Attorney's office | The only open-source artefact CivLab has released. "I welcome PRs too!" — but the graph, pipeline and data that followed are closed. **[V]** |
| 2024-08-27 | [SF Gov Graph v1](https://www.writing.civlab.org/p/introducing-the-sf-government-graph) — entities by type, `appoints`/`oversees` relations, "every entity is linked to the legal source enabling it" | Legal basis per node from day one. Footnote: "If not, blame Claude — he wrote it!" **[V]** |
| 2024-09-28 | ["Research Resources for SF Government"](https://www.writing.civlab.org/p/research-resources-for-sf-government) | Their SF source list: Charter, Municipal Codes, Granicus boards list, City Attorney list, Civil Grand Jury, SPUR, budget books, Legistar, SFGovTV, DataSF. **[V]** |
| 2024-12-18 | [v2](https://www.writing.civlab.org/p/sf-government-graph-v2-is-live) — descriptions, employee counts, legal-source and official-website links, alias search ("SFPD") | "We're using LLMs and other software magic to automate the generation and maintenance of the graph." Data model rebuilt "so we can track legislative activity, budgets/spending". **[V]** |
| 2025-03-18 | [Funding for v3](https://www.writing.civlab.org/p/update-funding-secured-for-gov-graph) | "Completely rebuilding the UI and adding 100x more data": budget and spending, key personnel profiles, meeting info and legislative activity. Team: Michael Adams, Steven Lu, Kifah Meeran. Funder undisclosed. **[V]** |
| 2025-08-27 | ["Introducing a New Type of Civic Tech"](https://www.writing.civlab.org/p/introducing-a-new-type-of-civic-tech) — SF v3 live (the post the maintainer's screenshots call "v2") | "You can track government entities, spending, news, public meetings, and more in real time." News summaries, interactive budget donut, departmental spending breakdowns, "contracts to non-governmental organizations like nonprofits, which was a highly-requested feature", ring rotation rebuilt for mobile. "Using LLMs, our small team was able to aggregate and process an enormous amount of data. We fully intend to bring this platform to every city government." 20 comments: requests for Croatia, Detroit, NYC; Adams: "Not ready to expand beyond the US just yet." A commenter asked whether the tool could quantify red tape in time and cost; Adams: "part of the motivation for this tool". **[V]** |
| 2026-04-03 | [Republic](https://www.writing.civlab.org/p/monitor-the-situation-in-your-city) at republic.civlab.org | A second product: a San Francisco *monitor* — news "classified by topic and relevant government entities are extracted", crime, building permits, community events, an AI-generated community-groups database, neighbourhood feeds, daily/weekly email reports. Built with Claude Code / Opus 4.6. **[V]** |
| 2026-09-16 | US Gov Graph launch (X; [IBTimes UK](https://www.ibtimes.co.uk/civlab-ai-map-us-federal-government-1820471)) | 482 federal organisations (343 executive, 103 independent, 19 legislative, 17 judicial) + 339 sub-agencies, 6 vacant seats, 86 acting officials; "agents monitor official sources to track every appointment, departure, and structural change"; "Palantir for The People". **[V]** |
| 2026-09-25 | [`/api/v1/graph-requests`](https://graph.civlab.org/api/v1/graph-requests) tally: Brazil 93, Canada 16, China 14, **India 12**, UK 12, Germany 11 (167 ids) | Demand exists; nobody has shipped a national multi-tier graph. **[V]** |

The reply the maintainer saw asking for promise-vs-delivery tracking and a per-politician scorecard is not among the 20 Substack comments (it was probably on X). CivLab has shipped neither; we address both in §3 with a neutrality method, because in India they are the two highest-risk features.

### 1.2 What is in the data, measured on the live site (2026-09-25)

| Domain | US (`/us`) | SF (`/sf`) | Evidence |
|---|---|---|---|
| Entities | 952 nodes: 460 head positions, 329 departments, 45 quasi-official, 25 regulatory, 20 adjudicative, 19 courts, 18 corporations, 14 advisory, 9 "series" roll-ups, 6 military, 5 elected/legislative | 237 nodes (56 departments, 54 commissions, 56 advisory, 59 heads, 11 elected) | `_next/data/We2ikbxxKTtakj9tS4BvH/us.json` **[V]** |
| Relationships | 1,433 edges: appoints 565, dept_head 457, confirms 260, ex_officio 99, elects 20, oversees 12, advises 11, office 5, administers 4 | same vocabulary | **[V]** |
| People | 1,022 current holders; `startedAt` on 804 (79%); `acting` on 165; portrait on 259 (25%); `party` on 3 (party lives only in the power map). **No end dates, no predecessors: `endedAt` occurs 0 times** — there is no tenure history | 282 `startedAt` | **[V]** |
| Legal basis | `legalSourceUrl` on 415/952 nodes (44%). Edge `metadata`: batch `source` on 561, statutory `cite` on 395, verbatim `quote` on 82, `repointed_from`/`repointed_reason` where the scaffold was corrected | link per node | **[V]** |
| Budgets | none (`budget: {}`) | 49 departments: FY2019–2028 budget and actuals series, category breakdown, revenue, budgeted/actual employees, YoY; citywide ranks | **[V]** |
| Contracts / nonprofits | none | per-department `contractStats` (active contracts, value, suppliers, nonprofit contracts and spend, median duration) | **[V]** |
| Meetings | none (`meetings: []`) | scraped from the sf.gov calendar and SFGovTV RSS; future-dated (Oct 2026), `updated_at` within 2 days | **[V]** |
| News | 3 RSS feeds (NPR Politics, Government Executive, Federal News Network); 1,080 articles in 90 days; **full article HTML stored and served** by `/api/v1/articles` (fields `id,url,date,slug,tags,title,author,content,excerpt,categories,cleanTitle,titleImage,databaseId,created_at`); 4 LLM-written summaries on the index with inline `<gov_entities='id'>` tags | SF Standard and others | **[V]**; the field names resemble a normalised CMS/WordPress schema **[I]** |
| Power map | US only: top 20 people by 90-day mentions; `heat = recent ÷ total × 90/7` (exact fit); links are the person-level projection of institutional edges | absent | **[V]** |
| Personnel changes | US only: 69 items 2026-06-29 → 2026-09-16, tenure start/end with predecessor, `entryMode`, `sourceUrl` or batch id; `lastChangeDate` 9 days behind `generatedAt` | `changes: null` | **[V]** |
| Topics | none (`/us/topics` 404) | 5 (homelessness, transit, public_safety, education, housing) with per-node relevance | **[V]** |
| Absent everywhere | legislation, bills, votes, elections, candidates, court cases, grievances, procurement, tenure history, more than one tier per government, non-English, data downloads, API documentation, licence | | **[V]** |

### 1.3 Pipeline and cadence

- **Scaffold → verify, in dated batches.** 172 edges are tagged `complete-government scaffold`; then `phase-d1 2026-09-06` (79), `phase-d2 2026-09-07` (20), `20260908_phase_d3_seats` (143), `20260909_wave_appointer_cites` (81), `20260909_seat_coverage_264` (29), `20260909_joint_chiefs` (10), `20260917_uscirf_branch_edges_404` (3). Batches carry `issue` numbers and first-person notes such as "Scaffold said Attorney General; the statute says the President alone…". The federal graph was built between 4 and 17 September 2026. **[V]**
- **Delivery.** Next.js Pages Router, SSG + ISR on Vercel. Same `buildId` all day; the page was regenerated at `04:04:10Z` and `10:09:08Z` (`powerMap.computedAt`) — a roughly 6-hourly recompute **[I, two samples]**; `changes.generatedAt` is date-granular. Every route ships the whole graph (2.0 MB on `/us`, 0.8 MB on `/sf`). **[V]**
- **Live surface.** Exactly two dynamic endpoints: `/api/v1/articles` (`limit, offset, query, govEntityId, topicId`; `x-vercel-cache: MISS`) and `/api/v1/graph-requests`. No SSE, no WebSocket, no "last updated" shown on the page. **[V]**
- **Backend.** SF `overview.metadata` cites `money.mv_budget_rollup`, `money.mv_spending_revenue_rollup`, `money.mv_*_employee_counts` — Postgres materialised views fed by ETL from DataSF/Controller data. Sanctuary Computer's case study adds Supabase and a private npm graph package. **[V]/[I]**
- **Automation vs curation.** Meetings and news are clearly scheduled. Personnel edges look batch-curated (nine-day lag on the changes feed; batch tags, not URLs, as sources on many items). "Agents monitor official sources" is a claim we could not verify beyond those batch tags. **[I]**
- **Images.** Wikimedia Commons, the open `unitedstates/images` congressional headshots, agency sites. **[V]**

### 1.4 Their capability → do we have it → gap

| # | CivLab capability | Sarkar Graph today | Gap → milestone |
|---|---|---|---|
| 1 | Complete entity catalogue of one government, legal basis link on 44% of nodes | 6,268 nodes across 37 governments; `legalBasis`/`legalSourceUrl` fields in the schema; 32 entities flagged `missing_legal_basis` | No verbatim statute quotes; legal links unevenly checked → **v0.3** |
| 2 | Typed edges with per-edge provenance (`cite`, `quote`, `basis`, batch id, `repointed_from`) | Relations carry `type`, `basis`, `source`; no quote, no batch id, no correction trail on relations | Add `quote`, `verifiedBy`, `batch` to relations → **v0.2 / v0.3** |
| 3 | Current holders with start date and acting flag | 7,588 holders with `since`, `acting`, `party`; 1,078 `tenure_start_unknown`; 239 unverified; 77% Wikipedia-sourced | Primary-source replacement → **v0.3 (Union), v0.4 (States)** |
| 4 | Tenure history | none | none — both lack it → **v1.3 Time Machine** |
| 5 | Personnel change feed with predecessor and source per event | change log computed from data diffs and news; no predecessor, no per-event source | Change-event schema → **v0.2** |
| 6 | Vacant / acting counts | `vacant` and `acting` flags; 90 `vacancy_to_confirm`; no page | Vacancy Watch → **v0.3** |
| 7 | 10-year department budgets, breakdowns, revenue (SF) | Union Budget 2026-27 BE per ministry, top schemes, devolution — one year, no RE/actuals, no States | **v0.7 Kosh** |
| 8 | Contracts and nonprofit spend (SF) | none | **v1.4 Tender network** |
| 9 | Employee counts (SF) | `employees` field, sparsely filled | **v0.7** |
| 10 | Meetings calendar (SF) | none | Parliament/committee sittings, Cabinet decisions → **v0.6**; municipal agendas later |
| 11 | LLM news summaries with inline entity tags | 7 feeds, deterministic tagger, ~26,000-article archive, no summaries | Optional summaries behind a key; regional-language feeds → **v0.4** |
| 12 | Power map (published heat formula) | parity — same formula, published | — |
| 13 | Topics (SF) | none | Subject/scheme topics → **v0.6** |
| 14 | Live article API serving full article HTML | `/api/live` + SSE push (we push; they poll). We store link, title, excerpt only — deliberately (§2.3) | — |
| 15 | Mobile ring rotation | spring turn to 6 o'clock, pinch zoom, 390px verified | — |
| 16 | Search, aliases, legend | parity | — |
| 17 | Portraits on 25% of people | Wikipedia portraits for holders with a page (`scripts/fetch-images.ts`) | official portraits from ministry/assembly sites → **v0.3/0.4** |
| 18 | Two flat governments (`us`, `sf`) | 37 governments with a tier model | our structural advantage; keep drill-down UX |
| 19 | Republic: neighbourhood monitor (news, crime, permits, events, digests) | none | Kaun Zimmedar router + alerts → **v0.9** |
| 20 | Open source / data downloads | repo with `exports/*.csv`, `gaps.csv`, corrections overlay, CONTRIBUTING; **licence pending** | choose licence, publish → **v0.2** |
| 21 | Verification workflow (`(verified)` tags, batch notes — private) | adversarial verifier per segment, `confidence` tiers, corrections with `by/date/reason/source`, `SOURCING_POLICY.md` | public verification log; second-reviewer rule enforced in CI → **v0.2** |
| 22 | Freshness: ~6h page regen; personnel 9 days behind | RSS ingest on a schedule; roster updates manual | Freshness SLA + watchers → **v0.2/v0.3** |
| 23 | Legislation tracking (promised since 2024, not shipped) | none | **v0.6 Sansad** |
| 24 | Elections / candidates | none | **v1.5 Chunav** |
| 25 | Courts (19 nodes) | 99 courts and tribunals; SC judges, 25 HC Chief Justices | individual HC judges, district courts, pendency → **v0.8 Nyaya** |
| 26 | Non-English | Hindi labels on part of the data | 9 languages → **v0.9 Janta** |

## 2. India: the full scope

### 2.1 Tiers

| Tier | Size | "Complete" means | Primary sources (access mode) | Status today |
|---|---|---|---|---|
| Union executive | 53 ministries, 54 departments, ~530 attached/subordinate/autonomous/statutory bodies, 158 CPSEs and banks, 22 forces/agencies | political head, administrative head, every board-level seat, budget line, legal basis | [Allocation of Business Rules](https://cabsec.gov.in/) (PDF); ministry sites (HTML, many JS-rendered); [PIB](https://www.pib.gov.in/) (RSS — `Lang` redirect bug); [eGazette](https://egazette.gov.in/) (search + PDF); DoPT ACC orders (WAF-blocks non-browser clients); [PESB](https://pesb.gov.in/) (HTML/PDF, redirects); BSE/NSE filings for listed CPSEs (dated director changes) | mapped; heads partly; secretaries partly |
| Parliament | 543 + 245 seats, 63 committees | every member, term, party, committee membership, questions, debates, attendance, bills | [sansad.in](https://sansad.in/) — undocumented JSON APIs: `GET /api_ls/member?loksabha=18` returns 544 records × 37 fields; `/api_ls/question`, `/api_ls/committee`, `/api_ls/debate` exist (HATEOAS roots); RS-side `/api_rs/*` returns 403. LS/RS Bulletins (PDF). [PRS MP Track](https://prsindia.org/mptrack) (questions, debates, private member bills, 15th–18th LS; download) | seats complete; no activity data |
| Judiciary | SC (34 sanctioned), 25 High Courts (~1,100 sanctioned judges), ~18,700 district and subordinate courts (NJDG), ~19 tribunals | every judge with appointment and retirement date, vacancies, collegium pipeline, pendency | [sci.gov.in](https://www.sci.gov.in/chief-justice-judges/) (judges, [collegium resolutions](https://www.sci.gov.in/collegium-resolutions/), assets of judges); [DoJ vacancy statements](https://doj.gov.in/vacancy-positions/) (monthly PDF; intermittently unreachable); [NJDG](https://njdg.ecourts.gov.in/njdgnew/) (public dashboards; open API only for government institutions); [judgments.ecourts.gov.in](https://judgments.ecourts.gov.in/); eCourts case status (captcha) | SC, HC CJs, tribunals mapped; HC judges and district courts not |
| Constitutional bodies and regulators | 39 | every member with term | own sites; Gazette | mapped |
| States / UTs | 36; ~4,123 MLAs; 426 MLCs in 6 councils (AP, Bihar, Karnataka, Maharashtra, Telangana, UP) | Governor/LG, CM, every minister and portfolio, Speaker, LoP, Chief Secretary, DGP, every department with its secretary, every MLA/MLC, state commissions (SEC, PSC, SHRC, SIC, Lokayukta, women's, SC/ST/OBC), Advocate General | Raj Bhavan / CMO / assembly sites (HTML; Assam, MP, CG, Rajasthan, Mizoram portals are JS-only to curl); state CEO sites; [ECI results](https://results.eci.gov.in/); state gazettes (≈10 States online); GAD transfer orders (PDF) | all 36 apex seats + MLAs listed; 1,043 secretaries missing; commissions partial |
| Districts | 784 | DM/Collector, SP/CP, CEO Zila Parishad, District Judge, LGD code | [LGD](https://lgdirectory.gov.in/) (download directory; NAPIX API); NIC S3WaaS district sites — a uniform `/whos-who/` page on 3 of 5 probed (pune.gov.in, varanasi.nic.in, nagpur.gov.in yes; ernakulam.nic.in 404); state GAD orders | districts exist; 788 `missing_district_head` |
| Urban local bodies | 5,051 (273 corporations, 2,006 municipalities, 2,420 town panchayats) | mayor/chairperson, commissioner, council size, last and next election | LGD; 36 State Election Commissions (PDF results); municipal sites; [cityfinance.in](https://cityfinance.in/) (MoHUA finances) | 273 corporations listed; 252 `missing_city_heads`; no councillors |
| Panchayati Raj | 255,392 GPs, 6,769 block panchayats, 675 district panchayats; >30 lakh elected representatives (MoPR figure — verify) | sarpanch/pradhan and members, elections due, finances | [eGramSwaraj](https://egramswaraj.gov.in/) (`ElectedRepresentativeReportZp/Bp/Vp.do`, `gpProfileReport.do`, PRIASoft finances); SECs; [meripanchayat.gov.in](https://meripanchayat.gov.in/) | aggregates only |
| Police | 36 DGPs; commissionerates, ranges, ~800 district SPs | every SP/CP with tenure | state police sites; BPRD "Data on Police Organisations" (annual PDF; nic.in host unreachable from abroad); [NCRB](https://ncrb.gov.in/) | DGPs only |

### 2.2 Domains and sources

| Domain | Official sources | Access | Legal / ethical notes | Ours | Milestone |
|---|---|---|---|---|---|
| People and tenures | Gazette; PIB; Rashtrapati Bhavan releases; sansad.in; assembly sites; ministry "who's who" | HTML/PDF; one JSON API (LS members) | official-capacity data only; no home addresses/phones even when published (sansad's API includes them) | 7,588 holders | v0.3–0.5 |
| Appointments and confirmations | ACC orders via DoPT (WAF) and PIB; Gazette Part I s.1 / Part II s.3(ii); Rashtrapati Bhavan; DoJ (judges' warrants); PESB; RBI/SEBI releases | PDF/HTML; RSS for PIB | Gazette free to reproduce (Copyright Act s.52(1)(q)(i)) | change log only | v0.2 events; v0.3 watchers |
| Legislation and bills | [sansad.in/ls/legislation/bills](https://sansad.in/ls/legislation/bills); [PRS](https://prsindia.org/); [India Code](https://www.indiacode.nic.in/); state assembly sites | HTML/PDF | Acts reproducible with commentary/original matter (s.52(1)(q)(ii)) | none | v0.6 |
| Questions and debates | sansad.in `/api_ls/question`, `/api_ls/debate`; Q&A PDFs; eparlib and rsdebate (nic.in, intermittent) | JSON (undocumented) + PDF | parliamentary record is public; quote verbatim with citation | none | v0.6 |
| Committee reports | sansad.in committees; loksabhadocs (intermittent) | PDF | reports laid in the House reproducible (s.52(1)(q)(iii)) | 63 committees, no reports | v0.6 |
| CAG audits | [cag.gov.in](https://cag.gov.in/) audit reports | PDF | laid in legislature → reproducible | none | v0.7 |
| Budgets and outcome budgets | [indiabudget.gov.in](https://www.indiabudget.gov.in/) (PDF + XLS statements); Open Budgets India (CBGA; CSV/CKAN — unreachable on 2026-09-25); state finance departments | XLS/PDF | government works; GIGW copyright notice permits accurate, attributed reproduction | Union BE 2026-27 | v0.7 |
| Spending | [PFMS](https://pfms.nic.in/) public reports (aggregate); scheme MIS dashboards (MGNREGA, PMAY-G, PM-KISAN, JJM, NHM) | HTML dashboards, some Excel | never beneficiary-level; aggregate to district | none | v0.7 |
| Procurement | [GeM bids](https://bidplus.gem.gov.in/all-bids) (JSON behind SPA); [CPPP](https://eprocure.gov.in/eprocure/app) (HTML; captcha for documents); state portals | scrape | supplier names are business data; repeat-winner stats need a published method (defamation by implication) | none | v1.4 |
| Schemes | [myScheme](https://www.myscheme.gov.in/) (API 403 to bots); [DBT Bharat](https://dbtbharat.gov.in/) | HTML | eligibility text is public | none | v0.9 router |
| Elections and affidavits | ECI [results](https://results.eci.gov.in/) and [affidavits](https://affidavit.eci.gov.in/) (Form 26 PDFs); [ADR/MyNeta](https://www.myneta.info/) summaries; state CEOs; SECs | HTML/PDF | voters' right to know: PUCL v. UoI (2003), Resurgence India v. ECI (2013), Rambabu Singh Thakur v. Sunil Arora (2020); republish structured summaries only; RPA s.126/126A during polls | none | v1.5 |
| RTI | [rtionline.gov.in](https://rtionline.gov.in/) (filing); CIC decisions; s.4 proactive-disclosure pages | no open dataset of replies | DPDP s.44(3) narrowed RTI s.8(1)(j) for personal information — do not depend on RTI for personal data | none | v1.x (index of s.4 disclosures) |
| Gazette notifications | [eGazette](https://egazette.gov.in/) (search; PDF); state gazettes | scrape + PDF (Hindi/English) | reproducible | none | v0.3 Gazette Watch |
| Court cases and pendency | NJDG dashboards; eSCR; [judgments.ecourts.gov.in](https://judgments.ecourts.gov.in/) | HTML; API institutional-only | judgments reproducible (s.52(1)(q)(iv)); no party-level personal data | none | v0.8 |
| Public grievances | [CPGRAMS](https://pgportal.gov.in/); DARPG monthly reports | PDF | aggregate only | none | v0.7 |
| Open data | [data.gov.in](https://data.gov.in/) (API with key, rate-limited — 429 on a shared key); [NDAP](https://ndap.niti.gov.in/); MoSPI eSankhyiki | API/CSV | [GODL-India](https://data.gov.in/government-open-data-license-india) (attribution, no endorsement) | none | v0.5+ |
| Census and geography | Census 2011; Census 2027 (houselisting from Apr 2026, enumeration Feb–Mar 2027); LGD; India Post pincode directory (data.gov.in) | CSV | public | LGD aggregates | v0.5 |
| Transfers and postings | state GAD order PDFs; DoPT ERS/civil list (supremo/easy — nic.in intermittently unreachable outside India); IPS civil list (MHA) | PDF | official capacity | none | v0.5 tracker |
| Meetings and decisions | PIB "Cabinet decisions"; LS/RS Bulletins; committee sitting notices; municipal agendas (rare) | HTML/PDF | public | none | v0.6 |
| News | 7 English feeds today; regional-language feeds; PIB | RSS | store link + title + ≤30-word excerpt; **never full text** (unlike CivLab) | ~26,000 articles | v0.4 |

### 2.3 Legal and ethical constraints

- **Copyright Act, 1957, s.52(1)(q).** Reproducing Gazette matter (other than Acts), Acts (with commentary or other original matter), reports of government committees laid before a legislature, and court judgments is not infringement. Other government works are Crown-style copyright (s.17(d)), but the standard GIGW copyright notice on `gov.in` sites permits reproduction free of charge provided it is accurate, not used in a derogatory or misleading context, and the source is prominently acknowledged — we cite the source page on every fact. `data.gov.in` resources are under GODL-India: attribute, never imply endorsement.
- **News.** Fair dealing (s.52(1)(a)) does not cover storing full article text. We keep link, title, publisher, date and a short excerpt; CivLab's practice of serving full article HTML is not one to copy in India.
- **Digital Personal Data Protection Act, 2023** (Rules notified 13 Nov 2025; Board first, consent managers from Nov 2026, substantive obligations from 13 May 2027). Section 3(c)(ii) exempts personal data made public by the data principal or by someone under a legal obligation to publish it — the Gazette, parliamentary records, ECI affidavits and court records fall here. We still minimise: the sansad.in members API exposes personal mobile numbers, home addresses and children counts; we take name, constituency, party, term dates, official email, and year of birth only. Never Aadhaar, PAN, bank details, family members, or minors. Publish a takedown/correction address and act within 72 hours.
- **Defamation** — Bharatiya Nyaya Sanhita, 2023, s.356 (criminal) and civil defamation. Exceptions for truth in the public interest and fair comment on public conduct of public servants protect *facts quoted from the record*, not adjectives. Rule: only primary-record facts about a person, no characterisation, right of reply, visible corrections log.
- **Elections** — Representation of the People Act, 1951, s.126 (48-hour silence) and s.126A (no exit polls). We never publish predictions or exit polls; copy stays Model-Code-neutral; no political advertising, ever.
- **Intermediary rules (IT Rules, 2021).** Hosting user-generated edits or comments makes us an intermediary with grievance-officer and takedown duties. Until v1.0, contributions flow through GitHub pull requests and issues (GitHub is the intermediary); in-app "report an error" only pre-fills an issue.
- **Scraping etiquette.** Identify as `SarkarGraphBot (+repo URL)`, ≤1 request/second per host, cache, prefer bulk downloads and APIs, honour robots.txt. Several NIC hosts geo-block or WAF-block non-Indian or non-browser clients — watchers need an India-hosted runner.
- **Judges, civil servants, security.** Official-capacity data only. Photos only from Wikimedia (licensed) or official portraits with a source; no press photographs.

## 3. Ideas that bridge people and government

Scored 1–5 on impact (how many Indians it helps, how much) and feasibility (sources exist, effort within one milestone); risk names the main failure mode. Ranked by impact × feasibility.

| # | Idea | What it is | Sources | Impact | Feas. | Risk | Where |
|---|---|---|---|---|---|---|---|
| 1 | **Kaun Zimmedar? (Who is responsible?)** | Type a pincode or village: your ward councillor / sarpanch → ULB or block → district (DM, SP, CEO ZP) → MLA → MP → the State and Union ministries for a subject, with the official grievance route (CPGRAMS category, state portal, helpline) at every rung | LGD, India Post pincode directory, AC/PC boundaries, our graph, CPGRAMS | 5 | 4 | wrong mapping for split pincodes — show ambiguity | v0.9 |
| 2 | **Vacancy Watch + Additional-Charge Index** | Every vacant statutory seat with days vacant and the legal deadline; every "additional charge" and acting arrangement; per-ministry and per-State totals | Gazette, DoJ, PESB, official sites, our `vacant`/`acting` flags | 4 | 5 | stale data reads as accusation — as-of date on every row | v0.3 |
| 3 | **Term Clock + Overdue Democracy tracker** | Deterministic calendar of retirements and term expiries (judges, CEC/ECs, CAG, UPSC, RBI, service chiefs, Governors, RS seats) and bodies whose elections are overdue under Arts. 243E/243U (municipalities, panchayats), States with a vacant SEC/Lokayukta/SIC, overdue Finance Commissions and Census | official DOBs/appointment dates; SEC sites; Constitution | 4 | 5 | none if only dates are shown | v0.3 / v0.5 |
| 4 | **Gazette Watch** | Daily diff of eGazette (and online state gazettes): classify each notification (appointment, rule change, new body, delimitation) and turn it into a change event with the PDF cited | eGazette search; state gazettes | 5 | 3 | Hindi/English PDF parsing; LLM classification must stay T0 until checked | v0.3 |
| 5 | **Sansad in Motion** | Questions and answers, debates, committee reports and attendance as a searchable, citation-first record: "What has the Government said about X?" answered only with quoted answers and links; per-MP and per-ministry views | sansad.in APIs, PDFs, PRS | 4 | 4 | none with verbatim quoting | v0.6 |
| 6 | **Money Trail to My District** | Budget line → scheme → district release/expenditure → outcome target vs CAG finding, per district and year | Union/State budgets, PFMS, scheme MIS, outcome budgets, CAG | 5 | 3 | dashboards change silently — snapshot every fetch | v0.7 |
| 7 | **Transfer Tracker** | Every DM/SP/Secretary posting with tenure length; per-State median tenure against the Supreme Court's two-year benchmark (Prakash Singh, 2006); the "musical chairs" view with the method published | state GAD orders, DoPT ERS, district sites | 4 | 3 | implies motive — show numbers, no narrative | v0.5 |
| 8 | **Vaada (promise tracker)** | Every ruling manifesto (Union + each State) split into commitments, each linked to evidence (bill, budget line, gazette, scheme dashboard) and a status: not started / in progress / delivered / partial / dropped / unverifiable; symmetrical across parties; no headline percentage; independent two-reviewer rule; right of reply | manifestos (short quotes under fair dealing), all of the above | 5 | 2 | partisanship, defamation, editorialising — the method page is the product | v2.0 pilot |
| 9 | **Ask Sarkar Graph (multilingual, voice, WhatsApp/Telegram)** | "Mera MLA kaun hai?" in 9 languages by text or voice; answers come only from the graph with a citation, "I don't know" otherwise; digests by seat, ministry, district | our data, Bhashini ASR/translation or IndicTrans2, WhatsApp/Telegram Bot APIs | 5 | 3 | hallucination — retrieval-only, evaluated on a fixed question set | v0.9 |
| 10 | **Open API + weekly data releases + snapshot provenance** | Versioned JSON/CSV releases, a documented read API, embeddable widgets for newsrooms, and a content hash + archived copy of every cited source so a fact can be re-checked years later | repo, Wayback | 4 | 5 | licence must be chosen first | v0.2 / v1.0 |
| 11 | **Court and Judge Watch** | HC-wise sanctioned/working/vacant judges, collegium pipeline with days at each stage, pendency per court | DoJ, sci.gov.in, NJDG | 4 | 4 | none | v0.8 |
| 12 | **Tender and Contract Network** | Awards → suppliers → departments; repeat-winner and single-bid metrics with a published method | GeM, CPPP | 4 | 3 | defamation by implication; captcha | v1.4 |
| 13 | **Representative Record** | Per MP/MLA: attendance, questions, debates, MPLADS use, bills, declared assets/cases as filed — facts only, no composite score | sansad, PRS, MPLADS, ECI/ADR | 4 | 4 | scorecard drift — enforce "no composite" in code review | v0.6 / v1.5 |
| 14 | **Change alerts** | Subscribe to a seat, body, State or district; email/RSS first, WhatsApp later | our change events | 4 | 4 | spam — digest by default | v0.9 |
| 15 | **Regional-language news in the Power map** | Feeds in 11 languages with script-aware alias tables so attention is not measured through English media alone | publisher RSS | 3 | 4 | tagger precision in Indic scripts | v0.4 |
| 16 | **Time Machine** | Date slider: who held every seat on any date since 2014, then back to 1950; predecessor/successor chains | Wikipedia/Wikidata seed → Gazette verification | 3 | 3 | historical claims need the same sourcing bar | v1.3 |
| 17 | **Wikidata two-way sync** | Push verified holders (P39 "position held" with qualifiers) to Wikidata and use its recent changes as a tripwire, not a source | Wikidata API | 3 | 4 | licence compatibility (CC0) | v1.x |
| 18 | **Meeting Watch** | Cabinet decisions (PIB), Parliament and committee sittings, State cabinet decisions, municipal council agendas where published | PIB, sansad, CMO sites | 3 | 3 | uneven availability | v0.6 |
| 19 | **Grievance heatmap** | CPGRAMS receipts/disposal per ministry and State, monthly | DARPG reports | 3 | 3 | PDF tables | v0.7 |
| 20 | **Offline-first, low-data mode** | PWA with the last graph cached, <300 KB first load, SMS fallback for "who is my MLA" | — | 3 | 4 | none | v0.9 |
| 21 | **Explain this office, in your language** | Plain-language cards for every kind of office ("what a Collector can and cannot do") in 9 languages, human-reviewed | Constitution, Acts, AoB Rules | 4 | 3 | translation quality | v0.9 |
| 22 | **Institution → officer chain** | A school (UDISE code) or hospital → the officers and elected representatives responsible for it | UDISE+, HMIS, LGD | 4 | 2 | scale | beyond 1.0 |
| 23 | **Chunav mode** | During an election: candidates per constituency with affidavit summaries, results live from ECI, by-election calendar; strict s.126/126A posture | ECI, ADR | 5 | 3 | legal exposure during polls | v1.5 |

## 4. Principles for accuracy and neutrality

These extend [`SOURCING_POLICY.md`](SOURCING_POLICY.md); where they conflict, the policy file wins until it is amended.

1. **Provenance on every fact.** A fact without a source URL, an as-of date and the date we checked it does not enter the public build. Agent-assisted facts also carry a batch id (`YYYYMMDD_topic_n`, CivLab's convention) and the model/prompt hash. Every cited page is archived (SHA-256 + Wayback save) at the moment of citation.
2. **Verification tiers, shown, never hidden.** T0 *proposal* (from a watcher or an LLM scaffold; never rendered publicly), T1 *sourced* (one source, may be secondary — shown as "not yet verified"), T2 *verified* (primary source dated within the current term and checked by a second person or an independent fetch), T3 *audited* (sampled in a published accuracy audit). These map onto `confidence: low | medium | high` plus the audit flag.
3. **The scaffold is never public.** LLMs may draft, extract from PDFs and classify; their output lands in `data/proposals/` as T0 and is promoted only by a reviewer who fetched the primary source independently. CI fails if a T0 item reaches `public/data/`. The live news tagger stays deterministic by default.
4. **Freshness is a promise with a number.** Union apex and Council of Ministers ≤24h from the PIB/Gazette event; State apex ≤72h; MPs/MLAs ≤7 days; district heads ≤14 days; budgets within 30 days of publication. The page shows "last updated" and the SLA dashboard shows misses.
5. **Corrections are append-only and public.** Issue → evidence → correction overlay (`data/corrections/`, with `by`, `date`, `reason`, `source`) → second reviewer → build → changelog entry with the diff. Research files are never rewritten silently. Disputes are settled by the better-sourced, more recent citation, not by seniority.
6. **No ranking of people without a published method.** Any number attached to a person (heat, attendance, tenure length) links to a method page with the formula, the code and the data; no composite "scores" of politicians or officials; comparisons are on one documented metric at a time; coverage is symmetrical across parties and governments (if we track one ruling party's promises we track all of them).
7. **Neutral language.** Descriptions state what a body does in plain words; no adjectives about people; party colours only where party is the data; no party or person gets prominence from layout.
8. **Personal-data minimisation.** Allowed fields for a person: name (with official transliteration), the office, dates, party, constituency, official email, year of birth, portrait with licence, links to official profiles. Everything else is out, even if public.
9. **Vacant, acting and additional charge are three different facts** and are never blurred (policy §4).
10. **Uncertainty is displayed.** "Not yet verified", "vacancy to confirm" and "sources disagree" are first-class states with their own badge, not footnotes.
11. **Reproducible builds and published error rates.** `pnpm graph` rebuilds everything from `data/raw` + `data/corrections`; generated files are checked in; a stratified sample (n ≥ 300) is re-verified each quarter and the error rate is published in `research/india/ACCURACY_AUDIT.md`.
12. **Right of reply.** Any named person or office can request a correction by email; acknowledgement within 72 hours; the outcome is logged.
13. **Independence.** Not affiliated with any government, party or campaign; no political advertising; stewards disclose party membership or government employment and do not review their own State's contentious items alone.
14. **Open by default.** Code and data under the licence chosen in [`LICENSING.md`](../LICENSING.md); weekly releases; a documented API; interchange export compatible with CivLab's node/edge shape so other countries' graphs can federate.

## 5. Non-goals

Opinion, endorsement or prediction of any kind; election forecasts or exit polls; beneficiary-level scheme data; private citizens; a replacement for official records (we always link out); user tracking or advertising.

## 6. Open decisions for the maintainer

1. Licence (recommended in `LICENSING.md`: MIT code, CC BY 4.0 data) — blocks the public repo.
2. Deploy target and domain; an India-hosted runner for watchers that NIC hosts block from abroad.
3. Whether to accept an LLM key in the pipeline for summaries and PDF extraction (T0 only) or stay fully deterministic until v0.6.
4. WhatsApp Business (cost, approval) vs Telegram (free) for v0.9.
5. Steward charter and the first 36 State-steward invitations.

## Sources consulted for this document

CivLab: [writing.civlab.org archive (API)](https://www.writing.civlab.org/api/v1/archive?sort=new), the essays linked in §1.1, [graph.civlab.org/us](https://graph.civlab.org/us), [/sf](https://graph.civlab.org/sf), [/request](https://graph.civlab.org/request), [`/api/v1/articles`](https://graph.civlab.org/api/v1/articles?limit=3&offset=0&govEntityId=us-congress), [`/api/v1/graph-requests`](https://graph.civlab.org/api/v1/graph-requests), [republic.civlab.org](https://republic.civlab.org/), [github.com/m-atoms/sf-gov-entities](https://github.com/m-atoms/sf-gov-entities), [IBTimes UK](https://www.ibtimes.co.uk/civlab-ai-map-us-federal-government-1820471); reverse-engineering reports in `research/civlab/`. India: every URL in §2, plus [PIB on DPDP Rules 2025](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf) and the [NJDG service page](https://ecommitteesci.gov.in/service/national-judicial-data-grid/).
