# Game Refactor Complete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all critical bugs, architecture issues, performance problems, and code quality issues in the refactored Game modules (Simulation, Renderer, Controller, main game.js) to produce a working, maintainable, performant game engine.

**Architecture:** Three-module architecture (Simulation, Renderer, Controller) with proper dependency injection from main game.js. Single source of truth for shared state. Event-based communication between modules. Spatial partitioning for enemy optimization. Object-pooled particles for zero-GC rendering.

**Tech Stack:** Vanilla ES6 modules (browser-compatible), no build step required, Canvas 2D API for rendering.

**Spec:** `docs/superpowers/specs/2026-11-07-game-refactor-design.md`

## Global Constraints

- Must work in browser without bundler (ES modules via `<script type="module">`)
- No external dependencies
- All randomness uses seeded RNG (mulberry32) - never `Math.random()` in simulation
- 60 FPS target, < 16ms frame budget
- Particle pool fixed at 200 particles max
- Spatial grid cell size: 64px (matches CELL constant from original)
- Canvas resolution: 1920x1080 (logical), scaled to display size

## Review Focus

1. **Module circular dependency** - Controller imports Simulation/Renderer but game.js creates all three; verify single ownership
2. **Shared mutable state** - Player position in 3 places; verify single source of truth
3. **Particle pool leaks** - Pool exhaustion, particles not returned, max limit exceeded
4. **Spatial grid unused** - Grid created but never populated/queried; verify actual optimization
5. **Missing methods called** - `getActiveVases()`, `_updateEnemyGrid()` called but not defined

---

### Task 1: Fix Module Structure & Dependency Injection

**Files:**
- Create: `js/Game/EventBus.js` (new)
- Modify: `js/Game/Simulation.js`, `js/Game/Renderer.js`, `js/Game/Controller.js`
- Modify: `js/game.js`
- Test: `js/tests/test_modules.js`

**Interfaces:**
- Consumes: None (first task)
- Produces: `EventBus` class, `Simulation` with `getActiveVases()`, `Renderer` accepting `simulation` ref, `Controller` accepting `simulation` + `renderer` refs, `game.js` as sole instantiator

- [ ] **Step 1: Write failing test for EventBus**

