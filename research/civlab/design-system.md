# CivLab Gov Graph — Visual Design System (reverse-engineered)

Source: `https://graph.civlab.org/us` (Next.js Pages Router, SSG+ISR, build `We2ikbxxKTtakj9tS4BvH`).
Assets analyzed: `/_next/static/css/1e4e05271abface5.css`, `/_next/static/chunks/_app-c257799aa32ed36c.js` (beautified copy at `raw/js/_app.beautified.js`), page/shared chunks, `next/font` woff2 files. All saved under `research/civlab/raw/{css,fonts,js}/`.

**Method note:** everything below comes from static analysis (curl + CSS/JS reading), not from watching the app run. A screen recording of the live site was provided for this task but could not be opened — the file sat in a macOS `TemporaryItems` sandbox folder (`.../TemporaryItems/NSIRD_screencaptureui_.../Screen Recording....mov`) that this process has no sandbox extension for (`cp`/`ditto`/Finder-AppleScript/`ffmpeg` all failed with "Operation not permitted"; the file tool could see the path but refused to decode the binary). So **hover states, in-motion easing that isn't in the CSS, and any canvas-drawn graph-toolbar copy are unverified** — flagged inline below. Recommend the orchestrating session (which has a live browser) cross-check the flagged items directly.

---

## 1. Stack & delivery

- Tailwind CSS v4 (the CSS file is entirely `@layer theme/base/utilities` with `--tw-*` engine variables — evidence: `@supports (color:color-mix(in lab,red,red))`, `@layer theme{:host,:root{...}}`, the `oklch()` primitives below). There is **no BEM/semantic CSS** — every visual class in the codebase is a Tailwind utility or an arbitrary-value utility (`text-[13px]`, `bg-[#29D8CB]`); component structure lives entirely in JSX `className` strings, not in the stylesheet.
- Font loaded via `next/font` self-hosting (not the Google Fonts CDN — files are same-origin under `/_next/static/media/`, split into 7 unicode-range subsets + 1 local-Arial fallback face).
- Dark mode via `:root[data-theme=dark]` attribute override (not `prefers-color-scheme` media query) — confirms a manual light/dark toggle (verified: a `s5` component exists, a 44×44px button with Sun/Moon icon and `aria-label`/`title` "Switch to dark/light mode", calling `onClick:()=>nw.Yl(n)`).

## 2. Typography

**Family:** Inter, self-hosted variable font.
- `@font-face{font-family:Inter;font-style:normal;font-weight:100 900;font-display:swap;...}` — one variable-weight face split across 7 files by unicode-range (Latin, Latin-ext, Cyrillic, Cyrillic-ext, Greek, Vietnamese, symbols).
- Font binary confirmed via fontTools (`name` table): **Inter v4.001;git-66647c0bb**, `fvar` axis `wght 100–900` (default 400), `unitsPerEm 2048`.
- Fallback face: `Inter Fallback` = `local("Arial")` with metric-matching overrides — `ascent-override:90.44%;descent-override:22.52%;line-gap-override:0%;size-adjust:107.12%` (standard next/font auto technique to prevent layout shift before Inter loads).
- CSS var: `--font-inter:"Inter","Inter Fallback"`; body font stack = `var(--font-inter),"system-ui",sans-serif`. Monospace stack `--font-mono: ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace` is used for small numeric/label chrome (stat tiles, timestamps, category pills — see §5).

**Type scale** — a fully bespoke pixel-based scale (12 semantic classes), *not* Tailwind's default rem scale:

| Class | size | weight | line-height | tracking | JSX helper |
|---|---|---|---|---|---|
| `type-header-1` | 30px | 600 | 110% | — | `t7` (page/entity title, e.g. panel `<h1>`) |
| `type-header-2` | 24px | 600 | 120% | — | `ne` |
| `type-header-3` | 20px | 500 | 120% | — | `nt` |
| `type-header-4` | 16px | (inherits) | (inherits) | — | `nn` |
| `type-header-5` | 14px | 600 | 120% | — | `nr` (person-card name in power map) |
| `type-paragraph-1` | 24px | 400 | 150% | −2% | — |
| `type-paragraph-2` | 16px | 400 | 140% | −1% | `ni` (entity descriptions) |
| `type-paragraph-3` | 14px | 400 | 130% | — | `na` |
| `type-paragraph-4` | 12px | 400 | 145% | +1% | `no` |
| `type-ui-1` | 16px | 500 | — | — | `ns` |
| `type-ui-2` | 14px | 500 | — | — | `nl` (segmented-control label, budget figures) |
| `type-ui-3` | 12px | 500 | 130% | — | `nc` (badges, meta lines) |
| `type-ui-4` | 10px | 400 | — | — | `nu` (footnotes, "last 12 weeks") |

