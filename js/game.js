/**
 * Verdane engine: Modular architecture - GameSimulation, GameRenderer, GameController
 */
import { GameSimulation } from './Game/Simulation.js';
import { GameRenderer } from './Game/Renderer.js';
import { GameController } from './Game/Controller.js';
import { EventBus } from './Game/EventBus.js';
import { RNG } from './Game/RNG.js';

export class Game {
  constructor(canvas, seed = Date.now()) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.rng = new RNG(seed);
    this.eventBus = new EventBus();
    this.simulation = new GameSimulation(seed, this.eventBus);
    this.renderer = new GameRenderer(this.simulation, this.canvas);
    this.controller = new GameController(this.simulation, this.renderer, this.eventBus);
    this.lastTime = 0;
    this.running = false;
    this.seed = seed;
    
    // Set up initial vases for testing
    this._spawnInitialVases();
  }

  _spawnInitialVases() {
    // Spawn some vases around the map
    const vaseTypes = ['plant', 'zombie', 'sun', 'empty'];
    const enemyTypes = ['goblin', 'brute'];
    const plantTypes = ['peashooter', 'sunflower', 'wallnut'];
    
    for (let i = 0; i < 10; i++) {
      const type = vaseTypes[this.rng.nextInt(vaseTypes.length)];
      let payload = null;
      let amount = 25;
      
      if (type === 'plant') {
        payload = plantTypes[this.rng.nextInt(plantTypes.length)];
      } else if (type === 'zombie') {
        payload = enemyTypes[this.rng.nextInt(enemyTypes.length)];
      } else if (type === 'sun') {
        amount = 25 + this.rng.nextInt(50);
      }
      
      this.simulation.addVase(
        this.rng.nextFloat(100, 1820),
        this.rng.nextFloat(100, 980),
        type,
        payload,
        amount
      );
    }
    
    // Add initial wave
    this.simulation.addWave('goblin');
  }

  /**
   * Start the game loop
   */
  start() {
    this.running = true;
    this.lastTime = performance.now();
    this.controller.setupInput();
    requestAnimationFrame(this._loop.bind(this));
  }

  /**
   * Main game loop
   */
  _loop(now) {
    if (!this.running) return;
    const dt = Math.min((now - this.lastTime) / 1000, 0.1); // cap at 100ms
    this.lastTime = now;
    this.update(dt);
    this.render(dt);
    requestAnimationFrame(this._loop.bind(this));
  }

  /**
   * Update game state
   */
  update(dt) {
    this.simulation.update(dt);
    this.controller.processInput(dt);
  }

  /**
   * Render the game
   */
  render(dt) {
    this.renderer.draw(dt);
  }

  /**
   * Stop the game loop
   */
  stop() {
    this.running = false;
  }

  /**
   * Get simulation instance
   */
  getSimulation() {
    return this.simulation;
  }

  /**
   * Get renderer instance
   */
  getRenderer() {
    return this.renderer;
  }

  /**
   * Get controller instance
   */
  getController() {
    return this.controller;
  }
}

// Auto-start if canvas exists
const canvas = document.getElementById('game-canvas');
if (canvas) {
  const game = new Game(canvas);
  game.start();
  window.game = game; // for debugging
  console.log('Verdane game started!');
}