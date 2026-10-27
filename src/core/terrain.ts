export const WORLD_SIZE = 220;
export const POND = {x:-18,z:22,water:2.15,radius:5.6};
export function pondRadius(angle:number){return POND.radius*(.91+.07*Math.sin(angle*3+.4)+.035*Math.sin(angle*5-1));}
export function pondDistance(x:number,z:number){const dx=x-POND.x,dz=z-POND.z;return Math.hypot(dx,dz)/pondRadius(Math.atan2(dz,dx));}
export function heightAt(x: number, z: number) {
  const natural = (
    3.8 * Math.sin(x / 19) * Math.cos(z / 23) +
    2.4 * Math.sin(z / 12) +
    1.5 * Math.cos((x + z) / 15) +
    5 * Math.exp(-((x - 30) ** 2 + (z + 20) ** 2) / 500)
  );
  // Quiet starting patch, then a smooth transition to the existing broad hills.
  const distance=Math.hypot(x,z),t=Math.max(0,Math.min(1,(distance-5)/13)),blend=t*t*(3-2*t),spawn=1.5+5*Math.exp(-2.6);
  // Broad outer rises leave the accepted starting area (radius 24) unchanged.
  const outer=Math.max(0,Math.min(1,(distance-24)/20)),rise=outer*outer*(3-2*outer);
  const hills=8*Math.exp(-((x-34)**2+(z-4)**2)/850)
    +7*Math.exp(-((x+34)**2+(z+28)**2)/700)
    +5*Math.exp(-((x+18)**2+(z-44)**2)/850);
  const original=spawn*(1-blend)+natural*blend+hills*rise;
  // A shallow, gently blended basin off the route. Its bottom remains solid terrain.
  const d=pondDistance(x,z),tpond=Math.max(0,Math.min(1,(d-1.2)/.85)),shore=tpond*tpond*(3-2*tpond);
  const bank=POND.water-.38+.48*Math.min(1.2,d)**2;
  return bank*(1-shore)+original*shore;
}
/** Shared vertices and indices: rendering and collision use identical triangles. */
export function terrainData(segments = 110) {
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
