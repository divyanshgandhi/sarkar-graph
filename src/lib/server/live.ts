import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { ChangeItem, GovGraph, NewsItem, PowerPerson } from "../types.ts";
import { FEEDS, fetchFeed, type RawArticle } from "./feeds.ts";
import { Tagger, type AliasRow, type Mark, type PersonRow } from "./tagger.ts";

export interface LiveNews extends NewsItem {
  titleMarks: Mark[];
  summaryMarks: Mark[];
}
export interface LivePayload {
  updatedAt: string;
  windowDays: number;
  since: string;
  articleCount: number;
  sources: string[];
  news: LiveNews[];
  power: { people: PowerPerson[]; links: { from: string; to: string; type: string }[] };
  changes: { stats: { vacant: number; acting: number; lastChange?: string; seats: number }; items: ChangeItem[] };
  feedErrors: string[];
}

const WINDOW_DAYS = 90;
const DATA = join(process.cwd(), "data");

function readJson<T>(p: string, fallback: T): T {
  try {
    return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as T) : fallback;
  } catch {
    return fallback;
  }
}

let tagger: { t: Tagger; people: Record<string, PersonRow>; mtime: number } | null = null;
export function getTagger() {
  const peoplePath = join(DATA, "people.json");
  let mtime = 0;
  try {
    mtime = existsSync(peoplePath) ? Number(readFileSync(peoplePath).length) : 0;
  } catch {}
  if (tagger && tagger.mtime === mtime) return tagger;
  const aliases = readJson<AliasRow[]>(join(DATA, "alias-index.json"), []);
  const people = readJson<Record<string, PersonRow>>(peoplePath, {});
  const extra = readJson<Record<string, string[]>>(join(DATA, "person-aliases.json"), {});
  for (const [k, a] of Object.entries(extra)) if (people[k]) people[k].aliases = [...new Set([...(people[k].aliases || []), ...a])];
  // prominent = union ministers, chief ministers, governors, heads of constitutional bodies
  const TOP = new Set(["head_of_state", "vice_head_of_state", "head_of_government", "cabinet_minister", "chief_minister", "governor", "chief_justice", "leader_of_opposition", "presiding_officer"]);
  const prominent = new Set(
    Object.values(people)
      .filter((p) => TOP.has((p as PersonRow & { rank?: string }).rank ?? "") && p.gov === "in" || (p as PersonRow & { rank?: string }).rank === "chief_minister")
      .map((p) => p.key),
  );
  tagger = { t: new Tagger(aliases, people, prominent), people, mtime };
  return tagger;
}

let storeCache: { size: number; list: RawArticle[] } | null = null;
export function readStore(): RawArticle[] {
  const p = join(DATA, "news/store.json");
  let size = -1;
  try {
    size = existsSync(p) ? statSync(p).size + statSync(p).mtimeMs : -1;
  } catch {}
  if (storeCache && storeCache.size === size) return storeCache.list;
  storeCache = { size, list: readJson<RawArticle[]>(p, []) };
  return storeCache.list;
}

function unionGraph(): GovGraph | null {
  return readJson<GovGraph | null>(join(process.cwd(), "public/data/graph/in.json"), null);
}

export async function fetchAllFeeds(revalidate = 300): Promise<{ articles: RawArticle[]; errors: string[] }> {
  const res = await Promise.allSettled(FEEDS.map((f) => fetchFeed(f, { next: { revalidate }, signal: AbortSignal.timeout(12000) } as any)));
  const articles: RawArticle[] = [];
  const errors: string[] = [];
  res.forEach((r, i) => {
    if (r.status === "fulfilled") articles.push(...r.value);
    else errors.push(`${FEEDS[i].source}: ${(r.reason as Error)?.message ?? "failed"}`);
  });
  return { articles, errors };
}

let tagMemo: { tagger: Tagger | null; map: Map<string, { title: Mark[]; summary: Mark[] }> } = { tagger: null, map: new Map() };

