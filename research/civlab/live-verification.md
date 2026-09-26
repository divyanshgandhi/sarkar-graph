# CivLab Gov Graph — Live Browser Verification (2026-09-25)

Scope: `graph.civlab.org/us`, driven live via an interactive browser (not curl/static
analysis, unlike the other five reports in this directory). Goal: resolve the "open risk"
flagged in `BLUEPRINT.md` — hover/press micro-interactions and legend/copy that static
bundle analysis couldn't observe. All claims **[VERIFIED]** by direct interaction unless
marked **[CORRECTION]** (contradicts a prior INFERRED claim in the other reports).

## 0. Screen recording — still inaccessible, same as the design-system subagent found

`/var/folders/.../TemporaryItems/NSIRD_screencaptureui_.../Screen Recording 2026-09-25 at
2.33.06 PM.mov` — tried `stat`/`file`/`cat` (Bash, all "No such file or directory" — sandbox
denies even `ls` on the parent dir) and `file://` navigation in the browser pane ("file may
be missing, unreadable, or declined"). The `Read` tool resolves the path (returns a
binary-file error rather than not-found) but can't decode video. **Confirmed dead end** for
any tool available in this session — the orchestrating/desktop session is the only place
that can open this file (it's a live Finder/QuickLook-only sandboxed temp item). Compensated
for this by driving the live site directly instead (below), which recovers most of what a
recording would have shown.

## 1. Theme default — [CORRECTION]

`render-and-interaction.md`/`BLUEPRINT.md` inferred "default dark on the main graph route,
light elsewhere, persisted to localStorage." **Live test**: a fresh, no-prior-state browser
context loading `graph.civlab.org/us` directly rendered **light mode**, and
`localStorage.getItem('civlab-theme') === "light"` immediately on load (no user toggle yet).
The localStorage key is **`civlab-theme`** (not previously known). Either the "dark by
default on graph route" claim was wrong, or it depends on `prefers-color-scheme`/geolocation
not exercised here — but on this session's default light-mode browser, the graph route
loaded light. Toggling (top-right sun/moon button, 44×44) is instant, no transition
animation observed, and correctly persists (`civlab-theme` flips to `"dark"`).

## 2. Hover micro-interaction — [VERIFIED, new]

Hovering a node (tested on the "Congress" chamber-pill icon) does two things simultaneously,
neither visible in the static bundle read:
- A small pill-shaped **label tooltip** (node name, e.g. "Congress") fades in pinned just
  above the node.
- The node's own icon **inverts fill**: outlined/hollow (stroke-only, background-colored
  fill) → solid fill in the node's accent color (red, for a legislative node). This is a
  cheap, CSS-only hover state (matches the "no framer-motion, hand-rolled Tailwind
  transitions" finding in `render-and-interaction.md` §1) but the *specific visual grammar*
  (hollow→filled, not just opacity/scale) wasn't previously documented.

## 3. Click → detail panel + graph highlight — [VERIFIED, confirms + extends]

Clicking "Congress" did a real client-side navigation: `location.pathname` became
`/us/elected/us-congress` (confirms the `elected/[slug]` route and the "real router.push,
not shallow" claim). Simultaneously:
- Left panel swapped from the homepage (Latest News / Latest Changes) to the **entity detail
  panel**: title, prose description, "Legal Source" + "Official Website" link row, seat-count
  sentence ("535 members — From the United States Senate (100) and the United States House
  of Representatives (435)"), then `News` / `Who's connected?` tabs, with `Media` sub-tab
  showing an NPR photo card.
- On the graph itself, **thin red connector lines are drawn live across sector boundaries**
  from the selected node to each of its related nodes (observed lines from Congress crossing
  into the Executive wedge, e.g. toward "President of the United States") — this is the
  actual on-canvas rendering of the edge data, not just an opacity-dim of unrelated nodes as
  the earlier report inferred. Unrelated nodes outside the connected set are dimmed; the
  selected node's label stays pinned (not just a hover tooltip) below/above its icon.
- Breadcrumb updates live: `CivLab / US Gov / Legislative`.

## 4. Search overlay — [VERIFIED, extends §1 of render-and-interaction.md]

Clicking the magnifying-glass icon (no keyboard shortcut tested, but the icon-click path is
confirmed) replaces the top breadcrumb bar in place with an inline search `<input>` — **not**
a centered modal dialog. Typing ("Treasury") shows an instant (no network request fired —
consistent with the Fuse.js 100%-client-side claim), grouped dropdown: a small-caps
"Entities" section header, each result row with a colored dot keyed to node kind (purple dot
for the `department`/`dept_head` kind in this test) and the entity name, e.g. "Department of
the Treasury", "Secretary of the Treasury", "Under Secretary of the Treasury for Terrorism
and Financial Crimes". The graph behind the search overlay **blurs/dims** (backdrop blur +
opacity drop) — a visual treatment not previously captured. `Escape` closes it and returns
to the prior breadcrumb/graph state cleanly.

## 5. Legend — [VERIFIED, materially extends §1/§3 of render-and-interaction.md]

Clicking "Legend" expands a two-section popover directly above the button (not a modal):
- **ENTITIES** (node-shape key, exact labels as shipped): Elected offices, Agencies &
  departments, Department heads, Commissions, Advisory bodies, Courts, Corporations,
  Quasi-official, Sub-agencies — each with its distinct icon glyph.
- **RELATIONSHIPS** (edge-style key, exact labels as shipped): Elects, Appoints, Confirms,
  Oversees, Administers, Advises, Heads, Offices, Ex officio — each rendered with a distinct
  line style (solid arrow / dashed arrow / dotted, varying by type).

This is a **direct, first-party confirmation of CivLab's edge-type vocabulary** (9 relation
types shown in the legend, a strict subset of what's presumably in the full data — `elects`,
`appoints`, `confirms`, `oversees`, `administers`, `advises`, `heads`, `offices`,
`ex officio`) and it maps closely onto the India schema's own relation-type list (`appoints /
advises_appointment / elects / indirectly_elects / nominates / administers / ex_officio /
accountable_to / oversees / removes / audits`) — worth a side-by-side reconciliation pass
when finalizing the India relation-type enum (India's list is a superset — `confirms` has no
direct India analogue since there's no Senate-style confirmation vote; `heads`/`offices` are
CivLab structural conveniences worth considering for the India model too, since India will
need a distinct "X heads department Y" edge separate from "X is appointed to head Y").

## 6. Power map — [VERIFIED, confirms sourcing-and-realtime.md §4 formula]

Switching to the "Power map" tab renders the shelf/row layout exactly as inferred: circular
headshot avatars, connecting lines between related people (e.g., Trump → Bisignano, Trump →
Thune, Trump → Johnson), and a visible **heat-glow halo** on the highest-heat people (Trump,
Bisignano, Hegseth, Walkinshaw in this snapshot) exactly matching the `heat` formula reverse
-engineered in `sourcing-and-realtime.md` §4. New detail: several avatars carry an inline
**"In the news 20h ago"**-style relative-timestamp caption — meaning individual *news
mentions* carry hour-level timestamps client-side, even though the aggregate `changes` feed
(§5 of sourcing-and-realtime.md) is only date-granular. These are two different feeds at two
different granularities, not a contradiction: `changes` (personnel moves) is daily-batch,
raw news-mention timestamps (powering both the article list and this "Nh ago" caption) are
finer-grained.

## 7. Network activity during live interaction — [VERIFIED, reconfirms §1/§2 of sourcing-and-realtime.md]

Captured ~80 requests across page load + several clicks/hovers. Everything falls into one of:
1. `/_next/data/<buildId>/us/**.json` — Next.js's own **automatic route prefetch** (Pages
   Router prefetches `Link`-adjacent/hovered routes' `getStaticProps` JSON ahead of click,
   which is why hovering near a node silently fires a `departments/us-department-of-...json`
   fetch even before any click) — this is framework plumbing, not a bespoke "live" API.
2. `/_next/image?url=...` — on-demand image optimization proxying NPR/GovExec/FederalNewsNetwork
   photo URLs (confirms §7 image-sourcing tiers live, not just from the static dump).
3. `/_vercel/insights/view` (POST) and `/_vercel/insights/script.js` — Vercel Web Analytics
   beacons only, no app data.
4. Zero calls to `/api/v1/articles` were observed in this session's interaction set (the News
   tab content came pre-embedded in the `_next/data` payload for the clicked entity, not a
   separate fetch) — consistent with §2's finding that `/api/v1/articles` exists and is live,
   but shows it's used more sparingly client-side than assumed (probably reserved for
   pagination/"Load more" and the dedicated search-driven use cases, not the initial tab
   render). **No WebSocket/SSE traffic observed** — reconfirms the site is SSG+ISR with one
   narrow live-read surface, not push-realtime, exactly as §1/§9 already concluded and
   recommended mirroring for India (event-driven on-demand ISR revalidation, not a
   browser-push realtime layer).

## 8. Net effect on the "realtime" requirement

The user's brief asked for the India build to "be realtime as well." Live driving of CivLab
confirms **CivLab itself is not push-realtime** — freshness comes from (a) on-demand ISR
revalidation after each backend ingestion run (page can be hours stale) and (b) one narrow
live serverless read endpoint for article search/pagination. §9 of `sourcing-and-realtime.md`
already recommends this exact pattern for India. This session adds no reason to deviate:
**recommend India ship the same two-tier model** (ISR shell + one live read API), not a
websocket/polling architecture, since that's what makes CivLab's numbers feel current without
the cost/complexity of true push-realtime — and explicitly surface a "last updated" timestamp
(CivLab doesn't show one on-page despite having `computedAt` in the payload — an easy
improvement for India's parity/credibility bar).

---

**Tools used**: `mcp__Claude_Browser__*` (live Chromium-based browser pane) — navigate,
computer (click/hover/type/screenshot), read_page, get_page_text, read_network_requests,
javascript_tool (read-only `location`/`localStorage` inspection only, no page mutation).
No files downloaded beyond what the browser cached; no destructive/irreversible actions
taken; no forms submitted; no credentials entered.
