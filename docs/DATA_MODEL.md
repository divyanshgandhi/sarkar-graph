# Data model

A plain-language tour of how Sarkar Graph represents the Government of India, and of the three CSV exports.
Source of truth for the actual TypeScript types is [`src/lib/types.ts`](../src/lib/types.ts); source of truth
for the raw research format contributors write by hand is [`research/india/SCHEMA.md`](../research/india/SCHEMA.md).
This document exists to connect the two in one readable place — if it ever disagrees with either of those
files, they win.

## The pipeline, in one line

```
data/raw/<segment>.json  (hand-researched, SCHEMA.md format)
        + data/corrections/*.json  (overlay, see data/corrections/README.md)
        ↓  scripts/build-graph.ts  (pnpm graph)
public/data/graph/<gov>.json  (one GovGraph per government: "in" for the Union, else a state code)
        ↓  scripts/export.ts  (pnpm export)
exports/people.csv, exports/sources.csv, exports/gaps.csv, docs/DATA_COVERAGE.md
```

Raw research files are never hand-edited into the compiled graph or the CSVs — those are always generated.
Only `data/raw/*.json` and `data/corrections/*.json` are meant to be edited by contributors.

## GovGraph — one government's whole map

A `GovGraph` (defined in `src/lib/types.ts`) is the compiled, ready-to-render graph for one government — the
Union (`gov: "in"`), or one State/UT. It's what `pnpm graph` writes to `public/data/graph/<gov>.json`.

| Field | Meaning |
|---|---|
| `gov` | Short code: `"in"` for the Union, else a state/UT code from the ID rules in `research/india/SCHEMA.md` (`mh`, `up`, `tn`, …). |
| `name` / `nameHi` | Display name, English and (optionally) Hindi. |
| `kind` | `"union"` \| `"state"` \| `"ut"`. |
| `asOf` | The as-of date for this compiled snapshot (currently `2026-09-25` for all segments). |
| `root` | Node id of the root of this graph (the electorate/People seal). |
| `sectors` | The ordered list of sector wedges drawn around the wheel, with labels and relative `weight`. |
| `rings` | The concentric tiers of the layout, outermost (People) to innermost. |
| `nodes` | `Record<string, GNode>` — every entity and position in this government, keyed by id. |
| `edges` | `GEdge[]` — every formal relationship between nodes. |
| `stats` | Free-form summary counts for this government. |

## GNode — an entity or a position

`GNode` is a single type that covers **both** organisations/bodies (an "Entity" in the raw research schema) and
seats/office-holders (a "Position" in the raw schema) — `build-graph.ts` merges the two research concepts into
one node type for the renderer. `isPosition: true` marks the latter.

Key fields (see `src/lib/types.ts` for the complete, authoritative list):

- **Identity**: `id`, `kind` (raw `kind`, e.g. `"ministry"`, `"state"`, `"constitutional_body"` — see the full
  list in `research/india/SCHEMA.md`), `name`, `short`, `nameHi`, `abbr`, `aliases` (press names used for news
  tagging — be generous here).
- **Placement**: `shape` (drives the icon/geometry — see below), `sector` (drives which wedge it's drawn in —
  see below), `ring` (which concentric tier), `parent` / `children` (org hierarchy — *not* the same as the
  formal-power `edges`).
- **Description & legal basis**: `description` (1–3 plain factual sentences, no marketing), `legalBasis`,
  `legalSourceUrl`, `officialUrl`, `established`, `hq`.
- **Headship**: `head` (id of the position that heads this body — political head for ministries),
  `adminHead` (bureaucratic head: Secretary/Chief Secretary/Registrar); for a position node, `headOf` points the
  other way.
- **Scale**: `seats` (sanctioned strength for chambers/commissions/courts), `stats` (free-form numeric facts),
  `budget` (see `Budget` below).
- **Position-only fields**: `title`, `rank` (see ranks below), `holder` (see `Holder` below, `null` if vacant),
  `vacant`, `appointmentMode` (`elected` \| `appointed` \| `nominated` \| `ex_officio` \| `indirectly_elected` \|
  `by_rotation` \| `collegium`), `members` (seats listed *inside* a body rather than drawn on the wheel directly
  — MPs, MoS, judges, commission members; see `Member` below).
- **Provenance**: `sources` (URLs), `confidence` (`"high" | "medium" | "low"` — see
  [`docs/SOURCING_POLICY.md`](SOURCING_POLICY.md)), `notes`.