Each class is exposed as a one-line React wrapper (`t9("type-header-1", e)` pattern) — i.e. the codebase treats typography as **components, not raw className strings**, which is the single most reusable idea here.

Below/beside this system, many one-off pixel sizes appear as Tailwind arbitrary values for chart/dense-UI text: `text-[8.5px] 9px 9.5px 10px 10.5px 11px 12px 13px 13.5px 14px 15px 26px` — these are graph-node labels, tooltip meta, and power-map person labels (e.g. power-map name label is inline `fontSize:13`, job/party line `fontSize: mobile?12:11`, article count `fontSize:11`).

Tailwind's own default two sizes (`text-xs` 12px/`1.333` lh, `text-sm` 14px/`1.4286` lh) are still present as raw tokens (`--text-xs`, `--text-sm`, `--text-xl`) but appear rarely used directly outside utility resets — the app-specific `type-*` scale dominates.

## 3. Color palette

All colors are CSS custom properties on `:root`, overridden wholesale on `:root[data-theme=dark]` (same variable names, new values) — a clean two-file-equivalent token swap, not per-utility dark: variants.

### Neutrals (`grey-1`…`grey-4`, `grey-light(er)`, `grey-mid`, `outline`, `white`, `background`)

| token | light | dark | role |
|---|---|---|---|
| `--grey-1` | `#1c1917` | `#ede9e2` | primary text / high-contrast ink |
| `--grey-2` | `#383633` | `#cfc9c0` | secondary text |
| `--grey-3` | `#57534e` | `#a29b90` | tertiary text / meta |
| `--grey-4` | `#98938e` | `#7e776c` | muted text, disabled, independent-branch fallback color |
| `--grey-lighter` | `#f9f8f7` | `#262220` | lightest surface tint |
| `--grey-light` | `#f4f2ef` | `#2b2723` | hover surface, badge bg |
| `--grey-mid` | `#dddbd5` | `#3a342e` | inactive segmented-control bg, avatar placeholder bg |
| `--outline` | `#edece9` | `#2e2925` | hairline borders everywhere |
| `--white` | `#fff` | `#211e1a` | card/panel surface ("white" flips to near-black surface in dark mode) |
| `--background` | `#eceae4` | `#161310` | page canvas / graph canvas background |
| `--black` (Tailwind default, unused as brand color) | `#000` | — | |

Page canvas is a warm off-white stone (`#eceae4`), not pure white — cards (`--white`) sit one step lighter on top of it. Dark mode background `#161310` is a warm near-black (not neutral gray), consistent with the warm-stone hue direction of the whole neutral ramp (these read as Tailwind "stone"-family hues, and indeed `--color-stone-100 oklch(97% .001 106.424)` / `--color-stone-600 oklch(44.4% .011 73.639)` are the two literal Tailwind default colors kept in the file — used only for the tooltip pill, see §5).

### Brand / accent

- `--brand: #fd8055` — coral/orange, same value in both themes. Used for: sparkline fill/stroke in the power-map person card, "in the news" highlight text, heat-glow ring around power-map avatars (`stroke:"var(--brand)"`, blurred 6px, opacity ramps 0.16→0.66 by recency-heat).
- `--pink #f25ebf` / `--pink-dim #f9afdf` (dark: dim `#3d2334`)
- `--red #f2686f` / `--red-dim #f9b4b7` (dark dim `#422427`) — red is also literally the header logomark color (`text-red` wraps the CivLab logomark icon in the breadcrumb bar).
- `--orchid #c15ef2` / `--orchid-dim #e8b6f9` (dark dim `#38224a`)
- `--purple #826dc8` (dark `#9c8bdb`) / `--purple-dim #c0b6e3` (dark `#2e2745`) — reused semantically for "budget increase" delta text (`text-purple`, weight/opacity ramps by magnitude: ≥20% → `font-semibold`, ≥10% → `font-medium opacity-90`, else `opacity-75`).
- `--orange #f27836` / `--orange-dim #f9bc9b` (dark dim `#45291a`)
- `--blue #084ab4` (dark `#85a8ee`) / `--blue-dim #e8f0fe` (dark `#212b3d`) — reused for "budget decrease" delta text, same magnitude-ramp pattern as purple.

