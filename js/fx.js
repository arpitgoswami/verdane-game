/* Verdane cinematic layer: dynamic lighting, bloom, god rays, ambient life, danger pulse, post grade.
   Wraps Game.draw; purely visual (own Math.random, never the seeded sim RNG). */
(function () {
  const V = window.Verdane, G = V && V.Game;
  if (!G) return;
  const { W, H, CELL, ROWS, LX, TOP, HOUSE } = V.dim;
  const ly = r => TOP + (r + 0.5) * CELL;
  const motes = Array.from({ length: 46 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 1 + Math.random() * 2, p: Math.random() * 6.28, v: 6 + Math.random() * 14 }));
  const K = CELL / 72;
  const glow = (ctx, x, y, r, col, a) => {
    r *= K;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col.replace('A', a)); g.addColorStop(1, col.replace('A', 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  const base = G.prototype.draw;
  G.prototype.draw = function (ctx) {
    base.call(this, ctx);
    const t = this.visualT || 0, night = !!this.m.noSkySun, calm = this.reduceMotion;
    ctx.save();

    // 1) Colour grade + lighting: warm golden hour by day, cold moonlight by night
    ctx.globalCompositeOperation = 'multiply';
    const grade = ctx.createLinearGradient(0, 0, 0, H);
    if (night) { grade.addColorStop(0, '#5f78c4'); grade.addColorStop(1, '#8aa0b8'); }
    else { grade.addColorStop(0, '#fff3d6'); grade.addColorStop(1, '#e8f0d0'); }
    ctx.fillStyle = grade; ctx.fillRect(0, 0, W, H);

    // 2) Drifting cloud shadows across the lawn (day) / fog bands (night)
    ctx.globalCompositeOperation = 'source-over';
    if (!calm) for (let i = 0; i < 3; i++) {
      const x = ((t * (9 + i * 4) + i * 700) % (W + 600)) - 300;
      const g = ctx.createRadialGradient(x, TOP + 120 + i * 130, 0, x, TOP + 120 + i * 130, 320);
      g.addColorStop(0, night ? 'rgba(160,190,230,.10)' : 'rgba(10,30,20,.13)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save(); ctx.scale(1, 0.55); ctx.translate(0, (TOP + 120 + i * 130) * 0.82);
      ctx.fillStyle = g; ctx.fillRect(x - 320, TOP + 120 + i * 130 - 320, 640, 640); ctx.restore();
    }

    // 3) Additive bloom on everything that should glow
    ctx.globalCompositeOperation = 'lighter';
    this.suns.forEach(s => glow(ctx, s.x, s.y, 58 + Math.sin(t * 4 + s.x) * 6, 'rgba(255,200,70,A)', 0.55));
    this.shots.forEach(s => glow(ctx, s.x, ly(s.r) - 8, 34, s.fire ? 'rgba(255,120,30,A)' : s.slow ? 'rgba(120,200,255,A)' : 'rgba(150,255,110,A)', 0.55));
    this.booms.forEach(b => glow(ctx, b.x, b.y, b.r * 1.4, 'rgba(255,150,50,A)', 0.45 * Math.max(0, b.t / b.dur)));
    this.plants.forEach(p => { if (p.id === 'glowcap') glow(ctx, LX + (p.c + 0.5) * CELL, ly(p.r), 120, 'rgba(120,255,200,A)', 0.4 + 0.1 * Math.sin(t * 2 + p.c)); });
    if (night) this.zs.forEach(z => glow(ctx, z.x, ly(z.r) - 10, 40, 'rgba(255,60,60,A)', 0.14));

    // 4) God rays + pollen/fireflies
    if (!calm) {
      if (!night) {
        ctx.globalAlpha = 0.07;
        for (let i = 0; i < 5; i++) {
          const x0 = 420 + i * 340 + Math.sin(t * 0.3 + i) * 40;
          const g = ctx.createLinearGradient(x0, 0, x0 - 260, H);
          g.addColorStop(0, '#fff2b0'); g.addColorStop(1, 'rgba(255,242,176,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0 + 90, 0); ctx.lineTo(x0 - 170, H); ctx.lineTo(x0 - 260, H); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      motes.forEach(m => {
        m.y -= m.v * 0.016; m.x += Math.sin(t + m.p) * 0.35; if (m.y < -10) { m.y = H + 10; m.x = Math.random() * W; }
        glow(ctx, m.x, m.y, 9 * m.s, night ? 'rgba(190,255,150,A)' : 'rgba(255,240,170,A)', 0.35 + 0.3 * Math.sin(t * 2 + m.p));
      });
    }

    // 5) Danger pulse: red edge glow in lanes where a zombie is about to breach
    ctx.globalCompositeOperation = 'source-over';
    for (let r = 0; r < ROWS; r++) {
      const near = this.zs.some(z => z.r === r && z.x < LX + CELL * 2.2);
      if (!near) continue;
      const g = ctx.createLinearGradient(0, 0, 360, 0), a = 0.28 + (calm ? 0 : 0.14 * Math.sin(t * 9));
      g.addColorStop(0, 'rgba(255,40,40,' + a + ')'); g.addColorStop(1, 'rgba(255,40,40,0)');
      ctx.fillStyle = g; ctx.fillRect(0, TOP + r * CELL, 360, CELL);
    }

    // 6) Cinematic vignette + letterbox-soft top/bottom falloff
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, night ? 'rgba(2,6,20,.62)' : 'rgba(8,16,8,.42)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  };
})();
