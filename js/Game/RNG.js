// js/Game/RNG.js - Seeded random number generator (mulberry32)
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