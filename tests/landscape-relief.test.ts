import {test} from 'node:test';
import assert from 'node:assert/strict';
import {landscapeRelief,RELIEF_MODULES} from '../src/core/landscapeRelief';
import {VALLEY_ROUTE} from '../src/core/valleyRoute';
test('authored relief has a raised plateau, continuous boundaries and leaves the driving loop open',()=>{
 for(const m of RELIEF_MODULES){assert.ok(landscapeRelief(m.x,m.z)>=6);
  for(let a=0;a<Math.PI*2;a+=.2){const x=m.x+Math.cos(a)*m.radius,z=m.z+Math.sin(a)*m.radius;
   assert.ok(Math.abs(landscapeRelief(x+.01,z)-landscapeRelief(x-.01,z))<.05);
  }
 }
 for(let i=0;i<VALLEY_ROUTE.length;i++){const a=VALLEY_ROUTE[i],b=VALLEY_ROUTE[(i+1)%VALLEY_ROUTE.length];
  for(let t=0;t<=1;t+=.01)assert.equal(landscapeRelief(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t),0);
 }
 assert.equal(landscapeRelief(0,0),0);assert.equal(landscapeRelief(100,100),0);
});
