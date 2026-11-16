import {test} from 'node:test';
import assert from 'node:assert/strict';
import {npcRoster} from '../src/game/NpcBrain';
import {berryPlacement} from '../src/game/BerryArt';
import {pondClearance,heightAt} from '../src/core/terrain';
test('expanded valley has fifteen persistent identities, separated spawns and five independent temperaments',()=>{
 const a=npcRoster(2026);assert.equal(a.length,15);assert.deepEqual(a,npcRoster(2026));assert.equal(new Set(a.map(x=>x.kind)).size,5);
 assert.equal(new Set(a.map(x=>x.appearanceSeed)).size,15);
 for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++)assert.ok(Math.hypot(a[i].x-a[j].x,a[i].z-a[j].z)>2.1);
});
test('berries spread over both sides of the valley and stay on dry gentle ground',()=>{
 const p=Array.from({length:12},(_,i)=>berryPlacement(i));
 assert.ok(Math.max(...p.map(x=>x.x))-Math.min(...p.map(x=>x.x))>60);
 assert.ok(Math.max(...p.map(x=>x.z))-Math.min(...p.map(x=>x.z))>60);
 for(const b of p){assert.ok(pondClearance(b.x,b.z)>4);assert.ok(Math.hypot(heightAt(b.x+.5,b.z)-heightAt(b.x-.5,b.z),heightAt(b.x,b.z+.5)-heightAt(b.x,b.z-.5))<.7);}
});
