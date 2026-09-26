---
name: Sarkar Graph
description: A radial map of the Government of India, surveyed outward from the People.
colors:
  paper: "#ece8df"
  card: "#fbf9f5"
  card-2: "#f5f2ec"
  well: "#e3dfd5"
  rule: "#e2ddd3"
  ink-1: "#1c1a16"
  ink-2: "#3b3731"
  ink-3: "#5b554c"
  ink-4: "#6f685d"
  saffron: "#e3741b"
  saffron-ink: "#a44f0a"
  saffron-wash: "#f7e3cf"
  green: "#1f7a3c"
  green-ink: "#1a6632"
  green-wash: "#dfeadb"
  navy: "#34419a"
  navy-ink: "#2b3683"
  navy-wash: "#e2e3f0"
  ochre: "#86650f"
  ochre-ink: "#6f540c"
  ochre-wash: "#efe6cf"
  slate: "#3e6d72"
  slate-ink: "#2f5a5f"
  slate-wash: "#dde8e6"
  maroon: "#9b3140"
  maroon-wash: "#f1dcdc"
  plum: "#6e4687"
  plum-wash: "#ebe2f0"
  focus: "#1c1a16"
typography:
  t-display:
    fontFamily: "var(--font-anek), var(--font-anek-deva), ui-sans-serif, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 620
    lineHeight: 1.08
    letterSpacing: "-0.02em"
  t-title:
    fontFamily: "var(--font-anek), var(--font-anek-deva), ui-sans-serif, system-ui, sans-serif"
    fontSize: "21px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.012em"
  t-head:
    fontFamily: "var(--font-anek), var(--font-anek-deva), ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.005em"
  t-body:
    fontFamily: "var(--font-anek), var(--font-anek-deva), ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  t-small:
    fontFamily: "var(--font-anek), var(--font-anek-deva), ui-sans-serif, system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.4
  t-ui:
    fontFamily: "var(--font-anek), var(--font-anek-deva), ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 520
    lineHeight: 1.2
  t-meta:
    fontFamily: "var(--font-anek), var(--font-anek-deva), ui-sans-serif, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 500
    lineHeight: 1.3
  t-label:
    fontFamily: "var(--font-anek), var(--font-anek-deva), ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.08em"
  wheel-arc-label:
    fontFamily: "var(--font-anek), var(--font-anek-deva), ui-sans-serif, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 650
    letterSpacing: "0.22em"
  wheel-ring-label:
    fontFamily: "var(--font-anek), var(--font-anek-deva), ui-sans-serif, system-ui, sans-serif"
    fontSize: "7.5px"
    fontWeight: 600
    letterSpacing: "0.2em"
  wheel-anchor:
    fontFamily: "var(--font-anek), var(--font-anek-deva), ui-sans-serif, system-ui, sans-serif"
    fontSize: "9.5px"
    fontWeight: 600
    letterSpacing: "0.01em"
rounded:
  panel: "14px"
  lg: "12px"
  md: "8px"
  full: "9999px"
spacing:
  gutter: "16px"
components:
  button-primary:
    backgroundColor: "{colors.ink-1}"
    textColor: "{colors.card}"
    rounded: "{rounded.lg}"
    height: "40px"
  tab-active:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.md}"
    height: "32px"
  search-trigger:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink-3}"
    rounded: "{rounded.md}"
    height: "40px"
  card-panel:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.panel}"
    padding: "20px {spacing.gutter}"
  input-field:
    backgroundColor: "{colors.card-2}"
    rounded: "{rounded.lg}"
    height: "36px"
---

# Design System: Sarkar Graph

## Overview

**Creative North Star: "The Surveyed Wheel"**