export function composeLive(all: RawArticle[], now = new Date(), feedErrors: string[] = []): LivePayload {
  const { t, people } = getTagger();
  const since = new Date(now.getTime() - WINDOW_DAYS * 864e5);
  const seen = new Set<string>();
  const inWindow = all
    .filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      const d = new Date(a.publishedAt);
      return d >= since && d <= new Date(now.getTime() + 36e5);
    })
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  if (tagMemo.tagger !== t) tagMemo = { tagger: t, map: new Map() };
  const tagged = inWindow.map((a) => {
    let memo = tagMemo.map.get(a.id);
    if (!memo) {
      memo = { title: t.tag(a.title), summary: a.summary ? t.tag(a.summary) : [] };
      tagMemo.map.set(a.id, memo);
    }
    const titleMarks = memo.title;
    const summaryMarks = memo.summary;
    const ids = new Set<string>();
    const ppl = new Set<string>();
    for (const m of [...titleMarks, ...summaryMarks]) (m.id.startsWith("p:") ? ppl.add(m.id.slice(2)) : ids.add(m.id));
    for (const k of ppl) {
      const p = people[k];
      if (p?.nodeId) ids.add(p.nodeId);
    }
    const resolve = (ms: Mark[]) =>
      ms.map((m) => (m.id.startsWith("p:") ? { ...m, person: m.id.slice(2), id: people[m.id.slice(2)]?.nodeId ?? m.id } : m));
    return { a, titleMarks: resolve(titleMarks), summaryMarks: resolve(summaryMarks), entities: [...ids], people: [...ppl] };
  });

  // news rail: most recent tagged stories, one per headline
  const news: LiveNews[] = [];
  const titles = new Set<string>();
  for (const x of tagged) {
    if (!x.entities.length && !x.people.length) continue;
    const key = x.a.title.toLowerCase().slice(0, 60);
    if (titles.has(key)) continue;
    titles.add(key);
    news.push({
      id: x.a.id,
      title: x.a.title,
      summary: x.a.summary,
      url: x.a.url,
      source: x.a.source,
      publishedAt: x.a.publishedAt,
      entities: x.entities,
      people: x.people,
      image: x.a.image,
      titleMarks: x.titleMarks,
      summaryMarks: x.summaryMarks,
    });
    if (news.length >= 80) break;
  }

  // power map: mentions per person over the window (CivLab's heat = recent / total × window/7)
  const weeks = Math.ceil(WINDOW_DAYS / 7);
  const counts = new Map<string, { total: number; recent: number; weeks: number[]; latest?: RawArticle }>();
  for (const x of tagged) {
    const age = (now.getTime() - new Date(x.a.publishedAt).getTime()) / 864e5;
    const wk = Math.min(weeks - 1, Math.max(0, weeks - 1 - Math.floor(age / 7)));
    for (const k of x.people) {
      let c = counts.get(k);
      if (!c) counts.set(k, (c = { total: 0, recent: 0, weeks: new Array(weeks).fill(0) }));
      c.total++;
      c.weeks[wk]++;
      if (age <= 7) c.recent++;
      if (!c.latest || c.latest.publishedAt < x.a.publishedAt) c.latest = x.a;
    }
  }
  const top = [...counts.entries()]
    .filter(([k]) => people[k])
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 20);
  const powerPeople: PowerPerson[] = top.map(([k, c], i) => {
    const p = people[k];
    return {
      key: k,
      name: p.name,
      job: p.job,
      party: p.party,
      nodeId: p.nodeId,
      gov: p.gov,
      image: p.image,
      rank: i + 1,
      total: c.total,
      recent: c.recent,
      weeks: c.weeks,
      heat: c.total ? (c.recent / c.total) * (WINDOW_DAYS / 7) : 0,
      latest: c.latest ? { title: c.latest.title, url: c.latest.url, source: c.latest.source, at: c.latest.publishedAt } : undefined,
    };
  });
  const links: LivePayload["power"]["links"] = [];
  const ug = unionGraph();
  if (ug) {
    const byNode = new Map(powerPeople.filter((p) => p.gov === "in" && p.nodeId).map((p) => [p.nodeId!, p.key]));
    for (const e of ug.edges) {
      if (!["appoints", "advises_appointment", "nominates", "elects"].includes(e.type)) continue;
      const a = byNode.get(e.from),
        b = byNode.get(e.to);
      if (a && b && a !== b) links.push({ from: a, to: b, type: e.type });
    }
  }

  const changes = readJson<LivePayload["changes"]>(join(DATA, "changes.json"), { stats: { vacant: 0, acting: 0, seats: 0 }, items: [] });
  return {
    updatedAt: now.toISOString(),
    windowDays: WINDOW_DAYS,
    since: since.toISOString().slice(0, 10),
    articleCount: tagged.length,
    sources: [...new Set(inWindow.map((a) => a.source))].slice(0, 40),
    news,
    power: { people: powerPeople, links },
    changes,
    feedErrors,
  };
}
