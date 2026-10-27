import * as T from 'three';
import {toCreasedNormals} from 'three/addons/utils/BufferGeometryUtils.js';
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';
/** Uneven weathered boulder: broad, sloping faces and an asymmetric silhouette. */
export function makeBoulderGeometry(variant=0){
 const points:T.Vector3[]=[];
 for(let i=0;i<7;i++){const a=i/7*Math.PI*2,r=.90+.12*Math.sin(i*2.7+variant*1.7);points.push(new T.Vector3(Math.cos(a)*r,-.65+.10*Math.sin(i*3),Math.sin(a)*r*.86));}
 for(let i=0;i<7;i++){const a=i/7*Math.PI*2+.13,r=.94+.13*Math.sin(i*3.7+.5+variant);points.push(new T.Vector3(Math.cos(a)*r,-.03+.17*Math.sin(i*2),Math.sin(a)*r*.91));}
 for(let i=0;i<5;i++){const a=i/5*Math.PI*2+.32,r=.56+.12*Math.sin(i*2.1);points.push(new T.Vector3(Math.cos(a)*r-.08,.52+.21*Math.sin(i*1.3+.4+variant*.8),Math.sin(a)*r*.91));}
 // Rounded convex support retains broad planes while beveling the silhouette.
 const bevelDirections=new T.IcosahedronGeometry(1,0),directions=bevelDirections.getAttribute('position');
 const rounded:T.Vector3[]=[];
 for(const v of points)for(let j=0;j<directions.count;j++)rounded.push(v.clone().multiplyScalar(.89).add(new T.Vector3().fromBufferAttribute(directions,j).multiplyScalar(.11)));
 bevelDirections.dispose();
 const raw=new ConvexGeometry(rounded),g=toCreasedNormals(raw,.8);raw.dispose();const p=g.getAttribute('position'),colors:number[]=[];
 for(let i=0;i<p.count;i++){const y=p.getY(i),c=new T.Color('#a09583').lerp(new T.Color('#dfd2b9'),T.MathUtils.clamp((y+.65)/1.45,0,1)*.8);colors.push(c.r,c.g,c.b);}
 g.setAttribute('color',new T.Float32BufferAttribute(colors,3));return g;
}
