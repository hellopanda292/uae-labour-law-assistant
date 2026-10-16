import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateGratuity, serviceDaysBetween } from "../src/lib/gratuity";

test("three years: 21 days for each year", () => {
  const r = calculateGratuity({ monthlyBasicWage: 10000, years: 3 });
  assert.equal(r.eligible, true);
  assert.equal(r.gratuityDays, 63);
  assert.equal(r.gratuity, 21000); // 63 × 10,000 / 30
});

test("seven years: 5 × 21 days plus 2 × 30 days", () => {
  const r = calculateGratuity({ monthlyBasicWage: 9000, years: 7 });
  assert.equal(r.gratuityDays, 165);
  assert.equal(r.gratuity, 49500); // 165 × 300
});

test("parts of a year count in proportion", () => {
  const r = calculateGratuity({ monthlyBasicWage: 6000, years: 2.5 });
  assert.equal(r.gratuityDays, 52.5);
  assert.equal(r.gratuity, 10500); // 52.5 × 200
});

test("capped at two years' wage", () => {
  const r = calculateGratuity({ monthlyBasicWage: 10000, years: 30 });
  assert.equal(r.capped, true);
  assert.equal(r.gratuity, 240000);
  assert.ok(r.uncapped > 240000);
});

test("less than one year: no gratuity", () => {
  const r = calculateGratuity({ monthlyBasicWage: 8000, startDate: "2025-03-01", endDate: "2026-01-31" });
  assert.equal(r.eligible, false);
  assert.equal(r.gratuity, 0);
});

test("unpaid absence days are removed from service", () => {
  const full = calculateGratuity({ monthlyBasicWage: 8000, years: 1.1 });
  const less = calculateGratuity({ monthlyBasicWage: 8000, years: 1.1, unpaidAbsenceDays: 60 });
  assert.equal(less.eligible, false); // 401 - 60 = 341 days, under a year
  assert.equal(full.eligible, true);
});

test("dates count both the first and last day", () => {
  assert.equal(serviceDaysBetween("2023-01-01", "2023-12-31"), 365);
  assert.equal(serviceDaysBetween("2024-01-01", "2024-12-31"), 366);
  assert.throws(() => serviceDaysBetween("2024-02-01", "2024-01-01"));
});

test("UAE nationals: pensions law instead", () => {
  const r = calculateGratuity({ monthlyBasicWage: 20000, years: 10, national: true });
  assert.equal(r.eligible, false);
  assert.match(r.reason ?? "", /pensions/);
});

test("bad wage is rejected", () => {
  assert.throws(() => calculateGratuity({ monthlyBasicWage: 0, years: 3 }));
});
