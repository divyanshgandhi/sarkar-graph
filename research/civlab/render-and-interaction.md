# CivLab Gov Graph — Rendering & Interaction Engine

Scope: static reverse-engineering of the client bundle only (curl + static analysis, no
browser execution). Every claim below is tagged **[VERIFIED]** (read directly out of the
downloaded, de-minified source/CSS/config) or **[INFERRED]** (reasoned from adjacent
verified evidence but not directly observed executing).

Source assets pulled this session (all under
`research/civlab/raw/js/`):

| File | Role | Size |
|---|---|---|
| `_app-c257799aa32ed36c.js` | Shared `_app` chunk — **contains almost the entire product**: icons, layout config, D3 render loop, power-map river layout, search, theme, routing | 616,298 B |
| `546-dc4533b299746cb7.js` | Small shared chunk (webpack id 546) | 22,561 B |
| `framework-c259793f2972bf05.js` | React + react-dom runtime (webpack id 593) | 190,179 B |
| `main-c84da297143498e2.js` | Next.js client runtime + Sentry SDK (webpack id 792) | 373,181 B |
| `polyfills-42372ed130431b0a.js` | core-js style polyfills | 112,594 B |
| `webpack-d5e0105a4700f154.js` | webpack runtime + Vercel toolbar bootstrap | 2,709 B |
| `[gov]-67711936acf13613.js`, `404-…js`, per-slug pages (`departments/[slug]`, `dept-heads/[slug]`, `elected/[slug]`, `commissions/[slug]`, `advisories/[slug]`, `topics`, `topics/[slug]`) | Route wrappers, ~900–1,200 B each — just call into `_app` | ~1 KB each |
| `477-ec74ea5ca7388335.js`, `request-755f09ad47795141.js` | `/request` page + its 477 vendor chunk | 44,448 B / 358,743 B |
| `1e4e05271abface5.css` | Tailwind v4 output (theme tokens live here) | 52,855 B |

`_buildManifest.js` confirms the route table and, critically, that **`/[gov]`, `/404`,
`/[gov]/advisories/[slug]`, `/[gov]/commissions/[slug]`, `/[gov]/departments/[slug]`,
`/[gov]/dept-heads/[slug]`, `/[gov]/elected/[slug]`, `/[gov]/topics`, `/[gov]/topics/[slug]`
all depend only on shared chunk `546`** plus `_app`/`framework`/`main` — there is no
separate lazy-loaded chunk for the graph engine, the power map, D3, or anything else.
**[VERIFIED]** `/us/topics` genuinely 404s live (fetched `us_topics.html` → `<title>CivLab
· 404</title>`) — matches the `us` gov config's `features.topics:false`.

## 1. Framework / library stack

**[VERIFIED]** Next.js **Pages Router**, React **19** — the runtime's `react.*` well-known
symbol table (extracted from `framework.js`) includes `react.transitional.element`,
`react.activity`, `react.view_transition`, `react.memo_cache_sentinel`, all React‑19‑only
additions (React 18 only has `react.element`). `react.view_transition` appears once in
`_app.js` — inside React's own symbol table, not in app code that constructs
`<ViewTransition>` — so **[INFERRED]** the app does *not* actively use React's experimental
View-Transition API; it's just present because the React build supports it.

**[VERIFIED]** Tailwind CSS **v4.1.18** — literal banner in the CSS: `/*! tailwindcss
v4.1.18 | MIT License | https://tailwindcss.com */`. All component `className`s in
`_app.js` are Tailwind utility strings (`"flex items-center justify-center h-[44px]
w-[44px] hover:bg-grey-light transition-colors cursor-pointer"`, `"transition-opacity"`,
`transform-origin`, etc.) — no CSS-in-JS.

**[VERIFIED]** `tailwind-merge`-style class-conflict resolver bundled (a large
`conflictingClassGroups` table with the entire Tailwind scale, `cx`/`clsx`-like helper).

**[VERIFIED]** **Radix UI primitives** — `Primitive.{a,button,div,form,h2,h3,img,input,
label,li,nav,ol,p,select,span,svg,ul}` factory (`window[Symbol.for("radix-ui")]=true`),
`DismissableLayer` (Escape-to-close + outside-pointerdown-to-close), `RovingFocusGroup`,
Menu/DropdownMenu primitives (`--radix-dropdown-menu-content-transform-origin` CSS custom
properties), `Presence` (mount/unmount animation gate: `o.isPresent`,
`e?.animationName||"none"`). Used for the dropdown gov-switcher, any popovers, and almost
certainly the Help/legend overlays.

