"use client";

// README banner, 1280×640 (captured at 2×, light and dark). The Union wheel as it ships, one seat's
// chain of authority reaching left toward the headline; the census of what we know beside it.
import { useEffect, useMemo, useState } from "react";
import { Chakra } from "@/components/wheel/Glyph";
import { authorityChain, buildIndex } from "@/lib/graph";
import { layoutWheel } from "@/lib/layout";
import { loadGraph } from "@/lib/useGraph";
import type { GovGraph } from "@/lib/types";
import { WheelStage } from "./Stage";
import type { PressStats } from "./stats";

const W = 1280,
  H = 640;
const FOCUS = "in-min-railways";
const fmt = (n: number) => n.toLocaleString("en-IN");

export function Banner({ stats }: { stats: PressStats }) {
  const [g, setG] = useState<GovGraph | null>(null);
  useEffect(() => {
    const theme = new URLSearchParams(location.search).get("theme");
    if (theme) document.documentElement.dataset.theme = theme;
    loadGraph("in").then(setG);
  }, []);
  const L = useMemo(() => (g ? layoutWheel(g) : null), [g]);
  const chain = useMemo(() => (g ? authorityChain(g, buildIndex(g), FOCUS) : []), [g]);
  useEffect(() => {
    if (L) document.fonts.ready.then(() => requestAnimationFrame(() => ((window as unknown as { __ready: boolean }).__ready = true)));
  }, [L]);

  // turn the focused seat to 9 o'clock so its chain reaches toward the words
  const rot = useMemo(() => {
    const p = L?.nodes.get(FOCUS);
    return p ? 180 - (p.a * 180) / Math.PI : 0;
  }, [L]);
  const k = L ? 452 / L.extent : 1;
  const asOf = new Date(stats.asOf).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="press relative overflow-hidden bg-paper text-ink-1" style={{ width: W, height: H }}>
      <svg className="absolute inset-0" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
        {g && L && (
          <g transform={`translate(1024 330) scale(${k})`}>
            <WheelStage g={g} L={L} uid="banner" rot={rot} chain={chain} chainT={chain.length} dim={0.3} labels={1} chainWidth={3.4} />
          </g>
        )}
      </svg>

      <div className="absolute left-[72px] top-[60px] flex items-baseline gap-3">
        <svg width="30" height="30" viewBox="-15 -15 30 30" className="self-center" aria-hidden>
          <circle r="14.5" fill="var(--saffron-wash)" />
          <Chakra r={11} ink="var(--navy)" />
        </svg>
        <span className="text-[21px] font-[620] tracking-[-0.01em]">Sarkar Graph</span>
        <span className="deva text-[17px] font-[560] text-ink-3">सरकार ग्राफ़</span>
      </div>

      <h1
        className="absolute left-[72px] top-[168px] w-[560px] text-balance text-[54px] font-[630] leading-[1.02] tracking-[-0.026em]"
        style={{ fontStretch: "94%" }}
      >
        Every seat of power in India, traced back to the voter.
      </h1>

      <dl className="absolute left-[72px] top-[380px] w-[470px] space-y-[9px] text-[19px] leading-[1.3] text-ink-3">
        <div className="flex gap-3">
          <dt className="w-[74px] shrink-0 text-right font-[640] tabular-nums text-ink-1">{fmt(stats.seats)}</dt>
          <dd>seats across the Union and all 36 States and UTs</dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-[74px] shrink-0 text-right font-[640] tabular-nums text-ink-1">{fmt(stats.held)}</dt>
          <dd>with a named holder and the sources behind it</dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-[74px] shrink-0 text-right font-[640] tabular-nums text-ink-1">{fmt(stats.gaps)}</dt>
          <dd>known gaps, listed in the open for anyone to fill</dd>
        </div>
      </dl>

      <p className="absolute bottom-[52px] left-[72px] text-[14px] font-[520] text-ink-4">Open source · data as of {asOf}</p>
    </div>
  );
}
