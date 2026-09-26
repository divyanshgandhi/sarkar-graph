#!/usr/bin/env python3
import json, re

BASE = "research/india/"
sample = json.load(open(BASE + "_audit_sample_raw.json"))
refetch = json.load(open(BASE + "_review_refetch.json"))

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
    return re.sub(r"\s+", " ", s).strip()

def fields_from_box(box):
    fields = {}
    if not box:
        return fields
    for line in box.split("\n"):
        m = re.match(r"\|\s*([a-zA-Z0-9_]+)\s*=\s*(.*)", line)
        if m:
            k, v = m.group(1).strip(), m.group(2).strip()
            if v or k not in fields:
                fields[k] = v
    return fields

idxs = [int(k) for k in refetch.keys()]
idxs.sort()
for idx in idxs:
    row = sample[idx]
    r = refetch[str(idx)]
    print(f"\n########## idx={idx} stratum={row['stratum']} rank={row['rank']}")
    print(f"CSV: {row['person_name']} | {row['position_title']} | since={row.get('since')!r} | party={row.get('party')!r} | gov={row.get('government')} | posid={row.get('position_id')}")
    if not r:
        print("  WIKI: not found")
        continue
    print(f"  WIKI title={r['title']}  (revision {r.get('timestamp')})  {r.get('note','')}")
    fields = fields_from_box(r.get("infobox"))
    offices = {k: clean(v) for k, v in fields.items() if re.match(r"^office\d*$|^order\d*$", k) and v}
    for k in sorted(offices, key=lambda x: (len(x), x)):
        suf = re.sub(r"^(office|order)", "", k)
        ts = clean(fields.get("term_start" + suf, ""))
        te = clean(fields.get("term_end" + suf, ""))
        pred = clean(fields.get("predecessor" + suf, ""))
        print(f"    [{k}] {offices[k]}  | start={ts or '?'} end={te or '(none)'} pred={pred}")
    party = clean(fields.get("party", ""))
    print(f"  party field: {party}")
