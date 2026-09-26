# People and portraits audit — 25 September 2026

**Snapshot note:** Counts and "current row" descriptions below refer to the 3,403-gap, 7,774-seat export inspected before the corrections later on 25 September. Eight misleading portrait assignments have since been removed, and the Maharashtra Lokayukta Institution chair corrected. The current export has 7,775 seats, 7,588 named rows, 1,784 photo rows, 6,407 name slugs and 9,409 gaps after citation-policy downgrades. Stable `position_id` values identify the affected records.

Scope: `exports/people.csv` (7,774 seat rows), its `photo` and `wikipedia` fields, and the image/identity path in `scripts/fetch-images.ts`, `scripts/build-graph.ts`, and `scripts/export.ts`. No canonical data was edited. Web findings below were checked on 25 September 2026. A CSV seat's `confidence=high` is **not** evidence that its portrait or person identity was verified.

## Measured coverage and failure modes

| Measurement from CSV | Count | Meaning |
|---|---:|---|
| Named seat rows | 7,587 | 187 seat rows have no named holder. |
| Seat rows with a photo URL | 1,792 / 7,587 (23.6%) | Repeated offices of one person count repeatedly. |
| Distinct `person_key` values with any photo | 1,376 / 6,402 (21.5%) | This is only a name-slug proxy for people; homonyms below make the denominator an undercount. |
| Named rows with no photo | 5,795 | 3,828 of these already have a Wikipedia link; 1,967 do not. |
| Rows with photo but no Wikipedia link | 219 | The exported row does not expose a portrait provenance page. |
| Parliament / state legislature rows with photos | 393 / 784 and 857 / 4,513 | These are the two largest named-person groups. |
| Secretary rows with photos | 10 / 705 | Extremely sparse administrative coverage. |
| Wikipedia-local (`/wikipedia/en/`) image URLs | 25 seat rows | File-level rights need review; a thumbnail URL alone does not convey reuse rights. |

All 1,792 nonempty `photo` values use Wikimedia upload or thumbnail domains (1,487 `thumb.wikimedia.org`, 305 `upload.wikimedia.org`). The CSV has no file-description URL, creator, license, attribution, image validation date, or image-to-person verification field. Its `gaps.csv` has no `missing_photo`/`wrong_photo` gap type, so these failures are invisible in the 3,403 published gaps. I could not HTTP-check every URL from the local shell because DNS/network access was unavailable; **no broken-link count is claimed**. The wrong-image findings below are established from the image subject and holder evidence, not from an HTTP status audit.

The root cause for several cross-person mistakes is visible in the build path: `personKey` in `scripts/export.ts` and `addPerson` in `scripts/build-graph.ts` strip honorifics and slugify only the holder's **name**. `addPerson` then indexes `people[key]` and can retain another holder's image; `holderOf` can fill an image by Wikipedia-page title or by bare name from `data/images.json`. `scripts/fetch-images.ts` calls Wikipedia `pageimages` with `pilicense=any` and stores only a thumbnail URL. This is not an identity or reuse-rights check. A separate class of error occurs when a holder points to an **office/list** Wikipedia page: the fetched page image can be an emblem instead of a person.

## Verified seat-level corrections

