import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { GovGraph, GovSummary } from "../types.ts";

// Cached per file version, so a data rebuild is picked up without restarting the server.
const cache = new Map<string, { v: number; g: GovGraph | null }>();
export function readGraph(gov: string): GovGraph | null {
  if (!/^[a-z]{2}$/.test(gov)) return null;
  const p = join(process.cwd(), "public/data/graph", `${gov}.json`);
  let v = -1;
  try {
    v = statSync(p).mtimeMs;
  } catch {
    return null;
  }
  const hit = cache.get(gov);
  if (hit && hit.v === v) return hit.g;
  let g: GovGraph | null = null;
  try {
    g = JSON.parse(readFileSync(p, "utf8"));
  } catch {}
  cache.set(gov, { v, g });
  return g;
}

export function readGovs(): GovSummary[] {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "src/data/govs.json"), "utf8"));
  } catch {
    return [];
  }
}
