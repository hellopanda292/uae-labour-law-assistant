import lawJson from "@/data/law.json";

export interface Passage {
  id: string; // "29.1", "1.Basic Wage", or "21" for an article without clauses
  clause: string | null;
  text: string;
}

export interface Article {
  n: number;
  title: string;
  text: string;
  passages: Passage[];
}

export interface Law {
  source: { title: string; short: string; url: string; issued: string; effective: string; last_updated: string; disclaimer: string };
  articles: Article[];
}

export const law = lawJson as Law;
export const articles = law.articles;

export const getArticle = (n: number) => articles.find((a) => a.n === n);

/** Page link for an article, optionally jumping to a clause. */
export function articleHref(n: number, clause?: string | null) {
  return clause && /^\d+$/.test(clause) ? `/articles/${n}#clause-${clause}` : `/articles/${n}`;
}

// Chapters of the law, for the article index (the official text has no chapter headings, so these
// group articles by topic).
export const TOPICS: { title: string; from: number; to: number }[] = [
  { title: "General provisions", from: 1, to: 5 },
  { title: "Hiring and contracts", from: 6, to: 12 },
  { title: "Rights and obligations", from: 13, to: 16 },
  { title: "Working hours and rest", from: 17, to: 21 },
  { title: "Wages", from: 22, to: 27 },
  { title: "Holidays and leave", from: 28, to: 35 },
  { title: "Safety and work injuries", from: 36, to: 38 },
  { title: "Discipline", from: 39, to: 41 },
  { title: "Ending the contract", from: 42, to: 50 },
  { title: "End-of-service gratuity and dues", from: 51, to: 53 },
  { title: "Disputes and inspection", from: 54, to: 57 },
  { title: "Penalties", from: 58, to: 64 },
  { title: "Final provisions", from: 65, to: 74 },
];