Sarkar Graph draws the Government of India as one wheel, surveyed outward from the People at its centre. The THESIS the build carries out literally: a 24-spoke Ashoka Chakra sits at the hub as the People; every seat of power is placed by its distance from that hub; every wedge is a branch of the state (Parliament, the executive, the judiciary, independent bodies, States & UTs), rendered as territory on a khadi-paper sheet with the stepped, sourced authority of a Survey of India map rather than the boxes-and-lines of an org chart. First contact with any government is literal survey: a circular reveal grows from the seal outward over ~950ms before a single mark is legible. Flag colour is rationed to hairlines, washes and marks — saffron never decorates, it only ever means the People, "elects," or the live chain of authority currently being traced.

The system refuses two things by construction: the org-chart tree (there are no boxes-and-arrows; everything is polar, placed by angle and radius) and the card dashboard (the map is the primary surface; the left rail is commentary on what the map already shows). It also refuses ornament as camouflage — the "clean without any noticeable AI slop" brand commitment lands as flat inks, no gradients, no drop shadows outside a small, deliberate set of floating-chrome elevations, and a fixed glyph alphabet where every institution kind gets exactly one silhouette, never a stock icon.

**Key Characteristics:**
- A living radial instrument, not a poster: click any seat and the whole wheel spring-turns it to 6 o'clock, then draws its chain of authority home in saffron.
- Two palettes that never touch: sector ink marks territory (which branch of the state), party ink marks incumbency (who currently holds it) — the map is politically neutral by construction.
- Zero overlapping marks, enforced by a track-and-pack layout engine and a regression script, not by hand-tuning.
- Paper by day, warm near-black by night — the same flat-ink grammar, re-inked rather than dimmed.

## Colors

Flat, warm, paper-grounded neutrals carry almost the entire interface; the seven sector inks and the flag colours are confined to the map's territory fills, marks, and a handful of accent uses — never to chrome, buttons, or body text.

### Primary
- **Flag Saffron** (`#e3741b`, dark `#f0913a`): The rarest and most meaningful colour in the system. Reserved for the People/root seal, every "elects" relation, the saffron chain of authority drawn from the centre to a selected seat, and live/fresh indicators (the live-status dot, "just in" news markers). Never used decoratively.

### Secondary — sector inks (territory, not state)
Each is a branch of government; each gets a base ink (glyph strokes, wedge rim, wedge label), a paired `-wash` (wedge fill, seat fill), and, for the five inks used as on-wash text, a darker `-ink` variant.
- **Chakra Navy** (`#34419a`, dark `#8791e6`): the executive — ministries, departments, the Cabinet band, agencies.
- **Flag Green** (`#1f7a3c`, dark `#4fae68`): the legislature — Parliament/the Assembly, the chamber bean, Lok Sabha-type lower houses.
- **Court Ochre** (`#86650f`, dark `#cfa43a`): the judiciary — courts and tribunals.
- **Independent Slate** (`#3e6d72`, dark `#72aeb3`): constitutional and independent bodies — commissions, regulators, advisory bodies.
- **State Plum** (`#6e4687`, dark `#b595d6`): States & UTs as seen from the Union wheel (the "federal" sector).
- **Council Maroon** (`#9b3140`, dark `#d9727f`): local government, and specifically upper houses/councils — the Rajya Sabha and Legislative Councils are inked maroon inside an otherwise-green chamber bean, and `local` (districts, municipal tiers) shares the same ink. Has no `-ink` text variant; used only as fill/stroke, never as on-wash type.

### Neutral
- **Khadi Paper** (`#ece8df`, dark `#14120f`): the page canvas.
- **Warm White Card** (`#fbf9f5`, dark `#1e1b17`): panel and card surfaces.
- **Soft Card** (`#f5f2ec`, dark `#26221d`): hover states and the well beneath segmented controls' active pill.
- **Well Grey** (`#e3dfd5`, dark `#36312a`): inactive wheel segments, avatar wells, the track behind tabs/toggles.
- **Hairline Rule** (`#e2ddd3`, dark `#2d2923`): dividers, card rings, scrollbar thumbs.
- **Ink 1–4** (`#1c1a16` → `#6f685d`, dark `#efeae1` → `#8a8276`): a four-step text scale from primary text (ink-1) down to placeholder/meta text (ink-4, held at ≥4.5:1 on paper).

