"use client";

import { useEffect, useState } from "react";
import { SECTOR_INK, formatCrore } from "@/lib/graph";
import { Card, Stat, domainOf } from "./bits";

interface Overview {
  fy: string;
  prior: { fy: string; totalExpenditureBE?: number; totalExpenditureRE?: number } | null;
  totals: Record<string, number>;
  top: { id: string; name: string; be: number; re: number | null }[];
  interest: number | null;
  sources: string[];
  verified: boolean;
}

let cached: Promise<Overview | null> | null = null;
const load = () => (cached ??= fetch("/data/budget.json").then((r) => (r.ok ? r.json() : null)).catch(() => null));

/** The Union Budget in one card: how much, how it is financed, where the largest shares go. */
export function BudgetCard({ onGo }: { onGo: (id: string) => void }) {
  const [b, setB] = useState<Overview | null>(null);
  useEffect(() => {
    load().then(setB);
  }, []);
  if (!b?.totals?.totalExpenditureBE) return null;
  const T = b.totals;
  const prev = b.prior?.totalExpenditureBE;
  const growth = prev ? ((T.totalExpenditureBE - prev) / prev) * 100 : null;
  const rows = [...b.top];
  if (b.interest) rows.push({ id: "", name: "Interest on past borrowing", be: b.interest, re: null });
  rows.sort((x, y) => y.be - x.be);
  const shown = rows.slice(0, 8);
  const max = Math.max(...shown.map((r) => r.be));
  const src = b.sources[0]?.split(" ")[0];
  return (
    <Card>
      <h2 className="t-head">Union Budget {b.fy.replace("-", "–")}</h2>
      <p className="t-small mt-1 text-ink-3">What the Union government plans to spend this year, and on what.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Stat label="Total spending" value={formatCrore(T.totalExpenditureBE)} sub={growth != null ? `${growth >= 0 ? "↑" : "↓"} ${Math.abs(growth).toFixed(1)}% on last year’s plan` : undefined} />
        <Stat label="Borrowing (fiscal deficit)" value={T.fiscalDeficitPctGDP ? `${T.fiscalDeficitPctGDP}% of GDP` : "—"} sub="money raised by new debt" />
        {T.capitalExpenditureBE ? <Stat label="Building assets" value={formatCrore(T.capitalExpenditureBE)} sub="capital spending" /> : null}
        {T.transfersToStates ? <Stat label="Sent to States" value={formatCrore(T.transfersToStates)} sub="taxes shared + grants" /> : null}
      </div>
      <h3 className="t-ui mb-2 mt-5">Largest shares</h3>
      <ul className="space-y-2">
        {shown.map((r) => (
          <li key={r.name}>
            <button disabled={!r.id} onClick={() => r.id && onGo(r.id)} className="group w-full text-left disabled:cursor-default">
              <div className="flex items-baseline justify-between gap-3">
                <span className={`t-small truncate ${r.id ? "group-hover:underline" : "text-ink-3"}`}>{r.name.replace(/^Ministry of /, "")}</span>
                <span className="t-meta flex-none text-ink-3 tnum">{formatCrore(r.be)}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-card-2">
                <div className="h-full rounded-full" style={{ width: `${(r.be / max) * 100}%`, background: r.id ? SECTOR_INK.executive : "var(--ink-4)" }} />
              </div>
            </button>
          </li>
        ))}
      </ul>
      <p className="t-meta mt-4 text-ink-4">
        Budget estimates as presented to Parliament on 1 Feb 2026. Ministry figures are gross demands for grants, so some (Railways especially) include spending met from their own earnings
        {src && /^https?:/.test(src) ? (
          <>
            {" · "}
            <a href={src} target="_blank" rel="noreferrer" className="underline decoration-rule hover:text-ink-1">
              {domainOf(src)}
            </a>
          </>
        ) : null}
        {!b.verified && " · awaiting a second check"}.
      </p>
    </Card>
  );
}
