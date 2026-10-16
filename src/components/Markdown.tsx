import Link from "next/link";
import type { ReactNode } from "react";

// Tiny, safe markdown for AI answers: **bold**, [label](/internal-path), bullet and numbered lists,
// and plain "Article 29" mentions turned into links. No raw HTML is ever rendered.
const LINK_CLASS = "font-semibold text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand";

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\((\/[^)\s]*)\)|\bArticle \(?(\d{1,2})\)?(?:\((\d{1,2})\))?/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<strong key={m.index}>{inline(m[1])}</strong>);
    else if (m[2]) out.push(<Link key={m.index} href={m[3]} className={LINK_CLASS}>{m[2]}</Link>);
    else {
      const n = Number(m[4]);
      const href = m[5] ? `/articles/${n}#clause-${m[5]}` : `/articles/${n}`;
      out.push(n >= 1 && n <= 74 ? <Link key={m.index} href={href} className={LINK_CLASS}>{m[0]}</Link> : m[0]);
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={blocks.length} className={`my-2 space-y-1 pl-5 ${list.ordered ? "list-decimal" : "list-disc"}`}>
        {list.items.map((it, i) => <li key={i}>{inline(it)}</li>)}
      </Tag>,
    );
    list = null;
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      const ordered = !!numbered;
      if (list && list.ordered !== ordered) flush();
      list ??= { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
      continue;
    }
    flush();
    if (!line) continue;
    const heading = line.match(/^#{1,4}\s+(.*)$/);
    blocks.push(heading ? <p key={blocks.length} className="mt-2 font-bold">{inline(heading[1])}</p> : <p key={blocks.length} className="my-1.5">{inline(line)}</p>);
  }
  flush();
  return <>{blocks}</>;
}
