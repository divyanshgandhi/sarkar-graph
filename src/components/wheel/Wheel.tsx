"use client";

import { animate, motion } from "motion/react";
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { SECTOR_INK, SECTOR_WASH, chamberInk, shortLabel, type Hop } from "@/lib/graph";
import { arcPath, bandPath, layoutWheel, territoryPath, type PlacedNode, type WheelLayout } from "@/lib/layout";
import type { GNode, GovGraph, RelType } from "@/lib/types";
import { Chakra, Glyph, type SeatState } from "./Glyph";

const DEG = 180 / Math.PI;

export function seatState(n: GNode): SeatState {
  if (n.isPosition && (n.vacant || !n.holder)) return "vacant";
  if (n.holder?.acting) return "acting";
  if (n.confidence === "low") return "unverified";
  return "filled";
}

interface WheelProps {
  g: GovGraph;
  selected: string | null;
  hover: string | null;
  chain: Hop[];
  lit: Set<string> | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  onLayout?: (l: WheelLayout) => void;
  compact?: boolean;
  hidden?: Set<string>; // mark shapes faded from the legend
}

export function nodeInk(n: GNode) {
  if (n.kind === "chamber" || n.kind === "state_chamber") return chamberInk(n.id);
  return SECTOR_INK[n.sector];
}
export function nodeWash(n: GNode) {
  if (n.kind === "chamber" || n.kind === "state_chamber") return /rajya|council/.test(n.id) ? "var(--maroon-wash)" : "var(--green-wash)";
  return SECTOR_WASH[n.sector];
}

// ── static layers (memoised: only change with layout/graph) ─────────────────
export const Territories = memo(function Territories({ L }: { L: WheelLayout }) {
  return (
    <g aria-hidden>
      {L.sectors.map((s) => (
        <path
          key={s.id}
          d={territoryPath(s, L.inner, L.R)}
          fill={SECTOR_WASH[s.id]}
          stroke={SECTOR_INK[s.id]}
          strokeOpacity={0.16}
          strokeWidth={1}
          strokeLinejoin="round"
        />
      ))}
      {/* graticule: 24 faint spokes, the chakra's */}
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i * Math.PI * 2) / 24 - Math.PI / 2;
        return (
          <line
            key={i}
            x1={L.inner * Math.cos(a)}
            y1={L.inner * Math.sin(a)}
            x2={L.R * 1.02 * Math.cos(a)}
            y2={L.R * 1.02 * Math.sin(a)}
            stroke="var(--ink-3)"
            strokeOpacity={0.05}
            strokeWidth={1}
          />
        );
      })}
      {/* tier guides: one dotted arc per tier, through its first track */}
      {L.sectors.map((s) =>
        Object.entries(L.sectorRings[s.id] ?? {})
          .filter(([k]) => +k > 0 && +k <= 8)
          .map(([k, r]) => (
            <path
              key={`${s.id}-${k}`}
              d={arcPath(r, s.a0 + 0.02, s.a1 - 0.02)}
              fill="none"
              stroke={SECTOR_INK[s.id]}
              strokeOpacity={0.2}
              strokeWidth={1}
              strokeDasharray="1 4"
              strokeLinecap="round"
            />
          )),
      )}
      {/* the Cabinet band: spans every track the ministers sit on */}
      {(() => {
        const t4 = L.tracks.filter((t) => t.tier === 4 && t.sector === "executive").map((t) => t.r);
        const ex = L.sectors.find((s) => s.id === "executive");
        if (!t4.length || !ex) return null;
        return (
          <path
            d={bandPath(Math.min(...t4) - 10, Math.max(...t4) + 10, ex.a0 + 0.012, ex.a1 - 0.012)}
            fill={SECTOR_INK.executive}
            fillOpacity={0.07}
          />
        );
      })()}
    </g>
  );
});

