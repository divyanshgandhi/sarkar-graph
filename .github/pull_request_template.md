## What this changes

<!-- One or two sentences: what's being added, fixed, or corrected, and why. -->

## Type of change

- [ ] Data — research segment (`data/raw/*.json`)
- [ ] Data — correction overlay (`data/corrections/*.json`)
- [ ] Docs
- [ ] App / engineering (`src/`, `scripts/`)
- [ ] Other

## If this touches data (research segment or correction)

- [ ] Every changed/added fact has a **source URL**, and the source is **dated** (2025–2026 for a current
      office-holder). See `docs/SOURCING_POLICY.md`.
- [ ] `confidence` is set honestly for what I actually verified (`high` only if a second person checked a
      primary source — see `docs/SOURCING_POLICY.md` §3).
- [ ] No personal data beyond what's needed to identify a public official in their official capacity — no
      private addresses/phone numbers, nothing beyond what the official source itself publishes. See
      `docs/SOURCING_POLICY.md` §6.
- [ ] I ran the pipeline and committed the regenerated outputs alongside my data change:
  - [ ] `pnpm graph`
  - [ ] `pnpm check:layout` (no new overlaps)
  - [ ] `pnpm export`

## If this touches app/engineering code

- [ ] `pnpm lint` (`tsc --noEmit`) passes
- [ ] `pnpm build` passes
- [ ] No new dependency added without prior discussion (supply-chain freeze — see `CONTRIBUTING.md`)

## Sources

<!-- List every source URL this PR relies on, with the date on the source. -->

-
