"use client";

import { useEffect, useRef, useState } from "react";
import type { LivePayload } from "./server/live";

export type LiveState = {
  status: "connecting" | "live" | "error";
  data: LivePayload | null;
  updatedAt: string | null;
  fresh: Set<string>; // news ids that arrived after first load
};

// Server-sent events first; if the stream drops, fall back to polling the JSON snapshot.
export function useLive(): LiveState {
  const [state, setState] = useState<LiveState>({ status: "connecting", data: null, updatedAt: null, fresh: new Set() });
  const known = useRef<Set<string> | null>(null);

  useEffect(() => {
    let es: EventSource | null = null;
    let poll: ReturnType<typeof setInterval> | undefined;
    let alive = true;

    const accept = (p: LivePayload) => {
      if (!alive || !p || !Array.isArray(p.news)) return;
      const fresh = new Set<string>();
      if (known.current) for (const n of p.news) if (!known.current.has(n.id)) fresh.add(n.id);
      known.current = new Set(p.news.map((n) => n.id));
      setState((s) => ({ status: "live", data: p, updatedAt: p.updatedAt, fresh: fresh.size ? fresh : s.fresh }));
    };
    const pollOnce = () =>
      fetch("/api/live")
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then(accept)
        .catch(() => alive && setState((s) => ({ ...s, status: s.data ? "live" : "error" })));

    const startPolling = () => {
      if (poll) return;
      pollOnce();
      poll = setInterval(pollOnce, 90_000);
    };

    if (typeof EventSource !== "undefined") {
      es = new EventSource("/api/live/stream");
      es.addEventListener("snapshot", (e) => {
        try {
          accept(JSON.parse((e as MessageEvent).data));
        } catch {}
      });
      let failures = 0;
      es.onerror = () => {
        failures++;
        if (failures >= 2) {
          es?.close();
          startPolling();
        }
      };
    } else startPolling();

    const onVis = () => {
      if (document.visibilityState === "visible" && poll) pollOnce();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      es?.close();
      if (poll) clearInterval(poll);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return state;
}
