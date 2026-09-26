#!/usr/bin/env python3
"""Merge fetch results with CSV sample rows; produce a draft verdict + evidence
note for each row based on Wikipedia infobox field matching. This is a
first-pass MECHANICAL comparison — every row is still reviewed by hand before
the final audit files are written (rows flagged draft_verdict='needs_review'
get closest attention, but all get a skim).
"""
import json, re

BASE = "research/india/"
sample = json.load(open(BASE + "_audit_sample_raw.json"))
fetched = json.load(open(BASE + "_audit_fetch_results.json"))
fetch_by_idx = {f["idx"]: f for f in fetched}

MONTHS = ["january","february","march","april","may","june","july",
          "august","september","october","november","december"]

def clean_wikitext(s):
    if not s:
        return ""
    s = re.sub(r"<ref[^>]*/?>.*?</ref>", "", s, flags=re.S)
    s = re.sub(r"<ref[^>]*/>", "", s)
    s = re.sub(r"\{\{efn.*?\}\}", "", s, flags=re.S)
    s = re.sub(r"\[\[(?:[^\]|]*\|)?([^\]]*)\]\]", r"\1", s)
    s = re.sub(r"'''?", "", s)
    s = re.sub(r"<br\s*/?>", "; ", s)
    return s.strip()

def extract_date(s):
    s = clean_wikitext(s)
    m = re.search(r"(\d{1,2})\s+(" + "|".join(MONTHS) + r")\s+(\d{4})", s, re.I)
    if m:
        day, mon, year = m.groups()
        return (int(year), MONTHS.index(mon.lower()) + 1, int(day))
    m = re.search(r"\{\{start date[^}]*\|(\d{4})\|(\d{1,2})\|(\d{1,2})", s, re.I)
    if m:
        y, mo, d = m.groups()
        return (int(y), int(mo), int(d))
    m = re.search(r"(\d{4})", s)
    if m:
        return (int(m.group(1)), None, None)
    return None

def since_ym(since):
    if not since:
        return None
    parts = since.split("-")
    try:
        y = int(parts[0])
        mo = int(parts[1]) if len(parts) > 1 else None
        d = int(parts[2]) if len(parts) > 2 else None
        return (y, mo, d)
    except Exception:
        return None

def dates_agree_to_month(csv_date, wiki_date):
    if not csv_date or not wiki_date:
        return None  # cannot compare
    if csv_date[0] != wiki_date[0]:
        return False
    if csv_date[1] and wiki_date[1] and csv_date[1] != wiki_date[1]:
        return False
    return True

out = []
for i, row in enumerate(sample):
    f = fetch_by_idx.get(i, {})
    fields = f.get("infobox_fields", {})
    notes = []
    draft = "needs_review"

    if f.get("fetch_status") != "ok":
        draft = "needs_review"
        notes.append("no wikipedia infobox found via API; needs manual source lookup")
    else:
        # term_start candidates: try numbered variants for multi-term infoboxes (office2, term_start2...)
        office_fields = {k: v for k, v in fields.items() if k.startswith("office") or k.startswith("order")}
        term_starts = {k: v for k, v in fields.items() if k.startswith("term_start")}
        term_ends = {k: v for k, v in fields.items() if k.startswith("term_end")}
        party = fields.get("party", "")
        notes.append(f"wiki_url={f.get('url')}")
        notes.append(f"office_fields={office_fields}")
        notes.append(f"term_start={term_starts}")
        notes.append(f"term_end={term_ends}")
        notes.append(f"party_field={party}")

    out.append({
        "idx": i, "row": row, "fetch": f, "draft_verdict": draft, "notes": notes,
    })

json.dump(out, open(BASE + "_adjudication_draft.json", "w"), indent=1, ensure_ascii=False)
print("wrote", len(out), "draft adjudication rows")
n_ok = sum(1 for o in out if o["fetch"].get("fetch_status") == "ok")
print("fetch ok:", n_ok, "/ 150")
