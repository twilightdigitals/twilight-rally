import { writeFile } from "node:fs/promises";
// Original deterministic PCM effects; no external samples or licenses required.
for (const [name, duration, launch] of [
  ["fire_ready", 0.42, false],
  ["fire_launch", 0.48, true],
]) {
  const rate = 22050,
    count = Math.floor(rate * duration),
    wav = Buffer.alloc(44 + count * 2);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + count * 2, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(count * 2, 40);
  let phase = 0,
    seed = 37;
  for (let i = 0; i < count; i++) {
    const t = i / rate,
      u = t / duration;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const frequency = launch
      ? 200 + 850 * u
      : [523, 659, 784][Math.min(2, Math.floor(u * 3))];
    phase += (2 * Math.PI * frequency) / rate;
    const noise = ((seed / 4294967296) * 2 - 1) * (launch ? 0.28 : 0.02);
    const envelope = Math.min(1, t / 0.015) * Math.pow(1 - u, 1.3);
    const sample =
      (Math.sin(phase) * 0.46 + Math.sin(phase * 2) * 0.12 + noise) * envelope;
    wav.writeInt16LE(Math.round(sample * 21000), 44 + i * 2);
  }
  await writeFile(
    new URL("../assets/audio/" + name + ".wav", import.meta.url),
    wav,
  );
}
console.log("Generated fire_ready.wav and fire_launch.wav");
