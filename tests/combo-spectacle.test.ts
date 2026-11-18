import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Vector3} from 'three';
import {Effects} from '../src/game/Effects';
test('spectacular combo particles have a hard budget, expire and reset cleanly',()=>{
 const e=new Effects(new Scene()),p=new Vector3(0,2,0);
 for(let i=0;i<40;i++)e.burst(p,'domino',3);
 assert.ok(e.count>80);assert.ok(e.count<=96+64+14+16+48);
 for(let i=0;i<120;i++)e.update(1/60);
 assert.equal(e.count,0);e.burst(p,'ram',2);e.reset();assert.equal(e.count,0);
});
