# Stratified accuracy audit — exports/people.csv (2026-09-25)

**Auditor:** background accuracy-audit agent, one thread of a larger delegated research run.
**Scope:** `exports/people.csv` only (7,774 seats, 7,587 filled at time of sampling). No other file was edited except the three outputs listed below.

## 1. Method

1. **Drew a reproducible random sample of 150 filled rows**, seed `20260925`, stratified by `rank`:

| Stratum | Ranks included | n | Population (filled rows in stratum) |
|---|---|---|---|
| top_offices | head_of_state, vice_head_of_state, head_of_government, chief_minister, governor, lieutenant_governor, administrator, cabinet_minister, mos_independent_charge, chief_justice, presiding_officer, leader_of_opposition | 40 | 457 |
| legislators | member_of_parliament, member_of_legislature | 40 | 5,297 |
| officials | secretary, head_of_agency, chief_of_staff, commission_member | 30 | 1,275 |
| state_min | state_minister, minister_of_state, deputy_chief_minister | 20 | 402 |
| everything_else | judge, other, deputy_presiding_officer, law_officer | 20 | 156 |

"Filled" = `vacant` not `yes` and `person_name` non-empty. Sampling code: `research/india/_sample.py` (seed `20260925`, per-stratum `random.Random(20260925).sample(...)`); adjudication pipeline: `_fetch_audit.py`, `_match.py`, `_refetch_review.py`, `_manual_verdicts.py`, `_compile_audit.py`, `_pretty_print.py`, `_adjudicate.py`, all left in `research/india/` for reproducibility.

**Important caveat on reproducibility:** `exports/people.csv` was captured as a frozen snapshot at 2026-09-25 16:24 IST for sampling (`research/india/_audit_sample_raw.json`). While this audit was running, `exports/people.csv` was independently modified on disk (observed change at 16:46 IST, presumably by other concurrent work on this repo) — row composition, not just field values, changed for a non-trivial number of rows (spot-checked: several `officials`-stratum rows in the live file now name entirely different people/positions than the snapshot did). **Re-running `_sample.py` today will *not* reproduce this exact 150-row sample**, because the population it draws from has since changed; it will only reproduce the same sample if run against the specific snapshot. All 4 corrected `position_id`s in `data/corrections/audit-2026-09-25.json` were re-checked against the *current* (post-16:46) file and confirmed still present with the same erroneous values as of this writing, so the corrections remain valid and actionable despite the underlying file's churn. Every row in the audit-sample CSV records the exact `since_csv`/`party_csv` values seen at snapshot time, so the audit is self-contained and doesn't depend on the live file for interpretation.

2. **Verification.** WebSearch was unavailable for this run; verification used the Wikipedia API (`en.wikipedia.org/w/api.php`, live `action=query&prop=revisions`, i.e. the current revision at fetch time — fetches ran 2026-09-25 16:20–16:55 IST) plus, for ~20 rows where a single infobox was ambiguous or looked stale, a second Wikipedia-hosted source: a state-government "ministry" cabinet-list article (e.g. `Second Sarma ministry`, `Mohan Yadav ministry`, `Fifth Rio ministry`, `Second Dhami ministry`, `Second Yogi Adityanath ministry`), an election article, or an institutional list page (e.g. `Leader of the Opposition in the Bihar Legislative Assembly`, `Ministry of Earth Sciences`). These cabinet-list articles proved *more reliable* than individual politicians' personal infoboxes, which are frequently stale after a reshuffle or re-election (see §4). No non-Wikipedia source was reachable in this environment (no browser tools, no general web search; `curl`/WebFetch to state-government portals and sansad.in was not attempted after early tests showed Wikipedia's API was the only fast, reliable channel available — this is itself a finding, see §4).

3. **Adjudication pipeline:**
   - Mechanical first pass (`_match.py`): fuzzy-matched each CSV `position_title` against the person's infobox `office*` fields, compared `term_start*`/`term_end*` to the CSV `since` (month-level), and compared `party` via an abbreviation→full-name map for ~70 Indian parties. Rows with a confident match (office similarity ≥0.55, dates agree to the month, party agrees, no `term_end` on the matched office) were provisionally marked `likely_correct` — 67 rows.
   - Everything else (76 `needs_review` + 17 `cannot_verify` on the first pass = 93 rows) got a second, brace-matched full-infobox re-fetch and was read and adjudicated by hand, cross-referencing a second source where the first was ambiguous or where a mismatch looked suspicious.
   - A random spot-check of ~15 of the 67 mechanically-`likely_correct` rows was also done by hand as a sanity check on the automated pass; this is how the one bonus finding in §3 (outside the formal sample) was caught.

