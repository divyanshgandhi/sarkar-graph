#!/usr/bin/env python3
import json, re, difflib

BASE = "research/india/"
MONTHS = ["january","february","march","april","may","june","july",
          "august","september","october","november","december"]

def clean(s):
    if not s:
        return ""
    s = re.sub(r"<ref[^>]*/?>.*?</ref>", "", s, flags=re.S)
    s = re.sub(r"<ref[^>]*/>", "", s)
    s = re.sub(r"\{\{small\|(.*?)\}\}", r"(\1)", s)
    s = re.sub(r"\{\{[^{}]*\}\}", "", s)
    s = re.sub(r"\[\[(?:[^\]|]*\|)?([^\]]*)\]\]", r"\1", s)
    s = re.sub(r"'''?", "", s)
    s = re.sub(r"<br\s*/?>", "; ", s)
    s = re.sub(r"^\d+(st|nd|rd|th)\s+", "", s.strip())
    return s.strip()

def parse_date(s):
    s = clean(s)
    m = re.search(r"(\d{1,2})\s+(" + "|".join(MONTHS) + r")\s+(\d{4})", s, re.I)
    if m:
        day, mon, year = m.groups()
        return (int(year), MONTHS.index(mon.lower()) + 1, int(day))
    m = re.search(r"(\d{4})", s)
    if m:
        return (int(m.group(1)), None, None)
    return None

def since_ym(since):
    if not since:
        return None
    parts = since.split("-")
    try:
        y = int(parts[0]); mo = int(parts[1]) if len(parts) > 1 else None
        d = int(parts[2]) if len(parts) > 2 else None
        return (y, mo, d)
    except Exception:
        return None

PARTY_FULLNAME = {
    "BJP": "Bharatiya Janata Party", "INC": "Indian National Congress", "TDP": "Telugu Desam Party",
    "SP": "Samajwadi Party", "AAP": "Aam Aadmi Party", "JD(U)": "Janata Dal United",
    "TVK": "Tamilaga Vettri Kazhagam", "SHS": "Shiv Sena", "DMK": "Dravida Munnetra Kazhagam",
    "AITC": "All India Trinamool Congress", "TMC": "Trinamool Congress", "IND": "Independent",
    "NCP": "Nationalist Congress Party", "NPP": "National People's Party", "BJD": "Biju Janata Dal",
    "YSRCP": "YSR Congress Party", "RJD": "Rashtriya Janata Dal", "JKNC": "National Conference",
    "CPI(M)": "Communist Party of India Marxist", "BRS": "Bharat Rashtra Samithi",
    "NPF": "Naga People's Front", "SKM": "Sikkim Krantikari Morcha",
    "AIADMK": "All India Anna Dravida Munnetra Kazhagam", "JMM": "Jharkhand Mukti Morcha",
    "ZPM": "Zoram People's Movement", "IUML": "Indian Union Muslim League", "JSP": "Jana Sena Party",
    "LJP(RV)": "Lok Janshakti Party Ram Vilas", "JD(S)": "Janata Dal Secular",
    "SS(UBT)": "Shiv Sena Uddhav Balasaheb Thackeray", "AD(S)": "Apna Dal Soneylal",
    "NCP(SP)": "Nationalist Congress Party Sharadchandra Pawar", "RLD": "Rashtriya Lok Dal",
    "CPI": "Communist Party of India", "AIMIM": "All India Majlis-e-Ittehadul Muslimeen",
    "AINRC": "All India N.R. Congress", "AGP": "Asom Gana Parishad", "BPF": "Bodoland People's Front",
    "MNF": "Mizo National Front", "HAM(S)": "Hindustani Awam Morcha Secular", "KEC": "Kerala Congress",
    "SBSP": "Suheldev Bharatiya Samaj Party", "CPI(ML)L": "Communist Party of India Marxist-Leninist Liberation",
    "RLM": "Rashtriya Lok Morcha", "BAP": "Bharat Adivasi Party", "PPA": "People's Party of Arunachal",
    "UDP": "United Democratic Party", "NISHAD Party": "Nishad Party", "RSP": "Revolutionary Socialist Party",
    "VCK": "Viduthalai Chiruthaigal Katchi", "PMK": "Pattali Makkal Katchi",
    "RPI(A)": "Republican Party of India Athavale", "Independent": "Independent", "BSP": "Bahujan Samaj Party",
    "JKPDP": "Peoples Democratic Party", "VPP": "Voice of the People Party",
    "UPPL": "United People's Party Liberal", "MDMK": "Marumalarchi Dravida Munnetra Kazhagam",
    "PDA": "Progressive Democratic Alliance", "GFP": "Goa Forward Party",
    "MGP": "Maharashtrawadi Gomantak Party", "SDF": "Sikkim Democratic Front",
    "DMDK": "Desiya Murpokku Dravida Kazhagam", "AJSU": "All Jharkhand Students Union",
    "HJC": "Hindustan Janata Congress",
}

