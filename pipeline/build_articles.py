"""Turn the official English text of the UAE Labour Law into structured JSON.

Input:  data/source/*.txt     (the text of uaelegislation.gov.ae/en/legislations/1541, in order)
Output: data/law/decree-law-33-2021.txt   the full text in one file
        src/data/law.json                 articles, each split into passages (clauses) for search

    python pipeline/build_articles.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHUNKS = ROOT / "data" / "source"
SOURCE = {
    "title": "Federal Decree by Law No. (33) of 2021 Regulating Labour Relations",
    "short": "UAE Labour Law (Decree-Law 33/2021)",
    "url": "https://uaelegislation.gov.ae/en/legislations/1541",
    "issued": "2021-09-20",
    "effective": "2022-02-02",
    "last_updated": "2024-07-29",
    "disclaimer": "Official English translation from the UAE Legislation portal. For interpretation and application, the original Arabic text prevails.",
}
HEADING = re.compile(r"^Article \((\d+)\)[ \t]*(.*)$", re.M)  # [ \t], not \s: an untitled heading must not swallow the next line
CLAUSE = re.compile(r"^(\d+)\.\s")
DEFINITION = re.compile(r"^([A-Z][A-Za-z' ]{2,40}):\s")


def full_text() -> str:
    parts = [p.read_text(encoding="utf-8").strip() for p in sorted(CHUNKS.glob("*.txt"))]
    return "\n\n".join(parts) + "\n"


def split_articles(text: str) -> list[dict]:
    heads = list(HEADING.finditer(text))
    articles = []
    for i, h in enumerate(heads):
        body = text[h.end(): heads[i + 1].start() if i + 1 < len(heads) else len(text)].strip()
        articles.append({"n": int(h.group(1)), "title": h.group(2).strip(), "text": body})
    # Articles 59-64 have no title of their own: they continue "Penalties" (Article 58).
    for a in articles:
        if not a["title"] and 59 <= a["n"] <= 64:
            a["title"] = "Penalties"
    return articles


def passages(article: dict) -> list[dict]:
    """Split an article into its numbered clauses (sub-items a., b. stay with their clause).
    Article 1 is split into one passage per defined term."""
    lines = [l for l in article["text"].split("\n") if l.strip()]
    groups: list[list[str]] = []
    intro: list[str] = []
    for line in lines:
        starts = CLAUSE.match(line) or (article["n"] == 1 and DEFINITION.match(line))
        if starts:
            groups.append([line])
        elif groups:
            groups[-1].append(line)
        else:
            intro.append(line)
    if not groups:
        return [{"id": f"{article['n']}", "clause": None, "text": "\n".join(intro)}]
    out = []
    lead = " ".join(intro)  # e.g. "The Worker must:" belongs with every clause
    for g in groups:
        m = CLAUSE.match(g[0])
        clause = m.group(1) if m else DEFINITION.match(g[0]).group(1)
        body = "\n".join(g)
        out.append({"id": f"{article['n']}.{clause}", "clause": clause, "text": (lead + "\n" + body) if lead else body})
    return out


def build() -> dict:
    text = full_text()
    (ROOT / "data" / "law").mkdir(parents=True, exist_ok=True)
    (ROOT / "data" / "law" / "decree-law-33-2021.txt").write_text(text, encoding="utf-8")
    articles = split_articles(text)
    for a in articles:
        a["passages"] = passages(a)
    law = {"source": SOURCE, "articles": articles}
    out = ROOT / "src" / "data" / "law.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(law, ensure_ascii=False, indent=1), encoding="utf-8")
    return law


if __name__ == "__main__":
    law = build()
    n = len(law["articles"])
    p = sum(len(a["passages"]) for a in law["articles"])
    print(f"{n} articles, {p} passages, {sum(len(a['text']) for a in law['articles']):,} characters")
