import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pondWaterGeometry} from '../src/game/PondWater';
import {POND,heightAt,pondDistance} from '../src/core/terrain';
test('rendered pond uses physical world contour and actual ground depth, facing up',()=>{
 const g=pondWaterGeometry(),p=g.getAttribute('position'),d=g.getAttribute('waterDepth'),n=g.getAttribute('normal');let maxDepth=0;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),z=p.getZ(i);assert.ok(pondDistance(x,z)<1.000001);assert.ok(Math.abs(d.getX(i)-(POND.water-heightAt(x,z)))<.00001);assert.ok(n.getY(i)>.99);maxDepth=Math.max(maxDepth,d.getX(i));
 }
 assert.ok(maxDepth>.35&&maxDepth<.5);g.dispose();
});
