import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { base, send, evaluate, wait, socket } from "./browser-session.js";
try {
  await send("Emulation.setDeviceMetricsOverride", {
    width: 480,
    height: 320,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await send("Page.navigate", { url: base + "/?qa=1" });
  await wait(500);
  const saved = await evaluate("window.__rallySnapshot()");
  assert.equal(saved.level, "2");
  assert.equal(saved.progress.points, "110");
  assert.match(
    await evaluate("document.getElementById('startButton').textContent"),
    /CONTINUE LEVEL 2/,
  );
  await evaluate("document.getElementById('startButton').click()");
  await wait(100);
  assert.equal(
    await evaluate("document.getElementById('learningTip').hidden"),
    false,
  );
  await evaluate("document.getElementById('dismissTip').click()");
  assert.equal(
    await evaluate("document.getElementById('learningTip').hidden"),
    true,
  );
  assert.equal(
    (await evaluate("window.__rallySnapshot()")).progress.points,
    "110",
  );
  const shot = await send("Page.captureScreenshot", { format: "png" });
  await fs.writeFile(
    "qa/continued-level-mobile.png",
    Buffer.from(shot.data, "base64"),
  );
  await fs.writeFile(
    "qa/adventure-results.json",
    JSON.stringify(
      { resumeLevel: "2", persistedPoints: "110", learningTipDismissed: true },
      null,
      2,
    ),
  );
  console.log(
    "Saved Continue level, exact Adventure points and dismissible learning tip passed.",
  );
} finally {
  socket.close();
}
