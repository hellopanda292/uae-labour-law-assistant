# Retrieval evaluation

45 questions in everyday language, each labelled with the article(s) of Decree-Law 33/2021 that answer it (`eval/retrieval-questions.json`). A question counts as found at *k* when one of its articles is among the first *k* distinct articles returned. Re-run with `npm run eval:retrieval`.

| Search | Found 1st | In top 3 | In top 5 | MRR |
|---|---|---|---|---|
| BM25 on clause text | 62% | 69% | 78% | 0.69 |
| + article titles | 62% | 76% | 80% | 0.70 |
| + everyday-words dictionary (used by the app) | 62% | 82% | 87% | 0.73 |

## Not in the top 5 (app's search)

- Can I quit immediately if my employer doesn't pay me? — expected Article 45, got 43, 30, 22, 9, 53
- What leave do I get if a family member dies? — expected Article 32, got 15, 65, 3, 1, 37
- Can a 16 year old work? — expected Article 5, got 51, 29, 9, 54, 50
- How soon must my employer pay my final settlement? — expected Article 53, got 65, 60, 56, 13, 22
- Does unpaid leave count towards my service? — expected Article 33, got 31, 9, 45, 29, 30
- What happens to my contract if the company is sold? — expected Article 48, got 1, 42, 8, 43, 53
