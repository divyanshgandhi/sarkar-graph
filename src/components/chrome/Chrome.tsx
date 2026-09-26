"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SECTOR_INK, SECTOR_LABEL } from "@/lib/graph";
import type { GovGraph, GovSummary } from "@/lib/types";
import { ThemeToggle } from "./ThemeToggle";

export function Logo({ size = 18 }: { size?: number }) {
  const spokes = Array.from({ length: 24 }, (_, i) => (i * Math.PI * 2) / 24);
  return (
    <svg width={size} height={size} viewBox="-10 -10 20 20" aria-hidden>
      <circle r="8.6" fill="none" stroke="var(--navy)" strokeWidth="1.5" />
      {spokes.map((a, i) => (
        <line key={i} x1={(1.6 * Math.cos(a)).toFixed(3)} y1={(1.6 * Math.sin(a)).toFixed(3)} x2={(8 * Math.cos(a)).toFixed(3)} y2={(8 * Math.sin(a)).toFixed(3)} stroke="var(--navy)" strokeWidth="0.55" />
      ))}
      <circle r="1.8" fill="var(--saffron)" />
    </svg>
  );
}

export function Chrome({
  gov,
  govs,
  g,
  selected,
  onGo,
}: {
  gov: string;
  govs: GovSummary[];
  g: GovGraph | null;
  selected: string | null;
  onGo: (gov: string, id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const current = govs.find((x) => x.gov === gov);
  const sector = selected && g?.nodes[selected] ? g.nodes[selected].sector : null;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const f = govs.filter((x) => x.gov !== "in" && (!t || x.name.toLowerCase().includes(t) || x.gov === t));
    return {
      states: f.filter((x) => x.kind === "state").sort((a, b) => a.name.localeCompare(b.name)),
      uts: f.filter((x) => x.kind === "ut").sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [govs, q]);

  return (
    <div ref={ref} className="relative flex min-h-[48px] items-center gap-1.5 rounded-[var(--radius-panel)] bg-card px-3 shadow-card md:px-4">
      <button onClick={() => onGo("in", null)} className="-ml-1 flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-card-2" aria-label="Sarkar Graph home">
        <Logo />
        <span className="t-ui font-[640] tracking-[-0.01em]">Sarkar</span>
      </button>
      <span className="text-ink-4">/</span>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex items-center gap-1 rounded-lg px-1.5 py-1 hover:bg-card-2 aria-expanded:bg-card-2"
      >
        <span className="t-ui">{gov === "in" ? "India" : current?.name ?? gov}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-ink-4">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {sector && sector !== "people" && (
        <>
          <span className="text-ink-4">/</span>
          <span className="t-ui truncate" style={{ color: SECTOR_INK[sector] }}>
            {g?.kind !== "union" && sector === "legislative" ? "Legislature" : SECTOR_LABEL[sector]}
          </span>
        </>
      )}
      <div className="ml-auto">
        <ThemeToggle />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-2 right-2 top-[calc(100%+6px)] z-30 max-h-[70dvh] overflow-hidden rounded-xl bg-card shadow-pop ring-1 ring-rule"
          >
            <div className="border-b border-rule p-2">
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Find a state or UT"
                className="t-ui w-full rounded-lg bg-card-2 px-3 py-2 outline-none placeholder:text-ink-4"
              />
            </div>
            <div className="max-h-[56dvh] overflow-y-auto p-1.5">
              <GovRow label="Government of India" sub="Union · Parliament · courts · commissions" active={gov === "in"} onClick={() => (onGo("in", null), setOpen(false))} />
              {list.states.length > 0 && <div className="t-label px-2.5 pb-1 pt-3 text-ink-4">States</div>}
              {list.states.map((s) => (
                <GovRow key={s.gov} label={s.name} sub={s.cm ? `CM ${s.cm.name}${s.cm.party ? ` · ${s.cm.party}` : ""}` : s.capital} active={gov === s.gov} onClick={() => (onGo(s.gov, null), setOpen(false))} />
              ))}
              {list.uts.length > 0 && <div className="t-label px-2.5 pb-1 pt-3 text-ink-4">Union Territories</div>}
              {list.uts.map((s) => (
                <GovRow key={s.gov} label={s.name} sub={s.cm ? `CM ${s.cm.name}` : s.head ? `${s.head.title} ${s.head.name}` : s.capital} active={gov === s.gov} onClick={() => (onGo(s.gov, null), setOpen(false))} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GovRow({ label, sub, active, onClick }: { label: string; sub?: string; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex w-full items-baseline justify-between gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-card-2 ${active ? "bg-card-2" : ""}`}>
      <span className="t-ui">{label}</span>
      {sub && <span className="t-meta truncate text-ink-4">{sub}</span>}
    </button>
  );
}
