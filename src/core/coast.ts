import {nearestRoutePoint} from './valleyRoute';
/** Two connected-to-land headlands: steep water face, long ramp on the dry side. */
export const COAST_TERRACES=[
 {x:-65,z:56,rx:9,rz:10,height:5.8,facing:1},
 {x:-4,z:45,rx:9,rz:5,height:4.5,facing:-1},
] as const;
const smooth=(a:number,b:number,v:number)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
/** A broad dry shoulder joins the plateau, spring outcrop and western headland.
 * Absolute elevations avoid stacking three separate hills at their junctions. */
export const WEST_COAST_SPINE=[
 {x:-67,z:34,y:6.2}, {x:-66.5,z:39,y:6.0}, {x:-66,z:44,y:6.1},
 {x:-65.5,z:49,y:7.1}, {x:-65,z:56,y:7.8},
] as const;
export function westCoastShoulder(x:number,z:number){
 let distance=Infinity,elevation=0;
 for(let i=1;i<WEST_COAST_SPINE.length;i++){
  const a=WEST_COAST_SPINE[i-1],b=WEST_COAST_SPINE[i],dx=b.x-a.x,dz=b.z-a.z;
  const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));
  const px=a.x+t*dx,pz=a.z+t*dz;
  // Longer landward ramp, short lake-facing shoulder; leave the spring mouth open.
  const d=Math.hypot((x-px)/(x<px?14:6.8),(z-pz)/7);
  if(d<distance){distance=d;elevation=a.y+(b.y-a.y)*t;}
 }
 return {weight:1-smooth(.35,1,distance),elevation};
}
export function joinWestCoast(x:number,z:number,ground:number){
 const {weight,elevation}=westCoastShoulder(x,z);
 return ground+Math.max(0,elevation-ground)*weight;
}
export function coastHeight(x:number,z:number){
 let h=0;
 for(const c of COAST_TERRACES){const dx=(x-c.x)/(c.rx*((x-c.x)*c.facing<0?1.6:1)),dz=(z-c.z)/c.rz,r=Math.hypot(dx,dz);
  const inner=.34+.36*smooth(-.5,.5,dx*c.facing);
  h=Math.max(h,c.height*(1-smooth(inner,1,r)));
 }
 return h*smooth(10,18,nearestRoutePoint(x,z).distance);
}
