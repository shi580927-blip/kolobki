import {test} from 'node:test';
import assert from 'node:assert/strict';
import {POND,heightAt} from '../src/core/terrain';
import {nearestRoutePoint,ROUTE_HALF_WIDTH} from '../src/core/valleyRoute';
import {Scene} from 'three';
import R from '@dimforge/rapier3d-compat';
import {addPondStudy} from '../src/game/PondStudy';

test('shallow pond has a continuous shore and remains outside the driving corridor',()=>{
 assert.ok(nearestRoutePoint(POND.x,POND.z).distance>POND.radius+ROUTE_HALF_WIDTH);
 assert.ok(POND.water-heightAt(POND.x,POND.z)<.5);
 for(let a=0;a<Math.PI*2;a+=Math.PI/8){let last=heightAt(POND.x,POND.z);for(let r=.25;r<12;r+=.25){const next=heightAt(POND.x+Math.cos(a)*r,POND.z+Math.sin(a)*r);assert.ok(Math.abs(next-last)<.25,'shore slope remains gentle');last=next;}}
});
test('bridge has physical support and pond surface does not add a water collider',async()=>{
 await R.init();const world=new R.World({x:0,y:-18,z:0}),scene=new Scene();addPondStudy(scene,world);assert.equal(world.colliders.len(),1);const ray=new R.Ray({x:POND.x,y:POND.water+4,z:POND.z},{x:0,y:-1,z:0});world.step();assert.ok(world.castRay(ray,10,true));world.free();
});
