import { calculateGratuity } from "../gratuity";
import { articleHref, getArticle } from "../law";
import { search } from "../search";

/*
 * Tools the assistant can call. Retrieval (search_law, get_article) returns the law's own words
 * with article and clause numbers; the gratuity tool does the arithmetic of Article 51 exactly, so
 * the language model never has to.
 */

type Args = Record<string, unknown>;
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : undefined);

function searchLaw(args: Args) {
  const query = String(args.query ?? "").slice(0, 300);
  const hits = search(query, 6);
  return {
    query,
    passages: hits.map((h) => ({ cite: `Article ${h.article}${h.clause && /^\d+$/.test(h.clause) ? `(${h.clause})` : ""}`, article: h.article, title: h.title, page: articleHref(h.article, h.clause), text: h.text })),
    note: hits.length ? undefined : "No matching clauses. Try other words, e.g. the law says 'warning period' for notice period and 'wage' for salary.",
  };
}

function getArticleTool(args: Args) {
  const n = num(args.number);
  const a = n ? getArticle(Math.round(n)) : undefined;
  if (!a) return { error: "The law has Articles 1 to 74." };
  return { cite: `Article ${a.n}`, title: a.title, page: articleHref(a.n), text: a.text };
}

function gratuityTool(args: Args) {
  try {
    const r = calculateGratuity({
      monthlyBasicWage: num(args.monthly_basic_wage_aed) ?? NaN,
      startDate: typeof args.start_date === "string" ? args.start_date : undefined,
      endDate: typeof args.end_date === "string" ? args.end_date : undefined,
      years: num(args.years_of_service),
      unpaidAbsenceDays: num(args.unpaid_absence_days),
      national: args.uae_national === true,
    });
    return { ...r, calculator_page: "/gratuity", note: "Based on the basic wage only (not allowances). The employer may deduct amounts owed by law or by a judgment (Article 51(7))." };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export const TOOLS: Record<string, (args: Args) => unknown> = {
  search_law: searchLaw,
  get_article: getArticleTool,
  calculate_gratuity: gratuityTool,
};

export const DECLARATIONS = [
  {
    name: "search_law",
    description: "Search the UAE Labour Law (Decree-Law 33/2021) and get the most relevant clauses with their article numbers. Use the law's own words when you can: 'warning period' (notice), 'wage' (salary), 'official documents' (passport), 'end-of-service gratuity'. Call it more than once for questions with several parts.",
    parameters: { type: "OBJECT", properties: { query: { type: "STRING" } }, required: ["query"] },
  },
  {
    name: "get_article",
    description: "Full text of one article (1 to 74).",
    parameters: { type: "OBJECT", properties: { number: { type: "INTEGER" } }, required: ["number"] },
  },
  {
    name: "calculate_gratuity",
    description: "Exact end-of-service gratuity under Article 51 for a full-time worker. Needs the monthly basic wage and either the dates of service or the years of service.",
    parameters: {
      type: "OBJECT",
      properties: {
        monthly_basic_wage_aed: { type: "NUMBER", description: "Basic wage only, without allowances" },
        start_date: { type: "STRING", description: "YYYY-MM-DD" },
        end_date: { type: "STRING", description: "YYYY-MM-DD" },
        years_of_service: { type: "NUMBER" },
        unpaid_absence_days: { type: "INTEGER" },
        uae_national: { type: "BOOLEAN" },
      },
      required: ["monthly_basic_wage_aed"],
    },
  },
];

export function runTool(name: string, args: Args) {
  const fn = TOOLS[name];
  if (!fn) return { error: `Unknown tool ${name}` };
  try {
    return fn(args ?? {});
  } catch (e) {
    return { error: `Tool failed: ${(e as Error).message}` };
  }
}
