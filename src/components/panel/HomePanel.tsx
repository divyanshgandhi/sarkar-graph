"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { SECTOR_INK, partyInk } from "@/lib/graph";
import type { ChangeItem, GovGraph, GovSummary } from "@/lib/types";
import type { LiveState } from "@/lib/useLive";
import { BudgetCard } from "./BudgetCard";
import { NewsText, govOfId } from "./NewsText";
import { Avatar, Card, Stat, relTime } from "./bits";

export function HomePanel({
  g,
  gov,
  summary,
  live,
  onGo,
  onPower,
}: {
  g: GovGraph | null;
  gov: string;
  summary?: GovSummary;
  live: LiveState;
  onGo: (gov: string, id: string | null) => void;
  onPower: () => void;
}) {
  const isUnion = gov === "in";
  return (
    <div className="flex flex-col gap-2 md:gap-3">
      <Card>
        <h1 className="t-title">{isUnion ? "Every seat of power in India, traced back to the voter." : `How ${summary?.name ?? "this state"} is governed, and by whom.`}</h1>
        <p className="t-small mt-2 text-ink-3">
          {isUnion
            ? "The People sit at the centre. Pick any office, court or commission to see who holds it, who put them there and whom they answer to."
            : "The state’s voters sit at the centre. Pick any seat to see who holds it and how they got there."}
        </p>
        {g && (
          <p className="t-meta mt-3 text-ink-4 tnum">
            Surveyed {new Date(g.asOf).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {Number(g.stats.bodies).toLocaleString("en-IN")} bodies ·{" "}
            {Number(g.stats.seats).toLocaleString("en-IN")} seats
          </p>
        )}
      </Card>

      {!isUnion && g && <StateFacts g={g} summary={summary} onGo={(id) => onGo(gov, id)} />}

      <NewsCard live={live} gov={gov} onGo={onGo} onPower={onPower} />
      <ChangesCard live={live} gov={gov} onGo={onGo} />
      {isUnion && <BudgetCard onGo={(id) => onGo("in", id)} />}

      <footer className="t-meta flex flex-wrap justify-between gap-2 px-[var(--gutter)] pb-4 pt-1 text-ink-4">
        <span>Built for citizens. Facts are sourced; corrections welcome.</span>
        <span>Inspired by CivLab’s US Gov Graph</span>
      </footer>
    </div>
  );
}

function StateFacts({ g, summary, onGo }: { g: GovGraph; summary?: GovSummary; onGo: (id: string) => void }) {
  const nodes = Object.values(g.nodes);
  const cm = nodes.find((n) => n.rank === "chief_minister");
  const gv = nodes.find((n) => ["governor", "lieutenant_governor", "administrator"].includes(n.rank || ""));
  const assembly = nodes.find((n) => /-assembly$/.test(n.id));
  const districts = nodes.filter((n) => n.kind === "district").length;
  return (
    <Card>
      <div className="grid gap-2">
        {[cm, gv].filter(Boolean).map((n) => (
          <button key={n!.id} onClick={() => onGo(n!.id)} className="flex items-center gap-3 rounded-xl px-1 py-1 text-left hover:bg-card-2">
            <Avatar holder={n!.holder} size={40} ring={n!.holder?.party ? partyInk(n!.holder.party) : undefined} />
            <span className="min-w-0">
              <span className="t-meta block text-ink-4">{n!.title}</span>
              <span className="t-ui block">{n!.holder?.name ?? "Vacant"}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Capital" value={<span className="text-[15px]">{summary?.capital ?? "—"}</span>} />
        <Stat label="Assembly" value={assembly?.seats ?? "—"} sub={assembly ? "seats" : "none"} />
        <Stat label="Districts" value={districts || "—"} />
      </div>
    </Card>
  );
}

function NewsCard({ live, gov, onGo, onPower }: { live: LiveState; gov: string; onGo: (gov: string, id: string | null) => void; onPower: () => void }) {
  const [more, setMore] = useState(false);
  const items = useMemo(() => {
    const all = live.data?.news ?? [];
    if (gov === "in") return all;
    const mine = all.filter((n) => n.entities.some((e) => govOfId(e) === gov));
    return mine.length >= 3 ? mine : all;
  }, [live.data, gov]);
  const shown = items.slice(0, more ? 10 : 3);
  const faces = (live.data?.power.people ?? []).slice(0, 5);
  return (
    <Card>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="t-head">Latest news</h2>
        {live.data && <span className="t-meta text-ink-4">{relTime(live.data.news[0]?.publishedAt ?? live.data.updatedAt)}</span>}
      </div>
      {!live.data && live.status !== "error" && (
        <div className="space-y-2" aria-busy>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-card-2" style={{ width: `${90 - i * 12}%` }} />
          ))}
        </div>
      )}
      {live.status === "error" && !live.data && <p className="t-small text-ink-3">The news feed is unreachable right now. The map still works; news will return when the connection does.</p>}
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {shown.map((n) => (
            <motion.p
              key={n.id}
              layout
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="t-body text-ink-2"
            >
              {live.fresh.has(n.id) && <span className="mr-1.5 inline-block h-1.5 w-1.5 translate-y-[-2px] rounded-full bg-saffron" aria-label="new" />}
              <NewsText text={n.title} marks={n.titleMarks} onGo={(id, gv) => onGo(gv, id)} />
              <a href={n.url} target="_blank" rel="noreferrer" className="t-meta ml-1.5 whitespace-nowrap text-ink-4 hover:text-ink-1">
                {n.source}, {relTime(n.publishedAt)}
              </a>
            </motion.p>
          ))}
        </AnimatePresence>
      </div>
      {items.length > 3 && (
        <button onClick={() => setMore((m) => !m)} className="t-small mt-3 text-ink-4 hover:text-ink-1">
          {more ? "Show less" : "Read more"}
        </button>
      )}
      {faces.length > 0 && (
        <button onClick={onPower} className="mt-4 flex w-full items-center justify-between rounded-xl bg-card-2 px-3 py-2 text-left hover:bg-well">
          <span className="flex items-center gap-2.5">
            <span className="flex -space-x-2">
              {faces.map((p) => (
                <Avatar key={p.key} holder={{ name: p.name, image: p.image }} size={26} ring="var(--card-2)" />
              ))}
            </span>
            <span className="t-ui">Who’s in the news</span>
          </span>
          <span className="t-meta text-ink-3">Power map →</span>
        </button>
      )}
    </Card>
  );
}

const RANGES = [
  { id: 7, label: "7D" },
  { id: 30, label: "30D" },
  { id: 90, label: "90D" },
];

function ChangesCard({ live, gov, onGo }: { live: LiveState; gov: string; onGo: (gov: string, id: string | null) => void }) {
  const [range, setRange] = useState(30);
  const data = live.data?.changes;
  const now = live.data ? new Date(live.data.updatedAt).getTime() : Date.now();
  const items = useMemo(() => {
    const cut = now - range * 864e5;
    return (data?.items ?? []).filter((c) => new Date(c.date).getTime() >= cut && (gov === "in" || c.gov === gov));
  }, [data, range, now, gov]);
  const byDay = useMemo(() => {
    const m = new Map<number, ChangeItem[]>();
    for (const c of items) {
      const d = Math.floor((now - new Date(c.date).getTime()) / 864e5);
      (m.get(d) ?? m.set(d, []).get(d)!).push(c);
    }
    return m;
  }, [items, now]);
  const last = data?.stats.lastChange;
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="t-head">Latest changes</h2>
        <div className="flex rounded-lg bg-card-2 p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`t-meta rounded-md px-2 py-1 ${range === r.id ? "bg-card text-ink-1 shadow-card" : "text-ink-4 hover:text-ink-1"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <p className="t-small text-ink-3">Appointments, elections and departures, as they are recorded against official sources.</p>
      {data && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat label="Vacant" value={data.stats.vacant} sub="seats unfilled" />
          <Stat label="Acting" value={data.stats.acting} sub="or additional charge" />
          <Stat label="Last change" value={last ? `${Math.max(0, Math.round((now - new Date(last).getTime()) / 864e5))}d` : "—"} sub={last ? new Date(last).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : undefined} />
        </div>
      )}
      {/* timeline */}
      <div className="relative mt-5 h-10" aria-hidden>
        <div className="absolute inset-x-0 top-4 h-px bg-rule" />
        {[...byDay.entries()].map(([d, list]) => {
          const x = 100 - (d / range) * 100;
          const sector = list[0].sector;
          return (
            <span
              key={d}
              className="absolute top-4 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border bg-card text-[9px] font-semibold tnum"
              style={{ left: `${Math.min(98, Math.max(2, x))}%`, width: list.length > 1 ? 16 : 9, height: list.length > 1 ? 16 : 9, borderColor: SECTOR_INK[sector], color: SECTOR_INK[sector] }}
            >
              {list.length > 1 ? list.length : ""}
            </span>
          );
        })}
        <div className="t-meta absolute inset-x-0 top-7 flex justify-between text-ink-4">
          <span>{range}d ago</span>
          <span>today</span>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {items.slice(0, 12).map((c) => (
          <li key={c.id}>
            <button onClick={() => c.nodeId && onGo(c.gov, c.nodeId)} className="w-full rounded-xl border border-rule px-3 py-2.5 text-left hover:bg-card-2">
              <div className="flex items-center justify-between gap-2">
                <span
                  className="t-label rounded-[4px] px-1.5 py-0.5"
                  style={{ color: SECTOR_INK[c.sector], background: `color-mix(in oklab, ${SECTOR_INK[c.sector]} 12%, transparent)` }}
                >
                  {c.kind === "elected" ? "Elected" : c.kind === "departed" ? "Left office" : c.kind === "acting" ? "Acting" : "Appointed"}
                </span>
                <span className="t-meta text-ink-4">{new Date(c.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
              </div>
              <div className="t-ui mt-1.5 leading-snug">{c.positionTitle}</div>
              {c.personIn && <div className="t-small mt-0.5 text-ink-2">{c.personIn}</div>}
              {c.personOut && <div className="t-meta text-ink-4">Previously {c.personOut}</div>}
            </button>
          </li>
        ))}
        {data && items.length === 0 && <li className="t-small text-ink-3">No recorded changes in the last {range} days.</li>}
      </ul>
    </Card>
  );
}
