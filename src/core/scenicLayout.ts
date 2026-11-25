/** Landmarks occupy the broad peripheral pockets, never the established routes. */
export const SUNNY_BUILDINGS=[
 {kind:'lighthouse',x:-28,z:-164,radius:5.6,yaw:0},
] as const;
export function landmarkClearance(x:number,z:number){
 return Math.min(...SUNNY_BUILDINGS.map(p=>Math.hypot(x-p.x,z-p.z)-p.radius));
}
