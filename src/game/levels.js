import { AI_LIMITS } from "../config/settings.js";

/** BigInt level IDs avoid floating point rounding and have no designed final level. */
export function levelId(value) {
  const text = String(value).trim();
  if (!/^[1-9]\d*$/.test(text))
    throw new Error("Enter a positive whole level number.");
  return BigInt(text).toString();
}
export function freshProgress(saved = {}) {
  let unlocked = "1";
  try {
    unlocked = levelId(saved.unlocked ?? "1");
  } catch {
    /* Invalid local data resets safely. */
  }
  const count = (value) =>
    Math.max(0, Math.min(999999999, Math.floor(Number(value) || 0)));
  return {
    unlocked,
    points: String(saved.points || "0").match(/^\d+$/)
      ? String(saved.points || "0")
      : "0",
    wins: count(saved.wins),
    matches: count(saved.matches),
    practiceMatches: count(saved.practiceMatches),
    bestRally: count(saved.bestRally),
  };
}
export function canPlay(level, mode, progress) {
  try {
    levelId(level);
    return (
      mode === "practice" ||
      (mode === "progression" &&
        BigInt(levelId(level)) <= BigInt(progress.unlocked))
    );
  } catch {
    return false;
  }
}
export function recordResult(progress, level, mode, winner, bestRally = 0) {
  const next = {
    ...progress,
    bestRally: Math.max(progress.bestRally, bestRally),
  };
  if (mode === "practice") {
    next.practiceMatches++;
    return next;
  }
  if (!canPlay(level, mode, progress)) return next;
  next.matches++;
  if (winner === "player") {
    next.wins++;
    if (levelId(level) === progress.unlocked) {
      next.unlocked = (BigInt(level) + 1n).toString();
      next.points = (
        BigInt(progress.points || "0") +
        100n +
        (BigInt(level) > 60n ? 60n : BigInt(level)) * 10n
      ).toString();
    }
  }
  return next;
}
const strategies = [
  "Centre guard",
  "Wide angles",
  "Late cut",
  "Counter rally",
  "Cross court",
  "Change of pace",
];
export function aiProfile(level = "1") {
  const id = BigInt(levelId(level));
  const n = Number(id > 60n ? 60n : id);
  const strategy = Number((id - 1n) % BigInt(strategies.length));
  const stage = n <= 5 ? (n - 1) / 4 : Math.min(1, (n - 6) / 54);
  const beginner = n <= 5;
  return {
    reaction: beginner
      ? 0.6 - stage * 0.12
      : Math.max(AI_LIMITS.minimumReaction, 0.46 - stage * 0.16),
    maxSpeed: beginner
      ? 160 + stage * 48
      : Math.min(AI_LIMITS.maximumSpeed, 225 + stage * 55),
    acceleration: beginner
      ? 500
      : Math.min(AI_LIMITS.maximumAcceleration, 650 + stage * 200),
    error: beginner ? 24 - stage * 8 : 14 - stage * 8,
    prediction: beginner ? 0.5 + stage * 0.2 : 0.78 + stage * 0.18,
    lookahead: beginner ? 0.15 + stage * 0.15 : 0.35 + stage * 0.1,
    strategy,
    name: strategies[strategy],
    shotBias: beginner ? 0 : [0, 0.2, -0.2, 0.1, -0.1, 0.25][strategy],
  };
}
