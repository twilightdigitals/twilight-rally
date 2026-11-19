import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = await readFile(path.join(root, "index.html"), "utf8");

test("entry is real HTML, not README markdown or plain text", () => {
  assert.match(html, /^<!doctype html>/i);
  assert.match(html, /<html\s+lang=/i);
  assert.match(html, /<canvas\s+id="gameCanvas"/);
  assert.match(html, /<\/html>\s*$/);
  assert.doesNotMatch(html, /^# Twilight Rally/m);
});

test("entry uses valid portable local styles and module script", async () => {
  const css = html.match(/<link\s+rel="stylesheet"\s+href="([^"]+)"/);
  const script = html.match(/<script\s+type="module"\s+src="([^"]+)"/);
  assert.ok(css, "missing stylesheet link");
  assert.ok(script, "missing game module");
  for (const asset of [css[1], script[1]]) {
    assert.match(
      asset,
      /^\.\//,
      `asset must use portable relative path: ${asset}`,
    );
    const pathname = path.resolve(root, asset);
    assert.ok(pathname.startsWith(`${root}${path.sep}`));
    assert.ok((await stat(pathname)).isFile(), `${asset} missing`);
  }
});

test("player guide controls and sound assets are packaged", async () => {
  for (const id of [
    "helpButton",
    "howToPlayDialog",
    "startButton",
    "gameCanvas",
  ]) {
    assert.ok(html.includes(`id="${id}"`), `${id} missing`);
  }
  assert.ok(
    (await stat(path.join(root, "assets/audio/countdown_tick.wav"))).isFile(),
  );
});