```javascript
// js/tests/test_modules.js
import { EventBus } from '../Game/EventBus.js';

test('EventBus subscribes and publishes', () => {
  const bus = new EventBus();
  let received = null;
  bus.on('test', (data) => { received = data; });
  bus.emit('test', { value: 42 });
  assert.equal(received.value, 42);
});

test('EventBus unsubscribes', () => {
  const bus = new EventBus();
  const fn = () => {};
  bus.on('test', fn);
  bus.off('test', fn);
  bus.emit('test', 1);
  // fn should not be called
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: Open `js/tests/test_modules.html` in browser
Expected: FAIL - EventBus not defined

- [ ] **Step 3: Create EventBus.js**

```javascript
// js/Game/EventBus.js
export class EventBus {
  constructor() {
    this._handlers = new Map();
  }
  on(event, handler) {
    if (!this._handlers.has(event)) this._handlers.set(event, new Set());
    this._handlers.get(event).add(handler);
    return () => this.off(event, handler);
  }
  off(event, handler) {
    this._handlers.get(event)?.delete(handler);
  }
  emit(event, data) {
    this._handlers.get(event)?.forEach(h => h(data));
  }
  clear() { this._handlers.clear(); }
}
```

- [ ] **Step 4: Refactor Simulation.js - remove ParticlePool ref, add getActiveVases(), add _updateEnemyGrid()**

```javascript
// js/Game/Simulation.js - key changes
// - Remove: this.particlePool = new ParticlePool(100);
// - Add: getActiveVases() { return this.vases.filter(v => v.active && !v.collected); }
// - Add: _updateEnemyGrid(x, y) { /* grid logic */ }
// - Add: eventBus reference for emitting events
// - Remove Math.random() calls, use seeded RNG
```

- [ ] **Step 5: Refactor Renderer.js - accept simulation ref, fix this.renderer -> this.simulation**

```javascript
// js/Game/Renderer.js - key changes
// - constructor(simulation) { this.simulation = simulation; }
// - _drawVases() uses this.simulation.getVases()
// - _drawPlants() uses this.simulation.getActivePlants()
// - _drawEnemies() uses this.simulation.getActiveEnemies()
// - ParticlePool moved to separate file, imported
```

- [ ] **Step 6: Refactor Controller.js - accept simulation + renderer refs, remove internal instantiation**

```javascript
// js/Game/Controller.js - key changes
// - constructor(simulation, renderer) { this.simulation = simulation; this.renderer = renderer; }
// - Remove: const GameSimulation = require('./Simulation');
// - Remove: const GameRenderer = require('./Renderer');
// - processInput() only handles input, calls simulation methods
// - Player position managed by simulation
```

- [ ] **Step 7: Refactor game.js - sole instantiator, wires dependencies**

```javascript
// js/game.js - key changes
// - import { Simulation } from './Game/Simulation.js';
// - import { Renderer } from './Game/Renderer.js';
// - import { Controller } from './Game/Controller.js';
// - import { EventBus } from './Game/EventBus.js';
// - Create eventBus, simulation, renderer(simulation), controller(simulation, renderer)
// - Game loop in start() method using requestAnimationFrame
```

- [ ] **Step 8: Run tests to verify**

Run: Open `js/tests/test_modules.html`
Expected: PASS - all modules load, no circular deps, methods exist

- [ ] **Step 9: Commit**

```bash
git add js/Game/EventBus.js js/Game/Simulation.js js/Game/Renderer.js js/Game/Controller.js js/game.js js/tests/test_modules.js
git commit -m "fix: module structure and dependency injection"
```

---

### Task 2: Implement Seeded RNG & Remove Math.random()

**Files:**
- Create: `js/Game/RNG.js` (new)
- Modify: `js/Game/Simulation.js`, `js/Game/Renderer.js`
- Test: `js/tests/test_rng.js`

**Interfaces:**
- Consumes: EventBus from Task 1
- Produces: `RNG` class with `next()`, `nextInt(max)`, `nextFloat(min, max)`, `shuffle(array)` methods

- [ ] **Step 1: Write failing test for RNG**

```javascript
// js/tests/test_rng.js
import { RNG } from '../Game/RNG.js';

test('RNG produces deterministic sequence', () => {
  const rng = new RNG(12345);
  const a = rng.next();
  const b = rng.next();
  const rng2 = new RNG(12345);
  assert.equal(rng2.next(), a);
  assert.equal(rng2.next(), b);
});

