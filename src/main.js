import {
  freshProgress,
  levelId,
  canPlay,
  recordResult,
  aiProfile,
} from "./game/levels.js";
import { armFire } from "./game/fire.js";
import { FIELD, FIXED_STEP, SPEEDS, QUALITIES } from "./config/settings.js";
import {
  makeRound,
  serveBall,
  updateBall,
  updateAI,
  clamp,
} from "./game/physics.js";
import { Renderer } from "./game/render.js";
import { SoundManager } from "./audio/sound.js";

const $ = (id) => document.getElementById(id);
const canvas = $("gameCanvas");
const renderer = new Renderer(canvas);
const sounds = new SoundManager();
const round = makeRound("classic");
let local = loadLocalStats();
const state = {
  phase: "menu",
  speed: "classic",
  level: local.unlocked,
  playMode: "progression",
  fireEnabled: true,
  quality: "balanced",
  keyboard: { up: false, down: false },
  pointerY: null,
  time: 0,
  accumulator: 0,
  lastFrame: 0,
  resumeTimer: null,
  pointTimer: null,
};

$("year").textContent = new Date().getFullYear();
refreshStats();
refreshScore();
renderer.render(round, 0, false);

function loadLocalStats() {
  try {
    const saved = localStorage.getItem("twilight-rally-progress-v1");
    if (saved) return freshProgress(JSON.parse(saved));
    const legacy = JSON.parse(
      localStorage.getItem("twilight-rally-solo") || "{}",
    );
    // Preserve the legacy best rally; old matches had no level progression eligibility.
    return freshProgress({ bestRally: legacy.bestRally });
  } catch {
    return freshProgress();
  }
}

function saveLocalStats() {
  try {
    localStorage.setItem("twilight-rally-progress-v1", JSON.stringify(local));
  } catch {
    /* Private mode may block storage. */
  }
}

function refreshStats() {
  $("adventurePoints").textContent = local.points;
  $("totalWins").textContent = local.wins;
  $("totalMatches").textContent = local.matches;
  $("bestRally").textContent = local.bestRally;
  $("unlockedStat").textContent = local.unlocked;
  $("practiceStat").textContent = local.practiceMatches;
  $("unlockDescription").textContent =
    `Highest unlocked: ${local.unlocked}. Practice never unlocks progression.`;
}

function refreshScore() {
  $("scorePlayer").textContent = String(round.score.player).padStart(2, "0");
  $("scoreComputer").textContent = String(round.score.computer).padStart(
    2,
    "0",
  );
  $("rallyCounter").textContent =
    `RALLY ${String(round.hits).padStart(2, "0")}`;
}

function showOverlay(id = null) {
  for (const item of [
    "menuOverlay",
    "pauseOverlay",
    "countdownOverlay",
    "resultOverlay",
  ]) {
    $(item).classList.toggle("hidden", item !== id);
  }
}

function announce(message) {
  $("liveStatus").textContent = message;
}

function clearPending() {
  clearTimeout(state.resumeTimer);
  clearTimeout(state.pointTimer);
  state.resumeTimer = null;
  state.pointTimer = null;
}

function startGame() {
  if (!canPlay(state.level, state.playMode, local)) return;
  clearPending();
  resetInput();
  state.time = 0;
  void sounds.unlock();
  sounds.play("click");
  Object.assign(round, makeRound(state.speed, state.level, state.fireEnabled));
  refreshLabels();
  $("pauseButton").innerHTML = "Ⅱ <span>Pause</span>";
  refreshScore();
  showLearningTip();
  $("pauseButton").disabled = false;
  countdown(3, () => serveBall(round, state.speed));
  canvas.focus({ preventScroll: true });
}

