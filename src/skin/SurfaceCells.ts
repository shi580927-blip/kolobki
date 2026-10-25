import * as T from 'three';
import {randomFrom} from '../core/skin';
import type {SkinDesign} from './SkinDesign';
interface Cell {center:T.Vector3;corners:T.Vector3[]}
/** Dual of an icosphere: no latitude rows, polar pinch or texture seam. */
export function sphericalCells(surfaceScale:number):Cell[]{
 const source=new T.IcosahedronGeometry(1,Math.max(1,Math.min(6,Math.round(3/surfaceScale))));
 const p=source.attributes.position,cells:Cell[]=[],byPosition=new Map<string,number>();
 const rotation=new T.Quaternion().setFromEuler(new T.Euler(.37,.51,.19));
 for(let i=0;i<p.count;i+=3){const triangle=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(p,i+k).normalize().applyQuaternion(rotation));const middle=triangle.reduce((v,x)=>v.add(x),new T.Vector3()).normalize();
  triangle.forEach(vertex=>{const key=vertex.toArray().map(v=>v.toFixed(5)).join(',');let index=byPosition.get(key);if(index===undefined){index=cells.length;byPosition.set(key,index);cells.push({center:vertex,corners:[]});}cells[index].corners.push(middle.clone());});
 }
 source.dispose();
 for(const cell of cells){const [u,v]=tangents(cell.center);cell.corners.sort((a,b)=>Math.atan2(a.dot(v),a.dot(u))-Math.atan2(b.dot(v),b.dot(u)));}
 return cells;
}
function tangents(n:T.Vector3){const reference=Math.abs(n.y)<.9?new T.Vector3(0,1,0):new T.Vector3(1,0,0);const u=new T.Vector3().crossVectors(reference,n).normalize();return[u,new T.Vector3().crossVectors(n,u).normalize()];}
export function makeCellGeometry(d:SkinDesign){
 const cells=sphericalCells(d.surfaceScale),random=randomFrom(d.seed^0x573aa),positions:number[]=[],indices:number[]=[],details:{direction:number[];sides:number;depth:number;tilt:number;radius:number}[]=[];
 const coreRadius=1-d.relief*1.1-.014;
 function vertex(direction:T.Vector3,radius:number){positions.push(direction.x*radius,direction.y*radius,direction.z*radius);return positions.length/3-1;}
 function triangle(a:number,b:number,c:number){indices.push(a,b,c);}
 for(const cell of cells){const n=cell.center,[u,v]=tangents(n),rough=random()<.48;
  const depth=rough?random()*d.relief*.65:random()*d.relief*.035;
  const tilt=rough?d.relief*(.35+random()*.55):0,tiltAngle=random()*Math.PI*2;
  const radius=cell.corners.reduce((sum,p)=>sum+p.clone().sub(n.clone().multiplyScalar(p.dot(n))).length(),0)/cell.corners.length;
  let boundary:T.Vector3[];
  if(d.surface==='scales'){
   const angle=(random()-.5)*.5,cu=u.clone().multiplyScalar(Math.cos(angle)).addScaledVector(v,Math.sin(angle)),cv=v.clone().multiplyScalar(Math.cos(angle)).addScaledVector(u,-Math.sin(angle));
   boundary=Array.from({length:20},(_,k)=>{const a=k/20*Math.PI*2,s=Math.sin(a),x=Math.cos(a)*radius*(.92+.22*s),y=s*radius*(s<0?1.23:.92);return n.clone().addScaledVector(cu,x).addScaledVector(cv,y).normalize();});
  }else boundary=cell.corners.map(c=>n.clone().lerp(c,.95).normalize());
  const base=1-d.relief*.12-depth;
  const height=(direction:T.Vector3)=>{const local=direction.clone().sub(n.clone().multiplyScalar(direction.dot(n)));return base+tilt*(local.dot(u)*Math.cos(tiltAngle)+local.dot(v)*Math.sin(tiltAngle))/radius;};
  // Each cell has its own seating depth and tip lift. Keep the entire surface
  // inside the unit sphere so the approved independent FaceRig stays above it.
  const top=vertex(n,Math.min(.999,base+.004)),inner:number[]=[],outer:number[]=[],bottom:number[]=[];
  for(const b of boundary){const inset=n.clone().lerp(b,.83).normalize();inner.push(vertex(inset,T.MathUtils.clamp(height(inset)+.004,coreRadius+.006,.999)));outer.push(vertex(b,T.MathUtils.clamp(height(b)-.003,coreRadius+.004,.999)));bottom.push(vertex(b,coreRadius-.002));}
  for(let k=0;k<boundary.length;k++){const next=(k+1)%boundary.length;triangle(top,inner[k],inner[next]);triangle(inner[k],outer[k],outer[next]);triangle(inner[k],outer[next],inner[next]);triangle(outer[k],bottom[k],bottom[next]);triangle(outer[k],bottom[next],outer[next]);}
  details.push({direction:n.toArray(),sides:cell.corners.length,depth,tilt,radius});
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();geometry.userData.cells=details;geometry.userData.coreRadius=coreRadius;return geometry;
}
