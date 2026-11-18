import * as T from 'three';
import R from '@dimforge/rapier3d-compat';
import {mergeGeometries,toCreasedNormals} from 'three/addons/utils/BufferGeometryUtils.js';
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';
import {RELIEF_MODULES} from '../core/landscapeRelief';
import {heightAt} from '../core/terrain';
import {nearestRoutePoint} from '../core/valleyRoute';
import {stoneColors,stoneMaterial} from './StoneArt';

/** Broad interlocking upper masses and lower shelves, rather than a ring of pillars.
 * Their merged visible triangles are also the physical surface. */
export function plateauCliffParts(){
 const p=RELIEF_MODULES[0],parts:T.BufferGeometry[]=[];
 const outline=[[-1,-.60],[-.45,-1],[.65,-.88],[1,-.30],[.72,.72],[-.55,1],[-1,.35]];
 function mass(x:number,z:number,a:number,width:number,depth:number,top:number,seed:number){
  const rotation=Math.PI/2-a,cos=Math.cos(rotation),sin=Math.sin(rotation);
  const world=(u:number,v:number)=>({x:x+u*cos+v*sin,z:z-u*sin+v*cos});
  let base=heightAt(x,z);
  for(const [u,v] of outline){const q=world(u*width*1.08,v*depth*1.08);base=Math.min(base,heightAt(q.x,q.z));}
  base-=1.0;
  const h=top-base,points:T.Vector3[]=[];
  for(let ring=0;ring<3;ring++)for(let j=0;j<outline.length;j++){
   const [u,v]=outline[j],t=ring/2;
   const broad=ring===0?1.08:ring===1?1.02+.10*Math.sin(seed):.78+.09*Math.cos(seed*2);
   const leanX=t*(.65*Math.sin(seed*1.7)),leanZ=t*(.55*Math.cos(seed*2.3));
   points.push(new T.Vector3(u*width*broad+leanX,ring===0?0:ring===1?h*.48:h+.18*Math.sin(j*1.9+seed),v*depth*broad+leanZ));
  }
  const raw=new ConvexGeometry(points),g=toCreasedNormals(raw,.50);raw.dispose();stoneColors(g,h-.26);
  const color=g.getAttribute('color'),normal=g.getAttribute('normal'),pos=g.getAttribute('position');
  const tint=.94+.10*(.5+.5*Math.sin(seed*2.4));
  for(let j=0;j<color.count;j++)if(normal.getY(j)<.65&&pos.getY(j)<h-.3){
   const shade=tint*(.88+.12*Math.min(1,pos.getY(j)/h));
   color.setXYZ(j,color.getX(j)*shade,color.getY(j)*shade,color.getZ(j)*shade);
  }
  g.rotateY(rotation);g.translate(x,base,z);parts.push(g);
 }
 // Uneven angular spacing, depth and heights break both skyline and wall rhythm.
 const bays=[
  [0,15.8,3.5,2.7,.45],[-.37,16.0,3.0,2.4,-1.0],[-.75,14.3,4.0,3.1,.8],
  [-1.20,16.0,3.7,2.7,-.7],[-1.67,14.8,4.1,3.0,.55],
  [-2.16,15.5,3.2,2.6,-1.15],[-2.60,14.8,4.0,2.9,.3],[-3.12,16.0,3.5,2.7,-.7],
 ];
 bays.forEach(([a,r,width,depth,offset],i)=>{
  const x=p.x+Math.cos(a)*r,z=p.z+Math.sin(a)*r;
  if(nearestRoutePoint(x,z).distance<22)return;
  const innerX=p.x+Math.cos(a)*(r-3.8),innerZ=p.z+Math.sin(a)*(r-3.8);
  const top=heightAt(innerX,innerZ)+offset;
  mass(x,z,a,width,depth,top,i+1);
  // Lower, offset shelf supports the upper rock and creates a real grass ledge.
  const q=a+(i%2?.10:-.07),outer=r+3.1,ox=p.x+Math.cos(q)*outer,oz=p.z+Math.sin(q)*outer;
  const lowTop=Math.min(top-2.0,heightAt(ox,oz)+2.1+(i%3)*.45);
  mass(ox,oz,q,width*(.72+(i%2)*.12),depth*.72,lowTop,i+13);
 });
 return {parts};
}
export function addPlateauCliffs(scene:T.Scene,world:R.World){
 const {parts}=plateauCliffParts();
 if(!parts.length)return;
 const geometry=mergeGeometries(parts);parts.forEach(p=>p.dispose());
 const material=stoneMaterial();
 // A restrained ambient fill keeps the shaded side readable without extra lights/passes.
 material.emissive.set('#a99c87');material.emissiveIntensity=.16;
 const mesh=new T.Mesh(geometry,material);mesh.name='western-plateau-rock-buttresses';
 mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
 const vertices=new Float32Array(geometry.getAttribute('position').array);
 const indices=Uint32Array.from({length:vertices.length/3},(_,i)=>i);
 world.createCollider(R.ColliderDesc.trimesh(vertices,indices).setFriction(.9));
}
