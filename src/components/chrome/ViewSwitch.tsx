"use client";

import { motion } from "motion/react";

export type View = "graph" | "power" | "states";
const VIEWS: { id: View; label: string }[] = [
  { id: "graph", label: "Graph" },
  { id: "power", label: "Power map" },
  { id: "states", label: "States" },
];

export function ViewSwitch({ value, onChange }: { value: View; onChange: (v: View) => void }) {
  return (
    <div role="tablist" aria-label="View" className="flex rounded-xl bg-well p-1 shadow-card">
      {VIEWS.map((v) => (
        <button
          key={v.id}
          role="tab"
          aria-selected={value === v.id}
          onClick={() => onChange(v.id)}
          className={`t-ui relative h-8 rounded-lg px-3 transition-colors sm:px-4 ${value === v.id ? "text-ink-1" : "text-ink-3 hover:text-ink-1"}`}
        >
          {value === v.id && (
            <motion.span layoutId="view-pill" className="absolute inset-0 rounded-lg bg-card shadow-card" transition={{ type: "spring", stiffness: 520, damping: 40 }} />
          )}
          <span className="relative z-10">{v.label}</span>
        </button>
      ))}
    </div>
  );
}
