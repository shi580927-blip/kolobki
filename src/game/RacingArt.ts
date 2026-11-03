import * as T from 'three';
import R from '@dimforge/rapier3d-compat';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {ColourBatch} from './SunnyLandmarks';
import {heightAt} from '../core/terrain';
import {VALLEY_ROUTE,ROUTE_HALF_WIDTH,nearestRoutePoint} from '../core/valleyRoute';
import {nearestExplorationPath} from '../core/valleyExploration';

const purple='#6735a4',pink='#d84987',cyan='#43c3bd',cream='#fff1cf',dark='#303244',yellow='#f2bd3c';
/** Permanent racing furniture: a broad open circuit, not glowing lane stripes.
 * Kerbs have breaks at every exploration exit, and structures sit off the 12 m road. */
export function addRacingArt(scene:T.Scene,world:R.World){
 const b=new ColourBatch();let kerbs=0;
 for(let i=0;i<VALLEY_ROUTE.length;i++){
  const from=VALLEY_ROUTE[(i+VALLEY_ROUTE.length-1)%VALLEY_ROUTE.length],to=VALLEY_ROUTE[i],dx=to.x-from.x,dz=to.z-from.z,length=Math.hypot(dx,dz),nx=-dz/length,nz=dx/length,yaw=Math.atan2(dx,dz);
  for(let d=3;d<length-4;d+=4.2)for(const side of [-1,1]){
   const x=from.x+dx*d/length+nx*side*(ROUTE_HALF_WIDTH+.9),z=from.z+dz*d/length+nz*side*(ROUTE_HALF_WIDTH+.9);
   if(nearestExplorationPath(x,z).distance<4.6||nearestRoutePoint(x,z).distance<ROUTE_HALF_WIDTH+.6)continue;
   const normal=new T.Vector3(-(heightAt(x+.2,z)-heightAt(x-.2,z))/.4,1,-(heightAt(x,z+.2)-heightAt(x,z-.2))/.4).normalize();
   const forward=new T.Vector3(dx,0,dz).normalize();forward.y=-(normal.x*forward.x+normal.z*forward.z)/normal.y;forward.normalize();
   const right=new T.Vector3().crossVectors(normal,forward).normalize(),basis=new T.Matrix4().makeBasis(right,normal,forward),rotation=new T.Euler().setFromRotationMatrix(basis);
   b.add(new RoundedBoxGeometry(.72,.22,2.8,1,.055),(Math.floor(d/4.2)+i)%2?cream:side===1?purple:cyan,new T.Vector3(x,heightAt(x,z)+.13,z),rotation);kerbs++;
  }
  // Oversized corner boards: a dark outline and a chunky white forward arrow.
  for(const side of [-1,1]){
   const x=to.x+nx*side*9.2,z=to.z+nz*side*9.2,y=heightAt(x,z);
   if(nearestRoutePoint(x,z).distance<ROUTE_HALF_WIDTH+2.5||nearestExplorationPath(x,z).distance<3.5)continue;
   b.box(x,y+1.1,z,.24,2.2,.24,dark);
   b.box(x,y+2.2,z,2.2,1.4,.30,dark,new T.Euler(0,yaw,0));
   b.box(x,y+2.2,z,1.95,1.15,.34,i%2?purple:pink,new T.Euler(0,yaw,0));
   const next=VALLEY_ROUTE[(i+1)%VALLEY_ROUTE.length],turn=Math.sign(dz*(next.x-to.x)-dx*(next.z-to.z))||1;
   for(const tilt of [-1,1]){
    const q=new T.Vector3(0,tilt*.26,-.23).applyAxisAngle(new T.Vector3(0,1,0),yaw);
    b.box(x+q.x,y+2.2+q.y,z+q.z,.16,.87,.10,cream,new T.Euler(0,yaw,tilt*turn*.75));
   }
  }
 }
 function gate(x:number,z:number,yaw:number,start:boolean){
  const local=new ColourBatch(),c=Math.cos(yaw),s=Math.sin(yaw),ground=(u:number)=>heightAt(x+u*c,z-u*s),beam=Math.max(ground(-8.2),ground(8.2),heightAt(x,z))+6.7;
  for(const side of [-1,1]){
   const u=side*8.3,y=ground(u),height=beam-y;
   local.box(u,y+.25,0,2.0,.5,1.7,dark);local.box(u,y+height/2,0,1.05,height,1.0,side<0?purple:cyan,new T.Euler(0,0,-side*.055));
   for(let j=0;j<3;j++)local.box(u,y+1+j*.55,-.53,1.15,.22,.10,j%2?cream:yellow,new T.Euler(0,0,side*.25));
   local.box(u,beam+1.05,0,.12,2.1,.12,dark);local.box(u+side*.65,beam+1.4,0,1.25,.8,.08,side<0?pink:purple);
  }
  local.box(0,beam,0,18.3,1.45,1.15,dark);local.box(0,beam,-.61,17.7,1.12,.12,purple);
  for(let i=0;i<20;i++)for(let row=0;row<2;row++){
   if(start&&i>=6&&i<=13)continue;
   local.box(-8.1+i*.85,beam-.35+row*.70,-.70,.83,.68,.10,(i+row)%2?cream:dark);
  }
  if(start){
   const letters=[['111','100','100','100','111'],['111','010','010','010','010'],['010','101','111','101','101'],['110','101','110','100','100'],['111','010','010','010','010']];
   letters.forEach((rows,k)=>rows.forEach((row,j)=>[...row].forEach((pixel,i)=>{if(pixel==='1')local.box(2.75-k*1.12-i*.26,beam+.48-j*.23,-.79,.23,.20,.12,cream);})));
  }
  const g=local.finish();g.rotateY(yaw);g.translate(x,0,z);b.parts.push(g);
 }
 gate(0,7,0,true);
 const hill=VALLEY_ROUTE[2],before=VALLEY_ROUTE[1];gate((hill.x+before.x)/2,(hill.z+before.z)/2,Math.atan2(hill.x-before.x,hill.z-before.z),false);
 const geometry=b.finish(),material=new T.MeshStandardMaterial({vertexColors:true,roughness:.78}),mesh=new T.Mesh(geometry,material);mesh.name='valley-cartoon-race-furniture';mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);
 const vertices=new Float32Array(geometry.getAttribute('position').array),indices=Uint32Array.from({length:vertices.length/3},(_,i)=>i);
 world.createCollider(R.ColliderDesc.trimesh(vertices,indices).setFriction(.8));return {kerbs,arches:2};
}
