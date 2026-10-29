import * as T from 'three';
import R from '@dimforge/rapier3d-compat';
import {mergeGeometries,toCreasedNormals} from 'three/addons/utils/BufferGeometryUtils.js';
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';
import {RELIEF_MODULES} from '../core/landscapeRelief';
import {heightAt} from '../core/terrain';
import {nearestRoutePoint} from '../core/valleyRoute';
import {stoneColors,stoneMaterial} from './StoneArt';

/** Irregular buttresses give the western plateau a broken rock silhouette.
 * The southern approach stays open; each visible triangle is also physical. */
export function plateauCliffParts(){
 const p=RELIEF_MODULES[0],parts:T.BufferGeometry[]=[],feet:T.Vector3[]=[];
 for(let i=0;i<24;i++){
  const a=i*Math.PI*2/24;
  if(Math.sin(a)>.24)continue;
  const r=p.radius*(.92+.045*Math.sin(a*3+.6)),x=p.x+Math.cos(a)*r,z=p.z+Math.sin(a)*r;
  if(nearestRoutePoint(x,z).distance<20)continue;
  const outerX=p.x+Math.cos(a)*(r+2.4),outerZ=p.z+Math.sin(a)*(r+2.4);
  const innerX=p.x+Math.cos(a)*(r-3.8),innerZ=p.z+Math.sin(a)*(r-3.8);
  // Sink every foot below the lowest terrain under its full footprint,
  // not just one point on the uneven outer slope.
  let base=heightAt(x,z);
  for(let j=0;j<16;j++){
   const q=j*Math.PI/8;
   base=Math.min(base,heightAt(x+Math.cos(q)*3.6,z+Math.sin(q)*3.6));
  }
  base-=1.25;
  const top=heightAt(innerX,innerZ)+.12;
  const h=top-base;if(h<2)continue;
  const width=2.05+.30*Math.sin(i*2.1),depth=2.9,points:T.Vector3[]=[];
  for(let ring=0;ring<3;ring++)for(let j=0;j<5;j++){
   const q=j*Math.PI*2/5,scale=ring===0?1.1:ring===1?1:.84;
   const y=ring===0?0:ring===1?h*.56:h+Math.sin(i*2+j)*.22;
   points.push(new T.Vector3(Math.cos(q)*width*scale+(ring===2?-.25:0),y,Math.sin(q)*depth*scale));
  }
  const raw=new ConvexGeometry(points),g=toCreasedNormals(raw,.55);raw.dispose();
  stoneColors(g,h-.24);
  g.rotateY(Math.PI/2-a);g.translate(x,base,z);parts.push(g);
  feet.push(new T.Vector3(outerX,heightAt(outerX,outerZ),outerZ));
 }
 return {parts,feet};
}
export function addPlateauCliffs(scene:T.Scene,world:R.World){
 const {parts,feet}=plateauCliffParts();
 if(!parts.length)return;
 const geometry=mergeGeometries(parts);parts.forEach(p=>p.dispose());
 const mesh=new T.Mesh(geometry,stoneMaterial());mesh.name='western-plateau-rock-buttresses';
 mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
 const vertices=new Float32Array(geometry.getAttribute('position').array);
 const indices=Uint32Array.from({length:vertices.length/3},(_,i)=>i);
 world.createCollider(R.ColliderDesc.trimesh(vertices,indices).setFriction(.9));
 // Opaque three-dimensional tufts at the feet, batched separately from the rock.
 const blades=new T.ConeGeometry(.065,.65,4),grass=new T.InstancedMesh(blades,new T.MeshStandardMaterial({color:'#7eac3c',roughness:1}),feet.length*7);
 grass.name='western-plateau-foot-grass';grass.receiveShadow=true;
 const dummy=new T.Object3D();
 feet.forEach((p,i)=>{for(let j=0;j<7;j++){
  const a=j*2.39996+i,x=p.x+Math.cos(a)*(.25+j*.13),z=p.z+Math.sin(a)*(.25+j*.13),s=.65+.45*(.5+.5*Math.sin(i*3+j));
  dummy.position.set(x,heightAt(x,z)+.29*s,z);dummy.rotation.set(.24*Math.sin(a),a,.24*Math.cos(a));dummy.scale.set(s,s,s);dummy.updateMatrix();grass.setMatrixAt(i*7+j,dummy.matrix);
 }});scene.add(grass);
}
