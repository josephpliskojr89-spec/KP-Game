/* Seeded RNG (mulberry32) with serializable state, plus a deterministic
   hash channel for perceived reads — a scout's read of a person never
   re-rolls when a screen reopens ("information is knowledge, not slot pulls"). */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return (((t ^ (t >>> 14)) >>> 0) / 4294967296);
    };
  }

  function hashStr(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  KP.Rng = class Rng {
    constructor(seed) {
      this.seed = (typeof seed === 'string') ? hashStr(seed) : (seed >>> 0);
      this.count = 0;
    }
    static fromState(s) {
      const r = new KP.Rng(s.seed);
      r.count = s.count;
      return r;
    }
    state() { return { seed: this.seed, count: this.count }; }
    next() {
      // stateless re-derivation by count keeps save/restore exact
      const f = mulberry32(this.seed + this.count * 0x9E3779B9);
      this.count++;
      return f();
    }
    // uniform in [lo, hi)
    range(lo, hi) { return lo + this.next() * (hi - lo); }
    int(lo, hi) { return Math.floor(this.range(lo, hi + 1)); }
    chance(p) { return this.next() < p; }
    pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
    // Box-Muller normal
    normal(mean, sd) {
      let u = 0, v = 0;
      while (u === 0) u = this.next();
      while (v === 0) v = this.next();
      return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(this.next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }
  };

  // Deterministic 0..1 from a key — the perceived-truth channel.
  KP.hash01 = function (key) { return hashStr(String(key)) / 4294967296; };
  KP.hashStr = hashStr;

  KP.clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
})(typeof window !== 'undefined' ? window : globalThis);
