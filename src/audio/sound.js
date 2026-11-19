import { SOUND_VOLUME } from "../config/settings.js";

const FILES = {
  fireReady: "fire_ready.wav",
  fireLaunch: "fire_launch.wav",
  paddle: "paddle_hit_soft.wav",
  paddleStrong: "paddle_hit_strong.wav",
  wall: "wall_bounce.wav",
  score: "point_won.wav",
  miss: "point_lost.wav",
  countdown: "countdown_tick.wav",
  go: "countdown_final.wav",
  pause: "pause.wav",
  click: "menu_select.wav",
  victory: "match_victory.wav",
  level: "level_complete.wav",
};

export class SoundManager {
  constructor() {
    this.enabled = true;
    this.volume = SOUND_VOLUME;
    this.samples = new Map();
    this.context = null;
    this.loading = null;
  }

  async unlock() {
    if (this.context?.state === "suspended") void this.context.resume();
    if (this.loading) return this.loading;
    this.loading = this.load();
    return this.loading;
  }

  async load() {
    try {
      const AudioContextType = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextType) return;
      if (!this.context) this.context = new AudioContextType();
      if (this.context.state === "suspended") await this.context.resume();
      for (const [name, file] of Object.entries(FILES)) {
        if (this.samples.has(name)) continue;
        const response = await fetch(
          new URL(`../../assets/audio/${file}`, import.meta.url),
        );
        if (!response.ok) continue;
        const buffer = await response.arrayBuffer();
        this.samples.set(name, await this.context.decodeAudioData(buffer));
      }
    } catch (error) {
      console.warn("Audio is unavailable; gameplay continues silently.", error);
    }
  }

  play(name, intensity = 1) {
    if (!this.enabled || !this.context || this.context.state !== "running")
      return;
    const sample = this.samples.get(name);
    if (!sample) return;
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = sample;
    gain.gain.value = this.volume * Math.max(0, Math.min(1, intensity));
    source.connect(gain).connect(this.context.destination);
    source.start();
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}
