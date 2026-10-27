import * as T from 'three';
import R from '@dimforge/rapier3d-compat';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {makeLeafGeometry} from './BerryArt';
import {heightAt} from '../core/terrain';
export const ROCK_ARCH={x:-32,z:35,inner:3.8,outer:5.5,depth:2.6};
/** A physical, open landmark off the route, with irregular stone wedges. */
export function addRockArch(scene:T.Scene,world:R.World){
 const {x,z,inner,outer,depth}=ROCK_ARCH;
 const spring=Math.max(heightAt(x-inner-1,z),heightAt(x+inner+1,z),heightAt(x,z))+2.8;
 const pieces:T.BufferGeometry[]=[];const faces=[0,1,3,0,3,2,4,6,7,4,7,5,0,4,5,0,5,1,2,3,7,2,7,6,0,2,6,0,6,4,1,5,7,1,7,3];
 for(let i=0;i<12;i++){
  const a=i/12*Math.PI,b=(i+1)/12*Math.PI,ro=outer+.17*Math.sin(i*2.7),points:number[]=[];
  for(const side of [-1,1])for(const r of [inner,ro])for(const angle of [a,b])points.push(x+Math.cos(angle)*r,spring+Math.sin(angle)*r,z+side*(depth/2+.10*Math.sin(i*1.8)));
  const mid=(a+b)/2,cx=x+Math.cos(mid)*(inner+ro)/2,cy=spring+Math.sin(mid)*(inner+ro)/2;
  const local=points.map((v,j)=>v-(j%3===0?cx:j%3===1?cy:z));
  const hull=R.ColliderDesc.convexHull(new Float32Array(local));if(hull)world.createCollider(hull.setTranslation(cx,cy,z).setFriction(.8));
  const positions:number[]=[],colors:number[]=[];
  for(const index of faces){positions.push(...points.slice(index*3,index*3+3));const c=new T.Color(i%3===0?'#c9b794':i%3===1?'#b9aa91':'#d5c09a');colors.push(c.r,c.g,c.b);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();pieces.push(g);
 }
 const joined=mergeGeometries(pieces),arch=new T.Mesh(joined,new T.MeshStandardMaterial({vertexColors:true,roughness:.95}));pieces.forEach(g=>g.dispose());arch.name='valley-rock-arch';arch.castShadow=arch.receiveShadow=true;scene.add(arch);
 const pillars=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),new T.MeshStandardMaterial({color:'#c2af8a',roughness:.95}),2),dummy=new T.Object3D();
 for(let i=0;i<2;i++){const px=x+(i?1:-1)*(inner+outer)/2,ground=heightAt(px,z)-.2,h=spring-ground;dummy.position.set(px,ground+h/2,z);dummy.scale.set((outer-inner)*.8,h*.56,depth*.65);dummy.updateMatrix();pillars.setMatrixAt(i,dummy.matrix);world.createCollider(R.ColliderDesc.cuboid((outer-inner)*.55,h/2,depth/2).setTranslation(px,ground+h/2,z));}pillars.name='valley-rock-arch-pillars';pillars.castShadow=pillars.receiveShadow=true;scene.add(pillars);
 const moss=new T.InstancedMesh(new T.SphereGeometry(1,9,5),new T.MeshStandardMaterial({color:'#8fb84b',roughness:1}),3);
 for(let i=0;i<3;i++){const a=Math.PI*(.34+i*.16);dummy.position.set(x+Math.cos(a)*(outer+.04),spring+Math.sin(a)*(outer+.07),z+(i%2?.3:-.25));dummy.rotation.set(0,0,a-Math.PI/2);dummy.scale.set(.85,.09,.75);dummy.updateMatrix();moss.setMatrixAt(i,dummy.matrix);}moss.name='valley-rock-arch-moss';moss.receiveShadow=true;scene.add(moss);
 const plants=new T.InstancedMesh(makeLeafGeometry(),new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.9}),48);
 const petals=new T.InstancedMesh(new T.SphereGeometry(1,6,4),new T.MeshStandardMaterial({color:'#fff0cb',roughness:.9}),40),axis=new T.Vector3(0,0,1);
 for(let i=0;i<8;i++){const px=x+(i<4?-1:1)*(6.2+(i%2)*.5),pz=z+(i%4-1.5)*1.6,ground=heightAt(px,pz);for(let j=0;j<6;j++){const a=j*2.39996+i*.7;dummy.position.set(px,ground+.02,pz);dummy.quaternion.setFromUnitVectors(axis,new T.Vector3(Math.cos(a),.6+(j%2)*.5,Math.sin(a)).normalize());dummy.scale.setScalar(.45+(j%3)*.1);dummy.updateMatrix();plants.setMatrixAt(i*6+j,dummy.matrix);}for(let j=0;j<5;j++){const a=j*Math.PI*2/5;dummy.position.set(px+.12*Math.cos(a),ground+.3,pz+.12*Math.sin(a));dummy.rotation.set(0,a,0);dummy.scale.set(.11,.035,.08);dummy.updateMatrix();petals.setMatrixAt(i*5+j,dummy.matrix);}}
 plants.name='arch-base-plants';petals.name='arch-base-flowers';scene.add(plants,petals);
 return {spring};
}
