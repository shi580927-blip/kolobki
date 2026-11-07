import * as T from 'three';
import R from '@dimforge/rapier3d-compat';
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';
import {mergeGeometries,toCreasedNormals} from 'three/addons/utils/BufferGeometryUtils.js';
import {COAST_TERRACES} from '../core/coast';
import {heightAt} from '../core/terrain';
import {stoneColors,stoneMaterial} from './StoneArt';

/** Broad overlapping rock shoulders and low shelves, with no grass needles. */
export function coastalCliffGeometry(){
 const parts:T.BufferGeometry[]=[];
 const masses:{x:number;z:number;a:number;width:number;depth:number;top:number;shape:number;cap:number}[]=[];
 for(const [index,c] of COAST_TERRACES.entries())for(let j=-1;j<=1;j++){
  const a=(c.facing===1?0:Math.PI)+j*.43,ca=Math.cos(a),sa=Math.sin(a);
  for(let shelf=0;shelf<2;shelf++){
   const r=shelf?.94:.72,x=c.x+ca*c.rx*r,z=c.z+sa*c.rz*r;
   const width=shelf?2.5:3.6+((j+1)%2)*.5,depth=shelf?1.6:2.7;
   const top=shelf?Math.min(heightAt(c.x+ca*c.rx*.48,c.z+sa*c.rz*.48)-1.8,heightAt(x,z)+1.5):heightAt(c.x+ca*c.rx*.48,c.z+sa*c.rz*.48)+.1;
   masses.push({x,z,a,width,depth,top,shape:j,cap:index+j});
  }
 }
 // Flanking shoulders overlap the spring's stone sides, never its east-facing flow.
 // The rear mass sits behind the source and ties both sides into the dry ridge.
 for(const [x,z,width,depth] of [
  [-62.7,35.7,3.0,2.0],[-63.4,38.0,2.4,1.7],[-64.7,42.1,3.3,1.8],
  [-63.0,46.4,2.5,1.9],[-61.6,49.7,3.0,2.0],
 ])masses.push({x,z,a:0,width,depth,top:heightAt(x-2.2,z)+.12,shape:z,cap:z});
 for(const {x,z,a,width,depth,top,shape,cap} of masses){
   const ca=Math.cos(a),sa=Math.sin(a);
   let base=heightAt(x,z);
   for(let k=0;k<7;k++){const b=k/7*Math.PI*2;const u=Math.cos(b)*width,v=Math.sin(b)*depth;base=Math.min(base,heightAt(x-sa*u+ca*v,z+ca*u+sa*v));}
   base=Math.min(base-.7,top-1.5);const h=top-base,points:T.Vector3[]=[];
   for(let ring=0;ring<3;ring++)for(let k=0;k<7;k++){
    const b=k/7*Math.PI*2+.1,scale=ring===0?1.08:ring===1?1:.82+.05*Math.sin(k*2+shape),u=Math.cos(b)*width*scale,v=Math.sin(b)*depth*scale;
    points.push(new T.Vector3(x-sa*u+ca*v+ring*.12*ca,base+h*ring/2+(ring===2?.12*Math.sin(k*2+cap):0),z+ca*u+sa*v+ring*.12*sa));
   }
   const raw=new ConvexGeometry(points),g=toCreasedNormals(raw,.5);raw.dispose();stoneColors(g);
   const normal=g.getAttribute('normal'),position=g.getAttribute('position'),colors=g.getAttribute('color');
   const green=new T.Color('#96b847');
   for(let k=0;k<position.count;k++)if(normal.getY(k)>.72&&position.getY(k)>top-.4)colors.setXYZ(k,green.r,green.g,green.b);
   parts.push(g);
 }
 const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());return g;
}
export function addCoastalCliffs(scene:T.Scene,world:R.World){
 const g=coastalCliffGeometry(),m=stoneMaterial();m.emissive.set('#a99c87');m.emissiveIntensity=.16;
 const mesh=new T.Mesh(g,m);mesh.name='lagoon-coastal-terraces';mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);
 const vertices=new Float32Array(g.getAttribute('position').array),indices=Uint32Array.from({length:vertices.length/3},(_,i)=>i);
 world.createCollider(R.ColliderDesc.trimesh(vertices,indices).setFriction(.9));return mesh;
}
