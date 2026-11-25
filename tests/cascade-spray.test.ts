import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cascadeSpraySample} from '../src/game/ShoreCascade';
test('cascade spray stays low and spreads along the contact instead of forming a fountain',()=>{
 for(let t=0;t<12;t+=.1){
  const particles=Array.from({length:24},(_,i)=>cascadeSpraySample(i,t));
  for(const p of particles){assert.ok(Object.values(p).every(Number.isFinite));assert.ok(p.y>=.02&&p.y<=.20);assert.ok(p.size>=0&&p.size<=.043);}
  assert.ok(Math.max(...particles.map(p=>p.x))-Math.min(...particles.map(p=>p.x))>1.3);
 }
});
