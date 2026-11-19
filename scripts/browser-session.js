import assert from "node:assert/strict";
import fs from "node:fs/promises";
const port = process.env.CDP_PORT || "9397";
export const base = process.env.GAME_URL || "http://localhost:5173";
const targets = await fetch(`http://127.0.0.1:${port}/json`).then((r) =>
  r.json(),
);
const target = targets.find((t) => t.type === "page");
assert.ok(target, "Launch Chrome with remote debugging first; see README.");
export const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let sequence = 0;
export const errors = [];
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
export function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
export async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    userGesture: true,
    awaitPromise: true,
  });
  assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await send("Page.enable");
await send("Runtime.enable");
