"use client";

// A frame-exact rendering of the real wheel for press assets (README banner, launch film).
// Everything here is a pure function of its props — no springs, no timers — so a capture
// script can seek to any instant and get the same pixels every time. It reuses the product's
// own layers (territories, chamber, glyphs) so the film shows the map exactly as it ships.
import { useLayoutEffect, useMemo, useRef } from "react";
import { Chakra } from "@/components/wheel/Glyph";
import { ChamberBean, MARK, Nodes, Territories, curve, pointAt } from "@/components/wheel/Wheel";
import { SECTOR_INK, type Hop } from "@/lib/graph";
import { arcPath, type WheelLayout } from "@/lib/layout";
import type { GovGraph } from "@/lib/types";

const DEG = 180 / Math.PI;
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** progress of t through [a, b], 0..1 */
export const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const easeOut = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
export const easeInOut = (x: number) => (x < 0.5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2);

/** The product's wheel spring (stiffness 58, damping 17, mass 1), integrated so any frame can be sought. */
export function springAt(from: number, to: number, elapsed: number) {
  if (elapsed <= 0) return from;
  let x = from,
    v = 0;
  const dt = 1 / 480;
  for (let s = 0; s < elapsed; s += dt) {
    const a = -58 * (x - to) - 17 * v;
    v += a * dt;
    x += v * dt;
  }
  return x;
}

/** Rotation that brings `id` to 6 o'clock, taking the short way round from `from`. */
export function restAngle(L: WheelLayout, id: string, from: number) {
  const p = L.nodes.get(id);
  if (!p || p.r === 0) return from;
  let target = 90 - p.a * DEG;
  let d = (((target - from) % 360) + 360) % 360;
  if (d > 180) d -= 360;
  return from + d;
}

export interface StageProps {
  g: GovGraph;
  L: WheelLayout & { extent: number };
  uid: string;
  rot?: number; // degrees
  reveal?: number; // 0..1, the survey circle growing from the seal
  count?: number; // 0..1, marks counted in from the centre outward
  chain?: Hop[];
  chainT?: number; // hops drawn so far (fractional)
  dim?: number; // 0..1, everything off the chain recedes
  labels?: number; // 0..1, sector names
  seal?: number; // 0..1, the People's legend around the seal
  spin?: number; // chakra spin, degrees
  chainWidth?: number;
}