That palette of 6 hues × {solid, dim} is a shared component-badge palette, not necessarily 1:1 with node types — it's referenced generically (`s9`/`s7` badge components take `bg-{color}-dim border border-{color}-dim` + `text-{color}`), so it's the app's general-purpose tag/badge color set. **No direct evidence of a per-node-type-name palette (e.g. "Ministerial Dept / Executive NDPB / Tribunal / Royal Charter" as named in the task brief) — those are UK Whitehall org-type terms and do not appear anywhere in this codebase's strings, CSS, or the already-captured `__NEXT_DATA__`. This app's real taxonomy is US-specific: node types `constituency / elected / department (+ subtypes department, quasi_official, court, government_corporation, military_service, series) / dept_head / commission (+ regulatory_body, adjudicative_body, governing_board) / advisory`, and none of those subtypes has its own dedicated color — only the 4 sector/branch colors below are used for node/edge tinting.**

### Sector / branch colors (the actual per-node-category palette)

| sector | light | dark |
|---|---|---|
| `--branch-legislative` | `#e4573d` | `#dd4e35` |
| `--branch-executive` | `#7a7ad0` | `#8484dc` |
| `--branch-judicial` | `#ac7f14` | `#c89c15` |
| independent | *(no dedicated var)* → falls back to `--grey-4` (`#98938e` / `#7e776c`) | |

Fallback is coded explicitly: `lX=(sector,theme)=>THEMES[theme].branch[sector] ?? {light:"#98938e",dark:"#7e776c"}[theme]`.

### Party colors (separate from sector colors, used on elected-official avatars/rings)

| party | light | dark |
|---|---|---|
| `--party-democrat` | `#084ab4` (same as `--blue`) | `#6d97e8` |
| `--party-republican` | `#d1343b` | `#e0555c` |
| `--party-independent` | `#826dc8` (same as `--purple`) | `#9c8bdb` |
| unknown/other | `--outline` / `--grey-4` | |

Used as `ring-{party}` on avatar components (`ring-1 ring-offset-2`) and as a 2–4px `box-shadow` ring around power-map circular avatars: `boxShadow:"0 0 0 {2 or 3}px var(--background), 0 0 0 {ring+2}px {partyColor}"` — i.e. a background-colored gap ring, then a colored ring; selected state swaps ring color to `--grey-1` and widens by 1px.

### Category-pill tint trick

Personnel/structure-change cards color their category pill by taking the branch color and appending a raw alpha hex byte: `backgroundColor: color + "1F"` (≈12% opacity) with `color: color` as the text — a single computed value drives both text and a translucent chip background, no separate `-dim` variable needed for this component.

### One-off / non-tokenized colors found in the CSS

- `#127B74` (dark teal text) / `#29D8CB` (bright teal/cyan, `co` constant) — **not** CSS custom properties, hard-coded hex literals used only in the **Budget Breakdown** component (§6): border color, bar-segment fill (alpha-scaled via the same "+hex byte" trick: `co + Math.round(pct/100*255).toString(16)`), and category/amount text. This is a distinct, budget-only mini-palette outside the main token system — worth flagging if you want one canonical palette rather than an exception.
- Tailwind v4 default `oklch()` primitives kept in the bundle but essentially unused as brand colors: `--color-blue-200/300/500`, `--color-stone-100/600`, `--color-black`. Only `stone-100`/`stone-600` are actually consumed (tooltip pill, §5).

## 4. Spacing, radii, layout

- Base spacing unit `--spacing: .25rem` (4px) — all Tailwind `p-*`/`gap-*`/`px-*` utilities compute as `calc(var(--spacing) * N)`, standard Tailwind v4 pattern. Fractional steps down to `.25` (1px) appear (`px-1.25`, `pt-2.25`).
- `--margin`: **16px** by default, **24px** at `min-width:48rem` (768px) — the page's outer gutter, applied as `.px-margin{padding-inline:var(--margin)}`, i.e. a single responsive breakpoint for page-edge padding.
- Radii scale: `--radius-xs .125rem(2px) / -md .375rem(6px) / -lg .5rem(8px) / -xl .75rem(12px) / -2xl 1rem(16px)`. In practice components mostly use **arbitrary radii outside this scale**: `rounded-[14px]` (change-feed card), `rounded-[10px]` (nested "Out/In" sub-block), `rounded-[3px]` (entity-kind pill) vs `rounded-md` (personnel-kind pill) — i.e. radius is tuned per-component rather than strictly tokenized.
- Container/query breakpoints in use: Tailwind `@container` queries (`@md:`, `@container`) are used for the connected-entities grid and budget stat rows — the panel is container-query responsive, not just viewport-media-query responsive, which matters since it lives in a resizable side panel.

