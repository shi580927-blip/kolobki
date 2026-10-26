import { test } from "node:test";
import assert from "node:assert/strict";
import R from "@dimforge/rapier3d-compat";
import { terrainData, heightAt } from "../src/core/terrain";
test("Rapier sphere rests on shared terrain and rolls downhill without tunnelling", async () => {
  await R.init();
  const world = new R.World({ x: 0, y: -18, z: 0 });
  world.timestep = 1 / 60;
  const d = terrainData();
  world.createCollider(R.ColliderDesc.trimesh(d.vertices, d.indices));
  const body = world.createRigidBody(
    R.RigidBodyDesc.dynamic()
      .setTranslation(8, heightAt(8, 0) + 3, 0)
      .setCcdEnabled(true),
  );
  world.createCollider(R.ColliderDesc.ball(1).setFriction(0.8), body);
  for (let i = 0; i < 600; i++) {
    world.step();
    const p = body.translation();
    assert.ok(Number.isFinite(p.y));
    assert.ok(p.y > heightAt(p.x, p.z) - 0.3, "sphere stays above surface");
  }
  const p = body.translation();
  assert.ok(Math.hypot(p.x - 8, p.z) > 1, "rolls on slope");
  world.free();
});

import { PhysicsPlayer } from "../src/game/PhysicsPlayer";
import { EventBus } from "../src/core/events";
import { Vector3 } from "three";
import type { Input } from "../src/game/Input";
test("support contact while rolling does not continuously stun the player", async () => {
  await R.init();
  const world = new R.World({ x: 0, y: -18, z: 0 });
  world.timestep = 1 / 60;
  const d = terrainData();
  world.createCollider(R.ColliderDesc.trimesh(d.vertices, d.indices));
  const bus = new EventBus();
  let impacts = 0;
  bus.on("impact_major", () => impacts++);
  const player = new PhysicsPlayer(world, bus),
    events = new R.EventQueue(true);
  const input = { x: 0, z: 0, jump: false, dash: false } as Input;
  for (let i = 0; i < 360; i++) {
    player.step(1 / 60, input, new Vector3(0, 0, 1));
    world.step(events);
    player.sync();
    events.drainContactForceEvents((e) =>
      player.contact(e.totalForceMagnitude()),
    );
  }
  assert.ok(impacts <= 2, `expected isolated landing, got ${impacts} impacts`);
  events.free();
  world.free();
});

test('dizzy immobilization holds a ball on a hill and releases input without teleporting',async()=>{
 await R.init();const world=new R.World({x:0,y:-18,z:0});world.timestep=1/60;const d=terrainData();world.createCollider(R.ColliderDesc.trimesh(d.vertices,d.indices));const player=new PhysicsPlayer(world,new EventBus()),input={x:1,z:0,jump:false,dash:false} as Input;
 for(let i=0;i<60;i++){player.step(1/60,input,new Vector3(0,0,1));world.step();player.sync();}
 player.setImmobilized(true);const anchor=player.current.clone();for(let i=0;i<120;i++){player.step(1/60,input,new Vector3(0,0,1));world.step();player.sync();}assert.ok(player.current.distanceTo(anchor)<1e-5);player.setImmobilized(false);for(let i=0;i<60;i++){player.step(1/60,input,new Vector3(0,0,1));world.step();player.sync();}assert.ok(player.current.distanceTo(anchor)>.1);assert.ok(player.current.distanceTo(anchor)<20);world.free();
});

test('airborne stun preserves gravity and momentum, then holds only after landing',async()=>{
 await R.init();const world=new R.World({x:0,y:-18,z:0});world.timestep=1/60;
 world.createCollider(R.ColliderDesc.cuboid(20,.5,20).setTranslation(0,-.5,0));
 const player=new PhysicsPlayer(world,new EventBus()),input={x:1,z:-1,jump:true,dash:true} as Input;
 player.body.setTranslation({x:0,y:10,z:0},true);player.body.setLinvel({x:2,y:-3,z:0},true);player.sync();player.setImmobilized(true);
 for(let i=0;i<30;i++){input.jump=input.dash=true;player.step(1/60,input,new Vector3(0,0,1));world.step();player.sync();}
 assert.ok(player.current.y<7,'stunned ball must fall before stun expires');assert.ok(player.current.x>.5,'airborne momentum is retained');assert.equal(input.jump,false);assert.equal(input.dash,false);
 for(let i=0;i<90;i++){player.step(1/60,input,new Vector3(0,0,1));world.step();player.sync();}
 assert.ok(player.current.y>.9&&player.current.y<1.1,'hold begins at the actual ground');
 const landed=player.current.clone();for(let i=0;i<30;i++){player.step(1/60,input,new Vector3(0,0,1));world.step();player.sync();}assert.ok(player.current.distanceTo(landed)<1e-5);
 player.setImmobilized(false);for(let i=0;i<30;i++){player.step(1/60,input,new Vector3(0,0,1));world.step();player.sync();}assert.ok(player.current.distanceTo(landed)>.1);world.free();
});

test('stun onset and recovery in midair do not cancel upward velocity',async()=>{
 await R.init();const world=new R.World({x:0,y:-18,z:0}),player=new PhysicsPlayer(world,new EventBus());world.timestep=1/60;
 player.body.setTranslation({x:0,y:8,z:0},true);player.body.setLinvel({x:0,y:5,z:0},true);player.sync();player.setImmobilized(true);
 const input={x:0,z:0,jump:false,dash:false} as Input;player.step(1/60,input,new Vector3(0,0,1));world.step();player.sync();assert.ok(player.body.linvel().y>4);
 const velocity=player.body.linvel().y;player.setImmobilized(false);assert.equal(player.body.linvel().y,velocity);world.free();
});

test('another character is neither a jump platform nor the support for dizzy hold',async()=>{
 await R.init();const world=new R.World({x:0,y:-18,z:0});world.timestep=1/60;
 world.createCollider(R.ColliderDesc.cuboid(20,.5,20).setTranslation(0,-.5,0));
 const pedestal=world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(0,1,0));world.createCollider(R.ColliderDesc.ball(1),pedestal);
 const bus=new EventBus(),player=new PhysicsPlayer(world,bus);let jumps=0;bus.on('player_jump',()=>jumps++);
 player.body.setTranslation({x:0,y:3.01,z:0},true);player.body.setLinvel({x:0,y:0,z:0},true);player.sync();
 for(let i=0;i<90;i++){player.step(1/60,{x:0,z:0,jump:true,dash:false},new Vector3(0,0,1));world.step();player.sync();}
 assert.equal(jumps,0,'jump ray excludes dynamic and kinematic characters');
 player.setImmobilized(true);for(let i=0;i<30;i++){player.step(1/60,{x:0,z:0,jump:false,dash:false},new Vector3(0,0,1));world.step();player.sync();}
 assert.equal(player.body.bodyType(),R.RigidBodyType.Dynamic,'dizzy hold waits for a static surface');world.free();
});
