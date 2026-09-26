// Mapping tables from raw research vocabulary → graph vocabulary.
import type { Sector, Shape } from "../../src/lib/types.ts";

export const STATES: Record<string, { name: string; nameHi: string; kind: "state" | "ut"; capital: string }> = {
  an: { name: "Andaman and Nicobar Islands", nameHi: "अंडमान और निकोबार द्वीपसमूह", kind: "ut", capital: "Sri Vijaya Puram" },
  ap: { name: "Andhra Pradesh", nameHi: "आंध्र प्रदेश", kind: "state", capital: "Amaravati" },
  ar: { name: "Arunachal Pradesh", nameHi: "अरुणाचल प्रदेश", kind: "state", capital: "Itanagar" },
  as: { name: "Assam", nameHi: "असम", kind: "state", capital: "Dispur" },
  br: { name: "Bihar", nameHi: "बिहार", kind: "state", capital: "Patna" },
  ch: { name: "Chandigarh", nameHi: "चंडीगढ़", kind: "ut", capital: "Chandigarh" },
  cg: { name: "Chhattisgarh", nameHi: "छत्तीसगढ़", kind: "state", capital: "Raipur" },
  dh: { name: "Dadra and Nagar Haveli and Daman and Diu", nameHi: "दादरा और नगर हवेली और दमन और दीव", kind: "ut", capital: "Daman" },
  dl: { name: "Delhi", nameHi: "दिल्ली", kind: "ut", capital: "New Delhi" },
  ga: { name: "Goa", nameHi: "गोवा", kind: "state", capital: "Panaji" },
  gj: { name: "Gujarat", nameHi: "गुजरात", kind: "state", capital: "Gandhinagar" },
  hr: { name: "Haryana", nameHi: "हरियाणा", kind: "state", capital: "Chandigarh" },
  hp: { name: "Himachal Pradesh", nameHi: "हिमाचल प्रदेश", kind: "state", capital: "Shimla" },
  jk: { name: "Jammu and Kashmir", nameHi: "जम्मू और कश्मीर", kind: "ut", capital: "Srinagar / Jammu" },
  jh: { name: "Jharkhand", nameHi: "झारखंड", kind: "state", capital: "Ranchi" },
  ka: { name: "Karnataka", nameHi: "कर्नाटक", kind: "state", capital: "Bengaluru" },
  kl: { name: "Kerala", nameHi: "केरल", kind: "state", capital: "Thiruvananthapuram" },
  la: { name: "Ladakh", nameHi: "लद्दाख", kind: "ut", capital: "Leh" },
  ld: { name: "Lakshadweep", nameHi: "लक्षद्वीप", kind: "ut", capital: "Kavaratti" },
  mp: { name: "Madhya Pradesh", nameHi: "मध्य प्रदेश", kind: "state", capital: "Bhopal" },
  mh: { name: "Maharashtra", nameHi: "महाराष्ट्र", kind: "state", capital: "Mumbai" },
  mn: { name: "Manipur", nameHi: "मणिपुर", kind: "state", capital: "Imphal" },
  ml: { name: "Meghalaya", nameHi: "मेघालय", kind: "state", capital: "Shillong" },
  mz: { name: "Mizoram", nameHi: "मिज़ोरम", kind: "state", capital: "Aizawl" },
  nl: { name: "Nagaland", nameHi: "नागालैंड", kind: "state", capital: "Kohima" },
  od: { name: "Odisha", nameHi: "ओडिशा", kind: "state", capital: "Bhubaneswar" },
  py: { name: "Puducherry", nameHi: "पुदुचेरी", kind: "ut", capital: "Puducherry" },
  pb: { name: "Punjab", nameHi: "पंजाब", kind: "state", capital: "Chandigarh" },
  rj: { name: "Rajasthan", nameHi: "राजस्थान", kind: "state", capital: "Jaipur" },
  sk: { name: "Sikkim", nameHi: "सिक्किम", kind: "state", capital: "Gangtok" },
  tn: { name: "Tamil Nadu", nameHi: "तमिलनाडु", kind: "state", capital: "Chennai" },
  tg: { name: "Telangana", nameHi: "तेलंगाना", kind: "state", capital: "Hyderabad" },
  tr: { name: "Tripura", nameHi: "त्रिपुरा", kind: "state", capital: "Agartala" },
  up: { name: "Uttar Pradesh", nameHi: "उत्तर प्रदेश", kind: "state", capital: "Lucknow" },
  uk: { name: "Uttarakhand", nameHi: "उत्तराखंड", kind: "state", capital: "Dehradun" },
  wb: { name: "West Bengal", nameHi: "पश्चिम बंगाल", kind: "state", capital: "Kolkata" },
};

