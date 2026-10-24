import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Texture,Mesh} from 'three';
import {StudyFaceRig} from '../src/face/StudyFaceRig';
test('study has independent features without a backing and mouth never overlaps eyes',()=>{
 for(const expression of ['sly','happy','grumpy'] as const){
  const face=new StudyFaceRig(new Texture(),expression);
  const mouth=face.getObjectByName('study-mouth') as Mesh;mouth.geometry.computeBoundingBox();
  for(const eye of face.eyeParts){eye.geometry.computeBoundingBox();assert.ok(eye.geometry.boundingBox!.min.y-mouth.geometry.boundingBox!.max.y>.025);}
  face.update(.016,1);assert.ok(face.eyeParts.every(e=>!e.visible));assert.ok(face.lids.every(l=>l.visible));
  face.impact();face.update(.1,0);face.update(1,0);assert.equal(face.rotation.y,0);assert.equal(face.rotation.z,0);
  assert.equal(face.children.length,7);
 }
});
