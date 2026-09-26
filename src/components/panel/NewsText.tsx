"use client";

import { SECTOR_INK } from "@/lib/graph";
import type { Mark } from "@/lib/server/tagger";

export function govOfId(id: string) {
  const m = /^st-([a-z]{2})(?:-|$)/.exec(id);
  return m ? m[1] : "in";
}

const SECTOR_HINT: [RegExp, keyof typeof SECTOR_INK][] = [
  [/lok-sabha|rajya-sabha|parliament|assembly|-mp-|speaker|legislative/, "legislative"],
  [/court|hc-|judge|tribunal|justice/, "judicial"],
  [/eci|cag|upsc|rbi|sebi|commission|lokpal|cvc|cic|trai|cci/, "constitutional"],
];
function inkFor(id: string) {
  for (const [re, s] of SECTOR_HINT) if (re.test(id)) return SECTOR_INK[s];
  return SECTOR_INK.executive;
}

/** Text with tagged spans turned into links onto the map. */
export function NewsText({ text, marks, onGo }: { text: string; marks: Mark[]; onGo: (id: string, gov: string) => void }) {
  if (!marks?.length) return <>{text}</>;
  const out: React.ReactNode[] = [];
  let at = 0;
  const sorted = [...marks].sort((a, b) => a.start - b.start);
  sorted.forEach((m, i) => {
    if (m.start < at) return;
    if (m.start > at) out.push(text.slice(at, m.start));
    const label = text.slice(m.start, m.end);
    const id = m.id;
    const clickable = !id.startsWith("p:");
    out.push(
      clickable ? (
        <button
          key={i}
          onClick={(e) => {
            e.stopPropagation();
            onGo(id, govOfId(id));
          }}
          className="inline items-baseline underline decoration-[color:var(--rule)] decoration-1 underline-offset-[3px] transition-colors hover:decoration-current"
          style={{ color: "inherit" }}
        >
          <span className="mr-[3px] inline-block h-[7px] w-[7px] translate-y-[-1px] rounded-[2px]" style={{ background: inkFor(id) }} aria-hidden />
          {label}
        </button>
      ) : (
        <span key={i}>{label}</span>
      ),
    );
    at = m.end;
  });
  if (at < text.length) out.push(text.slice(at));
  return <>{out}</>;
}
