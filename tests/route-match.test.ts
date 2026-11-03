import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MEADOW_TRACK,HILL_TRACK} from '../src/core/valleyRoute';
import {RouteMatch,MATCH_ROUTE,MATCH_RULES} from '../src/game/RouteMatch';
const start=[{x:-4,z:0},{x:4,z:0}];
test('both start alone; countdown does not advance route or consume round time',()=>{
 const m=new RouteMatch();m.start(start);m.step(2,[MATCH_ROUTE[0],MATCH_ROUTE[0]]);
 assert.equal(m.phase,'countdown');assert.deepEqual(m.progress,[0,0]);assert.equal(m.remaining,180);
 m.step(1,start);assert.equal(m.phase,'running');assert.equal(m.remaining,180);
});
test('ordered gates reject skipping and count a fast swept crossing once',()=>{
 const m=new RouteMatch();m.start(start);m.step(3,start);m.step(.1,[{x:-18,z:32},start[1]]);assert.equal(m.progress[0],0);
 m.step(.1,[{x:0,z:9},start[1]]);m.step(.1,[{x:0,z:21},start[1]]);assert.equal(m.progress[0],1);
 m.step(.1,[{x:0,z:21},start[1]]);assert.equal(m.progress[0],1);
});
test('first to finish two ordered laps wins; end freezes scoring; replay and sandbox clear progress',()=>{
 const m=new RouteMatch();m.start(start);m.step(3,start);
 for(let lap=0;lap<MATCH_RULES.laps;lap++)for(const gate of MATCH_ROUTE)m.step(.1,[gate,start[1]]);
 assert.equal(m.phase,'finished');assert.equal(m.winner,'player');const progress=[...m.progress];m.step(10,[MATCH_ROUTE[0],MATCH_ROUTE[0]]);assert.deepEqual(m.progress,progress);
 m.start(start);assert.deepEqual(m.progress,[0,0]);assert.equal(m.winner,undefined);m.reset();assert.equal(m.phase,'sandbox');
});
test('time limit compares checkpoints with explicit tie, no hidden length or currency bonus',()=>{
 const m=new RouteMatch();m.start(start);m.step(3,start);m.step(.1,[start[0],MATCH_ROUTE[0]]);m.step(180,start);assert.equal(m.winner,'rival');
 m.start(start);m.step(3,start);m.step(180,start);assert.equal(m.winner,'draw');
});

test('selected track owns its width, ordered gates and finish count; racing cannot switch it mid-round',()=>{
 const m=new RouteMatch(MEADOW_TRACK);m.start(start);m.step(3,start);assert.equal(m.snapshot().width,20);assert.equal(m.snapshot().checkpoints,10);
 assert.throws(()=>m.select(HILL_TRACK));
 for(let lap=0;lap<2;lap++)for(const point of MEADOW_TRACK.points)m.step(.1,[point,start[1]]);
 assert.equal(m.phase,'finished');assert.equal(m.progress[0],20);assert.equal(m.winner,'player');
 m.reset();m.select(HILL_TRACK);assert.equal(m.snapshot().width,12);assert.equal(m.target(0),MATCH_ROUTE[0]);
});
