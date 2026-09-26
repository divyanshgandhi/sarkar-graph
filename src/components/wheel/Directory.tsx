"use client";

import { useMemo } from "react";
import { SECTOR_LABEL } from "@/lib/graph";
import type { GovGraph, Sector } from "@/lib/types";

/**
 * The wheel as a plain, keyboard- and screen-reader-navigable directory.
 * Visually hidden until focused, so keyboard users can tab straight into it.
 */
export function Directory({ g, onSelect }: { g: GovGraph; onSelect: (id: string) => void }) {
  const groups = useMemo(() => {
    const by = new Map<Sector, { id: string; name: string; sub?: string }[]>();
    for (const n of Object.values(g.nodes)) {
      if (n.sector === "people" || n.cluster) continue;
      if (n.ring > 5 && !n.isPosition) continue;
      const list = by.get(n.sector) ?? by.set(n.sector, []).get(n.sector)!;
      list.push({ id: n.id, name: n.name, sub: n.holder?.name });
    }
    for (const l of by.values()) l.sort((a, b) => a.name.localeCompare(b.name));
    return [...by.entries()];
  }, [g]);
  return (
    <nav
      aria-label={`Directory of the ${g.kind === "union" ? "Government of India" : `government of ${g.name}`}`}
      className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:inset-4 focus-within:z-40 focus-within:overflow-y-auto focus-within:rounded-xl focus-within:bg-card focus-within:p-4 focus-within:shadow-pop"
    >
      {groups.map(([sector, list]) => (
        <section key={sector} className="mb-4">
          <h2 className="t-head mb-1">{SECTOR_LABEL[sector]}</h2>
          <ul className="grid gap-0.5 sm:grid-cols-2">
            {list.map((x) => (
              <li key={x.id}>
                <button onClick={() => onSelect(x.id)} className="t-small w-full rounded-md px-2 py-1 text-left hover:bg-card-2">
                  {x.name}
                  {x.sub ? <span className="text-ink-4"> · {x.sub}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}
