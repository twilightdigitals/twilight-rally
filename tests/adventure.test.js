import test from "node:test";
import assert from "node:assert/strict";
import { freshProgress, recordResult } from "../src/game/levels.js";
test("Adventure points reward first clears only and remain exact", () => {
  const p = freshProgress();
  const win = recordResult(p, "1", "progression", "player");
  assert.equal(win.points, "110");
  assert.equal(recordResult(win, "1", "progression", "player").points, "110");
  assert.equal(recordResult(win, "99", "practice", "player").points, "110");
  assert.equal(recordResult(win, "2", "progression", "computer").points, "110");
  assert.equal(recordResult(win, "2", "progression", "player").points, "230");
  assert.equal(freshProgress({ points: "bad" }).points, "0");
});
