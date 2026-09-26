"use client";

import { useEffect, useState } from "react";
import type { GovGraph } from "./types";

const cache = new Map<string, Promise<GovGraph>>();

export function loadGraph(gov: string): Promise<GovGraph> {
  if (!cache.has(gov)) {
    const p = fetch(`/data/graph/${gov}.json`).then((r) => {
      if (!r.ok) throw new Error(`Could not load the ${gov} graph (${r.status})`);
      return r.json() as Promise<GovGraph>;
    });
    p.catch(() => cache.delete(gov));
    cache.set(gov, p);
  }
  return cache.get(gov)!;
}

export function useGraph(gov: string) {
  const [state, setState] = useState<{ gov: string; g: GovGraph | null; error: string | null }>({ gov, g: null, error: null });
  useEffect(() => {
    let alive = true;
    loadGraph(gov)
      .then((g) => alive && setState({ gov, g, error: null }))
      .catch((e: Error) => alive && setState({ gov, g: null, error: e.message }));
    return () => {
      alive = false;
    };
  }, [gov]);
  return state.gov === gov ? state : { gov, g: null, error: null };
}
