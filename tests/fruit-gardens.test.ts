import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Vector3} from 'three';
import {EventBus} from '../src/core/events';
import {BerryCollectibles} from '../src/game/BerryCollectibles';
import {gardenPoint} from '../src/game/FruitGardens';
import {heightAt,pondClearance} from '../src/core/terrain';
test('NPC snack regrows without giving the player berries or coins',()=>{
 const bus=new EventBus(),b=new BerryCollectibles(new Scene(),bus);let pickup=0;bus.on('berry_pickup',()=>pickup++);
 assert.equal(b.total,36);const p=b.items[0].mesh.position.clone();
 assert.equal(b.nibble(0),true);assert.equal(b.nibble(0),false);assert.equal(b.count,0);
 b.checkSegment(p,p);assert.equal(b.count,0);b.step(12);assert.equal(b.items[0].mesh.visible,true);
 b.checkSegment(p,p);assert.equal(b.count,1);assert.equal(pickup,1);assert.equal(b.nibble(0),false);
 b.reset();assert.equal(b.nibbles,0);assert.ok(b.items.every(x=>x.regrow===0&&!x.collected&&x.mesh.visible));
});
test('peripheral garden sites remain dry, gentle, deterministic and inside the map',()=>{
 for(let g=0;g<3;g++)for(let i=0;i<13;i++){const p=gardenPoint(g,i);
 assert.deepEqual(p,gardenPoint(g,i));assert.ok(Math.abs(p.x)<=180&&Math.abs(p.z)<=180);
 assert.ok(pondClearance(p.x,p.z)>=6);assert.ok(Math.hypot(heightAt(p.x+.5,p.z)-heightAt(p.x-.5,p.z),heightAt(p.x,p.z+.5)-heightAt(p.x,p.z-.5))<.7);}
});
