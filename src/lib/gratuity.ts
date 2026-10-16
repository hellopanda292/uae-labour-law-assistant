/*
 * End-of-service gratuity for a foreign full-time worker, following Article 51 of
 * Decree-Law 33/2021 and the day counts of Article 67:
 *   - at least one year of continuous service is required (51.2, 51.3)
 *   - 21 days of basic wage for each of the first five years, 30 days for each year after (51.2)
 *   - parts of a year count in proportion (51.3); unpaid absence days don't count (51.4)
 *   - based on the last basic wage (51.5); total capped at two years' wage (51.6)
 *   - a year is 365 days and a month is 30 days (67), so one day's basic wage = monthly basic / 30
 * UAE nationals are covered by the pensions law instead (51.1).
 */

export interface GratuityInput {
  monthlyBasicWage: number;
  /** Either the dates of service... */
  startDate?: string; // YYYY-MM-DD, first day of work
  endDate?: string; // YYYY-MM-DD, last day of work
  /** ...or the length of service in years (decimals allowed). */
  years?: number;
  unpaidAbsenceDays?: number;
  national?: boolean;
}

export interface GratuityResult {
  eligible: boolean;
  reason?: string;
  serviceDays: number;
  serviceYears: number;
  dailyBasicWage: number;
  daysAt21: number; // years counted at 21 days (max 5)
  daysAt30: number; // years counted at 30 days
  gratuityDays: number;
  uncapped: number;
  cap: number;
  capped: boolean;
  gratuity: number;
  steps: { text: string; article: string }[];
}

const DAY_MS = 86_400_000;
const round2 = (n: number) => Math.round(n * 100) / 100;

export function serviceDaysBetween(start: string, end: string) {
  const s = Date.parse(start + "T00:00:00Z");
  const e = Date.parse(end + "T00:00:00Z");
  if (!Number.isFinite(s) || !Number.isFinite(e)) throw new Error("Dates must be in YYYY-MM-DD format.");
  if (e < s) throw new Error("The last day of work is before the first day.");
  return Math.round((e - s) / DAY_MS) + 1; // both the first and the last day are working days
}

export function calculateGratuity(input: GratuityInput): GratuityResult {
  const wage = input.monthlyBasicWage;
  if (!Number.isFinite(wage) || wage <= 0) throw new Error("Enter the monthly basic wage in AED.");
  const absence = Math.max(0, Math.round(input.unpaidAbsenceDays ?? 0));

  let totalDays: number;
  if (input.startDate && input.endDate) totalDays = serviceDaysBetween(input.startDate, input.endDate);
  else if (input.years !== undefined && Number.isFinite(input.years) && input.years >= 0) totalDays = input.years * 365; // kept exact, so 2.5 years is exactly 2.5 years
  else throw new Error("Give either the start and end dates or the years of service.");

  const serviceDays = Math.max(0, totalDays - absence);
  const serviceYears = serviceDays / 365;
  const daily = wage / 30;
  const steps: { text: string; article: string }[] = [];
  const base = { serviceDays: Math.round(serviceDays), serviceYears: round2(serviceYears), dailyBasicWage: round2(daily), daysAt21: 0, daysAt30: 0, gratuityDays: 0, uncapped: 0, cap: wage * 24, capped: false, gratuity: 0 };

  if (input.national) {
    return { ...base, eligible: false, reason: "UAE nationals receive end-of-service benefits under the pensions and social security law, not this formula.", steps: [{ text: "National workers: pensions and social security legislation applies.", article: "51.1" }] };
  }
  steps.push({ text: `Service counted: ${Math.round(serviceDays).toLocaleString("en-US")} days${absence ? ` (after removing ${absence} unpaid absence days)` : ""} = ${round2(serviceYears)} years, with a year of 365 days.`, article: absence ? "51.4, 67" : "67" });
  if (serviceDays < 365) {
    return { ...base, eligible: false, reason: "Less than one year of continuous service, so no gratuity is due.", steps: [...steps, { text: "A gratuity needs at least one full year of continuous service.", article: "51.2, 51.3" }] };
  }

  const at21 = Math.min(serviceYears, 5);
  const at30 = Math.max(serviceYears - 5, 0);
  const gratuityDays = at21 * 21 + at30 * 30;
  const uncapped = gratuityDays * daily;
  const cap = wage * 24;
  const gratuity = Math.min(uncapped, cap);

  steps.push({ text: `One day's basic wage: AED ${wage.toLocaleString("en-US")} ÷ 30 = AED ${round2(daily).toLocaleString("en-US")} (a month counts as 30 days).`, article: "51.5, 67" });
  steps.push({ text: `First ${round2(at21)} years × 21 days = ${round2(at21 * 21)} days.`, article: "51.2(a), 51.3" });
  if (at30 > 0) steps.push({ text: `Remaining ${round2(at30)} years × 30 days = ${round2(at30 * 30)} days.`, article: "51.2(b), 51.3" });
  steps.push({ text: `${round2(gratuityDays)} days × AED ${round2(daily).toLocaleString("en-US")} = AED ${round2(uncapped).toLocaleString("en-US")}.`, article: "51.2" });
  if (uncapped > cap) steps.push({ text: `Capped at two years' wage: 24 × AED ${wage.toLocaleString("en-US")} = AED ${cap.toLocaleString("en-US")}.`, article: "51.6" });

  return { ...base, eligible: true, daysAt21: round2(at21), daysAt30: round2(at30), gratuityDays: round2(gratuityDays), uncapped: round2(uncapped), cap, capped: uncapped > cap, gratuity: round2(gratuity), steps };
}
