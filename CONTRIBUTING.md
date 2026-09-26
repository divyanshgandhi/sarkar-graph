# Contributing to Sarkar Graph

Sarkar Graph is trying to build the most accurate, most complete, real-time map of who holds power in the
Government of India — every ministry, court, commission, State/UT government, and eventually every district,
municipality and panchayat — with a public source for every fact. That's a huge dataset. We can't build it
alone, and we'd rather have it slower and right than fast and wrong.

This document is the practical guide: who can help, how the project is set up, and the exact steps to add or
correct a fact. For the rules that keep the data trustworthy, read
[`docs/SOURCING_POLICY.md`](docs/SOURCING_POLICY.md) — every contribution has to follow it.

## Before you dig in

- Read `docs/DATA_COVERAGE.md` for what's mapped fully, mapped partly, and not mapped at all.
- Read `exports/gaps.csv` for the exact, itemised list of what's missing (see "Picking a gap" below).
- Read `research/india/SCHEMA.md` for the raw data format.
- Read `docs/DATA_MODEL.md` for a plain-language tour of the graph and the CSV exports.

## Ways to help (contributor tracks)

You don't need to touch code to help. Pick whichever of these matches what you're good at:

**Data stewards (per State / UT)** — adopt a State or UT and keep it moving: confirm the current Governor/LG,
Chief Minister, Council of Ministers, MLAs, and departments against official sources; fill in administrative
secretaries; add District Magistrates once that layer opens up. Filter `exports/gaps.csv` to your `gov_code`
(e.g. `mh`, `up`, `dl`) to see exactly what's outstanding for your state.

**Source adapters / researchers** — bring in a whole layer that isn't mapped yet: Panchayati Raj (Gram
Panchayats, Panchayat Samitis, Zila Parishads), urban local bodies below the municipal corporations, district
administration (DM/Collector, SP, CEO Zila Parishad), subordinate judiciary, police below the DGP, PSU boards,
state budgets, or legislative activity (bills, questions, committee reports). See "Not mapped yet" in
`docs/DATA_COVERAGE.md` for the full list. This usually means a new or extended `data/raw/<segment>.json` file
following `research/india/SCHEMA.md`.

**Verifiers** — the project's quality bar depends on a second pair of eyes. Pick rows from `exports/gaps.csv`
with `gap_type` = `unverified_holder` or `holder_unsourced`, or any seat with `confidence: "low"` in the raw
data, and confirm or correct them against a primary 2025–26 source. This is the single highest-leverage way to
help — it turns "not yet verified" into something a citizen can trust.

