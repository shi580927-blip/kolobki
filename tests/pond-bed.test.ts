import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Vector3} from 'three';
import {pondBedLayout,addPondBed} from '../src/game/PondBed';
import {POND} from '../src/core/terrain';

test('decorative lake stones are seeded, bounded, submerged and leave the bridge clear',()=>{
 const layout=pondBedLayout();assert.deepEqual(layout,pondBedLayout());assert.ok(layout.length>=16&&layout.length<=24);
 const mesh=addPondBed(new Scene()),point=new Vector3(),position=mesh.geometry.getAttribute('position');
 for(const p of layout){assert.ok(Math.abs(p.z-POND.z)>3.3);assert.ok(Object.values(p).every(Number.isFinite));
  for(let i=0;i<position.count;i++){point.fromBufferAttribute(position,i);assert.ok(p.y+point.y*p.sy<POND.water-.04,'stone must remain entirely below the water');}
 }
 assert.equal(mesh.count,layout.length);mesh.geometry.dispose();(mesh.material as import('three').Material).dispose();
});
