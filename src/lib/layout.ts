// Radial "surveyed wheel" layout — track-based, overlap-free by construction.
//
// Sectors are angular wedges (CivLab's proportional-with-minimum allocation). Inside them,
// every drawn mark sits on a concentric *track*. Tracks are built from the inside out and are
// exactly as thick as their largest mark, so marks on different tracks can never touch.
// Along a track, marks are placed by a 1-D solver that keeps each one as close as possible to
// where it belongs (next to its parent body) while enforcing a minimum gap, so marks on the
// same track can never touch either. A tier whose marks do not fit on one track gets more.
import type { GNode, GovGraph, Sector } from "./types";

export interface PlacedNode {
  id: string;
  x: number;
  y: number;
  a: number; // angle (radians, 0 = 3 o'clock, clockwise positive in SVG space)
  r: number; // radius from centre
  s: number; // glyph size (px, roughly the diameter)
  sector: Sector;
  shape: GNode["shape"];
  kind: "node" | "head" | "dot" | "seal" | "chamber";
  attachedTo?: string;
}

export interface SectorArc {
  id: Sector;
  label: string;
  labelHi?: string;
  a0: number;
  a1: number;
  outer: number;
  teeth: { a0: number; a1: number; r: number }[];
}

export interface ChamberGeom {
  id: string;
  lobes: { id: string; a0: number; a1: number }[];
  a0: number;
  a1: number;
  r0: number;
  r1: number;
}

export interface WheelLayout {
  R: number;
  seal: number;
  inner: number;
  rings: Record<number, number>; // tier → radius of its first track
  tracks: { tier: number; r: number; sector: Sector }[];
  sectorRings: Record<string, Record<number, number>>;
  sectors: SectorArc[];
  nodes: Map<string, PlacedNode>;
  chamber?: ChamberGeom;
  ringLabels: { ring: number; label: string; a: number; r: number }[];
}

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

const MIN_DEG_UNION: Partial<Record<Sector, number>> = { legislative: 44, executive: 150, federal: 44, constitutional: 40, judicial: 40 };
const MIN_DEG_STATE: Partial<Record<Sector, number>> = { legislative: 48, executive: 110, local: 70, constitutional: 36, judicial: 34 };

// Seats that are drawn as their own mark. Everyone else (secretaries, chairs, DGs, judges,
// members) is listed in the panel of the body they sit in.
const DRAWN_RANKS = new Set([
  "head_of_state",
  "vice_head_of_state",
  "head_of_government",
  "governor",
  "lieutenant_governor",
  "administrator",
  "chief_minister",
  "deputy_chief_minister",
  "cabinet_minister",
  "mos_independent_charge",
  "state_minister",
  "minister_of_state",
  "presiding_officer",
  "leader_of_opposition",
  "law_officer",
]);

const BIG = new Set(["in-min-home-affairs", "in-min-defence", "in-min-finance", "in-min-external-affairs"]);

export function isDrawn(n: GNode, g: GovGraph): boolean {
  if (n.sector === "people") return false;
  if (!n.isPosition) return true;
  if (!DRAWN_RANKS.has(n.rank ?? "")) return false;
  // in the Union, Ministers of State are listed inside their ministry, not drawn
  if (g.kind === "union" && n.rank === "minister_of_state") return false;
  return true;
}

