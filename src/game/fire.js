import { FIRE_RULES } from "../config/settings.js";
const emptyGauge = () => ({ energy: 0, remaining: 0, armed: false });
export function makeFire(enabled = true) {
  return {
    enabled,
    player: emptyGauge(),
    computer: emptyGauge(),
    owner: null,
    remaining: 0,
    normalSpeed: 0,
  };
}
export function earnFire(fire, side, contact = 0, returnedFire = false) {
  if (!fire.enabled) return false;
  const gauge = fire[side];
  if (gauge.remaining > 0 || gauge.armed) return false;
  gauge.energy = Math.min(
    100,
    gauge.energy + 20 + Math.abs(contact) * 6 + (returnedFire ? 10 : 0),
  );
  if (gauge.energy === 100) {
    gauge.remaining = FIRE_RULES.window;
    return true;
  }
  return false;
}
export function armFire(fire, side) {
  const gauge = fire[side];
  if (!fire.enabled || gauge.remaining <= 0 || gauge.armed) return false;
  gauge.armed = true;
  return true;
}
export function igniteFire(fire, side, normalSpeed) {
  const gauge = fire[side];
  if (!fire.enabled || !gauge.armed || gauge.remaining <= 0) return false;
  fire[side] = emptyGauge();
  fire.owner = side;
  fire.remaining = FIRE_RULES.duration;
  fire.normalSpeed = normalSpeed;
  return true;
}
export function endFire(round) {
  const fire = round.fire;
  if (!fire?.owner) return;
  const magnitude = Math.hypot(round.ball.vx, round.ball.vy);
  if (magnitude > 0 && fire.normalSpeed > 0) {
    round.ball.vx *= fire.normalSpeed / magnitude;
    round.ball.vy *= fire.normalSpeed / magnitude;
  }
  fire.owner = null;
  fire.remaining = 0;
  fire.normalSpeed = 0;
}
export function updateFire(round, seconds, onEvent = () => {}) {
  const fire = round.fire;
  if (!fire.enabled) return;
  for (const side of ["player", "computer"]) {
    const gauge = fire[side];
    if (gauge.remaining > 0) {
      gauge.remaining = Math.max(0, gauge.remaining - seconds);
      if (gauge.remaining === 0) {
        fire[side] = emptyGauge();
        onEvent("fireExpired", side);
      }
    }
  }
  if (fire.owner) {
    fire.remaining -= seconds;
    if (fire.remaining <= 0) endFire(round);
  }
  // AI observes a ready gauge for one second before arming. No instant response.
  if (
    fire.computer.remaining > 0 &&
    fire.computer.remaining <= FIRE_RULES.window - 1
  )
    armFire(fire, "computer");
}
export function resetFire(round) {
  round.fire = makeFire(round.fire.enabled);
}
