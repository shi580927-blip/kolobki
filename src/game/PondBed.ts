import * as T from 'three';
import {POND,heightAt,pondRadius} from '../core/terrain';
import {randomFrom} from '../core/skin';
import {makeBoulderGeometry} from './BoulderGeometry';

/** Low decorative stones stay beneath the water and do not change the solid floor. */
export function pondBedLayout(){
 const random=randomFrom(571030),stones:{x:number;y:number;z:number;sx:number;sy:number;sz:number;angle:number}[]=[];
 const angles=[.25,1.05,1.85,2.55,3.7,4.8];
 for(let i=0;i<120&&stones.length<24;i++){
  const a=angles[i%angles.length],r=pondRadius(a)*(.47+random()*.13);
  const x=POND.x+Math.cos(a)*r+(random()-.5)*1.8,z=POND.z+Math.sin(a)*r+(random()-.5)*1.8;
  const ground=heightAt(x,z),depth=POND.water-ground;
  if(depth<.18||Math.abs(z-POND.z)<3.3||stones.some(p=>Math.hypot(p.x-x,p.z-z)<.65))continue;
  stones.push({x,y:ground+.02,z,sx:.43+random()*.45,sy:.10+random()*.045,sz:.38+random()*.35,angle:random()*Math.PI*2});
 }
 return stones;
}
export function addPondBed(scene:T.Scene){
 const layout=pondBedLayout(),g=makeBoulderGeometry(1),material=new T.MeshStandardMaterial({vertexColors:true,roughness:1});
 const stones=new T.InstancedMesh(g,material,layout.length),dummy=new T.Object3D();
 stones.name='pond-submerged-stones';stones.receiveShadow=true;
 layout.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.angle,0);dummy.scale.set(p.sx,p.sy,p.sz);dummy.updateMatrix();stones.setMatrixAt(i,dummy.matrix);stones.setColorAt(i,new T.Color(['#a4b5a1','#b9c3a7','#8fa89e'][i%3]));});
 scene.add(stones);return stones;
}
