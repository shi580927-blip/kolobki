import {test} from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {Scene} from 'three';
import {createWorld} from '../src/game/World';
import {heightAt} from '../src/core/terrain';

test('rocky hill edges use the shared terrain collider without freestanding cliff blocks',async()=>{
 await R.init();
 const world=new R.World({x:0,y:-18,z:0}),scene=new Scene();
 createWorld(scene,world);
 world.step();
 assert.ok(scene.getObjectByName('valley-ground'));
 assert.equal(scene.getObjectByName('valley-mountain-rock-shoulders'),undefined);
 assert.equal(scene.getObjectByName('western-plateau-rock-buttresses'),undefined);
 assert.equal(scene.getObjectByName('valley-rock-arch'),undefined);
 assert.equal(scene.getObjectByName('valley-driveable-rock-arches'),undefined);
 assert.equal(scene.getObjectByName('lagoon-coastal-terraces'),undefined);
 for(const [x,z] of [[-22,-139],[-137,102],[-77,34]] as const){
  const hit=world.castRay(new R.Ray({x,y:100,z},{x:0,y:-1,z:0}),150,true);
  assert.ok(hit,`solid terrain at ${x},${z}`);
  assert.ok(Math.abs(100-hit.timeOfImpact-heightAt(x,z))<.12);
 }
 world.free();
});
