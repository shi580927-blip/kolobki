import {test} from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {Scene,Vector3} from 'three';
import {POND,LAGOON_DEEP,heightAt,pondRadius} from '../src/core/terrain';
import {createWorld} from '../src/game/World';
import {PhysicsPlayer} from '../src/game/PhysicsPlayer';
import {EventBus} from '../src/core/events';
import {applyPondWater,pondSubmersion} from '../src/game/WaterPhysics';
import {WaterRescue} from '../src/game/WaterRescue';

const dt=1/60,forward=new Vector3(0,0,1),idle=()=>({x:0,z:0,jump:false,dash:false,touchDrive:true});
async function fixture(){
 await R.init();const w=new R.World({x:0,y:-18,z:0});w.timestep=dt;createWorld(new Scene(),w);
 const p=new PhysicsPlayer(w,new EventBus(),{x:LAGOON_DEEP.x,z:LAGOON_DEEP.z});
 const tick=(input=idle())=>{p.step(dt,input,forward);applyPondWater(p.body,dt);w.step();p.sync();};
 return {w,p,tick};
}
test('central lagoon permits a full dunk and buoyancy returns the ball to the surface',async()=>{
 const {w,p,tick}=await fixture();assert.ok(POND.water-heightAt(LAGOON_DEEP.x,LAGOON_DEEP.z)>2.5);
 p.body.setTranslation({x:LAGOON_DEEP.x,y:POND.water+6,z:LAGOON_DEEP.z},true);p.body.setLinvel({x:0,y:-7,z:0},true);p.sync();
 let maximumWet=0;for(let i=0;i<600;i++){tick();maximumWet=Math.max(maximumWet,pondSubmersion(p.current));}
 assert.equal(maximumWet,1,'whole ball plunges below the surface');assert.ok(Math.abs(pondSubmersion(p.current)-.625)<.04);assert.ok(Math.abs(p.body.linvel().y)<.15);w.free();
});
test('ordinary steering brings a floating ball out through a gentle beach without rescue',async()=>{
 const {w,p,tick}=await fixture();p.body.setTranslation({x:LAGOON_DEEP.x,y:POND.water-.1,z:LAGOON_DEEP.z},true);p.sync();
 const a=1.0,r=pondRadius(a)+7,target={x:POND.x+Math.cos(a)*r,z:POND.z+Math.sin(a)*r};let arrived=false;
 for(let i=0;i<2400;i++){
  const dx=target.x-p.current.x,dz=target.z-p.current.z,d=Math.hypot(dx,dz);if(d<1){arrived=true;break;}
  const amount=Math.min(.75,d/4);tick({x:-dx/d*amount,z:-dz/d*amount,jump:false,dash:false,touchDrive:true});
 }
 assert.ok(arrived,`water exit stalled: ${p.current.toArray()}`);assert.equal(pondSubmersion(p.current),0);assert.ok(p.hasSurfaceSupport());w.free();
});
test('a stuck floating ball is physically launched to a dry beach and reset clears its rescue state',async()=>{
 const {w,p,tick}=await fixture(),safety=new WaterRescue(w);p.body.setTranslation({x:LAGOON_DEEP.x,y:POND.water-.15,z:LAGOON_DEEP.z},true);p.sync();
 let launch=false,maxStep=0,previous=p.current.clone();
 for(let i=0;i<720;i++){tick();const event=safety.step(-1,p,dt);if(event)launch=true;maxStep=Math.max(maxStep,p.current.distanceTo(previous));previous.copy(p.current);}
 assert.ok(launch);assert.equal(safety.snapshot(-1).rescues,1);assert.equal(safety.snapshot(-1).flying,false);assert.equal(pondSubmersion(p.current),0);assert.ok(p.hasSurfaceSupport());assert.ok(maxStep<1,'normal rescue uses a physical arc, without teleporting');
 safety.reset();assert.equal(safety.snapshot(-1).rescues,0);w.free();
});
