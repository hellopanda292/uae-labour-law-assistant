import { law } from "../law";
import { DECLARATIONS, runTool } from "./tools";

/*
 * A small tool-calling agent on the Gemini REST API (no SDK): retrieval-augmented generation where
 * retrieval is a tool. The model searches the law (possibly several times, rephrasing in the law's
 * words), reads the clauses, and writes an answer that cites them. Gratuity amounts come from an
 * exact calculator, not the model.
 */

export type ChatTurn = { role: "user" | "assistant"; text: string };
export type ToolStep = { name: string; args: Record<string, unknown> };
type Part = { text?: string; functionCall?: { name: string; args?: Record<string, unknown> }; functionResponse?: unknown; thoughtSignature?: string };
type Content = { role: "user" | "model"; parts: Part[] };

const MAX_ROUNDS = 5;
const API = "https://generativelanguage.googleapis.com/v1beta/models";
// Models are tried in order: when one is missing, overloaded or out of free quota, the next is used.
const FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.5-flash-lite", "gemini-2.0-flash"];
const FALL_THROUGH = new Set([404, 429, 500, 503]);
let modelCache: { at: number; list: string[] } | null = null;

/** Flash models this key can use, newest first (asks Google; cached for an hour per server instance). */
async function modelList(key: string): Promise<string[]> {
  const wanted = process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : [];
  if (modelCache && Date.now() - modelCache.at < 3600_000) return [...new Set([...wanted, ...modelCache.list])];
  let list = FALLBACK_MODELS;
  try {
    const res = await fetch(`${API}?pageSize=200`, { headers: { "x-goog-api-key": key } });
    if (res.ok) {
      const data = (await res.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
      const version = (n: string) => Number(n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? 0);
      const rank = (n: string) => version(n) * 100 - (n.includes("preview") || n.includes("exp") ? 20 : 0) - (n.includes("lite") ? 10 : 0);
      const found = (data.models ?? [])
        .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m) => m.name.replace(/^models\//, ""))
        .filter((n) => /^gemini-[\d.]+-flash/.test(n) && !/(image|tts|audio|live|thinking|8b)/.test(n) && !/-\d{3}$/.test(n))
        .sort((a, b) => rank(b) - rank(a));
      if (found.length) list = found.slice(0, 5);
    }
  } catch {
    // keep the fallback list
  }
  modelCache = { at: Date.now(), list };
  console.log("gemini models:", list.join(", "));
  return [...new Set([...wanted, ...list])];
}

const SYSTEM = `You answer questions about the UAE Labour Law: ${law.source.title}, as published on the UAE Legislation portal (last updated ${law.source.last_updated}). It covers private-sector workers in the UAE.

Rules:
- Always call search_law (or get_article) before answering, and answer only from the clauses the tools return. Never rely on memory of the law: it changed in 2022.
- Cite every rule you state with its article, as a markdown link to the page path from the tool, like [Article 29](/articles/29) or [Article 43(1)](/articles/43#clause-1). Only use paths that appear in tool results.
- Use the law's exact numbers (days, percentages, AED amounts). For any gratuity amount, call calculate_gratuity; do not do that arithmetic yourself.
- If the retrieved clauses don't answer the question, say the law text here doesn't cover it and suggest the Ministry of Human Resources & Emiratisation (MOHRE). Mention when the law leaves details to the Executive Regulation, which this tool does not include.
- Say when the law doesn't apply: domestic workers, government employees, armed forces (Article 3); DIFC and ADGM free zones have their own employment laws.
- Keep answers short and plain: about 150 words, bullet points for lists. Explain legal terms in simple words (the law says "warning period" for notice period).
- End with one line: "General information, not legal advice." Do not add it twice.
- Reply in the user's language (English, Hindi or Hinglish, Arabic). Keep article citations as they are.
- Politely decline questions that are not about UAE employment.`;

export class AgentError extends Error {
  constructor(message: string, public status: number, public dailyQuotaUsed = false) {
    super(message);
  }
}

const CALL_TIMEOUT_MS = 12000;
const TOTAL_BUDGET_MS = 50000; // the API route may run for 60 s

async function callGemini(model: string, key: string, contents: Content[]) {
  const res = await fetch(`${API}/${model}:generateContent`, {
    method: "POST",
    signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents,
      tools: [{ functionDeclarations: DECLARATIONS }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1200 },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new AgentError(`Gemini ${res.status}: ${body.slice(0, 1500)}`, res.status);
  }
  return (await res.json()) as { candidates?: { content?: Content; finishReason?: string }[] };
}

export async function ask(history: ChatTurn[], key: string) {
  const contents: Content[] = history.map((t) => ({ role: t.role === "user" ? "user" : "model", parts: [{ text: t.text }] }));
  const steps: ToolStep[] = [];
  const MODELS = await modelList(key);
  const started = Date.now();
  let modelIndex = 0;
  let dailyLimited = 0; // models that refused because today's free quota is used up

  for (let round = 0; round <= MAX_ROUNDS; round++) {
    let data;
    try {
      data = await callGemini(MODELS[modelIndex], key, contents);
    } catch (e) {
      // A timeout counts like "busy": move on to the next model.
      const status = e instanceof AgentError ? e.status : (e as Error).name === "TimeoutError" ? 503 : 0;
      const quota = (e as Error).message.match(/"quotaId":\s*"([^"]+)"/)?.[1];
      console.warn(`model ${MODELS[modelIndex]} failed with ${status || (e as Error).message}${quota ? ` (${quota})` : ""}`);
      if (quota?.includes("PerDay")) dailyLimited++;
      if (FALL_THROUGH.has(status) && modelIndex < MODELS.length - 1 && Date.now() - started < TOTAL_BUDGET_MS - CALL_TIMEOUT_MS) {
        modelIndex++;
        round--;
        continue;
      }
      throw new AgentError((e as Error).message, status || 500, dailyLimited > 0 && dailyLimited >= modelIndex);
    }
    const content = data.candidates?.[0]?.content;
    const parts = content?.parts ?? [];
    const calls = parts.filter((p) => p.functionCall);
    if (!calls.length || round === MAX_ROUNDS) {
      const text = parts.map((p) => p.text ?? "").join("").trim();
      return { answer: text || "Sorry, I couldn't produce an answer. Please rephrase the question.", steps, model: MODELS[modelIndex] };
    }
    // Keep the model's turn exactly as sent (it may carry thought signatures), then answer each call.
    contents.push({ role: "model", parts });
    contents.push({
      role: "user",
      parts: calls.map((p) => {
        const { name, args = {} } = p.functionCall!;
        steps.push({ name, args });
        return { functionResponse: { name, response: { result: runTool(name, args) } } };
      }),
    });
  }
  throw new AgentError("Too many tool rounds", 500);
}