function countdown(seconds, onFinished) {
  clearPending();
  state.phase = "countdown";
  showOverlay("countdownOverlay");
  let remaining = seconds;
  const tick = () => {
    if (state.phase !== "countdown") return;
    $("countdownValue").textContent = remaining === 0 ? "GO!" : remaining;
    if (remaining > 0) {
      sounds.play("countdown");
      state.resumeTimer = setTimeout(tick, 1000);
      remaining -= 1;
      return;
    }
    sounds.play("go");
    state.phase = "playing";
    showOverlay();
    onFinished();
    announce("Go! The match has resumed.");
  };
  tick();
}

function pause() {
  if (!["playing", "between", "countdown"].includes(state.phase)) return;
  resetInput();
  state.phase = "paused";
  clearPending();
  sounds.play("pause");
  showOverlay("pauseOverlay");
  $("pauseButton").innerHTML = "▶ <span>Resume</span>";
  announce("Game paused. Select Resume Game when ready.");
}

function resume() {
  if (state.phase !== "paused") return;
  canvas.focus({ preventScroll: true });
  $("pauseButton").innerHTML = "Ⅱ <span>Pause</span>";
  countdown(5, () => {
    if (round.ball.vx === 0) serveBall(round, state.speed);
  });
}

function togglePause() {
  if (state.phase === "paused") resume();
  else pause();
}

function gameEvent(type, detail) {
  if (type === "fireReady") {
    sounds.play("fireReady", detail === "player" ? 1 : 0.5);
    announce(
      detail === "player"
        ? "Fire ready. Tap Fire or press Space and return the ball within 8 seconds."
        : "Computer fire ready.",
    );
  }
  if (type === "fireLaunch") {
    sounds.play("fireLaunch");
    announce(`${detail === "player" ? "Your" : "Computer"} Fireball launched.`);
  }
  if (type === "fireExpired" && detail === "player")
    announce("Fire window expired. Return shots to recharge.");
  if (type === "wall") sounds.play("wall", 0.65);
  if (type === "paddle")
    sounds.play(detail > 0.62 ? "paddleStrong" : "paddle", 0.8);
  if (type !== "point") return;
  refreshScore();
  announce(
    "Score: you " + round.score.player + ", computer " + round.score.computer,
  );
  local.bestRally = Math.max(local.bestRally, round.bestRally);
  saveLocalStats();
  refreshStats();
  sounds.play(detail === "player" ? "score" : "miss");
  if (round.winner) {
    finishGame();
  } else {
    state.phase = "between";
    state.pointTimer = setTimeout(() => {
      if (state.phase !== "between") return;
      serveBall(round, state.speed);
      state.phase = "playing";
    }, 1100);
  }
}

function finishGame() {
  clearPending();
  state.phase = "finished";
  const previousPoints = BigInt(local.points);
  local = recordResult(
    local,
    state.level,
    state.playMode,
    round.winner,
    round.bestRally,
  );
  saveLocalStats();
  refreshStats();
  $("nextLevelButton").hidden = !(
    round.winner === "player" && state.playMode === "progression"
  );
  $("rematchButton").textContent =
    round.winner === "player" ? "Replay this level" : "Try again";
  const next = (BigInt(state.level) + 1n).toString();
  $("nextLevelButton").textContent = "Next level " + shortLevel(next);
  $("nextLevelButton").title = aiProfile(next).name;
  $("resultBadge").textContent =
    round.winner === "player" ? "✦ MATCH WON ✦" : "GOOD EFFORT";
  $("resultTitle").textContent =
    round.winner === "player" ? "YOU DID IT." : "NEXT ROUND?";
  $("resultDescription").textContent =
    `Final score ${round.score.player} – ${round.score.computer}. Best rally: ${round.bestRally}. ${state.playMode === "practice" ? "Practice: no progression earned." : "Highest unlocked: " + local.unlocked}.`;
  $("pauseButton").disabled = true;
  $("pauseButton").innerHTML = "Ⅱ <span>Pause</span>";
  $("resultDescription").textContent +=
    " Adventure points earned: " +
    (BigInt(local.points) - previousPoints).toString() +
    ".";
  $("learningTip").hidden = true;
  showOverlay("resultOverlay");
  ($("nextLevelButton").hidden
    ? $("rematchButton")
    : $("nextLevelButton")
  ).focus({ preventScroll: true });
  if (round.winner === "player") sounds.play("victory");
  announce(
    round.winner === "player"
      ? "You won the match!"
      : "Computer won. Play again?",
  );
}

