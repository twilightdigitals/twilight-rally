import assert from "node:assert/strict";
import fs from "node:fs/promises";
const port = process.env.CDP_PORT || "9397";
const base = process.env.GAME_URL || "http://localhost:5173";
const targets = await fetch(`http://127.0.0.1:${port}/json`).then((r) =>
  r.json(),
);
const target = targets.find((t) => t.type === "page");
assert.ok(target, "Launch Chrome with remote debugging first; see README.");
const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let sequence = 0;
const errors = [];
socket.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === "Runtime.exceptionThrown")
    errors.push(message.params.exceptionDetails.text);
  if (message.id) {
    const task = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) task.reject(message.error);
    else task.resolve(message.result);
  }
});
await new Promise((resolve) =>
  socket.addEventListener("open", resolve, { once: true }),
);
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    userGesture: true,
    awaitPromise: true,
  });
  assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await send("Page.enable");
await send("Runtime.enable");
await fs.mkdir("qa", { recursive: true });
const results = [];
try {
  for (const [width, height] of [
    [1920, 1080],
    [1366, 768],
    [1024, 600],
    [768, 1024],
    [390, 844],
    [360, 640],
    [320, 480],
    [844, 390],
    [568, 320],
    [320, 568],
  ]) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 600,
    });
    await send("Emulation.setTouchEmulationEnabled", { enabled: width < 600 });
    await send("Page.navigate", { url: base });
    await wait(450);
    assert.equal(
      await evaluate(`Boolean(document.querySelector('#startButton'))`),
      true,
    );
    const layout = await evaluate(`(() => {
      const ids=['gameArea','gameCanvas','moveUp','moveDown','startButton','helpButton','settingsButton','statsButton','soundToggle','pauseButton','fireButton','levelsButton'];
      return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,
      boxes:ids.map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {id,x:r.x,y:r.y,w:r.width,h:r.height};})};
    })()`);
    assert.ok(
      layout.scrollWidth <= width + 1 && layout.scrollHeight <= height + 1,
      JSON.stringify(layout),
    );
    for (const r of layout.boxes) {
      assert.ok(
        r.x >= 0 &&
          r.y >= 0 &&
          r.x + r.w <= width + 1 &&
          r.y + r.h <= height + 1,
        `${width}x${height}: clipped ${JSON.stringify(r)}`,
      );
      if (!["gameArea", "gameCanvas"].includes(r.id))
        assert.ok(r.h >= 44, `small target ${r.id}`);
    }
    assert.ok(layout.boxes[0].h >= 140, "Arena too short");
    await evaluate(`document.getElementById('settingsButton').click()`);
    assert.equal(
      await evaluate(`document.querySelector('#settingsDialog').open`),
      true,
    );
    assert.equal(
      await evaluate(`document.activeElement.closest('dialog').id`),
      "settingsDialog",
    );
    await evaluate(
      `document.querySelector('[data-quality="lite"]').click();document.querySelector('[data-speed="chill"]').click()`,
    );
    assert.equal(
      await evaluate(`document.querySelector('#performanceLabel').textContent`),
      "GRAPHICS: LITE",
    );
    await send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: "Escape",
      windowsVirtualKeyCode: 27,
      nativeVirtualKeyCode: 27,
      code: "Escape",
    });
    await send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "Escape",
      windowsVirtualKeyCode: 27,
      nativeVirtualKeyCode: 27,
      code: "Escape",
    });
    assert.equal(
      await evaluate(`document.querySelector('#settingsDialog').open`),
      false,
    );
    await evaluate(`document.getElementById('statsButton').click()`);
    assert.equal(
      await evaluate(`document.querySelector('#statsDialog').open`),
      true,
    );
    await evaluate(
      `document.querySelector('[data-close="statsDialog"]').click();document.getElementById('helpButton').click()`,
    );
    assert.equal(
      await evaluate(`document.querySelector('#howToPlayDialog').open`),
      true,
    );
    await evaluate(
      `document.getElementById('gotItButton').click();document.getElementById('startButton').click()`,
    );
    await wait(100);
    await evaluate(`document.getElementById('settingsButton').click()`);
    assert.equal(
      await evaluate(
        `document.querySelector('#pauseOverlay').classList.contains('hidden')`,
      ),
      false,
      "Opening menu interrupts countdown safely",
    );
    await evaluate(
      `document.querySelector('[data-close="settingsDialog"]').click()`,
    );
    const shot = await send("Page.captureScreenshot", { format: "png" });
    await fs.writeFile(
      `qa/${width}x${height}.png`,
      Buffer.from(shot.data, "base64"),
    );
    results.push({ width, height, arena: layout.boxes[0], passed: true });
  }
  await evaluate(`document.getElementById('resumeButton').click()`);
  await wait(5200);
  assert.equal(
    await evaluate(
      `document.querySelector('#countdownOverlay').classList.contains('hidden')`,
    ),
    true,
  );
  assert.equal(
    await evaluate(
      `(() => {const e=new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true});document.querySelector('#pauseButton').dispatchEvent(e);return e.defaultPrevented;})()`,
    ),
    true,
  );
  await evaluate(
    `window.dispatchEvent(new KeyboardEvent('keyup',{key:'ArrowDown'}));document.getElementById('settingsButton').click()`,
  );
  assert.equal(
    await evaluate(
      `(() => {const e=new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true});document.activeElement.dispatchEvent(e);return e.defaultPrevented;})()`,
    ),
    false,
    "Menus retain keyboard defaults",
  );
  await evaluate(
    `document.querySelector('[data-close="settingsDialog"]').click()`,
  );
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 600,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await wait(200);
  assert.ok(
    await evaluate(
      `document.querySelector('#moveDown').getBoundingClientRect().bottom <= innerHeight`,
    ),
    "Dynamic toolbar resize clips controls",
  );
  await evaluate("document.getElementById('resumeButton').click()");
  await wait(5200);
  const paddleY =
    "(() => {const c=document.querySelector('#gameCanvas'),ctx=c.getContext('2d');const w=Math.floor(c.width*.12),h=c.height,data=ctx.getImageData(0,0,w,h).data;let total=0,count=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;if(data[i]>140&&data[i+1]>225&&data[i+2]>225){total+=y;count++;}}return count?total/count:null;})()";
  const before = await evaluate(paddleY);
  assert.notEqual(before, null);
  const down = await evaluate(
    "(()=>{const r=document.querySelector('#moveDown').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()",
  );
  await send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ ...down, id: 1 }],
  });
  await wait(300);
  const after = await evaluate(paddleY);
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  assert.ok(after > before + 5, "Touch control must move rendered paddle");
  await evaluate("document.getElementById('settingsButton').click()");
  for (let i = 0; i < 10; i++) {
    await send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: "Tab",
      code: "Tab",
      windowsVirtualKeyCode: 9,
    });
    await send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "Tab",
      code: "Tab",
      windowsVirtualKeyCode: 9,
    });
    assert.equal(
      await evaluate("document.activeElement.closest('dialog')?.id"),
      "settingsDialog",
      "Modal focus escaped",
    );
  }
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Escape",
    code: "Escape",
    windowsVirtualKeyCode: 27,
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Escape",
    code: "Escape",
    windowsVirtualKeyCode: 27,
  });
  assert.equal(
    await evaluate("document.activeElement.id"),
    "settingsButton",
    "Restore opener focus",
  );
  const audio = await evaluate(
    `(async()=>{const files=['countdown_tick','pause','paddle_hit_soft','point_lost','point_won','error_soft','menu_back','level_complete','player_joined','wall_bounce','countdown_final','menu_select','paddle_hit_strong','match_victory','achievement','fire_ready','fire_launch'];return Promise.all(files.map(async f=>{const r=await fetch('./assets/audio/'+f+'.wav');const b=await r.arrayBuffer();return r.ok&&b.byteLength>44&&new TextDecoder().decode(b.slice(0,4))==='RIFF';}));})()`,
  );
  assert.ok(audio.every(Boolean), "Audio assets fail");
  assert.deepEqual(errors, []);
  await fs.writeFile(
    "qa/results.json",
    JSON.stringify(
      {
        results,
        audioFiles: audio.length,
        runtimeErrors: errors,
        dynamicResize: true,
        keyboard: true,
        dialogs: true,
        touchPaddleMovement: true,
        focusContainmentAndRestoration: true,
      },
      null,
      2,
    ),
  );
  console.log(
    `Passed ${results.length} viewport sizes, dialogs, pause/countdown, keyboard defaults, dynamic resize and ${audio.length} WAV assets.`,
  );
} finally {
  socket.close();
}
