import {coastHeight,joinWestCoast} from './coast';
import {landscapeRelief} from './landscapeRelief';
export const WORLD_SIZE = 260;
export const POND = {x:-35,z:18,water:2.15,radius:5.6,flare:12.0};
/** Narrow spring inlet under the bridge opens into a broad southern lake.
 * One continuous contour drives water, terrain, coating and prop clearance. */
export function pondRadius(angle:number){
  const south=Math.max(0,Math.sin(angle));
  return POND.radius*(.96+.045*Math.sin(angle*3+.4)+.025*Math.sin(angle*5-1))*(1+POND.flare*south*south);
}
export function pondDistance(x:number,z:number){const dx=x-POND.x,dz=z-POND.z;return Math.hypot(dx,dz)/pondRadius(Math.atan2(dz,dx));}
/** Conservative nominal water edge, in metres, for dry prop placement. */
export function pondClearance(x:number,z:number){const a=Math.atan2(z-POND.z,x-POND.x);return Math.hypot(x-POND.x,z-POND.z)-pondRadius(a);}
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
  const original=spawn*(1-blend)+natural*blend+hills*rise+landscapeRelief(x,z);
  // A shallow, gently blended basin off the route. Its bottom remains solid terrain.
  const d=pondDistance(x,z),tpond=Math.max(0,Math.min(1,(pondClearance(x,z)-2)/12)),shore=tpond*tpond*(3-2*tpond);
  const bank=POND.water-.38+.48*Math.min(1.2,d)**2;
  const basin=bank*(1-shore)+original*shore;
  // Dry approaches meet the 13 m bridge without an abrupt bank at its ends.
  const smooth=(a:number,b:number,v:number)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
  const dx=Math.abs(x-POND.x),dz=Math.abs(z-POND.z);
  const approach=smooth(5.8,6.4,dx)*(1-smooth(8,20,dx))*(1-smooth(2.6,5,dz));
  return joinWestCoast(x,z,basin*(1-approach)+(POND.water+.12)*approach+coastHeight(x,z));
}
/** Shared vertices and indices: rendering and collision use identical triangles. */
export function terrainData(segments = WORLD_SIZE / 2) {
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
