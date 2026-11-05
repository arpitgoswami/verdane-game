/* Verdane engine: DOM-free simulation (step) + canvas drawing (draw). All randomness uses the seeded this.rng.
 * Presentation (pixel art, particles, shake, banners) is layered on top; it never consumes this.rng.
 */
(function () {
  const V = window.Verdane;
  const W = 1920, H = 1080, CELL = 160, COLS = 9, ROWS = 5, LX = 240, TOP = 140, SPAWN = 1760, HOUSE = 210;
  const mulberry = s => () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const cx = c => LX + (c + 0.5) * CELL, ly = r => TOP + (r + 0.5) * CELL;
  const pairKey = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
  const RECIPES = {};
  Object.entries(V.FUSIONS).forEach(([id, f]) => (RECIPES[pairKey(f.a, f.b)] = id));
  const sprite = (ctx, id, x, y, size, alpha) => {
    const S = window.Verdane && window.Verdane.Sprites;
    return !!(S && S.draw(ctx, id, x, y, size, alpha));
  };
  const artDraw = (ctx, key, x, y, size, opts) => {
    const A = window.Verdane && window.Verdane.Art;
    return !!(A && A.draw(ctx, key, x, y, size, opts));
  };
  const clamp01 = n => Math.max(0, Math.min(1, n));

  class Game {
    constructor(mission, seed) {
      this.m = mission;
      this.seed = (seed == null ? mission.id * 7919 : seed) >>> 0;
      this.rng = mulberry(this.seed);
      this.sun = mission.sun; this.t = 0; this.plants = []; this.zs = []; this.shots = []; this.suns = [];
      this.cd = {}; mission.seeds.forEach(s => (this.cd[s] = 0));
      this.mode = mission.mode || 'campaign';
      this.blockedTiles = new Set((mission.blocked || []).map(([c, r]) => c + ',' + r));
      this.plantLimit = mission.plantLimit ?? Infinity;
      this.plantsLost = 0;
      this.vases = (mission.vases || []).map(v => Object.assign({}, v, { broken: false }));
      this.mowers = (this.mode === 'vase' || mission.mowers === false) ? [] : Array.from({ length: ROWS }, (_, r) => ({ r, x: LX - 36, run: false, spent: false }));
      this.mowersUsed = 0; this.sel = null; this.shovel = false; this.speed = 1; this.paused = false;
      this.state = 'play'; this.skyT = 4; this.autoSun = false; this.mouse = null; this.note = ''; this.noteT = 0; this.killed = 0;
      this.booms = []; this.reduceMotion = false;
      this.cursor = { c: 4, r: 2 }; this.showCursor = false;
      this.sched = this.buildWaves(); this.wi = 0;
      this.bossAt = mission.boss ? this.sched[this.sched.length - 1].t + 14 : null; this.bossDone = !mission.boss;
      // Presentation-only state (never affects the simulation).
      this.events = []; this.particles = []; this.floats = []; this.shake = 0; this.banner = null;
      this.world = null; this.visualT = 0;
    }
    buildWaves() {
      const m = this.m, out = [];
      for (let i = 0; i < m.waves; i++) {
        const last = i === m.waves - 1, mid = i === Math.floor(m.waves / 2);
        let w = m.budget * (0.55 + 0.9 * i / Math.max(1, m.waves - 1)) * (last ? 1.6 : mid ? 1.25 : 1);
        const list = [];
        while (w >= 1) {
          const ch = m.pool.filter(z => V.ZOMBIES[z].cost <= w + 1);
          if (!ch.length) break;
          const z = ch[Math.floor(this.rng() * ch.length)]; list.push(z); w -= V.ZOMBIES[z].cost;
        }
        out.push({ t: 22 + i * 17 * (1 - 0.015 * i), huge: mid || last, list });
      }
      return out;
    }
    say(t) { this.note = t; this.noteT = 3; }
    emit(type, data) { if (this.events.length < 32) this.events.push(Object.assign({ type }, data || {})); }
    drainEvents() { const out = this.events; this.events = []; return out; }
    puff(x, y, color, n, spread) {
      if (this.reduceMotion) return;
      const count = Math.min(n, 180 - this.particles.length);
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2, s = (spread || 60) * (0.35 + Math.random());
        this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, g: 140, life: 0.35 + Math.random() * 0.35, max: 0.7, color, size: Math.random() > 0.5 ? 3 : 2 });
      }
    }
    floatText(x, y, text, color) {
      if (this.floats.length >= 24) this.floats.shift();
      this.floats.push({ x, y, text, color: color || '#ffe28a', life: 0.9, max: 0.9 });
    }
    ring(x, y, r) { if (!this.reduceMotion) this.booms.push({ x, y, t: 0.45, dur: 0.45, r }); }
    setBanner(text, sub, dur) { this.banner = { text, sub: sub || '', t: 0, dur: dur || 2.3 }; }
    plantAt(c, r) { return this.plants.find(p => p.c === c && p.r === r && !p.dead); }
    isBlocked(c, r) { return c < 0 || c >= COLS || r < 0 || r >= ROWS || this.blockedTiles.has(c + ',' + r); }
    plantCount() { return this.plants.filter(p => !p.dead && !p.def.sub).length; }
    placeFree(id, c, r) {
      if (this.isBlocked(c, r) || this.plantAt(c, r)) return null;
      const d = V.ALL[id];
      if (!d) return null;
      const p = this.mk(id, c, r);
      this.plants.push(p);
      this.emit('place', { id });
      this.puff(cx(c), ly(r) - 8, '#8fd16a', 9, 55);
      return p;
    }
    evaluate(pid, c, r) {
      const res = { ok: false, fuse: false, res: pid, price: 0, why: '' };
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS) { res.why = 'off lawn'; return res; }
      const ex = this.plantAt(c, r), def = V.ALL[pid];
      if (!ex) { res.ok = true; res.price = def.cost; return res; }
      if (ex.def.fused) { res.why = 'already fused'; return res; }
      const id = RECIPES[pairKey(ex.id, pid)];
      if (!id || !this.m.fusions.includes(id)) { res.why = ex.id === pid ? 'occupied' : 'no recipe'; return res; }
      res.ok = true; res.fuse = true; res.res = id;
      res.price = Math.round(Math.max(0.5 * def.cost, V.FUSIONS[id].cost - ex.def.cost)); return res;
    }
    ready(pid) { return this.cd[pid] <= 0; }
    place(pid, c, r) {
      if (this.state !== 'play' || !this.m.seeds.includes(pid)) return false;
      if (this.isBlocked(c, r)) { this.say("Can't plant here: blocked"); this.emit('error', { why: 'blocked' }); return false; }
      if (this.plantCount() >= this.plantLimit) { this.say('Plant limit reached'); this.emit('error', { why: 'limit' }); return false; }
      const ev = this.evaluate(pid, c, r);
      if (!ev.ok) { if (ev.why) { this.say("Can't plant here: " + ev.why); this.emit('error', { why: ev.why }); } return false; }
      if (!this.ready(pid)) { this.say(V.ALL[pid].n + ' is recharging (' + Math.ceil(this.cd[pid]) + 's)'); this.emit('error', { why: 'cooldown' }); return false; }
      if (this.sun < ev.price) { this.say('Not enough sun: need ' + Math.ceil(ev.price - this.sun) + ' more'); this.emit('error', { why: 'sun' }); return false; }
      this.sun -= ev.price; this.cd[pid] = V.ALL[pid].cd;
      let ratio = 1;
      if (ev.fuse) { const old = this.plantAt(c, r); ratio = old.hp / old.max; this.plants = this.plants.filter(p => p !== old); }
      this.plants.push(this.mk(ev.res, c, r, ratio));
      this.emit(ev.fuse ? 'fuse' : 'place', { id: ev.res });
      this.puff(cx(c), ly(r) - 8, ev.fuse ? '#ffc94a' : '#8fd16a', ev.fuse ? 16 : 9, ev.fuse ? 90 : 55);
      if (ev.fuse) this.floatText(cx(c), ly(r) - 34, V.ALL[ev.res].n, '#ffc94a');
      return true;
    }
    mk(id, c, r, ratio = 1) {
      const d = V.ALL[id];
      return { id, def: d, c, r, hp: d.hp * ratio, max: d.hp, t: d.sun ? d.every * 0.4 : 0, fuse: d.bomb ? d.bomb.fuse : -1, sp: 0, dead: false, pop: 0.24, anim: (c * 3 + r) % 2 };
    }
    dig(c, r) { const p = this.plantAt(c, r); if (p) { this.plants = this.plants.filter(x => x !== p); this.puff(cx(c), ly(r), '#b9d3bf', 8, 40); } }
    spawnZ(id, r, x) {
      const d = V.ZOMBIES[id];
      const z = {
        id, def: d, r, x,
        hp: d.hp, max: d.hp,
        armor: d.armor || 0,
        shield: d.shield || 0, maxShield: d.shield || 0,
        slowT: 0, slowMul: 1, burn: 0,
        jumped: false, jt: -1, jx: 0,
        speed: d.speed,
        stunT: 0, burrowT: -1, burrowUsed: false,
        sprintT: 0, sprintCd: 0,
        summonT: 0, summoned: 0, splitDone: false,
        dead: false, boss: !!d.boss, flash: 0
      };
      this.zs.push(z);
      return z;
    }
    hurt(z, d, kind, opts = {}) {
      if (z.dead) return;
      if (z.boss && kind === 'mower') d = Math.min(d, 800);
      // Shielder shield absorbs normal shots unless ignored (lobber/fire/bomb).
      if (z.shield > 0 && kind === 'shot' && !opts.ignoreShield) {
        const a = Math.min(z.shield, d); z.shield -= a; d -= a;
        if (z.shield <= 0) { this.emit('stun'); }
        if (d <= 0) { z.flash = 0.08; return; }
      }
      if (z.armor > 0 && kind !== 'burn') { const a = Math.min(z.armor, d); z.armor -= a; d -= a; }
      z.hp -= d; z.flash = 0.08;
      if (kind !== 'burn' && !this.reduceMotion) this.puff(z.x, ly(z.r) - 8, kind === 'fire' ? '#ff9a3c' : '#8fd16a', 2, 30);
      if (z.hp <= 0) {
        z.dead = true; this.killed++;
        this.emit('kill');
        // Splitter: split into two Splitlings on death.
        if (z.def.split && !z.splitDone) {
          z.splitDone = true;
          for (let i = 0; i < z.def.split.n; i++) {
            const sx = z.x + (i - 0.5) * 24;
            const sl = this.spawnZ(z.def.split.id, z.r, sx);
            sl.speed = z.def.split.speed || 20;
            sl.dps = z.def.split.dps || 18;
            sl.hp = sl.max = z.def.split.hp || 70;
          }
        }
        if (!this.reduceMotion) {
          this.puff(z.x, ly(z.r) - 8, '#7fae6a', z.boss ? 34 : 10, z.boss ? 130 : 70);
          if (z.boss) { this.puff(z.x, ly(z.r) - 8, '#b9c2c9', 18, 110); this.shake = Math.max(this.shake, 0.8); }
        }
      }
    }
    step(dt) {
      if (this.state !== 'play' || this.paused) return;
      this.t += dt; this.visualT += dt; this.noteT -= dt;
      for (const k in this.cd) this.cd[k] = Math.max(0, this.cd[k] - dt);
      for (const b of this.booms) b.t -= dt;
      if (this.booms.length) this.booms = this.booms.filter(b => b.t > 0);
      if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 3.4);
      if (this.banner) { this.banner.t += dt; if (this.banner.t >= this.banner.dur) this.banner = null; }
      for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.life -= dt; }
      if (this.particles.length) this.particles = this.particles.filter(p => p.life > 0);
      for (const f of this.floats) { f.y -= 26 * dt; f.life -= dt; }
      if (this.floats.length) this.floats = this.floats.filter(f => f.life > 0);
      for (const p of this.plants) if (p.pop > 0) p.pop = Math.max(0, p.pop - dt);
      if (!this.m.noSkySun) {
        this.skyT -= dt;
        if (this.skyT <= 0) { this.skyT = 9.5 + this.rng() * 3; this.suns.push({ x: LX + this.rng() * (COLS * CELL - 30), y: 40, ty: ly(Math.floor(this.rng() * ROWS)) + 10, amt: 25, life: 10 }); }
      }
      while (this.wi < this.sched.length && this.t >= this.sched[this.wi].t) {
        const w = this.sched[this.wi++];
        const label = w.huge ? 'Huge wave' : 'Wave ' + this.wi;
        this.setBanner(label, w.huge ? 'They are coming in force.' : 'Hold the lawn.', 2.1);
        this.emit('wave', { n: this.wi });
        w.list.forEach(z => this.spawnZ(z, Math.floor(this.rng() * ROWS), SPAWN + this.rng() * 36));
      }
      if (this.bossAt !== null && !this.bossDone && this.t >= this.bossAt) {
        this.bossDone = true; this.spawnZ(this.m.boss, 2, SPAWN + 20);
        const nm = V.ZOMBIES[this.m.boss].n;
        this.say(nm + ' approaches!'); this.setBanner(nm, 'Mowers only chip it.', 2.8);
        this.emit('boss'); this.shake = Math.max(this.shake, 0.7);
      }
      // Composter: summon grunts on a deterministic timer.
      this.zs.slice().forEach(z => {
        if (z.dead || !z.def.summon) return;
        z.summonT = Math.max(0, z.summonT - dt);
        if (z.summonT <= 0 && z.summoned < z.def.summon.max) {
          z.summonT = z.def.summon.every;
          z.summoned++;
          this.spawnZ(z.def.summon.id, z.r, Math.max(100, z.x - 100));
          this.emit('summon');
          this.puff(z.x, ly(z.r), '#8fd16a', 8, 40);
        }
      });
      for (const p of this.plants.slice()) this.tickPlant(p, dt);
      for (const z of this.zs.slice()) this.tickZ(z, dt);
      if (this.state !== 'play') {
        this.zs = this.zs.filter(z => !z.dead);
        this.plants = this.plants.filter(p => !p.dead);
        return;
      }
      for (const s of this.shots.slice()) this.tickShot(s, dt);
      for (const s of this.suns) { if (s.y < s.ty) s.y = Math.min(s.ty, s.y + 45 * dt); else s.life -= dt; }
      if (this.autoSun) this.collectLandedSuns();
      this.suns = this.suns.filter(s => s.life > 0);
      for (const m of this.mowers) this.tickMower(m, dt);
      this.zs = this.zs.filter(z => !z.dead); this.plants = this.plants.filter(p => !p.dead);
      if (this.wi >= this.sched.length && this.bossDone && !this.zs.length) this.finish(true);
    }
    tickPlant(p, dt) {
      if (p.dead) return;
      const d = p.def;
      if (d.sun) { p.t += dt; if (p.t >= d.every) { p.t = 0; this.suns.push({ x: cx(p.c) + 10, y: ly(p.r) - 8, ty: ly(p.r) + 22, amt: d.sun, life: 10 }); } }
      if (d.shoot) {
        p.sp += dt;
        if (p.sp >= d.shoot.every) {
          if (this.zs.some(z => z.r === p.r && !z.dead && z.x > cx(p.c) - 12)) { p.sp = 0; this.shots.push({ r: p.r, x: cx(p.c) + 24, ...d.shoot, fire: !!d.shoot.burn }); this.emit('shoot', { kind: d.shoot.burn ? 'fire' : d.shoot.slow ? 'frost' : 'pea' }); } else p.sp = d.shoot.every;
        }
      }
      if (d.spike) { p.sp += dt; if (p.sp >= 1) { p.sp = 0; this.zs.forEach(z => { if (z.r === p.r && z.jt < 0 && Math.abs(z.x - cx(p.c)) < CELL * 0.55) this.hurt(z, d.spike, 'spike'); }); } }
      if (p.fuse >= 0) { p.fuse -= dt; if (p.fuse < 0) this.explode(p); }
      // Lobber: arc a heavy shot over shields/walls.
      if (d.lob) {
        p.sp += dt;
        if (p.sp >= d.lob.every) {
          const targets = this.zs.filter(z => z.r === p.r && !z.dead && z.x > cx(p.c) - 12);
          if (targets.length) {
            p.sp = 0;
            const t = targets[0];
            this.shots.push({ r: p.r, x: cx(p.c) + 24, dmg: d.lob.dmg, speed: d.lob.speed, ignoreShield: true, lob: true });
            this.emit('shoot', { kind: 'lob' });
          } else p.sp = d.lob.every;
        }
      }
      // Vine: spread Vinepatch into neighbouring tiles.
      if (d.spread) {
        p.sp += dt;
        if (p.sp >= d.spread.every && this.plants.filter(x => x.id === 'vinepatch').length < d.spread.max) {
          p.sp = 0;
          const dirs = [[-1,0],[1,0],[0,-1],[0,1]].filter(([dc,dr]) => {
            const nc = p.c + dc, nr = p.r + dr;
            return nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS && !this.plantAt(nc, nr);
          });
          if (dirs.length) {
            const [dc, dr] = dirs[Math.floor(this.rng() * dirs.length)];
            this.plants.push(this.mk(d.spread.id, p.c + dc, p.r + dr));
            this.puff(cx(p.c + dc), ly(p.r + dr), '#8fd16a', 6, 40);
          }
        }
      }
      // Bellflower: pulse stun across row ±1.
      if (d.pulse) {
        p.sp += dt;
        if (p.sp >= d.pulse.every) {
          p.sp = 0;
          this.zs.forEach(z => {
            if (!z.dead && Math.abs(z.r - p.r) <= d.pulse.rows) { z.stunT = d.pulse.stun; this.emit('stun'); }
          });
          this.puff(cx(p.c), ly(p.r), '#ffc94a', 10, 60);
        }
      }
      // Glowcap: aura quickens adjacent shooter.
      if (d.aura) {
        const haste = d.aura.haste || 1;
        this.plants.forEach(q => {
          if (q !== p && Math.abs(q.c - p.c) <= 1 && Math.abs(q.r - p.r) <= 1 && q.def.shoot && !q.auraHaste) {
            q.auraHaste = true;
            const base = q.def.shoot.every;
            q.def.shoot.every = Math.max(0.4, base * haste);
          }
        });
      }
    }
    explode(p) {
      const b = p.def.bomb;
      this.zs.forEach(z => { if (Math.hypot((z.x - cx(p.c)) / CELL, z.r - p.r) <= b.r) this.hurt(z, b.dmg, 'bomb'); });
      p.dead = true;
      this.emit('boom');
      this.puff(cx(p.c), ly(p.r), '#ff9a3c', 28, 140);
      this.puff(cx(p.c), ly(p.r), '#ffe28a', 12, 90);
      this.ring(cx(p.c), ly(p.r), b.r * CELL);
      this.shake = Math.max(this.shake, 0.55);
      this.floatText(cx(p.c), ly(p.r) - 40, 'BOOM', '#ff9a3c');
    }
    tickShot(s, dt) {
      s.x += s.speed * dt;
      const z = this.zs.find(z => z.r === s.r && !z.dead && Math.abs(z.x - s.x) <= (z.boss ? 36 : 14) + 6);
      if (z) { this.hurt(z, s.dmg, s.fire ? 'fire' : 'shot', { ignoreShield: !!s.ignoreShield }); if (s.slow) { z.slowT = s.slowTime || 3; z.slowMul = s.slow; } if (s.burn) z.burn = s.burn; s.dead = true; }
      if (s.x > W + 20) s.dead = true;
      if (s.dead) this.shots = this.shots.filter(x => x !== s);
    }
    tickZ(z, dt) {
      if (z.dead) return;
      if (z.flash > 0) z.flash -= dt;
      if (z.burn > 0) { z.burn -= dt; this.hurt(z, 10 * dt, 'burn'); if (z.dead) return; }
      // Stun: stop movement and attacks while stunned.
      if (z.stunT > 0) { z.stunT = Math.max(0, z.stunT - dt); return; }
      const j = z.def.jump;
      if (z.jt >= 0) {
        z.jt += dt; z.x = z.jx - j.cells * CELL * Math.min(1, z.jt / j.time);
        if (z.jt >= j.time) { z.jt = -1; z.speed = j.speedAfter; }
        return;
      }
      const col = Math.floor((z.x - 14 - LX) / CELL), p = col >= 0 && col < COLS ? this.plantAt(col, z.r) : null;
      if (p) {
        // Tunneler: burrow under the first plant, resurface behind it.
        if (z.def.burrow && !z.burrowUsed) {
          z.burrowUsed = true;
          z.burrowT = z.def.burrow.time;
          const behind = col + Math.ceil(z.def.burrow.cells);
          const behindX = LX + behind * CELL;
          z.x = Math.min(behindX, SPAWN);
          return;
        }
        if (j && !z.jumped) { z.jumped = true; z.jt = 0; z.jx = z.x; return; }
        // Sapper: detonate at first plant, splash neighbors, then dies.
        if (z.def.blast) {
          z.dead = true; this.killed++;
          this.emit('kill');
          const bx = cx(p.c), by = ly(p.r);
          this.hurtPlantAndNeighbors(p.c, p.r, z.def.blast.dmg, z.def.blast.splash);
          this.zs = this.zs.filter(x => x !== z);
          this.puff(bx, by, '#ff9a3c', 16, 80);
          this.emit('boom');
          this.shake = Math.max(this.shake, 0.5);
          this.floatText(bx, by - 30, 'BOOM', '#ff9a3c');
          return;
        }
        p.hp -= z.def.dps * dt;
        if (p.hp <= 0) { p.dead = true; this.puff(cx(p.c), ly(p.r), '#557a45', 8, 50); }
        return;
      }
      if (z.slowT > 0) z.slowT -= dt;
      // Runner: sprint speed multiplier during sprint window.
      let spdMul = 1;
      if (z.def.sprint) {
        z.sprintCd = Math.max(0, z.sprintCd - dt);
        if (z.sprintT > 0) {
          z.sprintT = Math.max(0, z.sprintT - dt);
          spdMul = z.def.sprint.mul;
        } else if (z.sprintCd <= 0) {
          z.sprintT = z.def.sprint.time;
          z.sprintCd = z.def.sprint.every;
        }
      }
      // Tunneler burrow: travel under ground, faster, no collision.
      if (z.burrowT > 0) {
        z.burrowT = Math.max(0, z.burrowT - dt);
        z.x -= z.speed * 2.5 * dt;
      } else {
        z.x -= z.speed * (z.slowT > 0 ? z.slowMul : 1) * spdMul * dt;
      }
      if (z.x <= HOUSE) {
        z.x = HOUSE;
        const m = this.mowers[z.r];
        if (m && !m.spent && !m.run) { this.startMower(m); return; }
        const reach = z.boss ? 70 : 48;
        if (m && !m.spent && m.x <= z.x + reach) return;
        this.finish(false);
      }
    }
    hurtPlantAndNeighbors(c, r, dmg, splash) {
      const hit = [];
      const target = this.plantAt(c, r);
      if (target) hit.push(target);
      [[c-1,r],[c+1,r],[c,r-1],[c,r+1]].forEach(([cc,rr]) => {
        if (cc >= 0 && cc < COLS && rr >= 0 && rr < ROWS) {
          const p = this.plantAt(cc, rr);
          if (p && !hit.includes(p)) hit.push(p);
        }
      });
      hit.forEach(p => { p.hp -= dmg; if (p.hp <= 0) p.dead = true; });
    }
    startMower(m) {
      if (m.run || m.spent) return false;
      m.run = true; this.mowersUsed++;
      this.emit('mower'); this.shake = Math.max(this.shake, 0.28);
      this.puff(m.x, ly(m.r) + 10, '#b9b08a', 8, 45);
      return true;
    }
    tickMower(m, dt) {
      if (!m.run && !m.spent && this.zs.some(z => z.r === m.r && !z.dead && z.x <= m.x + 46)) this.startMower(m);
      if (!m.run) return;
      m.x += 340 * dt;
      if (!this.reduceMotion && Math.random() < 0.55) this.particles.push({ x: m.x - 18, y: ly(m.r) + 12, vx: -40 - Math.random() * 50, vy: -20 - Math.random() * 30, g: 90, life: 0.3, max: 0.3, color: '#b9b08a', size: 2 });
      for (const z of this.zs) {
        if (z.r !== m.r || z.dead || Math.abs(z.x - m.x) >= 34 + (z.boss ? 36 : 14)) continue;
        if (z.boss) { this.hurt(z, 800, 'mower'); m.run = false; m.spent = true; return; }
        z.dead = true; this.killed++;
        this.puff(z.x, ly(z.r), '#7fae6a', 8, 60);
      }
      if (m.x > W + 50) { m.run = false; m.spent = true; }
    }
    finish(won) {
      if (this.state !== 'play') return;
      this.state = won ? 'won' : 'lost';
      this.result = { won, time: this.t, stars: won ? 1 + (this.mowersUsed === 0 ? 1 : 0) + (this.t <= this.m.par ? 1 : 0) : 0 };
      this.emit(won ? 'win' : 'lose');
      if (won) { this.setBanner('Garden defended', 'The lawn holds.', 2.4); this.puff(W / 2, H / 2, '#ffc94a', 24, 160); }
      else { this.setBanner('The house is breached', 'Try again.', 2.4); this.shake = Math.max(this.shake, 0.6); }
    }
    cell(x, y) { return { c: Math.floor((x - LX) / CELL), r: Math.floor((y - TOP) / CELL) }; }
    moveCursor(dc, dr) {
      this.showCursor = true;
      this.cursor.c = Math.max(0, Math.min(COLS - 1, this.cursor.c + dc));
      this.cursor.r = Math.max(0, Math.min(ROWS - 1, this.cursor.r + dr));
    }
    collectLandedSuns() {
      const keep = [];
      let gained = 0;
      for (const s of this.suns) { if (s.y >= s.ty) gained += s.amt; else keep.push(s); }
      if (!gained) return;
      this.sun += gained;
      this.suns = keep;
      this.emit('sun', { amt: gained });
    }
    collectSunAt(x, y, radius = 26) {
      let best = null, bestD = radius;
      for (const s of this.suns) {
        const d = Math.hypot(s.x - x, s.y - y);
        if (d < bestD) { bestD = d; best = s; }
      }
      if (!best) return false;
      this.sun += best.amt;
      this.suns = this.suns.filter(s => s !== best);
      this.emit('sun', { amt: best.amt });
      this.puff(best.x, best.y, '#ffc94a', 10, 75);
      this.floatText(best.x, best.y - 14, '+' + best.amt, '#ffe28a');
      return true;
    }
    activateCursor() {
      if (this.state !== 'play' || this.paused) return false;
      const { c, r } = this.cursor;
      if (this.shovel) { this.dig(c, r); return true; }
      if (!this.sel) return this.collectSunAt(cx(c), ly(r), 90);
      const ok = this.place(this.sel, c, r);
      if (ok && !this.ready(this.sel)) this.sel = null;
      return ok;
    }
    cancel() { this.sel = null; this.shovel = false; }
    click(x, y) {
      if (this.state !== 'play' || this.paused) return;
      if (this.collectSunAt(x, y)) return;
      const { c, r } = this.cell(x, y);
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
      if (this.shovel) { this.dig(c, r); return; }
      // Break vase on click (vase mode).
      const v = this.vases.find(vv => !vv.broken && vv.c === c && vv.r === r);
      if (v) { this.breakVase(v); return; }
      if (this.sel && this.place(this.sel, c, r) && !this.ready(this.sel)) this.sel = null;
    }
    breakVase(v) {
      v.broken = true;
      this.emit('vase');
      this.puff(cx(v.c), ly(v.r), '#b9d3bf', 10, 60);
      if (v.kind === 'plant') { this.placeFree(v.id, v.c, v.r); }
      else if (v.kind === 'zombie') { this.spawnZ(v.id, v.r, cx(v.c)); this.puff(cx(v.c), ly(v.r), '#7fae6a', 6, 40); }
      else if (v.kind === 'sun') { this.sun += v.amt; this.emit('sun', { amt: v.amt }); this.floatText(cx(v.c), ly(v.r), '+' + v.amt, '#ffe28a'); }
    }
    draw(ctx) {
      const A = V.Art;
      const night = !!this.m.noSkySun;
      if (!this.world && A) this.world = A.buildWorld(night);
      ctx.clearRect(0, 0, W, H);
      if (!this.world) { ctx.fillStyle = night ? '#14231d' : '#2f5d3a'; ctx.fillRect(0, 0, W, H); }
      ctx.save();
      if (this.shake > 0 && !this.reduceMotion) {
        const s = this.shake * this.shake;
        ctx.translate((Math.random() * 2 - 1) * 7 * s, (Math.random() * 2 - 1) * 5 * s);
      }
      if (this.world) ctx.drawImage(this.world, 0, 0, W, H);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

      const bar = (x, y, w, f, col) => {
        ctx.fillStyle = '#0009'; ctx.fillRect(Math.round(x - w / 2) - 1, y - 1, w + 2, 6);
        ctx.fillStyle = col; ctx.fillRect(Math.round(x - w / 2), y, Math.round(w * Math.max(0, f)), 4);
      };

      // Render blocked tiles (rock) and vases before plants.
      this.blockedTiles.forEach(key => {
        const [c, r] = key.split(',').map(Number);
        artDraw(ctx, 'rock', cx(c), ly(r), 140);
      });
      this.vases.forEach(v => {
        if (v.broken) return;
        artDraw(ctx, 'vase', cx(v.c), ly(v.r), 140);
      });

      this.plants.forEach(p => {
        const x = cx(p.c), y = ly(p.r);
        ctx.fillStyle = 'rgba(0,0,0,.22)';
        ctx.fillRect(Math.round(x - 30), Math.round(y + 40), 60, 4);
        ctx.fillRect(Math.round(x - 20), Math.round(y + 44), 40, 3);
        const pop = p.pop > 0 ? 1 - p.pop / 0.24 : 1;
        const scale = 0.72 + 0.28 * (1 - Math.pow(1 - pop, 3)) + (p.pop > 0 ? 0.06 * Math.sin(pop * Math.PI) : 0);
        const bob = this.reduceMotion ? 0 : Math.sin(this.visualT * 2 + p.c * 0.7 + p.r * 0.4) * 2;
        ctx.save(); ctx.translate(x, y + 8 + bob); ctx.scale(scale, scale);
        if (!sprite(ctx, p.id, 0, 0, 120)) {
          ctx.fillStyle = '#8fd16a'; ctx.fillRect(-40, -45, 80, 90);
          ctx.fillStyle = '#0e1a15'; ctx.font = '700 40px Figtree, sans-serif'; ctx.fillText(p.def.n.charAt(0), 0, 8);
        }
        ctx.restore();
        if (p.hp < p.max) bar(x, y + 55, 110, p.hp / p.max, '#8fd16a');
      });

      [...this.zs].sort((a, b) => a.r - b.r).forEach(z => {
        const s = z.def.big || 1;
        const jump = z.jt >= 0 ? Math.sin(Math.min(1, z.jt / z.def.jump.time) * Math.PI) * 70 : 0;
        const y = ly(z.r) - jump;
        let key = 'zombie:' + z.id;
        if ((z.id === 'cone' || z.id === 'bucket') && z.armor <= 0) key = 'zombie:grunt';
        const frame = Math.floor(this.visualT * 7 + z.r) % 2;
        if (!artDraw(ctx, key, z.x, y, 120 * s, { frame, flash: z.flash > 0 && !this.reduceMotion })) {
          ctx.globalAlpha = z.flash > 0 && !this.reduceMotion ? 0.6 : 1;
          ctx.fillStyle = '#7fae6a'; ctx.fillRect(z.x - 32 * s, y - 50 * s, 64 * s, 95 * s);
          ctx.fillStyle = '#101a14';
          ctx.fillRect(z.x - 20 * s, y - 20 * s, 10 * s, 10 * s); ctx.fillRect(z.x + 10 * s, y - 20 * s, 10 * s, 10 * s);
          ctx.globalAlpha = 1;
        }
        if (z.slowT > 0) {
          ctx.fillStyle = '#bfe8ff';
          ctx.fillRect(z.x + 40, y - 40, 4, 12); ctx.fillRect(z.x + 36, y - 36, 12, 4);
        }
        if (z.shield > 0) bar(z.x, y - 110 * s, 90 * s, z.shield / z.maxShield, '#bfe8ff');
        if (z.hp < z.max) bar(z.x, y - 95 * s, 90 * s, z.hp / z.max, '#e8708a');
      });

      this.shots.forEach(s => {
        const key = s.fire ? 'fire' : s.slow ? 'frost' : 'pea';
        const y = ly(s.r) - 16;
        ctx.globalAlpha = 0.25; artDraw(ctx, key, s.x - 16, y, 18);
        ctx.globalAlpha = 1;
        if (!artDraw(ctx, key, s.x, y, 30)) {
          ctx.fillStyle = s.fire ? '#ff9a3c' : s.slow ? '#8fd0ff' : '#8fd16a';
          ctx.beginPath(); ctx.arc(s.x, y, 12, 0, Math.PI * 2); ctx.fill();
        }
      });

      this.booms.forEach(b => {
        const a = clamp01(b.t / b.dur);
        ctx.strokeStyle = 'rgba(255,170,60,' + (0.8 * a).toFixed(3) + ')';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (1.05 - 0.35 * a), 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 1;
      });

      if (!this.reduceMotion) {
        this.particles.forEach(p => {
          ctx.globalAlpha = clamp01(p.life / p.max);
          ctx.fillStyle = p.color;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
        });
        ctx.globalAlpha = 1;
      }

      this.suns.forEach(s => {
        const bob = this.reduceMotion ? 0 : Math.sin(this.visualT * 3 + s.x) * 4;
        if (!artDraw(ctx, 'sun', s.x, s.y + bob, 50)) {
          ctx.fillStyle = '#ffc94a'; ctx.beginPath(); ctx.arc(s.x, s.y + bob, 20, 0, Math.PI * 2); ctx.fill();
        }
      });

      this.mowers.forEach(m => {
        if (m.spent) return;
        if (!artDraw(ctx, 'mower', m.x, ly(m.r) + 16, 110)) {
          ctx.fillStyle = '#b9c2c9'; ctx.fillRect(m.x - 40, ly(m.r) - 10, 80, 45);
          ctx.fillStyle = '#6f7a83'; ctx.fillRect(m.x - 50, ly(m.r) + 20, 100, 12);
        }
      });

      if (this.showCursor) {
        ctx.strokeStyle = this.shovel ? '#e8708a' : '#ffc94a'; ctx.lineWidth = 3;
        ctx.strokeRect(LX + this.cursor.c * CELL + 2, TOP + this.cursor.r * CELL + 2, CELL - 4, CELL - 4);
        ctx.lineWidth = 1;
      }

      const pid = this.sel;
      let hover = null;
      if (this.showCursor) hover = { c: this.cursor.c, r: this.cursor.r, x: cx(this.cursor.c), y: ly(this.cursor.r) };
      else if (this.mouse) { const cell = this.cell(this.mouse.x, this.mouse.y); hover = { c: cell.c, r: cell.r, x: this.mouse.x, y: this.mouse.y }; }
      if (pid && hover && !this.shovel) {
        const onLawn = hover.c >= 0 && hover.c < COLS && hover.r >= 0 && hover.r < ROWS;
        if (onLawn) {
          const ev = this.evaluate(pid, hover.c, hover.r);
          if (!ev.ok) { ctx.fillStyle = 'rgba(232,112,138,.26)'; ctx.fillRect(LX + hover.c * CELL, TOP + hover.r * CELL, CELL, CELL); }
          const gid = ev.ok ? ev.res : pid;
          if (!sprite(ctx, gid, hover.x, hover.y + (this.showCursor ? 6 : 0), 48, 0.6)) {
            ctx.globalAlpha = 0.6; ctx.fillStyle = '#8fd16a';
            ctx.fillRect(hover.x - 35, hover.y - 50, 70, 90);
          }
          if (ev.fuse) { ctx.globalAlpha = 1; ctx.font = 'bold 16px Figtree, sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText('Fuse: ' + V.ALL[ev.res].n + ' (' + ev.price + ')', hover.x, hover.y - 70); }
        } else {
          if (!sprite(ctx, pid, hover.x, hover.y, 120, 0.6)) {
            ctx.globalAlpha = 0.6; ctx.fillStyle = '#8fd16a';
            ctx.fillRect(hover.x - 35, hover.y - 50, 70, 90);
          }
        }
        ctx.globalAlpha = 1;
      }

      if (this.floats.length) {
        ctx.font = '700 20px Figtree, sans-serif';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(14,26,21,.9)';
        this.floats.forEach(f => {
          ctx.globalAlpha = clamp01(f.life / f.max + 0.15);
          ctx.strokeText(f.text, f.x, f.y);
          ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
        });
        ctx.globalAlpha = 1; ctx.lineWidth = 1;
      }

      if (this.banner) {
        const b = this.banner;
        const a = clamp01(Math.min(b.t * 4, (b.dur - b.t) * 2.2));
        ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(14,26,21,.82)';
        ctx.fillRect(0, H / 2 - 80, W, 160);
        ctx.fillStyle = '#ffc94a';
        ctx.font = '700 64px "Bricolage Grotesque", Figtree, sans-serif';
        ctx.fillText(b.text, W / 2, H / 2 - 12);
        if (b.sub) { ctx.fillStyle = '#e9f5c9'; ctx.font = '600 24px Figtree, sans-serif'; ctx.fillText(b.sub, W / 2, H / 2 + 48); }
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    }
  }
  V.Game = Game;
  V.dim = { W, H, CELL, COLS, ROWS, LX, TOP, HOUSE };
  V.toBoard = (rect, clientX, clientY) => ({ x: (clientX - rect.left) * W / rect.width, y: (clientY - rect.top) * H / rect.height });
})();