**[VERIFIED]** **d3-selection + d3-transition, hand-copied/inlined (not `import
"d3-selection"` — no npm-name strings survive minification, but the source is
byte-for-byte recognizable)**: the selection constructor `tN(){this.ownerDocument=...,
this._next=null,this._parent=e,this.__data__=t}`, `bindIndex`/`bindKey` join functions
(`tC`, `tS`), `d3.ascending` (`tA=(e,t)=>e<t?-1:e>t?1:e>=t?0:NaN`), the `classList`
polyfill (`tR`/`tO`/`tL`/`tD`), and — decisively — **live call sites** using
`.append("circle")`, `.append("rect")`, `.append("polygon")`, `.attr(...)`,
`.transition().duration(750)`, `.attrTween(...)` to draw and animate graph nodes (see §3).
**No d3-force, d3-quadtree or d3-zoom were found** — grepped for `forceSimulation`,
`forceCenter`, `forceCollide`, `forceManyBody`, `forceLink`, `quadtree`, `__zoom`,
`ZoomTransform`, `zoomIdentity`: **zero hits**, and manual scoping of every `pointerdown`/
`wheel`/`deltaY` listener in the bundle traced all of them to Radix's
`DismissableLayer`/`RovingFocus` code or to `react-remove-scroll` (a Radix Dialog
dependency for body-scroll locking) — **none belong to the graph.** **[INFERRED]** the
Graph/Power-map SVGs are **not pannable/zoomable** at all; they render at a fixed,
programmatically-computed size (see `width`/`height` in the layout config, §2) inside a
responsive container, and native pinch-zoom (browser-level) is the only zoom available.

**[VERIFIED]** Also present, `d3-shape`-style path serialization: hand-rolled tagged
template generators for SVG path commands `M`, `L`, `Q`, `C`, `Z`, and **arc** command `A
r,r,0,0,sweep,x,y` (and a full-circle-as-two-arcs variant `A r,r,0,1,sweep,…A r,r,0,1,
sweep,…`) — used for donut/arc segments (department "double-rect", sector wedge outlines,
possibly the SF budget sunburst).

**[VERIFIED]** **Fuse.js** for search — constructor calls use Fuse's exact option names:
`new eE(list, {keys:[...], threshold:.4, includeMatches:true})` for entities and
`new eE(Object.values(e.topics), {keys:["name"], threshold:.2})` for topics. Search is
**100% client-side against the already-embedded dataset** — no `/api/search` network
calls were found.

**[VERIFIED — absence]** No hits anywhere in `_app.js`/`framework.js`/`main.js` for:
`pixi`, `PIXI`, `three`/`THREE`, `sigma`, `cytoscape`, `react-force-graph`,
`framer-motion` (checked API surface too: `AnimatePresence`, `whileHover`, `whileTap`,
`useMotionValue`, `useTransform`, `useSpring`, `dragConstraints`, `MotionConfig` — all
zero), `gsap`, `react-spring`, `konva`, `vis-network`, `reactflow`, `recharts`, `victory`,
`visx`. **All animation is done "by hand"**: either CSS `transition-*` Tailwind utilities
(opacity/transform fades, `transition-colors`, `transition-opacity`) or manual
d3-transition `.attrTween` polar-coordinate interpolation (§3).

**[VERIFIED]** **Sentry** error tracking is wired into every chunk (`_sentryDebugIds`
banner + debug-id comment at the top of each file) — standard Sentry webpack-plugin
source-map/debug-id injection, not evidence of anything graph-related.

**[VERIFIED]** Rendering surface is **SVG, not Canvas/WebGL**: `createElementNS` appears
(6×) and `getContext("2d")`/`getContext("webgl")` never appear anywhere in `_app.js`;
`viewBox` appears 41×.

## 2. The "Graph" view — layout engine

**[VERIFIED — exact source, `_app.js` byte offset ~402,850]** There are exactly two named
layouts, selected per-`gov` by the `layoutId` field in the gov-registry object (module
`205`):

```js
// gov registry (module 205)
sf: { ..., layoutId: "sf-rings" }
us: { ..., layoutId: "us-sectors" }
```

