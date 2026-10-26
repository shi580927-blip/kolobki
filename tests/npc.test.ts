import {test} from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {Vector3} from 'three';
import {NpcBrain,npcRoster,type NpcContext} from '../src/game/NpcBrain';
import {PhysicsPlayer} from '../src/game/PhysicsPlayer';
import {EventBus} from '../src/core/events';
import {heightAt} from '../src/core/terrain';
const context:NpcContext={x:0,z:0,vx:0,vz:0,playerX:8,playerZ:0,neighbors:[],blocked:false};

test('NPC archetypes choose pursuit, escape, flanking and slow travel without reading appearance',()=>{
 const bully=new NpcBrain('bully',12,0),coward=new NpcBrain('coward',12,0),sly=new NpcBrain('sly',12,0),sleepy=new NpcBrain('sleepy',12,0);
 assert.ok(bully.step(.1,context).x>0);assert.equal(bully.state,'chase');
 assert.ok(coward.step(.1,context).x<0);assert.equal(coward.state,'flee');
 const flank=sly.step(.1,context);assert.equal(sly.state,'flank');assert.ok(flank.z>0);
 const slow=sleepy.step(.1,context);assert.ok(Math.hypot(slow.x,slow.z)<.5);
 const roster=npcRoster(45);assert.equal(new Set(roster.map(a=>a.kind)).size,5);assert.deepEqual(roster,npcRoster(45));assert.notDeepEqual(roster.map(a=>a.appearanceSeed),npcRoster(46).map(a=>a.appearanceSeed));
});

test('NPC recovery releases controls without braking airborne momentum; reset clears recovery',()=>{
 const brain=new NpcBrain('bully',4,0);brain.hit();assert.deepEqual(brain.step(.1,{...context,vx:5,vz:3}),{x:0,z:0,jump:false,dash:false});assert.equal(brain.state,'recover');brain.reset();assert.ok(brain.step(.1,context).x>0);
 const edge=new NpcBrain('coward',3,0),intent=edge.step(.1,{...context,x:60,playerX:59});assert.equal(edge.state,'return');assert.ok(intent.x<0);
});

test('chaotic NPC jumps and dashes with pauses, and overlapping neighbours do not create NaN',()=>{
 const brain=new NpcBrain('chaotic',51,0);let jumps=0,dashes=0;
 for(let i=0;i<600;i++){const input=brain.step(1/60,{...context,neighbors:[{x:0,z:0},{x:1,z:0}]});assert.ok(Number.isFinite(input.x)&&Number.isFinite(input.z));assert.ok(Math.hypot(input.x,input.z)<=1.000001);if(input.jump)jumps++;if(input.dash)dashes++;}
 assert.ok(jumps>=2&&jumps<10);assert.ok(dashes>=1&&dashes<6);
});

test('two dynamic rolling bodies exchange momentum on contact and reset at separate spawn points',async()=>{
 await R.init();const world=new R.World({x:0,y:-18,z:0});world.timestep=1/60;
 world.createCollider(R.ColliderDesc.cuboid(50,1,50).setTranslation(0,heightAt(0,0)-1,0));
 const player=new PhysicsPlayer(world,new EventBus()),npc=new PhysicsPlayer(world,new EventBus(),{x:3,z:0}),forward=new Vector3(0,0,1);
 for(let i=0;i<60;i++){player.step(1/60,{x:0,z:0,jump:false,dash:false},forward);npc.step(1/60,{x:0,z:0,jump:false,dash:false},forward);world.step();player.sync();npc.sync();}
 player.body.setLinvel({x:12,y:0,z:0},true);let maxSpeed=0;
 for(let i=0;i<40;i++){player.step(1/60,{x:0,z:0,jump:false,dash:false},forward);npc.step(1/60,{x:0,z:0,jump:false,dash:false},forward);world.step();player.sync();npc.sync();maxSpeed=Math.max(maxSpeed,npc.body.linvel().x);}
 assert.ok(maxSpeed>1,'NPC receives a physical impulse from the player');assert.ok(npc.current.x>3.2);npc.reset();assert.equal(npc.current.x,3);assert.equal(npc.current.z,0);assert.equal(player.body.bodyType(),R.RigidBodyType.Dynamic);world.free();
});
