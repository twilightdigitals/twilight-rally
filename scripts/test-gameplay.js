import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  send,
  evaluate,
  wait,
  socket,
  errors,
  base,
} from "./browser-session.js";
await fs.mkdir("qa", { recursive: true });
const report = {};
async function snapshot() {
  return evaluate("window.__rallySnapshot()");
}
async function until(predicate, timeout = 45000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const s = await snapshot();
    if (predicate(s)) return s;
    await wait(150);
  }
  throw new Error(
    "Browser gameplay condition timed out. " + JSON.stringify(await snapshot()),
  );
}
async function key(key, code, virtual) {
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key,
    code,
    windowsVirtualKeyCode: virtual,
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key,
    code,
    windowsVirtualKeyCode: virtual,
  });
}
async function shot(name) {
  const image = await send("Page.captureScreenshot", { format: "png" });
  await fs.writeFile("qa/" + name + ".png", Buffer.from(image.data, "base64"));
}
async function choose(level, mode) {
  await evaluate(
    `document.getElementById('levelsButton').click();document.getElementById('playMode').value=${JSON.stringify(mode)};document.getElementById('levelInput').value=${JSON.stringify(level)};document.getElementById('levelForm').requestSubmit()`,
  );
}
async function bot(angled = false) {
  // Read-only telemetry guides normal pointer input; game physics and scores are untouched.
  await evaluate(`(()=>{
   clearInterval(window.qaBot);
   window.qaTelemetry={ready:0,launches:0,largestSpeed:0};
   let lastOwner=null;
   window.qaBot=setInterval(()=>{
     const s=window.__rallySnapshot(),r=s.round,b=r.ball;
     if(s.phase!=='playing')return;
     window.qaTelemetry.ready=Math.max(window.qaTelemetry.ready,r.fire.player.energy);
     if(r.fire.owner==='player' && lastOwner!=='player')window.qaTelemetry.launches++;
     lastOwner=r.fire.owner;window.qaTelemetry.largestSpeed=Math.max(window.qaTelemetry.largestSpeed,Math.hypot(b.vx,b.vy));
     let target=270;
     if(b.vx<0){const reach=Math.max(0,(r.player.x+r.player.width+b.radius-b.x)/b.vx),span=540-b.radius*2,projected=b.y+b.vy*reach;
       const folded=(((projected-b.radius)%(2*span))+2*span)%(2*span);target=b.radius+(folded>span?2*span-folded:folded);
       if(${angled})target-=(r.computer.y+r.computer.height/2<270?1:-1)*r.player.height*.37;
     }
     const c=document.querySelector('#gameCanvas'),rect=c.getBoundingClientRect();
     c.dispatchEvent(new PointerEvent('pointermove',{clientX:rect.x+rect.width*.15,clientY:rect.y+target/540*rect.height,pointerType:'mouse',bubbles:true}));
   }, 180);
 })()`);
}
try {
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1366,
    height: 768,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Page.navigate", { url: base + "/?qa=1" });
  await wait(500);
  await evaluate(
    `localStorage.removeItem('twilight-rally-progress-v1');location.reload()`,
  );
  await wait(500);
  await choose("2", "progression");
  assert.equal(
    await evaluate(`document.querySelector('#levelsDialog').open`),
    true,
  );
  assert.match(
    await evaluate(`document.querySelector('#levelError').textContent`),
    /locked/,
  );
  await evaluate(
    `document.querySelector('[data-close="levelsDialog"]').click()`,
  );
  // Practice high level while the unlocked progression remains Level 1.
  await choose("61", "practice");
  await bot(false);
  await until((s) => s.phase === "playing");
  assert.equal((await snapshot()).progress.unlocked, "1");
  const ready = await until((s) => s.round.fire.player.remaining > 0, 120000);
  report.earnedFireHits = ready.round.hits;
  await key("p", "KeyP", 80);
  const paused = await snapshot();
  await wait(700);
  assert.equal(
    (await snapshot()).round.fire.player.remaining,
    paused.round.fire.player.remaining,
    "Fire deadline must freeze while paused",
  );
  await key("p", "KeyP", 80);
  await until((s) => s.phase === "playing", 7000);
  await key(" ", "Space", 32);
  assert.ok(
    (await snapshot()).round.fire.player.armed ||
      (await snapshot()).round.fire.owner === "player",
    "Space arms earned Fireball",
  );
  const launch = await until((s) => s.round.fire.owner === "player", 9000);
  assert.equal(launch.round.ball.radius, 9);
  assert.ok(Math.hypot(launch.round.ball.vx, launch.round.ball.vy) <= 750.01);
  await shot("fireball-desktop");
  report.spaceLaunch = true;
  // Native modal interruption preserves the earned deadline and never advances progression.
  await evaluate(
    `document.getElementById('settingsButton').click();document.querySelector('[data-quality="lite"]').click()`,
  );
  assert.equal((await snapshot()).quality, "lite");
  await evaluate(
    `document.querySelector('[data-close="settingsDialog"]').click();document.getElementById('resumeButton').click()`,
  );
  await until((s) => s.phase === "playing", 7000);
  // Test the tap launch using the next normally earned charge.
  await until(
    (s) => s.round.fire.player.remaining > 0 && !s.round.fire.player.armed,
    120000,
  );
  await send("Emulation.setDeviceMetricsOverride", {
    width: 844,
    height: 390,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await send("Emulation.setTouchEmulationEnabled", { enabled: true });
  await wait(100);
  const fireBox = await evaluate(
    `(()=>{const r=document.querySelector('#fireButton').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`,
  );
  await send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ ...fireBox, id: 1 }],
  });
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await until(
    (s) => s.round.fire.player.armed || s.round.fire.owner === "player",
    1000,
  );
  await until((s) => s.round.fire.owner === "player", 9000);
  await shot("fireball-mobile-lite");
  report.tapLaunch = true;
  report.practiceUnlocked = (await snapshot()).progress.unlocked;
  assert.equal(report.practiceUnlocked, "1");
  // A complete real browser match must unlock Level 2 using only normal pointer input.
  await evaluate(
    `document.getElementById('settingsButton').click();document.getElementById('fireEnabled').click();document.querySelector('[data-speed="turbo"]').click();document.querySelector('[data-close="settingsDialog"]').click()`,
  );
  await choose("1", "progression");
  await bot(true);
  const finished = await until((s) => s.phase === "finished", 180000);
  assert.equal(finished.round.winner, "player");
  assert.equal(finished.progress.unlocked, "2");
  assert.equal(finished.progress.wins, 1);
  report.progressionScore = finished.round.score;
  report.unlocked = finished.progress.unlocked;
  assert.ok(finished.audio.loaded >= 13, "Original and Fire audio must decode");
  report.decodedSounds = finished.audio.loaded;
  await shot("level-one-victory-mobile");
  assert.equal(finished.progress.points, "110");
  await evaluate("document.getElementById('moreOptionsButton').click()");
  assert.equal(
    await evaluate("document.querySelector('#resultsOptionsDialog').open"),
    true,
  );
  await evaluate(
    "document.querySelector('[data-close=resultsOptionsDialog]').click()",
  );
  await evaluate(`document.getElementById('nextLevelButton').click()`);
  assert.equal((await snapshot()).level, "2");
  await evaluate(
    `document.getElementById('levelsButton').click();document.getElementById('playMode').value='practice';document.getElementById('levelInput').value='9007199254740993123456789';document.getElementById('levelForm').requestSubmit()`,
  );
  assert.equal((await snapshot()).level, "9007199254740993123456789");
  assert.equal((await snapshot()).progress.unlocked, "2");
  report.largeLevelExact = true;
  await choose("8", "practice");
  await bot(false);
  const levelEight = await until((s) => s.round.hits >= 8, 60000);
  report.levelEightRally = levelEight.round.hits;
  await shot("level-eight-rally");
  report.runtimeErrors = errors;
  assert.deepEqual(errors, []);
  await fs.writeFile(
    "qa/gameplay-results.json",
    JSON.stringify(report, null, 2),
  );
  console.log(
    "Browser gameplay passed: earned Fire, Space and touch launches, paused deadline, pure mode, Level 1 win/unlock, next level and exact high-level practice.",
  );
} finally {
  await evaluate("clearInterval(window.qaBot)").catch(() => {});
  socket.close();
}
