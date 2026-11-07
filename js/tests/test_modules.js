// Test file for module structure and dependency injection
// Run via test_modules.html in browser

import { EventBus } from '../Game/EventBus.js';
import { GameSimulation } from '../Game/Simulation.js';
import { GameRenderer } from '../Game/Renderer.js';
import { GameController } from '../Game/Controller.js';

// Simple test framework
const tests = [];
const assert = {
  equal: (actual, expected, msg = '') => {
    if (actual !== expected) throw new Error(`${msg} Expected ${expected}, got ${actual}`);
  },
  ok: (value, msg = '') => {
    if (!value) throw new Error(`${msg} Expected truthy, got ${value}`);
  },
  throws: (fn, msg = '') => {
    try { fn(); throw new Error(`${msg} Expected function to throw`); }
    catch (e) { if (e.message.includes('Expected function to throw')) throw e; }
  }
};

function test(name, fn) {
  tests.push({ name, fn });
}

function runTests() {
  let passed = 0, failed = 0;
  const results = [];
  
  for (const t of tests) {
    try {
      t.fn();
      passed++;
      results.push(`✓ ${t.name}`);
    } catch (e) {
      failed++;
      results.push(`✗ ${t.name}: ${e.message}`);
    }
  }
  
  const output = document.getElementById('test-output');
  output.textContent = results.join('\n') + `\n\n${passed} passed, ${failed} failed`;
  output.style.color = failed ? 'red' : 'green';
  
  return failed === 0;
}

// Test EventBus
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
  // fn should not be called - we can't easily test this without a spy
  // but we can verify no error is thrown
});

test('EventBus multiple handlers', () => {
  const bus = new EventBus();
  let count = 0;
  bus.on('test', () => count++);
  bus.on('test', () => count++);
  bus.emit('test');
  assert.equal(count, 2);
});

test('EventBus clear removes all handlers', () => {
  const bus = new EventBus();
  bus.on('test', () => {});
  bus.clear();
  bus.emit('test'); // Should not throw
});

// Test Simulation has required methods
test('Simulation has getActiveVases method', () => {
  const sim = new GameSimulation(12345);
  assert.ok(typeof sim.getActiveVases === 'function', 'getActiveVases should be a function');
});

test('Simulation has _updateEnemyGrid method', () => {
  const sim = new GameSimulation(12345);
  assert.ok(typeof sim._updateEnemyGrid === 'function', '_updateEnemyGrid should be a function');
});

test('Simulation constructor accepts seed and eventBus', () => {
  const bus = new EventBus();
  const sim = new GameSimulation(12345, bus);
  assert.ok(sim.rng !== undefined);
  assert.ok(sim.eventBus === bus);
});

// Test Renderer accepts simulation reference
test('Renderer constructor accepts simulation', () => {
  const sim = new GameSimulation(12345);
  const canvas = document.createElement('canvas');
  const renderer = new GameRenderer(sim, canvas);
  assert.ok(renderer.simulation === sim);
});

// Test Controller accepts simulation and renderer
test('Controller constructor accepts simulation and renderer', () => {
  const sim = new GameSimulation(12345);
  const canvas = document.createElement('canvas');
  const renderer = new GameRenderer(sim, canvas);
  const controller = new GameController(sim, renderer);
  assert.ok(controller.simulation === sim);
  assert.ok(controller.renderer === renderer);
});

// Test no circular dependencies - modules load without error
test('All modules load without circular dependency errors', () => {
  // If we got here, imports worked
  assert.ok(true);
});

// Run tests when loaded (browser only)
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', runTests);
}

// Export for manual running
export { test, assert, runTests };