// js/Game/ParticlePool.js - Zero-GC particle pool
import { RNG } from './RNG.js';

export class Particle {
  constructor() {
    this.x = 0; this.y = 0; this.life = 0; this.maxLife = 0;
    this.color = '#fff'; this.size = 1;
    this.vx = 0; this.vy = 0; this.gravity = 0;
  }
  reset(x, y, color, size, life, vx, vy, gravity) {
    this.x = x; this.y = y; this.maxLife = this.life = life;
    this.color = color; this.size = size;
    this.vx = vx; this.vy = vy; this.gravity = gravity;
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += this.gravity * dt;
    this.life -= dt;
  }
  draw(ctx) {
    const alpha = this.life / this.maxLife;
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export class ParticlePool {
  constructor(capacity = 200, rng = new RNG()) {
    this.capacity = capacity;
    this.rng = rng;
    this._free = [];
    this._active = [];
    for (let i = 0; i < capacity; i++) {
      this._free.push(new Particle());
    }
  }
  acquire(x, y, color, size, life = 1, spread = 60, gravity = 140) {
    if (this._free.length === 0) return null;
    const p = this._free.pop();
    const angle = this.rng.next() * Math.PI * 2;
    const speed = spread * (0.35 + this.rng.next() * 0.65);
    p.reset(x, y, color, size, life,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed - 30,
      gravity);
    this._active.push(p);
    return p;
  }
  release(particle) {
    const idx = this._active.indexOf(particle);
    if (idx >= 0) {
      this._active.splice(idx, 1);
      this._free.push(particle);
    }
  }
  update(dt) {
    for (let i = this._active.length - 1; i >= 0; i--) {
      const p = this._active[i];
      p.update(dt);
      if (p.life <= 0) {
        this._active.splice(i, 1);
        this._free.push(p);
      }
    }
  }
  draw(ctx) {
    for (const p of this._active) p.draw(ctx);
  }
  emit(x, y, color, count, spread, life, size, gravity) {
    const n = Math.min(count, this._free.length);
    for (let i = 0; i < n; i++) this.acquire(x, y, color, size, life, spread, gravity);
  }
}