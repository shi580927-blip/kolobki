import {nearestRoutePoint} from './valleyRoute';
/** Two connected-to-land headlands: steep water face, long ramp on the dry side. */
export const COAST_TERRACES=[
 {x:-65,z:56,rx:9,rz:10,height:5.8,facing:1},
 {x:-4,z:45,rx:9,rz:5,height:4.5,facing:-1},
] as const;
const smooth=(a:number,b:number,v:number)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
export function coastHeight(x:number,z:number){
 let h=0;
 for(const c of COAST_TERRACES){const dx=(x-c.x)/(c.rx*((x-c.x)*c.facing<0?1.6:1)),dz=(z-c.z)/c.rz,r=Math.hypot(dx,dz);
  const inner=.34+.36*smooth(-.5,.5,dx*c.facing);
  h=Math.max(h,c.height*(1-smooth(inner,1,r)));
 }
 return h*smooth(10,18,nearestRoutePoint(x,z).distance);
}