export function sizeOf(n: GNode, isUnion: boolean, maxBudget: number): number {
  const r = n.rank ?? "";
  if (n.isPosition) {
    if (r === "head_of_state" || r === "head_of_government" || r === "chief_minister" || r === "governor" || r === "lieutenant_governor" || r === "administrator") return 15;
    if (r === "vice_head_of_state") return 13;
    if (r === "cabinet_minister" || r === "mos_independent_charge" || r === "state_minister" || r === "deputy_chief_minister") return 8.5;
    if (r === "minister_of_state") return 7;
    return 9;
  }
  switch (n.shape) {
    case "chamber":
      return 16;
    case "state":
      return 11;
    case "commission":
      return n.ring <= 2 ? 12 : 9.5;
    case "court":
      return n.id === "in-supreme-court" ? 17 : n.ring <= 3 ? 10 : 8.5;
    case "committee":
      return n.ring <= 3 ? 9 : 7;
    case "district":
      return 6.5;
    case "tier":
      return 8.5;
    case "advisory":
      return 8.5;
    case "force":
      return 9;
    case "corporation":
      return 8;
    default: {
      if (n.ring === 5 || (!isUnion && n.kind === "state_department")) {
        const be = n.budget?.be ?? 0;
        if (be > 0 && maxBudget > 0) return 10 + 7 * Math.sqrt(be / maxBudget);
        return 10 + Math.min(4, (n.children?.length ?? 0) * 0.25);
      }
      if (n.ring === 6) return 8.5;
      if (n.ring <= 3) return 10;
      return 8;
    }
  }
}

function allocateSectors(g: GovGraph, weights: Record<string, number>, gapDeg: number): { id: Sector; a0: number; a1: number }[] {
  const mins = g.kind === "union" ? MIN_DEG_UNION : MIN_DEG_STATE;
  const secs = g.sectors.filter((s) => (weights[s.id] ?? 0) > 0 || s.id === "legislative" || s.id === "executive");
  const gap = gapDeg * DEG;
  const budget = TAU - gap * secs.length;
  const tw = secs.reduce((s, x) => s + Math.pow(weights[x.id] ?? 0, 0.8), 0) || 1;
  let angles = secs.map((x) => Math.max((mins[x.id] ?? 24) * DEG, (budget * Math.pow(weights[x.id] ?? 0, 0.8)) / tw));
  const sum = angles.reduce((a, b) => a + b, 0);
  angles = angles.map((a) => (a * budget) / sum);
  const out: { id: Sector; a0: number; a1: number }[] = [];
  let cur = -Math.PI / 2 - angles[0] / 2;
  secs.forEach((s, i) => {
    out.push({ id: s.id, a0: cur, a1: cur + angles[i] });
    cur += angles[i] + gap;
  });
  return out;
}

/**
 * Place items on an interval with a minimum spacing, as close as possible (least squares)
 * to their desired positions, keeping their order. Pool-adjacent-violators on blocks.
 * Positions and widths are in the same unit (arc length in px along the track).
 */
export function pack1D(desired: number[], widths: number[], lo: number, hi: number): number[] {
  const n = desired.length;
  if (!n) return [];
  const order = desired.map((d, i) => i).sort((p, q) => desired[p] - desired[q] || p - q);
  const total = widths.reduce((a, b) => a + b, 0);
  const span = hi - lo;
  // if it cannot fit, squeeze uniformly (callers split into more tracks before this happens)
  const k = total > span ? span / total : 1;
  const w = widths.map((x) => x * k);
  type Block = { start: number; items: number[]; width: number; sumD: number; sumOff: number };
  const blocks: Block[] = [];
  for (const i of order) {
    // offset of this item's centre from its block's left edge
    let b: Block = { start: 0, items: [i], width: w[i], sumD: desired[i], sumOff: w[i] / 2 };
    b.start = b.sumD - b.sumOff;
    blocks.push(b);
    // merge while overlapping the previous block, or while out of bounds
    for (;;) {
      b = blocks[blocks.length - 1];
      b.start = Math.min(Math.max((b.sumD - b.sumOff) / b.items.length, lo), hi - b.width);
      const prev = blocks[blocks.length - 2];
      if (!prev || prev.start + prev.width <= b.start + 1e-9) break;
      // merge b into prev: one rigid block, positioned by least squares over all its items
      const merged: Block = { start: 0, items: [...prev.items, ...b.items], width: prev.width + b.width, sumD: 0, sumOff: 0 };
      let off = 0;
      for (const j of merged.items) {
        merged.sumD += desired[j];
        merged.sumOff += off + w[j] / 2;
        off += w[j];
      }
      blocks.splice(blocks.length - 2, 2, merged);
    }
  }
  const out = new Array<number>(n);
  for (const b of blocks) {
    let x = b.start;
    for (const j of b.items) {
      out[j] = x + w[j] / 2;
      x += w[j];
    }
  }
  return out;
}