- **Federal drill-in**: `link` / `linkId` — lets a State node on the Union wheel open that state's own wheel.
- `cluster` — true if this node is drawn as a small mark in a dot-grid cluster until its parent body is
  selected (used for small/numerous bodies so the wheel stays legible).

### Sectors

The seven wedges the layout is organised around (`Sector` in `src/lib/types.ts`, matching the raw schema's
`sectors`):

`people` (the electorate, at the centre) · `executive` (Union executive: ministries, agencies, forces, CPSEs) ·
`legislative` (Parliament) · `judicial` (Supreme Court, High Courts, tribunals) · `constitutional`
(constitutional and independent statutory/regulatory bodies: ECI, CAG, UPSC, RBI, SEBI, NHRC, CVC…) ·
`federal` (States & UTs and everything inside them) · `local` (local government tiers).

### Shapes

What icon/geometry a node is drawn with (`Shape` in `src/lib/types.ts`): `seal` (the People), `office` (an
elected/constitutional office — President, CM, Governor), `head` (a seat that heads a body — minister,
secretary, chair), `body` (ministry, department, agency), `commission` (regulators, constitutional/statutory
commissions), `advisory` (advisory bodies, councils), `court` (courts and tribunals), `corporation` (CPSEs,
banks, statutory corporations), `force` (armed forces, CAPFs, police), `chamber` (a house of a legislature),
`committee` (parliamentary/cabinet committees), `state` (a State/UT — drills into its own wheel), `district`,
`tier` (an aggregate tier of local government).

### Ranks

The seniority/type of a position (free-form string, drawn from the fixed vocabulary in
`research/india/SCHEMA.md`): `head_of_state`, `vice_head_of_state`, `head_of_government`, `cabinet_minister`,
`mos_independent_charge`, `minister_of_state`, `deputy_chief_minister`, `governor`, `lieutenant_governor`,
`administrator`, `chief_minister`, `state_minister`, `presiding_officer`, `deputy_presiding_officer`,
`leader_of_opposition`, `member_of_parliament`, `member_of_legislature`, `chief_justice`, `judge`, `secretary`,
`head_of_agency`, `commission_member`, `chief_of_staff`, `law_officer`, `other`. Ranks in the `TOP` set
(head_of_state, cabinet_minister, chief_minister, governor, chief_justice, secretary, etc. — see
`scripts/export.ts`) are treated as higher-priority for gap flagging.

### Seat states

