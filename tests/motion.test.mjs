import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { motionSnapshot } from "../scripts/velvet-motion.mjs";

test("health light follows actual HP thresholds", () => {
  assert.equal(motionSnapshot({ value: 70, max: 100 }).health, "healthy");
  assert.equal(motionSnapshot({ value: 25, max: 100 }).health, "wounded");
  assert.equal(motionSnapshot({ value: 10, max: 100 }).health, "critical");
  assert.equal(motionSnapshot({ value: 0, max: 100 }).health, "zero");
});
test("zero maximum HP is unknown rather than a critical or dead character", () => {
  assert.equal(motionSnapshot({ value: 0, max: 0 }).health, "unknown");
  assert.equal(motionSnapshot({ value: 0, max: 0 }).pct, 0);
});
test("HP light and bar remain bounded with overshoot and negative HP", () => {
  assert.equal(motionSnapshot({ value: 120, max: 100 }).pct, 100);
  assert.equal(motionSnapshot({ value: -10, max: 100 }).pct, 0);
});
test("snapshots normalize values without mutating system data", () => {
  const hp = { value: "32", max: "64" };
  assert.deepEqual(motionSnapshot(hp, "7"), { value: 32, max: 64, pct: 50, health: "healthy", level: 7 });
  assert.deepEqual(hp, { value: "32", max: "64" });
});
test("D&D and PF2e use identical shared motion and presentation", () => {
  for (const path of ["scripts/velvet-motion.mjs", "styles/velvet-premium.css"]) {
    assert.equal(fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), fs.readFileSync(new URL(`../../pf2e-velvet-sheet/${path}`, import.meta.url), "utf8"));
  }
});
