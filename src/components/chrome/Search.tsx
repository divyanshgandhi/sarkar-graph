"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SECTOR_INK } from "@/lib/graph";
import govs from "@/data/govs.json";
import type { SearchEntry } from "@/lib/types";
import { Glyph } from "../wheel/Glyph";

let indexPromise: Promise<SearchEntry[]> | null = null;
function loadIndex() {
  if (!indexPromise) indexPromise = fetch("/data/search.json").then((r) => r.json());
  return indexPromise;
}

const GOV_NAME: Record<string, string> = Object.fromEntries((govs as { gov: string; name: string }[]).map((g) => [g.gov, g.name]));

function score(e: SearchEntry, q: string, qs: string[]): number {
  const name = e.name.toLowerCase();
  if (e.abbr && e.abbr.toLowerCase() === q) return 1000;
  if (name === q) return 900;
  if (name.startsWith(q)) return 700 - name.length * 0.5;
  if (e.terms.includes(q)) return 500 - name.length * 0.3;
  if (qs.every((w) => e.terms.includes(w))) return 300 - name.length * 0.2;
  return 0;
}

export function Search({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (gov: string, id: string) => void }) {
  const [q, setQ] = useState("");
  const [index, setIndex] = useState<SearchEntry[] | null>(null);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    loadIndex().then(setIndex);
    setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);
  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!index || t.length < 2) return [];
    const qs = t.split(/\s+/).filter(Boolean);
    const scored: { e: SearchEntry; s: number }[] = [];
    for (const e of index) {
      let s = score(e, t, qs);
      if (!s) continue;
      if (e.gov === "in") s += 25;
      if (!e.person) s += 5;
      scored.push({ e, s });
    }
    scored.sort((a, b) => b.s - a.s);
    const seen = new Set<string>();
    return scored
      .filter(({ e }) => {
        const k = `${e.gov}:${e.id}:${e.name}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 24)
      .map((x) => x.e);
  }, [q, index]);

  useEffect(() => setActive(0), [q]);

  const bodies = results.filter((r) => !r.person);
  const people = results.filter((r) => r.person);
  const flat = [...bodies, ...people];

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(flat.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" && flat[active]) onPick(flat[active].gov, flat[active].id);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.14 }}>
          <div className="absolute inset-0 bg-paper/80" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-label="Search"
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -6, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative mx-auto mt-[8vh] w-[min(640px,calc(100vw-24px))] overflow-hidden rounded-2xl bg-card shadow-pop ring-1 ring-rule"
          >
            <div className="flex items-center gap-2 border-b border-rule px-4">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-ink-4">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKey}
                placeholder="Try “Election Commission”, “RBI”, “Chief Minister of Kerala”, a person’s name"
                className="h-14 flex-1 bg-transparent text-[16px] outline-none placeholder:text-ink-4"
                aria-autocomplete="list"
              />
              <button onClick={onClose} className="t-meta rounded-md border border-rule px-1.5 py-0.5 text-ink-4 hover:text-ink-1">
                Esc
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {!index && q.length >= 2 && <p className="t-small p-3 text-ink-4">Loading the directory…</p>}
              {index && q.trim().length >= 2 && !flat.length && (
                <p className="t-small p-3 text-ink-3">
                  Nothing matches “{q}”. Try the body’s full name, its abbreviation, or the office-holder’s surname.
                </p>
              )}
              {q.trim().length < 2 && (
                <p className="t-small p-3 text-ink-3">Every ministry, court, commission, State and office is searchable, and so is everyone who holds a seat.</p>
              )}
              {bodies.length > 0 && <Group label="Bodies & offices" items={bodies} offset={0} active={active} onPick={onPick} />}
              {people.length > 0 && <Group label="People" items={people} offset={bodies.length} active={active} onPick={onPick} />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Group({
  label,
  items,
  offset,
  active,
  onPick,
}: {
  label: string;
  items: SearchEntry[];
  offset: number;
  active: number;
  onPick: (gov: string, id: string) => void;
}) {
  return (
    <div className="mb-1">
      <div className="t-label px-2.5 pb-1 pt-2 text-ink-4">{label}</div>
      {items.map((r, i) => {
        const on = offset + i === active;
        return (
          <button
            key={`${r.gov}:${r.id}:${r.name}`}
            onClick={() => onPick(r.gov, r.id)}
            className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left ${on ? "bg-card-2" : "hover:bg-card-2"}`}
          >
            <svg width="16" height="16" viewBox="-8 -8 16 16" aria-hidden className="flex-none">
              <Glyph shape={r.shape} s={10} ink={SECTOR_INK[r.sector]} wash="transparent" />
            </svg>
            <span className="min-w-0 flex-1">
              <span className="t-ui block truncate">{r.name}</span>
              {r.sub && <span className="t-meta block truncate text-ink-4">{r.sub}</span>}
            </span>
            <span className="t-meta flex-none text-ink-4">{r.gov === "in" ? "India" : GOV_NAME[r.gov] ?? r.gov.toUpperCase()}</span>
          </button>
        );
      })}
    </div>
  );
}
