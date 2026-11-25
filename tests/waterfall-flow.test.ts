import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {waterfallFlowGeometry} from '../src/game/WaterfallFlow';

test('falling water has physical mesh thickness visible from front, back and side within a fixed budget',()=>{
 const g=waterfallFlowGeometry(0,0,5.8,2.18),p=g.getAttribute('position'),normal=g.getAttribute('normal');
 assert.ok(g.index!.count/3<6000);
 for(let i=0;i<p.count;i++){
  assert.ok([p.getX(i),p.getY(i),p.getZ(i)].every(Number.isFinite));
  assert.ok(Math.abs(Math.hypot(normal.getX(i),normal.getY(i),normal.getZ(i))-1)<.001);
 }
 const mesh=new T.Mesh(g,new T.MeshBasicMaterial());mesh.updateMatrixWorld();
 for(const [origin,direction] of [
  [new T.Vector3(0,4,10),new T.Vector3(0,0,-1)],
  [new T.Vector3(0,4,-10),new T.Vector3(0,0,1)],
  [new T.Vector3(10,4,.35),new T.Vector3(-1,0,0)],
 ] as const)assert.ok(new T.Raycaster(origin,direction).intersectObject(mesh).length>0,'water must retain a visible side, not collapse to a plane');
 g.dispose();mesh.material.dispose();
});
