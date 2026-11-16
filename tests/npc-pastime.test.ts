import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NpcPastime} from '../src/game/NpcPastime';
test('grazer keeps a target, pauses to eat once, then rests before another decision',()=>{
 const n=new NpcPastime('grazer',42),snacks=[{id:7,x:8,z:0},{id:8,x:10,z:0}];let eaten=0;
 for(let i=0;i<80;i++)n.step(.1,{x:0,z:0},snacks,()=>{eaten++;return true;});
 assert.equal(n.activity,'seek');assert.equal(n.step(.1,{x:0,z:0},[...snacks].reverse(),()=>true)?.id,7);
 n.step(.1,{x:7,z:0},snacks,()=>true);assert.equal(n.activity,'eat');
 for(let i=0;i<25;i++)n.step(.1,{x:7,z:0},snacks,()=>{eaten++;return true;});
 assert.equal(eaten,1);assert.equal(n.activity,'walk');
});
test('sleep and dance are held activities, a hit releases them, reset reproduces timing',()=>{
 for(const role of ['dreamer','dancer'] as const){
  const a=new NpcPastime(role,9),b=new NpcPastime(role,9);
  for(let i=0;i<70;i++){a.step(.1,{x:0,z:0},[],()=>false);b.step(.1,{x:0,z:0},[],()=>false);assert.equal(a.activity,b.activity);}
  a.interrupt();assert.equal(a.activity,'walk');a.reset();b.reset();assert.equal(a.age,b.age);
 }
});
