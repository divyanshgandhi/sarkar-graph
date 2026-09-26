# Product

<!-- impeccable:product-schema 1 -->

## Platform

web (responsive; desktop-first explorer that must work on a phone)

## Stack

Next.js (latest, App Router) + React (latest) + TypeScript, Tailwind CSS, Motion for animation. Chosen by the user ("latest next/react, and beautiful animation libraries"). Packages installed with pnpm 11.1.0 under a supply-chain freeze: pinned versions, `minimumReleaseAge`, no dependency build scripts.

## Name

Sarkar Graph — "sarkar" is the everyday word Indians use for the government. Confirmed by the user 2026-09-25.

## Users

Primary: curious Indian citizens (confirmed). They reach it from a shared link or a news moment ("who actually runs the Ministry of X?", "who appoints the Election Commission?", "who is my state's minister for Y?"), usually on a phone or laptop, with no civics vocabulary assumed. Secondary: journalists, students, researchers who need sources.

## Job

Give every citizen a live, systems view of the Indian state: which bodies exist, what each does in plain language, who holds each seat right now, who appointed or elected them, who they answer to, and what changed recently. The Union, Parliament, the judiciary, constitutional and regulatory bodies, all 36 States/UTs, and their districts and local tiers.

## Mechanism / position

An Indian counterpart to CivLab's US Gov Graph (graph.civlab.org, by Michael Adams): one radial map of power where the People sit at the centre, formal relationships (elects, appoints, advises, oversees, is accountable to) are drawn as edges, and selecting any seat traces its chain of authority back to the voter. Live layer: a news feed tagged to entities, a "who is in the news" power map, and a change log of appointments and departures.

## Constraints & truth

- Facts must be sourced and current; every office-holder carries a source and an as-of date. Uncertain facts are marked, never invented.
- Politically neutral: no party gets a privileged colour or position; party colours follow the conventional ECI/Wikipedia palette only where party is the data being shown.
- Language: English interface with official Hindi names as secondary labels (confirmed).
- No LLM API key is available at runtime; news tagging must work without one (an LLM step can be added later behind a key).

## Brand commitments

- Visual direction pinned by the user: "follow a similar aesthetic and design system [to CivLab] with hints of Indian flag colours", "clean without any noticeable AI slop".

## Open decisions

- Public deploy target and domain (not yet asked; local build first).
