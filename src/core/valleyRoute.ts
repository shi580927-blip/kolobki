/** Shared level layout: match guidance and obstacle clearance use the same loop. */
export const ROUTE_HALF_WIDTH=6;
export const VALLEY_ROUTE=[{x:0,z:15},{x:28,z:42},{x:54,z:6},{x:24,z:-38},{x:-38,z:-30},{x:0,z:0}];
export function nearestRoutePoint(x:number,z:number){
 let nearest={x:0,z:0,distance:Infinity};
 for(let i=0;i<VALLEY_ROUTE.length;i++){
  const a=VALLEY_ROUTE[(i+VALLEY_ROUTE.length-1)%VALLEY_ROUTE.length],b=VALLEY_ROUTE[i],dx=b.x-a.x,dz=b.z-a.z;
  const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz))),px=a.x+dx*t,pz=a.z+dz*t,distance=Math.hypot(x-px,z-pz);
  if(distance<nearest.distance)nearest={x:px,z:pz,distance};
 }
 return nearest;
}
/** Move sparse solid props off the broad driving corridor, preserving count. */
export function clearRoutePosition(x:number,z:number,radius:number){
 const margin=ROUTE_HALF_WIDTH+radius+1;
 for(let i=0;i<12;i++){
  const p=nearestRoutePoint(x,z);if(p.distance>=margin-.001)break;
  const dx=x-p.x,dz=z-p.z,d=p.distance||1;
  x+=(p.distance?dx/d:1)*(margin-p.distance+.1);z+=(p.distance?dz/d:0)*(margin-p.distance+.1);
 }
 return {x,z};
}
