import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink, MessageCircleQuestion } from "lucide-react";
import { articles, getArticle, law } from "@/lib/law";

export function generateStaticParams() {
  return articles.map((a) => ({ n: String(a.n) }));
}

export async function generateMetadata({ params }: { params: Promise<{ n: string }> }): Promise<Metadata> {
  const a = getArticle(Number((await params).n));
  return a ? { title: `Article ${a.n}: ${a.title}`, description: a.text.slice(0, 160) } : {};
}

// Clause numbers ("1.", "2.") become anchors so answers can link straight to a clause.
function Body({ text }: { text: string }) {
  const lines = text.split("\n").filter((l) => l.trim());
  return (
    <div className="space-y-2.5 text-[16px] leading-relaxed text-ink">
      {lines.map((line, i) => {
        const clause = line.match(/^(\d+)\.\s/);
        const sub = line.match(/^([a-z])\.\s/);
        if (clause) return <p key={i} id={`clause-${clause[1]}`} className="rounded-lg target:bg-sand-soft target:ring-4 target:ring-sand-soft"><span className="font-bold text-brand">{clause[1]}.</span> {line.slice(clause[0].length)}</p>;
        if (sub) return <p key={i} className="pl-6"><span className="font-semibold text-ink-soft">{sub[1]}.</span> {line.slice(sub[0].length)}</p>;
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}

export default async function ArticlePage({ params }: { params: Promise<{ n: string }> }) {
  const n = Number((await params).n);
  const a = getArticle(n);
  if (!a) notFound();
  const prev = getArticle(n - 1);
  const next = getArticle(n + 1);

  return (
    <div className="container-app max-w-3xl pt-10">
      <Link href="/articles" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All articles
      </Link>
      <p className="eyebrow mt-6">{law.source.short}</p>
      <h1 className="mt-2 font-display text-[clamp(1.9rem,5vw,2.8rem)] font-bold leading-tight tracking-[-0.02em]">
        Article {a.n}: {a.title}
      </h1>

      <article className="card mt-6 p-5 sm:p-7">
        <Body text={a.text} />
      </article>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={`/?q=${encodeURIComponent(`What does Article ${a.n} (${a.title}) mean for me?`)}`} className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-bold text-white hover:bg-brand">
          <MessageCircleQuestion className="h-4 w-4" aria-hidden="true" /> Ask about this article
        </Link>
        <a href={law.source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-ink ring-1 ring-ink/10 hover:ring-ink/30">
          Official source <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
      <p className="mt-4 text-xs text-ink-muted">{law.source.disclaimer}</p>

      <nav aria-label="Other articles" className="mt-10 grid gap-3 sm:grid-cols-2">
        {prev ? (
          <Link href={`/articles/${prev.n}`} className="card p-4 hover:-translate-y-0.5 transition">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">← Article {prev.n}</span>
            <span className="mt-1 block font-semibold">{prev.title}</span>
          </Link>
        ) : <span />}
        {next && (
          <Link href={`/articles/${next.n}`} className="card p-4 text-right hover:-translate-y-0.5 transition">
            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-ink-muted">Article {next.n} <ArrowRight className="h-3 w-3" aria-hidden="true" /></span>
            <span className="mt-1 block font-semibold">{next.title}</span>
          </Link>
        )}
      </nav>
    </div>
  );
}
