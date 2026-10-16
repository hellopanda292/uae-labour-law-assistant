import { law } from "@/lib/law";

export function Footer() {
  return (
    <footer className="border-t border-ink/10 py-10 text-sm text-ink-soft">
      <div className="container-app max-w-3xl">
        <p>
          Built by{" "}
          <a href="https://priyanshu-zihowa.vercel.app" className="font-bold text-ink hover:underline">
            Priyanshu Zihowa
          </a>{" "}
          · Built with Claude Code ·{" "}
          <a href="https://github.com/hellopanda292/uae-labour-law-assistant" className="font-bold text-ink hover:underline">
            Source code
          </a>
        </p>
        <p className="mt-2 text-xs leading-relaxed text-ink-muted">
          Law text: {law.source.title}, official English translation from the{" "}
          <a href={law.source.url} className="underline" target="_blank" rel="noopener noreferrer">
            UAE Legislation portal
          </a>{" "}
          (last updated {law.source.last_updated}); the Arabic original prevails. An independent student project, not affiliated with any government
          body. General information, not legal advice: for your case, contact MOHRE or a lawyer.
        </p>
      </div>
    </footer>
  );
}
