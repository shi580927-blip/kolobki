import {test} from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import * as T from 'three';
import {AbilityInventory,ComboChain} from '../src/game/AbilityModel';
import {AbilitySystem,type AbilityActor,type AbilityResult} from '../src/game/AbilitySystem';
import {PhysicsPlayer} from '../src/game/PhysicsPlayer';
import {EventBus} from '../src/core/events';
import {BerryCollectibles} from '../src/game/BerryCollectibles';
import {HeadDecor,decorForSeed} from '../src/game/HeadDecor';
import {Effects} from '../src/game/Effects';
import {heightAt} from '../src/core/terrain';
const dt=1/60,forward=new T.Vector3(0,0,1),idle=()=>({x:0,z:0,jump:false,dash:false});
async function fixture(positions:[number,number][]=[]) {await R.init();const world=new R.World({x:0,y:-18,z:0});world.timestep=dt;const floor=heightAt(0,0);world.createCollider(R.ColliderDesc.cuboid(100,.5,100).setTranslation(0,floor-.5,0));const player=new PhysicsPlayer(world,new EventBus());
 const actors:AbilityActor[]=positions.map(([x,z],id)=>({id,physics:new PhysicsPlayer(world,new EventBus(),{x,z}),hit:()=>{}}));const inventory=new AbilityInventory(),combos:AbilityResult[]=[],protectedIds=new Set<number>(),released:number[]=[];
 const system=new AbilitySystem(inventory,world,player,()=>actors,id=>protectedIds.has(id),id=>released.push(id),r=>combos.push(r));
 const tick=(input=idle())=>{system.step(dt);player.step(dt,input,forward);actors.forEach(a=>a.physics.step(dt,idle(),forward));world.step();player.sync();actors.forEach(a=>a.physics.sync());};
 for(let i=0;i<80;i++)tick();return {world,player,actors,inventory,system,combos,protectedIds,released,tick,floor};}
test('ability inventory has bounded charges, deliberate selection and a shared cooldown',()=>{const i=new AbilityInventory();for(let n=0;n<3;n++)assert.equal(i.add('pepper'),true);assert.equal(i.add('pepper'),false);i.add('lemon');assert.equal(i.spend('pepper'),true);assert.equal(i.charges.pepper,2);i.cycle(1);assert.equal(i.selected,'lemon');assert.equal(i.spend('lemon'),false);assert.equal(i.charges.lemon,1);i.step(4.1);assert.equal(i.spend('lemon'),true);i.reset();assert.deepEqual(i.charges,{pepper:0,lemon:0,bomb:0});});
test('domino requires distinct real collision inputs and cannot feed itself indefinitely',()=>{const chain=new ComboChain();assert.equal(chain.contact(0,1,12,0),0);chain.prime(0,0);assert.equal(chain.contact(0,1,8,.1),2);assert.equal(chain.contact(1,0,8,.2),0);assert.equal(chain.contact(1,2,1,.3),0);assert.equal(chain.contact(1,2,8,.3),3);assert.equal(chain.contact(2,3,8,.4),4);assert.equal(chain.contact(3,4,8,.5),0);assert.equal(chain.contact(3,5,8,2),0);});
test('lemon performs a real higher jump from support and saves the charge if used in the air',async()=>{const s=await fixture();try{s.inventory.add('lemon');s.inventory.add('lemon');assert.ok(s.player.hasSurfaceSupport());const start=s.player.current.y;assert.equal(s.system.activate('lemon').ok,true);let peak=start;for(let i=0;i<20;i++){s.tick();peak=Math.max(peak,s.player.current.y);}assert.ok(peak-start>1.8);s.inventory.cooldown=0;assert.equal(s.system.activate('lemon').ok,false);assert.equal(s.inventory.charges.lemon,1);for(let i=0;i<170;i++)s.tick();assert.ok(s.player.hasSurfaceSupport());assert.equal(s.player.controlsLocked,false);}finally{s.world.free();}});
test('pepper is temporary, keeps a bounded speed and reset restores normal movement',async()=>{const s=await fixture();try{s.inventory.add('pepper');assert.equal(s.system.activate('pepper').ok,true);assert.ok(s.player.powerTime>0);assert.ok(s.player.body.linvel().z>=9);for(let i=0;i<90;i++)s.tick({x:0,z:-1,jump:false,dash:false});assert.ok(Math.hypot(s.player.body.linvel().x,s.player.body.linvel().z)<=26.001);for(let i=0;i<160;i++)s.tick({x:0,z:-1,jump:false,dash:false});assert.equal(s.player.powerTime,0);assert.ok(Math.hypot(s.player.body.linvel().x,s.player.body.linvel().z)<=22.001);s.player.reset();assert.equal(s.player.powerTime,0);}finally{s.world.free();}});
test('bomb pushes real bodies, protects own wagons and is blocked by solid scenery',async()=>{const s=await fixture([[3,0],[-3,0],[0,5],[15,0]]);try{s.protectedIds.add(1);const target=s.actors[2].physics.current;s.world.createCollider(R.ColliderDesc.cuboid(2,3,.2).setTranslation(0,target.y,2.5));s.tick();s.inventory.add('bomb');assert.equal(s.system.activate('bomb').ok,true);assert.ok(s.actors[0].physics.body.linvel().x>3);assert.ok(Math.hypot(s.actors[1].physics.body.linvel().x,s.actors[1].physics.body.linvel().z)<.05);assert.ok(Math.hypot(s.actors[2].physics.body.linvel().x,s.actors[2].physics.body.linvel().z)<.05);assert.ok(Math.hypot(s.actors[3].physics.body.linvel().x,s.actors[3].physics.body.linvel().z)<.05);assert.deepEqual(s.released,[0]);assert.equal(s.combos.at(-1)?.kind,'blast');assert.equal(s.combos.at(-1)?.count,1);}finally{s.world.free();}});
test('ability drops collect through real movement segments, do not waste full stock, and respawn',()=>{const i=new AbilityInventory(),bus=new EventBus(),scene=new T.Scene(),b=new BerryCollectibles(scene,bus,undefined,true,k=>i.add(k));assert.equal(b.powers.length,3);const p=b.powers[0],at=p.mesh.position;b.checkSegment(at.clone().add(new T.Vector3(-4,0,0)),at.clone().add(new T.Vector3(4,0,0)));assert.equal(i.charges.pepper,1);assert.equal(p.mesh.visible,false);const ordinary=b.count;b.step(18.1);assert.equal(p.mesh.visible,true);i.add('pepper');i.add('pepper');b.checkSegment(at,at);assert.equal(p.mesh.visible,true);assert.equal(i.charges.pepper,3);assert.equal(b.count,ordinary);});
test('head accessories preserve seed identity, rotate with heading and have a small fixed mesh budget',()=>{for(let seed=0;seed<12;seed++){const h=new HeadDecor(seed,'#28b8bd');assert.deepEqual(h.style,decorForSeed(seed));h.update(1.2);assert.equal(h.rotation.y,1.2);let meshes=0,triangles=0;h.traverse(o=>{if(o instanceof T.Mesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;assert.equal(o.castShadow,true);}});assert.ok(meshes<=4);assert.ok(triangles<2000);h.dispose();}});
test('impact visuals use four bounded reusable batches and expire cleanly',()=>{const scene=new T.Scene(),effects=new Effects(scene,new T.PerspectiveCamera());for(let i=0;i<100;i++){effects.burst(new T.Vector3(),'bomb');effects.sparkle(new T.Vector3());}assert.ok(effects.count<=130);assert.equal(scene.children.length,4);effects.update(.1);for(const child of scene.children)assert.ok((child as T.InstancedMesh).count<=64);effects.update(2);assert.equal(effects.count,0);assert.ok(scene.children.every(o=>(o as T.InstancedMesh).count===0));});

