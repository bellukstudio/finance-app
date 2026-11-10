import test from "node:test"; import assert from "node:assert/strict";
import { budgetStatus } from "../../src/lib/budget.ts";
import { resolvePeriod, budgetRange } from "../../src/lib/period.ts";
test("status budget", () => {
  assert.equal(budgetStatus(69, 100), "aman"); assert.equal(budgetStatus(70, 100), "warning");
  assert.equal(budgetStatus(90, 100), "critical"); assert.equal(budgetStatus(100, 100), "critical"); assert.equal(budgetStatus(101, 100), "over");
});
test("periode", () => {
  assert.deepEqual(resolvePeriod("month", undefined, undefined, "2026-11-10"), { key: "month", from: "2026-11-01", to: "2026-11-30" });
  assert.deepEqual(resolvePeriod("last_month", undefined, undefined, "2026-01-15"), { key: "last_month", from: "2025-12-01", to: "2025-12-31" });
  assert.deepEqual(resolvePeriod("week", undefined, undefined, "2026-11-10"), { key: "week", from: "2026-11-09", to: "2026-11-15" });
  assert.deepEqual(budgetRange("yearly", "2026-06-01"), { start: "2026-01-01", end: "2026-12-31" });
});