### Named Rules
**The Territory, Not State, Rule.** Sector ink marks which branch of government a body belongs to. It never marks selection, hover, or authority. Those always render in saffron regardless of the selected seat's own sector — a judiciary seat's chain of authority is drawn in saffron, not ochre.

**The Party Colour Is Data Rule.** A second, disjoint palette (`partyInk`) exists solely for incumbency — avatar rings, hemicycle seat-dots, party chips, and the States cartogram's tile fills. It appears only where party affiliation is literally the fact on screen, per the product's neutrality commitment ("no party gets a privileged colour or position"); it never substitutes for or blends with sector ink.

## Typography

**Display/Body/Label Font:** Anek Latin (variable, `wdth` axis) paired with Anek Devanagari for Hindi secondary labels, both loaded as CSS variables and composited into one `--font-sans` stack so Latin and Devanagari runs sit on the same line without a font swap.

**Character:** A rounded, mid-contrast grotesque tuned for a bilingual civic instrument — display and label roles lean on `font-stretch` (94% condensed for display headlines, 110–118% expanded for uppercase wayfinding labels) rather than a second family, so the whole system reads as one typeface doing several jobs.

### Hierarchy
- **Display** (620, 30px, 1.08, -0.02em, stretch 94%): entity-panel page titles ("Ministry of Railways").
- **Title** (600, 21px, 1.15, -0.012em): the home panel's headline sentence.
- **Head** (600, 17px, 1.2, -0.005em): card section headings ("How this seat is filled", "Latest news").
- **Body** (400, 15px, 1.5): the base document size; description paragraphs, news summaries.
- **Small** (400, 13.5px, 1.4): secondary paragraph copy, source notes, captions.
- **UI** (520, 14px, 1.2): interactive labels — buttons, list rows, tab labels.
- **Meta** (500, 12.5px, 1.3): timestamps, counts, breadcrumbs, stat sub-labels.
- **Label** (600, 11px, 1.2, 0.08em, uppercase, stretch 110%): section eyebrows ("ON THE MAP", "CAPITAL").
- **Wheel arc label** (650, 10px, 0.22em, uppercase, stretch 118%) and **wheel ring label** (600, 7.5px, 0.2em, uppercase, stretch 112%): sector and tier names set on curved `textPath` arcs around the wheel itself.
- **Wheel anchor** (600, 9.5px, 0.01em): landmark seat names (President, Prime Minister, Parliament) drawn upright over the map, paper-stroked for legibility over any wedge colour.

### Named Rules
**The Uppercase-Is-Structure Rule.** `text-transform: uppercase` with wide letter-spacing (0.08em–0.24em) marks only wayfinding and structural labels — section eyebrows and wheel labels. Body copy, titles, and button labels are always set in normal case; uppercase never carries emphasis on its own.

## Layout

The app is a two-pane shell: a left rail (max-width 400px, 420px at `lg`) holding the Chrome breadcrumb bar and a scrollable panel (`HomePanel` or `EntityPanel`), and a flexible main pane holding the current view (`Graph` wheel, `Power map`, or `States`). Both panes sit inside a `--radius-panel` (14px) rounded frame with an 8px (`gap-2`)/12px (`gap-3` at `md`) gutter between them; the whole shell fills the viewport height (`h-dvh`) with no page scroll.

Below `768px` the rail drops beneath the map (`order-2`) and the map takes the top slot at a fixed `56dvh`; floating map chrome (search, live badge, legend, view switch) repositions itself around a `chromeY` offset that leaves room for a two-row control stack on phones. `--gutter` itself steps from 16px to 24px at the 768px breakpoint and drives card internal padding (`px-[var(--gutter)]`) throughout the rail.

Floating controls overlay the map at its four corners — search top-left, live/offline badge top-right, Legend bottom-left, Graph/Power map/States switch bottom-right — each wrapped so only the control itself, not the transparent gutter around it, is `pointer-events: auto`.

