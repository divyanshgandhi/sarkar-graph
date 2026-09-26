"""Reproduce seat-level provenance and image gaps from generated CSV exports."""

import csv
import re
from collections import Counter
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "research" / date.today().isoformat() / "seat_audit.csv"


def read(name):
    with (ROOT / "exports" / name).open(newline="") as f:
        return list(csv.DictReader(f))


people = read("people.csv")
sources = {row["url"]: row for row in read("sources.csv")}
issues = Counter()
rows = []
for person in people:
    citations = [s.strip() for s in person["sources"].split(" | ") if s.strip()]
    plain = [s for s in citations if s.startswith(("https://", "http://")) and not re.search(r"\s", s)]
    missing = [s for s in plain if s not in sources]
    if missing:
        raise AssertionError(f"Source export omitted {person['position_id']}: {missing}")
    flags = []
    if person["person_name"]:
        types = {sources[s]["source_type"] for s in plain}
        if person["confidence"] == "high" and "official" not in types:
            flags.append("high_without_official_seat_source")
        if person["confidence"] == "high" and len(plain) == len(citations) and types == {"encyclopedia"}:
            flags.append("high_wikipedia_only")
        if not person["photo"]:
            flags.append("photo_missing")
        if not person["since"]:
            flags.append("since_missing")
        elif not re.fullmatch(r"\d{4}(?:-\d{2}(?:-\d{2})?)?", person["since"]):
            flags.append("since_not_iso")
        if person["vacant"] == "yes":
            flags.append("held_and_vacant")
    if len(plain) != len(citations):
        flags.append("source_not_plain_url")
    if not flags:
        continue
    issues.update(flags)
    rows.append({k: person[k] for k in ("position_id", "person_key", "person_name", "body_id", "body", "gov_code", "government", "confidence", "photo", "sources") } | {"flags": " | ".join(flags)})

if issues["high_wikipedia_only"]:
    raise AssertionError(f"{issues['high_wikipedia_only']} Wikipedia-only seats are still marked high")
if issues["held_and_vacant"]:
    raise AssertionError(f"{issues['held_and_vacant']} seats have both a holder and vacant=yes")

OUT.parent.mkdir(parents=True, exist_ok=True)
with OUT.open("w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)
print(f"{len(rows)} flagged seats -> {OUT}")
for flag, count in issues.most_common():
    print(f"{flag}: {count}")
