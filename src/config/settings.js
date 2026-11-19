/** Virtual pixels / second. Speed is independent of level and AI intelligence. */
export const FIELD = Object.freeze({
  width: 960,
  height: 540,
  paddleWidth: 13,
  paddleHeight: 104,
  inset: 44,
  ballRadius: 9,
});
export const SPEEDS = Object.freeze({
  chill: { ball: 285, maxBall: 460, paddle: 600, label: "CHILL" },
  classic: { ball: 365, maxBall: 540, paddle: 600, label: "CLASSIC" },
  turbo: { ball: 445, maxBall: 600, paddle: 600, label: "TURBO" },
});
export const WINNING_SCORE = 7;
export const MAX_SCORE = 15;
export const FIXED_STEP = 1 / 120;
export const QUALITIES = ["lite", "balanced", "ultra"];
export const SOUND_VOLUME = 0.27;
export const AI_LIMITS = Object.freeze({
  minimumReaction: 0.3,
  maximumSpeed: 280,
  maximumAcceleration: 850,
  minimumError: 6,
});
export const FIRE_RULES = Object.freeze({
  window: 8,
  duration: 2.8,
  boost: 1.25,
  maximumSpeed: 750,
});
