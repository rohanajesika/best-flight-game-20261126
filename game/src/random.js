// random.js — a tiny seeded generator so the world is the same every visit.
// ?seed=N pins it; without a seed the session picks one and the terrain, the
// clouds and the ring course all follow from it.
export function createRandom(seed) {
  let a = seed >>> 0;
  if (a === 0) a = 0x9e3779b9;
  function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    range(min, max) {
      return min + (max - min) * next();
    },
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
  };
}

// Smooth 2D value noise from the seeded generator: a fixed grid of random
// heights, bilinearly interpolated, so hills look hand-shaped, not spiky.
export function createNoise(random, grid = 24) {
  const values = new Float32Array((grid + 1) * (grid + 1));
  for (let i = 0; i < values.length; i += 1) values[i] = random.next();
  const smooth = (t) => t * t * (3 - 2 * t);
  return function noise(x, z) {
    const gx = ((x / 4200) + 0.5) * grid;
    const gz = ((z / 4200) + 0.5) * grid;
    const x0 = Math.max(0, Math.min(grid - 1, Math.floor(gx)));
    const z0 = Math.max(0, Math.min(grid - 1, Math.floor(gz)));
    const fx = smooth(gx - x0);
    const fz = smooth(gz - z0);
    const i00 = values[z0 * (grid + 1) + x0];
    const i10 = values[z0 * (grid + 1) + x0 + 1];
    const i01 = values[(z0 + 1) * (grid + 1) + x0];
    const i11 = values[(z0 + 1) * (grid + 1) + x0 + 1];
    const top = i00 + (i10 - i00) * fx;
    const bottom = i01 + (i11 - i01) * fx;
    return top + (bottom - top) * fz;
  };
}