function updatePlayer(seconds) {
  let direction = 0;
  if (state.keyboard.up) direction -= 1;
  if (state.keyboard.down) direction += 1;
  if (direction !== 0) {
    round.player.y += direction * SPEEDS[state.speed].paddle * seconds;
    state.pointerY = null;
  } else if (state.pointerY !== null) {
    const target = clamp(
      state.pointerY - round.player.height / 2,
      0,
      FIELD.height - round.player.height,
    );
    const maximum = SPEEDS[state.speed].paddle * seconds;
    round.player.y += clamp(target - round.player.y, -maximum, maximum);
  }
  round.player.y = clamp(round.player.y, 0, FIELD.height - round.player.height);
}

function animate(timestamp) {
  const delta = state.lastFrame
    ? Math.min(0.05, (timestamp - state.lastFrame) / 1000)
    : 0;
  state.lastFrame = timestamp;
  if (state.phase === "playing") {
    state.accumulator += delta;
    let steps = 0;
    while (state.accumulator >= FIXED_STEP && steps < 6) {
      state.time += FIXED_STEP;
      updatePlayer(FIXED_STEP);
      updateAI(round, FIXED_STEP, state.speed, state.time);
      updateBall(round, FIXED_STEP, state.speed, gameEvent);
      state.accumulator -= FIXED_STEP;
      steps += 1;
      if (state.phase !== "playing") break;
    }
    if (steps === 6) state.accumulator = 0;
    refreshScore();
  } else {
    state.accumulator = 0;
  }
  refreshFire();
  renderer.render(round, timestamp / 1000, state.phase === "playing");
  requestAnimationFrame(animate);
}

function updatePointer(event) {
  if (state.phase !== "playing") return;
  const rect = canvas.getBoundingClientRect();
  state.pointerY = clamp(
    ((event.clientY - rect.top) / rect.height) * FIELD.height,
    0,
    FIELD.height,
  );
}

canvas.addEventListener("pointerdown", (event) => {
  updatePointer(event);
  canvas.setPointerCapture?.(event.pointerId);
  canvas.focus({ preventScroll: true });
});
canvas.addEventListener("pointermove", updatePointer);
canvas.addEventListener("pointerup", (event) => {
  if (canvas.hasPointerCapture?.(event.pointerId))
    canvas.releasePointerCapture(event.pointerId);
});

window.addEventListener("keydown", (event) => {
  if (
    document.querySelector("dialog[open]") ||
    event.target.closest("input, select, textarea")
  )
    return;
  const key = event.key.toLowerCase();
  if (
    ["playing", "between", "countdown"].includes(state.phase) &&
    ["arrowup", "arrowdown", "w", "s"].includes(key)
  ) {
    event.preventDefault();
    if (key === "arrowup" || key === "w") state.keyboard.up = true;
    if (key === "arrowdown" || key === "s") state.keyboard.down = true;
  }
  if (
    key === " " &&
    state.phase === "playing" &&
    !event.target.closest("button, a, input, select, textarea")
  ) {
    event.preventDefault();
    if (!event.repeat) activateFire();
  }
  if (["p", "escape"].includes(key) && !event.repeat) {
    event.preventDefault();
    togglePause();
  }
});
window.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();
  if (key === "arrowup" || key === "w") state.keyboard.up = false;
  if (key === "arrowdown" || key === "s") state.keyboard.down = false;
});
window.addEventListener("blur", () => {
  state.keyboard.up = false;
  state.keyboard.down = false;
  pause();
});
document.addEventListener("visibilitychange", () => {
  if (
    document.hidden &&
    ["playing", "between", "countdown"].includes(state.phase)
  )
    pause();
});

