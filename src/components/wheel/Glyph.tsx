import { memo } from "react";
import type { Shape } from "@/lib/types";

export type SeatState = "filled" | "acting" | "vacant" | "unverified";

interface GlyphProps {
  shape: Shape | "dot";
  s: number;
  ink: string;
  wash: string;
  state?: SeatState;
  strong?: boolean;
}

function poly(n: number, r: number, rot = -Math.PI / 2) {
  return Array.from({ length: n }, (_, i) => {
    const a = rot + (i * 2 * Math.PI) / n;
    return `${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
}

/** Shapes are drawn "up = away from the centre"; the caller rotates them onto their spoke. */
export const Glyph = memo(function Glyph({ shape, s, ink, wash, state = "filled", strong }: GlyphProps) {
  const sw = s >= 12 ? 1.5 : s >= 8 ? 1.25 : 1;
  const dash = state === "acting" ? "2.4 1.6" : state === "vacant" ? "0.2 2.2" : undefined;
  const fill = state === "vacant" ? "var(--card)" : wash;
  const common = {
    fill,
    stroke: ink,
    strokeWidth: state === "vacant" ? sw + 0.4 : sw,
    strokeDasharray: dash,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    vectorEffect: "non-scaling-stroke" as const,
  };
  const h = s / 2;
  let body: React.ReactNode;
  switch (shape) {
    case "office":
      body = (
        <>
          <circle r={h} {...common} />
          {strong && <circle r={h - 3.2} fill="none" stroke={ink} strokeWidth={0.9} opacity={0.7} />}
        </>
      );
      break;
    case "head": {
      const hr = s * 0.25;
      body = (
        <>
          <path
            d={`M${-s * 0.44},${s * 0.46} C${-s * 0.44},${s * 0.08} ${-s * 0.2},${s * 0.02} 0,${s * 0.02} C${s * 0.2},${s * 0.02} ${s * 0.44},${s * 0.08} ${s * 0.44},${s * 0.46} Z`}
            {...common}
          />
          <circle cy={-s * 0.2} r={hr} {...common} />
        </>
      );
      break;
    }
    case "commission": {
      const k = s * 0.74;
      body = <rect x={-k / 2} y={-k / 2} width={k} height={k} rx={1.6} transform="rotate(45)" {...common} />;
      break;
    }
    case "advisory":
      body = <polygon points={poly(6, h * 0.98, 0)} {...common} />;
      break;
    case "court":
      body = <polygon points={poly(5, h * 1.05)} {...common} />;
      break;
    case "force":
      body = <polygon points={poly(8, h, -Math.PI / 2 + Math.PI / 8)} {...common} />;
      break;
    case "corporation":
      body = (
        <>
          <rect x={-h} y={-h} width={s} height={s} rx={2.5} {...common} />
          {s > 9 && <rect x={-h + 2.6} y={-h + 2.6} width={s - 5.2} height={s - 5.2} rx={1.4} fill="none" stroke={ink} strokeWidth={0.9} />}
        </>
      );
      break;
    case "committee":
      body = <rect x={-s * 0.4} y={-s * 0.62} width={s * 0.8} height={s * 1.24} rx={s * 0.4} {...common} />;
      break;
    case "state":
      body = (
        <>
          <circle r={h} {...common} />
          <circle r={h * 0.36} fill={ink} />
        </>
      );
      break;
    case "district":
      body = <circle r={h} {...common} />;
      break;
    case "tier":
      body = <polygon points={poly(3, h * 1.1)} {...common} />;
      break;
    case "dot":
      body = <rect x={-h} y={-h} width={s} height={s} rx={s < 3 ? s / 2 : 0.9} fill={ink} opacity={0.78} />;
      break;
    default: {
      const rx = s < 6 ? s / 2 : s < 10 ? 2 : 3.2;
      body = <rect x={-h} y={-h} width={s} height={s} rx={rx} {...common} />;
    }
  }
  return (
    <>
      {body}
      {state === "unverified" && shape !== "dot" && <circle cx={h * 0.9} cy={-h * 0.9} r={1.6} fill="var(--card)" stroke={ink} strokeWidth={0.8} />}
    </>
  );
});

/** The Ashoka Chakra: 24 spokes, the wheel at the centre of the flag — here, the People. */
export function Chakra({ r, ink, spin = 0 }: { r: number; ink: string; spin?: number }) {
  // coordinates rounded so server and client render byte-identical paths (no hydration drift)
  const f = (v: number) => +v.toFixed(3);
  const spokes = Array.from({ length: 24 }, (_, i) => (i * 2 * Math.PI) / 24 + (spin * Math.PI) / 180);
  const inner = r * 0.2;
  return (
    <g>
      <circle r={r} fill="none" stroke={ink} strokeWidth={Math.max(1.2, r * 0.045)} />
      <circle r={inner} fill={ink} opacity={0.9} />
      {spokes.map((a, i) => {
        const x1 = f(inner * Math.cos(a)),
          y1 = f(inner * Math.sin(a));
        const x2 = f(r * 0.94 * Math.cos(a)),
          y2 = f(r * 0.94 * Math.sin(a));
        // tapered spoke: a thin kite from hub to rim
        const w = r * 0.028;
        const nx = -Math.sin(a) * w,
          ny = Math.cos(a) * w;
        const mx = r * 0.55 * Math.cos(a),
          my = r * 0.55 * Math.sin(a);
        return <path key={i} d={`M${x1},${y1} L${f(mx + nx)},${f(my + ny)} L${x2},${y2} L${f(mx - nx)},${f(my - ny)} Z`} fill={ink} opacity={0.85} />;
      })}
      {spokes.map((a, i) => {
        const b = a + Math.PI / 24;
        return <circle key={`c${i}`} cx={f(r * 0.985 * Math.cos(b))} cy={f(r * 0.985 * Math.sin(b))} r={f(r * 0.028)} fill={ink} />;
      })}
    </g>
  );
}
