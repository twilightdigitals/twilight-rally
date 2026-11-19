import test from "node:test";
import assert from "node:assert/strict";
import { makeRound, updateAI, updateBall } from "../src/game/physics.js";
import { SPEEDS } from "../src/config/settings.js";
export function returnRate(level, speed, angled = false) {
  let hits = 0;
  const total = 100;
  for (let i = 0; i < total; i++) {
    const r = makeRound(speed, level, false);
    r.ball.x = 100;
    r.ball.y = 90 + ((i * 73) % 360);
    const vy = angled
      ? (i % 2 ? 1 : -1) * SPEEDS[speed].ball * 0.8
      : ((i % 3) - 1) * 35;
    const vx = Math.sqrt(SPEEDS[speed].ball ** 2 - vy ** 2);
    r.ball.vx = vx;
    r.ball.vy = vy;
    for (let k = 0; k < 1200; k++) {
      let hit = false;
      updateAI(r, 1 / 120, speed, k / 120, () => ((i * 37) % 100) / 100);
      updateBall(r, 1 / 120, speed, (t) => {
        if (t === "paddle") hit = true;
      });
      if (hit) {
        hits++;
        break;
      }
      if (r.score.player) break;
    }
  }
  return hits / total;
}
test("Level 8 reliably defends routine shots but can miss angled attacks", () => {
  for (const s of Object.keys(SPEEDS)) {
    const routine = returnRate("8", s),
      angled = returnRate("8", s, true);
    assert.ok(routine >= 0.95, `${s} routine ${routine}`);
    assert.ok(angled < routine, `${s} angles should expose positioning`);
  }
});
test("targeting error stays consistent during an incoming shot", () => {
  const r = makeRound("classic", "8");
  r.ball.vx = 365;
  r.ai.untilObservation = 0;
  updateAI(r, 0.01, "classic", 0, () => 1);
  const error = r.ai.shotError;
  r.ai.untilObservation = 0;
  updateAI(r, 0.01, "classic", 1, () => 0);
  assert.equal(r.ai.shotError, error);
});

test("one aiming sample per incoming shot", () => {
  const r = makeRound("classic", "8");
  r.ball.vx = 365;
  let calls = 0;
  for (let i = 0; i < 5; i++) {
    r.ai.untilObservation = 0;
    updateAI(r, 0.01, "classic", i, () => {
      calls++;
      return 0.5;
    });
  }
  assert.equal(calls, 1);
});