4. **Verdict definitions** as specified in the task: `correct`, `wrong_holder`, `wrong_party`, `wrong_since`, `now_vacant`, `cannot_verify`. `cannot_verify` was used whenever no reliable source could be found — including several cases where Wikipedia's search fell back to a *different, unrelated person* with a similar name (see §4); treating those as "correct by default" would have been wrong, so they're counted as unresolved, not as passes.

## 2. Results

Two ways to read the error rate, because `cannot_verify` is large (mostly the `officials` stratum, where almost no one has a Wikipedia page — a finding in itself, see §4):

**(a) Error rate among rows that could be resolved** (denominator excludes `cannot_verify`):

| Stratum | n | correct | errors | cannot_verify | error rate (of resolved) | 95% Wilson CI |
|---|---|---|---|---|---|---|
| top_offices | 40 | 35 | 2 | 3 | 5.4% | [1.5%, 17.7%] |
| legislators | 40 | 30 | 1 | 9 | 3.2% | [0.6%, 16.2%] |
| officials | 30 | 2 | 0 | 28 | 0.0%* | [0%, 65.8%] |
| state_min | 20 | 19 | 0 | 1 | 0.0% | [0%, 16.8%] |
| everything_else | 20 | 9 | 0 | 11 | 0.0% | [0%, 29.9%] |
| **Overall** | **150** | **95** | **3** | **52** | **3.1%** | **[1.0%, 8.6%]** |

*officials: n_resolved = 2, so 0% is statistically meaningless — see §4.

**(b) Error rate against the full sample** (denominator = n, i.e. treats every `cannot_verify` as a de facto pass — the optimistic floor, not a real estimate):

| Stratum | error rate (of n) | 95% Wilson CI |
|---|---|---|
| top_offices | 5.0% | [1.4%, 16.5%] |
| legislators | 2.5% | [0.4%, 12.9%] |
| officials | 0.0% | [0%, 11.4%] |
| state_min | 0.0% | [0%, 16.1%] |
| everything_else | 0.0% | [0%, 16.1%] |
| **Overall** | **2.0%** | **[0.7%, 5.7%]** |

Read together: **the confirmed error rate is low (2–3%) among what a free, fast, single-source (Wikipedia API) check could resolve, but 35% of the sample (52/150) could not be resolved at all with the tools available in this run** — overwhelmingly concentrated in the `officials` stratum (28/30 = 93% unresolved) and to a lesser extent `everything_else` (11/20 = 55%, mostly parliamentary-committee chairs). **The real error rate is unknown and could plausibly be higher** in those two strata specifically, since they were the least checkable, not because they were checked and passed.

## 3. Errors found (3 in-sample + 1 bonus, all in `data/corrections/audit-2026-09-25.json`)

