"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { SECTOR_INK, partyInk } from "@/lib/graph";
import type { GNode, Holder } from "@/lib/types";
import { Glyph } from "../wheel/Glyph";
import { seatState } from "../wheel/Wheel";

export function Card({ children, className = "", pad = true }: { children: React.ReactNode; className?: string; pad?: boolean }) {
  return <section className={`rounded-[var(--radius-panel)] bg-card shadow-card ${pad ? "px-[var(--gutter)] py-5" : ""} ${className}`}>{children}</section>;
}

export function CardTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="t-head">{children}</h2>
      {aside}
    </div>
  );
}

export function initials(name: string) {
  const parts = name.replace(/^(Dr|Shri|Smt|Justice|Gen|Adm|Air Chief Marshal)\.?\s+/i, "").split(/\s+/).filter((p) => p.length > 1 || /[A-Z]/.test(p));
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function Avatar({ holder, size = 44, ring }: { holder?: Holder | null; size?: number; ring?: string }) {
  const [bad, setBad] = useState(false);
  const img = holder?.image && !bad ? holder.image : null;
  return (
    <span
      className="relative grid flex-none place-items-center overflow-hidden rounded-full bg-well text-ink-3"
      style={{
        width: size,
        height: size,
        boxShadow: ring ? `0 0 0 2px var(--card), 0 0 0 3.5px ${ring}` : undefined,
      }}
    >
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt="" width={size} height={size} loading="lazy" className="h-full w-full object-cover object-top" onError={() => setBad(true)} referrerPolicy="no-referrer" />
      ) : (
        <span className="font-[600]" style={{ fontSize: Math.max(11, size * 0.34) }}>
          {holder?.name ? initials(holder.name) : "—"}
        </span>
      )}
    </span>
  );
}

export function PartyChip({ party }: { party?: string }) {
  if (!party) return null;
  return (
    <span className="t-meta inline-flex items-center gap-1 rounded-md bg-card-2 px-1.5 py-0.5 text-ink-2">
      <span className="h-2 w-2 rounded-full" style={{ background: partyInk(party) }} />
      {party}
    </span>
  );
}

export function NodeGlyph({ n, size = 14 }: { n: GNode; size?: number }) {
  return (
    <svg width={size + 4} height={size + 4} viewBox={`${-(size + 4) / 2} ${-(size + 4) / 2} ${size + 4} ${size + 4}`} aria-hidden className="flex-none">
      <Glyph shape={n.shape === "seal" ? "office" : n.shape} s={size * 0.78} ink={SECTOR_INK[n.sector]} wash="transparent" state={seatState(n)} />
    </svg>
  );
}

export function EntityRow({ n, sub, onClick, right }: { n: GNode; sub?: React.ReactNode; onClick?: () => void; right?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-start gap-2.5 rounded-xl border border-rule px-3 py-2.5 text-left transition-colors hover:border-transparent hover:bg-card-2"
    >
      <span className="mt-0.5">
        <NodeGlyph n={n} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="t-ui block leading-snug">{n.name}</span>
        {sub && <span className="t-meta mt-0.5 block text-ink-4">{sub}</span>}
      </span>
      {right}
    </button>
  );
}

export function Clamp({ text, lines = 4 }: { text: string; lines?: number }) {
  const [open, setOpen] = useState(false);
  const [needs, setNeeds] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) setNeeds(el.scrollHeight > el.clientHeight + 2);
  }, [text]);
  return (
    <div>
      <p
        ref={ref}
        className="t-body text-ink-2"
        style={open ? undefined : { display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" }}
      >
        {text}
      </p>
      {(needs || open) && (
        <button onClick={() => setOpen((o) => !o)} className="t-small mt-1 text-ink-4 hover:text-ink-1">
          {open ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="flex gap-1 rounded-xl bg-well p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={`t-ui relative h-8 flex-1 rounded-lg px-2 transition-colors ${value === t.id ? "text-ink-1" : "text-ink-3 hover:text-ink-1"}`}
        >
          {value === t.id && <motion.span layoutId="panel-tab" className="absolute inset-0 rounded-lg bg-card shadow-card" transition={{ type: "spring", stiffness: 520, damping: 40 }} />}
          <span className="relative z-10">
            {t.label}
            {t.count != null && <span className="ml-1 text-ink-4 tnum">{t.count}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-card-2 px-3 py-2.5">
      <div className="t-label text-ink-4">{label}</div>
      <div className="mt-1 text-[19px] font-[620] leading-none tracking-[-0.01em] tnum">{value}</div>
      {sub && <div className="t-meta mt-1 text-ink-4">{sub}</div>}
    </div>
  );
}

export function domainOf(u: string) {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u.slice(0, 40);
  }
}

export function relTime(iso: string, now = Date.now()) {
  const d = (now - new Date(iso).getTime()) / 1000;
  if (d < 90) return "just now";
  if (d < 3600) return `${Math.round(d / 60)} min ago`;
  if (d < 86400) return `${Math.round(d / 3600)} h ago`;
  const days = Math.round(d / 86400);
  if (days < 30) return `${days} d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