export const ChamberBean = memo(function ChamberBean({ L, g }: { L: WheelLayout; g: GovGraph }) {
  if (!L.chamber) return null;
  const c = L.chamber;
  const rm = (c.r0 + c.r1) / 2;
  const T = c.r1 - c.r0;
  const gap = 0.012;
  return (
    <g>
      {c.lobes.map((l) => {
        const n = g.nodes[l.id];
        const ink = chamberInk(l.id);
        const d = arcPath(rm, l.a0 + gap + T / 2 / rm, l.a1 - gap - T / 2 / rm);
        return (
          <g key={l.id} data-id={l.id} className="wheel-node">
            <path d={d} fill="none" stroke={ink} strokeWidth={T} strokeLinecap="round" />
            <path d={d} fill="none" stroke={n?.kind ? nodeWash(n) : "var(--card)"} strokeWidth={T - 3} strokeLinecap="round" />
            {/* seat texture: a hemicycle of dots, one per ~12 seats */}
            <SeatDots n={n} a0={l.a0 + gap} a1={l.a1 - gap} r0={c.r0 + 5} r1={c.r1 - 5} ink={ink} />
          </g>
        );
      })}
    </g>
  );
});

function SeatDots({ n, a0, a1, r0, r1, ink }: { n?: GNode; a0: number; a1: number; r0: number; r1: number; ink: string }) {
  const seats = n?.seats ?? n?.members?.length ?? 0;
  if (!seats) return null;
  const dots = Math.min(64, Math.max(8, Math.round(seats / 9)));
  const rows = 3;
  const perRow = Math.ceil(dots / rows);
  const out: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    const rr = r0 + ((r + 0.5) * (r1 - r0)) / rows;
    const pad = (r1 - r0) / rr;
    for (let i = 0; i < perRow; i++) {
      const a = a0 + pad + ((i + 0.5) * (a1 - a0 - 2 * pad)) / perRow;
      out.push(<circle key={`${r}-${i}`} cx={rr * Math.cos(a)} cy={rr * Math.sin(a)} r={1.35} fill={ink} opacity={0.55} />);
    }
  }
  return <g aria-hidden>{out}</g>;
}

export const Nodes = memo(function Nodes({ L, g }: { L: WheelLayout; g: GovGraph }) {
  const list = useMemo(() => [...L.nodes.values()].filter((p) => p.kind !== "seal" && p.kind !== "chamber"), [L]);
  return (
    <g>
      {list.map((p) => {
        const n = g.nodes[p.id];
        if (!n) return null;
        const dot = p.kind === "dot";
        return (
          <g
            key={p.id}
            data-id={p.id}
            data-dot={dot ? "" : undefined}
            data-shape={dot ? "dot" : n.shape}
            className="wheel-node"
            transform={`translate(${p.x.toFixed(2)},${p.y.toFixed(2)})`}
          >
            {/* hit target: never larger than the mark's own clear space */}
            <circle r={dot ? 2.6 : p.s / 2 + 2} fill="transparent" />
            {/* marks stay upright while the wheel turns (counter-rotated by --wr) */}
            <g className={dot ? undefined : "upright"}>
              <Glyph
                shape={dot ? "dot" : n.shape}
                s={p.s}
                ink={nodeInk(n)}
                wash={nodeWash(n)}
                state={seatState(n)}
                strong={n.rank === "head_of_state" || n.rank === "head_of_government" || n.rank === "chief_minister"}
              />
            </g>
          </g>
        );
      })}
    </g>
  );
});