A position's occupancy is one of three states — see
[`docs/SOURCING_POLICY.md` §4](SOURCING_POLICY.md#4-vacancies-acting-and-additional-charge) for how these are
recorded and verified:

- **Held, regular** — `holder` set, `holder.acting` false/absent, `vacant` false/absent.
- **Held, acting/officiating/additional charge** — `holder` set, `holder.acting: true`, detail in
  `holder.notes`.
- **Vacant** — `vacant: true`, `holder: null`.

## Holder — who's in the seat

```ts
interface Holder {
  name: string;
  since?: string;       // ISO date this stint began
  party?: string;        // abbreviation, politicians only — omit for officials
  house?: string;         // for MPs/MLAs: "Lok Sabha", "Rajya Sabha", etc.
  constituency?: string;
  wikipedia?: string;     // used to fetch a portrait via scripts/fetch-images.ts
  image?: string;
  acting?: boolean;       // acting / officiating / additional charge
  notes?: string;
}
```

## Member — a seat listed inside a body

Used for large membership bodies (the 543 Lok Sabha seats inside `in-lok-sabha`, judges inside a High Court,
members of a commission) rather than drawing every seat directly on the wheel:

```ts
interface Member {
  id: string;
  title: string;
  rank?: string;
  seat?: string;           // seat number / constituency / bench, e.g. "Varanasi", "Judge 12"
  holder?: Holder | null;
  vacant?: boolean;
  appointmentMode?: string;
  sources?: string[];
  confidence?: Confidence;
}
```

## GEdge — a formal power relationship

Edges are **not** the same as `parent`/`children` (which is mere organisational hierarchy). An edge is a
specific, named, formal relationship:

```ts
interface GEdge {
  id: string;
  from: string;   // node id
  to: string;     // node id
  type: RelType;
  basis?: string;  // e.g. "Article 75(1)"
  source?: string;
}
```

`RelType`: `elects` (electorate → chamber/seat), `indirectly_elects` (electoral college → President/VP/RS),
`appoints`, `advises_appointment`, `nominates`, `removes` (e.g. Parliament → judges via impeachment), `oversees`
(parliamentary committee / ministry → body), `administers` (ministry → body under its administrative control),
`reports_to`, `ex_officio` (seat → body it sits on by virtue of office), `member_of`, `advises`,
`accountable_to` (Council of Ministers → Lok Sabha), `audits` (CAG → …), `heads`, `has_jurisdiction_over`.

## Budget

```ts
interface Budget {
  fy: string;         // e.g. "2026-27"
  be?: number;          // budget estimate, ₹ crore
  re?: number; reFy?: string;      // revised estimate + its FY
  actual?: number; actualFy?: string;
  capital?: number;
  share?: number;        // share of total union expenditure
  rank?: number; of?: number;
  source?: string;
}
```

## Confidence

`"high" | "medium" | "low"` — see [`docs/SOURCING_POLICY.md` §3](SOURCING_POLICY.md#3-verification-tiers) for
what each tier requires. `low` renders in the UI as "not yet verified."

## The three CSV exports

All three are generated by `scripts/export.ts` (`pnpm export`) from the
compiled graph — never hand-edit them, they'll be overwritten. Re-run after every data change.

### `exports/people.csv` — one row per seat

| Column | Meaning |
|---|---|
| `person_key` | Deterministic slug from the holder's name (title-stripped, lowercased), empty if vacant. It is not a verified person identifier: aliases can split one person and namesakes can collide. |
| `person_name` | Holder's name as recorded, empty if vacant. |
| `position_title` | The seat's title. |
| `seat` | Seat number / constituency / bench label, where the position has one. |
| `rank` | See ranks above. |
| `body` / `body_id` | The entity this seat belongs to (name and id). |
| `position_id` | The position's own node id. |
| `government` / `gov_code` | Which government ("Government of India" / `in`, or a State/UT). |
| `sector` | The body's sector (see sectors above). |
| `party` | Party abbreviation, politicians only. |
| `since` | Date the holder took this stint. A head of government re-sworn after an election keeps the date their unbroken tenure began (Modi 2014-05-26); a minister whose portfolio changes, or a legislator re-elected, starts a new stint (legislators from the date results were declared). |
| `acting_or_additional_charge` | `"yes"` if `holder.acting` is true. |
| `house` / `constituency` | For MPs/MLAs. |
| `vacant` | `"yes"` if the seat has no holder. |
| `wikipedia` / `photo` | Wikipedia page and portrait URL, when available. |
| `confidence` | `high` / `medium` / `low`. |
| `sources` | Every source URL for this seat, `\|`-joined. |
| `as_of` | The compiled graph's as-of date. |

### `exports/sources.csv` — every cited source

One row per distinct source URL found anywhere in `data/raw/*.json` (entity facts, legal basis, official
websites, budget sources, office-holder sources, Wikipedia references, relation sources) plus the live news
feeds and the Wikipedia image API.

| Column | Meaning |
|---|---|
| `url` | The source URL. |
| `domain` | Hostname, `www.` stripped. |
| `source_type` | `official` (`.gov.in`/`.nic.in`/PIB/ECI/court/RBI/SEBI/etc.), `encyclopedia` (Wikipedia/Wikimedia), `press / analysis` (The Hindu, Indian Express, PRS, Bar & Bench, etc.), or `other` — see the classifier in `scripts/export.ts` if you want to extend it. |
| `used_for` | What kinds of facts cite this source (`entity facts`, `office-holder`, `legal basis`, `official website`, `budget`, `relationship`, `office-holder reference`, `segment source`, `live news feed`, …), `\|`-joined. |
| `facts_citing` | How many facts cite this URL. |
| `segments` | Which `data/raw/*.json` segment(s) cite it, `\|`-joined. |

### `exports/gaps.csv` — every known gap, prioritised

The contributor backlog, documented in full in `CONTRIBUTING.md` under "Picking a gap": `gap_id`, `priority`
(`high`/`medium`/`low`), `gap_type` (`holder_unknown`, `unverified_holder`, `holder_unsourced`,
`vacancy_to_confirm`, `tenure_start_unknown`, `missing_description`, `missing_legal_basis`,
`missing_department_secretary`, `missing_district_head`, `missing_city_heads`, `missing_departments`,
`missing_mlas`), `government`/`gov_code`, `item_id`/`item_name`, `detail`, `how_to_help`.
