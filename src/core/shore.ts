import {POND,pondRadius} from './terrain';

const smooth=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
/** Dry beach widens into southern coves; metre-sized lobes break the grass edge. */
export function shoreSandCoverage(x:number,z:number){
 const dx=x-POND.x,dz=z-POND.z,a=Math.atan2(dz,dx),r=Math.hypot(dx,dz);
 const width=1.8+1.3*Math.max(0,Math.sin(a))+.55*Math.sin(a*3+.4)
  +.32*Math.sin(x*1.1+Math.sin(z*.63))+.19*Math.sin(z*1.7-x*.54);
 return 1-smooth(width-.65,width+.65,r-pondRadius(a)*.89);
}
/** Same world-space field in the opaque ground material (no decal/extra pass). */
export const shoreSandGLSL=`
float shoreSand(vec2 p){
 vec2 q=p-vec2(${POND.x.toFixed(1)},${POND.z.toFixed(1)});
 float a=atan(q.y,q.x),south=max(0.,sin(a));
 float radius=${POND.radius.toFixed(1)}*(.96+.045*sin(a*3.+.4)+.025*sin(a*5.-1.))*(1.+2.7*south*south);
 float width=1.8+1.3*south+.55*sin(a*3.+.4)+.32*sin(p.x*1.1+sin(p.y*.63))+.19*sin(p.y*1.7-p.x*.54);
 return 1.-smoothstep(width-.65,width+.65,length(q)-radius*.89);
}`;