```js
// layout config table
let te = {                                   // "sf-rings"
  id: "sf-rings", mode: "rings",
  rings: [
    { bucket: "elected",    spacing: 1.4,  label: "elected",    sizeMetric: "employees" },
    { bucket: "commission", spacing: 2.25, label: "commission", sizeMetric: "employees" },
    { bucket: "advisory",   spacing: 2.68, label: "advisory",   sizeMetric: "employees" },
    { bucket: "department", spacing: 3.15, label: "department", sizeMetric: "employees" },
  ],
};

let tn = {
  "sf-rings": te,
  "us-sectors": {
    id: "us-sectors", mode: "sectors",
    rings: [
      { bucket: "elected",    spacing: 1.4,  label: "elected",    sizeMetric: "seats" },
      { bucket: "commission", spacing: 2.85, label: "appointed",  sizeMetric: "children" },
      { bucket: "advisory",   spacing: 2.85, label: "appointed",  sizeMetric: "children" },
      { bucket: "department", spacing: 2.85, label: "appointed",  sizeMetric: "children" },
    ],
    sectors: [
      { id: "legislative", label: "LEGISLATIVE", minAngleDeg: 38  },
      { id: "executive",   label: "EXECUTIVE",    minAngleDeg: 120 },
      { id: "judicial",    label: "JUDICIAL",     minAngleDeg: 56  },
    ],
    sectorGapDeg: 5,
    sectorAliases: { independent: "executive" },   // "independent" agencies drawn inside the executive wedge
    depthMode: true,
    apexNodeIds: ["us-the-supreme-court-of-the-united-states"],
    functionalRings: {
      oversight: 1.95, agencies: 2.8, mobileOversight: 1.85, mobileAgencies: 2.6,
      oversightLabel: "OVERSIGHT", agenciesLabel: "ADMINISTRATION",
      oversightExtraIds: ["us-government-accountability-office", "…inspectors-general…"],
      agenciesExtraIds: ["us-united-states-district-courts", "…federal-claims", …],
    },
    congressPill:  { spanDeg: 96, thickness: 58, mobileThickness: 48 },
    cabinetPill:   { spacing: 1.85, mobileSpacing: 1.75, thickness: 44, mobileThickness: 38,
                      label: "CABINET",
                      nodeIds: ["us-department-of-state", "…the-treasury", "…defense",
                                "…justice", "…the-interior", "…agriculture", "…commerce",
                                "…labor", "…health-and-human-services",
                                "…housing-and-urban-development", "…transportation",
                                "…energy", "…education", "…veterans-affairs",
                                "…homeland-security"] },   // the 15 statutory Cabinet depts, hardcoded
    rowOffset: 13,
    prominence: { primaryIds: [ /* ~45 hand-picked high-profile agency ids */ ] },
    condensedIds: [ /* archives, series-scholarship-foundations, regional-commissions, humanities */ ],
    subAgencyCondensedIds: [ /* ~17 sub-bureaus condensed under their parent */ ],
    autoPrimaryMinChildren: 3, primarySizeRange: [14,25], mobilePrimarySizeRange: [12,21],
    primarySizeMaxChildren: 24,
    dotSize: 3.8, dotColStep: 5.4, dotRowPitch: 6.4, dotRows: 3,
    mobileDotSize: 3.4, mobileDotColStep: 4.8,
    runMinLength: 6,
    clusterBand: { offset: 44, rimInset: 46, baseInset: 4, rowGap: 6.4, dotStep: 9.5, rows: 3,
                   tier3Gap: 10, toothHeight: 36,
                   cog: { smallGroupBelow: 4, minNotch: 24 },
                   orbit: { beadSize: 7.5, dotSize: 3.8, dotColStep: 5.4, orbitGap: 3,
                            focusStep: 16, focusOrbitedStep: 22 } },
    satelliteBand: { level2Offset: 44, level3Offset: 58 },
    subtypeMarks: { court: "pentagon", adjudicative_body: "pentagon",
                    government_corporation: "double-rect", quasi_official: "octagon" },
    commissionNodeSize: 13, departmentSizeRange: [12, 23],
    nodeSizeOverrides: {
      "us-president-of-the-united-states": { size: 17, mobileSize: 15 },
      "us-the-supreme-court-of-the-united-states": { size: 19, mobileSize: 17 },
    },
    staggerOffset: 13, chamberArc: { label: "CONGRESS" },
  },
};
```