The wheel itself is a fixed-scale polar layout, computed once per government and scaled to fit the frame (never re-laid-out on resize): a seal at the centre (radius 58 Union / 54 State) surrounded by a 30px clear ring, then sector wedges allocated by angular weight with per-government minimum widths, each wedge stacking only the concentric tiers ("tracks") it actually needs from the inside out.

### Named Rules
**The Overlap-Free Invariant.** `src/lib/layout.ts`'s `layoutWheel` places every drawn mark on a track sized to its largest occupant, then uses a 1-D least-squares packer (`pack1D`) to space marks along that track with a guaranteed minimum gap — so no two marks on the same track, or on different tracks, can ever touch. `scripts/check-layout.ts` lays out every government in the dataset and fails the build if any pair of marks overlaps or a mark lands inside the seal. This is a hard system invariant, not a style preference: any change to sizing, tiering, or sector allocation must keep `check-layout` green.

## Elevation & Depth

The system is flat by default and uses tonal layering — wash-tinted fills, the translucent Cabinet band, opacity-based "lit/dimmed" states — to show grouping and depth on the map itself. True elevation (`box-shadow`) is reserved for a small set of floating chrome that visually leaves the surface: cards/panels get a near-flat resting `--shadow-card`, while popovers, the search modal, and hover tooltips get a stronger `--shadow-pop`.

In dark mode, `--shadow-card` stops being a cast shadow at all and becomes `inset 0 1px 0 rgb(255 255 255 / 0.03)` — a one-pixel top highlight — because a dark warm-near-black surface reads depth better as a lightened top edge than as a shadow it can't cast against an already-dark canvas. `--shadow-pop` stays a real shadow in both themes (warm-tinted `rgb(40 30 15 / …)` in light, neutral black in dark) because floating chrome genuinely sits above the page in both.

### Shadow Vocabulary
- **card** (light `0 1px 2px rgb(40 30 15 / 0.05)`; dark `inset 0 1px 0 rgb(255 255 255 / 0.03)`): resting elevation for every `Card`, the Chrome bar, and segmented-control pills.
- **pop** (light `0 10px 30px -8px rgb(40 30 15 / 0.22), 0 2px 6px -2px rgb(40 30 15 / 0.12)`; dark `0 12px 36px -8px rgb(0 0 0 / 0.6), 0 2px 8px -2px rgb(0 0 0 / 0.4)`): the Search modal, the Chrome government-switcher, the Legend popover, hover tooltips, and the zoom control.

### Named Rules
**The Flat-Map, Lifted-Chrome Rule.** Nothing on the wheel itself ever casts a shadow — depth there is opacity and tone only. Shadow is reserved for UI that is temporarily floating above the page (menus, modals, tooltips); once something is part of the permanent layout (a Card in the rail) it gets `shadow-card` at most.

## Shapes

Two unrelated form languages coexist by design: rounded rectangles and pills for interface chrome, and a fixed alphabet of geometric silhouettes for everything drawn on the map.

**Chrome:** panels and cards round at 14px (`--radius-panel`); rows, popovers and inputs round at Tailwind's `lg`/`xl` steps (8–12px); segmented controls (`Tabs`, `ViewSwitch`) and status pills round fully, with a spring-animated sliding pill (`layoutId`) marking the active choice; avatars are always circular, ring-stroked in the holder's party colour when known.

**The map:** every glyph is drawn "up" (away from the centre) in local space and then translated and rotated onto its spoke; a `.upright` class counter-rotates each mark by the wheel's live rotation (`--wr`) so glyphs and their labels always read right-side-up no matter how far the wheel has turned — only the wheel's structure (wedges, tier guides, edges) actually spins. Stroke width is fixed with `vector-effect="non-scaling-stroke"`, so linework stays a constant weight through pan/zoom. Wedge outlines (`territoryPath`) are stepped-rim shapes whose outer edge steps outward to trace how far content actually reaches in each angular slice — a sparse wedge gets a calm, even rim; a busy one gets a jagged, surveyed one.

