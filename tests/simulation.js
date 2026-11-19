import {
  makeRound,
  serveBall,
  updateBall,
  updateAI,
  clamp,
} from "../src/game/physics.js";
import { FIELD, SPEEDS, FIXED_STEP } from "../src/config/settings.js";
export function seededRandom(seed) {
  let n = seed >>> 0;
  return () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  };
}
function landing(ball, x) {
  const projected = ball.y + ball.vy * Math.max(0, (x - ball.x) / ball.vx),
    span = FIELD.height - ball.radius * 2;
  const folded =
    (((projected - ball.radius) % (2 * span)) + 2 * span) % (2 * span);
  return ball.radius + (folded > span ? 2 * span - folded : folded);
}
/** A limited simulation player: sampled observations, no teleporting or score edits. */
export function simulateMatch(level, speed, seed = 1, skill = "skilled") {
  const random = seededRandom(seed),
    r = makeRound(speed, level, false);
  serveBall(r, speed, -1, random);
  const reaction = skill === "beginner" ? 0.3 : 0.18;
  let timer = 0,
    target = FIELD.height / 2,
    elapsed = 0;
  const cap = skill === "beginner" ? 360 : SPEEDS[speed].paddle;
  for (let tick = 0; tick < 120 * 600 && !r.winner; tick++) {
    elapsed += FIXED_STEP;
    timer -= FIXED_STEP;
    if (timer <= 0) {
      timer = reaction;
      if (r.ball.vx < 0) {
        const intercept = landing(
          r.ball,
          r.player.x + r.player.width + r.ball.radius,
        );
        // Angle the ball toward the corner furthest from the opponent's current position.
        const direction =
          r.computer.y + r.computer.height / 2 < FIELD.height / 2 ? 1 : -1;
        const offset =
          skill === "beginner" ? 0 : direction * r.player.height * 0.37;
        target =
          intercept -
          offset +
          (random() - 0.5) * (skill === "beginner" ? 35 : 10);
      } else target = FIELD.height / 2;
    }
    const destination = clamp(
      target - r.player.height / 2,
      0,
      FIELD.height - r.player.height,
    );
    r.player.y += clamp(
      destination - r.player.y,
      -cap * FIXED_STEP,
      cap * FIXED_STEP,
    );
    updateAI(r, FIXED_STEP, speed, elapsed, random);
    updateBall(r, FIXED_STEP, speed);
    if (r.ball.vx === 0 && !r.winner)
      serveBall(r, speed, r.serveToward, random);
  }
  return { winner: r.winner, score: r.score, seconds: Math.round(elapsed) };
}
