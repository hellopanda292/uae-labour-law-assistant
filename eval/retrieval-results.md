# Retrieval evaluation

Questions in everyday language, each labelled with the article(s) of Decree-Law 33/2021 that answer it. A question counts as found at *k* when one of its articles is among the first *k* distinct articles returned. Re-run with `npm run eval:retrieval`.

- **dev** (`retrieval-dev.json`): used while improving the search; its misses led to new dictionary entries.
- **test** (`retrieval-test.json`): written and committed before any tuning (see `retrieval-test.sha256` and the git history), never used for tuning.

## dev (45 questions)

| Search | Found 1st | In top 3 | In top 5 | MRR |
|---|---|---|---|---|
| BM25 on clause text | 62% | 69% | 78% | 0.69 |
| + article titles | 62% | 76% | 80% | 0.70 |
| + everyday-words dictionary (used by the app) | 69% | 93% | 98% | 0.81 |

Not in the top 5 with the app's search:

- Can I quit immediately if my employer doesn't pay me? (expected Article 45, got 43, 9, 33, 30, 22)

## test (30 questions)

| Search | Found 1st | In top 3 | In top 5 | MRR |
|---|---|---|---|---|
| BM25 on clause text | 47% | 60% | 70% | 0.56 |
| + article titles | 53% | 67% | 67% | 0.62 |
| + everyday-words dictionary (used by the app) | 67% | 90% | 93% | 0.78 |

Not in the top 5 with the app's search:

- Can my manager stop me from taking my holiday for 3 years? (expected Article 29, got 32, 16, 28, 31, 51)
- What are the penalties for disciplinary violations at work? (expected Article 39, got 64, 41, 62, 60, 40)