### Named Rules
**The Glyph Alphabet Rule.** Every institution kind has exactly one fixed silhouette, shared across every government (Union or State) and every sector colour: circle = elected/constitutional office, a head-and-shoulders mark = minister/presiding officer, rounded square = ministry/department/agency, diamond = commission/regulator, pentagon = court, octagon = force, framed square = corporation, capsule = committee, hexagon = advisory body, circle-with-core-dot = a State/UT, plain small circle = district, triangle = a local/city tier, filled square = a clustered small body. The same shape means the same kind of thing on every wheel in the app; new institution kinds get a new silhouette, never a re-use of an existing one with a different colour.

**The Seat State Is Never Colour-Only Rule.** A seat's state (held / acting / vacant / unverified) is always encoded in stroke and fill pattern, on top of and independent of its sector colour: held is a solid fill and stroke; acting is a dashed stroke (`2.4 1.6`); vacant is a hollow, paper-filled shape with a fine dotted stroke (`0.2 2.2`) and a thicker outline; unverified adds a small ring mark in the shape's upper-right corner regardless of the other three states. State must be legible in grayscale or under colour-blindness; colour alone never carries it.

## Components

### Buttons
- **Shape:** `rounded-xl` (12px).
- **Primary:** the entity panel's "Open the [X] government" CTA — solid ink-1 background, card-coloured text, full width, 40px tall.
- **Hover:** opacity fades to ~90%; no background-colour hover state.
- **Ghost/icon (chrome):** transparent by default, `card-2` background and `ink-1` text on hover — used for the theme toggle, zoom controls, and the map's search trigger.

### Chips
- **PartyChip:** `card-2` background, `rounded-md`, an 8px party-ink dot, `t-meta` text — the only chrome element that carries party colour.
- **Sector/kind badge** (ChangesCard): 4px-radius tag, text in the sector ink, background the same ink at 12% opacity via `color-mix` — used for "Elected / Appointed / Acting / Left office" tags.

### Cards / Containers
- **Corner Style:** `--radius-panel` (14px), uniformly.
- **Background:** `card` (never `paper` — cards always sit one step lighter/darker than the canvas they float on).
- **Shadow Strategy:** `shadow-card` at rest; see Elevation & Depth.
- **Internal Padding:** `var(--gutter)` horizontal (16→24px), 20px vertical.

### Inputs / Fields
- **Style:** `card-2` fill, `rounded-lg`, no visible border or ring at rest; placeholder text in `ink-4`.
- **Focus:** the global `:focus-visible` ring (2px solid `--focus`, 2px offset) with `outline-offset: 0` specifically on text inputs so the ring hugs the field.

### Navigation
- **Chrome breadcrumb bar:** `Sarkar / [Government] / [Sector]` — home logo (a miniature 24-spoke chakra), a dropdown for switching governments (search-filterable list of States/UTs grouped under States and Union Territories), and, once a sector is selected, a `/`-joined crumb tinted in that sector's ink.
- **Search:** a full-screen command-palette (`⌘K` / `/`), `paper/80` backdrop, results grouped Bodies & Offices vs. People, each row showing its glyph tinted by sector ink.
- **Keyboard:** `/` or `⌘K` opens search; `Esc` steps one level up the hierarchy; `←`/`→` walk siblings within the current sector and tier.

