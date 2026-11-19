import test from "node:test";
import assert from "node:assert/strict";
import { simulateMatch } from "./simulation.js";
const speeds = ["chill", "classic", "turbo"];
test("a slower sampled-input player can win the first five levels across speeds", () => {
  for (let level = 1; level <= 5; level++)
    for (const speed of speeds) {
      let wins = 0;
      for (const seed of [7, 23, 101])
        if (
          simulateMatch(String(level), speed, seed, "beginner").winner ===
          "player"
        )
          wins++;
      assert.ok(
        wins >= 2,
        `Beginner proxy wins ${wins}/3 at level ${level}, ${speed}`,
      );
    }
});
test("a bounded skilled player can beat every capped strategy and a very high level without Fireball", () => {
  for (const level of [
    "60",
    "61",
    "62",
    "63",
    "64",
    "65",
    "999999999999999999999999999999",
  ])
    for (const speed of speeds) {
      let wins = 0;
      for (const seed of [7, 23, 101])
        if (simulateMatch(level, speed, seed).winner === "player") wins++;
      assert.ok(
        wins >= 2,
        `Skilled proxy wins ${wins}/3 at level ${level}, ${speed}`,
      );
    }
});