for (const button of document.querySelectorAll("[data-speed]")) {
  button.addEventListener("click", () => {
    const nextSpeed = button.dataset.speed;
    if (!SPEEDS[nextSpeed]) return;
    // A speed change starts a fresh match; never silently alter active physics.
    state.speed = nextSpeed;
    refreshLabels();
    for (const item of document.querySelectorAll("[data-speed]")) {
      const selected = item === button;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-pressed", String(selected));
    }
    sounds.play("click");
    if (["playing", "between", "paused", "countdown"].includes(state.phase)) {
      clearPending();
      state.phase = "menu";
      $("pauseButton").disabled = true;
      $("pauseButton").innerHTML = "Ⅱ <span>Pause</span>";
      showOverlay("menuOverlay");
      announce("Speed changed. Start a new match with the selected speed.");
    }
  });
}

for (const button of document.querySelectorAll("[data-quality]")) {
  button.addEventListener("click", () => {
    const quality = button.dataset.quality;
    if (!QUALITIES.includes(quality)) return;
    state.quality = quality;
    renderer.setQuality(quality);
    $("performanceLabel").textContent = `GRAPHICS: ${quality.toUpperCase()}`;
    for (const item of document.querySelectorAll("[data-quality]")) {
      const selected = item === button;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-pressed", String(selected));
    }
    sounds.play("click");
  });
}

// An in-game guide for players; opening it pauses any active solo match.
const helpDialog = $("howToPlayDialog");
function openHelp(event) {
  pause();
  resetInput();
  (event?.currentTarget || $("helpButton")).focus({ preventScroll: true });
  helpDialog.showModal();
}
function closeHelp() {
  helpDialog.close();
}
$("helpButton").addEventListener("click", openHelp);
$("menuHelpButton").addEventListener("click", openHelp);
$("closeHelpButton").addEventListener("click", closeHelp);
$("gotItButton").addEventListener("click", closeHelp);
helpDialog.addEventListener("click", (event) => {
  // Close using Escape or a visible close button.
});

$("startButton").addEventListener("click", startGame);
$("rematchButton").addEventListener("click", startGame);
$("pauseButton").addEventListener("click", togglePause);
$("resumeButton").addEventListener("click", resume);
$("soundToggle").addEventListener("click", async () => {
  if (!sounds.context) void sounds.unlock();
  const enabled = sounds.toggle();
  $("soundToggle").textContent = enabled ? "♫" : "♩";
  $("soundToggle").setAttribute(
    "aria-label",
    enabled ? "Mute sound" : "Unmute sound",
  );
  if (enabled) sounds.play("click");
});

requestAnimationFrame(animate);

