"use client";

import { useMemo, useState } from "react";
import { REL_VERB, SECTOR_INK, breadcrumb, connections, formatCrore, partyInk, sinceLabel, type GraphIndex, type Hop } from "@/lib/graph";
import type { GEdge, GNode, GovGraph, Member } from "@/lib/types";
import type { LiveState } from "@/lib/useLive";
import { Hemicycle } from "./Hemicycle";
import { NewsText, govOfId } from "./NewsText";
import { Avatar, Card, Clamp, EntityRow, NodeGlyph, PartyChip, Stat, Tabs, domainOf, relTime } from "./bits";

type Tab = "connections" | "members" | "news" | "budget";

const lakh = (v: string | number) => {
  const x = Number(v);
  if (!Number.isFinite(x)) return String(v);
  return x >= 1e7 ? `${(x / 1e7).toLocaleString("en-IN", { maximumFractionDigits: 2 })} crore` : x >= 1e5 ? `${(x / 1e5).toLocaleString("en-IN", { maximumFractionDigits: 1 })} lakh` : x.toLocaleString("en-IN");
};
const dateish = (v: string | number) => (/^\d{4}-\d{2}(-\d{2})?$/.test(String(v)) ? new Date(String(v)).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : String(v));
// the facts worth a tile, in the order they matter to a citizen
const STAT_LABELS: Record<string, [string, ((v: string | number) => string)?]> = {
  population2011: ["Population (2011)", lakh],
  areaKm2: ["Area", (v) => `${Number(v).toLocaleString("en-IN")} km²`],
  lokSabhaSeats: ["Lok Sabha seats"],
  rajyaSabhaSeats: ["Rajya Sabha seats"],
  assemblySeats: ["Assembly seats"],
  districts: ["Districts"],
  workingStrength: ["Working strength"],
  vacancies: ["Vacancies"],
  lastElection: ["Last election", dateish],
  nextElection: ["Next election due", dateish],
  electors: ["Registered voters", lakh],
};

const HOP_TEXT: Record<string, (a: GNode, b: GNode) => string> = {
  elects: (a, b) => `${a.name} elect the ${b.name}`,
  indirectly_elects: (a, b) =>
    a.sector === "people" ? `${a.name} elect the MPs and MLAs who choose the ${b.name}` : `${a.name} elect the ${b.name}`,
  accountable_to: (a, b) => `Whoever commands a majority in the ${a.name} is appointed ${b.name}`,
  appoints: (a, b) => `The ${a.name} appoints the ${b.name}`,
  advises_appointment: (a, b) => `The ${b.name} is appointed on the advice of the ${a.name}`,
  nominates: (a, b) => `The ${a.name} nominates the ${b.name}`,
  heads: (a, b) => `The ${a.name} heads the ${b.name}`,
  administers: (a, b) => `The ${a.name} administers the ${b.name}`,
  oversees: (a, b) => `The ${a.name} oversees the ${b.name}`,
  parent: (a, b) => `The ${b.name} sits within the ${a.name}`,
};

function hopSentence(g: GovGraph, h: Hop) {
  const a = g.nodes[h.from],
    b = g.nodes[h.to];
  if (!a || !b) return "";
  const f = HOP_TEXT[h.type] ?? ((x: GNode, y: GNode) => `${x.name} → ${y.name}`);
  return f(a, b).replace(/The The /g, "The ").replace(/the People/g, "the People");
}

