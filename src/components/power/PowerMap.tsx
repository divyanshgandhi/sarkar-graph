"use client";

import { motion, useReducedMotion } from "motion/react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { partyInk } from "@/lib/graph";
import type { PowerPerson } from "@/lib/types";
import type { LiveState } from "@/lib/useLive";
import { Avatar, relTime } from "../panel/bits";

interface Placed {
  p: PowerPerson;
  x: number;
  y: number;
  r: number;
}

function pack(people: PowerPerson[], width: number): { placed: Placed[]; height: number } {
  if (!people.length) return { placed: [], height: 0 };
  const max = Math.max(...people.map((p) => p.total));
  const phone = width < 560;
  const rMax = phone ? 34 : 46,
    rMin = phone ? 18 : 22;
  const cellW = (r: number) => Math.max(r * 2 + 24, phone ? 108 : 150);
  const rows: { p: PowerPerson; r: number; w: number }[][] = [];
  let row: { p: PowerPerson; r: number; w: number }[] = [];
  let rowW = 0;
  const usable = width - 32;
  for (const p of people) {
    const r = rMin + (rMax - rMin) * Math.sqrt(p.total / max);
    const w = cellW(r);
    if (row.length && (rowW + w > usable || (rows.length === 0 && row.length >= 1))) {
      rows.push(row);
      row = [];
      rowW = 0;
    }
    row.push({ p, r, w });
    rowW += w;
  }
  if (row.length) rows.push(row);
  const placed: Placed[] = [];
  let y = phone ? 70 : 84;
  for (const rw of rows) {
    const total = rw.reduce((s, c) => s + c.w, 0);
    let x = (width - total) / 2;
    const rr = Math.max(...rw.map((c) => c.r));
    for (const c of rw) {
      placed.push({ p: c.p, x: x + c.w / 2, y: y + rr, r: c.r });
      x += c.w;
    }
    y += rr * 2 + (phone ? 96 : 112);
  }
  return { placed, height: y };
}

