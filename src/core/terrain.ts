export const WORLD_SIZE = 180;
export function heightAt(x: number, z: number) {
  const natural = (
    3.8 * Math.sin(x / 19) * Math.cos(z / 23) +
    2.4 * Math.sin(z / 12) +
    1.5 * Math.cos((x + z) / 15) +
    5 * Math.exp(-((x - 30) ** 2 + (z + 20) ** 2) / 500)
  );
  // Quiet starting patch, then a smooth transition to the existing broad hills.
  const distance=Math.hypot(x,z),t=Math.max(0,Math.min(1,(distance-5)/7)),blend=t*t*(3-2*t),spawn=1.5+5*Math.exp(-2.6);
  return spawn*(1-blend)+natural*blend;
}
/** Shared vertices and indices: rendering and collision use identical triangles. */
export function terrainData(segments = 90) {
  const vertices = new Float32Array((segments + 1) ** 2 * 3);
  const indices = new Uint32Array(segments * segments * 6);
  for (let z = 0; z <= segments; z++)
    for (let x = 0; x <= segments; x++) {
      const i = (z * (segments + 1) + x) * 3;
      const px = (x / segments - 0.5) * WORLD_SIZE,
        pz = (z / segments - 0.5) * WORLD_SIZE;
      vertices.set([px, heightAt(px, pz), pz], i);
    }
  let p = 0;
  for (let z = 0; z < segments; z++)
    for (let x = 0; x < segments; x++) {
      const a = z * (segments + 1) + x,
        b = a + 1,
        c = a + segments + 1,
        d = c + 1;
      indices.set([a, c, b, b, c, d], p);
      p += 6;
    }
  return { vertices, indices };
}
export function fit16by9(w: number, h: number) {
  const scale = Math.min(w / 1280, h / 720);
  return { width: 1280 * scale, height: 720 * scale, scale };
}
export function headingFromVelocity(x: number, z: number, previous: number) {
  return x * x + z * z > 0.09 ? Math.atan2(x, z) : previous;
}
