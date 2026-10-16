import unittest

from build_articles import build, passages


class TestArticles(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.law = build()
        cls.by_n = {a["n"]: a for a in cls.law["articles"]}

    def test_all_74_articles_in_order(self):
        self.assertEqual([a["n"] for a in self.law["articles"]], list(range(1, 75)))

    def test_every_article_has_title_and_text(self):
        for a in self.law["articles"]:
            self.assertTrue(a["title"], a["n"])
            self.assertGreater(len(a["text"]), 40, a["n"])

    def test_known_facts(self):
        self.assertIn("Annual leave", self.by_n[29]["title"])
        self.assertIn("twenty-one (21) days", self.by_n[51]["text"])
        self.assertIn("not less than thirty (30) days, and not more than ninety (90) days", self.by_n[43]["text"])
        self.assertIn("three hundred and sixty-five (365) days", self.by_n[67]["text"])

    def test_clauses_keep_sub_items(self):
        clause2 = next(p for p in self.by_n[51]["passages"] if p["clause"] == "2")
        self.assertIn("a. The wage of twenty-one (21) days", clause2["text"])
        self.assertIn("b. The wage of thirty (30) days", clause2["text"])

    def test_lead_sentence_repeated_on_each_clause(self):
        for p in self.by_n[16]["passages"]:
            self.assertTrue(p["text"].startswith("The Worker must:"), p["id"])

    def test_definitions_split_per_term(self):
        ids = [p["id"] for p in self.by_n[1]["passages"]]
        self.assertIn("1.Basic Wage", ids)
        self.assertIn("1.Probation Period", ids)

    def test_article_without_clauses_is_one_passage(self):
        ps = passages({"n": 21, "title": "Weekly Rest", "text": "The worker shall be granted a paid weekly rest."})
        self.assertEqual(len(ps), 1)
        self.assertEqual(ps[0]["id"], "21")


if __name__ == "__main__":
    unittest.main()
