#!/usr/bin/env python3
"""Draw the reproducible stratified random sample of 150 filled rows for the
2026-09-25 accuracy audit. Writes research/india/_audit_sample_raw.json.
Re-running this against an unchanged exports/people.csv reproduces the same
150 person_keys (random.Random(20260925), per-stratum random.sample)."""
import csv, random, json
from collections import defaultdict

BASE = ""

with open(BASE + "exports/people.csv") as f:
    r = csv.DictReader(f)
    rows = list(r)

filled = [row for row in rows if row.get("vacant", "").strip().lower() != "yes" and row.get("person_name", "").strip()]

TOP_OFFICES = {"head_of_state", "vice_head_of_state", "head_of_government", "chief_minister", "governor",
               "lieutenant_governor", "administrator", "cabinet_minister", "mos_independent_charge",
               "chief_justice", "presiding_officer", "leader_of_opposition"}
LEGISLATORS = {"member_of_parliament", "member_of_legislature"}
OFFICIALS = {"secretary", "head_of_agency", "chief_of_staff", "commission_member"}
STATE_MIN = {"state_minister", "minister_of_state", "deputy_chief_minister"}

strata = defaultdict(list)
for row in filled:
    rank = row.get("rank", "")
    if rank in TOP_OFFICES:
        strata["top_offices"].append(row)
    elif rank in LEGISLATORS:
        strata["legislators"].append(row)
    elif rank in OFFICIALS:
        strata["officials"].append(row)
    elif rank in STATE_MIN:
        strata["state_min"].append(row)
    else:
        strata["everything_else"].append(row)

SAMPLE_SIZES = {"top_offices": 40, "legislators": 40, "officials": 30, "state_min": 20, "everything_else": 20}

rng = random.Random(20260925)
sample = []
for stratum, n in SAMPLE_SIZES.items():
    chosen = rng.sample(strata[stratum], n)
    for row in chosen:
        row = dict(row)
        row["stratum"] = stratum
        sample.append(row)

json.dump(sample, open(BASE + "research/india/_audit_sample_raw.json", "w"), indent=1, ensure_ascii=False)
print("wrote", len(sample), "sampled rows")
for s in SAMPLE_SIZES:
    print(s, sum(1 for row in sample if row["stratum"] == s))

if __name__ == "__main__":
    pass