So — **correction to the brief**: the "dark semicircle fan with sector wedges
EXECUTIVE / ADMINISTRATION / CABINET / …" *is the main Graph view's `us-sectors`
layout itself*, not a separate "Power map" screen. It's one radial diagram split into
three angular wedges (legislative / executive / judicial), with the executive wedge
further subdivided into functional concentric bands (an "OVERSIGHT" ring, an
"ADMINISTRATION" ring, a "CABINET" pill band, a "CONGRESS" chamber arc for the
legislative wedge). The **Power Map tab is a completely different, non-radial "river"
diagram** — see §5.

### Sector-angle allocation — exact algorithm [VERIFIED]

```js
// ti(sectorsConfig, weightByIdMap) -> [{id, label, startAngle, endAngle}]
ti = (cfg, weight) => {
  const sectors = cfg.sectors ?? [];
  if (!sectors.length) return [];
  const gap = (cfg.sectorGapDeg ?? 4) * Math.PI / 180;      // 5° for us-sectors
  const budget = 2*Math.PI - gap * sectors.length;           // full circle minus gaps
  const totalWeight = sectors.reduce((s, x) => s + (weight[x.id] ?? 0), 0) || 1;

  // 1) proportional share of the circle, but never below minAngleDeg
  let angles = sectors.map(x => {
    const proportional = budget * (weight[x.id] ?? 0) / totalWeight;
    return Math.max(x.minAngleDeg * Math.PI/180, proportional);
  });
  // 2) renormalize so clamped angles still sum to `budget`
  const sum = angles.reduce((a,b) => a+b, 0);
  angles = angles.map(a => a * budget / sum);

  // 3) walk around the circle starting at 12 o'clock (-90°), placing
  //    each wedge centered so wedge 0 straddles the top
  const out = [];
  let cursor = -Math.PI/2 - angles[0]/2;
  sectors.forEach((x, i) => {
    out.push({ id: x.id, label: x.label, startAngle: cursor, endAngle: cursor + angles[i] });
    cursor += angles[i] + gap;
  });
  return out;
};
```

i.e. sector width ∝ node-count (or similar weight) in that sector, but **legislative
never gets less than 38°, executive never less than 120°, judicial never less than 56°**
— executive is guaranteed the majority of the circle regardless of actual weight, which
matches the federal government's real size skew.

### Node ordering within a sector/ring — exact algorithm [VERIFIED]

Two near-identical helpers space N node "slots" evenly across a wedge, each shrinking the
wedge slightly on both sides so labels/first-last nodes don't touch the sector boundary:

```js
ta = (n, {startAngle, endAngle}) => {              // pad = min(6%, arc*8%)
  const pad = Math.min(.06, (endAngle-startAngle)*.08);
  const a0 = startAngle+pad, a1 = endAngle-pad;
  if (n<=0) return [];
  if (n===1) return [(a0+a1)/2];
  const step = Math.min((a1-a0)/(n-1), .35);         // step capped at .35 rad (~20°)
  const center = (a0+a1)/2 - step*(n-1)/2;
  return Array.from({length:n}, (_,i) => center + i*step);
};
to = (n, {startAngle, endAngle}) => { /* same idea, pad = min(8%,6%) instead of (6%,8%) */ };
```

A separate pair of functions does **collision-aware label packing along an arc**
(`tc`/`tu`): each item gets a pixel width from its text label, items are placed
left-to-right with a caller-supplied minimum gap function, then a right-to-left second
pass pulls any item that overflowed the wedge boundary back in; `tu` additionally supports
keeping one "focused" item pinned near its natural angle while everything else
re-flows around it (used, almost certainly, for the hover/selected-node highlight state
so the label of the hovered node doesn't jump).

### Node draw + update loop — exact algorithm [VERIFIED, `_app.js` ≈ offset 554,000–561,200]

This is a **plain d3 imperative render function** run from inside a React `useEffect`
against a ref'd `<svg>` (classic "React owns the container, D3 owns the children"
escape hatch — not a React-reconciled SVG tree for the nodes themselves). One shared
function handles all node kinds via `if/else` branches keyed on the node's ring
(`i` = `"advisory" | "department" | "commission" | "elected"`):

* **`elected`** → `<circle>`. Radius = size-metric value scaled through function `b`
  (a d3-style continuous scale) or a flat default of `10`.
* **`commission`** → `<rect>` **rotated 45°** (`rotate(180·angle/π + 45, cx, cy)`) — i.e.
  drawn as a **diamond**. Corner radius fixed at 4.