| # | Row (position_id) | Verdict | What was wrong | Correction | Source |
|---|---|---|---|---|---|
| 1 | `st-up-pos-minister-28` — Dharmveer Prajapati, MoS(IC), UP | wrong_since | CSV since=2022-03-25 is when he became MoS(IC) for *Prisons*; that assignment ended 2024-03-05 per the UP cabinet-list page, and his own infobox shows a fresh IC assignment (self-succession) starting the same day — the portfolio the CSV names ("Civil Defence & Home Guards") most plausibly dates from then, not 2022. | since → 2024-03-05 | [Second Yogi Adityanath ministry](https://en.wikipedia.org/wiki/Second_Yogi_Adityanath_ministry) |
| 2 | `st-nl-pos-minister-7` — P. Paiwang Konyak, Nagaland | wrong_party | CSV says NPF; the Fifth Rio ministry cabinet list (formed 2023-03-07, matching the CSV's since-date exactly) and his own infobox both say BJP. | party → BJP | [Fifth Rio ministry](https://en.wikipedia.org/wiki/Fifth_Rio_ministry) |
| 3 | `st-as-pos-mla-barkhetri` — Narayan Deka, Assam MLA | wrong_since | CSV since=2026-04-09; his own infobox says his current MLA term started 2026-05-04 (matching the 2026 Assam election results, consistent with the new Assam cabinet forming 2026-05-12). | since → 2026-05-04 | [Narayan Deka](https://en.wikipedia.org/wiki/Narayan_Deka) |
| 4 (bonus, outside the random sample) | `st-as-pos-chief-minister` — Himanta Biswa Sarma, CM of Assam | wrong_since | Found while spot-checking mechanically-"correct" rows: CSV since=2021-05-10 is his *first* term; the Second Sarma ministry page states explicitly Assam's government "has been in office since 12 May 2026" after he won re-election. His own personal infobox is stale (still shows continuous 2021), which is why the mechanical pass didn't flag it — it agreed with the CSV, but both were wrong. | since → 2026-05-12 | [Second Sarma ministry](https://en.wikipedia.org/wiki/Second_Sarma_ministry) |

All 4 corrections are staged in `data/corrections/audit-2026-09-25.json` — no source file was edited.

Two more rows are flagged in the audit-sample CSV as **discrepancies short of a confident correction** (kept as `cannot_verify`, not turned into corrections, because the evidence pointed one way but wasn't conclusive):
- `st-ka-pos-minister-30` (C. Puttarangashetty, Karnataka) — his personal infobox only shows a stale 2018–19 ministerial stint; the well-maintained, actively-updated "Second Siddaramaiah ministry" page (which does track other 2026 reshuffles with dated, sourced entries) does **not** list him among current ministers, which casts real doubt on the CSV's claimed 2026-08-05 appointment. Worth a priority human re-check.
- `in-pos-chair-petitions-rs` (Raghav Chadha) — the fetched Wikipedia revision's party field reads "Bharatiya Janata Party (since 2026)", which conflicts sharply with his long-standing, very well-documented AAP identity (which the CSV also has). This is either a genuinely enormous, unverified-elsewhere political story or vandalism on the Wikipedia page at the moment of the fetch. Flagged as a data-quality risk in both directions rather than acted on — do not treat this fetch as ground truth for this row.

## 4. Systemic patterns

1. **Officials/bureaucrats are essentially unverifiable via Wikipedia.** 28 of 30 sampled `officials`-stratum rows (secretaries, agency heads, commission members) either have no Wikipedia page at all, or Wikipedia's search API resolves the name to a completely different, unrelated person — in this sample that included a Delhi High Court judge standing in for an Indian Bank CEO, a journalist standing in for a wildlife-crime bureau director, a UK member of the House of Lords standing in for a Himachal Pradesh Chief Secretary, and — most strikingly — a *lizard species* standing in for an ISRO centre director. Wikipedia is simply the wrong source class for career civil servants; `exports/sources.csv` shows 77% (6,005/7,851) of all citations in this dataset already point to `en.wikipedia.org`, so this isn't a one-off gap — it's the dataset's dominant sourcing strategy running into a hard ceiling for an entire personnel category. **Recommendation:** for `secretary`/`head_of_agency`/`chief_of_staff` ranks, the accuracy program needs state-government portal scraping (each state's "who's who"/officers' directory), PIB press releases, and Gazette notifications as primary sources — Wikipedia coverage there will stay near zero regardless of how often it's re-checked.

2. **Personal Wikipedia infoboxes lag real events by weeks to months, especially after elections and reshuffles — but the CSV is, on the evidence here, usually *more current* than the stale infobox, not less.** In every one of the ~10 cases investigated where a politician's own infobox showed an old date that disagreed with the CSV, a dedicated cabinet-list or ministry Wikipedia article confirmed the *CSV's* date, not the personal infobox's. This pattern showed up for: the 2026 Assam election (Second Sarma ministry, several ministers), the 2026 Tamil Nadu election (new TVK/Vijay government), the 2026 Kerala election (new INC/UDF government), the 2026 West Bengal reshuffle, the 2026 Uttarakhand reshuffle (Second Dhami ministry), and the 2024 Madhya Pradesh cabinet (Mohan Yadav ministry). **This means single-infobox verification systematically under-counts CSV accuracy and over-counts apparent errors** — the audit corrected for this by cross-checking against ministry-list pages wherever a mismatch appeared, but a less careful check (or a purely automated one, as the first pass here showed) would have wrongly flagged a double-digit number of these as errors. **Recommendation:** any future automated freshness-checker for this dataset should prefer state/national "X ministry" or "list of members of the Nth [State] Legislative Assembly" list-type Wikipedia articles over individual biography infoboxes, especially in and immediately after a state-election year.
   - Corollary, and the one genuine miss this pattern produces: **the exact opposite failure mode also happened once** — Himanta Biswa Sarma's own infobox agreed with the CSV, and *both* were stale relative to the real event (see finding #4 above). A single agreeing source is not proof of correctness if that source itself might not have been updated.

3. **2026 was a major Indian state-election year** and the CSV reflects it reasonably well where checked: Assam, Kerala, Tamil Nadu, West Bengal, and Puducherry all had 2026 assembly elections (confirmed via dedicated Wikipedia election articles), each producing a wave of fresh `since`-dates in the CSV clustered around April–August 2026 that mostly check out. Two governments actually *changed hands*: **Tamil Nadu (DMK → TVK, with the actor Vijay becoming Chief Minister)** and **Kerala (LDF → UDF, with V. D. Satheesan becoming Chief Minister)** — both confirmed independently through minister infoboxes' `predecessor`/`chief minister` fields during this audit. If `exports/people.csv`'s Tamil Nadu and Kerala Chief Minister rows, and any downstream product surface built on top of them, don't already reflect these two changes of government, that would be a much higher-priority fix than anything in this sample (neither state's CM seat was itself drawn into the 150-row sample, so this audit cannot confirm or deny their current state directly — flagging for an immediate, separate, targeted check).

4. **Parliamentary-committee assignments (DRSC chairs, Rajya Sabha panels, "Chief Whip", etc.) are not covered by personal Wikipedia infoboxes at all.** 6 of the 20 `everything_else` rows were specifically this kind of position; in every case the underlying person's MP status and party were independently confirmed, but the specific committee chairpersonship could not be. These come from `sansad.in`'s committee pages, which this run could not reach (no browser tools; a bare API/portal check was out of scope given time). **Recommendation:** these need a dedicated `sansad.in` scrape/fetch pass, not a Wikipedia-based one.

5. **Party-abbreviation normalization matters more than it looks.** The mechanical first pass initially flagged 56 rows as "party mismatch" purely because "BJP" doesn't textually contain "Bharatiya Janata Party" — none of these were real errors. After adding an abbreviation→full-name map (~70 parties), the false-positive rate on party checks dropped to near zero. Any future automated checker for this dataset needs the same normalization or it will drown real findings in noise.

6. **Wikipedia itself is not infallible as a source** — see the Raghav Chadha party-field anomaly in §3. A production accuracy pipeline for this dataset should not treat a single Wikipedia fetch as ground truth without at least a plausibility check against the person's well-established public identity.

7. **`exports/people.csv` is a live, moving target.** It changed on disk mid-audit (see the reproducibility caveat in §1), consistent with other work running concurrently on this repo. This is good (the dataset is actively improving) but means any accuracy audit needs to snapshot its sample and record the exact values it checked at draw time — which this one did — rather than only recording verdicts against a `position_id` that could later point at different data. **Recommendation:** future audits should snapshot `exports/people.csv` (e.g. `cp` with a timestamp, or a git commit) before drawing a sample, and treat the export pipeline itself as something to version.

## 5. Recommendations

1. **Treat this audit's 2–3% confirmed error rate as a floor, not the true rate.** With 35% of the sample unresolved, the honest statement is "at least 2%, plausibly higher, concentrated in officials and committee-assignment rows we couldn't check with the tools available this run."
2. **Prioritize a second audit pass for the `officials` stratum using state-government portals, PIB, and Gazette sources** rather than re-running a Wikipedia-only check — Wikipedia coverage there is structurally near-zero, not just unlucky in this sample.
3. **Immediately, separately verify the Tamil Nadu and Kerala Chief Minister (and full cabinet) rows** given the confirmed 2026 changes of government in both states (§4.3) — this is higher-impact than anything else in this report and wasn't directly sampled.
4. **Apply the 4 staged corrections** in `data/corrections/audit-2026-09-25.json`.
5. **Re-run this same stratified methodology after building a `sansad.in`/state-portal fetcher**, specifically to close the `officials` and parliamentary-committee gaps — until then, confidence labels on those two categories in the public-facing product should be downgraded (e.g. shown as "unverified" rather than inheriting the dataset's general "high"/"medium" confidence labels) so contributors know where help is most needed, consistent with the project's open-source, "show what we don't know" goal.

## 6. Files

- `research/india/audit-sample-2026-09-25.csv` — all 150 sampled rows with verdict, source checked, and note.
- `data/corrections/audit-2026-09-25.json` — 4 correction objects (3 in-sample + 1 bonus finding, clearly labeled).
- `research/india/_sample.py`, `_fetch_audit.py`, `_match.py`, `_refetch_review.py`, `_manual_verdicts.py`, `_compile_audit.py`, `_pretty_print.py`, `_adjudicate.py` — the full pipeline, left in place for reproducibility (sampling seed `20260925` is hard-coded in `_sample.py`; see the reproducibility caveat in §1).
- `research/india/_stats.json` — machine-readable version of the §2 tables.

## 7. Maintainer review (2026-09-25)

- **Rejected: `st-as-pos-chief-minister` since → 2026-05-12.** The dataset records a head of government's *continuous* tenure (Modi 2014-05-26, Yogi Adityanath 2017-03-19, Bhupendra Patel 2021-09-13, each re-sworn since). Himanta Biswa Sarma has held the office without a break since 2021-05-10, so the existing value is right under that convention. Removed from `data/corrections/audit-2026-09-25.json`. The convention itself should be written into `docs/DATA_MODEL.md` (a re-sworn head of government keeps their original `since`; a minister whose portfolio changes gets a new one).
- Accepted the other three.
