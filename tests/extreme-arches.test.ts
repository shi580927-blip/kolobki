import {test} from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {Scene,Vector3,Raycaster,DoubleSide} from 'three';
import {EXTREME_ARCHES,archDeckHeight,addExtremeArches} from '../src/game/ExtremeArches';
import {heightAt} from '../src/core/terrain';
test('extreme arches have open lower passages and matching visible and physical upper routes',async()=>{
 await R.init();const w=new R.World({x:0,y:-18,z:0}),scene=new Scene(),mesh=addExtremeArches(scene,w);mesh.material.side=DoubleSide;mesh.updateMatrixWorld(true);w.step();
 for(const a of EXTREME_ARCHES){
  for(const u of [-4,0,4]){
   const origin={x:a.x+u,y:heightAt(a.x+u,a.z)+1.15,z:a.z-10};
   assert.equal(w.castRay(new R.Ray(origin,{x:0,y:0,z:1}),20,true),null,'wide lower passage');
  }
  for(let u=-a.halfLength+1;u<a.halfLength;u+=2){
   const origin=new Vector3(a.x+u,60,a.z),direction=new Vector3(0,-1,0),visual=new Raycaster(origin,direction).intersectObject(mesh)[0],physical=w.castRay(new R.Ray(origin,direction),100,true);
   assert.ok(visual&&physical);assert.ok(Math.abs(visual.distance-physical.timeOfImpact)<.003);
   assert.ok(Math.abs(60-physical.timeOfImpact-archDeckHeight(a,a.x+u))<.015);
  }
 }
 w.free();
});
test('real player drives below both arches and across their roofs from ground ramps',async()=>{
 const {createWorld}=await import('../src/game/World'),{PhysicsPlayer}=await import('../src/game/PhysicsPlayer'),{EventBus}=await import('../src/core/events');await R.init();
 for(const a of EXTREME_ARCHES)for(const upper of [false,true]){
  const w=new R.World({x:0,y:-18,z:0});w.timestep=1/60;createWorld(new Scene(),w);
  const start=upper?{x:a.x-a.halfLength-3,z:a.z}:{x:a.x,z:a.z-14},target=upper?{x:a.x+a.halfLength+3,z:a.z}:{x:a.x,z:a.z+14};
  const p=new PhysicsPlayer(w,new EventBus(),start),forward=new Vector3(0,0,1);let arrived=false,roofVisited=false;
  for(let tick=0;tick<3600;tick++){
   const dx=target.x-p.current.x,dz=target.z-p.current.z,d=Math.hypot(dx,dz);if(d<1){arrived=true;break;}
   const amount=Math.min(.65,d/5);
   p.step(1/60,{x:-dx/d*amount,z:-dz/d*amount,jump:false,dash:false,touchDrive:true},forward);w.step();p.sync();
   if(upper&&Math.abs(p.current.x-a.x)<5){roofVisited=true;assert.ok(p.current.y>archDeckHeight(a,p.current.x)+.7,'actually crosses the roof');}
   assert.ok(p.current.y>heightAt(p.current.x,p.current.z)+.4,'no terrain tunnelling');
  }
  assert.ok(arrived,`${a.name} ${upper?'upper':'lower'} blocked: ${p.current.toArray()}`);if(upper)assert.ok(roofVisited);w.free();
 }
});
