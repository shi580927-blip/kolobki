import {test} from 'node:test';
import assert from 'node:assert/strict';
import {plateauCliffParts} from '../src/game/PlateauCliffs';
import {nearestRoutePoint} from '../src/core/valleyRoute';
import {heightAt} from '../src/core/terrain';
import {RELIEF_MODULES} from '../src/core/landscapeRelief';

test('physical plateau cliffs leave the race corridor and southern access open within a small mesh budget',()=>{
 const {parts}=plateauCliffParts(),plateau=RELIEF_MODULES[0];
 assert.ok(parts.length>=12&&parts.length<=20);
 let triangles=0,green=0,lowShelves=0;const widths:number[]=[];
 for(const g of parts){
  const p=g.getAttribute('position'),c=g.getAttribute('color');triangles+=p.count/3;
  g.computeBoundingBox();const box=g.boundingBox!,height=box.max.y-box.min.y;
  assert.ok(height>1.5);if(height<5)lowShelves++;
  widths.push(Math.max(box.max.x-box.min.x,box.max.z-box.min.z));
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
 assert.ok(green>0,'cliff crests retain a grassy cap');assert.ok(triangles<1500);
 assert.ok(lowShelves>=2,'lower rock shelves must break up the high wall');
 assert.ok(Math.max(...widths)-Math.min(...widths)>2,'masses need distinct widths');
});