## 5. Shadows

Tailwind default shadow scale is present (`shadow`, `shadow-sm`, `shadow-lg` = the familiar `0 1px 3px/0 1px 2px` and `0 10px 15px/0 4px 6px` pairs, alpha `#0000001a`), but the **distinctive shadows are all component-local arbitrary values**, not tokens:

| value | used for |
|---|---|
| `0 8px 32px rgba(0,0,0,0.25)` | power-map desktop hover/click detail card (`lA`) |
| `0 -8px 32px rgba(0,0,0,0.25)` | power-map **mobile bottom sheet** (slides up from bottom, matches `--tw-shadow: 0 -8px 32px ...` in the compiled CSS) |
| `0 1px 2px rgba(0,0,0,0.04)` (light) / `inset 0 1px 0 rgba(255,255,255,0.03)` (dark) | personnel/structure change-feed card — deliberately near-flat in light mode, uses an inset top-highlight instead of a drop shadow in dark mode |
| `0 16px 40px`, `0 16px 48px` (multiple alpha variants `#0000008c/73/80`, and a themed `#1e190f29`) | present as compiled `--tw-shadow` custom-property values in the CSS but the owning component wasn't isolated in this pass — likely large modal/menu surfaces (Radix dropdown/popover content, given `--radix-*` vars found alongside). **Flag: inferred, not fully traced to a component.**

## 6. Motion

