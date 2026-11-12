/** Shared level layout: match guidance and obstacle clearance use the same loop. */
export const ROUTE_HALF_WIDTH=6;
export const VALLEY_ROUTE=[{x:0,z:15},{x:28,z:42},{x:54,z:6},{x:24,z:-38},{x:-38,z:-30},{x:0,z:0}];
export const MEADOW_ROUTE=[{x:4,z:14},{x:16,z:40},{x:40,z:65},{x:80,z:62},{x:112,z:35},{x:116,z:0},{x:96,z:-34},{x:58,z:-47},{x:22,z:-35},{x:4,z:-10}];
export interface ValleyTrack {id:string;name:string;skill:string;halfWidth:number;points:readonly {x:number;z:number}[]}
export const HILL_TRACK:ValleyTrack={id:'hills',name:'Холмы',skill:'Уверенное управление',halfWidth:6,points:VALLEY_ROUTE};
export const MEADOW_TRACK:ValleyTrack={id:'meadow',name:'Просторная',skill:'Спокойный заезд',halfWidth:10,points:MEADOW_ROUTE};
export const VALLEY_TRACKS=[MEADOW_TRACK,HILL_TRACK] as const;
export function nearestRoutePoint(x:number,z:number,points:ValleyTrack['points']=VALLEY_ROUTE){
 let nearest={x:0,z:0,distance:Infinity};
 for(let i=0;i<points.length;i++){
  const a=points[(i+points.length-1)%points.length],b=points[i],dx=b.x-a.x,dz=b.z-a.z;
  const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz))),px=a.x+dx*t,pz=a.z+dz*t,distance=Math.hypot(x-px,z-pz);
  if(distance<nearest.distance)nearest={x:px,z:pz,distance};
 }
 return nearest;
}
/** Clearance is measured from the edge of every prepared driving corridor. */
export function nearestDrivingLane(x:number,z:number){
 let nearest={x:0,z:0,distance:Infinity,clearance:Infinity,halfWidth:0};
 for(const track of VALLEY_TRACKS){const p=nearestRoutePoint(x,z,track.points),clearance=p.distance-track.halfWidth;if(clearance<nearest.clearance)nearest={...p,clearance,halfWidth:track.halfWidth};}
 return nearest;
}
/** Prepare a broad, nearly level meadow before any race is selected. */
export function meadowTrackFloor(x:number,z:number,natural:number){
 const distance=nearestRoutePoint(x,z,MEADOW_ROUTE).distance;
 const t=Math.max(0,Math.min(1,(distance-MEADOW_TRACK.halfWidth-2)/24)),blend=t*t*(3-2*t);
 return 2.3+(natural-2.3)*blend;
}
/** Move sparse solid props off the broad driving corridor, preserving count. */
export function clearRoutePosition(x:number,z:number,radius:number){
 const margin=radius+1;
 for(let i=0;i<12;i++){
  const p=nearestDrivingLane(x,z);if(p.clearance>=margin-.001)break;
  const dx=x-p.x,dz=z-p.z,d=p.distance||1;
  x+=(p.distance?dx/d:1)*(margin-p.clearance+.1);z+=(p.distance?dz/d:0)*(margin-p.clearance+.1);
 }
 return {x,z};
}