export function EntityPanel({
  g,
  ix,
  id,
  chain,
  onGo,
  live,
}: {
  g: GovGraph;
  ix: GraphIndex;
  id: string;
  chain: Hop[];
  onGo: (id: string | null, gov?: string) => void;
  live: LiveState;
}) {
  const n = g.nodes[id];
  const crumbs = useMemo(() => breadcrumb(g, id), [g, id]);
  const head = n.head ? g.nodes[n.head] : null;
  const admin = n.adminHead ? g.nodes[n.adminHead] : null;
  const headOf = n.headOf ? g.nodes[n.headOf] : null;
  const parent = n.parent ? g.nodes[n.parent] : null;
  const children = useMemo(
    () =>
      (n.children ?? [])
        .map((c) => g.nodes[c])
        .filter((c): c is GNode => !!c && c.id !== n.head && c.id !== n.adminHead)
        .sort((a, b) => (b.budget?.be ?? 0) - (a.budget?.be ?? 0) || a.name.localeCompare(b.name)),
    [g, n],
  );
  const conn = useMemo(() => connections(g, ix, id), [g, ix, id]);
  const news = useMemo(() => {
    const ids = new Set([id, n.head, n.adminHead, n.headOf].filter(Boolean) as string[]);
    return (live.data?.news ?? []).filter((x) => x.entities.some((e) => ids.has(e)));
  }, [live.data, id, n]);
  const members = n.members ?? [];
  const hasBudget = !!n.budget?.be || children.some((c) => c.budget?.be);
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "connections", label: "Connections", count: conn.out.length + conn.inc.length + children.length || undefined },
    ...(members.length ? [{ id: "members" as Tab, label: "Members", count: members.length }] : []),
    { id: "news", label: "News", count: news.length || undefined },
    ...(hasBudget ? [{ id: "budget" as Tab, label: "Budget" }] : []),
  ];
  const [tab, setTab] = useState<Tab>(members.length > 20 ? "members" : "connections");
  const current = tabs.find((t) => t.id === tab) ? tab : "connections";
  const ink = SECTOR_INK[n.sector];

  const holderNode = n.isPosition ? n : head;
  const facts: { label: string; value: React.ReactNode; sub?: React.ReactNode }[] = [];
  if (n.seats) facts.push({ label: n.kind === "court" ? "Sanctioned judges" : "Seats", value: n.seats.toLocaleString("en-IN") });
  if (n.budget?.be) facts.push({ label: `Budget ${n.budget.fy}`, value: formatCrore(n.budget.be), sub: n.budget.rank ? `#${n.budget.rank} of ${n.budget.of} ministries` : "Union allocation" });
  if (n.established) {
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(n.established.trim());
    const yr = iso?.[1] ?? /\b(1[6-9]\d\d|20\d\d)\b/.exec(n.established)?.[1];
    const sub = iso
      ? new Date(n.established).toLocaleDateString("en-IN", { day: "numeric", month: "long" })
      : yr && n.established.trim() !== yr
        ? n.established.replace(yr, "").replace(/^[\s(,;–-]+|[\s)]+$/g, "")
        : undefined;
    facts.push({ label: "Established", value: yr ?? n.established.slice(0, 12), sub });
  }
  if (n.hq) facts.push({ label: "Based in", value: <span className="text-[15px] leading-tight">{n.hq}</span> });
  if (n.stats) {
    for (const [k, [label, fmt]] of Object.entries(STAT_LABELS)) {
      const v = n.stats[k];
      if (v == null || v === "" || typeof v === "object") continue;
      facts.push({ label, value: fmt ? fmt(v) : typeof v === "number" ? v.toLocaleString("en-IN") : String(v) });
    }
  }

  return (
    <div className="flex flex-col gap-2 md:gap-3">
      <Card>
        {crumbs.length > 0 && (
          <nav aria-label="Where this sits" className="t-meta mb-2 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-ink-4">
            {crumbs.slice(-3).map((c, i) => (
              <span key={c.id} className="flex items-center gap-1">
                {i > 0 && <span aria-hidden>›</span>}
                <button onClick={() => onGo(c.id)} className="hover:text-ink-1 hover:underline">
                  {c.abbr && c.name.length > 26 ? c.abbr : c.name}
                </button>
              </span>
            ))}
          </nav>
        )}
        <h1 className="t-display">{n.name}</h1>
        {n.nameHi && <p className="deva mt-1 text-[17px] text-ink-3">{n.nameHi}</p>}
        {n.description && (
          <div className="mt-3">
            <Clamp text={n.description} />
          </div>
        )}
        {(n.legalBasis || n.officialUrl || n.legalSourceUrl) && (
          <div className="t-small mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-3">
            {n.legalBasis &&
              (n.legalSourceUrl ? (
                <a href={n.legalSourceUrl} target="_blank" rel="noreferrer" className="underline decoration-rule hover:text-ink-1">
                  {n.legalBasis.length > 60 ? "Legal basis" : n.legalBasis}
                </a>
              ) : (
                <span>{n.legalBasis}</span>
              ))}
            {n.officialUrl && (
              <a href={n.officialUrl} target="_blank" rel="noreferrer" className="underline decoration-rule hover:text-ink-1">
                {domainOf(n.officialUrl)}
              </a>
            )}
          </div>
        )}
        {facts.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {facts.slice(0, 4).map((f) => (
              <Stat key={f.label} label={f.label} value={f.value} sub={f.sub} />
            ))}
          </div>
        )}
        {n.link && (
          <button
            onClick={() => onGo(null, n.link)}
            className="t-ui mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-ink-1 text-card transition-opacity hover:opacity-90"
          >
            Open the {n.name} government
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        )}
      </Card>

      {/* who holds it */}
      {(holderNode || admin) && (
        <Card>
          {holderNode && (
            <SeatCard
              label={n.isPosition ? "Held by" : holderNode.title ?? holderNode.name}
              node={holderNode}
              onOpen={n.isPosition ? undefined : () => onGo(holderNode.id)}
            />
          )}
          {admin && (
            <div className={holderNode ? "mt-3 border-t border-rule pt-3" : ""}>
              <SeatCard label={admin.title ?? "Administrative head"} node={admin} onOpen={() => onGo(admin.id)} compact />
            </div>
          )}
          {headOf && (
            <div className="mt-3">
              <EntityRow n={headOf} sub="Heads this body" onClick={() => onGo(headOf.id)} />
            </div>
          )}
        </Card>
      )}

      {/* chain of authority, in words */}
      {chain.length > 0 && (
        <Card>
          <h2 className="t-head">How this seat is filled</h2>
          <ol className="relative mt-3 space-y-2.5 pl-5">
            <span className="absolute bottom-2 left-[5px] top-2 w-px bg-saffron/60" aria-hidden />
            {chain.map((h, i) => (
              <li key={`${h.from}-${h.to}`} className="relative">
                <span
                  className="absolute -left-5 top-[5px] h-[11px] w-[11px] rounded-full border-2 border-saffron bg-card"
                  style={i === chain.length - 1 ? { background: "var(--saffron)" } : undefined}
                  aria-hidden
                />
                <button onClick={() => onGo(h.from === g.root ? null : h.from)} className="t-small text-left text-ink-2 hover:text-ink-1">
                  {hopSentence(g, h)}.
                </button>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {parent && (
        <Card>
          <h2 className="t-head mb-3">Part of</h2>
          <EntityRow n={parent} sub={parent.holder?.name ?? (parent.head ? g.nodes[parent.head]?.holder?.name : undefined)} onClick={() => onGo(parent.id)} />
        </Card>
      )}

      <Card>
        <Tabs tabs={tabs} value={current} onChange={setTab} />
        <div className="mt-4">
          {current === "connections" && <Connections g={g} n={n} out={conn.out} inc={conn.inc} kids={children} onGo={onGo} />}
          {current === "members" && <Members n={n} members={members} />}
          {current === "news" && (
            <div className="space-y-4">
              {news.length === 0 && (
                <p className="t-small text-ink-3">
                  No coverage naming {n.abbr ?? "this body"} in the last {live.data?.windowDays ?? 90} days across {live.data?.sources.length ?? "our"} sources.
                  {live.status !== "live" && " The live feed is still connecting."}
                </p>
              )}
              {news.slice(0, 12).map((x) => (
                <article key={x.id} className="flex gap-3 border-b border-rule pb-4 last:border-0">
                  <div className="min-w-0 flex-1">
                    <a href={x.url} target="_blank" rel="noreferrer" className="t-ui block leading-snug hover:underline">
                      {x.title}
                    </a>
                    {x.summary && (
                      <p className="t-small mt-1 text-ink-3">
                        <NewsText text={x.summary} marks={x.summaryMarks} onGo={(i, gv) => onGo(i, gv)} />
                      </p>
                    )}
                    <p className="t-meta mt-1.5 text-ink-4">
                      {x.source} · {relTime(x.publishedAt)}
                    </p>
                  </div>
                  {x.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={x.image} alt="" loading="lazy" referrerPolicy="no-referrer" className="mt-0.5 h-[68px] w-[92px] flex-none rounded-lg bg-well object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                  )}
                </article>
              ))}
            </div>
          )}
          {current === "budget" && <BudgetView n={n} kids={children} onGo={onGo} />}
        </div>
      </Card>

      <Provenance n={n} holder={holderNode} asOf={g.asOf} />
    </div>
  );
}

function SeatCard({ label, node, onOpen, compact }: { label: string; node: GNode; onOpen?: () => void; compact?: boolean }) {
  const h = node.holder;
  return (
    <div>
      <div className="t-label mb-2 text-ink-4">{label}</div>
      <div className="flex items-center gap-3">
        <Avatar holder={h} size={compact ? 38 : 52} ring={h?.party ? partyInk(h.party) : undefined} />
        <div className="min-w-0 flex-1">
          {h ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className={compact ? "t-ui" : "t-title"}>{h.name}</span>
                <PartyChip party={h.party} />
              </div>
              <div className="t-meta mt-0.5 text-ink-4">
                {[sinceLabel(h.since, h.acting), h.constituency, h.house].filter(Boolean).join(" · ")}
              </div>
            </>
          ) : (
            <>
              <div className="t-ui">Vacant</div>
              <div className="t-meta text-ink-4">No one holds this seat right now</div>
            </>
          )}
        </div>
        {onOpen && (
          <button onClick={onOpen} className="t-meta flex-none rounded-lg px-2 py-1 text-ink-3 hover:bg-card-2 hover:text-ink-1" aria-label={`View the seat: ${node.name}`}>
            View seat
          </button>
        )}
      </div>
      {h?.notes && !compact && <p className="t-small mt-2 text-ink-3">{h.notes}</p>}
    </div>
  );
}

function Connections({ g, n, out, inc, kids, onGo }: { g: GovGraph; n: GNode; out: GEdge[]; inc: GEdge[]; kids: GNode[]; onGo: (id: string | null, gov?: string) => void }) {
  const groups = new Map<string, GNode[]>();
  for (const e of inc) {
    const k = REL_VERB[e.type]?.[1] ?? e.type;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(g.nodes[e.from]);
  }
  for (const e of out) {
    const k = REL_VERB[e.type]?.[0] ?? e.type;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(g.nodes[e.to]);
  }
  const [showAll, setShowAll] = useState(false);
  if (!groups.size && !kids.length) return <p className="t-small text-ink-3">No formal links recorded for {n.name} yet.</p>;
  return (
    <div className="space-y-5">
      {kids.length > 0 && (
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="t-ui">Bodies under it</h3>
            <span className="t-meta text-ink-4 tnum">{kids.length}</span>
          </div>
          <div className="grid gap-1.5">
            {(showAll ? kids : kids.slice(0, 8)).map((c) => (
              <EntityRow
                key={c.id}
                n={c}
                sub={c.holder?.name ?? (c.head ? g.nodes[c.head]?.holder?.name : undefined) ?? (c.budget?.be ? formatCrore(c.budget.be) : undefined)}
                onClick={() => onGo(c.id)}
              />
            ))}
          </div>
          {kids.length > 8 && (
            <button onClick={() => setShowAll((s) => !s)} className="t-small mt-2 text-ink-3 hover:text-ink-1">
              {showAll ? "Show fewer" : `Show all ${kids.length}`}
            </button>
          )}
        </div>
      )}
      {[...groups.entries()].map(([k, list]) => (
        <div key={k}>
          <h3 className="t-ui mb-2">{k}</h3>
          <div className="grid gap-1.5">
            {list.filter(Boolean).map((c) => (
              <EntityRow key={c.id} n={c} sub={c.holder?.name} onClick={() => onGo(c.id, govOfId(c.id))} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Members({ n, members }: { n: GNode; members: Member[] }) {
  const [q, setQ] = useState("");
  const [party, setParty] = useState<string | null>(null);
  const parties = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of members) {
      const p = x.holder?.party ?? (x.vacant ? "Vacant" : "—");
      m.set(p, (m.get(p) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [members]);
  const hasParties = parties.length > 1 && members.some((m) => m.holder?.party);
  const list = members.filter((m) => {
    if (party && (m.holder?.party ?? (m.vacant ? "Vacant" : "—")) !== party) return false;
    const t = q.trim().toLowerCase();
    return !t || `${m.holder?.name ?? ""} ${m.seat ?? ""} ${m.title}`.toLowerCase().includes(t);
  });
  const isChamber = /chamber|legislature/.test(n.kind) || members.length > 40;
  return (
    <div>
      {isChamber && hasParties && <Hemicycle parties={parties} total={n.seats ?? members.length} selected={party} onPick={setParty} />}
      {hasParties && (
        <div className="mb-3 mt-2 flex flex-wrap gap-1.5">
          {parties.slice(0, 12).map(([p, c]) => (
            <button
              key={p}
              onClick={() => setParty(party === p ? null : p)}
              className={`t-meta inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 transition-colors ${party === p ? "border-ink-1 bg-card-2" : "border-rule hover:bg-card-2"}`}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: p === "Vacant" ? "transparent" : partyInk(p), boxShadow: p === "Vacant" ? "inset 0 0 0 1px var(--ink-4)" : undefined }} />
              {p}
              <span className="text-ink-4 tnum">{c}</span>
            </button>
          ))}
        </div>
      )}
      {members.length > 12 && (
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={isChamber ? "Find a member or constituency" : "Find a member"}
          className="t-ui mb-3 h-9 w-full rounded-lg bg-card-2 px-3 outline-none placeholder:text-ink-4"
        />
      )}
      <ul className="divide-y divide-rule">
        {list.slice(0, 200).map((m) => (
          <li key={m.id} className="flex items-center gap-3 py-2">
            <Avatar holder={m.holder} size={30} />
            <div className="min-w-0 flex-1">
              <div className="t-ui truncate">{m.holder?.name ?? "Vacant"}</div>
              <div className="t-meta truncate text-ink-4">{[m.seat, m.seat ? null : m.title].filter(Boolean).join(" · ") || m.title}</div>
            </div>
            {m.holder?.party && <PartyChip party={m.holder.party} />}
          </li>
        ))}
      </ul>
      {list.length > 200 && <p className="t-meta mt-2 text-ink-4">Showing 200 of {list.length}. Search to narrow down.</p>}
    </div>
  );
}

function BudgetView({ n, kids, onGo }: { n: GNode; kids: GNode[]; onGo: (id: string) => void }) {
  const b = n.budget;
  const withBudget = kids.filter((k) => k.budget?.be).sort((a, c) => (c.budget!.be! - a.budget!.be!));
  const max = Math.max(1, ...withBudget.map((k) => k.budget!.be!));
  const delta = b?.be && b?.re ? ((b.be - b.re) / b.re) * 100 : null;
  return (
    <div>
      {b?.be ? (
        <div className="grid grid-cols-2 gap-2">
          <Stat label={`Allocated ${b.fy}`} value={formatCrore(b.be)} sub={b.share ? `${(b.share * 100).toFixed(2)}% of Union spending` : undefined} />
          <Stat
            label={b.reFy ? `Revised ${b.reFy}` : "Previous year"}
            value={b.re ? formatCrore(b.re) : "—"}
            sub={delta != null ? `${delta >= 0 ? "↑" : "↓"} ${Math.abs(delta).toFixed(1)}% this year` : undefined}
          />
          {b.actual != null && <Stat label={`Spent ${b.actualFy}`} value={formatCrore(b.actual)} />}
          {b.capital != null && <Stat label="Of which capital" value={formatCrore(b.capital)} />}
        </div>
      ) : (
        <p className="t-small text-ink-3">The Union Budget allocates money to the bodies below.</p>
      )}
      {withBudget.length > 0 && (
        <div className="mt-5">
          <h3 className="t-ui mb-2">Where it goes</h3>
          <ul className="space-y-2">
            {withBudget.map((k) => (
              <li key={k.id}>
                <button onClick={() => onGo(k.id)} className="group w-full text-left">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="t-small truncate group-hover:underline">{k.name}</span>
                    <span className="t-meta flex-none text-ink-3 tnum">{formatCrore(k.budget!.be)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-card-2">
                    <div className="h-full rounded-full" style={{ width: `${(k.budget!.be! / max) * 100}%`, background: SECTOR_INK[k.sector] }} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {b?.source && (
        <p className="t-meta mt-4 text-ink-4">
          Source:{" "}
          <a href={b.source} target="_blank" rel="noreferrer" className="underline decoration-rule hover:text-ink-1">
            Union Budget {b.fy}, {domainOf(b.source)}
          </a>
        </p>
      )}
    </div>
  );
}

function Provenance({ n, holder, asOf }: { n: GNode; holder: GNode | null; asOf: string }) {
  const sources = [...new Set([...(n.sources ?? []), ...(holder && holder !== n ? holder.sources ?? [] : [])])].slice(0, 6);
  const low = n.confidence === "low" || holder?.confidence === "low";
  return (
    <div className="px-[var(--gutter)] pb-4 pt-1">
      <p className="t-meta text-ink-4">
        Checked against sources on {new Date(asOf).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        {low && " · parts of this entry are not yet verified"}.
      </p>
      {sources.length > 0 && (
        <p className="t-meta mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-ink-4">
          {sources.map((s) =>
            /^https?:\/\//.test(s) ? (
              <a key={s} href={s} target="_blank" rel="noreferrer" className="underline decoration-rule hover:text-ink-1">
                {domainOf(s)}
              </a>
            ) : (
              <span key={s}>{s}</span>
            ),
          )}
        </p>
      )}
    </div>
  );
}

export { NodeGlyph };
