// Headline counts for press assets, read from the compiled data at request time (never hand-typed).
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { GovGraph } from "@/lib/types";

export interface PressStats {
  seats: number;
  held: number;
  governments: number;
  gaps: number;
  asOf: string;
  states: { code: string; name: string }[];
}

export function pressStats(): PressStats {
  const dir = join(process.cwd(), "public/data/graph");
  let seats = 0,
    held = 0,
    governments = 0,
    asOf = "";
  const states: { code: string; name: string }[] = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    const g: GovGraph = JSON.parse(readFileSync(join(dir, f), "utf8"));
    governments++;
    if (g.gov !== "in") states.push({ code: g.gov, name: g.name });
    asOf ||= g.asOf;
    for (const n of Object.values(g.nodes)) {
      if (n.isPosition) {
        seats++;
        if (n.holder) held++;
      }
      for (const m of n.members ?? []) {
        seats++;
        if (m.holder) held++;
      }
    }
  }
  let gaps = 0;
  try {
    gaps = readFileSync(join(process.cwd(), "exports/gaps.csv"), "utf8").trim().split("\n").length - 1;
  } catch {}
  states.sort((a, b) => a.name.localeCompare(b.name));
  return { seats, held, governments, gaps, asOf, states };
}
