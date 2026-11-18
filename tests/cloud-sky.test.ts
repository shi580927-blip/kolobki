import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeCloudGeometry} from '../src/game/CloudSky';

test('cloud surfaces are finite and closed inside the generation volume, with a bounded render budget',()=>{
 for(const seed of [201,802,1307]){
  const g=makeCloudGeometry(seed),p=g.getAttribute('position'),n=g.getAttribute('normal');
  assert.ok(p.count>300&&p.count<18000);assert.equal(n.count,p.count);
  for(let i=0;i<p.array.length;i++){assert.ok(Number.isFinite(p.array[i]));assert.ok(Number.isFinite(n.array[i]));assert.ok(Math.abs(p.array[i])<.95,'cloud must not be chopped at generation boundary');}
  assert.ok(g.boundingBox!.max.y>g.boundingBox!.min.y);g.dispose();
 }
});
