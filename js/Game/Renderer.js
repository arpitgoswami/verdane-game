/**
 * Game.Renderer - Canvas drawing logic and particle system
 */
import { ParticlePool } from './ParticlePool.js';
import { CONFIG, VASE_TYPES } from './Types.js';

/**
 * Game.Renderer - Canvas drawing and particle system
 */
export class GameRenderer {
  /**
   * @param {GameSimulation} simulation
   * @param {HTMLCanvasElement} canvas
   */
  constructor(simulation, canvas) {
    /** @type {GameSimulation} */
    this.simulation = simulation;
    /** @type {HTMLCanvasElement} */
    this.canvas = canvas;
    /** @type {CanvasRenderingContext2D} */
    this.ctx = canvas.getContext('2d');
    /** @type {ParticlePool} */
    this.particles = new ParticlePool(CONFIG.PARTICLE_CAPACITY);
    this.visualT = 0;
    this.resize();
  }

  /**
   * Initialize the renderer
   */
  resize() {
    // Canvas is already sized by game.js
    // Just ensure context is correct
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
    }
  }

  /**
   * Clear the canvas
   */
  clear() {
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  /**
   * Draw the game scene
   * @param {number} dt - Delta time in seconds
   */
  draw(dt = 1/60) {
    this.visualT += dt;
    this.clear();
    
    // Draw vases
    this._drawVases();
    
    // Draw plants
    this._drawPlants();
    
    // Draw enemies
    this._drawEnemies();
    
    // Draw particles
    this.particles.update(dt);
    this.particles.draw(this.ctx);
    
    // Draw UI
    this._drawUI();
  }

  /**
   * Draw vases
   */
  _drawVases() {
    /** @type {Vase[]} */
    const vases = this.simulation.getVases();
    for (const vase of vases) {
      if (vase.active && !vase.collected) {
        // Draw vase body
        this.ctx.beginPath();
        this.ctx.arc(vase.x, vase.y, vase.radius, 0, Math.PI * 2);
        
        // Color based on type
        const colors = {
          plant: '#4ecdc4',
          zombie: '#ff6b6b',
          sun: '#ffc94a',
          empty: '#95a5a6'
        };
        this.ctx.fillStyle = colors[vase.type] || '#ff6b6b';
        this.ctx.fill();
        
        // Draw vase highlight
        this.ctx.beginPath();
        this.ctx.arc(vase.x - 4, vase.y - 4, vase.radius * 0.4, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
        this.ctx.fill();
        
        // Draw interaction glow if player nearby
        const playerPos = this.simulation.getPlayerPosition();
        const dx = vase.x - playerPos.x;
        const dy = vase.y - playerPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 100) {
          const pulse = Math.sin(this.visualT * 5) * 0.3 + 0.7;
          this.ctx.beginPath();
          this.ctx.arc(vase.x, vase.y, vase.radius + 8 * pulse, 0, Math.PI * 2);
          this.ctx.strokeStyle = `rgba(255,255,255,${0.3 * pulse})`;
          this.ctx.lineWidth = 3;
          this.ctx.stroke();
          this.ctx.lineWidth = 1;
        }
      }
    }
  }

  /**
   * Draw plants
   */
  _drawPlants() {
    /** @type {Plant[]} */
    const plants = this.simulation.getActivePlants();
    for (const plant of plants) {
      this.ctx.beginPath();
      this.ctx.arc(plant.x, plant.y, plant.size * 20, 0, Math.PI * 2);
      this.ctx.fillStyle = '#4ecdc4';
      this.ctx.fill();
      
      // Plant label
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '12px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('🌱', plant.x, plant.y + 4);
    }
  }

  /**
   * Draw enemies
   */
  _drawEnemies() {
    /** @type {Enemy[]} */
    const enemies = this.simulation.getActiveEnemies();
    for (const enemy of enemies) {
      // Draw enemy body
      this.ctx.beginPath();
      this.ctx.arc(enemy.x, enemy.y, 16, 0, Math.PI * 2);
      this.ctx.fillStyle = enemy.type === 'goblin' ? '#ff6b6b' : '#feca57';
      this.ctx.fill();
      
      // Draw enemy highlight
      this.ctx.beginPath();
      this.ctx.arc(enemy.x - 3, enemy.y - 3, 8, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
      this.ctx.fill();
      
      // Draw health bar
      const healthPercent = Math.max(0, enemy.health / enemy.maxHealth);
      this.ctx.fillStyle = '#333';
      this.ctx.fillRect(enemy.x - 20, enemy.y - 30, 40, 4);
      this.ctx.fillStyle = healthPercent > 0.5 ? '#4ecdc4' : '#ff6b6b';
      this.ctx.fillRect(enemy.x - 20, enemy.y - 30, 40 * healthPercent, 4);
      
      // Enemy type label
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '10px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(enemy.type, enemy.x, enemy.y + 35);
    }
  }

  /**
   * Draw UI elements
   */
  _drawUI() {
    // Score
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '20px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`Score: ${this.simulation.score}`, 20, 40);
    
    // Wave
    this.ctx.fillText(`Wave: ${this.simulation.currentWave}/${this.simulation.maxWave}`, 20, 70);
    
    // Enemy count
    this.ctx.fillText(`Enemies: ${this.simulation.getActiveEnemies().length}`, 20, 100);
    
    // Player position indicator
    const playerPos = this.simulation.getPlayerPosition();
    this.ctx.beginPath();
    this.ctx.arc(playerPos.x, playerPos.y, 24, 0, Math.PI * 2);
    this.ctx.strokeStyle = '#4ecdc4';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    this.ctx.lineWidth = 1;
    
    // Crosshair
    this.ctx.beginPath();
    this.ctx.moveTo(playerPos.x - 10, playerPos.y);
    this.ctx.lineTo(playerPos.x + 10, playerPos.y);
    this.ctx.moveTo(playerPos.x, playerPos.y - 10);
    this.ctx.lineTo(playerPos.x, playerPos.y + 10);
    this.ctx.strokeStyle = '#4ecdc4';
    this.ctx.stroke();
  }

  /**
   * Add a particle to the scene
   * @param {number} x
   * @param {number} y
   * @param {string} color
   * @param {number} size
   */
  addParticle(x, y, color, size) {
    this.particles.emit(x, y, color, 1, 60, 1, size, 140);
  }

  /**
   * Emit particles for vase break
   * @param {Vase} vase
   */
  emitVaseBreak(vase) {
    const colors = {
      plant: '#4ecdc4',
      zombie: '#ff6b6b',
      sun: '#ffc94a',
      empty: '#95a5a6'
    };
    this.particles.emit(vase.x, vase.y, colors[vase.type] || '#fff', 20, 100, 1, 4, 100);
  }
}