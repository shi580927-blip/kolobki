import * as T from 'three';
import R from '@dimforge/rapier3d-compat';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {ColourBatch} from './SunnyLandmarks';
import {heightAt} from '../core/terrain';
import type {PhysicsPlayer} from './PhysicsPlayer';

export const VALLEY_BOOSTS=[{x:60,z:63.5,yaw:Math.atan2(40,-3)},{x:41,z:24,yaw:Math.atan2(26,-36)}] as const;
export const VALLEY_HURDLE={x:46.9,z:-12.6,yaw:Math.atan2(-30,-44)};
type Actor={id:number;physics:PhysicsPlayer};
/** Small permanent play objects, independent of the current race. */
export class ValleyFeatures {
 private entered=new Set<string>();private activations=0;
 constructor(scene:T.Scene,world:R.World){
  const all=new ColourBatch();
  const place=(b:ColourBatch,p:{x:number;z:number;yaw:number})=>{
   const gx=(heightAt(p.x+.2,p.z)-heightAt(p.x-.2,p.z))/.4,gz=(heightAt(p.x,p.z+.2)-heightAt(p.x,p.z-.2))/.4;
   const up=new T.Vector3(-gx,1,-gz).normalize(),forward=new T.Vector3(Math.sin(p.yaw),gx*Math.sin(p.yaw)+gz*Math.cos(p.yaw),Math.cos(p.yaw)).normalize();
   const right=new T.Vector3().crossVectors(up,forward).normalize(),matrix=new T.Matrix4().makeBasis(right,up,forward).setPosition(p.x,heightAt(p.x,p.z)+.015,p.z);
   all.parts.push(b.finish().applyMatrix4(matrix));
  };
  for(const p of VALLEY_BOOSTS){
   const b=new ColourBatch();b.add(new RoundedBoxGeometry(5.4,.10,5.6,1,.04),'#7436a4',new T.Vector3(0,.05,0));
   for(const side of [-1,1])b.box(side*2.55,.12,0,.22,.10,5.4,'#4ed5cf');
   for(let j=0;j<3;j++)for(const side of [-1,1])b.box(side*.65,.13,-1.55+j*1.25,.22,.035,1.5,'#ffdc55',new T.Euler(0,-side*.8,0));
   place(b,p);
  }
  const hurdle=new ColourBatch();
  for(const side of [-1,1]){hurdle.cylinder(side*1.4,.6,0,.15,.20,1.2,'#85532d',7);hurdle.box(side*1.4,.08,0,.8,.16,.9,'#ba9959');}
  hurdle.box(0,.86,0,3.2,.65,.50,'#be793d');
  for(let i=-2;i<=2;i++)hurdle.box(i*.56,.86,-.265,.25,.49,.035,i%2?'#f3dca6':'#7840a0',new T.Euler(0,0,.3));
  place(hurdle,VALLEY_HURDLE);
  const geometry=all.finish(),mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:.72}));mesh.name='valley-permanent-boosts-and-hurdle';mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);
  const vertices=new Float32Array(geometry.getAttribute('position').array),indices=Uint32Array.from({length:vertices.length/3},(_,i)=>i);
  world.createCollider(R.ColliderDesc.trimesh(vertices,indices).setFriction(.8));
 }
 reset(){this.entered.clear();this.activations=0;}
 step(actors:readonly Actor[]){
  const inside=new Set<string>(),events:Actor[]=[];
  for(const actor of actors)for(const [i,p] of VALLEY_BOOSTS.entries()){
   const pos=actor.physics.current,dx=pos.x-p.x,dz=pos.z-p.z,c=Math.cos(p.yaw),s=Math.sin(p.yaw),x=dx*c-dz*s,z=dx*s+dz*c;
   if(Math.abs(x)>2.3||Math.abs(z)>2.5||Math.abs(pos.y-heightAt(pos.x,pos.z)-1)>1.1)continue;
   const key=actor.id+':'+i,v=actor.physics.body.linvel();
   if(this.entered.has(key)){inside.add(key);continue;}
   // Crossing the low front lip may briefly remove support. Arm the pad only
   // after a grounded activation, then keep it latched until the ball leaves.
   if(v.x*s+v.z*c<.6||!actor.physics.hasSurfaceSupport())continue;
   if(actor.physics.boost(s,c)){inside.add(key);this.activations++;events.push(actor);}
  }
  this.entered=inside;return events;
 }
 snapshot(){return {boostPads:VALLEY_BOOSTS.length,hurdles:1,activations:this.activations};}
}
