# Licensing

**Decided for v0.1.0 (2026-09-26):** code under the **MIT License** ([`LICENSE`](LICENSE)); the dataset under
**CC BY 4.0** ([`LICENSE-DATA`](LICENSE-DATA)). News headlines and summaries in `data/news/` stay with their
publishers and are included only as attributed links. The reasoning that led to this choice is kept below.

## Reasoning

- **Code** (`src/`, `scripts/`, everything that isn't the dataset itself): **MIT License.** Permissive, simple,
  standard for an open-source web app, and compatible with the Next.js/React/TypeScript ecosystem this project
  is built on.

- **Dataset** (`data/raw/*.json`, `data/corrections/*.json`, `public/data/graph/*.json`, and the
  `exports/*.csv` files derived from them): **CC BY 4.0**, with **ODbL 1.0** as the alternative worth weighing.
  See the trade-off below.

## Why code and data are licensed separately

They're different kinds of thing with different reuse patterns. Someone forking the app to build a similar
graph for another country wants a permissive code license (MIT). Someone building a downstream product on the
*dataset itself* — a research tool, a journalism dashboard, another visualisation — needs a data-appropriate
license, which is a different legal instrument (data isn't reliably covered by software licenses like MIT in
every jurisdiction, and India's own government data typically ships under data-specific terms, e.g. the
National Data Sharing and Accessibility Policy).

## CC BY 4.0 vs. ODbL 1.0 for the dataset

| | **CC BY 4.0** | **ODbL 1.0** |
|---|---|---|
| What it requires of reusers | Attribution only. | Attribution **and** share-alike: any public redistribution of the database (or a derivative database) must stay under ODbL too. |
| Best fit when | You want maximum reuse — including by closed/commercial products that just credit the source — and you're optimizing for the data spreading as widely as possible (e.g. into journalism, research, other civic-tech tools). | You want to guarantee that anyone who builds on this dataset and redistributes their version keeps *their* version open too — protecting against a closed fork that out-competes the open original. |
| Downsides | A company could take the dataset, improve it privately, and never contribute anything back — legally fine under CC BY, since it only requires credit. | Share-alike on *data* (as opposed to code) is legally less battle-tested and can create friction for well-intentioned reusers (e.g. a researcher combining this dataset with other differently-licensed data may have to think harder about compatibility). ODbL is also less recognized than CC licenses outside data-specialist circles, which can be a barrier to adoption. |
| Precedent | Widely used for civic/open datasets, Wikipedia media, many government open-data portals. | Used by OpenStreetMap and similar large collaborative geodata projects where preventing closed forks is a core design goal. |

**Our read:** since the goal stated for this project is maximum reach — the most people and the most tools
using an accurate map of the Indian government, including journalists and researchers who may combine it with
other sources — CC BY 4.0's lower friction probably serves the mission better than ODbL's share-alike guarantee.
But this is the maintainer's call, not a settled decision, and reasonable people could weigh the anti-enclosure
protection of ODbL more heavily. **Do not treat this section as the license** — it's the reasoning to help the
maintainer decide.

## What happens once a decision is made

1. Add the chosen `LICENSE` file(s) to the repository root (and/or `data/LICENSE` if code and data licenses
   differ, which is the expected outcome here).
2. Update this file to state the decision plainly instead of "pending," and update `README.md`'s licence
   section to point at it.
3. Add SPDX license identifiers/headers where the project's conventions call for them.
4. Confirm the chosen data license is compatible with every third-party source cited in `exports/sources.csv` —
   in particular, Wikipedia-sourced content is CC BY-SA 4.0, which has its own share-alike terms; if the
   dataset retains any material that is more than a bare fact drawn from Wikipedia (e.g. reused descriptive
   text), that compatibility needs to be checked explicitly before publishing under CC BY 4.0.

## Not affected by this decision

Regardless of which license is chosen, the underlying facts this project maps (who legally holds a public
office, what a ministry's legal basis is, etc.) are drawn from public government sources and are not, by
themselves, anyone's proprietary property — only *this project's specific compilation, formatting, and
presentation* of those facts is what a license here governs.
