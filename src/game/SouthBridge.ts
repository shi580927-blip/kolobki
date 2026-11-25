import * as T from 'three';
import R from '@dimforge/rapier3d-compat';
/** Diagonal crossing of the southwest cove, clear of all three beach exits. */
import {SOUTH_BRIDGE,southBridgePoint} from '../core/southCrossing';
export {SOUTH_BRIDGE,southBridgePoint} from '../core/southCrossing';
const dx=23/SOUTH_BRIDGE.length,dz=19/SOUTH_BRIDGE.length;
export function addSouthBridge(scene:T.Scene,world:R.World){
 const {length,width}=SOUTH_BRIDGE,n=40,step=length/n,dummy=new T.Object3D();
 const wood=new T.MeshStandardMaterial({color:'#ac8c62',roughness:.94}),dark=new T.MeshStandardMaterial({color:'#73583e',roughness:.95});
 const planks=new T.InstancedMesh(new T.BoxGeometry(step-.01,.18,width),wood,n),rails=new T.InstancedMesh(new T.BoxGeometry(step+.02,.18,.18),dark,n*2),posts=new T.InstancedMesh(new T.BoxGeometry(.22,1.25,.22),dark,18);
 const vertices:number[]=[],indices:number[]=[];
 for(let i=0;i<=n;i++){
  for(const side of [-width/2,width/2]){const p=southBridgePoint(i/n,side);vertices.push(p.x,p.y,p.z);}
  if(i<n){const a=i*2;indices.push(a,a+1,a+2,a+2,a+1,a+3);}
 }
 // Continuous side guards and deck share one static mesh collider.
 for(const side of [-1,1]){
  const offset=vertices.length/3;
  for(let i=0;i<=n;i++)for(const across of [-.12,.12])for(const rise of [-.02,1.18]){const p=southBridgePoint(i/n,side*(width/2+.12)+across);vertices.push(p.x,p.y+rise,p.z);}
  for(let i=0;i<n;i++)for(const [a,b] of [[0,1],[1,3],[3,2],[2,0]]){const v=offset+i*4;indices.push(v+a,v+b,v+4+a,v+4+a,v+b,v+4+b);}
 }
 world.createCollider(R.ColliderDesc.trimesh(new Float32Array(vertices),new Uint32Array(indices)).setFriction(.85));
 for(let i=0;i<n;i++){
  const t=(i+.5)/n,p=southBridgePoint(t),slope=Math.atan2(southBridgePoint(t+.5/n).y-southBridgePoint(t-.5/n).y,step);
  dummy.rotation.set(0,-Math.atan2(dz,dx),slope);dummy.position.set(p.x,p.y-.09,p.z);dummy.updateMatrix();planks.setMatrixAt(i,dummy.matrix);planks.setColorAt(i,new T.Color(i%3?'#ac8c62':'#91714f'));
  for(let s=0;s<2;s++){const q=southBridgePoint(t,(s?1:-1)*(width/2+.12));dummy.position.set(q.x,q.y+1.05,q.z);dummy.updateMatrix();rails.setMatrixAt(i*2+s,dummy.matrix);}
 }
 for(let i=0;i<9;i++)for(let s=0;s<2;s++){const p=southBridgePoint(i/8,(s?1:-1)*(width/2+.12));dummy.rotation.set(0,-Math.atan2(dz,dx),0);dummy.position.set(p.x,p.y+.48,p.z);dummy.updateMatrix();posts.setMatrixAt(i*2+s,dummy.matrix);}
 planks.name='south-bridge-deck';rails.name='south-bridge-rails';posts.name='south-bridge-posts';for(const m of [planks,rails,posts]){m.castShadow=m.receiveShadow=true;scene.add(m);}
 return planks;
}
