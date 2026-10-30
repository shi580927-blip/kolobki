/** Broad optional walks connect the existing racing loop to the rest of the valley. */
export const EXPLORATION_PATHS=[
 [[-5,12],[-10,22],[-26,22],[-39,18],[-45,38],[-51,52],[-66,54],[-51,61],[-32,62],[-18,59]],
 [[28,42],[23,57],[12,64],[-8,66],[-18,59],[-18,47]],
 [[54,6],[68,17],[79,32],[70,48],[54,59],[37,54],[28,42]],
 [[24,-38],[39,-55],[26,-72],[2,-77],[-22,-66],[-38,-30]],
 [[-38,-30],[-57,-37],[-72,-24],[-73,-3],[-53,1],[-47,10],[-39,18]],
] as const;
export const VALLEY_CLEARINGS=[
 {x:-58,z:19,radius:15,kind:0}, // grove below the plateau
 {x:2,z:65,radius:18,kind:1},   // cream and gold meadow above the lake
 {x:70,z:35,radius:18,kind:2},  // pink eastern meadow
 {x:26,z:-67,radius:19,kind:0}, // southern orchard
 {x:-18,z:-68,radius:17,kind:1},
 {x:-69,z:-24,radius:17,kind:2},
] as const;
export function nearestExplorationPath(x:number,z:number){
 let nearest={x:0,z:0,distance:Infinity};
 for(const path of EXPLORATION_PATHS)for(let i=1;i<path.length;i++){
  const [ax,az]=path[i-1],[bx,bz]=path[i],dx=bx-ax,dz=bz-az;
  const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));
  const px=ax+dx*t,pz=az+dz*t,distance=Math.hypot(x-px,z-pz);
  if(distance<nearest.distance)nearest={x:px,z:pz,distance};
 }
 return nearest;
}