// ── edges ───────────────────────────────────────────────────────────────────
export function curve(a: PlacedNode, b: PlacedNode) {
  const mx = (a.x + b.x) / 2,
    my = (a.y + b.y) / 2;
  // bend towards the centre, more when the two ends are far apart in angle
  let da = Math.abs(a.a - b.a) % (Math.PI * 2);
  if (da > Math.PI) da = Math.PI * 2 - da;
  const k = a.r === 0 || b.r === 0 ? 1 : 1 - Math.min(0.55, da * 0.32);
  const cx = mx * k,
    cy = my * k;
  return { d: `M${a.x},${a.y} Q${cx},${cy} ${b.x},${b.y}`, cx, cy };
}
export function pointAt(a: PlacedNode, b: PlacedNode, c: { cx: number; cy: number }, t: number) {
  const x = (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.cx + t * t * b.x;
  const y = (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.cy + t * t * b.y;
  const dx = 2 * (1 - t) * (c.cx - a.x) + 2 * t * (b.x - c.cx);
  const dy = 2 * (1 - t) * (c.cy - a.y) + 2 * t * (b.y - c.cy);
  return { x, y, ang: Math.atan2(dy, dx) * DEG };
}

export const MARK: Partial<Record<RelType | "parent", { d: string; fill: boolean }>> = {
  elects: { d: "M-4,-3 L-1,0 L-4,3 Z M0,-3 L3,0 L0,3 Z", fill: true },
  indirectly_elects: { d: "M-4,-3 L-1,0 L-4,3 M0,-3 L3,0 L0,3", fill: false },
  appoints: { d: "M-3,-3.2 L3.2,0 L-3,3.2 Z", fill: true },
  advises_appointment: { d: "M-3,-3.2 L3.2,0 L-3,3.2 Z", fill: false },
  nominates: { d: "M-3,-3 L3,0 L-3,3", fill: false },
  administers: { d: "M-4,-3 L-2,0 L-4,3 M-0.5,-3 L1.5,0 L-0.5,3", fill: false },
  oversees: { d: "M-4,-3 L-2,0 L-4,3 M-0.5,-3 L1.5,0 L-0.5,3", fill: false },
  accountable_to: { d: "M-3,-3.2 L3.2,0 L-3,3.2 Z", fill: false },
};

function EdgePath({ a, b, type, i, strong, ink }: { a: PlacedNode; b: PlacedNode; type: RelType | "parent"; i: number; strong?: boolean; ink: string }) {
  const c = curve(a, b);
  const m = pointAt(a, b, c, 0.56);
  const mark = MARK[type];
  const dash = type === "heads" || type === "parent" ? "4 2.5" : type === "ex_officio" || type === "member_of" ? "1.5 3" : undefined;
  return (
    <g>
      <motion.path
        d={c.d}
        fill="none"
        stroke={ink}
        strokeWidth={strong ? 1.75 : 1}
        strokeOpacity={strong ? 0.95 : 0.5}
        strokeDasharray={dash}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ pathLength: { duration: 0.42, delay: 0.25 + i * 0.11, ease: [0.16, 1, 0.3, 1] }, opacity: { duration: 0.12, delay: 0.25 + i * 0.11 } }}
      />
      {mark && (
        <motion.path
          d={mark.d}
          transform={`translate(${m.x},${m.y}) rotate(${m.ang})`}
          fill={mark.fill ? ink : "var(--card)"}
          stroke={ink}
          strokeWidth={1.1}
          strokeLinejoin="round"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.55 + i * 0.11 }}
        />
      )}
    </g>
  );
}

