#!/usr/bin/env python3
"""Fetch fresh Wikipedia data for the accuracy-audit sample.
Reads _audit_sample_raw.json, writes _audit_fetch_results.json with
extracted infobox fields + raw wikitext snippet per row, using ONLY
Wikipedia's API (reputable, fresh, official current revision).
"""
import json, re, time, urllib.request, urllib.parse, urllib.error

UA = "SarkarGraphResearchBot/1.0 (https://github.com/divyanshgandhi/sarkar-graph accuracy-audit) Python-urllib/3.14"

def api_get(params):
    url = "https://en.wikipedia.org/w/api.php?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=15) as r:
                return json.load(r)
        except (urllib.error.URLError, TimeoutError) as e:
            if attempt == 3:
                raise
            time.sleep(2.0 * (attempt + 1))

def title_from_wiki_url(url):
    if not url:
        return None
    m = re.search(r"/wiki/([^?#]+)", url)
    if not m:
        return None
    return urllib.parse.unquote(m.group(1)).replace("_", " ")

def opensearch(name):
    d = api_get({"action": "opensearch", "search": name, "limit": 3, "namespace": 0, "format": "json"})
    if d and len(d) > 1 and d[1]:
        return d[1][0]
    return None

def get_infobox_and_meta(title):
    d = api_get({
        "action": "query", "titles": title, "prop": "revisions|info",
        "rvprop": "content|timestamp", "rvslots": "main",
        "format": "json", "formatversion": 2, "redirects": 1,
    })
    pages = d.get("query", {}).get("pages", [])
    if not pages or pages[0].get("missing"):
        return None
    page = pages[0]
    rev = page.get("revisions", [{}])[0]
    content = rev.get("slots", {}).get("main", {}).get("content", "")
    timestamp = rev.get("timestamp", "")
    canonical_title = page.get("title", title)
    # extract Infobox officeholder / Infobox politician block
    m = re.search(r"\{\{\s*Infobox[ _]officeholder(.*?)\n\}\}", content, re.S | re.I)
    if not m:
        m = re.search(r"\{\{\s*Infobox[ _](?:politician|judge)(.*?)\n\}\}", content, re.S | re.I)
    infobox = m.group(0) if m else ""
    fields = {}
    for line in infobox.split("\n"):
        fm = re.match(r"\|\s*([a-zA-Z0-9_]+)\s*=\s*(.*)", line)
        if fm:
            key, val = fm.group(1).strip(), fm.group(2).strip()
            if key not in fields or val:
                fields[key] = val
    return {
        "canonical_title": canonical_title,
        "revision_timestamp": timestamp,
        "infobox_fields": fields,
        "url": "https://en.wikipedia.org/wiki/" + canonical_title.replace(" ", "_"),
    }

def main():
    sample = json.load(open("research/india/_audit_sample_raw.json"))
    results = []
    for i, row in enumerate(sample):
        entry = {"idx": i, "person_key": row["person_key"], "person_name": row["person_name"],
                  "position_title": row["position_title"], "rank": row["rank"], "party_csv": row.get("party", ""),
                  "since_csv": row.get("since", ""), "government": row.get("government", ""),
                  "position_id": row.get("position_id", ""), "stratum": row["stratum"]}
        title = title_from_wiki_url(row.get("wikipedia", ""))
        try:
            info = None
            if title:
                info = get_infobox_and_meta(title)
            if info is None:
                guess = opensearch(row["person_name"] + (" politician" if row["rank"] in
                    ("member_of_parliament","member_of_legislature","cabinet_minister","chief_minister",
                     "state_minister","minister_of_state","mos_independent_charge","deputy_chief_minister",
                     "leader_of_opposition") else ""))
                if not guess:
                    guess = opensearch(row["person_name"])
                if guess:
                    info = get_infobox_and_meta(guess)
                    entry["title_guessed"] = True
            if info:
                entry.update(info)
                entry["fetch_status"] = "ok"
            else:
                entry["fetch_status"] = "no_wikipedia_page_found"
        except Exception as e:
            entry["fetch_status"] = "error"
            entry["error"] = str(e)
        results.append(entry)
        if i % 10 == 0:
            print(f"{i}/{len(sample)} done", flush=True)
        time.sleep(0.3)
    json.dump(results, open("research/india/_audit_fetch_results.json", "w"), indent=1, ensure_ascii=False)
    print("wrote", len(results), "results")

if __name__ == "__main__":
    main()
