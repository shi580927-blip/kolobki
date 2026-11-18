import * as T from 'three';
import R from '@dimforge/rapier3d-compat';
import {mergeGeometries,toCreasedNormals} from 'three/addons/utils/BufferGeometryUtils.js';
import {heightAt} from '../core/terrain';
import {stoneColors,stoneMaterial} from './StoneArt';
import {scenicStone} from './ScenicStone';
import {addStoneGreenery} from './StoneGreenery';

export const EXTREME_ARCHES=[
 {name:'north foothill crossing',x:-22,z:-102,halfLength:46,depth:6.4},
 {name:'southern meadow crossing',x:20,z:110,halfLength:42,depth:5.8},
] as const;
export type ExtremeArch=typeof EXTREME_ARCHES[number];
export function archRoofHeight(a:ExtremeArch){
 let floor=-Infinity;
 for(let x=-8;x<=8;x+=2)for(const z of [-a.depth/2,0,a.depth/2])floor=Math.max(floor,heightAt(a.x+x,a.z+z));
 return floor+8.5;
}
export function archDeckHeight(a:ExtremeArch,x:number){
 const u=x-a.x,roof=archRoofHeight(a);
 if(Math.abs(u)<=11)return roof+.12*Math.cos(u/11*Math.PI/2);
 const t=Math.min(1,(Math.abs(u)-11)/(a.halfLength-11));
 const end=heightAt(a.x+Math.sign(u)*a.halfLength,a.z)+.08;
 return roof+(end-roof)*t*t*(3-2*t);
}
/** A real open vault and two continuous grassy ramps form one rock mass.
 * Lower passage runs along Z; the exposed upper route crosses along X. */
export function extremeArchGeometry(a:ExtremeArch){
 const shape=new T.Shape(),roof=archRoofHeight(a),floor=(u:number)=>heightAt(a.x+u,a.z)-1.5;
 shape.moveTo(-a.halfLength,archDeckHeight(a,a.x-a.halfLength));
 for(let u=-a.halfLength+1;u<a.halfLength;u++)shape.lineTo(u,archDeckHeight(a,a.x+u));
 shape.lineTo(a.halfLength,archDeckHeight(a,a.x+a.halfLength));
 for(let u=a.halfLength;u>=8;u-=2)shape.lineTo(u,floor(u));
 shape.lineTo(8,floor(8));
 shape.lineTo(8,roof-6.5);
 shape.bezierCurveTo(8,roof-4.1,5.4,roof-3.65,0,roof-3.5);
 shape.bezierCurveTo(-5.4,roof-3.65,-8,roof-4.1,-8,roof-6.5);
 shape.lineTo(-8,floor(-8));
 for(let u=-8;u>=-a.halfLength;u-=2)shape.lineTo(u,floor(u));
 shape.lineTo(-a.halfLength,floor(-a.halfLength));shape.closePath();
 const raw=new T.ExtrudeGeometry(shape,{depth:a.depth,bevelEnabled:false,curveSegments:12,steps:1});
 const position=raw.getAttribute('position');
 for(let i=0;i<position.count;i++){
  const u=position.getX(i),edge=position.getZ(i)/a.depth*2-1;
  position.setZ(i,a.depth/2+edge*(a.depth/2+.28*Math.sin(u*.24)+.12*Math.sin(u*.73)));
 }
 const g=toCreasedNormals(raw,.8);raw.dispose();stoneColors(g,roof-.3);
 g.deleteAttribute('uv');g.translate(a.x,0,a.z-a.depth/2);
 const parts:T.BufferGeometry[]=[g];
 // Rock buttresses and offset foot stones give the vault substantial eroded
 // shoulders, while keeping the complete lower opening and upper track free.
 for(const side of [-1,1])for(let i=0;i<4;i++)for(const face of [-1,1]){
  const u=side*(11.4+i*5.4),x=a.x+u,z=a.z+face*(a.depth/2+.6+(i%2)*.3);
  const base=heightAt(x,z)-.55,top=Math.min(archDeckHeight(a,x)-.35,base+3.2+(3-i)*1.1);
  if(top<base+.6)continue;
  parts.push(scenicStone(x,z,2.7+(i%2)*.45,1.8,base,top,side*.13,i+face*4+side*7));
 }
 const joined=mergeGeometries(parts);parts.forEach(p=>p.dispose());return joined;
}
export function addExtremeArches(scene:T.Scene,world:R.World){
 const parts=EXTREME_ARCHES.map(extremeArchGeometry),geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());
 const material=stoneMaterial(EXTREME_ARCHES.map(a=>({x:a.x,y:archRoofHeight(a)-6.5,z:a.z,rx:8,ry:3.4}))),mesh=new T.Mesh(geometry,material);mesh.name='valley-driveable-rock-arches';mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);
 addStoneGreenery(mesh,EXTREME_ARCHES.flatMap(a=>[-1,1].flatMap(side=>[12,22].map(u=>({x:a.x+side*u,z:a.z-a.depth/2-.4})))));
 const vertices=new Float32Array(geometry.getAttribute('position').array),indices=Uint32Array.from({length:vertices.length/3},(_,i)=>i);
 world.createCollider(R.ColliderDesc.trimesh(vertices,indices).setFriction(.9));return mesh;
}
