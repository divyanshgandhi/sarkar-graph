// Deterministic entity + person tagging for news text (no LLM key needed).
// Longest-match n-gram lookup over normalised tokens; abbreviations must match in capitals.

export interface AliasRow {
  id: string;
  gov: string;
  terms: string[];
}
export interface PersonRow {
  key: string;
  name: string;
  aliases: string[];
  job: string;
  party?: string;
  nodeId: string;
  gov: string;
  image?: string;
  wikipedia?: string;
}
export interface Mark {
  start: number;
  end: number;
  id: string; // node id or "p:<personKey>"
  person?: string; // person key when the mark is a person (id is then their seat's node id)
}

const STOP_TERMS = new Set([
  "government",
  "cabinet",
  "parliament",
  "secretariat",
  "legislative assembly",
  "high court",
  "police",
  "state election commission",
  "public service commission",
  "lokayukta",
  "state human rights commission",
  "council of ministers",
  "department",
  "ministry",
  "commission",
  "board",
  "authority",
  "the president",
  "centre",
  "army",
  "navy",
  "air force",
  "ed",
  "cm",
  "pm",
  "hc",
  "sc",
  "it",
  "ec",
  "rs",
  "ls",
  "gst",
  "aap",
  "bjp",
  "inc",
  "dm",
]);

const GENERIC = new Set(
  "language languages education elections election parliament commission committee tribunal security services planning industries industry information tourism culture justice health agriculture labour cooperation environment telecommunications textiles minority minorities children sports science technology statistics panchayat panchayats revenue finance defence railways highways housing transport treasury secretariat directorate department ministry authority corporation council assembly judiciary government municipal district districts development administration commissioner registrar inspector director chairman president governor minister ministers official officials national central federal regional".split(
    " ",
  ),
);

const COMMON_SURNAMES = new Set(
  "gandhi singh kumar kumari reddy patel sharma yadav rao das shah khan devi nair pillai naidu jain gupta mishra pandey verma joshi pradhan goyal thakur chaudhary choudhary chauhan paswan meena meghwal patil pawar desai iyer menon mehta agarwal sinha jha tiwari tripathi dubey shukla saxena srivastava kapoor malhotra bhatt ahmed ali hussain rahman ansari sheikh sen bose ghosh banerjee mukherjee chatterjee roy dutta sarkar biswas bhattacharya naik gowda hegde shetty murthy prasad raju babu varma krishnan subramanian chandra lal ram nath dev raj oraon munda marandi soren mahato tirkey ekka lakra kujur sangma marak lyngdoh kharbuli lalthlamuanpuia zoramthanga rio lepcha tamang rai gurung rahul mohan anand arun vijay ravi raja krishna gopal kishore suresh ramesh mahesh rajesh dinesh sanjay ajay vinod ashok anil sunil manoj pankaj deepak rakesh mukesh naresh umesh satish harish girish jagdish yogesh ganesh kailash prakash subhash rajendra narendra devendra surendra mahendra virendra jitendra dharmendra gajendra bhupendra shivraj rajnath nitin piyush amit arjun ram shyam hari bharat laxman shankar murli sunita anita kavita savita rekha meena usha lata asha maya".split(
    " ",
  ),
);

