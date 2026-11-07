/**
 * Game.Controller - Input handling and event dispatch
 */
import { EventBus } from './EventBus.js';

export class GameController {
  constructor(simulation, renderer, eventBus = null) {
    this.simulation = simulation;
    this.renderer = renderer;
    this.eventBus = eventBus || simulation.eventBus;
    this.input = {
      left: false,
      right: false,
      up: false,
      down: false,
      interact: false
    };
    this.keys = new Map();
    this.mouse = { x: 0, y: 0, down: false };
  }

  /**
   * Set up input event listeners
   */
  setupInput() {
    // Keyboard input
    window.addEventListener('keydown', (e) => this._onKeyDown(e));
    window.addEventListener('keyup', (e) => this._onKeyUp(e));
    
    // Mouse input
    this.renderer.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
    this.renderer.canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
    this.renderer.canvas.addEventListener('mouseup', (e) => this._onMouseUp(e));
    
    // Prevent context menu on right click
    this.renderer.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _onKeyDown(e) {
    this.keys.set(e.code, true);
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.input.left = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.input.right = true;
        break;
      case 'ArrowUp':
      case 'KeyW':
        this.input.up = true;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.input.down = true;
        break;
      case 'KeyE':
      case 'Space':
        this.input.interact = true;
        // Try to interact with vase
        this._tryInteract();
        break;
    }
  }

  _onKeyUp(e) {
    this.keys.set(e.code, false);
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.input.left = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.input.right = false;
        break;
      case 'ArrowUp':
      case 'KeyW':
        this.input.up = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.input.down = false;
        break;
      case 'KeyE':
      case 'Space':
        this.input.interact = false;
        break;
    }
  }

  _onMouseMove(e) {
    const rect = this.renderer.canvas.getBoundingClientRect();
    this.mouse.x = (e.clientX - rect.left) * (this.renderer.canvas.width / rect.width);
    this.mouse.y = (e.clientY - rect.top) * (this.renderer.canvas.height / rect.height);
  }

  _onMouseDown(e) {
    this.mouse.down = true;
    if (e.button === 0) { // Left click
      this._tryInteract();
    }
  }

  _onMouseUp(e) {
    this.mouse.down = false;
  }

  _tryInteract() {
    const playerPos = this.simulation.getPlayerPosition();
    const vase = this.simulation.playerInteract(playerPos.x, playerPos.y);
    if (vase) {
      this.renderer.emitVaseBreak(vase);
    }
  }

  /**
   * Process input and update simulation
   */
  processInput(dt) {
    const playerPos = this.simulation.getPlayerPosition();
    const speed = 300; // pixels per second
    
    // Calculate movement
    let dx = 0, dy = 0;
    if (this.input.left) dx -= 1;
    if (this.input.right) dx += 1;
    if (this.input.up) dy -= 1;
    if (this.input.down) dy += 1;
    
    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
    }
    
    // Update player position
    const newX = playerPos.x + dx * speed * dt;
    const newY = playerPos.y + dy * speed * dt;
    
    // Clamp to world bounds
    const clampedX = Math.max(24, Math.min(1920 - 24, newX));
    const clampedY = Math.max(24, Math.min(1080 - 24, newY));
    
    this.simulation.setPlayerPosition(clampedX, clampedY);
    
    // Update the simulation (enemies, waves, etc.)
    this.simulation.update(dt);
  }

  /**
   * Get player position
   */
  getPlayerPosition() {
    return this.simulation.getPlayerPosition();
  }

  /**
   * Check if player is collecting a vase
   */
  checkVaseCollection() {
    const playerPos = this.getPlayerPosition();
    
    // Simple vase collection check
    for (const vase of this.simulation.getVases()) {
      const dx = vase.x - playerPos.x;
      const dy = vase.y - playerPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < vase.radius) {
        vase.active = false;
        vase.collected = true;
        this.simulation.score += 10;
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get the simulation instance
   */
  getSimulation() {
    return this.simulation;
  }

  /**
   * Get the renderer instance
   */
  getRenderer() {
    return this.renderer;
  }
}