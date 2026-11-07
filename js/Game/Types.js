// js/Game/Types.js - Centralized type definitions and constants
/** @typedef {'plant'|'zombie'|'sun'|'empty'} VaseType */
/** @typedef {'idle'|'patrolling'|'chasing'|'jumping'|'gameover'} EnemyState */
/** @typedef {{id:string,x:number,y:number,type:string,health:number,maxHealth:number,speed:number,state:EnemyState,dead?:boolean}} Enemy */
/** @typedef {{id:string,x:number,y:number,size:number,type:string}} Plant */
/** @typedef {{id:string,x:number,y:number,radius:number,active:boolean,collected:boolean,type:VaseType,payload:string|null,amount:number}} Vase */
/** @typedef {{type:string,enemies:Enemy[],waveId:string}} Wave */

export const CONFIG = {
  CANVAS_WIDTH: 1920,
  CANVAS_HEIGHT: 1080,
  CELL_SIZE: 64,
  GRID_COLS: 30,
  GRID_ROWS: 17,
  PARTICLE_CAPACITY: 200,
  MAX_ENEMIES: 50,
  VASE_INTERACTION_RANGE: 32,
  PLAYER_SPEED: 300,
  ENEMY_BASE_SPEED: 50,
  WAVE_SPAWN_INTERVAL: 15,
  VASE_RADIUS: 32,
  ENEMY_GOBLIN_HEALTH: 3,
  ENEMY_BRUTE_HEALTH: 5,
  ENEMY_GOBLIN_SPEED: 1.5,
  ENEMY_BRUTE_SPEED: 1,
};

export const VASE_TYPES = ['plant', 'zombie', 'sun', 'empty'] as const;
export const ENEMY_TYPES = ['goblin', 'brute'] as const;
export const PLANT_TYPES = ['peashooter', 'sunflower', 'wallnut'] as const;