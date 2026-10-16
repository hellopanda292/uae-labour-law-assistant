import type { Metadata } from "next";
import Link from "next/link";
import { ArticleFinder } from "@/components/ArticleFinder";
import { articles, law, TOPICS } from "@/lib/law";

export const metadata: Metadata = {
  title: "The law",
  description: "All 74 articles of the UAE Labour Law (Decree-Law 33/2021), grouped by topic, with a plain-language search.",
};

export default function ArticlesPage() {
  return (
    <div className="container-app pt-10">
      <p className="eyebrow">{law.source.short}</p>
      <h1 className="mt-2 font-display text-[clamp(2rem,5vw,3rem)] font-bold tracking-[-0.02em]">The law, in full</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">
        The official English translation of all {articles.length} articles, effective {law.source.effective}, last updated {law.source.last_updated}. {law.source.disclaimer}
      </p>

      <div className="mt-8">
        <ArticleFinder />
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {TOPICS.map((t) => (
          <section key={t.title} className="card p-5" aria-labelledby={`t-${t.from}`}>
            <h2 id={`t-${t.from}`} className="font-display text-lg font-bold">{t.title}</h2>
            <ul className="mt-2 space-y-1">
              {articles.filter((a) => a.n >= t.from && a.n <= t.to).map((a) => (
                <li key={a.n}>
                  <Link href={`/articles/${a.n}`} className="group flex gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-brand-soft">
                    <span className="w-8 shrink-0 font-bold tabular-nums text-brand">{a.n}</span>
                    <span className="text-ink-soft group-hover:text-ink">{a.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
