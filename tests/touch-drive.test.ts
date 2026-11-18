import {test} from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {Vector3} from 'three';
import {PhysicsPlayer} from '../src/game/PhysicsPlayer';
import {EventBus} from '../src/core/events';
import {heightAt} from '../src/core/terrain';
import {joystickAxes} from '../src/game/Input';
const dt=1/60,forward=new Vector3(0,0,1);
const control=(z=0,dash=false)=>({x:0,z,jump:false,dash,touchDrive:true});
async function fixture(floor=true){await R.init();const world=new R.World({x:0,y:-18,z:0});if(floor)world.createCollider(R.ColliderDesc.cuboid(200,.1,200).setTranslation(0,heightAt(0,0)-.1,0).setFriction(.85));const p=new PhysicsPlayer(world,new EventBus());const tick=(input=control())=>{p.step(dt,input,forward);world.step();p.sync();};for(let i=0;i<30;i++)tick();return{world,p,tick};}
test('joystick dead zone is stable, diagonals stay proportional and full deflection is bounded',()=>{assert.deepEqual(joystickAxes(.05,.05),{x:0,z:0});const half=joystickAxes(0,-.5);assert.ok(-half.z>.4&&-half.z<.5);const diag=joystickAxes(2,-2);assert.ok(Math.abs(Math.hypot(diag.x,diag.z)-1)<1e-12);assert.equal(diag.x,-diag.z);});
test('touch ground drive holds a low speed at small deflection and brakes on release',async()=>{const s=await fixture();for(let i=0;i<180;i++)s.tick(control(-.25));const slow=Math.abs(s.p.body.linvel().z);for(let i=0;i<180;i++)s.tick(control(-1));const fast=Math.abs(s.p.body.linvel().z);assert.ok(slow>.4&&slow<3,`slow ${slow}`);assert.ok(fast>slow*3,`slow ${slow}, fast ${fast}`);for(let i=0;i<60;i++)s.tick();assert.ok(Math.hypot(s.p.body.linvel().x,s.p.body.linvel().z)<.5,'released stick brakes within one second');s.world.free();});
test('reverse and sideways input remove old ground momentum instead of prolonged sliding',async()=>{const s=await fixture();for(let i=0;i<120;i++)s.tick(control(-1));for(let i=0;i<60;i++)s.tick(control(1));assert.ok(s.p.body.linvel().z<-.5,'reverse has braked and changed direction');for(let i=0;i<90;i++)s.tick({x:1,z:0,jump:false,dash:false,touchDrive:true});assert.ok(Math.abs(s.p.body.linvel().z)<.5,'old forward momentum is removed');assert.ok(s.p.body.linvel().x< -3,'new lateral input drives correctly');s.world.free();});
test('neutral touch assistance leaves airborne inertia and gravity identical to ordinary input',async()=>{const a=await fixture(false),b=await fixture(false);for(const s of [a,b]){s.p.body.setTranslation({x:0,y:20,z:0},true);s.p.body.setLinvel({x:6,y:5,z:8},true);s.p.sync();}for(let i=0;i<20;i++){a.tick(control());b.tick({x:0,z:0,jump:false,dash:false,touchDrive:false});}assert.ok(new Vector3().copy(a.p.body.linvel()).distanceTo(new Vector3().copy(b.p.body.linvel()))<1e-6);assert.ok(a.p.body.linvel().y<0);a.world.free();b.world.free();});
test('dash retains a short impulse before touch release braking resumes',async()=>{const s=await fixture();s.tick(control(-1,true));for(let i=0;i<12;i++)s.tick();assert.ok(s.p.body.linvel().z>4,'dash is not immediately cancelled');for(let i=0;i<100;i++)s.tick();assert.ok(Math.abs(s.p.body.linvel().z)<.5);s.world.free();});

test('touch braking and reverse keep a three-wagon train stable',async()=>{
 const {TrainSystem}=await import('../src/game/TrainSystem');const s=await fixture();
 const actors=Array.from({length:3},(_,id)=>({id,physics:new PhysicsPlayer(s.world,new EventBus(),{x:25+id*3,z:0})}));
 const train=new TrainSystem(s.world,s.p,actors,new EventBus());
 const tick=(input=control())=>{s.p.step(dt,input,forward);for(const a of actors)if(!train.has(a.id)&&!train.isJoining(a.id))a.physics.step(dt,{x:0,z:0,jump:false,dash:false},forward);train.step(dt);s.world.step();s.p.sync();actors.forEach(a=>a.physics.sync());train.afterStep();};
 for(const a of actors){a.physics.body.setTranslation({x:s.p.current.x+1.95,y:s.p.current.y,z:s.p.current.z},true);a.physics.body.setLinvel({x:0,y:0,z:0},true);a.physics.sync();for(let i=0;i<900&&!train.has(a.id);i++)tick();assert.ok(train.has(a.id));}
 for(let i=0;i<360;i++){tick(control(i<120?-1:i<180?0:1));assert.equal(train.count,3);assert.ok(Math.max(...train.snapshot().gaps)<2.7);}
 s.world.free();
});