* **`department`** (and `"advisory"` nodes that resolve to a department-like subtype):
  * subtype `court` / `adjudicative_body` → regular **pentagon**, apex pointing up
    (`startAngle = -π/2`), vertex radius = `0.62 × size`.
  * subtype `quasi_official` → regular **octagon**, rotated -π/2+π/8, vertex radius =
    `0.58 × size`.
  * subtype `government_corporation` → **"double-rect"**: outer rounded `<rect>`
    (`rx=ry=3`) plus, only when the node is bigger than 10px, a second inset `<rect>`
    3px in from each edge with `rx=ry=2` — reads as a concentric double-square.
  * no subtype → plain **rounded `<rect>`** whose corner radius is itself a function of
    size, so small nodes read as circles and large ones as squares:
    `rx = size<6 ? size/2 : size<9 ? 1.5–2 : 3–5`.
* Everything without an explicit shape branch (small "advisory"/satellite dots) falls
  through to a small rounded `<rect>` sized via the same corner-radius formula.

Every shape append is immediately followed by **`.transition().duration(750)`** with
`attrTween` on the geometry (`r`, or `width`/`height`/`x`/`y`, or `points` for
pentagon/octagon) *and* on a `transform` string built from tweened **polar** coordinates:

```js
const toTransform = (angle, radius) =>
  `translate(${radius*Math.cos(angle)}, ${radius*Math.sin(angle)}) rotate(${180*angle/Math.PI+90})`;
group.attr("transform", toTransform(prevAngle, prevRadius));
if (prevAngle !== angle || prevRadius !== radius) {
  group.transition().duration(750)
       .attrTween("transform", () => t => toTransform(angleInterp(t), radiusInterp(t)));
}
```

So **every node reflow (filter/select/resize) animates along a curved (angle+radius
interpolated) path over 750 ms**, not a straight-line tween — this is the concrete
mechanism behind the "nodes glide into their new ring/sector position" feel, achieved
with zero animation libraries.

