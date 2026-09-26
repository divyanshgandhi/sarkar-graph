// Grow the local news archive that powers "Latest news" and the Power map.
//   node --experimental-strip-types scripts/ingest-news.ts               # live feeds only
//   node --experimental-strip-types scripts/ingest-news.ts --backfill 90  # + one Google News sweep per day
// Run from the project root (a cron / GitHub Action can run it every 15 minutes).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FEEDS, UA, fetchFeed, parseFeed, type RawArticle } from "../src/lib/server/feeds.ts";
import { composeLive } from "../src/lib/server/live.ts";

const ROOT = process.cwd();
const DIR = join(ROOT, "data/news");
const STORE = join(DIR, "store.json");
const DONE = join(DIR, "backfill-done.json");
mkdirSync(DIR, { recursive: true });
mkdirSync(join(ROOT, "public/data/live"), { recursive: true });

const store: RawArticle[] = existsSync(STORE) ? JSON.parse(readFileSync(STORE, "utf8")) : [];
const done: Record<string, number> = existsSync(DONE) ? JSON.parse(readFileSync(DONE, "utf8")) : {};
const byId = new Map(store.map((a) => [a.id, a]));
const byTitle = new Set(store.map((a) => a.title.toLowerCase().slice(0, 80)));
let added = 0;
const add = (list: RawArticle[]) => {
  for (const a of list) {
    const tk = a.title.toLowerCase().slice(0, 80);
    if (byId.has(a.id) || byTitle.has(tk)) continue;
    byId.set(a.id, a);
    byTitle.add(tk);
    added++;
  }
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 1. live feeds
const live = await Promise.allSettled(FEEDS.map((f) => fetchFeed(f)));
live.forEach((r, i) => (r.status === "fulfilled" ? add(r.value) : console.warn(`feed failed: ${FEEDS[i].source}: ${(r.reason as Error).message}`)));
console.log(`feeds: +${added}`);

// 2. optional backfill: date-bounded Google News searches, several government beats per day
const QUERIES = [
  "(minister OR ministry) India",
  '("chief minister" OR governor OR "deputy chief minister")',
  '("lok sabha" OR "rajya sabha" OR parliament OR MPs) India',
  '("supreme court" OR "high court" OR CJI OR tribunal) India',
  '("election commission" OR RBI OR SEBI OR CAG OR UPSC OR "NITI Aayog")',
  "(BJP OR Congress OR opposition) India",
];
const bi = process.argv.indexOf("--backfill");
if (bi > 0) {
  const days = Number(process.argv[bi + 1] ?? 90);
  const today = new Date();
  let n = 0;
  for (let d = 1; d <= days; d++) {
    const day = new Date(today.getTime() - d * 864e5);
    const next = new Date(day.getTime() + 864e5);
    const a = day.toISOString().slice(0, 10),
      b = next.toISOString().slice(0, 10);
    for (const q of QUERIES) {
      const key = `${a}|${q}`;
      if (done[key]) continue;
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} after:${a} before:${b}`)}&hl=en-IN&gl=IN&ceid=IN:en`;
      try {
        const r = await fetch(url, { headers: { "User-Agent": UA } });
        if (r.status === 429 || r.status === 503) {
          console.warn(`\nrate limited at ${a}; stopping here, rerun later to continue`);
          d = days + 1;
          break;
        }
        if (r.ok) {
          const before = added;
          add(parseFeed(await r.text(), "Google News", true));
          done[key] = added - before + 1;
        }
      } catch (e) {
        console.warn(`\n${a}: ${(e as Error).message}`);
      }
      n++;
      if (n % 12 === 0) {
        writeFileSync(DONE, JSON.stringify(done));
        process.stdout.write(`\rbackfill ${a}  +${added}   `);
      }
      await sleep(650);
    }
  }
  writeFileSync(DONE, JSON.stringify(done));
  console.log(`\nbackfill done: +${added} total`);
}

// 3. prune + save
const cutoff = new Date(Date.now() - 100 * 864e5).toISOString();
const all = [...byId.values()].filter((a) => a.publishedAt >= cutoff).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
writeFileSync(STORE, JSON.stringify(all));

// 4. a static snapshot for hosts without a server runtime
const snap = composeLive(all, new Date());
writeFileSync(join(ROOT, "public/data/live/snapshot.json"), JSON.stringify(snap));
console.log(
  `archive: ${all.length} articles · tagged ${snap.articleCount} · power map top: ${snap.power.people
    .slice(0, 5)
    .map((p) => `${p.name} (${p.total})`)
    .join(", ")}`,
);
