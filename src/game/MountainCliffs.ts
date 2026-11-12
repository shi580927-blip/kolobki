import * as T from 'three';
import R from '@dimforge/rapier3d-compat';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {heightAt} from '../core/terrain';
import {nearestExplorationPath} from '../core/valleyExploration';
import {naturalCliffMaterial} from './StoneArt';
import {scenicStone} from './ScenicStone';
import {addStoneGreenery} from './StoneGreenery';

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
  // Two offset courses create a weathered rock face, not a single flat shield.
  for(let j=-3;j<=3;j++)for(let shelf=0;shelf<2;shelf++){
   const u=j*p.width/3.7+(shelf?1.5:0),v=(shelf?-3.4:1.8)+1.25*Math.sin(j*1.9+p.seed);
   const q=at(u,v),rx=3.3+.6*Math.sin(j*2.7+p.seed),rz=shelf?2.8:3.5;
   if(Math.abs(q.x)>187||Math.abs(q.z)>187||nearestExplorationPath(q.x,q.z).distance<rx+11)continue;
   let low=heightAt(q.x,q.z),high=low;
   for(const du of [-rx,0,rx])for(const dv of [-rz,rz]){const b=at(u+du,v+dv);low=Math.min(low,heightAt(b.x,b.z));high=Math.max(high,heightAt(b.x,b.z));}
   const base=low-.8,top=Math.max(low+1.6,high+.35)-(shelf?1.1:0);
   const height=Math.max(1.4,top-base),layers=Math.ceil(height/6.5);
   for(let layer=0;layer<layers;layer++){
    const phase=p.seed*13+j*2+shelf+layer*1.9,offset=at(u+.65*Math.sin(phase),v+.55*Math.cos(phase*1.7));
    parts.push(scenicStone(offset.x,offset.z,rx*(.94+.14*Math.sin(phase)),rz,base+height*layer/layers-.18,base+height*(layer+1)/layers+.08,angle+.04*Math.sin(phase),phase,shelf===0&&layer===layers-1));
   }
  }
 }
 const geometry=mergeGeometries(parts);parts.forEach(p=>p.dispose());return geometry;
}
export function addMountainCliffs(scene:T.Scene,world:R.World){
 const geometry=mountainCliffGeometry(),material=naturalCliffMaterial();
 material.emissive.set('#b7aa92');material.emissiveIntensity=.12;
 const mesh=new T.Mesh(geometry,material);mesh.name='valley-mountain-rock-shoulders';mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
 addStoneGreenery(mesh,mountainCliffLayout().flatMap(p=>[-.35,0,.35].flatMap(u=>[-.3,0,.3].map(v=>({x:p.x+u*p.width,z:p.z+v*p.depth})))));
 const vertices=new Float32Array(geometry.getAttribute('position').array),indices=Uint32Array.from({length:vertices.length/3},(_,i)=>i);
 world.createCollider(R.ColliderDesc.trimesh(vertices,indices).setFriction(.9));return mesh;
}
