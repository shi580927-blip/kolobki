import * as T from 'three';
import R from '@dimforge/rapier3d-compat';
import {mergeGeometries,toCreasedNormals} from 'three/addons/utils/BufferGeometryUtils.js';
import {heightAt} from '../core/terrain';
import {stoneColors,stoneMaterial} from './StoneArt';

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
 shape.bezierCurveTo(8,roof-3,5.4,roof-2.2,0,roof-2.1);
 shape.bezierCurveTo(-5.4,roof-2.2,-8,roof-3,-8,roof-6.5);
 shape.lineTo(-8,floor(-8));
 for(let u=-8;u>=-a.halfLength;u-=2)shape.lineTo(u,floor(u));
 shape.lineTo(-a.halfLength,floor(-a.halfLength));shape.closePath();
 const raw=new T.ExtrudeGeometry(shape,{depth:a.depth,bevelEnabled:false,curveSegments:12,steps:1});
 const g=toCreasedNormals(raw,.8);raw.dispose();stoneColors(g,roof-.3);
 g.translate(a.x,0,a.z-a.depth/2);return g;
}
export function addExtremeArches(scene:T.Scene,world:R.World){
 const parts=EXTREME_ARCHES.map(extremeArchGeometry),geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());
 const material=stoneMaterial(),mesh=new T.Mesh(geometry,material);mesh.name='valley-driveable-rock-arches';mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);
 const vertices=new Float32Array(geometry.getAttribute('position').array),indices=Uint32Array.from({length:vertices.length/3},(_,i)=>i);
 world.createCollider(R.ColliderDesc.trimesh(vertices,indices).setFriction(.9));return mesh;
}
