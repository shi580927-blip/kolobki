import {test} from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {POND} from '../src/core/terrain';
import {applyPondWater,submergedFraction} from '../src/game/WaterPhysics';

test('spherical submersion is continuous and clamped',()=>{
 assert.equal(submergedFraction(2,0),0);assert.equal(submergedFraction(0,0),.5);assert.equal(submergedFraction(-2,0),1);
 let last=1;for(let y=-2;y<=2;y+=.05){const f=submergedFraction(y,0);assert.ok(f<=last+1e-8&&f>=0&&f<=1);last=f;}
});
test('water damps an entering body and buoyancy settles it without a floor',async()=>{
 await R.init();const world=new R.World({x:0,y:-18,z:0});world.timestep=1/60;
 const b=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(POND.x,POND.water,POND.z));world.createCollider(R.ColliderDesc.ball(1).setDensity(1),b);b.setLinvel({x:2,y:-3,z:0},true);
 let settledY=0;for(let i=0;i<600;i++){applyPondWater(b,1/60);world.step();if(i===540)settledY=b.translation().y;}
 assert.ok(Math.abs(b.linvel().x)<.1);assert.ok(Math.abs(b.linvel().y)<.2);assert.ok(Math.abs(submergedFraction(b.translation().y,POND.water)-.625)<.03);assert.ok(Math.abs(b.translation().y-settledY)<.02);world.free();
});
test('dry land and a ball above the bridge receive no water impulse',async()=>{
 await R.init();const world=new R.World({x:0,y:-18,z:0});
 for(const p of [{x:0,y:1,z:0},{x:POND.x,y:POND.water+1.23,z:POND.z}]){const b=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(p.x,p.y,p.z));world.createCollider(R.ColliderDesc.ball(1),b);b.setLinvel({x:4,y:2,z:1},true);assert.equal(applyPondWater(b,1/60),0);assert.deepEqual({...b.linvel()},{x:4,y:2,z:1});}world.free();
});
