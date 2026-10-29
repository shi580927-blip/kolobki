import * as T from 'three';
import {stoneMaterial} from './StoneArt';
import {randomFrom} from '../core/skin';
import {makeBoulderGeometry} from './BoulderGeometry';
import R from '@dimforge/rapier3d-compat';
import {POND,heightAt,pondRadius} from '../core/terrain';
import {makeLeafGeometry} from './BerryArt';
/** One small bank composition; solid rocks leave the bridge and both shallow exits open. */
export function addShoreArt(scene:T.Scene,world:R.World){
 const dummy=new T.Object3D();
 const batch=(name:string,g:T.BufferGeometry,m:T.Material,n:number,shadow=false)=>{const mesh=new T.InstancedMesh(g,m,n);mesh.name=name;mesh.castShadow=shadow;mesh.receiveShadow=true;scene.add(mesh);return mesh;};
 const rockMaterial=stoneMaterial();
 const variants=Array.from({length:3},(_,i)=>batch('shore-rock-clusters-'+i,makeBoulderGeometry(i),rockMaterial,3,true));
 variants[2].count=2;
 const groups=[[-5,9.5,1.35],[-3.3,9.8,1.7],[-4,11.3,1.2],[.8,10.2,1.1],[2.2,10.8,1.65],[3.1,11.5,1.25],[5.4,9.2,.8],[5.9,10.4,1.0]];
 for(let i=0;i<8;i++){
  const [dx,dz,s]=groups[i],a=Math.atan2(dz,dx),r=pondRadius(a)*1.24,
   x=POND.x+Math.cos(a)*r,z=POND.z+Math.sin(a)*r,y=heightAt(x,z);
  dummy.position.set(x,y+s*.5,z);dummy.rotation.set(0,a*.7,0);dummy.scale.set(s*1.25,s*(i%2?.95:1.1),s*.9);dummy.updateMatrix();variants[i%3].setMatrixAt(Math.floor(i/3),dummy.matrix);
  // Conservative rounded support matches the visible mass without enclosing the bank.
  world.createCollider(R.ColliderDesc.ball(s*.75).setTranslation(x,y+s*.45,z).setFriction(.9));

 }
 const random=randomFrom(5028);
 const rubble=batch('shore-small-stones',makeBoulderGeometry(1),new T.MeshStandardMaterial({vertexColors:true,roughness:1}),30);
 const leaves=batch('shore-bank-leaves',makeLeafGeometry(7,4),new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:1}),168);
 const flowers=batch('shore-bank-flowers',new T.SphereGeometry(1,8,5),new T.MeshStandardMaterial({color:'#ffffff',roughness:1}),180);
 const hearts=batch('shore-flower-centers',new T.SphereGeometry(1,7,4),new T.MeshStandardMaterial({color:'#d7a62e',roughness:1}),36);
 const stems=batch('shore-flower-stems',new T.CylinderGeometry(.008,.012,1,5),new T.MeshStandardMaterial({color:'#5e8736',roughness:1}),36);
 const axis=new T.Vector3(0,0,1);let fi=0,li=0;
 // Unequal patches, with open sand between them; no evenly spaced ring of weeds.
 const patches=[[-5.7,7.5],[-3.6,8.9],[1.8,8.5],[4.9,7.0],[-7.0,-.3],[7.8,-1.0],[-5.6,-4.5],[5.9,-5.6]];
 for(let i=0;i<30;i++){
  const [dx,dz]=patches[i%patches.length],a=Math.atan2(dz,dx),r=pondRadius(a)*1.30,x=POND.x+Math.cos(a)*r+(random()-.5)*1.2,z=POND.z+Math.sin(a)*r+(random()-.5)*1.2,y=heightAt(x,z),s=.10+random()*.18;
  dummy.position.set(x,y+s*.12,z);dummy.rotation.set(0,random()*6.28,random()*.15);dummy.scale.set(s*1.3,s*.65,s);dummy.updateMatrix();rubble.setMatrixAt(i,dummy.matrix);
 }
 for(let i=0;i<28;i++){
  const [dx,dz]=patches[i%patches.length],a=Math.atan2(dz,dx),r=pondRadius(a)*1.30,x=POND.x+Math.cos(a)*r+(random()-.5)*1.2,z=POND.z+Math.sin(a)*r+(random()-.5)*1.2,y=heightAt(x,z);
  for(let j=0;j<6;j++){const a=random()*Math.PI*2;dummy.position.set(x,y+.025,z);dummy.quaternion.setFromUnitVectors(axis,new T.Vector3(Math.cos(a),.7+random(),Math.sin(a)).normalize());dummy.scale.setScalar(.20+random()*.17);dummy.updateMatrix();leaves.setMatrixAt(li++,dummy.matrix);}
 }
 for(let i=0;i<36;i++){
  const [dx,dz]=patches[i%patches.length],a=Math.atan2(dz,dx),r=pondRadius(a)*1.30,x=POND.x+Math.cos(a)*r+(random()-.5)*1.2,z=POND.z+Math.sin(a)*r+(random()-.5)*1.2,y=heightAt(x,z)+.16+random()*.12,size=.055+random()*.03;
  const ground=heightAt(x,z);dummy.position.set(x,(ground+y)/2,z);dummy.rotation.set(0,0,0);dummy.scale.set(1,y-ground,1);dummy.updateMatrix();stems.setMatrixAt(i,dummy.matrix);
  for(let j=0;j<5;j++){const a=j*Math.PI*2/5;dummy.position.set(x+Math.cos(a)*size,y,z+Math.sin(a)*size);dummy.rotation.set(0,a,0);dummy.scale.set(size*.95,.025,size*.6);dummy.updateMatrix();flowers.setMatrixAt(fi,dummy.matrix);flowers.setColorAt(fi++,new T.Color(i%4===0?'#e5adbd':i%4===1?'#efcf5d':'#fff6dc'));}
  dummy.position.set(x,y+.015,z);dummy.rotation.set(0,0,0);dummy.scale.set(size*.43,.025,size*.43);dummy.updateMatrix();hearts.setMatrixAt(i,dummy.matrix);
 }
}