// Native dialogs trap focus, support Escape and restore opener focus.
function resetInput() {
  state.keyboard.up = false;
  state.keyboard.down = false;
  state.pointerY = null;
}
for (const name of ["settings", "stats", "levels"]) {
  $(name + "Button").addEventListener("click", () => {
    pause();
    resetInput();
    if (name === "levels") {
      $("playMode").value = state.playMode;
      $("levelInput").value = state.level;
      $("levelError").textContent = "";
      describeLevel();
    }
    $(name + "Button").focus({ preventScroll: true });
    $(name + "Dialog").showModal();
  });
}
for (const button of document.querySelectorAll("[data-close]")) {
  button.addEventListener("click", () => $(button.dataset.close).close());
}
for (const button of document.querySelectorAll(".segment")) {
  if (!button.hasAttribute("aria-pressed"))
    button.setAttribute("aria-pressed", "false");
}
for (const [id, direction] of [
  ["moveUp", "up"],
  ["moveDown", "down"],
]) {
  const button = $(id);
  button.addEventListener("pointerdown", (event) => {
    if (state.phase !== "playing") return;
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    state.pointerY = null;
    state.keyboard[direction] = true;
  });
  for (const type of [
    "pointerup",
    "pointercancel",
    "lostpointercapture",
    "blur",
  ]) {
    button.addEventListener(type, () => {
      state.keyboard[direction] = false;
    });
  }
  button.addEventListener("keydown", (event) => {
    if ([" ", "Enter"].includes(event.key) && state.phase === "playing") {
      event.preventDefault();
      state.keyboard[direction] = true;
    }
  });
  button.addEventListener("keyup", () => {
    state.keyboard[direction] = false;
  });
}
// Keep Tab within the open panel, including when browser chrome is reachable.
for (const dialog of document.querySelectorAll("dialog")) {
  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const controls = [
      ...dialog.querySelectorAll(
        'button, a[href], input, select, textarea, [tabindex="0"]',
      ),
    ].filter((item) => !item.disabled && item.getClientRects().length);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}

function shortLevel(level) {
  return level.length > 8 ? "…" + level.slice(-6) : level;
}
function refreshLabels() {
  $("modeLabel").textContent = SPEEDS[state.speed].label;
  $("levelLabel").textContent =
    (state.playMode === "practice" ? "PRACTICE " : "LEVEL ") +
    shortLevel(state.level);
  $("levelLabel").title = "Level " + state.level + " · " + state.playMode;
  $("selectedSummary").textContent =
    "Level " +
    shortLevel(state.level) +
    " · " +
    (BigInt(state.level) <= 5n ? "Beginner" : aiProfile(state.level).name) +
    " · " +
    state.playMode;
  $("startButton").textContent = "CONTINUE LEVEL " + shortLevel(state.level);
}
function describeLevel() {
  try {
    const level = levelId($("levelInput").value);
    const profile = aiProfile(level);
    $("strategyDescription").textContent =
      profile.name +
      (BigInt(level) <= 5n ? " · Beginner-friendly" : " · Fair, capped AI");
  } catch {
    $("strategyDescription").textContent = "";
  }
}
$("levelInput").addEventListener("input", describeLevel);
$("levelForm").addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    const level = levelId($("levelInput").value);
    const mode = $("playMode").value;
    if (!canPlay(level, mode, local))
      throw new Error(
        "That level is locked. Select an unlocked level or switch to Practice.",
      );
    state.level = level;
    state.playMode = mode;
    $("levelsDialog").close();
    startGame();
  } catch (error) {
    $("levelError").textContent = error.message;
    $("levelInput").focus();
  }
});
$("nextLevelButton").addEventListener("click", () => {
  const next = (BigInt(state.level) + 1n).toString();
  if (!canPlay(next, "progression", local)) return;
  state.level = next;
  startGame();
});
$("fireEnabled").addEventListener("change", () => {
  state.fireEnabled = $("fireEnabled").checked;
  clearPending();
  resetInput();
  state.phase = "menu";
  Object.assign(round, makeRound(state.speed, state.level, state.fireEnabled));
  $("pauseButton").disabled = true;
  $("pauseButton").innerHTML = "Ⅱ <span>Pause</span>";
  refreshScore();
  showOverlay("menuOverlay");
  announce(
    "Arcade Fireball " +
      (state.fireEnabled ? "enabled" : "disabled") +
      ". Start a new match.",
  );
});
function activateFire() {
  if (state.phase !== "playing" || !armFire(round.fire, "player")) return;
  sounds.play("click");
  announce("Fire armed. Return the ball before the window expires.");
  canvas.focus({ preventScroll: true });
}
$("fireButton").addEventListener("click", activateFire);
function setText(id, value) {
  if ($(id).textContent !== value) $(id).textContent = value;
}
function refreshFire() {
  const fire = round.fire,
    gauge = fire.player;
  $("fireGauge").value = gauge.energy;
  const remaining = Math.ceil(gauge.remaining);
  const label = !fire.enabled
    ? "FIRE OFF"
    : gauge.armed
      ? "ARMED · " + remaining + "s"
      : remaining > 0
        ? "FIRE · " + remaining + "s"
        : "FIRE · " + Math.floor(gauge.energy) + "%";
  setText("fireButton", label);
  $("fireButton").disabled =
    state.phase !== "playing" || !fire.enabled || remaining <= 0 || gauge.armed;
  setText(
    "fireStatus",
    !fire.enabled
      ? "Pure rally"
      : fire.owner === "player"
        ? "FIREBALL IN PLAY"
        : gauge.armed
          ? "Return now to launch"
          : remaining > 0
            ? "Tap / Space, then return"
            : "Return shots to charge",
  );
  setText(
    "aiFireStatus",
    !fire.enabled
      ? "PURE RALLY"
      : fire.owner === "computer"
        ? "FIREBALL"
        : fire.computer.armed
          ? "FIRE ARMED"
          : fire.computer.remaining > 0
            ? "FIRE READY"
            : "FIRE " + Math.floor(fire.computer.energy) + "%",
  );
  $("fireButton").classList.toggle("fire-ready", remaining > 0);
}
refreshLabels();
refreshFire();
// Read-only local QA snapshots. No game-state setters or production hook.
if (
  ["localhost", "127.0.0.1"].includes(location.hostname) &&
  new URLSearchParams(location.search).has("qa")
) {
  Object.defineProperty(window, "__rallySnapshot", {
    value: () =>
      structuredClone({
        phase: state.phase,
        level: state.level,
        mode: state.playMode,
        speed: state.speed,
        quality: state.quality,
        round,
        progress: local,
        audio: { loaded: sounds.samples.size, state: sounds.context?.state },
      }),
    writable: false,
    configurable: false,
  });
}

