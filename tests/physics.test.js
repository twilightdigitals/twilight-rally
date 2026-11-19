import test from "node:test";
import assert from "node:assert/strict";
import {
  makeRound,
  serveBall,
  updateBall,
  winnerForScore,
  clamp,
} from "../src/game/physics.js";
import { FIELD, SPEEDS } from "../src/config/settings.js";

test("clamp stays inside bounds", () => {
  assert.equal(clamp(-1, 0, 10), 0);
  assert.equal(clamp(12, 0, 10), 10);
});
test("match requires two-point lead after seven", () => {
  assert.equal(winnerForScore(7, 6), null);
  assert.equal(winnerForScore(8, 6), "player");
  assert.equal(winnerForScore(6, 8), "computer");
  assert.equal(winnerForScore(15, 14), "player");
});
test("serve uses chosen direction and speed", () => {
  const round = makeRound("classic");
  serveBall(round, "classic", -1, () => 0.5);
  assert.equal(round.ball.vx, -SPEEDS.classic.ball);
  assert.equal(round.ball.vy, 0);
});
test("ball bounces against top boundary", () => {
  const round = makeRound();
  round.ball.y = FIELD.ballRadius + 1;
  round.ball.vy = -200;
  round.ball.vx = 100;
  updateBall(round, 0.02, "classic");
  assert.ok(round.ball.vy > 0);
});
test("missing left paddle gives computer a point", () => {
  const round = makeRound();
  round.ball.x = -11;
  round.ball.y = 4;
  round.ball.vx = -400;
  updateBall(round, 1 / 120, "classic");
  assert.equal(round.score.computer, 1);
  assert.equal(round.ball.vx, 0);
});
test("ball reflects on paddle contact", () => {
  const round = makeRound();
  round.ball.x = round.player.x + round.player.width + round.ball.radius + 1;
  round.ball.y = round.player.y + round.player.height / 2;
  round.ball.vx = -425;
  updateBall(round, 1 / 120, "classic");
  assert.ok(round.ball.vx > 0);
  assert.equal(round.hits, 1);
});