def party_matches(csv_party, wiki_party_raw):
    csv_party = (csv_party or "").strip()
    wiki_clean = clean(wiki_party_raw)
    wiki_clean = re.sub(r"\((?:since|from|w\.?e\.?f\.?)[^)]*\)", "", wiki_clean, flags=re.I).strip()
    wiki_clean = re.sub(r"\d{4}.*$", "", wiki_clean).strip().rstrip(";,")
    if not csv_party:
        return True, "no csv party to check"
    if not wiki_clean:
        return None, "no wiki party field"
    full = PARTY_FULLNAME.get(csv_party)
    if full:
        full_words = set(w.lower() for w in re.split(r"[^a-zA-Z]+", full) if len(w) > 2)
        wiki_words = set(w.lower() for w in re.split(r"[^a-zA-Z]+", wiki_clean) if len(w) > 2)
        overlap = full_words & wiki_words
        if len(overlap) >= max(1, len(full_words) - 1):
            return True, f"csv={csv_party} ~ wiki={wiki_clean}"
        return False, f"csv={csv_party} ({full}) vs wiki={wiki_clean}"
    # fallback: simple containment
    if csv_party.lower() in wiki_clean.lower() or wiki_clean.lower() in csv_party.lower():
        return True, f"csv={csv_party} ~ wiki={wiki_clean} (containment)"
    return None, f"unmapped csv party {csv_party!r} vs wiki={wiki_clean!r}"

def title_similarity(a, b):
    a = re.sub(r"[^a-z ]", "", clean(a).lower())
    b = re.sub(r"[^a-z ]", "", b.lower())
    return difflib.SequenceMatcher(None, a, b).ratio()

def best_office_match(fields, position_title):
    """Find the numbered office key in infobox_fields whose text best matches position_title."""
    offices = {k: v for k, v in fields.items() if re.match(r"^office\d*$", k) or re.match(r"^order\d*$", k)}
    if not offices:
        return None, None, 0.0
    best_key, best_val, best_score = None, None, -1
    for k, v in offices.items():
        score = title_similarity(v, position_title)
        if score > best_score:
            best_key, best_val, best_score = k, v, score
    suffix = re.sub(r"^(office|order)", "", best_key) if best_key else ""
    return best_key, suffix, best_score

def get_suffixed(fields, base, suffix):
    return fields.get(base + suffix, fields.get(base) if suffix == "" else None)

def analyze(row, fetch):
    result = {"auto_verdict": None, "auto_reason": "", "office_matched": None,
              "term_start_found": None, "term_end_found": None, "party_found": None,
              "match_score": None}
    if fetch.get("fetch_status") != "ok":
        result["auto_verdict"] = "cannot_verify"
        result["auto_reason"] = "no wikipedia page found via API search"
        return result
    fields = fetch.get("infobox_fields", {})
    key, suffix, score = best_office_match(fields, row["position_title"])
    result["office_matched"] = fields.get(key) if key else None
    result["match_score"] = round(score, 2)
    ts = get_suffixed(fields, "term_start", suffix or "")
    te = get_suffixed(fields, "term_end", suffix or "")
    result["term_start_found"] = ts
    result["term_end_found"] = te
    result["party_found"] = fields.get("party", "")

    if score < 0.35:
        result["auto_verdict"] = "needs_review"
        result["auto_reason"] = f"low office-title match score {score:.2f}; manual check needed"
        return result

    if te and te.strip() not in ("", "Incumbent"):
        result["auto_verdict"] = "needs_review"
        result["auto_reason"] = f"matched office has a term_end ({clean(te)}); may no longer hold seat"
        return result

    csv_since = since_ym(row.get("since", ""))
    wiki_start = parse_date(ts) if ts else None
    date_note = "no comparable date"
    if csv_since and wiki_start:
        if csv_since[0] == wiki_start[0] and (not csv_since[1] or not wiki_start[1] or csv_since[1] == wiki_start[1]):
            date_note = "since date agrees to month"
        else:
            date_note = f"MISMATCH csv={csv_since} wiki={wiki_start}"

    csv_party = (row.get("party") or "").strip()
    match, detail = party_matches(csv_party, result["party_found"])
    if match is True:
        party_note = "agrees (" + detail + ")"
    elif match is False:
        party_note = "MISMATCH " + detail
    else:
        party_note = "UNCERTAIN " + detail

    result["auto_reason"] = f"office_score={score:.2f}; date={date_note}; party={party_note}"
    if "MISMATCH" in date_note or "MISMATCH" in party_note:
        result["auto_verdict"] = "needs_review"
    else:
        result["auto_verdict"] = "likely_correct"
    return result

def main():
    sample = json.load(open(BASE + "_audit_sample_raw.json"))
    fetched = json.load(open(BASE + "_audit_fetch_results.json"))
    fetch_by_idx = {f["idx"]: f for f in fetched}
    out = []
    for i, row in enumerate(sample):
        f = fetch_by_idx.get(i, {})
        a = analyze(row, f)
        out.append({"idx": i, "row": row, "fetch": f, "analysis": a})
    json.dump(out, open(BASE + "_match_results.json", "w"), indent=1, ensure_ascii=False)
    from collections import Counter
    c = Counter(o["analysis"]["auto_verdict"] for o in out)
    print(c)

if __name__ == "__main__":
    main()
