import * as T from 'three';
import R from '@dimforge/rapier3d-compat';
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';
import {mergeGeometries,toCreasedNormals} from 'three/addons/utils/BufferGeometryUtils.js';
import {heightAt} from '../core/terrain';
import {nearestExplorationPath} from '../core/valleyExploration';
import {stoneColors,stoneMaterial} from './StoneArt';

/** Irregular broad shoulders follow the three major massifs, leaving their
 * grassy approaches and the southern beginner meadow open. */
export function mountainCliffLayout(){
 const sites=[
  [-63,-136,23,13,2.4],[-22,-139,27,15,1.8],[22,-137,18,12,3.2],
  [-137,83,24,13,2.1],[-135,123,20,15,3.0],
  [140,-89,22,14,2.7],[145,-43,26,12,1.9],
 ];
 return sites.map(([x,z,width,depth,rise],i)=>({x,z,width,depth,rise,seed:i+1}))
  .filter(p=>nearestExplorationPath(p.x,p.z).distance>p.width+12);
}
export function mountainCliffGeometry(){
 const parts:T.BufferGeometry[]=[];
 for(const p of mountainCliffLayout()){
  const gx=heightAt(p.x+1,p.z)-heightAt(p.x-1,p.z),gz=heightAt(p.x,p.z+1)-heightAt(p.x,p.z-1);
  const angle=Math.atan2(gx,gz),c=Math.cos(angle),s=Math.sin(angle);
  const at=(u:number,v:number)=>({x:p.x+u*c+v*s,z:p.z-u*s+v*c});
  const outline=[[-1,-.55],[-.62,-1],[.4,-.92],[1,-.28],[.86,.67],[.14,1],[-.84,.72]];
  let base=heightAt(p.x,p.z);
  for(const [u,v] of outline){const q=at(u*p.width,v*p.depth);base=Math.min(base,heightAt(q.x,q.z)-1.2);}
  const top=heightAt(p.x,p.z)+p.rise,points:T.Vector3[]=[];
  for(let ring=0;ring<3;ring++)for(let j=0;j<outline.length;j++){
   const [u,v]=outline[j],scale=ring===0?1.08:ring===1?1:.8;
   const q=at(u*p.width*scale+ring*.24*Math.sin(p.seed),v*p.depth*scale);
   const surface=heightAt(q.x,q.z)+.55+.35*Math.sin(j*1.7+p.seed);
   points.push(new T.Vector3(q.x,ring===0?base:ring===1?base+(surface-base)*.48:surface,q.z));
  }
  const raw=new ConvexGeometry(points),g=toCreasedNormals(raw,.58);raw.dispose();stoneColors(g,top-.42);parts.push(g);
 }
 const geometry=mergeGeometries(parts);parts.forEach(p=>p.dispose());return geometry;
}
export function addMountainCliffs(scene:T.Scene,world:R.World){
 const geometry=mountainCliffGeometry(),material=stoneMaterial();
 material.emissive.set('#b7aa92');material.emissiveIntensity=.12;
 const mesh=new T.Mesh(geometry,material);mesh.name='valley-mountain-rock-shoulders';mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
 const vertices=new Float32Array(geometry.getAttribute('position').array),indices=Uint32Array.from({length:vertices.length/3},(_,i)=>i);
 world.createCollider(R.ColliderDesc.trimesh(vertices,indices).setFriction(.9));return mesh;
}
