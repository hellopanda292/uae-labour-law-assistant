/*
 * Retrieval evaluation (offline, no AI): does the search find the article that answers each
 * question? Questions are in everyday language, each labelled with the article(s) that answer it.
 *   dev  (45 questions): used while improving the search; its misses led to dictionary entries
 *   test (30 questions): written and committed before any tuning, never used for tuning
 * Three versions of the search are compared to show what each step adds.
 *   npm run eval:retrieval
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { search, type SearchOptions } from "../src/lib/search";

type Q = { q: string; articles: number[] };
const load = (f: string) => JSON.parse(readFileSync(join(__dirname, f), "utf8")) as Q[];
const SETS: [string, Q[]][] = [
  ["dev", load("retrieval-dev.json")],
  ["test", load("retrieval-test.json")],
];

const VARIANTS: [string, SearchOptions][] = [
  ["BM25 on clause text", { expand: false, titleBoost: 0 }],
  ["+ article titles", { expand: false, titleBoost: 2 }],
  ["+ everyday-words dictionary (used by the app)", { expand: true, titleBoost: 2 }],
];

function evaluate(questions: Q[], opts: SearchOptions) {
  let h1 = 0, h3 = 0, h5 = 0, rr = 0;
  const misses: { q: string; want: number[]; got: number[] }[] = [];
  for (const { q, articles } of questions) {
    const unique = [...new Set(search(q, 10, opts).map((h) => h.article))];
    const rank = unique.findIndex((a) => articles.includes(a));
    if (rank === 0) h1++;
    if (rank >= 0 && rank < 3) h3++;
    if (rank >= 0 && rank < 5) h5++;
    else misses.push({ q, want: articles, got: unique.slice(0, 5) });
    if (rank >= 0) rr += 1 / (rank + 1);
  }
  const n = questions.length;
  return { hit1: h1 / n, hit3: h3 / n, hit5: h5 / n, mrr: rr / n, misses };
}

const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
const results = SETS.map(([set, qs]) => ({ set, n: qs.length, rows: VARIANTS.map(([name, opts]) => ({ name, ...evaluate(qs, opts) })) }));

for (const { set, n, rows } of results) {
  console.log(`\n${set} (${n} questions)`);
  for (const r of rows) console.log(`  ${r.name.padEnd(48)} hit@1 ${pct(r.hit1)}  hit@3 ${pct(r.hit3)}  hit@5 ${pct(r.hit5)}  MRR ${r.mrr.toFixed(2)}`);
  for (const m of rows.at(-1)!.misses) console.log(`    miss: ${m.q} (want ${m.want}, got ${m.got})`);
}

const md = [
  "# Retrieval evaluation",
  "",
  "Questions in everyday language, each labelled with the article(s) of Decree-Law 33/2021 that answer it. A question counts as found at *k* when one of its articles is among the first *k* distinct articles returned. Re-run with `npm run eval:retrieval`.",
  "",
  "- **dev** (`retrieval-dev.json`): used while improving the search; its misses led to new dictionary entries.",
  "- **test** (`retrieval-test.json`): written and committed before any tuning (see `retrieval-test.sha256` and the git history), never used for tuning.",
  "",
  ...results.flatMap(({ set, n, rows }) => {
    const misses = rows.at(-1)!.misses;
    return [
      `## ${set} (${n} questions)`,
      "",
      "| Search | Found 1st | In top 3 | In top 5 | MRR |",
      "|---|---|---|---|---|",
      ...rows.map((r) => `| ${r.name} | ${pct(r.hit1)} | ${pct(r.hit3)} | ${pct(r.hit5)} | ${r.mrr.toFixed(2)} |`),
      "",
      ...(misses.length
        ? ["Not in the top 5 with the app's search:", "", ...misses.map((m) => `- ${m.q} (expected Article ${m.want.join(" or ")}, got ${m.got.join(", ")})`)]
        : ["Every question's article is in the top 5."]),
      "",
    ];
  }),
].join("\n");
writeFileSync(join(__dirname, "retrieval-results.md"), md);
writeFileSync(
  join(__dirname, "retrieval-results.json"),
  JSON.stringify(results.map(({ set, n, rows }) => ({ set, n, rows: rows.map(({ misses, ...r }) => ({ ...r, misses: misses.length })) })), null, 1),
);