const learningTips = [
  "Level 1: Move with ↑ ↓, W/S, drag, or hold the paddle buttons. Return the ball.",
  "Level 2: Contact near a paddle edge to change your return angle.",
  "Level 3: Recover toward the centre after returning the ball.",
  "Level 4: Earn Fire energy with returns; tap Fire or press Space while ready.",
  "Level 5: Combine movement, recovery and angled returns. Continue when you feel ready.",
];
const dismissedTips = new Set();
function showLearningTip() {
  const index = BigInt(state.level) <= 5n ? Number(state.level) - 1 : -1;
  $("learningTip").hidden = index < 0 || dismissedTips.has(state.level);
  if (index >= 0)
    $("learningText").textContent =
      index === 3 && !state.fireEnabled
        ? "Level 4: Pure rally is on. Practise controlled returns and positioning."
        : learningTips[index];
}
$("dismissTip").addEventListener("click", () => {
  dismissedTips.add(state.level);
  $("learningTip").hidden = true;
  canvas.focus({ preventScroll: true });
});
$("moreOptionsButton").addEventListener("click", () => {
  $("moreOptionsButton").focus();
  $("resultsOptionsDialog").showModal();
});
$("resultChooseLevel").addEventListener("click", () => {
  $("resultsOptionsDialog").close();
  $("levelsButton").click();
});
$("resultPractice").addEventListener("click", () => {
  $("resultsOptionsDialog").close();
  state.playMode = "practice";
  startGame();
});
$("resultSpeed").addEventListener("click", () => {
  $("resultsOptionsDialog").close();
  $("settingsButton").click();
});
$("resultMenu").addEventListener("click", () => {
  $("resultsOptionsDialog").close();
  clearPending();
  resetInput();
  state.phase = "menu";
  state.playMode = "progression";
  state.level = local.unlocked;
  refreshLabels();
  showOverlay("menuOverlay");
  $("startButton").focus({ preventScroll: true });
});
