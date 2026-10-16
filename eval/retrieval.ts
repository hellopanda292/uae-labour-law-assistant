/*
 * Retrieval evaluation (offline, no AI): does the search find the article that answers each
 * question? 45 questions written in everyday language, each labelled with the article(s) that
 * answer it. Compares three versions of the search to show what each step adds.
 *   npm run eval:retrieval
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { search, type SearchOptions } from "../src/lib/search";

const questions = JSON.parse(readFileSync(join(__dirname, "retrieval-questions.json"), "utf8")) as { q: string; articles: number[] }[];

const VARIANTS: [string, SearchOptions][] = [
  ["BM25 on clause text", { expand: false, titleBoost: 0 }],
  ["+ article titles", { expand: false, titleBoost: 2 }],
  ["+ everyday-words dictionary (used by the app)", { expand: true, titleBoost: 2 }],
];

function evaluate(opts: SearchOptions) {
  let h1 = 0, h3 = 0, h5 = 0, rr = 0;
  const misses: { q: string; want: number[]; got: number[] }[] = [];
  for (const { q, articles } of questions) {
    const got = search(q, 10, opts).map((h) => h.article);
    const unique = [...new Set(got)];
    const rank = unique.findIndex((a) => articles.includes(a));
    if (rank === 0) h1++;
    if (rank >= 0 && rank < 3) h3++;
    if (rank >= 0 && rank < 5) h5++; else misses.push({ q, want: articles, got: unique.slice(0, 5) });
    if (rank >= 0) rr += 1 / (rank + 1);
  }
  const n = questions.length;
  return { hit1: h1 / n, hit3: h3 / n, hit5: h5 / n, mrr: rr / n, misses };
}

const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
const rows = VARIANTS.map(([name, opts]) => ({ name, ...evaluate(opts) }));
for (const r of rows) console.log(`${r.name.padEnd(48)} hit@1 ${pct(r.hit1)}  hit@3 ${pct(r.hit3)}  hit@5 ${pct(r.hit5)}  MRR ${r.mrr.toFixed(2)}`);
const final = rows.at(-1)!;
for (const m of final.misses) console.log(`  miss: ${m.q} (want ${m.want}, got ${m.got})`);

const md = [
  "# Retrieval evaluation",
  "",
  `${questions.length} questions in everyday language, each labelled with the article(s) of Decree-Law 33/2021 that answer it (\`eval/retrieval-questions.json\`). A question counts as found at *k* when one of its articles is among the first *k* distinct articles returned. Re-run with \`npm run eval:retrieval\`.`,
  "",
  "| Search | Found 1st | In top 3 | In top 5 | MRR |",
  "|---|---|---|---|---|",
  ...rows.map((r) => `| ${r.name} | ${pct(r.hit1)} | ${pct(r.hit3)} | ${pct(r.hit5)} | ${r.mrr.toFixed(2)} |`),
  "",
  final.misses.length ? "## Not in the top 5 (app's search)" : "Every question's article is in the top 5.",
  "",
  ...final.misses.map((m) => `- ${m.q} — expected Article ${m.want.join(" or ")}, got ${m.got.join(", ")}`),
  "",
].join("\n");
writeFileSync(join(__dirname, "retrieval-results.md"), md);
writeFileSync(join(__dirname, "retrieval-results.json"), JSON.stringify(rows.map(({ misses, ...r }) => ({ ...r, misses: misses.length })), null, 1));
