# Corrections overlay

`data/corrections/*.json` is the low-friction way to fix a fact without doing a full re-research pass on the
segment it came from. Corrections are applied on top of `data/raw/*.json` at build time (`pnpm graph`,
implemented in `scripts/build-graph.ts`) — the underlying research file is never rewritten, so every change
stays auditable and reversible.

This is the right tool for: a minister was reshuffled, a vacancy was filled, a name was misspelled, a date was
wrong, a party abbreviation changed. It is **not** the right tool for adding a whole new entity, position, or
segment — that goes directly into `data/raw/<segment>.json` per `research/india/SCHEMA.md` (see
`CONTRIBUTING.md`).

## File format

Each file is a **JSON array** of correction objects (a top-level `{"corrections": [...]}` object also works, but
a bare array is the simpler and preferred form). Give your file a descriptive name, e.g.
`data/corrections/2026-10-mha-reshuffle.json` or `data/corrections/mh-cm-office.json` — one file can hold
multiple corrections, and multiple contributors' files coexist fine.

**Any filename starting with `_` is ignored at build time** — that's how `_example.json` in this directory can
stay in the repo as a template without ever being applied to the graph.

### Correction object

```json
{
  "id": "in-pos-minister-home-affairs",
  "set": {
    "holder.name": "New Minister Name",
    "holder.since": "2026-10-01",
    "holder.party": "BJP",
    "confidence": "high"
  },
  "source": "https://pib.gov.in/PressReleasePage.aspx?PRID=...",
  "reason": "Reshuffled on 2026-10-01; previous minister moved to a different portfolio.",
  "by": "your-github-handle",
  "date": "2026-10-02"
}
```

| Field | Required | Meaning |
|---|---|---|
| `id` | **yes** | The exact id of the **entity** or **position** you're correcting, matching an `id` already present in `data/raw/*.json` (a ministry, a department, a position — including a Member of Parliament/Assembly or commission-member position id). If the id can't be found, the correction is skipped and a warning is printed when you run `pnpm graph` — check your spelling against the source segment or `exports/people.csv` / `exports/sources.csv`. |
| `set` | **yes** | A flat map of **dot-paths → new values**. Each key is applied as a path into the target object — `"holder.name"` sets `target.holder.name`, `"holder.since"` sets `target.holder.since`, a bare `"confidence"` sets `target.confidence`, and so on. Intermediate objects (e.g. `holder`) are created automatically if they don't already exist. |
| `source` | **yes** | The URL that justifies this change. Required — a correction without a source is not applied. Follow the source hierarchy in `docs/SOURCING_POLICY.md`. |
| `reason` | recommended | Plain-language explanation of what was wrong and what changed. This is folded automatically into a visible note on the corrected item (`target.holder.notes` or `target.notes`), so write it as something a reader could see. |
| `by` | recommended | Your GitHub handle (or agent name, if this correction was proposed by an automated research pass) — for credit and traceability. Not read by the build; purely for humans reviewing history. |
| `date` | recommended | `YYYY-MM-DD`, the date you made this correction (not necessarily the date the underlying fact changed — use `set: { "holder.since": ... }` for that). Folded into the auto-generated note alongside `reason`. |

### Special case: marking a seat vacant

Setting `"set": { "vacant": true }` **without** also setting a `holder.*` key automatically clears the holder
(`target.holder` is set to `null`). If you also know the vacancy has a reason worth recording, put it in
`reason`, not in `set`.

### What happens automatically

You do **not** need to hand-write an audit note — the build does it for you. For every applied correction, it:

1. Adds your `source` URL to the target's `sources` list (deduplicated).
2. Appends `"Corrected <date>: <reason> (<source>)"` to `target.holder.notes` (if the target has a current
   holder) or `target.notes` (otherwise) — so the correction's reasoning is visible in the app, not just in git
   history.

That's why `reason` should read like something you'd want a visitor to actually see, not a commit-message
shorthand.

## Worked example

See [`_example.json`](_example.json) in this directory for a fully-formed, valid example object (kept under a
`"_example"` key so it documents the shape without polluting the corrections it demonstrates — and because its
filename starts with `_`, it is never applied by `pnpm graph`).

## After adding a correction

Run the standard pipeline and commit the results alongside your correction file (see `CONTRIBUTING.md`):

```bash
pnpm graph
pnpm check:layout
pnpm export
```
