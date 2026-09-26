# Sourcing policy

Sarkar Graph is only useful if it's accurate. This document is the rulebook every contribution — human or
agent-assisted — has to follow. If a change doesn't meet this bar, it doesn't get merged, no matter how
complete it looks.

## 1. Provenance on every fact

Every fact in the dataset — an office-holder, a party, a date, a budget figure, a legal basis, a relationship
between two positions — must carry at least one source URL in its `sources` array (see
`research/india/SCHEMA.md`), and a person currently holding a seat needs a source **dated 2025–2026**, not an
old one that happened to still be true.

If you can't find a source for something, don't invent it and don't quietly drop it. Include the item with
`confidence: "low"` and say what's missing in `notes` — a gap that's visible is useful; a gap that's silently
skipped isn't. This mirrors the standing rule in `research/india/SCHEMA.md`: **never invent** a person, number,
date, or URL.

## 2. Source hierarchy

When sources disagree, or you're choosing which source to cite, prefer higher on this list:

1. **Primary / official** — the Gazette of India, official `.gov.in` and `.nic.in` portals, Press Information
   Bureau (PIB) releases, the Election Commission of India (ECI), and court websites (Supreme Court, High
   Courts). These are authoritative for who currently holds a constitutional or statutory office.
2. **PRS Legislative Research and reputable press** — PRS Legislative Research, and established outlets (The
   Hindu, Indian Express, Hindustan Times, Economic Times, Bar & Bench, LiveLaw, and similar). Good for context,
   confirmation, and anything primary sources don't publish in a structured way (reshuffles, appointments
   reported before the gazette notification catches up).
3. **Wikipedia** — useful to **seed** a fact (it's fast, structured, and usually right), but it is not the final
   citation. If a Wikipedia-sourced fact hasn't been replaced with a primary source, mark it `confidence:
   "medium"` at best, and leave a note that it needs a primary-source follow-up. Wikipedia is *never* the sole
   source for a `confidence: "high"` fact.

Lower-tier sources can be cited alongside a higher-tier one (e.g. a press report that adds colour to an official
notification), but the higher-tier source is what determines confidence.

## 3. Verification tiers

The `confidence` field (`"high" | "medium" | "low"`) means:

| Tier | Bar |
|---|---|
| **high** | A primary source (tier 1 above), dated 2025–2026, **checked by a second person** (not the person who entered the fact). This is the bar for anything shown as fully verified. |
| **medium** | One reliable secondary source (tier 2), or a primary source not yet independently re-checked. |
| **low** | Unconfirmed — sourced from a weak or old reference, sourced only from Wikipedia, or not sourced at all. Shown in the UI as **"not yet verified."** |

A "second pass" (the verifier track in `CONTRIBUTING.md`) means literally having someone other than the original
contributor re-check the source before a fact moves from `medium`/`low` to `high`. Don't self-promote your own
entry to `high`.

## 4. Vacancies, acting charge, and additional charge

The schema distinguishes three states for a seat, and they must not be blurred together:

- **Vacant** — `"vacant": true`, `holder` is `null`. Used when a seat genuinely has nobody in it right now.
- **Officiating / acting** — `holder.acting: true`. Used when someone is formally holding the office in an
  acting or officiating capacity (not yet confirmed/regular).
- **Additional charge** — also `holder.acting: true`, with the detail in `holder.notes` (e.g. "Holding additional
  charge pending a permanent appointment"). If a person holds two or more offices simultaneously as their
  substantive role (not as additional charge), note that instead (e.g. "Also holds Ministry of Cooperation").

Don't leave a seat's true status ambiguous: if you can't tell whether it's vacant, acting, or regularly filled,
say so explicitly in `notes` and set `confidence: "low"` rather than guessing.

## 5. Neutrality rules

- **No party gets privileged colour or position.** Party colours follow the conventional ECI/press palette and
  are shown only where party affiliation is literally the data being displayed (e.g. a party label on an MP's
  seat) — never as a layout, sizing, or prominence signal.
- **No scoring, ranking, or "who's winning" framing of individuals or parties without a published, reproducible
  method.** The one exception already in the product is the Power map's "heat" score — and that's fine
  *because* its formula is published and reproducible (recent mentions ÷ total mentions × 90/7, same as
  CivLab's). Any new ranking/scoring feature needs the same treatment: the method has to be written down where
  users can see it, not implied by an editorial choice.
- Descriptions of what a body or office does must stay factual and plain ("collects direct taxes through
  CBDT…"), never editorial, never a value judgment about the people in it.

## 6. Personal data rules

- Only **public officials acting in their official capacity** are in scope: elected representatives, appointed
  office-holders, and civil servants in named posts. We are not building a database of private citizens.
- **No private addresses or phone numbers**, ever — even if they appear in a public filing. Official office
  addresses (a ministry's HQ, a court's registry) are fine; a person's home address is not.
- **Respect the Digital Personal Data Protection Act, 2023 (DPDP Act)**: collect and publish only what's needed
  to identify who holds a public office and how they got there, from public sources, in their official
  capacity. Don't aggregate biographical detail that isn't relevant to the office.
- **Candidate affidavits**: if/when affidavit data (assets, criminal cases, education) is added as a data layer,
  republish only what the ECI's or a reputable aggregator's **official summary** already lists in a structured
  way — don't transcribe or link to the raw affidavit PDF's personal fields (family details, full residential
  address, etc.) beyond what the official summary format includes.

## 7. Handling corrections and disputes

- Anyone can propose a correction via a PR to `data/corrections/*.json` (see
  `data/corrections/README.md`) or by filing a
  [`data-correction`](../.github/ISSUE_TEMPLATE/data-correction.yml) issue.
- Every correction records **who made it** (`by`, a GitHub handle or agent name), **when** (`date`), **why**
  (`reason`), and **the source** that justifies the new value. This is how contributors get credit and how a
  disputed fact can be traced back to its reasoning.
- If two sources genuinely conflict (e.g. an official portal hasn't caught up with a just-announced reshuffle),
  prefer the more authoritative/more recent source per the hierarchy above, set `confidence` honestly, and say
  so in `notes` — don't silently pick one and hide the conflict.
- Disputes about a correction (e.g. someone disagrees with a proposed change) are resolved in the PR/issue
  thread by evidence, not by seniority or vote count: whoever brings the better-sourced, more current citation
  wins the fact. A maintainer merges once the sourcing bar is met.
