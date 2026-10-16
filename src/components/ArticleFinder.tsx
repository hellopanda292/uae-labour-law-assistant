"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { articleHref } from "@/lib/law";
import { search } from "@/lib/search";

/** Search box over the law's clauses (BM25, runs in the browser, no AI). */
export function ArticleFinder() {
  const [q, setQ] = useState("");
  const hits = useMemo(() => (q.trim().length >= 3 ? search(q, 8) : []), [q]);

  return (
    <div className="card p-4 sm:p-5">
      <label htmlFor="find" className="text-sm font-bold text-ink-soft">Find the article for your question</label>
      <div className="relative mt-2">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
        <input
          id="find"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. notice period, passport, sick leave, overtime"
          className="w-full rounded-2xl border border-line bg-white py-3 pl-11 pr-4 text-[15px] focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
        />
      </div>
      {q.trim().length >= 3 && (
        <ul className="mt-3 space-y-2" aria-live="polite">
          {hits.length === 0 && <li className="text-sm text-ink-muted">No matching clauses. Try other words.</li>}
          {hits.map((h) => (
            <li key={h.id}>
              <Link href={articleHref(h.article, h.clause)} className="block rounded-xl bg-white p-3 ring-1 ring-line transition hover:ring-brand/40">
                <span className="text-sm font-bold text-brand">
                  Article {h.article}{h.clause && /^\d+$/.test(h.clause) ? `(${h.clause})` : ""} · {h.title}
                </span>
                <span className="mt-1 line-clamp-3 block whitespace-pre-line text-sm text-ink-soft">{h.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