- Default Tailwind transition tokens: `--default-transition-duration: .15s`, `--default-transition-timing-function: cubic-bezier(.4,0,.2,1)` (Tailwind's standard "ease" curve) — this is what plain `transition-colors`/`transition-opacity` utility classes use throughout (hover states on buttons, links, badges).
- `--ease-out: cubic-bezier(0,0,.2,1)` — a second, separate easing token (Tailwind's "ease-out") used for explicitly authored motion, not just hover.
- Power-map graph animation (the most choreographed motion in the app, all hand-coded inline styles, not utility classes):
  - Person node fade/rise-in: `opacity {300ms ease-out}, transform {300ms ease-out}`, **staggered per node**: `transitionDelay: 18ms × rank` (i.e. more prominent/higher-ranked people animate in first, ~18ms apart) — capped/started after an initial `requestAnimationFrame` gate.
  - Edge line draw-on: `stroke-dashoffset 420ms ease-out` paired with `stroke-opacity 160ms`.
  - Arrow-head fade-in: `opacity 200ms ease-out` with a `360ms` delay (waits for the line to finish drawing first), plus `fill-opacity/stroke-opacity 160ms`.
  - Heat-glow ring: `stroke-opacity 300ms ease-out` with the same `18ms × rank + 200ms` stagger as the node fade-in.
  - All of the above respects `prefers-reduced-motion: reduce` — when reduced motion is on, transitions collapse to instant `opacity 160ms`/no transform, and the `18ms`-rank stagger is skipped entirely (`W = !prefersReducedMotion` gates every delay/duration pair).
- `--animate-pulse: pulse 2s cubic-bezier(.4,0,.6,1) infinite` — Tailwind's default pulse keyframe, available but a specific loading-skeleton consumer wasn't isolated in this pass.
- Tooltip (Radix) open/close and dropdown menu open/close durations rely on Radix's own data-state attribute transitions — not confirmed against a hand-authored duration in this pass (Radix defaults are typically driven by consumer CSS not present as a distinct duration in this file, so likely near-instant/no explicit CSS transition beyond `transition-colors` on the trigger).

**Unverified from the recording:** exact hover/press micro-interactions on the segmented control, the graph canvas's own node-hover tooltip behavior (if it's canvas-drawn rather than DOM), and any additional easing curves only visible in motion — could not confirm because the screen recording was inaccessible (see top of doc).

## 7. Components

### Segmented control ("Graph | Power map" / "Graph | Budget | Power map")
Two-piece system: `s4` builds the tab list (`[{id:"graph",label:"Graph"}, budget? {id:"budget",label:"Budget"}, powerMap? {id:"power",label:"Power map"}]`), `s3` renders it:
```
<button className="cursor-pointer hover:enabled:bg-grey-light transition-colors
  {compact ? 'px-4 h-9 type-ui-2' : 'px-8 py-2.5'}
  {value !== id ? 'bg-grey-mid text-grey-4' : ''}"
  disabled={value === id}>
```
Active tab = plain background (inherits card `--white`) with default text color; inactive tabs get `bg-grey-mid text-grey-4`. No pill/underline indicator — the *inactive* state carries the visual weight (muted-gray block), the active tab is just "absence of the gray block." Two size variants: compact (`h-9`, `type-ui-2` = 14px/500) vs full (`px-8 py-2.5`, default 16px paragraph type).

### Icon buttons (44×44px square, shared shape across the toolbar)
Prev/Next carousel arrows and the dark-mode toggle both use the identical base: `flex items-center justify-center h-[44px] w-[44px] hover:bg-grey-light transition-colors cursor-pointer`, with a `compact` variant shrinking to `h-9 w-9`. Wrapped in a shared white rounded pill container: `bg-white rounded-xl overflow-hidden flex`.

### Small pill badges
- Generic label pill: `bg-background rounded-full px-2 py-1` + `type-ui-4` text (`s8`).
- Colored tag pill: `rounded-xl px-4 py-2` (`s6` constant) + `bg-{color}-dim border border-{color}-dim` + `text-{color}` (`s9`), or border-only variant with transparent fill (`s7`).
- Category pill on change-feed cards: `px-1.5 py-0.5 font-mono text-[9px] tracking-[0.13em] uppercase`, radius `rounded-[3px]` for entity-kind vs `rounded-md` for personnel-kind, color = branch color, background = branch color + hex `1F` alpha suffix.

### Tooltip (Radix Tooltip, e.g. "View source" on external-link icons)
```
bg-stone-100 text-stone-600 px-2 py-1 rounded text-xs font-medium z-50
side="top" align="start" alignOffset={-2} collisionPadding={10}
```
Arrow: `fill-grey-lighter/90` (90%-opacity via `color-mix(in oklab,...)`). Notably this is the **one place** the app reaches for Tailwind's stock `stone-100/600` oklch colors instead of its own `--grey-*` scale — a small inconsistency worth normalizing if rebuilding.

### Breadcrumb / top bar
`min-h-[44px]` bar, responsive horizontal padding `px-2.5` → `max-[360px]:px-2` → `md:px-4` → `lg:px-6`, `py-2`, flex row, `gap-x-1.25` (`md:gap-x-2`). Left: CivLab logomark icon, `text-red` (`#f2686f`), hidden below 360px. Then a Radix `DropdownMenu` government-switcher trigger: `inline-flex items-center gap-x-1.5 px-2 py-1 -mx-1 rounded-lg`, hover/open/focus all resolve to `bg-grey-light`, label text `font-semibold text-grey-1` (or `font-medium text-grey-3` when "muted"). Breadcrumb separator is a rotated chevron (`ChevronDown` rotated `-rotate-90`) in `text-grey-4`. Breadcrumb segment labels map from node kind → label via a switch (`legislative/executive/judicial/independent` branch names, `"Dept. Heads"`, `"Advisory Bodies"`, `"Commission"`, `"Departments"`, `"Constituency"`, a clickable `"Topics"` link, `404`).

### Detail entity panel (department/dept-head/etc.)
Padding `px-margin pt-6 pb-7` (so 16/24px responsive gutter). Title = plain text-1 heading. Description via a shared "clamp + Read more/Show less" component (`lz`): defaults to 3 lines on mobile, 99 (effectively unclamped) at `md:`, expand button styled `text-grey-4 hover:text-grey-1 transition-colors`. Source links row: `flex items-center gap-x-4`, each link = underlined `text-grey-3 hover:text-grey-1` — this is the "Legal Source · Official Website" row (rendered conditionally, joined by a flex gap rather than a literal "·" separator character). Employee/seat counts: plain `text-grey-3` sentence, pluralized via a helper (`ez.td(count,"seat")`).

### "Who's connected?" grid
`@container` + `grid grid-cols-1 @md:grid-cols-2 gap-4` of entity cards (`lR`): `border border-outline rounded-xl`, padding `pt-3 pb-5 pl-5 pr-6` (with description) or `py-2 pl-3 pr-4` (compact/no description), a `1em²` icon glyph inline with the name (`type-paragraph-2`), description in `text-grey-4`. For legislative bodies, replaces description with `"{appointed} of {total} seats"` in the same muted style.

### Budget module
- Section header uses `type-header-3` ("Budget Overview" / "FY{year} Budget Breakdown"), body copy plain paragraph.
- **"This Year 2025-2026" stat grid**: two-column (`basis-[45%] @md:basis-[48%]`, wraps with `gap-y-10`), each stat = label (`type-ui-2` "paragraph", `text-grey-2`) → big value (`type-header-3` + forced `!text-xl !font-bold`) → delta line (colored `↑`/`↓` + percent, magnitude-weighted purple/blue as in §3, plus a "Rank N of M" citywide-ranking line) — both in `text-grey-3`/`type-ui-3`.
- Generic stat tile (`l0`, reused in the changes/personnel context too): `rounded-xl bg-background px-3 py-2.5`, label = `font-mono text-[9px] tracking-[0.1em] text-grey-3 uppercase`, value = `type-header-4` `text-grey-1`, sub-line = `font-mono text-[9px] text-grey-3`.
- **Budget breakdown ("donut") is not actually a donut/pie chart in the code** — no `conic-gradient`, `<circle>` arc math, or SVG pie path was found anywhere in the bundle. It's implemented as a **vertical stacked list of horizontal bar rows** (`ca`/`cs` components): each category is a `<div>` with `height: max(30px, min(270px, 3 × amountPct))`, `border-b-[#29D8CB]`, and `backgroundColor` = `#29D8CB` alpha-scaled by percentage (via the hex-byte-append trick, same pattern as §3), text in `#127B74`, sorted descending by amount. **If the recording actually showed a circular donut, that's either a different page/state not covered by the `us`/`sf` HTML captured, or this note should be treated as "inferred discrepancy — re-verify against the live app," since the video could not be reviewed for this task.**

### Footer
`flex justify-between`: left = `"Built by CivLab for you"` (CivLab link underlined, `text-grey-3 hover:text-grey-1`); right = `flex gap-x-4` of Email/Twitter/Substack links, same underlined muted-link style (`mailto:hello@civlab.org`, `twitter.com/m_adams`, `writing.civlab.org`).

### Power-map avatars & graph (see §6 for motion)
Circular avatar (`lE`): `rounded-full overflow-hidden bg-grey-mid` sized by `diameter`, ring drawn via `box-shadow: 0 0 0 {2|3}px var(--background), 0 0 0 {ring+2}px {partyColor|grey-1 if selected}` (background-colored gap + colored ring, not a CSS `ring-*` utility — needed because it sits over a non-uniform canvas background). Fallback (no photo): initials, `text-grey-3 font-medium`, `fontSize = max(11, 0.32 × diameter)`. Edge/arrow vocabulary (SVG path generators): dash patterns `dept_head "4 2"`, `office`/`ex_officio "1.5 3"`; arrowheads keyed by relation — `appoints`/`confirms`/`elects` get filled/open triangle markers, `advises`/`oversees`/`administers` get open chevron ticks, no arrowhead at all for plain `office`/`ex_officio` links.

## 8. Token table (ready to re-map for an India-gov build)

```
# Typography
font-family.sans      = Inter (var, wght 100-900) + system-ui fallback
font-family.mono      = ui-monospace stack
type.header-1         = 30px / 600 / 110%
type.header-2         = 24px / 600 / 120%
type.header-3         = 20px / 500 / 120%
type.header-4         = 16px / (inherit)
type.header-5         = 14px / 600 / 120%
type.paragraph-1      = 24px / 400 / 150% / -2% tracking
type.paragraph-2       = 16px / 400 / 140% / -1% tracking
type.paragraph-3      = 14px / 400 / 130%
type.paragraph-4      = 12px / 400 / 145% / +1% tracking
type.ui-1             = 16px / 500
type.ui-2             = 14px / 500
type.ui-3             = 12px / 500 / 130%
type.ui-4             = 10px / 400

# Color — neutrals (light / dark)
color.text.primary     #1c1917 / #ede9e2
color.text.secondary   #383633 / #cfc9c0
color.text.tertiary    #57534e / #a29b90
color.text.muted       #98938e / #7e776c
color.surface.page     #eceae4 / #161310
color.surface.card     #ffffff / #211e1a
color.surface.subtle   #f9f8f7 / #262220
color.surface.hover    #f4f2ef / #2b2723
color.surface.inactive #dddbd5 / #3a342e
color.border           #edece9 / #2e2925

# Color — brand / accent
color.brand            #fd8055 (same both themes)
color.pink             #f25ebf   dim #f9afdf / dark dim #3d2334
color.red              #f2686f   dim #f9b4b7 / dark dim #422427
color.orchid           #c15ef2   dim #e8b6f9 / dark dim #38224a
color.purple           #826dc8 / #9c8bdb   dim #c0b6e3 / dark dim #2e2745
color.orange           #f27836   dim #f9bc9b / dark dim #45291a
color.blue             #084ab4 / #85a8ee   dim #e8f0fe / dark dim #212b3d

# Color — sector/branch (primary node-category palette)
color.branch.legislative  #e4573d / #dd4e35
color.branch.executive    #7a7ad0 / #8484dc
color.branch.judicial     #ac7f14 / #c89c15
color.branch.independent  (none — falls back to color.text.muted)

# Color — political party (person/avatar rings only)
color.party.democrat     #084ab4 / #6d97e8
color.party.republican   #d1343b / #e0555c
color.party.independent  #826dc8 / #9c8bdb

# Color — budget module (isolated mini-palette, hex literals not vars)
color.budget.accent      #29D8CB (bars, borders)
color.budget.text        #127B74

# Radius
radius.xs   2px    radius.md  6px    radius.lg  8px
radius.xl   12px   radius.2xl 16px
(component-local overrides in practice: 3px pill / 10px nested block / 14px card)

# Spacing
spacing.unit   4px   (all paddings/gaps = unit × N)
spacing.page-gutter   16px (< 768px) / 24px (≥ 768px)

# Shadow
shadow.card-flat     0 1px 2px rgba(0,0,0,.04)          [light]
shadow.card-flat.dark inset 0 1px 0 rgba(255,255,255,.03)
shadow.popover        0 8px 32px rgba(0,0,0,.25)
shadow.sheet-up       0 -8px 32px rgba(0,0,0,.25)
shadow.sm  0 1px 3px rgba(0,0,0,.1), 0 1px 2px -1px rgba(0,0,0,.1)
shadow.lg  0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -4px rgba(0,0,0,.1)

# Motion
ease.default    cubic-bezier(.4,0,.2,1)   150ms   (hover/color transitions)
ease.out        cubic-bezier(0,0,.2,1)              (authored graph motion)
graph.node-in       opacity/transform 300ms ease-out, stagger 18ms × rank
graph.edge-draw     stroke-dashoffset 420ms ease-out
graph.edge-fade     stroke-opacity 160ms
graph.arrow-in      opacity 200ms ease-out, delay 360ms
reduced-motion       all of the above collapse to opacity 160ms, no stagger
```

## 9. Open questions / things to re-verify live

1. **"? Help" and "Categories" toolbar controls** named in the task brief were **not found** as literal strings in any downloaded JS chunk (checked case-insensitively across all pages/[gov] and shared chunks). Two explanations: they're drawn inside the graph's own `<canvas>` (would explain absence from DOM-string search), or they live in a chunk not covered by the currently-known route/chunk list. Needs a live DOM inspection.
2. **Budget donut** — code shows a bar-list, not a circular chart (§7). Needs live visual confirmation; could be per-department-type variation or a newer/older UI state.
3. Large shadow values `0 16px 40–48px` (§5) are defined in compiled CSS but not traced to a specific component in this pass — likely Radix popover/dropdown surfaces.
4. The screen recording that was meant to ground "finer nuances and interactions" for this pass could not be opened (macOS sandbox on the `screencaptureui` temp file — see top of doc). Hover/press states, exact tooltip timing, and any canvas-only UI are therefore based on inference from transition CSS, not observed interaction.

Raw assets: `research/civlab/raw/css/1e4e05271abface5.css` (+ `.pretty.css`), `research/civlab/raw/fonts/*.woff2`, `research/civlab/raw/js/{_app-c257799aa32ed36c.js, _app.beautified.js, 546-dc4533b299746cb7.js, 546.beautified.js, [gov]-67711936acf13613.js}`.