export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&amp;/g, "and")
    .replace(/&/g, " and ")
    .replace(/[’'`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function variants(name: string): string[] {
  const clean = name.replace(/\b(dr|shri|smt|sh|mr|mrs|ms|justice|prof|lt|gen|adm|air chief marshal|general)\.?\s+/gi, "").trim();
  const n = norm(clean);
  const out = new Set([n]);
  // "c p radhakrishnan" → "cp radhakrishnan"
  const toks = n.split(" ");
  const initials = toks.filter((t) => t.length === 1);
  if (initials.length) {
    const joined = toks.reduce<string[]>((acc, t) => {
      if (t.length === 1 && acc.length && acc[acc.length - 1].length <= 3 && /^[a-z]+$/.test(acc[acc.length - 1]) && acc[acc.length - 1].length < 3)
        acc[acc.length - 1] += t;
      else acc.push(t);
      return acc;
    }, []);
    out.add(joined.join(" "));
    out.add(toks.filter((t) => t.length > 1).join(" "));
  }
  return [...out].filter((v) => v.split(" ").length >= 2 || v.length >= 6);
}

interface Entry {
  ids: string[];
  caps?: boolean;
}

export class Tagger {
  private map = new Map<string, Entry>();
  private maxN = 1;
  readonly people: Map<string, PersonRow>;

  constructor(aliases: AliasRow[], people: Record<string, PersonRow>, prominent: Set<string> = new Set()) {
    this.people = new Map(Object.entries(people));
    const add = (term: string, id: string, caps = false) => {
      const k = caps ? term : norm(term);
      if (!k || STOP_TERMS.has(k.toLowerCase())) return;
      const e = this.map.get(k);
      if (e) {
        if (!e.ids.includes(id)) e.ids.push(id);
      } else this.map.set(k, { ids: [id], caps });
      this.maxN = Math.max(this.maxN, k.split(" ").length);
    };
    for (const row of aliases) {
      for (const t of row.terms) {
        if (!t) continue;
        const isAbbr = /^[A-Z][A-Z0-9&().-]{1,9}$/.test(t.replace(/\s+/g, ""));
        if (isAbbr) {
          if (t.replace(/[^A-Za-z]/g, "").length >= 3) add(t.replace(/[^A-Za-z0-9]/g, ""), row.id, true);
        } else {
          const k = norm(t);
          // one-word aliases must be distinctive names, not everyday words ("language", "education")
          if (!k.includes(" ") && (k.length < 9 || GENERIC.has(k))) continue;
          if (k.length >= 8) add(t, row.id);
        }
      }
    }
    // people: full names, plus a unique, uncommon surname for prominent officials
    const surnameCount = new Map<string, number>();
    for (const p of this.people.values()) {
      const s = norm(p.name).split(" ").pop()!;
      surnameCount.set(s, (surnameCount.get(s) ?? 0) + 1);
    }
    for (const p of this.people.values()) {
      for (const v of variants(p.name)) add(v, `p:${p.key}`);
      for (const a of p.aliases) add(a, `p:${p.key}`);
      const s = norm(p.name).split(" ").pop()!;
      if (prominent.has(p.key) && s.length >= 5 && surnameCount.get(s) === 1 && !COMMON_SURNAMES.has(s)) add(s, `p:${p.key}`);
    }
    // entities that collide across many ids are too ambiguous to tag
    for (const [k, e] of this.map) if (e.ids.length > 3) this.map.delete(k);
  }

  tag(text: string): Mark[] {
    // tokenise keeping offsets
    const toks: { t: string; raw: string; s: number; e: number }[] = [];
    const re = /[A-Za-z0-9À-ɏ’'&.-]+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const raw = m[0].replace(/^[.'’-]+|[.'’-]+$/g, "");
      if (!raw) continue;
      const s = m.index + m[0].indexOf(raw);
      const parts = norm(raw).split(" ").filter(Boolean);
      if (!parts.length) continue;
      if (parts.length === 1) toks.push({ t: parts[0], raw, s, e: s + raw.length });
      else {
        let off = s;
        for (const p of parts) toks.push({ t: p, raw: p, s: off, e: off + p.length }), (off += p.length + 1);
      }
    }
    const marks: Mark[] = [];
    for (let i = 0; i < toks.length; ) {
      let hit: { n: number; ids: string[] } | null = null;
      for (let n = Math.min(this.maxN, toks.length - i); n >= 1; n--) {
        const slice = toks.slice(i, i + n);
        const key = slice.map((x) => x.t).join(" ");
        const e = this.map.get(key);
        if (e && !e.caps) {
          hit = { n, ids: e.ids };
          break;
        }
        if (n === 1) {
          const rawKey = toks[i].raw.replace(/[^A-Za-z0-9]/g, "");
          const ce = this.map.get(rawKey);
          if (ce?.caps && rawKey === rawKey.toUpperCase()) hit = { n: 1, ids: ce.ids };
        }
      }
      if (hit) {
        const id = hit.ids.find((x) => x.startsWith("p:")) ?? hit.ids.find((x) => x.startsWith("in-")) ?? hit.ids[0];
        marks.push({ start: toks[i].s, end: toks[i + hit.n - 1].e, id });
        i += hit.n;
      } else i++;
    }
    return marks;
  }
}
