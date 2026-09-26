import { XMLParser } from "fast-xml-parser";
import { createHash } from "node:crypto";

export interface RawArticle {
  id: string;
  title: string;
  summary?: string;
  url: string;
  source: string;
  publishedAt: string;
  image?: string;
}

export const FEEDS: { source: string; url: string; kind?: "gnews" }[] = [
  { source: "The Hindu", url: "https://www.thehindu.com/news/national/feeder/default.rss" },
  { source: "Indian Express", url: "https://indianexpress.com/section/political-pulse/feed/" },
  { source: "Indian Express", url: "https://indianexpress.com/section/india/feed/" },
  { source: "Hindustan Times", url: "https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml" },
  { source: "NDTV", url: "https://feeds.feedburner.com/ndtvnews-india-news" },
  { source: "Economic Times", url: "https://economictimes.indiatimes.com/news/politics-and-nation/rssfeeds/1052732854.cms" },
  { source: "Bar & Bench", url: "https://www.barandbench.com/feed" },
];

export const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 SarkarGraph/0.1 (+https://github.com/divyanshgandhi/sarkar-graph)";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  cdataPropName: "#cdata",
  textNodeName: "#text",
  trimValues: true,
  processEntities: true,
  htmlEntities: true,
});

function text(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (Array.isArray(v)) return text(v[0]);
  const o = v as Record<string, unknown>;
  return text(o["#cdata"] ?? o["#text"] ?? "");
}

export function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/&#8216;|&lsquo;/g, "‘")
    .replace(/&#8220;|&ldquo;/g, "“")
    .replace(/&#8221;|&rdquo;/g, "”")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#8212;|&mdash;/g, "—")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&#39;/g, "'")
    .replace(/\]\]>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function hashId(url: string): string {
  return createHash("sha1").update(url).digest("hex").slice(0, 16);
}

function firstSentences(s: string, max = 240): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const dot = cut.lastIndexOf(". ");
  return (dot > 80 ? cut.slice(0, dot + 1) : cut.replace(/\s+\S*$/, "") + "…").trim();
}

export function parseFeed(xml: string, source: string, gnews = false): RawArticle[] {
  const doc = parser.parse(xml);
  const items = doc?.rss?.channel?.item ?? doc?.feed?.entry ?? [];
  const list = Array.isArray(items) ? items : [items];
  const out: RawArticle[] = [];
  for (const it of list) {
    let title = stripHtml(text(it.title));
    let url = text(it.link?.["@href"] ?? it.link);
    if (!title || !url) continue;
    const pub = text(it.pubDate ?? it.published ?? it.updated ?? it["dc:date"]);
    const d = pub ? new Date(pub) : null;
    if (!d || Number.isNaN(d.getTime())) continue;
    let src = source;
    if (gnews) {
      const s = text(it.source);
      if (s) src = s;
      title = title.replace(new RegExp(`\\s+-\\s+${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), "");
    }
    const desc = stripHtml(text(it.description ?? it.summary ?? ""));
    const media = it["media:content"]?.["@url"] ?? it["media:thumbnail"]?.["@url"] ?? it.enclosure?.["@url"];
    url = url.trim();
    out.push({
      id: hashId(url),
      title,
      summary: desc && !gnews && desc !== title ? firstSentences(desc) : undefined,
      url,
      source: src,
      publishedAt: d.toISOString(),
      image: typeof media === "string" && /^https:\/\//.test(media) ? media : undefined,
    });
  }
  return out;
}

export async function fetchFeed(f: { source: string; url: string; kind?: string }, init?: RequestInit & { next?: { revalidate: number } }): Promise<RawArticle[]> {
  const res = await fetch(f.url, { ...init, headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml" } });
  if (!res.ok) throw new Error(`${f.source}: HTTP ${res.status}`);
  return parseFeed(await res.text(), f.source, f.kind === "gnews");
}
