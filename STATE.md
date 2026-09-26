# STATE — Sarkar Graph (2026-09-25, session 1, evening)

## What changed
- **App** (Next 16.3.5 / React 19.3 / Motion 13.4 / Tailwind 4.3; `pnpm dev` → :5190): Union + 36 State/UT wheels, Power map, States tile map, entity panel, search, live news over SSE, OG images. Layout v2 is overlap-free by construction (`src/lib/layout.ts`); legend toggles work. `DESIGN.md` + `.impeccable/design.json` document the system.
- **Data**: 59 research segments + 7 correction files (25 sourced corrections) in `data/corrections/`. Build: 6,270 nodes, 7,775 seats, 7,588 held, 6,407 people. `pnpm export` → `exports/people.csv`, `sources.csv` (7,873), `gaps.csv` (9,409), `docs/DATA_COVERAGE.md`.
- **Open source**: README, CONTRIBUTING, CODE_OF_CONDUCT, LICENSING (decision pending, no LICENSE file), `docs/SOURCING_POLICY.md`, `docs/DATA_MODEL.md` (since-date convention now written down), `.github` issue/PR templates, `data/corrections/README.md`.
- **Direction**: `docs/VISION.md` (how deep CivLab goes, measured; India scope; ideas) and `docs/ROADMAP.md` (v0.2 Pramaan → v1.0 "Live and Trusted" 2027-08-15, tiers T0–T3, freshness SLAs, watchers, good first issues). These are the Fable agent's versions; an earlier draft by a workflow agent was overwritten by them.
- **Accuracy audit** (`research/india/ACCURACY_AUDIT.md`, 150-row stratified sample): 3.1% error among checkable rows (95% CI 1.0–8.6%), but 35% uncheckable (officials 28/30), so treat it as a floor. 3 of its 4 corrections were applied. The Assam CM since-date correction was rejected because it breaks the continuous-tenure convention (see §7 of the audit).
- **Portraits fixed at the root**: name redirects to election/list pages gave MLAs the wrong face (Tanur → Rajeev Chandrasekhar), and portraits were also matched on bare names across governments (Ellisbridge → Amit Shah, UP MLC → the Mandsaur MP). `scripts/fetch-images.ts` now rejects non-person redirects and emblems (`--refresh` refetched all 5,126 titles). `build-graph.ts` only borrows a portrait from the same person's other seat in the same government.
- **New integrity checks** in `pnpm coverage`: one portrait worn by differently-named people; two seats in one chamber linking the same Wikipedia page. The second check found TN's two different V. Sampathkumars (fixed by a correction).
- A **Codex session** is editing this repo concurrently (corrections signed `codex-data-audit`; the "ponytail" comment in build-graph.ts). It downgrades Wikipedia-only `high` → `low`, so 6,290 of 7,775 seats now read "not yet verified". Left as is, pending the user's call.

## Verified
- `pnpm graph` (25 corrections, 0 warnings) · `pnpm coverage` 0 integrity issues · `pnpm check:layout` 0 overlaps · `pnpm lint` clean · `pnpm build` passes. Spot-checked: all 9 previously wrong-portrait seats now show no photo; PM etc. unchanged.
- LS 543/543 and constitutional bodies 34/34 verified earlier. `mlas-br-jh-od`: Bihar + Jharkhand assemblies tallied live, Odisha + Bihar Council still open (task `task_75959ebe`).

## Next / risks
- **User decisions**: (1) Wikipedia-only = `low` (shown as not verified; current) or `medium` (plain on the map, flagged in the panel and gaps.csv). SOURCING_POLICY contradicts itself here (lines 30–33 vs 46), and the ROADMAP T1 row says both. (2) Licence. (3) India-hosted runner for NIC sites. (4) LLM key for T0 extraction. (5) WhatsApp vs Telegram. (6) git init / commit / push / deploy. None of these are done yet.
- 2026 facts from agents (TN CM Vijay/TVK, WB CM Suvendu Adhikari, Kerala CM Satheesan, Ravneet Singh's resignation, Pradhan's resignation) are sourced but should get a human check before publishing.
- Officials are the least verifiable stratum: move them to primary sources first (PIB, Gazette, ministry "Who's who").
- build-graph's entity merge is first-value-wins per field; re-run `pnpm coverage` after any new `mlas-*`/`state-depts-*` segment.
- Subagents obeyed the relayed "dissect CivLab" message; always include a context guard in their prompts.
