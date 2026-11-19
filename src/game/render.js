import { FIELD } from "../config/settings.js";

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d", { alpha: false });
    this.quality = "balanced";
    this.trail = [];
    this.lastTime = 0;
    this.lastFireOwner = null;
    this.reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }

  setQuality(quality) {
    this.quality = quality;
    this.trail = [];
  }

  resize() {
    const scale = Math.min(
      window.devicePixelRatio || 1,
      this.quality === "lite" ? 1.25 : 2,
    );
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.round(rect.width * scale);
    const height = Math.round(rect.height * scale);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.context.setTransform(
      width / FIELD.width,
      0,
      0,
      height / FIELD.height,
      0,
      0,
    );
  }

  render(round, now, active) {
    this.resize();
    const ctx = this.context;
    const { width, height } = FIELD;
    ctx.fillStyle = "#080f22";
    ctx.fillRect(0, 0, width, height);
    if (this.quality !== "lite") {
      const glow = ctx.createRadialGradient(
        width * 0.52,
        height * 0.46,
        10,
        width * 0.52,
        height * 0.46,
        width * 0.65,
      );
      glow.addColorStop(0, "#171a3d");
      glow.addColorStop(0.5, "#10142d");
      glow.addColorStop(1, "#080f22");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.strokeStyle = "rgba(163, 161, 216, 0.08)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(180, 159, 245, .23)";
    ctx.setLineDash([9, 15]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2, 35);
    ctx.lineTo(width / 2, height - 35);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 79, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(185, 166, 255, .08)";
    ctx.strokeRect(20, 18, width - 40, height - 36);

    const { ball, player, computer } = round;
    const fire = round.fire.owner !== null;
    if (!active || ball.vx === 0 || this.lastFireOwner !== round.fire.owner)
      this.trail = [];
    this.lastFireOwner = round.fire.owner;
    const enhanced = !this.reduceMotion && this.quality !== "lite";
    if (
      active &&
      !this.reduceMotion &&
      (enhanced || fire) &&
      ball.vx !== 0 &&
      now - this.lastTime > 0.015
    ) {
      this.trail.push({ x: ball.x, y: ball.y });
      const maximum =
        this.quality === "ultra" ? 22 : this.quality === "lite" ? 4 : 12;
      if (this.trail.length > maximum) this.trail.shift();
      this.lastTime = now;
    }
    if (fire) this.paintFlame(ball, now, active);
    if (enhanced && !fire) {
      for (let index = 0; index < this.trail.length; index += 1) {
        const item = this.trail[index];
        const alpha = ((index + 1) / this.trail.length) * 0.27;
        ctx.fillStyle = `rgba(220,183,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(
          item.x,
          item.y,
          (3.8 * (index + 1)) / this.trail.length,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
    this.paintPaddle(player, "#a6f8fa", enhanced);
    this.paintPaddle(computer, "#cf9bff", enhanced);
    if (enhanced) {
      ctx.shadowBlur = this.quality === "ultra" ? 31 : 15;
      ctx.shadowColor = "#e3b4ff";
    }
    // A round screen-space core keeps the centre readable in tall portrait arenas.
    // This is a visibility marker; the collision radius stays FIELD.ballRadius.
    ctx.save();
    const sx = this.canvas.width / FIELD.width,
      sy = this.canvas.height / FIELD.height;
    const density = Math.min(
      window.devicePixelRatio || 1,
      this.quality === "lite" ? 1.25 : 2,
    );
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = fire ? "#fff8b8" : "#fff4fc";
    ctx.beginPath();
    ctx.arc(
      ball.x * sx,
      ball.y * sy,
      Math.max(5 * density, Math.min(sx, sy) * ball.radius),
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();
    ctx.shadowBlur = 0;
  }

  paintFlame(ball, now, active) {
    const ctx = this.context;
    const sx = this.canvas.width / FIELD.width,
      sy = this.canvas.height / FIELD.height;
    const density = Math.min(
      window.devicePixelRatio || 1,
      this.quality === "lite" ? 1.25 : 2,
    );
    const x = ball.x * sx,
      y = ball.y * sy;
    const magnitude = Math.hypot(ball.vx * sx, ball.vy * sy) || 1;
    const dx = (ball.vx * sx) / magnitude,
      dy = (ball.vy * sy) / magnitude;
    const length =
      (this.quality === "lite" || this.reduceMotion
        ? 28
        : this.quality === "ultra"
          ? 72
          : 50) * density;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const gradient = ctx.createLinearGradient(
      x,
      y,
      x - dx * length,
      y - dy * length,
    );
    gradient.addColorStop(0, "#ffe88f");
    gradient.addColorStop(0.35, "#ff9235");
    gradient.addColorStop(1, "#ed493000");
    ctx.fillStyle = gradient;
    // Short flame ribbons always remain behind the ball; its radius/hitbox never changes.
    const ribbons =
      this.quality === "lite" || this.reduceMotion
        ? 1
        : this.quality === "ultra"
          ? 5
          : 3;
    for (let i = 0; i < ribbons; i++) {
      const flicker =
        !this.reduceMotion && active ? Math.sin(now * 24 + i * 2) * 5 : 0;
      const tail = length * (1 - i * 0.12);
      const spread = (i - (ribbons - 1) / 2) * 4 + flicker;
      ctx.beginPath();
      ctx.moveTo(x - dy * 7, y + dx * 7);
      ctx.quadraticCurveTo(
        x - dx * tail * 0.5 - dy * spread,
        y - dy * tail * 0.5 + dx * spread,
        x - dx * tail - dy * spread,
        y - dy * tail + dx * spread,
      );
      ctx.lineTo(x + dy * 7, y - dx * 7);
      ctx.closePath();
      ctx.fill();
    }
    if (!this.reduceMotion && this.quality !== "lite") {
      for (let i = 0; i < this.trail.length; i++) {
        const item = this.trail[i];
        ctx.globalAlpha = ((i + 1) / this.trail.length) * 0.45;
        ctx.fillStyle = i % 2 ? "#ffae43" : "#ff582f";
        ctx.beginPath();
        ctx.arc(
          item.x * sx,
          item.y * sy + Math.sin(now * 15 + i) * 3,
          1 + (i / this.trail.length) * 3,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
    ctx.restore();
  }

  paintPaddle(paddle, color, glow) {
    const ctx = this.context;
    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = this.quality === "ultra" ? 25 : 12;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 6);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}
