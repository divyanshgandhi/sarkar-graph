"use client";

import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { partyInk } from "@/lib/graph";
import type { GovSummary } from "@/lib/types";

// A tile cartogram: one equal tile per State/UT, placed roughly where it sits on the map.
const TILES: Record<string, [number, number]> = {
  jk: [3, 0], la: [4, 0],
  ch: [2, 1], pb: [3, 1], hp: [4, 1], uk: [5, 1], sk: [8, 1], ar: [10, 1],
  rj: [2, 2], hr: [3, 2], dl: [4, 2], up: [5, 2], br: [6, 2], as: [9, 2], nl: [10, 2],
  gj: [1, 3], mp: [3, 3], jh: [6, 3], wb: [7, 3], ml: [8, 3], mn: [10, 3],
  dh: [0, 4], mh: [2, 4], cg: [4, 4], od: [6, 4], tr: [8, 4], mz: [9, 4],
  ga: [1, 5], tg: [3, 5], ap: [4, 5],
  ka: [2, 6], py: [4, 6],
  kl: [2, 7], tn: [3, 7],
  ld: [0, 7], an: [8, 7],
};

export function StatesMap({ govs, onPick }: { govs: GovSummary[]; onPick: (code: string) => void }) {
  const [hover, setHover] = useState<string | null>(null);
  const states = govs.filter((g) => g.gov !== "in");
  const parties = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of states) {
      const p = s.cm?.party ?? (s.kind === "ut" ? "Union-administered" : "No elected government");
      m.set(p, (m.get(p) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [states]);
  const h = hover ? states.find((s) => s.gov === hover) : null;
  const cols = 11,
    rows = 8;
  return (
    <div className="flex h-full w-full flex-col items-center justify-center overflow-auto px-3 pb-20 pt-16 md:pt-6">
      <div className="text-center">
        <h2 className="t-label text-ink-2">Who governs each State and UT</h2>
        <p className="t-meta mt-1 text-ink-4">Each tile is one State or Union Territory, coloured by the Chief Minister’s party. Select one to open its government.</p>
      </div>
      <div className="relative mt-5 w-full max-w-[720px]" style={{ aspectRatio: `${cols} / ${rows}` }}>
        {states.map((s, i) => {
          const pos = TILES[s.gov];
          if (!pos) return null;
          const party = s.cm?.party;
          const ink = party ? partyInk(party) : "var(--ink-4)";
          const union = !party;
          return (
            <motion.button
              key={s.gov}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: hover && hover !== s.gov ? 0.55 : 1, scale: 1 }}
              transition={{ duration: 0.28, delay: i * 0.012, ease: [0.16, 1, 0.3, 1] }}
              onPointerEnter={() => setHover(s.gov)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(s.gov)}
              onBlur={() => setHover(null)}
              onClick={() => onPick(s.gov)}
              className="absolute grid place-items-center rounded-[10px] border-[1.5px] text-center transition-shadow hover:shadow-pop"
              style={{
                left: `${(pos[0] / cols) * 100}%`,
                top: `${(pos[1] / rows) * 100}%`,
                width: `${(1 / cols) * 100 - 0.8}%`,
                height: `${(1 / rows) * 100 - 1.1}%`,
                borderColor: ink,
                background: union
                  ? "repeating-linear-gradient(135deg, var(--card) 0 4px, var(--card-2) 4px 8px)"
                  : `color-mix(in oklab, ${ink} 16%, var(--card))`,
              }}
              aria-label={`${s.name}${s.cm ? `, Chief Minister ${s.cm.name} (${s.cm.party ?? "party unknown"})` : ""}`}
            >
              <span className="text-[13px] font-[680] uppercase tracking-[0.04em] md:text-[15px]" style={{ color: union ? "var(--ink-3)" : ink }}>
                {s.gov}
              </span>
            </motion.button>
          );
        })}
        {h && (
          <div className="pointer-events-none absolute right-0 top-0 w-[220px] rounded-xl bg-card p-3 shadow-pop ring-1 ring-rule">
            <div className="t-ui">{h.name}</div>
            <div className="t-meta text-ink-4">{h.kind === "ut" ? "Union Territory" : "State"} · capital {h.capital}</div>
            {h.cm ? (
              <div className="t-small mt-2">
                Chief Minister <b className="font-[600]">{h.cm.name}</b>
                {h.cm.party && <span className="text-ink-3"> ({h.cm.party})</span>}
              </div>
            ) : (
              <div className="t-small mt-2 text-ink-3">No elected state government</div>
            )}
            {h.head && (
              <div className="t-meta mt-1 text-ink-4">
                {h.head.title}: {h.head.name}
              </div>
            )}
          </div>
        )}
      </div>
      <ul className="mt-5 flex max-w-[720px] flex-wrap justify-center gap-x-4 gap-y-1.5">
        {parties.map(([p, c]) => (
          <li key={p} className="t-meta flex items-center gap-1.5 text-ink-3">
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: p.includes(" ") ? "var(--card-2)" : partyInk(p), boxShadow: "inset 0 0 0 1px var(--rule)" }} />
            {p} <span className="text-ink-4 tnum">{c}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
