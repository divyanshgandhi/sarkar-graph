"use client";

import { motion } from "motion/react";
import { useMemo } from "react";
import { partyInk } from "@/lib/graph";

/** Parliament-style hemicycle: every seat a dot, coloured by party, largest bloc first. */
export function Hemicycle({
  parties,
  total,
  selected,
  onPick,
}: {
  parties: [string, number][];
  total: number;
  selected: string | null;
  onPick: (p: string | null) => void;
}) {
  const W = 320,
    H = 172;
  const seats = useMemo(() => {
    const n = Math.max(total, parties.reduce((s, [, c]) => s + c, 0));
    const r1 = 150,
      r0 = n > 300 ? 58 : n > 100 ? 70 : 88;
    const rows = Math.max(3, Math.min(14, Math.round(Math.sqrt(n / 4.2))));
    const radii = Array.from({ length: rows }, (_, i) => r0 + (i * (r1 - r0)) / (rows - 1));
    const sumR = radii.reduce((a, b) => a + b, 0);
    let per = radii.map((r) => Math.floor((n * r) / sumR));
    let left = n - per.reduce((a, b) => a + b, 0);
    for (let i = rows - 1; left > 0; i = (i - 1 + rows) % rows, left--) per[i]++;
    const pts: { x: number; y: number; a: number }[] = [];
    radii.forEach((r, i) => {
      const k = per[i];
      for (let j = 0; j < k; j++) {
        const a = Math.PI - (k === 1 ? Math.PI / 2 : (j * Math.PI) / (k - 1));
        pts.push({ x: W / 2 + r * Math.cos(a), y: H - 8 - r * Math.sin(a), a });
      }
    });
    pts.sort((p, q) => q.a - p.a);
    const dot = Math.max(2.1, Math.min(5.5, ((r1 - r0) / rows) * 0.42));
    // fill seats bloc by bloc, left to right
    const out: { x: number; y: number; p: string; dot: number }[] = [];
    let at = 0;
    for (const [p, c] of parties) for (let i = 0; i < c && at < pts.length; i++, at++) out.push({ ...pts[at], p, dot });
    for (; at < pts.length; at++) out.push({ ...pts[at], p: "Vacant", dot });
    return out;
  }, [parties, total]);
  const lead = parties.find(([p]) => p !== "Vacant");
  const majority = Math.floor(total / 2) + 1;
  return (
    <figure className="mb-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${total} seats; largest party ${lead?.[0]} with ${lead?.[1]}`}>
        {seats.map((s, i) => (
          <motion.circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.dot}
            initial={{ opacity: 0 }}
            animate={{ opacity: selected && selected !== s.p ? 0.16 : 1 }}
            transition={{ duration: 0.25, delay: selected ? 0 : Math.min(0.5, i * 0.0009) }}
            fill={s.p === "Vacant" ? "var(--card)" : partyInk(s.p)}
            stroke={s.p === "Vacant" ? "var(--ink-4)" : "none"}
            strokeWidth={0.8}
            onClick={() => onPick(selected === s.p ? null : s.p)}
            style={{ cursor: "pointer" }}
          />
        ))}
        <text x={W / 2} y={H - 30} textAnchor="middle" style={{ fontSize: 26, fontWeight: 640 }} fill="var(--ink-1)" className="tnum">
          {total}
        </text>
        <text x={W / 2} y={H - 13} textAnchor="middle" style={{ fontSize: 10.5 }} fill="var(--ink-4)">
          seats · majority {majority}
        </text>
      </svg>
    </figure>
  );
}
