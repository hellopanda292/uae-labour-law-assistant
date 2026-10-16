"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { calculateGratuity } from "@/lib/gratuity";

const aed = (n: number) => "AED " + n.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: n % 1 ? 2 : 0 });

function articleLinks(list: string) {
  // "51.2(a), 51.3" → links to the article's clause
  return list.split(",").map((s, i) => {
    const m = s.trim().match(/^(\d+)(?:\.(\d+))?/);
    if (!m) return null;
    const href = m[2] ? `/articles/${m[1]}#clause-${m[2]}` : `/articles/${m[1]}`;
    return (
      <span key={i}>
        {i > 0 && ", "}
        <Link href={href} className="font-semibold text-brand hover:underline">Art. {s.trim()}</Link>
      </span>
    );
  });
}

export function GratuityCalculator() {
  const [wage, setWage] = useState(6000);
  const [mode, setMode] = useState<"dates" | "years">("dates");
  const [start, setStart] = useState("2020-01-01");
  const [end, setEnd] = useState("2026-06-30");
  const [years, setYears] = useState(5);
  const [absence, setAbsence] = useState(0);
  const [national, setNational] = useState(false);

  const result = useMemo(() => {
    try {
      return { ok: true as const, r: calculateGratuity({ monthlyBasicWage: wage, ...(mode === "dates" ? { startDate: start, endDate: end } : { years }), unpaidAbsenceDays: absence, national }) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [wage, mode, start, end, years, absence, national]);

  const field = "w-full min-w-0 rounded-2xl border border-line bg-white px-3.5 py-3 text-[15px] focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15";

  return (
    <div className="card grid gap-8 p-5 sm:p-7 lg:grid-cols-[1fr_1fr]">
      <form className="grid content-start gap-5" onSubmit={(e) => e.preventDefault()}>
        <label className="grid gap-1.5">
          <span className="text-sm font-bold text-ink-soft">Last monthly <em>basic</em> wage (AED)</span>
          <input type="number" inputMode="decimal" min={1} value={Number.isFinite(wage) ? wage : ""} onChange={(e) => setWage(Number(e.target.value))} className={field} />
          <span className="text-xs text-ink-muted">Basic wage only, without housing, transport or other allowances (Article 51(2)).</span>
        </label>

        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-bold text-ink-soft">Length of service</legend>
          <div className="flex gap-1 rounded-2xl bg-[#efe9dc] p-1">
            {(["dates", "years"] as const).map((m) => (
              <label key={m} className="relative flex-1">
                <input type="radio" name="mode" className="peer absolute inset-0 cursor-pointer opacity-0" checked={mode === m} onChange={() => setMode(m)} />
                <span className="block rounded-xl px-3 py-2.5 text-center text-sm font-bold text-ink-soft transition peer-checked:bg-white peer-checked:text-ink peer-checked:shadow peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brand">
                  {m === "dates" ? "Start and end dates" : "Number of years"}
                </span>
              </label>
            ))}
          </div>
          {mode === "dates" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5"><span className="text-xs font-semibold text-ink-muted">First day of work</span><input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={field} /></label>
              <label className="grid gap-1.5"><span className="text-xs font-semibold text-ink-muted">Last day of work</span><input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={field} /></label>
            </div>
          ) : (
            <label className="grid gap-1.5"><span className="text-xs font-semibold text-ink-muted">Years (decimals allowed, e.g. 3.5)</span><input type="number" inputMode="decimal" min={0} step={0.1} value={Number.isFinite(years) ? years : ""} onChange={(e) => setYears(Number(e.target.value))} className={field} /></label>
          )}
        </fieldset>

        <label className="grid gap-1.5">
          <span className="text-sm font-bold text-ink-soft">Days of unpaid absence or unpaid leave</span>
          <input type="number" inputMode="numeric" min={0} value={absence} onChange={(e) => setAbsence(Math.max(0, Number(e.target.value) || 0))} className={field} />
          <span className="text-xs text-ink-muted">These don&apos;t count as service (Articles 33 and 51(4)).</span>
        </label>

        <label className="flex items-center gap-3 text-sm font-semibold text-ink-soft">
          <input type="checkbox" checked={national} onChange={(e) => setNational(e.target.checked)} className="h-5 w-5 accent-[var(--color-brand)]" />
          I am a UAE national
        </label>
      </form>

      <div className="flex flex-col gap-4 rounded-[20px] bg-ink p-6 text-white" aria-live="polite">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/65">End-of-service gratuity</p>
        {!result.ok ? (
          <p className="text-lg font-semibold text-[#ffd59a]">{result.error}</p>
        ) : !result.r.eligible ? (
          <>
            <p className="font-display text-[clamp(1.8rem,5vw,2.6rem)] font-bold leading-none">No gratuity</p>
            <p className="text-white/85">{result.r.reason}</p>
          </>
        ) : (
          <>
            <p className="font-display text-[clamp(2.2rem,6vw,3.2rem)] font-bold leading-none tabular-nums">{aed(result.r.gratuity)}</p>
            <p className="text-sm text-white/75">
              {result.r.gratuityDays} days of basic wage for {result.r.serviceYears} years of service{result.r.capped ? ", capped at two years' wage" : ""}.
            </p>
          </>
        )}
        {result.ok && (
          <ol className="mt-2 space-y-2.5 border-t border-white/15 pt-4 text-sm">
            {result.r.steps.map((s, i) => (
              <li key={i} className="grid grid-cols-[22px_1fr] gap-2">
                <span className="font-bold text-white/50">{i + 1}.</span>
                <span>
                  {s.text} <span className="whitespace-nowrap text-xs [&_a]:text-[#9fe3c9]">({articleLinks(s.article)})</span>
                </span>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-auto flex items-start gap-2 pt-2 text-xs text-white/60">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          For full-time workers under Decree-Law 33/2021. The employer may deduct amounts owed by law or a court judgment (Article 51(7)); contracts from before 2022 may have older terms (Article 68). General information, not legal advice.
        </p>
      </div>
    </div>
  );
}
