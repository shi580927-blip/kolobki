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
