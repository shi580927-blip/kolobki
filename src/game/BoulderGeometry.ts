import * as T from 'three';
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';
/** Uneven weathered boulder: broad, sloping faces and an asymmetric silhouette. */
export function makeBoulderGeometry(){
 const points:T.Vector3[]=[];
 for(let i=0;i<7;i++){const a=i/7*Math.PI*2,r=.90+.12*Math.sin(i*2.7);points.push(new T.Vector3(Math.cos(a)*r,-.65+.10*Math.sin(i*3),Math.sin(a)*r*.86));}
 for(let i=0;i<7;i++){const a=i/7*Math.PI*2+.13,r=.94+.13*Math.sin(i*3.7+.5);points.push(new T.Vector3(Math.cos(a)*r,-.03+.17*Math.sin(i*2),Math.sin(a)*r*.91));}
 for(let i=0;i<5;i++){const a=i/5*Math.PI*2+.32,r=.56+.12*Math.sin(i*2.1);points.push(new T.Vector3(Math.cos(a)*r-.08,.52+.21*Math.sin(i*1.3+.4),Math.sin(a)*r*.91));}
 const g=new ConvexGeometry(points),p=g.getAttribute('position'),colors:number[]=[];
 for(let i=0;i<p.count;i++){const y=p.getY(i),c=new T.Color('#858374').lerp(new T.Color('#cfc1a4'),T.MathUtils.clamp((y+.65)/1.45,0,1)*.8);colors.push(c.r,c.g,c.b);}
 g.setAttribute('color',new T.Float32BufferAttribute(colors,3));return g;
}
