import type { Metadata } from "next";
import results from "../../../eval/retrieval-results.json";
import { articles, law } from "@/lib/law";

export const metadata: Metadata = {
  title: "How it works",
  description: "How the UAE Labour Law Assistant finds the right article, how it was tested, and what it can't do.",
};

type Row = { name: string; hit1: number; hit3: number; hit5: number; mrr: number };
const pct = (x: number) => `${Math.round(x * 100)}%`;
const passages = articles.reduce((s, a) => s + a.passages.length, 0);

function Table({ rows }: { rows: Row[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="text-xs uppercase tracking-wider text-ink-muted">
          <tr><th className="py-2 pr-3 font-bold">Search</th><th className="px-2 font-bold">Found 1st</th><th className="px-2 font-bold">Top 3</th><th className="px-2 font-bold">Top 5</th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.name} className={`border-t border-line ${i === rows.length - 1 ? "font-bold" : ""}`}>
              <td className="py-2.5 pr-3">{r.name}</td>
              <td className="px-2 tabular-nums">{pct(r.hit1)}</td>
              <td className="px-2 tabular-nums">{pct(r.hit3)}</td>
              <td className="px-2 tabular-nums">{pct(r.hit5)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AboutPage() {
  const sets = results as { set: string; n: number; rows: Row[] }[];
  const test = sets.find((s) => s.set === "test")!;
  const dev = sets.find((s) => s.set === "dev")!;

  return (
    <div className="container-app max-w-3xl pt-10">
      <p className="eyebrow">Method</p>
      <h1 className="mt-2 font-display text-[clamp(2rem,5vw,3rem)] font-bold tracking-[-0.02em]">How it works</h1>

      <section className="mt-8 space-y-3 text-ink-soft">
        <h2 className="font-display text-2xl font-bold text-ink">1. The source</h2>
        <p>
          The official English text of <a href={law.source.url} className="font-semibold text-brand underline" target="_blank" rel="noopener noreferrer">{law.source.title}</a>{" "}
          (last updated {law.source.last_updated}), copied from the UAE Legislation portal and checked piece by piece against the original with a
          SHA-256 hash. A small Python pipeline splits it into {articles.length} articles and {passages} clauses, with unit tests.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-ink-soft">
        <h2 className="font-display text-2xl font-bold text-ink">2. Finding the right clause</h2>
        <p>
          A BM25 keyword search over the clauses, the classic ranking function behind search engines. People and the law use different words, so a
          small dictionary adds the law&apos;s terms to a question: “notice period” → “warning period”, “passport” → “official documents”, “salary” → “wage”.
          The search needs no AI service, so the article finder and the fallback answers keep working when the AI is down.
        </p>
        <p>
          It was tested on questions written in everyday language, each labelled with the article that answers it. The <strong>test</strong> set
          ({test.n} questions) was written and committed before any tuning and never used to improve the search:
        </p>
        <div className="card p-4"><Table rows={test.rows} /></div>
        <p className="text-sm">
          On the {dev.n}-question <strong>dev</strong> set, which was used to find gaps in the dictionary, the final search puts the right article in the top 5 for {pct(dev.rows.at(-1)!.hit5)} of questions.
          Details in <code className="rounded bg-white px-1.5 py-0.5 text-xs">eval/retrieval-results.md</code>.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-ink-soft">
        <h2 className="font-display text-2xl font-bold text-ink">3. Writing the answer</h2>
        <p>
          A Gemini model gets three tools: <code className="text-sm">search_law</code>, <code className="text-sm">get_article</code> and{" "}
          <code className="text-sm">calculate_gratuity</code>. It may search several times, rephrasing in the law&apos;s words, and must answer only from the
          clauses it read, citing each one. Gratuity amounts always come from the calculator, which follows Article 51 exactly and is unit-tested, never
          from the model&apos;s own arithmetic. Under every answer you can open the clauses it read.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-ink-soft">
        <h2 className="font-display text-2xl font-bold text-ink">What it can&apos;t do</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>It covers the Decree-Law only, not the Executive Regulation (Cabinet Resolution 1 of 2022) or ministerial decisions, which add many details.</li>
          <li>It doesn&apos;t apply to domestic workers, government employees or the armed forces (Article 3). The DIFC and ADGM free zones have their own employment laws.</li>
          <li>The English text is a translation; the Arabic original prevails.</li>
          <li>It is general information, not legal advice. For your case, contact the Ministry of Human Resources &amp; Emiratisation (MOHRE) or a lawyer.</li>
        </ul>
      </section>
    </div>
  );
}
