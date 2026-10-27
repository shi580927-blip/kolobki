import {test} from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {Scene,InstancedMesh,Matrix4,Vector3} from 'three';
import {heightAt,WORLD_SIZE} from '../src/core/terrain';
import {VALLEY_ROUTE,ROUTE_HALF_WIDTH,nearestRoutePoint} from '../src/core/valleyRoute';
import {createWorld} from '../src/game/World';
import {MatchRouteVisual} from '../src/game/MatchRouteVisual';
import {PhysicsPlayer} from '../src/game/PhysicsPlayer';
import {TrainSystem} from '../src/game/TrainSystem';
import {RouteMatch} from '../src/game/RouteMatch';
import {EventBus} from '../src/core/events';

test('wide valley loop has real height variation, bounded grades and safe clearance from solid props',async()=>{
 await R.init();const world=new R.World({x:0,y:-18,z:0});createWorld(new Scene(),world);
 let length=0,min=100,max=-100,grade=0;
 VALLEY_ROUTE.forEach((b,i)=>{const a=VALLEY_ROUTE[(i+5)%6],l=Math.hypot(b.x-a.x,b.z-a.z);length+=l;for(let d=0;d<l;d+=.5){const x=a.x+(b.x-a.x)*d/l,z=a.z+(b.z-a.z)*d/l,y=heightAt(x,z);min=Math.min(min,y);max=Math.max(max,y);grade=Math.max(grade,Math.hypot((heightAt(x+.1,z)-heightAt(x-.1,z))/.2,(heightAt(x,z+.1)-heightAt(x,z-.1))/.2));assert.ok(Math.max(Math.abs(x),Math.abs(z))+ROUTE_HALF_WIDTH<WORLD_SIZE/2-10);}});
 assert.ok(length>250);assert.ok(max-min>14);assert.ok(grade<.8);assert.equal(ROUTE_HALF_WIDTH*2,12);
 world.colliders.forEach(c=>{if(c.shapeType()===R.ShapeType.TriMesh||c.shapeType()===R.ShapeType.Cuboid)return;const p=c.translation();assert.ok(nearestRoutePoint(p.x,p.z).distance>=ROUTE_HALF_WIDTH+1,`solid prop blocks corridor at ${p.x}, ${p.z}`);});
 assert.equal(heightAt(0,0),heightAt(4,0));world.free();
});
test('all large chevrons face along their segment and their corners stay above hills',()=>{
 const v=new MatchRouteVisual(new Scene()),marks=v.group.children.find(o=>o instanceof InstancedMesh) as InstancedMesh;let index=0,arrows=0;
 VALLEY_ROUTE.forEach((b,i)=>{const a=VALLEY_ROUTE[(i+5)%6],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz),dir=new Vector3(dx/l,0,dz/l),side=new Vector3(-dz/l,0,dx/l);for(let d=1;d<l;d+=2)index+=2;const locations:number[]=[];for(let d=4;d<l-10;d+=9)locations.push(d);for(const back of [8,5,2])if(l>back+1)locations.push(l-back);
  for(const d of locations){const tip:Vector3[]=[],tail:Vector3[]=[],center=new Vector3(a.x+dir.x*d,0,a.z+dir.z*d);for(let arm=0;arm<2;arm++){const m=new Matrix4();marks.getMatrixAt(index++,m);const ends=[-1,1].map(s=>new Vector3(0,0,s*.55).applyMatrix4(m));ends.sort((p,q)=>Math.abs(p.clone().sub(center).dot(side))-Math.abs(q.clone().sub(center).dot(side)));tip.push(ends[0]);tail.push(ends[1]);}assert.ok(tip[0].clone().add(tip[1]).sub(tail[0]).sub(tail[1]).dot(dir)>0);arrows++;}
 });
 assert.equal(index,marks.count);assert.ok(arrows>30);const positions=marks.geometry.getAttribute('position'),m=new Matrix4();for(let i=0;i<marks.count;i++){marks.getMatrixAt(i,m);for(let j=0;j<positions.count;j++){const p=new Vector3().fromBufferAttribute(positions,j).applyMatrix4(m);assert.ok(p.y-heightAt(p.x,p.z)>.015,`buried mark ${i}`);}}
});
test('three dynamic wagons traverse the actual wide hill loop under touch control',async()=>{
 await R.init();const world=new R.World({x:0,y:-18,z:0});world.timestep=1/60;createWorld(new Scene(),world);
 const leader=new PhysicsPlayer(world,new EventBus()),actors=Array.from({length:3},(_,id)=>({id,physics:new PhysicsPlayer(world,new EventBus(),{x:80+id*3,z:0})})),train=new TrainSystem(world,leader,actors,new EventBus(),{breakOnContact:false}),forward=new Vector3(0,0,1);
 const tick=(x=0,z=0)=>{leader.step(1/60,{x,z,jump:false,dash:false,touchDrive:true},forward);for(const a of actors)if(!train.has(a.id)&&!train.isJoining(a.id))a.physics.step(1/60,{x:0,z:0,jump:false,dash:false},forward);train.step(1/60);world.step();leader.sync();actors.forEach(a=>a.physics.sync());train.afterStep();};
 for(let i=0;i<60;i++)tick();for(const a of actors){a.physics.body.setTranslation({x:leader.current.x+1.95,y:leader.current.y,z:leader.current.z},true);a.physics.body.setLinvel({x:0,y:0,z:0},true);a.physics.sync();for(let i=0;i<900&&!train.has(a.id);i++)tick();assert.ok(train.has(a.id));}
 const match=new RouteMatch();match.start([leader.current,{x:80,z:0}]);match.step(3,[leader.current,{x:80,z:0}]);let maxGap=0,steps=0;
 for(;steps<7200&&match.progress[0]<6;steps++){const goal=match.target(0),dx=goal.x-leader.current.x,dz=goal.z-leader.current.z,d=Math.hypot(dx,dz)||1,amount=Math.min(.65,d/8);tick(-dx/d*amount,-dz/d*amount);match.step(1/60,[leader.current,{x:80,z:0}]);maxGap=Math.max(maxGap,...train.snapshot().gaps);assert.equal(train.count,3);assert.ok(leader.current.toArray().every(Number.isFinite));}
 assert.equal(match.progress[0],6,`stalled at ${leader.current.toArray()}, progress ${match.progress[0]}`);assert.ok(maxGap<3,`gap ${maxGap}`);for(let i=0;i<120;i++)tick();for(const a of [leader,...actors.map(a=>a.physics)])assert.ok(a.current.y-heightAt(a.current.x,a.current.z)<1.5,'no sustained tower');world.free();
});
