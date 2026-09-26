# India Gov Graph — raw research schema (v1)

Every research segment writes ONE file: `data/raw/<segment>.json` (write it with python `json.dump(..., ensure_ascii=False, indent=1)` and re-load it to prove it parses). As-of date for everything: **2026-09-25**. Money is in **₹ crore**. Dates are ISO `YYYY-MM-DD` (use `YYYY` or `YYYY-MM` when that is all a source gives).

```jsonc
{
  "segment": "union-ministries-a",          // your segment key
  "asOf": "2026-09-25",
  "notes": "free text: gaps, doubts, things you could not verify",
  "entities":  [ /* Entity */ ],
  "positions": [ /* Position */ ],
  "relations": [ /* Relation */ ]
}
```

## Entity — an organisation, body, chamber, court, jurisdiction

```jsonc
{
  "id": "in-min-home-affairs",              // see ID rules below — MUST be stable & unique
  "kind": "ministry",                       // see kinds below
  "sector": "executive",                    // see sectors below
  "name": "Ministry of Home Affairs",       // official English name
  "nameHi": "गृह मंत्रालय",                  // official Hindi name when you can find it, else omit
  "abbr": "MHA",                            // common abbreviation, else omit
  "aliases": ["Home Ministry"],             // names the press uses (used for news tagging) — be generous
  "parentId": "in-union-government",        // the entity it sits inside (org hierarchy)
  "description": "1–3 plain factual sentences: what it actually does, for a citizen. No marketing.",
  "legalBasis": "Government of India (Allocation of Business) Rules, 1961",   // Article / Act / Rule / Resolution
  "legalSourceUrl": "https://…",            // India Code / Constitution / gazette link if available
  "officialUrl": "https://www.mha.gov.in",
  "established": "1947",
  "hq": "New Delhi",
  "headPositionId": "in-pos-minister-home-affairs",  // the position that heads it (political head for ministries)
  "adminHeadPositionId": "in-pos-secretary-home",    // optional: bureaucratic head (Secretary / Chief Secretary / Registrar)
  "seats": 543,                             // for chambers/commissions/courts: sanctioned seats/strength
  "stats": { "workingStrength": 30, "vacancies": 4 },   // optional free-form numeric facts WITH a source in sources[]
  "budget": { "fy": "2026-27", "be": 233211.0, "reFy": "2025-26", "re": 0, "actualFy": "2024-25", "actual": 0, "source": "https://…" },
  "employees": { "count": 0, "asOf": "2025", "source": "https://…" },
  "sources": ["https://…"],                 // every fact above must be traceable to one of these
  "confidence": "high"                      // high | medium | low
}
```

### kinds
Union/central: `constituency`, `head_of_state_office`, `council_of_ministers`, `cabinet`, `cabinet_committee`, `ministry`, `department`, `independent_department` (e.g. Dept of Space, DAE), `attached_office`, `subordinate_office`, `autonomous_body`, `statutory_body`, `constitutional_body`, `regulator`, `tribunal`, `court`, `commission`, `advisory_body`, `investigative_agency`, `intelligence_agency`, `armed_force`, `capf` (central armed police force), `cpse` (central public sector enterprise), `public_sector_bank`, `legislature`, `chamber`, `parliamentary_committee`, `secretariat`, `mission` (flagship scheme/mission with its own body).
States/local: `state`, `union_territory`, `state_government`, `state_council_of_ministers`, `state_legislature`, `state_chamber`, `state_department` (only if you list them), `state_commission` (SEC, SPSC…), `division`, `district`, `municipal_corporation`, `local_government_tier` (aggregates like "Gram Panchayats of Bihar" with a count in `seats`).

### sectors (drive the radial layout)
`electorate` · `executive` (Union executive incl. ministries, agencies, forces, CPSEs) · `legislative` (Parliament) · `judicial` (SC, HCs, tribunals) · `constitutional` (constitutional + independent statutory/regulatory bodies: ECI, CAG, UPSC, RBI, SEBI, NHRC, CVC…) · `federal` (States & UTs and everything inside them) · `local` (local government tiers).

## Position — a seat that a person holds