export function PowerMap({ live, onPick }: { live: LiveState; onPick: (nodeId: string, gov: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [hover, setHover] = useState<string | null>(null);
  const reduce = useReducedMotion();
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const people = live.data?.power.people ?? [];
  const { placed, height } = useMemo(() => pack(people, w || 800), [people, w]);
  const byKey = new Map(placed.map((p) => [p.p.key, p]));
  const links = (live.data?.power.links ?? []).filter((l) => byKey.has(l.from) && byKey.has(l.to));
  const maxHeat = Math.max(1, ...people.map((p) => p.heat));

  return (
    <div ref={ref} className="h-full w-full overflow-y-auto">
      <div className="relative mx-auto" style={{ height: Math.max(height + 40, 400) }}>
        <div className="absolute inset-x-0 top-0 px-4 pt-16 text-center md:pt-5">
          <h2 className="t-label text-ink-2">Power map: who is in the news</h2>
          {live.data && (
            <p className="t-meta mt-1 text-ink-4">
              The {people.length} people named most across {live.data.articleCount.toLocaleString("en-IN")} articles from {live.data.sources.length} sources in the last{" "}
              {live.data.windowDays} days
            </p>
          )}
        </div>
        {!live.data && <p className="t-small absolute inset-x-0 top-40 text-center text-ink-3">Reading today’s coverage…</p>}
        <svg className="pointer-events-none absolute inset-0" width="100%" height={height} aria-hidden>
          {links.map((l, i) => {
            const a = byKey.get(l.from)!,
              b = byKey.get(l.to)!;
            const lit = hover && (hover === l.from || hover === l.to);
            const my = (a.y + b.y) / 2;
            return (
              <motion.path
                key={i}
                d={`M${a.x},${a.y} C${a.x},${my} ${b.x},${my} ${b.x},${b.y}`}
                fill="none"
                stroke={lit ? "var(--saffron)" : "var(--ink-3)"}
                strokeWidth={lit ? 1.5 : 1}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: hover ? (lit ? 0.9 : 0.06) : 0.2 }}
                transition={{ pathLength: { duration: reduce ? 0 : 0.42, delay: reduce ? 0 : 0.4 }, opacity: { duration: 0.16 } }}
              />
            );
          })}
        </svg>
        {placed.map(({ p, x, y, r }) => {
          const heat = p.heat / maxHeat;
          const hot = p.recent > 0;
          return (
            <motion.button
              key={p.key}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: hover && hover !== p.key ? 0.45 : 1, y: 0 }}
              transition={{ duration: 0.3, delay: reduce ? 0 : 0.018 * p.rank, ease: [0.16, 1, 0.3, 1] }}
              onPointerEnter={() => setHover(p.key)}
              onPointerLeave={() => setHover((h) => (h === p.key ? null : h))}
              onFocus={() => setHover(p.key)}
              onBlur={() => setHover(null)}
              onClick={() => p.nodeId && onPick(p.nodeId, p.gov ?? "in")}
              className="absolute flex w-[150px] -translate-x-1/2 flex-col items-center text-center"
              style={{ left: x, top: y - r }}
            >
              <span className="relative">
                {hot && (
                  // heat gauge: the share of this person's coverage that landed this week
                  <svg className="absolute -inset-[7px]" width={r * 2 + 14} height={r * 2 + 14} viewBox={`${-r - 7} ${-r - 7} ${r * 2 + 14} ${r * 2 + 14}`} aria-hidden>
                    <circle r={r + 5} fill="none" stroke="var(--saffron)" strokeOpacity={0.18} strokeWidth={2.5} />
                    <motion.circle
                      r={r + 5}
                      fill="none"
                      stroke="var(--saffron)"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      transform="rotate(-90)"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: Math.max(0.06, Math.min(1, heat)) }}
                      transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : 0.2 + 0.018 * p.rank, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </svg>
                )}
                <Avatar holder={{ name: p.name, image: p.image }} size={r * 2} ring={p.party ? partyInk(p.party) : "var(--ink-4)"} />
              </span>
              <span className="t-ui mt-2 leading-tight">{p.name}</span>
              <span className="t-meta mt-0.5 line-clamp-2 text-ink-4">
                {p.party ? `${p.party} · ` : ""}
                {p.job}
              </span>
              <span className="t-meta mt-0.5 text-ink-3 tnum">{p.total} articles</span>
              {hot && p.latest && <span className="t-meta mt-0.5 text-saffron-ink">In the news {relTime(p.latest.at)}</span>}
            </motion.button>
          );
        })}
        {hover && byKey.get(hover) && <HoverCard pl={byKey.get(hover)!} width={w} />}
      </div>
    </div>
  );
}

function HoverCard({ pl, width }: { pl: Placed; width: number }) {
  const p = pl.p;
  const max = Math.max(1, ...p.weeks);
  const left = Math.min(Math.max(pl.x - 130, 12), width - 272);
  return (
    <div className="pointer-events-none absolute z-10 w-[260px] rounded-xl bg-card p-3 shadow-pop ring-1 ring-rule" style={{ left, top: pl.y + pl.r + 96 }}>
      <div className="t-label text-ink-4">Mentions, last 13 weeks</div>
      <svg viewBox="0 0 130 28" className="mt-1.5 w-full" aria-hidden>
        {p.weeks.map((v, i) => (
          <rect key={i} x={i * 10} y={28 - (v / max) * 26} width={7} height={Math.max(1, (v / max) * 26)} rx={1.5} fill={i === p.weeks.length - 1 ? "var(--saffron)" : "var(--ink-4)"} opacity={i === p.weeks.length - 1 ? 1 : 0.5} />
        ))}
      </svg>
      {p.latest && (
        <p className="t-small mt-2 text-ink-2">
          {p.latest.title}
          <span className="t-meta mt-1 block text-ink-4">
            {p.latest.source} · {relTime(p.latest.at)}
          </span>
        </p>
      )}
    </div>
  );
}
