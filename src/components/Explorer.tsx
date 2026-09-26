"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { authorityChain, buildIndex, connections } from "@/lib/graph";
import type { GovSummary } from "@/lib/types";
import { useGraph } from "@/lib/useGraph";
import { useLive } from "@/lib/useLive";
import { Chrome } from "./chrome/Chrome";
import { Legend } from "./chrome/Legend";
import { Search } from "./chrome/Search";
import { ViewSwitch, type View } from "./chrome/ViewSwitch";
import { EntityPanel } from "./panel/EntityPanel";
import { HomePanel } from "./panel/HomePanel";
import { PowerMap } from "./power/PowerMap";
import { StatesMap } from "./states/StatesMap";
import { Directory } from "./wheel/Directory";
import { Wheel } from "./wheel/Wheel";

interface Props {
  gov: string;
  initialSelected: string | null;
  govs: GovSummary[];
  initialView?: View;
}

function pathFor(gov: string, id: string | null) {
  if (!id) return gov === "in" ? "/" : `/${gov}`;
  return `/${gov}/${encodeURIComponent(id)}`;
}

export function Explorer({ gov: initialGov, initialSelected, govs, initialView = "graph" }: Props) {
  const [gov, setGov] = useState(initialGov);
  const [selected, setSelected] = useState<string | null>(initialSelected);
  const [hover, setHover] = useState<string | null>(null);
  const [view, setView] = useState<View>(initialView);
  const [searchOpen, setSearchOpen] = useState(false);
  const [hiddenKinds, setHiddenKinds] = useState<Set<string>>(new Set());
  const { g, error } = useGraph(gov);
  const live = useLive();
  const history = useRef<string[]>([]);

  const ix = useMemo(() => (g ? buildIndex(g) : null), [g]);
  const sel = g && selected && g.nodes[selected] ? selected : null;

  const chain = useMemo(() => (g && ix && sel ? authorityChain(g, ix, sel) : []), [g, ix, sel]);
  const lit = useMemo(() => {
    if (!g || !ix || !sel) return null;
    const s = new Set<string>([sel, g.root]);
    for (const h of chain) {
      s.add(h.from);
      s.add(h.to);
    }
    const { out, inc } = connections(g, ix, sel);
    for (const e of out) s.add(e.to);
    for (const e of inc) s.add(e.from);
    for (const c of g.nodes[sel].children ?? []) s.add(c);
    const n = g.nodes[sel];
    if (n.head) s.add(n.head);
    if (n.adminHead) s.add(n.adminHead);
    if (n.headOf) s.add(n.headOf);
    if (n.parent) s.add(n.parent);
    if (n.kind === "legislature") for (const c of Object.values(g.nodes)) if (c.parent === sel) s.add(c.id);
    return s;
  }, [g, ix, sel, chain]);

  // keep the URL in step without a navigation
  const go = useCallback(
    (nextGov: string, id: string | null, push = true) => {
      if (nextGov !== gov) setGov(nextGov);
      setSelected(id);
      setView("graph");
      const url = pathFor(nextGov, id);
      if (typeof window !== "undefined" && window.location.pathname !== url) {
        if (push) window.history.pushState({ gov: nextGov, id }, "", url);
        else window.history.replaceState({ gov: nextGov, id }, "", url);
      }
      if (id) history.current.push(`${nextGov}:${id}`);
    },
    [gov],
  );

  useEffect(() => {
    const onPop = () => {
      const parts = window.location.pathname.split("/").filter(Boolean);
      const ng = parts[0] && (parts[0] === "in" || govs.some((x) => x.gov === parts[0])) ? parts[0] : "in";
      setGov(ng);
      setSelected(parts[1] ? decodeURIComponent(parts[1]) : null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [govs]);

  const onSelect = useCallback(
    (id: string | null) => {
      if (!g) return;
      if (id && g.nodes[id]?.link) {
        // a State node on the Union wheel: step into that state's own wheel
        go(g.nodes[id].link!, g.nodes[id].linkId ?? null);
        return;
      }
      go(gov, id && id === sel ? null : id);
    },
    [g, gov, go, sel],
  );

  // keyboard: "/" or ⌘K search, Esc steps back up, ←/→ walk siblings
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (typing || searchOpen) return;
      if (e.key === "Escape") {
        if (sel && g) {
          const p = g.nodes[sel].parent ?? g.nodes[sel].headOf;
          go(gov, p && g.nodes[p] ? p : null);
        } else if (gov !== "in") go("in", `st-${gov}`);
      }
      if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && g && sel) {
        const n = g.nodes[sel];
        const sibs = Object.values(g.nodes)
          .filter((x) => x.sector === n.sector && x.ring === n.ring && !x.cluster === !n.cluster)
          .sort((a, b) => a.name.localeCompare(b.name));
        const i = sibs.findIndex((x) => x.id === sel);
        const next = sibs[(i + (e.key === "ArrowRight" ? 1 : -1) + sibs.length) % sibs.length];
        if (next) go(gov, next.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [g, gov, go, sel, searchOpen]);

  const summary = govs.find((x) => x.gov === gov);

  return (
    <div className="flex h-dvh w-full flex-col gap-2 overflow-hidden p-2 md:flex-row md:gap-3 md:p-3">
      {/* left rail */}
      <aside className="order-2 flex min-h-0 w-full flex-1 flex-col gap-2 md:order-1 md:w-[400px] md:flex-none md:gap-3 lg:w-[420px]">
        <Chrome gov={gov} govs={govs} g={g} selected={sel} onGo={go} />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-[var(--radius-panel)] [scrollbar-gutter:stable]">
          <AnimatePresence mode="wait" initial={false}>
            {g && sel ? (
              <motion.div
                key={`${gov}:${sel}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                <EntityPanel g={g} ix={ix!} id={sel} chain={chain} onGo={(id, gv) => go(gv ?? gov, id)} live={live} />
              </motion.div>
            ) : (
              <motion.div key={`home-${gov}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
                <HomePanel g={g} gov={gov} summary={summary} live={live} onGo={go} onPower={() => setView("power")} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>

      {/* the map */}
      <main className="relative order-1 h-[56dvh] min-h-[340px] w-full flex-none overflow-hidden rounded-[var(--radius-panel)] md:order-2 md:h-auto md:flex-1">
        <div className="absolute inset-0">
          {error && (
            <div className="grid h-full place-items-center p-8 text-center">
              <div>
                <p className="t-head">This map didn’t load.</p>
                <p className="t-small mt-1 text-ink-3">{error}. Check your connection and reload the page.</p>
              </div>
            </div>
          )}
          {view === "graph" && g && (
            <>
              <Wheel g={g} selected={sel} hover={hover} chain={chain} lit={lit} onSelect={onSelect} onHover={setHover} hidden={hiddenKinds} />
              <Directory g={g} onSelect={(id) => onSelect(id)} />
            </>
          )}
          {view === "power" && <PowerMap live={live} onPick={(nodeId, gv) => go(gv, nodeId)} />}
          {view === "states" && <StatesMap govs={govs} onPick={(code) => go(code, null)} />}
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2 md:p-3">
          <button
            onClick={() => setSearchOpen(true)}
            className="pointer-events-auto flex h-10 items-center gap-2 rounded-xl bg-card px-3 text-ink-3 shadow-card transition-colors hover:bg-card-2 hover:text-ink-1"
            aria-label="Search the government"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <span className="t-ui hidden sm:inline">Search bodies, offices, people</span>
            <kbd className="ml-2 hidden rounded border border-rule px-1.5 text-[11px] text-ink-4 lg:inline">/</kbd>
          </button>
          <LiveBadge live={live} />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-2 md:p-3">
          <div className="pointer-events-auto">{view === "graph" && <Legend hidden={hiddenKinds} onChange={setHiddenKinds} />}</div>
          <div className="pointer-events-auto">
            <ViewSwitch value={view} onChange={setView} />
          </div>
        </div>
      </main>

      <Search
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onPick={(gv, id) => {
          setSearchOpen(false);
          go(gv, id);
        }}
      />
    </div>
  );
}

const REPO_URL = "https://github.com/divyanshgandhi/sarkar-graph";

/** Live status and the source, as one pill: the map is live, and so is its code. */
function LiveBadge({ live }: { live: ReturnType<typeof useLive> }) {
  const t = live.updatedAt ? new Date(live.updatedAt) : null;
  return (
    <div className="pointer-events-auto flex h-10 items-stretch overflow-hidden rounded-xl bg-card shadow-card">
      <div className="flex items-center gap-2 pl-3 pr-2.5" title="News and changes refresh automatically">
        <span className={`h-2 w-2 rounded-full ${live.status === "live" ? "live-dot bg-saffron" : live.status === "error" ? "bg-ink-4" : "bg-well"}`} />
        <span className="t-meta text-ink-3">
          {live.status === "live" && t ? `Live · ${t.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}` : live.status === "error" ? "Offline" : "Connecting"}
        </span>
      </div>
      <span aria-hidden className="my-2.5 w-px bg-rule" />
      <a
        href={REPO_URL}
        target="_blank"
        rel="noreferrer"
        className="grid w-10 place-items-center text-ink-3 transition-colors hover:bg-card-2 hover:text-ink-1"
        aria-label="Sarkar Graph on GitHub (opens in a new tab)"
        title="Open source on GitHub"
      >
        <svg width="17" height="17" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
      </a>
    </div>
  );
}