interface Item {
  id: string;
  n: GNode;
  s: number; // mark size
  w: number; // footprint along the track (px), includes gap
  h: number; // footprint across the track (px)
  d: number; // desired angle
  block?: GNode[]; // for cluster blocks: the small bodies inside
  cols?: number;
  rowsIn?: number;
}

export function layoutWheel(g: GovGraph): WheelLayout & { extent: number } {
  const isUnion = g.kind === "union";
  const nodes = Object.values(g.nodes);
  const byId = g.nodes;
  const placed = new Map<string, PlacedNode>();
  const maxBudget = Math.max(0, ...nodes.map((n) => (n.ring === 5 && !n.isPosition ? n.budget?.be ?? 0 : 0)));
  const seal = isUnion ? 58 : 54;
  const inner = seal + 30;
  const GAP = isUnion ? 5 : 7; // min clear space between marks
  const DOT = isUnion ? 3.2 : 4;
  const DOT_STEP = DOT + 1.9;

  const drawn = nodes.filter((n) => isDrawn(n, g));
  const drawnIds = new Set(drawn.map((n) => n.id));

  // bodies each seat heads (for aligning ministers with their ministries)
  const headsBy = new Map<string, string[]>();
  for (const n of nodes) {
    for (const h of [n.head, n.adminHead]) if (h && drawnIds.has(h)) (headsBy.get(h) ?? headsBy.set(h, []).get(h)!).push(n.id);
  }
  for (const n of drawn) if (n.isPosition && n.headOf && byId[n.headOf]) (headsBy.get(n.id) ?? headsBy.set(n.id, []).get(n.id)!).push(n.headOf);

  // weights for sector sizing
  const weights: Record<string, number> = {};
  for (const n of drawn) weights[n.sector] = (weights[n.sector] ?? 0) + (n.cluster ? 0.22 : n.isPosition ? 0.5 : 1);
  const secs = allocateSectors(g, weights, isUnion ? 3 : 3.4);

  placed.set(g.root, { id: g.root, x: 0, y: 0, a: 0, r: 0, s: seal * 2, sector: "people", shape: "seal", kind: "seal" });
  const put = (n: GNode, a: number, r: number, s: number, kind: PlacedNode["kind"] = "node", attachedTo?: string) =>
    placed.set(n.id, { id: n.id, x: r * Math.cos(a), y: r * Math.sin(a), a, r, s, sector: n.sector, shape: n.shape, kind, attachedTo });

  // ── 1. desired angles, sector by sector (a weighted radial tree) ─────────────────────────
  const desired = new Map<string, number>();
  const clusterOwner = new Map<string, string>(); // small body → the drawn body whose block it joins
  const secOf = new Map(secs.map((s) => [s.id, s]));
  let chamber: ChamberGeom | undefined;

  for (const sec of secs) {
    const inSec = drawn.filter((n) => n.sector === sec.id);
    const pad = Math.min(0.04, (sec.a1 - sec.a0) * 0.05);
    const A0 = sec.a0 + pad,
      A1 = sec.a1 - pad;

    // the legislature bean holds the middle of tier 1 in the legislative wedge
    if (sec.id === "legislative") {
      const legislature = inSec.find((n) => n.kind === "legislature" || n.kind === "state_legislature");
      const lobes = inSec.filter((n) => n.kind === "chamber" || n.kind === "state_chamber");
      const list = lobes.length ? lobes : legislature ? [legislature] : [];
      if (list.length) {
        list.sort((p, q) => (/lok-sabha|assembly/.test(p.id) ? -1 : 1) - (/lok-sabha|assembly/.test(q.id) ? -1 : 1));
        const span = Math.min((sec.a1 - sec.a0) * 0.62, (isUnion ? 64 : 58) * DEG);
        const mid = (sec.a0 + sec.a1) / 2;
        const c0 = mid - span / 2,
          c1 = mid + span / 2;
        const lobeSpan = (c1 - c0) / list.length;
        chamber = { id: legislature?.id ?? list[0].id, a0: c0, a1: c1, r0: 0, r1: 0, lobes: list.map((l, i) => ({ id: l.id, a0: c0 + i * lobeSpan, a1: c0 + (i + 1) * lobeSpan })) };
        if (legislature) desired.set(legislature.id, mid);
        list.forEach((l, i) => desired.set(l.id, c0 + (i + 0.5) * lobeSpan));
      }
    }

    // tree over drawn bodies in this sector (parent must sit on an inner tier)
    const bodies = inSec.filter((n) => !n.isPosition && !desired.has(n.id));
    const bodyIds = new Set(bodies.map((n) => n.id));
    const kids = new Map<string, GNode[]>();
    const roots: GNode[] = [];
    for (const n of bodies) {
      let p = n.parent;
      // small bodies join the block of their nearest drawn, non-cluster ancestor
      if (n.cluster) {
        let a = p ? byId[p] : undefined;
        while (a && (a.cluster || !bodyIds.has(a.id))) a = a.parent ? byId[a.parent] : undefined;
        if (a) clusterOwner.set(n.id, a.id);
        continue;
      }
      if (p && bodyIds.has(p) && !byId[p].cluster && byId[p].ring < n.ring) (kids.get(p) ?? kids.set(p, []).get(p)!).push(n);
      else roots.push(n);
    }
    const clusterCount = new Map<string, number>();
    for (const [c, o] of clusterOwner) if (byId[c].sector === sec.id) clusterCount.set(o, (clusterCount.get(o) ?? 0) + 1);

    const wmemo = new Map<string, number>();
    const weightOf = (n: GNode): number => {
      if (wmemo.has(n.id)) return wmemo.get(n.id)!;
      const own = sizeOf(n, isUnion, maxBudget) + GAP;
      const sub = (kids.get(n.id) ?? []).reduce((s, c) => s + weightOf(c), 0);
      const dots = clusterCount.get(n.id) ?? 0;
      const block = dots ? Math.ceil(dots / 4) * DOT_STEP + GAP : 0;
      const w = Math.max(own, sub, block);
      wmemo.set(n.id, w);
      return w;
    };
    const assign = (n: GNode, a0: number, a1: number) => {
      desired.set(n.id, (a0 + a1) / 2);
      const ch = (kids.get(n.id) ?? []).sort((p, q) => weightOf(q) - weightOf(p) || p.name.localeCompare(q.name));
      // biggest child in the middle of the parent's span
      const ordered: GNode[] = [];
      ch.forEach((c, i) => (i % 2 ? ordered.unshift(c) : ordered.push(c)));
      const tw = ordered.reduce((s, c) => s + weightOf(c), 0) || 1;
      let cur = a0;
      for (const c of ordered) {
        const w = ((a1 - a0) * weightOf(c)) / tw;
        assign(c, cur, cur + w);
        cur += w;
      }
    };
    // roots that lead a subtree share the wedge by weight; lone inner roots are spread later
    const leaders = roots.filter((n) => (kids.get(n.id)?.length ?? 0) > 0 || n.ring >= 4 || (clusterCount.get(n.id) ?? 0) > 0);
    const loners = roots.filter((n) => !leaders.includes(n));
    const prominence = (n: GNode) => (BIG.has(n.id) ? 1e12 : 0) + (n.budget?.be ?? 0) * 10 + weightOf(n);
    const ordered: GNode[] = [];
    leaders.sort((p, q) => prominence(q) - prominence(p) || p.name.localeCompare(q.name)).forEach((n, i) => (i % 2 ? ordered.unshift(n) : ordered.push(n)));
    const tw = ordered.reduce((s, n) => s + weightOf(n), 0) || 1;
    let cur = A0;
    for (const n of ordered) {
      const w = ((A1 - A0) * weightOf(n)) / tw;
      assign(n, cur, cur + w);
      cur += w;
    }
    // loners and seats: over what they lead or head, else spread across the wedge by rank
    const rankOrder = (x: GNode) =>
      ["head_of_state", "governor", "lieutenant_governor", "administrator"].includes(x.rank ?? "")
        ? 0
        : ["head_of_government", "chief_minister"].includes(x.rank ?? "")
          ? 1
          : ["vice_head_of_state", "deputy_chief_minister", "presiding_officer"].includes(x.rank ?? "")
            ? 2
            : 3;
    const rest = [...loners, ...inSec.filter((n) => n.isPosition && !desired.has(n.id))].sort((p, q) => rankOrder(p) - rankOrder(q) || p.name.localeCompare(q.name));
    const free: GNode[] = [];
    for (const n of rest) {
      const led = [...(n.children ?? []), ...(headsBy.get(n.id) ?? [])].map((c) => desired.get(c)).filter((v): v is number => v != null);
      if (led.length) desired.set(n.id, led.reduce((a, b) => a + b, 0) / led.length);
      else free.push(n);
    }
    // the most senior free seats take the middle of the wedge
    const mid = (A0 + A1) / 2;
    const step = Math.min((A1 - A0) / Math.max(1, free.length), 0.22);
    free.forEach((n, i) => desired.set(n.id, mid + (i % 2 ? -1 : 1) * Math.ceil(i / 2) * step));
  }

  // ── 2. tiers → tracks, per wedge, from the inside out ───────────────────────────────────
  // Every wedge stacks only the tiers it actually has, so a busy executive never pushes the
  // judiciary's tribunals out to a lonely rim.
  const tierOf = (n: GNode) => (desired.has(n.id) ? Math.max(1, Math.min(n.ring || 5, 8)) : 0);
  const sectorRings: Record<string, Record<number, number>> = {};
  const tracks: { tier: number; r: number; sector: Sector }[] = [];
  const teethBy = new Map<Sector, SectorArc["teeth"]>(secs.map((s) => [s.id, []]));

  function mkItem(n: GNode): Item {
    const s = sizeOf(n, isUnion, maxBudget);
    return { id: n.id, n, s, w: s + GAP, h: s, d: desired.get(n.id) ?? 0 };
  }
  const placeBlock = (it: Item, a: number, rStart: number) => {
    const list = it.block!;
    const cols = it.cols!;
    list.forEach((c, i) => {
      const row = Math.floor(i / cols),
        col = i % cols;
      const inRow = Math.min(cols, list.length - row * cols);
      const rr = rStart + row * DOT_STEP;
      const aa = a + ((col - (inRow - 1) / 2) * DOT_STEP) / rr;
      put(c, aa, rr, DOT, "dot", it.id);
    });
  };

  // small bodies: one block per owner
  const byOwner = new Map<string, GNode[]>();
  for (const [c, o] of clusterOwner) (byOwner.get(o) ?? byOwner.set(o, []).get(o)!).push(byId[c]);

  const captionsBy: Record<string, Record<number, number>> = {};
  for (const sec of secs) {
    const sr: Record<number, number> = (sectorRings[sec.id] = {});
    const teeth = teethBy.get(sec.id)!;
    // the executive keeps a wider clear lane between tiers for its ring captions
    const lane = sec.id === "executive" ? 13 : 8;
    const pad = Math.min(0.03, (sec.a1 - sec.a0) * 0.04);
    let r = inner + 10;

    const placeRows = (tier: number, items: Item[], isBlocks = false) => {
      if (!items.length) return;
      const rowH = Math.max(...items.map((i) => i.h)) + (isBlocks ? GAP + 2 : GAP + 3);
      const need = items.reduce((s, i) => s + i.w, 0);
      let rows = 1;
      while (rows < 14) {
        let avail = 0;
        for (let k = 0; k < rows; k++) avail += (sec.a1 - sec.a0 - 2 * pad) * 0.97 * (r + rowH * (k + 0.5));
        if (avail >= need) break;
        rows++;
      }
      const r0 = r + rowH / 2;
      sr[tier] = r0;
      // captions for this tier run in the clear lane just inside its first track
      (captionsBy[sec.id] ??= {})[tier] = r - lane / 2 - 1;
      for (let k = 0; k < rows; k++) tracks.push({ tier, r: r0 + k * rowH, sector: sec.id });
      const sorted = [...items].sort((p, q) => p.d - q.d);
      // fill rows in angular order, each row taking the share its circumference can hold
      const buckets: Item[][] = Array.from({ length: rows }, () => []);
      if (rows === 1) buckets[0] = sorted;
      else sorted.forEach((it, i) => buckets[i % rows].push(it));
      buckets.forEach((row, k) => {
        if (!row.length) return;
        const rr = r0 + k * rowH;
        const pos = pack1D(
          row.map((i) => i.d * rr),
          row.map((i) => i.w),
          (sec.a0 + pad) * rr,
          (sec.a1 - pad) * rr,
        );
        row.forEach((it, j) => {
          const a = pos[j] / rr;
          if (it.block) placeBlock(it, a, rr - it.h / 2 + DOT / 2);
          else put(it.n, a, rr, it.s, it.n.isPosition ? "head" : "node");
          const half = it.w / 2 / rr;
          teeth.push({ a0: a - half, a1: a + half, r: rr + it.h / 2 + 9 });
        });
      });
      r = r0 + (rows - 1) * rowH + rowH / 2 + (isBlocks ? 4 : lane);
    };

    const byTier = new Map<number, GNode[]>();
    for (const n of drawn) {
      if (n.sector !== sec.id || n.cluster) continue;
      const t = tierOf(n);
      if (t) (byTier.get(t) ?? byTier.set(t, []).get(t)!).push(n);
    }
    for (const t of [...byTier.keys()].sort((a, b) => a - b)) {
      const list = byTier.get(t)!;
      if (sec.id === "legislative" && chamber && t === 1) {
        // the bean owns tier 1 of the legislature; anything else on tier 1 goes just outside it
        const lobeIds = new Set(chamber.lobes.map((l) => l.id).concat(chamber.id));
        const T = 30;
        const rb = r + T / 2;
        chamber.r0 = rb - T / 2;
        chamber.r1 = rb + T / 2;
        for (const n of list) if (lobeIds.has(n.id)) put(n, desired.get(n.id)!, rb, 0, "chamber");
        teeth.push({ a0: chamber.a0, a1: chamber.a1, r: rb + T / 2 + 10 });
        sr[1] = rb;
        tracks.push({ tier: 1, r: rb, sector: sec.id });
        r = rb + T / 2 + 9;
        placeRows(1.5, list.filter((n) => !lobeIds.has(n.id)).map(mkItem));
        continue;
      }
      placeRows(t, list.map(mkItem));
    }
    // this wedge's small-body blocks ride its outermost tracks
    const blocks: Item[] = [];
    for (const [o, list] of byOwner) {
      const owner = byId[o];
      const p = placed.get(o);
      if (!owner || !p || owner.sector !== sec.id) continue;
      list.sort((a, b) => a.ring - b.ring || a.name.localeCompare(b.name));
      const rowsIn = Math.min(4, Math.max(1, Math.ceil(list.length / 10)));
      const cols = Math.ceil(list.length / rowsIn);
      blocks.push({ id: `block:${o}`, n: owner, s: DOT, w: cols * DOT_STEP + GAP, h: rowsIn * DOT_STEP, d: p.a, block: list, cols, rowsIn });
    }
    placeRows(9, blocks, true);
  }
  const rings: Record<number, number> = sectorRings.executive ?? {};

  // ── 3. territory outlines + labels ───────────────────────────────────────────────────────
  const sectorArcs: SectorArc[] = secs.map((s) => {
    const def = g.sectors.find((x) => x.id === s.id)!;
    const teeth = teethBy.get(s.id)!;
    const outer = Math.max(inner + 40, ...teeth.map((t) => t.r));
    return { id: s.id, label: def.label, labelHi: def.labelHi, a0: s.a0, a1: s.a1, outer, teeth };
  });

  const ringLabels: WheelLayout["ringLabels"] = [];
  const ex = sectorArcs.find((s) => s.id === "executive");
  const caps = captionsBy.executive ?? {};
  if (ex) for (const rl of g.rings) if (caps[rl.ring] && rl.label) ringLabels.push({ ring: rl.ring, label: rl.label, a: ex.a0 + 0.03, r: caps[rl.ring] });

  let extent = inner;
  for (const s of sectorArcs) extent = Math.max(extent, s.outer);
  for (const p of placed.values()) extent = Math.max(extent, p.r + p.s / 2 + 6);
  const R = extent;
  return { R, seal, inner, rings, tracks, sectorRings, sectors: sectorArcs, nodes: placed, chamber, ringLabels, extent: extent + 30 };
}