**Translators** — add or check official Hindi names (`nameHi` / `titleHi` in the schema) for entities and
positions, and official names in other languages where the body itself publishes one (e.g. a State Assembly's
name in the state's official language). The interface is English-first with Hindi as a secondary label, so
accuracy on the Hindi labels matters more than volume.

**Designers** — the wheel, the party-colour legend, the side panel, dark mode, mobile layout (it has to work
well on a phone — that's the primary surface), and accessibility (contrast, focus states, screen-reader labels
for a very information-dense graphic). See `PRODUCT.md` for the brand direction.

**Engineers** — `scripts/build-graph.ts` (the compiler), `src/lib/layout.ts` (the radial layout), the live news
pipeline (`src/lib/server/*`, `/api/live`, `scripts/ingest-news.ts`), the GitHub Action that keeps the news
archive fresh (`.github/workflows/ingest.yml`), and the app itself (`src/app`, `src/components`).

## Local setup

Sarkar Graph runs under a supply-chain freeze: **pnpm 11**, pinned dependency versions, a 7-day
`minimumReleaseAge`, and dependency build scripts disabled. Don't switch to npm/yarn, don't loosen version
pins, and don't add a dependency without discussing it first (open an issue).

```bash
pnpm install          # pnpm 11.1.0, respects the minimumReleaseAge freeze in pnpm-workspace.yaml
```

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server at http://localhost:5190 |
| `pnpm graph` | Compiles `data/raw/*.json` (+ any `data/corrections/*.json` overlays) into `public/data/graph/*.json`, plus search, people and the change log. Run this after any data edit. |
| `pnpm images` | Fetches Wikipedia portraits into `data/images.json` (then re-run `pnpm graph`). |
| `pnpm ingest` | Pulls the live news feeds into `data/news/store.json`. |
| `pnpm check:layout` | Lays out every government and reports any overlapping marks — a regression check, run it after touching data or `src/lib/layout.ts`. |
| `pnpm coverage` | Prints an integrity/coverage report and writes `research/india/COVERAGE.md`. |
| `pnpm export` | Regenerates `exports/people.csv`, `exports/sources.csv`, `exports/gaps.csv` and `docs/DATA_COVERAGE.md` from the compiled graph. |
| `pnpm lint` | `tsc --noEmit` — type-check before opening a PR. |
| `pnpm build` | Production build (`next build`) — should pass before merging anything touching `src/`. |

Node 22.6+ is required (the data scripts run TypeScript directly via `--experimental-strip-types`, no build
step). No LLM API key is used or required anywhere in this pipeline — news tagging is a deterministic
longest-match tagger, by design (see `PRODUCT.md`).

## Picking a gap

`exports/gaps.csv` is the authoritative, itemised backlog. Every row is one concrete, fixable thing:

| Column | Meaning |
|---|---|
| `gap_id` | Stable id for the gap (reference it in your PR/issue, e.g. `G01234`). |
| `priority` | `high` / `medium` / `low` — `high` is a top-of-government seat (minister, CM, Governor, chief justice…) with no holder recorded. Start high, then medium. |
| `gap_type` | What's missing: `holder_unknown`, `unverified_holder`, `holder_unsourced`, `vacancy_to_confirm`, `tenure_start_unknown`, `missing_description`, `missing_legal_basis`, `missing_department_secretary`, `missing_district_head`, `missing_city_heads`, `missing_departments`, `missing_mlas`. |
| `government` / `gov_code` | Which government the gap belongs to (`in` for the Union, else a state code from `research/india/SCHEMA.md`). |
| `item_id` / `item_name` | The node or position id/name in the graph. |
| `detail` | What's specifically missing. |
| `how_to_help` | What source to look for and what to do with it. |

Sort/filter it however's easiest (spreadsheet, `csvkit`, `awk`) — e.g. `priority=high` and your state's `gov_code`
is a good first slice to work through.

## The exact workflow to add or correct a fact

Every factual change goes one of two ways:

**1. Editing research directly** (for new facts, or when you're the one doing primary research on a segment)
   - Open the right file in `data/raw/<segment>.json`. Segment ownership and the ID scheme are in
     `research/india/SCHEMA.md` — read it before you start, especially the ID rules (other files reference
     these ids, so don't invent a new pattern).
   - Add or edit the `entities` / `positions` / `relations` you're confirming, each with `sources` (at least
     one URL, dated 2025–2026 for a current office-holder) and `confidence`.
   - Validate the file still parses as JSON (`python3 -c "import json; json.load(open('data/raw/<segment>.json'))"`
     or equivalent) before committing.

**2. Adding a correction overlay** (for fixing something in an existing segment without a full re-research pass
   — the lower-friction path for most contributors, and the only path if you don't own the segment)
   - Add an entry to a new or existing file in `data/corrections/`. Format and a worked example are in
     [`data/corrections/README.md`](data/corrections/README.md).
   - This is the right path for: a minister reshuffled, a vacancy filled, a typo in a name, a wrong date, a
     party abbreviation that changed.

**Either way:**
   - Every change needs a **source URL and a date**. No source, no merge — see
     [`docs/SOURCING_POLICY.md`](docs/SOURCING_POLICY.md) for the source hierarchy and verification tiers.
   - Run:
     ```bash
     pnpm graph
     pnpm check:layout
     pnpm export
     ```
     Commit the resulting changes to `public/data/graph/*.json`, `exports/*.csv` and `docs/DATA_COVERAGE.md`
     alongside your data edit — they're generated, but they're checked in so reviewers and CI can diff them.
   - Open a PR using the template (`.github/pull_request_template.md` is applied automatically) and fill in
     every checklist item, especially the source URL/date and the "no personal data" confirmation.

If you don't want to touch the JSON yourself, file an issue instead:
[`data-correction`](.github/ISSUE_TEMPLATE/data-correction.yml) for something wrong, or
[`missing-data`](.github/ISSUE_TEMPLATE/missing-data.yml) for something absent. A maintainer or another
contributor can pick it up.

## Code changes (engineering track)

- `pnpm lint` (`tsc --noEmit`) and `pnpm build` must pass.
- If you touch `src/lib/layout.ts`, `scripts/build-graph.ts`, or anything that affects the compiled graph, run
  `pnpm check:layout` and check the report for new overlaps.
- Keep the "no LLM key required" constraint intact for anything in the live-news / tagging path unless that's
  explicitly the change you're making.
- No dependency additions without discussion first — the project runs under a pinned, minimum-release-age
  supply-chain freeze (see `pnpm-workspace.yaml`).

## Code of Conduct and licensing

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md), including its political-neutrality
clause — this project maps power, it does not take a side. Code is [MIT](LICENSE) and data is [CC BY 4.0](LICENSE-DATA); by contributing you agree your work is released under
those terms (see [`LICENSING.md`](LICENSING.md)).

## Questions

Open an issue with the [`bug`](.github/ISSUE_TEMPLATE/bug.yml) template or the blank/discussion option in
[`.github/ISSUE_TEMPLATE/config.yml`](.github/ISSUE_TEMPLATE/config.yml) if none of the templates fit.
