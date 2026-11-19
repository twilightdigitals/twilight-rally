import { FIELD } from "../config/settings.js";
import { aiProfile } from "./levels.js";
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export function makeAI(level) {
  const profile = aiProfile(level);
  return {
    profile,
    untilObservation: profile.reaction,
    target: FIELD.height / 2,
    velocity: 0,
    observations: 0,
    incoming: false,
    shotError: 0,
  };
}
/** Only sampled, imperfect information; fixed reaction, acceleration and speed ceilings. */
export function updateAI(
  round,
  seconds,
  _speed,
  _elapsed,
  random = Math.random,
) {
  const ai = round.ai;
  const { profile } = ai;
  const paddle = round.computer;
  const ball = round.ball;
  ai.untilObservation -= seconds;
  if (ai.untilObservation <= 0) {
    ai.untilObservation = profile.reaction;
    ai.observations++;
    if (ball.vx > 0) {
      if (!ai.incoming) ai.shotError = (random() * 2 - 1) * profile.error;
      ai.incoming = true;
      const reach = Math.max(0, (paddle.x - ball.x) / ball.vx);
      const projected = ball.y + ball.vy * Math.min(reach, profile.lookahead);
      const span = FIELD.height - ball.radius * 2;
      const folded =
        (((projected - ball.radius) % (2 * span)) + 2 * span) % (2 * span);
      const landing =
        ball.radius + (folded > span ? 2 * span - folded : folded);
      ai.target =
        ball.y + (landing - ball.y) * profile.prediction + ai.shotError;
    } else {
      ai.incoming = false;
      // Recover to a strategy-dependent position; never follow the human paddle.
      ai.target =
        FIELD.height *
        (0.5 + [0, 0.12, -0.12, 0.06, -0.06, 0.09][profile.strategy]);
    }
  }
  const destination = clamp(
    ai.target - paddle.height / 2,
    0,
    FIELD.height - paddle.height,
  );
  const wantedVelocity = clamp(
    (destination - paddle.y) * 4,
    -profile.maxSpeed,
    profile.maxSpeed,
  );
  ai.velocity += clamp(
    wantedVelocity - ai.velocity,
    -profile.acceleration * seconds,
    profile.acceleration * seconds,
  );
  paddle.y = clamp(
    paddle.y + ai.velocity * seconds,
    0,
    FIELD.height - paddle.height,
  );
  if (paddle.y === 0 || paddle.y === FIELD.height - paddle.height)
    ai.velocity = 0;
}
