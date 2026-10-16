"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, BookOpen, Loader2, RotateCcw, Scale, User } from "lucide-react";
import { Markdown } from "./Markdown";
import { articleHref } from "@/lib/law";
import { search, type Hit } from "@/lib/search";

type Step = { name: string; args: Record<string, unknown> };
type Message = { role: "user" | "assistant"; text: string; steps?: Step[]; error?: boolean; fallback?: Hit[] };

const EXAMPLES = [
  "How many days of annual leave do I get?",
  "What notice period do I have to give if I resign?",
  "Can my employer keep my passport?",
  "I earned AED 6,000 basic for 4 years. What is my gratuity?",
  "Is overtime paid extra?",
  "Can I be fired while on sick leave?",
];

/** The clauses the AI read, re-created from its tool calls (search is deterministic). */
function sourcesFor(steps: Step[]) {
  const seen = new Map<string, { article: number; clause: string | null; title: string }>();
  for (const s of steps) {
    if (s.name === "search_law") for (const h of search(String(s.args.query ?? ""), 6)) seen.set(h.id, { article: h.article, clause: h.clause, title: h.title });
    if (s.name === "get_article" && Number(s.args.number)) seen.set(String(s.args.number), { article: Number(s.args.number), clause: null, title: "" });
  }
  return [...seen.values()];
}

function Fallback({ hits }: { hits: Hit[] }) {
  if (!hits.length) return <p className="mt-2 text-sm">No matching articles found. Try other words, or browse <Link href="/articles" className="font-semibold text-brand underline">all articles</Link>.</p>;
  return (
    <ul className="mt-3 space-y-2">
      {hits.slice(0, 4).map((h) => (
        <li key={h.id} className="rounded-xl bg-white p-3 text-ink ring-1 ring-line">
          <Link href={articleHref(h.article, h.clause)} className="text-sm font-bold text-brand hover:underline">
            Article {h.article}{h.clause && /^\d+$/.test(h.clause) ? `(${h.clause})` : ""} · {h.title}
          </Link>
          <p className="mt-1 line-clamp-4 whitespace-pre-line text-sm text-ink-soft">{h.text}</p>
        </li>
      ))}
    </ul>
  );
}

export function Ask() {
  const params = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(() => params.get("q") ?? "");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (messages.length) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const next: Message[] = [...messages, { role: "user", text: q }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.filter((m) => !m.error).map(({ role, text }) => ({ role, text })) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Without the AI, still help: show the clauses a plain search finds.
        setMessages([...next, { role: "assistant", text: data.error ?? "The AI is not available right now.", error: true, fallback: search(q, 6) }]);
        return;
      }
      setMessages([...next, { role: "assistant", text: data.answer, steps: data.steps }]);
    } catch {
      setMessages([...next, { role: "assistant", text: "Couldn't reach the AI. Here are the most relevant articles from a search instead.", error: true, fallback: search(q, 6) }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="card flex min-h-[420px] flex-col overflow-hidden">
      <div className="flex-1 space-y-5 p-4 sm:p-6" aria-live="polite">
        {messages.length === 0 && (
          <div>
            <p className="font-display text-lg font-bold">Try asking</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {EXAMPLES.map((e) => (
                <button key={e} type="button" onClick={() => send(e)} className="rounded-2xl border border-line bg-white px-4 py-3 text-left text-sm font-semibold text-ink-soft transition hover:-translate-y-0.5 hover:border-brand/40 hover:text-ink">
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${m.role === "user" ? "bg-ink text-white" : "bg-brand text-white"}`} aria-hidden="true">
              {m.role === "user" ? <User className="h-4 w-4" /> : <Scale className="h-4 w-4" />}
            </span>
            <div className={`min-w-0 max-w-[88%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${m.role === "user" ? "bg-ink text-white" : m.error ? "bg-sand-soft text-ink" : "bg-white text-ink ring-1 ring-line"}`}>
              <span className="sr-only">{m.role === "user" ? "You:" : "Assistant:"}</span>
              {m.role === "user" || m.error ? <p className="whitespace-pre-wrap">{m.text}</p> : <Markdown text={m.text} />}
              {m.fallback && <Fallback hits={m.fallback} />}
              {m.steps && m.steps.length > 0 && (
                <details className="mt-3 border-t border-line pt-2 text-xs text-ink-muted">
                  <summary className="flex cursor-pointer list-none items-center gap-1.5 font-semibold hover:text-ink">
                    <BookOpen className="h-3.5 w-3.5" aria-hidden="true" /> Clauses the AI read
                  </summary>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {sourcesFor(m.steps).map((s) => (
                      <li key={`${s.article}-${s.clause}`}>
                        <Link href={articleHref(s.article, s.clause)} className="inline-block rounded-full bg-brand-soft px-2.5 py-1 font-semibold text-brand-dark hover:underline">
                          Art. {s.article}{s.clause && /^\d+$/.test(s.clause) ? `(${s.clause})` : ""}
                        </Link>
                      </li>
                    ))}
                    {m.steps.some((s) => s.name === "calculate_gratuity") && (
                      <li><Link href="/gratuity" className="inline-block rounded-full bg-sand-soft px-2.5 py-1 font-semibold text-ink hover:underline">Gratuity calculator</Link></li>
                    )}
                  </ul>
                </details>
              )}
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex items-center gap-3 text-sm font-semibold text-ink-muted">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /></span>
            Reading the law…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form className="border-t border-line bg-white/70 p-3 sm:p-4" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <div className="flex items-end gap-2">
          <label htmlFor="question" className="sr-only">Your question</label>
          <textarea
            id="question"
            ref={inputRef}
            rows={1}
            maxLength={600}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask about leave, notice, salary, gratuity…"
            className="max-h-40 min-h-[48px] w-full resize-none rounded-2xl border border-line bg-white px-4 py-3 text-[15px] focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
          />
          {messages.length > 0 && (
            <button type="button" onClick={() => setMessages([])} disabled={busy} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-ink-soft ring-1 ring-line hover:text-ink disabled:opacity-50" aria-label="Start a new conversation">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <button type="submit" disabled={busy || !input.trim()} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-ink text-white transition hover:bg-brand disabled:opacity-40" aria-label="Send">
            <ArrowUp className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <p className="mt-2 px-1 text-xs text-ink-muted">Answers cite the articles they come from. General information, not legal advice.</p>
      </form>
    </div>
  );
}
