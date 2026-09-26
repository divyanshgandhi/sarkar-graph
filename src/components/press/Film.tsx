"use client";

// The 60-second launch film. Every frame is a pure function of `t` (seconds): scripts/press.mjs
// calls window.__seek(t) and captures, so the cut is frame-exact and reproducible.
//
//   0.0  the People — the seal alone
//   3.4  the Union counted into being, seat by seat
//  10.0  all 36 States and UTs, counted
//  15.5  "Now ask it something."
//  17.5  four questions, each answered by the wheel turning and drawing its chain home
//  45.5  what we know, and what we don't
//  53.5  the wheel folds back into the seal; the name
import { useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { Chakra } from "@/components/wheel/Glyph";
import { authorityChain, buildIndex, partyInk, type Hop } from "@/lib/graph";
import { layoutWheel } from "@/lib/layout";
import { loadGraph } from "@/lib/useGraph";
import type { GovGraph } from "@/lib/types";
import { WheelStage, easeInOut, easeOut, restAngle, seg, springAt } from "./Stage";
import type { PressStats } from "./stats";

const W = 1920,
  H = 1080;
const fmt = (n: number) => Math.round(n).toLocaleString("en-IN");
const lerp = (a: number, b: number, x: number) => a + (b - a) * x;

// Each question's captions are written to match its hops in the data; a mismatch is logged, not hidden.
const QUESTIONS = [
  {
    gov: "in",
    q: "Who runs the Railways?",
    target: "in-min-railways",
    answer: "in-pos-minister-railways",
    lines: [
      "The people elect the Lok Sabha.",
      "The Prime Minister governs with its confidence.",
      "On the Prime Minister’s advice, the President appoints the minister.",
      "The minister heads the Ministry of Railways.",
    ],
  },
  {
    gov: "in",
    q: "Who appoints the Chief Justice?",
    target: "in-pos-chief-justice-of-india",
    answer: "in-pos-chief-justice-of-india",
    lines: ["The people elect the Lok Sabha.", "Its MPs vote to elect the President.", "The President appoints the Chief Justice of India."],
  },
  {
    gov: "in",
    q: "Who audits how the government spends?",
    target: "in-pos-cag",
    answer: "in-pos-cag",
    lines: ["The people elect the Lok Sabha.", "The Prime Minister governs with its confidence.", "On the Prime Minister’s advice, the President appoints the Comptroller and Auditor General."],
  },
  {
    gov: "up",
    q: "Who runs Uttar Pradesh?",
    target: "st-up-pos-chief-minister",
    answer: "st-up-pos-chief-minister",
    lines: ["The people of Uttar Pradesh elect the Assembly.", "The Chief Minister governs with its confidence."],
  },
];
const SHORT: Record<string, string> = {
  "Andaman and Nicobar Islands": "Andaman & Nicobar",
  "Dadra and Nagar Haveli and Daman and Diu": "DNH & Daman Diu",
};
const Q0 = 17.5,
  QLEN = 7,
  HOP = 0.72;

type Loaded = { g: GovGraph; L: ReturnType<typeof layoutWheel>; seats: number };

function seatsOf(g: GovGraph) {
  let n = 0;
  for (const x of Object.values(g.nodes)) n += (x.isPosition ? 1 : 0) + (x.members?.length ?? 0);
  return n;
}

/** Words arrive one after another, lifting and sharpening into place. */
function Words({ text, t, at, step = 0.055, className, style }: { text: string; t: number; at: number; step?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <span className={className} style={style}>
      {text.split(" ").map((w, i) => {
        const p = easeOut(seg(t, at + i * step, at + i * step + 0.45));
        return (
          <span key={i} style={{ display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 0.28}em)`, filter: `blur(${((1 - p) * 6).toFixed(2)}px)`, whiteSpace: "pre" }}>
            {w}
            {i < text.split(" ").length - 1 ? " " : ""}
          </span>
        );
      })}
    </span>
  );
}

export function Film({ stats }: { stats: PressStats }) {
  const [t, setT] = useState(0);
  const [data, setData] = useState<Record<string, Loaded> | null>(null);

  useEffect(() => {
    const codes = ["in", ...stats.states.map((s) => s.code)];
    Promise.all(codes.map((c) => loadGraph(c))).then(async (gs) => {
      const out: Record<string, Loaded> = {};
      gs.forEach((g) => (out[g.gov] = { g, L: layoutWheel(g), seats: seatsOf(g) }));
      // portraits must be decoded before the first capture
      const imgs = QUESTIONS.map((q) => out[q.gov].g.nodes[q.answer]?.holder?.image).filter(Boolean) as string[];
      await Promise.all(imgs.map((src) => new Promise((r) => Object.assign(new Image(), { onload: r, onerror: r, src }))));
      setData(out);
    });
  }, [stats.states]);

  useEffect(() => {
    if (!data) return;
    const w = window as unknown as { __seek: (t: number) => Promise<void>; __ready: boolean };
    w.__seek = (v: number) =>
      new Promise((res) => {
        flushSync(() => setT(v));
        requestAnimationFrame(() => requestAnimationFrame(() => res()));
      });
    document.fonts.ready.then(() => (w.__ready = true));
    // preview in a normal browser: ?play plays it in real time
    if (new URLSearchParams(location.search).has("play")) {
      const t0 = performance.now();
      let raf = 0;
      const tick = () => {
        setT(((performance.now() - t0) / 1000) % 60);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }
  }, [data]);

  const chains = useMemo(() => {
    if (!data) return [] as Hop[][];
    return QUESTIONS.map((q) => {
      const { g } = data[q.gov];
      const ch = authorityChain(g, buildIndex(g), q.target);
      if (ch.length !== q.lines.length) console.warn(`film: "${q.q}" has ${ch.length} hops, ${q.lines.length} captions`);
      return ch;
    });
  }, [data]);

  // rotation targets, each question turning on from where the last one rested
  const rests = useMemo(() => {
    if (!data) return [] as { from: number; to: number }[];
    let cur = 0;
    return QUESTIONS.map((q) => {
      const from = q.gov === "in" ? cur : 0;
      const to = restAngle(data[q.gov].L, q.target, from);
      if (q.gov === "in") cur = to;
      return { from, to };
    });
  }, [data]);

  if (!data) return <div className="press bg-paper" style={{ width: W, height: H }} />;

  const U = data.in;
  const kFull = 492 / U.L.extent;
  const kSeal = 150 / (U.L.seal + 26);

  // ── the Union wheel's camera ─────────────────────────────────────────────
  const qi = Math.min(3, Math.max(0, Math.floor((t - Q0) / QLEN)));
  const inQ = t >= Q0 && t < Q0 + QLEN * 4;
  const qs = Q0 + qi * QLEN; // current question start
  const q = QUESTIONS[qi];

  let cx = 960,
    cy = 540,
    k = kSeal;
  const toCensus = easeInOut(seg(t, 3.4, 4.8));
  cx = lerp(960, 1262, toCensus);
  k = lerp(kSeal, kFull, toCensus);
  // the end: back to the seal, centred
  const toEnd = easeInOut(seg(t, 53.5, 55));
  if (t >= 53.5) {
    cx = lerp(1262, 960, toEnd);
    cy = lerp(540, 450, toEnd);
    k = lerp(kFull, kSeal, toEnd);
  }

  // Union rotation: questions 1–3 turn it; afterwards it springs home
  let rotU = 0;
  if (t >= Q0) {
    const last = rests[2];
    for (let i = 0; i < 3; i++) {
      const s = Q0 + i * QLEN;
      if (t >= s) rotU = springAt(rests[i].from, rests[i].to, t - (s + 0.35));
    }
    if (t >= Q0 + QLEN * 3) rotU = springAt(last.to, Math.round(last.to / 360) * 360, t - 45.6);
  }

  const reveal = t < 53.5 ? seg(t, 3.6, 4.9) : 1 - seg(t, 53.6, 54.8);
  const count = seg(t, 4.2, 9.4);
  const unionFade =
    t < 10
      ? 1
      : t < 15.4
        ? 1 - seg(t, 10, 10.6)
        : t < Q0 + QLEN * 3 - 0.3
          ? seg(t, 15.5, 16.3)
          : t < 45.6
            ? 1 - seg(t, Q0 + QLEN * 3 - 0.3, Q0 + QLEN * 3 + 0.2)
            : seg(t, 45.6, 46.3);

  // question-scene parameters (shared by the Union and Uttar Pradesh wheels)
  const qt = t - qs;
  const qOut = 1 - seg(qt, QLEN - 0.5, QLEN - 0.1);
  const dimQ = inQ ? 0.7 * easeOut(seg(qt, 0.9, 1.5)) * qOut : 0;
  const chainT = inQ ? Math.max(0, (qt - 1.6) / HOP) : 0;

  // ── Uttar Pradesh (question 4) ───────────────────────────────────────────
  const UP = data.up;
  const upStart = Q0 + QLEN * 3;
  const upOn = t >= upStart - 0.4 && t < upStart + QLEN + 0.3;
  const upFade = seg(t, upStart - 0.3, upStart + 0.2) * (1 - seg(t, upStart + QLEN - 0.3, upStart + QLEN + 0.2));
  const kUP = 492 / UP.L.extent;
  const rotUP = t >= upStart ? springAt(0, rests[3]?.to ?? 0, t - (upStart + 0.35)) : 0;

  // ── atlas: 36 States and UTs ─────────────────────────────────────────────
  const atlasOn = t >= 9.8 && t < 16.2;
  const atlasFade = seg(t, 10.1, 10.6) * (1 - seg(t, 15.4, 16));
  const COLS = 9,
    CELL = 136,
    GX = W - 80 - COLS * CELL,
    GY = 540 - (4 * (CELL + 30)) / 2;

  // the running census
  const unionSeats = U.seats;
  const tally = t < 10.4 ? unionSeats * count : lerp(unionSeats, stats.seats, easeInOut(seg(t, 10.5, 14.4)));

  const answerNode = inQ ? data[q.gov].g.nodes[q.answer] : null;
  const holder = answerNode?.holder;
  const nHops = chains[qi]?.length ?? 0;
  const answerAt = 1.6 + nHops * HOP + 0.25;

  return (
    <div className="press relative overflow-hidden bg-paper text-ink-1" style={{ width: W, height: H }}>
      <svg className="absolute inset-0" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
        {unionFade > 0 && (
          <g opacity={unionFade} transform={`translate(${cx.toFixed(2)} ${cy.toFixed(2)}) scale(${k.toFixed(5)})`}>
            <WheelStage
              g={U.g}
              L={U.L}
              uid="union"
              rot={rotU}
              reveal={reveal}
              count={count}
              chain={inQ && qi < 3 ? chains[qi] : []}
              chainT={chainT}
              dim={inQ && qi < 3 ? dimQ : 0}
              labels={t < 45 ? seg(t, 8.8, 9.8) * (inQ ? 1 - seg(qt, 0.2, 0.5) : 1) * (1 - seg(t, 53.3, 53.7)) : seg(t, 47, 48) * (1 - seg(t, 53.3, 53.7))}
              seal={t < 3.4 ? seg(t, 1.1, 1.9) : 1}
              spin={t * 6}
              chainWidth={4.4}
            />
          </g>
        )}
        {upOn && (
          <g opacity={upFade} transform={`translate(1262 540) scale(${kUP.toFixed(5)})`}>
            <WheelStage g={UP.g} L={UP.L} uid="up" rot={rotUP} reveal={seg(t, upStart - 0.2, upStart + 0.9)} chain={qi === 3 ? chains[3] : []} chainT={qi === 3 ? chainT : 0} dim={qi === 3 ? dimQ : 0} labels={0} chainWidth={4.4} />
          </g>
        )}
        {atlasOn && (
          <g opacity={atlasFade}>
            {stats.states.map((s, i) => {
              const d = data[s.code];
              if (!d) return null;
              const col = i % COLS,
                row = Math.floor(i / COLS);
              const x = GX + col * CELL + CELL / 2,
                y = GY + row * (CELL + 30) + CELL / 2;
              const s0 = 10.5 + i * 0.075;
              const kk = (CELL / 2 - 8) / d.L.extent;
              return (
                <g key={s.code} transform={`translate(${x} ${y})`}>
                  <g transform={`scale(${kk.toFixed(5)})`}>
                    <WheelStage g={d.g} L={d.L} uid={`atlas-${s.code}`} reveal={seg(t, s0, s0 + 0.5)} count={seg(t, s0 + 0.2, s0 + 1.3)} labels={0} seal={0} />
                  </g>
                  <text y={CELL / 2 + 16} textAnchor="middle" fill="var(--ink-3)" style={{ fontSize: 13.5, fontWeight: 520, opacity: seg(t, s0 + 0.3, s0 + 0.8) }}>
                    {SHORT[s.name] ?? s.name.replace(/ and /g, " & ")}
                  </text>
                </g>
              );
            })}
          </g>
        )}
      </svg>

      {/* standing wordmark */}
      <div className="absolute left-[96px] top-[72px] flex items-baseline gap-3" style={{ opacity: seg(t, 4, 4.8) * (1 - seg(t, 53.2, 53.6)) }}>
        <svg width="28" height="28" viewBox="-15 -15 30 30" className="self-center" aria-hidden>
          <circle r="14.5" fill="var(--saffron-wash)" />
          <Chakra r={11} ink="var(--navy)" />
        </svg>
        <span className="text-[22px] font-[620] tracking-[-0.01em]">Sarkar Graph</span>
        <span className="deva text-[18px] font-[560] text-ink-3">सरकार ग्राफ़</span>
      </div>

      {/* 0 — the People */}
      {t < 4 && (
        <div className="absolute inset-x-0 top-[760px] text-center" style={{ opacity: 1 - seg(t, 3.2, 3.6) }}>
          <Words text="Who runs India?" t={t} at={0.5} className="block text-[76px] font-[630] leading-none tracking-[-0.026em]" style={{ fontStretch: "94%" }} />
          <Words text="It starts with the people." t={t} at={1.7} className="mt-5 block text-[32px] text-ink-3" />
        </div>
      )}

      {/* 1 — the Union, counted */}
      {t >= 3.8 && t < 10.8 && (
        <div className="absolute left-[96px] top-[300px] w-[640px]" style={{ opacity: 1 - seg(t, 10, 10.5) }}>
          <Words text="The Government of India, drawn outward from the people who elect it." t={t} at={3.9} className="block text-[46px] font-[600] leading-[1.08] tracking-[-0.02em]" style={{ fontStretch: "94%" }} />
          <p className="mt-12 flex items-baseline gap-4" style={{ opacity: seg(t, 4.3, 4.8) }}>
            <span className="text-[96px] font-[640] leading-none tabular-nums tracking-[-0.03em]">{fmt(tally)}</span>
            <span className="text-[28px] text-ink-3">seats in the Union</span>
          </p>
        </div>
      )}

      {/* 2 — the States, counted */}
      {t >= 10.3 && t < 16 && (
        <div className="absolute left-[96px] top-[300px] w-[470px]" style={{ opacity: 1 - seg(t, 15.3, 15.8) }}>
          <Words text="Plus every State and Union Territory, each with its own wheel." t={t} at={10.4} className="block text-[46px] font-[600] leading-[1.08] tracking-[-0.02em]" style={{ fontStretch: "94%" }} />
          <p className="mt-12 flex flex-col gap-2" style={{ opacity: seg(t, 10.6, 11.1) }}>
            <span className="text-[96px] font-[640] leading-none tabular-nums tracking-[-0.03em]">{fmt(tally)}</span>
            <span className="text-[28px] text-ink-3">seats across {stats.governments} governments</span>
          </p>
        </div>
      )}

      {/* 3 — the turn */}
      {t >= 15.6 && t < Q0 + 0.4 && (
        <div className="absolute left-[96px] top-[430px] w-[640px]" style={{ opacity: 1 - seg(t, Q0 - 0.3, Q0 + 0.1) }}>
          <Words text="Now ask it something." t={t} at={15.9} className="block text-[76px] font-[630] leading-none tracking-[-0.026em]" style={{ fontStretch: "94%" }} />
        </div>
      )}

      {/* 4 — the questions */}
      {inQ && (
        <div className="absolute left-[96px] top-[196px] w-[660px]" style={{ opacity: qOut }}>
          <Words key={qi} text={q.q} t={qt} at={0} className="block text-[68px] font-[630] leading-[1.02] tracking-[-0.026em]" style={{ fontStretch: "94%" }} />
          <ol className="mt-12 space-y-4">
            {q.lines.map((line, i) => {
              const at = 1.6 + i * HOP;
              const p = easeOut(seg(qt, at, at + 0.4));
              const current = qt >= at && (i === q.lines.length - 1 || qt < at + HOP);
              return (
                <li
                  key={i}
                  className="flex gap-4 text-[28px] leading-[1.28]"
                  style={{ opacity: p * (current ? 1 : 0.55), transform: `translateX(${(1 - p) * 18}px)` }}
                >
                  <span className="mt-[0.5em] h-[9px] w-[9px] shrink-0 rounded-full" style={{ background: "var(--saffron)", opacity: current ? 1 : 0.5 }} />
                  <span className={current ? "text-ink-1" : "text-ink-2"}>{line}</span>
                </li>
              );
            })}
          </ol>
          {holder && (
            <div className="mt-12 flex items-center gap-5" style={{ opacity: easeOut(seg(qt, answerAt, answerAt + 0.5)), transform: `translateY(${(1 - easeOut(seg(qt, answerAt, answerAt + 0.5))) * 16}px)` }}>
              <span className="grid h-[92px] w-[92px] shrink-0 place-items-center overflow-hidden rounded-full bg-well" style={{ boxShadow: `0 0 0 3px var(--paper), 0 0 0 6px ${partyInk(holder.party)}` }}>
                {holder.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={holder.image} alt="" className="h-full w-full object-cover object-top" />
                ) : (
                  <span className="text-[30px] font-[600] text-ink-3">{holder.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
                )}
              </span>
              <span>
                <span className="block text-[38px] font-[630] leading-[1.05] tracking-[-0.02em]">{holder.name.replace(/\s*\(.*\)$/, "")}</span>
                <span className="mt-1 block text-[22px] text-ink-3">{answerNode?.title ?? answerNode?.name}</span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* 5 — what we know, and what we don't */}
      {t >= 45.6 && t < 53.8 && (
        <div className="absolute left-[96px] top-[260px] w-[680px]" style={{ opacity: 1 - seg(t, 53.1, 53.6) }}>
          <Words text="What we know, and what we don’t." t={t} at={45.9} className="block text-[68px] font-[630] leading-[1.02] tracking-[-0.026em]" style={{ fontStretch: "94%" }} />
          <dl className="mt-14 space-y-6 text-[30px] leading-[1.25] text-ink-3">
            {[
              [stats.held, "seats have a named holder, each with its sources", "text-ink-1"],
              [stats.seats - stats.held, "are vacant or still unnamed", "text-ink-1"],
              [stats.gaps, "known gaps, every one listed in the open", "text-ink-1"],
            ].map(([n, label, ink], i) => {
              const at = 47 + i * 1.1;
              const p = easeOut(seg(t, at, at + 0.5));
              return (
                <div key={i} className="flex items-baseline gap-5" style={{ opacity: p, transform: `translateY(${(1 - p) * 14}px)` }}>
                  <dt className={`w-[150px] shrink-0 text-right text-[54px] font-[640] leading-none tabular-nums tracking-[-0.02em] ${ink}`}>{fmt(n as number)}</dt>
                  <dd>{label as string}</dd>
                </div>
              );
            })}
          </dl>
          <Words text="Every fact carries its source. Help us check them." t={t} at={50.6} className="mt-14 block text-[30px] text-ink-2" />
        </div>
      )}

      {/* 6 — the name */}
      {t >= 54.4 && (
        <div className="absolute inset-x-0 top-[690px] text-center">
          <Words text="Sarkar Graph" t={t} at={54.6} step={0.12} className="block text-[92px] font-[640] leading-none tracking-[-0.03em]" style={{ fontStretch: "94%" }} />
          <span className="deva mt-3 block text-[34px] font-[560] text-ink-3" style={{ opacity: easeOut(seg(t, 55.2, 55.8)) }}>
            सरकार ग्राफ़
          </span>
          <Words text="Every seat of power in India. Open source. Help map the rest." t={t} at={56} className="mt-9 block text-[30px] text-ink-2" />
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-paper" style={{ opacity: seg(t, 59.5, 60) }} />
    </div>
  );
}

