// Portraits for every office-holder with a Wikipedia page (thumbnail URLs, hot-linked like CivLab).
//   node --experimental-strip-types scripts/fetch-images.ts
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const RAW = join(ROOT, "data/raw");
const OUT = join(ROOT, "data/images.json");
const UA = "SarkarGraph/0.1 (civic map of the Government of India; contact via repository)";

const titles = new Set<string>();
const collect = (h: any) => {
  const u: string | undefined = h?.wikipedia;
  if (!u || !/wikipedia\.org\/wiki\//.test(u)) return;
  const t = decodeURIComponent(u.split("/wiki/")[1].split("#")[0]).replace(/_/g, " ").trim();
  if (t) titles.add(t);
};
for (const f of readdirSync(RAW).filter((x) => x.endsWith(".json"))) {
  try {
    const d = JSON.parse(readFileSync(join(RAW, f), "utf8"));
    for (const p of d.positions ?? []) collect(p.holder);
  } catch {}
}

// --refresh refetches everything (use after changing the filters below).
const refresh = process.argv.includes("--refresh");
const images: Record<string, string> = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const todo = [...titles].filter((t) => refresh || !(t in images));
let failed = 0;

// A person's title that redirects to an election, constituency or list article would hand them that
// article's lead photo (a newly elected MLA without a page of their own gets whoever tops the infobox),
// and some office pages lead with an emblem. Only keep a photo from the person's own page.
const NOT_A_PERSON = /election|constituency|legislative|assembly|council|cabinet|ministry|list of|party|government|parliament|lok sabha|rajya sabha|governor of|minister of|family|dynasty/i;
const NOT_A_PHOTO = /\.svg|emblem|logo|flag[_ ]of|seal[_ ]of|coat[_ ]of[_ ]arms|_map|locator/i;
const tokens = (t: string) => new Set(t.toLowerCase().replace(/\(.*?\)/g, "").split(/[^a-z]+/).filter((w) => w.length > 2));
// Spelling variants redirect too (Selvaganapathi → Selvaganapathy, Vanshidhar → Banshidhar Brajwasi).
const letters = (t: string) => [...tokens(t)].join("");
const similarity = (a: string, b: string) => {
  const d = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0]++;
    for (let j = 1; j <= b.length; j++) [prev, d[j]] = [d[j], Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))];
  }
  return 1 - d[b.length] / Math.max(a.length, b.length, 1);
};
const samePerson = (from: string, to: string) => {
  if (NOT_A_PERSON.test(to) && !NOT_A_PERSON.test(from)) return false;
  const a = tokens(from);
  return [...tokens(to)].some((w) => a.has(w)) || similarity(letters(from), letters(to)) >= 0.75;
};
console.log(`${titles.size} people with Wikipedia pages, ${todo.length} to fetch`);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < todo.length; i += 50) {
  const batch = todo.slice(i, i + 50);
  const url =
    "https://en.wikipedia.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      titles: batch.join("|"),
      prop: "pageimages",
      piprop: "thumbnail",
      pithumbsize: "320",
      pilicense: "any",
      redirects: "1",
      format: "json",
      formatversion: "2",
    });
  let json: any = null;
  for (let attempt = 0; attempt < 5 && !json; attempt++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20_000) });
      if (r.ok) json = await r.json();
      else await sleep(Number(r.headers.get("retry-after")) * 1000 || 4000 * (attempt + 1));
    } catch {
      await sleep(1500 * (attempt + 1));
    }
  }
  if (!json) {
    failed += batch.length; // keep whatever we had for these titles
    continue;
  }
  // Map each final page back to every requested title that reached it (several can redirect to one page).
  const norm = new Map<string, string>();
  for (const n of json.query?.normalized ?? []) norm.set(n.to, n.from);
  const redirectOf = new Map<string, string>();
  for (const r of json.query?.redirects ?? []) redirectOf.set(r.from, r.to);
  const pages = new Map<string, any>((json.query?.pages ?? []).map((p: any) => [p.title, p]));
  for (const t of batch) {
    const n = [...norm].find(([, from]) => from === t)?.[0] ?? t;
    const final = redirectOf.get(n) ?? n;
    const src: string = pages.get(final)?.thumbnail?.source ?? "";
    images[t] = src && !NOT_A_PERSON.test(n) && (final === n || samePerson(n, final)) && !NOT_A_PHOTO.test(decodeURIComponent(src)) ? src : "";
  }
  for (const t of batch) if (!(t in images)) images[t] = "";
  process.stdout.write(`\r${Math.min(i + 50, todo.length)}/${todo.length}`);
  await sleep(700);
}
for (const k of Object.keys(images)) if (!images[k]) delete images[k];
writeFileSync(OUT, JSON.stringify(images, null, 0));
console.log(`\n${Object.keys(images).length} portraits → data/images.json${failed ? ` (${failed} titles not refreshed: API errors)` : ""}`);
