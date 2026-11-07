/**
 * Game.Simulation - State management for the game
 * Handles enemies, plants, waves, scores, and other game state
 */
import { EventBus } from './EventBus.js';
import { RNG } from './RNG.js';
import { CONFIG, VASE_TYPES, ENEMY_TYPES } from './Types.js';

/**
 * @typedef {Object} Enemy
 * @property {string} id
 * @property {number} x
 * @property {number} y
 * @property {string} type
 * @property {number} health
 * @property {number} maxHealth
 * @property {number} speed
 * @property {EnemyState} state
 * @property {boolean} [dead]
 */

/**
 * @typedef {Object} Plant
 * @property {string} id
 * @property {number} x
 * @property {number} y
 * @property {number} size
 * @property {string} type
 */

/**
 * @typedef {Object} Vase
 * @property {string} id
 * @property {number} x
 * @property {number} y
 * @property {number} radius
 * @property {boolean} active
 * @property {boolean} collected
 * @property {VaseType} type
 * @property {string|null} payload
 * @property {number} amount
 */

/**
 * @typedef {Object} Wave
 * @property {string} type
 * @property {Enemy[]} enemies
 * @property {string} waveId
 */

export class GameSimulation {
  /**
   * @param {number} seed - Random seed for deterministic simulation
   * @param {EventBus} [eventBus] - Event bus for module communication
   */
  constructor(seed, eventBus = null) {
    // Game state
    /** @type {Enemy[]} */
    this.enemies = [];
    /** @type {Plant[]} */
    this.plants = [];
    /** @type {Wave[]} */
    this.waves = [];
    this.score = 0;
    this.isGameOver = false;
    this.currentWave = 1;
    this.timer = 0;
    this.maxWave = 5;
    this.playerX = CONFIG.CANVAS_WIDTH / 2;
    this.playerY = CONFIG.CANVAS_HEIGHT / 2;
    
    // RNG for deterministic simulation
    /** @type {RNG} */
    this.rng = new RNG(seed);
    
    // Event bus for communication
    /** @type {EventBus} */
    this.eventBus = eventBus || new EventBus();
    
    // Spatial partitioning for enemy ticking optimization
    /** @type {Object|null} */
    this.enemyGrid = null;
    this.gridSize = CONFIG.CELL_SIZE;
    
    // Vase state
    /** @type {Vase[]} */
    this.vases = [];
    this.activeVases = [];
  }

  /**
   * Initialize spatial grid with world bounds
   * @param {number} worldWidth
   * @param {number} worldHeight
   */
  _initGrid(worldWidth, worldHeight) {
    if (!this.enemyGrid) {
      this.enemyGrid = {
        cols: Math.ceil(worldWidth / this.gridSize),
        rows: Math.ceil(worldHeight / this.gridSize),
        cells: new Map(),
        cellSize: this.gridSize
      };
    }
  }

  /**
   * Get grid cell key for position
   * @param {number} x
   * @param {number} y
   * @returns {string}
   */
  _gridKey(x, y) {
    const cx = Math.floor(x / this.gridSize);
    const cy = Math.floor(y / this.gridSize);
    return `${cx},${cy}`;
  }

  /**
   * Add enemy to spatial grid
   * @param {number} x
   * @param {number} y
   * @param {Enemy} enemy
   */
  _updateEnemyGrid(x, y, enemy) {
    if (!this.enemyGrid) return;
    const key = this._gridKey(x, y);
    if (!this.enemyGrid.cells.has(key)) {
      this.enemyGrid.cells.set(key, []);
    }
    this.enemyGrid.cells.get(key).push(enemy);
  }

  /**
   * Remove enemy from spatial grid
   * @param {Enemy} enemy
   */
  _removeFromGrid(enemy) {
    if (!this.enemyGrid) return;
    const key = this._gridKey(enemy.x, enemy.y);
    const cell = this.enemyGrid.cells.get(key);
    if (cell) {
      const idx = cell.indexOf(enemy);
      if (idx >= 0) cell.splice(idx, 1);
    }
  }

