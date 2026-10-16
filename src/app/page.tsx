import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, BookOpen, Calculator, ShieldCheck } from "lucide-react";
import { Ask } from "@/components/Ask";
import { articles, law } from "@/lib/law";

export default function HomePage() {
  return (
    <>
      <section className="container-app pb-8 pt-12 sm:pt-16">
        <p className="eyebrow flex flex-wrap items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-brand" aria-hidden="true" />
          For private-sector workers in the UAE · {law.source.short}
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-[clamp(2.3rem,6vw,4rem)] font-bold leading-[1.04] tracking-[-0.02em]">
          Know your rights at work, <span className="text-brand">article by article.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-ink-soft sm:text-lg">
          Ask about leave, notice periods, salary, overtime or gratuity in plain words. The assistant searches the official text of all{" "}
          {articles.length} articles of the UAE Labour Law and answers with links to the exact articles it used.
        </p>
      </section>

      <section className="container-app" aria-label="Ask a question">
        <Suspense fallback={<div className="card h-[420px]" />}>
          <Ask />
        </Suspense>
      </section>

      <section className="container-app mt-12 grid gap-4 md:grid-cols-3">
        <Link href="/articles" className="card group p-6 transition hover:-translate-y-0.5">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand text-white"><BookOpen className="h-5 w-5" aria-hidden="true" /></span>
          <h2 className="mt-4 font-display text-xl font-bold">Read the law</h2>
          <p className="mt-1.5 text-sm text-ink-soft">All {articles.length} articles, grouped by topic, with a search that understands everyday words like “notice” and “passport”.</p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand">Browse articles <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" /></span>
        </Link>
        <Link href="/gratuity" className="card group p-6 transition hover:-translate-y-0.5">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-sand text-white"><Calculator className="h-5 w-5" aria-hidden="true" /></span>
          <h2 className="mt-4 font-display text-xl font-bold">Gratuity calculator</h2>
          <p className="mt-1.5 text-sm text-ink-soft">Your end-of-service gratuity under Article 51, with every step of the calculation shown.</p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand">Calculate <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" /></span>
        </Link>
        <Link href="/about" className="card group p-6 transition hover:-translate-y-0.5">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-white"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></span>
          <h2 className="mt-4 font-display text-xl font-bold">Built to be checked</h2>
          <p className="mt-1.5 text-sm text-ink-soft">Every answer cites its source. The search is tested on questions it never saw; the AI never does gratuity arithmetic.</p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand">How it works <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" /></span>
        </Link>
      </section>
    </>
  );
}