/** Outer territory outline for a sector: an arc band whose rim steps with its content. */
export function territoryPath(sec: SectorArc, inner: number, R: number): string {
  const bins = 90;
  const span = sec.a1 - sec.a0;
  const radii = new Array(bins).fill(0);
  for (const t of sec.teeth) {
    const i0 = Math.max(0, Math.floor(((t.a0 - sec.a0) / span) * bins));
    const i1 = Math.min(bins - 1, Math.ceil(((t.a1 - sec.a0) / span) * bins));
    for (let i = i0; i <= i1; i++) radii[i] = Math.max(radii[i], t.r);
  }
  const peak = Math.max(...radii);
  // a sparse wedge gets a calm, even rim; a busy one steps with its content
  const base = sec.teeth.length < 10 ? peak : Math.max(inner + R * 0.2, peak * 0.62);
  for (let i = 0; i < bins; i++) radii[i] = Math.max(radii[i], base);
  const q = Math.max(10, R * 0.03);
  const sm = radii.map((_, i) => Math.max(...radii.slice(Math.max(0, i - 2), Math.min(bins, i + 3))));
  const stepR = sm.map((x) => Math.ceil(x / q) * q);
  const pts: string[] = [];
  const pt = (a: number, rr: number) => `${(rr * Math.cos(a)).toFixed(2)},${(rr * Math.sin(a)).toFixed(2)}`;
  let prevR = stepR[0];
  pts.push(`M${pt(sec.a0, inner)}`, `L${pt(sec.a0, prevR)}`);
  for (let i = 0; i < bins; i++) {
    const a = sec.a0 + ((i + 1) / bins) * span;
    const rr = stepR[i];
    if (rr !== prevR) {
      pts.push(`L${pt(sec.a0 + (i / bins) * span, rr)}`);
      prevR = rr;
    }
    pts.push(`A${rr.toFixed(2)},${rr.toFixed(2)} 0 0 1 ${pt(a, rr)}`);
  }
  pts.push(`L${pt(sec.a1, inner)}`);
  pts.push(`A${inner.toFixed(2)},${inner.toFixed(2)} 0 0 0 ${pt(sec.a0, inner)}`, "Z");
  return pts.join(" ");
}

export function arcPath(r: number, a0: number, a1: number): string {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${r * Math.cos(a0)},${r * Math.sin(a0)} A${r},${r} 0 ${large} 1 ${r * Math.cos(a1)},${r * Math.sin(a1)}`;
}

export function bandPath(r0: number, r1: number, a0: number, a1: number): string {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const p = (a: number, r: number) => `${r * Math.cos(a)},${r * Math.sin(a)}`;
  return `M${p(a0, r1)} A${r1},${r1} 0 ${large} 1 ${p(a1, r1)} L${p(a1, r0)} A${r0},${r0} 0 ${large} 0 ${p(a0, r0)} Z`;
}
