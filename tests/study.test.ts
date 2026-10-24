import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Texture,Mesh} from 'three';
import {StudyFaceRig} from '../src/face/StudyFaceRig';
import approved from '../src/face/approved-layout.json';
import {readLayout} from '../src/face/FaceLayout';
test('study preserves user calibration, brow layering and complete blink',()=>{
 for(const expression of ['sly','happy','grumpy'] as const){
  const face=new StudyFaceRig(new Texture(),expression);
  assert.deepEqual(readLayout(face),approved.faces[expression]);
  for(let i=0;i<2;i++) {
   const brow=face.getObjectByName('study-brow-'+i) as Mesh;
   assert.ok(brow.renderOrder>face.eyeParts[i].renderOrder);
   assert.ok(brow.renderOrder>face.lids[i].renderOrder);
   assert.equal((brow.material as import('three').ShaderMaterial).depthTest,true);
  }
  face.update(.016,1);assert.ok(face.eyeParts.every(e=>!e.visible));assert.ok(face.lids.every(l=>l.visible));
  face.impact();face.update(.1,0);face.update(1,0);assert.equal(face.rotation.y,0);assert.equal(face.rotation.z,0);
  assert.equal(face.children.length,7);
 }
});
