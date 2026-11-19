import test from "node:test";
import assert from "node:assert/strict";
import {
  freshProgress,
  levelId,
  canPlay,
  recordResult,
  aiProfile,
} from "../src/game/levels.js";
import { makeRound, updateBall, updateAI } from "../src/game/physics.js";
import { makeFire, earnFire, armFire, updateFire } from "../src/game/fire.js";
import {
  AI_LIMITS,
  FIRE_RULES,
  FIELD,
  SPEEDS,
} from "../src/config/settings.js";

test("unlocked replay, practice isolation and one-level advancement", () => {
  const p = freshProgress();
  assert.equal(p.unlocked, "1");
  assert.equal(canPlay("2", "progression", p), false);
  assert.equal(canPlay("2", "practice", p), true);
  assert.equal(canPlay("bad", "practice", p), false);
  assert.equal(recordResult(p, "999", "practice", "player").unlocked, "1");
  assert.equal(recordResult(p, "1", "progression", "computer").unlocked, "1");
  const won = recordResult(p, "1", "progression", "player");
  assert.equal(won.unlocked, "2");
  assert.equal(recordResult(won, "1", "progression", "player").unlocked, "2");
  assert.equal(recordResult(won, "2", "progression", "player").unlocked, "3");
  assert.equal(recordResult(p, "999", "practice", "player").wins, 0);
});
test("level IDs remain exact beyond floating point integers and invalid saves recover", () => {
  const n = "9007199254740993123456789";
  const p = freshProgress({ unlocked: n });
  assert.equal(
    recordResult(p, n, "progression", "player").unlocked,
    "9007199254740993123456790",
  );
  assert.equal(freshProgress({ unlocked: "NaN" }).unlocked, "1");
  for (const n of ["0", "-1", "1.2", "Infinity", "1e9"])
    assert.throws(() => levelId(n));
});
test("all levels have capped AI and first five remain slow and imprecise", () => {
  for (const level of [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "20",
    "60",
    "100",
    "99999999999999999999999999999",
  ]) {
    const p = aiProfile(level);
    assert.ok(p.reaction >= AI_LIMITS.minimumReaction);
    assert.ok(p.maxSpeed <= AI_LIMITS.maximumSpeed);
    assert.ok(p.acceleration <= AI_LIMITS.maximumAcceleration);
    assert.ok(p.error >= AI_LIMITS.minimumError);
    if (Number(level) <= 5) {
      assert.ok(p.reaction >= 0.48);
      assert.ok(p.maxSpeed <= 208);
      assert.ok(p.prediction <= 0.7);
      assert.ok(p.error <= 24);
    }
  }
});
test("AI has actual observation delay, acceleration bounds and speed-independent movement", () => {
  const rounds = Object.keys(SPEEDS).map((speed) => makeRound(speed, "100"));
  for (const r of rounds) {
    r.ball.y = 30;
    r.ball.vx = 400;
    r.computer.y = 218;
  }
  for (const r of rounds) {
    updateAI(r, 0.1, "turbo", 0, () => 0.5);
    assert.equal(r.ai.observations, 0);
    assert.equal(r.computer.y, 218);
  }
  for (let i = 0; i < 120; i++)
    for (const [idx, r] of rounds.entries()) {
      const old = r.computer.y,
        v = r.ai.velocity;
      updateAI(r, 1 / 120, Object.keys(SPEEDS)[idx], i / 120, () => 0.5);
      assert.ok(
        Math.abs(r.computer.y - old) <= r.ai.profile.maxSpeed / 120 + 0.00001,
      );
      assert.ok(
        Math.abs(r.ai.velocity - v) <=
          r.ai.profile.acceleration / 120 + 0.00001 || r.computer.y === 0,
      );
    }
  assert.equal(rounds[0].computer.y, rounds[1].computer.y);
  assert.equal(rounds[1].computer.y, rounds[2].computer.y);
});
function ready(r, side = "player") {
  for (let i = 0; i < 5; i++) earnFire(r.fire, side);
}
test("Fire must be earned and has one eight-second activation/return deadline", () => {
  const r = makeRound();
  assert.equal(armFire(r.fire, "player"), false);
  ready(r);
  assert.equal(r.fire.player.energy, 100);
  assert.equal(r.fire.player.remaining, 8);
  assert.equal(armFire(r.fire, "player"), true);
  assert.equal(armFire(r.fire, "player"), false);
  updateFire(r, 8);
  assert.equal(r.fire.player.armed, false);
  assert.equal(r.fire.player.energy, 0);
});
test("Fire ignites only on next return, keeps hitbox, cannot stack and ends on opponent return", () => {
  const r = makeRound("turbo");
  ready(r);
  armFire(r.fire, "player");
  r.ball.x = r.player.x + r.player.width + r.ball.radius + 1;
  r.ball.y = r.player.y + r.player.height / 2;
  r.ball.vx = -SPEEDS.turbo.maxBall;
  const radius = r.ball.radius;
  const events = [];
  updateBall(r, 1 / 120, "turbo", (type) => events.push(type));
  assert.equal(r.fire.owner, "player");
  assert.ok(events.includes("fireLaunch"));
  assert.equal(r.ball.radius, radius);
  assert.ok(Math.hypot(r.ball.vx, r.ball.vy) <= 750 + 0.00001);
  assert.equal(r.fire.player.energy, 0);
  r.ball.x = r.computer.x - r.ball.radius - 1;
  r.ball.y = r.computer.y + r.computer.height / 2;
  updateBall(r, 1 / 120, "turbo");
  assert.equal(r.fire.owner, null);
  assert.ok(Math.hypot(r.ball.vx, r.ball.vy) <= SPEEDS.turbo.maxBall + 0.00001);
  assert.ok(r.fire.computer.energy >= 30);
});
test("Fire expires with speed restoration, resets on points and pure mode disables both sides", () => {
  const r = makeRound();
  r.ball.vx = 500;
  r.fire.owner = "player";
  r.fire.normalSpeed = 400;
  r.fire.remaining = 0.1;
  updateFire(r, 0.2);
  assert.equal(r.ball.vx, 400);
  assert.equal(r.fire.owner, null);
  ready(r);
  r.ball.x = -20;
  r.ball.vx = -400;
  updateBall(r, 1 / 120, "classic");
  assert.equal(r.fire.player.energy, 0);
  const pure = makeFire(false);
  assert.equal(earnFire(pure, "player"), false);
  assert.equal(armFire(pure, "computer"), false);
});
