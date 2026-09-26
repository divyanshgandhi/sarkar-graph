"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Glyph } from "../wheel/Glyph";

type LayerShape = Parameters<typeof Glyph>[0]["shape"];

// Each entry is a map layer: click to fade that kind of mark out of the wheel (and back).
const ENTITIES: { shape: LayerShape; label: string }[] = [
  { shape: "office", label: "Elected & constitutional offices" },
  { shape: "head", label: "Ministers & presiding officers" },
  { shape: "body", label: "Ministries, departments, agencies" },
  { shape: "commission", label: "Commissions & regulators" },
  { shape: "court", label: "Courts & tribunals" },
  { shape: "corporation", label: "Public sector companies & banks" },
  { shape: "force", label: "Armed forces & police" },
  { shape: "committee", label: "Councils & committees" },
  { shape: "advisory", label: "Advisory bodies" },
  { shape: "state", label: "States & Union Territories" },
  { shape: "district", label: "Districts" },
  { shape: "tier", label: "Cities & local government" },
  { shape: "dot", label: "Smaller bodies (select parent to see)" },
];

const RELS: { d: string; fill: boolean; label: string; dash?: string }[] = [
  { d: "M-4,-3 L-1,0 L-4,3 Z M0,-3 L3,0 L0,3 Z", fill: true, label: "Elects" },
  { d: "M-3,-3.2 L3.2,0 L-3,3.2 Z", fill: true, label: "Appoints" },
  { d: "M-3,-3.2 L3.2,0 L-3,3.2 Z", fill: false, label: "Appoints on advice of" },
  { d: "M-3,-3 L3,0 L-3,3", fill: false, label: "Nominates" },
  { d: "M-4,-3 L-2,0 L-4,3 M-0.5,-3 L1.5,0 L-0.5,3", fill: false, label: "Administers / oversees" },
  { d: "", fill: false, label: "Heads", dash: "4 2.5" },
];

const STATES: { state: "filled" | "acting" | "vacant" | "unverified"; label: string }[] = [
  { state: "filled", label: "Held" },
  { state: "acting", label: "Acting / additional charge" },
  { state: "vacant", label: "Vacant" },
  { state: "unverified", label: "Not yet verified" },
];

export function Legend({ hidden, onChange }: { hidden: Set<string>; onChange: (s: Set<string>) => void }) {
  const [open, setOpen] = useState(false);
  const toggle = (shape: string) => {
    const next = new Set(hidden);
    if (next.has(shape)) next.delete(shape);
    else next.add(shape);
    onChange(next);
  };
  return (
    <div className="relative">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-[calc(100%+8px)] left-0 z-20 max-h-[70dvh] w-[min(88vw,310px)] overflow-y-auto rounded-xl bg-card p-3 shadow-pop ring-1 ring-rule"
          >
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="t-label text-ink-4">On the map</span>
              {hidden.size > 0 && (
                <button onClick={() => onChange(new Set())} className="t-meta text-ink-3 underline decoration-rule hover:text-ink-1">
                  Show all
                </button>
              )}
            </div>
            <ul className="-mx-1.5 space-y-0.5">
              {ENTITIES.map((e) => {
                const off = hidden.has(e.shape);
                return (
                  <li key={e.label}>
                    <button
                      onClick={() => toggle(e.shape)}
                      aria-pressed={!off}
                      title={off ? "Show on the map" : "Fade from the map"}
                      className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-card-2"
                    >
                      <svg width="18" height="18" viewBox="-9 -9 18 18" aria-hidden className={off ? "opacity-30" : ""}>
                        <Glyph shape={e.shape} s={e.shape === "dot" ? 4 : 11} ink="var(--ink-2)" wash="var(--card-2)" />
                      </svg>
                      <span className={`t-small flex-1 ${off ? "text-ink-4 line-through decoration-ink-4/60" : "text-ink-2"}`}>{e.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="t-label mb-1.5 mt-3 text-ink-4">Lines of authority</div>
            <ul className="space-y-1">
              {RELS.map((r) => (
                <li key={r.label} className="flex items-center gap-2.5">
                  <svg width="26" height="12" viewBox="-13 -6 26 12" aria-hidden>
                    <line x1={-12} x2={12} y1={0} y2={0} stroke="var(--saffron)" strokeWidth={1.4} strokeDasharray={r.dash} />
                    {r.d && <path d={r.d} fill={r.fill ? "var(--saffron)" : "var(--card)"} stroke="var(--saffron)" strokeWidth={1.1} />}
                  </svg>
                  <span className="t-small text-ink-2">{r.label}</span>
                </li>
              ))}
            </ul>
            <div className="t-label mb-1.5 mt-3 text-ink-4">Seats</div>
            <ul className="grid grid-cols-2 gap-1">
              {STATES.map((s) => (
                <li key={s.state} className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="-8 -8 16 16" aria-hidden>
                    <Glyph shape="head" s={11} ink="var(--navy)" wash="var(--navy-wash)" state={s.state} />
                  </svg>
                  <span className="t-meta text-ink-2">{s.label}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="t-ui flex h-10 items-center gap-1.5 rounded-xl bg-card px-3.5 shadow-card transition-colors hover:bg-card-2"
      >
        Legend
        {hidden.size > 0 && <span className="t-meta text-ink-4 tnum">· {hidden.size} faded</span>}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={`text-ink-4 transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="m6 15 6-6 6 6" />
        </svg>
      </button>
    </div>
  );
}
