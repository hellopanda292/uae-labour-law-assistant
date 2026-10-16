import assert from "node:assert/strict";
import { test } from "node:test";
import { expandQuery, search, stem, tokenize } from "../src/lib/search";

const top = (q: string, k = 3) => search(q, k).map((h) => h.article);

test("stemming and stopwords", () => {
  assert.equal(stem("leaves"), "leave");
  assert.equal(stem("holidays"), "holiday");
  assert.equal(stem("penalties"), "penalty");
  assert.deepEqual(tokenize("The Worker's annual leave"), ["worker", "annual", "leave"]);
});

test("everyday words map to the law's words", () => {
  assert.match(expandQuery("What is my notice period?"), /warning/);
  assert.match(expandQuery("Can they keep my passport"), /official documents/);
  assert.match(expandQuery("my salary is late"), /wage/);
});

test("finds the right article for common questions", () => {
  assert.equal(top("How many days of annual leave do I get?")[0], 29);
  assert.ok(top("What is the notice period if I resign?").includes(43));
  assert.ok(top("Can my employer keep my passport?").includes(13));
  assert.equal(top("How is gratuity calculated?")[0], 51);
  assert.ok(top("maternity leave for a pregnant employee").includes(30));
});

test("asking for an article by number puts it first", () => {
  assert.equal(top("What does Article 19 say?")[0], 19);
  assert.equal(top("art. 45")[0], 45);
});

test("at most two clauses per article", () => {
  const hits = search("leave", 10);
  const counts = new Map<number, number>();
  for (const h of hits) counts.set(h.article, (counts.get(h.article) ?? 0) + 1);
  assert.ok([...counts.values()].every((c) => c <= 2));
});
