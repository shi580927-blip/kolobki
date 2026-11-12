import {nearestRoutePoint} from './valleyRoute';
/** Authored relief modules blend into the shared terrain mesh and collider. */
export const RELIEF_MODULES=[
 {kind:'plateau',x:-77,z:34,radius:23,height:5},
 {kind:'hill',x:-53,z:1,radius:17,height:6},
 {kind:'hill',x:-8,z:66,radius:18,height:6},
 {kind:'hill',x:72,z:59,radius:20,height:7},
 {kind:'hill',x:25,z:-78,radius:21,height:7},
 {kind:'hill',x:-74,z:-50,radius:21,height:6},
 {kind:'hill',x:142,z:114,radius:40,height:12},
 {kind:'hill',x:112,z:155,radius:32,height:7},
 {kind:'hill',x:-148,z:4,radius:35,height:10},
 {kind:'hill',x:-143,z:-68,radius:32,height:8},
] as const;
const smooth=(a:number,b:number,v:number)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
export function landscapeRelief(x:number,z:number){
 const clearance=smooth(10,18,nearestRoutePoint(x,z).distance);
 let height=0;
 for(const m of RELIEF_MODULES){const a=Math.atan2(z-m.z,x-m.x),outline=m.kind==='plateau'?1+.07*Math.sin(a*3+.6)+.035*Math.cos(a*5):1;const r=Math.hypot(x-m.x,z-m.z)/(m.radius*outline);
  const profile=Math.pow(Math.max(0,1-r*r),2);
  height+=m.height*profile;
 }
 return height*clearance;
}