export function WheelStage({ g, L, uid, rot = 0, reveal = 1, count = 1, chain = [], chainT = 0, dim = 0, labels = 1, seal = 1, spin = 0, chainWidth = 2.2 }: StageProps) {
  const ref = useRef<SVGGElement>(null);

  // counting order: inner rings first, with a deterministic angular ripple inside each ring
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const max = L.extent;
    el.querySelectorAll<SVGGElement>(".wheel-node[data-id]").forEach((node) => {
      const id = node.getAttribute("data-id")!;
      const p = L.nodes.get(id);
      if (!p || id === g.root) return;
      const ripple = ((p.a * DEG + 360) % 360) / 360;
      node.style.setProperty("--i", ((p.r / max) * 0.8 + ripple * 0.14).toFixed(4));
    });
  }, [L, g.root]);

  const at = (id: string) => L.nodes.get(id) ?? (g.nodes[id]?.headOf ? L.nodes.get(g.nodes[id].headOf!) : undefined);
  const lit = useMemo(() => {
    const s = new Set<string>([g.root]);
    for (const h of chain) {
      const a = at(h.from),
        b = at(h.to);
      if (a) s.add(a.id);
      if (b) s.add(b.id);
    }
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chain, L, g]);

  const style = useMemo(() => {
    const scope = `#stage-${uid}`;
    const litSel = [...lit].map((id) => `${scope}.dimming .wheel-node[data-id="${CSS.escape(id)}"]`).join(",");
    return (
      `${scope} .wheel-node{transition:none!important;cursor:default}` +
      `${scope}.counting .wheel-node:not(.press-root){opacity:clamp(0,calc((var(--c) - var(--i,0)) * 16),1)}` +
      `${scope}.dimming .wheel-node{opacity:calc(1 - var(--d) * .84)}` +
      `${litSel}{opacity:1}`
    );
  }, [uid, lit]);

  const R = L.extent + 40;
  const clipR = L.seal + (R - L.seal) * easeOut(clamp01(reveal));

  // sector names read upright at this rotation (same rule as the live map)
  const arcs = useMemo(
    () =>
      L.sectors.flatMap((s) => {
        const r = s.outer + 20;
        const mid = (s.a0 + s.a1) / 2;
        const screen = ((((mid * DEG + rot) % 360) + 360) % 360) / DEG;
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
      }),
    [L, rot],
  );
  const root = g.nodes[g.root];

  return (
    <g
      id={`stage-${uid}`}
      ref={ref}
      className={`${count < 1 ? "counting" : ""} ${dim > 0 ? "dimming" : ""}`}
      style={{ ["--c" as string]: count.toFixed(4), ["--d" as string]: dim.toFixed(4) } as React.CSSProperties}
    >
      <style>{style}</style>
      <defs>
        <clipPath id={`survey-${uid}`}>
          <circle r={clipR} />
        </clipPath>
        {arcs.map((a) => (
          <path key={a.id} id={`arc-${uid}-${a.id}`} d={a.d} />
        ))}
        <path id={`seal-top-${uid}`} d={arcPath(L.seal + 11, Math.PI * 1.02, Math.PI * 1.98)} />
        <path
          id={`seal-bot-${uid}`}
          d={`M${(L.seal + 19) * Math.cos(Math.PI * 0.85)},${(L.seal + 19) * Math.sin(Math.PI * 0.85)} A${L.seal + 19},${L.seal + 19} 0 0 0 ${(L.seal + 19) * Math.cos(Math.PI * 0.15)},${(L.seal + 19) * Math.sin(Math.PI * 0.15)}`}
        />
      </defs>
      <g transform={`rotate(${rot.toFixed(3)})`} style={{ ["--wr" as string]: rot.toFixed(3) } as React.CSSProperties}>
        <g clipPath={`url(#survey-${uid})`}>
          <Territories L={L} />
          <ChamberBean L={L} g={g} />
          {chain.map((h, i) => {
            const p = clamp01(chainT - i);
            if (p <= 0) return null;
            const a = at(h.from),
              b = at(h.to);
            if (!a || !b || a.id === b.id) return null;
            const c = curve(a, b);
            const m = pointAt(a, b, c, 0.56);
            const mark = MARK[h.type];
            const dash = h.type === "heads" || h.type === "parent" ? "4 2.5" : undefined;
            const drawn = easeOut(p);
            return (
              <g key={`${h.from}-${h.to}`}>
                {/* a paper under-stroke keeps the chain legible over busy wedges at feed size */}
                <path
                  d={c.d}
                  pathLength={dash ? undefined : 1}
                  fill="none"
                  stroke="var(--paper)"
                  strokeOpacity={0.9}
                  strokeWidth={chainWidth + 3.5}
                  strokeLinecap="round"
                  strokeDasharray={dash ? undefined : `${drawn} 2`}
                  opacity={dash ? drawn : 1}
                />
                <path
                  d={c.d}
                  pathLength={dash ? undefined : 1}
                  fill="none"
                  stroke="var(--saffron)"
                  strokeWidth={chainWidth}
                  strokeLinecap="round"
                  strokeDasharray={dash ? undefined : `${drawn} 2`}
                  opacity={dash ? drawn : 1}
                  style={dash ? { strokeDasharray: dash } : undefined}
                />
                {mark && (
                  <path
                    d={mark.d}
                    transform={`translate(${m.x},${m.y}) rotate(${m.ang}) scale(1.35)`}
                    fill={mark.fill ? "var(--saffron)" : "var(--card)"}
                    stroke="var(--saffron)"
                    strokeWidth={1.1}
                    strokeLinejoin="round"
                    opacity={seg(p, 0.5, 0.8)}
                  />
                )}
              </g>
            );
          })}
          <Nodes L={L} g={g} />
        </g>
        <g className="wheel-node press-root" data-id={g.root}>
          <circle r={L.seal + 26} fill="var(--paper)" />
          <circle r={L.seal + 26} fill="var(--saffron-wash)" opacity={0.55} />
          <circle r={L.seal + 26} fill="none" stroke="var(--saffron)" strokeOpacity={0.5} strokeWidth={1} />
          <Chakra r={L.seal * 0.72} ink="var(--navy)" spin={spin} />
        </g>
      </g>
      {labels > 0 && (
        <g opacity={labels} transform={`rotate(${rot.toFixed(3)})`} aria-hidden>
          {arcs.map((a) => (
            <text key={a.id} className="wheel-arc-label" fill={SECTOR_INK[a.id as keyof typeof SECTOR_INK]}>
              <textPath href={`#arc-${uid}-${a.id}`} startOffset="50%" textAnchor="middle">
                {a.label}
              </textPath>
            </text>
          ))}
        </g>
      )}
      {seal > 0 && (
        <g opacity={seal} aria-hidden>
          <text className="wheel-arc-label" fill="var(--saffron-ink)" style={{ fontSize: 9.5, letterSpacing: "0.24em" }}>
            <textPath href={`#seal-top-${uid}`} startOffset="50%" textAnchor="middle">
              {root?.name ?? "People of India"}
            </textPath>
          </text>
          {root?.nameHi && (
            <text className="deva" fill="var(--saffron-ink)" style={{ fontSize: 11, fontWeight: 600 }}>
              <textPath href={`#seal-bot-${uid}`} startOffset="50%" textAnchor="middle">
                {root.nameHi}
              </textPath>
            </text>
          )}
        </g>
      )}
    </g>
  );
}