// ── the wheel ───────────────────────────────────────────────────────────────
export function Wheel({ g, selected, hover, chain, lit, onSelect, onHover, onLayout, compact, hidden }: WheelProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const rotRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<SVGGElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const rot = useRef(0);
  const [rotTarget, setRotTarget] = useState(0);
  const [turning, setTurning] = useState(false);
  const zoom = useRef({ k: 1, x: 0, y: 0 });
  const [hoverBox, setHoverBox] = useState<{ x: number; y: number; id: string } | null>(null);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      setSize((s) => (s && Math.abs(s.w - width) < 2 && Math.abs(s.h - height) < 2 ? s : { w: width, h: height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // one fixed-scale layout per government; the finished map is scaled to fit the frame
  const L = useMemo(() => layoutWheel(g), [g]);
  const chromeY = size && size.w < 640 ? 64 : 104; // search bar above, legend + view switch below
  const base = size ? Math.max(0.2, Math.min(size.w / 2 - (compact ? 8 : 16), (size.h - chromeY) / 2) / L.extent) : 1;
  const baseRef = useRef(base);
  baseRef.current = base;
  useEffect(() => {
    onLayout?.(L);
  }, [L, onLayout]);

  // turn the wheel so the selected seat rests at 6 o'clock
  useEffect(() => {
    if (!L) return;
    const p = selected ? L.nodes.get(selected) : null;
    let target = 0;
    if (p && p.r > 0) {
      target = 90 - p.a * DEG;
      let delta = ((target - rot.current) % 360) + 360;
      delta = delta % 360;
      if (delta > 180) delta -= 360;
      target = rot.current + delta;
    } else if (!selected) {
      target = Math.round(rot.current / 360) * 360;
    } else return;
    setRotTarget(target);
    if (Math.abs(target - rot.current) < 0.01) return;
    // reduced motion, or the first paint of a deep link: arrive already turned
    const instant = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || !rotRef.current;
    const turnTo = (v: number) => {
      rot.current = v;
      const el = rotRef.current;
      if (!el) return;
      el.setAttribute("transform", `rotate(${v.toFixed(3)})`);
      el.style.setProperty("--wr", v.toFixed(3));
    };
    if (instant) {
      turnTo(target);
      setTurning(false);
      return;
    }
    setTurning(true);
    const controls = animate(rot.current, target, {
      type: "spring",
      stiffness: 58,
      damping: 17,
      mass: 1,
      restDelta: 0.08,
      restSpeed: 0.6,
      onUpdate: turnTo,
      onComplete: () => setTurning(false),
    });
    return () => controls.stop();
  }, [selected, L]);

  // pan + zoom (pinch / ctrl-wheel / drag once zoomed)
  const applyZoom = useCallback(() => {
    const z = zoom.current;
    zoomRef.current?.setAttribute("transform", `translate(${z.x},${z.y}) scale(${z.k * baseRef.current})`);
  }, []);
  const zoomAt = useCallback(
    (k: number, px = 0, py = 0) => {
      const z = zoom.current;
      k = Math.min(5, Math.max(1, k));
      z.x = px - ((px - z.x) * k) / z.k;
      z.y = py - ((py - z.y) * k) / z.k;
      z.k = k;
      if (k === 1) {
        z.x = 0;
        z.y = 0;
      }
      applyZoom();
    },
    [applyZoom],
  );
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomAt(zoom.current.k * Math.exp(-e.deltaY * 0.01), e.clientX - rect.left - rect.width / 2, e.clientY - rect.top - rect.height / 2);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);
  // two-finger pinch on touch screens
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; k: number } | null>(null);
  const drag = useRef<{ x: number; y: number; zx: number; zy: number; moved: boolean } | null>(null);

  const idFromEvent = (e: React.PointerEvent | React.MouseEvent) => {
    const t = (e.target as Element).closest?.("[data-id]");
    return t?.getAttribute("data-id") ?? null;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === "touch" && touches.current.has(e.pointerId)) {
      touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.current.size === 2) {
        const [a, b] = [...touches.current.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (!pinch.current) pinch.current = { d, k: zoom.current.k };
        const rect = wrapRef.current!.getBoundingClientRect();
        zoomAt(pinch.current.k * (d / pinch.current.d), (a.x + b.x) / 2 - rect.left - rect.width / 2, (a.y + b.y) / 2 - rect.top - rect.height / 2);
        if (drag.current) drag.current.moved = true;
        return;
      }
    }
    if (drag.current && zoom.current.k > 1) {
      const d = drag.current;
      const dx = e.clientX - d.x,
        dy = e.clientY - d.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
      zoom.current.x = d.zx + dx;
      zoom.current.y = d.zy + dy;
      applyZoom();
      return;
    }
    if (e.pointerType === "touch") return;
    const id = idFromEvent(e);
    if (id !== hover) onHover(id);
    if (id) {
      const el = (e.target as Element).closest("[data-id]") as SVGGraphicsElement | null;
      const wrap = wrapRef.current?.getBoundingClientRect();
      const b = el?.getBoundingClientRect();
      if (b && wrap) setHoverBox({ id, x: b.left + b.width / 2 - wrap.left, y: b.top - wrap.top });
    } else setHoverBox(null);
  };

  const litStyle = useMemo(() => {
    // layers faded from the legend
    const layers = hidden?.size ? `${[...hidden].map((s) => `.wheel-node[data-shape="${CSS.escape(s)}"]`).join(",")}{opacity:.07!important;pointer-events:none}` : "";
    if (!lit || !lit.size) return layers;
    const ids = [...lit].map((id) => CSS.escape(id));
    const sel = ids.map((id) => `.wheel-dim [data-id="${id}"]`).join(",");
    // the selected body's small sub-bodies swell so they can be seen and picked
    const dots = ids.map((id) => `.wheel-dim [data-dot][data-id="${id}"] rect`).join(",");
    return `.wheel-dim .wheel-node{opacity:.2}${sel}{opacity:1}${dots}{transform:scale(1.9);transform-box:fill-box;transform-origin:center;transition:transform 260ms var(--ease-out);opacity:1}${layers}`;
  }, [lit, hidden]);

  const selP = L && selected ? L.nodes.get(selected) : null;
  const selNode = selected ? g.nodes[selected] : null;
  const hoverNode = hoverBox && hoverBox.id !== selected ? g.nodes[hoverBox.id] : null;

  // hovering (with nothing selected) sketches a seat's direct formal links
  const edgesByNode = useMemo(() => {
    const m = new Map<string, { from: string; to: string; type: RelType }[]>();
    for (const e of g.edges) {
      if (e.type === "heads" || e.type === "member_of") continue;
      (m.get(e.from) ?? m.set(e.from, []).get(e.from)!).push(e);
      (m.get(e.to) ?? m.set(e.to, []).get(e.to)!).push(e);
    }
    return m;
  }, [g]);
  const hoverLinks = !selected && hover && hover !== g.root ? (edgesByNode.get(hover) ?? []).slice(0, 40) : [];

  // first sight of a government: the map is surveyed outward from the People
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // sector labels, oriented to read upright at the resting rotation
  const labelArcs = useMemo(() => {
    if (!L) return [];
    // a name that cannot fit inside its own wedge's arc is left off (its landmark still names it)
    return L.sectors.flatMap((s) => {
      // just outside this wedge's own rim
      const r = s.outer + 20; // clears the rim's stepped teeth
      const mid = (s.a0 + s.a1) / 2;
      const screen = ((((mid * DEG + rotTarget) % 360) + 360) % 360) / DEG;
      const bottom = screen > 0.1 && screen < Math.PI - 0.1;
      const need = (s.label.length * 8.6) / (r + 4);
      if (need > (s.a1 - s.a0) * 0.96) return [];
      const span = Math.min(s.a1 - s.a0, need + 0.3);
      const a0 = mid - span / 2,
        a1 = mid + span / 2;
      const d = bottom
        ? `M${(r + 8) * Math.cos(a1)},${(r + 8) * Math.sin(a1)} A${r + 8},${r + 8} 0 0 0 ${(r + 8) * Math.cos(a0)},${(r + 8) * Math.sin(a0)}`
        : arcPath(r, a0, a1);
      return [{ id: s.id, d, label: s.label }];
    });
  }, [L, rotTarget]);

  // ring captions along the executive wedge's leading edge ("Cabinet", "Ministries", …)
  const ringArcs = useMemo(() => {
    if (!L) return [];
    const ex = L.sectors.find((s) => s.id === "executive");
    if (!ex) return [];
    return L.ringLabels.map((rl) => {
      // rl.r is the clear lane the layout left for this tier's caption
      const r = rl.r;
      const span = (rl.label.length * 6.4) / r;
      const a0 = ex.a0 + 0.035,
        a1 = a0 + span;
      const screen = (((((a0 + a1) / 2) * DEG + rotTarget) % 360) + 360) % 360;
      const bottom = screen > 8 && screen < 172;
      const d = bottom
        ? `M${r * Math.cos(a1)},${r * Math.sin(a1)} A${r},${r} 0 0 0 ${r * Math.cos(a0)},${r * Math.sin(a0)}`
        : arcPath(r, a0, a1);
      return { id: `ring-${rl.ring}`, d, label: rl.label };
    });
  }, [L, rotTarget]);

  const isState = g.kind !== "union";
  const rootNode = g.nodes[g.root];

  // a handful of landmarks stay named, so a first-time visitor can orient before hovering
  const anchors = useMemo(() => {
    const ANCHOR_RANKS = ["head_of_state", "head_of_government", "governor", "lieutenant_governor", "administrator", "chief_minister"];
    const list: { id: string; label: string; x: number; y: number; below: number }[] = [];
    for (const n of Object.values(g.nodes)) {
      const p = L.nodes.get(n.id);
      if (!p) continue;
      // the bean gets one name: the legislature itself (or its only house)
      const bean = L.chamber && n.id === L.chamber.id;
      const isAnchor =
        ANCHOR_RANKS.includes(n.rank ?? "") ||
        n.id === "in-supreme-court" ||
        bean ||
        (isState && n.kind === "court" && p.r < L.rings[2]);
      if (!isAnchor) continue;
      const label = bean
        ? isState
          ? (L.chamber?.lobes.length ?? 1) > 1
            ? "Legislature"
            : "Assembly"
          : "Parliament"
        : n.isPosition
          ? (n.title ?? n.name).replace(/ of India$/, "").replace(/ of [A-Z][a-z].*$/, "")
          : n.name.replace(/ of India$/, "");
      list.push({ id: n.id, label, x: p.x, y: p.y, below: p.kind === "chamber" ? 18 : p.s / 2 + 10 });
    }
    // Give each name a spot that touches no mark and no other name: try below, above, right,
    // left of the mark (in screen space, since names are drawn upright), then step further out.
    const th = (rotTarget * Math.PI) / 180;
    const toScreen = (x: number, y: number) => [x * Math.cos(th) - y * Math.sin(th), x * Math.sin(th) + y * Math.cos(th)] as const;
    const fromScreen = (x: number, y: number) => [x * Math.cos(-th) - y * Math.sin(-th), x * Math.sin(-th) + y * Math.cos(-th)] as const;
    const marks = [...L.nodes.values()].filter((p) => p.kind !== "seal").map((p) => {
      const [x, y] = toScreen(p.x, p.y);
      return { x, y, r: p.kind === "chamber" && L.chamber ? (L.chamber.r1 - L.chamber.r0) / 2 : p.s / 2 + 1 };
    });
    const sealR = L.seal + 30;
    const taken: { x: number; y: number; w: number; h: number }[] = [];
    const H = 11;
    const clear = (cx: number, cy: number, w: number) => {
      if (Math.hypot(cx, cy) < sealR + 6) return false;
      for (const m of marks) if (Math.abs(m.x - cx) < w / 2 + m.r && Math.abs(m.y - cy) < H / 2 + m.r) return false;
      for (const t of taken) if (Math.abs(t.x - cx) < (t.w + w) / 2 + 2 && Math.abs(t.y - cy) < (t.h + H) / 2) return false;
      return true;
    };
    return list.map((a) => {
      const [mx, my] = toScreen(a.x, a.y);
      const w = a.label.length * 5.4 + 8;
      const gap = a.below;
      let best: [number, number] | null = null;
      for (let step = 0; step < 5 && !best; step++) {
        const e = step * 9;
        const cands: [number, number][] = [
          [mx, my + gap + e + H / 2],
          [mx, my - gap - e - H / 2],
          [mx + gap + e + w / 2, my],
          [mx - gap - e - w / 2, my],
        ];
        best = cands.find(([cx, cy]) => clear(cx, cy, w)) ?? null;
      }
      const [cx, cy] = best ?? [mx, my + gap + H / 2];
      taken.push({ x: cx, y: cy, w, h: H });
      const [px, py] = fromScreen(cx, cy);
      return { ...a, x: px, y: py, below: 0 };
    });
  }, [g, L, isState, rotTarget]);

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full select-none touch-pan-y"
      onPointerLeave={() => {
        onHover(null);
        setHoverBox(null);
      }}
    >
      {L && size && (
        <svg
          className={`absolute inset-0 h-full w-full ${lit ? "wheel-dim" : ""}`}
          viewBox={`${-size.w / 2} ${-size.h / 2} ${size.w} ${size.h}`}
          role="img"
          aria-label={`Map of the ${isState ? `government of ${g.name}` : "Government of India"}. Use search or the list to explore.`}
          onPointerDown={(e) => {
            if (e.pointerType === "touch") touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            drag.current = { x: e.clientX, y: e.clientY, zx: zoom.current.x, zy: zoom.current.y, moved: false };
          }}
          onPointerUp={(e) => {
            touches.current.delete(e.pointerId);
            if (touches.current.size < 2) pinch.current = null;
            setTimeout(() => (drag.current = null), 0);
          }}
          onPointerCancel={(e) => {
            touches.current.delete(e.pointerId);
            pinch.current = null;
          }}
          onPointerMove={onPointerMove}
          onClick={(e) => {
            if (drag.current?.moved) return;
            const id = idFromEvent(e);
            if (id === g.root) onSelect(null);
            else onSelect(id);
          }}
        >
          <style>{litStyle}</style>
          <defs>
            {[...labelArcs, ...ringArcs].map((l) => (
              <path key={l.id} id={`arc-${g.gov}-${l.id}`} d={l.d} />
            ))}
            <path id={`seal-top-${g.gov}`} d={arcPath(L.seal + 11, Math.PI * 1.02, Math.PI * 1.98)} />
            <path
              id={`seal-bot-${g.gov}`}
              d={`M${(L.seal + 19) * Math.cos(Math.PI * 0.85)},${(L.seal + 19) * Math.sin(Math.PI * 0.85)} A${L.seal + 19},${L.seal + 19} 0 0 0 ${(L.seal + 19) * Math.cos(Math.PI * 0.15)},${(L.seal + 19) * Math.sin(Math.PI * 0.15)}`}
            />
            <clipPath id={`survey-${g.gov}`}>
              <motion.circle
                key={g.gov}
                initial={{ r: reduce ? L.extent + 40 : L.seal }}
                animate={{ r: L.extent + 40 }}
                transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
              />
            </clipPath>
          </defs>
          <g ref={zoomRef} transform={`translate(${zoom.current.x},${zoom.current.y}) scale(${zoom.current.k * base})`}>
            <g
              ref={rotRef}
              transform={`rotate(${rot.current})`}
              clipPath={`url(#survey-${g.gov})`}
              style={{ ["--wr" as string]: rot.current.toFixed(3) } as React.CSSProperties}
            >
              <Territories L={L} />
              <ChamberBean L={L} g={g} />
              {/* hover: direct links, faint */}
              {hoverLinks.map((e) => {
                const a = L.nodes.get(e.from),
                  b = L.nodes.get(e.to);
                if (!a || !b) return null;
                const c = curve(a, b);
                return <path key={`${e.from}-${e.to}-${e.type}`} d={c.d} fill="none" stroke="var(--ink-2)" strokeOpacity={0.42} strokeWidth={1} strokeDasharray={e.type === "oversees" || e.type === "administers" ? "3 2.5" : undefined} style={{ pointerEvents: "none" }} />;
              })}
              {/* chain of authority */}
              <g key={selected ?? "none"}>
                {chain.map((h, i) => {
                  const at = (id: string) => L.nodes.get(id) ?? (g.nodes[id]?.headOf ? L.nodes.get(g.nodes[id].headOf!) : undefined);
                  const a = at(h.from),
                    b = at(h.to);
                  if (a && b && a.id === b.id) return null;
                  if (!a || !b) return null;
                  return <EdgePath key={`${h.from}-${h.to}`} a={a} b={b} type={h.type} i={i} strong ink="var(--saffron)" />;
                })}
              </g>
              <Nodes L={L} g={g} />
              {/* the People */}
              <g data-id={g.root} className="wheel-node" style={{ cursor: selected ? "pointer" : "default" }}>
                <circle r={L.seal + 26} fill="var(--paper)" />
                <circle r={L.seal + 26} fill="var(--saffron-wash)" opacity={0.55} />
                <circle r={L.seal + 26} fill="none" stroke="var(--saffron)" strokeOpacity={0.5} strokeWidth={1} />
                <Chakra r={L.seal * 0.72} ink="var(--navy)" />
              </g>
            </g>
            {/* upright furniture: sector names + the People's legend */}
            <g
              style={{ opacity: turning ? 0 : 1, transition: "opacity 220ms var(--ease-std)" }}
              transform={`rotate(${rotTarget})`}
              aria-hidden
            >
              {labelArcs.map((l) => (
                <text key={l.id} className="wheel-arc-label" fill={SECTOR_INK[l.id as keyof typeof SECTOR_INK]}>
                  <textPath href={`#arc-${g.gov}-${l.id}`} startOffset="50%" textAnchor="middle">
                    {l.label}
                  </textPath>
                </text>
              ))}
              {ringArcs.map((l) => (
                <text key={l.id} className="wheel-ring-label" fill="var(--navy-ink)" fillOpacity={0.62}>
                  <textPath href={`#arc-${g.gov}-${l.id}`} startOffset="50%" textAnchor="middle">
                    {l.label}
                  </textPath>
                </text>
              ))}
            </g>
            {/* landmark names: positioned in the wheel's frame, drawn upright */}
            <g
              aria-hidden
              style={{ pointerEvents: "none", opacity: turning || selected ? 0 : 1, transition: "opacity 220ms var(--ease-std)" }}
              transform={`rotate(${rotTarget})`}
            >
              {anchors.map((a) => (
                <g key={a.id} transform={`translate(${a.x},${a.y}) rotate(${-rotTarget}) translate(0 ${a.below})`}>
                  <text textAnchor="middle" dy="0.35em" className="wheel-anchor" stroke="var(--paper)" strokeWidth={3} strokeLinejoin="round" paintOrder="stroke">
                    {a.label}
                  </text>
                </g>
              ))}
            </g>
            <g aria-hidden style={{ pointerEvents: "none" }}>
              <text className="wheel-arc-label" fill="var(--saffron-ink)" style={{ fontSize: 9.5, letterSpacing: "0.24em" }}>
                <textPath href={`#seal-top-${g.gov}`} startOffset="50%" textAnchor="middle">
                  {rootNode?.name ?? "People of India"}
                </textPath>
              </text>
              {rootNode?.nameHi && (
                <text className="deva" fill="var(--saffron-ink)" style={{ fontSize: 11, fontWeight: 600 }}>
                  <textPath href={`#seal-bot-${g.gov}`} startOffset="50%" textAnchor="middle">
                    {rootNode.nameHi}
                  </textPath>
                </text>
              )}
            </g>
            {/* selected seat's name, resting at 6 o'clock */}
            {selP && selNode && !turning && (
              <g transform={`translate(0 ${selP.r + (selP.kind === "chamber" ? (L.chamber ? (L.chamber.r1 - L.chamber.r0) / 2 : 12) : selP.s / 2) + 6}) scale(${1 / Math.max(0.35, base)})`}>
                <SelectedPill y={12} label={shortLabel(selNode)} />
              </g>
            )}
          </g>
        </svg>
      )}
      {!size && <WheelSkeleton />}
      {size && (
        <div className="absolute right-3 top-1/2 hidden -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-card shadow-card md:flex">
          <button onClick={() => zoomAt(zoom.current.k * 1.4)} className="grid h-9 w-9 place-items-center text-ink-3 hover:bg-card-2 hover:text-ink-1" aria-label="Zoom in">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <button onClick={() => zoomAt(zoom.current.k / 1.4)} className="grid h-9 w-9 place-items-center border-t border-rule text-ink-3 hover:bg-card-2 hover:text-ink-1" aria-label="Zoom out">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M5 12h14" />
            </svg>
          </button>
        </div>
      )}
      {hoverNode && hoverBox && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md bg-ink-1 px-2 py-1 text-card shadow-pop"
          style={{ left: hoverBox.x, top: hoverBox.y - 6 }}
        >
          <div className="t-meta whitespace-nowrap">{hoverNode.name}</div>
          {hoverNode.holder?.name && <div className="whitespace-nowrap text-[11.5px] opacity-70">{hoverNode.holder.name}</div>}
        </div>
      )}
    </div>
  );
}

function SelectedPill({ y, label }: { y: number; label: string }) {
  const w = Math.min(300, label.length * 6.1 + 18);
  return (
    <motion.g initial={{ opacity: 0, y: y - 4 }} animate={{ opacity: 1, y }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} style={{ pointerEvents: "none" }}>
      <rect x={-w / 2} y={-10} width={w} height={20} rx={10} fill="var(--ink-1)" />
      <text textAnchor="middle" dy="0.34em" fill="var(--card)" style={{ fontSize: 11.5, fontWeight: 560 }}>
        {label.length > 48 ? label.slice(0, 46) + "…" : label}
      </text>
    </motion.g>
  );
}

function WheelSkeleton() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="aspect-square w-[min(80%,80vh)] animate-pulse rounded-full border border-rule" />
    </div>
  );
}
