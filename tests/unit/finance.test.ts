import test from "node:test"; import assert from "node:assert/strict";
import { remaining, debtStatus, netWorth, sniffMime } from "../../src/lib/finance.ts";
test("sisa & status utang", () => {
  assert.equal(remaining(1000, [300, 200]), 500); assert.equal(remaining(1000, [1000]), 0);
  assert.equal(debtStatus(0, "2026-01-01", "2026-02-01"), "lunas"); assert.equal(debtStatus(5, "2026-01-01", "2026-02-01"), "terlambat");
  assert.equal(debtStatus(5, "2026-02-05", "2026-02-01"), "jatuh_tempo_dekat"); assert.equal(debtStatus(5, null, "2026-02-01"), "berjalan");
});
test("net worth", () => assert.equal(netWorth(1000, 500, 300), 1200));
test("magic bytes", () => {
  assert.equal(sniffMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
  assert.equal(sniffMime(new TextEncoder().encode("%PDF-1.7")), "application/pdf");
  assert.equal(sniffMime(new TextEncoder().encode("MZ\x90\x00 exe")), null);
});