test('a deliberate dash and the subsequent NPC collision register ram and domino from Rapier contacts',async()=>{
 const s=await fixture([[0,4.3],[0,7.0]]),queue=new R.EventQueue(true);try{
  s.inventory.add('pepper');assert.ok(s.system.activate('pepper').ok);
  for(let i=0;i<110;i++){
   s.system.step(dt);s.player.step(dt,{x:0,z:i<18?-1:0,jump:false,dash:i===0},forward);s.actors.forEach(a=>a.physics.step(dt,idle(),forward));s.world.step(queue);s.player.sync();s.actors.forEach(a=>a.physics.sync());
   queue.drainContactForceEvents(e=>{const a=s.actors.find(a=>a.physics.collider.handle===e.collider1()),b=s.actors.find(a=>a.physics.collider.handle===e.collider2()),other=a??b;
    if(other&&(e.collider1()===s.player.collider.handle||e.collider2()===s.player.collider.handle)){const info=s.player.inspectContact(other.physics.collider,other.physics.impactVelocity);s.system.playerContact(other,info.closingSpeed,info.normal);}
    if(a&&b){const normal=b.physics.current.clone().sub(a.physics.current).normalize();s.system.actorContact(a,b,a.physics.impactVelocity.clone().sub(b.physics.impactVelocity).dot(normal),false);}
   });
  }
  assert.ok(s.combos.some(c=>c.kind==='ram'),'deliberate real dash hits the first actor');assert.ok(s.combos.some(c=>c.kind==='domino'&&c.count===2),'first actor actually hits the second');assert.equal(s.player.controlsLocked,false);
 }finally{queue.free();s.world.free();}
});
test('a powered jump hitting an NPC from above gives one bounded rebound, not an ordinary-landing stun',async()=>{
 const s=await fixture([[0,4.7]]),queue=new R.EventQueue(true);try{
  s.inventory.add('lemon');assert.ok(s.system.activate('lemon').ok);s.player.body.setLinvel({x:0,y:s.player.body.linvel().y,z:4},true);
  for(let i=0;i<130;i++){s.system.step(dt);s.player.step(dt,idle(),forward);s.actors.forEach(a=>a.physics.step(dt,idle(),forward));s.world.step(queue);s.player.sync();s.actors.forEach(a=>a.physics.sync());queue.drainContactForceEvents(e=>{if(e.collider1()!==s.player.collider.handle&&e.collider2()!==s.player.collider.handle)return;const a=s.actors[0],info=s.player.inspectContact(a.physics.collider,a.physics.impactVelocity);s.system.playerContact(a,info.closingSpeed,info.normal);});}
  assert.equal(s.combos.filter(c=>c.kind==='air-hit').length,1);assert.equal(s.player.controlsLocked,false);assert.ok(s.player.current.toArray().every(Number.isFinite));
 }finally{queue.free();s.world.free();}
});