test('RNG nextInt returns 0 to max-1', () => {
  const rng = new RNG(1);
  for (let i = 0; i < 100; i++) {
    const v = rng.nextInt(10);
    assert(v >= 0 && v < 10);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: Open `js/tests/test_rng.html`
Expected: FAIL - RNG not defined

- [ ] **Step 3: Create RNG.js (mulberry32 implementation)**

```javascript
// js/Game/RNG.js
export class RNG {
  constructor(seed = Date.now()) {
    this.seed = seed >>> 0;
    this.state = this.seed;
  }
  next() {
    this.state = (this.state + 0x6D2B79F5) >>> 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  nextInt(max) { return Math.floor(this.next() * max); }
  nextFloat(min, max) { return min + this.next() * (max - min); }
  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.nextInt(i + 1);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
  reset(seed) { this.seed = seed >>> 0; this.state = this.seed; }
}
```

- [ ] **Step 4: Replace all Math.random() in Simulation.js with this.rng.next()**

```javascript
// js/Game/Simulation.js
// constructor(seed) { this.rng = new RNG(seed); }
// addEnemy: use this.rng.nextFloat()
// addWave: use this.rng.nextInt()
// addVase: use this.rng.nextFloat()
// _updateEnemies: use this.rng.next() for any randomness
```

- [ ] **Step 5: Replace Math.random() in Renderer.js (particle spread only, not simulation)**

```javascript
// js/Game/Renderer.js
// Particle.velocityX/Y use this.rng.nextFloat(-1, 1)
// Accept rng in constructor or use separate rng for visual-only randomness
```

- [ ] **Step 6: Run tests**

Run: Open `js/tests/test_rng.html`
Expected: PASS - deterministic sequences, no Math.random() in simulation

- [ ] **Step 7: Commit**

```bash
git add js/Game/RNG.js js/Game/Simulation.js js/Game/Renderer.js js/tests/test_rng.js
git commit -m "feat: seeded RNG for deterministic simulation"
```

---

### Task 3: Implement Particle Pool (Zero-GC)

**Files:**
- Create: `js/Game/ParticlePool.js` (new)
- Modify: `js/Game/Renderer.js`
- Test: `js/tests/test_particles.js`

**Interfaces:**
- Consumes: RNG from Task 2
- Produces: `ParticlePool` class with `acquire()`, `release(particle)`, `update(dt)`, `draw(ctx)` methods. Fixed capacity 200.

- [ ] **Step 1: Write failing test for ParticlePool**

```javascript
// js/tests/test_particles.js
import { ParticlePool } from '../Game/ParticlePool.js';
import { RNG } from '../Game/RNG.js';

test('Pool acquires and releases particles', () => {
  const pool = new ParticlePool(10, new RNG(1));
  const p = pool.acquire(100, 100, '#ff0000', 5);
  assert(p !== null);
  assert.equal(pool._active.length, 1);
  pool.release(p);
  assert.equal(pool._active.length, 0);
  assert.equal(pool._free.length, 10);
});

test('Pool returns null when exhausted', () => {
  const pool = new ParticlePool(2, new RNG(1));
  pool.acquire(0, 0, '#fff', 1);
  pool.acquire(0, 0, '#fff', 1);
  assert(pool.acquire(0, 0, '#fff', 1) === null);
});

test('Update decrements life, removes dead', () => {
  const pool = new ParticlePool(10, new RNG(1));
  const p = pool.acquire(0, 0, '#fff', 1);
  p.life = 0.01;
  pool.update(0.1);
  assert.equal(pool._active.length, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: Open `js/tests/test_particles.html`
Expected: FAIL - ParticlePool not defined

- [ ] **Step 3: Create ParticlePool.js**

```javascript
// js/Game/ParticlePool.js
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
```

- [ ] **Step 4: Update Renderer.js to use ParticlePool**

```javascript
// js/Game/Renderer.js
// import { ParticlePool } from './ParticlePool.js';
// constructor(simulation) { this.simulation = simulation; this.particles = new ParticlePool(200); }
// draw() calls this.particles.update(dt); this.particles.draw(ctx);
// expose emit() for simulation to trigger effects
```

- [ ] **Step 5: Run tests**

Run: Open `js/tests/test_particles.html`
Expected: PASS - pool reuses objects, no GC pressure, max 200 particles

- [ ] **Step 6: Commit**

```bash
git add js/Game/ParticlePool.js js/Game/Renderer.js js/tests/test_particles.js
git commit -m "feat: zero-GC particle pool with 200 capacity"
```

---

### Task 4: Implement Spatial Partitioning for Enemies

**Files:**
- Modify: `js/Game/Simulation.js`
- Test: `js/tests/test_spatial.js`

**Interfaces:**
- Consumes: Simulation from Task 1, RNG from Task 2
- Produces: `SpatialGrid` class, `Simulation._updateEnemyGrid()`, `Simulation.getEnemiesInRange(x, y, radius)`

- [ ] **Step 1: Write failing test for SpatialGrid**

```javascript
// js/tests/test_spatial.js
import { SpatialGrid } from '../Game/SpatialGrid.js';

test('Grid inserts and queries enemies', () => {
  const grid = new SpatialGrid(64, 1920, 1080);
  grid.insert({ id: 'e1', x: 100, y: 100 });
  grid.insert({ id: 'e2', x: 200, y: 200 });
  const nearby = grid.queryRadius(100, 100, 150);
  assert.equal(nearby.length, 1);
  assert.equal(nearby[0].id, 'e1');
});

test('Grid updates enemy position', () => {
  const grid = new SpatialGrid(64, 1920, 1080);
  const e = { id: 'e1', x: 100, y: 100 };
  grid.insert(e);
  e.x = 500; e.y = 500;
  grid.update(e);
  const nearby = grid.queryRadius(500, 500, 50);
  assert.equal(nearby.length, 1);
});

test('Grid removes enemy', () => {
  const grid = new SpatialGrid(64, 1920, 1080);
  const e = { id: 'e1', x: 100, y: 100 };
  grid.insert(e);
  grid.remove(e);
  assert.equal(grid.queryRadius(100, 100, 50).length, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: Open `js/tests/test_spatial.html`
Expected: FAIL - SpatialGrid not defined

- [ ] **Step 3: Create SpatialGrid.js (internal to Simulation or separate)**

```javascript
// js/Game/SpatialGrid.js (or inline in Simulation.js)
export class SpatialGrid {
  constructor(cellSize, worldWidth, worldHeight) {
    this.cellSize = cellSize;
    this.cols = Math.ceil(worldWidth / cellSize);
    this.rows = Math.ceil(worldHeight / cellSize);
    this.grid = new Array(this.cols * this.rows).fill(null).map(() => []);
  }
  _key(x, y) {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return cy * this.cols + cx;
  }
  insert(entity) { this.grid[this._key(entity.x, entity.y)].push(entity); }
  remove(entity) {
    const cell = this.grid[this._key(entity.x, entity.y)];
    const idx = cell.indexOf(entity);
    if (idx >= 0) cell.splice(idx, 1);
  }
  update(entity) { this.remove(entity); this.insert(entity); }
  queryRadius(x, y, radius) {
    const results = [];
    const minCx = Math.max(0, Math.floor((x - radius) / this.cellSize));
    const maxCx = Math.min(this.cols - 1, Math.floor((x + radius) / this.cellSize));
    const minCy = Math.max(0, Math.floor((y - radius) / this.cellSize));
    const maxCy = Math.min(this.rows - 1, Math.floor((y + radius) / this.cellSize));
    const r2 = radius * radius;
    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        for (const e of this.grid[cy * this.cols + cx]) {
          const dx = e.x - x, dy = e.y - y;
          if (dx * dx + dy * dy <= r2) results.push(e);
        }
      }
    }
    return results;
  }
  clear() { for (const cell of this.grid) cell.length = 0; }
}
```

- [ ] **Step 4: Integrate into Simulation.js**

```javascript
// js/Game/Simulation.js
// constructor(seed) { this.enemyGrid = new SpatialGrid(64, 1920, 1080); }
// addEnemy() calls this.enemyGrid.insert(enemy)
// _updateEnemies() calls this.enemyGrid.update(enemy) after position change
// tickZ/enemy logic uses this.enemyGrid.queryRadius(x, y, range) for targeting
// getEnemiesInRange(x, y, radius) public method
```

- [ ] **Step 5: Run tests**

Run: Open `js/tests/test_spatial.html`
Expected: PASS - O(1) enemy queries, grid updates correctly

- [ ] **Step 6: Commit**

```bash
git add js/Game/SpatialGrid.js js/Game/Simulation.js js/tests/test_spatial.js
git commit -m "feat: spatial partitioning for O(1) enemy queries"
```

---

### Task 5: Fix Vase Mechanics & Player Interaction

**Files:**
- Modify: `js/Game/Simulation.js`, `js/Game/Controller.js`, `js/Game/Renderer.js`
- Test: `js/tests/test_vases.js`

**Interfaces:**
- Consumes: Simulation, Controller, Renderer from Task 1
- Produces: `Vase` class with `break(player)` method, visual feedback (glow, particles), reward system

- [ ] **Step 1: Write failing test for Vase mechanics**

```javascript
// js/tests/test_vases.js
import { Simulation } from '../Game/Simulation.js';
import { RNG } from '../Game/RNG.js';

test('Vase breaks when player interacts', () => {
  const sim = new Simulation(1);
  const vase = sim.addVase(100, 100, 'plant', 'peashooter');
  assert(vase.active === true);
  sim.playerInteract(100, 100); // player at vase position
  assert(vase.active === false);
  assert(vase.broken === true);
});

test('Vase drops correct reward', () => {
  const sim = new Simulation(1);
  sim.addVase(100, 100, 'sun', null, 50);
  sim.addVase(200, 200, 'zombie', 'grunt');
  sim.addVase(300, 300, 'plant', 'sunflower');
  // interact and verify rewards
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: Open `js/tests/test_vases.html`
Expected: FAIL - vase methods not implemented

- [ ] **Step 3: Implement Vase class and interaction in Simulation.js**

```javascript
// js/Game/Simulation.js
// Vase types: 'plant' | 'zombie' | 'sun' | 'empty'
// addVase(x, y, type, payload, amount)
// playerInteract(px, py) - finds vase within 32px, breaks it, emits event
// breakVase(vase) - handles reward: plant->placeFree, zombie->spawnZ, sun->addSun
// emit('vaseBreak', { type, payload, x, y }) for renderer effects
```

- [ ] **Step 4: Add visual feedback in Renderer.js**

```javascript
// js/Game/Renderer.js
// drawVases() - draws glow ring when player near (distance < 64)
// on vaseBreak event: emit particles, float text (+25 sun, plant name, etc)
// vase glow pulse animation using visualT
```

- [ ] **Step 5: Handle input in Controller.js**

```javascript
// js/Game/Controller.js
// processInput() - on 'E' key or click, call simulation.playerInteract(playerX, playerY)
// Show interaction prompt UI when near vase
```

- [ ] **Step 6: Run tests**

Run: Open `js/tests/test_vases.html`
Expected: PASS - vases break, drop correct rewards, visual feedback works

- [ ] **Step 7: Commit**

```bash
git add js/Game/Simulation.js js/Game/Renderer.js js/Game/Controller.js js/tests/test_vases.js
git commit -m "feat: vase mechanics with rewards and visual feedback"
```

---

### Task 6: Implement Game Loop & Main Entry Point

**Files:**
- Modify: `js/game.js`
- Create: `index.html` (if not exists) or verify existing
- Test: Manual verification in browser

**Interfaces:**
- Consumes: All modules from Tasks 1-5
- Produces: Working game with `start()`, `stop()`, `update(dt)`, `render()` loop at 60 FPS

- [ ] **Step 1: Create complete game.js with game loop**

```javascript
// js/game.js
import { Simulation } from './Game/Simulation.js';
import { Renderer } from './Game/Renderer.js';
import { Controller } from './Game/Controller.js';
import { EventBus } from './Game/EventBus.js';
import { RNG } from './Game/RNG.js';

export class Game {
  constructor(canvas, seed = Date.now()) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.rng = new RNG(seed);
    this.eventBus = new EventBus();
    this.simulation = new Simulation(seed, this.eventBus);
    this.renderer = new Renderer(this.simulation, this.ctx, this.eventBus);
    this.controller = new Controller(this.simulation, this.renderer, this.eventBus);
    this.lastTime = 0;
    this.running = false;
  }
  start() {
    this.running = true;
    this.lastTime = performance.now();
    this.controller.setupInput();
    requestAnimationFrame(this._loop.bind(this));
  }
  _loop(now) {
    if (!this.running) return;
    const dt = Math.min((now - this.lastTime) / 1000, 0.1); // cap at 100ms
    this.lastTime = now;
    this.update(dt);
    this.render();
    requestAnimationFrame(this._loop.bind(this));
  }
  update(dt) {
    this.simulation.update(dt);
    this.controller.processInput(dt);
  }
  render() {
    this.renderer.draw();
  }
  stop() { this.running = false; }
}

// Auto-start if canvas exists
const canvas = document.getElementById('game-canvas');
if (canvas) {
  const game = new Game(canvas);
  game.start();
  window.game = game; // for debugging
}
```

- [ ] **Step 2: Verify index.html has canvas**

```html
<!-- index.html -->
<canvas id="game-canvas" width="1920" height="1080"></canvas>
<script type="module" src="./js/game.js"></script>
```

- [ ] **Step 3: Manual test in browser**

Run: Open `index.html` in browser
Expected: Game loads, runs at 60 FPS, no console errors, input works

- [ ] **Step 4: Commit**

```bash
git add js/game.js index.html
git commit -m "feat: complete game loop and entry point"
```

---

### Task 7: Add TypeScript-Style JSDoc Types & Constants

**Files:**
- Create: `js/Game/Types.js` (new)
- Modify: All .js files with JSDoc annotations
- Test: `js/tests/test_types.js` (verify no runtime errors)

**Interfaces:**
- Consumes: All previous tasks
- Produces: Centralized type definitions, constants, configuration

- [ ] **Step 1: Create Types.js with all constants and type definitions**

```javascript
// js/Game/Types.js
/** @typedef {'plant'|'zombie'|'sun'|'empty'} VaseType */
/** @typedef {'idle'|'patrolling'|'chasing'|'jumping'|'gameover'} EnemyState */
/** @typedef {{id:string,x:number,y:number,type:string,health:number,speed:number,state:EnemyState}} Enemy */
/** @typedef {{id:string,x:number,y:number,size:number,type:string}} Plant */
/** @typedef {{id:string,x:number,y:number,radius:number,active:boolean,collected:boolean,type:VaseType,payload:string|null,amount:number}} Vase */

/** @const {number} */
export const CONFIG = {
  CANVAS_WIDTH: 1920,
  CANVAS_HEIGHT: 1080,
  CELL_SIZE: 64,
  GRID_COLS: 30,
  GRID_ROWS: 17,
  PARTICLE_CAPACITY: 200,
  MAX_ENEMIES: 50,
  VASE_INTERACTION_RANGE: 32,
  PLAYER_SPEED: 200,
  ENEMY_BASE_SPEED: 50,
  WAVE_SPAWN_INTERVAL: 15,
};
```

- [ ] **Step 2: Add JSDoc to all public methods in Simulation, Renderer, Controller**

```javascript
// Example:
/**
 * Adds an enemy to the simulation
 * @param {number} x - World X position
 * @param {number} y - World Y position
 * @param {string} type - Enemy type ('goblin'|'brute')
 * @returns {Enemy} The created enemy
 */
addEnemy(x, y, type) { ... }
```

- [ ] **Step 3: Replace all magic numbers with CONFIG constants**

- [ ] **Step 4: Run tests**

Run: All previous test files
Expected: PASS - no behavior change, only documentation

- [ ] **Step 5: Commit**

```bash
git add js/Game/Types.js js/Game/*.js
git commit -m "docs: JSDoc types and centralized constants"
```

---

### Task 8: Error Handling & Validation

**Files:**
- Modify: All module files
- Test: `js/tests/test_errors.js`

**Interfaces:**
- Consumes: All previous tasks
- Produces: Input validation, try/catch in update loops, graceful degradation

- [ ] **Step 1: Add validation to public methods**

```javascript
// Simulation.js
addEnemy(x, y, type) {
  if (typeof x !== 'number' || typeof y !== 'number') throw new Error('Invalid position');
  if (!VALID_ENEMY_TYPES.includes(type)) throw new Error('Invalid enemy type');
  if (this.enemies.length >= CONFIG.MAX_ENEMIES) return null; // or throw
  ...
}
```

- [ ] **Step 2: Wrap update loops in try/catch**

```javascript
// game.js
_loop(now) {
  try {
    const dt = ...
    this.update(dt);
    this.render();
  } catch (e) {
    console.error('Game loop error:', e);
    this.stop();
  }
  requestAnimationFrame(this._loop.bind(this));
}
```

- [ ] **Step 3: ParticlePool acquire returns null gracefully handled**

- [ ] **Step 4: Run tests**

Run: All test files + manual browser test
Expected: PASS - no crashes on invalid input, errors logged

- [ ] **Step 5: Commit**

```bash
git add js/Game/*.js js/game.js js/tests/test_errors.js
git commit -m "fix: error handling and input validation"
```

---

### Task 9: Performance Verification & Optimization

**Files:**
- Modify: As needed based on profiling
- Test: Manual profiling in browser DevTools

**Interfaces:**
- Consumes: Complete implementation
- Produces: Verified <16ms frame time, <50MB memory, stable 60 FPS

- [ ] **Step 1: Profile in Chrome DevTools**

- Record 30s gameplay
- Check Performance tab: frame times, GC events
- Check Memory tab: heap growth, detached DOM nodes

- [ ] **Step 2: Verify particle pool zero-GC**

- No "GC" events in performance trace during particle-heavy scenes
- ParticlePool._free.length + _active.length === 200 always

- [ ] **Step 3: Verify spatial grid optimization**

- Enemy tick time < 1ms with 50 enemies
- Query radius used for targeting instead of O(n) scan

- [ ] **Step 4: Optimize if needed**

- Reduce particle count if over budget
- Batch draw calls in Renderer
- Use OffscreenCanvas if available

- [ ] **Step 5: Commit**

```bash
git add -u
git commit -m "perf: verified 60 FPS, zero-GC particles, spatial grid active"
```

---

### Task 10: Integration Test & Final Polish

**Files:**
- Create: `js/tests/test_integration.js`
- Test: Full playthrough test

**Interfaces:**
- Consumes: Complete game
- Produces: Verified working game from start to wave 5

- [ ] **Step 1: Write integration test**

```javascript
// js/tests/test_integration.js
import { Game } from '../game.js';

test('Game completes 5 waves without crash', async () => {
  const canvas = document.createElement('canvas');
  canvas.width = 1920; canvas.height = 1080;
  const game = new Game(canvas, 12345); // deterministic seed
  // Simulate 5 waves worth of time
  for (let i = 0; i < 300; i++) { // 5 seconds at 60fps
    game.update(1/60);
    game.render();
  }
  assert(game.simulation.currentWave >= 1);
  assert(!game.simulation.isGameOver || game.simulation.currentWave > 5);
});
```

- [ ] **Step 2: Run in browser**

- [ ] **Step 3: Manual playtest**

- Start game, play through wave 5
- Verify: vases work, enemies spawn, particles render, no lag

- [ ] **Step 4: Commit**

```bash
git add js/tests/test_integration.js
git commit -m "test: integration test and final polish"
```

---

## Execution Order

1. **Task 1** - Module structure (blocks all others)
2. **Task 2** - RNG (needed by Simulation, ParticlePool, SpatialGrid)
3. **Task 3** - ParticlePool (used by Renderer, Simulation events)
4. **Task 4** - Spatial Grid (used by Simulation enemy logic)
5. **Task 5** - Vase mechanics (uses Simulation, Renderer, Controller)
6. **Task 6** - Game loop (integrates all modules)
7. **Task 7** - Types/Constants (documentation, no behavior change)
8. **Task 8** - Error handling (polish)
9. **Task 9** - Performance verification (validation)
10. **Task 10** - Integration test (final verification)

---

**Total estimated tasks:** 10
**Total estimated steps:** ~60
**Dependencies:** Linear (each task depends on previous)
**Recommended execution:** Native (single session, all tasks tightly coupled)