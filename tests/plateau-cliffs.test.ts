import {test} from 'node:test';
import assert from 'node:assert/strict';
import {plateauCliffParts} from '../src/game/PlateauCliffs';
import {nearestRoutePoint} from '../src/core/valleyRoute';
import {heightAt} from '../src/core/terrain';
import {RELIEF_MODULES} from '../src/core/landscapeRelief';

test('physical plateau cliffs leave the race corridor and southern access open within a small mesh budget',()=>{
 const {parts}=plateauCliffParts(),plateau=RELIEF_MODULES[0];
 assert.ok(parts.length>=8&&parts.length<=16);
 let triangles=0,green=0;
 for(const g of parts){
  const p=g.getAttribute('position'),c=g.getAttribute('color');triangles+=p.count/3;
  g.computeBoundingBox();assert.ok(g.boundingBox!.max.y-g.boundingBox!.min.y>2);
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
   assert.ok(Number.isFinite(x+y+z));
   if(Math.abs(y-g.boundingBox!.min.y)<.01)assert.ok(y<heightAt(x,z)-.2,'rock feet must intersect ground, without a floating gap');
   assert.ok(nearestRoutePoint(x,z).distance>14,'visible solid must stay outside the driving corridor');
   assert.ok(z<plateau.z+8,'southern ramp must stay open');
   if(c.getY(i)>c.getX(i)&&c.getY(i)>c.getZ(i))green++;
  }
  g.dispose();
 }
 assert.ok(green>0,'cliff crests retain a grassy cap');assert.ok(triangles<1000);
});