  /**
   * Query enemies in radius
   * @param {number} x
   * @param {number} y
   * @param {number} radius
   * @returns {Enemy[]}
   */
  getEnemiesInRange(x, y, radius) {
    if (!this.enemyGrid) return [];
    const results = [];
    const minCx = Math.floor((x - radius) / this.gridSize);
    const maxCx = Math.floor((x + radius) / this.gridSize);
    const minCy = Math.floor((y - radius) / this.gridSize);
    const maxCy = Math.floor((y + radius) / this.gridSize);
    const r2 = radius * radius;
    
    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const key = `${cx},${cy}`;
        const cell = this.enemyGrid.cells.get(key);
        if (cell) {
          for (const e of cell) {
            const dx = e.x - x, dy = e.y - y;
            if (dx * dx + dy * dy <= r2) results.push(e);
          }
        }
      }
    }
    return results;
  }

  /**
   * Add an enemy to the simulation
   * @param {number} x - World X position
   * @param {number} y - World Y position
   * @param {string} type - Enemy type ('goblin'|'brute')
   * @returns {Enemy} The created enemy
   */
  addEnemy(x, y, type) {
    if (!ENEMY_TYPES.includes(type)) {
      throw new Error(`Invalid enemy type: ${type}`);
    }
    const enemy = {
      id: `enemy_${Date.now()}_${this.rng.nextInt(1000000)}`,
      x,
      y,
      type,
      health: type === 'goblin' ? CONFIG.ENEMY_GOBLIN_HEALTH : CONFIG.ENEMY_BRUTE_HEALTH,
      maxHealth: type === 'goblin' ? CONFIG.ENEMY_GOBLIN_HEALTH : CONFIG.ENEMY_BRUTE_HEALTH,
      speed: type === 'goblin' ? CONFIG.ENEMY_GOBLIN_SPEED : CONFIG.ENEMY_BRUTE_SPEED,
      state: 'idle'
    };
    this.enemies.push(enemy);
    this._updateEnemyGrid(x, y, enemy);
    return enemy;
  }

  /**
   * Add a plant to the simulation
   * @param {number} x
   * @param {number} y
   * @returns {Plant}
   */
  addPlant(x, y) {
    const plant = {
      id: `plant_${Date.now()}_${this.rng.nextInt(1000000)}`,
      x,
      y,
      size: 1,
      type: 'flower'
    };
    this.plants.push(plant);
    return plant;
  }

  /**
   * Add a wave of enemies
   * @param {string} type - Enemy type for this wave
   */
  addWave(type) {
    if (!ENEMY_TYPES.includes(type)) {
      throw new Error(`Invalid wave enemy type: ${type}`);
    }
    const waveEnemies = [];
    for (let i = 0; i < type * 3; i++) {
      const enemy = this.addEnemy(
        this.rng.nextFloat(0, CONFIG.CANVAS_WIDTH),
        this.rng.nextFloat(0, CONFIG.CANVAS_HEIGHT),
        type
      );
      waveEnemies.push(enemy);
    }
    this.waves.push({
      type,
      enemies: waveEnemies,
      waveId: `wave_${Date.now()}_${this.rng.nextInt(1000000)}`
    });
  }

  /**
   * Spawn a vase at a location
   * @param {number} x
   * @param {number} y
   * @param {VaseType} [vaseType='plant']
   * @param {string|null} [payload=null]
   * @param {number} [amount=25]
   * @returns {Vase}
   */
  addVase(x, y, vaseType = 'plant', payload = null, amount = 25) {
    if (!VASE_TYPES.includes(vaseType)) {
      throw new Error(`Invalid vase type: ${vaseType}`);
    }
    const vase = {
      id: `vase_${Date.now()}_${this.rng.nextInt(1000000)}`,
      x,
      y,
      radius: CONFIG.VASE_RADIUS,
      active: true,
      collected: false,
      type: vaseType,
      payload,
      amount
    };
    this.vases.push(vase);
    this.eventBus.emit('vaseSpawn', vase);
    return vase;
  }

  /**
   * Update the simulation state
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    if (this.isGameOver) return;

    // Initialize grid on first update
    this._initGrid(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    // Update timer
    this.timer += dt;

    // Update enemies
    this._updateEnemies(dt);

    // Update waves
    this._updateWaves(dt);

    // Update vases
    this._updateVases(dt);

    // Check for game over conditions
    if (this.enemies.length > CONFIG.MAX_ENEMIES) {
      this.isGameOver = true;
      this.eventBus.emit('gameOver', { reason: 'tooManyEnemies' });
    }
  }

  /**
   * Update enemy positions and states
   * @param {number} dt
   */
  _updateEnemies(dt) {
    for (const enemy of this.enemies) {
      // Remove from old grid position
      this._removeFromGrid(enemy);
      
      // Simple AI: move towards player
      const dx = this.playerX - enemy.x;
      const dy = this.playerY - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 100) {
        enemy.state = 'chasing';
        // Move towards player
        enemy.x += (dx / distance) * enemy.speed * dt * 60;
        enemy.y += (dy / distance) * enemy.speed * dt * 60;
      } else if (distance < 300) {
        enemy.state = 'patrolling';
        // Random patrol movement
        enemy.x += (this.rng.nextFloat(-1, 1) * enemy.speed * dt * 60);
        enemy.y += (this.rng.nextFloat(-1, 1) * enemy.speed * dt * 60);
      } else {
        enemy.state = 'idle';
      }
      
      // Clamp to world bounds
      enemy.x = Math.max(0, Math.min(CONFIG.CANVAS_WIDTH, enemy.x));
      enemy.y = Math.max(0, Math.min(CONFIG.CANVAS_HEIGHT, enemy.y));
      
      // Add to new grid position
      this._updateEnemyGrid(enemy.x, enemy.y, enemy);
    }
  }

  /**
   * Update wave progress
   * @param {number} dt
   */
  _updateWaves(dt) {
    if (this.currentWave >= this.waves.length) return;

    const wave = this.waves[this.currentWave];
    
    // Move wave forward
    for (const enemy of wave.enemies) {
      if (!enemy.dead) {
        enemy.x += 50 * dt;
        enemy.y += 50 * dt;
      }
    }

    // Check if wave is complete (all enemies dead or off screen)
    const activeWaveEnemies = wave.enemies.filter(e => !e.dead && e.x < CONFIG.CANVAS_WIDTH);
    if (activeWaveEnemies.length === 0) {
      this.currentWave++;
      this.eventBus.emit('waveComplete', { wave: this.currentWave });
      if (this.currentWave >= this.maxWave) {
        this.isGameOver = true;
        this.eventBus.emit('gameWon');
        return;
      }
    }
  }

  /**
   * Update vase states
   * @param {number} dt
   */
  _updateVases(dt) {
    for (const vase of this.vases) {
      // Vases don't update automatically - they wait for player interaction
    }
  }

  /**
   * Player interacts with vase at position
   * @param {number} px - Player X
   * @param {number} py - Player Y
   * @returns {Vase|null} The broken vase or null
   */
  playerInteract(px, py) {
    for (const vase of this.vases) {
      if (!vase.active || vase.collected) continue;
      const dx = vase.x - px;
      const dy = vase.y - py;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < vase.radius) {
        this._breakVase(vase);
        return vase;
      }
    }
    return null;
  }

  /**
   * Break a vase and give reward
   * @param {Vase} vase
   */
  _breakVase(vase) {
    vase.active = false;
    vase.collected = true;
    this.eventBus.emit('vaseBreak', { vase, playerX: this.playerX, playerY: this.playerY });
    
    switch (vase.type) {
      case 'plant':
        if (vase.payload) {
          this.addPlant(vase.x, vase.y);
          this.eventBus.emit('vaseReward', { type: 'plant', plant: vase.payload });
        }
        break;
      case 'zombie':
        if (vase.payload) {
          this.addEnemy(vase.x, vase.y, vase.payload);
          this.eventBus.emit('vaseReward', { type: 'zombie', enemy: vase.payload });
        }
        break;
      case 'sun':
        this.score += vase.amount;
        this.eventBus.emit('vaseReward', { type: 'sun', amount: vase.amount });
        break;
    }
  }

  /**
   * Get all active enemies
   * @returns {Enemy[]}
   */
  getActiveEnemies() {
    return this.enemies.filter(e => e.state !== 'gameover' && e.health > 0);
  }

  /**
   * Get all active plants
   * @returns {Plant[]}
   */
  getActivePlants() {
    return this.plants.filter(p => p.type === 'flower');
  }

  /**
   * Get all vases
   * @returns {Vase[]}
   */
  getVases() {
    return this.vases;
  }

  /**
   * Get active (not collected) vases
   * @returns {Vase[]}
   */
  getActiveVases() {
    return this.vases.filter(v => v.active && !v.collected);
  }

  /**
   * Get current wave information
   * @returns {Wave|undefined}
   */
  getCurrentWave() {
    return this.waves[this.currentWave - 1];
  }

  /**
   * Set player position (called by controller)
   * @param {number} x
   * @param {number} y
   */
  setPlayerPosition(x, y) {
    this.playerX = Math.max(0, Math.min(CONFIG.CANVAS_WIDTH, x));
    this.playerY = Math.max(0, Math.min(CONFIG.CANVAS_HEIGHT, y));
  }

  /**
   * Get player position
   * @returns {{x:number,y:number}}
   */
  getPlayerPosition() {
    return { x: this.playerX, y: this.playerY };
  }
}