// Node-compatible integration test
import { EventBus } from '../Game/EventBus.js';
import { GameSimulation } from '../Game/Simulation.js';
import { GameRenderer } from '../Game/Renderer.js';
import { GameController } from '../Game/Controller.js';
import { RNG } from '../Game/RNG.js';
import { ParticlePool } from '../Game/ParticlePool.js';

// Mock canvas for Node
class MockCanvas {
  constructor() {
    this.width = 1920;
    this.height = 1080;
  }
  getContext() {
    return {
      clearRect: () => {},
      fillRect: () => {},
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
      stroke: () => {},
      fillText: () => {},
      drawImage: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      scale: () => {},
      moveTo: () => {},
      lineTo: () => {},
      globalAlpha: 1,
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: 'left',
      textBaseline: 'alphabetic',
    };
  }
}

// Simple test framework
let passed = 0, failed = 0;
function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}
function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); passed++; }
  catch (e) { console.log(`✗ ${name}: ${e.message}`); failed++; }
}

console.log('Running integration tests...\n');

// Test 1: EventBus
test('EventBus basic functionality', () => {
  const bus = new EventBus();
  let received = null;
  bus.on('test', (data) => { received = data; });
  bus.emit('test', { value: 42 });
  assert(received.value === 42, 'EventBus should publish and subscribe');
});

test('EventBus unsubscribe', () => {
  const bus = new EventBus();
  let count = 0;
  const fn = () => count++;
  bus.on('test', fn);
  bus.off('test', fn);
  bus.emit('test');
  assert(count === 0, 'EventBus should unsubscribe');
});

// Test 2: RNG
test('RNG deterministic sequence', () => {
  const rng = new RNG(12345);
  const a = rng.next();
  const b = rng.next();
  const rng2 = new RNG(12345);
  assert(rng2.next() === a, 'RNG should be deterministic');
  assert(rng2.next() === b, 'RNG should be deterministic');
});

test('RNG nextInt range', () => {
  const rng = new RNG(1);
  for (let i = 0; i < 100; i++) {
    const v = rng.nextInt(10);
    assert(v >= 0 && v < 10, 'nextInt should be in range');
  }
});

// Test 3: ParticlePool
test('ParticlePool acquire/release', () => {
  const pool = new ParticlePool(10, new RNG(1));
  const p = pool.acquire(100, 100, '#ff0000', 5);
  assert(p !== null, 'Pool should acquire particle');
  assert(pool._active.length === 1, 'Active count should be 1');
  pool.release(p);
  assert(pool._active.length === 0, 'Active count should be 0 after release');
  assert(pool._free.length === 10, 'Free count should be 10');
});

test('ParticlePool exhaust', () => {
  const pool = new ParticlePool(2, new RNG(1));
  pool.acquire(0, 0, '#fff', 1);
  pool.acquire(0, 0, '#fff', 1);
  assert(pool.acquire(0, 0, '#fff', 1) === null, 'Pool should return null when exhausted');
});

// Test 4: Simulation
test('Simulation construction', () => {
  const bus = new EventBus();
  const sim = new GameSimulation(12345, bus);
  assert(sim.rng !== undefined, 'Simulation should have RNG');
  assert(sim.eventBus === bus, 'Simulation should have eventBus');
  assert(typeof sim.getActiveVases === 'function', 'Simulation should have getActiveVases');
  assert(typeof sim._updateEnemyGrid === 'function', 'Simulation should have _updateEnemyGrid');
});

test('Simulation addEnemy', () => {
  const sim = new GameSimulation(12345);
  const enemy = sim.addEnemy(100, 100, 'goblin');
  assert(enemy !== null, 'Should create enemy');
  assert(enemy.type === 'goblin', 'Enemy should have correct type');
  assert(enemy.health === 3, 'Goblin should have 3 health');
  assert(sim.enemies.length === 1, 'Enemies array should have 1 enemy');
});

test('Simulation addVase', () => {
  const sim = new GameSimulation(12345);
  const vase = sim.addVase(100, 100, 'plant', 'peashooter');
  assert(vase !== null, 'Should create vase');
  assert(vase.type === 'plant', 'Vase should have correct type');
  assert(vase.active === true, 'Vase should be active');
  assert(sim.vases.length === 1, 'Vases array should have 1 vase');
});

test('Simulation playerInteract breaks vase', () => {
  const sim = new GameSimulation(12345);
  sim.addVase(100, 100, 'sun', null, 50);
  const vase = sim.playerInteract(100, 100);
  assert(vase !== null, 'Should return broken vase');
  assert(vase.active === false, 'Vase should be inactive');
  assert(vase.collected === true, 'Vase should be collected');
  assert(sim.score === 50, 'Score should increase by vase amount');
});

test('Simulation spatial grid', () => {
  const sim = new GameSimulation(12345);
  sim._initGrid(1920, 1080);
  sim.addEnemy(100, 100, 'goblin');
  sim.addEnemy(500, 500, 'brute'); // Far away, not in range
  const nearby = sim.getEnemiesInRange(100, 100, 150);
  assert(nearby.length === 1, 'Should find 1 enemy in range');
  assert(nearby[0].type === 'goblin', 'Should find correct enemy');
});

// Test 5: Renderer
test('Renderer construction', () => {
  const sim = new GameSimulation(12345);
  const canvas = new MockCanvas();
  const renderer = new GameRenderer(sim, canvas);
  assert(renderer.simulation === sim, 'Renderer should have simulation reference');
  assert(renderer.particles !== undefined, 'Renderer should have particle pool');
});

// Test 6: Controller
test('Controller construction', () => {
  const sim = new GameSimulation(12345);
  const canvas = new MockCanvas();
  const renderer = new GameRenderer(sim, canvas);
  const controller = new GameController(sim, renderer);
  assert(controller.simulation === sim, 'Controller should have simulation');
  assert(controller.renderer === renderer, 'Controller should have renderer');
});

test('Controller processInput moves player', () => {
  const sim = new GameSimulation(12345);
  const canvas = new MockCanvas();
  const renderer = new GameRenderer(sim, canvas);
  const controller = new GameController(sim, renderer);
  
  controller.input.right = true;
  controller.processInput(1); // 1 second
  
  const pos = sim.getPlayerPosition();
  assert(pos.x > 960, 'Player should move right');
});

// Test 7: Game class (without auto-start)
test('Game class construction', () => {
  const canvas = new MockCanvas();
  // We can't import Game directly because it uses document at top level
  // But we can verify the modules work together
  const sim = new GameSimulation(12345);
  const renderer = new GameRenderer(sim, canvas);
  const controller = new GameController(sim, renderer);
  
  sim.addVase(500, 500, 'plant', 'peashooter');
  sim.addEnemy(800, 500, 'goblin');
  
  // Simulate a few frames
  for (let i = 0; i < 10; i++) {
    sim.update(1/60);
    controller.processInput(1/60);
    renderer.draw(1/60);
  }
  
  assert(sim.enemies.length > 0, 'Enemies should exist');
  assert(sim.vases.length > 0, 'Vases should exist');
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);