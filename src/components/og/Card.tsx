// Share card rendered by next/og (Satori): plain inline styles only.
export function chakraPaths(r: number) {
  const out: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 0; i < 24; i++) {
    const a = (i * Math.PI * 2) / 24;
    out.push({ x1: r * 0.2 * Math.cos(a), y1: r * 0.2 * Math.sin(a), x2: r * 0.94 * Math.cos(a), y2: r * 0.94 * Math.sin(a) });
  }
  return out;
}

export function OgCard({ title, sub, kicker }: { title: string; sub?: string; kicker?: string }) {
  const r = 150;
  return (
    <div style={{ width: 1200, height: 630, display: "flex", background: "#ece8df", color: "#1c1a16", fontFamily: "sans-serif", position: "relative" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1200, height: 8, display: "flex" }}>
        <div style={{ flex: 1, background: "#e3741b" }} />
        <div style={{ flex: 1, background: "#fbf9f5" }} />
        <div style={{ flex: 1, background: "#1f7a3c" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 0 0 80px", width: 760 }}>
        {kicker && <div style={{ fontSize: 26, color: "#5b554c", marginBottom: 18 }}>{kicker}</div>}
        <div style={{ fontSize: title.length > 42 ? 58 : 72, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1.5 }}>{title}</div>
        {sub && <div style={{ fontSize: 32, color: "#3b3731", marginTop: 26, lineHeight: 1.3 }}>{sub}</div>}
        <div style={{ fontSize: 24, color: "#8a8378", marginTop: 48, display: "flex" }}>Sarkar Graph · who runs India, traced back to the voter</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 440 }}>
        <svg width={r * 2 + 20} height={r * 2 + 20} viewBox={`${-r - 10} ${-r - 10} ${r * 2 + 20} ${r * 2 + 20}`}>
          <circle r={r} fill="#f7e3cf" />
          <circle r={r * 0.72} fill="none" stroke="#34419a" strokeWidth={6} />
          {chakraPaths(r * 0.72).map((l, i) => (
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#34419a" strokeWidth={2.4} />
          ))}
          <circle r={r * 0.13} fill="#34419a" />
        </svg>
      </div>
    </div>
  );
}
