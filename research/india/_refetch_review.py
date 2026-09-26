#!/usr/bin/env python3
"""Re-fetch full (brace-matched) infobox wikitext for rows flagged needs_review
or low-confidence likely_correct, plus retry alternate searches for
cannot_verify rows. Writes a clean per-row text dump for manual adjudication."""
import json, re, time, urllib.request, urllib.parse, urllib.error

UA = "SarkarGraphResearchBot/1.0 (https://github.com/divyanshgandhi/sarkar-graph accuracy-audit) Python-urllib/3.14"
BASE = "research/india/"

def api_get(params):
    url = "https://en.wikipedia.org/w/api.php?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=15) as r:
                return json.load(r)
        except (urllib.error.URLError, TimeoutError):
            if attempt == 3:
                raise
            time.sleep(2.0 * (attempt + 1))

def opensearch(q):
    d = api_get({"action": "opensearch", "search": q, "limit": 5, "namespace": 0, "format": "json"})
    if d and len(d) > 1 and d[1]:
        return d[1]
    return []

def fetch_raw(title):
    d = api_get({"action": "query", "titles": title, "prop": "revisions|info",
                  "rvprop": "content|timestamp", "rvslots": "main",
                  "format": "json", "formatversion": 2, "redirects": 1})
    pages = d.get("query", {}).get("pages", [])
    if not pages or pages[0].get("missing"):
        return None
    p = pages[0]
    rev = p.get("revisions", [{}])[0]
    return {
        "canonical_title": p.get("title"),
        "content": rev.get("slots", {}).get("main", {}).get("content", ""),
        "timestamp": rev.get("timestamp", ""),
    }

def extract_braced(content, name="Infobox officeholder"):
    m = re.search(r"\{\{\s*" + name.replace(" ", "[ _]"), content, re.I)
    if not m:
        m = re.search(r"\{\{\s*Infobox[ _](?:politician|judge|person)\b", content, re.I)
        if not m:
            return None
    start = m.start()
    depth, i = 0, m.start()
    while i < len(content) - 1:
        if content[i:i+2] == "{{":
            depth += 1; i += 2; continue
        if content[i:i+2] == "}}":
            depth -= 1; i += 2
            if depth == 0:
                return content[start:i]
            continue
        i += 1
    return content[start:]

def title_from_wiki_url(url):
    if not url:
        return None
    m = re.search(r"/wiki/([^?#]+)", url)
    if not m:
        return None
    return urllib.parse.unquote(m.group(1)).replace("_", " ")

def main():
    sample = json.load(open(BASE + "_audit_sample_raw.json"))
    match_results = json.load(open(BASE + "_match_results.json"))
    review_idx = sorted(set(
        [o["idx"] for o in match_results if o["analysis"]["auto_verdict"] == "needs_review"] +
        [o["idx"] for o in match_results if o["analysis"]["auto_verdict"] == "likely_correct"
         and (o["analysis"]["match_score"] or 1) < 0.55] +
        [o["idx"] for o in match_results if o["analysis"]["auto_verdict"] == "cannot_verify"]
    ))
    print(f"re-fetching {len(review_idx)} rows", flush=True)
    results = {}
    for n, idx in enumerate(review_idx):
        row = sample[idx]
        title = title_from_wiki_url(row.get("wikipedia", ""))
        candidates = []
        if title:
            candidates.append(title)
        candidates += opensearch(row["person_name"])
        seen = set()
        found = None
        for cand in candidates:
            if cand in seen:
                continue
            seen.add(cand)
            try:
                raw = fetch_raw(cand)
            except Exception:
                raw = None
            if raw:
                box = extract_braced(raw["content"])
                if box:
                    found = {"title": raw["canonical_title"], "timestamp": raw["timestamp"], "infobox": box}
                    break
                else:
                    found = {"title": raw["canonical_title"], "timestamp": raw["timestamp"], "infobox": None,
                              "note": "page found but no officeholder infobox"}
            time.sleep(0.2)
        results[idx] = found
        if n % 10 == 0:
            print(f"{n}/{len(review_idx)}", flush=True)
        time.sleep(0.25)
    json.dump(results, open(BASE + "_review_refetch.json", "w"), indent=1, ensure_ascii=False)
    print("done, wrote", len(results))

if __name__ == "__main__":
    main()