```jsonc
{
  "id": "in-pos-minister-home-affairs",
  "title": "Minister of Home Affairs",
  "titleHi": "गृह मंत्री",                    // optional
  "orgId": "in-min-home-affairs",           // entity this seat belongs to
  "rank": "cabinet_minister",               // see ranks
  "seat": null,                             // seat number / constituency / bench for multi-member bodies ("Election Commissioner 2", "Varanasi")
  "appointmentMode": "appointed",           // elected | appointed | nominated | ex_officio | indirectly_elected | by_rotation | collegium
  "appointedBy": "in-pos-president",        // position id that formally appoints/elects (use in-electorate for direct election, st-xx-electorate for state)
  "onAdviceOf": "in-pos-prime-minister",    // optional: position whose advice binds the appointment
  "termYears": 5,                           // optional
  "holder": {                               // null if vacant
    "name": "Amit Shah",
    "since": "2024-06-10",                  // date they took THIS seat (current stint)
    "party": "BJP",                          // party abbreviation for politicians; omit for officials
    "house": "Lok Sabha",                   // for MPs/MLAs
    "constituency": "Gandhinagar, Gujarat",
    "wikipedia": "https://en.wikipedia.org/wiki/Amit_Shah",   // REQUIRED when a page exists (we fetch photos from it)
    "acting": false,                         // true if acting / officiating / additional charge
    "notes": "Also holds Ministry of Cooperation"
  },
  "vacant": false,
  "sources": ["https://…"],                 // at least one source dated 2025-2026 confirming the CURRENT holder
  "confidence": "high"
}
```

### ranks
`head_of_state`, `vice_head_of_state`, `head_of_government`, `cabinet_minister`, `mos_independent_charge`, `minister_of_state`, `deputy_chief_minister`, `governor`, `lieutenant_governor`, `administrator`, `chief_minister`, `state_minister`, `presiding_officer`, `deputy_presiding_officer`, `leader_of_opposition`, `member_of_parliament`, `member_of_legislature`, `chief_justice`, `judge`, `secretary` (Secretary to GoI / Chief Secretary), `head_of_agency` (Director / DG / Chairman / CMD / Governor of RBI…), `commission_member`, `chief_of_staff` (service chiefs), `law_officer` (AG, SG), `other`.

## Relation — a formal power relationship (not mere hierarchy — hierarchy is `parentId`)

```jsonc
{ "from": "in-pos-prime-minister", "to": "in-pos-minister-home-affairs", "type": "advises_appointment", "basis": "Article 75(1)", "source": "https://…" }
```

types: `elects` (electorate → chamber/seat), `indirectly_elects` (electoral college → President/VP/RS), `appoints`, `advises_appointment`, `nominates`, `confirms` (rare in India; e.g. none — do not invent), `removes` (e.g. Parliament → judges via impeachment), `oversees` (parliamentary committee / ministry → body), `administers` (ministry → body under its administrative control), `reports_to`, `ex_officio` (seat → body it sits on by virtue of office), `member_of`, `advises`, `accountable_to` (CoM → Lok Sabha), `audits` (CAG → …), `funds` (optional).

## ID rules (MUST follow — other agents reference these)
- lowercase kebab-case, ASCII only.
- Union entities: `in-min-<ministry>` (drop "ministry of", keep the rest: `in-min-agriculture-and-farmers-welfare`), `in-dept-<department>` (`in-dept-revenue`, `in-dept-economic-affairs`), other union bodies `in-<abbr-or-slug>` (`in-rbi`, `in-sebi`, `in-cbi`, `in-nhai`, `in-isro`).
- Union positions: `in-pos-<slug>`: `in-pos-minister-<ministry-slug>` (the cabinet/IC minister), `in-pos-mos-<ministry-slug>-<n>` (ministers of state, n=1..), `in-pos-secretary-<department-slug>`, `in-pos-chair-<body>`, `in-pos-member-<body>-<n>`, `in-pos-judge-sc-<n>`.
- States: `st-<code>` with codes: an ap ar as br ch cg dh dl ga gj hp hr jh jk ka kl la ld mh ml mn mp mz nl od pb py rj sk tg tn tr up uk wb  (dh = Dadra and Nagar Haveli and Daman and Diu, la = Ladakh, ld = Lakshadweep, ch = Chandigarh, an = Andaman and Nicobar Islands, jk = Jammu and Kashmir).
  - `st-<code>-government`, `st-<code>-council-of-ministers`, `st-<code>-assembly` (Vidhan Sabha), `st-<code>-legislative-council` (Vidhan Parishad, only where it exists), `st-<code>-pos-governor` (or `-pos-lieutenant-governor` / `-pos-administrator`), `st-<code>-pos-chief-minister`, `st-<code>-pos-deputy-cm-<n>`, `st-<code>-pos-minister-<n>`, `st-<code>-pos-speaker`, `st-<code>-pos-leader-of-opposition`, `st-<code>-pos-chief-secretary`, `st-<code>-pos-dgp`, `st-<code>-dist-<district-slug>`, `st-<code>-mc-<city-slug>` (municipal corporation), `st-<code>-sec` (State Election Commission), `st-<code>-psc`.
