import { articles, type Article, type Passage } from "./law";

/*
 * Keyword search over the law's clauses with BM25, the ranking function behind most search
 * engines. It runs without any AI service, both on the server (as the assistant's search tool) and
 * in the browser (the article finder, and the fallback when the AI quota is used up).
 *
 * The law's wording is not how people talk: a "notice period" is a "warning period", a passport
 * is an "official document", a salary is a "wage". QUERY_EXPANSIONS maps everyday words to the
 * law's terms; eval/retrieval.ts measures how much each step helps.
 */

const STOPWORDS = new Set(
  "a an the of to in on for and or is are be by with as at it its this that from shall may any his her he she they their them i my me we our you your can do does did if not no than then so such which who whom what when where how there these those has have had been being was were will would should could into about after before under over up out per also only all each other more most".split(" "),
);

export function stem(w: string) {
  if (w.length <= 3) return w;
  if (w.endsWith("ies") && w.length > 4) return w.slice(0, -3) + "y";
  if (w.endsWith("ing") && w.length > 5) return w.slice(0, -3);
  if (w.endsWith("ed") && w.length > 4) return w.slice(0, -2);
  if (/(ss|sh|ch|x)es$/.test(w)) return w.slice(0, -2);
  if (w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

export function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[’']s\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w && !STOPWORDS.has(w))
    .map(stem);
}

// Everyday phrase → words the law uses. Matched on the lower-cased question.
export const QUERY_EXPANSIONS: [RegExp, string][] = [
  [/\bnotice\b/, "warning period termination"],
  [/\b(resign|resignation|quit|quitting|leave (my|the) job|leaving (my|the) job)\b/, "terminate termination contract warning"],
  [/\b(fire|fired|firing|sack|sacked|dismiss|dismissed|terminated|let go|laid off|layoff)\b/, "dismissal terminate termination warning"],
  [/\b(salary|salaries|pay|paid|payment|money)\b/, "wage"],
  [/\b(gratuity|end of service|eosb|eos)\b/, "end-of-service gratuity basic wage"],
  [/\bpassport\b/, "official documents withhold"],
  [/\b(vacation|holiday|holidays|time off|day off)\b/, "leave"],
  [/\b(extra hours|overtime|work late|late night)\b/, "overtime additional working hours"],
  [/\b(sick|ill|illness|medical leave)\b/, "sick leave illness medical report"],
  [/\b(pregnant|pregnancy|baby|childbirth|maternity)\b/, "maternity female worker birth"],
  [/\b(paternity|father|newborn)\b/, "parental leave child"],
  [/\b(non compete|non-compete|noncompete|competitor)\b/, "non-competition"],
  [/\b(complain|complaint|report (my|the) (employer|company)|labour court|sue|court case)\b/, "dispute ministry court"],
  [/\b(harass|harassment|bully|bullying|abuse|violence)\b/, "harassment bullying violence"],
  [/\b(housing|accommodation|room)\b/, "accommodation housing allowance"],
  [/\b(weekend|rest day|day off)\b/, "weekly rest"],
  [/\b(deduct|deduction|cut (my|from) (salary|pay|wage))\b/, "deduction wage"],
  [/\b(visa|work permit|permit)\b/, "work permit"],
  [/\b(injury|injured|accident|hurt)\b/, "work injury compensation"],
  [/\b(remote|work from home|wfh)\b/, "remotely"],
  [/\b(absent|absence|absconding|abscond)\b/, "absence absent work"],
  [/\b(part time|part-time)\b/, "part-time"],
  [/\b(trial period|probation)\b/, "probation period"],
  [/\b(recruitment fee|agency fee|visa cost|hiring fee)\b/, "recruitment fees costs"],
  [/\b(late salary|unpaid salary|not paid|salary delay)\b/, "wage due dates pay"],
  [/\b(ticket|flight home|return ticket)\b/, "expenses returning worker"],
  [/\b(experience letter|reference letter|certificate)\b/, "experience certificate"],
  [/\b(fine|fines|penalty|penalties|punish)\b/, "fine penalty"],
  [/\b(child|children|minor|teenager|under 18)\b/, "juvenile"],
  [/\b(equal pay|discrimination|discriminate)\b/, "discrimination equal"],
  [/\b(die|dies|died|death|passed away|funeral|bereavement)\b/, "death mourning"],
  [/\b(\d{1,2}[- ]years?[- ]old|age|minor|teen|teenager|under 18|child labour)\b/, "juvenile employ fifteen eighteen"],
  [/\b(final settlement|full and final|final pay|dues|settlement)\b/, "entitlements end contract pay"],
  [/\b(unpaid leave|no pay leave|leave without pay)\b/, "leave without pay"],
  [/\b(company (is )?sold|new owner|takeover|taken over|merger|merged|acquired|acquisition)\b/, "change form legal status establishment new employer"],
  [/\b(immediately|straight away|right away|without notice|no notice|no warning)\b/, "without warning"],
];

export function expandQuery(q: string) {
  const lower = q.toLowerCase();
  return QUERY_EXPANSIONS.filter(([re]) => re.test(lower)).map(([, add]) => add).join(" ");
}

type Doc = { article: Article; passage: Passage; tf: Map<string, number>; len: number };

export interface SearchOptions {
  expand?: boolean; // add the law's words for everyday terms (default true)
  titleBoost?: number; // how many times the article title counts in each passage (default 2)
  k1?: number;
  b?: number;
}

function buildIndex(titleBoost: number) {
  const docs: Doc[] = [];
  for (const article of articles) {
    for (const passage of article.passages) {
      const tokens = [...tokenize(passage.text)];
      for (let i = 0; i < titleBoost; i++) tokens.push(...tokenize(article.title));
      const tf = new Map<string, number>();
      for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
      docs.push({ article, passage, tf, len: tokens.length });
    }
  }
  const df = new Map<string, number>();
  for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const avgLen = docs.reduce((s, d) => s + d.len, 0) / docs.length;
  return { docs, df, avgLen };
}

const indexes = new Map<number, ReturnType<typeof buildIndex>>();

export interface Hit {
  article: number;
  title: string;
  clause: string | null;
  id: string;
  text: string;
  score: number;
}

export function search(query: string, limit = 6, opts: SearchOptions = {}): Hit[] {
  const { expand = true, titleBoost = 2, k1 = 1.2, b = 0.75 } = opts;
  if (!indexes.has(titleBoost)) indexes.set(titleBoost, buildIndex(titleBoost));
  const { docs, df, avgLen } = indexes.get(titleBoost)!;

  // Words from the question count fully; added law terms count half.
  const weights = new Map<string, number>();
  for (const t of tokenize(query)) weights.set(t, 1);
  if (expand) for (const t of tokenize(expandQuery(query))) if (!weights.has(t)) weights.set(t, 0.5);
  // "Article 29" or "Art. 51" in the question: rank that article first.
  const asked = [...query.matchAll(/\bart(?:icle|\.)?\s*\(?(\d{1,2})\)?/gi)].map((m) => Number(m[1]));

  const N = docs.length;
  const scored = docs.map((d) => {
    let score = 0;
    for (const [t, w] of weights) {
      const f = d.tf.get(t);
      if (!f) continue;
      const n = df.get(t)!;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      score += w * idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * d.len) / avgLen)));
    }
    if (asked.includes(d.article.n)) score += 100;
    return { d, score };
  });
  scored.sort((x, y) => y.score - x.score);

  // At most two clauses from the same article, so one long article can't crowd out the rest.
  const perArticle = new Map<number, number>();
  const hits: Hit[] = [];
  for (const { d, score } of scored) {
    if (score <= 0 || hits.length >= limit) break;
    const c = perArticle.get(d.article.n) ?? 0;
    if (c >= 2) continue;
    perArticle.set(d.article.n, c + 1);
    hits.push({ article: d.article.n, title: d.article.title, clause: d.passage.clause, id: d.passage.id, text: d.passage.text, score: Math.round(score * 100) / 100 });
  }
  return hits;
}
