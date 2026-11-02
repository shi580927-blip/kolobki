/** Landmarks occupy the broad peripheral pockets, never the established routes. */
export const SUNNY_BUILDINGS=[
 {kind:'lighthouse',x:-28,z:-164,radius:5.6,yaw:0},
 {kind:'windmill',x:112,z:125,radius:5.2,yaw:-2.4},
 {kind:'cottage',x:-100,z:-113,radius:5.2,yaw:.4},
 {kind:'cottage',x:-116,z:138,radius:5.2,yaw:2.1},
 {kind:'cottage',x:62,z:132,radius:5.2,yaw:-1.1},
 {kind:'cottage',x:162,z:67,radius:5.2,yaw:-1.4},
 {kind:'cottage',x:140,z:-135,radius:5.2,yaw:.8},
 {kind:'cottage',x:-165,z:-107,radius:5.2,yaw:1.2},
] as const;
export function landmarkClearance(x:number,z:number){
 return Math.min(...SUNNY_BUILDINGS.map(p=>Math.hypot(x-p.x,z-p.z)-p.radius));
}