export function govOf(id: string): string {
  const m = /^st-([a-z]{2})(?:-|$)/.exec(id);
  if (m && STATES[m[1]]) return m[1];
  return "in";
}

export function normSector(s: string | undefined, id: string, kind: string): Sector {
  const v = (s || "").toLowerCase();
  if (v === "electorate" || v === "people" || kind === "constituency") return "people";
  if (v === "executive" || v === "legislative" || v === "judicial" || v === "constitutional" || v === "federal" || v === "local")
    return v;
  if (v === "regulatory" || v === "independent") return "constitutional";
  if (/dist-|panchayat|municipal|-mc-|urban-local/.test(id)) return "local";
  return "executive";
}

export function shapeOf(kind: string, rank?: string, isPosition?: boolean): Shape {
  if (isPosition) {
    if (["head_of_state", "vice_head_of_state", "head_of_government", "chief_minister", "governor", "lieutenant_governor", "administrator"].includes(rank || ""))
      return "office";
    return "head";
  }
  switch (kind) {
    case "constituency":
      return "seal";
    case "legislature":
    case "chamber":
    case "state_legislature":
    case "state_chamber":
      return "chamber";
    case "parliamentary_committee":
    case "cabinet_committee":
    case "cabinet":
    case "council_of_ministers":
    case "state_council_of_ministers":
      return "committee";
    case "constitutional_body":
    case "statutory_body":
    case "regulator":
    case "commission":
    case "state_commission":
      return "commission";
    case "advisory_body":
      return "advisory";
    case "court":
    case "tribunal":
      return "court";
    case "cpse":
    case "public_sector_bank":
      return "corporation";
    case "armed_force":
    case "capf":
      return "force";
    case "state":
    case "union_territory":
      return "state";
    case "district":
    case "division":
      return "district";
    case "local_government_tier":
    case "municipal_corporation":
      return "tier";
    case "head_of_state_office":
      return "office";
    default:
      return "body";
  }
}

// Ranks that become their own node on the wheel; everything else is listed as a member of its body.
export const NODE_RANKS_UNION = new Set([
  "head_of_state",
  "vice_head_of_state",
  "head_of_government",
  "cabinet_minister",
  "mos_independent_charge",
  "presiding_officer",
  "leader_of_opposition",
  "chief_justice",
  "secretary",
  "head_of_agency",
  "chief_of_staff",
  "law_officer",
]);
export const NODE_RANKS_STATE = new Set([
  "governor",
  "lieutenant_governor",
  "administrator",
  "chief_minister",
  "deputy_chief_minister",
  "state_minister",
  "cabinet_minister",
  "mos_independent_charge",
  "minister_of_state",
  "presiding_officer",
  "leader_of_opposition",
  "secretary",
  "head_of_agency",
  "chief_justice",
]);

// Aggregate umbrellas that organise the tree but are not drawn.
export const HIDDEN = new Set(["in-union-government", "in-states-and-uts", "in-constitution"]);

export const PARTY_ALIASES: Record<string, string> = {
  "bharatiya janata party": "BJP",
  "indian national congress": "INC",
  congress: "INC",
  "aam aadmi party": "AAP",
  "all india trinamool congress": "AITC",
  tmc: "AITC",
  "trinamool congress": "AITC",
  "dravida munnetra kazhagam": "DMK",
  "samajwadi party": "SP",
  "telugu desam party": "TDP",
  "janata dal (united)": "JD(U)",
  "communist party of india (marxist)": "CPI(M)",
  "jharkhand mukti morcha": "JMM",
  "jammu & kashmir national conference": "JKNC",
  "jammu and kashmir national conference": "JKNC",
  "national conference": "JKNC",
  "shiv sena": "SHS",
  "nationalist congress party": "NCP",
  "rashtriya janata dal": "RJD",
};

export function normParty(p?: string | null): string | undefined {
  if (!p) return undefined;
  const t = p.trim();
  if (!t) return undefined;
  const k = t.toLowerCase();
  return PARTY_ALIASES[k] || t;
}
