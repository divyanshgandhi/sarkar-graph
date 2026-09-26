#!/usr/bin/env python3
import json, csv, sys, math
sys.path.insert(0, "research/india")
from _manual_verdicts import MANUAL, BONUS_FINDING

BASE = "research/india/"

sample = json.load(open(BASE + "_audit_sample_raw.json"))
match_results = json.load(open(BASE + "_match_results.json"))
match_by_idx = {o["idx"]: o for o in match_results}

STRATA_ORDER = ["top_offices", "legislators", "officials", "state_min", "everything_else"]

rows_out = []
for idx, row in enumerate(sample):
    m = match_by_idx[idx]
    a = m["analysis"]
    if idx in MANUAL:
        entry = MANUAL[idx]
        verdict, source, note = entry[0], entry[1], entry[2]
        correction = entry[3] if len(entry) > 3 else None
        correction_fields = entry[4] if len(entry) > 4 else None
    else:
        # trusted from automated pass (likely_correct, score>=0.55, date+party agree)
        verdict = "correct"
        source = m["fetch"].get("url")
        note = "Automated cross-check: office-title match score %.2f; %s" % (
            a["match_score"] if a["match_score"] is not None else -1, a["auto_reason"])
        correction = None
        correction_fields = None

    rows_out.append({
        "idx": idx,
        "stratum": row["stratum"],
        "rank": row["rank"],
        "person_key": row["person_key"],
        "person_name": row["person_name"],
        "position_title": row["position_title"],
        "position_id": row["position_id"],
        "government": row["government"],
        "party_csv": row.get("party", ""),
        "since_csv": row.get("since", ""),
        "verdict": verdict,
        "source_checked": source or "",
        "note": note,
    })

# ---- write audit-sample csv ----
csv_path = BASE.replace("research/india/", "") + "audit-sample-2026-09-25.csv"
with open(csv_path, "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=["idx", "stratum", "rank", "person_key", "person_name",
                                        "position_title", "position_id", "government",
                                        "party_csv", "since_csv", "verdict", "source_checked", "note"])
    w.writeheader()
    for r in rows_out:
        w.writerow(r)
print("wrote", csv_path)

# ---- stats per stratum ----
def wilson(x, n, z=1.96):
    if n == 0:
        return (0, 0, 0)
    phat = x / n
    denom = 1 + z**2 / n
    center = phat + z**2 / (2 * n)
    margin = z * math.sqrt(phat * (1 - phat) / n + z**2 / (4 * n**2))
    lo = (center - margin) / denom
    hi = (center + margin) / denom
    return (phat, max(0, lo), min(1, hi))

ERROR_VERDICTS = {"wrong_holder", "wrong_party", "wrong_since", "now_vacant"}

stats = {}
for stratum in STRATA_ORDER:
    srows = [r for r in rows_out if r["stratum"] == stratum]
    n = len(srows)
    errors = [r for r in srows if r["verdict"] in ERROR_VERDICTS]
    cannot = [r for r in srows if r["verdict"] == "cannot_verify"]
    correct = [r for r in srows if r["verdict"] == "correct"]
    n_resolved = n - len(cannot)
    phat, lo, hi = wilson(len(errors), n_resolved) if n_resolved else (0, 0, 0)
    stats[stratum] = {
        "n": n, "correct": len(correct), "errors": len(errors), "cannot_verify": len(cannot),
        "n_resolved": n_resolved, "error_rate": phat, "ci_lo": lo, "ci_hi": hi,
        "error_rows": errors,
    }

overall_n = len(rows_out)
overall_errors = [r for r in rows_out if r["verdict"] in ERROR_VERDICTS]
overall_cannot = [r for r in rows_out if r["verdict"] == "cannot_verify"]
overall_resolved = overall_n - len(overall_cannot)
o_phat, o_lo, o_hi = wilson(len(overall_errors), overall_resolved)

print("\n=== STRATUM STATS ===")
for s in STRATA_ORDER:
    st = stats[s]
    print(f"{s}: n={st['n']} correct={st['correct']} errors={st['errors']} cannot_verify={st['cannot_verify']} "
          f"error_rate(among resolved)={st['error_rate']:.3f} [{st['ci_lo']:.3f},{st['ci_hi']:.3f}]")
print(f"OVERALL: n={overall_n} errors={len(overall_errors)} cannot_verify={len(overall_cannot)} "
      f"error_rate(among resolved)={o_phat:.3f} [{o_lo:.3f},{o_hi:.3f}]")

json.dump({"stats": {k: {kk: vv for kk, vv in v.items() if kk != "error_rows"} for k, v in stats.items()},
           "overall": {"n": overall_n, "errors": len(overall_errors), "cannot_verify": len(overall_cannot),
                        "n_resolved": overall_resolved, "error_rate": o_phat, "ci_lo": o_lo, "ci_hi": o_hi}},
          open(BASE + "_stats.json", "w"), indent=2)

# ---- corrections json ----
corrections = []
for r in rows_out:
    idx = r["idx"]
    if idx in MANUAL and len(MANUAL[idx]) > 3:
        entry = MANUAL[idx]
        posid, fields = entry[3], entry[4]
        corrections.append({
            "id": posid,
            "set": fields,
            "source": entry[1],
            "reason": entry[2],
            "by": "accuracy-audit agent",
            "date": "2026-09-25",
        })

# bonus finding (outside the random sample, found via cross-referencing)
bonus_corrections = []
for idx, entry in BONUS_FINDING.items():
    verdict, source, note, posid, fields = entry
    bonus_corrections.append({
        "id": posid,
        "set": fields,
        "source": source,
        "reason": note,
        "by": "accuracy-audit agent",
        "date": "2026-09-25",
    })

json.dump(corrections, open(BASE.replace("research/india/", "") + "data/corrections/audit-2026-09-25.json", "w"), indent=2)
json.dump(bonus_corrections, open(BASE + "_bonus_corrections.json", "w"), indent=2)
print("\nwrote", len(corrections), "corrections (in-sample) +", len(bonus_corrections), "bonus correction(s)")

# print error list for report drafting
print("\n=== ERROR ROWS ===")
for r in overall_errors:
    print(r["idx"], r["stratum"], r["person_name"], "|", r["verdict"], "|", r["note"][:140])

print("\n=== cannot_verify counts by stratum ===")
for s in STRATA_ORDER:
    print(s, stats[s]["cannot_verify"], "/", stats[s]["n"])