**Selection/dimming**: a boolean `W` (name unrecoverable, functionally "is something else
selected / filtered-out") sets `opacity:0.12` and `pointer-events:none` on non-matching
nodes/groups — this is the exact **"highlight selected, dim everything else"** hover/
click behavior, with **0.12 as the dimmed opacity** and normal nodes carrying
`cursor:pointer`. `data-node-id` is stamped on every shape (used for hit-testing / possibly
event delegation upstream).

**Colors**: shape `fill`/`stroke` are passed in already resolved from the sector CSS
variables via a small icon-color helper (module 8181):

```js
const branchColor = { legislative: "var(--branch-legislative)",
                       executive:   "var(--branch-executive)",
                       judicial:    "var(--branch-judicial)",
                       independent: "var(--branch-executive)" };   // independent reuses executive's color
```

**[VERIFIED] Theme color tokens (light `:root` / dark `:root[data-theme=dark]`)**:

| token | light | dark |
|---|---|---|
| `--background` | `#eceae4` | `#161310` |
| `--branch-legislative` | `#e4573d` | `#dd4e35` |
| `--branch-executive` | `#7a7ad0` | `#8484dc` |
| `--branch-judicial` | `#ac7f14` | `#c89c15` |
| `--party-democrat` | `#084ab4` | `#6d97e8` |
| `--party-republican` | `#d1343b` | `#e0555c` |
| `--party-independent` | `#826dc8` | `#9c8bdb` |
| `--brand` (heat-glow color) | `#fd8055` | `#fd8055` (same both themes) |
| `--grey-1`…`--grey-4`, `--grey-light/-lighter/-mid`, `--outline`, `--white` | light greys | dark greys (full palette in `js/1e4e05271abface5.css`) |

**Default theme**: inline head script (present raw in every HTML response) —

```html
<script>try{var p=location.pathname;
  if(/^\/request(\/|$)/.test(p) || (/^\/us(\/|$)/.test(p) && localStorage.getItem('civlab-theme')!=='light'))
    document.documentElement.dataset.theme='dark'
}catch(e){}</script>
```

i.e. `/us*` and `/request*` default to **dark** unless the visitor previously chose
"light" (persisted in `localStorage['civlab-theme']`); `/sf*` defaults to light. This runs
before paint (no FOUC) and is mirrored by a `MutationObserver` on `data-theme` plus
`useSyncExternalStore` in React (module `7636`) so the toggle button (`nw.Yl`) re-renders
instantly.

## 3. Node shapes — quick reference

| type / subtype | shape | notes |
|---|---|---|
| `elected` | circle | radius from `sizeMetric` (seats/employees) |
| `commission` | diamond (rect rotated 45°) | fixed rx 4 |
| `department` (no subtype) | rounded square → circle as it shrinks | corner radius scales with size |
| `department` subtype `court` / `adjudicative_body` | pentagon | apex up |
| `department` subtype `quasi_official` | octagon | |
| `department` subtype `government_corporation` | "double-rect" (nested rounded squares) | inner square only if size>10 |
| `advisory` (small/satellite) | small rounded rect (near-dot) | |

Icon components for detail panels (module `800`, exported as `FI`) mirror this: `FI.Court`,
`FI.GovernmentCorporation`, `FI.QuasiOfficial`, `FI.Department`, `FI.Elected`,
`FI.Commission`, `FI.Advisory`, `FI.Constituency`, `FI.DeptHead` — same shape language used
in list rows/breadcrumbs, colored via the same `branchColor` map.

## 4. Edges

**[VERIFIED]** Edge-type visual language (from the Power Map's link renderer, module
around offset 213,000 — almost certainly shared/mirrored by the main Graph, since the
edge-type set is the same 8 relationship kinds):

```js
lw (dash pattern) = { dept_head: "4 2", office: "1.5 3", ex_officio: "1.5 3" };
// everything else (appoints, elects, confirms, advises, oversees, administers) = solid

l_ (endpoint marker glyph, ~6px, drawn at a point along the curve):
  appoints:    { d:"M0,-3 L6,0 L0,3 Z",                 fill:"ink"   }  // solid triangle
  elects:      { d:"M0,-3 L3,0 L0,3 Z M3,-3 L6,0 L3,3 Z", fill:"ink" }  // double triangle
  confirms:    { d:"M0,-3 L6,0 L0,3 Z",                 fill:"paper" }  // hollow triangle
  advises:     { d:"M0,-3 L6,0 L0,3",                   fill:"none"  }  // open chevron
  oversees:    { d:"M0,-3 L2,0 L0,3 M3,-3 L5,0 L3,3",   fill:"none"  }  // double open chevron
  administers: { d:"M0,-3 L2,0 L0,3 M3,-3 L5,0 L3,3",   fill:"none"  }  // same as oversees
```

`{advises, oversees, administers}` are grouped into a `Set` (`lb`) — treated as a distinct
"soft/informational" relationship category vs. the "hard/structural" ones
(appoints/elects/confirms/dept_head/ex_officio/office).

**Curve math [VERIFIED]**: edge midpoints/marker placement use a **quadratic Bézier**:
`B(t) = (1-t)²·P0 + 2(1-t)t·C + t²·P1`, and the marker-placement function tries a
fallback list of t-values `[naturalT, .5, .58, .42, .66, .34, .74, .26, .8, .2]`, picking
the first one whose point doesn't land inside either endpoint node's hit-box (radius +
label bounds) — a small greedy collision-avoidance pass, not physics.

**Hover opacity states [VERIFIED, Power Map]**: connected-to-hovered edge → `0.7`;
edge touching neither hovered nor selected but something *is* hovered → `0.06`; default/
idle → `0.16`. **[INFERRED]** the main Graph view reuses the same "dim to ~0.12–0.16,
highlight to ~0.7" pattern given the shared `W`/opacity-0.12 mechanism on nodes (§2).

## 5. "Power Map" — NOT a semicircle fan; it's a packed "river" diagram

**[VERIFIED — corrects the task brief]** The tab literally reads `Power Map: who is in the
news` (`data-testid="power-map-heading"`) with subtext `"The N people named most across
{articleCount} articles from {sources} sources in the last {windowDays} days"`, and the
container carries `data-testid="power-map-river"`. It is **not** rendered with the
sector/ring layout at all — it has its own bespoke layout function (`lm`, `_app.js`
≈ offset 212,325):

```js
// lm({people, links, width, phone, maxHeight}) -> {placed:[{id,x,y,r,labelWidth,labelHeight}], height, scale}
function lm({ people, links, width, phone, maxHeight }) {
  // 1. circle radius per person = sqrt(total mentions), scaled between a small/large px range
  //    (10–120px desktop, 16 min / 0.4*width max on phone), floor'd at a minimum size
  // 2. greedily pack people into ROWS, left→right, wrapping to a new row once a row's
  //    running width would exceed `width` (classic shelf/bin-packing, not a grid)
  // 3. for each row, try MULTIPLE PERMUTATIONS of that row's members (via a small
  //    permutation generator) and keep whichever ordering minimizes a cost function:
  //       cost = Σ |x(person) - x(linked person in adjacent row)|
  //            + 0.05 * |x(person) - rank-derived "home" x position|
  //    (an exhaustive/greedy edge-crossing minimizer per row, capped because rows are
  //    short — 1–6 items depending on viewport)
  // 4. one extra relaxation pass: nudge each person 30% of the way toward the average
  //    x of everyone they're linked to (single pass, clamped to its packing cell — NOT
  //    an iterative force simulation)
  // 5. if the whole thing is taller than `maxHeight` (mobile), shrink the size scale by
  //    up to 25%/iteration for up to 4 iterations and repack
  return { placed, height, scale };
}
```

So conceptually it's **a rank-ordered, width-packed bubble layout with a one-shot
"pull toward your connections" relaxation** — visually similar to a "river of faces"
timeline, not the branch/sector fan.

**Heat glow [VERIFIED]**: a separate, absolutely-positioned `<svg>` overlay draws one
extra `<circle>` per person, stroke-only, `r = nodeRadius+7`, `stroke="var(--brand)"`
(`#fd8055`), `strokeWidth=10`, `filter: blur(6px)`, and
`strokeOpacity = 0.16 + 0.5 × normalizedHeat`. On first paint (`W` true) each glow **fades
in over 300ms ease-out with a staggered delay of `18ms × rank + 200ms`** — the #1-ranked
person's glow appears at 218ms, #2 at 236ms, etc., producing a cascading reveal down the
power ranking. `data-heat={heat.toFixed(2)}` is stamped on each circle (debug/QA hook).

**Interactions [VERIFIED]**: clicking a person either opens their news feed inline
(sets `activeView` context state, no navigation) or — a separate handler `z` —
calls `onSelectNode` **and** `onChangeActiveView("graph")`, i.e. **clicking through from
Power Map jumps you into the Graph view already focused on that person**. A 160ms
`setTimeout`-debounced hover handler drives the connection-highlight state (`$`/`H`
functions: hover-in sets immediately, hover-out clears after 160ms — a short grace period
so moving between a node and its label doesn't flicker the highlight off).

**View switch**: a single component (`lT`) switches on `activeView` — `"budget"` → the SF
sunburst (`t6`, SF-only), `"power"` → the river diagram (`lP`), else → the main
Graph/GovGraph component (`eF.T7`). **[VERIFIED — absence]** No shared-element/
`layoutId`-style morph transition library is used for this switch (confirmed absent:
`AnimatePresence`, `layoutId`-as-Framer-Motion-prop — the two `layoutId` string literals
that do exist in the bundle are just the plain config keys `"sf-rings"`/`"us-sectors"`,
unrelated to Framer Motion). **[INFERRED]** the Graph ⇄ Power-map switch is a plain React
conditional re-mount, dressed with Tailwind's `transition-opacity` class at most — i.e. a
simple cross-fade, not a magic-move/shared-layout animation.

## 6. Chrome: tabs, legend, search, keyboard, routing

**Tabs [VERIFIED]**: `[{id:"graph",label:"Graph"}, budget?, powerMap?]` → SF gets
Graph + Budget (no Power map); US gets Graph + Power map (no Budget) — driven by the
per-gov `features` flags in module 205.

**Legend [VERIFIED]**: a header row literally labelled `"Legend"` with a chevron
(`<svg viewBox="0 0 18 10">`, rotated 180° when expanded) and, when collapsed, an
`"{n} hidden"` counter. State lives in the shared `GovGraph.Provider` context as
`legendDisabledKinds: Set<string>`, toggled one kind at a time
(`onToggleLegendKind`) with an `onResetLegend` to clear all — i.e. **legend items are
individually togglable multi-select filters**, not radio-style.

**Search [VERIFIED]**: `Cmd/Ctrl+K` opens the search overlay and focuses
`.search-input`; `Escape` closes it; clicking outside both `#search-mobile` and
`#search-desktop` closes it; a Next.js `routeChangeStart` listener force-closes and
clears the query on navigation. Powered by two separate Fuse.js indices (entities
`threshold:0.4`, topics `threshold:0.2`, entities index additionally matches on people's
`imageUrl`-gated name list) — pure client-side fuzzy match against the already-downloaded
dataset (no network call).

**Prev/Next department [VERIFIED]**: `ArrowRight`/`ArrowLeft` call
`onNextDepartment`/`onPreviousDepartment` globally (`window.addEventListener("keydown",…)`,
no modifier needed) — lets a visitor page through departments without touching the mouse.

**Click-to-navigate [VERIFIED]**: selecting an entity ultimately calls
`router.push(path, undefined, { scroll: false })` — a **real** Next.js client-side
transition (fetches the destination page's JSON props, `shallow` is **not** set) but with
scroll position preserved, so the graph panel doesn't jump when you move between
`/us/departments/x` and `/us/departments/y`.

**"Help"/"Focus" controls**: **[VERIFIED — absence]** no `"Help"` or `"Focus"` string,
`aria-label`, or `title` attribute exists anywhere in `_app.js` (full-text search, zero
hits for both). Either these are icon-only controls whose accessible name comes from a
resource not captured here (e.g., rendered from JSON content fetched at runtime rather
than string-literal JSX — no such fetch was found either, so this is unresolved), or they
were mis-identified while watching the recording and are actually the Legend
chevron/dark-mode toggle described above. **Flagging as unresolved rather than guessing.**

## 7. "Real-time" assessment (for the stated Indian-gov-equivalent goal)

**[VERIFIED]** Response headers for a fresh fetch of `/us`:
`x-nextjs-prerender: 1`, `x-vercel-cache: HIT`, `age: 19155` (~5.3h), `cache-control:
public, max-age=0, must-revalidate`, `etag` present. This is textbook Next.js **SSG +
ISR served from Vercel's edge cache** — the page you get is a pre-rendered snapshot that
can sit in cache for hours; freshness comes from server-side rebuilds (time-based
`revalidate` and/or on-demand revalidation via Vercel's API when their backend detects new
data), not from anything the client does.

**[VERIFIED]** The *only* client-side timer in the whole bundle is a `setInterval(…,
60000)` that updates a local `Date.now()` React state (`lv`), used purely to keep
relative-time / "mentioned in last 24h" (`Date.now() - lastMentionTime < 86,400,000ms`)
computations fresh against the *already-loaded* dataset. **There is no polling, no
WebSocket, no SSE, no re-fetch of nodes/edges/powerMap/changes at runtime anywhere in
`_app.js`.** Everything (952 nodes, 1,433 edges, the 90-day/1,080-article power map,
the personnel `changes` feed) is baked into `__NEXT_DATA__` at build/ISR-revalidate time
and never touched again client-side.

**Implication for a "we need it to be realtime" Indian-gov build**: CivLab's own product
is *not* realtime in the client sense — it's "fresh-looking" because ISR quietly
re-snapshots in the background (likely on a cron + on-demand webhook when their scraper/
LLM pipeline detects a personnel change), and the client just renders whatever static
snapshot it's handed. A genuinely realtime version (live push on cabinet reshuffles,
appointments, etc.) would require adding what CivLab explicitly does **not** have:
a subscription channel (SSE/WebSocket) or aggressive client polling layered on top of this
same rendering engine — the rendering/layout code itself (§2–§5) is orthogonal to that and
can be reused as-is against a live data source.

## Open items / not resolved this pass

- Exact bodies of `ea` (prev/curr radius pair for shape-morph transitions) and `iQ`
  (shared size+angle allocator called by every node-type branch) were located but not
  fully unrolled — low value beyond what §2/§3 already extract.
- The precise DOM event wiring for graph-node click/hover (`ij(...)` call inside the
  d3 render loop) could not be isolated with certainty: the identifier `ij` is reused as a
  *different* local variable name inside an unrelated Radix Menu module elsewhere in the
  same file (minifier scope collision), so only the call-site *shape* (same helper
  invoked identically for every node type, passed the node, ring, and both fill/stroke
  colors) is verified, not its internal body.
- "Help"/"Focus" UI copy is unresolved (§6) — worth a live-browser DOM inspection pass
  (out of scope for this curl-only session) rather than more static grepping.
- SF-only Budget sunburst (`t6`) and the `/request` form page were not analyzed in depth
  (out of scope: task specified `/us`, `/us/departments/<slug>`, `/sf`).