### The Wheel (signature component)
The whole map is the system's signature component: a 24-spoke Ashoka Chakra seal at the centre (the People), sector wedges as stepped-rim territories, a translucent "Cabinet band" spanning the executive's ministerial tracks, and — inside the legislative wedge — a "chamber bean": a thick rounded arc per house, ink-stroked and wash-filled, textured with a dot-hemicycle proportional to its seat count (Rajya Sabha/councils inked maroon inside an otherwise-green bean). Selecting any seat spring-turns the wheel (stiffness 58, damping 17) until that seat rests at 6 o'clock, then draws a saffron chain of authority from the seal through every appointing hand to it, each relation type carrying its own mark (filled double chevron = elects, filled chevron = appoints, hollow chevron = appoints-on-advice, open chevron = nominates, double open chevron = administers/oversees). A handful of landmark seats (Head of State, Head of Government, Governor/LG, the Supreme Court, the legislature) stay named at all times via a collision-searching label placer; a sector's own wedge name is dropped rather than overlapping when it can't fit its own arc.

## Do's and Don'ts

### Do:
- **Do** keep the seven sector inks mapped one-to-one to branch/territory (people, executive, legislative, judicial, constitutional, federal, local) across every government; never reassign one for a single view.
- **Do** give any new seat state or institution kind its own shape or stroke pattern, not just a new colour — see the Glyph Alphabet and Seat State rules.
- **Do** run `scripts/check-layout.ts` after any change to `layout.ts`, `sizeOf`, or the node dataset; a nonzero exit blocks the change.
- **Do** route new panel copy through `Card` + the `t-*` role classes rather than ad hoc Tailwind text sizes, so the type ramp stays closed.
- **Do** treat dark mode as a parallel, hand-tuned palette swap via `[data-theme="dark"]` (including re-balanced sector inks and an inset-highlight shadow), not a filter or opacity trick over the light tokens.

### Don't:
- **Don't** use saffron for anything except the People/root, "elects" edges, the active chain of authority, and live/fresh indicators — its rarity is what makes the chain readable against seven other inks.
- **Don't** apply party colour to anything that isn't literally displaying a party affiliation (no party-tinted chrome, sector wedges, or navigation).
- **Don't** add a `box-shadow` beyond `--shadow-card` / `--shadow-pop`; the map itself never casts a shadow, and only genuinely floating chrome (menus, modals, tooltips) gets `shadow-pop`.
- **Don't** hard-code a wedge, tier, or mark radius on the map; every size must come from `sizeOf()` / `layoutWheel()` so the overlap-free invariant holds.
- **Don't** rotate a glyph or its label with the wheel's turn; only the unrotated structural layers (territory wedges, tier guides, chain edges) spin — marks and text stay upright via `.upright` / `--wr` counter-rotation.

## Press assets (README banner, launch film)

Rendered from the product, never mocked: `src/components/press/Stage.tsx` draws the real wheel layers (territories, chamber bean, glyph alphabet, seal) as a pure function of its props, and `scripts/press.mjs` captures `/press/banner` (1280×640 at 2×, light and dark, switched by a `<picture>` in the README) and `/press/film` (1920×1080, 30 fps, seeked frame by frame through `window.__seek(t)`, encoded with ffmpeg). Both routes 404 in production.

- **Press display scale.** Press assets run their own larger ramp, since they're read at 1080p or as a README header rather than in a 400px rail: 92–96px names and tallies, 68–76px questions, 46–54px statements, 28–38px captions and answers, 19–22px ledger lines. All are Anek 600–640 at 94% stretch with −0.02 to −0.03em tracking, and numerals are tabular.
- **The chain at feed scale.** In press assets the saffron chain is drawn over a paper under-stroke (width + 3.5px, 0.9 opacity) so it stays legible at X's autoplay size. Saffron keeps its rule: the People, "elects" and the active chain only. Tallies of gaps are set in ink, never saffron.
- **Motion grammar.** Words arrive one by one (≈55ms apart), lifting 0.28em and sharpening from a 6px blur with an exponential ease-out. The wheel uses the product's own spring (stiffness 58, damping 17), integrated so any frame can be sought. The survey reveal grows from the seal; seats count in from the inner rings outward.
- **Accuracy.** Every number on screen comes from `pressStats()` (compiled data and `exports/gaps.csv`). Every caption must describe the hop the data actually draws (`authorityChain`), not the fuller constitutional story.