| Exact `position_id` / current row | Finding and action | Evidence, correct person/photo, rights |
|---|---|---|
| `st-mh-pos-lokayukta` — Sanjay Bhatia, “Lokayukta of Maharashtra”, `low`, [current wrong photo](https://thumb.wikimedia.org/wikipedia/en/thumb/6/6b/This_is_Captured_photo_of_Sanjay_Bhatia_%28BJP%29.jpg/330px-This_is_Captured_photo_of_Sanjay_Bhatia_%28BJP%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail) | **Wrong holder, office and photo.** The photo is of a Haryana BJP politician, also present as `in-pos-mp-rs-hr-1`; the former Maharashtra IAS officer Sanjay Bhatia was **Upa Lokayukta**, with term ending 27 Aug 2025. Correct the graph office according to the 2023 Act: Justice **Sunil Balkrishna Shukre** became **Chairman of the Maharashtra Lokayukta Institution** on 25 Aug 2026. Recheck whether an old “Lokayukta” seat remains separately valid under the transition before renaming/deleting it. | [Maharashtra Lok Bhavan appointment and oath](https://lokbhavan.maharashtra.gov.in/en/25-08-2026-justice-sunil-shukre-sworn-in-as-chairman-of-lokayukta-institution/); [former Lokayukta and deputy tenures](https://lokayukta.maharashtra.gov.in/en/former-heads-2/); [Bhatia official biography](https://lokayukta.maharashtra.gov.in/en/shri-sanjay-bhatia-upa-lokayukta-maharashtra-state/); [politician's separate biography](https://en.wikipedia.org/wiki/Sanjay_Bhatia). Correct Shukre portrait: [Commons file](https://commons.wikimedia.org/wiki/File:Justice_Sunil_Shukre.jpg), [direct image](https://upload.wikimedia.org/wikipedia/commons/4/40/Justice_Sunil_Shukre.jpg), **CC BY-SA 4.0**, creator `Petersonpark9`; attribute creator, file URL and license. The Lokayukta site's [Who's Who](https://lokayukta.maharashtra.gov.in/en/whos-who/) still names outgoing Kanade and Bhatia, and is stale against the later oath/tenure notices. |
| `st-up-pos-mla-dariyabad` and `st-up-pos-minister-52` — Satish Chandra Sharma, [current wrong photo](https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e0/Justice_Satish_Chandra_Sharma.jpg/330px-Justice_Satish_Chandra_Sharma.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail) | **Wrong portrait in both rows.** The image is of a Supreme Court judge, also correctly used at `in-pos-judge-sc-satish-chandra-sharma`. Keep the two UP roles linked to the Dariyabad politician, but remove this portrait until a rights-cleared politician portrait is attached. Keep these people separate despite the identical slug. | [UP Assembly member directory](https://www.upvidhansabhaproceedings.gov.in/en/member-s-information) lists Shri Satish Chandra Sharma for Dariyabad and includes his own member image; [Supreme Court judge profile](https://www.sci.gov.in/judge/justice-satish-chandra-sharma/) identifies a different person; [Commons description of the current image](https://commons.wikimedia.org/wiki/File:Justice_Satish_Chandra_Sharma.jpg) names the judge, credits Supreme Court of India, and marks GODL-India with review still pending. The Assembly image has no reuse license established in this audit. |
| `st-gj-pos-mla-ellisbridge` — Amit Shah, [current wrong photo](https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fd/Shri_Amit_Shah_in_Raigad.jpg/330px-Shri_Amit_Shah_in_Raigad.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail) | **Wrong portrait and merged identity.** The MLA is **Amit Popatlal Shah**, former Ahmedabad mayor; the displayed photo shows Union Home Minister Amit Shah, whose assembly tenure ended in 2017. Keep Ellisbridge MLA separate from `in-pos-mp-ls-gj-gandhinagar` and ministerial rows. Correct portrait remains unresolved; do not reuse the Union minister image. | [MHA biography of the Union minister](https://www.mha.gov.in/en/about-us/meet-the-minister/union-home-minister) says his Gujarat Assembly tenure was 1997–2017; [2022 Ellisbridge candidate affidavit](https://www.myneta.info/Gujarat2022/candidate.php?candidate_id=6240) and [PRS current MLA record](https://prsindia.org/mlatrack/amit-shah) identify the Ellisbridge office; [candidate article](https://en.wikipedia.org/wiki/Amit_Shah_(mayor)) names Amit Popatlal Shah. [Commons file for current image](https://commons.wikimedia.org/wiki/File:Shri_Amit_Shah_in_Raigad.jpg) explicitly says it depicts the Union Home Minister; Ministry of Home Affairs, **GODL-India**, with provider/source/license attribution required. |
| `st-up-pos-mla-mubarakpur` — Akhilesh Yadav, [current wrong photo](https://thumb.wikimedia.org/wikipedia/commons/thumb/0/01/Akhilesh_Yadav_544.jpg/330px-Akhilesh_Yadav_544.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail) | **Wrong portrait and merged identity.** The Mubarakpur MLA is the namesake Akhilesh Yadav born 1964; the same file is used for SP chief/MP `in-pos-mp-ls-up-kannauj`. Clear the Mubarakpur image pending a verified licensed portrait; assign distinct person IDs. | [UP Assembly directory](https://upvidhansabhaproceedings.gov.in/en/member-s-information) lists **Akhilesh** at Mubarakpur and **Akhilesh Yadav** at Karhal separately. [Mubarakpur person page](https://en.wikipedia.org/wiki/Akhilesh_Yadav_(born_1964)) and [SP chief's separate page](https://en.wikipedia.org/wiki/Akhilesh_Yadav) establish distinct identities; the CSV itself assigns the identical image URL to both. The politician's own authorized photo/license was not verified. |
| `st-kl-pos-mla-tanur` — P. K. Navas, [current wrong photo](https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5a/Rajeev_Chandrasekhar_with_PM_Modi_%28cropped%29.jpg/330px-Rajeev_Chandrasekhar_with_PM_Modi_%28cropped%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail) | **Wrong portrait, despite different names and keys.** The image is Rajeev Chandrasekhar (also at `st-kl-pos-mla-nemom`), not Navas. Clear the Navas image. His [official Assembly profile](https://www.niyamasabha.nic.in/index.php/content/member_homepage/2577) shows a member image, but its file URL and reuse license were not established here. | [Kerala Assembly profile](https://www.niyamasabha.nic.in/index.php/content/member_homepage/2577) verifies Navas, Tanur, IUML; [Assembly sitting-member directory](https://niyamasabha.nic.in/index.php/content/sitting_member) lists Navas and Chandrasekhar separately; [Commons description of the CSV photo](https://commons.wikimedia.org/wiki/File:Rajeev_Chandrasekhar_with_PM_Modi_(cropped).jpg) explicitly identifies Chandrasekhar, credits the PMO, **GODL-India** with required attribution and unreviewed source-license status. `data/images.json` itself maps both `P. K. Navas` and `Rajeev Chandrasekhar` to this URL. |
| `st-ap-pos-governor` — Syed Abdul Nazeer, [current non-person image](https://thumb.wikimedia.org/wikipedia/commons/thumb/3/37/Emblem_of_Andhra_Pradesh.svg/330px-Emblem_of_Andhra_Pradesh.svg.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail) | **State emblem in portrait slot.** Holder may remain, but replace the Wikipedia office-page link with the person's page and replace the image. | The CSV links `Governor_of_Andhra_Pradesh`, whose page image is an emblem. [Commons emblem page](https://commons.wikimedia.org/wiki/File:Emblem_of_Andhra_Pradesh.svg) confirms subject and insignia restrictions. A person-specific alternative is [Commons “Syed Abdul Nazeer.jpg”](https://commons.wikimedia.org/wiki/File:Syed_Abdul_Nazeer.jpg), [direct image](https://upload.wikimedia.org/wikipedia/commons/a/ae/Syed_Abdul_Nazeer.jpg): Prime Minister's Office, **GODL-India**, attribute provider, source and license. |
| `st-tg-pos-governor` — Shiv Pratap Shukla, [current non-person image](https://thumb.wikimedia.org/wikipedia/en/thumb/6/61/Emblem_of_Telangana.svg/330px-Emblem_of_Telangana.svg.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail) | **State emblem in portrait slot.** Replace the list-page Wikipedia link with the person's page and replace the image; the holder identity is confirmed. | [Telangana government governor profile](https://www.telangana.gov.in/government/governor/) and [Lok Bhavan profile](https://governor.telangana.gov.in/present_governor.do) identify Shukla. Candidate [Commons “Shiv Pratap Shukla.JPG”](https://commons.wikimedia.org/wiki/File:Shiv_Pratap_Shukla.JPG), [direct image](https://upload.wikimedia.org/wikipedia/commons/f/fa/Shiv_Pratap_Shukla.JPG): creator `Ranvet`, **CC BY-SA 3.0**; attribute creator, file URL and license. |

The actual image byte URLs above are the CSV values (query strings included) or the Wikimedia file URLs derived from the named Commons files. Commons file pages are the rights and attribution records. A file's presence on Wikimedia or an official site does not by itself grant a reusable portrait license.

## Confirmed homonyms that distort `6,402 distinct people`

The slug is a normalized name, not a person ID. These rows must **not** be joined as one human, even if their individual seat-holder names are correct:

| Slug | At least these distinct people / exact seats | Verification |
|---|---|---|
| `sanjay-seth` | Jharkhand/Ranchi Lok Sabha and Defence MoS `in-pos-mp-ls-jh-ranchi`, `in-pos-mos-defence-1`; Uttar Pradesh Rajya Sabha `in-pos-mp-rs-up-2` | [Digital Sansad minister directory](https://sansad.in/ls/members/in-council-of-ministers) labels Defence MoS Sanjay Seth **Lok Sabha**; [Ranchi member biography](https://sansad.in/ls/members/biographyM/5117?from=bl) specifies Ranchi. Distinct UP page in CSV: `Sanjay_Seth_(Uttar_Pradesh_politician)`. |
| `manoj-tiwari` | North East Delhi MP `in-pos-mp-ls-dl-north-east-delhi`; Almora MLA `st-uk-pos-mla-almora` | The Almora image's [Commons file](https://commons.wikimedia.org/wiki/File:Manoj_Tewari_MLA.png) says “MLA from Almora”, creator Theharshitbisht, **CC BY-SA 4.0**; Delhi MP's separate image and Wikipedia URL are in CSV. |
| `amit-shah` | Union minister/MP `in-pos-minister-home-affairs`, `in-pos-mp-ls-gj-gandhinagar`; Ellisbridge MLA `st-gj-pos-mla-ellisbridge` | MHA and affidavit/PRS sources above. |
| `akhilesh-yadav` | Kannauj MP `in-pos-mp-ls-up-kannauj`; Mubarakpur MLA `st-up-pos-mla-mubarakpur` | UP Assembly directory above lists separate constituencies and people. |
| `satish-chandra-sharma` | Supreme Court judge `in-pos-judge-sc-satish-chandra-sharma`; Dariyabad MLA and minister `st-up-pos-mla-dariyabad`, `st-up-pos-minister-52` | Supreme Court and UP Assembly sources above. |
| `sanjay-kumar-singh` | At least Bihar Simri Bakhtiarpur, Lalganj, Tirhut teachers' council, Bihar Lokayukta and WB Bally seat IDs `st-br-pos-mla-simri-bakhtiarpur`, `st-br-pos-mla-lalganj`, `st-br-pos-mlc-61`, `st-br-pos-lokayukta`, `st-wb-pos-mla-bally` | Distinct constituency and politician-specific Wikipedia URLs in CSV. Exact officeholders of unlinked rows require primary verification. |
| `m-krishnappa` | Karnataka Vijay Nagar `st-ka-pos-mla-vijay-nagar` and Bangalore South `st-ka-pos-mla-bangalore-south` | The CSV links different politicians' pages, one born 1953 and one born 1962. |
| `sunil-kumar` | Bihar Bhore `st-br-pos-mla-bhore` and Biharsharif `st-br-pos-mla-biharsharif`; `st-br-pos-minister-21` lacks a person disambiguator | The two seat pages in CSV distinguish birth years 1988 and 1957, with different portrait URLs. The minister row needs a person-specific source before its membership is assigned. |

There are **44 name slugs** with at least two distinct nonblank Wikipedia URLs. Some are redirects, alternate titles or spelling variants (for example `s-p-singh-baghel`), so 44 is a review queue, **not** a count of proven conflations. Conversely, same-name collisions with zero/one Wikipedia URL will be missed. The known collision mechanism also affects graph search cards because `addPerson` uses the same key and preserves whichever image/role survives seniority logic.

## Unresolved checks that should remain explicit

1. The Maharashtra 2026 act changes the office to a chaired institution. The [25 Aug oath release](https://lokbhavan.maharashtra.gov.in/en/25-08-2026-justice-sunil-shukre-sworn-in-as-chairman-of-lokayukta-institution/) resolves the current chair, but the exact graph node/seat model should be checked against the [enacted act](https://www.indiacode.nic.in/bitstream/123456789/22083/1/lokayukta_act_-_final_uploading.pdf) before changing `st-mh-pos-lokayukta` into a differently named position.
2. The official UP Assembly and Kerala Assembly sites display member images for Dariyabad and Tanur, but this audit did not establish a public reuse license. Do not silently copy those images into `photo`; record the official page as identity evidence and keep photo empty until rights and image URL are checked.
3. `photo` availability was not HTTP-audited because the local shell could not resolve remote hosts; `thumb.wikimedia.org` or `upload.wikimedia.org` in a URL is not proof that it currently returns an image. A future batch HTTP check should record status, final URL, content type and timestamp, with a restrained request rate.
4. All 25 `/wikipedia/en/` files need file-page license review before reuse. The `st-tg-pos-governor` emblem and `st-mh-pos-lokayukta` politician image are already invalid as portraits regardless of rights.

## Full URL-disagreement queue (unverified)

The following 44 slugs have multiple distinct nonempty Wikipedia URLs. Compare those pages and official seat records before splitting or merging; redirects and aliases cause false positives. Rows without a Wikipedia URL are omitted from this particular queue, so inspect other same-slug rows too.

| `person_key` | Seat IDs whose Wikipedia URLs differ (or repeat one of the differing URLs) |
|---|---|
| `ajay-kumar` | `st-br-pos-mla-bibhutipur`, `st-up-pos-mla-chhaprauli` |
| `ajay-kumar-singh` | `st-br-pos-mlc-46`, `st-up-pos-mla-harraiya` |
| `ajay-singh` | `st-ka-pos-mla-jevargi`, `st-rj-pos-mla-degana` |
| `akhilesh-yadav` | `in-pos-mp-ls-up-kannauj`, `st-up-pos-mla-mubarakpur` |
| `amit-shah` | `in-pos-mp-ls-gj-gandhinagar`, `in-pos-minister-home-affairs`, `in-pos-minister-cooperation`, `st-gj-pos-mla-ellisbridge` |
| `anand-kumar` | `in-pos-mp-ls-up-bahraich`, `st-up-pos-mla-kaiserganj` |
| `anil-kumar` | `st-br-pos-mla-bathnaha`, `st-up-pos-mla-purqazi` |
| `anil-kumar-sharma` | `st-dl-pos-mla-r-k-puram`, `st-rj-pos-mla-sardarshahar` |
| `anil-sharma` | `st-br-pos-mlc-9`, `st-hp-pos-mla-mandi`, `st-up-pos-mla-shikarpur` |
| `anil-singh` | `st-br-pos-mla-hisua`, `st-up-pos-mla-purwa` |
| `arup-kumar-das` | `st-wb-pos-mla-singur`, `st-wb-pos-mla-kanthi-dakshin` |
| `devendra-pratap-singh` | `st-up-pos-mla-sareni`, `st-up-pos-mlc-25` |
| `dilip-jaiswal` | `st-br-pos-mlc-44`, `st-mp-pos-mla-kotma` |
| `dilip-singh` | `st-br-pos-mlc-34`, `st-wb-pos-mla-champdani` |
| `ghanshyam-tiwari` | `in-pos-chair-ethics-rs`, `in-pos-mp-rs-rj-5` |
| `jarnail-singh` | `st-dl-pos-mla-tilak-nagar`, `st-hr-pos-mla-ratia` |
| `jitendra-singh` | `in-pos-mos-pmo-1`, `in-pos-mos-personnel-public-grievances-and-pensions-1`, `in-pos-mos-personnel-1`, `in-pos-mos-atomic-energy-1`, `in-pos-mos-space-1`, `in-pos-mp-ls-jk-udhampur`, `in-pos-mos-science-and-technology-1`, `in-pos-mos-earth-sciences-1` |
| `k-sivakumar` | `st-tn-pos-mla-salem-north`, `st-tn-pos-mla-perambalur` |
| `kanimozhi-karunanidhi` | `in-pos-chair-drsc-consumer-affairs-food-public-distribution`, `in-pos-mp-ls-tn-thoothukkudi` |
| `krishan-kumar` | `st-hr-pos-mla-narwana`, `st-hr-pos-mla-bawal` |
| `m-krishnappa` | `st-ka-pos-mla-vijay-nagar`, `st-ka-pos-mla-bangalore-south` |
| `manish-jaiswal` | `in-pos-mp-ls-jh-hazaribagh`, `st-up-pos-mla-padrauna` |
| `manoj-kumar` | `in-pos-mp-ls-br-sasaram`, `st-br-pos-mla-arwal` |
| `manoj-tiwari` | `in-pos-mp-ls-dl-north-east-delhi`, `st-uk-pos-mla-almora` |
| `mohan-singh-bisht` | `st-dl-pos-mla-mustafabad`, `st-dl-pos-deputy-speaker`, `st-uk-pos-mla-lalkuan` |
| `mukesh-patel` | `st-gj-pos-mla-mahesana`, `st-gj-pos-mla-olpad` |
| `nagendra-singh` | `st-mp-pos-mla-nagod`, `st-mp-pos-mla-gurh` |
| `partap-singh-bajwa` | `st-pb-pos-mla-qadian`, `st-pb-pos-leader-of-opposition` |
| `pradeep-kumar-singh` | `in-pos-mp-ls-br-araria`, `st-up-pos-mla-sadabad` |
| `prasun-banerjee` | `in-pos-mp-ls-wb-howrah`, `st-wb-pos-mla-chanchal` |
| `rajeev-kumar` | `in-pos-mp-rs-wb-3`, `st-jk-pos-mla-bishnah` |
| `rajesh-kumar-singh` | `in-pos-secretary-defence`, `st-br-pos-mla-mohiuddinnagar` |
| `rekha-gupta` | `st-dl-pos-mla-shalimar-bagh`, `st-dl-pos-chief-minister` |
| `s-p-singh-baghel` | `in-pos-mos-fisheries-animal-husbandry-and-dairying-1`, `in-pos-mos-panchayati-raj-1`, `in-pos-mp-ls-up-agra` |
| `sachin-yadav` | `st-mp-pos-mla-kasrawad`, `st-up-pos-mla-jasrana` |
| `sanjay-kumar-singh` | `st-br-pos-mla-simri-bakhtiarpur`, `st-br-pos-mla-lalganj`, `st-br-pos-mlc-61`, `st-wb-pos-mla-bally` |
| `sanjay-seth` | `in-pos-mos-defence-1`, `in-pos-mp-ls-jh-ranchi`, `in-pos-mp-rs-up-2` |
| `santosh-singh` | `st-br-pos-mlc-32`, `st-up-pos-mlc-5` |
| `satish-chandra-sharma` | `in-pos-judge-sc-satish-chandra-sharma`, `st-up-pos-mla-dariyabad` |
| `satish-sharma` | `st-jk-pos-mla-chhamb`, `st-jk-pos-minister-4` |
| `sonam-lama` | `st-sk-pos-mla-sangha`, `st-wb-pos-mla-kurseong` |
| `sunil-kumar` | `st-br-pos-mla-bhore`, `st-br-pos-mla-biharsharif` |
| `sunil-kumar-sharma` | `st-jk-pos-mla-padder-nagseni`, `st-up-pos-mla-sahibabad` |
| `virendra-singh` | `st-rj-pos-mla-dantaramgarh`, `st-rj-pos-mla-masuda` |
