import test from "node:test"; import assert from "node:assert/strict";
import { csvCell, ddmmyyyy } from "../../src/lib/export.ts";
test("csv", () => { assert.equal(csvCell("a,b"), '"a,b"'); assert.equal(csvCell("=1+1"), "'=1+1"); assert.equal(ddmmyyyy("2026-11-10"), "10/11/2026"); });
