import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseDuoPacket,RemoteMotion,readDuoInvite,DUO_PROTOCOL,DUO_MAP,type Motion} from '../src/game/DuoProtocol';
const state=(n:number,x=0)=>({t:'state' as const,n,p:[x,3.3,0] as [number,number,number],q:[0,0,0,1] as [number,number,number,number],v:[2,0,0] as [number,number,number],h:0,w:.4,s:.2,paused:false});
test('network state rejects invalid coordinates, identities, orientation and coating values',()=>{
 assert.ok(parseDuoPacket(state(1)));for(const d of [{...state(1),p:[Infinity,0,0]},{...state(1),p:[900,0,0]},{...state(1),q:[0,0,0,0]},{...state(1),v:[0,500,0]},{...state(1),s:2},{...state(1),n:-1},null,'not state'])assert.equal(parseDuoPacket(d),undefined);
 const hello={t:'hello',protocol:DUO_PROTOCOL,map:DUO_MAP,build:'0.1.0-dev.71',key:'a'.repeat(32),seed:4321};assert.ok(parseDuoPacket(hello));assert.equal(parseDuoPacket({...hello,seed:-3}),undefined);
});
test('invites require a full unpredictable room key and bounded peer identifier',()=>{
 assert.deepEqual(readDuoInvite('#join=abc-123&key='+'a'.repeat(32)),{id:'abc-123',key:'a'.repeat(32)});
 for(const h of ['#join=abc','#join=abc&key=short','#join=../../bad&key='+'a'.repeat(32),'#join='+('x'.repeat(101))+'&key='+'a'.repeat(32)])assert.equal(readDuoInvite(h),undefined);
});
test('remote movement interpolates actual packets, ignores old ones and bounds prediction',()=>{
 const motion=new RemoteMotion();motion.push(state(1,0),10);motion.push(state(2,1),10.2);
 assert.ok(Math.abs(motion.sample(10.2)!.p[0]-.5)<.001);assert.equal(motion.push(state(1,90),10.25),false);
 assert.ok(Math.abs(motion.sample(12)!.p[0]-1.3)<.001,'prediction never runs away after the last packet');assert.equal(motion.sample(16),undefined);
});
test('reset jumps snap to the new location; pause stays still and quaternions stay normalized',()=>{
 const motion=new RemoteMotion();motion.push(state(1,80),0);motion.push({...state(2,0),paused:true},.1);
 const sample=motion.sample(.3)!;assert.equal(sample.p[0],0);assert.ok(Math.abs(Math.hypot(...sample.q)-1)<1e-6);
 motion.clear();assert.equal(motion.sample(.3),undefined);
});
