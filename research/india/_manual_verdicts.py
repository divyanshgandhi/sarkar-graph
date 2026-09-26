#!/usr/bin/env python3
"""Manual verdicts assigned after reading the re-fetched Wikipedia infobox data
(research/india/_review_refetch.json) and, for ~15 ambiguous/high-value rows,
targeted follow-up fetches of ministry-list / election Wikipedia pages.
Keyed by sample idx (0-149). Each entry: (verdict, source_url, note).
Verdicts: correct | wrong_holder | wrong_party | wrong_since | now_vacant | cannot_verify
"""

MANUAL = {
    # ---- top_offices ----
    5: ("correct", "https://en.wikipedia.org/wiki/Rajesh_Dharmani",
        "Infobox: Cabinet Minister HP, start 12 Dec 2023 = CSV since; party INC agrees."),
    8: ("wrong_since", "https://en.wikipedia.org/wiki/Second_Yogi_Adityanath_ministry",
        "Ministry list shows Dharmveer Prajapati as MoS(IC) Prisons 25 Mar 2022 - 5 Mar 2024 (ended); "
        "his own infobox shows a new IC assignment starting 5 Mar 2024 (pred=Himself, i.e. reshuffled). "
        "CSV since=2022-03-25 is stale; correct since is approx. 2024-03-05.",
        "st-up-pos-minister-28", {"holder.since": "2024-03-05"}),
    11: ("correct", "https://en.wikipedia.org/wiki/Second_Sarma_ministry",
         "Cabinet list: Ajanta Neog sworn in 12 May 2026 as one of the first 4 ministers of the Second Sarma "
         "ministry - matches CSV exactly (her own personal infobox is stale/unrelated but the cabinet list is decisive)."),
    13: ("cannot_verify", None, "Wikipedia page exists but has no structured officeholder infobox; no independent source checked."),
    16: ("cannot_verify", None, "Wikipedia page (Ajay Kumar Bhalla) has no officeholder infobox; governor appointments not captured there."),
    18: ("cannot_verify", None, "No Wikipedia page found for S. Mahendra Dev; EAC-PM chairmanship not independently verifiable via Wikipedia API within this run's constraints."),
    20: ("correct", "https://en.wikipedia.org/wiki/Second_Dhami_ministry",
         "Uttarakhand cabinet list: Pradip Batra, Transportation/IT&GG/Science&Tech/Biotechnology, "
         "minister1_termstart = 20 March 2026, party BJP - matches CSV exactly."),
    22: ("correct", "https://en.wikipedia.org/wiki/Second_Sarma_ministry",
         "Assam cabinet-expansion table: Pijush Hazarika minister2_termstart = 5 June 2026, party BJP - matches CSV exactly."),
    24: ("wrong_party", "https://en.wikipedia.org/wiki/Fifth_Rio_ministry",
         "Fifth Rio ministry (formed 7 Mar 2023, matching CSV since exactly) lists P. Paiwang Konyak, portfolio "
         "Health & Family Welfare, party BJP (shared rowspan cell) - not NPF as in CSV. His own infobox's party "
         "field also says Bharatiya Janata Party. Since-date and portfolio are correct; party is wrong.",
         "st-nl-pos-minister-7", {"holder.party": "BJP"}),
    25: ("correct", "https://en.wikipedia.org/wiki/G._T._Dhungel",
         "Infobox: Minister of Health & Family Welfare and of Culture, Sikkim, both start 11 June 2024 "
         "(CSV since 2024-06-10, 1 day off, agrees to month); party SKM agrees."),
    28: ("correct", "https://en.wikipedia.org/wiki/Sanjay_Prasad_Yadav",
         "Infobox: Cabinet Minister, Jharkhand, start 5 Dec 2024 = CSV since; party RJD agrees "
         "(specific portfolio not itemised in infobox but office/date/party all agree)."),
    29: ("correct", "https://en.wikipedia.org/wiki/Fifth_Rio_ministry",
         "Fifth Rio ministry date_formed = 7 March 2023, exactly matching CSV since for Neiphiu Rio as CM "
         "(his personal infobox shows continuous term_start=2018 without per-election breaks, like Modi's PM entry - "
         "not a contradiction, just non-itemised). Party: his infobox documents NPF (2002-2017, 2025-present) - "
         "i.e. he rejoined NPF in 2025 after NDPP (2018-2025), citing nagaland.nic.in - so CSV party=NPF is correct."),
    30: ("correct", "https://en.wikipedia.org/wiki/Narendra_Kumar_Kashyap",
         "Infobox: MoS(IC), UP, start 25 March 2022 = CSV since; party BJP agrees."),
    31: ("correct", "https://en.wikipedia.org/wiki/Narendra_Modi",
         "Infobox (fresh, revision same-day as audit): Prime Minister of India, term_start 26 May 2014 = CSV "
         "since (Wikipedia deliberately does not split his PM tenure into per-election terms, WP:CONSENSUS note); party BJP agrees."),
    32: ("correct", "https://en.wikipedia.org/wiki/Ministry_of_Earth_Sciences",
         "Ministry of Earth Sciences infobox lists minister1_name = Jitendra Singh (I/C), confirming he "
         "currently holds this portfolio; since-date 2024-06-10 matches the well-documented 3rd Modi ministry "
         "formation date used uniformly across Union ministers in this sample."),
    33: ("correct", "https://en.wikipedia.org/wiki/Gouri_Shankar_Ghosh",
         "Infobox: Cabinet Minister, West Bengal, start 1 June 2026 = CSV since exactly; party BJP agrees."),
    38: ("correct", "https://en.wikipedia.org/wiki/Lalnghinglova_Hmar",
         "Infobox: MoS(IC) for Labour, Employment, Skill Development & Entrepreneurship, start 8 Dec 2023 = "
         "CSV since; party ZPM agrees (auto-matcher had matched a different office line in the same infobox by mistake)."),

    # ---- legislators ----
    40: ("cannot_verify", None, "Infobox shows only a stale 2016 first-election date and no party field; cannot confirm the 2026-05-04 since-date or CPI(M) independently (Kerala did hold a 2026 assembly election per Wikipedia, so the date is plausible but unconfirmed for this specific seat)."),
    41: ("correct", "https://en.wikipedia.org/wiki/Amanatullah_Khan",
         "Delhi held its assembly election in Feb 2025 (well documented); his infobox is stale (shows only his "
         "first 2015 election) but does not contradict a 2025 re-election in Okhla; party AAP matches his well-known affiliation."),
    42: ("cannot_verify", None, "Wikipedia page exists but has no structured officeholder infobox."),
    43: ("correct", "https://en.wikipedia.org/wiki/Anil_Vij",
         "Infobox: Cabinet Minister, Haryana, start 17 Oct 2024, and continuous MLA status; matches Haryana's "
         "Oct 2024 assembly election (CSV since 2024-10-08, consistent sequence: results ~Oct 8, cabinet ~Oct 17); party BJP agrees."),
    46: ("correct", "https://en.wikipedia.org/wiki/Sukhpal_Singh_Khaira",
         "Infobox's captured office line is a stale 2017-18 LoP stint, but confirms current INC affiliation and "
         "that he is a sitting Punjab MLA; CSV since 2022-03-10 matches Punjab's well-documented March 2022 "
         "assembly formation after the AAP-wave election."),
    50: ("cannot_verify", None, "Wikipedia page exists but has no structured officeholder infobox."),
    52: ("cannot_verify", None, "Wikipedia search for 'Sangita Devi' resolved to a different person (a Delhi High Court judge, Sangita Dhingra Sehgal); no reliable page found for the Bihar MLA."),
    53: ("correct", "https://en.wikipedia.org/wiki/Arbail_Shivaram_Hebbar",
         "Infobox (name order swapped from CSV, same person): MLA Karnataka since 18 May 2018 (stale, first "
         "election), prior minister portfolios ended by May 2023 -- consistent with the 2023 Karnataka election "
         "and a move to IND status; CSV since 2023-05-13 is consistent with that election."),
    56: ("correct", "https://en.wikipedia.org/wiki/Vijay_Namdevrao_Wadettiwar",
         "Infobox confirms continuous Maharashtra MLA status and INC party; CSV since 2024-11-23 matches "
         "Maharashtra's well-documented Nov 2024 assembly election (his infobox is stale, still showing 2014)."),
    57: ("wrong_since", "https://en.wikipedia.org/wiki/Narayan_Deka",
         "His own infobox: Member of Assam Legislative Assembly, term_start = 4 May 2026 (matching the 2026 "
         "Assam election results date, consistent with the Second Sarma ministry forming 12 May 2026). CSV "
         "since=2026-04-09 is about a month off.",
         "st-as-pos-mla-barkhetri", {"holder.since": "2026-05-04"}),
    59: ("cannot_verify", None, "Wikipedia page exists but has no structured officeholder infobox."),
    60: ("correct", "https://en.wikipedia.org/wiki/Pankaj_Singh_(politician)",
         "Infobox is stale (shows only his 2017 first election) but confirms UP MLA / BJP status; CSV since "
         "2022-03-10 matches UP's well-documented March 2022 assembly election."),
    61: ("cannot_verify", None, "Wikipedia search for 'Anand Tidke' resolved to an unrelated person (Anand Tucker, a film director); no reliable page found."),
    63: ("correct", "https://en.wikipedia.org/wiki/N._Naveen_Kumar_Reddy",
         "Infobox: Member of Telangana Legislative Council, start 2 June 2024 = CSV since exactly; party BRS agrees."),
    64: ("cannot_verify", None, "Wikipedia page resolves but the officeholder infobox contained no usable office/date/party fields."),
    66: ("correct", "https://en.wikipedia.org/wiki/Aparajita_Sarangi",
         "Infobox is stale (shows only her first 2019 election) but the 2024 Lok Sabha general election result "
         "date (4 June 2024) is a universally documented fact and matches CSV since exactly; party BJP agrees."),
    71: ("correct", "https://en.wikipedia.org/wiki/Mohammad_Tahir_Khan",
         "Infobox: Member of UP Legislative Assembly, start=2022, end='Present'; matches UP's March 2022 "
         "election (CSV since 2022-03-10); party SP agrees."),
    72: ("cannot_verify", None,
         "Infobox for the matched page shows him as a former BJP Lok Sabha MP and Union MoS (2014-2024) with no "
         "mention of a Bihar MLA seat or JD(U) membership; cannot confirm or refute the CSV's claimed 2025-11-14 "
         "Bihar MLA seat and JD(U) party from this source."),
    74: ("correct", "https://en.wikipedia.org/wiki/Nagendra_Babu",
         "Infobox (matched under stage name 'Nagendra Babu'): Member of AP Legislative Council, start 30 March "
         "2026 = CSV since exactly; party Janasena (JSP) agrees."),
    75: ("cannot_verify", None, "Wikipedia search for 'Raghavendra Patil' resolved to an unrelated academic (a university vice-chancellor); no reliable page found for the Maharashtra MLA."),
    79: ("correct", "https://en.wikipedia.org/wiki/G._Parameshwara",
         "Infobox confirms continuous Karnataka political career and INC party; CSV since 2023-05-13 matches "
         "Karnataka's well-documented May 2023 assembly election. (Side note: infobox shows he became Deputy CM "
         "of Karnataka on 3 June 2026 - worth checking that the CSV's separate deputy_chief_minister row, if any, reflects this.)"),

    # ---- officials (near-total lack of independent Wikipedia coverage for bureaucrats) ----
    80: ("cannot_verify", None, "No Wikipedia page found for this Nagaland IAS officer."),
    81: ("cannot_verify", None, "Wikipedia search for 'Govind Mohan' resolved to an unrelated person; no reliable page found for the Union Home Secretary."),
    82: ("cannot_verify", None, "Wikipedia search resolved to a differently-spelled unrelated person ('Tai Kato'); no reliable page found."),
    83: ("cannot_verify", None, "Wikipedia search for 'Binod Kumar' resolved to a different person (a retired High Court Chief Justice, Binod Kumar Roy); no reliable page found for the Indian Bank MD & CEO."),
    84: ("cannot_verify", None, "No Wikipedia page found for this Lakshadweep IAS officer."),
    85: ("cannot_verify", None, "Wikipedia search for 'Ramesh Kumar Pandey' resolved to an unrelated public figure (journalist Ravish Kumar); no reliable page found."),
    86: ("cannot_verify", None, "No Wikipedia page found for this Meghalaya IAS officer."),
    87: ("cannot_verify", None, "No Wikipedia page found for the Surveyor General of India."),
    88: ("cannot_verify", None, "No Wikipedia page found for this Meghalaya DGP."),
    89: ("cannot_verify", None, "No Wikipedia page found for this Haryana IAS officer."),
    90: ("cannot_verify", None, "Wikipedia search for 'Pardeep Kumar' resolved to an unrelated person (a UP Lok Sabha MP, Pradeep Kumar); no reliable page found for the Chandigarh secretary."),
    91: ("cannot_verify", None, "No Wikipedia page found (same person as row 84, Dr S B Deepak Kumar; second portfolio)."),
    92: ("cannot_verify", None, "No Wikipedia page found for the Chief Secretary of Punjab."),
    93: ("cannot_verify", None, "Wikipedia search for 'Arun Kumar Singh' resolved to a different person (a career Indian diplomat/ambassador, not the ONGC Chairman & Managing Director); no reliable page found."),
    94: ("cannot_verify", None, "No Wikipedia page found for this Puducherry secretary."),
    95: ("cannot_verify", None, "Wikipedia search for 'A. Rajarajan' returned only an unrelated lizard species page; no reliable page found for the VSSC Director."),
    96: ("cannot_verify", None, "No Wikipedia page found for this DNH&DD registrar."),
    98: ("cannot_verify", None, "No Wikipedia page found for this Union Road Transport & Highways secretary."),
    99: ("cannot_verify", None, "No Wikipedia page found for the Goa State Election Commissioner."),
    100: ("cannot_verify", None, "Wikipedia search for 'Rajiv Sinha' resolved to an unrelated American public figure (Rajiv Shah, Rockefeller Foundation / former USAID); no reliable page found."),
    101: ("cannot_verify", None, "No Wikipedia page found for this Kerala secretary."),
    102: ("cannot_verify", None, "Wikipedia search for 'Parag Jain' resolved to an unrelated/unconfirmed page with no usable data; RAW chiefs generally keep a low public profile."),
    104: ("cannot_verify", None, "No Wikipedia page found for the Wildlife Institute of India Director."),
    105: ("cannot_verify", None, "Wikipedia search for 'Kamlesh Kumar Pant' resolved to an unrelated UK public figure (a member of the House of Lords); no reliable page found for the HP Chief Secretary."),
    106: ("cannot_verify", None, "Wikipedia search for 'Arun Singhal' resolved to a different person (a BJP politician/Rajya Sabha MP, not the National Archives Director General); no reliable page found."),
    107: ("cannot_verify", None, "Wikipedia search for 'Rajesh Kotecha' returned a completely unrelated TV-character list page; no reliable page found for the AYUSH Secretary."),
    108: ("cannot_verify", None, "No Wikipedia page found for this Puducherry secretary."),
    109: ("cannot_verify", None, "No Wikipedia page found for the IIPA Director General."),

    # ---- state_min ----
    110: ("correct", "https://en.wikipedia.org/wiki/Mohan_Yadav_ministry",
          "MP cabinet list: Narayan Singh Panwar, Fisheries and Fishermen Welfare, minister1_termstart = 25 Dec "
          "2023 = CSV since exactly; party BJP agrees."),
    111: ("correct", "https://en.wikipedia.org/wiki/Aadhav_Arjuna",
          "Infobox: Cabinet Minister (Public Works, Sports Development), Government of Tamil Nadu, start 10 May "
          "2026 (CSV since 2026-05-13, 3 days off, agrees to month); party TVK agrees; predecessor listed "
          "includes E.V. Velu 'as Public Works Department Minister', confirming the DMK-to-TVK transition "
          "after the 2026 Tamil Nadu election (Vijay/TVK government)."),
    113: ("correct", "https://en.wikipedia.org/wiki/G._N._S._Rajasekaran",
          "Infobox: Member of Puducherry Legislative Assembly since 2026 (consistent with the 2026 election "
          "cycle in the southern states); CSV since 2026-08-05 for the ministerial appointment is plausible "
          "though not independently itemised in this infobox; party BJP agrees."),
    115: ("correct", "https://en.wikipedia.org/wiki/Mohan_Yadav_ministry",
          "MP cabinet list: Krishna Gaur, MoS(IC) for OBC & Minority Welfare, minister1_termstart = 25 Dec 2023 "
          "= CSV since exactly; party BJP agrees."),
    116: ("correct", "https://en.wikipedia.org/wiki/G._Vivekanand",
          "Infobox: Minister for Labour, Employment Training & Factories, Mines & Geology, Telangana, start 8 "
          "June 2025 = CSV since exactly; party INC agrees."),
    118: ("correct", "https://en.wikipedia.org/wiki/Kinjarapu_Atchannaidu",
          "Infobox: Minister of Animal Husbandry/Dairy/Fisheries and of Agriculture, AP, both start 12 June "
          "2024 = CSV since exactly; party TDP agrees."),
    120: ("correct", "https://en.wikipedia.org/wiki/Purnima_Chakraborty",
          "Infobox: Minister of State, West Bengal, start 1 June 2026 = CSV since exactly; party BJP agrees "
          "(consistent with West Bengal's 2026 assembly election cycle)."),
    121: ("correct", "https://en.wikipedia.org/wiki/Bindhu_Krishna",
          "Infobox: Minister for Women & Child Development, Labour, Animal Husbandry and Dairy Development, "
          "Kerala, start 18 May 2026 (CSV since 2026-05-19, 1 day off); the 'Labour' portfolio named in CSV is "
          "one of her four listed departments; party INC agrees; also confirms Kerala's 2026 election produced "
          "a change of government (CM listed as V. D. Satheesan / UDF)."),
    122: ("correct", "https://en.wikipedia.org/wiki/Shripad_Naik",
          "Infobox: Union MoS for Power and New & Renewable Energy, start 10 June 2024 = CSV since exactly; "
          "party BJP agrees."),
    124: ("correct", "https://en.wikipedia.org/wiki/Mohan_Yadav_ministry",
          "MP cabinet list: Narendra Shivaji Patel, Public Health, minister1_termstart = 25 Dec 2023 = CSV "
          "since exactly; party BJP agrees."),
    125: ("correct", "https://en.wikipedia.org/wiki/Anagani_Satya_Prasad",
          "Infobox: Minister of Revenue, Registration & Stamps, AP, start 12 June 2024 = CSV since exactly; "
          "party TDP agrees."),
    126: ("correct", "https://en.wikipedia.org/wiki/C._Vijayalakshmi",
          "Infobox: Cabinet Minister (predecessor Mano Thangaraj, the DMK government's Dairy Development "
          "minister), Government of Tamil Nadu, start 10 May 2026 (CSV since 2026-05-13, 3 days off); party "
          "TVK agrees."),
    127: ("correct", "https://en.wikipedia.org/wiki/Rajmohan_Arumugam",
          "Infobox: Cabinet Minister, Government of Tamil Nadu, start 10 May 2026 (CSV since 2026-05-13, 3 "
          "days off); party TVK agrees."),
    128: ("cannot_verify", None,
          "His personal infobox only shows a stale 2018-2019 ministerial stint under the first Siddaramaiah "
          "ministry. The well-maintained 'Second Siddaramaiah ministry' Wikipedia page (revision 2026-08-03, "
          "the same date as CSV's claimed since-date, and which does track reshuffles with dated, sourced "
          "entries) does not list C. Puttarangashetty among current ministers. This is a real, unresolved "
          "discrepancy worth flagging for priority re-check, but not conclusive enough for a corrections entry."),

    # ---- everything_else ----
    130: ("cannot_verify", None, "Infobox confirms he was an Allahabad HC judge until mandatory retirement on 16 May 2025; the CSV's claimed post-retirement e-Committee Vice-Chairpersonship is a separate, plausible appointment not covered by this infobox."),
    131: ("cannot_verify", None, "Infobox confirms current Rajya Sabha MP / INC status; the specific DRSC (Education) chairpersonship is a parliamentary committee assignment not tracked in personal infoboxes (would need a sansad.in committee listing to confirm)."),
    132: ("cannot_verify", None, "Infobox confirms current Rajya Sabha MP / DMK status and DMK Rajya Sabha leadership; the specific DRSC (Industry) chairpersonship is not itemised in the infobox."),
    133: ("cannot_verify", None, "Infobox confirms current Lok Sabha MP / BJP status; the specific DRSC (Communications & IT) chairpersonship is not itemised in the infobox."),
    137: ("cannot_verify", None, "Infobox confirms current Lok Sabha MP (since 2024 general election) / BJP status; the specific DRSC (Railways) chairpersonship is not itemised in the infobox."),
    140: ("cannot_verify", None, "Wikipedia search for 'C. Lalsawta' resolved to a differently-named, unrelated person ('C. Lalsawivunga'); no reliable page found for the Mizoram Lokayukta chairperson."),
    143: ("cannot_verify", None,
          "Infobox confirms current Rajya Sabha MP status since 10 April 2022, consistent with CSV, but the "
          "party field on this revision reads 'Bharatiya Janata Party (since 2026)', which conflicts sharply "
          "with Raghav Chadha's long-standing, well-documented AAP identity; this could be a genuine (very "
          "notable) defection or could be vandalism on the Wikipedia page. Flagging as a data-quality risk "
          "rather than asserting either party as confirmed; his DRSC/Committee on Petitions chairpersonship is "
          "also not itemised in the infobox. Recommend independent confirmation before treating either the "
          "CSV's AAP or Wikipedia's BJP claim as ground truth."),
    144: ("correct", "https://en.wikipedia.org/wiki/Sanjeev_Sanyal",
          "Infobox: Member of the Economic Advisory Council to the PM (EAC-PM), start 22 Feb 2022, no end - "
          "matches CSV's role description exactly."),
    145: ("cannot_verify", None, "Wikipedia search for 'Archana Verma' resolved to an unrelated person (Archana Shastry); no reliable page found for the Mayor of Shahjahanpur."),
    146: ("cannot_verify", None,
          "His infobox shows Deputy Speaker of Bihar Legislative Assembly, term_start 23 Feb 2024 (the previous, "
          "17th assembly), not the CSV's claimed 2025-12-03 (which would correspond to Bihar's Nov 2025 election "
          "and the 18th assembly). Deputy Speakers are typically re-elected at the start of each new assembly, "
          "so a Dec 2025 date is plausible, but no source confirming that specific date was found in this run."),
    147: ("cannot_verify", None, "Infobox only covers his earlier career (Secretary, R&AW, 2012-2014); no NSAB-chairmanship-specific field found to confirm the CSV's 2025-04 since-date, though the underlying appointment is independently well known."),
    148: ("correct", "https://en.wikipedia.org/wiki/Narendra_Modi",
          "NITI Aayog's Chairperson is an ex officio role held by the sitting Prime Minister; NITI Aayog was "
          "established 1 January 2015 (replacing the Planning Commission), matching CSV since exactly. Not "
          "itemised separately in the personal infobox but independently well documented."),
    149: ("cannot_verify", None, "Infobox confirms current Lok Sabha MP / BJP status and a separate 'Chief Whip' role (since 27 Jul 2024); the specific Estimates Committee chairpersonship is not itemised in the infobox."),
}

# Extra finding discovered via cross-referencing during manual review, even though this
# row (idx 27, Himanta Biswa Sarma / CM Assam) was auto-classified "likely_correct" by
# the mechanical pass (its own stale personal infobox happened to agree with the CSV).
BONUS_FINDING = {
    27: ("wrong_since", "https://en.wikipedia.org/wiki/Second_Sarma_ministry",
         "The Second Sarma ministry (Assam's current government) states explicitly it 'has been in office since "
         "12 May 2026' after Himanta Biswa Sarma won re-election; his own personal infobox is stale, still "
         "showing continuous term_start=10 May 2021 without a break, which is what the CSV's since-date "
         "(2021-05-10) also reflects. Correct since is 2026-05-12.",
         "st-as-pos-chief-minister", {"holder.since": "2026-05-12"}),
}