- High Courts are Union judiciary: `in-hc-<name-slug>` (`in-hc-bombay`, `in-hc-allahabad`, `in-hc-madras`, `in-hc-punjab-and-haryana`); positions `in-pos-cj-hc-<name-slug>`.
- People are NOT separate records; they live in `holder`.

## Canonical shared IDs (reference these; do not redefine them unless your segment owns them)
| id | what | owner segment |
|---|---|---|
| `in-electorate` | People of India (root) | core |
| `in-constitution` | Constitution of India | core |
| `in-union-government` | Government of India (Union executive root) | core |
| `in-presidents-secretariat` | President's Secretariat (Rashtrapati Bhavan) | core |
| `in-pos-president` | President of India | core |
| `in-pos-vice-president` | Vice-President of India (also RS Chairman) | core |
| `in-pos-prime-minister` | Prime Minister | core |
| `in-union-council-of-ministers` | Union Council of Ministers | core |
| `in-union-cabinet` | Union Cabinet | core |
| `in-pmo` | Prime Minister's Office | core |
| `in-cabinet-secretariat` / `in-pos-cabinet-secretary` | | core |
| `in-parliament` / `in-lok-sabha` / `in-rajya-sabha` | | parliament |
| `in-pos-speaker-lok-sabha` / `in-pos-chairman-rajya-sabha` | | parliament |
| `in-supreme-court` / `in-pos-chief-justice-of-india` | | judiciary |
| `in-eci` / `in-cag` / `in-upsc` / `in-finance-commission` / `in-niti-aayog` / `in-rbi` | | constitutional / core |
| `in-min-*` / `in-dept-*` | every Union ministry & department (list in MINISTRIES.md) | ministries-* |
| `st-<code>` | each State / UT | states-* |

## Quality bar
- **Current as of 2026-09-25.** India changed a lot in 2025–26 (new Vice-President after July 2025 resignation, new CJI Nov 2025, new CEC Feb 2025, Bihar election Nov 2025, Assam/Kerala/Tamil Nadu/West Bengal/Puducherry elections Apr–May 2026, Rajya Sabha biennial elections 2026, possible Union reshuffle, new Governors). Never trust memory for an office-holder: confirm with a 2025–2026 source. Prefer: official portals (*.gov.in, *.nic.in), PIB press releases, Wikipedia (check the page's current revision), reputable press (The Hindu, Indian Express, PRS).
- If you cannot confirm a holder, still include the position, set `confidence: "low"` and explain in `notes`. **Never invent** a person, number, date or URL.
- Descriptions: specific and useful ("Collects direct taxes through CBDT and indirect taxes through CBIC"), never generic ("plays a vital role").
- `aliases` matter: they power real-time news tagging. Include abbreviations, Hindi-English press names ("Home Ministry", "MHA", "Nirvachan Sadan" for ECI is NOT an alias—only names that refer to the body).
- Tools: `curl` (set a desktop browser User-Agent), WebSearch, WebFetch, python at `.venv-research/bin/python` (has `pypdf`, `bs4`). Wikipedia API is great for bulk tables: `https://en.wikipedia.org/w/api.php?action=parse&page=<Title>&prop=text&format=json&formatversion=2` → parse the HTML tables with bs4. Do NOT run npm/npx/pnpm installs (standing npm supply-chain freeze). Do not use browser tools.
