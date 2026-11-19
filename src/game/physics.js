import { makeAI } from "./ai.js";
export { updateAI } from "./ai.js";
import {
  makeFire,
  earnFire,
  igniteFire,
  endFire,
  updateFire,
  resetFire,
} from "./fire.js";
import {
  FIELD,
  SPEEDS,
  WINNING_SCORE,
  MAX_SCORE,
  FIRE_RULES,
} from "../config/settings.js";

export const clamp = (value, minimum, maximum) =>
  Math.max(minimum, Math.min(maximum, value));

export function winnerForScore(player, computer) {
  if (player >= MAX_SCORE || computer >= MAX_SCORE)
    return player > computer ? "player" : "computer";
  if (
    Math.max(player, computer) >= WINNING_SCORE &&
    Math.abs(player - computer) >= 2
  ) {
    return player > computer ? "player" : "computer";
  }
  return null;
}

export function makeRound(speed = "classic", level = "1", fireEnabled = true) {
  const config = SPEEDS[speed];
  if (!config) throw new Error(`Unsupported speed: ${speed}`);
  return {
    level,
    ai: makeAI(level),
    fire: makeFire(fireEnabled),
    player: {
      x: FIELD.inset,
      y: FIELD.height / 2 - FIELD.paddleHeight / 2,
      width: FIELD.paddleWidth,
      height: FIELD.paddleHeight,
    },
    computer: {
      x: FIELD.width - FIELD.inset - FIELD.paddleWidth,
      y: FIELD.height / 2 - FIELD.paddleHeight / 2,
      width: FIELD.paddleWidth,
      height: FIELD.paddleHeight,
    },
    ball: {
      x: FIELD.width / 2,
      y: FIELD.height / 2,
      vx: 0,
      vy: 0,
      radius: FIELD.ballRadius,
    },
    score: { player: 0, computer: 0 },
    hits: 0,
    bestRally: 0,
    winner: null,
    serveToward: Math.random() < 0.5 ? -1 : 1,
  };
}

/** Serve direction is explicit and angle is constrained away from near-horizontal locks. */
export function serveBall(
  round,
  speed,
  direction = round.serveToward,
  random = Math.random,
) {
  const magnitude = SPEEDS[speed].ball;
  const angle = (random() - 0.5) * 0.72;
  round.ball.x = FIELD.width / 2;
  round.ball.y = FIELD.height / 2;
  round.ball.vx = Math.cos(angle) * magnitude * direction;
  round.ball.vy = Math.sin(angle) * magnitude;
  round.hits = 0;
  round.ai.untilObservation = round.ai.profile.reaction;
  round.ai.velocity = 0;
}

export function updateBall(round, seconds, speed, onEvent = () => {}) {
  updateFire(round, seconds, onEvent);
  const ball = round.ball;
  const radius = ball.radius;
  const previousX = ball.x;
  const previousY = ball.y;
  ball.x += ball.vx * seconds;
  ball.y += ball.vy * seconds;

  if (ball.y - radius <= 0 && ball.vy < 0) {
    ball.y = radius + (radius - ball.y);
    ball.vy = Math.abs(ball.vy);
    onEvent("wall");
  } else if (ball.y + radius >= FIELD.height && ball.vy > 0) {
    ball.y = FIELD.height - radius - (ball.y + radius - FIELD.height);
    ball.vy = -Math.abs(ball.vy);
    onEvent("wall");
  }

  const paddle = ball.vx < 0 ? round.player : round.computer;
  const previousFront = ball.vx < 0 ? previousX - radius : previousX + radius;
  const currentFront = ball.vx < 0 ? ball.x - radius : ball.x + radius;
  const impactX = ball.vx < 0 ? paddle.x + paddle.width : paddle.x;
  const crossed =
    ball.vx < 0
      ? previousFront >= impactX && currentFront <= impactX
      : previousFront <= impactX && currentFront >= impactX;
  if (crossed) {
    const fraction = (impactX - previousFront) / (currentFront - previousFront);
    const impactY = previousY + (ball.y - previousY) * fraction;
    if (
      impactY + radius >= paddle.y &&
      impactY - radius <= paddle.y + paddle.height
    ) {
      const contact = clamp(
        (impactY - (paddle.y + paddle.height / 2)) / (paddle.height / 2),
        -1,
        1,
      );
      const side = paddle === round.player ? "player" : "computer";
      const returnedFire =
        round.fire.owner !== null && round.fire.owner !== side;
      endFire(round);
      const nextSpeed = Math.min(
        SPEEDS[speed].maxBall,
        Math.hypot(ball.vx, ball.vy) * 1.045 + 5,
      );
      const direction = ball.vx < 0 ? 1 : -1;
      const angle = clamp(
        contact * 0.98 + (side === "computer" ? round.ai.profile.shotBias : 0),
        -0.98,
        0.98,
      );
      const launched = igniteFire(round.fire, side, nextSpeed);
      const magnitude = launched
        ? Math.min(FIRE_RULES.maximumSpeed, nextSpeed * FIRE_RULES.boost)
        : nextSpeed;
      ball.x = impactX + direction * (radius + 1);
      ball.y = impactY;
      ball.vx = direction * magnitude * Math.cos(angle);
      ball.vy = magnitude * Math.sin(angle);
      round.hits += 1;
      round.bestRally = Math.max(round.hits, round.bestRally);
      onEvent("paddle", Math.abs(contact), side);
      if (launched) onEvent("fireLaunch", side);
      else if (earnFire(round.fire, side, contact, returnedFire))
        onEvent("fireReady", side);
    }
  }

  if (ball.x < -radius || ball.x > FIELD.width + radius) {
    const scorer = ball.x < 0 ? "computer" : "player";
    round.score[scorer] += 1;
    round.bestRally = Math.max(round.bestRally, round.hits);
    round.hits = 0;
    round.winner = winnerForScore(round.score.player, round.score.computer);
    round.serveToward = scorer === "player" ? -1 : 1;
    ball.vx = 0;
    ball.vy = 0;
    ball.x = FIELD.width / 2;
    ball.y = FIELD.height / 2;
    resetFire(round);
    onEvent("point", scorer);
  }
}
