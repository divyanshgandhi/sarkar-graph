import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { RawArticle } from "./feeds.ts";
import { composeLive, fetchAllFeeds, readStore, type LivePayload } from "./live.ts";

// One shared snapshot per server instance; feeds are refetched at most every 90s.
let current: { at: number; payload: LivePayload } | null = null;
let inflight: Promise<LivePayload> | null = null;
const TTL = 90_000;

// A long-running server keeps its own archive growing (read-only hosts just skip this).
let archiveWritable = true;
async function archive(store: RawArticle[], fresh: RawArticle[]) {
  if (!archiveWritable) return;
  const known = new Set(store.map((a) => a.id));
  const titles = new Set(store.map((a) => a.title.toLowerCase().slice(0, 80)));
  const add = fresh.filter((a) => !known.has(a.id) && !titles.has(a.title.toLowerCase().slice(0, 80)));
  if (!add.length) return;
  const cutoff = new Date(Date.now() - 100 * 864e5).toISOString();
  const next = [...add, ...store].filter((a) => a.publishedAt >= cutoff).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  try {
    await writeFile(join(process.cwd(), "data/news/store.json"), JSON.stringify(next));
  } catch {
    archiveWritable = false;
  }
}

export async function getLive(force = false): Promise<LivePayload> {
  if (!force && current && Date.now() - current.at < TTL) return current.payload;
  if (inflight) return inflight;
  inflight = (async () => {
    const [{ articles, errors }, store] = [await fetchAllFeeds(240), readStore()];
    const payload = composeLive([...articles, ...store], new Date(), errors);
    current = { at: Date.now(), payload };
    void archive(store, articles);
    return payload;
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}
